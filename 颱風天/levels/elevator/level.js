(() => {
  "use strict";

  const scene = document.querySelector(".scene");
  const car = document.querySelector(".car");
  const panelArrival = document.querySelector(".panel-arrival");
  const floorsPanel = document.querySelector(".floors");
  const outside = document.querySelector(".outside");
  const plaque = document.querySelector(".plaque");
  const floorNumber = document.querySelector(".floor-number");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const rideSound = wanwanAudio.sound("./assets/elevator.mp3");
  const clickSound = wanwanAudio.sound("./assets/click.mp3");
  const dingSound = wanwanAudio.sound("./assets/ding.mp3");

  const FLOORS = 20;
  const START = 5;
  const DOOR_MS = 1000;
  // The ride sound hums for ~7s and chimes at the end; arrive just as it settles.
  const RIDE_MS = 7000;

  let firstFloorLit = false;
  let riding = false;
  let completed = false;
  const flashTimers = new WeakMap();
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Real panels read bottom-up: 1 2 on the bottom row, 19 20 on top.
  for (let row = FLOORS / 2; row >= 1; row--) {
    for (const floor of [row * 2 - 1, row * 2]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "floor";
      button.dataset.floor = String(floor);
      button.textContent = String(floor);
      button.setAttribute("aria-label", `${floor}樓`);
      button.setAttribute("aria-pressed", "false");
      floorsPanel.append(button);
    }
  }
  const firstButton = floorsPanel.querySelector('[data-floor="1"]');

  function flash(button) {
    clearTimeout(flashTimers.get(button));
    button.classList.add("lit");
    flashTimers.set(button, setTimeout(() => button.classList.remove("lit"), 450));
  }

  function playSound(sound) {
    sound.stop();
    sound.play().catch(cause => console.warn("Elevator sound could not play", cause));
  }

  async function ride() {
    riding = true;
    scene.classList.add("riding");
    status.textContent = "關門";
    car.classList.add("closed");
    playSound(dingSound);
    await wait(reducedMotion.matches ? 100 : DOOR_MS + 150);

    playSound(rideSound);
    scene.classList.add("moving");
    if (!reducedMotion.matches) {
      car.animate([
        { transform: "translateY(0)" }, { transform: "translateY(.6%)", offset: .04 }, { transform: "translateY(0)", offset: .1 },
        { transform: "translateY(0)", offset: .92 }, { transform: "translateY(-.6%)", offset: .96 }, { transform: "translateY(0)" },
      ], { duration: RIDE_MS, easing: "ease-in-out" });
    }
    const step = RIDE_MS / START;
    for (let floor = START - 1; floor >= 1; floor--) {
      await wait(step);
      floorNumber.textContent = String(floor);
      status.textContent = `${floor}樓`;
    }
    await wait(step);
    scene.classList.remove("moving");
    firstButton.classList.remove("lit");
    firstButton.setAttribute("aria-pressed", "false");
    outside.dataset.floor = "1";
    plaque.textContent = "1樓";
    car.classList.remove("closed");
    playSound(dingSound);
    status.textContent = "1樓，開門";
    await wait(reducedMotion.matches ? 0 : DOOR_MS + 300);
    complete();
  }

  function complete() {
    completed = true;
    scene.classList.add("complete");
    for (const button of scene.querySelectorAll("button")) button.disabled = true;
    completeLevel();
  }

  scene.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || riding || completed) return;
    playSound(clickSound);
    if (button.dataset.floor === "1") {
      firstFloorLit = true;
      clearTimeout(flashTimers.get(button));
      button.classList.add("lit");
      button.setAttribute("aria-pressed", "true");
      status.textContent = "1樓";
    } else if (button.dataset.action === "close" && firstFloorLit) {
      flash(button);
      ride();
    } else {
      flash(button);
    }
  });

  async function animateScene(entering) {
    const fast = reducedMotion.matches;
    const carFrames = entering ? [
      { transform: "translateY(-110vh)" },
      { transform: "translateY(10px)", offset: .66 },
      { transform: "translateY(-4px)", offset: .85 },
      { transform: "translateY(0)" },
    ] : [
      { transform: "translateY(0)" },
      { transform: "translateY(-14px)", offset: .25 },
      { transform: "translateY(110vh)" },
    ];
    const panelFrames = entering ? [
      { transform: "translateX(60cqw) rotate(8deg)" },
      { transform: "translateX(-2cqw) rotate(-1.5deg)", offset: .7 },
      { transform: "translateX(.6cqw) rotate(.4deg)", offset: .88 },
      { transform: "translateX(0) rotate(0deg)" },
    ] : [{ transform: "none" }, { transform: "none" }];
    const options = { duration: fast ? 0 : entering ? 1050 : 750, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" };
    const animations = [
      car.animate(carFrames, options),
      panelArrival.animate(panelFrames, { ...options, delay: fast || !entering ? 0 : 450, duration: fast ? 0 : 750 }),
    ];
    await Promise.all(animations.map(animation => animation.finished));
    car.style.transform = entering ? "" : "translateY(110vh)";
    for (const animation of animations) animation.cancel();
  }

  registerLevel({
    background: "#d9e1e8",
    setup: () => animateScene(true),
    teardown: () => {
      for (const sound of [rideSound, clickSound, dingSound]) sound.stop();
      return animateScene(false);
    },
  });
})();
