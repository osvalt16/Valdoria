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
    myPos:    null,
    mySprite: null,     // id du sprite choisi (character.js)
    monde: null,        // connexion au monde partagé (network.js)
    // joueurs distants, indexés par identifiant de session Firebase.
    // Chaque entrée : { nom, g, m, tx, ty, lastTx, lastTy, dx, dy,
    //                   visible, direction, movingUntil, sexe, sprite, t }
    joueurs: {}
  };
})(window);
