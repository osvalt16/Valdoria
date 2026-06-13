(function (window) {
  "use strict";

  const CELL_W = 16;
  const CELL_H = 24;
  const DRAW_W = 32;
  const DRAW_H = 48;
  const FEET   = DRAW_H - 1;
  const ROWS   = { down: 0, left: 1, right: 2, up: 3 };
  const CYCLE  = [0, 1, 2, 1];
  const TILE   = 32;

  // Cache d'images indexé par src (chargement à la demande)
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
  // Priorité : sprite explicitement choisi > genre > défaut garçon.
  function srcFor(friend) {
    const config = window.Valdoria.spritesConfig || [];
    if (friend.sprite) {
      const perso = config.find(p => p.id === friend.sprite);
      if (perso) return perso.src;
    }
    // Fallback : genre lu depuis la ROM
    if (friend.sexe === 1) {
      const fille = config.find(p => p.id === "fille");
      if (fille) return fille.src;
      return "assets/img/remote_fille.png";
    }
    const homme = config.find(p => p.id === "homme");
    if (homme) return homme.src;
    return "assets/img/remote_homme.png";
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

    const dx = x + TILE / 2 - DRAW_W / 2;
    const dy = y + TILE - FEET;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, frame * CELL_W, row * CELL_H, CELL_W, CELL_H, dx, dy, DRAW_W, DRAW_H);
  }

  window.Valdoria.sprites = { draw };
})(window);
