(function (window) {
  "use strict";

  const { $ } = window.Valdoria.dom;
  const state = window.Valdoria.state;
  const sprites = window.Valdoria.sprites;
  const SCALE = 2;
  const PLAYER_PX = 112;
  const PLAYER_PY = 72;

  function drawName(ctx, name, x, y) {
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(name, x + 16, y - 34);
    ctx.fillStyle = "#fff";
    ctx.fillText(name, x + 16, y - 34);
  }

  function drawOverlay() {
    const ctx = $("overlay").getContext("2d");
    const myPos = state.myPos;

    ctx.clearRect(0, 0, 480, 320);

    let ailleurs = 0;
    if (myPos) {
      for (const id of Object.keys(state.joueurs)) {
        const j = state.joueurs[id];
        if (j.g !== myPos.g || j.m !== myPos.m) { j.visible = false; ailleurs++; continue; }

        const px = PLAYER_PX + (j.tx - myPos.x) * 16;
        const py = PLAYER_PY + (j.ty - myPos.y) * 16;
        if (!j.visible) { j.dx = px; j.dy = py; j.visible = true; }
        j.dx += (px - j.dx) * 0.25;
        j.dy += (py - j.dy) * 0.25;

        const X = j.dx * SCALE;
        const Y = j.dy * SCALE;
        if (X > -40 && X < 510 && Y > -40 && Y < 350) {
          sprites.draw(ctx, X, Y, j);
          drawName(ctx, j.nom, X, Y);
        }
      }
    }

    const total = Object.keys(state.joueurs).length;
    if (state.monde && !myPos)
      $("friendInfo").textContent = "⏳ Recherche de ta position en mémoire… (sois sur la map, en train de marcher)";
    else if (ailleurs > 0)
      $("friendInfo").textContent = "📍 " + ailleurs + (ailleurs > 1 ? " joueurs explorent" : " joueur explore") + " d'autres zones…";
    else if (total === 0 && state.monde && myPos)
      $("friendInfo").textContent = "";
    else
      $("friendInfo").textContent = "";

    requestAnimationFrame(drawOverlay);
  }

  window.Valdoria.overlay = { drawOverlay };
})(window);
