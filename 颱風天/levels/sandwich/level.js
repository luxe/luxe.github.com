(() => {
  "use strict";

  const SVG = "http://www.w3.org/2000/svg";
  const scene = document.querySelector(".scene");
  const arrival = document.querySelector(".plate-arrival");
  const sandwich = document.querySelector(".sandwich");
  const body = document.querySelector(".sandwich-body");
  const crumbs = document.querySelector(".crumbs");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const biteSound = wanwanAudio.sound("./assets/bite.mp3");

  // Each bite is one or more jaw-sized circles cut from the sandwich.
  const bites = [
    [{ x: 200, y: 356, r: 82 }],
    [{ x: 52, y: 92, r: 84 }, { x: 118, y: 236, r: 46 }],
    [{ x: 350, y: 92, r: 88 }, { x: 214, y: 248, r: 74 }],
    [{ x: 200, y: 150, r: 170 }],
  ];
  let eaten = 0;
  let completed = false;

  function circle(parent, x, y, r) {
    const node = document.createElementNS(SVG, "circle");
    node.setAttribute("cx", x.toFixed(1));
    node.setAttribute("cy", y.toFixed(1));
    node.setAttribute("r", r.toFixed(1));
    parent.append(node);
    return node;
  }

  // Bite outlines are scalloped like tooth marks on the bread; filling layers are
  // cut slightly smaller so ham, egg, and lettuce peek out of each bitten edge.
  function addBite(bite) {
    for (const group of document.querySelectorAll(".bites")) {
      const inset = Number(group.dataset.inset);
      for (const { x, y, r } of bite) {
        const radius = r - inset;
        circle(group, x, y, radius);
        if (inset) continue;
        const teeth = Math.round((Math.PI * 2 * r) / 11);
        for (let i = 0; i < teeth; i++) {
          const angle = (i / teeth) * Math.PI * 2;
          circle(group, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 3.6);
        }
      }
    }
  }

  function scatterCrumbs(bite) {
    const colors = ["#f3dfba", "#e9cf9f", "#f8ebd2", "#dfc08e"];
    for (const { x, y, r } of bite) {
      const count = bite.length > 1 ? 3 : 5;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.min(r, 70) * (.35 + Math.random() * .55);
        let cx = x + Math.cos(angle) * distance - 200;
        let cy = y + Math.sin(angle) * distance - 200;
        const fromCenter = Math.hypot(cx, cy);
        if (fromCenter > 150) {
          cx *= 150 / fromCenter;
          cy *= 150 / fromCenter;
        }
        cx += 200;
        cy += 200;
        const size = 3 + Math.random() * 4;
        const crumb = document.createElementNS(SVG, "rect");
        crumb.setAttribute("x", (cx - size / 2).toFixed(1));
        crumb.setAttribute("y", (cy - size / 2).toFixed(1));
        crumb.setAttribute("width", size.toFixed(1));
        crumb.setAttribute("height", (size * (.7 + Math.random() * .5)).toFixed(1));
        crumb.setAttribute("rx", (size * .35).toFixed(1));
        crumb.setAttribute("fill", colors[i % colors.length]);
        crumb.setAttribute("stroke", "#d2b183");
        crumb.setAttribute("stroke-width", ".7");
        crumb.setAttribute("transform", `rotate(${Math.round(Math.random() * 90)} ${cx.toFixed(1)} ${cy.toFixed(1)})`);
        const holder = document.createElementNS(SVG, "g");
        holder.append(crumb);
        crumbs.append(holder);
        if (!reducedMotion.matches) {
          holder.animate([
            { transform: `translate(${(x - cx) * .6}px, ${(y - cy) * .6}px) scale(.3)`, opacity: 0 },
            { transform: "translate(0, -6px)", opacity: 1, offset: .6 },
            { transform: "translate(0, 0)", opacity: 1 },
          ], { duration: 420 + Math.random() * 200, easing: "cubic-bezier(.3,.7,.4,1)" });
        }
      }
    }
  }

  function shake() {
    if (reducedMotion.matches) return Promise.resolve();
    return body.animate([
      { transform: "translate(0, 0) rotate(0deg) scale(1)" },
      { transform: "translate(-4px, 3px) rotate(-2.5deg) scale(.975)", offset: .2 },
      { transform: "translate(4px, -2px) rotate(2deg) scale(.985)", offset: .45 },
      { transform: "translate(-2px, 1px) rotate(-1deg) scale(.995)", offset: .7 },
      { transform: "translate(0, 0) rotate(0deg) scale(1)" },
    ], { duration: 340, easing: "ease-out" }).finished;
  }

  function complete() {
    completed = true;
    scene.classList.add("complete");
    sandwich.setAttribute("aria-disabled", "true");
    status.textContent = "吃完了！";
    completeLevel();
  }

  function bite() {
    if (completed || eaten >= bites.length) return;
    const current = bites[eaten++];
    biteSound.currentTime = 0;
    biteSound.play().catch(cause => console.warn("Bite sound could not play", cause));
    addBite(current);
    scatterCrumbs(current);
    sandwich.setAttribute("aria-label", eaten < bites.length ? `三明治 ${eaten} of ${bites.length} bites eaten` : "三明治 eaten");
    if (eaten < bites.length) {
      status.textContent = `Bite ${eaten}.`;
      shake();
    } else {
      body.style.display = "none";
      setTimeout(complete, reducedMotion.matches ? 0 : 500);
    }
  }

  body.addEventListener("click", bite);
  sandwich.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    bite();
  });

  async function animateScene(entering) {
    const frames = entering ? [
      { transform: "translateY(-110vh) rotate(-8deg)", offset: 0 },
      { transform: "translateY(14px) rotate(2deg)", offset: .66 },
      { transform: "translateY(-5px) rotate(-.6deg)", offset: .85 },
      { transform: "translateY(0) rotate(0deg)", offset: 1 },
    ] : [
      { transform: "translateY(0) rotate(0deg)", offset: 0 },
      { transform: "translateY(-18px) rotate(-2deg)", offset: .25 },
      { transform: "translateY(110vh) rotate(8deg)", offset: 1 },
    ];
    const animation = arrival.animate(frames, {
      duration: reducedMotion.matches ? 0 : entering ? 1050 : 750,
      easing: "cubic-bezier(.4,0,.2,1)", fill: "both",
    });
    await animation.finished;
    arrival.style.transform = entering ? "" : "translateY(110vh)";
    animation.cancel();
  }

  registerLevel({
    background: "#f1dcc3",
    setup: () => animateScene(true),
    teardown: () => animateScene(false),
  });
})();
