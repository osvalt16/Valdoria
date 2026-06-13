(function (window) {
  "use strict";

  const { $ } = window.Valdoria.dom;
  const state = window.Valdoria.state;
  const sprites = window.Valdoria.sprites;
  const SCALE = 2;
  const PLAYER_PX = 112;
  const PLAYER_PY = 72;

  // Suivi du joueur local pour animation et direction
  const moi = { lastX: null, lastY: null, direction: "down", movingUntil: 0 };

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

    if (myPos && state.surCarte !== false) {

      // ---- Autres joueurs ----
      let ailleurs = 0;
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

      // ---- Sprite du joueur local (par-dessus le sprite ROM) ----
      if (state.mySprite) {
        // Detecter le mouvement pour animer
        if (moi.lastX === null) { moi.lastX = myPos.x; moi.lastY = myPos.y; }
        if (myPos.x !== moi.lastX || myPos.y !== moi.lastY) {
          const dx = myPos.x - moi.lastX;
          const dy = myPos.y - moi.lastY;
          if (Math.abs(dx) >= Math.abs(dy))
            moi.direction = dx > 0 ? "right" : "left";
          else
            moi.direction = dy > 0 ? "down" : "up";
          moi.movingUntil = Date.now() + 500;
          moi.lastX = myPos.x;
          moi.lastY = myPos.y;
        }
        sprites.draw(ctx, PLAYER_PX * SCALE, PLAYER_PY * SCALE, {
          sprite: state.mySprite,
          sexe: null,
          direction: moi.direction,
          movingUntil: moi.movingUntil
        });
      }

    }

    const total = Object.keys(state.joueurs).length;
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
