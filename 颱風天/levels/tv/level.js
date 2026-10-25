(() => {
  "use strict";

  const scene = document.querySelector(".scene");
  const tvArrival = document.querySelector(".tv-arrival");
  const remoteArrival = document.querySelector(".remote-arrival");
  const tv = document.querySelector(".tv");
  const picture = document.querySelector(".picture");
  const spark = document.querySelector(".spark");
  const video = document.querySelector("video");
  const power = document.querySelector(".power");
  const status = document.querySelector("#status");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const clickSound = new Audio("./assets/click.mp3");
  clickSound.preload = "auto";

  let on = false;
  let busy = false;
  let completed = false;

  // iOS pauses all other page audio (the background music) whenever a video
  // plays with sound, so the picture stays muted and its soundtrack is a
  // separate audio element kept in step with it.
  const tvSound = new Audio("./assets/tv-sound.mp3");
  tvSound.preload = "auto";
  tvSound.volume = .9;
  video.muted = true;

  function syncSound() {
    if (!on || video.paused) return;
    const target = video.currentTime;
    if (!Number.isFinite(tvSound.duration) || target >= tvSound.duration) {
      if (!tvSound.paused) tvSound.pause();
      return;
    }
    if (Math.abs(tvSound.currentTime - target) > .25) tvSound.currentTime = target;
    if (tvSound.paused) tvSound.play().catch(() => {});
  }
  video.addEventListener("timeupdate", syncSound);
  video.addEventListener("seeked", syncSound);
  video.addEventListener("playing", syncSound);
  video.addEventListener("waiting", () => tvSound.pause());

  function play() {
    video.muted = true;
    try { tvSound.currentTime = video.currentTime; } catch {}
    // Started inside the tap so iOS allows the sound.
    tvSound.play().catch(cause => console.warn("TV sound could not play", cause));
    return video.play().catch(cause => console.warn("TV video could not play", cause));
  }

  function stop() {
    video.pause();
    tvSound.pause();
  }

  function run(target, frames, duration) {
    if (reducedMotion.matches) return Promise.resolve();
    return target.animate(frames, { duration, easing: "cubic-bezier(.3,.7,.4,1)" }).finished;
  }

  // Old-CRT style: the picture blooms out of a bright line, and folds back into a dot.
  async function turnOn() {
    on = true;
    tv.classList.add("on");
    play();
    status.textContent = "電視開了";
    await run(picture, [
      { transform: "scale(1, .015)", filter: "brightness(4)" },
      { transform: "scale(1, .015)", filter: "brightness(4)", offset: .25 },
      { transform: "scale(1, 1.04)", filter: "brightness(1.6)", offset: .8 },
      { transform: "scale(1, 1)", filter: "brightness(1)" },
    ], 520);
  }

  async function turnOff() {
    on = false;
    status.textContent = "電視關了";
    await run(picture, [
      { transform: "scale(1, 1)", filter: "brightness(1)" },
      { transform: "scale(1, .015)", filter: "brightness(4)", offset: .5 },
      { transform: "scale(0, .015)", filter: "brightness(5)" },
    ], 380);
    tv.classList.remove("on");
    stop();
    await run(spark, [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(.2)" },
    ], 520);
  }

  function complete() {
    completed = true;
    scene.classList.add("complete");
    power.disabled = true;
    status.textContent = "電視關了";
    completeLevel();
  }

  power.addEventListener("click", async () => {
    if (completed) return;
    clickSound.currentTime = 0;
    clickSound.play().catch(cause => console.warn("Click sound could not play", cause));
    if (busy) return;
    busy = true;
    power.setAttribute("aria-pressed", String(!on));
    if (!on) {
      await turnOn();
      busy = false;
    } else {
      await turnOff();
      complete();
    }
  });

  async function animateScene(entering) {
    const fast = reducedMotion.matches;
    const tvFrames = entering ? [
      { transform: "translateY(-110vh) rotate(-6deg)" },
      { transform: "translateY(12px) rotate(1.5deg)", offset: .66 },
      { transform: "translateY(-4px) rotate(-.5deg)", offset: .85 },
      { transform: "translateY(0) rotate(0deg)" },
    ] : [
      { transform: "translateY(0) rotate(0deg)" },
      { transform: "translateY(14px) rotate(1deg)", offset: .25 },
      { transform: "translateY(-110vh) rotate(-6deg)" },
    ];
    const remoteFrames = entering ? [
      { transform: "translateY(110vh) rotate(10deg)" },
      { transform: "translateY(-14px) rotate(-2deg)", offset: .66 },
      { transform: "translateY(4px) rotate(.5deg)", offset: .85 },
      { transform: "translateY(0) rotate(0deg)" },
    ] : [
      { transform: "translateY(0) rotate(0deg)" },
      { transform: "translateY(-16px) rotate(-2deg)", offset: .25 },
      { transform: "translateY(110vh) rotate(10deg)" },
    ];
    const options = { duration: fast ? 0 : entering ? 1050 : 750, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" };
    const animations = [
      tvArrival.animate(tvFrames, options),
      remoteArrival.animate(remoteFrames, { ...options, delay: fast ? 0 : entering ? 180 : 80 }),
    ];
    await Promise.all(animations.map(animation => animation.finished));
    for (const [element, animation] of [[tvArrival, animations[0]], [remoteArrival, animations[1]]]) {
      element.style.transform = entering ? "" : getComputedStyle(element).transform;
      animation.cancel();
    }
  }

  registerLevel({
    background: "#e7dbe8",
    setup: () => animateScene(true),
    teardown: () => {
      stop();
      return animateScene(false);
    },
  });
})();
