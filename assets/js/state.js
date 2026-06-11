(function (window) {
  "use strict";

  window.Valdoria = window.Valdoria || {};
  window.Valdoria.state = {
    gba: null,
    pendingSave: null,
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
      dx: 0,
      dy: 0,
      visible: false
    }
  };
})(window);
