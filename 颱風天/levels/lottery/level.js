(() => {
  "use strict";
  const scene = document.querySelector(".scene");
  const stage = document.querySelector(".stage");
  const top = document.querySelector(".top");
  const status = document.querySelector("#status");
  const foil = document.querySelector(".foil");
  const ctx = foil.getContext("2d");
  const flakeLayer = document.querySelector(".flakes");
  const celebrateLayer = document.querySelector(".celebrate");
  const coinDrop = document.querySelector(".coin-drop");
  const coinNode = document.querySelector(".coin");
  const coinArt = document.querySelector(".coin-art");
  const coinShadow = document.querySelector(".coin-shadow");
  const blossom = document.querySelector(".blossom");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  // Scratch window in viewBox units; the canvas is drawn at SCALE pixels per unit.
  const FOIL = { x: 120, y: 335, w: 360, h: 210 };
  const SCALE = foil.width / FOIL.w;
  const BRUSH = 19;
  const CELL = 6;
  const COLS = FOIL.w / CELL;
  const ROWS = Math.ceil(FOIL.h / CELL);
  // Win when most of the foil is gone, including a fair share over each 6.
  const WIN_TOTAL = .6;
  const WIN_THIRD = .45;
  const HOME = { x: 300, y: 762 };
  const MAX_FLAKES = 90;

  const scratched = new Uint8Array(COLS * ROWS);
  const thirdCounts = [0, 0, 0];
  let scratchedCount = 0;
  const coin = { x: HOME.x, y: HOME.y, tilt: 0, targetTilt: 0, lift: 0, vx: 0 };
  let drag = null;
  let auto = 0;
  let homeFrame = 0;
  let completed = false;
  let started = false;
  let frame = 0;
  let last = 0;
  let timer = 0;
  let flakeBudget = 0;
  const flakes = [];
  const animations = new Set();

  function element(tag, attributes, parent) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  function track(animation) {
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    return animation;
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);
  // Seeded so the printed ticket details look the same every visit.
  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Printed ticket details ----------
  function rays(parent, cx, cy, count, length, spread = .5) {
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      const b = a + Math.PI * 2 / count * spread;
      const p = (angle) => `${(cx + Math.cos(angle) * length).toFixed(1)} ${(cy + Math.sin(angle) * length).toFixed(1)}`;
      element("path", { d: `M${cx} ${cy}L${p(a)}L${p(b)}Z` }, parent);
    }
  }
  rays(document.querySelector(".rays"), 300, 380, 22, 1100);
  rays(document.querySelector(".card-rays"), 300, 205, 18, 520);
  rays(document.querySelector(".prize-rays"), 300, 440, 16, 260, .42);

  function barcode(parent, x, y, width, height, seed) {
    const random = seeded(seed);
    let at = x;
    while (at < x + width) {
      const w = random() < .35 ? 2.6 : 1.2;
      if (at + w > x + width) break;
      element("rect", { x: at.toFixed(1), y, width: w, height, fill: "#2b2b2b" }, parent);
      at += w + (random() < .5 ? 1.6 : 2.8);
    }
  }
  barcode(document.querySelector(".top-code"), 392, 105, 106, 16, 7);
  barcode(document.querySelector(".bottom-code"), 224, 661, 152, 20, 21);

  const stack = document.querySelector(".coin-stack");
  for (let i = 0; i < 6; i++) {
    const y = 270 - i * 11;
    const x = 152 + (i % 2 ? 3 : -2);
    element("rect", { x: x - 40, y: y - 1, width: 80, height: 12, fill: "#d9900f" }, stack);
    element("ellipse", { cx: x, cy: y + 11, rx: 40, ry: 11, fill: "#c27a0a" }, stack);
    element("ellipse", { cx: x, cy: y, rx: 40, ry: 11, fill: "url(#gold)", stroke: "#c98612", "stroke-width": 2 }, stack);
    if (i === 5) element("ellipse", { cx: x, cy: y, rx: 27, ry: 7, stroke: "#fff3b8", "stroke-width": 2 }, stack);
  }

  const symbols = document.querySelector(".symbols");
  const symbolArt = [
    g => element("use", { href: "#cash-coin", transform: "scale(1.15)" }, g),
    g => {
      element("path", { d: "M-24 2Q-29 -11 -16 -8Q-10 -19 0 -19Q10 -19 16 -8Q29 -11 24 2Q18 15 0 15Q-18 15 -24 2Z", fill: "url(#gold)", stroke: "#c98612", "stroke-width": 2.5 }, g);
      element("ellipse", { cx: 0, cy: -9, rx: 9, ry: 7, fill: "#ffe27a", stroke: "#c98612", "stroke-width": 2 }, g);
    },
    g => {
      element("rect", { x: -22, y: -12, width: 44, height: 24, rx: 3, fill: "url(#note)", stroke: "#fff", "stroke-width": 2, transform: "rotate(-8)" }, g);
      element("rect", { x: -5, y: -13, width: 10, height: 26, fill: "#f6f1e2", transform: "rotate(-8)" }, g);
    },
    g => element("path", { d: "M0 -19L5.5 -6L19 -5.5L8.5 3.5L12 17L0 9.5L-12 17L-8.5 3.5L-19 -5.5L-5.5 -6Z", fill: "url(#gold)", stroke: "#c98612", "stroke-width": 2 }, g),
  ];
  symbolArt.forEach((draw, i) => {
    const g = element("g", { transform: `translate(${156 + i * 96} 606)` }, symbols);
    element("circle", { r: 31, fill: "#fff4d8", stroke: "#d92b3a", "stroke-width": 3.5 }, g);
    element("circle", { r: 25, stroke: "#ffd25a", "stroke-width": 2, "stroke-dasharray": "2 4" }, g);
    draw(g);
  });

  const confetti = document.querySelector(".confetti");
  const confettiRandom = seeded(3);
  const colors = ["#ff6b6b", "#4db6f0", "#ffb02e", "#7bd389", "#ff8fc7"];
  for (let i = 0; i < 26; i++) {
    const x = -60 + confettiRandom() * 720;
    const y = -40 + confettiRandom() * 900;
    if (x > 50 && x < 550 && y > 50 && y < 720) continue;
    element("rect", {
      x: -6, y: -2.5, width: 12, height: 5, rx: 1.5, fill: colors[i % colors.length],
      transform: `translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${Math.round(confettiRandom() * 180)})`,
    }, confetti);
  }

  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 - Math.PI / 2;
    element("circle", { cx: (Math.cos(a) * 9).toFixed(2), cy: (Math.sin(a) * 9).toFixed(2), r: 6, fill: "#f6dc8c" }, blossom);
  }
  element("circle", { r: 4.2, fill: "#b98d2c" }, blossom);

  // ---------- Silver foil ----------
  function drawFoil() {
    const random = seeded(11);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    const base = ctx.createLinearGradient(0, 0, FOIL.w, FOIL.h);
    base.addColorStop(0, "#b9bec7");
    base.addColorStop(.35, "#e6e9ee");
    base.addColorStop(.55, "#c3c8d0");
    base.addColorStop(.8, "#eef0f4");
    base.addColorStop(1, "#aeb3bd");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, FOIL.w, FOIL.h);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = random() < .5 ? "rgba(255,255,255,.35)" : "rgba(92,98,110,.18)";
      const s = .4 + random() * .9;
      ctx.fillRect(random() * FOIL.w, random() * FOIL.h, s, s);
    }
    // Embossed coins and sparkles, like the printed pattern on real scratch foil.
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 11; col++) {
        const x = 18 + col * 33 + (row % 2) * 16;
        const y = 16 + row * 30;
        for (const [dx, dy, color] of [[.8, .8, "rgba(255,255,255,.65)"], [0, 0, "rgba(108,114,128,.38)"]]) {
          ctx.save();
          ctx.translate(x + dx, y + dy);
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 1.6;
          if ((row + col) % 2) {
            ctx.beginPath();
            ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeRect(-2.5, -2.5, 5, 5);
          } else {
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.quadraticCurveTo(1.2, -1.2, 7, 0);
            ctx.quadraticCurveTo(1.2, 1.2, 0, 7);
            ctx.quadraticCurveTo(-1.2, 1.2, -7, 0);
            ctx.quadraticCurveTo(-1.2, -1.2, 0, -7);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }
    const sheen = ctx.createLinearGradient(0, 0, FOIL.w, FOIL.h * .6);
    sheen.addColorStop(.25, "rgba(255,255,255,0)");
    sheen.addColorStop(.42, "rgba(255,255,255,.45)");
    sheen.addColorStop(.58, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, FOIL.w, FOIL.h);
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 5]);
    ctx.strokeRect(6, 6, FOIL.w - 12, FOIL.h - 12);
    ctx.setLineDash([]);
  }
  drawFoil();

  // ---------- Scratching ----------
  function distanceToSegment(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length ? clamp(((px - a.x) * dx + (py - a.y) * dy) / length, 0, 1) : 0;
    return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
  }
  function touchesFoil(a, b) {
    return Math.max(a.x, b.x) > FOIL.x - BRUSH && Math.min(a.x, b.x) < FOIL.x + FOIL.w + BRUSH
      && Math.max(a.y, b.y) > FOIL.y - BRUSH && Math.min(a.y, b.y) < FOIL.y + FOIL.h + BRUSH;
  }
  function scratch(a, b) {
    if (completed || !touchesFoil(a, b)) return;
    if (!started) {
      started = true;
      status.textContent = "開始刮刮樂。";
    }
    const from = { x: a.x - FOIL.x, y: a.y - FOIL.y };
    const to = { x: b.x - FOIL.x, y: b.y - FOIL.y };
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
    ctx.lineCap = "round";
    ctx.lineWidth = BRUSH * 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + .01, to.y);
    ctx.stroke();
    // Nick the edges so the scratch line looks rough instead of perfectly round.
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const nx = length ? -(to.y - from.y) / length : 0;
    const ny = length ? (to.x - from.x) / length : 1;
    for (let d = 0; d <= length; d += 3) {
      const t = length ? d / length : 0;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      for (const side of [-1, 1]) {
        const offset = BRUSH + rand(-1.5, 2.5);
        ctx.beginPath();
        ctx.arc(x + nx * offset * side, y + ny * offset * side, rand(.8, 2.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const reach = BRUSH;
    const minCol = clamp(Math.floor((Math.min(a.x, b.x) - reach - FOIL.x) / CELL), 0, COLS - 1);
    const maxCol = clamp(Math.floor((Math.max(a.x, b.x) + reach - FOIL.x) / CELL), 0, COLS - 1);
    const minRow = clamp(Math.floor((Math.min(a.y, b.y) - reach - FOIL.y) / CELL), 0, ROWS - 1);
    const maxRow = clamp(Math.floor((Math.max(a.y, b.y) + reach - FOIL.y) / CELL), 0, ROWS - 1);
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * COLS + col;
        if (scratched[index]) continue;
        const cx = FOIL.x + (col + .5) * CELL;
        const cy = FOIL.y + Math.min(FOIL.h, (row + .5) * CELL);
        if (distanceToSegment(cx, cy, a, b) > reach) continue;
        scratched[index] = 1;
        scratchedCount++;
        thirdCounts[Math.floor(col / (COLS / 3))]++;
      }
    }
    scene.dataset.scratched = String(Math.round(scratchedCount / scratched.length * 100));

    if (!reduced.matches) {
      flakeBudget += Math.max(length, 2) / 5;
      while (flakeBudget >= 1) {
        flakeBudget--;
        addFlake(b.x + rand(-BRUSH, BRUSH) * .7, b.y + rand(-BRUSH, BRUSH) * .7, rand(-90, 90) + coin.vx * .08, rand(-160, -40));
      }
    }
    checkWin();
  }

  function addFlake(x, y, vx, vy) {
    if (flakes.length >= MAX_FLAKES) flakes.shift().node.remove();
    const s = rand(.7, 1.6);
    const node = element("polygon", {
      points: `${-2.4 * s},${-1.2 * s} ${2 * s},${-1.8 * s} ${2.4 * s},${1.4 * s} ${-1.6 * s},${1.6 * s}`,
      fill: ["#c9ccd3", "#e8eaee", "#a3a8b2", "#d8dbe1"][Math.floor(Math.random() * 4)],
    }, flakeLayer);
    flakes.push({ node, x, y, vx, vy, angle: rand(0, 360), spin: rand(-500, 500), life: rand(.7, 1.3), age: 0 });
  }
  function drawFlakes(dt) {
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.age += dt;
      f.vy += 900 * dt;
      f.vx *= Math.exp(-dt * 2);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.angle += f.spin * dt;
      if (f.age >= f.life || f.y > 860) {
        f.node.remove();
        flakes.splice(i, 1);
        continue;
      }
      f.node.setAttribute("transform", `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${Math.round(f.angle)})`);
      f.node.setAttribute("opacity", f.age > f.life * .6 ? ((f.life - f.age) / (f.life * .4)).toFixed(2) : 1);
    }
  }

  function checkWin() {
    if (completed) return;
    const third = scratched.length / 3;
    if (scratchedCount / scratched.length < WIN_TOTAL || thirdCounts.some(count => count / third < WIN_THIRD)) return;
    reveal();
  }

  // ---------- Coin ----------
  function drawCoin() {
    coinNode.setAttribute("transform", `translate(${coin.x.toFixed(1)} ${coin.y.toFixed(1)})`);
    coinArt.setAttribute("transform", `rotate(${coin.tilt.toFixed(1)}) scale(${(1 + coin.lift * .06).toFixed(3)})`);
    coinShadow.setAttribute("cx", (4 + coin.lift * 6).toFixed(1));
    coinShadow.setAttribute("cy", (8 + coin.lift * 8).toFixed(1));
  }
  function moveCoin(x, y) {
    const from = { x: coin.x, y: coin.y };
    coin.x = clamp(x, 24, 576);
    coin.y = clamp(y, 24, 796);
    coin.vx = coin.vx * .6 + (coin.x - from.x) * 6;
    scratch(from, coin);
    drawCoin();
  }
  function toSvg(event) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(top.getScreenCTM().inverse());
    return { x: point.x, y: point.y };
  }

  coinNode.addEventListener("pointerdown", event => {
    if (completed || drag || auto) return;
    event.preventDefault();
    const p = toSvg(event);
    drag = { id: event.pointerId, dx: coin.x - p.x, dy: coin.y - p.y };
    coinNode.setPointerCapture(event.pointerId);
    coinNode.classList.add("held");
  });
  coinNode.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    const events = event.getCoalescedEvents?.() ?? [];
    for (const e of events.length ? events : [event]) {
      const p = toSvg(e);
      moveCoin(p.x + drag.dx, p.y + drag.dy);
    }
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    coinNode.classList.remove("held");
  }
  coinNode.addEventListener("pointerup", release);
  coinNode.addEventListener("pointercancel", release);
  coinNode.addEventListener("lostpointercapture", release);

  // Keyboard: arrows scratch step by step; Enter sweeps the whole window.
  coinNode.addEventListener("keydown", event => {
    if (completed || auto) return;
    const steps = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    if (steps[event.key]) {
      event.preventDefault();
      moveCoin(coin.x + steps[event.key][0], coin.y + steps[event.key][1]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      autoScratch();
    }
  });
  function autoScratch() {
    const path = [{ x: coin.x, y: coin.y }];
    for (let y = FOIL.y + 12, i = 0; y <= FOIL.y + FOIL.h; y += 28, i++) {
      path.push({ x: i % 2 ? FOIL.x + FOIL.w - 10 : FOIL.x + 10, y });
      path.push({ x: i % 2 ? FOIL.x + 10 : FOIL.x + FOIL.w - 10, y });
    }
    let leg = 1;
    let previous = performance.now();
    const speed = reduced.matches ? 6000 : 1100;
    const step = now => {
      let budget = (now - previous) / 1000 * speed;
      previous = now;
      while (budget > 0 && leg < path.length && !completed) {
        const target = path[leg];
        const distance = Math.hypot(target.x - coin.x, target.y - coin.y);
        if (distance <= budget) {
          moveCoin(target.x, target.y);
          budget -= distance;
          leg++;
        } else {
          moveCoin(coin.x + (target.x - coin.x) / distance * budget, coin.y + (target.y - coin.y) / distance * budget);
          budget = 0;
        }
      }
      if (leg < path.length && !completed) auto = requestAnimationFrame(step);
      else auto = 0;
    };
    auto = requestAnimationFrame(step);
  }

  // ---------- Reveal ----------
  const winSound = wanwanAudio.sound("./assets/win.mp3");
  let soundTimer = 0;
  function playWinSound() {
    winSound.stop();
    winSound.play().catch(cause => console.warn("Lottery win sound could not play", cause));
  }

  function reveal() {
    completed = true;
    scene.classList.add("complete");
    status.textContent = "中獎了！六六六。";
    if (drag) {
      try { coinNode.releasePointerCapture(drag.id); } catch {}
      drag = null;
    }
    coinNode.classList.remove("held");
    cancelAnimationFrame(auto);
    auto = 0;
    const fast = reduced.matches;
    // Plays as the sixes pop in.
    soundTimer = setTimeout(playWinSound, fast ? 0 : 420);

    if (!fast) {
      for (let i = 0; i < 40; i++) {
        const col = Math.floor(Math.random() * COLS);
        const row = Math.floor(Math.random() * ROWS);
        if (scratched[row * COLS + col]) continue;
        addFlake(FOIL.x + (col + .5) * CELL, FOIL.y + (row + .5) * CELL, rand(-60, 60), rand(-120, 20));
      }
    }
    track(foil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 0 : 650, easing: "ease-in", fill: "forwards" }));

    const from = { x: coin.x, y: coin.y };
    const begin = performance.now();
    const home = now => {
      const t = fast ? 1 : Math.min(1, (now - begin) / 650);
      const e = 1 - (1 - t) ** 3;
      coin.x = from.x + (HOME.x - from.x) * e;
      coin.y = from.y + (HOME.y - from.y) * e;
      if (t < 1) homeFrame = requestAnimationFrame(home);
    };
    homeFrame = requestAnimationFrame(home);

    document.querySelectorAll(".six-art").forEach((six, i) => {
      track(six.animate([
        { transform: "scale(1)" }, { transform: "scale(1.22) rotate(-4deg)", offset: .45 },
        { transform: "scale(.94) rotate(2deg)", offset: .75 }, { transform: "scale(1)" },
      ], { duration: fast ? 0 : 700, delay: fast ? 0 : 420 + i * 140, easing: "ease-out" }));
    });
    track(document.querySelector(".shine").animate([
      { transform: "rotate(20deg) translateX(0)", opacity: .7 }, { transform: "rotate(20deg) translateX(460px)", opacity: .7 },
    ], { duration: fast ? 0 : 800, delay: fast ? 0 : 900, easing: "ease-in-out" }));
    if (!fast) {
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2;
        const x = 300 + Math.cos(a) * rand(170, 220);
        const y = 440 + Math.sin(a) * rand(100, 140);
        const wrap = element("g", { transform: `translate(${x.toFixed(0)} ${y.toFixed(0)})` }, celebrateLayer);
        const star = element("use", { href: "#sparkle", opacity: 0 }, wrap);
        track(star.animate([
          { transform: "scale(0) rotate(0deg)", opacity: 0 }, { transform: "scale(1.5) rotate(45deg)", opacity: 1, offset: .4 },
          { transform: "scale(0) rotate(90deg)", opacity: 0 },
        ], { duration: 900, delay: 500 + i * 60, easing: "ease-out" }));
      }
    }
    timer = setTimeout(() => window.completeLevel(), fast ? 1800 : 2300);
  }

  // ---------- Frame loop ----------
  function tick(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    const held = drag || auto;
    coin.vx *= Math.exp(-dt * 8);
    coin.targetTilt = held ? clamp(-14 + coin.vx * .012, -32, 8) : 0;
    coin.tilt += (coin.targetTilt - coin.tilt) * Math.min(1, dt * 14);
    coin.lift += ((held ? 1 : 0) - coin.lift) * Math.min(1, dt * 12);
    drawCoin();
    drawFlakes(dt);
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (frame) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  drawCoin();
  scene.dataset.scratched = "0";

  async function animateScene(entering) {
    const fast = reduced.matches;
    const list = [stage.animate(entering ? [
      { transform: "translateY(110vh) rotate(-4deg)" }, { transform: "translateY(-12px) rotate(1deg)", offset: .75 }, { transform: "translateY(0)" },
    ] : [{ transform: "translateY(0)" }, { transform: "translateY(110vh)" }], {
      duration: fast ? 0 : entering ? 1000 : 750, easing: "ease-in-out", fill: "both",
    })];
    if (entering) {
      list.push(coinDrop.animate([
        { transform: "translateX(360px)" }, { transform: "translateX(-14px)", offset: .8 }, { transform: "translateX(0)" },
      ], { duration: fast ? 0 : 700, delay: fast ? 0 : 750, easing: "ease-out", fill: "backwards" }));
      list.push(blossom.animate([{ transform: "rotate(560deg)" }, { transform: "rotate(-20deg)", offset: .8 }, { transform: "rotate(0deg)" }], {
        duration: fast ? 0 : 700, delay: fast ? 0 : 750, easing: "ease-out", fill: "backwards",
      }));
    }
    await Promise.all(list.map(animation => animation.finished));
    stage.style.transform = entering ? "" : "translateY(110vh)";
    for (const animation of list) animation.cancel();
  }
  registerLevel({
    background: "#ffe39a",
    setup: () => {
      start();
      return animateScene(true);
    },
    teardown: async () => {
      clearTimeout(timer);
      clearTimeout(soundTimer);
      winSound.stop();
      cancelAnimationFrame(auto);
      cancelAnimationFrame(homeFrame);
      await animateScene(false);
      stop();
      for (const animation of animations) animation.cancel();
    },
  });
})();
