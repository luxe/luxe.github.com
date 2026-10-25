(() => {
  "use strict";
  const svg = document.querySelector(".temple");
  const scene = document.querySelector(".scene");
  const status = document.querySelector("#status");
  const flameLayer = document.querySelector(".flames");
  const burstLayer = document.querySelector(".bursts");
  const sparkLayer = document.querySelector(".sparks");
  const billLayer = document.querySelector(".bills");
  const mouthGlow = document.querySelector(".mouth-glow");
  const groundGlow = document.querySelector(".ground-glow");
  const coals = [...document.querySelectorAll(".coals circle")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const MOUTH = { x: 300, y: 440 };
  const FIRE_BASE = 482;
  const FLIGHT_MS = 760;
  const MAX_PARTICLES = 140;
  // Outer red, middle orange, inner yellow: each tongue is drawn once per layer.
  const LAYERS = [
    { fill: "#e2461c", w: 1, h: 1, opacity: .95 },
    { fill: "#f78d1e", w: .72, h: .78, opacity: .95 },
    { fill: "#ffd94a", w: .44, h: .5, opacity: .95 },
  ];
  const TONGUES = [
    [250, 34, 62], [266, 40, 82], [283, 44, 100], [300, 48, 112],
    [317, 44, 98], [334, 40, 84], [350, 34, 64],
  ].map(([x, w, h], i) => ({ x, w, h, p: [i * 1.7, i * 2.9 + 1, i * .83 + 2] }));
  const SPOTS = [[118, 676, -11], [232, 664, 7], [356, 680, -6], [480, 666, 10], [178, 750, 5], [420, 752, -8]];
  const BILL_SCALE = .9;

  let frame = 0;
  let last = 0;
  let heat = 0;
  let burned = 0;
  let completed = false;
  let timer = 0;
  const flights = [];
  const bursts = [];
  const particles = [];
  let emberDebt = 0;

  function element(tag, attributes, parent) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  const r1 = value => Math.round(value * 10) / 10;
  const rand = (min, max) => min + Math.random() * (max - min);
  const noise = (t, p) => Math.sin(t * 2.3 + p[0]) * .5 + Math.sin(t * 5.1 + p[1]) * .3 + Math.sin(t * 9.7 + p[2]) * .2;
  function flamePath(bx, by, w, h, tip) {
    const l = bx - w / 2;
    const r = bx + w / 2;
    const tx = bx + tip;
    const ty = by - h;
    return `M${r1(l)} ${r1(by)}C${r1(l)} ${r1(by - h * .45)} ${r1(tx - w * .12)} ${r1(by - h * .72)} ${r1(tx)} ${r1(ty)}`
      + `C${r1(tx + w * .12)} ${r1(by - h * .72)} ${r1(r)} ${r1(by - h * .45)} ${r1(r)} ${r1(by)}Q${r1(bx)} ${r1(by + w * .3)} ${r1(l)} ${r1(by)}Z`;
  }

  // ---------- Steady fire ----------
  const layerPaths = LAYERS.map(layer => {
    const group = element("g", { fill: layer.fill, opacity: layer.opacity }, flameLayer);
    return TONGUES.map(() => element("path", {}, group));
  });
  function drawFire(t) {
    const calm = reduced.matches ? .35 : 1;
    const boost = 1 + heat * .55;
    TONGUES.forEach((tongue, i) => {
      const n = noise(t, tongue.p);
      const height = tongue.h * (1 + .2 * n * calm) * boost;
      const width = tongue.w * (1 + .08 * Math.sin(t * 4.3 + tongue.p[1]) * calm) * (1 + heat * .12);
      const sway = (Math.sin(t * 3.1 + tongue.p[0]) + .5 * Math.sin(t * 7.7 + tongue.p[2])) * tongue.w * .32 * calm;
      LAYERS.forEach((layer, l) => {
        const lag = Math.sin(t * 3.1 + tongue.p[0] - l * .5) * tongue.w * .06 * calm;
        layerPaths[l][i].setAttribute("d", flamePath(tongue.x, FIRE_BASE, width * layer.w, height * layer.h, sway * (1 - l * .15) + lag));
      });
    });
    const flicker = noise(t * 1.6, [0, 1.3, 2.1]) * calm;
    mouthGlow.setAttribute("opacity", r1(Math.min(1, .5 + .15 * flicker + heat * .25) * 100) / 100);
    groundGlow.setAttribute("opacity", r1(Math.min(1, .55 + .15 * flicker + heat * .2) * 100) / 100);
    coals.forEach((coal, i) => coal.setAttribute("opacity", r1((.75 + .25 * Math.sin(t * (1.3 + i * .37) + i)) * 100) / 100));
  }

  // ---------- Flare-ups that leap out of the mouth ----------
  function addBurst() {
    const group = element("g", {}, burstLayer);
    const tongues = Array.from({ length: 5 }, (_, i) => ({
      x: 300 + (i - 2) * 22 + rand(-6, 6),
      w: rand(34, 48),
      h: rand(130, 190) * (i === 2 ? 1.15 : 1),
      p: [rand(0, 6), rand(0, 6), rand(0, 6)],
      paths: LAYERS.map(layer => element("path", { fill: layer.fill }, group)),
    }));
    // Paint all outer layers first so inner colors stay on top.
    LAYERS.forEach((_, l) => tongues.forEach(tongue => group.append(tongue.paths[l])));
    bursts.push({ age: 0, life: .95, group, tongues });
  }
  function drawBursts(dt, t) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const burst = bursts[i];
      burst.age += dt;
      const p = burst.age / burst.life;
      if (p >= 1) {
        burst.group.remove();
        bursts.splice(i, 1);
        continue;
      }
      const rise = p < .22 ? p / .22 : Math.pow(1 - (p - .22) / .78, .8);
      burst.group.setAttribute("opacity", r1((1 - p * p) * 100) / 100);
      for (const tongue of burst.tongues) {
        const sway = Math.sin(t * 6 + tongue.p[0]) * tongue.w * .4;
        tongue.paths.forEach((path, l) => {
          const layer = LAYERS[l];
          path.setAttribute("d", flamePath(tongue.x, 472 - p * 30, tongue.w * layer.w * (1 - p * .3), tongue.h * layer.h * rise * (1 + .12 * noise(t, tongue.p)), sway));
        });
      }
    }
  }

  // ---------- Sparks, embers, and burning paper flakes ----------
  function addParticle(kind, x, y, vx, vy, life) {
    if (particles.length >= MAX_PARTICLES) return;
    const node = kind === "flake"
      ? element("rect", { x: -5, y: -3.5, width: 10, height: 7, fill: "#f3c94a" }, sparkLayer)
      : element("circle", { r: kind === "spark" ? rand(2, 3.6) : rand(1.4, 2.4), fill: "#fff1a0" }, sparkLayer);
    particles.push({ kind, x, y, vx, vy, life, age: 0, spin: rand(-400, 400), angle: rand(0, 360), wobble: rand(0, 6), node });
  }
  function emberColor(p) {
    return p < .3 ? "#fff1a0" : p < .6 ? "#ffc43d" : "#ff6a22";
  }
  function drawParticles(dt) {
    if (!reduced.matches && !completed) {
      emberDebt += dt * (4 + heat * 14);
      while (emberDebt >= 1) {
        emberDebt--;
        addParticle("ember", rand(266, 334), rand(380, 430), rand(-12, 12), rand(-70, -40), rand(1.2, 2.2));
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const s = particles[i];
      s.age += dt;
      const p = s.age / s.life;
      if (p >= 1) {
        s.node.remove();
        particles.splice(i, 1);
        continue;
      }
      // Hot air pulls everything upward while drag slows the initial burst.
      s.vx *= Math.exp(-dt * 1.6);
      s.vy = s.vy * Math.exp(-dt * 1.2) - dt * (s.kind === "flake" ? 60 : 40);
      s.x += (s.vx + Math.sin(s.age * 5 + s.wobble) * (s.kind === "flake" ? 30 : 12)) * dt;
      s.y += s.vy * dt;
      const opacity = r1((p < .1 ? p / .1 : 1 - Math.pow((p - .1) / .9, 1.6)) * 100) / 100;
      if (s.kind === "flake") {
        s.angle += s.spin * dt;
        s.node.setAttribute("transform", `translate(${r1(s.x)} ${r1(s.y)}) rotate(${Math.round(s.angle)}) scale(${r1((1 - p * .6) * 10) / 10} ${r1(Math.cos(s.age * 7 + s.wobble) * 10) / 10 || .1})`);
        s.node.setAttribute("fill", p < .25 ? "#f3c94a" : p < .5 ? "#e0702a" : "#3b2a22");
      } else {
        s.node.setAttribute("cx", r1(s.x));
        s.node.setAttribute("cy", r1(s.y));
        s.node.setAttribute("fill", emberColor(p));
      }
      s.node.setAttribute("opacity", opacity);
    }
  }

  // ---------- Joss paper ----------
  const bills = SPOTS.map(([x, y, angle], index) => {
    const node = element("g", { class: "bill", "data-bill": index, tabindex: 0, role: "button", "aria-label": "金紙", "aria-describedby": "instructions" }, billLayer);
    node.setAttribute("transform", `translate(${x} ${y}) rotate(${angle}) scale(${BILL_SCALE})`);
    element("rect", { class: "focus-ring", x: -58, y: -58, width: 116, height: 116, rx: 8 }, node);
    const art = element("g", { class: "art" }, node);
    element("rect", { x: -48, y: -46, width: 100, height: 100, rx: 2, fill: "#6b2a18", opacity: .22 }, art);
    element("use", { href: "#bill" }, art);
    return { index, x, y, angle, node, gone: false };
  });

  const fireSound = new Audio("./assets/fire_bg.mp3");
  fireSound.preload = "auto";
  fireSound.loop = true;
  let active = false;
  let fireFade = 0;

  function playFire() {
    if (!active || !fireSound.paused) return;
    clearTimeout(fireFade);
    fireSound.volume = 1;
    fireSound.play().catch(cause => console.warn("Fire ambience could not play", cause));
  }
  // Timer-driven (not rAF) so teardown can't stall while the iframe is hidden/throttled.
  function fadeFire(ms) {
    clearTimeout(fireFade);
    if (fireSound.paused) return Promise.resolve();
    const from = fireSound.volume;
    const begin = performance.now();
    return new Promise(resolve => {
      const step = () => {
        const p = Math.min(1, (performance.now() - begin) / ms);
        fireSound.volume = from * (1 - p);
        if (p < 1) {
          fireFade = setTimeout(step, 30);
          return;
        }
        fireSound.pause();
        fireSound.currentTime = 0;
        fireSound.volume = 1;
        resolve();
      };
      step();
    });
  }
  const flames = new Set();
  // Each throw gets its own copy so overlapping whooshes don't cut each other off.
  function playFlame() {
    const sound = wanwanAudio.play("./assets/flame.mp3");
    flames.add(sound);
    sound.addEventListener("ended", () => flames.delete(sound), { once: true });
  }
  document.addEventListener("pointerdown", playFire);

  function throwBill(bill) {
    if (completed || bill.gone) return;
    bill.gone = true;
    playFire();
    playFlame();
    const hadFocus = document.activeElement === bill.node;
    bill.node.classList.add("flying");
    bill.node.removeAttribute("tabindex");
    bill.node.setAttribute("aria-hidden", "true");
    billLayer.append(bill.node);
    if (hadFocus) bills.find(other => !other.gone)?.node.focus({ preventScroll: true });
    status.textContent = "金紙飛進金爐。";
    if (reduced.matches) {
      bill.node.remove();
      burn();
      return;
    }
    flights.push({
      bill,
      age: 0,
      control: { x: bill.x * .35 + MOUTH.x * .65, y: Math.min(bill.y, MOUTH.y) - 330 },
      spin: (bill.x < MOUTH.x ? 1 : -1) * 540,
    });
  }
  function drawFlights(dt) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const flight = flights[i];
      const { bill, control } = flight;
      flight.age += dt * 1000;
      const raw = Math.min(1, flight.age / FLIGHT_MS);
      const p = raw * raw * (3 - 2 * raw) * .4 + raw * .6;
      const q = 1 - p;
      const x = q * q * bill.x + 2 * q * p * control.x + p * p * MOUTH.x;
      const y = q * q * bill.y + 2 * q * p * control.y + p * p * MOUTH.y;
      const scale = BILL_SCALE * (1 - p * .78);
      bill.node.setAttribute("transform", `translate(${r1(x)} ${r1(y)}) rotate(${Math.round(bill.angle + flight.spin * p)}) scale(${r1(scale * 100) / 100})`);
      bill.node.setAttribute("opacity", raw > .85 ? r1((1 - raw) / .15 * 100) / 100 : 1);
      if (raw >= 1) {
        flights.splice(i, 1);
        bill.node.remove();
        burn();
      }
    }
  }

  function burn() {
    burned++;
    scene.dataset.burned = String(burned);
    heat = Math.min(2.4, heat + 1);
    if (!reduced.matches) {
      addBurst();
      for (let i = 0; i < 22; i++) {
        const a = rand(-Math.PI * .95, -Math.PI * .05);
        const speed = rand(120, 300);
        addParticle("spark", MOUTH.x + rand(-20, 20), MOUTH.y - 10, Math.cos(a) * speed, Math.sin(a) * speed, rand(.7, 1.4));
      }
      for (let i = 0; i < 6; i++) addParticle("flake", MOUTH.x + rand(-30, 30), MOUTH.y - 20, rand(-80, 80), rand(-200, -110), rand(1.3, 2));
    }
    if (burned < bills.length) {
      status.textContent = "金紙燒起來了！";
      return;
    }
    completed = true;
    scene.classList.add("complete");
    status.textContent = "金紙都燒完了。";
    timer = setTimeout(() => window.completeLevel(), reduced.matches ? 600 : 1800);
  }

  bills.forEach(bill => {
    bill.node.addEventListener("pointerdown", () => scene.classList.add("pointer"));
    bill.node.addEventListener("click", () => throwBill(bill));
    bill.node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      throwBill(bill);
    });
  });
  document.addEventListener("keydown", () => scene.classList.remove("pointer"));

  function tick(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    heat *= Math.exp(-dt * 1.1);
    const t = now / 1000 * (reduced.matches ? .3 : 1);
    drawFire(t);
    drawBursts(dt, t);
    drawFlights(dt);
    drawParticles(dt);
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
  drawFire(0);
  scene.dataset.burned = "0";

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
    setup: () => {
      active = true;
      playFire();
      start();
      return animateScene(true);
    },
    teardown: async () => {
      clearTimeout(timer);
      active = false;
      await Promise.all([animateScene(false), fadeFire(700)]);
      for (const sound of flames) sound.stop();
      flames.clear();
      stop();
    },
  });
})();
