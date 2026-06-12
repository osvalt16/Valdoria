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
    const friend = state.friend;
    const myPos = state.myPos;
    const conn = state.conn;

    ctx.clearRect(0, 0, 480, 320);

    if (friend.connected && myPos) {
      if (friend.g === myPos.g && friend.m === myPos.m) {
        const px = PLAYER_PX + (friend.tx - myPos.x) * 16;
        const py = PLAYER_PY + (friend.ty - myPos.y) * 16;
        if (!friend.visible) { friend.dx = px; friend.dy = py; friend.visible = true; }
        friend.dx += (px - friend.dx) * 0.25;
        friend.dy += (py - friend.dy) * 0.25;

        const X = friend.dx * SCALE;
        const Y = friend.dy * SCALE;
        if (X > -40 && X < 510 && Y > -40 && Y < 350) {
          sprites.draw(ctx, X, Y, friend);
          drawName(ctx, friend.name, X, Y);
        }
        $("friendInfo").textContent = "";
      } else {
        friend.visible = false;
        $("friendInfo").textContent = "📍 " + friend.name + " explore une autre zone…";
      }
    } else if (conn && conn.open && !myPos) {
      $("friendInfo").textContent = "⏳ Recherche de ta position en mémoire… (sois sur la map, en train de marcher)";
    } else if (conn && conn.open && myPos && !friend.connected) {
      $("friendInfo").textContent = "⏳ En attente de la position de " + friend.name + "…";
    }
    requestAnimationFrame(drawOverlay);
  }

  window.Valdoria.overlay = { drawOverlay };
})(window);
