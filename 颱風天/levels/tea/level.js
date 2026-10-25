(() => {
  "use strict";
  const svg = document.querySelector(".shop");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const cupLayer = document.querySelector(".cup-layer");
  const bobaLayer = document.querySelector(".boba");
  const dispenser = document.querySelector(".dispenser");
  const dispenserArt = document.querySelector(".dispenser-art");
  const pourButton = document.querySelector(".pour-button");
  const stream = document.querySelector(".stream");
  const press = document.querySelector(".press");
  const lamp = document.querySelector(".lamp");
  const sealers = [...document.querySelectorAll(".sealer")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const BASE_Y = 570;
  const SLOTS = { home: 150, tea: 330, seal: 495 };
  const SLOT_ORDER = ["home", "tea", "seal"];
  const TEA_LEVEL = 126;
  const CUP = "M-52-160H52L41 0Q40 4 36 4H-36Q-40 4-41 0Z";
  const HEAP = [[-12, 3], [0, 6], [12, 3], [-6, -7], [6, -7]];
  // One row per pearl cluster, so the cup fills from the bottom up.
  const PEARL_SPOTS = [
    [-30, -9], [-15, -8], [0, -10], [15, -8], [30, -9],
    [-31, -21], [-17, -22], [-3, -21], [11, -23], [25, -21],
    [-25, -33], [-11, -34], [3, -33], [17, -35], [31, -33],
  ];
  const cup = { x: SLOTS.home, y: BASE_Y, slot: "home" };
  let boba = 0;
  let tea = false;
  let busy = false;
  let completed = false;
  let drag = null;
  let run = 0;
  const animations = new Set();
  const timers = new Set();

  function element(tag, attributes, parent) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = value => +value.toFixed(2);
  const translate = (x, y, scale = 1) => `translate(${round(x)}px, ${round(y)}px)${scale === 1 ? "" : ` scale(${scale})`}`;
  function place(node, x, y) { node.style.transform = translate(x, y); }
  function wait(ms) {
    return new Promise(resolve => {
      const timer = setTimeout(() => { timers.delete(timer); resolve(); }, reduced.matches ? 0 : ms);
      timers.add(timer);
    });
  }
  // Resolves true when the animation ran to the end, false when it was cancelled.
  async function play(node, keyframes, duration, easing = "ease-in-out") {
    const animation = node.animate(keyframes, { duration: reduced.matches ? 0 : duration, easing, fill: "forwards" });
    animations.add(animation);
    try {
      await animation.finished;
      return true;
    } catch {
      return false;
    } finally {
      animations.delete(animation);
    }
  }
  async function glide(node, from, to, duration, easing) {
    const done = await play(node, [{ transform: translate(from.x, from.y) }, { transform: translate(to.x, to.y) }], duration, easing);
    if (!done) return false;
    place(node, to.x, to.y);
    node.getAnimations().forEach(animation => animation.cancel());
    return true;
  }
  function setBusy(value) {
    busy = value;
    scene.classList.toggle("busy", value);
  }
  function raise(node, parent) {
    const focused = document.activeElement === node;
    parent.append(node);
    if (focused) node.focus({ preventScroll: true });
  }

  // ---------- Cup ----------
  const cupNode = element("g", { class: "cup", tabindex: 0, role: "button", "aria-label": "杯子", "aria-describedby": "instructions" }, cupLayer);
  element("rect", { class: "focus-ring", x: -66, y: -180, width: 132, height: 196, rx: 16 }, cupNode);
  element("rect", { x: -72, y: -190, width: 144, height: 212, fill: "transparent" }, cupNode);
  const cupArt = element("g", { class: "cup-art", "pointer-events": "none" }, cupNode);
  element("ellipse", { cx: 0, cy: 5, rx: 48, ry: 7, fill: "#a8914a", opacity: .3 }, cupArt);
  element("path", { d: CUP, fill: "#fffbe6", opacity: .5 }, cupArt);
  const contents = element("g", { "clip-path": "url(#cup-clip)" }, cupArt);
  const teaFill = element("g", { class: "tea" }, contents);
  element("rect", { x: -60, y: 0, width: 120, height: 190, fill: "#b8804e", opacity: .95 }, teaFill);
  element("path", { d: "M-60 1Q-45-4-30 1T0 1T30 1T60 1V8H-60Z", fill: "#d6a774" }, teaFill);
  const pearls = element("g", {}, contents);
  const print = element("g", { "clip-path": "url(#cup-clip)" }, cupArt);
  element("rect", { x: -60, y: -170, width: 120, height: 180, fill: "#f9df2f", opacity: .3 }, print);
  for (const y of [-148, -137, -24, -13]) element("rect", { x: -60, y, width: 120, height: 5, fill: "#fff", opacity: .9 }, print);
  [[-118, [-36, -12, 12, 36]], [-94, [-48, -24, 0, 24, 48]], [-70, [-36, -12, 12, 36]], [-46, [-48, -24, 0, 24, 48]]].forEach(([y, xs]) => {
    xs.forEach(x => element("circle", { cx: x, cy: y, r: 6, fill: "#1e6fc0", opacity: .88 }, print));
  });
  element("path", { d: CUP, stroke: "#d8b417", "stroke-width": 3, "stroke-linejoin": "round" }, cupArt);
  element("path", { d: "M-38-150L-29-16", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round", opacity: .5 }, cupArt);
  element("rect", { x: -56, y: -165, width: 112, height: 8, rx: 4, fill: "#fffbe6", stroke: "#d8b417", "stroke-width": 2.5 }, cupArt);
  const seal = element("g", { class: "seal", opacity: 0 }, cupArt);
  element("rect", { x: -57, y: -171, width: 114, height: 10, rx: 4, fill: "#fbe94a", stroke: "#0b6db5", "stroke-width": 2.5 }, seal);
  element("ellipse", { cx: 0, cy: -166, rx: 13, ry: 3, fill: "#0b6db5" }, seal);
  const teaOffset = amount => `translateY(${round(6 - amount * (TEA_LEVEL + 6))}px)`;
  teaFill.style.transform = teaOffset(0);
  place(cupNode, cup.x, cup.y);

  // ---------- Pearl clusters ----------
  const clusters = [{ x: 84, y: 632 }, { x: 150, y: 640 }, { x: 216, y: 632 }].map((home, index) => {
    const node = element("g", { class: "cluster", "data-cluster": index, tabindex: 0, role: "button", "aria-label": "一小堆珍珠", "aria-describedby": "instructions" }, bobaLayer);
    element("circle", { class: "focus-ring", r: 26 }, node);
    element("circle", { r: 34, fill: "transparent" }, node);
    const art = element("g", { "pointer-events": "none" }, node);
    for (const [x, y] of HEAP) element("use", { href: "#pearl", x, y }, art);
    place(node, home.x, home.y);
    return { index, home, x: home.x, y: home.y, node, done: false };
  });

  function nearestSlot(x) {
    return SLOT_ORDER.reduce((best, slot) => Math.abs(SLOTS[slot] - x) < Math.abs(SLOTS[best] - x) ? slot : best, "home");
  }

  async function moveCup(slot) {
    const id = run;
    setBusy(true);
    cup.slot = slot;
    const done = await glide(cupNode, cup, { x: SLOTS[slot], y: BASE_Y }, 380, "cubic-bezier(.3, 1.3, .5, 1)");
    if (!done || id !== run) return;
    cup.x = SLOTS[slot];
    cup.y = BASE_Y;
    setBusy(false);
    scene.dataset.cup = slot;
    if (slot === "tea" && boba < clusters.length) startOver("珍珠還沒加好。");
    else if (slot === "seal" && !tea) startOver("還沒倒茶。");
    else if (slot === "seal") sealAndShake();
    else if (slot === "tea") status.textContent = tea ? "茶已經倒好了。" : "杯子在茶桶下面了，點茶桶倒茶。";
    else status.textContent = "杯子回到原位。";
  }

  async function addBoba(cluster) {
    if (busy || completed || cluster.done) return;
    if (tea) {
      startOver("倒茶後才加珍珠，順序不對。");
      return;
    }
    const id = run;
    cluster.done = true;
    cluster.node.setAttribute("aria-hidden", "true");
    cluster.node.removeAttribute("tabindex");
    const start = boba * HEAP.length;
    boba++;
    scene.dataset.boba = String(boba);
    status.textContent = boba === clusters.length ? "珍珠加好了，接著去倒茶。" : "珍珠放進杯子了。";
    const mouth = { x: cup.x, y: cup.y - 176 };
    const done = await play(cluster.node, [
      { transform: translate(cluster.x, cluster.y), opacity: 1 },
      { transform: translate(mouth.x, mouth.y, .55), opacity: 0 },
    ], 240, "ease-in");
    if (!done || id !== run) return;
    cluster.node.style.display = "none";
    PEARL_SPOTS.slice(start, start + HEAP.length).forEach(([x, y], i) => {
      const pearl = element("use", { href: "#pearl" }, pearls);
      place(pearl, x, y);
      play(pearl, [{ transform: translate(x * .4, -182) }, { transform: translate(x, y), offset: .7 }, { transform: translate(x, y - 6), offset: .85 }, { transform: translate(x, y) }], 480 + i * 70, "ease-in")
        .then(() => pearl.getAnimations().forEach(animation => animation.cancel()));
    });
  }

  async function pour() {
    if (busy || completed || drag) return;
    play(pourButton, [{ transform: "scale(1)" }, { transform: "scale(.88)" }, { transform: "scale(1)" }], 220);
    if (cup.slot !== "tea" || tea) {
      status.textContent = tea ? "茶已經倒好了。" : "先把杯子放到茶桶下面。";
      play(dispenserArt, [{ transform: "rotate(0)" }, { transform: "rotate(-2deg)" }, { transform: "rotate(2deg)" }, { transform: "rotate(0)" }], 320);
      return;
    }
    const id = run;
    setBusy(true);
    status.textContent = "倒茶中……";
    stream.style.opacity = "1";
    if (!await play(stream, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], 220, "ease-in") || id !== run) return;
    if (!await play(teaFill, [{ transform: teaOffset(0) }, { transform: teaOffset(1) }], 1700, "cubic-bezier(.3, .1, .4, 1)") || id !== run) return;
    teaFill.style.transform = teaOffset(1);
    if (!await play(stream, [{ transform: "translateY(0) scaleY(1)" }, { transform: "translateY(188px) scaleY(0)" }], 240, "ease-in") || id !== run) return;
    stream.style.opacity = "0";
    stream.getAnimations().forEach(animation => animation.cancel());
    teaFill.getAnimations().forEach(animation => animation.cancel());
    tea = true;
    scene.dataset.tea = "true";
    setBusy(false);
    status.textContent = "茶倒好了，接著拿去封口。";
  }

  async function startOver(message) {
    const id = run;
    setBusy(true);
    scene.dataset.reset = String(Number(scene.dataset.reset || 0) + 1);
    status.textContent = `${message}重新開始。`;
    if (!await play(cupArt, [0, -9, 8, -6, 4, 0].map(a => ({ transform: `rotate(${a}deg)` })), 560) || id !== run) return;
    if (!await play(contents, [{ opacity: 1 }, { opacity: 0 }], 360) || id !== run) return;
    pearls.replaceChildren();
    teaFill.style.transform = teaOffset(0);
    contents.getAnimations().forEach(animation => animation.cancel());
    cupArt.getAnimations().forEach(animation => animation.cancel());
    boba = 0;
    tea = false;
    scene.dataset.boba = "0";
    scene.dataset.tea = "false";
    cup.slot = "home";
    if (!await glide(cupNode, cup, { x: SLOTS.home, y: BASE_Y }, 420, "cubic-bezier(.3, 1.3, .5, 1)") || id !== run) return;
    cup.x = SLOTS.home;
    cup.y = BASE_Y;
    scene.dataset.cup = "home";
    await Promise.all(clusters.map(async (cluster, i) => {
      cluster.node.getAnimations().forEach(animation => animation.cancel());
      cluster.done = false;
      cluster.x = cluster.home.x;
      cluster.y = cluster.home.y;
      cluster.node.style.display = "";
      cluster.node.removeAttribute("aria-hidden");
      cluster.node.setAttribute("tabindex", "0");
      place(cluster.node, cluster.x, cluster.y);
      await play(cluster.node, [{ transform: translate(cluster.x, cluster.y, .2), opacity: 0 }, { transform: translate(cluster.x, cluster.y, 1.12), opacity: 1, offset: .7 }, { transform: translate(cluster.x, cluster.y), opacity: 1 }], 320 + i * 90, "ease-out");
      cluster.node.getAnimations().forEach(animation => animation.cancel());
    }));
    if (id !== run) return;
    setBusy(false);
  }

  async function sealAndShake() {
    const id = run;
    completed = true;
    setBusy(true);
    scene.classList.add("complete");
    status.textContent = "封口中……";
    lamp.setAttribute("fill", "#f58aa8");
    if (!await play(press, [{ transform: "translateY(0)" }, { transform: "translateY(29px)" }], 260, "ease-in") || id !== run) return;
    seal.setAttribute("opacity", "1");
    await wait(160);
    if (id !== run) return;
    if (!await play(press, [{ transform: "translateY(29px)" }, { transform: "translateY(0)" }], 280, "ease-out") || id !== run) return;
    press.getAnimations().forEach(animation => animation.cancel());
    status.textContent = "搖一搖！";
    const sway = [0, -14, 14, -14, 14, -10, 10, -5, 0];
    const shakes = [
      play(cupArt, sway.map(x => ({ transform: `translateX(${x}px) rotate(${x * .35}deg)` })), 1150),
      ...sealers.map(node => play(node, sway.map(x => ({ transform: `translateX(${x}px)` })), 1150)),
    ];
    if ((await Promise.all(shakes)).includes(false) || id !== run) return;
    cupArt.getAnimations().forEach(animation => animation.cancel());
    sealers.forEach(node => node.getAnimations().forEach(animation => animation.cancel()));
    lamp.setAttribute("fill", "#7fd38f");
    status.textContent = "珍珠奶茶做好了！";
    await wait(250);
    if (id !== run) return;
    if (!await glide(cupNode, cup, { x: 780, y: BASE_Y - 24 }, 700, "cubic-bezier(.5, 0, .7, .4)") || id !== run) return;
    scene.dataset.delivered = "true";
    await wait(250);
    if (id === run) window.completeLevel();
  }

  // ---------- Input ----------
  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  function grab(event, target) {
    if (busy || completed || drag || !event.isPrimary || event.button !== 0) return false;
    event.preventDefault();
    scene.classList.add("pointer");
    target.node.getAnimations().forEach(animation => animation.cancel());
    place(target.node, target.x, target.y);
    const p = point(event);
    drag = { target, id: event.pointerId, dx: target.x - p.x, dy: target.y - p.y };
    target.node.classList.add("held");
    raise(target.node, svg);
    svg.setPointerCapture(event.pointerId);
    return true;
  }
  const cupTarget = { get x() { return cup.x; }, get y() { return cup.y; }, node: cupNode, cup: true };
  cupNode.addEventListener("pointerdown", event => grab(event, cupTarget));
  clusters.forEach(cluster => {
    cluster.node.addEventListener("pointerdown", event => {
      if (!cluster.done) grab(event, cluster);
    });
    cluster.node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      addBoba(cluster);
    });
  });
  svg.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const p = point(event);
    const x = clamp(p.x + drag.dx, 40, 560);
    const y = clamp(p.y + drag.dy, drag.target.cup ? 200 : 40, 790);
    if (drag.target.cup) {
      cup.x = x;
      cup.y = y;
    } else {
      drag.target.x = x;
      drag.target.y = y;
    }
    place(drag.target.node, x, y);
  });
  function release(event, cancelled) {
    if (!drag || drag.id !== event.pointerId) return;
    const { target } = drag;
    drag = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    target.node.classList.remove("held");
    if (target.cup) {
      raise(cupNode, cupLayer);
      moveCup(cancelled ? cup.slot : nearestSlot(cup.x));
      return;
    }
    raise(target.node, bobaLayer);
    const overCup = Math.abs(target.x - cup.x) < 78 && target.y > cup.y - 240 && target.y < cup.y + 24;
    if (!cancelled && overCup) {
      addBoba(target);
      return;
    }
    const from = { x: target.x, y: target.y };
    target.x = target.home.x;
    target.y = target.home.y;
    glide(target.node, from, target.home, 360, "cubic-bezier(.3, 1.3, .5, 1)");
  }
  svg.addEventListener("pointerup", event => release(event, false));
  svg.addEventListener("pointercancel", event => release(event, true));
  svg.addEventListener("lostpointercapture", event => release(event, true));
  dispenser.addEventListener("pointerdown", () => scene.classList.add("pointer"));
  dispenser.addEventListener("click", pour);
  dispenser.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    pour();
  });
  cupNode.addEventListener("keydown", event => {
    const step = event.key === "ArrowRight" || event.key === "Enter" || event.key === " " ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    if (busy || completed || drag) return;
    const index = clamp(SLOT_ORDER.indexOf(cup.slot) + step, 0, SLOT_ORDER.length - 1);
    if (SLOT_ORDER[index] !== cup.slot) moveCup(SLOT_ORDER[index]);
  });
  document.addEventListener("keydown", () => scene.classList.remove("pointer"));
  scene.dataset.cup = "home";
  scene.dataset.boba = "0";
  scene.dataset.tea = "false";

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
    background: "#fbe94a",
    setup: () => animateScene(true),
    teardown: () => {
      run++;
      timers.forEach(clearTimeout);
      timers.clear();
      for (const animation of [...animations]) animation.cancel();
      return animateScene(false);
    },
  });
})();
