(() => {
  "use strict";
  const SVG = "http://www.w3.org/2000/svg";
  const scene = document.querySelector(".scene");
  const arrival = document.querySelector(".road-arrival");
  const road = document.querySelector(".road");
  const holder = document.querySelector(".cones");
  const rain = document.querySelector(".rain");
  const status = document.querySelector("#status");
  const spots = [...document.querySelectorAll(".spot")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const truck = new Audio("./assets/truck.mp3");
  truck.preload = "auto";
  truck.loop = true;
  const stacks = [[4, 1], [3], [2]];
  const centers = [110, 300, 490];
  let drag = null;
  let selected = null;
  let destination = 0;
  let completed = false;
  let active = false;
  let completionTimer = 0;
  const cones = new Map();

  for (let i = 0; i < 70; i++) {
    const drop = document.createElement("i");
    drop.style.left = `${Math.random() * 105}%`;
    drop.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    drop.style.animationDelay = `${-Math.random() * 4}s`;
    drop.style.setProperty("--still-y", `${Math.random() * 100}%`);
    rain.append(drop);
  }

  function element(tag, attributes, parent) {
    const node = document.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }

  function playTruck() {
    if (!active || completed || !truck.paused) return;
    truck.play().catch(cause => console.warn("Truck ambience could not play", cause));
  }

  function top(size) {
    return stacks.some(stack => stack.at(-1) === size);
  }

  function render() {
    const focusedCone = document.activeElement;
    stacks.forEach((stack, spot) => stack.forEach((size, height) => {
      const cone = cones.get(size);
      cone.spot = spot;
      cone.x = centers[spot];
      cone.y = 640 - height * 69;
      cone.node.dataset.spot = String(spot);
      cone.node.dataset.top = String(top(size));
      cone.node.setAttribute("aria-label", `交通錐 ${size}，${spot + 1} 號位置${top(size) ? "，可移動" : ""}`);
      cone.node.setAttribute("aria-disabled", String(completed || !top(size)));
      cone.node.setAttribute("transform", `translate(${cone.x} ${cone.y})`);
      cone.node.classList.toggle("held", selected === size);
      holder.append(cone.node);
    }));
    if (holder.contains(focusedCone) && document.activeElement !== focusedCone) {
      focusedCone.focus({ preventScroll: true });
    }
    spots.forEach((spot, index) => spot.classList.toggle("chosen", selected !== null && index === destination));
  }

  function clearSelection() {
    selected = null;
    for (const cone of cones.values()) cone.node.classList.remove("held");
    for (const spot of spots) spot.classList.remove("chosen");
  }

  function finish() {
    if (completed) return;
    completed = true;
    truck.pause();
    truck.currentTime = 0;
    clearSelection();
    scene.classList.add("complete");
    render();
    status.textContent = "交通錐疊好了";
    holder.animate([
      { transform: "translateY(0)" }, { transform: "translateY(-7px)", offset: .45 }, { transform: "translateY(0)" },
    ], { duration: reducedMotion.matches ? 0 : 450, easing: "ease-in-out" });
    completionTimer = setTimeout(completeLevel, reducedMotion.matches ? 0 : 600);
  }

  function place(size, spot) {
    if (completed || !top(size)) return;
    const from = cones.get(size).spot;
    const target = stacks[spot];
    if (from === spot || (target.length && target.at(-1) < size)) {
      clearSelection();
      render();
      status.textContent = from === spot ? "交通錐放回原位" : "大錐不能放在小錐上";
      return;
    }
    stacks[from].pop();
    target.push(size);
    clearSelection();
    render();
    status.textContent = `交通錐放在 ${spot + 1} 號位置`;
    if (stacks[1].length === 4 && stacks[1].every((value, i) => i === 0 || stacks[1][i - 1] > value)) finish();
  }

  function choose(size) {
    if (completed || !top(size)) return;
    selected = selected === size ? null : size;
    destination = cones.get(size).spot;
    render();
  }

  for (const size of [4, 3, 2, 1]) {
    const scale = .43 + size * .14;
    const node = element("g", { class: "cone", "data-size": size, tabindex: 0, role: "button", "aria-describedby": "instructions" }, holder);
    element("ellipse", { class: "selection", cx: 0, cy: 17 * scale, rx: 78 * scale, ry: 14 * scale, stroke: "#fff5d5", "stroke-width": 4 }, node);
    element("use", { class: "art", href: "#cone-art", x: -80 * scale, y: -148 * scale, width: 160 * scale, height: 180 * scale, "pointer-events": "none" }, node);
    element("path", { d: `M${-57 * scale} 0L${-12 * scale} ${-132 * scale}H${12 * scale}L${57 * scale} 0H${74 * scale}V${29 * scale}H${-74 * scale}V0Z`, fill: "transparent" }, node);
    cones.set(size, { node, size, x: 0, y: 0, spot: 0 });
    node.addEventListener("pointerdown", event => {
      if (completed || drag || !top(size) || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      playTruck();
      const point = pointFor(event);
      const cone = cones.get(size);
      drag = { size, id: event.pointerId, start: point, x: cone.x, y: cone.y, moved: false };
      holder.append(node);
      node.classList.add("held");
      road.setPointerCapture(event.pointerId);
    });
    node.addEventListener("keydown", event => {
      if (completed || drag || !top(size)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playTruck();
        if (selected === size) place(size, destination);
        else choose(size);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        if (selected !== size) choose(size);
        destination = (destination + (event.key === "ArrowRight" ? 1 : 2)) % 3;
        spots.forEach((spot, index) => spot.classList.toggle("chosen", index === destination));
      }
    });
  }

  function pointFor(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(road.getScreenCTM().inverse());
  }
  function cancelDrag(event) {
    if (drag && event?.pointerId !== undefined && event.pointerId !== drag.id) return;
    const id = drag?.id;
    drag = null;
    clearSelection();
    render();
    if (id !== undefined && road.hasPointerCapture(id)) road.releasePointerCapture(id);
  }
  road.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const point = pointFor(event);
    if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 6) drag.moved = true;
    if (!drag.moved) return;
    const x = Math.max(80, Math.min(520, drag.x + point.x - drag.start.x));
    const y = Math.max(170, Math.min(700, drag.y + point.y - drag.start.y));
    cones.get(drag.size).node.setAttribute("transform", `translate(${x} ${y})`);
    destination = centers.reduce((best, center, index) => Math.abs(center - x) < Math.abs(centers[best] - x) ? index : best, 0);
    spots.forEach((spot, index) => spot.classList.toggle("chosen", index === destination));
  });
  road.addEventListener("pointerup", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const { size, moved } = drag;
    const point = pointFor(event);
    drag = null;
    road.releasePointerCapture(event.pointerId);
    if (moved && point.y >= 340 && point.y <= 800 && point.x >= 10 && point.x <= 590) {
      const spot = centers.reduce((best, center, index) => Math.abs(center - point.x) < Math.abs(centers[best] - point.x) ? index : best, 0);
      place(size, spot);
    } else if (moved) {
      clearSelection();
      render();
    } else {
      if (selected !== null && selected !== size) place(selected, cones.get(size).spot);
      else choose(size);
    }
  });
  road.addEventListener("pointercancel", cancelDrag);
  road.addEventListener("lostpointercapture", event => { if (drag) cancelDrag(event); });
  spots.forEach((spot, index) => {
    spot.addEventListener("click", () => { playTruck(); if (selected !== null) place(selected, index); });
    spot.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      playTruck();
      if (selected !== null) place(selected, index);
    });
  });
  const escape = event => { if (event.key === "Escape") cancelDrag(); };
  window.addEventListener("keydown", escape);
  window.addEventListener("blur", cancelDrag);
  render();

  async function animateScene(entering) {
    const animation = arrival.animate(entering ? [
      { transform: "translateY(110vh)" }, { transform: "translateY(-12px)", offset: .7 },
      { transform: "translateY(4px)", offset: .88 }, { transform: "translateY(0)" },
    ] : [
      { transform: "translateY(0)" }, { transform: "translateY(-15px)", offset: .25 }, { transform: "translateY(110vh)" },
    ], { duration: reducedMotion.matches ? 0 : entering ? 1050 : 750, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
    await animation.finished;
    arrival.style.transform = entering ? "" : "translateY(110vh)";
    animation.cancel();
  }
  registerLevel({
    background: "#d7e3e1",
    setup: () => {
      active = true;
      rain.classList.add("active");
      playTruck();
      return animateScene(true);
    },
    teardown: () => {
      active = false;
      clearTimeout(completionTimer);
      truck.pause();
      truck.currentTime = 0;
      rain.classList.remove("active");
      cancelDrag();
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancelDrag);
      return animateScene(false);
    },
  });
})();
