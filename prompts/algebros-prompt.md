# Build "algeBROS" — a drag-and-drop algebra manipulation game

Build a self-contained mini-game (a "cartridge") that teaches algebraic manipulation
through direct manipulation of term cards. The player never types an answer — they
physically drag, tap, merge, and cancel terms, and the notation updates to match.

**The single most important requirement: the equation on screen must remain mathematically
equivalent to the starting equation after every single operation.** A game that silently
drifts into a false equation teaches the wrong thing. Section 4 specifies how to guarantee
this; read it before implementing any state mutation.

Reference stack: **React 19 + Vite + framer-motion**. All visuals are CSS (no image
assets). Sound via the Web Audio API.

---

## 1. Core concept

Everything on screen is a **term card**. A term is:

```js
{ id: string, coeff: number, variable: string | null, groupId: string }
```

- `variable: null` means a plain number (`coeff` carries the value: `{coeff: 14, variable: null}` = "14").
- `variable` is an opaque string compared with `===`. It can be `'x'`, `'y'`, `'x^2'`, `'ax'`.
- `groupId` links cards that belong to **one conceptual term** and must be treated as a
  unit. When you decompose `2x` into `2 · x`, both resulting cards share the original
  `groupId` — that's how the renderer knows to draw a `·` between them (multiplication)
  rather than a `+` (addition), and how dragging moves the whole group across the equals sign.

**Adjacent cards with the same `groupId` = one multiplied term. Cards with different
`groupId` = separate additive terms.** This single rule drives the entire renderer, and
`splitIntoAdditiveGroups(terms)` (group consecutive same-`groupId` runs) is the helper every
legality rule below is written in terms of.

---

## 2. Three topics (game modes)

The player picks one on the start screen; each has 10 generated levels.

### `liketerms` — combine like terms
One flat list of terms, e.g. `3x + 5 + 4x`. Player clicks the operator button between two
**adjacent like terms** (same `variable`) to merge them (`combineTerms` sums the coeffs).
Clicking between unlike terms is a mistake (shake + error sound). Solved when all remaining
terms have distinct variables (`isFullySimplified`).

### `divisions` — cancel matching factors
A fraction: a numerator list over a denominator list, both **products** of factors, e.g.
`7x · 12 / (4 · b)`. Player taps a card to decompose it into factors, then uses a
**slice/swipe gesture** dragging across a numerator card and a matching denominator card to
cancel them (they must be *exactly equal* — same coeff and variable). Solved when no
matching pairs remain (`isDivisionSimplified`) and nothing is left un-recombined.

Note: here the numerator is a **product**, so cancelling one factor is always safe. That is
*not* true in equations mode — see §4.

### `equations` — isolate the variable (the richest mode)
Two sides of an equals sign, each side being a fraction:

```
numTerms / denTerms   =   rightNumTerms / rightDenTerms
```

Four flat arrays of terms in state. Semantics differ per role, and this asymmetry is the
source of every math bug in this game:

- **Numerator = a SUM.** Consecutive same-`groupId` runs are one multiplied term; different
  groups are joined with rendered `+` / `−` based on the leading term's sign.
- **Denominator = a PRODUCT that divides the ENTIRE numerator sum.** Entries are joined with
  `·`, never `+`/`−`. `(7 − 3)/2` is one fraction whose denominator applies to both the 7
  and the 3 — not a denominator that belongs to the 7 alone.

---

## 3. Interactions (equations mode)

| Gesture | Result | Legality constraint |
|---|---|---|
| Tap a term with coeff>1 and a variable (`2x`) | Splits into `2 · x` (same groupId) | always legal (value-preserving) |
| Tap a composite number (`6`) | Popover offering prime splits (`2 · 3`), via portal | always legal |
| Tap a prime (`7`) | Nothing | — |
| Click the `·` between two same-group factors | Multiplies them back together | always legal |
| Drag a term horizontally within its side | Reorders it among the additive groups | always legal |
| Drag a term across the equals sign | **Transposition**: sign flips, moves to other side's numerator | see rule T and rule F |
| Drag a term below a side | Moves it into that side's **denominator** (divides both sides) | see rule D |
| Swipe across a numerator card and an equal denominator card | Cancels the common factor | see rule C |

Negative numbers decompose to `-1 · positive` before prime factoring.

### Solved condition (`isEquationSolved`)
The side holding the unknown must be exactly `[{coeff: 1, variable: unknownVar}]` with an
**empty** denominator. The other side must contain no unknown and be "fraction-simplified."

