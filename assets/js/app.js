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
    setInterval(() => {
      const conn = state.conn;
      state.myPos = position.readMyPos();
      if (state.myPos && conn && conn.open)
        conn.send({ t: "pos", x: state.myPos.x, y: state.myPos.y, g: state.myPos.g, m: state.myPos.m });
      debug.updateDebug();
    }, 125);
    requestAnimationFrame(overlay.drawOverlay);
  }

  $("savInput").addEventListener("change", e => {
    emulator.loadSaveFile(e.target.files[0] || null);
  });

  $("playSavInput").addEventListener("change", e => {
    emulator.loadSaveFile(e.target.files[0] || null);
  });

  $("romInput").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    $("setup").style.display = "none";
    $("play").style.display = "block";
    emulator.bootEmulator(f, startGameLoop);
  });

  $("soundBtn").addEventListener("click", emulator.toggleSound);
  $("pauseBtn").addEventListener("click", emulator.togglePause);
  $("saveBtn").addEventListener("click", emulator.downloadSave);
  $("hostBtn").addEventListener("click", network.hostRoom);
  $("joinBtn").addEventListener("click", network.joinRoom);
  $("debugToggle").addEventListener("click", debug.toggleDebugPanel);
})(window);
