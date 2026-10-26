(() => {
  "use strict";
  const scene = document.querySelector(".scene");
  const svg = document.querySelector(".street");
  const stick = document.querySelector(".stick");
  const rain = document.querySelector(".rain");
  const rainSound = document.querySelector(".rain-sound");
  const ripples = document.querySelector(".ripples");
  const status = document.querySelector("#status");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const drainSound = wanwanAudio.sound("./assets/drain.mp3");
  const HOME = { x: 161, y: 575 };
  const REQUIRED_TURN = Math.PI * 4;
  let position = { ...HOME };
  let active = false, completed = false, held = false;
  let drag = null, sample = null, direction = null;
  let turning = 0, curvedDistance = 0, lastRipple = 0, lastMotion = 0;
  let frame = 0, drainingAt = null, keyboardPhase = 0;
  const animations = new Set();

  for (let i = 0; i < 70; i++) {
    const drop = document.createElement("i");
    drop.style.left = `${(i * 37.3) % 105}%`;
    drop.style.animationDuration = `${1.1 + (i % 7) * .13}s`;
    drop.style.animationDelay = `${-(i % 19) * .2}s`;
    drop.style.setProperty("--still-y", `${(i * 23.7) % 100}%`);
    rain.append(drop);
  }
  function playRain() {
    if (active && parent === window && rainSound.paused) {
      rainSound.play().catch(cause => console.warn("Drain rain could not play", cause));
    }
  }
  function wet(p) {
    const left = 210 - (p.y - 473) * .62;
    const right = 393 + (p.y - 473) * .6;
    return p.y >= 490 && p.y <= 785 && p.x > left + 12 && p.x < right - 12;
  }
  function render() {
    stick.setAttribute("transform", `translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`);
    stick.classList.toggle("held", held);
    stick.setAttribute("aria-pressed", String(held));
  }
  function resetStroke() {
    sample = null;
    direction = null;
  }
  function ripple(p, now) {
    if (reduced.matches || now - lastRipple < 100) return;
    lastRipple = now;
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    for (const [name, value] of Object.entries({ cx: p.x, cy: p.y, rx: 5, ry: 2, stroke: "#e0eee6", "stroke-width": 2 })) ring.setAttribute(name, String(value));
    ripples.append(ring);
    const animation = ring.animate([
      { rx: "5px", ry: "2px", opacity: .8 },
      { rx: "37px", ry: "13px", opacity: 0 },
    ], { duration: 750, easing: "ease-out" });
    animations.add(animation);
    animation.finished.then(() => {
      animations.delete(animation);
      ring.remove();
    }, () => ring.remove());
  }
  function clearDrain() {
    completed = true;
    held = false;
    scene.classList.remove("stirring");
    scene.classList.add("draining");
    drainSound.play().catch(cause => console.warn("Drain sound could not play", cause));
    stick.setAttribute("aria-disabled", "true");
    status.textContent = "排水口通了，積水正在退去。";
    drainingAt = performance.now();
    render();
  }
  function move(p) {
    position = { x: Math.max(30, Math.min(570, p.x)), y: Math.max(280, Math.min(785, p.y)) };
    render();
    if (!wet(position)) {
      scene.classList.remove("stirring");
      resetStroke();
      return;
    }
    const now = performance.now();
    ripple(position, now);
    if (!sample) { sample = { ...position }; return; }
    const dx = position.x - sample.x, dy = position.y - sample.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 7) return;
    sample = { ...position };
    if (distance > 90) { direction = null; return; }
    const vector = { x: dx / distance, y: dy / distance };
    if (direction) {
      const turn = Math.atan2(direction.x * vector.y - direction.y * vector.x, direction.x * vector.x + direction.y * vector.y);
      const radius = Math.abs(turn) > .03 ? distance / (2 * Math.sin(Math.abs(turn) / 2)) : Infinity;
      // Count real curves, not straight strokes, tiny jitters, or back-and-forth scrubbing.
      if (Math.abs(turn) <= 1.1 && radius >= 18 && radius <= 180) {
        turning += turn;
        curvedDistance += distance;
        lastMotion = now;
        scene.classList.add("stirring");
        scene.style.setProperty("--cleared", String(Math.min(1, Math.abs(turning) / REQUIRED_TURN)));
        if (Math.abs(turning) >= REQUIRED_TURN && curvedDistance >= 480) clearDrain();
      }
    }
    direction = vector;
  }
  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  stick.addEventListener("pointerdown", event => {
    if (!active || completed || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    playRain();
    const p = point(event);
    held = true;
    drag = { id: event.pointerId, offset: { x: position.x - p.x, y: position.y - p.y } };
    resetStroke();
    stick.setPointerCapture(event.pointerId);
    render();
  });
  stick.addEventListener("pointermove", event => {
    if (!active || completed || !drag || drag.id !== event.pointerId) return;
    const p = point(event);
    move({ x: p.x + drag.offset.x, y: p.y + drag.offset.y });
  });
  function release(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const id = drag.id;
    drag = null;
    held = false;
    resetStroke();
    scene.classList.remove("stirring");
    if (stick.hasPointerCapture(id)) stick.releasePointerCapture(id);
    render();
  }
  stick.addEventListener("pointerup", release);
  stick.addEventListener("pointercancel", release);
  stick.addEventListener("lostpointercapture", release);
  stick.addEventListener("keydown", event => {
    if (!active || completed || drag) return;
    if (!["Enter", " ", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    playRain();
    if (event.key === "Escape") {
      held = false; resetStroke(); render(); return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (!held) {
        held = true;
        status.textContent = "拿起木棍了，用方向鍵移到積水裡。";
        render();
      } else if (wet(position)) {
        const center = { x: Math.max(250, Math.min(420, position.x)), y: Math.max(555, Math.min(720, position.y)) };
        resetStroke();
        for (let i = 0; i <= 16 && !completed; i++) {
          const angle = keyboardPhase + i * Math.PI / 12;
          move({ x: center.x + Math.cos(angle) * 40, y: center.y + Math.sin(angle) * 40 });
        }
        keyboardPhase += Math.PI * 4 / 3;
      } else status.textContent = "先把木棍移到積水裡。";
    } else if (held) {
      const step = event.shiftKey ? 45 : 22;
      move({ x: position.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
        y: position.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) });
    }
  });
  function tick(now) {
    if (!active) return;
    if (!completed && now - lastMotion > 500) scene.classList.remove("stirring");
    if (drainingAt !== null && now - drainingAt >= (reduced.matches ? 650 : 2900)) {
      drainingAt = null;
      scene.classList.add("drained");
      status.textContent = "積水退了，巷子暢通了。";
      completeLevel();
    }
    frame = requestAnimationFrame(tick);
  }
  render();
  registerLevel({
    background: "#d3dedb",
    setup: async () => {
      rain.classList.add("active");
      if (!reduced.matches) await svg.animate([
        { transform: "translateY(110vh)" }, { transform: "translateY(0)" },
      ], { duration: 850, easing: "cubic-bezier(.2,.8,.3,1)" }).finished;
      active = true;
      scene.classList.add("playing");
      playRain();
      frame = requestAnimationFrame(tick);
    },
    teardown: async () => {
      active = false;
      cancelAnimationFrame(frame);
      drainingAt = null;
      release();
      rainSound.pause();
      drainSound.stop();
      rain.classList.remove("active");
      scene.classList.remove("playing", "stirring");
      for (const animation of animations) animation.cancel();
      animations.clear();
      ripples.replaceChildren();
      if (!reduced.matches) await svg.animate([
        { transform: "translateY(0)" }, { transform: "translateY(-110vh)" },
      ], { duration: 700, easing: "ease-in" }).finished;
    },
  });
})();
