(function (window) {
  "use strict";

  // Sélecteur de personnage jouable.
  // Lit la liste depuis window.Valdoria.spritesConfig,
  // affiche un aperçu canvas pour chaque sprite,
  // sauvegarde le choix en localStorage et dans state.mySprite.

  const state    = window.Valdoria.state;
  const CLE      = "valdoria.sprite";
  const CELL_W   = 16;   // largeur d'une cellule source
  const CELL_H   = 24;   // hauteur d'une cellule source
  const PRV_W    = 40;   // largeur de l'aperçu canvas (2.5×)
  const PRV_H    = 60;   // hauteur de l'aperçu canvas (2.5×)
  // Frame idle face caméra : colonne 1 (frame=1), ligne 0 (direction=bas)
  const PRV_SX   = CELL_W;
  const PRV_SY   = 0;

  /* ---- Persistance -------------------------------------------- */
  function chargeSprite() {
    try { return window.localStorage.getItem(CLE) || null; } catch (e) { return null; }
  }

  function sauveSprite(id) {
    try { window.localStorage.setItem(CLE, id); } catch (e) {}
    state.mySprite = id;
  }

  /* ---- Images préchargées ------------------------------------- */
  const cache = {};
  function getImage(src) {
    if (!cache[src]) {
      const im = new Image();
      im.src = src;
      cache[src] = im;
    }
    return cache[src];
  }

  /* ---- Aperçu canvas ------------------------------------------ */
  function dessinerApercu(canvas, src) {
    const im = getImage(src);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(im, PRV_SX, PRV_SY, CELL_W, CELL_H, 0, 0, PRV_W, PRV_H);
    }

    if (im.complete && im.naturalWidth) draw();
    else im.onload = draw;
  }

  /* ---- Construire la grille de sélection ---------------------- */
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
    // Charger le choix sauvegardé
    const config  = window.Valdoria.spritesConfig || [];
    const sauvegarde = chargeSprite();
    // Valider que l'id existe encore dans la config
    const existe = config.some(p => p.id === sauvegarde);
    const actuel = existe ? sauvegarde : (config[0] ? config[0].id : null);
    state.mySprite = actuel;

    // Sélecteur dans la page d'accueil (#setup)
    const setupListe = document.getElementById("persoListeSetup");
    if (setupListe) {
      construireGrille(setupListe, actuel, id => {
        // Synchroniser aussi le sélecteur in-game si ouvert
        const ingame = document.getElementById("persoListeIngame");
        if (ingame) construireGrille(ingame, id, null);
      });
    }

    // Sélecteur in-game (dans les options PokéKanto)
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