The other side may legitimately hold **multiple additive terms sharing one denominator** —
`x = 7/2 − 3/2` is a valid solved state. So:

- Do **not** gate on `rightNum.length <= 1`. Only the *isolated* side needs length 1.
- `isFractionSimplified` must loop over **all** numerator terms × all denominator factors,
  checking `gcd(numCoeff, denCoeff) === 1` and no shared variable letters. An implementation
  that only checks `numTerms[0]` vs `denTerms[0]` silently passes unsimplified answers.

---

## 4. Keeping the equation honest

This section is the heart of the spec. Implement it *first*, not last.

### 4.1 The invariant

Every legal algebraic operation transforms an equation `A = B` into `A' = B'` such that

> **(A' − B') = k · (A − B)** for some **nonzero constant k**, for all variable assignments.

Transposing a term is `k = 1`. Dividing both sides by `d` is `k = 1/d`. Cancelling a common
factor `d` is `k = 1/d`. Decomposing or recombining a term is `k = 1`. Anything that cannot
be expressed this way has changed the solution set and is illegal.

Implement it as a **hard runtime guard at a single chokepoint**. Every mutation produces a
*candidate* next state which is committed only if it passes:

```js
function commitMove(candidateState) {
  if (!isEquivalentTransformation(originalState, candidateState, variables)) {
    rejectMove();            // shake, error sound, state untouched
    logInvariantViolation();  // loud in dev — see 4.6
    return;
  }
  setState(candidateState);
}
```

Checking `candidateState` against the **level's original state** (not merely the previous
state) means small per-step rounding or logic errors can't accumulate unnoticed.

### 4.2 How to check it

Numerically, with a handful of probe assignments:

```js
evaluateSide(numTerms, denTerms, assignment)
// numerator: Σ (coeff × Π variable^exponent), grouped by groupId for products
// denominator: Π of its factors; return num / den (guard den === 0)

equationDelta(state, assignment) = evaluateSide(left...) - evaluateSide(right...)

isEquivalentTransformation(before, after, variables):
  ratios = []
  for ~4 probe assignments (random non-integer values like 1.7, -2.3, 0.6):
    d0 = equationDelta(before, probe)
    d1 = equationDelta(after,  probe)
    if any denominator hit 0 -> skip this probe
    if |d0| < EPS -> skip (probe happens to be a solution; ratio undefined)
    ratios.push(d1 / d0)
  return ratios.length > 0
      && ratios.every(r => Math.abs(r - ratios[0]) < EPS)
      && Math.abs(ratios[0]) > EPS      // k must be nonzero
```

Use non-integer probes so you rarely land on an actual solution, and compare with an
epsilon (`1e-9`) — never `===` — because division makes floats unavoidable.

### 4.3 Rule D — dividing a side must divide the *whole* side

**The bug this prevents:** in `2x + 3 = 9`, tapping `2x` → `2 · x` and dragging the `2` into
the right denominator yields `x + 3 = 9/2`, whose solution is 1.5 instead of 3. The card was
removed from one additive group, but the right side was divided in full.

**Rule:** moving a factor into a denominator is allowed **only when the source side consists
of exactly one additive group** (`splitIntoAdditiveGroups(sourceNum).length === 1`).

With `2x + 3 = 9` the player must transpose the `3` first, reaching `2x = 9 − 3`, before the
`2` can be moved. That is the correct solving order and the constraint teaches it. Reject
otherwise with a specific message ("combine or move the other terms first").

### 4.4 Rule C — cancellation across a shared denominator is atomic and distributive

**The bug this prevents:** with `(10 − 4)/2`, decomposing `10 → 2·5` and cancelling that `2`
against the denominator leaves `5 − 4` = 1, but `(10 − 4)/2` = 3. One term got divided; the
other didn't.

**Rule:** a factor may be cancelled against the denominator only when it is **exposed as a
factor in every additive group of that numerator**. The cancel gesture then removes it from
**all** of them *and* the denominator in a single atomic action.

So for `(10 − 4)/2` the player must decompose `10 → 2·5` **and** `4 → 2·2`, then one cancel
gesture yields `5 − 2` = 3. ✓ Correct, and it teaches factoring out a common divisor.

If the player attempts a cancel while only some terms expose the factor, reject with a
message naming what's missing ("every term on top needs that factor first") and highlight
the terms that don't have it yet.

### 4.5 Rules T and F — transposition details

