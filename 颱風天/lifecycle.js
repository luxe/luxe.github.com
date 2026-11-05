"use strict";

// Loaded before level styles so an embedded scene never flashes before setup.
document.documentElement.classList.toggle("embedded", parent !== window);
document.documentElement.dataset.phase = "ready";

// How far down an element must move (as a CSS length) so everything it
// paints, including SVG bleed drawn outside its viewBox to fill the screen,
// clears the bottom edge. Measure it while the element is at rest.
window.offscreenDrop = element => {
  try {
    const rect = element.getBoundingClientRect();
    let top = rect.top;
    const view = element instanceof SVGSVGElement ? element.viewBox.baseVal : null;
    if (view?.width && view.height) {
      const scale = Math.min(rect.width / view.width, rect.height / view.height);
      const offsetY = (rect.height - view.height * scale) / 2;
      top = Math.min(top, rect.top + offsetY + (element.getBBox().y - view.y) * scale);
    }
    return `${Math.ceil(Math.max(innerHeight * 1.1, innerHeight - top + 24))}px`;
  } catch {
    return "110vh";
  }
};

window.registerLevel = function ({ background, setup, teardown }) {
  const scene = document.querySelector(".scene");
  // Levels never need to know their position; the engine knows which frame is current.
  window.completeLevel = () => {
    scene.dispatchEvent(new CustomEvent("levelcomplete", { bubbles: true }));
    if (parent !== window) parent.postMessage({ type: "wanwan:complete" }, location.origin);
  };
  scene.inert = true;
  async function run(phase, animate) {
    document.documentElement.dataset.phase = phase;
    scene.inert = true;
    await animate();
    if (phase === "setup") {
      document.documentElement.dataset.phase = "play";
      scene.inert = false;
      scene.querySelector("[autofocus]")?.focus({ preventScroll: true });
    } else {
      // Inside the game the engine fades this frame out and removes it, so
      // anything that stays put (a backdrop, a table) fades instead of vanishing.
      document.documentElement.dataset.phase = parent !== window ? "gone" : "hidden";
    }
  }
  window.levelLifecycle = {
    background,
    setup: () => run("setup", setup),
    teardown: () => run("teardown", teardown),
  };
  if (parent === window) {
    Promise.all([document.fonts.ready, ...Array.from(document.images, image => image.decode())])
      .then(() => window.levelLifecycle.setup())
      .catch(cause => {
        console.error("Unable to set up Wanwan level", cause);
        document.querySelector("#status").textContent = "This scene could not load. Please reload the page.";
      });
  }
};
