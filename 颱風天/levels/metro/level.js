(() => {
  "use strict";

  const SVG = "http://www.w3.org/2000/svg";
  const scene = document.querySelector(".scene");
  const arrival = document.querySelector(".map-arrival");
  const map = document.querySelector(".map");
  const holder = document.querySelector(".trains");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const routes = [
    { name: "blue", label: "藍線", color: "#6b9fc9", points: [[55, 355], [130, 355], [205, 280], [425, 280]] },
    { name: "green", label: "綠線", color: "#81ad8d", points: [[60, 105], [165, 210], [165, 435], [270, 540], [420, 540]] },
    { name: "orange", label: "橘線", color: "#e9a264", points: [[55, 510], [115, 450], [300, 450], [360, 390], [360, 145], [420, 85]] },
    { name: "red", label: "紅線", color: "#d98283", points: [[55, 205], [105, 205], [240, 70], [285, 70], [285, 335], [420, 470]] },
    { name: "yellow", label: "黃線", color: "#dfc15d", points: [[60, 70], [100, 70], [100, 280], [310, 490], [420, 490]] },
  ];

  function element(name, attributes, parent) {
    const node = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }

  for (const route of routes) {
    route.segments = [];
    route.length = 0;
    for (let i = 1; i < route.points.length; i++) {
      const [x, y] = route.points[i - 1];
      const dx = route.points[i][0] - x;
      const dy = route.points[i][1] - y;
      const length = Math.hypot(dx, dy);
      route.segments.push({ x, y, dx, dy, length, start: route.length });
      route.length += length;
    }
    const points = route.points.map(point => point.join(",")).join(" ");
    const rails = document.querySelector(".railways");
    element("polyline", { points, stroke: "#fffcf4", "stroke-width": 16, "stroke-linecap": "round", "stroke-linejoin": "round" }, rails);
    element("polyline", { points, stroke: route.color, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round", "data-line": route.name }, rails);
  }

  function position(route, distance) {
    const segment = route.segments.find(part => distance <= part.start + part.length) || route.segments.at(-1);
    const t = Math.max(0, Math.min(1, (distance - segment.start) / segment.length));
    let angle = Math.atan2(segment.dy, segment.dx) * 180 / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return { x: segment.x + t * segment.dx, y: segment.y + t * segment.dy, angle };
  }

  const stations = document.querySelector(".stations");
  for (const route of routes) {
    const count = Math.ceil(route.length / 65);
    for (let i = 0; i <= count; i++) {
      const { x, y } = position(route, route.length * i / count);
      element("circle", { cx: x, cy: y, r: 5, fill: "#fffaf0", stroke: route.color, "stroke-width": 2.5 }, stations);
    }
  }
  // Shared interchange rings at actual route crossings.
  const interchanges = [];
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      for (const a of routes[i].segments) for (const b of routes[j].segments) {
        const cross = a.dx * b.dy - a.dy * b.dx;
        if (!cross) continue;
        const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / cross;
        const u = ((b.x - a.x) * a.dy - (b.y - a.y) * a.dx) / cross;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        const point = { x: a.x + t * a.dx, y: a.y + t * a.dy };
        if (interchanges.some(other => Math.hypot(point.x - other.x, point.y - other.y) < 17)) continue;
        interchanges.push(point);
        element("circle", { cx: point.x, cy: point.y, r: 8, fill: "#fffaf0", stroke: "#83978c", "stroke-width": 2 }, stations);
        element("circle", { cx: point.x, cy: point.y, r: 3, fill: "#c3cec1" }, stations);
      }
    }
  }

  const colors = routes.map(route => route.name);
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  const homes = [[95, 663], [240, 663], [385, 663], [165, 746], [315, 746]];
  const trains = homes.map(([x, y], index) => {
    const node = element("g", { class: "train", "data-train": index + 1, role: "button", tabindex: 0, "aria-describedby": "instructions" }, holder);
    element("rect", { x: -51, y: -29, width: 102, height: 58, rx: 15, fill: "transparent" }, node);
    element("rect", { class: "focus-ring", x: -46, y: -26, width: 92, height: 52, rx: 14, stroke: "#789b95", "stroke-width": 3, "stroke-dasharray": "4 4" }, node);
    const body = element("g", { class: "train-body", "pointer-events": "none" }, node);
    element("use", { href: "#train-art", x: -48, y: -24, width: 96, height: 48 }, body);
    const sound = new Audio(`./assets/${colors[index]}.mp3`);
    sound.preload = "auto";
    sound.loop = true;
    return { node, body, sound, color: colors[index], x, y, angle: 0, route: null, distance: 0, index };
  });
  let drag = null;
  let listening = null;
  let listeningAttempt = 0;
  let completed = false;
  let departureFrame = 0;
  let finishDeparture = null;
  let disposed = false;

  function render(train) {
    train.node.setAttribute("transform", `translate(${train.x} ${train.y}) rotate(${train.angle})`);
    train.node.dataset.railway = train.route?.name || "";
    train.node.setAttribute("aria-label", `列車 ${train.index + 1}${train.route ? `，${train.route.label}` : ""}`);
  }
  trains.forEach(render);

  function setQuiet(quiet) {
    if (parent !== window) parent.setMetroListening(quiet);
  }

  function stopListening() {
    listeningAttempt++;
    if (listening) {
      listening.sound.pause();
      listening.sound.currentTime = 0;
      listening.node.classList.remove("held");
      listening = null;
    }
    setQuiet(false);
  }

  function listen(train) {
    stopListening();
    const attempt = ++listeningAttempt;
    listening = train;
    train.node.classList.add("held");
    setQuiet(true);
    train.sound.play().catch(cause => {
      // A released or superseded hold can abort its pending playback.
      if (attempt !== listeningAttempt) return;
      console.warn("Metro clue could not play", cause);
      if (listening === train) stopListening();
    });
  }

  function nearestRoute(point) {
    let nearest = null;
    for (const route of routes) for (const part of route.segments) {
      const t = Math.max(0, Math.min(1, ((point.x - part.x) * part.dx + (point.y - part.y) * part.dy) / part.length ** 2));
      const distance = Math.hypot(point.x - part.x - t * part.dx, point.y - part.y - t * part.dy);
      if (!nearest || distance < nearest.gap) nearest = { route, distance: part.start + t * part.length, gap: distance };
    }
    return nearest;
  }

  function snap(train, route, distance) {
    // Find a nearby open spot without moving or judging any other train.
    const candidates = [distance];
    for (let d = 20; d < route.length; d += 20) candidates.push(distance - d, distance + d);
    let chosen = null;
    for (const d of candidates) {
      if (d < 0 || d > route.length) continue;
      const point = position(route, d);
      if (trains.some(other => other !== train && other.route && Math.hypot(other.x - point.x, other.y - point.y) < 78)) continue;
      chosen = d;
      break;
    }
    // A crowded crossing must still accept the player's selected line.
    train.distance = chosen ?? Math.max(0, Math.min(route.length, distance));
    train.route = route;
    Object.assign(train, position(route, train.distance));
    render(train);
    // Reparenting a focused SVG node would interrupt keyboard input.
    if (document.activeElement !== train.node) holder.append(train.node);
    train.body.getAnimations().forEach(animation => animation.cancel());
    train.body.animate([{ transform: "scale(1.08)" }, { transform: "scale(.98)", offset: .65 }, { transform: "scale(1)" }],
      { duration: reducedMotion.matches ? 0 : 260, easing: "ease-out" });
    status.textContent = `列車 ${train.index + 1}，${route.label}`;
    checkComplete();
  }

  function checkComplete() {
    if (completed || !trains.every(train => train.route?.name === train.color)) return;
    completed = true;
    stopListening();
    scene.classList.add("complete");
    for (const train of trains) train.node.setAttribute("aria-disabled", "true");
    status.textContent = "列車都到站了";
    depart().then(() => { if (!disposed) completeLevel(); });
  }

  async function depart() {
    if (reducedMotion.matches) {
      const animation = holder.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: "forwards" });
      await animation.finished;
      holder.style.opacity = "0";
      animation.cancel();
      return;
    }
    const starts = trains.map(train => train.distance);
    const start = performance.now();
    await new Promise(resolve => {
      finishDeparture = resolve;
      function tick(now) {
        if (disposed) {
          resolve();
          return;
        }
        const elapsed = Math.max(0, (now - start) / 1000 - .25);
        const travelled = 230 * (elapsed - .3 * (1 - Math.exp(-elapsed / .3)));
        let finished = true;
        trains.forEach((train, index) => {
          const distance = starts[index] + travelled;
          if (distance < train.route.length + 400) finished = false;
          if (distance <= train.route.length) {
            Object.assign(train, position(train.route, distance));
          } else {
            const last = train.route.segments.at(-1);
            const beyond = distance - train.route.length;
            const end = position(train.route, train.route.length);
            train.x = end.x + last.dx / last.length * beyond;
            train.y = end.y + last.dy / last.length * beyond;
            train.angle = end.angle;
          }
          render(train);
        });
        if (finished || disposed) resolve();
        else departureFrame = requestAnimationFrame(tick);
      }
      departureFrame = requestAnimationFrame(tick);
    });
    finishDeparture = null;
  }

  function pointFor(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(map.getScreenCTM().inverse());
  }

  function cancelDrag(event) {
    if (drag && (event?.pointerId === undefined || event.pointerId === drag.id)) {
      const { train, origin, id } = drag;
      drag = null;
      Object.assign(train, origin);
      render(train);
      if (map.hasPointerCapture(id)) map.releasePointerCapture(id);
    }
    if (!drag) stopListening();
  }

  for (const train of trains) {
    train.node.addEventListener("pointerdown", event => {
      if (completed || drag || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      const point = pointFor(event);
      drag = { train, id: event.pointerId, start: point,
        origin: { x: train.x, y: train.y, angle: train.angle, route: train.route, distance: train.distance },
        offsetX: point.x - train.x, offsetY: point.y - train.y, moved: false };
      holder.append(train.node);
      map.setPointerCapture(event.pointerId);
      listen(train);
    });
    train.node.addEventListener("keydown", event => {
      if (completed || drag) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!event.repeat) listen(train);
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
        const index = train.route ? routes.indexOf(train.route) : direction === 1 ? -1 : 0;
        snap(train, routes[(index + direction + routes.length) % routes.length], 100 + train.index * 65);
      }
    });
    train.node.addEventListener("keyup", event => {
      if ((event.key === " " || event.key === "Enter") && listening === train) {
        event.preventDefault();
        stopListening();
      }
    });
    train.node.addEventListener("blur", () => { if (!drag && listening === train) stopListening(); });
  }
  map.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const point = pointFor(event);
    if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 5) drag.moved = true;
    if (!drag.moved) return;
    const train = drag.train;
    train.route = null;
    train.x = Math.max(53, Math.min(427, point.x - drag.offsetX));
    train.y = Math.max(50, Math.min(780, point.y - drag.offsetY));
    train.angle = 0;
    render(train);
  });
  map.addEventListener("pointerup", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const { train, moved } = drag;
    drag = null;
    map.releasePointerCapture(event.pointerId);
    stopListening();
    if (!moved) return;
    const nearest = nearestRoute(train);
    if (nearest.gap <= 38) {
      snap(train, nearest.route, nearest.distance);
    } else {
      train.route = null;
      render(train);
    }
  });
  map.addEventListener("pointercancel", cancelDrag);
  map.addEventListener("lostpointercapture", cancelDrag);
  window.addEventListener("blur", cancelDrag);
  const visibilityChanged = () => { if (document.hidden) cancelDrag(); };
  document.addEventListener("visibilitychange", visibilityChanged);

  async function animateScene(entering) {
    const animation = arrival.animate(entering ? [
      { transform: "translateY(-110vh) rotate(-3deg)" },
      { transform: "translateY(12px) rotate(.8deg)", offset: .7 },
      { transform: "translateY(-4px) rotate(-.2deg)", offset: .88 },
      { transform: "translateY(0) rotate(0)" },
    ] : [
      { transform: "translateY(0) rotate(0)" },
      { transform: "translateY(-15px) rotate(-1deg)", offset: .25 },
      { transform: "translateY(110vh) rotate(3deg)" },
    ], { duration: reducedMotion.matches ? 0 : entering ? 1050 : 750, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
    await animation.finished;
    arrival.style.transform = entering ? "" : "translateY(110vh)";
    animation.cancel();
  }

  registerLevel({
    background: "#dce3df",
    setup: () => animateScene(true),
    teardown: () => {
      disposed = true;
      cancelAnimationFrame(departureFrame);
      finishDeparture?.();
      cancelDrag();
      window.removeEventListener("blur", cancelDrag);
      document.removeEventListener("visibilitychange", visibilityChanged);
      return animateScene(false);
    },
  });
})();
