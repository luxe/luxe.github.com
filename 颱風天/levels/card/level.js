(() => {
  "use strict";
  const svg = document.querySelector(".station");
  const arrival = document.querySelector(".arrival");
  const card = document.querySelector(".card");
  const sensor = document.querySelector(".sensor");
  const doors = [...document.querySelectorAll(".door")];
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const gateSound = wanwanAudio.sound("./asset/gate.mp3");
  const home = { x: 165, y: 640, angle: -9 };
  const sensorCenter = { x: 451, y: 429 };
  let position = { ...home };
  let drag = null;
  let completed = false;
  let completionTimer = 0;
  const animations = new Set();

  function render(value = position) {
    card.setAttribute("transform", `translate(${value.x} ${value.y}) rotate(${value.angle})`);
  }
  function svgPoint(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  function isOverSensor(value) {
    return Math.abs(value.x - sensorCenter.x) <= 70 && Math.abs(value.y - sensorCenter.y) <= 55;
  }
  function track(animation) {
    animations.add(animation);
    animation.finished.finally(() => animations.delete(animation)).catch(() => {});
    return animation;
  }
  async function moveCard(target, duration) {
    const from = { ...position };
    position = { ...target };
    if (reducedMotion.matches) {
      render();
      return;
    }
    const animation = track(card.animate([
      { transform: `translate(${from.x}px, ${from.y}px) rotate(${from.angle}deg)` },
      { transform: `translate(${target.x}px, ${target.y}px) rotate(${target.angle}deg)` },
    ], { duration, easing: "cubic-bezier(.2,.9,.25,1.12)", fill: "forwards" }));
    try {
      await animation.finished;
    } catch {
      return;
    }
    render();
    animation.cancel();
  }

  async function accept() {
    if (completed) return;
    completed = true;
    scene.classList.remove("near");
    scene.classList.add("accepted", "complete");
    card.setAttribute("aria-disabled", "true");
    status.textContent = "閘門打開了";
    await moveCard({ ...sensorCenter, angle: 0 }, 260);
    const duration = reducedMotion.matches ? 0 : 520;
    gateSound.currentTime = 0;
    gateSound.play().catch(cause => console.warn("Gate sound could not play", cause));
    doors.forEach((door, index) => track(door.animate([
      { transform: "translateX(0)" },
      { transform: `translateX(${index === 0 ? -88 : 88}px)` },
    ], { duration, delay: reducedMotion.matches ? 0 : 120, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" })));
    completionTimer = setTimeout(completeLevel, reducedMotion.matches ? 250 : 1250);
  }

  card.addEventListener("pointerdown", event => {
    if (completed || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    for (const animation of card.getAnimations()) animation.cancel();
    render();
    const point = svgPoint(event);
    drag = { id: event.pointerId, start: point, from: { ...position } };
    card.classList.add("held");
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const point = svgPoint(event);
    const x = Math.max(120, Math.min(480, drag.from.x + point.x - drag.start.x));
    const y = Math.max(250, Math.min(700, drag.from.y + point.y - drag.start.y));
    position = { x, y, angle: drag.from.angle * .45 };
    render();
    scene.classList.toggle("near", isOverSensor(position));
  });
  function release(event, cancelled = false) {
    if (!drag || event?.pointerId !== undefined && event.pointerId !== drag.id) return;
    const id = drag.id;
    drag = null;
    card.classList.remove("held");
    if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
    if (!cancelled && isOverSensor(position)) {
      accept();
    } else {
      scene.classList.remove("near");
      moveCard(home, 520);
    }
  }
  svg.addEventListener("pointerup", event => release(event));
  svg.addEventListener("pointercancel", event => release(event, true));
  svg.addEventListener("lostpointercapture", event => { if (drag) release(event, true); });
  card.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    accept();
  });
  addEventListener("blur", () => { if (drag) release({ pointerId: drag.id }, true); });

  async function animateScene(entering) {
    const animation = arrival.animate(entering ? [
      { transform: "translateY(110vh)" },
      { transform: "translateY(-12px)", offset: .72 },
      { transform: "translateY(4px)", offset: .88 },
      { transform: "translateY(0)" },
    ] : [
      { transform: "translateY(0)" },
      { transform: "translateY(-15px)", offset: .25 },
      { transform: "translateY(110vh)" },
    ], { duration: reducedMotion.matches ? 0 : entering ? 1050 : 750, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
    await animation.finished;
    arrival.style.transform = entering ? "" : "translateY(110vh)";
    animation.cancel();
  }
  render();
  registerLevel({
    background: "#dce7e5",
    setup: () => animateScene(true),
    teardown: () => {
      clearTimeout(completionTimer);
      if (drag) release({ pointerId: drag.id }, true);
      for (const animation of animations) animation.cancel();
      return animateScene(false);
    },
  });
})();
