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

  const waveArt = start.querySelector(".wave-art");

  // The wave rears back, curls forward and rolls off to the right, flinging foam.
  async function roll() {
    if (reducedMotion.matches) return;
    const box = start.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const dot = document.createElement("i");
      dot.className = "spray";
      dot.style.left = `${box.left + box.width * (.55 + Math.random() * .4)}px`;
      dot.style.top = `${box.top + box.height * (.1 + Math.random() * .3)}px`;
      dot.style.scale = String(.5 + Math.random());
      document.body.append(dot);
      dot.animate([
        { transform: "translate(0, 0)", opacity: 0 },
        { transform: `translate(${40 + Math.random() * 90}px, ${-30 - Math.random() * 60}px)`, opacity: 1, offset: .4 },
        { transform: `translate(${120 + Math.random() * 140}px, ${20 + Math.random() * 60}px)`, opacity: 0 },
      ], { duration: 700 + Math.random() * 300, delay: 380 + i * 18, easing: "ease-out", fill: "both" })
        .finished.then(() => dot.remove(), () => dot.remove());
    }
    const animation = waveArt.animate([
      { transform: "translateX(0) rotate(0deg) scale(1)", offset: 0 },
      { transform: "translateX(-14px) rotate(-10deg) scale(1.06, 1.1)", offset: .25, easing: "cubic-bezier(.5,0,.6,1)" },
      { transform: "translateX(18vw) rotate(14deg) scale(1.18)", offset: .6, easing: "cubic-bezier(.4,0,.8,.6)" },
      { transform: "translateX(70vw) rotate(32deg) scale(1.3, .4)", opacity: 0, offset: 1 },
    ], { duration: 1050, fill: "forwards" });
    await animation.finished;
  }

  start.addEventListener("click", async () => {
    if (started) return;
    started = true;
    start.classList.add("rolling");
    document.querySelector("#status").textContent = "開始";
    // Must run inside the tap so iOS lets audio start.
    if (parent !== window) parent.startMusic?.();
    await roll();
    completeLevel();
  });

  registerLevel({
    background: "#cfdadd",
    setup: () => animateScene(true),
    teardown: () => animateScene(false),
  });
})();
