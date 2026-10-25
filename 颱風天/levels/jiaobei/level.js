(() => {
  "use strict";
  const svg = document.querySelector(".shrine");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const ground = document.querySelector(".ground");
  const shadowLayer = document.querySelector(".shadows");
  const glowLayer = document.querySelector(".glows");
  const dustLayer = document.querySelector(".dust");
  const sparkleLayer = document.querySelector(".sparkles");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";
  const FLOOR_SCALE = .8;
  const HAND_SCALE = .8;
  const SLOTS = [{ x: 272, y: 749, rot: 0 }, { x: 328, y: 749, rot: 180 }];
  const START = [{ x: 236, y: 520, rot: 104 }, { x: 368, y: 548, rot: -68 }];
  const TOSS = { left: 150, right: 450, top: 460, bottom: 630 };

  let frame = 0;
  let last = 0;
  let timer = 0;
  let attempts = 0;
  let completed = false;
  let tossing = false;
  const held = [];

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  const r1 = value => Math.round(value * 10) / 10;
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const nearestTurn = (from, to) => to + 360 * Math.round((from - to) / 360);
  const norm = deg => ((deg % 360) + 360) % 360;

  const pieces = [...document.querySelectorAll(".bei")].map((node, index) => {
    const piece = {
      index, node, ...START[index], z: 0, scale: FLOOR_SCALE, tumble: 1, anim: null, state: "floor",
      shadow: element("ellipse", { fill: "#3b2414" }, shadowLayer),
    };
    node.dataset.index = String(index);
    draw(piece);
    return piece;
  });

  function draw(piece) {
    const lift = 1 + piece.z / 520;
    const s = piece.scale * lift;
    piece.node.setAttribute("transform", `translate(${r1(piece.x)} ${r1(piece.y - piece.z)}) rotate(${r1(piece.rot)}) scale(${r1(s * piece.tumble * 100) / 100} ${r1(s * 100) / 100})`);
    const spread = 1 + piece.z / 160;
    piece.shadow.setAttribute("rx", r1(27 * piece.scale * Math.max(.35, piece.tumble) * spread));
    piece.shadow.setAttribute("ry", r1(56 * piece.scale * spread));
    piece.shadow.setAttribute("transform", `translate(${r1(piece.x + 4)} ${r1(piece.y + 6)}) rotate(${r1(piece.rot)})`);
    piece.shadow.setAttribute("opacity", r1(.26 / (1 + piece.z / 70) * 100) / 100);
  }
  function setStatus(text) { status.textContent = text; }
  function updateFlags() {
    scene.dataset.held = String(held.length);
    scene.classList.toggle("ready-to-toss", held.length === 2 && !tossing && !completed);
  }

  // ---------- Animations ----------
  // Lifts a piece in a small arc to a new resting pose.
  function hop(piece, to, duration, height, done) {
    const from = { x: piece.x, y: piece.y, rot: piece.rot, scale: piece.scale };
    const rot = nearestTurn(from.rot, to.rot);
    piece.node.classList.add("busy");
    piece.anim = { age: 0, duration: reduced.matches ? 0 : duration, step(p) {
      const e = easeOut(p);
      piece.x = from.x + (to.x - from.x) * e;
      piece.y = from.y + (to.y - from.y) * e;
      piece.rot = from.rot + (rot - from.rot) * e;
      piece.scale = from.scale + (to.scale - from.scale) * e;
      piece.z = Math.sin(Math.PI * p) * height;
    }, done() {
      piece.node.classList.remove("busy");
      piece.rot = norm(piece.rot);
      done?.();
    } };
  }

  // Thrown from the hand: one high arc, then a few smaller random bounces,
  // spinning and tumbling until it settles at its final angle.
  function toss(piece, land, finalRot, side) {
    return new Promise(resolve => {
      const from = { x: piece.x, y: piece.y, rot: piece.rot, scale: piece.scale };
      const bounces = 2 + Math.floor(Math.random() * 3);
      const arcs = [{ duration: rand(.62, .78), height: rand(150, 220) }];
      for (let i = 0; i < bounces; i++) {
        const prev = arcs[arcs.length - 1];
        arcs.push({ duration: prev.duration * rand(.42, .58), height: prev.height * rand(.14, .3) });
      }
      const total = arcs.reduce((sum, arc) => sum + arc.duration, 0);
      // Each bounce kicks the block a little, outward so the pair never crosses.
      const kicks = arcs.map((_, i) => i ? { x: side * rand(0, 16) / i, y: rand(-14, 14) / i } : { x: 0, y: 0 });
      const spin = (Math.random() < .5 ? -1 : 1) * rand(540, 1000);
      const endRot = nearestTurn(from.rot + spin, finalRot);
      const flips = Math.round(rand(3, 6));
      let impacts = 0;
      piece.node.classList.add("busy");
      piece.anim = { age: 0, duration: reduced.matches ? 0 : total * 1000, step(p) {
        let t = p * total;
        let i = 0;
        while (i < arcs.length - 1 && t > arcs[i].duration) t -= arcs[i++].duration;
        if (i > impacts) {
          impacts = i;
          puff(piece.x, piece.y, 1 / i);
        }
        const q = Math.min(1, t / arcs[i].duration);
        piece.z = 4 * arcs[i].height * q * (1 - q);
        const reach = easeOut(Math.min(1, p * total / arcs[0].duration));
        let kx = 0;
        let ky = 0;
        for (let k = 1; k <= i; k++) {
          const weight = k < i ? 1 : q;
          kx += kicks[k].x * weight;
          ky += kicks[k].y * weight;
        }
        piece.x = from.x + (land.x - from.x) * reach + kx;
        piece.y = from.y + (land.y - from.y) * reach + ky;
        piece.scale = from.scale + (FLOOR_SCALE - from.scale) * reach;
        const settle = easeOut(p);
        piece.rot = from.rot + (endRot - from.rot) * settle;
        piece.tumble = .25 + .75 * Math.abs(Math.cos(Math.PI * flips * settle));
      }, done() {
        piece.tumble = 1;
        piece.z = 0;
        piece.rot = norm(piece.rot);
        piece.node.classList.remove("busy");
        puff(piece.x, piece.y, .5);
        resolve();
      } };
    });
  }

  function puff(x, y, strength) {
    if (reduced.matches) return;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 2 * i / 6 + rand(-.3, .3);
      const dot = element("circle", { cx: x, cy: y + 8, r: rand(4, 7), fill: "#f3e8d2" }, dustLayer);
      const d = (22 + 18 * strength) * rand(.7, 1.2);
      dot.animate([
        { transform: "translate(0,0) scale(1)", opacity: .7 * strength + .2 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * .5}px) scale(1.8)`, opacity: 0 },
      ], { duration: 520, easing: "ease-out" }).finished.then(() => dot.remove());
    }
  }

  function celebrate() {
    if (reduced.matches) return;
    for (const piece of pieces) {
      const glow = element("ellipse", { cx: piece.x, cy: piece.y, rx: 70, ry: 90, fill: "url(#win-glow)" }, glowLayer);
      glow.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 600, easing: "ease-out", fill: "forwards" });
      glow.style.transformBox = "fill-box";
      glow.style.transformOrigin = "50% 50%";
    }
    const cx = (pieces[0].x + pieces[1].x) / 2;
    const cy = (pieces[0].y + pieces[1].y) / 2;
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * 2 * i / 18 + rand(-.15, .15);
      const d = rand(90, 150);
      const star = element("path", { d: "M0 -7L2 -2L7 0L2 2L0 7L-2 2L-7 0L-2 -2Z", fill: i % 3 ? "#ffd84a" : "#fff6c8", transform: `translate(${r1(cx)} ${r1(cy)})` }, sparkleLayer);
      star.animate([
        { transform: `translate(${cx}px, ${cy}px) scale(.3) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${cx + Math.cos(a) * d}px, ${cy + Math.sin(a) * d}px) scale(1.2) rotate(180deg)`, opacity: 0 },
      ], { duration: rand(900, 1300), delay: rand(0, 200), easing: "ease-out", fill: "forwards" }).finished.then(() => star.remove());
    }
  }

  // ---------- Steps ----------
  function pickUp(piece) {
    if (completed || tossing || piece.state !== "floor" || held.length >= 2) return;
    const slot = SLOTS[held.length];
    held.push(piece);
    piece.state = "held";
    piece.node.classList.add("held");
    piece.node.setAttribute("aria-label", "筊杯已經拿在手上");
    piece.node.parentNode.append(piece.node);
    hop(piece, { ...slot, scale: HAND_SCALE }, 520, 70, updateFlags);
    updateFlags();
    setStatus(held.length === 2 ? "兩個筊杯都拿好了，點地面擲筊。" : "再撿起另一個筊杯。");
  }

  // The first toss never passes; after that each block lands either way.
  function rollFaces() {
    if (attempts === 1) {
      const misses = [[true, false], [false, true], [false, false]];
      return misses[Math.min(2, Math.floor(Math.random() * 3))];
    }
    return [Math.random() < .5, Math.random() < .5];
  }

  async function throwAt(x, y) {
    if (completed || tossing || held.length !== 2 || held.some(piece => piece.anim)) return;
    tossing = true;
    attempts++;
    scene.dataset.attempts = String(attempts);
    scene.dataset.result = "";
    const cx = clamp(x, TOSS.left, TOSS.right);
    const cy = clamp(y, TOSS.top, TOSS.bottom);
    const gap = rand(52, 72);
    const [aIn, bIn] = rollFaces();
    // The left block faces inward when its flat side points right (0°), the right one at 180°.
    const lands = [
      { x: cx - gap + rand(-10, 10), y: cy + rand(-24, 24), rot: (aIn ? 0 : 180) + rand(-18, 18) },
      { x: cx + gap + rand(-10, 10), y: cy + rand(-24, 24), rot: (bIn ? 180 : 0) + rand(-18, 18) },
    ];
    const thrown = held.splice(0);
    updateFlags();
    setStatus("擲筊……");
    await Promise.all(thrown.map((piece, i) => toss(piece, lands[i], lands[i].rot, i ? 1 : -1)));
    tossing = false;
    for (const piece of thrown) {
      piece.state = "floor";
      piece.node.classList.remove("held");
    }
    if (aIn && bIn) {
      completed = true;
      scene.dataset.result = "win";
      scene.classList.add("complete");
      setStatus("兩個筊杯都朝內，成功了！");
      celebrate();
      timer = setTimeout(() => window.completeLevel(), reduced.matches ? 800 : 2000);
    } else {
      scene.dataset.result = "fail";
      thrown.forEach((piece, i) => piece.node.setAttribute("aria-label", `撿起${i ? "右" : "左"}邊的筊杯`));
      setStatus("沒有朝內，撿起筊杯再擲一次。");
    }
    updateFlags();
  }

  // ---------- Input ----------
  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  for (const piece of pieces) {
    piece.node.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      scene.classList.add("pointer");
      pickUp(piece);
    });
    piece.node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      pickUp(piece);
      if (piece.state === "held") (pieces.find(other => other.state === "floor")?.node || ground).focus();
    });
  }
  ground.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    scene.classList.add("pointer");
    const p = point(event);
    throwAt(p.x, p.y);
  });
  ground.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    throwAt(300, 548).then(() => {
      if (scene.dataset.result === "fail") pieces[0].node.focus();
    });
  });
  document.addEventListener("keydown", () => scene.classList.remove("pointer"));

  // ---------- Frame loop ----------
  function tick(now) {
    const dt = last ? Math.min(50, now - last) : 0;
    last = now;
    for (const piece of pieces) {
      const anim = piece.anim;
      if (anim) {
        anim.age += dt;
        const p = anim.duration ? Math.min(1, anim.age / anim.duration) : 1;
        anim.step(p);
        if (p >= 1) {
          piece.anim = null;
          anim.done();
        }
      }
      draw(piece);
    }
    frame = requestAnimationFrame(tick);
  }

  scene.dataset.held = "0";
  scene.dataset.attempts = "0";
  scene.dataset.result = "";

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
