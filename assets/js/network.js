(function (window) {
  "use strict";

  const { $, setStatus } = window.Valdoria.dom;
  const state = window.Valdoria.state;
  const PREFIX = "valdoria-coop-";

  const myName = () => $("playerName").value.trim() || "Joueur";

  function randCode() {
    const c = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
  }

  function setupConn(c) {
    const friend = state.friend;
    state.conn = c;
    c.on("open", () => {
      c.send({ t: "hello", name: myName() });
      setStatus("Connecté ! Vous partagez le même monde.");
    });
    c.on("data", d => {
      if (d.t === "hello") friend.name = d.name;
      else if (d.t === "pos") {
        const previousX = friend.lastTx === null ? d.x : friend.tx;
        const previousY = friend.lastTy === null ? d.y : friend.ty;

        friend.connected = true;
        friend.lastTx = friend.tx;
        friend.lastTy = friend.ty;
        friend.g = d.g;
        friend.m = d.m;
        friend.tx = d.x;
        friend.ty = d.y;

        if (d.x !== previousX || d.y !== previousY) {
          if (Math.abs(d.x - previousX) >= Math.abs(d.y - previousY))
            friend.direction = d.x > previousX ? "right" : "left";
          else
            friend.direction = d.y > previousY ? "down" : "up";
          friend.movingUntil = Date.now() + 300;
        }
      }
    });
    c.on("close", () => {
      friend.connected = false;
      friend.visible = false;
      state.conn = null;
      setStatus("Ton ami s'est déconnecté.");
      $("friendInfo").textContent = "";
    });
  }

  function hostRoom() {
    const code = randCode();
    state.peer = new Peer(PREFIX + code);
    state.peer.on("open", () => setStatus("Salon créé ! Donne ce code à ton ami : " + code));
    state.peer.on("connection", setupConn);
    state.peer.on("error", e => setStatus("Erreur réseau : " + e.type));
    $("hostBtn").disabled = true;
    $("joinBtn").disabled = true;
  }

  function joinRoom() {
    const code = $("joinCode").value.trim().toUpperCase();
    if (code.length !== 4) { setStatus("Entre le code à 4 caractères donné par ton ami."); return; }
    state.peer = new Peer();
    state.peer.on("open", () => {
      setStatus("Connexion au salon " + code + "…");
      setupConn(state.peer.connect(PREFIX + code));
    });
    state.peer.on("error", e => setStatus("Erreur : " + e.type + " (code incorrect ?)"));
    $("hostBtn").disabled = true;
    $("joinBtn").disabled = true;
  }

  window.Valdoria.network = { hostRoom, joinRoom };
})(window);
