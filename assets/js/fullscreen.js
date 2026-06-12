(function (window) {
  "use strict";

  // Bouton plein écran (mobile) : masque la barre du navigateur.
  // On met <html> en plein écran, pas #screenWrap, pour garder les
  // contrôles tactiles utilisables.

  const { $ } = window.Valdoria.dom;
  const root = document.documentElement;
  const btn = $("fullscreenBtn");

  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!request) {
    // iPhone : l'API n'existe pas, on cache le bouton.
    btn.hidden = true;
    window.Valdoria.fullscreen = { toggle: function () {} };
    return;
  }

  function current() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  function toggle() {
    if (current()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      request.call(root);
    }
  }

  function refresh() {
    btn.textContent = current() ? "✕" : "⛶";
  }

  btn.addEventListener("click", toggle);
  document.addEventListener("fullscreenchange", refresh);
  document.addEventListener("webkitfullscreenchange", refresh);

  window.Valdoria.fullscreen = { toggle };
})(window);
