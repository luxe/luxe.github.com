(() => {
  "use strict";
  const svg = document.querySelector(".altar");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const bundle = document.querySelector(".bundle");
  const bundleSticks = document.querySelector(".bundle-sticks");
  const candleTarget = document.querySelector(".candle-target");
  const censer = document.querySelector(".censer");
  const plantedLayer = document.querySelector(".planted");
  const heldLayer = document.querySelector(".held");
  const heldLowLayer = document.querySelector(".held-low");
  const smokeLayer = document.querySelector(".smoke");
  const candleFlame = document.querySelector(".candle-flame");
  const candleHalo = document.querySelector(".candle-halo");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";
  const FLAME = { x: 95, y: 402 };
  const LIGHT_RADIUS = 28;
  const LIGHT_TIME = .45;
  const HANDLE = 62;
  const LENGTH = 220;
  const CUP = { left: 468, right: 540, top: 474 };
  const TAKE = { x: 504, y: 594 };
  const ASH = { x: 300, y: 548, reach: 96, top: 470, bottom: 660 };
  // A dropped stick lands in the ash if its base is over the bowl mouth and not below the ash.
  const MOUTH = { reach: 92, lowest: 562, rim: 518 };
  const GRAVITY = 2600;
  const SMOKE_LIFE = 3.8;
  const SMOKE_RATE = 18;
  const BUNDLE = [[482, -6, 214], [492, -3, 222], [500, -1, 210], [508, 1, 224], [516, 3, 212], [526, 6, 218], [488, -4, 204], [520, 4, 206]];
  const SPARE = 3;
  const FLAME_LAYERS = [
    { fill: "#ff8a2a", w: 1, h: 1 },
    { fill: "#ffc23d", w: .7, h: .78 },
    { fill: "#fff3b0", w: .38, h: .48 },
  ];

  let frame = 0;
  let last = 0;
  let held = null;
  let busy = false;
  let completed = false;
  let timer = 0;
  let grip = null;
  let lastPointer = null;
  const sticks = [];
  const trails = [];

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  const r1 = value => Math.round(value * 10) / 10;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const noise = (t, a, b, c) => Math.sin(t * 2.7 + a) * .5 + Math.sin(t * 6.1 + b) * .3 + Math.sin(t * 11.3 + c) * .2;

  // ---------- Incense sticks ----------
  function buildStick(parent, length) {
    const node = element("g", { class: "stick" }, parent);
    element("rect", { x: -1.8, y: -HANDLE, width: 3.6, height: HANDLE, rx: 1.5, fill: "#cf3c52" }, node);
    element("rect", { x: -2.7, y: -length, width: 5.4, height: length - HANDLE + 2, rx: 2.7, fill: "#6b3f26" }, node);
    element("rect", { x: -1.4, y: -length + 6, width: 1.2, height: length - HANDLE - 8, fill: "#8d5b3b", opacity: .8 }, node);
    return node;
  }
  function makeStick({ x, y, angle, length, parent, lit }) {
    const node = buildStick(parent, length);
    const ash = element("ellipse", { cx: 0, cy: -length - 1.5, rx: 2.5, ry: 3.4, fill: "#bdb5aa" }, node);
    const glow = element("circle", { cy: -length + 2, r: 11, fill: "url(#ember-glow)" }, node);
    const ember = element("circle", { cy: -length + 1, r: 2.9, fill: "#ff7a2a" }, node);
    const stick = { x, y, angle, length, node, ash, glow, ember, light: lit ? 1 : 0, lit, target: angle, tween: null, seed: Math.random() * 6 };
    stick.trail = { source: stick, points: [], paths: [], debt: 0, seed: stick.seed };
    trails.push(stick.trail);
    sticks.push(stick);
    drawStick(stick, 0);
    return stick;
  }
  function tip(stick) {
    const a = stick.angle * Math.PI / 180;
    return { x: stick.x + Math.sin(a) * stick.length, y: stick.y - Math.cos(a) * stick.length };
  }
  function drawStick(stick, t) {
    stick.node.setAttribute("transform", `translate(${r1(stick.x)} ${r1(stick.y)}) rotate(${r1(stick.angle)})`);
    const flicker = .8 + .2 * noise(t * (reduced.matches ? .3 : 1), stick.seed, stick.seed * 2, stick.seed * 3);
    stick.glow.setAttribute("opacity", r1(stick.light * flicker * 100) / 100);
    stick.ember.setAttribute("opacity", r1(stick.light * 100) / 100);
    stick.ember.setAttribute("fill", flicker > .85 ? "#ff9a3a" : "#ff6a22");
    stick.ash.setAttribute("opacity", stick.lit ? .95 : 0);
  }
  function removeStick(stick) {
    stick.trail.source = null;
    stick.node.remove();
    sticks.splice(sticks.indexOf(stick), 1);
  }

  // ---------- Smoke ribbons ----------
  function updateTrail(trail, dt) {
    const speed = reduced.matches ? .5 : 1;
    for (const p of trail.points) {
      p.age += dt;
      p.y -= (30 + p.age * 8) * dt * speed;
      p.x += (Math.sin(p.age * 1.8 + p.seed) * (3 + p.age * 10) + 4) * dt * speed;
    }
    while (trail.points.length && trail.points[0].age > SMOKE_LIFE) trail.points.shift();
    const source = trail.source;
    if (source && source.lit) {
      trail.debt += dt * SMOKE_RATE;
      while (trail.debt >= 1) {
        trail.debt--;
        const end = tip(source);
        trail.points.push({ x: end.x, y: end.y - 4, age: 0, seed: trail.seed + trail.points.length * .37 + Math.random() * .5 });
      }
    }
  }
  function drawTrail(trail) {
    const points = trail.points.slice();
    if (trail.source && trail.source.lit) {
      const end = tip(trail.source);
      points.push({ x: end.x, y: end.y - 4, age: 0 });
    }
    const segments = Math.max(0, Math.floor((points.length - 2) / 3));
    while (trail.paths.length < segments) trail.paths.push(element("path", { stroke: "#ebe5dc", "stroke-linecap": "round", "stroke-linejoin": "round" }, smokeLayer));
    const mid = (a, b) => `${r1((a.x + b.x) / 2)} ${r1((a.y + b.y) / 2)}`;
    trail.paths.forEach((path, k) => {
      if (k >= segments) {
        path.setAttribute("d", "");
        return;
      }
      const i = k * 3;
      let d = `M${mid(points[i], points[i + 1])}`;
      for (let j = i + 1; j <= i + 3 && j + 1 < points.length; j++) d += `Q${r1(points[j].x)} ${r1(points[j].y)} ${mid(points[j], points[j + 1])}`;
      const a = points[Math.min(points.length - 1, i + 2)].age / SMOKE_LIFE;
      path.setAttribute("d", d);
      path.setAttribute("stroke-width", r1(1.8 + a * 9));
      path.setAttribute("opacity", r1(.6 * Math.pow(Math.max(0, 1 - a), 1.4) * Math.min(1, .35 + a * 8) * 100) / 100);
    });
    if (!trail.source && !trail.points.length) {
      trail.paths.forEach(path => path.remove());
      trails.splice(trails.indexOf(trail), 1);
    }
  }

  // ---------- Candle flame ----------
  const flamePaths = FLAME_LAYERS.map(layer => element("path", { fill: layer.fill }, candleFlame));
  function drawCandle(t, stir) {
    const calm = reduced.matches ? .3 : 1;
    const n = noise(t, 0, 1.3, 2.4) * calm;
    const sway = (Math.sin(t * 3.3) * 2.2 + Math.sin(t * 8.1) * 1.2) * calm + stir * Math.sin(t * 20) * 3;
    FLAME_LAYERS.forEach((layer, l) => {
      const w = 17 * layer.w * (1 + .06 * n);
      const h = 42 * layer.h * (1 + .12 * n + stir * .15);
      const bx = 95;
      const by = 424;
      const tx = bx + sway * (1 - l * .2);
      flamePaths[l].setAttribute("d", `M${r1(bx - w / 2)} ${by}C${r1(bx - w / 2)} ${r1(by - h * .5)} ${r1(tx - w * .15)} ${r1(by - h * .75)} ${r1(tx)} ${r1(by - h)}C${r1(tx + w * .15)} ${r1(by - h * .75)} ${r1(bx + w / 2)} ${r1(by - h * .5)} ${r1(bx + w / 2)} ${by}Q${bx} ${r1(by + w * .45)} ${r1(bx - w / 2)} ${by}Z`);
    });
    candleHalo.setAttribute("opacity", r1((.8 + .2 * n) * 100) / 100);
  }

  // ---------- The cup of spare sticks ----------
  const spareNodes = BUNDLE.map(([x, angle, length]) => {
    const node = buildStick(bundleSticks, length);
    node.setAttribute("transform", `translate(${x} 594) rotate(${angle})`);
    return node;
  });

  // ---------- Steps ----------
  function setStatus(text) { status.textContent = text; }
  function layerFor(stick) {
    const parent = inCup(stick) ? heldLowLayer : heldLayer;
    if (stick.node.parentNode !== parent) parent.append(stick.node);
  }
  function take() {
    spareNodes[SPARE].style.display = "none";
    held = makeStick({ x: TAKE.x, y: TAKE.y, angle: 1, length: LENGTH, parent: heldLowLayer, lit: false });
    scene.classList.add("holding");
    scene.dataset.step = "taken";
    setStatus("拿起一支香，拿到蠟燭的火上點燃。");
    return held;
  }
  function tweenStick(stick, to, duration, done) {
    stick.tween = { from: { x: stick.x, y: stick.y, angle: stick.angle }, to, age: 0, duration: reduced.matches ? 0 : duration, done };
  }
  function returnToCup(message, stick = held) {
    if (stick === held) held = null;
    heldLayer.append(stick.node);
    busy = true;
    setStatus(message);
    scene.dataset.step = "returned";
    tweenStick(stick, { x: TAKE.x, y: TAKE.y, angle: 1 }, 480, () => {
      removeStick(stick);
      spareNodes[SPARE].style.display = "";
      scene.classList.remove("holding");
      scene.dataset.step = "idle";
      busy = false;
    });
  }
  function inCup(stick) {
    return stick.x > CUP.left && stick.x < CUP.right && stick.y > CUP.top;
  }
  function overMouth(stick) {
    return Math.abs(stick.x - ASH.x) <= MOUTH.reach && stick.y <= MOUTH.lowest;
  }
  function viewBottom() {
    const ctm = svg.getScreenCTM();
    if (!ctm) return 820;
    return Math.max(820, new DOMPoint(0, innerHeight).matrixTransform(ctm.inverse()).y);
  }
  // Let go: the stick falls straight down, into the ash or off the screen.
  function drop() {
    const stick = held;
    held = null;
    busy = true;
    heldLayer.append(stick.node);
    scene.dataset.step = "falling";
    const lands = overMouth(stick);
    stick.fall = {
      vy: 0,
      land: lands ? ASH.y : null,
      bottom: viewBottom() + stick.length + 20,
      done: () => lands ? landed(stick) : missed(stick),
    };
  }
  function landed(stick) {
    if (!stick.lit) {
      busy = true;
      timer = setTimeout(() => returnToCup("香還沒點燃，先拿去蠟燭點火。重新開始。", stick), reduced.matches ? 0 : 350);
      return;
    }
    plant(stick, stick.x);
  }
  function missed(stick) {
    removeStick(stick);
    spareNodes[SPARE].style.display = "";
    scene.classList.remove("holding");
    scene.dataset.step = "missed";
    setStatus("香掉下去了，再拿一支試試。");
    busy = false;
  }
  function plant(stick, x) {
    if (stick === held) held = null;
    busy = true;
    completed = true;
    scene.classList.add("complete");
    plantedLayer.append(stick.node);
    const px = clamp(x, ASH.x - MOUTH.reach + 8, ASH.x + MOUTH.reach - 8);
    tweenStick(stick, { x: px, y: ASH.y, angle: (px - ASH.x) * .08 }, 420, () => {
      scene.classList.remove("holding");
      scene.dataset.step = "planted";
      setStatus("香插好了，祝你平安。");
      timer = setTimeout(() => window.completeLevel(), reduced.matches ? 800 : 2600);
    });
  }

  // ---------- Pointer ----------
  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  bundle.addEventListener("pointerdown", event => {
    if (completed || busy || held || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    scene.classList.add("pointer");
    const p = point(event);
    take();
    grip = { id: event.pointerId, dx: held.x - p.x, dy: held.y - p.y };
    lastPointer = { x: p.x, time: performance.now() };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", event => {
    if (!grip || grip.id !== event.pointerId || !held) return;
    const p = point(event);
    const now = performance.now();
    const vx = (p.x - lastPointer.x) / Math.max(8, now - lastPointer.time) * 1000;
    lastPointer = { x: p.x, time: now };
    held.x = clamp(p.x + grip.dx, 16, 584);
    held.y = clamp(p.y + grip.dy, LENGTH + 10, 800);
    // The tip lags behind the hand, so it leans away from the motion.
    held.target = clamp(-vx / 45, -16, 16);
    layerFor(held);
  });
  function release(event, cancelled) {
    if (!grip || grip.id !== event.pointerId) return;
    grip = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (!held) return;
    if (cancelled || inCup(held)) returnToCup(held.lit ? "香放回香筒了。重新開始。" : "香放回香筒了。");
    else drop();
  }
  svg.addEventListener("pointerup", event => release(event, false));
  svg.addEventListener("pointercancel", event => release(event, true));
  svg.addEventListener("lostpointercapture", event => release(event, true));

  // ---------- Keyboard ----------
  function nudge(node) {
    if (reduced.matches) return;
    node.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 280 });
  }
  function activate(event, action) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (completed || busy || grip) return;
    action();
  }
  bundle.addEventListener("keydown", event => activate(event, () => {
    if (held) return setStatus("已經拿著一支香了。");
    const stick = take();
    busy = true;
    tweenStick(stick, { x: TAKE.x, y: 460, angle: 0 }, 420, () => { busy = false; heldLayer.append(stick.node); });
  }));
  candleTarget.addEventListener("keydown", event => activate(event, () => {
    if (!held) { nudge(candleTarget); return setStatus("先從香筒拿一支香。"); }
    if (held.lit) return setStatus("香已經點燃了。");
    busy = true;
    heldLayer.append(held.node);
    const stick = held;
    tweenStick(stick, { x: FLAME.x + 4, y: FLAME.y + LENGTH - 2, angle: -1 }, 520, () => { busy = false; });
  }));
  censer.addEventListener("keydown", event => activate(event, () => {
    if (!held) { nudge(censer); return setStatus("先從香筒拿一支香。"); }
    // Hold the stick above the bowl, then let it fall in.
    busy = true;
    heldLayer.append(held.node);
    tweenStick(held, { x: 318, y: 430, angle: 0 }, 480, () => { busy = false; drop(); });
  }));
  document.addEventListener("keydown", () => scene.classList.remove("pointer"));

  // ---------- Frame loop ----------
  function step(dt, t) {
    let stir = 0;
    for (const stick of [...sticks]) {
      if (stick.fall) {
        const fall = stick.fall;
        fall.vy += GRAVITY * dt;
        stick.y += fall.vy * dt;
        stick.angle += (0 - stick.angle) * Math.min(1, dt * 8);
        stick.target = stick.angle;
        const end = fall.land ?? fall.bottom;
        if (reduced.matches) stick.y = end;
        // Slip behind the front of the bowl as the base passes the rim.
        if (fall.land !== null && stick.y > MOUTH.rim && stick.node.parentNode !== plantedLayer) plantedLayer.append(stick.node);
        if (stick.y >= end) {
          stick.y = end;
          stick.fall = null;
          fall.done();
        }
        continue;
      }
      if (stick.tween) {
        const tw = stick.tween;
        tw.age += dt * 1000;
        const p = tw.duration ? Math.min(1, tw.age / tw.duration) : 1;
        const e = 1 - Math.pow(1 - p, 3);
        stick.x = tw.from.x + (tw.to.x - tw.from.x) * e;
        stick.y = tw.from.y + (tw.to.y - tw.from.y) * e;
        stick.angle = tw.from.angle + (tw.to.angle - tw.from.angle) * e;
        stick.target = stick.angle;
        if (p >= 1) {
          stick.tween = null;
          tw.done?.();
        }
      } else if (stick === held) {
        stick.target *= Math.exp(-dt * 5);
        stick.angle += (stick.target - stick.angle) * Math.min(1, dt * 12);
      }
      if (stick === held && !stick.lit) {
        const end = tip(stick);
        const near = Math.hypot(end.x - FLAME.x, end.y - FLAME.y) < LIGHT_RADIUS;
        if (near) {
          stir = 1;
          stick.light = Math.min(1, stick.light + dt / (reduced.matches ? .01 : LIGHT_TIME));
          if (stick.light >= 1) {
            stick.lit = true;
            scene.dataset.step = "lit";
            setStatus("香點燃了，插進香爐的香灰裡。");
          }
        } else {
          stick.light = Math.max(0, stick.light - dt * .8);
        }
      }
    }
    for (const trail of [...trails]) updateTrail(trail, dt);
    return stir;
  }
  function render(t, stir) {
    for (const stick of sticks) drawStick(stick, t);
    for (const trail of [...trails]) drawTrail(trail);
    drawCandle(t * (reduced.matches ? .3 : 1), stir);
  }
  function tick(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    const t = now / 1000;
    render(t, step(dt, t));
    frame = requestAnimationFrame(tick);
  }

  // Three sticks are already burning, with smoke that has had time to rise.
  [[266, -7, 188], [300, 0, 204], [336, 6, 180]].forEach(([x, angle, length]) => makeStick({ x, y: ASH.y, angle, length, parent: plantedLayer, lit: true }));
  for (let i = 0; i < 120; i++) step(1 / 30, i / 30);
  render(0, 0);
  scene.dataset.step = "idle";

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
    background: "#7f2a20",
    setup: () => {
      if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
      return animateScene(true);
    },
    teardown: async () => {
      clearTimeout(timer);
      await animateScene(false);
      cancelAnimationFrame(frame);
      frame = 0;
    },
  });
})();
