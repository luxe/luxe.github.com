(() => {
  "use strict";
  const svg = document.querySelector(".stall");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const defs = svg.querySelector("defs");
  const leafLayer = document.querySelector(".leaves");
  const fishLayer = document.querySelector(".fishes");
  const sparkleLayer = document.querySelector(".sparkles");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";

  const CENTER_X = 300;
  const SLOT_Y = [246, 316, 386, 456, 526, 596, 666];
  const TILT = [-2, 1.5, -1, 2, -1.5, 1, -2];
  const HIT_H = 64;
  const SWAP_MS = 600;
  // Smallest to largest. Ranks are indexes into this list.
  const KINDS = [
    { name: "sardine", length: 100, ratio: .3, back: "#3f6f95", belly: "#e3edf3", fin: "#5d86a8", pattern: "dots" },
    { name: "tilapia", length: 130, ratio: .38, back: "#55635a", belly: "#cdd4c8", fin: "#6a7a6e", pattern: "bars" },
    { name: "croaker", length: 160, ratio: .32, back: "#d79a2a", belly: "#fbe08a", fin: "#e3a93a", pattern: "" },
    { name: "snapper", length: 190, ratio: .36, back: "#b8382c", belly: "#f6a08a", fin: "#d3523f", pattern: "" },
    { name: "mackerel", length: 220, ratio: .27, back: "#2c5d84", belly: "#e6eef3", fin: "#46779c", pattern: "waves" },
    { name: "milkfish", length: 250, ratio: .27, back: "#6b8496", belly: "#eef3f6", fin: "#8aa0b0", pattern: "" },
    { name: "grouper", length: 280, ratio: .33, back: "#8a5a38", belly: "#d9a77a", fin: "#9c6a44", pattern: "spots" },
  ];

  let selected = null;
  let busy = false;
  let completed = false;
  let swaps = 0;
  let timer = 0;
  let usedKeyboard = false;

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  const r1 = value => Math.round(value * 10) / 10;
  const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, reduced.matches ? 0 : ms));
  function tween(duration, step) {
    return new Promise(resolve => {
      if (reduced.matches) { step(1); resolve(); return; }
      let start = 0;
      const frame = now => {
        start ||= now;
        const p = Math.min(1, (now - start) / duration);
        step(easeInOut(p));
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  // ---------- Art ----------
  for (const [slot, y] of SLOT_Y.entries()) {
    const leaf = element("g", { transform: `translate(${CENTER_X} ${y}) rotate(${-TILT[slot] * 1.5})` }, leafLayer);
    element("path", { d: "M-200 0C-140 -34 140 -34 200 0C140 34 -140 34 -200 0Z", fill: "url(#leaf)", stroke: "#357a33", "stroke-width": 2 }, leaf);
    element("path", { d: "M-196 0H196", stroke: "#a9d68e", "stroke-width": 2.5, "stroke-linecap": "round" }, leaf);
    const veins = [];
    for (let x = -160; x <= 160; x += 32) veins.push(`M${x} 0L${x - 14} -20M${x} 0L${x - 14} 20`);
    element("path", { d: veins.join(""), stroke: "#8cc574", "stroke-width": 1.5, opacity: .7, "stroke-linecap": "round" }, leaf);
  }

  function drawFish(kind, parent) {
    const L = kind.length;
    const H = L * kind.ratio;
    const x0 = -L / 2;
    const xe = L / 2;
    const xt = xe - .2 * L;
    const gradient = element("linearGradient", { id: `g-${kind.name}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    element("stop", { offset: .1, "stop-color": kind.back }, gradient);
    element("stop", { offset: .62, "stop-color": kind.belly }, gradient);
    const bodyPath = [
      `M${x0} 0`,
      `C${x0} ${-.42 * H} ${x0 + .18 * L} ${-.55 * H} ${x0 + .4 * L} ${-.52 * H}`,
      `C${xt - .12 * L} ${-.48 * H} ${xt} ${-.2 * H} ${xt} ${-.1 * H}`,
      `L${xt} ${.1 * H}`,
      `C${xt} ${.2 * H} ${xt - .12 * L} ${.48 * H} ${x0 + .4 * L} ${.52 * H}`,
      `C${x0 + .18 * L} ${.55 * H} ${x0} ${.42 * H} ${x0} 0Z`,
    ].join("").replace(/(\.\d)\d+/g, "$1");
    const clip = element("clipPath", { id: `c-${kind.name}` }, defs);
    element("path", { d: bodyPath }, clip);

    element("ellipse", { cx: 4, cy: r1(.42 * H), rx: r1(.46 * L), ry: r1(.16 * H + 3), fill: "#5f8ea3", opacity: .22 }, parent);
    // Fins and tail sit behind the body.
    element("path", { d: `M${r1(x0 + .3 * L)} ${r1(-.45 * H)}Q${r1(x0 + .46 * L)} ${r1(-.86 * H)} ${r1(x0 + .68 * L)} ${r1(-.38 * H)}Z`, fill: kind.fin, stroke: kind.back, "stroke-width": 1.5, "stroke-linejoin": "round" }, parent);
    element("path", { d: `M${r1(x0 + .42 * L)} ${r1(.46 * H)}Q${r1(x0 + .52 * L)} ${r1(.74 * H)} ${r1(x0 + .62 * L)} ${r1(.4 * H)}Z`, fill: kind.fin, stroke: kind.back, "stroke-width": 1.5, "stroke-linejoin": "round" }, parent);
    element("path", { d: `M${r1(xt - 2)} ${r1(-.08 * H)}L${r1(xe)} ${r1(-.52 * H)}Q${r1(xe - .07 * L)} 0 ${r1(xe)} ${r1(.52 * H)}L${r1(xt - 2)} ${r1(.08 * H)}Z`, fill: kind.fin, stroke: kind.back, "stroke-width": 2, "stroke-linejoin": "round" }, parent);
    element("path", { d: `M${r1(xt + .04 * L)} 0L${r1(xe - .03 * L)} ${r1(-.3 * H)}M${r1(xt + .04 * L)} 0L${r1(xe - .03 * L)} ${r1(.3 * H)}`, stroke: kind.back, "stroke-width": 1.2, opacity: .5 }, parent);

    element("path", { d: bodyPath, fill: `url(#g-${kind.name})`, stroke: kind.back, "stroke-width": 2 }, parent);
    const marks = element("g", { "clip-path": `url(#c-${kind.name})` }, parent);
    if (kind.pattern === "dots") {
      for (let i = 0; i < 4; i++) element("circle", { cx: r1(x0 + .36 * L + i * .1 * L), cy: r1(-.05 * H), r: 2.4, fill: kind.back, opacity: .7 }, marks);
    } else if (kind.pattern === "bars") {
      for (let i = 0; i < 5; i++) element("path", { d: `M${r1(x0 + .34 * L + i * .09 * L)} ${r1(-.6 * H)}V${r1(.1 * H)}`, stroke: kind.back, "stroke-width": 5, opacity: .3 }, marks);
    } else if (kind.pattern === "waves") {
      for (let i = 0; i < 7; i++) {
        const x = x0 + .32 * L + i * .065 * L;
        element("path", { d: `M${r1(x)} ${r1(-.6 * H)}Q${r1(x + 9)} ${r1(-.4 * H)} ${r1(x)} ${r1(-.18 * H)}`, stroke: "#1b3b56", "stroke-width": 3, opacity: .7, "stroke-linecap": "round" }, marks);
      }
    } else if (kind.pattern === "spots") {
      const spots = [[.34, -.25], [.44, .05], [.52, -.32], [.6, -.02], [.68, -.22], [.4, -.42], [.56, .2], [.72, .08]];
      for (const [fx, fy] of spots) element("circle", { cx: r1(x0 + fx * L), cy: r1(fy * H), r: r1(.035 * L), fill: "#5e3a22", opacity: .45 }, marks);
    }
    element("ellipse", { cx: r1(x0 + .46 * L), cy: r1(-.3 * H), rx: r1(.26 * L), ry: r1(.08 * H + 1), fill: "#fff", opacity: .28 }, marks);
    const scales = [];
    for (let i = 0; i < 4; i++) scales.push(`M${r1(x0 + .4 * L + i * .08 * L)} ${r1(.08 * H)}q4 6 0 12`);
    element("path", { d: scales.join(""), stroke: "#fff", "stroke-width": 1.5, opacity: .35, "stroke-linecap": "round" }, marks);
    element("path", { d: `M${r1(x0 + .26 * L)} ${r1(-.32 * H)}Q${r1(x0 + .32 * L)} 0 ${r1(x0 + .26 * L)} ${r1(.32 * H)}`, stroke: kind.back, "stroke-width": 2, opacity: .7, "stroke-linecap": "round" }, parent);
    // Cute face
    const eye = Math.max(4.5, .1 * H);
    const ex = x0 + .14 * L;
    const ey = -.1 * H;
    element("ellipse", { cx: r1(x0 + .2 * L), cy: r1(.14 * H), rx: r1(eye * .9), ry: r1(eye * .5), fill: "#ff8f8f", opacity: .45 }, parent);
    element("circle", { cx: r1(ex), cy: r1(ey), r: r1(eye), fill: "#fff", stroke: "#2b2b33", "stroke-width": 1.5 }, parent);
    element("circle", { cx: r1(ex - eye * .15), cy: r1(ey + eye * .1), r: r1(eye * .6), fill: "#23232b" }, parent);
    element("circle", { cx: r1(ex - eye * .35), cy: r1(ey - eye * .2), r: r1(eye * .22), fill: "#fff" }, parent);
    element("path", { d: `M${r1(x0 + 2)} ${r1(.06 * H)}q5 4 9 0`, stroke: "#2b2b33", "stroke-width": 1.6, "stroke-linecap": "round" }, parent);
    return H;
  }

  function shuffledOrder() {
    const ranks = KINDS.map((_, i) => i);
    for (;;) {
      for (let i = ranks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
      }
      // Far from both sorted orders so the puzzle needs several swaps.
      const up = ranks.filter((rank, slot) => rank !== slot).length;
      const down = ranks.filter((rank, slot) => rank !== ranks.length - 1 - slot).length;
      if (up >= 5 && down >= 5) return ranks;
    }
  }

  const fishes = shuffledOrder().map((rank, slot) => {
    const kind = KINDS[rank];
    const node = element("g", { class: "fish", tabindex: 0, role: "button", "data-rank": rank }, fishLayer);
    const body = element("g", { class: "body" }, node);
    const wiggle = element("g", { class: "wiggle" }, body);
    drawFish(kind, wiggle);
    element("rect", { class: "hit", x: -kind.length / 2 - 6, y: -HIT_H / 2, width: kind.length + 12, height: HIT_H, fill: "transparent" }, node);
    element("rect", { class: "focus-ring", x: -kind.length / 2 - 10, y: -HIT_H / 2 - 4, width: kind.length + 20, height: HIT_H + 8, rx: 12 }, node);
    const fish = { rank, kind, node, slot, x: CENTER_X, y: SLOT_Y[slot], tilt: TILT[slot], lift: 0 };
    place(fish);
    return fish;
  });
  sortDom();
  updateState();

  function place(fish) {
    const s = 1 + fish.lift * .08;
    fish.node.setAttribute("transform", `translate(${r1(fish.x)} ${r1(fish.y)}) rotate(${r1(fish.tilt)}) scale(${Math.round(s * 1000) / 1000})`);
  }
  function label(fish) {
    fish.node.setAttribute("aria-label", `第${fish.slot + 1}格，長約${fish.kind.length / 10}公分的魚${fish === selected ? "，已選取" : ""}`);
  }
  function sortDom() {
    const focused = document.activeElement;
    for (const fish of [...fishes].sort((a, b) => a.slot - b.slot)) fishLayer.append(fish.node);
    if (focused && fishes.some(f => f.node === focused) && document.activeElement !== focused) focused.focus();
  }
  function order() { return [...fishes].sort((a, b) => a.slot - b.slot).map(f => f.rank); }
  function updateState() {
    scene.dataset.order = order().join(",");
    scene.dataset.selected = selected ? String(selected.rank) : "";
    scene.dataset.swaps = String(swaps);
    scene.classList.toggle("busy", busy);
    fishes.forEach(label);
  }
  function isSorted(ranks) {
    const up = ranks.every((rank, i) => i === 0 || rank > ranks[i - 1]);
    const down = ranks.every((rank, i) => i === 0 || rank < ranks[i - 1]);
    return up || down;
  }

  // ---------- Play ----------
  function choose(fish) {
    if (busy || completed) return;
    if (!selected) {
      selected = fish;
      fish.node.classList.add("selected");
      fish.lift = 1;
      place(fish);
      status.textContent = "選了一條魚，再點另一條魚交換。";
    } else if (selected === fish) {
      fish.node.classList.remove("selected");
      fish.lift = 0;
      place(fish);
      selected = null;
      status.textContent = "取消選取。";
    } else {
      swap(selected, fish);
      return;
    }
    updateState();
  }

  async function swap(a, b) {
    busy = true;
    selected = null;
    a.node.classList.remove("selected");
    updateState();
    fishLayer.append(b.node, a.node);
    if (usedKeyboard) b.node.focus();
    const from = { a: { y: a.y, tilt: a.tilt, lift: a.lift }, b: { y: b.y, tilt: b.tilt, lift: b.lift } };
    const slotA = a.slot;
    a.slot = b.slot;
    b.slot = slotA;
    const to = { a: { y: SLOT_Y[a.slot], tilt: TILT[a.slot] }, b: { y: SLOT_Y[b.slot], tilt: TILT[b.slot] } };
    const swing = Math.min(110, 40 + Math.abs(to.a.y - from.a.y) * .25);
    await tween(SWAP_MS, p => {
      const arc = Math.sin(Math.PI * p);
      a.x = CENTER_X - arc * swing;
      b.x = CENTER_X + arc * swing;
      a.y = from.a.y + (to.a.y - from.a.y) * p;
      b.y = from.b.y + (to.b.y - from.b.y) * p;
      a.tilt = from.a.tilt + (to.a.tilt - from.a.tilt) * p - arc * 10;
      b.tilt = from.b.tilt + (to.b.tilt - from.b.tilt) * p + arc * 10;
      a.lift = from.a.lift * (1 - p) + arc;
      b.lift = arc;
      place(a);
      place(b);
    });
    Object.assign(a, { x: CENTER_X, lift: 0 }, to.a);
    Object.assign(b, { x: CENTER_X, lift: 0 }, to.b);
    place(a);
    place(b);
    swaps++;
    busy = false;
    sortDom();
    updateState();
    if (isSorted(order())) win();
    else status.textContent = "交換好了。";
  }

  function win() {
    completed = true;
    scene.classList.add("complete");
    status.textContent = "魚都排好了！";
    for (const fish of fishes) fish.node.style.setProperty("--delay", `${fish.slot * 70}ms`);
    if (document.activeElement?.closest?.(".fish")) document.activeElement.blur();
    if (!reduced.matches) {
      for (let i = 0; i < 16; i++) {
        const x = 90 + Math.random() * 420;
        const y = 220 + Math.random() * 470;
        const holder = element("g", { transform: `translate(${r1(x)} ${r1(y)})` }, sparkleLayer);
        const star = element("path", { d: "M0 -12L3 -3L12 0L3 3L0 12L-3 3L-12 0L-3 -3Z", fill: i % 2 ? "#fff4b8" : "#ffffff" }, holder);
        star.style.transformBox = "fill-box";
        star.style.transformOrigin = "50% 50%";
        star.animate([
          { transform: "scale(0) rotate(0deg)", opacity: 0 },
          { transform: "scale(1.2) rotate(45deg)", opacity: 1, offset: .4 },
          { transform: "scale(0) rotate(90deg)", opacity: 0 },
        ], { duration: 900, delay: i * 70, easing: "ease-out", fill: "both" });
      }
    }
    timer = setTimeout(() => window.completeLevel(), reduced.matches ? 300 : 1700);
  }

  // ---------- Input ----------
  for (const fish of fishes) {
    fish.node.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      usedKeyboard = false;
      scene.classList.add("pointer");
      choose(fish);
    });
    fish.node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      usedKeyboard = true;
      choose(fish);
    });
  }
  document.addEventListener("keydown", () => scene.classList.remove("pointer"));

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
    background: "#5b4a3e",
    setup: () => animateScene(true),
    teardown: async () => {
      clearTimeout(timer);
      await animateScene(false);
    },
  });
})();
