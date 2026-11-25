# Oh-No Ice Cream — Design Document

Third game in the bundle, next to **Toot-Toot Twenty** (`ttt/`) and **Jump-Jump Bunny** (`jjb/`).
Purpose: **subtraction within 20** for 5–6-year-olds (K to early Grade 1), on iPad Safari and desktop.

This document is the full spec. The builder (Grok CLI) implements it, tests it, plays it, and publishes it
the same way Jump-Jump was published. Where this doc is silent, **copy what Jump-Jump does**.

---

## 0. Quick facts

| Item | Value |
| --- | --- |
| Display name | **Oh-No Ice Cream** |
| Short name on gate card | **Oh-No!** |
| Folder in repo | `oh-no-ice-cream/` (sibling of `jump-jump-bunny/`) |
| Served path | `dist/oic/` → `https://yuzubopaw.github.io/yuzubomath/oic/` |
| Dev command | `npm run dev:oic` → port **5175** |
| Save key | `localStorage["ohNoIceCream.v1"]` |
| Stack | Vite 6 + vanilla JS ES modules + CSS + Vitest. No React, no Phaser, no new runtime deps. |
| Problems per visit | **5** (one per customer) |
| Answer buttons | **3** big numerals, 0–20 |
| Theme colours | Mint, vanilla, strawberry, waffle-cone tan |

---

## 1. Goals and non-goals

### Goals

1. A child who can count to 20 learns subtraction step by step:
   **take away objects → count back → find the missing part → cross ten.**
2. It feels like the other two games: big cream cards, thick dark outlines, Fredoka font, one main action
   button, three numeral answers, a hint ladder, a parade at the end, mute, a hidden grown-up settings area.
3. Pre-readers can play with no reading. Numerals, dots and pictures carry all meaning.
4. Ships inside the existing bundle with its own save. It must not break Toot-Toot or Jump-Jump saves.

### Non-goals (v1)

- No voice recordings or speech synthesis (Jump-Jump uses tones + captions; do the same).
- No subtraction with results below 0, no numbers above 20.
- No timers, scores, streak loss, red X, "Wrong!" text or sad faces.
- No accounts, analytics, ads, network calls after load, or third-party scripts (COPPA, same CSP).
- No word problems as text.

---

## 2. Teaching design

### 2.1 Strategy ladder (from the four modes)

| Order | Strategy | Mode | Example |
| --- | --- | --- | --- |
| 1 | **Take away** — remove objects, count what is left | **Plop!** | 7 scoops, 3 fall, 4 left |
| 2 | **Count back** small amounts on a number path | **Drip Drop** | 12, back 3 → 11, 10, 9 |
| 3 | **Missing part** — "how many fell?" (think addition) | **Oops!** | 9 were there, 6 left, how many fell? |
| 4 | **Take from ten / cross ten** — break a teen number at 10 | **Ten Trick** | 13 − 5 = 13 − 3 − 2 = 8 |
| 5 | Mixed practice | **Sundae Sampler** | any of the above |

### 2.2 Representation: the scoop tray (ten-frame)

Every scoop sits in a **scoop tray**, a 2 × 5 grid, which is a **ten-frame**. That way the child can
see quantities at a glance, as in Toot-Toot's frames.

- 1–10 scoops: one tray.
- 11–20 scoops: two trays, one above the other. The **top tray is always full (10)**. The bottom tray holds the ones.
- Cells fill in reading order: top row left→right, then bottom row left→right.
- **Scoops always fall from the end** (the last filled cell of the last tray). So:
  - what is left is always a tidy ten-frame pattern you can see at a glance;
  - a teen number loses its ones first, then the ten breaks. That **is** the Ten Trick, so mode 4 only
    has to add a pause and a "Ten!" moment, not new art.
- The next scoop to fall **wobbles a little** so the child can see which one goes.

### 2.3 Fact bands

Each mode has its own current **band**. Facts are `start − take = left`.

| Band | Name | `start` | `take` | `left` | Notes |
| --- | --- | --- | --- | --- | --- |
| A | Within 5 | 2–5 | 1 … start−1 | 1–4 | no zero |
| B | Within 10 | 3–10 | 1 … start | 0–9 | `left = 0` allowed, at most 1 per visit |
| C | Teens, no crossing | 11–20 | 1 … (start − 10) | 10–19 | includes "teen − ones = 10" (e.g. 15 − 5) |
| D | Crossing ten | 11–18 | (start − 9) … 9, and take > start − 10 | 2–9 | e.g. 13 − 5, 16 − 8 |

