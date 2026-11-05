(() => {
  "use strict";

  const SVG = "http://www.w3.org/2000/svg";
  const root = document.documentElement;
  const scene = document.querySelector(".scene");
  const title = document.querySelector(".title");
  const start = document.querySelector(".start");
  const land = document.querySelector(".land");
  const sea = document.querySelector(".sea");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let started = false;

  // Wave artwork coordinates: the waterline sits at y = WATERLINE in a 220 x 150 viewBox.
  const VIEW_HEIGHT = 150;
  const WATERLINE = 134;
  const HORIZON = 22;

  // Pin the sea and skyline to the wave so its base always melts into the water.
  function alignSea() {
    const height = start.offsetHeight;
    if (!height) return;
    // Layout offsets ignore the entrance transforms, unlike getBoundingClientRect.
    let top = 0;
    for (let node = start; node; node = node.offsetParent) top += node.offsetTop;
    root.style.setProperty("--waterline", `${top + height * WATERLINE / VIEW_HEIGHT}px`);
    root.style.setProperty("--horizon", `${top + height * HORIZON / VIEW_HEIGHT}px`);
  }
  alignSea();
  new ResizeObserver(alignSea).observe(document.body);
  window.addEventListener("resize", alignSea);

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
    return play(element, frames, entering ? 1000 : 700, delay, entering);
  }

  // The scenery rises into place and later sinks away like the other levels.
  function slide(element, entering, delay) {
    const frames = entering ? [
      { transform: "translateY(100%)", offset: 0 },
      { transform: "translateY(-6px)", offset: .75 },
      { transform: "translateY(0)", offset: 1 },
    ] : [
      { transform: "translateY(0)" },
      { transform: "translateY(110vh)" },
    ];
    return play(element, frames, entering ? 950 : 750, delay, entering);
  }

  // The wave swells up out of the water instead of dropping from the sky.
  function surface(element, entering, delay) {
    const frames = entering ? [
      { transform: "scale(.5, 0)", offset: 0 },
      { transform: "scale(1.04, 1.1)", offset: .65 },
      { transform: "scale(.99, .97)", offset: .85 },
      { transform: "scale(1)", offset: 1 },
    ] : [
      { transform: "scale(1)" },
      { transform: "scale(.6, 0)" },
    ];
    return play(element, frames, entering ? 900 : 450, delay, entering);
  }

  function play(element, frames, duration, delay, entering) {
    const animation = element.animate(frames, {
      duration: reducedMotion.matches ? 0 : duration,
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
    alignSea();
    await Promise.all(entering ? [
      slide(land, true, 0),
      slide(sea, true, 80),
      bounce(title, true, 120),
      surface(start, true, 650),
    ] : [
      surface(start, false, 0),
      bounce(title, false, 120),
      slide(sea, false, 200),
      slide(land, false, 280),
    ]);
    if (entering) scene.classList.add("play");
  }

  const body = start.querySelector(".wave-body");
  const foam = start.querySelector(".foam");
  const shade = start.querySelector(".wave-shade");
  const thread = start.querySelector(".water-thread");
  const flecks = start.querySelectorAll(".foam-flecks circle");
  const whitewater = start.querySelector(".whitewater");
  const splashLayer = start.querySelector(".splash-layer");
  const animations = new Set();
  let rollFrame = 0;
  let cancelRoll = null;

  const DEG = Math.PI / 180;
  const clamp01 = value => Math.max(0, Math.min(1, value));
  const smooth = (from, to, value) => {
    const t = clamp01((value - from) / (to - from));
    return t * t * (3 - 2 * t);
  };
  const mix = (a, b, t) => a + (b - a) * t;
  const fmt = value => value.toFixed(1);
  const line = points => "M" + points.map(point => `${fmt(point.x)} ${fmt(Math.min(WATERLINE, point.y))}`).join("L");

  // The wave is a ribbon whose heading bends smoothly from a steep back to a
  // curling lip. Easing every shape parameter continuously lets the crest pitch
  // forward, roll over and lay down into the sea with no stop between poses.
  function waveShape(progress) {
    const pitch = smooth(0, .55, progress);
    const fall = smooth(.25, .85, progress);
    const settle = smooth(.5, 1, progress);
    const startX = 4 + 100 * smooth(0, 1, progress);
    const length = mix(mix(310, 330, pitch), 280, settle);
    const back = mix(62, 0, fall) * DEG;
    const curl = mix(mix(225, 275, pitch), 0, settle) * DEG;
    const tightness = mix(2.3, 3, pitch);
    const thickness = mix(mix(26, 20, pitch), 9, settle);
    const steps = 160;
    const center = [];
    let x = startX;
    let y = WATERLINE;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const heading = -back + (back + curl) * u ** tightness;
      if (i) {
        x += Math.cos(heading) * length / steps;
        y += Math.sin(heading) * length / steps;
      }
      center.push({ x, y, heading, width: thickness * (1 - .8 * u ** 2.5) });
    }
    const outer = center.map(c => ({ x: c.x + Math.sin(c.heading) * c.width / 2, y: c.y - Math.cos(c.heading) * c.width / 2 }));
    const inner = center.map(c => ({ x: c.x - Math.sin(c.heading) * c.width / 2, y: c.y + Math.cos(c.heading) * c.width / 2 }));
    let faceIndex = center.findIndex(c => c.heading >= -12 * DEG);
    if (faceIndex < 0) faceIndex = steps;
    const top = inner[faceIndex];
    const rise = Math.max(0, WATERLINE - top.y);
    // The concave face tucks back under the lip, then flares into the trough.
    const bodyPath = `M${fmt(startX)} ${WATERLINE}` + line([...outer, ...inner.slice(faceIndex).reverse()]).replace("M", "L") +
      `C${fmt(top.x - rise * .22)} ${fmt(top.y + rise * .35)} ${fmt(top.x - rise * .05)} ${fmt(WATERLINE - rise * .12)} ${fmt(top.x + rise * .55)} ${WATERLINE}Z`;

    // A pale crescent of light along the back of the swell.
    const shadeEnd = Math.max(2, Math.floor(faceIndex * .9));
    const shadeOuter = outer.slice(Math.floor(steps * .08), shadeEnd);
    const shadeInner = shadeOuter.map((point, i) => {
      const c = center[Math.floor(steps * .08) + i];
      const depth = thickness * .9 * Math.sin(Math.PI * i / Math.max(1, shadeOuter.length - 1));
      return { x: point.x - Math.sin(c.heading) * depth, y: point.y + Math.cos(c.heading) * depth };
    });
    const shadePath = shadeOuter.length > 1 ? line([...shadeOuter, ...shadeInner.reverse()]) + "Z" : "";

    const threadPath = line(center.slice(Math.floor(steps * .12), Math.floor(steps * .45)).map(c => ({
      x: c.x - Math.sin(c.heading) * thickness * 1.1,
      y: c.y + Math.cos(c.heading) * thickness * 1.1,
    })));
    const foamPath = line(outer.slice(Math.floor(steps * .5), Math.floor(steps * .95)));
    const crest = outer.reduce((best, point) => point.y < best.y ? point : best, outer[0]);
    const front = outer.reduce((best, point) => point.x > best.x ? point : best, outer[0]);
    return { body: bodyPath, shade: shadePath, thread: threadPath, foam: foamPath, tip: center[steps], crest, front };
  }

  function drawWave(progress) {
    const shape = waveShape(progress);
    body.setAttribute("d", shape.body);
    shade.setAttribute("d", shape.shade);
    thread.setAttribute("d", shape.thread);
    foam.setAttribute("d", shape.foam);
    return shape;
  }

  const restingWave = drawWave(0);
  // Spray flecks hover just above the resting crest.
  flecks.forEach((fleck, i) => {
    fleck.setAttribute("cx", fmt(restingWave.crest.x - 14 + i * 16));
    fleck.setAttribute("cy", fmt(restingWave.crest.y - 8 + (i % 2) * 3));
  });

  const foamBalls = Array.from({ length: 9 }, (_, i) => {
    const ball = document.createElementNS(SVG, "circle");
    ball.setAttribute("fill", i % 3 ? "#fffaf0" : "#cfe8ea");
    whitewater.append(ball);
    return ball;
  });

  function spray(x) {
    for (let i = 0; i < 26; i++) {
      const drop = document.createElementNS(SVG, "ellipse");
      drop.setAttribute("cx", fmt(x - 10 + Math.random() * 20));
      drop.setAttribute("cy", String(WATERLINE - 4));
      drop.setAttribute("rx", fmt(1.5 + Math.random() * 2.5));
      drop.setAttribute("ry", fmt(2 + Math.random() * 3));
      drop.setAttribute("fill", i % 3 ? "#fffaf0" : "#9dcdd4");
      splashLayer.append(drop);
      const distance = (Math.random() * 1.1 - .1) * 90;
      const height = 12 + Math.random() * 40;
      const animation = drop.animate([
        { transform: "translate(0,0) scale(.4)", opacity: 0 },
        { transform: `translate(${distance * .4}px,${-height}px) scale(1)`, opacity: .9, offset: .4 },
        { transform: `translate(${distance}px,14px) scale(.5)`, opacity: 0 },
      ], { duration: 500 + Math.random() * 250, delay: Math.random() * 60, fill: "both" });
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => {});
    }
  }

  // A tumbling barrel of whitewater carries the broken lip forward as it fades.
  function drawWhitewater(progress, landing) {
    const q = smooth(.5, 1, progress);
    const fade = 1 - smooth(.78, 1, progress);
    whitewater.style.opacity = String(smooth(.5, .58, progress) * fade);
    if (!landing) return;
    const radius = 3 + 18 * (1 - q) ** .7;
    const cx = landing.x + 110 * q;
    const cy = WATERLINE - radius * .75;
    const spin = q * Math.PI * 5;
    foamBalls.forEach((ball, i) => {
      const angle = spin + i * Math.PI * 2 / foamBalls.length;
      const reach = radius * (i % 2 ? .65 : 1);
      ball.setAttribute("cx", fmt(cx + Math.cos(angle) * reach));
      ball.setAttribute("cy", fmt(Math.min(WATERLINE + 2, cy + Math.sin(angle) * reach * .8)));
      ball.setAttribute("r", fmt(radius * (i % 2 ? .45 : .6)));
    });
  }

  function roll() {
    if (reducedMotion.matches) return Promise.resolve(true);
    const duration = 2400;
    const began = performance.now();
    let landing = null;
    return new Promise(resolve => {
      cancelRoll = () => resolve(false);
      function step(now) {
        const t = clamp01((now - began) / duration);
        // Gather speed as the lip pitches, then glide out as it settles.
        const progress = mix(t, t * t * (3 - 2 * t), .55);
        const shape = drawWave(progress);
        if (!landing && shape.tip.y >= WATERLINE - 6 && progress > .3) {
          landing = { x: shape.front.x };
          spray(landing.x);
        }
        drawWhitewater(progress, landing);
        foam.style.opacity = String(1 - smooth(.6, .95, progress));
        shade.style.opacity = String(.8 * (1 - smooth(.35, .7, progress)));
        if (t < 1) rollFrame = requestAnimationFrame(step);
        else {
          cancelRoll = null;
          resolve(true);
        }
      }
      rollFrame = requestAnimationFrame(step);
    });
  }

  start.addEventListener("click", async () => {
    if (started) return;
    started = true;
    start.classList.add("rolling");
    document.querySelector("#status").textContent = "開始";
    // Must run inside the tap so iOS lets audio start.
    if (parent !== window) parent.startMusic?.();
    if (await roll()) {
      start.classList.add("crashed");
      completeLevel();
    }
  });

  registerLevel({
    background: "#cfdadd",
    setup: () => animateScene(true),
    teardown: () => {
      if (started) start.classList.add("crashed");
      cancelAnimationFrame(rollFrame);
      cancelRoll?.();
      cancelRoll = null;
      for (const animation of animations) animation.cancel();
      animations.clear();
      splashLayer.replaceChildren();
      return animateScene(false);
    },
  });
})();
