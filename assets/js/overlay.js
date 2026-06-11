(function (window) {
  "use strict";

  const { $ } = window.Valdoria.dom;
  const state = window.Valdoria.state;
  const SCALE = 2;
  const PLAYER_PX = 112;
  const PLAYER_PY = 72;

  function colorFromName(name) {
    const colors = ["#2f7dd1", "#d1495b", "#2f9c67", "#8a5fd1", "#d1862f", "#269999"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return colors[hash % colors.length];
  }

  function drawPixel(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }

  function drawBlock(ctx, x, y, w, h, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w * size, h * size);
  }

  function drawAvatar(ctx, x, y, friend) {
    const unit = 2;
    const top = y - 18;
    const left = x + 3;
    const moving = Date.now() < friend.movingUntil;
    const step = moving ? Math.floor(Date.now() / 160) % 2 : 0;
    const bob = moving && step ? 1 : 0;
    const shirt = colorFromName(friend.name);
    const dark = "#172036";
    const outline = "rgba(8,10,18,0.95)";
    const hair = "#312016";
    const skin = "#f0b985";
    const shadow = "rgba(0,0,0,0.35)";
    const pants = "#29324a";
    const shoe = "#10131c";
    const bag = "#efe7d2";

    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(left + 16, top + 45, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    drawBlock(ctx, left + 8, top + 12 + bob, 8, 15, unit, outline);
    drawBlock(ctx, left + 10, top + 14 + bob, 6, 12, unit, shirt);

    if (friend.direction === "left" || friend.direction === "right") {
      const flip = friend.direction === "left" ? -1 : 1;
      const cx = left + 16;
      drawBlock(ctx, cx - 5, top + 2 + bob, 7, 9, unit, outline);
      drawBlock(ctx, cx - 4, top + 3 + bob, 6, 7, unit, skin);
      drawBlock(ctx, cx - 6, top + 1 + bob, 6, 3, unit, hair);
      drawBlock(ctx, cx - 7, top + 5 + bob, 3, 4, unit, hair);
      drawPixel(ctx, cx + flip * 6, top + 8 + bob, unit, dark);
      drawBlock(ctx, cx - flip * 5, top + 17 + bob, 3, 7, unit, bag);
      drawBlock(ctx, cx + flip * 5, top + 17 + bob, 3, 6, unit, shirt);
      drawBlock(ctx, cx - 8, top + 27, 4, 8 + step, unit, pants);
      drawBlock(ctx, cx + 2, top + 27, 4, 8 + (step ? 0 : 1), unit, pants);
      drawBlock(ctx, cx - 9, top + 42 + step, 5, 2, unit, shoe);
      drawBlock(ctx, cx + 1, top + 42 + (step ? 0 : 1), 5, 2, unit, shoe);
      return;
    }

    drawBlock(ctx, left + 8, top + 1 + bob, 8, 10, unit, outline);
    if (friend.direction === "up") {
      drawBlock(ctx, left + 10, top + 2 + bob, 6, 8, unit, hair);
      drawBlock(ctx, left + 7, top + 17 + bob, 3, 7, unit, bag);
      drawBlock(ctx, left + 20, top + 17 + bob, 3, 7, unit, shirt);
    } else {
      drawBlock(ctx, left + 10, top + 3 + bob, 6, 7, unit, skin);
      drawBlock(ctx, left + 9, top + 1 + bob, 7, 3, unit, hair);
      drawBlock(ctx, left + 9, top + 5 + bob, 2, 4, unit, hair);
      drawPixel(ctx, left + 22, top + 10 + bob, unit, dark);
      drawPixel(ctx, left + 12, top + 10 + bob, unit, dark);
      drawBlock(ctx, left + 7, top + 17 + bob, 3, 7, unit, shirt);
      drawBlock(ctx, left + 20, top + 17 + bob, 3, 7, unit, shirt);
    }

    drawBlock(ctx, left + 10, top + 27, 4, 8 + step, unit, pants);
    drawBlock(ctx, left + 18, top + 27, 4, 8 + (step ? 0 : 1), unit, pants);
    drawBlock(ctx, left + 9, top + 42 + step, 5, 2, unit, shoe);
    drawBlock(ctx, left + 17, top + 42 + (step ? 0 : 1), 5, 2, unit, shoe);
  }

  function drawName(ctx, name, x, y) {
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(name, x + 16, y - 24);
    ctx.fillStyle = "#fff";
    ctx.fillText(name, x + 16, y - 24);
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
          drawAvatar(ctx, X, Y, friend);
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
