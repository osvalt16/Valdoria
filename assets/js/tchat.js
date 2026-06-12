(function (window) {
  "use strict";

  // Tchat à deux canaux :
  // - "Général"  : monde/tchat, visible par tout le monde ;
  // - "Amis"     : monde/tchatAmis/<CODE>, partagé entre ceux qui ont
  //   saisi le même code de groupe (retenu en localStorage — pas de
  //   comptes sur le site, le code fait office de salon privé).
  // Les deux historiques sont séparés ; l'onglet actif est en surbrillance.

  const { $ } = window.Valdoria.dom;
  const CLE_CODE = "valdoria.codeAmis";
  const FORMAT_CODE = /^[A-Z0-9-]{3,12}$/;

  let db = null;
  let pseudoFn = null;
  let canal = "general";
  let codeAmis = "";
  let refAmis = null;
  let dernierEnvoi = 0;
  const historiques = { general: [], amis: [] };

  try { codeAmis = (window.localStorage.getItem(CLE_CODE) || "").toUpperCase(); } catch (e) {}

  function isoleClavier(el) {
    ["keydown", "keyup", "keypress"].forEach(t =>
      el.addEventListener(t, e => e.stopPropagation()));
  }

  function ligneMessage(d) {
    const ligne = document.createElement("div");
    ligne.className = "tchat-ligne";
    const qui = document.createElement("strong");
    qui.textContent = d.nom + " : ";
    ligne.appendChild(qui);
    ligne.appendChild(document.createTextNode(d.texte));
    return ligne;
  }

  // formulaire affiché dans le canal Amis tant qu'aucun code n'est saisi
  function formulaireCode() {
    const bloc = document.createElement("div");
    bloc.className = "tchat-join";
    const aide = document.createElement("p");
    aide.textContent = "Entre le code de groupe partagé avec tes amis (3-12 lettres/chiffres). Donne le même code à tes amis pour discuter entre vous.";
    const rang = document.createElement("div");
    rang.className = "tchat-join-rang";
    const champ = document.createElement("input");
    champ.maxLength = 12;
    champ.placeholder = "CODE";
    champ.id = "tchatCodeInput";
    isoleClavier(champ);
    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "Rejoindre";
    ok.addEventListener("click", () => {
      const code = champ.value.trim().toUpperCase();
      if (!FORMAT_CODE.test(code)) { aide.textContent = "Code invalide : 3 à 12 lettres, chiffres ou tirets."; return; }
      codeAmis = code;
      try { window.localStorage.setItem(CLE_CODE, code); } catch (e) {}
      abonneAmis();
      rend();
    });
    champ.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); ok.click(); } });
    rang.appendChild(champ);
    rang.appendChild(ok);
    bloc.appendChild(aide);
    bloc.appendChild(rang);
    return bloc;
  }

  function rend() {
    // entête : code actuel + bouton pour en changer
    const info = $("tchatCodeInfo");
    info.textContent = "";
    if (canal === "amis" && codeAmis) {
      info.appendChild(document.createTextNode("code : " + codeAmis + " "));
      const changer = document.createElement("button");
      changer.type = "button";
      changer.className = "tchat-changer";
      changer.textContent = "changer";
      changer.addEventListener("click", () => {
        codeAmis = "";
        try { window.localStorage.removeItem(CLE_CODE); } catch (e) {}
        abonneAmis();
        rend();
      });
      info.appendChild(changer);
    }

    $("tchatOngletGeneral").classList.toggle("actif", canal === "general");
    $("tchatOngletAmis").classList.toggle("actif", canal === "amis");

    const boite = $("tchatMessages");
    boite.textContent = "";
    if (canal === "amis" && !codeAmis) {
      boite.appendChild(formulaireCode());
      $("tchatInput").disabled = true;
      return;
    }
    $("tchatInput").disabled = false;
    for (const d of historiques[canal]) boite.appendChild(ligneMessage(d));
    boite.scrollTop = boite.scrollHeight;
  }

  function ajoute(quel, d) {
    if (!d || !d.nom || !d.texte) return;
    historiques[quel].push(d);
    if (historiques[quel].length > 80) historiques[quel].shift();
    if (canal === quel) {
      const boite = $("tchatMessages");
      boite.appendChild(ligneMessage(d));
      boite.scrollTop = boite.scrollHeight;
    }
  }

  function abonneAmis() {
    if (refAmis) { refAmis.off(); refAmis = null; }
    historiques.amis = [];
    if (!codeAmis || !db) return;
    refAmis = db.ref("monde/tchatAmis/" + codeAmis).limitToLast(50);
    refAmis.on("child_added", s => ajoute("amis", s.val()));
  }

  function connect(base, pseudo) {
    db = base;
    pseudoFn = pseudo;
    db.ref("monde/tchat").limitToLast(50).on("child_added", s => ajoute("general", s.val()));
    abonneAmis();

    isoleClavier($("tchatInput"));
    $("tchatOngletGeneral").addEventListener("click", () => { canal = "general"; rend(); });
    $("tchatOngletAmis").addEventListener("click", () => { canal = "amis"; rend(); });

    $("tchatForm").addEventListener("submit", e => {
      e.preventDefault();
      const champ = $("tchatInput");
      const texte = champ.value.trim().slice(0, 120);
      const now = Date.now();
      if (!texte || now - dernierEnvoi < 1000) return;       // anti-spam simple
      if (canal === "amis" && !codeAmis) return;
      dernierEnvoi = now;
      const ref = canal === "general"
        ? db.ref("monde/tchat")
        : db.ref("monde/tchatAmis/" + codeAmis);
      ref.push({ nom: pseudoFn(), texte: texte, t: firebase.database.ServerValue.TIMESTAMP });
      champ.value = "";
    });

    rend();
  }

  window.Valdoria.tchat = { connect };
})(window);
