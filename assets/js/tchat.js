(function (window) {
  "use strict";

  // Tchat général : un seul canal mondial (monde/tchat dans Firebase).
  // Affiché entre l'écran de jeu et le panneau pseudo/connectés —
  // volontairement pas de bulles au-dessus des personnages.

  const { $ } = window.Valdoria.dom;
  let dernierEnvoi = 0;

  function ajoute(d) {
    const boite = $("tchatMessages");
    const ligne = document.createElement("div");
    ligne.className = "tchat-ligne";
    const qui = document.createElement("strong");
    qui.textContent = d.nom + " : ";
    ligne.appendChild(qui);
    ligne.appendChild(document.createTextNode(d.texte));
    boite.appendChild(ligne);
    while (boite.children.length > 80) boite.removeChild(boite.firstChild);
    boite.scrollTop = boite.scrollHeight;
  }

  // db et pseudo() sont fournis par network.js une fois le monde joint
  function connect(db, pseudo) {
    const ref = db.ref("monde/tchat");
    ref.limitToLast(50).on("child_added", s => {
      const d = s.val();
      if (d && d.nom && d.texte) ajoute(d);
    });

    // pendant la saisie, l'émulateur ne doit pas manger les touches
    // (son écouteur clavier est sur window, en phase de bouillonnement)
    const champ = $("tchatInput");
    ["keydown", "keyup", "keypress"].forEach(t =>
      champ.addEventListener(t, e => e.stopPropagation()));

    $("tchatForm").addEventListener("submit", e => {
      e.preventDefault();
      const texte = champ.value.trim().slice(0, 120);
      const now = Date.now();
      if (!texte || now - dernierEnvoi < 1000) return;   // anti-spam simple
      dernierEnvoi = now;
      ref.push({ nom: pseudo(), texte: texte, t: firebase.database.ServerValue.TIMESTAMP });
      champ.value = "";
    });
  }

  window.Valdoria.tchat = { connect };
})(window);
