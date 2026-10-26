# Wanwan

Open `index.html` through a web server. No build step or dependencies.

## Levels

Development mode shows an **Admin · Level** picker at the top of the main page.
Set `const SHOW_ADMIN = false` near the top of [game.js](game.js) before publishing
to hide it and disable its controls. Options follow `ORDER` automatically and
include the intro. Choosing a level loads a fresh scene with the normal clean
teardown/setup transitions; controls are disabled while a transition runs.
The picker also works after the final level is beaten. Using the picker
starts the background music, and each jump crossfades to that level's
soundscape (see Background music and rain).

The play order is the `ORDER` list at the top of [game.js](game.js):

```js
const ORDER = ["tv", "sandwich", "elevator", "umbrella", "puddles", "cones", "taiwan", "bike", "powerlines", "drain", "card", "metro", "store", "money", "purse", "cat", "tea", "fruit", "incense", "jiaobei", "fortune", "temple", "fish", "ufo", "lottery", "mahjong", "teacup", "ending"];
```

Each name is a folder under `levels/`. To reorder levels, edit the list.
To add a level, create `levels/<name>/` and add its name. The intro always
plays first.

- [intro](levels/intro/index.html): the title 颱風天 and a small curling
  ocean-wave symbol (an SVG button labelled 開始) that gently bobs. Tapping it
  starts the looping background music (`assets/snd/bg.mp3`, owned by the root
  page so it continues across levels). The crest rises, curls over, and
  collapses through interpolated SVG shapes, throwing foam droplets on impact.
  The broken wave spreads into shallow water and foam drifting off to the
  right before the first level loads. Idle foam flows along the crest.
  Reduced motion skips the crash; leaving the scene cancels its animations.
  After crashing, the wave stays hidden throughout the page transition.
- [tv](levels/tv/index.html): a slim mint widescreen TV with splayed feet
  and a remote. The 16:9 picture preserves the full source framing without
  stretching or cropping, fading in and out on power changes. The red power
  button (top left of the remote) plays `assets/click.mp3` on every press,
  turns the TV on, and plays
  `levels/tv/assets/tv.mp4`. Pressing it again turns the TV off and completes
  the level. The background music keeps playing at its normal volume. The
  video itself is always muted; its soundtrack is `assets/tv-sound.mp3`, a
  separate audio element kept within 0.25 s of the picture. iOS pauses every
  other sound on the page when a video plays with sound, so this keeps the
  music going on iPhones.
- [sandwich](levels/sandwich/index.html): a crustless Taiwanese sandwich seen
  from above. Each tap (or Enter/Space) takes a bite with a little shake and
  a crunch (`assets/bite.mp3`) and leaves crumbs on the plate; the fourth
  bite finishes it. Bites are SVG mask
  circles; the ham, egg, and lettuce layers are masks grown from the remaining
  bread so filling peeks out only along bitten edges.
- [elevator](levels/elevator/index.html): inside an elevator stopped at 5樓
  with a 20-button panel. Every button press plays `assets/click.mp3`, and
  the doors play `assets/ding.mp3` whenever they close or open. Any button
  lights briefly; only 1 stays lit. With 1
  lit, the close-door button (>|<) shuts the doors, counts the display down
  5→1, and opens the doors on a cozy lobby with rain falling outside its
  window, playing `assets/elevator.mp3` (trimmed to its first 2 s) as they
  open. `assets/moving.mp3` (converted from `moving.wav`) starts as movement
  and the floor countdown begin, after the doors close, and stops on arrival
  or teardown. The level completes once the door-opening sound has finished.
- [umbrella](levels/umbrella/index.html): hold the umbrella and swipe upward
  to open it gradually. Partial progress stays between swipes; fully open
  locks the umbrella and completes the level without an extra pause. Arrow Up
  also opens it. `assets/open.mp3` plays as soon as the canopy starts rising
  (it is primed on touch for iOS); letting go before it is fully open fades
  it out, and the next swipe starts it again. Once open, it plays out.
  Rain falls around the umbrella and stops at its expanding canopy, leaving
  the area underneath dry. The engine starts the `assets/rain.mp3` loop on
  level entry, before the umbrella is opened (see Background music and rain).
  Opened on its own, the level starts that loop during setup, retrying on
  interaction if autoplay is blocked. Reduced-motion mode disables falling rain. The recording contains
  only the original's first 30 minutes, encoded as a 96 kbps MP3.
