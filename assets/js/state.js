(function (window) {
  "use strict";

  window.Valdoria = window.Valdoria || {};
  window.Valdoria.state = {
    gba: null,
    romBuffer: null,
    pendingSave: null,
    pendingSaveName: "",
    pendingSaveRead: null,
    lastLocalSaveAt: null,
    peer: null,
    conn: null,
    myPos: null,
    friend: {
      connected: false,
      name: "Ami",
      g: -1,
      m: -1,
      tx: 0,
      ty: 0,
      lastTx: null,
      lastTy: null,
      dx: 0,
      dy: 0,
      visible: false,
      direction: "down",
      movingUntil: 0,
      sexe: null
    }
  };
})(window);
