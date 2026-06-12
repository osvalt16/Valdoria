(function (window) {
  "use strict";

  // Synchronisation cloud automatique de la sauvegarde entre appareils.
  // Principe : un code secret choisi par le joueur (saisi une fois par
  // appareil, retenu en localStorage) sert d'identifiant dans Firebase
  // (monde/sauvegardes/<code>/<codeCartouche>). À chaque sauvegarde DANS
  // le jeu, elle part dans le cloud ; au chargement, si le cloud est plus
  // récent que l'appareil, il est appliqué automatiquement. Le plus
  // récent gagne toujours — on n'écrase jamais avec plus vieux.

  const { $ } = window.Valdoria.dom;
  const state = window.Valdoria.state;
  const CLE_CODE = "valdoria.codeSync";

  let db = null;
  let codeSync = "";
  let dernierEnvoiData = "";

  try { codeSync = window.localStorage.getItem(CLE_CODE) || ""; } catch (e) {}

  function statut(message) {
    const el = $("syncStatus");
    if (el) el.textContent = message;
  }

  function cleCarte() {
    const cart = state.gba && state.gba.mmu ? state.gba.mmu.cart : null;
    return cart && cart.code ? cart.code.replace(/[.#$\[\]\/]/g, "_") : null;
  }

  function refSauvegarde() {
    if (!db || !codeSync || !cleCarte()) return null;
    return db.ref("monde/sauvegardes/" + codeSync + "/" + cleCarte());
  }

  function metaLocale() {
    try {
      const brut = window.localStorage.getItem("valdoria.saveMeta." + (state.gba.mmu.cart.code || ""));
      return brut ? JSON.parse(brut) : null;
    } catch (e) { return null; }
  }

  // appelé par le hook de sauvegarde d'emulator.js après chaque
  // sauvegarde en jeu (et import .sav)
  function envoie() {
    const ref = refSauvegarde();
    const gba = state.gba;
    if (!ref || !gba || !gba.mmu.save || !gba.mmu.save.view) return;
    const data = gba.encodeBase64(gba.mmu.save.view);
    if (!data || data === dernierEnvoiData) return;
    dernierEnvoiData = data;
    ref.set({
      data: data,
      nom: state.myPos && state.myPos.nom ? state.myPos.nom : "",
      savedAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => statut("☁️ Sauvegarde envoyée dans le cloud."))
      .catch(() => statut("☁️ Envoi cloud impossible (règles Firebase ?)."));
  }

  // au démarrage : récupère le cloud s'il est plus récent que l'appareil
  function verifie() {
    const ref = refSauvegarde();
    if (!ref) return;
    statut("☁️ Vérification de la sauvegarde cloud…");
    ref.get().then(s => {
      const cloud = s.val();
      if (!cloud || !cloud.data) { statut("☁️ Aucune sauvegarde cloud pour ce code."); return; }
      const locale = metaLocale();
      const localeAt = locale && locale.savedAt ? locale.savedAt : 0;
      if (cloud.savedAt && cloud.savedAt > localeAt + 2000) {
        dernierEnvoiData = cloud.data;     // évite de la renvoyer aussitôt
        const buffer = state.gba.decodeBase64(cloud.data);
        window.Valdoria.emulator.appliqueSauvegarde(buffer);
        statut("☁️ Partie plus récente récupérée du cloud (" + new Date(cloud.savedAt).toLocaleString("fr-FR") + ").");
      } else {
        statut("☁️ Ta sauvegarde locale est à jour.");
      }
    }).catch(() => statut("☁️ Lecture cloud impossible (règles Firebase ?)."));
  }

  function connect(base) {
    db = base;
    if (codeSync) verifie();
    else statut("☁️ Choisis un code secret pour synchroniser ta partie entre appareils.");
  }

  function brancheUI() {
    const champ = $("syncCode");
    champ.value = codeSync;
    ["keydown", "keyup", "keypress"].forEach(t =>
      champ.addEventListener(t, e => e.stopPropagation()));
    champ.addEventListener("change", () => {
      const code = champ.value.trim();
      if (code && !/^[A-Za-z0-9_-]{6,30}$/.test(code)) {
        statut("☁️ Code invalide : 6 à 30 lettres/chiffres/tirets, sans espace.");
        return;
      }
      codeSync = code;
      dernierEnvoiData = "";
      try {
        if (code) window.localStorage.setItem(CLE_CODE, code);
        else window.localStorage.removeItem(CLE_CODE);
      } catch (e) {}
      if (code && db && state.gba && state.gba.rom) verifie();
      if (!code) statut("☁️ Synchronisation désactivée.");
    });
  }

  brancheUI();
  window.Valdoria.sync = { connect, envoie };
})(window);
