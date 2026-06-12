(function (window) {
  "use strict";

  const state = window.Valdoria.state;
  const urlSb1 = new URLSearchParams(window.location.search).get("sb1");
  const sb1Candidates = urlSb1 ? [parseInt(urlSb1, 16)] : [0x03005008, 0x0300500C, 0x03005010];
  let sb1Found = null;
  let lastScan = 0;

  function lirePosA(addr) {
    const gba = state.gba;
    const ptr = gba.mmu.load32(addr) >>> 0;
    if (ptr < 0x02000000 || ptr >= 0x02040000) return null;
    const x = gba.mmu.loadU16(ptr);
    const y = gba.mmu.loadU16(ptr + 2);
    const g = gba.mmu.loadU8(ptr + 4);
    const m = gba.mmu.loadU8(ptr + 5);
    if (x < 1 || x > 1500 || y < 1 || y > 1500 || g > 60 || m > 90) return null;
    return { addr, ptr, x, y, g, m, sexe: lireSexe(addr) };
  }

  // Genre du héros : le pointeur SaveBlock2 suit SaveBlock1 en IWRAM,
  // et playerGender est à l'offset 0x8 (après le nom sur 8 octets).
  // 0 = garçon, 1 = fille, null = illisible.
  function lireSexe(sb1Addr) {
    try {
      const ptr2 = state.gba.mmu.load32(sb1Addr + 4) >>> 0;
      if (ptr2 < 0x02000000 || ptr2 >= 0x02040000) return null;
      const sexe = state.gba.mmu.loadU8(ptr2 + 8);
      return sexe === 0 || sexe === 1 ? sexe : null;
    } catch (e) {
      return null;
    }
  }

  function scanSaveBlock() {
    const gba = state.gba;
    for (let a = 0x03000000; a < 0x03007FF8; a += 4) {
      try {
        const p2 = gba.mmu.load32(a + 4) >>> 0;
        if (p2 < 0x02000000 || p2 >= 0x02040000) continue;
        const pos = lirePosA(a);
        if (pos) return a;
      } catch (e) { /* zone non mappée */ }
    }
    return null;
  }

  function readMyPos() {
    const gba = state.gba;
    if (!gba || !gba.rom) return null;
    try {
      if (sb1Found) {
        const pos = lirePosA(sb1Found);
        if (pos) return pos;
        sb1Found = null;
      }
      for (const addr of sb1Candidates) {
        const pos = lirePosA(addr);
        if (pos) { sb1Found = addr; return pos; }
      }
      const now = Date.now();
      if (now - lastScan > 3000) {
        lastScan = now;
        const a = scanSaveBlock();
        if (a) { sb1Found = a; return lirePosA(a); }
      }
    } catch (err) { /* lecture impossible pour l'instant */ }
    return null;
  }

  window.Valdoria.position = { readMyPos };
})(window);
