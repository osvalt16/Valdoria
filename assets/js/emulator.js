(function (window) {
  "use strict";

  const { $, setStatus } = window.Valdoria.dom;
  const state = window.Valdoria.state;

  function bootEmulator(romFile, onReady) {
    const gba = new GameBoyAdvance();
    state.gba = gba;

    gba.keypad.eatInput = true;
    gba.logLevel = gba.LOG_ERROR;
    gba.setLogger((level, error) => console.error("[gba]", error));

    // Le renderer par défaut dépend d'un worker introuvable depuis le CDN.
    gba.video.renderPath = new GameBoyAdvanceSoftwareRenderer();

    gba.setCanvas($("screen"));
    gba.setBios(biosBin);
    gba.audio.masterEnable = false;

    // Rouge Feu peut rester bloqué dans IntrWait si les IRQ sont masquées.
    const avance = gba.advanceFrame.bind(gba);
    gba.advanceFrame = function () {
      if ((gba.cpu.gprs[15] >>> 0) < 0x4000 && gba.cpu.cpsrI) {
        try {
          if (gba.mmu.loadU16(0x04000200) & gba.mmu.loadU16(0x04000202))
            gba.cpu.cpsrI = false;
        } catch (e) { /* ignore */ }
      }
      avance();
    };

    gba.loadRomFromFile(romFile, ok => {
      if (!ok) { setStatus("Impossible de lire cette ROM."); return; }
      if (state.pendingSave) gba.loadSavedataFromFile(state.pendingSave);
      gba.runStable();
      setStatus("Prêt ! Crée un salon ou rejoins ton ami avec son code.");
      $("hostBtn").disabled = false;
      $("joinBtn").disabled = false;
      if (typeof onReady === "function") onReady();
    });
  }

  function setPendingSave(file) {
    state.pendingSave = file;
  }

  function loadSaveFile(file) {
    state.pendingSave = file || null;
    if (!file) return;

    const gba = state.gba;
    if (!gba || !gba.rom) return;

    gba.loadSavedataFromFile(file);
    setStatus("Sauvegarde chargée. Si tu es déjà en jeu, retourne au menu du jeu pour la relire.");
  }

  function toggleSound() {
    const gba = state.gba;
    gba.audio.masterEnable = !gba.audio.masterEnable;
    if (gba.audio.masterEnable && gba.audio.context && gba.audio.context.state !== "running")
      gba.audio.context.resume();
    $("soundBtn").textContent = gba.audio.masterEnable ? "🔇 Couper le son" : "🔊 Activer le son";
  }

  function togglePause() {
    const gba = state.gba;
    if (gba.paused) { gba.runStable(); $("pauseBtn").textContent = "Pause"; }
    else { gba.pause(); $("pauseBtn").textContent = "Reprendre"; }
  }

  function downloadSave() {
    state.gba.downloadSavedata();
  }

  window.Valdoria.emulator = {
    bootEmulator,
    setPendingSave,
    loadSaveFile,
    toggleSound,
    togglePause,
    downloadSave
  };
})(window);
