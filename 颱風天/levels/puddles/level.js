(() => {
  "use strict";
  const svg = document.querySelector(".street");
  const holder = document.querySelector(".leaves");
  const water = document.querySelector(".puddles");
  const effects = document.querySelector(".splashes");
  const rain = document.querySelector(".rain");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const splashSound = wanwanAudio.sound("./assets/splash.mp3");
  const puddles = [
    { x: 425, y: 250, rx: 48, ry: 29 },
    { x: 160, y: 350, rx: 68, ry: 40 },
    { x: 410, y: 485, rx: 90, ry: 54 },
    { x: 180, y: 620, rx: 112, ry: 66 },
  ];
  const homes = [
    { x: 110, y: 220, angle: -25 },
    { x: 465, y: 630, angle: 34 },
    { x: 295, y: 190, angle: -16 },
    { x: 210, y: 480, angle: 20 },
  ];
  let drag = null;
  let selected = null;
  let destination = 0;
  let completed = false;
  let timer = 0;
  const animations = new Set();
  function element(tag, attributes, parent) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  for (let i = 0; i < 70; i++) {
    const drop = document.createElement("i");
    drop.style.left = `${Math.random() * 105}%`;
    drop.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    drop.style.animationDelay = `${-Math.random() * 4}s`;
    drop.style.setProperty("--still-y", `${Math.random() * 100}%`);
    rain.append(drop);
  }
  const leaves = homes.map((home, size) => {
    const node = element("g", { class: "leaf", "data-size": size, tabindex: 0, role: "button", "aria-label": `落葉 ${size + 1}`, "aria-describedby": "instructions" }, holder);
    const art = element("g", { transform: `scale(${.55 + size * .23})` }, node);
    element("ellipse", { class: "outline", rx: 69, ry: 43 }, art);
    element("ellipse", { rx: 69, ry: 43, fill: "transparent" }, art);
    element("use", { href: "#leaf-art", "pointer-events": "none" }, art);
    return { node, size, ...home, puddle: null };
  });
  function render() {
    leaves.forEach(leaf => {
      leaf.node.setAttribute("transform", `translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle})`);
      leaf.node.dataset.puddle = leaf.puddle === null ? "" : String(leaf.puddle);
      leaf.node.classList.toggle("held", selected === leaf.size);
      leaf.node.setAttribute("aria-disabled", String(completed));
    });
    [...water.children].forEach((node, index) => node.classList.toggle("chosen", selected !== null && destination === index));
  }
  function splash(index) {
    const p = puddles[index];
    splashSound.currentTime = 0;
    splashSound.play().catch(cause => console.warn("Splash sound could not play", cause));
    const group = element("g", { class: "splash", transform: `translate(${p.x} ${p.y})` }, effects);
    const parts = [];
    for (const [delay, end] of [[0, .95], [90, 1.2]]) {
      const ring = element("ellipse", { rx: p.rx, ry: p.ry, stroke: "#e7f6ee", "stroke-width": 3, "vector-effect": "non-scaling-stroke" }, group);
      parts.push(ring.animate(reduced.matches ? [{ opacity: .7 }, { opacity: 0 }] : [
        { opacity: 0, transform: "scale(.12)" },
        { opacity: .9, transform: "scale(.35)", offset: .2 },
        { opacity: 0, transform: `scale(${end})` },
      ], { duration: reduced.matches ? 180 : 620, delay: reduced.matches ? 0 : delay, easing: "cubic-bezier(.15,.75,.35,1)", fill: "both" }));
    }
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2 + (i % 2) * .12;
      const distance = .72 + (i % 3) * .13;
      const x = Math.cos(angle) * p.rx * distance;
      const y = Math.sin(angle) * p.ry * distance;
      const tilt = angle * 180 / Math.PI + 90;
      const drop = element("ellipse", { rx: 2.5 + i % 3, ry: 5 + (i % 2) * 2, fill: "#e4f5ed" }, group);
      parts.push(drop.animate(reduced.matches ? [{ opacity: .7 }, { opacity: 0 }] : [
        { opacity: 0, transform: `translate(0px, 0px) rotate(${tilt}deg) scale(.25)` },
        { opacity: 1, transform: `translate(${x * .35}px, ${y * .35 - 10}px) rotate(${tilt}deg) scale(1)`, offset: .3 },
        { opacity: 0, transform: `translate(${x}px, ${y - 4}px) rotate(${tilt}deg) scale(.55)` },
      ], { duration: reduced.matches ? 180 : 650, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }));
    }
    for (const animation of parts) animations.add(animation);
    Promise.allSettled(parts.map(animation => animation.finished)).then(() => {
      for (const animation of parts) animations.delete(animation);
      group.remove();
    });
  }
  function place(leaf, index) {
    if (completed) return;
    selected = null;
    if (index !== null && !leaves.some(other => other !== leaf && other.puddle === index)) {
      const p = puddles[index];
      Object.assign(leaf, { x: p.x, y: p.y, angle: -12 + leaf.size * 8, puddle: index });
      splash(index);
      status.textContent = "落葉漂在水窪上";
    }
    render();
    if (leaves.every(item => item.puddle === item.size)) {
      completed = true;
      scene.classList.add("complete");
      render();
      status.textContent = "落葉都找到水窪了";
      timer = setTimeout(completeLevel, reduced.matches ? 200 : 900);
    }
  }
  puddles.forEach((p, index) => {
    const node = element("g", { class: "puddle", "data-size": index, tabindex: 0, role: "button", "aria-label": `水窪 ${index + 1}` }, water);
    element("ellipse", { class: "rim", cx: p.x, cy: p.y, rx: p.rx, ry: p.ry, fill: "url(#water)", stroke: "#7ba5a9", "stroke-width": 3 }, node);
    element("path", { d: `M${p.x - p.rx * .6} ${p.y - p.ry * .2}q${p.rx * .4} ${-p.ry * .65} ${p.rx * .9} ${-p.ry * .2}`, stroke: "#daece2", "stroke-width": 5, "stroke-linecap": "round", "pointer-events": "none" }, node);
    node.addEventListener("click", () => { if (selected !== null) place(leaves[selected], index); });
    node.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && selected !== null) {
        event.preventDefault();
        place(leaves[selected], index);
      }
    });
  });
  function point(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  leaves.forEach(leaf => {
    leaf.node.addEventListener("pointerdown", event => {
      if (completed || drag || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      selected = leaf.size;
      const p = point(event);
      drag = { leaf, id: event.pointerId, x: leaf.x, y: leaf.y, start: p };
      holder.append(leaf.node);
      svg.setPointerCapture(event.pointerId);
      render();
    });
    leaf.node.addEventListener("keydown", event => {
      if (completed || drag) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (selected === leaf.size) place(leaf, destination);
        else { selected = leaf.size; destination = leaf.puddle ?? 0; render(); }
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        selected = leaf.size;
        destination = (destination + (["ArrowLeft", "ArrowUp"].includes(event.key) ? 3 : 1)) % 4;
        render();
      }
    });
  });
  svg.addEventListener("pointermove", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const p = point(event);
    drag.leaf.node.setAttribute("transform", `translate(${Math.max(65, Math.min(535, drag.x + p.x - drag.start.x))} ${Math.max(180, Math.min(700, drag.y + p.y - drag.start.y))}) rotate(${drag.leaf.angle})`);
  });
  svg.addEventListener("pointerup", event => {
    if (!drag || drag.id !== event.pointerId) return;
    const p = point(event);
    const { leaf, x, y, start } = drag;
    const center = { x: x + p.x - start.x, y: y + p.y - start.y };
    drag = null;
    svg.releasePointerCapture(event.pointerId);
    const index = puddles.findIndex(puddle => ((center.x - puddle.x) / (puddle.rx + 12)) ** 2 + ((center.y - puddle.y) / (puddle.ry + 12)) ** 2 <= 1);
    if (index === -1) {
      Object.assign(leaf, { x: Math.max(65, Math.min(535, center.x)), y: Math.max(180, Math.min(700, center.y)), angle: leaf.angle + 13, puddle: null });
    }
    place(leaf, index === -1 ? null : index);
  });
  function cancel() {
    const id = drag?.id;
    drag = null;
    selected = null;
    render();
    if (id !== undefined && svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
  }
  svg.addEventListener("pointercancel", cancel);
  svg.addEventListener("lostpointercapture", () => { if (drag) cancel(); });
  const escape = event => { if (event.key === "Escape") cancel(); };
  window.addEventListener("keydown", escape);
  window.addEventListener("blur", cancel);
  render();
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
    background: "#d7e3e1",
    setup: () => { rain.classList.add("active"); return animateScene(true); },
    teardown: () => {
      clearTimeout(timer);
      cancel();
      splashSound.pause();
      for (const animation of animations) animation.cancel();
      rain.classList.remove("active");
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancel);
      return animateScene(false);
    },
  });
})();
