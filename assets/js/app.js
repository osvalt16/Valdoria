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
  const debugToggle = $("debugToggle");
  if (debugToggle) debugToggle.addEventListener("click", debug.toggleDebugPanel);

  // Drawer mobile — délégation vers les mêmes handlers
  const drawerSoundBtn = $("drawerSoundBtn");
  if (drawerSoundBtn) drawerSoundBtn.addEventListener("click", emulator.toggleSound);

  const drawerImportBtn = $("drawerImportBtn");
  if (drawerImportBtn) drawerImportBtn.addEventListener("click", () => $("playSavInput").click());

  const drawerSaveBtn = $("drawerSaveBtn");
  if (drawerSaveBtn) {
    drawerSaveBtn.addEventListener("click", emulator.downloadSave);
    // Sync état disabled depuis #saveBtn
    const origSave = $("saveBtn");
    if (origSave) new MutationObserver(() => {
      drawerSaveBtn.disabled = origSave.disabled;
    }).observe(origSave, { attributes: true, attributeFilter: ["disabled"] });
  }

  // Sync visibilité bouton map Cable Club
  const drawerMapBtn = $("drawerLinkroomBtn2");
  const origMapBtn = $("linkroomBtnSaveMap2");
  if (drawerMapBtn && origMapBtn) {
    drawerMapBtn.addEventListener("click", () => { if (!origMapBtn.hidden) origMapBtn.click(); });
    new MutationObserver(() => {
      origMapBtn.hidden
        ? drawerMapBtn.setAttribute("hidden", "")
        : drawerMapBtn.removeAttribute("hidden");
    }).observe(origMapBtn, { attributes: true, attributeFilter: ["hidden"] });
  }

  // légende des boutons (bas droite)
  $("legendeToggle").addEventListener("click", e => {
    e.stopPropagation();
    const p = $("legendePanel");
    p.hidden ? p.removeAttribute("hidden") : p.setAttribute("hidden", "");
  });
  document.addEventListener("click", () => $("legendePanel").setAttribute("hidden", ""));
})(window);