- [store](levels/store/index.html): a convenience-store front in
  FamilyMart-style green, white, and blue (no lettering): a striped fascia
  with a wordless badge, aluminium-framed glass showing lit shelves and a
  drinks fridge, a striped waist band on the glass, a drink poster, a plant,
  an umbrella stand, and a green mat. A crooked 歡迎光臨 sign drops in with a
  bounce onto the left window. Drag either end to rotate it; releasing within
  6° springs it straight. Then the sliding glass doors part into their
  pockets, the door sensor turns green, warm light spills onto the mat,
  `assets/chime.mp3` plays (left ringing into the next level), and the level
  completes. Keyboard: left/right arrows rotate, release to check.
- [cat](levels/cat/index.html): a small cream ceramic lucky cat with fine,
  warm outlines sits on a cushion on a rounded wooden counter with a drawer.
  A prominent leafy desk plant in a ceramic pot and saucer sits on the left.
  On the right, `assets/organized-tray.svg` is a static snapshot of the money
  level's finished tray, with its actual five notes, motifs, colors, sizes,
  and descending stacking order, rather than a simplified approximation.
  Tap the raised paw, or pull it down and release, to start its springy,
  forward-facing wave. Enter/Space or the arrow keys also work.
  Pressing the paw plays `assets/meow.mp3`; keyboard presses also meow.
