(() => {
  "use strict";
  const svg = document.querySelector(".street");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const rain = document.querySelector(".rain");
  const wireLayer = document.querySelector(".wires");
  const insulatorLayer = document.querySelector(".insulators");
  const endLayer = document.querySelector(".ends");
  const sparkLayer = document.querySelector(".sparks");
  const sparkleLayer = document.querySelector(".sparkles");
  const cheerArm = document.querySelector(".cheer-arm");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";

  const POLES = [100, 500];
  const OFFSETS = [-54, -18, 18, 54];
  // Wire attachment height on top of each crossarm's insulators.
  const ARMS = [177, 267];
  const SLACK = 1.035;
  const SNAP = 46;
  const BOUNDS = { minX: 12, maxX: 588, minY: 60, maxY: 640 };
  const GROUND = 640;
  // Snapped wires: which crossarm/insulator, the pole still holding it, and where its loose end lies.
  const BROKEN = [
    { arm: 0, slot: 1, from: 0, rest: { x: 178, y: 596 }, label: "上排斷掉的電線" },
    { arm: 1, slot: 2, from: 1, rest: { x: 430, y: 612 }, label: "下排斷掉的電線" },
  ];

  let alive = true;
  let completed = false;
  let drag = null;
  let sparkTimer = 0;
  let finishTimer = 0;
  const animations = new Set();

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  const r1 = value => Math.round(value * 10) / 10;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const settle = p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
  function tween(duration, step, ease = easeOut) {
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
  function track(animation) {
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    return animation;
  }

  for (let i = 0; i < 70; i++) {
    const drop = document.createElement("i");
    drop.style.left = `${Math.random() * 105}%`;
    drop.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    drop.style.animationDelay = `${-Math.random() * 4}s`;
    drop.style.setProperty("--still-y", `${Math.random() * 100}%`);
    rain.append(drop);
  }

  // ---------- Wires ----------
  const insulatorAt = (pole, arm, slot) => ({ x: POLES[pole] + OFFSETS[slot], y: ARMS[arm] });
  const LENGTH = (POLES[1] - POLES[0]) * SLACK;
  // A sagging cable as one quadratic curve; the sag grows with the slack left in the wire.
  function curve(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const sag = Math.sqrt(Math.max(0, LENGTH * LENGTH - d * d)) * .6 + 4;
    const c = { x: (a.x + b.x) / 2, y: Math.min((a.y + b.y) / 2 + sag, Math.max(GROUND, a.y, b.y)) };
    return { c, d: `M${r1(a.x)} ${r1(a.y)}Q${r1(c.x)} ${r1(c.y)} ${r1(b.x)} ${r1(b.y)}` };
  }
  function cable(path) {
    element("path", { d: path, stroke: "#2c3533", "stroke-width": 3.5, "stroke-linecap": "round" }, wireLayer);
  }

  const brokenKey = new Set(BROKEN.map(w => `${w.arm}:${w.slot}`));
  for (const [arm] of ARMS.entries()) {
    for (const [slot] of OFFSETS.entries()) {
      for (const pole of [0, 1]) {
        const at = insulatorAt(pole, arm, slot);
        element("use", { href: "#insulator", transform: `translate(${at.x} ${at.y + 17})` }, insulatorLayer);
      }
      if (!brokenKey.has(`${arm}:${slot}`)) cable(curve(insulatorAt(0, arm, slot), insulatorAt(1, arm, slot)).d);
    }
  }

  const wires = BROKEN.map((spec, index) => {
    const anchor = insulatorAt(spec.from, spec.arm, spec.slot);
    const target = insulatorAt(1 - spec.from, spec.arm, spec.slot);
    const glow = element("circle", { class: "target-glow", cx: target.x, cy: target.y - 2, r: 20, fill: "#fff2a8" }, insulatorLayer);
    insulatorLayer.prepend(glow);
    const path = element("path", { stroke: "#2c3533", "stroke-width": 3.5, "stroke-linecap": "round" }, wireLayer);
    const node = element("g", { class: "end", tabindex: 0, role: "button", "aria-label": spec.label, "aria-describedby": "instructions" }, endLayer);
    const art = element("g", {}, node);
    element("circle", { class: "hint", r: 28 }, art);
    element("path", { d: "M-26 0H-3", stroke: "#1f2725", "stroke-width": 10, "stroke-linecap": "round" }, art);
    element("path", { d: "M-22 -2H-8", stroke: "#56615e", "stroke-width": 2.5, "stroke-linecap": "round" }, art);
    for (const [dx, dy] of [[13, -9], [16, -2], [15, 5], [11, 10]]) {
      element("path", { d: `M-3 0Q${dx / 2} ${dy / 3} ${dx} ${dy}`, stroke: "#e0914f", "stroke-width": 2.6, "stroke-linecap": "round" }, art);
    }
    element("circle", { class: "focus-ring", r: 30 }, node);
    element("circle", { r: 34, fill: "transparent" }, node);
    return { ...spec, index, anchor, target, glow, path, node, art, end: { ...spec.rest }, fixed: false };
  });

  function render(wire) {
    const { c, d } = curve(wire.anchor, wire.end);
    wire.path.setAttribute("d", d);
    const angle = Math.atan2(wire.end.y - c.y, wire.end.x - c.x) * 180 / Math.PI;
    wire.node.setAttribute("transform", `translate(${r1(wire.end.x)} ${r1(wire.end.y)})`);
    wire.art.setAttribute("transform", `rotate(${r1(angle)})`);
    wire.art.style.opacity = wire.fixed ? "0" : "1";
  }
  wires.forEach(render);

  // Little crackles at the loose ends.
  function spark(wire) {
    const holder = element("g", { transform: `translate(${r1(wire.end.x)} ${r1(wire.end.y)}) rotate(${Math.round(Math.random() * 360)})` }, sparkLayer);
    element("path", { d: "M6 0L14 -4L12 2L22 -1", stroke: Math.random() < .5 ? "#fff3a0" : "#ffd45a", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, holder);
    element("circle", { cx: 6, r: 3, fill: "#fff8cf" }, holder);
    track(holder.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease-out" }))
      .finished.then(() => holder.remove(), () => holder.remove());
  }
  function sparkLoop() {
    clearTimeout(sparkTimer);
    if (!alive || completed || reduced.matches) return;
    for (const wire of wires) if (!wire.fixed && Math.random() < .55) spark(wire);
    sparkTimer = setTimeout(sparkLoop, 220 + Math.random() * 260);
  }

  // ---------- Interaction ----------
  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  // Keeps the end within reach of the wire still attached to its pole.
  function reach(wire, x, y) {
    let px = clamp(x, BOUNDS.minX, BOUNDS.maxX);
    let py = clamp(y, BOUNDS.minY, BOUNDS.maxY);
    const dx = px - wire.anchor.x;
    const dy = py - wire.anchor.y;
    const d = Math.hypot(dx, dy);
    if (d > LENGTH) {
      px = wire.anchor.x + dx / d * LENGTH;
      py = wire.anchor.y + dy / d * LENGTH;
    }
    return { x: px, y: py };
  }
  const nearTarget = wire => Math.hypot(wire.end.x - wire.target.x, wire.end.y - wire.target.y) <= SNAP;

  const siren = wanwanAudio.sound("./assets/ambulance.mp3", { loop: true, volume: .5 });

  async function connect(wire) {
    wire.fixed = true;
    wire.node.classList.add("fixed");
    wire.node.setAttribute("tabindex", "-1");
    wire.node.setAttribute("aria-disabled", "true");
    wire.glow.classList.remove("show", "near");
    const from = { ...wire.end };
    await tween(200, p => {
      wire.end.x = from.x + (wire.target.x - from.x) * p;
      wire.end.y = from.y + (wire.target.y - from.y) * p;
      render(wire);
    });
    wire.end = { ...wire.target };
    render(wire);
    if (!alive) return;
    // Overlapping play so both wires get their own jolt.
    wanwanAudio.play("./assets/jolt.mp3");
    burst(wire.target, 6, 30);
    const left = wires.filter(w => !w.fixed).length;
    status.textContent = left ? "接好一條電線了，還有一條。" : "電線都接好了！";
    if (!left) win();
  }
  async function dropBack(wire) {
    status.textContent = "還沒接上，電線掉回地上。";
    const from = { ...wire.end };
    await tween(560, p => {
      wire.end.x = from.x + (wire.rest.x - from.x) * p;
      wire.end.y = from.y + (wire.rest.y - from.y) * p;
      render(wire);
    }, settle);
    if (!wire.fixed) {
      wire.end = { ...wire.rest };
      render(wire);
    }
  }

  function grab(wire, event) {
    if (completed || wire.fixed || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    wire.node.classList.add("pointer", "held");
    const p = point(event);
    drag = { wire, id: event.pointerId, dx: wire.end.x - p.x, dy: wire.end.y - p.y };
    svg.setPointerCapture(event.pointerId);
    wire.glow.classList.add("show");
  }
  function move(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const { wire } = drag;
    const p = point(event);
    wire.end = reach(wire, p.x + drag.dx, p.y + drag.dy);
    wire.glow.classList.toggle("near", nearTarget(wire));
    render(wire);
  }
  function release(event) {
    if (!drag || (event && drag.id !== event.pointerId)) return;
    const { wire, id } = drag;
    drag = null;
    if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
    wire.node.classList.remove("held");
    wire.glow.classList.remove("show", "near");
    if (nearTarget(wire)) connect(wire);
    else dropBack(wire);
  }

  for (const wire of wires) {
    wire.node.addEventListener("pointerdown", event => grab(wire, event));
    wire.node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      wire.node.classList.remove("pointer");
      if (completed || wire.fixed || drag) return;
      connect(wire);
    });
  }
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
  svg.addEventListener("lostpointercapture", event => { if (drag && drag.id === event.pointerId) release(event); });
  const blur = () => release();
  window.addEventListener("blur", blur);

  // ---------- Win ----------
  function burst(at, count, radius) {
    if (reduced.matches) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 2 * i / count + Math.random() * .4;
      const holder = element("g", { transform: `translate(${r1(at.x)} ${r1(at.y)})` }, sparkleLayer);
      const star = element("path", { d: "M0 -9L2.4 -2.4L9 0L2.4 2.4L0 9L-2.4 2.4L-9 0L-2.4 -2.4Z", fill: i % 2 ? "#fff4b8" : "#ffffff" }, holder);
      track(star.animate([
        { transform: "translate(0, 0) scale(.2)", opacity: 0 },
        { transform: `translate(${r1(Math.cos(angle) * radius * .6)}px, ${r1(Math.sin(angle) * radius * .6)}px) scale(1.1)`, opacity: 1, offset: .4 },
        { transform: `translate(${r1(Math.cos(angle) * radius)}px, ${r1(Math.sin(angle) * radius)}px) scale(0)`, opacity: 0 },
      ], { duration: 700, delay: i * 30, easing: "ease-out", fill: "both" })).finished.then(() => holder.remove(), () => holder.remove());
    }
  }
  function win() {
    completed = true;
    clearTimeout(sparkTimer);
    scene.classList.add("powered", "complete");
    if (document.activeElement?.closest?.(".end")) document.activeElement.blur();
    track(cheerArm.animate([
      { opacity: 0, transform: "translateY(40px)" },
      { opacity: 1, transform: "translateY(-6px)", offset: .6 },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: reduced.matches ? 0 : 520, delay: reduced.matches ? 0 : 350, easing: "ease-out", fill: "forwards" }));
    if (!reduced.matches) {
      for (const [i, at] of [{ x: 186, y: 410 }, { x: 418, y: 420 }, { x: 46, y: 450 }, { x: 556, y: 440 }, { x: 436, y: 360 }].entries()) {
        setTimeout(() => alive && burst(at, 5, 34), 300 + i * 160);
      }
    }
    finishTimer = setTimeout(() => window.completeLevel(), reduced.matches ? 500 : 2000);
  }

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
    background: "#cfdcdc",
    setup: async () => {
      rain.classList.add("active");
      siren.currentTime = 0;
      siren.play().catch(() => {});
      await animateScene(true);
      sparkLoop();
    },
    teardown: () => {
      clearTimeout(sparkTimer);
      clearTimeout(finishTimer);
      release();
      for (const animation of animations) animation.cancel();
      rain.classList.remove("active");
      siren.pause();
      window.removeEventListener("blur", blur);
      return animateScene(false).then(() => { alive = false; });
    },
  });
})();
