(function (window) {
  "use strict";

  const { $ } = window.Valdoria.dom;
  const state = window.Valdoria.state;
  const directionKeys = ["UP", "RIGHT", "DOWN", "LEFT"];
  let joystickPointer = null;

  function keypad() {
    return state.gba && state.gba.keypad ? state.gba.keypad : null;
  }

  function setKey(key, pressed) {
    const pad = keypad();
    if (!pad || typeof pad[key] !== "number") return;

    const bit = 1 << pad[key];
    if (pressed) pad.currentDown &= ~bit;
    else pad.currentDown |= bit;
  }

  function releaseDirections() {
    directionKeys.forEach(key => setKey(key, false));
  }

  function bindTouchButton(button) {
    const key = button.dataset.gbaKey;
    if (!key) return;

    const press = event => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      button.classList.add("is-active");
      setKey(key, true);
    };
    const release = event => {
      event.preventDefault();
      button.classList.remove("is-active");
      setKey(key, false);
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => {
      button.classList.remove("is-active");
      setKey(key, false);
    });
  }

  function updateJoystick(event) {
    const stick = $("touchJoystick");
    const knob = stick.querySelector(".joystick-knob");
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.28;
    const dx = Math.max(-max, Math.min(max, event.clientX - cx));
    const dy = Math.max(-max, Math.min(max, event.clientY - cy));
    const threshold = rect.width * 0.14;

    releaseDirections();
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > threshold) setKey(dx > 0 ? "RIGHT" : "LEFT", true);
    } else if (Math.abs(dy) > threshold) {
      setKey(dy > 0 ? "DOWN" : "UP", true);
    }

    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function resetJoystick() {
    const stick = $("touchJoystick");
    const knob = stick.querySelector(".joystick-knob");
    joystickPointer = null;
    releaseDirections();
    knob.style.transform = "translate(-50%, -50%)";
  }

  function bindJoystick() {
    const stick = $("touchJoystick");
    stick.addEventListener("pointerdown", event => {
      event.preventDefault();
      joystickPointer = event.pointerId;
      stick.setPointerCapture?.(event.pointerId);
      updateJoystick(event);
    });
    stick.addEventListener("pointermove", event => {
      if (event.pointerId !== joystickPointer) return;
      event.preventDefault();
      updateJoystick(event);
    });
    stick.addEventListener("pointerup", event => {
      if (event.pointerId !== joystickPointer) return;
      event.preventDefault();
      resetJoystick();
    });
    stick.addEventListener("pointercancel", resetJoystick);
    stick.addEventListener("lostpointercapture", resetJoystick);
  }

  function toggleValdoriaMenu(open) {
    $("valdoriaOptions").classList.toggle("open", open);
    $("mobileBackdrop").classList.toggle("open", open);
  }

  function bindMenus() {
    $("mobileValdoriaBtn").addEventListener("click", () => toggleValdoriaMenu(true));
    $("closeValdoriaMenu").addEventListener("click", () => toggleValdoriaMenu(false));
    $("mobileBackdrop").addEventListener("click", () => toggleValdoriaMenu(false));
  }

  document.querySelectorAll("[data-gba-key]").forEach(bindTouchButton);
  bindJoystick();
  bindMenus();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      releaseDirections();
      ["A", "B", "L", "R", "START", "SELECT"].forEach(key => setKey(key, false));
    }
  });
})(window);