- [money](levels/money/index.html): drag five toy New Taiwan dollar notes into
  a mint-green cash tray. Notes retain their 70 mm height and relative lengths
  (145/150/155/160/165 mm) at a common scale. New placements go on top, without
  automatic sorting. Finish with 2,000, 1,000, 500, 200, 100 from bottom to top.
  Each layer is offset slightly so every denomination is visible. The notes
  show no numbers or currency text; color, motif, and length tell them apart.
  Incorrectly
  placed notes can be dragged back onto the table, where they settle crookedly.
  A correct stack plays `assets/register.mp3` once, with time for the effect
  to finish before completing the level.
  Enter/Space puts a focused note in the tray or takes it out; arrow keys move
  it on the table. Cancelled drags restore the original placement.
  Original, deliberately simplified illustrations use the notes' red/green/
  brown/blue/purple colors and reverse-side motifs (Chung-Shan Building,
  Presidential Office, sika deer, Mikado pheasant, and salmon), based on the
  [current banknote descriptions](https://en.wikipedia.org/wiki/New_Taiwan_dollar#Banknotes).
  They are playful game art, not scanned or reproduced currency.
- [metro](levels/metro/index.html): an original abstract, text-free metro map
  with blue, green, orange, red, and yellow routes. Five visually identical
  trains receive shuffled audio clues from `assets/<color>.mp3` on each visit.
  Hold a train to hear its looping clue. All background music and rain fade out
  for this level so the clues are easy to hear. Drag near any route to snap onto it, regardless of whether
  it matches; crowded placements find a nearby free spot on that same route.
  Trains can be picked up and reassigned. No correctness feedback appears until
  all five match. Tap-and-hold without moving only previews the sound.
  Once all five match, the trains follow their routes and continue off the
  map before the level completes (a short fade replaces travel in reduced motion).
  Keyboard: hold Space/Enter to listen, release to stop, and use arrow keys to
  cycle through routes. Reduced motion skips the arrival and snap bounce.
  Each level owns its clue playback.
- [taiwan](levels/taiwan/index.html): all 22 county/city regions from the
  [Simplemaps Taiwan map](https://simplemaps.com/svg/country/tw), including
  offshore islands, on a soft sea-colored board. The seven tiny regions
  (Kinmen, Matsu, Penghu, Keelung, Hsinchu City, Chiayi City, and Taipei)
  start already placed; the other 15 are scrambled. Placed regions render
  in a separate layer behind loose pieces and are skipped by keyboard focus.
  Drag a piece onto the faint geographic silhouette, or into its correct
  position next to any other piece. Any match plays the elevator's
  `levels/elevator/assets/click.mp3`, glides onto the map and stays
  locked for good; loose pieces never join into movable groups. All regions must be assembled
  before the internal borders fade and the level completes. Geometry remains
  at one consistent scale, with no text on the map. Arrow keys move a piece
  (Shift for larger steps), Enter/Space attempts to join it, and Escape
  cancels a drag. Rain falls over the board, and a small typhoon spins in the
  ocean southeast of Taiwan behind the puzzle pieces. Reduced motion keeps rain
  and the typhoon still and skips arrival movement and border fading.
  Source and license are recorded in `levels/taiwan/assets/CREDITS.txt`.
- [cones](levels/cones/index.html): four orange traffic cones in a rainy street
  play classic three-spot Towers of Hanoi. The deterministic initial stacks
  are `[4, 1]`, `[3]`, `[2]` (bottom to top; 4 is largest).
  Move only a stack's top cone, and never put a larger cone on a smaller one.
  Finish by collecting all four, largest to smallest, on the center spot.
  The center spot has just a white chalk star, with no surrounding circle,
  flattened onto the pavement (a grainy SVG filter), as a
  subtle hint that the stack belongs there.
  Drag a cone, or tap it then a destination. Keyboard: Enter/Space selects,
  Left/Right chooses a spot, Enter/Space places, Escape cancels.
  `assets/truck.mp3` loops from setup until completion or teardown; if autoplay
  is blocked, interaction retries. The engine's rain and music keep playing. Reduced motion uses static rain and skips bounce motion.

- [puddles](levels/puddles/index.html): four scattered leaves match four rainy
  street puddles by size. Each leaf placed in a puddle plays `assets/splash.mp3`
  and makes a splash that bursts outward from the puddle's center.
  Incorrect matches stay movable; occupied puddles do not accept another leaf.
  Picking up a leaf does not highlight any puddle. Keyboard destination changes
  are announced by the screen reader; keyboard focus uses a separate dashed outline.
  All four size matches are needed to finish. Keyboard: Enter/Space selects,
  arrows choose a puddle, Enter/Space places, Escape cancels. Rain and music
  are played by the engine; reduced motion uses a brief splash fade.

- [drain](levels/drain/index.html): after powerlines, a flooded Taiwanese
  residential alley with tiled facades, barred windows, air conditioners,
  awnings, potted plants, and a parked scooter. Pick up the stick leaning by
  the left doorway, drag its tip into the water, and swirl in either direction.
  About two net circles of broad curved movement loosen the leaves over the
  sewer; straight strokes, tiny jitters, and back-and-forth scrubbing do not
  count. Releasing leaves the stick in place and preserves clearing progress.
  Ripples follow the stick, leaves move aside, and the water funnels into the
  drain before completion. `assets/drain.mp3` (converted from `drain.wav`)
  plays once as the water starts draining. Rain continues, with engine-owned audio in game
  and a local loop in standalone play (interaction retries blocked autoplay).
  Keyboard: Enter/Space picks up the stick, arrows move it (Shift moves farther),
  Enter/Space stirs while in water, Escape lets go. Reduced motion uses static
  rain and removes the flood without spinning or shrinking animations.

- [card](levels/card/index.html): an original text-free stored-value card,
  inspired by the white Taiwan EasyCard with yellow, blue, pink, and green
  corner shapes. Drag it over the right-hand metro gate sensor; the sensor
  lights and the gate doors open with a gate sound
  (`asset/gate.mp3`, converted from `gate.wav`). Releasing elsewhere returns the card.
  Keyboard: focus the card and press Enter/Space.

- [bike](levels/bike/index.html): a rainy street where ten parked cars form a
  snaking maze, and a food delivery rider on a bike with a green delivery box.
  Drag the bike from the bottom-left, right through the bottom lane, up through
  a gap, left along the middle lane, up at the far left, then right along the
  top lane to the crosswalk, without touching a car. Other gaps are dead ends.
  Touching one wobbles the bike and sends it back to the start. Movement is
  checked along the whole drag path, so fast swipes can't skip through cars.
  While the bike is held, `assets/bell.mp3` rings on a loop; it stops when
  the bike is let go, crashes or arrives.
  Letting go mid-street leaves the bike where it is. The pedestrian signal
  across the street stays dark until the bike arrives, then shows the walking
  green man (Xiaolüren) from `assets/walkingman-display.gif`, a cropped
  Wikimedia Commons GIF (see `assets/CREDITS.txt`). Keyboard: arrow keys move
  the bike, and Shift moves it farther. The focus border shows only for
  keyboard use, never while dragging.

- [powerlines](levels/powerlines/index.html): a rainy street with two wooden
  telephone poles, each with two crossarms of green glass insulators. Two of
  the lines have snapped: each hangs from one pole with a frayed copper end
  lying in the street, crackling with little sparks. Drag a loose end up to
  the matching insulator on the other pole (it glows while you drag, brighter
  when close) and let go to reconnect it; a wire can only stretch as far as
  its length, and a missed drop falls back to the ground. Each reconnection
  plays `assets/jolt.mp3`, and a distant ambulance siren
  (`assets/ambulance.mp3`) loops at half volume under the rain for the whole
  level, stopping on teardown. A construction
  worker in a hard hat and orange raincoat watches from behind in the
  foreground. Once both lines are fixed, the dark windows light up, the street
  lamp comes on, the worker raises an arm, and the level completes. Keyboard:
  focus a loose end and press Enter/Space to reconnect it. Reduced motion
  skips sparks and tweens.

- [purse](levels/purse/index.html): a translucent coin purse inspired by the
  striped Taiwanese gaji bag, with a braided wrist strap, on a wooden table
  with six scattered NT-style coins. The EasyCard-style card from the card
  level already sits inside the purse as decoration; coins settle in front of it.
  Drag the zipper pull left to right to open
  it, drop every coin inside, then drag the pull right to left to close it.
  Releasing the zipper past halfway snaps it fully open or closed, and
  `assets/zipper.mp3` plays each time it reaches fully open or fully closed. Coins
  dropped on a closed purse bounce back. Each coin that lands inside plays
  `assets/coin.mp3`. Coins inside follow simple physics
  and slosh, and the purse wobbles, whenever a new coin lands. The level
  completes when all coins are inside and the purse is zipped. Keyboard:
  arrows or Enter/Space move the zipper; Enter/Space on a coin drops it into
  the open purse. Reduced motion settles coins instantly.

- [tea](levels/tea/index.html): a 50嵐-style bubble tea shop in yellow and blue
  with no lettering. The cup is yellow with blue dots and white stripes, and
  translucent enough to show its contents. In order: drag the three small
  heaps of boba into the cup, drag the cup under the tea dispenser and tap
  the dispenser to pour (`assets/pour.mp3` plays with the stream and fades
  out as it stops), then drag the cup into the seal-and-shake machine.
  The machine seals the cup, shakes it left and right (`assets/shake.mp3`
  loops for the length of the shake), and sends the drink
  off to complete the level. Out-of-order steps (cup to the dispenser before
  all boba is in, boba after the tea, sealing before the tea) empty the cup
  and start over. Keyboard: arrows or Enter/Space move the cup between
  stations; Enter/Space on a boba heap adds it and on the dispenser pours.

- [temple](levels/temple/index.html): a temple courtyard with a 金爐 furnace
  whose fire is always moving, and an offering table of yellow-and-red joss
  paper bills with gold foil centres (no text). Tap a bill and it flies into
  the furnace mouth, where the fire flares with sparks and charred flakes.
  Burning every bill completes the level. Keyboard: Enter/Space on a bill.
  Reduced motion sends bills instantly and calms the fire. A crackling fire
  loop (`assets/fire_bg.mp3`) plays for the whole level (starting on the first
  tap if the browser blocks autoplay) and fades out on exit; each tapped bill
  plays its own `flame.mp3` whoosh, layering over any still playing.

- [incense](levels/incense/index.html): an altar with a candle, a cup of
  incense sticks, and a bronze censer where three lit sticks already stand.
  Every lit stick has a glowing ember tip and a drifting smoke ribbon that
  follows the tip as the stick moves. In order: drag a stick out of the cup,
  hold its tip in the candle flame until it lights, then let go above the
  censer. A released stick falls straight down: if its base is over the bowl
  mouth it drops into the ash and sticks there (an unlit one goes back to the
  cup to start over); otherwise it falls off the screen and you take another.
  Letting go over the cup puts the stick back. Keyboard: Enter/Space on the
  cup takes a stick, on the candle lights it, on the censer drops it in from
  above.

- [jiaobei](levels/jiaobei/index.html): 擲筊 in front of a temple altar. Two
  red half-moon blocks lie on the stone floor. Tap each to pick it up; it
  hops into the hand tray at the bottom, held flat-face to flat-face. With
  both held, tap the floor to throw. Each block flies up, spins, tumbles,
  and bounces a random number of times with dust puffs (each block plays
  `assets/dropped.mp3` when it first hits the floor; the two clacks overlap), landing with its flat
  face pointing either inward or outward. The first throw never passes; after
  that each block's facing is random (a 1-in-4 chance). When both flat faces
  point inward the blocks glow, sparkles burst, and the level completes;
  otherwise pick both up and throw again. Keyboard: Enter/Space on a block
  picks it up, on the floor throws. Shaking the phone with both blocks held
  also throws (DeviceMotion: three jolts within a second). On iOS the motion
  permission prompt appears on the first tap in the level, and motion only
  works over HTTPS. Reduced motion lands them instantly.

- [fruit](levels/fruit/index.html): the temple courtyard again, with a woven
  bamboo basket on a red offering table and seven fruits scattered on the
  floor (two oranges, an apple, an Asian pear, a dragon fruit, a pomelo and
  a persimmon). Drag each fruit into the basket. Fruit inside uses the same
  physics as the purse coins: it drops in, rolls and collides with the other
  fruit, and every new fruit sloshes the pile and wobbles the basket.
  Fruit released on the floor stays there; released elsewhere it hops back.
  Once all fruit is in the basket, sparkles burst and the level completes.
  Keyboard: Enter/Space on a fruit drops it into the basket. Reduced motion
  settles the fruit instantly.
- [fortune](levels/fortune/index.html): a red lacquer temple fortune
  cabinet (籤詩櫃) with 30 numbered drawers. Each page load shuffles the 100
  觀音靈籤 lots in `levels/fortune/fortunes.js` and labels each drawer with
  one lot. Tap any drawer: it slides out, a rolled scroll hops out to the
  middle and unrolls to show that lot's four-line poem in vertical
  Traditional Chinese. The poem stays until the player taps it; then it rolls
  up, returns to the drawer, the drawer closes, and the level completes.
  Keyboard: Enter/Space on a drawer opens it and focuses the poem; Enter/Space
  again puts it away. Reduced motion skips the animations. Poems come from
  https://kuanyinlingqian.x10host.com/Home.html, converted from Simplified to
  Traditional with OpenCC (`s2twp`).
- [mahjong](levels/mahjong/index.html): after lottery, a wooden mahjong table
  with green felt and a scrambled Taiwanese-style 16-tile waiting hand.
  All 16 tiles sit in one continuous left-to-right row, scaled to fit the
  table on phones. Tap two tiles to swap them (Enter/Space also works).
  Group three identical tiles or three consecutive numbers of the same suit,
  leaving East as a singleton. The five melds and singleton may appear in any
  order, and sequence tiles may be ordered either way or internally shuffled.
  The draw tile glows only while the entire
  hand is grouped. Tap it to draw the matching East, completing the pair.
  The drawn tile lands first, then the hand tips forward to show the table;
  `assets/156668__rtb45__mahjong.mp3` (the first four seconds of the WAV)
  plays as the hand tips down; completion waits for the clip to finish.
  Reduced motion skips swapping and tipping
  animations while preserving the action order.
  The drawn tile inherits scene visibility, and the table stays offscreen
  after its exit animation so no tile reappears during the transition.

- [fish](levels/fish/index.html): a street-market fish stall under a striped
  awning, with seven different fish (sardine, tilapia, yellow croaker, red
  snapper, mackerel, milkfish, grouper; 10–28 cm) each lying on a banana leaf
  over crushed ice. The starting order is shuffled far from sorted. Tap one
  fish to select it (it glows and wiggles), tap it again to deselect, or tap
  another fish to swap the two with an arcing animation. When the fish run
  smallest-to-largest or largest-to-smallest, they all flop, sparkles burst,
  `assets/bubbles.mp3` (converted from `bubbles.wav`) plays, and the level
  completes. Keyboard: Enter/Space on a fish selects or swaps.
  Reduced motion swaps instantly.
- [ufo](levels/ufo/index.html): a night-market 蚵炱 (oyster fritter) stall
  with three bowls (green onion, oysters, batter), a ladle on the counter and a
  wok of hot oil. Tap the bowls in order: batter first (a thin raw layer
  spreads across the ladle), then green onion, oyster, green onion again, and
  batter once more on top; each ingredient flies into the ladle. A wrong bowl shakes
  the ladle, empties it and starts over. Then tap the wok or ladle to fry: the
  ladle dips into the oil, bubbles rise, and the fritter turns from raw batter
  to crispy brown. When it is done, `assets/ready.mp3` (converted from
  `ready.wav`) plays. Tap it once it glows to lift it out onto the plate, where
  it steams and sparkles, and the level completes. Keyboard: Enter/Space on the
  bowls, wok and ladle. Reduced motion skips bubbles and tweens.

- [lottery](levels/lottery/index.html): a wordless Taiwan-style 刮刮樂 scratch
  card (orange/pink sunburst, lucky bag, coin stack, banknote bundle, prize
  symbols, barcodes) with a silver foil window, and a 50 元 coin like the purse
  level's. Drag the coin over the foil: it scratches away exactly along the
  coin's path (a canvas erased with rough edges) and sheds silver flakes. Once
  60% of the foil is gone, including at least 45% over each digit, the rest
  fades away to reveal a gold **6 6 6**, which pops with a shine and sparkles
  while `assets/win.mp3` (converted from `win.flac`) plays, and the level
  completes once that sound has finished. Keyboard: arrow keys move the coin and scratch;
  Enter/Space sweeps the whole window. Reduced motion skips flakes and tweens.

Each level owns its HTML, stylesheet, script, and an `assets/` folder for
anything only it uses. Open a level's URL directly to design or test it
without the engine. Root `assets/` holds only game-wide files (the music and win sounds)
and `assets/archive/` (unused earlier art kept for reference).

The TV video `levels/tv/assets/tv.mp4` is a smaller 480×270 encode of the
640×360 `tv-source.mp4` in the same folder, preserving its full 16:9 frame:
`ffmpeg -i tv-source.mp4 -vf "scale=480:270,setsar=1" -c:v libx264 -crf 25 -an -movflags +faststart tv.mp4`
and its soundtrack with:
`ffmpeg -i tv-source.mp4 -vn -ac 1 -c:a libmp3lame -b:a 64k tv-sound.mp3`

### Background music and rain

The final two scenes follow mahjong:
- [teacup](levels/teacup/index.html): a celadon teapot and handleless tea cup
  on a bamboo-style tea tray. Drag the pot upward and hold to pour; lowering
  or releasing pauses the pour without losing progress. Tapping the pot (or
  Enter/Space) toggles an automatic pour. The stream, filling, and pouring sound
  start only after the pot finishes lifting and tilting; releasing stops them
  immediately, including during the lift. Once full, a brown version of Taiwan's typhoon swirls in
  the tea and steam rises. Tap the cup (or Enter/Space) to drink: the tea,
  typhoon, and steam disappear before proceeding.
- [ending](levels/ending/index.html): the terminal scene displays 注意安全
  and 感謝您的遊玩. Rain falls initially, then fades visually and audibly
  while the sun rises over green hills. The finished scene stays on screen
  without a final win sound. Reduced motion uses static rain and a short fade.

`game.js` owns three looping `<audio>` tracks and picks them per level. When
the next level begins, it crossfades over 1.5 s, and a track that fades out is
paused where it is so it resumes from there later.
Metro instead fades the music out over 3 s starting when its map enters,
so the fade remains audible after the arrival rather than finishing offscreen.

| Levels | Music | Rain (`levels/umbrella/assets/rain.mp3`) |
| --- | --- | --- |
| umbrella, puddles, cones, taiwan, bike, powerlines, drain | `assets/snd/bg.mp3` | yes |
| ending | `assets/snd/bg.mp3` | fades out as the sky clears |
| metro | none, so the train clues are easy to hear | no |
| fruit, incense, jiaobei, fortune, temple | `assets/snd/temple.mp3` | no |
| every other level | `assets/snd/bg.mp3` | no |

Edit `RAIN_LEVELS`, `TEMPLE_LEVELS` and `QUIET_LEVELS` in `game.js` to
change this. Nothing plays until the intro's start tap, which also starts
every loop silently once so iOS lets them play later without a tap. iOS
ignores `<audio>.volume`, so there the loops are routed through Web Audio
gain nodes to keep the fades.

The loops are resumed by `game.js` if the browser pauses them
on its own (iOS does this for calls, Siri or other media). This happens on
the next tap or key press in any level, or when the page becomes visible again.

## Engine contract

The root `game.js` plays the intro, then each name in `ORDER`. It loads each in a same-origin
iframe and waits for fonts and images. Its sequence is **setup → play →
teardown → background color change → next setup**. Input stays inert
throughout transitions. The outgoing frame is removed only after its
objects have bounced offscreen. The final level stays visible when beaten.
Every beaten level (not the intro's start tap or admin-picker jumps) plays
a win sound as its transition begins, including the final level. It is always
`assets/snd/win1.mp3`.
Sound effects are played as `.mp3`: this nginx serves `.wav`/`.flac` as
`application/octet-stream`, which Safari/iOS refuses to play. The original
`.wav`/`.flac` files are kept next to their `.mp3` conversions.

Short sound effects go through `audio.js`, a shared Web Audio engine loaded
by the root page and every level (`<script src="../../audio.js">` before
`lifecycle.js`). On startup `game.js` downloads and decodes everything in
`SOUND_EFFECTS`, then prefetches the long `<audio>` loops in `PREFETCH`, so
effects play instantly on any level. Without this, iOS fetches media only on
the first `play()`, so effects started late. The engine unlocks itself on
the first tap or keypress. Inside a level, use
`wanwanAudio.sound("./assets/x.mp3")` (with `play()`, `stop()`, `pause()`,
`volume`, `loop` and `currentTime`) or `wanwanAudio.play(url)` for
overlapping one-shots. **Add every new effect to `SOUND_EFFECTS`.** Long
loops (music, rain, fire, metro, truck, TV soundtrack) remain `<audio>`
elements.

While a level is being played, the engine builds the next level in a hidden
frame, so beating a level goes straight into the transition. Levels must stay
idle (no animation loops or sounds) until `setup` runs. Sound effects and the
long loops start downloading once the first screen is up.

Each level loads `../../lifecycle.js` before its stylesheet and calls:

```js
registerLevel({
  background: "#ead9c7",
  setup: () => animateScene(true),
  teardown: () => animateScene(false),
});
```

Both hooks return promises that resolve after the level-owned animations
finish. The helper exposes `window.levelLifecycle` to the engine, manages
scene input and phases, and starts setup automatically on standalone pages.
Embedded level backgrounds must be transparent so the engine can change
the base color while the scene is empty. Animate scenery (including ground
and tables) separately from interactive elements such as the paw or sign.
Reduced motion skips object movement and background-color animation.

On completion, a level calls the helper from `lifecycle.js`:

```js
completeLevel();
```

It dispatches a local `levelcomplete` event and tells the engine. Levels do
not know their position in the order. The engine accepts the message only
from the active frame and same origin. Duplicate completion messages are
ignored. The last level stays visible after completion.
Load errors are logged and shown in an accessible error notice.

## Credits

See [shared asset credits](assets/CREDITS.txt), the font licenses in
`levels/intro/assets/` and `levels/store/assets/`, and the
[cat image credits](levels/cat/assets/CREDITS.txt), and the
[walking green man GIF credits](levels/bike/assets/CREDITS.txt).
Previously downloaded sprite packs are retained but not loaded by these levels.

## Publishing

`./publish.sh` copies the game into the GitHub Pages repo
(`~/Desktop/code/luxe.github.com/颱風天`) with `rsync -a --delete`, so files
removed here are removed there too. It then commits and pushes that folder only.

- Long media in `WEB_ENCODE` is re-encoded smaller for phones first: music
  at 96 kbps, rain as 48 kbps mono, and the TV video without its unused audio
  track (its sound is `tv-sound.mp3`).
- Audio/video still over 15 MB (`MAX_MB`) is trimmed from the end so it fits
  on GitHub; the looping music and TV video just repeat sooner. Processed files
  are only redone when their source or settings change.
- `levels/tv/assets/tv-source.mp4`, the `.wav`/`.flac` originals and
  `publish.sh` are not published.
- The published `game.js` has `SHOW_ADMIN = false` (`KEEP_ADMIN=1` keeps it).
- `./publish.sh --dry-run` syncs and shows the change summary without committing.
