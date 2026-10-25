(() => {
  "use strict";
  const svg = document.querySelector(".courtyard");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const basket = document.querySelector(".basket");
  const inside = document.querySelector(".inside");
  const loose = document.querySelector(".loose");
  const sparkles = document.querySelector(".sparkles");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";
  // The basket's inner space: straight sides, a flat bottom and rounded lower corners. Open on top.
  const ROOM = { left: 162, right: 438, bottom: 470, corners: [{ x: 204, y: 430 }, { x: 396, y: 430 }], radius: 42 };
  const DROP_ZONE = { left: 120, right: 480, top: 250, bottom: 500 };
  const FLOOR = { top: 640, bottom: 800 };
  const GRAVITY = 1500;
  const FRUITS = [
    { type: "orange", r: 24, x: 70, y: 668 },
    { type: "apple", r: 26, x: 182, y: 742 },
    { type: "pear", r: 28, x: 318, y: 672 },
    { type: "dragon", r: 30, x: 458, y: 744 },
    { type: "pomelo", r: 36, x: 538, y: 664 },
    { type: "orange", r: 24, x: 92, y: 782 },
    { type: "persimmon", r: 24, x: 300, y: 782 },
  ];

  let frame = 0;
  let last = 0;
  let calm = 0;
  let timer = 0;
  let drag = null;
  let completed = false;
  const animations = new Set();

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
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
  const r1 = value => Math.round(value * 10) / 10;

  const fruits = FRUITS.map((spec, index) => {
    const node = element("g", { class: "fruit", tabindex: 0, role: "button", "data-type": spec.type, "data-index": index, "aria-label": "把水果放進竹籃" }, loose);
    element("ellipse", { class: "shadow", cy: spec.r - 2, rx: spec.r * .85, ry: 6, fill: "#5a3a20", opacity: .2 }, node);
    const lift = element("g", { class: "lift" }, node);
    const art = element("g", { class: "art" }, lift);
    element("circle", { r: spec.r + 10, fill: "transparent" }, art);
    element("use", { href: `#f-${spec.type}` }, art);
    element("circle", { class: "focus-ring", r: spec.r + 8 }, lift);
    const fruit = { ...spec, node, art, angle: (Math.random() - .5) * 30, vx: 0, vy: 0, inside: false };
    fruit.home = { x: spec.x, y: spec.y };
    draw(fruit);
    return fruit;
  });

  function draw(fruit) {
    fruit.node.setAttribute("transform", `translate(${r1(fruit.x)} ${r1(fruit.y)})`);
    fruit.art.setAttribute("transform", `rotate(${r1(fruit.angle)})`);
  }

  // ---------- Fruit physics inside the basket (same model as the purse coins) ----------
  function physics(dt) {
    const inner = fruits.filter(fruit => fruit.inside);
    for (const f of inner) {
      f.vy += GRAVITY * dt;
      f.vx *= .998;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.angle += f.vx * dt / f.r * 57.3;
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
      for (const f of inner) walls(f);
    }
  }
  function walls(f) {
    if (f.x - f.r < ROOM.left) { f.x = ROOM.left + f.r; f.vx = Math.abs(f.vx) * .4; }
    if (f.x + f.r > ROOM.right) { f.x = ROOM.right - f.r; f.vx = -Math.abs(f.vx) * .4; }
    if (f.y + f.r > ROOM.bottom) {
      f.y = ROOM.bottom - f.r;
      f.vy = -Math.abs(f.vy) * .3;
      f.vx *= .94;
      if (Math.abs(f.vy) < 30) f.vy = 0;
    }
    for (const corner of ROOM.corners) {
      const outside = f.y > corner.y && (corner.x < 300 ? f.x < corner.x : f.x > corner.x);
      if (!outside) continue;
      const dx = f.x - corner.x;
      const dy = f.y - corner.y;
      const distance = Math.hypot(dx, dy);
      const limit = ROOM.radius - f.r;
      if (distance <= limit) continue;
      const nx = dx / distance;
      const ny = dy / distance;
      f.x = corner.x + nx * limit;
      f.y = corner.y + ny * limit;
      const along = f.vx * nx + f.vy * ny;
      if (along > 0) { f.vx -= 1.35 * along * nx; f.vy -= 1.35 * along * ny; }
    }
  }
  function tick(now) {
    const elapsed = Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    const steps = Math.max(1, Math.ceil(elapsed / (1 / 120)));
    for (let i = 0; i < steps; i++) physics(elapsed / steps);
    const inner = fruits.filter(fruit => fruit.inside);
    inner.forEach(draw);
    const moving = inner.some(f => Math.hypot(f.vx, f.vy) > 12);
    calm = moving ? 0 : calm + 1;
    scene.dataset.settled = String(calm > 45);
    if (calm > 45) { frame = 0; last = 0; return; }
    frame = requestAnimationFrame(tick);
  }
  function wake() {
    calm = 0;
    scene.dataset.settled = "false";
    if (reduced.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      for (let i = 0; i < 900; i++) physics(1 / 120);
      fruits.filter(fruit => fruit.inside).forEach(f => { f.vx = 0; f.vy = 0; draw(f); });
      scene.dataset.settled = "true";
      return;
    }
    if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
  }
  function slosh(strength) {
    for (const f of fruits) {
      if (!f.inside) continue;
      const side = Math.random() < .5 ? -1 : 1;
      f.vx += side * (90 + Math.random() * 140) * strength;
      f.vy -= (120 + Math.random() * 160) * strength;
    }
    if (!reduced.matches) {
      track(basket.animate([
        { transform: "rotate(0deg) scale(1)" },
        { transform: "rotate(-2.2deg) scale(1.025, .975)", offset: .25 },
        { transform: "rotate(1.6deg) scale(.985, 1.015)", offset: .55 },
        { transform: "rotate(-.6deg) scale(1)", offset: .8 },
        { transform: "rotate(0deg) scale(1)" },
      ], { duration: 650, easing: "ease-out" }));
    }
    wake();
  }

  function dropIn(fruit, x, y) {
    fruit.inside = true;
    fruit.node.classList.add("inside");
    fruit.node.classList.remove("held");
    fruit.node.setAttribute("tabindex", "-1");
    fruit.node.setAttribute("aria-hidden", "true");
    const focused = document.activeElement === fruit.node;
    inside.append(fruit.node);
    fruit.x = clamp(x, ROOM.left + fruit.r + 20, ROOM.right - fruit.r - 20);
    fruit.y = Math.min(y, 330);
    fruit.vx = (Math.random() - .5) * 120;
    fruit.vy = 260;
    draw(fruit);
    slosh(1);
    const count = fruits.filter(f => f.inside).length;
    scene.dataset.count = String(count);
    status.textContent = `${count} / ${fruits.length} 個水果在竹籃裡。`;
    if (focused) fruits.find(f => !f.inside)?.node.focus({ preventScroll: true });
    if (count === fruits.length) finish();
  }
  function bounceHome(fruit) {
    const from = { x: fruit.x, y: fruit.y };
    Object.assign(fruit, fruit.home);
    draw(fruit);
    if (reduced.matches) return;
    track(fruit.node.animate([
      { transform: `translate(${from.x}px, ${from.y}px)` },
      { transform: `translate(${fruit.x}px, ${fruit.y - 12}px)`, offset: .8 },
      { transform: `translate(${fruit.x}px, ${fruit.y}px)` },
    ], { duration: 420, easing: "ease-out" }));
  }
  function finish() {
    completed = true;
    scene.classList.add("complete");
    status.textContent = "水果都供好了！";
    if (!reduced.matches) {
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI * (i + .5) / 16;
        const d = 110 + Math.random() * 70;
        const star = element("path", { d: "M0 -7L2 -2L7 0L2 2L0 7L-2 2L-7 0L-2 -2Z", fill: i % 3 ? "#ffd84a" : "#fff6c8" }, sparkles);
        track(star.animate([
          { transform: "translate(300px, 380px) scale(.3) rotate(0deg)", opacity: 1 },
          { transform: `translate(${300 + Math.cos(a) * d * 1.4}px, ${380 + Math.sin(a) * d}px) scale(1.2) rotate(180deg)`, opacity: 0 },
        ], { duration: 900 + Math.random() * 400, delay: 250 + Math.random() * 200, easing: "ease-out", fill: "forwards" })).finished.then(() => star.remove(), () => {});
      }
    }
    timer = setTimeout(() => window.completeLevel(), reduced.matches ? 500 : 1600);
  }

  // ---------- Input ----------
  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  fruits.forEach(fruit => {
    fruit.node.addEventListener("pointerdown", event => {
      if (completed || fruit.inside || drag || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      scene.classList.add("pointer");
      const p = point(event);
      fruit.node.getAnimations().forEach(animation => animation.cancel());
      drag = { fruit, id: event.pointerId, dx: fruit.x - p.x, dy: fruit.y - p.y };
      fruit.node.classList.add("held");
      loose.append(fruit.node);
      svg.setPointerCapture(event.pointerId);
    });
    fruit.node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (completed || fruit.inside || drag) return;
      dropIn(fruit, 250 + Math.random() * 100, 300);
    });
  });
  svg.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const p = point(event);
    const { fruit } = drag;
    fruit.x = clamp(p.x + drag.dx, 24, 576);
    fruit.y = clamp(p.y + drag.dy, 24, 796);
    draw(fruit);
  });
  function release(event, cancelled) {
    if (!drag || drag.id !== event.pointerId) return;
    const { fruit } = drag;
    drag = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    fruit.node.classList.remove("held");
    const overBasket = fruit.x > DROP_ZONE.left && fruit.x < DROP_ZONE.right && fruit.y > DROP_ZONE.top && fruit.y < DROP_ZONE.bottom;
    if (cancelled) bounceHome(fruit);
    else if (overBasket) dropIn(fruit, fruit.x, fruit.y);
    else if (fruit.y >= FLOOR.top) {
      fruit.y = Math.min(fruit.y, FLOOR.bottom - fruit.r);
      fruit.home = { x: fruit.x, y: fruit.y };
      draw(fruit);
    } else bounceHome(fruit);
  }
  svg.addEventListener("pointerup", event => release(event, false));
  svg.addEventListener("pointercancel", event => release(event, true));
  svg.addEventListener("lostpointercapture", event => release(event, true));
  document.addEventListener("keydown", () => scene.classList.remove("pointer"));

  scene.dataset.count = "0";

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
    background: "#e4d2b2",
    setup: () => animateScene(true),
    teardown: () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      frame = 0;
      for (const animation of animations) animation.cancel();
      return animateScene(false);
    },
  });
})();
