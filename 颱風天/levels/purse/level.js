(() => {
  "use strict";
  const svg = document.querySelector(".table");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const body = document.querySelector(".purse-body");
  const inside = document.querySelector(".inside");
  const loose = document.querySelector(".coins");
  const zipper = document.querySelector(".zipper");
  const mouth = document.querySelector(".mouth");
  const lipTop = document.querySelector(".lip-top");
  const lipBottom = document.querySelector(".lip-bottom");
  const teeth = document.querySelector(".teeth");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const ZIP = { start: 130, end: 470, y: 431 };
  // Interior used by the coin physics: walls, floor, and rounded bottom corners.
  const ROOM = { left: 106, right: 494, top: 446, bottom: 652, corners: [{ x: 166, y: 598 }, { x: 434, y: 598 }], radius: 56 };
  const DROP_ZONE = { left: 92, right: 508, top: 360, bottom: 670 };
  const GRAVITY = 1500;
  const COIN_TYPES = {
    50: { r: 27, face: "#e7bf55", rim: "#b98d2c", ring: "#f6dc8c" },
    10: { r: 24, face: "#d4d6d0", rim: "#959a94", ring: "#eef0ea" },
    5: { r: 21, face: "#dcddd6", rim: "#9a9e97", ring: "#f3f4ee" },
    1: { r: 18, face: "#d39a5c", rim: "#9b6a39", ring: "#ecc08c" },
  };
  const coins = [
    { value: 50, x: 104, y: 196 },
    { value: 10, x: 262, y: 150 },
    { value: 1, x: 404, y: 232 },
    { value: 5, x: 506, y: 160 },
    { value: 10, x: 142, y: 738 },
    { value: 1, x: 468, y: 748 },
  ].map((coin, index) => ({ ...coin, ...COIN_TYPES[coin.value], index, home: { x: coin.x, y: coin.y }, angle: index * 47, vx: 0, vy: 0, inside: false }));
  let zip = 0;
  let drag = null;
  let completed = false;
  let frame = 0;
  let last = 0;
  let calm = 0;
  let timer = 0;
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

  coins.forEach(coin => {
    coin.node = element("g", { class: "coin", "data-coin": coin.index, tabindex: 0, role: "button", "aria-label": `${coin.value} 元硬幣`, "aria-describedby": "instructions" }, loose);
    element("circle", { class: "focus-ring", r: coin.r + 7 }, coin.node);
    element("circle", { r: coin.r + 10, fill: "transparent" }, coin.node);
    coin.art = element("g", { "pointer-events": "none" }, coin.node);
    element("circle", { r: coin.r, fill: coin.face, stroke: coin.rim, "stroke-width": 2.5 }, coin.art);
    element("circle", { r: coin.r - 5, stroke: coin.ring, "stroke-width": 2 }, coin.art);
    // A tiny plum blossom, the motif on Taiwanese coins, so rolling is visible.
    const petal = coin.r * .17;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 - Math.PI / 2;
      element("circle", { cx: Math.cos(a) * petal * 1.5, cy: Math.sin(a) * petal * 1.5, r: petal, fill: coin.ring }, coin.art);
    }
    element("circle", { r: petal * .7, fill: coin.rim }, coin.art);
    element("path", { d: `M${-coin.r * .55} ${-coin.r * .45}Q${-coin.r * .2} ${-coin.r * .8} ${coin.r * .25} ${-coin.r * .7}`, stroke: "#fff", "stroke-width": 2, "stroke-linecap": "round", opacity: .55 }, coin.art);
  });

  function drawCoin(coin) {
    coin.node.setAttribute("transform", `translate(${+coin.x.toFixed(2)} ${+coin.y.toFixed(2)})`);
    coin.art.setAttribute("transform", `rotate(${+coin.angle.toFixed(1)})`);
  }
  function drawZipper() {
    const pull = ZIP.start + (ZIP.end - ZIP.start) * zip;
    const w = pull - ZIP.start;
    const h = Math.min(30, w * .2);
    const a = ZIP.start + w * .2;
    const b = pull - w * .2;
    const upper = `M${ZIP.start} ${ZIP.y}C${a} ${ZIP.y - h} ${b} ${ZIP.y - h} ${pull} ${ZIP.y}`;
    const lower = `M${ZIP.start} ${ZIP.y}C${a} ${ZIP.y + h * .8} ${b} ${ZIP.y + h * .8} ${pull} ${ZIP.y}`;
    mouth.setAttribute("d", w > 1 ? `${upper}C${b} ${ZIP.y + h * .8} ${a} ${ZIP.y + h * .8} ${ZIP.start} ${ZIP.y}Z` : "");
    lipTop.setAttribute("d", w > 1 ? upper : "");
    lipBottom.setAttribute("d", w > 1 ? lower : "");
    teeth.setAttribute("d", pull < ZIP.end - 1 ? `M${pull} ${ZIP.y}H${ZIP.end}` : "");
    zipper.setAttribute("transform", `translate(${+pull.toFixed(2)} ${ZIP.y})`);
    zipper.setAttribute("aria-valuenow", String(Math.round(zip * 100)));
    zipper.setAttribute("aria-valuetext", zip >= 1 ? "打開" : zip <= 0 ? "關上" : "拉開一半");
    scene.dataset.zip = zip >= 1 ? "open" : zip <= 0 ? "closed" : "partial";
  }

  // ---------- Coin physics inside the purse ----------
  function physics(dt) {
    const inner = coins.filter(coin => coin.inside);
    for (const c of inner) {
      c.vy += GRAVITY * dt;
      c.vx *= .998;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.angle += c.vx * dt / c.r * 57.3;
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < inner.length; i++) {
        for (let j = i + 1; j < inner.length; j++) {
          const p = inner[i];
          const q = inner[j];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const distance = Math.hypot(dx, dy) || .01;
          const overlap = p.r + q.r - distance;
          if (overlap <= 0) continue;
          const nx = dx / distance;
          const ny = dy / distance;
          const mp = p.r * p.r;
          const mq = q.r * q.r;
          const total = mp + mq;
          p.x -= nx * overlap * mq / total;
          p.y -= ny * overlap * mq / total;
          q.x += nx * overlap * mp / total;
          q.y += ny * overlap * mp / total;
          const closing = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
          if (closing < 0) {
            const impulse = -(1.3 * closing) / (1 / mp + 1 / mq);
            p.vx -= impulse * nx / mp;
            p.vy -= impulse * ny / mp;
            q.vx += impulse * nx / mq;
            q.vy += impulse * ny / mq;
          }
        }
      }
      for (const c of inner) walls(c);
    }
  }
  function walls(c) {
    if (c.x - c.r < ROOM.left) { c.x = ROOM.left + c.r; c.vx = Math.abs(c.vx) * .4; }
    if (c.x + c.r > ROOM.right) { c.x = ROOM.right - c.r; c.vx = -Math.abs(c.vx) * .4; }
    if (c.y - c.r < ROOM.top) { c.y = ROOM.top + c.r; c.vy = Math.abs(c.vy) * .3; }
    if (c.y + c.r > ROOM.bottom) {
      c.y = ROOM.bottom - c.r;
      c.vy = -Math.abs(c.vy) * .3;
      c.vx *= .94;
      if (Math.abs(c.vy) < 30) c.vy = 0;
    }
    for (const corner of ROOM.corners) {
      const outside = c.y > corner.y && (corner.x < 300 ? c.x < corner.x : c.x > corner.x);
      if (!outside) continue;
      const dx = c.x - corner.x;
      const dy = c.y - corner.y;
      const distance = Math.hypot(dx, dy);
      const limit = ROOM.radius - c.r;
      if (distance <= limit) continue;
      const nx = dx / distance;
      const ny = dy / distance;
      c.x = corner.x + nx * limit;
      c.y = corner.y + ny * limit;
      const along = c.vx * nx + c.vy * ny;
      if (along > 0) { c.vx -= 1.35 * along * nx; c.vy -= 1.35 * along * ny; }
    }
  }
  function tick(now) {
    const elapsed = Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    const steps = Math.max(1, Math.ceil(elapsed / (1 / 120)));
    for (let i = 0; i < steps; i++) physics(elapsed / steps);
    const inner = coins.filter(coin => coin.inside);
    inner.forEach(drawCoin);
    const moving = inner.some(c => Math.hypot(c.vx, c.vy) > 12);
    calm = moving ? 0 : calm + 1;
    if (calm > 45) { frame = 0; last = 0; return; }
    frame = requestAnimationFrame(tick);
  }
  function wake() {
    calm = 0;
    if (reduced.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      for (let i = 0; i < 900; i++) physics(1 / 120);
      coins.filter(coin => coin.inside).forEach(c => { c.vx = 0; c.vy = 0; drawCoin(c); });
      return;
    }
    if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
  }
  function slosh(strength) {
    for (const c of coins) {
      if (!c.inside) continue;
      const side = Math.random() < .5 ? -1 : 1;
      c.vx += side * (90 + Math.random() * 140) * strength;
      c.vy -= (120 + Math.random() * 160) * strength;
    }
    if (!reduced.matches) {
      track(body.animate([
        { transform: "rotate(0deg) scale(1)" },
        { transform: "rotate(-2.2deg) scale(1.025, .975)", offset: .25 },
        { transform: "rotate(1.6deg) scale(.985, 1.015)", offset: .55 },
        { transform: "rotate(-.6deg) scale(1)", offset: .8 },
        { transform: "rotate(0deg) scale(1)" },
      ], { duration: 650, easing: "ease-out" }));
    }
    wake();
  }

  function dropIn(coin, x) {
    coin.inside = true;
    coin.node.classList.add("inside");
    coin.node.classList.remove("held");
    coin.node.setAttribute("tabindex", "-1");
    coin.node.setAttribute("aria-hidden", "true");
    const focused = document.activeElement === coin.node;
    inside.append(coin.node);
    coin.x = clamp(x, ROOM.left + coin.r + 30, ROOM.right - coin.r - 30);
    coin.y = ROOM.top + coin.r;
    coin.vx = (Math.random() - .5) * 120;
    coin.vy = 380;
    drawCoin(coin);
    slosh(1);
    const count = coins.filter(c => c.inside).length;
    status.textContent = `${count} / ${coins.length} 個硬幣在零錢包裡。`;
    if (focused) (coins.find(c => !c.inside)?.node ?? zipper).focus({ preventScroll: true });
  }
  function bounceHome(coin) {
    const from = { x: coin.x, y: coin.y };
    Object.assign(coin, coin.home);
    drawCoin(coin);
    if (reduced.matches) return;
    track(coin.node.animate([
      { transform: `translate(${from.x}px, ${from.y}px)` },
      { transform: `translate(${coin.x}px, ${coin.y - 10}px)`, offset: .8 },
      { transform: `translate(${coin.x}px, ${coin.y}px)` },
    ], { duration: 420, easing: "ease-out" }));
  }

  // ---------- Zipper ----------
  function setZip(value, announce = true) {
    zip = clamp(value, 0, 1);
    drawZipper();
    if (announce && (zip === 0 || zip === 1)) checkWin();
  }
  async function settleZip() {
    const target = zip >= .5 ? 1 : 0;
    const from = zip;
    if (!reduced.matches && Math.abs(target - from) > .001) {
      await new Promise(resolve => {
        const begin = performance.now();
        const step = now => {
          const t = Math.min(1, (now - begin) / 220);
          setZip(from + (target - from) * (1 - (1 - t) ** 3), false);
          if (t < 1) zipFrame = requestAnimationFrame(step);
          else resolve();
        };
        zipFrame = requestAnimationFrame(step);
      });
    }
    setZip(target);
    status.textContent = target ? "零錢包打開了。" : "零錢包關上了。";
    if (target === 0 && !completed) checkWin();
  }
  let zipFrame = 0;
  function checkWin() {
    if (completed || zip !== 0 || !coins.every(c => c.inside)) return;
    completed = true;
    scene.classList.add("complete");
    zipper.setAttribute("aria-disabled", "true");
    status.textContent = "所有硬幣都收好了！";
    slosh(.6);
    timer = setTimeout(() => window.completeLevel(), reduced.matches ? 500 : 1300);
  }

  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  zipper.addEventListener("pointerdown", event => {
    if (completed || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    cancelAnimationFrame(zipFrame);
    const p = point(event);
    drag = { type: "zip", id: event.pointerId, offset: ZIP.start + (ZIP.end - ZIP.start) * zip - p.x };
    zipper.classList.add("held");
    svg.setPointerCapture(event.pointerId);
  });
  coins.forEach(coin => {
    coin.node.addEventListener("pointerdown", event => {
      if (completed || coin.inside || drag || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      const p = point(event);
      coin.node.getAnimations().forEach(animation => animation.cancel());
      drag = { type: "coin", coin, id: event.pointerId, dx: coin.x - p.x, dy: coin.y - p.y };
      coin.node.classList.add("held");
      loose.append(coin.node);
      svg.setPointerCapture(event.pointerId);
    });
    coin.node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (completed || coin.inside || drag) return;
      if (zip >= 1) dropIn(coin, 300);
      else {
        status.textContent = "先打開零錢包。";
        if (!reduced.matches) track(coin.art.animate([{ transform: `rotate(${coin.angle}deg) translateX(0)` }, { transform: `rotate(${coin.angle}deg) translateX(-6px)` }, { transform: `rotate(${coin.angle}deg) translateX(6px)` }, { transform: `rotate(${coin.angle}deg) translateX(0)` }], { duration: 300 }));
      }
    });
  });
  svg.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const p = point(event);
    if (drag.type === "zip") {
      setZip((p.x + drag.offset - ZIP.start) / (ZIP.end - ZIP.start), false);
    } else {
      const { coin } = drag;
      coin.x = clamp(p.x + drag.dx, 24, 576);
      coin.y = clamp(p.y + drag.dy, 24, 796);
      drawCoin(coin);
    }
  });
  function finish(event, cancelled) {
    if (!drag || drag.id !== event.pointerId) return;
    const current = drag;
    drag = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (current.type === "zip") {
      zipper.classList.remove("held");
      settleZip();
      return;
    }
    const { coin } = current;
    coin.node.classList.remove("held");
    const overPurse = coin.x > DROP_ZONE.left && coin.x < DROP_ZONE.right && coin.y > DROP_ZONE.top && coin.y < DROP_ZONE.bottom;
    if (cancelled) bounceHome(coin);
    else if (overPurse && zip >= 1) dropIn(coin, coin.x);
    else if (overPurse) { status.textContent = "先打開零錢包。"; bounceHome(coin); }
    else coin.home = { x: coin.x, y: coin.y };
  }
  svg.addEventListener("pointerup", event => finish(event, false));
  svg.addEventListener("pointercancel", event => finish(event, true));
  svg.addEventListener("lostpointercapture", event => finish(event, true));
  zipper.addEventListener("keydown", event => {
    if (completed || drag) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setZip(zip + (event.key === "ArrowRight" ? .25 : -.25));
      if (zip === 1 || zip === 0) status.textContent = zip ? "零錢包打開了。" : "零錢包關上了。";
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      zip = zip >= .5 ? .49 : .51;
      settleZip();
    }
  });

  coins.forEach(drawCoin);
  drawZipper();

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
    background: "#e6d1b0",
    setup: () => animateScene(true),
    teardown: () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(zipFrame);
      frame = 0;
      for (const animation of animations) animation.cancel();
      return animateScene(false);
    },
  });
})();
