(function (window) {
  "use strict";

  // Cable Club — lobby de matchmaking multijoueur.
  // Phase 1 : détection de map, présence Firebase, envoi/réception de défis.
  // Phase 2 (à venir) : émulation câble link SIO via WebRTC pour vrais combats.

  const state    = window.Valdoria.state;
  const CLE_MAP  = "valdoria.linkroom.map";   // "g,m" stocké en localStorage
  const CLE_AMIS = "valdoria.tagsAmis";        // partagée avec tchat.js
  const DUREE_PRESENCE_MS = 120000;            // 2 min sans mise à jour = parti
  const DUREE_DEFI_MS     = 30000;             // un défi expire après 30 s

  let db       = null;
  let monId    = null;
  let monTag   = null;
  let monRef   = null;    // monde/linkroom/<monId>
  let defiRef  = null;    // monde/defis/<monId>  (défis reçus)
  let defiRecu = null;    // données du défi en attente
  let dansLinkRoom = false;

  /* ---- Map Cable Club ------------------------------------------ */
  function chargeMap() {
    try {
      const v = window.localStorage.getItem(CLE_MAP);
      if (v) {
        const parts = v.split(",").map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
          return { g: parts[0], m: parts[1] };
      }
    } catch (e) {}
    return null;
  }

  let mapLinkRoom = chargeMap();

  function sauveMap(g, m) {
    try { window.localStorage.setItem(CLE_MAP, g + "," + m); } catch (e) {}
    mapLinkRoom = { g, m };
  }

  function estSurMap(pos) {
    return !!(mapLinkRoom && pos &&
      pos.g === mapLinkRoom.g && pos.m === mapLinkRoom.m);
  }

  /* ---- Amis en ligne ------------------------------------------ */
  function chargeAmis() {
    try { return JSON.parse(window.localStorage.getItem(CLE_AMIS) || "[]"); }
    catch (e) { return []; }
  }

  function amisEnLigne() {
    const amis = chargeAmis();
    return Object.entries(state.joueurs || {})
      .filter(([, j]) => j.tag && amis.includes(j.tag))
      .map(([id, j]) => ({ id, pseudo: j.nom, tag: j.tag }));
  }

  /* ---- Présence Firebase -------------------------------------- */
  function rejoindre() {
    if (!db || !monId) return;
    monRef = db.ref("monde/linkroom/" + monId);
    monRef.onDisconnect().remove();
    monRef.set({
      pseudo: (state.myPos && state.myPos.nom) || "Dresseur",
      tag: monTag || "",
      ts: firebase.database.ServerValue.TIMESTAMP
    });

    // Écouter les défis entrants
    defiRef = db.ref("monde/defis/" + monId);
    defiRef.on("value", s => {
      const d = s.val();
      if (!d) { defiRecu = null; cacherDefi(); return; }
      if (Date.now() - (d.ts || 0) > DUREE_DEFI_MS) { defiRef.remove(); return; }
      if (d.accepte) { afficherAccepte(d); return; }
      defiRecu = d;
      afficherDefi(d);
    });
  }

  function partir() {
    if (monRef)  { monRef.remove(); monRef = null; }
    if (defiRef) { defiRef.off(); defiRef.remove(); defiRef = null; }
    defiRecu = null;
    cacherDefi();
    cacherAttente();
  }

  /* ---- Matchmaking -------------------------------------------- */
  function combatAleatoire() {
    if (!db || !monId) return;
    db.ref("monde/linkroom").once("value", s => {
      const salle = s.val() || {};
      const candidats = Object.entries(salle)
        .filter(([id]) => id !== monId)
        .filter(([, d]) => Date.now() - (d.ts || 0) < DUREE_PRESENCE_MS);
      if (!candidats.length) { afficherAttente(null); return; }
      const [cibleId, cibleD] = candidats[Math.floor(Math.random() * candidats.length)];
      envoyerDefi(cibleId, cibleD.pseudo || "Dresseur");
    });
  }

  function envoyerDefi(cibleId, ciblePseudo) {
    if (!db || !monId) return;
    db.ref("monde/defis/" + cibleId).set({
      de: monId,
      pseudo: (state.myPos && state.myPos.nom) || "Dresseur",
      tag: monTag || "",
      ts: firebase.database.ServerValue.TIMESTAMP
    });
    afficherAttente(ciblePseudo);
  }

  function accepterDefi() {
    if (!defiRecu || !db) return;
    // Notifie l'adversaire (Phase 2 : lancer la session SIO ici)
    db.ref("monde/defis/" + defiRecu.de).set({
      accepte: true,
      de: monId,
      pseudo: (state.myPos && state.myPos.nom) || "Dresseur",
      tag: monTag || "",
      ts: firebase.database.ServerValue.TIMESTAMP
    });
    if (defiRef) defiRef.remove();
    defiRecu = null;
    cacherDefi();
    afficherPhase2();
  }

  function refuserDefi() {
    if (defiRef) defiRef.remove();
    defiRecu = null;
    cacherDefi();
  }

  /* ---- UI ----------------------------------------------------- */
  function el(id) { return document.getElementById(id); }

  function rafraichirAmis() {
    const listeEl = el("linkroomAmisListe");
    if (!listeEl) return;
    const amis = amisEnLigne();
    listeEl.innerHTML = "";
    if (!amis.length) {
      const vide = document.createElement("em");
      vide.textContent = "Aucun ami en ligne dans la salle";
      listeEl.appendChild(vide);
    } else {
      amis.forEach(a => {
        const btn = document.createElement("button");
        btn.className = "linkroom-ami-btn";
        const nom = document.createElement("span");
        nom.textContent = "⚔️ " + a.pseudo;
        const tag = document.createElement("span");
        tag.className = "linkroom-tag-label";
        tag.textContent = a.tag;
        btn.appendChild(nom);
        btn.appendChild(tag);
        btn.addEventListener("click", () => envoyerDefi(a.id, a.pseudo));
        listeEl.appendChild(btn);
      });
    }
  }

  function afficherLobby() {
    rafraichirAmis();
    const panel = el("linkroomPanel");
    if (panel) panel.removeAttribute("hidden");
    const lobby = el("linkroomLobby");
    if (lobby) lobby.removeAttribute("hidden");
    cacherAttente();
  }

  function cacherLobby() {
    const panel = el("linkroomPanel");
    if (panel) panel.setAttribute("hidden", "");
    cacherAttente();
    cacherDefi();
  }

  function afficherDefi(d) {
    const nom = el("linkroomDefiNom");
    if (nom) nom.textContent = d.pseudo || "Dresseur";
    const panel = el("linkroomDefiPanel");
    if (panel) panel.removeAttribute("hidden");
  }

  function cacherDefi() {
    const panel = el("linkroomDefiPanel");
    if (panel) panel.setAttribute("hidden", "");
  }

  function afficherAttente(pseudo) {
    const lobby = el("linkroomLobby");
    if (lobby) lobby.setAttribute("hidden", "");
    const msg = el("linkroomAttenteMsg");
    if (msg) msg.textContent = pseudo
      ? "Défi envoyé à " + pseudo + "…"
      : "En attente d'un adversaire…";
    const att = el("linkroomAttente");
    if (att) att.removeAttribute("hidden");
  }

  function cacherAttente() {
    const att = el("linkroomAttente");
    if (att) att.setAttribute("hidden", "");
    const lobby = el("linkroomLobby");
    if (lobby) lobby.removeAttribute("hidden");
  }

  function afficherAccepte(d) {
    const lobby = el("linkroomLobby");
    if (lobby) lobby.setAttribute("hidden", "");
    const msg = el("linkroomAttenteMsg");
    if (msg) msg.textContent = "✅ " + (d.pseudo || "Adversaire") + " a accepté ! (câble link en développement…)";
    const att = el("linkroomAttente");
    if (att) att.removeAttribute("hidden");
  }

  function afficherPhase2() {
    cacherDefi();
    const lobby = el("linkroomLobby");
    if (lobby) lobby.setAttribute("hidden", "");
    const msg = el("linkroomAttenteMsg");
    if (msg) msg.textContent = "🔗 Connexion établie ! (câble link en cours de développement…)";
    const att = el("linkroomAttente");
    if (att) att.removeAttribute("hidden");
  }

  /* ---- Détection de map --------------------------------------- */
  function check(pos) {
    if (!pos) return;
    const maintenant = estSurMap(pos);
    if (maintenant === dansLinkRoom) return;
    dansLinkRoom = maintenant;
    if (maintenant) {
      rejoindre();
      afficherLobby();
    } else {
      partir();
      cacherLobby();
    }
  }

  /* ---- Init publique ----------------------------------------- */
  function connectDb(database, id) {
    db = database;
    monId = id;
  }

  function definitTag(tag) {
    monTag = tag;
    // Met à jour la présence si déjà dans la salle
    if (monRef && tag) monRef.update({ tag });
  }

  /* ---- Bindings UI ------------------------------------------- */
  function initUI() {
    const btnAlea     = el("linkroomBtnAlea");
    const btnAmi      = el("linkroomBtnAmi");
    const secAmis     = el("linkroomSectionAmis");
    const btnAnnuler  = el("linkroomBtnAnnuler");
    const btnAccepter = el("linkroomBtnAccepter");
    const btnRefuser  = el("linkroomBtnRefuser");
    const btnSaveMap  = el("linkroomBtnSaveMap");

    if (btnAlea) btnAlea.addEventListener("click", combatAleatoire);

    if (btnAmi && secAmis) btnAmi.addEventListener("click", () => {
      const cache = secAmis.hasAttribute("hidden");
      if (cache) { rafraichirAmis(); secAmis.removeAttribute("hidden"); }
      else secAmis.setAttribute("hidden", "");
    });

    if (btnAnnuler) btnAnnuler.addEventListener("click", () => {
      partir();
      cacherLobby();
      dansLinkRoom = false;  // force rechargement si le joueur revient dans la salle
    });

    if (btnAccepter) btnAccepter.addEventListener("click", accepterDefi);
    if (btnRefuser)  btnRefuser.addEventListener("click", refuserDefi);

    if (btnSaveMap) btnSaveMap.addEventListener("click", () => {
      const pos = state.myPos;
      if (!pos) {
        btnSaveMap.textContent = "⚠️ Lance d'abord le jeu !";
        setTimeout(() => { btnSaveMap.textContent = "📍 Enregistrer cette map"; }, 2000);
        return;
      }
      sauveMap(pos.g, pos.m);
      btnSaveMap.textContent = "✅ Map " + pos.g + "." + pos.m + " enregistrée";
      setTimeout(() => { btnSaveMap.textContent = "📍 Enregistrer cette map"; }, 3000);
    });
  }

  document.addEventListener("DOMContentLoaded", initUI);

  window.Valdoria.linkroom = { connectDb, check, definitTag, sauveMap };
})(window);
