(function (window) {
  "use strict";

  // Offset de la table OW dans le ROM (entrees de 36 octets chacune).
  // Le premier entree (index 0) est toujours le heros.
  const OW_TABLE = {
    BPRE: 0x3A3BB0,  // FireRed EN
    BPRF: 0x3A3BB0,  // FireRed FR — meme structure, verifiee par signature
    BPRS: 0x3A3BB0,  // FireRed ES
    BPRD: 0x3A3BB0,  // FireRed DE
    BPRI: 0x3A3BB0,  // FireRed IT
  };

  // Table des palettes OW (16 couleurs x 2 octets = 32 octets par palette)
  // La palette 0 correspond au heros.
  const PAL_TABLE = {
    BPRE: 0x3A5158,
    BPRF: 0x3A5158,
    BPRS: 0x3A5158,
    BPRD: 0x3A5158,
    BPRI: 0x3A5158,
  };

  // Pointeur GBA → offset dans le fichier ROM
  function gbaToROM(ptr) { return (ptr >>> 0) - 0x08000000; }

  function readU32(arr, off) {
    return (arr[off] | (arr[off+1]<<8) | (arr[off+2]<<16) | (arr[off+3]<<24)) >>> 0;
  }
  function writeU16(arr, off, val) {
    arr[off]   = val & 0xFF;
    arr[off+1] = (val >> 8) & 0xFF;
  }

  // Detecte la version a partir du code en-tete (offset 0xAC-0xAF)
  function detectVersion(rom) {
    return String.fromCharCode(rom[0xAC], rom[0xAD], rom[0xAE], rom[0xAF]);
  }

  // Lit la table de frames de l'entree hero de la table OW.
  // Retourne un tableau d'objets { pixelOffset, sizeBytes }.
  function getHeroFrames(rom, owTableOffset) {
    // Verification de la signature FF FF au debut de l'entree hero
    if (rom[owTableOffset] !== 0xFF || rom[owTableOffset+1] !== 0xFF)
      throw new Error('Signature OW invalide a 0x' + owTableOffset.toString(16));

    // Pointeur vers la table de frames : octets 24-27 de l'entree (36 octets)
    const frameTablePtr = readU32(rom, owTableOffset + 24);
    const frameTableOff = gbaToROM(frameTablePtr);
    if (frameTableOff < 0 || frameTableOff >= rom.length)
      throw new Error('Pointeur frame table invalide: 0x' + frameTablePtr.toString(16));

    // Chaque entree de frame = 8 octets : pointeur pixel (4) + info taille (4)
    const frames = [];
    for (let i = 0; i < 16; i++) {
      const base = frameTableOff + i * 8;
      const rawPtr = readU32(rom, base);
      // Un pointeur ROM GBA commence par 0x08
      if ((rawPtr >>> 24) !== 0x08) break;
      const pixOff = gbaToROM(rawPtr);
      const sizeInfo = readU32(rom, base + 4);
      if (pixOff < 0 || pixOff >= rom.length) break;
      frames.push({ pixelOffset: pixOff, sizeInfo });
    }
    return frames;
  }

  // Charge un PNG dans un canvas et retourne { pixels, width, height }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({ pixels: ctx.getImageData(0, 0, c.width, c.height).data, width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = src;
    });
  }

  // Construit une palette GBA 15-bit a partir des pixels RGBA d'un cadre.
  // Retourne un tableau de 16 entiers (index 0 = transparent).
  function buildPalette(rgbaData, w, h, frameX, frameY, frameW, frameH) {
    const freq = new Map();
    for (let y = 0; y < frameH; y++) {
      for (let x = 0; x < frameW; x++) {
        const i = ((frameY + y) * w + (frameX + x)) * 4;
        if (rgbaData[i+3] < 64) continue; // transparent
        const r5 = rgbaData[i]   >> 3;
        const g5 = rgbaData[i+1] >> 3;
        const b5 = rgbaData[i+2] >> 3;
        const key = r5 | (g5 << 5) | (b5 << 10);
        freq.set(key, (freq.get(key) || 0) + 1);
      }
    }
    const sorted = [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0,15).map(e => e[0]);
    while (sorted.length < 15) sorted.push(0);
    return [0x0000, ...sorted]; // index 0 = transparent (noir GBA)
  }

  // Trouve l'index palette le plus proche pour un pixel RGBA donne.
  function nearestPaletteIdx(palette, r, g, b, a) {
    if (a < 64) return 0;
    const r5 = r >> 3, g5 = g >> 3, b5 = b >> 3;
    let best = 1, bestDist = Infinity;
    for (let i = 1; i < palette.length; i++) {
      const pr = palette[i] & 0x1F;
      const pg = (palette[i] >> 5) & 0x1F;
      const pb = (palette[i] >> 10) & 0x1F;
      const d = (r5-pr)**2 + (g5-pg)**2 + (b5-pb)**2;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  // Convertit un cadre (frameW x frameH pixels) en tuiles GBA 4bpp.
  // Le cadre est elargi a tileH*8 en hauteur (rembourrage transparent en haut).
  // Retourne un Uint8Array de tileW*tileH*32 octets.
  function frameToTiles(rgbaData, imgW, frameX, frameY, frameW, frameH, tileW, tileH, palette) {
    const pxH = tileH * 8; // hauteur totale de la tuile GBA
    const padTop = pxH - frameH; // rembourrage en haut (pieds en bas)
    const out = new Uint8Array(tileW * tileH * 32);

    for (let ty = 0; ty < tileH; ty++) {
      for (let tx = 0; tx < tileW; tx++) {
        const tileIdx = ty * tileW + tx;
        for (let row = 0; row < 8; row++) {
          const py = ty * 8 + row - padTop; // y dans le cadre PNG
          for (let col = 0; col < 4; col++) {
            const px0 = tx * 8 + col * 2;
            const px1 = px0 + 1;
            let p0 = 0, p1 = 0;
            if (py >= 0 && py < frameH) {
              const i0 = ((frameY + py) * imgW + (frameX + px0)) * 4;
              const i1 = ((frameY + py) * imgW + (frameX + px1)) * 4;
              if (px0 < frameW) p0 = nearestPaletteIdx(palette, rgbaData[i0], rgbaData[i0+1], rgbaData[i0+2], rgbaData[i0+3]);
              if (px1 < frameW) p1 = nearestPaletteIdx(palette, rgbaData[i1], rgbaData[i1+1], rgbaData[i1+2], rgbaData[i1+3]);
            }
            out[tileIdx * 32 + row * 4 + col] = (p1 << 4) | p0;
          }
        }
      }
    }
    return out;
  }

  // Conversion colonne/ligne PNG → index GBA frame
  // Notre PNG : 3 cols (walk-gauche, idle, walk-droite) x 4 lignes (bas, gauche, droite, haut)
  // GBA (9 frames) : bas x3, gauche x3, haut x3 (droite = gauche mirroire par OAM)
  const FRAME_MAP = [
    { col: 0, row: 0 }, // 0 bas walk-g
    { col: 1, row: 0 }, // 1 bas idle
    { col: 2, row: 0 }, // 2 bas walk-d
    { col: 0, row: 1 }, // 3 gauche walk-g
    { col: 1, row: 1 }, // 4 gauche idle
    { col: 2, row: 1 }, // 5 gauche walk-d
    { col: 0, row: 3 }, // 6 haut walk-g
    { col: 1, row: 3 }, // 7 haut idle
    { col: 2, row: 3 }, // 8 haut walk-d
  ];

  // Fonction principale : patche le buffer ROM avec le sprite choisi.
  // Retourne un nouveau ArrayBuffer patche.
  async function patchPlayer(romBuffer, spriteId) {
    const config = window.Valdoria.spritesConfig || [];
    const perso = config.find(p => p.id === spriteId);
    if (!perso) { console.warn('[rom-patch] Sprite introuvable:', spriteId); return romBuffer; }

    // Copie du buffer ROM (on ne modifie pas l'original)
    const rom = new Uint8Array(romBuffer.slice(0));

    const version = detectVersion(rom);
    const owBase = OW_TABLE[version];
    const palBase = PAL_TABLE[version];
    if (!owBase) { console.warn('[rom-patch] Version non supportee:', version); return romBuffer; }

    let frames;
    try { frames = getHeroFrames(rom, owBase); }
    catch (e) { console.warn('[rom-patch]', e.message); return romBuffer; }
    if (!frames.length) { console.warn('[rom-patch] Aucun frame detecte'); return romBuffer; }

    // Determine la taille d'un frame en tuiles.
    // Heuristique : calcule la distance entre les pointeurs de frames 0 et 1
    // pour deduire le nombre d'octets par frame (= tileW*tileH*32).
    let bytesPerFrame = 256; // defaut = 16x32 (2x4 tuiles)
    if (frames.length >= 2) {
      const dist = Math.abs(frames[1].pixelOffset - frames[0].pixelOffset);
      if (dist > 0 && dist <= 1024 && dist % 32 === 0) bytesPerFrame = dist;
    }
    // Nombre de tuiles = bytesPerFrame / 32 ; layout standard 2 tuiles de large
    const tileW = 2;
    const tileH = Math.round(bytesPerFrame / 32 / tileW);
    console.log('[rom-patch] Version:', version, '| Frames:', frames.length,
                '| BpF:', bytesPerFrame, '| Tuiles:', tileW, 'x', tileH);

    // Charge le PNG du personnage choisi
    let img;
    try { img = await loadImage(perso.src); }
    catch (e) { console.warn('[rom-patch] Impossible de charger', perso.src); return romBuffer; }

    const fW = Math.floor(img.width / 3);   // largeur d'un cadre dans le PNG
    const fH = Math.floor(img.height / 4);  // hauteur d'un cadre dans le PNG

    // Construit la palette globale a partir du cadre idle-bas (index 1)
    const paletteSrc = FRAME_MAP[1];
    const palette = buildPalette(img.pixels, img.width,
      paletteSrc.col * fW, paletteSrc.row * fH, fW, fH);

    // Patche chaque frame
    const count = Math.min(FRAME_MAP.length, frames.length);
    for (let i = 0; i < count; i++) {
      const { col, row } = FRAME_MAP[i];
      const tiles = frameToTiles(
        img.pixels, img.width,
        col * fW, row * fH, fW, fH, tileW, tileH, palette
      );
      const dst = frames[i].pixelOffset;
      const len = Math.min(tiles.length, bytesPerFrame, rom.length - dst);
      rom.set(tiles.subarray(0, len), dst);
    }

    // Patche la palette hero (si offset valide)
    if (palBase > 0 && palBase + 32 <= rom.length) {
      for (let i = 0; i < 16; i++) {
        writeU16(rom, palBase + i * 2, palette[i]);
      }
    }

    console.log('[rom-patch] Patch OK ✓', spriteId);
    return rom.buffer;
  }

  window.Valdoria.romPatch = { patchPlayer };
})(window);
