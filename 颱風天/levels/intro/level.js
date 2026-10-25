(() => {
  "use strict";

  const scene = document.querySelector(".scene");
  const title = document.querySelector(".title");
  const start = document.querySelector(".start");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let started = false;

  function bounce(element, entering, delay) {
    const frames = entering ? [
      { transform: "translateY(-80vh) scale(.94)", opacity: 0, offset: 0 },
      { transform: "translateY(14px) scale(1.02)", opacity: 1, offset: .65 },
      { transform: "translateY(-5px) scale(.995)", opacity: 1, offset: .84 },
      { transform: "translateY(0) scale(1)", opacity: 1, offset: 1 },
    ] : [
      { transform: "translateY(0) scale(1)", offset: 0 },
      { transform: "translateY(-16px) scale(1.02)", offset: .25 },
      { transform: "translateY(110vh) scale(.95)", offset: 1 },
    ];
    const animation = element.animate(frames, {
      duration: reducedMotion.matches ? 0 : entering ? 1000 : 700,
      delay: reducedMotion.matches ? 0 : delay,
      easing: "cubic-bezier(.4,0,.2,1)", fill: "both",
    });
    return animation.finished.then(() => {
      element.style.transform = entering ? "" : "translateY(110vh)";
      animation.cancel();
    });
  }

  async function animateScene(entering) {
    scene.classList.remove("play");
    await Promise.all([
      bounce(title, entering, entering ? 0 : 120),
      bounce(start, entering, entering ? 160 : 0),
    ]);
    if (entering) scene.classList.add("play");
  }

  start.addEventListener("click", () => {
    if (started) return;
    started = true;
    document.querySelector("#status").textContent = "開始";
    if (parent !== window) parent.startMusic?.();
    completeLevel();
  });

  registerLevel({
    background: "#cfdadd",
    setup: () => animateScene(true),
    teardown: () => animateScene(false),
  });
})();
