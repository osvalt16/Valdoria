(function (window) {
  "use strict";

  // Selecteur de personnage jouable.
  // Lit la liste depuis window.Valdoria.spritesConfig,
  // affiche un apercu canvas pour chaque sprite,
  // sauvegarde le choix en localStorage et dans state.mySprite.

  const state  = window.Valdoria.state;
  const CLE    = "valdoria.sprite";
  const PRV_W  = 40;   // largeur apercu canvas
  const PRV_H  = 60;   // hauteur apercu canvas

  /* ---- Persistance -------------------------------------------- */
  function chargeSprite() {
    try { return window.localStorage.getItem(CLE) || null; } catch (e) { return null; }
  }

  function sauveSprite(id) {
    try { window.localStorage.setItem(CLE, id); } catch (e) {}
    state.mySprite = id;
  }

  /* ---- Images preChargees ------------------------------------ */
  const cache = {};
  function getImage(src) {
    if (!cache[src]) {
      const im = new Image();
      im.src = src;
      cache[src] = im;
    }
    return cache[src];
  }

  /* ---- Apercu canvas ------------------------------------------ */
  function dessinerApercu(canvas, src) {
    const im = getImage(src);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    function draw() {
      // Taille de cellule dynamique : image divisee en 3 cols x 4 lignes
      const cw = im.naturalWidth  / 3;
      const ch = im.naturalHeight / 4;
      // Frame idle (colonne 1), direction bas (ligne 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(im, cw, 0, cw, ch, 0, 0, PRV_W, PRV_H);
    }

    if (im.complete && im.naturalWidth) draw();
    else im.addEventListener('load', draw, { once: true });
  }

  /* ---- Construire la grille de selection ---------------------- */
  function construireGrille(conteneur, actuel, onChoix) {
    const config = window.Valdoria.spritesConfig || [];
    conteneur.innerHTML = "";

    config.forEach(perso => {
      const carte = document.createElement("div");
      carte.className = "perso-carte" + (perso.id === actuel ? " selectionne" : "");
      carte.title = perso.label;

      const canvas = document.createElement("canvas");
      canvas.width  = PRV_W;
      canvas.height = PRV_H;
      dessinerApercu(canvas, perso.src);

      const label = document.createElement("span");
      label.className = "perso-label";
      label.textContent = perso.label;

      carte.appendChild(canvas);
      carte.appendChild(label);

      carte.addEventListener("click", () => {
        conteneur.querySelectorAll(".perso-carte").forEach(c => c.classList.remove("selectionne"));
        carte.classList.add("selectionne");
        sauveSprite(perso.id);
        if (onChoix) onChoix(perso.id);
      });

      conteneur.appendChild(carte);
    });
  }

  /* ---- Init --------------------------------------------------- */
  function init() {
    const config    = window.Valdoria.spritesConfig || [];
    const sauvegarde = chargeSprite();
    const existe    = config.some(p => p.id === sauvegarde);
    const actuel    = existe ? sauvegarde : (config[0] ? config[0].id : null);
    state.mySprite  = actuel;

    const setupListe = document.getElementById("persoListeSetup");
    if (setupListe) {
      construireGrille(setupListe, actuel, id => {
        const ingame = document.getElementById("persoListeIngame");
        if (ingame) construireGrille(ingame, id, null);
      });
    }

    const ingameListe = document.getElementById("persoListeIngame");
    if (ingameListe) {
      construireGrille(ingameListe, actuel, id => {
        const setup = document.getElementById("persoListeSetup");
        if (setup) construireGrille(setup, id, null);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  window.Valdoria.character = { init, chargeSprite };
})(window);
