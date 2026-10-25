"use strict";

// Loaded before level styles so an embedded scene never flashes before setup.
document.documentElement.classList.toggle("embedded", parent !== window);
document.documentElement.dataset.phase = "ready";

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
      document.documentElement.dataset.phase = "hidden";
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
