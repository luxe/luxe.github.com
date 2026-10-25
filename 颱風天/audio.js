"use strict";

// Shared sound-effect player built on Web Audio.
//
// Sound effects are fetched and decoded once (the root page preloads every one
// at startup) and then start instantly from memory. Plain <audio> elements
// can't do that on iOS: it ignores preload and only starts downloading on the
// first play(), so effects used to arrive late.
//
// Level frames share the root page's engine (same origin), so the cache and the
// unlocked AudioContext carry across levels. A level opened directly gets its
// own engine.
//
//   const ding = wanwanAudio.sound("./assets/ding.mp3");   // relative to the caller
//   ding.play();  ding.pause();  ding.currentTime = 0;  ding.volume = .5;
//   wanwanAudio.play("./assets/flame.mp3");                 // fire-and-forget, overlaps
//   wanwanAudio.preload([...urls]);  wanwanAudio.prefetch([...urls]);
(() => {
  if (window.wanwanAudio) return;
  // Relative URLs resolve against the page that asks, even when the engine
  // lives in the root page.
  function facade(engine) {
    const base = () => document.baseURI;
    engine.watch(document);
    return {
      sound: (url, options) => engine.sound(url, { ...options, base: base(), owner: window }),
      play: (url, options) => engine.play(url, { ...options, base: base(), owner: window }),
      preload: urls => engine.preload(urls, base()),
      prefetch: urls => engine.prefetch(urls, base()),
      isLoaded: url => engine.isLoaded(url, base()),
      unlock: () => engine.unlock(),
      get state() { return engine.state; },
      engine,
    };
  }
  try {
    if (parent !== window && parent.wanwanAudio?.engine) {
      window.wanwanAudio = facade(parent.wanwanAudio.engine);
      return;
    }
  } catch {}

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const buffers = new Map();
  const prefetched = new Map();
  let context = null;

  // iOS: let Web Audio play with the ringer switch off, like the music does.
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch {}

  function getContext() {
    if (!context && AudioContextClass) {
      context = new AudioContextClass();
      if (context.state !== "running") context.resume().catch(() => {});
    }
    return context;
  }

  // Must run inside a user gesture on iOS/Safari; also recovers from
  // "interrupted" (calls, Siri, other media).
  function unlock() {
    const ctx = getContext();
    if (!ctx || ctx.state === "running") return;
    ctx.resume().catch(() => {});
    // Older iOS only unlocks after something actually starts in the gesture.
    try {
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 22050);
      source.connect(ctx.destination);
      source.start(0);
    } catch {}
  }

  const watched = new WeakSet();
  function watch(doc) {
    if (!doc || watched.has(doc)) return;
    watched.add(doc);
    for (const type of ["pointerdown", "touchstart", "touchend", "mousedown", "keydown", "click"]) {
      doc.addEventListener(type, unlock, { capture: true, passive: true });
    }
  }

  function resolveUrl(url, base) {
    return new URL(url, base || document.baseURI).href;
  }

  function decode(ctx, data) {
    return new Promise((resolve, reject) => {
      const result = ctx.decodeAudioData(data, resolve, reject);
      if (result && typeof result.then === "function") result.then(resolve, reject);
    });
  }

  function load(href) {
    let entry = buffers.get(href);
    if (entry) return entry.promise;
    entry = { buffer: null, promise: null };
    entry.promise = (async () => {
      const ctx = getContext();
      if (!ctx) throw new Error("Web Audio is not supported");
      const response = await fetch(href);
      if (!response.ok) throw new Error(`Failed loading ${href}: ${response.status}`);
      entry.buffer = await decode(ctx, await response.arrayBuffer());
      return entry.buffer;
    })();
    entry.promise.catch(cause => {
      buffers.delete(href);
      console.warn("Sound could not load", href, cause);
    });
    buffers.set(href, entry);
    return entry.promise;
  }

  class Sound extends EventTarget {
    constructor(href, { loop = false, volume = 1, owner = window } = {}) {
      super();
      this.href = href;
      this.owner = owner;
      this.loop = loop;
      this._volume = volume;
      this._offset = 0;
      this._source = null;
      this._gain = null;
      this._startedAt = 0;
      this._token = 0;
      this._wanted = false;
      load(href).catch(() => {});
    }
    get src() { return this.href; }
    get paused() { return !this._wanted; }
    get loaded() { return Boolean(buffers.get(this.href)?.buffer); }
    get duration() { return buffers.get(this.href)?.buffer?.duration ?? NaN; }
    get volume() { return this._volume; }
    set volume(value) {
      this._volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (this._gain) this._gain.gain.value = this._volume;
    }
    get currentTime() {
      if (!this._source) return this._offset;
      const elapsed = context.currentTime - this._startedAt;
      const duration = this.duration;
      return this.loop && duration ? elapsed % duration : Math.min(elapsed, duration || elapsed);
    }
    set currentTime(value) {
      this._offset = Math.max(0, Number(value) || 0);
      if (this._source) this._start(this._offset);
    }
    async play() {
      unlock();
      const token = ++this._token;
      this._wanted = true;
      if (!buffers.get(this.href)?.buffer) await load(this.href);
      const ctx = getContext();
      if (ctx.state !== "running") {
        await Promise.race([ctx.resume().catch(() => {}), new Promise(resolve => setTimeout(resolve, 300))]);
      }
      if (token !== this._token || !this._wanted) return;
      // A one-shot that can't play now is dropped rather than bursting out late.
      if (ctx.state !== "running" && !this.loop) {
        this._wanted = false;
        return;
      }
      if (!this._source) this._start(this._offset);
    }
    pause() {
      if (this._source) this._offset = this.currentTime;
      this._token++;
      this._wanted = false;
      this._stopSource();
    }
    // Pause and rewind.
    stop() {
      this.pause();
      this._offset = 0;
    }
    _stopSource() {
      const source = this._source;
      this._source = null;
      if (!source) return;
      source.onended = null;
      try { source.stop(); } catch {}
      source.disconnect();
      this._gain?.disconnect();
      this._gain = null;
    }
    _start(offset) {
      this._stopSource();
      const ctx = getContext();
      const buffer = buffers.get(this.href)?.buffer;
      if (!ctx || !buffer) return;
      const at = this.loop ? offset % buffer.duration : offset;
      if (at >= buffer.duration) {
        this._finish();
        return;
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = this.loop;
      gain.gain.value = this._volume;
      source.connect(gain).connect(ctx.destination);
      source.onended = () => {
        if (this._source === source) this._finish();
      };
      source.start(0, at);
      this._source = source;
      this._gain = gain;
      this._startedAt = ctx.currentTime - at;
      // Lets tests and tools observe playback in the page that asked for it.
      try {
        this.owner.dispatchEvent(new this.owner.CustomEvent("wanwansound", {
          detail: { href: this.href, name: this.href.split("/").pop(), time: this.owner.performance.now(), sound: this },
        }));
      } catch {}
    }
    _finish() {
      this._stopSource();
      this._wanted = false;
      this._offset = 0;
      this.dispatchEvent(new Event("ended"));
    }
  }

  const engine = {
    watch,
    unlock,
    sound(url, options) {
      return new Sound(resolveUrl(url, options?.base), options);
    },
    // A new overlapping instance each time.
    play(url, options) {
      const sound = new Sound(resolveUrl(url, options?.base), options);
      sound.play();
      return sound;
    },
    // Fetch and decode for instant playback.
    preload(urls, base) {
      return Promise.allSettled(urls.map(url => load(resolveUrl(url, base))));
    },
    // Warm the HTTP cache for long files that stay as <audio> elements.
    prefetch(urls, base) {
      return Promise.allSettled(urls.map(url => {
        const href = resolveUrl(url, base);
        if (!prefetched.has(href)) {
          prefetched.set(href, fetch(href).then(response => response.blob()).catch(cause => {
            prefetched.delete(href);
            console.warn("Sound could not prefetch", href, cause);
          }));
        }
        return prefetched.get(href);
      }));
    },
    isLoaded(url, base) {
      return Boolean(buffers.get(resolveUrl(url, base))?.buffer);
    },
    get state() { return context?.state ?? "none"; },
  };
  window.wanwanAudio = facade(engine);
})();
