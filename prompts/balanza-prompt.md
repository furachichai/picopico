# Build "Balanza" — an interactive balance-scale algebra sandbox

Build a self-contained mini-game (a "cartridge") that teaches equation balancing through a
physical two-plate weighing scale. The player drags big emoji weights onto the plates; the
beam tilts to reflect whether the equation is currently true, and a written equation below
the header updates live to match whatever is on the plates.

This is a **free-play sandbox**, not a scored puzzle: no steps counter, no mistakes counter,
no submit button. The learning happens by watching the scale and the notation respond.

**Critical correctness requirement:** the game contains two categories of move —
rearrangements that must *never* change the equation's truth, and deliberate weight changes
that *do*. These must be enforced separately and read differently on screen. Section 4
specifies this; implement it before any other interaction.

Reference stack: **React 19 + Vite + framer-motion**. The entire scale is drawn in CSS — no
image assets.

---

## 1. Data model

A plate holds a bag of **terms**:

```js
{ id: string, coeff: number, variable: string | null }
```

- `variable` is an emoji (`'🍎'`), a letter (`'x'`), or `null` for a plain number (then
  `coeff` is the number itself).
- `coeff` is the count/multiplier: `{coeff: 2, variable: '🍎'}` renders as "2🍎".
- Terms are compared with plain `===` on `variable`, so two of the same emoji merge and two
  plain numbers always merge (numbers just add).

State:

```js
leftPlate:  Term[]      // unordered bag
rightPlate: Term[]
menuItems:  { key, variable, unitCoeff, available }[]   // the supply tray
```

---

## 2. Weights and tilt

Each symbol has a numeric weight. **Weights default to 1 automatically** — the author never
has to fill in a table. An optional override map lets them make one symbol heavier
(`🍌=2`). Plain numbers are their own weight (a "5" tile weighs 5).

```js
weightOf(variable, weights) = variable === null ? 1 : (weights[variable] ?? 1)
termValue(term, weights)    = term.coeff * weightOf(term.variable, weights)
plateTotal(terms, weights)  = sum of termValue
tiltAngle = 18 * Math.tanh((rightTotal - leftTotal) / 4)
```

`tanh` keeps the tilt bounded and smooth — sensitive near balance, saturating gracefully for
big differences, never clipping hard. Negative angle = counter-clockwise = **left side dips
down** (heavier side sinks), which is the physically expected direction.

Apply it as a plain CSS transform with a transition:
`transform: rotate(${tiltAngle}deg); transition: transform 0.45s cubic-bezier(0.34,1.2,0.64,1)`.

**Compare weights with an epsilon, never `===`.** Weight overrides are parsed with
`parseFloat`, so fractional weights are legal, and `0.1 × 3 !== 0.3` in floating point — an
exact comparison means such a scale can never reach equilibrium. Use `Math.abs(a - b) < 1e-9`
everywhere totals are compared, including the completion check.

**This is a pedagogical truth-indicator, not a physics simulation.** A transposed negative
term makes its plate compute as "lighter than empty," which is correct for the *equation*
even though no real object has negative mass. That's intended.

---

## 3. Interactions

| Gesture | Result | Category |
|---|---|---|
| Drag from menu → plate | Adds a unit term; decrements that row's `available` (blocked at 0) | **changes** the equation |
| Drag a tile → menu | Removes it, returns `abs(coeff)` units to the matching menu row | **changes** the equation |
| Drag a tile → menu with no matching row | Disallowed, snaps back | — |
| Drop **onto** a matching tile on the same plate | Merges them (coeffs sum → "2🍎") | preserves the equation |
| Drop onto empty plate space | Lands as a separate tile (merging is deliberate, never automatic) | preserves the equation |
| **Tap** a merged tile ("2🍎") | Splits back into that many unit tiles | preserves the equation |
| Drag a tile to the **other** plate | **Transposes**: coefficient is negated, tile moves across | preserves the equation |
| Tap a plain number tile | Nothing (no meaningful split) | — |

That "no matching menu row → can't return it" rule is a deliberate authoring lever: a symbol
placed on a plate but absent from the supply tray becomes a **fixed weight** the player can
transpose and merge but never remove from play.

**Zero handling:** when a merge cancels to `coeff === 0` (🍎 + −🍎), the tile disappears by
default. An author toggle can instead keep it as a crossed-out "0" tile to make the
cancellation explicit.

**Negative tiles render with `filter: invert(1)`** — a film-negative look. Do **not** mirror
them with `scaleX(-1)`; a flipped count digit reads as garbled text. Keep the `−` sign in the
label too, so meaning never depends on the color effect alone.

---

## 4. Keeping the equation honest

### 4.1 The invariant

Define the scale's state as a single number:

```js
delta = plateTotal(leftPlate) - plateTotal(rightPlate)
```

Every move falls into exactly one category, and the rule is mechanical:

> **Merge, decompose, and transpose must leave `delta` exactly unchanged.
> Only menu moves (add / remove) may change it.**

Verify each one holds:

