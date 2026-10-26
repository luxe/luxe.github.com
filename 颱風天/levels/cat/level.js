(() => {
  "use strict";

  const scene = document.querySelector(".scene");
  const cat = document.querySelector(".cat");
  const paw = document.querySelector(".paw");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const meow = wanwanAudio.sound("./assets/meow.mp3");
  function playMeow() {
    meow.currentTime = 0;
    meow.play().catch(cause => console.warn("Cat meow could not play", cause));
  }
  let pull = 0;
  let drag = null;
  let bouncing = false;
  let completed = false;
  let animationFrame = 0;

  async function animateScene(entering) {
    const objects = [document.querySelector(".table"), cat];
    await Promise.all(objects.map(async (object, i) => {
      const frames = entering ? [
        { transform: "translateY(110vh) scale(.94)", offset: 0 },
        { transform: "translateY(-16px) scale(1.02)", offset: .65 },
        { transform: "translateY(6px) scale(.99)", offset: .84 },
        { transform: "translateY(0) scale(1)", offset: 1 },
      ] : [
        { transform: "translateY(0) scale(1)", offset: 0 },
        { transform: "translateY(-20px) scale(1.02)", offset: .25 },
        { transform: "translateY(110vh) scale(.94)", offset: 1 },
      ];
      const animation = object.animate(frames, {
        duration: reducedMotion.matches ? 0 : entering ? 1100 : 750,
        delay: reducedMotion.matches ? 0 : (entering ? i : 1 - i) * 180,
        easing: "cubic-bezier(.4,0,.2,1)", fill: "both",
      });
      await animation.finished;
      object.style.transform = entering ? "" : "translateY(110vh)";
      animation.cancel();
    }));
  }
  registerLevel({
    background: "#ead9c7",
    setup: () => animateScene(true),
    teardown: () => {
      cancelAnimationFrame(animationFrame);
      completed = true;
      drag = null;
      paw.classList.remove("dragging");
      meow.pause();
      return animateScene(false);
    },
  });

  function setPull(value) {
    pull = value;
    paw.style.setProperty("--pull", `${-value}deg`);
    paw.setAttribute("aria-valuenow", String(Math.round(Math.max(0, value))));
  }

  function finish() {
    completed = true;
    bouncing = false;
    scene.classList.add("complete");
    paw.setAttribute("aria-disabled", "true");
    status.textContent = "招財貓";
    completeLevel();
  }

  function releasePull(cancelled = false) {
    if (bouncing || completed) return;
    const success = !cancelled && pull >= 24;
    const initial = pull;
    bouncing = true;
    if (reducedMotion.matches) {
      setPull(0);
      bouncing = false;
      if (success) finish();
      return;
    }
    const start = performance.now();
    const duration = success ? 1900 : 500;
    function bounce(now) {
      const progress = Math.min((now - start) / duration, 1);
      setPull(progress === 1 ? 0 : initial * Math.exp(-5 * progress) * Math.cos((success ? 23 : 7) * progress));
      if (progress < 1) animationFrame = requestAnimationFrame(bounce);
      else {
        bouncing = false;
        if (success) finish();
      }
    }
    animationFrame = requestAnimationFrame(bounce);
  }

  paw.addEventListener("pointerdown", event => {
    if (completed || bouncing || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    playMeow();
    cat.getAnimations().forEach(animation => animation.finish());
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, height: cat.getBoundingClientRect().height, initial: pull, moved: false };
    paw.setPointerCapture(event.pointerId);
    paw.classList.add("dragging");
  });
  paw.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) drag.moved = true;
    setPull(Math.max(0, Math.min(65, drag.initial + (event.clientY - drag.y) / drag.height * 250)));
  });
  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved && event.type === "pointerup") setPull(42);
    drag = null;
    paw.classList.remove("dragging");
    if (paw.hasPointerCapture(event.pointerId)) paw.releasePointerCapture(event.pointerId);
    releasePull(event.type !== "pointerup");
  }
  paw.addEventListener("pointerup", endDrag);
  paw.addEventListener("pointercancel", endDrag);
  paw.addEventListener("lostpointercapture", endDrag);
  paw.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (completed || bouncing || drag || event.repeat) return;
      playMeow();
      setPull(42);
      releasePull();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (completed || bouncing || drag) return;
    if (!event.repeat) playMeow();
    setPull(Math.max(0, Math.min(65, pull + (event.key === "ArrowDown" ? 28 : -28))));
  });
  paw.addEventListener("keyup", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!drag) releasePull();
    }
  });
  addEventListener("pagehide", () => cancelAnimationFrame(animationFrame));
})();