**Rule T (multi-card groups):** when a group like `2 · x` transposes, negate **only the first
card** of the group. Negating every card gives `(−2)·(−x) = +2x` — the sign flip cancels
itself out and the equation breaks.

**Rule F (fractioned target):** a term dragged across into a side that already has a real
denominator must land in that side's **denominator**, never its numerator. Adding an
undivided term to an already-divided sum is incoherent: `a/c + b ≠ (a + b)/c`. Detect this
at drag time (target side has a non-empty, non-`1` denominator) and route the drop
accordingly, so the drag hint previews the correct destination.

### 4.6 Making the guard trustworthy

A hard guard can itself have blind spots and silently refuse legal moves. Defend against that:

- **Log every rejection loudly in dev** (the operation, before/after states, computed ratios).
  A legitimate move being blocked must surface as a visible bug, never a mystery no-op.
- **Unit-test the checker directly** against a table of known-legal transformations (transpose,
  divide both sides, distributive cancel, decompose, recombine, reorder) and known-illegal ones
  (the two bugs above, negating both cards of a group, dropping into a fractioned numerator).
  Assert legal ⇒ passes and illegal ⇒ fails, independent of any UI.
- **Fuzz it**: from each generated level, apply long random sequences of *legal* moves and assert
  the guard never rejects and `equationDelta` ratios stay consistent throughout.

---

## 5. Engine API (pure functions, no React)

```js
makeTerm(coeff, variable, groupId?)      // generates id + groupId if absent
parseTermString("−3x^2")                 // regex: /^([+-]?)(\d*)([a-zA-Z]+(?:\^\d+)?)?$/
formatTerm(term, isFirst)                // -> { sign: '+'|'-'|'', value: '7x' }
areLikeTerms(a, b)                       // a.variable === b.variable
combineTerms(a, b)                       // sums coeffs; throws if unlike
isFullySimplified(terms)
areEqualTerms(a, b)                      // same coeff AND variable
countMatchingPairs(num, den)
isDivisionSimplified(num, den)
getPrimeFactors(n)                       // excludes 1 and n itself
getTermDecompositionOptions(term)        // all valid 2-factor splits
multiplyTerms(a, b, groupId?)            // merges variable exponent maps
splitIntoAdditiveGroups(terms)           // consecutive same-groupId runs
isEquationSolved(lNum, lDen, rNum, rDen, unknownVar)
calculateMinPresses(terms)               // par score

// §4 — the equivalence layer
evaluateSide(numTerms, denTerms, assignment)
equationDelta(state, assignment)
isEquivalentTransformation(before, after, variables)
canMoveToDenominator(sourceNumTerms)             // rule D
canCancelFactor(numTerms, denTerms, factor)      // rule C
```

Variable strings parse to exponent maps (`"x^2y"` → `{x:2, y:1}`) so `multiplyTerms` can
combine them and re-serialize alphabetically.

---

## 6. Level generation

Ten templates per topic, instantiated with randomized variable letters (map `x/y/z` to a
random permutation, `a/b/c` to random parameters) so levels feel fresh without changing
difficulty. Each level returns its initial term arrays plus a `minPresses` par score.

Equation progression: start with pure `ax = b`, then introduce additive transposition
(`2x + 3 = 9`, `3x − 4 = 5`, `5x + 2 = 7y`, `7 = 2x + 3` with the variable on the right).

Guidance on constants, now that §4 makes the engine safe:

- **Prime coefficients (2, 3, 5)** keep the solve path short — the coefficient can't be
  decomposed further, so there's one obvious way to isolate the variable. Good for early levels.
- **Constants sharing a factor with the coefficient are now safe and desirable** for later
  levels: with rule C implemented, `2x = 10 − 4` is a genuinely instructive level, because
  the player must decompose both `10` and `4` to expose the common `2` and cancel it in one
  distributive move. Do *not* treat coprimality as a correctness crutch — it is now purely a
  difficulty dial.

One real constraint remains: there is **no mechanic for adding two constants together** in
equations mode (`7 − 3` never becomes `4`). Never author a level whose only path to a solved
state requires it.

---

## 7. UI / chrome

- **Start screen**: topic picker (three toggle chips) + "START MISSION" button.
- **HUD row**: `LVL n/10`, an `ELEGANT` badge (lights up when solved with terms sorted
  alphabetically / exponents descending), and `STEPS: used / par`.