Mode limits (which bands a mode uses):

| Mode | Bands used | Extra rule |
| --- | --- | --- |
| Plop! | A → B → C → D | — |
| Drip Drop | A → B → C | `take` ≤ 1 (A), ≤ 2 (B), ≤ 3 (C). Count back only for small takes. |
| Oops! | A → B → C | `take` ≥ 1, `left` ≥ 1 |
| Ten Trick | D only | `start` 11–18, `take` 3–9 |
| Sundae Sampler | each problem picks a random open mode at its own current band | at least 2 different modes per visit |

### 2.4 Moving between bands

The same rule as Jump-Jump's `wideRange`, applied per mode:

- **Move up** one band when the last 6 solved problems in that mode had ≥ 5 solved on the
  first or second try. Then clear that mode's `recent` list.
- **Move down** one band when 2 of the last 4 problems needed the full reveal (hint level 3).
  Then clear `recent`.
- Never move up or down in the middle of a visit. Check only when a visit ends.
- New save: every mode starts at band A (Ten Trick at D).

### 2.5 Picking problems inside a visit

- Pick uniformly from the legal facts of the band, then apply these rules:
  - no fact repeated in one visit;
  - the same `left` value never twice in a row;
  - in band B, at most one `left = 0` and at most one `take = start`.
- `nextProblem` must never throw. If filtering leaves nothing, fall back to `[5, 2]` (A), `[8, 3]` (B), `[15, 4]` (C), `[13, 5]` (D).
- Use the seeded `mulberry32` from `game/rng.js` so tests can repeat a visit.

### 2.6 Answer choices (3 numerals)

Always 3 different integers in 0–20 that include the answer. Shuffle them. Fill the distractors from this list in order,
skipping ones that are illegal or already used:

- **Plop / Drip Drop / Ten Trick / Sampler** (answer = `left`): `left + 1`, `left − 1`, `start`
  (forgot to subtract), `take` (gave the amount that fell), `left + 2`, `left − 2`, then nearest unused.
