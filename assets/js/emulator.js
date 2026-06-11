(function (window) {
  "use strict";

  const { $, setStatus } = window.Valdoria.dom;
  const state = window.Valdoria.state;

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => resolve(event.target.result);
      reader.onerror = () => reject(reader.error || new Error("Lecture impossible."));
      reader.readAsArrayBuffer(file);
    });
  }

  function isSavFile(file) {
    return !!file && /\.sav$/i.test(file.name);
  }

  function setSaveData(buffer, name) {
    state.pendingSave = buffer;
    state.pendingSaveName = name || "";
  }

  function applyPendingSave() {
    if (!state.gba || !state.pendingSave) return false;
    state.gba.setSavedata(state.pendingSave);
    return true;
  }

  function resetWithCurrentSave() {
    const gba = state.gba;
    if (!gba || !state.romBuffer || !state.pendingSave) return false;

    const soundEnabled = gba.audio.masterEnable;
    gba.pause();
    gba.setRom(state.romBuffer);
    gba.audio.masterEnable = soundEnabled;
    applyPendingSave();
    state.myPos = null;
    state.friend.visible = false;
    $("pauseBtn").textContent = "Pause";
    gba.runStable();
    return true;
  }

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

    readFileAsArrayBuffer(romFile).then(async romBuffer => {
      if (state.pendingSaveRead) await state.pendingSaveRead;
      state.romBuffer = romBuffer;
      const ok = gba.setRom(romBuffer);
      if (!ok) { setStatus("Impossible de lire cette ROM."); return; }
      applyPendingSave();
      gba.runStable();
      setStatus("Prêt ! Crée un salon ou rejoins ton ami avec son code.");
      $("hostBtn").disabled = false;
      $("joinBtn").disabled = false;
      if (typeof onReady === "function") onReady();
    }).catch(error => {
      console.error("[gba]", error);
      setStatus("Impossible de lire cette ROM.");
    });
  }

  function loadSaveFile(file, options = {}) {
    state.pendingSaveRead = null;
    if (!file) return;
    if (!isSavFile(file)) {
      setStatus("Choisis un fichier de sauvegarde .sav.");
      return;
    }

    const read = readFileAsArrayBuffer(file).then(buffer => {
      setSaveData(buffer, file.name);
      if (options.restart && state.gba && state.gba.rom) {
        resetWithCurrentSave();
        setStatus("Sauvegarde .sav chargée. Lance la partie depuis le menu du jeu.");
      }
      return buffer;
    }).catch(error => {
      console.error("[gba]", error);
      setStatus("Impossible de lire cette sauvegarde .sav.");
      return null;
    });
    state.pendingSaveRead = read;
    return read;
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
    loadSaveFile,
    toggleSound,
    togglePause,
    downloadSave
  };
})(window);
