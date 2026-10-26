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
    "puddles", "cones", "taiwan", "bike", "powerlines", "drain",
    
    // go to metro
    "card", "metro",
    
    // go to store
    "store", "money", "purse", "cat",
    
    // get a tea
    "tea",
    
    // go to the temple
    "fruit", "incense", "jiaobei", "fortune", "temple",

    // street market
    "fish", "ufo", "lottery", "mahjong",

    // A quiet cup of tea, then the storm clears.
    "teacup", "ending"];

  // Every short sound effect, decoded at startup so it plays instantly
  // (see audio.js). Add new effects here.
  const SOUND_EFFECTS = [
    "./assets/snd/win1.mp3",
    "./levels/tv/assets/click.mp3",
    "./levels/sandwich/assets/bite.mp3",
    "./levels/elevator/assets/click.mp3", "./levels/elevator/assets/ding.mp3", "./levels/elevator/assets/elevator.mp3",
    "./levels/elevator/assets/moving.mp3",
    "./levels/umbrella/assets/open.mp3",
    "./levels/puddles/assets/splash.mp3",
    "./levels/bike/assets/bell.mp3",
    "./levels/card/asset/gate.mp3",
    "./levels/money/assets/register.mp3",
    "./levels/cat/assets/meow.mp3",
    "./levels/temple/assets/flame.mp3",
    "./levels/jiaobei/assets/dropped.mp3",
    "./levels/purse/assets/zipper.mp3", "./levels/purse/assets/coin.mp3",
    "./levels/powerlines/assets/ambulance.mp3", "./levels/powerlines/assets/jolt.mp3",
    "./levels/store/assets/chime.mp3",
    "./levels/tea/assets/pour.mp3", "./levels/tea/assets/shake.mp3",
    "./levels/fish/assets/bubbles.mp3",
    "./levels/ufo/assets/ready.mp3",
    "./levels/lottery/assets/win.mp3",
    "./levels/mahjong/assets/156668__rtb45__mahjong.mp3",
    "./levels/drain/assets/drain.mp3",
  ];
  // Long loops stay <audio> elements (decoding them would cost tens of MB);
  // downloading them early still lets them start right away.
  const PREFETCH = [
    "./levels/cones/assets/truck.mp3",
    "./levels/temple/assets/fire_bg.mp3",
    ...["red", "orange", "yellow", "green", "blue"].map(color => `./levels/metro/assets/${color}.mp3`),
  ];
  // Started once the first screen is up so it does not slow that screen down.
  function preloadSounds() {
    window.wanwanAudio.preload(SOUND_EFFECTS).then(() => {
      window.wanwanAudio.prefetch(PREFETCH);
      // Let the browser buffer the start of the long loops ahead of time.
      for (const loop of [music, templeMusic, rain]) loop.preload = "auto";
    });
  }

  const levels = ["intro", ...ORDER].map(name => ({ name, url: `./levels/${name}/index.html` }));
  const game = document.querySelector("#game");
  const error = document.querySelector("#error");
  const music = document.querySelector("#music");
  const rain = document.querySelector("#rain");
  const templeMusic = document.querySelector("#temple-music");
  const winSound = window.wanwanAudio.sound("./assets/snd/win1.mp3");
  const admin = document.querySelector("#admin");
  const levelPicker = document.querySelector("#admin-level");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // Background loops for each level, crossfaded during transitions.
  const RAIN_LEVELS = new Set(["umbrella", "puddles", "cones", "taiwan", "bike", "powerlines", "drain", "ending"]);
  const TEMPLE_LEVELS = new Set(["fruit", "incense", "jiaobei", "fortune", "temple"]);
  // The metro's train songs are easier to hear with no music at all.
  const QUIET_LEVELS = new Set(["metro"]);
  const FADE_MS = 1500;
  const tracks = [
    { element: music, volume: 0.6, wanted: name => !TEMPLE_LEVELS.has(name) && !QUIET_LEVELS.has(name) },
    { element: templeMusic, volume: 0.6, wanted: name => TEMPLE_LEVELS.has(name) },
    { element: rain, volume: 1, wanted: name => RAIN_LEVELS.has(name) },
  ].map(track => ({ ...track, level: 0, target: 0, gain: null, fade: 0 }));
  let soundStarted = false;
  let soundLevel = "intro";
  // iOS ignores <audio>.volume, so there the loops are routed through Web
  // Audio gain nodes to keep fades and per-track volume working.
  const volumeWorks = (() => { const probe = new Audio(); probe.volume = 0.5; return probe.volume === 0.5; })();
  function routeThroughWebAudio(track) {
    if (volumeWorks || track.gain) return;
    try {
      const context = window.wanwanAudio.engine.context();
      if (!context) return;
      track.gain = context.createGain();
      track.gain.gain.value = 0;
      context.createMediaElementSource(track.element).connect(track.gain).connect(context.destination);
    } catch (cause) {
      track.gain = null;
      console.warn("Background loop could not use Web Audio", cause);
    }
  }
  function applyLevel(track) {
    const value = Math.max(0, Math.min(1, track.level * track.volume));
    if (track.gain) track.gain.gain.value = value;
    else track.element.volume = value;
  }
  function fadeTrack(track, target, duration) {
    track.target = target;
    cancelAnimationFrame(track.fade);
    if (target > 0) {
      keepPlaying.add(track.element);
      if (track.element.paused) {
        track.element.play().catch(cause => console.warn("Background loop could not start", track.element.id, cause));
      }
    } else {
      keepPlaying.delete(track.element);
    }
    const from = track.level;
    const start = performance.now();
    const step = now => {
      const progress = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      track.level = from + (target - from) * progress;
      applyLevel(track);
      if (progress < 1) {
        track.fade = requestAnimationFrame(step);
      } else if (target === 0) {
        // Paused, not rewound, so the music picks up where it left off.
        track.element.pause();
      }
    };
    if (duration > 0 && document.visibilityState === "visible") track.fade = requestAnimationFrame(step);
    else step(start + duration);
  }
  function setSoundscape(name, duration = FADE_MS) {
    soundLevel = name;
    if (!soundStarted) return;
    for (const track of tracks) {
      const target = track.wanted(name) ? 1 : 0;
      if (target !== track.target) fadeTrack(track, target, duration);
    }
  }
  // Loops that should keep going. iOS can pause them on its own (another
  // video with sound, a call, Siri, leaving the app); they are resumed on
  // the next tap or key, or when the page is visible again.
  const keepPlaying = new Set();
  function resumeLoops() {
    for (const loop of keepPlaying) {
      if (loop.paused) loop.play().catch(() => {});
    }
  }
  function watchForResume(doc) {
    for (const type of ["pointerup", "touchend", "keydown"]) {
      doc.addEventListener(type, resumeLoops, { capture: true, passive: true });
    }
  }
  watchForResume(document);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resumeLoops();
  });
  for (const { element } of tracks) {
    element.addEventListener("pause", () => {
      if (keepPlaying.has(element) && document.visibilityState === "visible") {
        setTimeout(resumeLoops, 400);
      }
    });
  }

  // Called synchronously from the intro's tap so browsers allow playback.
  window.startMusic = () => {
    if (soundStarted) return;
    soundStarted = true;
    window.wanwanAudio.unlock();
    for (const track of tracks) {
      routeThroughWebAudio(track);
      applyLevel(track);
      // Start every loop inside the tap so iOS lets it play later without one.
      if (!track.wanted(soundLevel) && track.element.paused) {
        track.element.muted = true;
        track.element.play().then(() => {
          if (track.target === 0) track.element.pause();
        }, () => {}).finally(() => { track.element.muted = false; });
      }
    }
    setSoundscape(soundLevel, 0);
  };

  function playWinSound() {
    winSound.stop();
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
    frame.allow = "accelerometer; gyroscope";
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
              watchForResume(doc);
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

  // The next level is built in a hidden frame while the current one is being
  // played, so beating a level goes straight into the transition. Levels stay
  // idle until setup, so a waiting frame costs nothing but memory.
  let preloaded = null;
  let preloadTimer = 0;
  function discardPreload() {
    clearTimeout(preloadTimer);
    const waiting = preloaded;
    preloaded = null;
    waiting?.frame.then(frame => frame.remove(), () => {});
  }
  function preloadNext() {
    const nextIndex = index + 1;
    if (nextIndex >= levels.length || preloaded?.index === nextIndex) return;
    discardPreload();
    const frame = loadLevel(levels[nextIndex]);
    frame.catch(cause => console.warn("Preloading the next level failed; it will load when needed", cause));
    preloaded = { index: nextIndex, frame };
  }
  function takeLevel(nextIndex) {
    clearTimeout(preloadTimer);
    if (preloaded?.index === nextIndex) {
      const { frame } = preloaded;
      preloaded = null;
      return frame.catch(() => loadLevel(levels[nextIndex]));
    }
    discardPreload();
    return loadLevel(levels[nextIndex]);
  }

  async function showLevel(nextIndex) {
    const next = await takeLevel(nextIndex);
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
      const nextName = levels[nextIndex].name;
      const quietLevel = QUIET_LEVELS.has(nextName);
      if (!quietLevel) setSoundscape(nextName);
      await game.animate([
        { backgroundColor: getComputedStyle(game).backgroundColor },
        { backgroundColor: lifecycle.background },
      ], { duration: reducedMotion.matches || !previous ? 0 : 650, easing: "ease-in-out" }).finished;
      game.style.backgroundColor = lifecycle.background;
      previous?.remove();
      game.dataset.phase = "setup";
      next.style.opacity = "1";
      next.removeAttribute("aria-hidden");
      if (quietLevel) setSoundscape(nextName, 3000);
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
    // Wait a moment so building the next level never competes with setup.
    preloadTimer = setTimeout(preloadNext, 400);
  }

  addEventListener("message", async event => {
    if (event.origin !== location.origin || event.source !== current?.contentWindow) return;
    if (event.data?.type === "wanwan:clear-weather" && levels[index].name === "ending") {
      fadeTrack(tracks.find(track => track.element === rain), 0, reducedMotion.matches ? 1000 : 5000);
      return;
    }
    if (event.data?.type !== "wanwan:complete" || busy) return;
    busy = true;
    levelPicker.disabled = true;
    // The intro's start tap is not a beaten level.
    if (index > 0 && levels[index].name !== "ending") playWinSound();
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

  showLevel(0).catch(reportError).finally(preloadSounds);
})();
