(() => {
  "use strict";
  const scene = document.querySelector(".scene");
  const rain = document.querySelector(".rain");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const timers = new Set();
  let active = false;
  for (let i = 0; i < 65; i++) {
    const drop = document.createElement("i");
    drop.style.left = `${(i * 37.7) % 100}%`;
    drop.style.setProperty("--still-y", `${(i * 23.3) % 100}%`);
    drop.style.animationDuration = `${.8 + (i % 7) * .09}s`;
    drop.style.animationDelay = `${-(i % 13) * .17}s`;
    rain.append(drop);
  }
  function later(fn, delay) {
    const id = setTimeout(() => { timers.delete(id); if (active) fn(); }, delay);
    timers.add(id);
  }
  registerLevel({
    background: "#cfdcdc",
    setup: async () => {
      active = true;
      scene.classList.add("active");
      later(() => {
        scene.classList.add("clearing");
        if (parent !== window) parent.postMessage({ type: "wanwan:clear-weather" }, location.origin);
      }, 2500);
      later(() => {
        scene.classList.add("clear");
        document.querySelector("#status").textContent = "雨停了，太陽出來了。注意安全，感謝您的遊玩。";
        completeLevel();
      }, reduced.matches ? 4200 : 10500);
    },
    teardown: async () => {
      active = false;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      scene.classList.remove("active");
    },
  });
})();
