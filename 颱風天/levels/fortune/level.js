(() => {
  "use strict";
  const svg = document.querySelector(".shrine");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const drawerLayer = document.querySelector(".drawers");
  const backdrop = document.querySelector(".backdrop");
  const scroll = document.querySelector(".scroll");
  const scrollHit = scroll.querySelector(".hit");
  const clipRect = document.querySelector(".paper-clip-rect");
  const roll = scroll.querySelector(".roll");
  const rodBottom = scroll.querySelector(".rod-bottom");
  const focusRing = scroll.querySelector(".focus-ring");
  const poemLayer = scroll.querySelector(".poem");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";

  const COLS = 5;
  const ROWS = 6;
  const PITCH_X = 94;
  const PITCH_Y = 81;
  const TOP_Y = 232;
  const HALF_W = 42;
  const HALF_H = 35;
  const PULL = 30;
  const GROW = .16;
  const PAPER_H = 500;
  const READ = { x: 300, y: 150, k: 1 };
  const IN_DRAWER_K = .2;
  const COLUMN_X = [90, 30, -30, -90];
  const CHAR_Y = 82;
  const CHAR_STEP = 52;

  let state = "idle";
  let active = null;
  let usedKeyboard = false;
  let timer = 0;
  let alive = true;
  const paper = { x: READ.x, y: READ.y, k: READ.k, h: 0, opacity: 0 };

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  const r1 = value => Math.round(value * 10) / 10;
  const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeOutBack = p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

  function numeral(n) {
    const digits = "〇一二三四五六七八九";
    if (n === 100) return "一百";
    if (n <= 10) return n === 10 ? "十" : digits[n];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return (tens > 1 ? digits[tens] : "") + "十" + (ones ? digits[ones] : "");
  }
  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Runs step(eased progress) every frame for the duration; instant with reduced motion.
  function tween(duration, step, ease = easeInOut) {
    return new Promise(resolve => {
      if (reduced.matches || !duration) {
        step(1);
        resolve();
        return;
      }
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
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced.matches ? 0 : ms));

  // ---------- Drawers ----------
  const fortunes = Array.isArray(window.FORTUNES) ? window.FORTUNES.filter(f => Array.isArray(f.poem) && f.poem.length) : [];
  const picks = shuffle(fortunes);
  const drawers = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = drawers.length;
      const fortune = picks.length ? picks[index % picks.length] : null;
      const cx = 300 + (col - (COLS - 1) / 2) * PITCH_X;
      const cy = TOP_Y + row * PITCH_Y;
      const node = element("g", { class: "drawer", tabindex: 0, role: "button", "data-index": index }, drawerLayer);
      element("rect", { x: cx - HALF_W, y: cy - HALF_H, width: HALF_W * 2, height: HALF_H * 2, rx: 2, fill: "#240b07" }, node);
      const inside = element("path", { fill: "#d89a62", stroke: "#9a5a30", "stroke-width": 1.5, "stroke-linejoin": "round", opacity: 0 }, node);
      const shadow = element("rect", { x: -HALF_W + 2, y: HALF_H - 4, width: HALF_W * 2 - 4, height: 10, rx: 5, fill: "#1c0806", opacity: 0 }, node);
      const front = element("g", { class: "front" }, node);
      element("rect", { x: -HALF_W, y: -HALF_H, width: HALF_W * 2, height: HALF_H * 2, rx: 3, fill: "url(#drawer-wood)" }, front);
      element("rect", { x: -HALF_W + 4, y: -HALF_H + 4, width: HALF_W * 2 - 8, height: HALF_H * 2 - 8, rx: 2, stroke: "#e3a25a", "stroke-width": 1.5, opacity: .55 }, front);
      const label = element("g", { class: "label" }, front);
      element("rect", { x: -29, y: -28, width: 58, height: 25, rx: 2, fill: "#f6e3b2", stroke: "#b9832f", "stroke-width": 1.5 }, label);
      if (fortune) element("text", { x: 0, y: -15.5 }, label).textContent = numeral(fortune.lot);
      element("circle", { cx: 0, cy: 12, r: 4, fill: "url(#gold)" }, front);
      element("ellipse", { cx: 0, cy: 21, rx: 8, ry: 7, stroke: "url(#gold)", "stroke-width": 3 }, front);
      element("rect", { class: "focus-ring", x: cx - HALF_W - 4, y: cy - HALF_H - 4, width: HALF_W * 2 + 8, height: HALF_H * 2 + 8, rx: 6 }, node);
      node.setAttribute("aria-label", fortune ? `打開第${numeral(fortune.lot)}籤的抽屜` : "打開抽屜");
      const drawer = { index, node, front, inside, shadow, cx, cy, fortune, p: 0 };
      drawDrawer(drawer);
      drawers.push(drawer);
    }
  }

  function drawDrawer(drawer) {
    const { cx, cy, p } = drawer;
    const s = 1 + GROW * p;
    const fy = cy + PULL * p;
    drawer.front.setAttribute("transform", `translate(${r1(cx)} ${r1(fy)}) scale(${Math.round(s * 1000) / 1000})`);
    // The drawer box floor shows between the cabinet opening and the pulled-out front.
    const top = cy - HALF_H;
    const frontTop = fy - HALF_H * s;
    drawer.inside.setAttribute("d", `M${r1(cx - HALF_W + 3)} ${r1(top + 3)}H${r1(cx + HALF_W - 3)}L${r1(cx + HALF_W * s)} ${r1(frontTop)}H${r1(cx - HALF_W * s)}Z`);
    drawer.inside.setAttribute("opacity", p > .02 ? 1 : 0);
    drawer.shadow.setAttribute("transform", `translate(${r1(cx)} ${r1(fy + (HALF_H - 2) * (s - 1))}) scale(${Math.round(s * 1000) / 1000} 1)`);
    drawer.shadow.setAttribute("opacity", r1(p * .35 * 100) / 100);
  }

  // ---------- Scroll ----------
  function drawScroll() {
    const h = Math.max(0, paper.h);
    scroll.setAttribute("transform", `translate(${r1(paper.x)} ${r1(paper.y)}) scale(${Math.round(paper.k * 1000) / 1000})`);
    scroll.setAttribute("opacity", Math.round(paper.opacity * 100) / 100);
    clipRect.setAttribute("height", r1(h));
    rodBottom.setAttribute("transform", `translate(0 ${r1(h)})`);
    // The rolled-up paper rides on the bottom rod and thins as it unrolls.
    const thickness = 6 + 16 * (1 - h / PAPER_H);
    roll.setAttribute("y", r1(h - thickness / 2));
    roll.setAttribute("height", r1(thickness));
    scrollHit.setAttribute("height", r1(h + 32));
    focusRing.setAttribute("height", r1(h + 40));
  }
  function writePoem(poem) {
    poemLayer.replaceChildren();
    poem.slice(0, COLUMN_X.length).forEach((line, column) => {
      [...line].forEach((char, i) => {
        element("text", { x: COLUMN_X[column], y: CHAR_Y + i * CHAR_STEP }, poemLayer).textContent = char;
      });
    });
  }
  function drawerSpot(drawer) {
    return { x: drawer.cx, y: drawer.cy + PULL - HALF_H * (1 + GROW) - 12, k: IN_DRAWER_K };
  }

  function setState(next) {
    state = next;
    scene.dataset.state = next;
    scene.classList.toggle("busy", next !== "idle");
    scene.classList.toggle("reading", next === "reading");
    if (next === "reading") scroll.setAttribute("tabindex", "0");
    else scroll.removeAttribute("tabindex");
  }

  async function open(drawer) {
    if (state !== "idle" || !drawer.fortune) return;
    setState("opening");
    active = drawer;
    scene.dataset.lot = String(drawer.fortune.lot);
    drawerLayer.append(drawer.node);
    writePoem(drawer.fortune.poem);
    status.textContent = "抽屜打開了，籤詩出來了。";

    await tween(480, p => { drawer.p = p; drawDrawer(drawer); }, easeOutBack);
    const from = drawerSpot(drawer);
    Object.assign(paper, from, { h: 0, opacity: 0 });
    drawScroll();
    await tween(180, p => { paper.opacity = p; paper.y = from.y + 8 * (1 - p); drawScroll(); }, easeOut);
    await tween(760, p => {
      paper.x = from.x + (READ.x - from.x) * p;
      paper.y = from.y + (READ.y - from.y) * p - Math.sin(Math.PI * p) * 60;
      paper.k = from.k + (READ.k - from.k) * p;
      backdrop.setAttribute("opacity", r1(p * .5 * 100) / 100);
      drawScroll();
    });
    await tween(1000, p => { paper.h = PAPER_H * p; drawScroll(); });
    if (!alive) return;
    setState("reading");
    status.textContent = drawer.fortune.poem.join("，") + "。";
    if (usedKeyboard) scroll.focus();
  }

  async function close() {
    if (state !== "reading" || !active) return;
    const drawer = active;
    setState("closing");
    status.textContent = "籤詩收回抽屜。";
    await tween(800, p => { paper.h = PAPER_H * (1 - p); drawScroll(); });
    const to = drawerSpot(drawer);
    await tween(700, p => {
      paper.x = READ.x + (to.x - READ.x) * p;
      paper.y = READ.y + (to.y - READ.y) * p - Math.sin(Math.PI * p) * 60;
      paper.k = READ.k + (to.k - READ.k) * p;
      backdrop.setAttribute("opacity", r1((1 - p) * .5 * 100) / 100);
      drawScroll();
    });
    await tween(160, p => { paper.opacity = 1 - p; paper.y = to.y + 8 * p; drawScroll(); }, easeOut);
    await tween(420, p => { drawer.p = 1 - p; drawDrawer(drawer); });
    if (!alive) return;
    setState("done");
    scene.classList.add("complete");
    status.textContent = "抽屜關好了。";
    if (usedKeyboard) drawer.node.blur();
    timer = setTimeout(() => window.completeLevel(), reduced.matches ? 0 : 500);
  }

  // ---------- Input ----------
  for (const drawer of drawers) {
    drawer.node.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      usedKeyboard = false;
      scene.classList.add("pointer");
      open(drawer);
    });
    drawer.node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      usedKeyboard = true;
      open(drawer);
    });
  }
  for (const target of [scroll, backdrop]) {
    target.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      usedKeyboard = false;
      scene.classList.add("pointer");
      close();
    });
  }
  scroll.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    usedKeyboard = true;
    close();
  });
  document.addEventListener("keydown", () => scene.classList.remove("pointer"));

  setState("idle");
  drawScroll();

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
    background: "#6e1f19",
    setup: () => {
      alive = true;
      return animateScene(true);
    },
    teardown: async () => {
      clearTimeout(timer);
      await animateScene(false);
      alive = false;
    },
  });
})();
