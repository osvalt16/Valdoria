(function (window) {
  "use strict";

  const $ = id => document.getElementById(id);
  const setStatus = message => { $("netStatus").textContent = message; };

  window.Valdoria = window.Valdoria || {};
  window.Valdoria.dom = { $, setStatus };
})(window);