- **Oops!** (answer = `take`): `take + 1`, `take − 1`, `left` (gave what's left), `start`, `take + 2`, then nearest.

Keep at most one "trap" distractor (`start`/`take`/`left`) per problem so the choices are not all tricky.
In band A, the trap may appear only every other problem.

---

## 3. World and characters

**Sunny Scoop Cart.** An ice-cream cart on a sunny boardwalk with a striped mint-and-white umbrella.
Animal customers come up one at a time. The cart has a display tray of scoops. Each scoop has a tiny cute face
(two dot eyes, a small smile).

**"Oh no!" moment.** A gust, a bump, or the hot sun makes scoops **wobble, pop off and plop** onto the
boardwalk. The falling scoop's face changes to a round "o" mouth. It lands as a soft splat
with a sparkle, which should look funny, not sad. A gentle downward "wah-oop" tone plays.

**No villain.** Nothing eats the scoops and nobody is in trouble. When a problem is solved, the customer
gets a cone (with the leftover scoops) and walks happily into the queue at the top of the screen.

Reuse existing animal sprites as customers (copy from `public/images/sprites/animal-*.webp`
into `oh-no-ice-cream/public/images/sprites/`; at least 8 species; don't regenerate them).

---

## 4. Screens

The screen stack, router and layout are the same as Jump-Jump `App.js`:
`title → map → play → parade`, with `settings` pushed on top.

### 4.1 Title

- Background: mint sky, boardwalk planks at the bottom, cart in the middle.
- A big **"Tap to play"** button (the cart's bell, ≥ 120 px). `aria-label="Tap to play"`.
- Top-left: **All games** gate button (`aria-label="All games"`, shown only when served under `/oic/`).
- Top-right: mute button, settings (gear).
- Title text "Oh-No Ice Cream" on a cream pill, like Jump-Jump.
- Idle animation: the top scoop on a cone wobbles every ~3 s (none if reduced motion).

### 4.2 Map: "Boardwalk"

A row of **5 flavour stands** (cards), each ≥ 160 × 160 px, with an icon + short name + 1–3 star stamps
showing the current band. `data-mode` attribute per card for tests.

| Stand | `data-mode` | Icon | Open on new save? |
| --- | --- | --- | --- |
| Plop! | `plop` | one scoop falling off a cone | ✅ |
| Drip Drop | `dripDrop` | scoop on a number path with a back arrow | ✅ |
| Oops! | `oops` | dashed empty scoop outline + "?" | ✅ |
| Ten Trick | `tenTrick` | two trays, top one full | 🔒 unlocks when Plop! reaches band C **or** 3 Plop! visits done at band C |
| Sundae Sampler | `sampler` | sundae glass with 3 scoops | 🔒 unlocks after 1 Ten Trick visit |

- Locked cards are grey with a padlock icon, not tappable. Tapping one plays a soft nudge tone and wobbles the padlock.
- One card (the least visited open mode, as Jump-Jump `recommendedMode`) gets a slow pulsing glow.
- Wide layout: 5 in a row (or 3 + 2). Stacked layout: 2 columns, scrolls vertically.
- Top-left: Home (back to title). Top-right: mute.

### 4.3 Play: shared layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Home]   🍦🍦○○○  (5 cone slots = visit progress)    [Mute]  │
│                                                             │
│   [customer]      ┌─ scoop tray(s) ─┐     ┌─ Oh-no sign ─┐  │
│                   │ ● ● ● ● ●       │     │  3   ●●●      │  │
│                   │ ● ● ○ ○ ○       │     └───────────────┘  │
│                   └─────────────────┘                        │
│        equation strip:   7  −  3  =  ?                       │
│                                                             │
│          [  BIG ACTION BUTTON  ]                             │
│     ┌────┐   ┌────┐   ┌────┐     (answer bar, after action)  │
│     │ 4  │   │ 5  │   │ 3  │                                 │
│     └────┘   └────┘   └────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

- **Oh-no sign:** a cream card that shows how many will fall, as a numeral plus a dot pattern
  (dice/ten-frame style dots, max 9 in 2 rows; for 10 use a full mini ten-frame). It is the one thing that tells the child "how many".
- **Equation strip:** numerals use the standard minus sign `−` (U+2212). `?` is a dashed box.
  It appears **after** the action in band A (objects first) and **from the start** in bands B–D, like
  Toot-Toot's Route 1 vs Route 2+ rule.
- **Action button:** one big button (≥ 120 × 96 px), a mint pill with a scoop icon and the remaining count
  (e.g. "3 → 2 → 1"). Tapping anywhere on the tray does the same thing. It turns off when the action is done.
- **Answer bar:** 3 buttons, each ≥ 96 px (`--hit-answer`), `data-answer="<n>"`. They stay hidden
  (or greyed and not tappable) until the action is finished, so the child can't guess before seeing the math.

### 4.4 Mode loops

Keep each problem under ~40 s including counting.

**Plop!** (take away)
1. Customer walks up. Tray fills with `start` scoops (pop-in, 60 ms apart; instant if reduced motion).
2. Oh-no sign shows `take`. A gust tone plays.
3. Child taps the action button `take` times. Each tap: the end scoop pops off and plops,
   the count chime plays (1, 2, 3… = scoops fallen), and the sign's dots go down by one.
4. When the sign reaches 0, the equation shows `start − take = ?` and the answer bar appears.
5. Child taps how many are **left**.

**Drip Drop** (count back)
1. Tray shows `start` scoops. Above it is a **number path**: a row of 11 tiles ending at `start`
   (`max(0, start − 10) … start`), each tile a little ice-cream-stick numeral. A cone marker sits on `start`.
2. Oh-no sign shows `take` (1–3). The sun "drips" on the cart.
3. Each tap: one scoop melts away (it shrinks into a drip, no splat), the marker hops back one tile, and the
   chime plays the **new** number (counting back: 11… 10… 9). The number shows up only as the marker moving, not as a caption.
4. After `take` hops: equation + answer bar. Answer = where the marker landed.

**Oops!** (missing part)
1. Tray shows `start` scoops for 1.2 s ("look!"), with a numeral badge `start` on the tray.
2. A shake: `take` scoops fall all at once (off screen, splat sound). Their cells now show **dashed scoop outlines** (ghosts).
3. Equation: `start − ? = left`. Oh-no sign shows "?" instead of a number.
4. No action button. Answer bar shows right away. Child taps **how many fell**.
5. The child can tap ghost cells to count them (each tap: chime + soft highlight, no penalty).
   This is allowed counting, not an answer.

**Ten Trick** (cross ten)
1. Two trays: top tray full (10), bottom tray holds `start − 10`. Oh-no sign shows `take`.
2. The equation strip shows `start − take = ?` and, under it, a split hint row: `take` drawn as
   `[ones part] + [rest]` bubbles (e.g. 5 → 3 and 2), the first bubble lit.
3. Child taps the action button. Scoops fall from the bottom tray first. When the bottom tray is empty:
   **pause 600 ms**, the top tray glows, a "Ten!" badge with a chime chord, the first bubble gets a check, the second lights up.
4. Remaining taps take scoops from the top tray.
5. Equation + answer bar; answer = `left`.

**Sundae Sampler**: each problem uses its own mode's loop. The map card and the progress strip show a small
mode icon so the change is not a surprise.

### 4.5 Feedback and hint ladder

Same rules as the other games: **retry → auto-count → reveal, and the child must still tap the right numeral.**

| Event | What happens |
| --- | --- |
| Correct | Button goes green **and** shows a check + star (never colour alone). Cheer chord. A sprinkle burst on the tray. The customer gets a cone with the leftover scoops (Oops!: the cone holds `start` because the fallen ones are "re-scooped") and walks to the progress strip. Next problem after ~1.1 s (`CELEBRATE_MS`). |
| Miss 1 (hint 1) | That numeral wobbles, turns amber with a rewind icon, and goes greyed for this problem. Soft nudge tone. Nothing else changes. |
| Miss 2 (hint 2: count with me) | Input locks. The game counts the answer quantity aloud with chimes, one item at a time (420 ms each, 280 ms reduced): Plop!/Ten Trick: leftover scoops; Drip Drop: replays the hops back; Oops!: the ghost cells. Each item gets a caption numeral. Then input unlocks. |
| Miss 3 (hint 3: reveal) | The correct numeral gets a glowing outline and gently bounces; the other two dim. Only the correct one can be tapped. |
| Taps during animations | Ignored (input lock), like Jump-Jump `inputLocked`. |

`triesUntilCorrect` (1, 2, 3, 4) is saved to `recent` and used for band moves.
Reaching the reveal counts as 4.

### 4.6 Parade (end of visit)

- The 5 customers walk across the boardwalk left → right holding their cones. Sprinkles fall. Cheer melody (3–5 notes).
- A star stamp is added to the stand's card (cosmetic; max 3 shown).
- Lasts ~4 s, tap anywhere to skip. Then the map opens. If an unlock happened, the new stand bounces once on arrival.
- Reduced motion: customers fade in place, no walking.

### 4.7 Settings (grown-ups)

Copy Jump-Jump `SettingsScreen.js`. Hold the **sun** icon 3 s (with a fill ring) to show:
- **Unlock all stands** (toggle)
- **Reset progress** (confirm with a second 3 s hold)
- Sound and motion (auto / reduce / full) toggles, the same as Jump-Jump.

---

## 5. Visual design

### 5.1 Palette (`oh-no-ice-cream/src/styles/tokens.css`)

Keep the same token **names** as Jump-Jump where they exist, so CSS copied from it still works.

| Token | Hex | Use |
| --- | --- | --- |
| `--color-sky` | `#C9F2E3` | background (mint sky) |
| `--color-sky-deep` | `#8EDDC4` | gradient bottom, gate card |
| `--color-blush` | `#FFF4D6` | vanilla panels |
| `--color-rose` | `#F48FB1` | strawberry accents, umbrella stripes |
| `--color-berry` | `#B23A6A` | pressed state, outlines on pink |
| `--color-cream` | `#FFF8EA` | cards, answer buttons |
| `--color-ink` | `#3B2418` | chocolate ink: numerals, outlines |
| `--color-cone` | `#E9B872` | cones, number-path tiles |
| `--color-cone-deep` | `#C98B3C` | waffle lines |
| `--color-boardwalk` | `#D9B38C` | ground planks |
| `--color-success` | `#2F9E6B` | always with check + star |
| `--color-retry` | `#E6A23A` | always with rewind icon |
| `--color-lock` | `#8A8A8A` | locked stands |

`theme-color` meta: `#8EDDC4`. Numerals on cream need contrast ≥ 7:1 (`#3B2418` on `#FFF8EA` passes).

### 5.2 Scoops (inline SVG, not sprites)

Scoops are drawn with inline SVG so they stay sharp at any size, can be recoloured, and need no image files.
- 5 flavours: strawberry `#F7A1C4`, vanilla `#FFF1C9`, mint `#A8E6CF`, chocolate `#8B5A3C`, blueberry `#A9B8F5`.
- Shape: round scoop with a wavy drip bottom edge, 4 px ink outline at 64 px, a white shine at the upper left, a face (two dot eyes, a smile). When falling, the face becomes an "o" mouth (separate SVG group, toggled by class).
- **One flavour per problem** for scoops that stay. Do **not** colour the leftover scoops differently from the falling ones before they fall (colour must not give away the answer). In Ten Trick, the top tray may use a second flavour to show the ten.
- Splat: a flattened puddle of the same flavour plus 3 sparkle dots, fading out over 700 ms.
- File: `src/ui/Scoop.js` exports `scoopSvg(flavour, { face: 'happy' | 'oh' })` and `splatSvg(flavour)`.

### 5.3 Images (webp, same pipeline as Toot-Toot sprites)

| ID | Use | Notes |
| --- | --- | --- |
| `cart.webp` | title, gate card | ice-cream cart with mint/white striped umbrella, ¾ view, thick rounded outlines, same toy/plush style as `train.webp` |
| `cone.webp` | customer cone, progress slots | waffle cone, empty; scoops are SVG stacked on top |
| `sun.webp` | Drip Drop, settings hold target | friendly sun with a face, like Toot-Toot's |
| `animal-*.webp` | customers | **copy** from `public/images/sprites/` |

If image generation is not available, draw `cart`, `cone` and `sun` as inline SVG in the same style
(thick ink outline, flat colours, soft shading). The game must work with SVG only.

Art style: thick rounded outlines, soft shading, warm light from the upper left, no realistic textures.
Original designs only; don't copy the look of any real ice-cream brand or character.

### 5.4 Motion

| Animation | Duration | Reduced motion |
| --- | --- | --- |
| Scoop pop-in | 180 ms, 60 ms apart | instant |
| Next-to-fall wobble | 1.2 s loop, ±4° | static ring outline instead |
| Fall + plop | 450 ms ease-in arc + 700 ms splat fade | 150 ms fade-out |
| Drip melt (Drip Drop) | 400 ms shrink down | fade |
| Marker hop back | 300 ms arc | jump |
| "Ten!" glow | 600 ms | glow only, no scale |
| Customer walk | 800 ms | fade |

Use transforms/opacity only (smooth on iPad). Honour `html.reduce-motion` the same way as Jump-Jump.

### 5.5 Layouts

Reuse Jump-Jump `layoutMode.js` unchanged: `wide` (landscape ≥ 700 px), `stacked` (portrait or < 700 px),
`unsupported` (< 360 px → "Make the window bigger" card).
- Wide: customer left, tray centre, Oh-no sign right; answers in a row under the action button.
- Stacked: progress strip → Oh-no sign + customer (one row) → tray(s) → equation → action → answers.
  Two trays must still fit on a 390 × 844 phone without scrolling the play screen (scoop cell ≥ 40 px).
- Hit targets: answers ≥ 96 px, action ≥ 96 px high, chrome buttons ≥ 64 px.

---

## 6. Audio (`AudioManager.js`, Web Audio tones only)

Copy Jump-Jump's `AudioManager.js` and extend it:

- `numberChimeFreq(n)` covers **0–20**: 0 = a low soft `196 Hz`, 1–10 the current scale, 11–20 continue
  the major scale up an octave (`988, 1047, 1175, 1319, 1397, 1568, 1760, 1976, 2093, 2349`), quieter (peak 0.10).
- New SFX ids:
  - `gust` — a soft noise-like sweep (triangle tone 300→180 Hz, 0.25 s)
  - `ohno` — two-note fall (`392 → 294 Hz`, 0.18 s each, triangle) when a scoop starts falling
  - `plop` — short low blip (`160 Hz`, 0.08 s) when it lands
  - `drip` — high blip down (`880 → 660 Hz`, 0.12 s)
  - `ten` — chord `523 + 659 + 784 Hz`, 0.3 s
  - keep `cheer`, `nudge`, `hop` (used for the marker)
- Captions: `showCaption(n)` shows a big numeral for counts, as in Jump-Jump.
- Mute and the voice setting behave the same as in Jump-Jump.

---

## 7. Code structure

Create `oh-no-ice-cream/` by **copying `jump-jump-bunny/` as a skeleton**, then change it. Keep files small
and the same shape as Jump-Jump.

```
oh-no-ice-cream/
  index.html                 # title "Oh-No Ice Cream", theme-color #8EDDC4, <div id="app">
  vite.config.js             # copy of JJB's, port 5175, same production CSP plugin
  vitest.config.js           # copy of JJB's
  public/
    favicon.svg              # a cone with one scoop
    fonts/fredoka.woff2, OFL.txt   # copy
    images/sprites/          # cart, cone, sun (+ copied animal-*.webp)
  src/
    main.js                  # copy of JJB's
    app/
      App.js                 # router (copy); modes from game/modes.js
      gate.js                # bundleParentHref: /\/(ttt|jjb|oic)(\/|$)/
      layoutMode.js          # copy
      input/pointer.js       # copy
      audio/AudioManager.js  # extended (section 6)
      storage/save.js        # section 8
      screens/
        TitleScreen.js
        MapScreen.js         # 5 stands, locks, stars, recommended glow
        PlayScreen.js        # shared shell: chrome, progress, answers, hint ladder
        ParadeScreen.js
        SettingsScreen.js
      play/                  # one view per mode, each exports { mount(stage, round, api) }
        plopView.js
        dripDropView.js
        oopsView.js
        tenTrickView.js
    game/
      rng.js                 # copy
      facts.js               # bands, legal fact lists, choices (pure)
      session.js             # round state machine (pure)
      progress.js            # band moves, unlocks, recommendedMode (pure)
      modes.js               # MODES, MODE_COPY, mode → bands
    ui/
      Scoop.js  Tray.js  NumberPath.js  OhNoSign.js  Equation.js
      Customer.js  MuteButton.js  GateButton.js  Scenery.js
    styles/ tokens.css base.css layout.css components.css
  tests/
    facts.test.js  session.test.js  progress.test.js  save.test.js  gate.test.js
```

### 7.1 Pure game API (`game/`)

```js
// modes.js
export const MODES = ['plop', 'dripDrop', 'oops', 'tenTrick', 'sampler'];
export const PLAYABLE = ['plop', 'dripDrop', 'oops', 'tenTrick']; // sampler mixes these
export const TRIP_LENGTH = 5;

// facts.js
export function legalFacts(mode, band)            // → [[start, take], ...]
export function makeChoices(problem, rng)         // → 3 shuffled ints incl. answer
export function nextProblem(mode, band, rng, history) // never throws
export function generateTrip(mode, progress, rng) // → 5 problems (sampler: mixed modes)

// Problem shape
{
  mode: 'plop' | 'dripDrop' | 'oops' | 'tenTrick',
  band: 'A' | 'B' | 'C' | 'D',
  start, take, left,             // start - take === left
  answer,                        // left, or take for 'oops'
  split: [onesPart, rest] | null,// tenTrick only: onesPart = start - 10
  flavour,                       // one of 5
  customer,                      // animal species id
  choices: [a, b, c],
}

// session.js (immutable updates, as in JJB session.js)
export function freshRound(problem, index)
// round: { problem, index, taken: 0, phase: 'acting'|'answering'|'solved',
//          misses, hintLevel, wrongPicks, triesUntilCorrect, tripDone }
// 'oops' starts in phase 'answering'.
export function act(round)            // one tap of the action button → { round, acted, count, reachedTen }
export function answer(round, value)  // → { round, correct, hintLevel, ignored }
export function revealed(round)       // hintLevel >= 3

// progress.js
export function recordSolve(progress, mode, tries)
export function endVisit(progress, mode)   // visits++, band move check, unlocks → { progress, changes }
export function isUnlocked(progress, mode, settings)
export function recommendedMode(progress, settings)
```

Rules the code must follow:
- `act` does nothing when `phase !== 'acting'`, or when `taken === take`. When `taken` reaches `take`, `phase` becomes `'answering'`.
- `reachedTen` is true on the tap that makes `start − taken === 10` in Ten Trick (and in Plop! band D).
- `answer` is ignored unless `phase === 'answering'`. When the answer is revealed, wrong values are ignored.
- A wrong pick in hint 1 is added to `wrongPicks` and that button is disabled.
- Sampler: the answer passed to `recordSolve` counts toward **the problem's own mode's** `recent`, not toward "sampler".

---

## 8. Save data (`ohNoIceCream.v1`)

```jsonc
{
  "v": 1,
  "settings": { "muted": false, "voice": true, "motion": "auto", "unlockAll": false },
  "progress": {
    "band":   { "plop": "A", "dripDrop": "A", "oops": "A", "tenTrick": "D" },
    "recent": { "plop": [], "dripDrop": [], "oops": [], "tenTrick": [] },   // triesUntilCorrect, last 8
    "visits": { "plop": 0, "dripDrop": 0, "oops": 0, "tenTrick": 0, "sampler": 0 },
    "bandVisits": { "plop": { "C": 0 } },                                     // for Ten Trick unlock
    "stars":  { "plop": 0, "dripDrop": 0, "oops": 0, "tenTrick": 0, "sampler": 0 }, // 0–3, cosmetic
    "unlocked": { "tenTrick": false, "sampler": false }
  },
  "meta": { "updatedAt": 0 }
}
```

- `load` / `persist` / memory fallback / `resetProgress`: copy Jump-Jump `save.js`. Use a different probe key, `__oic_probe`.
- Check every field when loading (bad band → default, non-numbers removed, lists cut to 8). Unknown or broken save → defaults, never throw.
- Never read or write `tootTootTwenty.v1` or `jumpJumpBunny.v1`.
- Save after every solved problem and when a visit ends.

---

## 9. Putting it in the bundle (exact changes outside `oh-no-ice-cream/`)

| File | Change |
| --- | --- |
| `package.json` | add `"dev:oic": "vite --host --config oh-no-ice-cream/vite.config.js"`; change `test` to `vitest run && vitest run --config jump-jump-bunny/vitest.config.js && vitest run --config oh-no-ice-cream/vitest.config.js` |
| `scripts/build-site.mjs` | after the JJB build, add a third `vite build --config oh-no-ice-cream/vite.config.js --outDir dist/oic --emptyOutDir`; copy any new gate art (e.g. `site/cone-wobble.svg`) |
| `site/index.html` | page title + h1 → **"Toot-Toot, Jump-Jump & Oh-No!"** (see open question 1). Add a third card: `<a class="gate-card gate-oic" href="./oic/" aria-label="Oh-No Ice Cream">` with the art and `<span class="gate-name">Oh-No!</span>` |
| `site/gate.css` | `.gate-oic .gate-art` mint gradient (`#e6fbf3 → #8eddc4`); body background three bands (blue → pink → mint); the CSS-only gate art: a cone with 3 stacked SVG scoops, the top one wobbling (none with reduced motion); 3 cards must fit in a row at 1024 × 768 and stack in portrait (existing `@media (max-width: 700px), (orientation: portrait)` rule) |
| `tests/gate.test.js` | expect 3 cards with hrefs `./ttt/`, `./jjb/`, `./oic/` |
| `scripts/smoke-bundle.mjs` | add: Oh-No card visible on desktop and phone; clicking it opens `/oic/` with "Tap to play" and "All games"; map shows `[data-mode="plop"]`, `dripDrop`, `oops`; play one full Plop! problem (tap action until it turns off, tap the correct `data-answer`); "All games" goes back to the gate |
| `eslint.config.js` | add `oh-no-ice-cream/src/**/*.js` and `oh-no-ice-cream/tests/**/*.js` to `files` |
| `README.md` | heading "Toot-Toot, Jump-Jump & Oh-No!"; one-line entry for Oh-No (subtraction within 20); an "Oh-No Ice Cream" section in the same style as the Jump-Jump section (5 stands, how to play, grown-ups hold the sun 3 s); dev command `npm run dev:oic` (port 5175); note it lives at `oic/` |
| `.github/workflows/*` | no change (they already run `npm test` and `npm run build`) |

---

## 10. Testing

### 10.1 Unit tests (Vitest, `oh-no-ice-cream/tests/`)

- **facts.test.js**
  - For every mode × band: every legal fact satisfies the band table (section 2.3) and `0 ≤ left`, `start ≤ 20`.
  - Band D facts all cross ten (`take > start − 10`, `left < 10`).
  - Drip Drop `take` limits per band.
  - 1,000 seeded `generateTrip` runs per mode: 5 problems, no repeated fact, no same `left` twice in a row, ≤ 1 zero.
  - `makeChoices`: 3 distinct ints in 0–20, includes the answer, ≤ 1 trap.
  - Sampler visit has ≥ 2 modes and only unlocked ones.
  - `nextProblem` with an empty fact list returns the fallback (never throws).
- **session.test.js**
  - `act` counts up to `take`, then is ignored; phase changes to `answering`.
  - `answer` before `answering` is ignored.
  - Hint ladder: miss → 1, 2, 3; at 3 only the right value is accepted; `triesUntilCorrect` = 4 after reveal.
  - Ten Trick: `reachedTen` fires exactly once, on the right tap.
  - Oops! starts in `answering` and the answer = `take`.
  - Last problem sets `tripDone`.
- **progress.test.js**: move up after 5 of 6 fast, move down after 2 reveals of 4, no change mid-visit, band limits per mode, Ten Trick and Sampler unlock rules, `unlockAll`, `recommendedMode`.
- **save.test.js**: defaults, round-trip, bad JSON, wrong `v`, bad band strings, too-long lists, memory fallback when `localStorage` throws, does not touch other games' keys.
- **gate.test.js**: `bundleParentHref('/yuzubomath/oic/')` → `'../'`; `/` → `null`.

### 10.2 Play it (required before publishing)

As the `expand-game-types` agent rules say: **one screenshot is not a playthrough.** In Chrome, on a fresh save:

1. Gate at 1280 × 800 and 390 × 844: 3 cards, none cut off.
2. Open Oh-No → title → map: 3 open stands, 2 locked.
3. Play one full Plop! visit: answer some right, and at least one problem wrong 3 times to see every hint level. Check that scoops fall from the end, the sign counts down, the answer bar appears only after the action, and the parade plays and leads back to the map.
4. One visit each of Drip Drop and Oops!.
5. Settings → hold sun → unlock all → play Ten Trick: "Ten!" pause appears at the right moment.
6. Reload the page: progress and mute state are kept. Toot-Toot and Jump-Jump still open and keep their own saves.
7. Mute on: no sound. Reduced motion (`prefers-reduced-motion` or setting): no wobble or walking.
8. No console errors. Save screenshots in `tmp-smoke/oic/` (that folder is git-ignored).

Fix what the run finds, then run `npm test`, `npm run lint` and `npm run build` again.

---

## 11. Build order (one commit each)

1. Skeleton: copy JJB into `oh-no-ice-cream/`, rename, port 5175, save key, empty title. Bundle wiring
   (package.json, build-site, eslint). `npm run build` shows `dist/oic/`.
2. `game/` pure modules + all unit tests (facts, session, progress, save).
3. UI parts: `Scoop`, `Tray`, `OhNoSign`, `Equation`, tokens/CSS.
4. Plop! end to end (shared `PlayScreen`, hint ladder, parade).
5. Drip Drop (`NumberPath`).
6. Oops! (ghost cells, tap-to-count).
7. Ten Trick + Sampler + map locks/stars + settings.
8. Gate card, gate test, smoke script, README.
9. Full playthrough (10.2) and fixes.
10. Publish (section 12).

---

## 12. Publishing

Publish exactly as Jump-Jump was published:

1. Work in **this folder** (`MathGames/Jump-Jump-Bunny`, the bundle repo) on a new branch
   (e.g. `oh-no-ice-cream`), not in the separate `MathGames/Toot-Toot-Twenty` folder.
   Both folders point at the same GitHub remotes; pushing `main` from the wrong one could undo the bundle.
2. Before committing, run `git config core.fileMode false` so the Synology permission-only changes
   (≈150 files showing as modified) don't end up in the commits. Commit only real changes.
3. `npm test && npm run lint && npm run build` must pass.
4. Merge to `main` and push the same way the "Bundle Jump-Jump Bunny…" work was pushed. The `pages` workflow runs
   tests, builds, and pushes `dist/` to `gh-pages`.
5. Check the live site: `https://yuzubopaw.github.io/yuzubomath/` shows 3 cards, and `…/yuzubomath/oic/` loads on an iPad in Safari.
   If the live site is served from a different repo name than `origin`, check which remote served the
   Jump-Jump release (`git log` around commit `3224a83`) before pushing.

---

## 13. Done means

- Oh-No Ice Cream can be opened from the gate and plays all 5 stands (2 after unlocking) on iPad Safari and desktop Chrome.
- All three games' tests pass in `npm test`. Toot-Toot and Jump-Jump play exactly as before, with their saves kept.
- It's live at `/yuzubomath/oic/`.
- Builder reports: files touched, playthrough findings and fixes, live URL.

---

## 14. Open questions (defaults chosen; the owner may change them)

1. **Gate page name.** Default: "Toot-Toot, Jump-Jump & Oh-No!". Alternative: a short umbrella name such as "Yuzubo Math".
2. **Visit length.** Default 5 problems (like Jump-Jump). Toot-Toot uses 6.
3. **Zero.** Band B includes answers of 0 (e.g. 6 − 6), at most once per visit. Remove if it confuses the child.
4. **Ten Trick unlock.** Default: when Plop! reaches band C. A grown-up can unlock early in Settings.