- **Restart button**: small round `↺`, reloads the current level.
- **READY button**: validates. On success: level-up sound, stats accumulate, advance after
  ~1.2s; after the last level, victory screen and `onComplete()`. On failure: shake, error
  flash, and a *context-appropriate* message.
- **Rejected-move feedback** should name the actual reason (rule D / rule C / rule F each get
  their own message). A generic buzz teaches nothing.
- **Feedback messages must be accurate.** The "combine all multiplied terms first!" hint
  should fire only when a group genuinely has >1 member sharing a `groupId` (leftover
  decomposed factors) — **not** merely when an array has length > 1, since independent
  additive terms legitimately make it longer.

---

## 8. Drag implementation — read this before writing any drag code

These are the failure modes that cost the most iterations. Follow all of them.

1. **Never put framer-motion's `layout` prop on an ancestor of an actively dragged element.**
   The layout FLIP animation and the drag transform fight each other and sibling elements
   fly chaotically across (and off) the screen. Animate enter/exit with simple
   `opacity`/`scale` fades (`transition: { duration: 0.12 }`) and let flexbox reflow instantly.

2. **Render the dragged visual as a portal ghost.** On drag start, set the real in-place card
   to `opacity: 0` (it stays in flow, preserving layout) and render a separate ghost card via
   `createPortal(..., document.body)` positioned `fixed` at a `dragPos` state updated in
   `onDrag`. Portal to `document.body` specifically — a `position: fixed` element nested under
   a CSS-transformed ancestor is positioned relative to *that ancestor*, not the viewport,
   which silently breaks the overlay.

3. Give every draggable `dragConstraints={cartridgeRef}`, `dragSnapToOrigin`, and a low
   `dragElastic` (~0.1). Apply these to **every** side symmetrically — asymmetric wiring
   (left side fixed, right side forgotten) produces bugs that only reproduce on one side.

4. Hit-test drop targets with `getBoundingClientRect()` against `info.point` at drag end,
   with generous padding (~24–28px) for touch. Mutate state **only** on drag end; `onDrag`
   should do nothing but update the ghost position.

5. **Preview legality during the drag.** Rules D, C and F are all knowable before the drop, so
   the hint should show the real destination (or an explicit "not allowed" state) rather than
   promising a move that will be rejected on release.

6. For drop-position hints, snapshot group midpoints **at drag start** and add hysteresis
   (~28px) plus a lock-in deadzone. Reading live DOM positions every frame while the layout
   is shifting causes the hint slot to flicker between positions.

---

## 9. Styling conventions

- Scope everything under one root class (`.algebros-cartridge`) that declares its own CSS
  custom properties; `position: absolute; inset: 0; overflow: hidden; touch-action: none;`
  flex column.
- If embedding in a host app that renders a progress bar overlay, reserve `margin-top: 72px`
  on the top HUD row so the game's chrome sits below it.
- Term cards: ~40px tall, glassy white, 10px radius, subtle border and shadow, `cursor: grab`.
- Auto-scale the whole expression (`transform: scale()`) based on measured content width so
  long expressions stay on screen; clamp the minimum scale (~0.45).

---

## 10. Host integration contract

```jsx
<AlgeBrosCartridge config={{ startLevel, targetLevel }} preview={bool} onComplete={fn} />
```

- `preview === true` → return a static, non-interactive snapshot (used for editor thumbnails).
- Call `onComplete()` with no arguments exactly once when the final level is solved.

---

## 11. Build order

1. Engine primitives + the **§4 equivalence layer**, unit-tested in Node before any UI exists.
   Include the legal/illegal transformation table from §4.6 as your first test suite.
2. Level generators.
3. `liketerms` mode end-to-end (simplest: one list, click-to-combine).
4. `divisions` mode (adds fraction layout, tap-to-decompose, slice-to-cancel).
5. `equations` mode, with every mutation routed through `commitMove` from day one.
6. Sound, HUD, scoring, victory screen.

### Verification

- Run the fuzz test from §4.6: long random sequences of legal moves across all 10 equation
  levels, asserting the guard never fires and the equation stays equivalent throughout.
- Explicitly reproduce the two historical bugs and assert they are now **rejected**:
  moving a factor to the denominator from `2x + 3 = 9`, and cancelling `2` out of only the
  `10` in `(10 − 4)/2`.
- Verify each drag interaction in a real browser (headless Playwright works well): sample every
  tile's bounding box across the frames of a slow drag and assert nothing jumps off-screen —
  that check is what catches the `layout`-prop conflict immediately.
