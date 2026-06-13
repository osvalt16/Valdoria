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
      state.surCarte = position.estSurCarte();
      if (state.myPos) {
        network.sendPos(state.myPos);
        if (window.Valdoria.linkroom) window.Valdoria.linkroom.check(state.myPos);
      }
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
  $("saveBtn").addEventListener("click", emulator.downloadSave);
  $("debugToggle").addEventListener("click", debug.toggleDebugPanel);

  // Drawer mobile — délégation vers les mêmes handlers
  const drawerSoundBtn = $("drawerSoundBtn");
  if (drawerSoundBtn) drawerSoundBtn.addEventListener("click", emulator.toggleSound);

  const drawerImportBtn = $("drawerImportBtn");
  if (drawerImportBtn) drawerImportBtn.addEventListener("click", () => $("playSavInput").cli