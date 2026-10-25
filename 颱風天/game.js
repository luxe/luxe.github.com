(() => {
  "use strict";

  // Development-only level picker. Set false before publishing.
  const SHOW_ADMIN = false;
  // Play order. Each name is a folder under levels/; reorder, add, or remove freely.
  // The intro always plays first.
  const ORDER = [
    
    
    // go outside
    "tv", "sandwich", "elevator", "umbrella",
    
    // travel outside
    "puddles", "cones", "taiwan", "bike",
    
    // go to metro
    "card", "metro",
    
    // go to store
    "store", "money", "purse", "cat",
    
    // get a tea
    "tea",
    
    // go to the temple
    "fruit", "incense", "jiaobei", "fortune", "temple",

    // street market
    "fish", "ufo", "lottery"];

  const levels = ["intro", ...ORDER].map(name => ({ name, url: `./levels/${name}/index.html` }));
  const game = document.querySelector("#game");
  const error = document.querySelector("#error");
  const music = document.querySelector("#music");
  const rain = document.querySelector("#rain");
  const winSounds = [...document.querySelectorAll(".win-sound")];
  let nextWinSound = 0;
  const admin = document.querySelector("#admin");
  const levelPicker = document.querySelector("#admin-level");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let musicFade = 0;

  window.setMetroListening = listening => {
    if (listening && game.dataset.level !== "metro") return;
    cancelAnimationFrame(musicFade);
    const from = music.volume;
    const target = listening ? 0.12 : 0.6;
    const start = performance.now();
    function fade(now) {
      const progress = Math.max(0, Math.min(1, (now - start) / 240));
      music.volume = from + (target - from) * progress;
      if (progress < 1) musicFade = requestAnimationFrame(fade);
    }
    musicFade = requestAnimationFrame(fade);
  };

  // Called synchronously from the intro's click so browsers allow playback.
  window.startMusic = () => {
    if (!music.paused) return;
    music.volume = 0.6;
    music.play().catch(cause => console.warn("Background music could not start", cause));
  };
  window.startRain = () => {
    if (!rain.paused) return;
    rain.play().catch(cause => console.warn("Rain sound could not start", cause));
  };
  function playWinSound() {
    if (!winSounds.length) return;
    const winSound = winSounds[nextWinSound];
    nextWinSound = (nextWinSound + 1) % winSounds.length;
    winSound.currentTime = 0;
    winSound.play().catch(cause => console.warn("Win sound could not play", cause));
  }
  let current = null;
  let index = 0;
  let busy = true;

  function reportError(cause) {
    console.error("Unable to load Wanwan level", cause);
    error.textContent = "This scene could not load. Please reload the page to try again.";
    error.hidden = false;
    if (SHOW_ADMIN) levelPicker.disabled = false;
  }

  async function loadLevel(level) {
    const frame = document.createElement("iframe");
    frame.className = "level-frame";
    frame.title = level.name;
    frame.inert = true;
    frame.setAttribute("aria-hidden", "true");
    let timer;
    try {
      await Promise.race([
        new Promise((resolve, reject) => {
          frame.addEventListener("load", async () => {
            try {
              const doc = frame.contentDocument;
              if (!doc?.querySelector(".scene") || !frame.contentWindow.levelLifecycle) {
                throw new Error(`Invalid level: ${level.url}`);
              }
              frame.title = doc.title || level.name;
              await Promise.all([
                doc.fonts.ready,
                ...Array.from(doc.images, image => image.decode()),
              ]);
              resolve();
            } catch (cause) {
              reject(cause);
            }
          }, { once: true });
          frame.addEventListener("error", () => reject(new Error(`Failed loading ${level.url}`)), { once: true });
          frame.src = level.url;
          game.append(frame);
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Timed out loading ${level.url}`)), 15000);
        }),
      ]);
      return frame;
    } catch (cause) {
      frame.remove();
      throw cause;
    } finally {
      clearTimeout(timer);
    }
  }

  async function showLevel(nextIndex) {
    const next = await loadLevel(levels[nextIndex]);
    const previous = current;
    const lifecycle = next.contentWindow.levelLifecycle;
    try {
      if (previous) {
        game.dataset.phase = "teardown";
        previous.inert = true;
        previous.classList.remove("active");
        await previous.contentWindow.levelLifecycle.teardown();
        previous.setAttribute("aria-hidden", "true");
      }
      game.dataset.phase = "background";
      await game.animate([
        { backgroundColor: getComputedStyle(game).backgroundColor },
        { backgroundColor: lifecycle.background },
      ], { duration: reducedMotion.matches || !previous ? 0 : 650, easing: "ease-in-out" }).finished;
      game.style.backgroundColor = lifecycle.background;
      previous?.remove();
      game.dataset.phase = "setup";
      next.style.opacity = "1";
      next.removeAttribute("aria-hidden");
      await lifecycle.setup();
    } catch (cause) {
      next.remove();
      throw cause;
    }
    next.inert = false;
    next.classList.add("active");
    current = next;
    index = nextIndex;
    game.dataset.level = levels[index].name;
    game.dataset.phase = "play";
    next.contentWindow.focus();
    busy = false;
    delete game.dataset.complete;
    error.hidden = true;
    levelPicker.value = String(index);
    if (SHOW_ADMIN) levelPicker.disabled = false;
  }

  addEventListener("message", async event => {
    if (event.origin !== location.origin || event.source !== current?.contentWindow ||
        event.data?.type !== "wanwan:complete" || busy) return;
    busy = true;
    levelPicker.disabled = true;
    // The intro's start tap is not a beaten level.
    if (index > 0) playWinSound();
    if (index === levels.length - 1) {
      game.dataset.complete = "true";
      if (SHOW_ADMIN) levelPicker.disabled = false;
      return;
    }
    try {
      if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 350));
      await showLevel(index + 1);
    } catch (cause) {
      reportError(cause);
    }
  });

  if (SHOW_ADMIN) {
    for (const [levelIndex, level] of levels.entries()) {
      const option = document.createElement("option");
      option.value = String(levelIndex);
      option.textContent = level.name;
      levelPicker.append(option);
    }
    admin.hidden = false;
    levelPicker.addEventListener("change", async () => {
      const nextIndex = Number(levelPicker.value);
      busy = true;
      levelPicker.disabled = true;
      window.startMusic();
      try {
        await showLevel(nextIndex);
      } catch (cause) {
        reportError(cause);
      }
    });
  }

  showLevel(0).catch(reportError);
})();
