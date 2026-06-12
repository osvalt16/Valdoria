(function (window) {
  "use strict";

  // Sprites du joueur distant : planches d'images fournies par Emil
  // Format : 3 frames de marche x 4 directions, cellules 16x24.
  // Le choix se fait selon le genre lu dans la partie de l'ami
  // (friend.sexe : 0 = garcon, 1 = fille).

  const CELL_W = 16;
  const CELL_H = 24;
  const SCALE = 2;                       // meme scale que l'emulateur
  const DRAW_W = CELL_W * SCALE;         // 32px sur le canvas
  const DRAW_H = CELL_H * SCALE;         // 48px sur le canvas
  const FEET = DRAW_H - 1;              // ligne des pieds a l'echelle canvas
  const ROWS = { down: 0, left: 1, right: 2, up: 3 };
  const CYCLE = [0, 1, 2, 1];
  const TILE = 32;

  function load(src) {
    const im = new Image();
    im.src = src;
    return im;
  }

  const images = {
    boy: load("assets/img/remote-boy.png"),
    girl: load("assets/img/remote-girl.png")
  };

  function imageFor(friend) {
    return friend.sexe === 1 ? images.girl : images.boy;
  }

  function drawFallback(ctx, x, y) {
    ctx.fillStyle = "rgba(60,120,255,0.75)";
    ctx.beginPath();
    ctx.roundRect(x + 6, y - 6, 20, 34, 8);
    ctx.fill();
  }

  function draw(ctx, x, y, friend) {
    const im = imageFor(friend);
    if (!im.complete || !im.naturalWidth) { drawFallback(ctx, x, y); return; }

    const moving = Date.now() < friend.movingUntil;
    const frame = moving ? CYCLE[Math.floor(Date.now() / 140) % CYCLE.length] : 1;
    const row = ROWS[friend.direction] !== undefined ? ROWS[friend.direction] : 0;

    // ombre au sol
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x + TILE / 2, y + TILE - 3, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // pieds alignes sur le bas de la case, sprite centre horizontalement
    const dx = x + TILE / 2 - DRAW_W / 2;
    const dy = y + TILE - FEET;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, frame * CELL_W, row * CELL_H, CELL_W, CELL_H, dx, dy, DRAW_W, DRAW_H);
  }

  window.Valdoria.sprites = { draw };
})(window);
