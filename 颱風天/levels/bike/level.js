(() => {
  "use strict";
  const svg = document.querySelector(".street");
  const traffic = document.querySelector(".traffic");
  const signal = document.querySelector(".signal");
  const walker = document.querySelector(".walker");
  const rain = document.querySelector(".rain");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const WALKER_URL = "./assets/walkingman-display.gif";
  const START = { x: 44, y: 728 };
  const BOUNDS = { minX: 44, maxX: 600, minY: 362, maxY: 752 };
  const FINISH_X = 556;
  // Hitboxes sit slightly inside the drawn art so near misses feel fair.
  const BIKE_HIT = { left: 32, right: 32, top: 66, bottom: 4 };
  const CAR_HIT = { half: 46, top: 52, bottom: 6 };
  // Rows of parked cars form a snaking maze: right along the bottom lane, up through
  // a gap, left along the middle lane, up at the far left, then right to the crosswalk.
  const cars = [
    { x: 60, y: 645, kind: "sedan", color: "#d9796a", facing: 1 },
    { x: 172, y: 645, kind: "hatch", color: "#7ba7c9", facing: -1 },
    { x: 400, y: 645, kind: "taxi", color: "#f1c84d", facing: 1 },
    { x: 512, y: 645, kind: "van", color: "#eef0e8", facing: -1 },
    { x: 470, y: 730, kind: "hatch", color: "#8dbb8a", facing: -1 },
    { x: 560, y: 560, kind: "sedan", color: "#b9a0cf", facing: -1 },
    { x: 200, y: 470, kind: "van", color: "#eef0e8", facing: 1 },
    { x: 312, y: 470, kind: "taxi", color: "#f1c84d", facing: -1 },
    { x: 424, y: 470, kind: "sedan", color: "#e3a35f", facing: 1 },
    { x: 536, y: 470, kind: "hatch", color: "#d9796a", facing: -1 },
  ];
  const bike = { ...START, node: null, art: null };
  let drag = null;
  // Rings on a loop for as long as the rider is held.
  const bell = wanwanAudio.sound("./assets/bell.mp3", { loop: true });
  function ringBell(on) {
    if (on === !bell.paused) return;
    if (!on) { bell.pause(); return; }
    bell.currentTime = 0;
    bell.play().catch(cause => console.warn("Bell could not play", cause));
  }
  let crashing = false;
  let completed = false;
  let timer = 0;
  const animations = new Set();
  const preload = new Image();
  preload.src = WALKER_URL;

  function element(tag, attributes, parent) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  for (let i = 0; i < 70; i++) {
    const drop = document.createElement("i");
    drop.style.left = `${Math.random() * 105}%`;
    drop.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    drop.style.animationDelay = `${-Math.random() * 4}s`;
    drop.style.setProperty("--still-y", `${Math.random() * 100}%`);
    rain.append(drop);
  }

  function drawCar(car) {
    car.node = element("g", { class: "car", transform: `translate(${car.x} ${car.y})` }, traffic);
    car.art = element("g", { class: "car-art" }, car.node);
    const body = element("g", { transform: `scale(${car.facing} 1)` }, car.art);
    element("ellipse", { cy: -2, rx: 54, ry: 6, fill: "#5d726d", opacity: .3 }, body);
    const trim = "#5f6d6a";
    if (car.kind === "van") {
      element("path", { d: "M-52-14V-50Q-52-60-42-60H22Q32-60 38-50L52-30V-14Q52-8 46-8H-46Q-52-8-52-14Z", fill: car.color, stroke: trim, "stroke-width": 2 }, body);
      element("path", { d: "M-44-50H-12V-34H-44ZM-6-50H20V-34H-6ZM26-50H32L44-34H26Z", fill: "url(#glass)" }, body);
      element("path", { d: "M-52-26H52", stroke: "#9fc3b6", "stroke-width": 5 }, body);
    } else {
      const cabin = car.kind === "hatch"
        ? "M-42-32L-36-52Q-34-58-28-58H14Q20-58 24-52L36-32Z"
        : "M-30-32L-20-54Q-17-58-12-58H16Q22-58 26-53L38-32Z";
      element("path", { d: cabin, fill: car.color, stroke: trim, "stroke-width": 2 }, body);
      const windows = car.kind === "hatch"
        ? "M-35-34L-31-50Q-30-52-27-52H-6V-34ZM0-52H12Q17-52 20-48L28-34H0Z"
        : "M-24-34L-16-50Q-15-52-12-52H3V-34ZM9-52H15Q19-52 22-48L29-34H9Z";
      element("path", { d: windows, fill: "url(#glass)" }, body);
      element("rect", { x: -52, y: -36, width: 104, height: 27, rx: 11, fill: car.color, stroke: trim, "stroke-width": 2 }, body);
      element("path", { d: "M-40-24H38", stroke: "#fff", "stroke-width": 2, opacity: .35, "stroke-linecap": "round" }, body);
    }
    if (car.kind === "taxi") {
      element("rect", { x: -10, y: -65, width: 20, height: 8, rx: 3, fill: "#fff3c6", stroke: trim, "stroke-width": 1.5 }, body);
      element("path", { d: "M-50-20H50", stroke: "#3f4b49", "stroke-width": 3, "stroke-dasharray": "5 5", opacity: .55 }, body);
    }
    element("rect", { x: 45, y: -30, width: 7, height: 6, rx: 2, fill: "#fff1b8" }, body);
    element("rect", { x: -52, y: -30, width: 5, height: 7, rx: 2, fill: "#e46c62" }, body);
    for (const wheel of [-30, 30]) {
      element("circle", { cx: wheel, cy: -10, r: 11, fill: "#34403e" }, body);
      element("circle", { cx: wheel, cy: -10, r: 4.5, fill: "#b9c5c0" }, body);
    }
  }

  function drawBike() {
    const node = element("g", { class: "bike", tabindex: 0, role: "button", "aria-label": "外送單車", "aria-describedby": "instructions" }, traffic);
    element("rect", { class: "focus-ring", x: -50, y: -86, width: 100, height: 92, rx: 16 }, node);
    // Generous invisible grab area for small touch screens.
    element("rect", { x: -54, y: -92, width: 108, height: 102, rx: 18, fill: "transparent" }, node);
    const art = element("g", { class: "bike-art", "pointer-events": "none" }, node);
    element("ellipse", { cy: -1, rx: 40, ry: 5, fill: "#5d726d", opacity: .3 }, art);
    for (const x of [-24, 24]) {
      element("circle", { cx: x, cy: -14, r: 13, stroke: "#34403e", "stroke-width": 4, fill: "none" }, art);
      element("path", { d: `M${x - 9}-14H${x + 9}M${x}-23V-5`, stroke: "#a8b6b1", "stroke-width": 1.5 }, art);
    }
    element("path", { d: "M-24-14L-8-36L0-14Z M0-14L18-38M-8-36H14M24-14L18-38", stroke: "#e0755f", "stroke-width": 3.5, "stroke-linejoin": "round", "stroke-linecap": "round", fill: "none" }, art);
    element("path", { d: "M14-40H24", stroke: "#34403e", "stroke-width": 3.5, "stroke-linecap": "round" }, art);
    element("path", { d: "M-34-33H-8", stroke: "#5f6d6a", "stroke-width": 3, "stroke-linecap": "round" }, art);
    element("rect", { x: -46, y: -64, width: 34, height: 30, rx: 5, fill: "#43a35d", stroke: "#2f7b46", "stroke-width": 2 }, art);
    element("rect", { x: -46, y: -64, width: 34, height: 8, rx: 4, fill: "#6cc27f" }, art);
    element("path", { d: "M-34-46Q-29-52-24-46Q-29-40-34-46Z", fill: "#e9f6dd" }, art);
    element("path", { d: "M-6-38L4-24L2-14", stroke: "#3d5a73", "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, art);
    element("path", { d: "M-10-36Q-8-56 6-60Q14-50 10-38Z", fill: "#f0c64e", stroke: "#c99b2d", "stroke-width": 1.5 }, art);
    element("path", { d: "M6-55L19-42", stroke: "#f0c64e", "stroke-width": 5, "stroke-linecap": "round" }, art);
    element("circle", { cx: 11, cy: -67, r: 7.5, fill: "#f6d7bd" }, art);
    element("path", { d: "M2-68Q3-80 13-79Q22-78 21-68Z", fill: "#43a35d", stroke: "#2f7b46", "stroke-width": 1.5 }, art);
    element("circle", { cx: 15, cy: -66, r: 1.2, fill: "#3f4b49" }, art);
    bike.node = node;
    bike.art = art;
  }
  cars.forEach(drawCar);
  drawBike();

  function bikeBox(x, y) {
    return { l: x - BIKE_HIT.left, r: x + BIKE_HIT.right, t: y - BIKE_HIT.top, b: y - BIKE_HIT.bottom };
  }
  function hitCar(x, y) {
    const box = bikeBox(x, y);
    return cars.find(car => box.l < car.x + CAR_HIT.half && box.r > car.x - CAR_HIT.half
      && box.t < car.y - CAR_HIT.bottom && box.b > car.y - CAR_HIT.top) ?? null;
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function render() {
    bike.node.setAttribute("transform", `translate(${+bike.x.toFixed(1)} ${+bike.y.toFixed(1)})`);
    // Paint by ground line so whoever is nearer the viewer is drawn on top.
    const next = cars.find(car => car.y > bike.y)?.node ?? null;
    if (bike.node.nextSibling !== next) {
      const focused = document.activeElement === bike.node;
      traffic.insertBefore(bike.node, next);
      if (focused) bike.node.focus({ preventScroll: true });
    }
    bike.node.classList.toggle("held", Boolean(drag));
    ringBell(Boolean(drag));
    bike.node.setAttribute("aria-disabled", String(completed || crashing));
  }
  // Moves along the whole path in small steps so quick swipes cannot tunnel through a car.
  function travel(targetX, targetY) {
    const x = clamp(targetX, BOUNDS.minX, BOUNDS.maxX);
    const y = clamp(targetY, BOUNDS.minY, BOUNDS.maxY);
    const steps = Math.max(1, Math.ceil(Math.hypot(x - bike.x, y - bike.y) / 3));
    const fromX = bike.x;
    const fromY = bike.y;
    for (let i = 1; i <= steps; i++) {
      const px = fromX + (x - fromX) * i / steps;
      const py = fromY + (y - fromY) * i / steps;
      const car = hitCar(px, py);
      if (car) {
        bike.x = px;
        bike.y = py;
        render();
        crash(car);
        return;
      }
      if (px >= FINISH_X) {
        bike.x = px;
        bike.y = py;
        render();
        win();
        return;
      }
    }
    bike.x = x;
    bike.y = y;
    render();
  }

  function track(animation) {
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    return animation;
  }
  function release() {
    const id = drag?.id;
    drag = null;
    if (id !== undefined && svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
  }
  async function crash(car) {
    release();
    crashing = true;
    scene.classList.add("crashing");
    status.textContent = "碰到汽車了，重新開始。";
    render();
    const fast = reduced.matches;
    track(car.art.animate(fast ? [{ opacity: 1 }] : [
      { transform: "scale(1)" }, { transform: "scale(1.04, .96)", offset: .3 }, { transform: "scale(1)" },
    ], { duration: 360, easing: "ease-out" }));
    const wobble = track(bike.art.animate(fast ? [{ opacity: 1 }, { opacity: .3 }] : [
      { transform: "rotate(0deg)" }, { transform: "rotate(-11deg)", offset: .18 }, { transform: "rotate(8deg)", offset: .38 },
      { transform: "rotate(-5deg)", offset: .58 }, { transform: "rotate(0deg)", opacity: 1, offset: .75 }, { transform: "rotate(0deg)", opacity: 0 },
    ], { duration: fast ? 200 : 820, easing: "ease-in-out", fill: "forwards" }));
    try { await wobble.finished; } catch { return; }
    Object.assign(bike, START);
    render();
    const appear = track(bike.art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fast ? 0 : 320, fill: "forwards" }));
    try { await appear.finished; } catch { return; }
    wobble.cancel();
    appear.cancel();
    crashing = false;
    scene.classList.remove("crashing");
    render();
  }
  async function win() {
    release();
    completed = true;
    scene.classList.add("complete");
    status.textContent = "安全抵達！綠燈小綠人出現了。";
    walker.setAttribute("href", WALKER_URL);
    signal.classList.add("walking");
    render();
    const ride = track(bike.art.animate([{ transform: "translateX(0)" }, { transform: "translateX(170px)" }], {
      duration: reduced.matches ? 0 : 1100, easing: "cubic-bezier(.45,0,.75,.6)", fill: "forwards",
    }));
    try { await ride.finished; } catch { return; }
    timer = setTimeout(() => window.completeLevel(), reduced.matches ? 900 : 1700);
  }

  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  bike.node.addEventListener("pointerdown", event => {
    if (completed || crashing || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    bike.node.classList.add("pointer");
    const p = point(event);
    drag = { id: event.pointerId, dx: bike.x - p.x, dy: bike.y - p.y };
    svg.setPointerCapture(event.pointerId);
    render();
  });
  svg.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const p = point(event);
    travel(p.x + drag.dx, p.y + drag.dy);
  });
  function stop(event) {
    if (!drag || drag.id !== event.pointerId) return;
    release();
    render();
  }
  svg.addEventListener("pointerup", stop);
  svg.addEventListener("pointercancel", stop);
  svg.addEventListener("lostpointercapture", event => { if (drag && drag.id === event.pointerId) { drag = null; render(); } });
  bike.node.addEventListener("keydown", event => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!moves[event.key]) return;
    event.preventDefault();
    bike.node.classList.remove("pointer");
    if (completed || crashing || drag) return;
    const step = event.shiftKey ? 30 : 10;
    travel(bike.x + moves[event.key][0] * step, bike.y + moves[event.key][1] * step);
  });
  const blur = () => { if (drag) { release(); render(); } };
  window.addEventListener("blur", blur);
  render();

  async function animateScene(entering) {
    const animation = svg.animate(entering ? [
      { transform: "translateY(110vh)" }, { transform: "translateY(-10px)", offset: .75 }, { transform: "translateY(0)" },
    ] : [{ transform: "translateY(0)" }, { transform: "translateY(110vh)" }], {
      duration: reduced.matches ? 0 : entering ? 1000 : 750, easing: "ease-in-out", fill: "both",
    });
    await animation.finished;
    svg.style.transform = entering ? "" : "translateY(110vh)";
    animation.cancel();
  }
  registerLevel({
    background: "#d7e3e1",
    setup: () => { rain.classList.add("active"); return animateScene(true); },
    teardown: () => {
      clearTimeout(timer);
      release();
      ringBell(false);
      for (const animation of animations) animation.cancel();
      rain.classList.remove("active");
      window.removeEventListener("blur", blur);
      return animateScene(false);
    },
  });
})();