- **Merge** `🍎 + 🍎 → 2🍎` — same plate, same total. `delta` unchanged. ✓
- **Decompose** `2🍎 → 🍎 + 🍎` — inverse of merge. `delta` unchanged. ✓
- **Transpose** moving term `t` from left to right *with negation*: left loses `v`, right
  gains `−v`, so the new delta is `(L − v) − (R − v) = L − R`. **Exactly unchanged.** ✓

This is why the negation is not decoration — it is precisely what makes moving a weight
across the scale a legal algebraic step instead of cheating.

### 4.2 Enforce it as a hard runtime guard

Route every mutation through one chokepoint that classifies the move and checks the invariant
before committing:

```js
function commitMove(candidate, category) {
  const before = delta(current), after = delta(candidate);
  if (category === 'preserving' && Math.abs(after - before) > EPS) {
    rejectMove();               // state untouched
    logInvariantViolation();    // loud in dev
    return;
  }
  setState(candidate);
}
```

Because a preserving move is defined by arithmetic rather than by which gesture produced it,
this catches sign-flip bugs, merge bugs, and decompose bugs generically — including ones you
haven't thought of.

**Guard against the guard's own blind spots:** log every rejection with the move, the two
deltas, and the before/after plates, so a wrongly-blocked legal move surfaces as a visible bug
rather than a mystery no-op. Unit-test `commitMove` against a table of known-preserving moves
(merge, decompose, transpose in both directions, transposing a negative tile back) and
known-changing ones (menu add, menu return), asserting each is classified and handled correctly.

### 4.3 The payoff: the beam becomes the lesson

Because every preserving move leaves `delta` identical, and `tiltAngle` is a pure function of
`delta`:

> **The beam never moves when the player rearranges the equation. It moves only when the
> player actually changes it.**

That is a free, self-evident teaching signal — legal algebra visibly doesn't disturb the
balance. Lean into it in the presentation (see §5).

---

## 5. Distinguishing the two kinds of move on screen

Both categories stay available — free experimentation is the point — but they must read
differently, or a student can't tell which moves are "legal algebra."

**Preserving moves (merge, decompose, transpose):**
- The beam stays completely still (this happens for free — do not add any animation that
  fakes movement here).
- Transposed tiles get the negative-filter treatment.
- A soft, light confirmation sound.
- Optionally, briefly pulse the equals sign / both plates together to signal "still balanced
  the same way."

**Changing moves (menu add / remove):**
- The beam visibly re-tilts to its new angle.
- A heavier "weight landed" sound, distinct from the preserving one.
- Optionally, briefly highlight the plate whose total changed.

Document this pairing in any in-game help text: *rearranging never moves the beam; adding or
removing weight does.*

---

## 6. Author-facing config

Follow a compact text-DSL per field (one string each, no dynamic table UI):

```js
{
  weightsText:    "🍌=2",        // optional; every unlisted symbol defaults to 1
  leftPlateText:  "🍎, 🍎",      // comma- or space-separated tokens
  rightPlateText: "🍎",
  menuText:       "2x🍎",        // one "<count>x<symbolOrNumber>" per line
  showZeroTiles:  false
}
```

A good default: left `🍎, 🍎` (=2), right `🍎` (=1), menu `2x🍎`. Deliberately imbalanced via a
plain count difference, so the demo teaches the mechanic without needing any weight override.

For the weights editor, auto-derive the list of symbols actually in use from the other three
fields and render one number input per symbol pre-filled with 1 — serialize back only the
rows the author actually changed. That's what makes weights feel automatic rather than a
form to fill in.

---

## 7. Parsing (emoji-safe — the subtle part)

Do **not** reuse a letter-based term parser: character classes like `[a-zA-Z]` will never
match emoji. Write a dedicated tokenizer:

```js
parseBalanzaToken(tok)      // /^([+-]?)(\d*)(.*)$/  → sign × digits = coeff, rest = variable
parseBalanzaExpression(str) // see below
parseWeights(text)          // "symbol=number" per line
parseMenuInventory(text)    // "<count>x<symbol>" per line
collectUsedSymbols(l, r, m) // distinct symbols across all three fields, for the editor
```

`parseBalanzaExpression` must normalize before splitting:

```js
str.replace(/,/g, ' ')            // commas are just separators
   .replace(/\s*([+-])\s*/g, '$1') // glue signs to the token that follows
   .trim()
   .match(/[+-]?[^+\-\s]+/g)
```

**The continuation class must exclude whitespace.** A pattern like `[^+-]*` (excluding only
signs) greedily swallows spaces and merges `"🍎, 🍎"` into a single token — which silently
renders one apple instead of two and leaves the scale perfectly level when it should tilt.
That bug is invisible until you assert on the computed rotation.

---

## 8. The scale graphic (CSS only)

Side view of a rigid apothecary-style balance. **Plates sit on top of the beam on short
struts — they do not hang.**

Build the whole apparatus as **one flex column** so the parts are physically connected:

