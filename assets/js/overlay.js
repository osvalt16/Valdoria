(function (window) {
  "use strict";

  const { $ } = window.Valdoria.dom;
  const state   = window.Valdoria.state;
  const sprites = window.Valdoria.sprites;
  const SCALE   = 2;
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
    const ctx   = $("overlay").getContext("2d");
    const myPos = state.myPos;

    ctx.clearRect(0, 0, 480, 320);

    if (myPos && state.surCarte !== false) {
      for (const id of Object.keys(state.joueurs)) {
        const j = state.joueurs[id];
        if (j.g !== myPos.g || j.m !== myPos.m) { j.visible = false; continue; }

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

    if (state.surCarte === false)
      $("friendInfo").textContent = "";
    else if (state.monde && !myPos)
      $("friendInfo").textContent = "En attente de ta position... (marche un peu en jeu)";
    else
      $("friendInfo").textContent = "";

    requestAnimationFrame(drawOverlay);
  }

  window.Valdoria.overlay = { drawOverlay };
})(window);
