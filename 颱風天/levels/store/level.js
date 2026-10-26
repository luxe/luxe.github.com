(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const scene = document.querySelector(".scene");
  const svg = document.querySelector(".store");
  const sign = document.querySelector(".sign");
  const hit = sign.querySelector(".hit");
  const arrival = document.querySelector(".sign-arrival");
  const sparkleLayer = document.querySelector(".sparkles");
  const status = document.querySelector("#status");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const chime = wanwanAudio.sound("./assets/chime.mp3");
  const PIVOT = { x: 115, y: 420 };
  const SNAP = 6;
  const START_ANGLE = -14;

  let angle = START_ANGLE;
  let drag = null;
  let settling = false;
  let completed = false;
  let frame = 0;
  const timers = new Set();
  const animations = new Set();

  function element(tag, attributes, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  }
  function track(animation) {
    animations.add(animation);
    animation.finished.finally(() => animations.delete(animation)).catch(() => {});
    return animation;
  }

  // ---------- Stocked shelves (seeded so the store looks the same every time) ----------
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const GOODS = ["#e58f7b", "#f2c35e", "#7fb88a", "#79a7d3", "#f4e6c4", "#c58fb8", "#ef9f5a", "#9ccfd0"];
  const shelfLayer = document.querySelector(".shelf-goods");
  for (const [left, right] of [[46, 184], [416, 554]]) {
    for (const base of [398, 478, 558, 634]) {
      element("rect", { x: left - 4, y: base, width: right - left + 8, height: 5, fill: "#a99a80" }, shelfLayer);
      for (let x = left + 2; x < right - 12;) {
        const width = 11 + Math.round(random() * 13);
        const height = 24 + Math.round(random() * 34);
        if (x + width > right) break;
        element("rect", { x, y: base - height, width, height, rx: 2.5, fill: GOODS[Math.floor(random() * GOODS.length)] }, shelfLayer);
        x += width + 3;
      }
    }
  }
  const fridgeLayer = document.querySelector(".fridge-goods");
  for (const door of [228, 277, 326]) {
    for (const base of [346, 396, 446, 494]) {
      element("rect", { x: door + 2, y: base, width: 42, height: 3, fill: "#b9c6c6" }, fridgeLayer);
      for (let i = 0; i < 5; i++) {
        const color = GOODS[Math.floor(random() * GOODS.length)];
        element("rect", { x: door + 4 + i * 8, y: base - 26, width: 6, height: 26, rx: 2, fill: color }, fridgeLayer);
        element("rect", { x: door + 5.5 + i * 8, y: base - 31, width: 3, height: 6, rx: 1, fill: "#f6f6f2" }, fridgeLayer);
      }
    }
  }

  // ---------- Sign ----------
  function setAngle(value) {
    angle = value;
    sign.setAttribute("transform", `rotate(${value.toFixed(2)} ${PIVOT.x} ${PIVOT.y})`);
    sign.setAttribute("aria-valuenow", String(Math.round(value)));
    sign.setAttribute("aria-valuetext", Math.abs(value) < .05
      ? "擺正了"
      : `向${value < 0 ? "左" : "右"}傾斜 ${Math.abs(Math.round(value))} 度`);
  }

  function burst(at, count, radius) {
    if (reduced.matches) return;
    for (let i = 0; i < count; i++) {
      const turn = Math.PI * 2 * i / count + random() * .4;
      const holder = element("g", { transform: `translate(${at.x} ${at.y})` }, sparkleLayer);
      const star = element("path", { d: "M0 -9L2.4 -2.4L9 0L2.4 2.4L0 9L-2.4 2.4L-9 0L-2.4 -2.4Z", fill: i % 2 ? "#fff4b8" : "#ffffff" }, holder);
      track(star.animate([
        { transform: "translate(0, 0) scale(.2)", opacity: 0 },
        { transform: `translate(${Math.cos(turn) * radius * .6}px, ${Math.sin(turn) * radius * .6}px) scale(1.1)`, opacity: 1, offset: .4 },
        { transform: `translate(${Math.cos(turn) * radius}px, ${Math.sin(turn) * radius}px) scale(0)`, opacity: 0 },
      ], { duration: 700, delay: i * 30, easing: "ease-out", fill: "both" })).finished.then(() => holder.remove(), () => holder.remove());
    }
  }

  function finishLevel() {
    completed = true;
    settling = false;
    scene.classList.add("complete");
    sign.setAttribute("aria-disabled", "true");
    status.textContent = "歡迎光臨！";
    burst(PIVOT, 8, 70);
    // Doors slide open with the store chime once the sign is straight.
    later(() => {
      scene.classList.add("open");
      chime.currentTime = 0;
      chime.play().catch(() => {});
      burst({ x: 300, y: 470 }, 10, 90);
    }, reduced.matches ? 0 : 300);
    later(() => window.completeLevel(), reduced.matches ? 900 : 2600);
  }

  function checkPosition() {
    if (completed || settling || Math.abs(angle) > SNAP) return;
    settling = true;
    if (reduced.matches) {
      setAngle(0);
      finishLevel();
      return;
    }
    const startAngle = angle;
    const startTime = performance.now();
    const settle = now => {
      const progress = Math.min((now - startTime) / 650, 1);
      // A damped spring lands precisely at zero without a visible final jump.
      setAngle(progress === 1 ? 0 : startAngle * Math.exp(-7 * progress) * Math.cos(9 * progress));
      if (progress < 1) frame = requestAnimationFrame(settle);
      else finishLevel();
    };
    frame = requestAnimationFrame(settle);
  }

  function pivotOnScreen() {
    const box = hit.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  sign.addEventListener("pointerdown", event => {
    if (completed || settling || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    arrival.getAnimations().forEach(animation => animation.finish());
    const { x, y } = pivotOnScreen();
    drag = { id: event.pointerId, x, y, last: Math.atan2(event.clientY - y, event.clientX - x) };
    sign.setPointerCapture(event.pointerId);
    sign.classList.add("dragging");
  });
  sign.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    // Near the pivot the angle is unstable, so ignore tiny radii.
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 12) return;
    const next = Math.atan2(event.clientY - drag.y, event.clientX - drag.x);
    const delta = Math.atan2(Math.sin(next - drag.last), Math.cos(next - drag.last));
    setAngle(Math.max(-45, Math.min(45, angle + delta * 180 / Math.PI)));
    drag.last = next;
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    sign.classList.remove("dragging");
    if (sign.hasPointerCapture(event.pointerId)) sign.releasePointerCapture(event.pointerId);
    if (event.type !== "pointercancel") checkPosition();
  }
  sign.addEventListener("pointerup", release);
  sign.addEventListener("pointercancel", release);
  sign.addEventListener("lostpointercapture", event => {
    if (drag && event.pointerId === drag.id) {
      drag = null;
      sign.classList.remove("dragging");
    }
  });
  sign.addEventListener("keydown", event => {
    if (completed || settling || drag) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      arrival.getAnimations().forEach(animation => animation.finish());
      setAngle(Math.max(-45, Math.min(45, angle + (event.key === "ArrowLeft" ? -2 : 2))));
    }
  });
  sign.addEventListener("keyup", event => {
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && !drag) checkPosition();
  });

  setAngle(START_ANGLE);

  // ---------- Lifecycle ----------
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
  function dropSign() {
    if (reduced.matches) return;
    // The sign swings in from above with a little bounce, landing crooked.
    track(arrival.animate([
      { transform: "translateY(-560px)", opacity: 0 },
      { transform: "translateY(16px)", opacity: 1, offset: .62 },
      { transform: "translateY(-6px)", offset: .82 },
      { transform: "translateY(0)" },
    ], { duration: 900, easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards" }));
  }
  registerLevel({
    background: "#dbe7e6",
    setup: async () => {
      if (!reduced.matches) arrival.style.opacity = "0";
      await animateScene(true);
      arrival.style.opacity = "";
      dropSign();
    },
    teardown: () => {
      cancelAnimationFrame(frame);
      for (const id of timers) clearTimeout(id);
      timers.clear();
      for (const animation of animations) animation.cancel();
      return animateScene(false);
    },
  });
})();
