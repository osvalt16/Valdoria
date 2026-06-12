(function (window) {
  "use strict";

  const { $ } = window.Valdoria.dom;
  const state = window.Valdoria.state;
  const emulator = window.Valdoria.emulator;
  const network = window.Valdoria.network;
  const position = window.Valdoria.position;
  const overlay = window.Valdoria.overlay;
  const debug = window.Valdoria.debug;

  function startGameLoop() {
    network.connectWorld();
    setInterval(() => {
      state.myPos = position.readMyPos();
      if (state.myPos) network.sendPos(state.myPos);
      debug.updateDebug();
    }, 125);
    requestAnimationFrame(overlay.drawOverlay);
  }

  // pseudo retenu d'une visite à l'autre
  try {
    const pseudo = window.localStorage.getItem("valdoria.pseudo");
    if (pseudo) $("playerName").value = pseudo;
  } catch (e) { /* stockage indisponible */ }

  $("savInput").addEventListener("change", e => {
    emulator.loadSaveFile(e.target.files[0] || null);
  });

  $("playSavInput").addEventListener("change", e => {
    emulator.loadSaveFile(e.target.files[0] || null, { restart: true });
  });

  $("romInput").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    $("setup").style.display = "none";
    $("play").style.display = "block";
    document.body.classList.add("is-playing");
    emulator.bootEmulator(f, startGameLoop);
  });

  $("soundBtn").addEventListener("click", emulator.toggleSound);
  $("pauseBtn").addEventListener("click", emulator.togglePause);
  $("localSaveBtn").addEventListener("click", () => emulator.persistCurrentSave());
  $("localLoadBtn").addEventListener("click", emulator.loadLocalSave);
  $("saveBtn").addEventListener("click", emulator.downloadSave);
  $("debugToggle").addEventListener("click", debug.toggleDebugPanel);
})(window);
