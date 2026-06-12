(function (window) {
  "use strict";

  const { $ } = window.Valdoria.dom;
  const state = window.Valdoria.state;

  function toggleDebugPanel() {
    const p = $("debugPanel");
    p.style.display = p.style.display === "block" ? "none" : "block";
  }

  function updateDebug() {
    const p = $("debugPanel");
    const myPos = state.myPos;

    if (p.style.display !== "block") return;
    const hex = n => "0x" + (n >>> 0).toString(16).toUpperCase();
    const vitesse = state.ips ? `vitesse : ${state.ips} i/s (GBA réel = 59,7)\n` : "";
    const ids = Object.keys(state.joueurs);
    const autres = ids.length
      ? ids.map(id => {
          const j = state.joueurs[id];
          return `joueur ${j.nom} : map ${j.g}.${j.m}  x=${j.tx} y=${j.ty}`;
        }).join("\n")
      : "aucun autre joueur en ligne";
    p.textContent = vitesse + (myPos
      ? `moi  : map ${myPos.g}.${myPos.m}  x=${myPos.x} y=${myPos.y}  (sb1 ${hex(myPos.addr)} → ${hex(myPos.ptr)})\n` + autres
      : "position illisible — la ROM utilise peut-être d'autres adresses (essaie ?sb1=0x... dans l'URL)");
    p.style.whiteSpace = "pre";
  }

  window.Valdoria.debug = { toggleDebugPanel, updateDebug };
})(window);
