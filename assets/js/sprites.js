(function (window) {
  "use strict";

  const DRAW_W = 32;
  const DRAW_H = 48;
  const FEET   = DRAW_H - 1;
  const ROWS   = { down: 0, left: 1, right: 2, up: 3 };
  const CYCLE  = [0, 1, 2, 1];
  const TILE   = 32;

  // Cache d'images indexe par src (chargement a la demande)
  const imageCache = {};

  function getImage(src) {
    if (!imageCache[src]) {
      const im = new Image();
      im.src = src;
      imageCache[src] = im;
    }
    return imageCache[src];
  }

  // Trouve le src du sprite pour un joueur distant.
  // Priorite : sprite explicitement choisi > genre > defaut garcon.
  function srcFor(friend) {
    const config = window.Valdoria.spritesConfig || [];
    if (friend.sprite) {
      const perso = config.find(p => p.id === friend.sprite);
      if (perso) return perso.src;
    }
    if (friend.sexe === 1) {
      const fille = config.find(p => p.id === "fille1");
      if (fille) return fille.src;
      return "assets/img/Fille1.png";
    }
    const homme = config.find(p => p.id === "homme1");
    if (homme) return homme.src;
    return "assets/img/homme1.png";
  }

  function drawFallback(ctx, x, y) {
    ctx.fillStyle = "rgba(60,120,255,0.75)";
    ctx.beginPath();
    ctx.roundRect(x + 6, y - 6, 20, 34, 8);
    ctx.fill();
  }

  function draw(ctx, x, y, friend) {
    const im = getImage(srcFor(friend));
    if (!im.complete || !im.naturalWidth) { drawFallback(ctx, x, y); return; }

    const moving = Date.now() < friend.movingUntil;
    const frame  = moving ? CYCLE[Math.floor(Date.now() / 100) % CYCLE.length] : 1;
    const row    = ROWS[friend.direction] !== undefined ? ROWS[friend.direction] : 0;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x + TILE / 2, y + TILE - 3, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Taille de cellule dynamique : image divisee en 3 cols x 4 lignes
    const cw = im.naturalWidth  / 3;
    const ch = im.naturalHeight / 4;
    const dx = x + TILE / 2 - DRAW_W / 2;
    const dy = y + TILE - FEET;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, frame * cw, row * ch, cw, ch, dx, dy, DRAW_W, DRAW_H);
  }

  window.Valdoria.sprites = { draw };
})(window);
