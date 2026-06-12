(function (window) {
  "use strict";

  // Sprites originaux du joueur distant (aucun asset Nintendo extrait).
  // Deux personnages style GBA dessinés en blocs : garçon (casquette rouge)
  // et fille (couettes roses, jupe). Le choix se fait selon le genre lu dans
  // la partie de l'ami : friend.sexe = 0 (garçon), 1 (fille), null (neutre,
  // couleur dérivée du pseudo comme avant).

  const BOY = {
    hair: "#4a2f1d", cap: "#d12f2f", capDark: "#9e1f1f",
    shirt: "#d14b2f", bottom: "#2f4f8f", shoe: "#10131c",
    bag: "#efe7d2", jupe: false
  };
  const GIRL = {
    hair: "#e0699e", cap: null, capDark: null,
    shirt: "#f5f0f2", bottom: "#d13a55", shoe: "#7a3b4a",
    bag: "#f7d6e3", jupe: true
  };

  const SKIN = "#f0b985";
  const DARK = "#172036";
  const OUTLINE = "rgba(8,10,18,0.95)";
  const SHADOW = "rgba(0,0,0,0.35)";

  function colorFromName(name) {
    const colors = ["#2f7dd1", "#d1495b", "#2f9c67", "#8a5fd1", "#d1862f", "#269999"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return colors[hash % colors.length];
  }

  function styleFor(friend) {
    if (friend.sexe === 1) return GIRL;
    if (friend.sexe === 0) return BOY;
    const neutre = Object.assign({}, BOY);
    neutre.cap = null;
    neutre.shirt = colorFromName(friend.name || "Joueur");
    return neutre;
  }

  function drawPixel(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }

  function drawBlock(ctx, x, y, w, h, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w * size, h * size);
  }

  // Jambes : pantalon long (garçon/neutre) ou jupe + jambes nues (fille).
  function drawLegs(ctx, left, top, unit, s, step) {
    if (s.jupe) {
      drawBlock(ctx, left + 9, top + 27, 7, 4, unit, s.bottom);          // jupe
      drawBlock(ctx, left + 10, top + 35, 3, 3 + step, unit, SKIN);      // jambes
      drawBlock(ctx, left + 18, top + 35, 3, 3 + (step ? 0 : 1), unit, SKIN);
    } else {
      drawBlock(ctx, left + 10, top + 27, 4, 8 + step, unit, s.bottom);
      drawBlock(ctx, left + 18, top + 27, 4, 8 + (step ? 0 : 1), unit, s.bottom);
    }
    drawBlock(ctx, left + 9, top + 42 + step, 5, 2, unit, s.shoe);
    drawBlock(ctx, left + 17, top + 42 + (step ? 0 : 1), 5, 2, unit, s.shoe);
  }

  // Coiffure / casquette vue de face ou de dos.
  function drawHeadTop(ctx, left, top, unit, s, bob, deDos) {
    if (s.cap) {
      drawBlock(ctx, left + 9, top + 1 + bob, 7, 3, unit, s.cap);        // calotte
      if (!deDos) drawBlock(ctx, left + 9, top + 5 + bob, 2, 2, unit, s.capDark); // visière côté
      drawBlock(ctx, left + 9, top + 5 + bob, 2, 4, unit, s.hair);       // mèche
    } else {
      drawBlock(ctx, left + 9, top + 1 + bob, 7, 3, unit, s.hair);
      drawBlock(ctx, left + 9, top + 5 + bob, 2, 4, unit, s.hair);
    }
    if (s.jupe) {                                                        // couettes
      drawBlock(ctx, left + 5, top + 4 + bob, 2, 5, unit, s.hair);
      drawBlock(ctx, left + 24, top + 4 + bob, 2, 5, unit, s.hair);
    }
  }

  function draw(ctx, x, y, friend) {
    const s = styleFor(friend);
    const unit = 2;
    const top = y - 18;
    const left = x + 3;
    const moving = Date.now() < friend.movingUntil;
    const step = moving ? Math.floor(Date.now() / 160) % 2 : 0;
    const bob = moving && step ? 1 : 0;

    ctx.fillStyle = SHADOW;
    ctx.beginPath();
    ctx.ellipse(left + 16, top + 45, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    drawBlock(ctx, left + 8, top + 12 + bob, 8, 15, unit, OUTLINE);      // buste
    drawBlock(ctx, left + 10, top + 14 + bob, 6, 12, unit, s.shirt);

    if (friend.direction === "left" || friend.direction === "right") {
      const flip = friend.direction === "left" ? -1 : 1;
      const cx = left + 16;
      drawBlock(ctx, cx - 5, top + 2 + bob, 7, 9, unit, OUTLINE);        // tête
      drawBlock(ctx, cx - 4, top + 3 + bob, 6, 7, unit, SKIN);
      if (s.cap) {
        drawBlock(ctx, cx - 6, top + 1 + bob, 6, 3, unit, s.cap);
        drawBlock(ctx, cx + flip * 4, top + 3 + bob, 3, 1, unit, s.capDark); // visière
      } else {
        drawBlock(ctx, cx - 6, top + 1 + bob, 6, 3, unit, s.hair);
      }
      drawBlock(ctx, cx - flip * 7, top + 4 + bob, 3, 5, unit, s.hair);  // cheveux arrière
      if (s.jupe) drawBlock(ctx, cx - flip * 8, top + 6 + bob, 2, 5, unit, s.hair); // couette
      drawPixel(ctx, cx + flip * 6, top + 8 + bob, unit, DARK);          // œil
      drawBlock(ctx, cx - flip * 5, top + 17 + bob, 3, 7, unit, s.bag);  // bras
      drawBlock(ctx, cx + flip * 5, top + 17 + bob, 3, 6, unit, s.shirt);
      if (s.jupe) {
        drawBlock(ctx, cx - 7, top + 27, 7, 4, unit, s.bottom);          // jupe profil
        drawBlock(ctx, cx - 6, top + 35, 3, 3 + step, unit, SKIN);
        drawBlock(ctx, cx + 1, top + 35, 3, 3 + (step ? 0 : 1), unit, SKIN);
      } else {
        drawBlock(ctx, cx - 8, top + 27, 4, 8 + step, unit, s.bottom);
        drawBlock(ctx, cx + 2, top + 27, 4, 8 + (step ? 0 : 1), unit, s.bottom);
      }
      drawBlock(ctx, cx - 9, top + 42 + step, 5, 2, unit, s.shoe);
      drawBlock(ctx, cx + 1, top + 42 + (step ? 0 : 1), 5, 2, unit, s.shoe);
      return;
    }

    drawBlock(ctx, left + 8, top + 1 + bob, 8, 10, unit, OUTLINE);       // tête
    if (friend.direction === "up") {
      if (s.cap) drawBlock(ctx, left + 10, top + 2 + bob, 6, 3, unit, s.cap);
      drawBlock(ctx, left + 10, top + (s.cap ? 5 : 2) + bob, 6, s.cap ? 5 : 8, unit, s.hair);
      if (s.jupe) {
        drawBlock(ctx, left + 5, top + 4 + bob, 2, 5, unit, s.hair);
        drawBlock(ctx, left + 24, top + 4 + bob, 2, 5, unit, s.hair);
      }
      drawBlock(ctx, left + 7, top + 17 + bob, 3, 7, unit, s.bag);
      drawBlock(ctx, left + 20, top + 17 + bob, 3, 7, unit, s.shirt);
    } else {
      drawBlock(ctx, left + 10, top + 3 + bob, 6, 7, unit, SKIN);        // visage
      drawHeadTop(ctx, left, top, unit, s, bob, false);
      drawPixel(ctx, left + 22, top + 10 + bob, unit, DARK);             // yeux
      drawPixel(ctx, left + 12, top + 10 + bob, unit, DARK);
      drawBlock(ctx, left + 7, top + 17 + bob, 3, 7, unit, s.shirt);     // bras
      drawBlock(ctx, left + 20, top + 17 + bob, 3, 7, unit, s.shirt);
    }

    drawLegs(ctx, left, top, unit, s, step);
  }

  window.Valdoria.sprites = { draw };
})(window);
