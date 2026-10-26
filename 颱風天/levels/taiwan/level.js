(() => {
  "use strict";

  const SVG = "http://www.w3.org/2000/svg";
  const scene = document.querySelector(".scene");
  const arrival = document.querySelector(".puzzle-arrival");
  const puzzle = document.querySelector(".puzzle");
  const holder = document.querySelector(".pieces");
  const placed = document.querySelector(".placed-pieces");
  const outline = document.querySelector(".outline");
  const status = document.querySelector("#status");
  const rain = document.querySelector(".rain");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const pieces = [];
  const groups = new Set();
  const SNAP = 22;
  const PREPLACED = new Set(["TWKIN", "TWLIE", "TWPEN", "TWKEE", "TWHSZ", "TWCYI", "TWTPE"]);
  let drag = null;
  let completed = false;
  let disposed = false;

  function node(tag, attributes, parent) {
    const result = document.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attributes)) result.setAttribute(key, String(value));
    parent.append(result);
    return result;
  }

  function render(group) {
    for (const piece of group.members) {
      piece.node.setAttribute("transform", `translate(${group.x} ${group.y})`);
      piece.node.dataset.locked = String(group.locked);
      piece.node.dataset.group = group.id;
      piece.node.setAttribute("tabindex", group.locked ? "-1" : "0");
      piece.node.setAttribute("aria-disabled", String(group.locked));
      piece.node.setAttribute("aria-label", `${piece.name}${group.locked ? "，已放好" : ""}`);
      const layer = group.locked ? placed : holder;
      if (piece.node.parentNode !== layer) layer.append(piece.node);
    }
  }

  function merge(moving, target) {
    for (const piece of moving.members) {
      target.members.push(piece);
      piece.group = target;
    }
    groups.delete(moving);
    render(target);
    return target;
  }

  // Locks a group for good and glides it onto the map silhouette.
  function lockOntoMap(group) {
    group.locked = true;
    const from = { x: group.x, y: group.y };
    const distance = Math.hypot(from.x, from.y);
    if (reducedMotion.matches || distance < 0.5) {
      group.x = 0;
      group.y = 0;
      render(group);
      return;
    }
    render(group);
    const duration = Math.min(420, 160 + distance * 2);
    const start = performance.now();
    function step(now) {
      if (disposed || group.x === 0 && group.y === 0) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      group.x = from.x * (1 - eased);
      group.y = from.y * (1 - eased);
      render(group);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function settle(group) {
    if (completed || group.locked) return;
    // A piece dropped in place on the silhouette, or in its correct position
    // next to any other piece (loose or placed), counts as matched. Every
    // match goes onto the map and stays locked, so pieces never end up
    // joined together while still loose.
    let matched = Math.hypot(group.x, group.y) < SNAP;
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of groups) {
        if (other !== group && Math.hypot(group.x - other.x, group.y - other.y) < SNAP) {
          matched = true;
          // Placed pieces never move; loose partners travel with this group.
          if (other.locked) continue;
          group = merge(other, group);
          changed = true;
          break;
        }
      }
    }
    if (!matched) {
      render(group);
      return;
    }
    // Overlapping play so quick successive snaps each get their own click.
    wanwanAudio.play("../elevator/assets/click.mp3");
    lockOntoMap(group);
    if ([...groups].every(part => part.locked)) finish();
  }

  function finish() {
    if (completed) return;
    completed = true;
    scene.classList.add("complete");
    for (const piece of pieces) piece.node.setAttribute("aria-disabled", "true");
    status.textContent = "臺灣拼好了";
    setTimeout(() => { if (!disposed) completeLevel(); }, reducedMotion.matches ? 0 : 1300);
  }

  function pointFor(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(puzzle.getScreenCTM().inverse());
  }

  function cancelDrag(event) {
    if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.id)) return;
    const { group, origin, id } = drag;
    drag = null;
    group.x = origin.x;
    group.y = origin.y;
    for (const piece of group.members) piece.node.classList.remove("held");
    render(group);
    if (puzzle.hasPointerCapture(id)) puzzle.releasePointerCapture(id);
  }

  function move(group, x, y) {
    const bounds = group.members.reduce((box, piece) => ({
      left: Math.min(box.left, piece.box.x),
      right: Math.max(box.right, piece.box.x + piece.box.width),
      top: Math.min(box.top, piece.box.y),
      bottom: Math.max(box.bottom, piece.box.y + piece.box.height),
    }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
    group.x = Math.max(25 - bounds.left, Math.min(575 - bounds.right, x));
    group.y = Math.max(28 - bounds.top, Math.min(915 - bounds.bottom, y));
    render(group);
  }

  async function loadMap() {
    const response = await fetch("./assets/taiwan.svg");
    if (!response.ok) throw new Error(`Taiwan map could not load (${response.status})`);
    const source = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    const paths = [...source.querySelectorAll("#features > path")];
    if (source.querySelector("parsererror") || paths.length !== 22) throw new Error("Invalid Taiwan map regions");
    const geography = node("g", {}, outline);
    for (const path of paths) node("path", { d: path.getAttribute("d") }, geography);
    const bounds = geography.getBBox();
    const scale = Math.min(495 / bounds.width, 585 / bounds.height);
    const tx = 300 - (bounds.x + bounds.width / 2) * scale;
    const ty = 385 - (bounds.y + bounds.height / 2) * scale;
    const transform = `translate(${tx} ${ty}) scale(${scale})`;
    geography.setAttribute("transform", transform);
    const slots = Array.from({ length: paths.length }, (_, i) => i);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const pieceNode = node("g", { class: "piece", "data-piece": path.id, role: "button", tabindex: 0, "aria-describedby": "instructions" }, holder);
      const art = node("g", { transform }, pieceNode);
      const region = node("path", { class: "region", d: path.getAttribute("d") }, art);
      node("path", { class: "hit", d: path.getAttribute("d") }, art);
      const box = region.getBBox();
      const projected = { x: tx + box.x * scale, y: ty + box.y * scale, width: box.width * scale, height: box.height * scale };
      const slot = slots[i];
      const center = { x: 85 + slot % 4 * 143, y: 100 + Math.floor(slot / 4) * 147 };
      const piece = { node: pieceNode, name: path.getAttribute("name") || path.id, box: projected, group: null };
      const group = { id: path.id, members: [piece], x: 0, y: 0, locked: false };
      piece.group = group;
      pieces.push(piece);
      groups.add(group);
      if (PREPLACED.has(path.id)) {
        group.locked = true;
        render(group);
      } else {
        move(group, center.x - projected.x - projected.width / 2, center.y - projected.y - projected.height / 2);
        // Avoid a scrambled piece beginning almost in its solved position.
        if (Math.hypot(group.x, group.y) < SNAP * 2) move(group, group.x + 80, group.y + 80);
      }
      pieceNode.addEventListener("pointerdown", event => {
        const group = piece.group;
        if (completed || drag || group.locked || !event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        const point = pointFor(event);
        drag = { id: event.pointerId, group, origin: { x: group.x, y: group.y }, start: point };
        for (const member of group.members) {
          holder.append(member.node);
          member.node.classList.add("held");
        }
        puzzle.setPointerCapture(event.pointerId);
      });
      pieceNode.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          cancelDrag();
          return;
        }
        const group = piece.group;
        if (completed || drag || group.locked) return;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          const step = event.shiftKey ? 30 : 8;
          move(group, group.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
            group.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0));
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          settle(group);
        }
      });
    }
  }

  for (let i = 0; i < 70; i++) {
    const drop = document.createElement("i");
    drop.style.left = `${Math.random() * 105}%`;
    drop.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    drop.style.animationDelay = `${-Math.random() * 4}s`;
    drop.style.setProperty("--still-y", `${Math.random() * 100}%`);
    rain.append(drop);
  }

  const loaded = loadMap();
  // Handle preload rejection immediately as well as propagating it through setup.
  loaded.catch(cause => {
    console.error("Unable to load Taiwan puzzle", cause);
    status.textContent = "拼圖無法載入，請重新整理。";
  });
  puzzle.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const point = pointFor(event);
    move(drag.group, drag.origin.x + point.x - drag.start.x, drag.origin.y + point.y - drag.start.y);
  });
  puzzle.addEventListener("pointerup", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const { group } = drag;
    drag = null;
    for (const piece of group.members) piece.node.classList.remove("held");
    puzzle.releasePointerCapture(event.pointerId);
    settle(group);
  });
  puzzle.addEventListener("pointercancel", cancelDrag);
  puzzle.addEventListener("lostpointercapture", cancelDrag);
  window.addEventListener("blur", cancelDrag);

  async function animateScene(entering) {
    const animation = arrival.animate(entering ? [
      { transform: "translateY(110vh) rotate(-2deg)" },
      { transform: "translateY(-12px) rotate(.6deg)", offset: .7 },
      { transform: "translateY(4px) rotate(-.2deg)", offset: .87 },
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
    background: "#dfe8dc",
    setup: async () => {
      await loaded;
      rain.classList.add("active");
      await animateScene(true);
    },
    teardown: () => {
      disposed = true;
      cancelDrag();
      window.removeEventListener("blur", cancelDrag);
      rain.classList.remove("active");
      return animateScene(false);
    },
  });
})();
