(() => {
  "use strict";
  const scene = document.querySelector(".scene");
  const table = document.querySelector(".table");
  const hand = document.querySelector(".hand");
  const draw = document.querySelector(".draw");
  const status = document.querySelector("#status");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const tileSound = wanwanAudio.sound("./assets/156668__rtb45__mahjong.mp3");
  const NS = "http://www.w3.org/2000/svg";
  const kinds = {
    d1: { suit: "dots", rank: 1, name: "一筒" },
    d5: { suit: "dots", rank: 5, name: "五筒" },
    red: { suit: "honor", rank: 0, name: "紅中", text: "中", color: "#b66d60" },
    b1: { suit: "bamboo", rank: 1, name: "一索" },
    b2: { suit: "bamboo", rank: 2, name: "二索" },
    b3: { suit: "bamboo", rank: 3, name: "三索" },
    c7: { suit: "characters", rank: 7, name: "七萬", text: "七" },
    c8: { suit: "characters", rank: 8, name: "八萬", text: "八" },
    c9: { suit: "characters", rank: 9, name: "九萬", text: "九" },
    east: { suit: "honor", rank: 1, name: "東風", text: "東", color: "#6c8c8c" },
  };
  let active = false, busy = false, ready = false, winning = false, selected = null;
  const timers = new Set(), animations = new Set();
  function element(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  }
  function face(kind, parent) {
    const svg = element("svg", { viewBox: "0 0 60 90", "aria-hidden": "true" }, parent);
    const k = kinds[kind];
    if (k.suit === "dots") {
      const points = k.rank === 1 ? [[30, 45]] : [[15, 24], [45, 24], [30, 45], [15, 66], [45, 66]];
      for (const [x, y] of points) {
        element("circle", { cx: x, cy: y, r: k.rank === 1 ? 17 : 8, stroke: "#6c9690", "stroke-width": 4, fill: "none" }, svg);
        element("circle", { cx: x, cy: y, r: k.rank === 1 ? 8 : 2, fill: "#b57463" }, svg);
      }
    } else if (k.suit === "bamboo") {
      if (k.rank === 1) {
        element("path", { d: "M17 64Q12 29 33 21Q50 29 39 49L27 60L42 72M31 33L49 36M20 49L35 42M22 61L13 76", stroke: "#6b957c", "stroke-width": 5, "stroke-linecap": "round", fill: "none" }, svg);
        element("circle", { cx: 35, cy: 28, r: 2, fill: "#b27360" }, svg);
      } else {
        for (let i = 0; i < k.rank; i++) {
          const x = k.rank === 2 ? 20 + i * 20 : 12 + i * 18;
          element("path", { d: `M${x} 25V67M${x - 4} 28H${x + 4}M${x - 4} 46H${x + 4}M${x - 4} 64H${x + 4}`, stroke: "#6b957c", "stroke-width": 5, "stroke-linecap": "round" }, svg);
        }
      }
    } else if (k.suit === "characters") {
      element("text", { x: 30, y: 37, "text-anchor": "middle", "font-size": 30, fill: "#6b8985" }, svg).textContent = k.text;
      element("text", { x: 30, y: 73, "text-anchor": "middle", "font-size": 31, fill: "#b66d60" }, svg).textContent = "萬";
    } else element("text", { x: 30, y: 61, "text-anchor": "middle", "font-size": 44, fill: k.color }, svg).textContent = k.text;
  }
  for (const wall of document.querySelectorAll(".wall")) {
    for (let i = 0; i < (wall.classList.contains("wall-top") ? 12 : 6); i++) wall.append(document.createElement("i"));
  }
  // Five melds and a single East: drawing another East completes the pair.
  const initial = ["c8", "d1", "red", "b3", "d5", "east", "c7", "red", "b1", "d1", "d5", "c9", "b2", "red", "d1", "d5"];
  const tiles = initial.map((kind, id) => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "tile";
    node.dataset.kind = kind;
    node.dataset.id = String(id);
    node.setAttribute("aria-pressed", "false");
    const art = document.createElement("span");
    art.className = "face";
    node.append(art);
    face(kind, art);
    node.addEventListener("click", () => choose(node));
    return node;
  });
  face("east", draw.querySelector(".face"));
  function meld(group) {
    const keys = group.map(node => node.dataset.kind);
    if (keys.every(key => key === keys[0])) return true;
    const values = keys.map(key => kinds[key]).sort((a, b) => a.rank - b.rank);
    return values[0].suit !== "honor" && values.every(k => k.suit === values[0].suit)
      && values[1].rank === values[0].rank + 1 && values[2].rank === values[0].rank + 2;
  }
  function aligned(index = 0, single = false) {
    if (index === tiles.length) return single;
    if (!single && tiles[index].dataset.kind === "east" && aligned(index + 1, true)) return true;
    return index + 3 <= tiles.length && meld(tiles.slice(index, index + 3)) && aligned(index + 3, single);
  }
  function render() {
    hand.replaceChildren(...tiles);
    tiles.forEach((node, index) => {
      node.style.setProperty("--slot", String(index));
      node.classList.toggle("selected", node === selected);
      node.setAttribute("aria-pressed", String(node === selected));
      node.setAttribute("aria-label", `${kinds[node.dataset.kind].name}，位置 ${index + 1}`);
    });
    ready = aligned();
    scene.classList.toggle("ready", ready);
    draw.setAttribute("aria-disabled", String(!ready));
    if (ready) status.textContent = "聽牌了，點發光的牌摸牌。";
  }
  function later(fn, delay) {
    const id = setTimeout(() => { timers.delete(id); if (active) fn(); }, delay);
    timers.add(id);
  }
  async function choose(node) {
    if (!active || busy || winning) return;
    if (!selected || node === selected) {
      selected = node === selected ? null : node;
      tiles.forEach(tile => {
        tile.classList.toggle("selected", tile === selected);
        tile.setAttribute("aria-pressed", String(tile === selected));
      });
      return;
    }
    busy = true;
    const first = selected, a = tiles.indexOf(first), b = tiles.indexOf(node);
    const before = new Map([first, node].map(tile => [tile, tile.getBoundingClientRect()]));
    [tiles[a], tiles[b]] = [tiles[b], tiles[a]];
    selected = null;
    render();
    node.focus({ preventScroll: true });
    if (!reduced.matches) {
      const moving = [first, node].map((tile, i) => {
        const old = before.get(tile), box = tile.getBoundingClientRect();
        const dx = old.x - box.x, dy = old.y - box.y;
        const animation = tile.animate([
          { transform: `translate(${dx}px,${dy}px)` },
          { transform: `translate(${dx / 2}px,${dy / 2 - (i ? 10 : 24)}px)`, offset: .5 },
          { transform: "translate(0,0)" },
        ], { duration: 400, easing: "ease-in-out" });
        animations.add(animation);
        return animation;
      });
      await Promise.all(moving.map(animation => animation.finished.then(() => {}, () => {})));
      for (const animation of moving) animations.delete(animation);
    }
    busy = false;
  }
  draw.addEventListener("click", () => {
    if (!active || !ready || busy || winning) return;
    winning = true;
    scene.classList.remove("ready");
    scene.classList.add("winning");
    selected = null;
    for (const tile of tiles) { tile.disabled = true; tile.classList.remove("selected"); }
    draw.disabled = true;
    status.textContent = "東風，胡牌！";
    later(() => scene.classList.add("landed"), reduced.matches ? 0 : 700);
    later(() => {
      scene.classList.add("revealed");
      tileSound.play().catch(cause => console.warn("Mahjong tile sound could not play", cause));
    }, reduced.matches ? 200 : 1450);
    later(() => completeLevel(), reduced.matches ? 4300 : 5550);
  });
  render();
  registerLevel({
    background: "#dcd9c8",
    setup: async () => {
      if (!reduced.matches) await table.animate([
        { transform: "translateY(110vh)" }, { transform: "translateY(0)" },
      ], { duration: 850, easing: "cubic-bezier(.2,.8,.3,1)" }).finished;
      active = true;
    },
    teardown: async () => {
      active = false;
      tileSound.stop();
      for (const id of timers) clearTimeout(id);
      timers.clear();
      for (const animation of animations) animation.cancel();
      animations.clear();
      if (!reduced.matches) await table.animate([
        { transform: "translateY(0)" }, { transform: "translateY(-110vh)" },
      ], { duration: 700, easing: "ease-in", fill: "forwards" }).finished;
    },
  });
})();
