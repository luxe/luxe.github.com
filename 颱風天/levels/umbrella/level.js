(() => {
  "use strict";

  const scene = document.querySelector(".scene");
  const umbrella = document.querySelector(".umbrella");
  const arrival = document.querySelector(".umbrella-arrival");
  const canopy = document.querySelector(".canopy");
  const panel = document.querySelector(".panel");
  const ribs = document.querySelector(".ribs");
  const light = document.querySelector(".seam-light");
  const supports = document.querySelector(".supports");
  const runner = document.querySelector(".runner");
  const shadow = document.querySelector(".shadow");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const rainSound = document.querySelector(".rain-sound");
  const rain = document.querySelector(".rain");
  const context = rain.getContext("2d");
  const drops = [];
  const openSound = wanwanAudio.sound("./assets/open.mp3");
  let fadeFrame = 0;
  let rainFrame = 0;
  let rainActive = false;
  let lastFrame = 0;
  let canopyWidth = 17;
  let canopyEdge = 520;
  let progress = 0;
  let drag = null;
  let completed = false;

  // In the game the engine owns background loops (rain is not part of this
  // level's soundscape); opened on its own, the level plays its own rain.
  function playRain() {
    if (!rainActive || parent !== window) return;
    if (rainSound.paused) {
      rainSound.play().catch(cause => console.warn("Rain sound could not play", cause));
    }
  }

  function playOpenSound() {
    clearTimeout(fadeFrame);
    fadeFrame = 0;
    openSound.volume = 1;
    if (!openSound.paused) return;
    openSound.stop();
    openSound.play().catch(cause => console.warn("Umbrella sound could not play", cause));
  }
  function fadeOpenSound(duration = 250) {
    if (openSound.paused || fadeFrame) return;
    const start = performance.now();
    const from = openSound.volume;
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / duration);
      openSound.volume = from * (1 - p);
      if (p < 1) { fadeFrame = setTimeout(step, 30); return; }
      fadeFrame = 0;
      openSound.stop();
      openSound.volume = 1;
    };
    fadeFrame = setTimeout(step, 30);
  }

  function resizeRain() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    rain.width = Math.round(innerWidth * ratio);
    rain.height = Math.round(innerHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drops.length = 0;
    const count = Math.min(180, Math.round(innerWidth * innerHeight / 4500));
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        speed: 320 + Math.random() * 180, length: 9 + Math.random() * 9,
      });
    }
  }

  function drawRain(now) {
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
    lastFrame = now;
    context.clearRect(0, 0, innerWidth, innerHeight);
    if (!reducedMotion.matches) {
      const matrix = umbrella.getScreenCTM();
      context.strokeStyle = "rgba(112, 151, 157, .48)";
      context.lineWidth = 1.4;
      context.lineCap = "round";
      context.beginPath();
      for (const drop of drops) {
        drop.y += drop.speed * dt;
        let surface = innerHeight + drop.length;
        if (matrix) {
          const fraction = Math.abs((drop.x - matrix.e) / matrix.a - 240) / canopyWidth;
          if (fraction <= 1) {
            // Invert the canopy's quadratic curve so drops stop exactly on the fabric.
            const t = (1.72 - Math.sqrt(1.72 ** 2 - 2.88 * fraction)) / 1.44;
            const y = (1 - t) ** 2 * 190 + 2 * (1 - t) * t * 202 + t ** 2 * canopyEdge;
            surface = y * matrix.d + matrix.f - 2;
          }
        }
        if (drop.y >= surface || drop.y > innerHeight + drop.length) {
          drop.y = -drop.length - Math.random() * 100;
          drop.x = Math.random() * innerWidth;
          continue;
        }
        context.moveTo(drop.x, drop.y - drop.length);
        context.lineTo(drop.x, Math.min(drop.y, surface));
      }
      context.stroke();
    }
    rainFrame = requestAnimationFrame(drawRain);
  }

  async function animateScene(entering) {
    const frames = entering ? [
      { transform: "translateY(110vh) scale(.96)", offset: 0 },
      { transform: "translateY(-15px) scale(1.015)", offset: .68 },
      { transform: "translateY(5px) scale(.995)", offset: .86 },
      { transform: "translateY(0) scale(1)", offset: 1 },
    ] : [
      { transform: "translateY(0) scale(1)", offset: 0 },
      { transform: "translateY(-18px) scale(1.01)", offset: .25 },
      { transform: "translateY(110vh) scale(.96)", offset: 1 },
    ];
    const animation = arrival.animate(frames, {
      duration: reducedMotion.matches ? 0 : entering ? 1050 : 750,
      easing: "cubic-bezier(.4,0,.2,1)", fill: "both",
    });
    await animation.finished;
    arrival.style.transform = entering ? "" : "translateY(110vh)";
    animation.cancel();
  }

  function render(value) {
    progress = Math.max(0, Math.min(1, value));
    const width = 17 + progress * 178;
    const edge = 520 - progress * 170;
    canopyWidth = width;
    canopyEdge = edge;
    const left = 240 - width;
    const right = 240 + width;
    const quarter = width / 2;
    const dip = 9 + progress * 14;
    const runnerY = 525 - progress * 165;
    // The ribs spread while their tips rise, rather than scaling a flat canopy.
    const top = `M${left} ${edge} Q${240 - width * .86} 202 240 190 Q${240 + width * .86} 202 ${right} ${edge}`;
    let hem = "";
    for (let i = 4; i > 0; i--) {
      const x = left + i * quarter;
      hem += `Q${x - quarter / 2} ${edge - dip} ${x - quarter} ${edge} `;
    }
    canopy.setAttribute("d", `${top} ${hem}Z`);
    panel.setAttribute("d", `M240 190 Q${240 - width * .45} 237 ${240 - quarter} ${edge} Q${240 - quarter / 2} ${edge - dip} 240 ${edge} Q${240 + width * .08} 240 240 190Z`);
    ribs.setAttribute("d", [-1, -.5, 0, .5, 1].map(fraction =>
      `M240 191 Q${240 + width * fraction * .68} ${230 + progress * 15} ${240 + width * fraction} ${edge}`
    ).join(" "));
    light.setAttribute("d", `M${left + 5} ${edge - 7} Q${240 - width * .83} 207 238 195`);
    supports.setAttribute("d", `M${left + 8} ${edge - 10} L240 ${runnerY + 8} L${right - 8} ${edge - 10}`);
    runner.setAttribute("y", String(runnerY));
    shadow.setAttribute("rx", String(42 + progress * 60));
    umbrella.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    umbrella.setAttribute("aria-valuetext", progress === 0 ? "Closed" : progress === 1 ? "Fully open" : `${Math.round(progress * 100)} percent open`);
  }

  function finish() {
    if (completed) return;
    completed = true;
    scene.classList.add("complete");
    umbrella.setAttribute("aria-disabled", "true");
    status.textContent = "傘打開了";
    completeLevel();
  }

  umbrella.addEventListener("pointerdown", event => {
    if (completed || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    playRain();
    drag = {
      id: event.pointerId, y: event.clientY, initial: progress,
      distance: scene.getBoundingClientRect().height * .36,
    };
    umbrella.setPointerCapture(event.pointerId);
    umbrella.classList.add("dragging");
  });
  umbrella.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id || completed) return;
    const before = progress;
    render(drag.initial + (drag.y - event.clientY) / drag.distance);
    if (progress > before) playOpenSound();
    if (progress === 1) finish();
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    umbrella.classList.remove("dragging");
    if (!completed) fadeOpenSound();
    if (umbrella.hasPointerCapture(event.pointerId)) umbrella.releasePointerCapture(event.pointerId);
  }
  umbrella.addEventListener("pointerup", release);
  umbrella.addEventListener("pointercancel", release);
  umbrella.addEventListener("lostpointercapture", release);
  umbrella.addEventListener("keydown", event => {
    if (event.key !== "ArrowUp") return;
    event.preventDefault();
    playRain();
    if (completed || drag) return;
    playOpenSound();
    render(Math.min(1, Math.round((progress + .1) * 1000) / 1000));
    if (progress === 1) finish();
  });

  render(0);
  registerLevel({
    background: "#dce7e5",
    setup: () => {
      rainActive = true;
      resizeRain();
      window.addEventListener("resize", resizeRain);
      lastFrame = 0;
      rainFrame = requestAnimationFrame(drawRain);
      playRain();
      return animateScene(true);
    },
    teardown: async () => {
      rainActive = false;
      rainSound.pause();
      fadeOpenSound(400);
      await animateScene(false);
      cancelAnimationFrame(rainFrame);
      context.clearRect(0, 0, innerWidth, innerHeight);
      window.removeEventListener("resize", resizeRain);
    },
  });
})();