```
.scale-assembly  (flex column, align-items center)
├── .beam        (position: relative — the rotating element)
│   ├── .plate-assembly-left   (absolute, bottom:100%, left:0,  translateX(-50%))
│   │   ├── .plate-items       ← drop target ref; flex-wrap row of tiles
│   │   ├── .dish              ← shallow ellipse (border-radius 50%, ~100×26px)
│   │   └── .strut             ← short vertical connector down to the beam
│   ├── .pivot-dot             (absolute, centered)
│   └── .plate-assembly-right  (mirror of left: right:0, translateX(50%))
├── .post        (CSS triangle via borders — tapered wooden post)
└── .base        (rounded bar + a radial-gradient ground shadow)
```

Two layout traps, both of which produce visibly broken output:

1. **Don't absolutely position the post and base with guessed `bottom:` offsets** while the
   beam floats centered in a flexible area. They drift apart into a disconnected gap at any
   container height. Stack them as normal flex-column siblings so they always touch.

2. **Give the beam a fixed pixel width (~200px), never a percentage.** Inside a shrink-to-fit
   flex column the percentage has no definite containing block to resolve against and
   collapses to a fraction of its intended size — which drags the two plates inward until
   they overlap.

Keep dishes ~100px wide, anchored centered on the beam's endpoints, so with a 200px beam
there's ~100px of clear space between them and they can never overlap. Total footprint stays
~300px, safe on narrow phones.

---

## 9. Layout and chrome

- Root class, `position: absolute; inset: 0; overflow: hidden; touch-action: none;` flex column.
- A top bar with a round `↺` **restart** button (re-parses the original config and resets
  interaction state). Give this bar `margin-top: 72px` so it clears the host app's progress-bar overlay.
- The **live equation line** sits directly below that top bar — a read-only text rendering of
  both plates joined by `=`, with an empty side rendering as `0` (e.g. `🍎 + 🍎 = 2🍎`).
- The scale fills the middle.
- The **supply menu** is a row of tiles at the bottom, each showing its symbol and an `×n`
  count badge, dimmed and non-draggable at 0.
- Plate tiles ~1.7rem (bigger than menu tiles for easy touch targets, small enough that a
  few fit on a compact dish).

---

## 10. Drag implementation — read before writing drag code

1. **Never put framer-motion's `layout` prop on any ancestor of a draggable tile.** Layout
   FLIP animations and drag transforms conflict and send elements flying off-screen.
2. **Render the dragged visual as a portal ghost**: set the real tile to `opacity: 0` (it stays
   in flow) and render a ghost via `createPortal(..., document.body)` at a `dragPos` updated in
   `onDrag`. Portal to `document.body` specifically — `position: fixed` inside a transformed
   ancestor anchors to that ancestor, not the viewport.
3. Hit-test the three zones (left plate items, right plate items, menu) with
   `getBoundingClientRect()` against `info.point` at drag end, padded ~26px. For merge
   detection, hit-test individual tiles via a `data-term-id` attribute, padded ~12px.
4. **Initialize plates and menu with lazy `useState(() => parse(config...))`, never a
   `useMemo` derived from config.** Re-deriving on every render wipes every drag mutation.
   The read-only weights map is safe to `useMemo`.

---

## 11. Host integration contract

```jsx
<BalanzaCartridge config={{...}} preview={bool} onComplete={fn} />
```

- `preview === true` → static non-interactive snapshot for editor thumbnails.
- `onComplete()` fires **once**, the first time the scale reaches true equilibrium
  (`Math.abs(leftTotal - rightTotal) < EPS`, both plates non-empty) **after at least one
  player action**. Guard with a ref, not state, so it can't double-fire; require the
  interaction flag so a config that happens to start balanced doesn't complete instantly on
  load. The cartridge stays interactive afterwards — it's a sandbox, not a level.

---

## 12. Verification checklist

Drive it in a real browser (headless Playwright works well) and assert:

- **The invariant holds under fuzzing**: from several starting configs, apply long random
  sequences of preserving moves (merge / decompose / transpose) and assert the computed
  `delta` — and therefore the beam's computed `rotate()` value — is **bit-for-bit unchanged**
  from start to finish. This is the single highest-value test in the game.
- Default config renders imbalanced with a **non-zero** beam rotation in the correct
  direction (heavier side down). Read the computed `transform`, don't eyeball it — a
  tokenizer bug shows up as `rotate(0deg)` with two apples rendered as one.
- Measure the two dishes' bounding boxes and assert they don't intersect.
- Menu → plate merges into "2🍎", decrements the supply badge, and **does** change the tilt.
- Tapping "2🍎" yields two separate tiles again and does **not** change the tilt.
- Cross-plate drag negates the coefficient, does **not** change the tilt, and the resulting
  tile's computed style shows `filter: invert(1)` with `transform: none`.
- Plate → menu increments the supply count back.
- A config with fractional weights (e.g. `🍎=0.1` × 3 vs `🍌=0.3`) still reaches equilibrium —
  proving the epsilon comparison is in place.
- Zero console errors throughout.
