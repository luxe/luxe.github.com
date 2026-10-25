(() => {
  "use strict";

  const scene = document.querySelector(".scene");
  const arrival = document.querySelector(".table-arrival");
  const table = document.querySelector(".table");
  const holder = document.querySelector(".notes");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const registerSound = wanwanAudio.sound("./assets/register.mp3");
  const SVG = "http://www.w3.org/2000/svg";
  const definitions = [
    { value: 1000, length: 160, color: "#bad5e7", ink: "#507b9c", motif: "pheasant", x: 228, y: 393, angle: -9 },
    { value: 200, length: 150, color: "#cad9ae", ink: "#6c8553", motif: "office", x: 250, y: 478, angle: 11 },
    { value: 2000, length: 165, color: "#d5c4df", ink: "#8a689a", motif: "salmon", x: 210, y: 563, angle: -12 },
    { value: 100, length: 145, color: "#efb7ad", ink: "#b56962", motif: "hall", x: 266, y: 655, angle: 8 },
    { value: 500, length: 155, color: "#dfc19c", ink: "#9b754f", motif: "deer", x: 216, y: 741, angle: -6 },
  ];
  const stack = [];
  const notes = definitions.map(definition => {
    const note = { ...definition, width: definition.length * 2, home: { ...definition }, node: document.createElementNS(SVG, "g") };
    const half = note.width / 2;
    const node = note.node;
    node.classList.add("note");
    node.dataset.value = String(note.value);
    node.dataset.length = String(note.length);
    node.setAttribute("role", "button");
    node.setAttribute("tabindex", "0");
    node.setAttribute("aria-describedby", "instructions");
    node.style.setProperty("--ink", note.ink);
    node.style.color = note.ink;
    // Original toy-note illustrations, not reproductions of banknote artwork.
    node.innerHTML = `
      <g class="paper">
        <rect x="${-half}" y="-70" width="${note.width}" height="140" rx="9" fill="${note.color}" stroke="${note.ink}" stroke-opacity=".35" stroke-width="1.5"/>
        <rect x="${-half + 7}" y="-63" width="${note.width - 14}" height="126" rx="5" stroke="#fff6e8" stroke-opacity=".55" stroke-width="2"/>
        <path d="M${-half + 12} -49H${half - 12}" stroke="${note.ink}" stroke-opacity=".2"/>
        <use href="#blossom" x="${-half + 15}" y="-28" width="64" height="64"/>
        <use href="#${note.motif}" x="-42" y="-40" width="145" height="93"/>
        <path d="M${-half + 16} 48h35m-35 5h23" stroke="${note.ink}" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>
      </g>`;
    holder.append(node);
    return note;
  });
  let drag = null;
  let completed = false;

  function render(note) {
    note.node.setAttribute("transform", `translate(${note.x} ${note.y}) rotate(${note.angle})`);
    const index = stack.indexOf(note);
    note.node.dataset.stacked = String(index !== -1);
    note.node.setAttribute("aria-label", `${note.value.toLocaleString("en-US")} 元，${index === -1 ? "桌上" : `托盤第 ${index + 1} 張`}`);
    note.node.setAttribute("aria-pressed", String(index !== -1));
  }

  function arrangeStack() {
    stack.forEach((note, index) => {
      note.x = 240;
      note.y = 123 + index * 20;
      note.angle = 0;
      render(note);
      holder.append(note.node);
    });
  }

  function inTray(point) {
    return point.x >= 60 && point.x <= 420 && point.y >= 40 && point.y <= 280;
  }

  function pointFor(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(table.getScreenCTM().inverse());
  }

  function onTable(note, x, y) {
    note.angle = (note.angle > 0 ? -1 : 1) * (5 + Math.random() * 7);
    const radians = Math.abs(note.angle) * Math.PI / 180;
    const halfWidth = note.width / 2 * Math.cos(radians) + 70 * Math.sin(radians);
    const halfHeight = note.width / 2 * Math.sin(radians) + 70 * Math.cos(radians);
    note.x = Math.max(halfWidth + 15, Math.min(465 - halfWidth, x));
    note.y = Math.max(330 + halfHeight, Math.min(812 - halfHeight, y));
    render(note);
  }

  function checkComplete() {
    const correct = stack.length === notes.length && stack.every((note, index) =>
      index === 0 || stack[index - 1].value > note.value
    );
    if (!correct || completed) return;
    completed = true;
    scene.classList.add("complete");
    for (const note of notes) note.node.setAttribute("aria-disabled", "true");
    status.textContent = "鈔票整理好了！";
    registerSound.currentTime = 0;
    registerSound.play().catch(cause => console.warn("Register sound could not play", cause));
    const animation = holder.animate([
      { transform: "translateY(0)" },
      { transform: "translateY(-7px)", offset: .45 },
      { transform: "translateY(0)" },
    ], { duration: reducedMotion.matches ? 0 : 450, easing: "ease-in-out" });
    Promise.all([
      animation.finished,
      new Promise(resolve => setTimeout(resolve, 2200)),
    ]).then(() => {
      animation.cancel();
      completeLevel();
    });
  }

  function drop(note) {
    if (inTray(note)) {
      stack.push(note);
      arrangeStack();
      status.textContent = `${note.value.toLocaleString("en-US")} 元放進托盤`;
    } else {
      onTable(note, note.x, note.y);
      status.textContent = `${note.value.toLocaleString("en-US")} 元放在桌上`;
    }
    checkComplete();
  }

  function cancelDrag(event) {
    if (!drag) return;
    if (event?.pointerId !== undefined && event.pointerId !== drag.id) return;
    const { note, origin, stackIndex, id } = drag;
    drag = null;
    Object.assign(note, origin);
    if (stackIndex !== -1) stack.splice(stackIndex, 0, note);
    arrangeStack();
    render(note);
    note.node.classList.remove("dragging");
    scene.classList.remove("over-tray");
    if (table.hasPointerCapture(id)) table.releasePointerCapture(id);
  }

  for (const note of notes) {
    render(note);
    note.node.addEventListener("pointerdown", event => {
      if (completed || drag || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      const point = pointFor(event);
      const stackIndex = stack.indexOf(note);
      drag = { note, id: event.pointerId, stackIndex, origin: { x: note.x, y: note.y, angle: note.angle },
        offsetX: point.x - note.x, offsetY: point.y - note.y };
      if (stackIndex !== -1) stack.splice(stackIndex, 1);
      arrangeStack();
      holder.append(note.node);
      table.setPointerCapture(event.pointerId);
      note.node.classList.add("dragging");
    });
    note.node.addEventListener("keydown", event => {
      if (completed || drag) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const index = stack.indexOf(note);
        if (index !== -1) {
          stack.splice(index, 1);
          arrangeStack();
          onTable(note, note.home.x, note.home.y);
          holder.append(note.node);
          status.textContent = `${note.value.toLocaleString("en-US")} 元放在桌上`;
        } else {
          note.x = 240;
          note.y = 150;
          drop(note);
        }
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const index = stack.indexOf(note);
        if (index !== -1) {
          stack.splice(index, 1);
          arrangeStack();
          onTable(note, note.home.x, note.home.y);
        }
        onTable(note, note.x + (event.key === "ArrowRight" ? 14 : event.key === "ArrowLeft" ? -14 : 0),
          note.y + (event.key === "ArrowDown" ? 14 : event.key === "ArrowUp" ? -14 : 0));
        holder.append(note.node);
      }
    });
  }
  // Capture on the table: notes change paint order while they are dragged.
  table.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    const { note } = drag;
    const point = pointFor(event);
    note.x = point.x - drag.offsetX;
    note.y = point.y - drag.offsetY;
    render(note);
    scene.classList.toggle("over-tray", inTray(note));
  });
  table.addEventListener("pointerup", event => {
    if (!drag || event.pointerId !== drag.id) return;
    const { note } = drag;
    drag = null;
    note.node.classList.remove("dragging");
    scene.classList.remove("over-tray");
    table.releasePointerCapture(event.pointerId);
    drop(note);
  });
  table.addEventListener("pointercancel", cancelDrag);
  table.addEventListener("lostpointercapture", cancelDrag);
  window.addEventListener("blur", cancelDrag);

  async function animateScene(entering) {
    const animation = arrival.animate(entering ? [
      { transform: "translateY(110vh) rotate(-3deg)" },
      { transform: "translateY(-12px) rotate(1deg)", offset: .7 },
      { transform: "translateY(4px) rotate(-.3deg)", offset: .87 },
      { transform: "translateY(0) rotate(0)" },
    ] : [
      { transform: "translateY(0) rotate(0)" },
      { transform: "translateY(-15px) rotate(-1deg)", offset: .25 },
      { transform: "translateY(110vh) rotate(4deg)" },
    ], { duration: reducedMotion.matches ? 0 : entering ? 1050 : 750, fill: "both", easing: "cubic-bezier(.4,0,.2,1)" });
    await animation.finished;
    arrival.style.transform = entering ? "" : "translateY(110vh)";
    animation.cancel();
  }

  registerLevel({
    background: "#e5d9ca",
    setup: () => animateScene(true),
    teardown: () => {
      cancelDrag();
      window.removeEventListener("blur", cancelDrag);
      return animateScene(false);
    },
  });
})();
