(() => {
  "use strict";

  const scene = document.querySelector(".scene");
  const sign = document.querySelector(".sign");
  const arrival = document.querySelector(".sign-arrival");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const snapTolerance = 6;
  let angle = -14;
  let drag = null;
  let settling = false;
  let completed = false;
  let animationFrame = 0;

  async function animateScene(entering) {
    const objects = [document.querySelector(".grass-ground"), document.querySelector(".door"), arrival];
    await Promise.all(objects.map(async (object, i) => {
      const frames = entering ? [
        { transform: "translateY(110vh) scale(.96)", offset: 0 },
        { transform: "translateY(-14px) scale(1.015)", offset: .68 },
        { transform: "translateY(5px) scale(.995)", offset: .86 },
        { transform: "translateY(0) scale(1)", offset: 1 },
      ] : [
        { transform: "translateY(0) scale(1)", offset: 0 },
        { transform: "translateY(-18px) scale(1.01)", offset: .25 },
        { transform: "translateY(110vh) scale(.96)", offset: 1 },
      ];
      const animation = object.animate(frames, {
        duration: reducedMotion.matches ? 0 : entering ? 1050 : 750,
        delay: reducedMotion.matches ? 0 : (entering ? i : 2 - i) * 90,
        easing: "cubic-bezier(.4,0,.2,1)", fill: "both",
      });
      await animation.finished;
      object.style.transform = entering ? "" : "translateY(110vh)";
      animation.cancel();
    }));
  }
  registerLevel({
    background: "#d9c1a5",
    setup: () => animateScene(true),
    teardown: () => animateScene(false),
  });

  function setAngle(value) {
    angle = value;
    sign.style.setProperty("--angle", `${value}deg`);
    sign.setAttribute("aria-valuenow", String(Math.round(value)));
    sign.setAttribute("aria-valuetext", Math.abs(value) < 0.05
      ? "Straight"
      : `Tilted ${Math.abs(Math.round(value))} degrees ${value < 0 ? "left" : "right"}`);
  }

  function finishLevel() {
    completed = true;
    settling = false;
    scene.classList.add("complete");
    sign.setAttribute("aria-disabled", "true");
    status.textContent = "歡迎光臨！";
    completeLevel();
  }

  function checkPosition() {
    if (completed || settling || Math.abs(angle) > snapTolerance) return;
    settling = true;
    if (reducedMotion.matches) {
      setAngle(0);
      finishLevel();
      return;
    }
    const startAngle = angle;
    const startTime = performance.now();
    function settle(now) {
      const progress = Math.min((now - startTime) / 650, 1);
      // A damped spring lands precisely at zero without a visible final jump.
      const spring = Math.exp(-7 * progress) * Math.cos(9 * progress);
      setAngle(progress === 1 ? 0 : startAngle * spring);
      if (progress < 1) animationFrame = requestAnimationFrame(settle);
      else finishLevel();
    }
    animationFrame = requestAnimationFrame(settle);
  }

  sign.addEventListener("pointerdown", (event) => {
    if (completed || settling || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    // Finish the entrance before measuring the rotation pivot.
    arrival.getAnimations().forEach((animation) => animation.finish());
    const bounds = sign.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    if (Math.hypot(event.clientX - x, event.clientY - y) < 12) return;
    drag = { id: event.pointerId, x, y, last: Math.atan2(event.clientY - y, event.clientX - x) };
    sign.setPointerCapture(event.pointerId);
    sign.classList.add("dragging");
  });

  sign.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 12) return;
    const next = Math.atan2(event.clientY - drag.y, event.clientX - drag.x);
    const delta = Math.atan2(Math.sin(next - drag.last), Math.cos(next - drag.last));
    setAngle(Math.max(-45, Math.min(45, angle + delta * 180 / Math.PI)));
    drag.last = next;
  });

  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    sign.classList.remove("dragging");
    if (sign.hasPointerCapture(event.pointerId)) sign.releasePointerCapture(event.pointerId);
    if (event.type !== "pointercancel") checkPosition();
  }

  sign.addEventListener("pointerup", release);
  sign.addEventListener("pointercancel", release);
  sign.addEventListener("lostpointercapture", (event) => {
    if (drag && event.pointerId === drag.id) {
      drag = null;
      sign.classList.remove("dragging");
    }
  });
  sign.addEventListener("keydown", (event) => {
    if (completed || settling || drag) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      arrival.getAnimations().forEach((animation) => animation.finish());
      setAngle(Math.max(-45, Math.min(45, angle + (event.key === "ArrowLeft" ? -2 : 2))));
    }
  });
  sign.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (!drag) checkPosition();
    }
  });
  addEventListener("pagehide", () => cancelAnimationFrame(animationFrame));
})();
