(function (window) {
  "use strict";

  // Tchat à deux canaux :
  // - "Général" : monde/tchat, visible par tous ;
  // - "Amis"    : modèle par tag unique façon Discord. Chaque joueur
  //   reçoit un tag "Nom#1234" (nom du héros de la partie + 4 chiffres
  //   tirés une seule fois, retenus par le navigateur). J'écris sous MON
  //   tag ; je lis les tags de ma liste d'amis. Échange mutuel des tags
  //   = conversation. Pas de comptes : tout vit en localStorage.

  const { $ } = window.Valdoria.dom;
  const CLE_SUFFIXE = "valdoria.tagSuffixe.";   // + nom du héros
  const CLE_AMIS = "valdoria.tagsAmis";
  const FORMAT_TAG = /^.{1,12}#\d{4}$/;
  const MAX_AMIS = 20;

  let db = null;
  let pseudoFn = null;
  let canal = "general";
  let monNom = "";
  let monTag = "";
  let amis = [];
  let refs = [];
  let dernierEnvoi = 0;
  const historiques = { general: [], amis: [] };

  try { amis = JSON.parse(window.localStorage.getItem(CLE_AMIS) || "[]"); } catch (e) { amis = []; }
  if (!Array.isArray(amis)) amis = [];

  // '#' est interdit dans un chemin Firebase
  function cle(tag) { return tag.replace("#", "-"); }

  function sauveAmis() {
    try { window.localStorage.setItem(CLE_AMIS, JSON.stringify(amis)); } catch (e) {}
  }

  // appelé par network.js dès que le nom du héros est lisible en mémoire
  function definitNom(nom) {
    if (!nom || nom === monNom) return;
    monNom = nom;
    let suffixe = null;
    try { suffixe = window.localStorage.getItem(CLE_SUFFIXE + nom); } catch (e) {}
    if (!suffixe || !/^\d{4}$/.test(suffixe)) {
      suffixe = String(1000 + Math.floor(Math.random() * 9000));
      try { window.localStorage.setItem(CLE_SUFFIXE + nom, suffixe); } catch (e) {}
    }
    monTag = nom + "#" + suffixe;
    abonneAmis();
    rend();
  }

  function isoleClavier(el) {
    ["keydown", "keyup", "keypress"].forEach(t =>
      el.addEventListener(t, e => e.stopPropagation()));
  }

  function ligneMessage(d) {
    const ligne = document.createElement("div");
    ligne.className = "tchat-ligne";
    const qui = document.createElement("strong");
    qui.textContent = d.nom + " : ";
    if (d.tag) qui.title = d.tag;
    ligne.appendChild(qui);
    ligne.appendChild(document.createTextNode(d.texte));
    return ligne;
  }

  function ligneInfo(texte) {
    const p = document.createElement("p");
    p.className = "tchat-info";
    p.textContent = texte;
    return p;
  }

  function rendMessages() {
    const boite = $("tchatMessages");
    boite.textContent = "";
    if (canal === "amis") {
      if (!monTag) {
        boite.appendChild(ligneInfo("Ton tag sera créé dès que ta partie sera chargée (lance le jeu et marche un peu)."));
        return;
      }
      if (amis.length === 0)
        boite.appendChild(ligneInfo("Donne ton tag " + monTag + " à tes amis et ajoute les leurs ci-dessus : l'ajout mutuel ouvre la conversation."));
    }
    for (const d of historiques[canal]) boite.appendChild(ligneMessage(d));
    boite.scrollTop = boite.scrollHeight;
  }

  function rend() {
    $("tchatOngletGeneral").classList.toggle("actif", canal === "general");
    $("tchatOngletAmis").classList.toggle("actif", canal === "amis");

    // entête : mon tag + bouton copier
    const info = $("tchatCodeInfo");
    info.textContent = "";
    if (canal === "amis" && monTag) {
      info.appendChild(document.createTextNode("Mon tag : " + monTag + " "));
      const copier = document.createElement("button");
      copier.type = "button";
      copier.className = "tchat-changer";
      copier.textContent = "copier";
      copier.addEventListener("click", () => {
        try { navigator.clipboard.writeText(monTag); copier.textContent = "copié !"; } catch (e) {}
        setTimeout(() => { copier.textContent = "copier"; }, 1500);
      });
      info.appendChild(copier);
    }

    // rangée de gestion des amis (visible seulement dans l'onglet Amis)
    const gestion = $("tchatGestion");
    gestion.hidden = canal !== "amis";
    const liste = $("tagAmiListe");
    liste.textContent = "";
    for (const tag of amis) {
      const puce = document.createElement("span");
      puce.className = "tag-puce";
      puce.textContent = tag + " ";
      const x = document.createElement("button");
      x.type = "button";
      x.textContent = "✕";
      x.title = "Retirer";
      x.addEventListener("click", () => {
        amis = amis.filter(t => t !== tag);
        sauveAmis();
        abonneAmis();
        rend();
      });
      puce.appendChild(x);
      liste.appendChild(puce);
    }

    const champ = $("tchatInput");
    champ.disabled = canal === "amis" && !monTag;
    champ.placeholder = canal === "amis" ? "Écris à tes amis…" : "Écris au monde…";
    rendMessages();
  }

  function ajoute(quel, d) {
    if (!d || !d.nom || !d.texte) return;
    const h = historiques[quel];
    h.push(d);
    h.sort((a, b) => (a.t || 0) - (b.t || 0));   // plusieurs flux amis fusionnés
    if (h.length > 80) h.splice(0, h.length - 80);
    if (canal === quel) rendMessages();
  }

  function abonneAmis() {
    refs.forEach(r => r.off());
    refs = [];
    historiques.amis = [];
    if (!db) return;
    const tags = (monTag ? [monTag] : []).concat(amis).slice(0, MAX_AMIS + 1);
    for (const tag of tags) {
      const r = db.ref("monde/tchatAmis/" + cle(tag)).limitToLast(30);
      r.on("child_added", s => ajoute("amis", s.val()));
      refs.push(r);
    }
  }

  function ajouteAmi() {
    const champ = $("tagAmiInput");
    const tag = champ.value.trim();
    if (!FORMAT_TAG.test(tag)) { champ.value = ""; champ.placeholder = "Format : Nom#1234"; return; }
    if (tag === monTag || amis.includes(tag) || amis.length >= MAX_AMIS) { champ.value = ""; return; }
    amis.push(tag);
    sauveAmis();
    abonneAmis();
    champ.value = "";
    rend();
  }

  function connect(base, pseudo) {
    db = base;
    pseudoFn = pseudo;
    db.ref("monde/tchat").limitToLast(50).on("child_added", s => ajoute("general", s.val()));
    abonneAmis();

    isoleClavier($("tchatInput"));
    isoleClavier($("tagAmiInput"));
    $("tchatOngletGeneral").addEventListener("click", () => { canal = "general"; rend(); });
    $("tchatOngletAmis").addEventListener("click", () => { canal = "amis"; rend(); });
    $("tagAmiAjouter").addEventListener("click", ajouteAmi);
    $("tagAmiInput").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); ajouteAmi(); } });

    $("tchatForm").addEventListener("submit", e => {
      e.preventDefault();
      const champ = $("tchatInput");
      const texte = champ.value.trim().slice(0, 120);
      const now = Date.now();
      if (!texte || now - dernierEnvoi < 1000) return;     // anti-spam simple
      if (canal === "amis" && !monTag) return;
      dernierEnvoi = now;
      const ref = canal === "general"
        ? db.ref("monde/tchat")
        : db.ref("monde/tchatAmis/" + cle(monTag));
      ref.push({
        nom: pseudoFn(), texte: texte, tag: canal === "amis" ? monTag : null,
        t: firebase.database.ServerValue.TIMESTAMP
      });
      champ.value = "";
    });

    rend();
  }

  window.Valdoria.tchat = { connect, definitNom };
})(window);
