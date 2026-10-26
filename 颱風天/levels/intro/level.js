(() => {
  "use strict";

  const scene = document.querySelector(".scene");
  const title = document.querySelector(".title");
  const start = document.querySelector(".start");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let started = false;

  function bounce(element, entering, delay) {
    const frames = entering ? [
      { transform: "translateY(-80vh) scale(.94)", opacity: 0, offset: 0 },
      { transform: "translateY(14px) scale(1.02)", opacity: 1, offset: .65 },
      { transform: "translateY(-5px) scale(.995)", opacity: 1, offset: .84 },
      { transform: "translateY(0) scale(1)", opacity: 1, offset: 1 },
    ] : [
      { transform: "translateY(0) scale(1)", offset: 0 },
      { transform: "translateY(-16px) scale(1.02)", offset: .25 },
      { transform: "translateY(110vh) scale(.95)", offset: 1 },
    ];
    const animation = element.animate(frames, {
      duration: reducedMotion.matches ? 0 : entering ? 1000 : 700,
      delay: reducedMotion.matches ? 0 : delay,
      easing: "cubic-bezier(.4,0,.2,1)", fill: "both",
    });
    return animation.finished.then(() => {
      element.style.transform = entering ? "" : "translateY(110vh)";
      animation.cancel();
    });
  }

  async function animateScene(entering) {
    scene.classList.remove("play");
    await Promise.all([
      bounce(title, entering, entering ? 0 : 120),
      bounce(start, entering, entering ? 160 : 0),
    ]);
    if (entering) scene.classList.add("play");
  }

  const waveArt = start.querySelector(".wave-art");
  const body = start.querySelector(".wave-body");
  const foam = start.querySelector(".foam");
  const runoff = start.querySelector(".runoff");
  const shade = start.querySelector(".wave-shade");
  const animations = new Set();
  const morphs = new Set();

  function animate(node, frames, options) {
    const animation = node.animate(frames, { fill: "both", ...options });
    animations.add(animation);
    return animation.finished.then(() => true, () => false);
  }

  // Matching cubic segments let the crest physically fold over instead of rotating the icon.
  function morph(node, paths, times, duration) {
    const numbers = paths.map(path => path.match(/-?\d*\.?\d+/g).map(Number));
    return new Promise(resolve => {
      const beginning = performance.now();
      const motion = { frame: 0, cancel: () => resolve(false) };
      morphs.add(motion);
      function step(now) {
        const t = Math.min(1, (now - beginning) / duration);
        let segment = times.findIndex((end, i) => i > 0 && t <= end) - 1;
        segment = Math.max(0, segment);
        const progress = (t - times[segment]) / (times[segment + 1] - times[segment]);
        const eased = progress * progress * (3 - 2 * progress);
        let n = 0;
        node.setAttribute("d", paths[segment].replace(/-?\d*\.?\d+/g, () => {
          const from = numbers[segment][n];
          return (from + (numbers[segment + 1][n++] - from) * eased).toFixed(2);
        }));
        if (t < 1) motion.frame = requestAnimationFrame(step);
        else { morphs.delete(motion); resolve(true); }
      }
      motion.frame = requestAnimationFrame(step);
    });
  }

  async function roll() {
    if (reducedMotion.matches) return true;
    const bodyPaths = [
      body.getAttribute("d"),
      "M8 134C49 130 67 112 80 78C97 29 129 7 167 15C207 22 229 56 215 88C206 111 180 112 167 97C151 76 174 63 188 82C163 72 176 104 198 87C224 58 180 17 143 47C110 75 104 116 140 134Z",
      "M8 134C49 131 75 111 95 87C123 57 161 47 194 69C222 87 234 112 221 131C213 141 191 143 181 132C168 118 181 104 196 113C180 107 189 129 207 123C223 112 197 79 163 89C129 98 127 123 158 137Z",
      "M8 138C61 131 88 126 114 125C149 122 185 126 212 132C239 135 255 137 270 141C268 145 243 149 226 145C208 143 200 139 187 139C203 137 225 142 239 140C223 134 194 132 170 134C136 133 116 142 158 145Z",
    ];
    const foamPaths = [
      foam.getAttribute("d"),
      "M131 24C165 5 201 27 211 54C227 87 201 113 179 102C161 93 170 75 185 80",
      "M148 68C180 57 212 86 219 110C228 135 205 145 187 133C173 124 182 109 195 115",
      "M140 130C177 126 207 135 232 137C257 136 274 143 292 143C304 142 316 147 326 147",
    ];
    for (let i = 0; i < 28; i++) {
      const drop = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      const x = 190 + Math.random() * 30;
      drop.setAttribute("cx", String(x));
      drop.setAttribute("cy", "124");
      drop.setAttribute("rx", String(1.5 + Math.random() * 2.5));
      drop.setAttribute("ry", String(2 + Math.random() * 3));
      drop.setAttribute("fill", i % 3 ? "#fffaf0" : "#9dcdd4");
      start.querySelector(".splash-layer").append(drop);
      const distance = 35 + Math.random() * 100;
      const height = 15 + Math.random() * 65;
      animate(drop, [
        { transform: "translate(0,0) scale(.4)", opacity: 0 },
        { transform: `translate(${distance * .35}px,${-height}px) scale(1)`, opacity: .9, offset: .4 },
        { transform: `translate(${distance}px,16px) scale(.5)`, opacity: 0 },
      ], { duration: 650 + Math.random() * 300, delay: 650 + Math.random() * 180 });
    }
    const times = [0, .23, .56, 1];
    // Each morph has its own frame loop; all are cancelled together on teardown.
    const results = await Promise.all([
      morph(body, bodyPaths, times, 1250),
      morph(foam, foamPaths, times, 1250),
      animate(shade, [{ opacity: .8 }, { opacity: 0 }], { duration: 500, delay: 200 }),
      animate(waveArt, [
        { transform: "translateX(0)", opacity: 1 },
        { transform: "translateX(8px)", opacity: 1, offset: .6 },
        { transform: "translateX(145px)", opacity: 0 },
      ], { duration: 1750 }),
      animate(runoff, [
        { opacity: 0, transform: "translateX(60px) scale(.3,.5)" },
        { opacity: .85, transform: "translateX(80px) scale(1,.85)", offset: .25 },
        { opacity: .6, transform: "translateX(240px) scale(1.7,.45)", offset: .65 },
        { opacity: 0, transform: "translateX(620px) scale(2.4,.2)" },
      ], { duration: 1450, delay: 650, easing: "ease-in" }),
    ]);
    return results.every(Boolean);
  }

  start.addEventListener("click", async () => {
    if (started) return;
    started = true;
    start.classList.add("rolling");
    document.querySelector("#status").textContent = "開始";
    // Must run inside the tap so iOS lets audio start.
    if (parent !== window) parent.startMusic?.();
    if (await roll()) {
      start.classList.add("crashed");
      completeLevel();
    }
  });

  registerLevel({
    background: "#cfdadd",
    setup: () => animateScene(true),
    teardown: () => {
      if (started) start.classList.add("crashed");
      for (const motion of morphs) {
        cancelAnimationFrame(motion.frame);
        motion.cancel();
      }
      morphs.clear();
      for (const animation of animations) animation.cancel();
      animations.clear();
      start.querySelector(".splash-layer").replaceChildren();
      return animateScene(false);
    },
  });
})();
