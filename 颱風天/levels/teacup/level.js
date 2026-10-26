(() => {
  "use strict";
  const scene = document.querySelector(".scene");
  const svg = document.querySelector("svg");
  const pot = document.querySelector(".pot");
  const cup = document.querySelector(".cup");
  const status = document.querySelector("#status");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const pour = wanwanAudio.sound("../tea/assets/pour.mp3", { loop: true, volume: .65 });
  let active = false, full = false, drinking = false, automatic = false;
  let drag = null, moved = false, fill = 0, frame = 0, last = 0;
  let pourRequest = 0;
  const timers = new Set();
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); if (active) fn(); }, ms);
    timers.add(id);
  }
  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  function setPour(on) {
    if (scene.classList.contains("tilted") === on) return;
    const request = ++pourRequest;
    scene.classList.toggle("tilted", on);
    if (!on) {
      scene.classList.remove("pouring");
      pour.pause();
      return;
    }
    const transitions = [pot, document.querySelector(".pot-position")]
      .flatMap(node => node.getAnimations());
    // Releasing or reversing the pot can cancel its in-flight transitions.
    Promise.all(transitions.map(animation => animation.finished.then(() => true, () => false)))
      .then(finished => {
        if (!active || full || request !== pourRequest || !finished.every(Boolean)) return;
        scene.classList.add("pouring");
        pour.play().catch(cause => console.warn("Tea pour could not play", cause));
      });
  }
  function tick(now) {
    if (!active) return;
    const dt = last ? Math.min(80, now - last) : 0;
    last = now;
    if (scene.classList.contains("pouring") && !full) {
      fill = Math.min(1, fill + dt / 2800);
      scene.style.setProperty("--fill", String(fill));
      if (fill === 1) {
        full = true;
        setPour(false);
        scene.classList.add("full");
        cup.setAttribute("aria-disabled", "false");
        pot.setAttribute("aria-disabled", "true");
        status.textContent = "茶好了，點茶杯喝茶。";
      }
    }
    frame = requestAnimationFrame(tick);
  }
  pot.addEventListener("pointerdown", event => {
    if (!active || full || drag || event.button !== 0) return;
    event.preventDefault();
    moved = false;
    automatic = false;
    drag = { id: event.pointerId, start: point(event) };
    pot.setPointerCapture(event.pointerId);
  });
  pot.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId || full) return;
    const p = point(event);
    if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 10) moved = true;
    setPour(drag.start.y - p.y > 40);
  });
  function release(event) {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    setPour(false);
  }
  pot.addEventListener("pointerup", release);
  pot.addEventListener("pointercancel", event => { moved = true; release(event); });
  pot.addEventListener("lostpointercapture", release);
  function autoPour() {
    if (!active || full || drinking) return;
    automatic = !automatic;
    setPour(automatic);
  }
  pot.addEventListener("click", () => { if (!moved) autoPour(); moved = false; });
  pot.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); autoPour(); }
  });
  function drink() {
    if (!active || !full || drinking) return;
    drinking = true;
    cup.setAttribute("aria-disabled", "true");
    scene.classList.add("drinking");
    later(() => {
      scene.classList.add("empty");
      status.textContent = "喝完了，心裡的颱風也平靜了。";
    }, reduced.matches ? 0 : 650);
    later(() => completeLevel(), reduced.matches ? 900 : 2500);
  }
  cup.addEventListener("click", drink);
  cup.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); drink(); }
  });
  registerLevel({
    background: "#e8e0d3",
    setup: async () => {
      if (!reduced.matches) await svg.animate([
        { transform: "translateY(110vh)" }, { transform: "translateY(0)" },
      ], { duration: 800, easing: "cubic-bezier(.2,.8,.3,1)" }).finished;
      active = true;
      frame = requestAnimationFrame(tick);
    },
    teardown: async () => {
      active = false;
      cancelAnimationFrame(frame);
      for (const id of timers) clearTimeout(id);
      timers.clear();
      setPour(false);
      if (drag && pot.hasPointerCapture(drag.id)) pot.releasePointerCapture(drag.id);
      drag = null;
      if (!reduced.matches) await svg.animate([
        { transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-35px)", opacity: 0 },
      ], { duration: 650, easing: "ease-in" }).finished;
    },
  });
})();
