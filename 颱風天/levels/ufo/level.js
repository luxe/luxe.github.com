(() => {
  "use strict";
  const svg = document.querySelector(".stand");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const ladle = document.querySelector(".ladle");
  const ladleShadow = ladle.querySelector(".ladle-shadow");
  const food = ladle.querySelector(".food");
  const batter = food.querySelector(".batter");
  const batterBase = batter.querySelector(".batter-base");
  const batterDome = batter.querySelector(".batter-dome");
  const batterRim = batter.querySelector(".batter-rim");
  const crisp = batter.querySelector(".crisp");
  const peek = batter.querySelector(".peek");
  const layers = {
    onion1: food.querySelector(".onion-1"),
    oysters: food.querySelector(".oysters"),
    onion2: food.querySelector(".onion-2"),
  };
  const wok = document.querySelector(".wok");
  const oilLip = document.querySelector(".oil-lip");
  const bubbleLayer = document.querySelector(".bubbles");
  const flyingLayer = document.querySelector(".flying");
  const steamLayer = document.querySelector(".steam");
  const sparkleLayer = document.querySelector(".sparkles");
  const bowls = [...document.querySelectorAll(".bowl")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";

  const SEQUENCE = ["onion", "oyster", "onion", "batter", "fry"];
  const BOWLS = { onion: { x: 105, y: 422 }, oyster: { x: 300, y: 422 }, batter: { x: 495, y: 422 } };
  const REST = { x: 300, y: 560 };
  const FRY = { x: 300, y: 708 };
  const LIFT = { x: 300, y: 612 };
  const PLATE = { x: 88, y: 552, k: .62 };
  const OIL = { x: 300, y: 716, rx: 226, ry: 60 };
  const FRY_MS = 4800;
  // Color stops for raw → golden → crispy brown.
  const SHADES = {
    dome: ["#f4e8ca", "#ecbf62", "#c47630"],
    base: ["#efe0bc", "#dca24a", "#a35a24"],
    rim: ["#e2cd9c", "#c98a34", "#83451a"],
  };

  let step = 0;
  let stage = "assemble";
  let busy = false;
  let resets = 0;
  let usedKeyboard = false;
  let alive = true;
  let bubbleTimer = 0;
  let bubbleRate = 0;
  let finishTimer = 0;
  const pos = { ...REST };

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  const r1 = value => Math.round(value * 10) / 10;
  const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const linear = p => p;
  let seed = 11;
  const seeded = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const rand = (min, max) => min + Math.random() * (max - min);
  function tween(duration, step, ease = easeInOut) {
    return new Promise(resolve => {
      if (reduced.matches || !duration) { step(1); resolve(); return; }
      let start = 0;
      const frame = now => {
        if (!alive) { resolve(); return; }
        start ||= now;
        const p = Math.min(1, (now - start) / duration);
        step(ease(p));
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }
  function mix(a, b, t) {
    const pa = a.match(/\w\w/g).map(h => parseInt(h, 16));
    const pb = b.match(/\w\w/g).map(h => parseInt(h, 16));
    return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  const shade = (stops, p) => p < .5 ? mix(stops[0], stops[1], p * 2) : mix(stops[1], stops[2], (p - .5) * 2);
  // Scattered points inside an ellipse, back to front.
  function scatter(count, rx, ry, cy = 0) {
    const points = [];
    while (points.length < count) {
      const x = (seeded() * 2 - 1) * rx;
      const y = (seeded() * 2 - 1) * ry;
      if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) points.push({ x, y: y + cy, rot: seeded() * 360, k: .8 + seeded() * .4 });
    }
    return points.sort((a, b) => a.y - b.y);
  }
  function piece(parent, href, point, scale = 1) {
    const holder = element("g", { transform: `translate(${r1(point.x)} ${r1(point.y)}) rotate(${r1(point.rot)}) scale(${r1(point.k * scale * 100) / 100})` }, parent);
    const node = element("use", { href }, holder);
    node.style.transformBox = "fill-box";
    node.style.transformOrigin = "50% 50%";
    return node;
  }

  // ---------- Art ----------
  const onionHeap = document.querySelector('.bowl[data-item="onion"] .heap');
  for (const point of scatter(26, 58, 15, -6)) piece(onionHeap, "#ring", point);
  const oysterHeap = document.querySelector('.bowl[data-item="oyster"] .heap');
  for (const point of scatter(6, 46, 10, -6)) piece(oysterHeap, "#oyster-piece", { ...point, rot: point.rot % 40 - 20 }, .95);
  const fills = {
    onion1: scatter(11, 58, 32, 4),
    oysters: [{ x: -30, y: -8, rot: -12, k: 1 }, { x: 24, y: -12, rot: 16, k: .95 }, { x: -8, y: 14, rot: 4, k: 1.05 }, { x: 36, y: 14, rot: -20, k: .9 }],
    onion2: scatter(11, 58, 32, 4),
  };
  for (const point of scatter(8, 44, 12, -18)) piece(peek, "#ring", point, .75);
  for (const point of scatter(30, 60, 20, -12)) {
    element("path", { d: `M${r1(point.x - 3)} ${r1(point.y)}q3 -3 6 0`, stroke: "#8a4a1c", "stroke-width": 2, "stroke-linecap": "round" }, crisp);
  }

  function placeLadle() {
    ladle.setAttribute("transform", `translate(${r1(pos.x)} ${r1(pos.y)})`);
  }
  function paintBatter(p) {
    batterDome.setAttribute("fill", shade(SHADES.dome, p));
    batterBase.setAttribute("fill", shade(SHADES.base, p));
    batterRim.setAttribute("stroke", shade(SHADES.rim, p));
    crisp.setAttribute("opacity", r1(Math.max(0, (p - .35) / .65) * 100) / 100);
    peek.setAttribute("opacity", r1((.95 - p * .25) * 100) / 100);
    scene.dataset.fry = (Math.round(p * 100) / 100).toString();
  }
  function setStage(next) {
    stage = next;
    scene.dataset.stage = next;
    scene.dataset.step = String(step);
    scene.dataset.reset = String(resets);
    scene.classList.toggle("busy", busy);
    scene.classList.toggle("can-fry", stage === "assemble" && SEQUENCE[step] === "fry");
    scene.classList.toggle("cooked", stage === "cooked");
    const ladleActive = scene.classList.contains("can-fry") || stage === "cooked";
    ladle.setAttribute("tabindex", ladleActive ? "0" : "-1");
    ladle.setAttribute("aria-label", stage === "cooked" ? "炸好的蚵炱，點一下起鍋" : ladleActive ? "圓勺，點一下放進炸鍋" : "圓勺");
  }
  function setBusy(value) {
    busy = value;
    scene.classList.toggle("busy", value);
  }

  // ---------- Steps ----------
  function act(item) {
    if (busy || stage !== "assemble") return;
    if (item === "fry") {
      if (SEQUENCE[step] === "fry") fry();
      else nudge();
      return;
    }
    if (SEQUENCE[step] !== item) startOver();
    else add(item);
  }

  async function arc(node, from, to, duration, height, extra = () => "") {
    await tween(duration, p => {
      const x = from.x + (to.x - from.x) * p;
      const y = from.y + (to.y - from.y) * p - Math.sin(Math.PI * p) * height;
      node.setAttribute("transform", `translate(${r1(x)} ${r1(y)})${extra(p)}`);
    });
  }

  async function add(item) {
    setBusy(true);
    const which = item === "onion" ? (step === 0 ? "onion1" : "onion2") : item === "oyster" ? "oysters" : "batter";
    status.textContent = { onion1: "加了蔥花。", oysters: "加了蚵仔。", onion2: "再加一次蔥花。", batter: "淋上麵糊，可以下鍋炸了。" }[which];
    const bowl = BOWLS[item];
    const blob = element("g", {}, flyingLayer);
    if (item === "onion") for (const point of scatter(6, 14, 8)) piece(blob, "#ring", point);
    else if (item === "oyster") for (const point of [{ x: -8, y: -2, rot: -10, k: .8 }, { x: 10, y: 4, rot: 14, k: .75 }]) piece(blob, "#oyster-piece", point);
    else {
      element("path", { d: "M0 -16C10 -4 14 4 14 9C14 17 7 22 0 22C-7 22 -14 17 -14 9C-14 4 -10 -4 0 -16Z", fill: "#f1e4c3", stroke: "#dcc699", "stroke-width": 2 }, blob);
    }
    await arc(blob, bowl, { x: pos.x, y: pos.y - 6 }, 520, 90, p => ` scale(${r1((1 - p * .35) * 100) / 100})`);
    blob.remove();
    if (!alive) return;

    if (which === "batter") {
      batter.setAttribute("opacity", ".88");
      paintBatter(0);
      await tween(560, p => batter.setAttribute("transform", `scale(1 ${r1((.15 + .85 * p) * 100) / 100})`), p => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2));
    } else {
      const layer = layers[which];
      const nodes = fills[which].map(point => piece(layer, which === "oysters" ? "#oyster-piece" : "#ring", point));
      if (!reduced.matches) {
        nodes.forEach((node, i) => node.animate([
          { transform: "scale(0)", opacity: 0 }, { transform: "scale(1.25)", opacity: 1, offset: .6 }, { transform: "scale(1)" },
        ], { duration: 320, delay: i * 25, easing: "ease-out", fill: "backwards" }));
        await new Promise(resolve => setTimeout(resolve, 320 + nodes.length * 25));
      }
      await tween(220, p => placeLadleWith(0, Math.sin(Math.PI * p) * 4));
    }
    if (!alive) return;
    step++;
    setBusy(false);
    setStage("assemble");
  }
  function placeLadleWith(dx, dy) {
    ladle.setAttribute("transform", `translate(${r1(pos.x + dx)} ${r1(pos.y + dy)})`);
  }

  async function nudge() {
    setBusy(true);
    await tween(320, p => placeLadleWith(Math.sin(p * Math.PI * 4) * 5 * (1 - p), 0), linear);
    placeLadle();
    setBusy(false);
    setStage(stage);
  }

  async function startOver() {
    setBusy(true);
    resets++;
    status.textContent = "順序不對，重新開始：先加蔥花。";
    await tween(560, p => placeLadleWith(Math.sin(p * Math.PI * 6) * 11 * (1 - p), 0), linear);
    placeLadle();
    if (step > 0) {
      await tween(320, p => food.setAttribute("opacity", r1((1 - p) * 100) / 100));
      for (const layer of Object.values(layers)) layer.replaceChildren();
      batter.setAttribute("opacity", "0");
      batter.removeAttribute("transform");
      food.removeAttribute("opacity");
    }
    step = 0;
    setBusy(false);
    setStage("assemble");
  }

  // ---------- Frying ----------
  function bubble() {
    const nearFood = Math.random() < .35;
    let x;
    let y;
    for (let tries = 0; tries < 12; tries++) {
      const angle = Math.random() * Math.PI * 2;
      const spread = nearFood ? rand(.88, 1) : rand(1.05, 1.9);
      x = FRY.x + Math.cos(angle) * 76 * spread;
      y = FRY.y + 3 + Math.sin(angle) * 46 * spread;
      if (nearFood || ((x - OIL.x) / OIL.rx) ** 2 + ((y - OIL.y) / OIL.ry) ** 2 < 1) break;
    }
    const node = element("circle", { cx: r1(x), cy: r1(y), r: r1(rand(2.5, 6.5)), fill: "#fff6d4", stroke: "#f2c463", "stroke-width": 1.2 }, bubbleLayer);
    node.style.transformBox = "fill-box";
    node.style.transformOrigin = "50% 50%";
    node.animate([
      { transform: "translateY(0) scale(.3)", opacity: 0 },
      { transform: "translateY(-3px) scale(1)", opacity: .9, offset: .5 },
      { transform: "translateY(-7px) scale(1.35)", opacity: 0 },
    ], { duration: rand(420, 820), easing: "ease-out" }).finished.then(() => node.remove(), () => node.remove());
  }
  function bubbleLoop() {
    clearTimeout(bubbleTimer);
    if (!alive || !bubbleRate || reduced.matches) return;
    const count = Math.max(1, Math.round(bubbleRate / 2));
    for (let i = 0; i < count; i++) bubble();
    bubbleTimer = setTimeout(bubbleLoop, 70);
  }

  async function fry() {
    setBusy(true);
    setStage("frying");
    status.textContent = "放進油鍋，滋滋作響。";
    const from = { ...pos };
    await tween(620, p => {
      pos.x = from.x + (FRY.x - from.x) * p;
      pos.y = from.y + (FRY.y - from.y) * p - Math.sin(Math.PI * p) * 70;
      ladleShadow.setAttribute("opacity", r1(.2 * (1 - p) * 100) / 100);
      placeLadle();
    });
    if (!alive) return;
    oilLip.setAttribute("transform", `translate(${FRY.x} ${FRY.y + 4})`);
    batter.setAttribute("opacity", "1");
    bubbleRate = 6;
    bubbleLoop();
    await tween(240, p => oilLip.setAttribute("opacity", r1(p * .85 * 100) / 100));
    await tween(FRY_MS, p => {
      paintBatter(p);
      bubbleRate = 6 - p * 3;
      placeLadleWith(0, Math.sin(p * 60) * .8);
    }, linear);
    if (!alive) return;
    paintBatter(1);
    placeLadle();
    bubbleRate = 2;
    setBusy(false);
    setStage("cooked");
    status.textContent = "炸得金黃酥脆了，點它起鍋。";
    if (usedKeyboard) ladle.focus();
  }

  async function serve() {
    if (busy || stage !== "cooked") return;
    setBusy(true);
    setStage("serving");
    status.textContent = "起鍋！";
    bubbleRate = 0;
    clearTimeout(bubbleTimer);
    const lipFade = tween(200, p => oilLip.setAttribute("opacity", r1((1 - p) * .85 * 100) / 100));
    await tween(420, p => {
      pos.x = FRY.x + (LIFT.x - FRY.x) * p;
      pos.y = FRY.y + (LIFT.y - FRY.y) * p;
      placeLadle();
    });
    await lipFade;
    if (!alive) return;
    if (!reduced.matches) {
      for (const dx of [-30, 18]) {
        const drop = element("path", { d: "M0 -6C4 0 5 3 5 5A5 5 0 0 1 -5 5C-5 3 -4 0 0 -6Z", fill: "#e8a83f", transform: `translate(${pos.x + dx} ${pos.y + 50})` }, bubbleLayer);
        drop.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(48px)", opacity: 0 }], { duration: 420, delay: dx < 0 ? 0 : 160, easing: "ease-in", fill: "both" })
          .finished.then(() => drop.remove(), () => drop.remove());
      }
    }
    // The fritter pops out of the ladle and wobbles to the plate like a little UFO.
    const ufo = element("g", { transform: `translate(${pos.x} ${pos.y})` }, flyingLayer);
    ufo.append(food);
    const start = { ...pos };
    await tween(860, p => {
      const x = start.x + (PLATE.x - start.x) * p;
      const y = start.y + (PLATE.y - start.y) * p - Math.sin(Math.PI * p) * 170;
      const k = 1 + (PLATE.k - 1) * p;
      ufo.setAttribute("transform", `translate(${r1(x)} ${r1(y)}) rotate(${r1(Math.sin(p * Math.PI * 3) * 12 * (1 - p))}) scale(${r1(k * 100) / 100})`);
    });
    await tween(260, p => {
      const squash = Math.sin(Math.PI * p) * .12;
      ufo.setAttribute("transform", `translate(${PLATE.x} ${PLATE.y}) scale(${r1(PLATE.k * (1 + squash) * 100) / 100} ${r1(PLATE.k * (1 - squash) * 100) / 100})`);
    }, linear);
    ufo.setAttribute("transform", `translate(${PLATE.x} ${PLATE.y}) scale(${PLATE.k})`);
    if (!alive) return;
    for (const [i, dx] of [-18, 2, 22].entries()) {
      const wisp = element("path", { d: `M${PLATE.x + dx} ${PLATE.y - 30}q-8 -12 0 -24q8 -12 0 -24`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, steamLayer);
      wisp.style.setProperty("--delay", `${i * -.8}s`);
    }
    sparkle();
    const back = { ...pos };
    tween(520, p => {
      pos.x = back.x + (REST.x - back.x) * p;
      pos.y = back.y + (REST.y - back.y) * p - Math.sin(Math.PI * p) * 40;
      ladleShadow.setAttribute("opacity", r1(.2 * p * 100) / 100);
      placeLadle();
    });
    stage = "done";
    scene.dataset.stage = "done";
    scene.classList.remove("cooked");
    scene.classList.add("complete");
    status.textContent = "蚵炱做好了！";
    if (document.activeElement === ladle) ladle.blur();
    finishTimer = setTimeout(() => window.completeLevel(), reduced.matches ? 300 : 1600);
  }

  function sparkle() {
    if (reduced.matches) return;
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      const holder = element("g", { transform: `translate(${r1(PLATE.x + Math.cos(angle) * 70)} ${r1(PLATE.y - 10 + Math.sin(angle) * 44)})` }, sparkleLayer);
      const star = element("path", { d: "M0 -10L2.5 -2.5L10 0L2.5 2.5L0 10L-2.5 2.5L-10 0L-2.5 -2.5Z", fill: i % 2 ? "#fff4b8" : "#fff" }, holder);
      star.style.transformBox = "fill-box";
      star.style.transformOrigin = "50% 50%";
      star.animate([
        { transform: "scale(0) rotate(0deg)", opacity: 0 },
        { transform: "scale(1.2) rotate(45deg)", opacity: 1, offset: .4 },
        { transform: "scale(0) rotate(90deg)", opacity: 0 },
      ], { duration: 900, delay: i * 50, easing: "ease-out", fill: "both" });
    }
  }

  // ---------- Input ----------
  function bind(node, action) {
    node.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      usedKeyboard = false;
      scene.classList.add("pointer");
      action();
    });
    node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      usedKeyboard = true;
      action();
    });
  }
  for (const bowl of bowls) bind(bowl, () => act(bowl.dataset.item));
  const potAction = () => stage === "cooked" ? serve() : act("fry");
  bind(wok, potAction);
  bind(ladle, potAction);
  document.addEventListener("keydown", () => scene.classList.remove("pointer"));

  placeLadle();
  paintBatter(0);
  setStage("assemble");

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
    background: "#232444",
    setup: () => {
      alive = true;
      if (bubbleRate) bubbleLoop();
      return animateScene(true);
    },
    teardown: async () => {
      clearTimeout(finishTimer);
      clearTimeout(bubbleTimer);
      await animateScene(false);
      alive = false;
    },
  });
})();
