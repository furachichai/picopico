/**
 * Equation-equivalence invariant tests for algeBROS and Balanza.
 *
 * These guard the property that matters most in both games: the equation on screen must
 * stay mathematically equivalent to the one the level started with. Run with:
 *
 *     node scripts/test-equation-invariants.mjs
 */
import {
  makeTerm,
  isEquivalentTransformation,
  canMoveToDenominator,
  findDistributiveCancel,
  splitIntoAdditiveGroups,
} from '../src/cartridges/AlgeBros/game/AlgeBrosEngine.js';
import {
  parseBalanzaExpression,
  parseWeights,
  plateDelta,
  nearlyEqual,
} from '../src/cartridges/Balanza/game/BalanzaEngine.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

const t = (coeff, variable, groupId) => makeTerm(coeff, variable, groupId);
const eq = (leftNum, leftDen, rightNum, rightDen) => ({ leftNum, leftDen, rightNum, rightDen });

/* ──────────────────────────────────────────────────────────────────────────
 * 1. algeBROS: legal transformations must PASS the equivalence check
 * ────────────────────────────────────────────────────────────────────────── */
console.log('algeBROS — legal transformations');

// 2x + 3 = 9  ->  2x = 9 - 3        (transposition, k = 1)
check('transpose a constant across the equals sign',
  isEquivalentTransformation(
    eq([t(2, 'x', 'g1'), t(3, null, 'g2')], [], [t(9, null, 'g3')], []),
    eq([t(2, 'x', 'g1')], [], [t(9, null, 'g3'), t(-3, null, 'g2')], [])
  ));

// 2x = 6  ->  x = 6/2               (dividing both sides, k = 1/2)
check('divide both sides by the coefficient',
  isEquivalentTransformation(
    eq([t(2, 'x', 'g1')], [], [t(6, null, 'g2')], []),
    eq([t(1, 'x', 'g1')], [], [t(6, null, 'g2')], [t(2, null, 'g3')])
  ));

// 2x = 6  ->  2 · x = 6             (decomposition, k = 1)
check('decompose 2x into 2 · x',
  isEquivalentTransformation(
    eq([t(2, 'x', 'g1')], [], [t(6, null, 'g2')], []),
    eq([t(2, null, 'g1'), t(1, 'x', 'g1')], [], [t(6, null, 'g2')], [])
  ));

// (10 - 4)/2 = x  ->  5 - 2 = x     (distributive cancel, k = 1)
check('distributive cancel of a common factor',
  isEquivalentTransformation(
    eq([t(2, null, 'g1'), t(5, null, 'g1'), t(-1, null, 'g2'), t(2, null, 'g2'), t(2, null, 'g2')], [t(2, null, 'g9')], [t(1, 'x', 'g3')], []),
    eq([t(5, null, 'g1'), t(-1, null, 'g2'), t(2, null, 'g2')], [], [t(1, 'x', 'g3')], [])
  ));

// x = 7 - 3  ->  7 - 3 = x          (reordering terms within a side, k = 1)
check('reorder additive terms within a side',
  isEquivalentTransformation(
    eq([t(7, null, 'g1'), t(-3, null, 'g2')], [], [t(1, 'x', 'g3')], []),
    eq([t(-3, null, 'g2'), t(7, null, 'g1')], [], [t(1, 'x', 'g3')], [])
  ));

/* ──────────────────────────────────────────────────────────────────────────
 * 2. algeBROS: illegal transformations must FAIL the equivalence check
 * ────────────────────────────────────────────────────────────────────────── */
console.log('algeBROS — illegal transformations');

// THE BUG: 2x + 3 = 9  ->  x + 3 = 9/2  (only one term of the sum got divided)
check('partial division of a multi-term side is rejected',
  !isEquivalentTransformation(
    eq([t(2, 'x', 'g1'), t(3, null, 'g2')], [], [t(9, null, 'g3')], []),
    eq([t(1, 'x', 'g1'), t(3, null, 'g2')], [], [t(9, null, 'g3')], [t(2, null, 'g4')])
  ));

// THE BUG: (10 - 4)/2 -> 5 - 4  (cancelled against only one numerator term)
check('non-distributive cancel is rejected',
  !isEquivalentTransformation(
    eq([t(2, null, 'g1'), t(5, null, 'g1'), t(-4, null, 'g2')], [t(2, null, 'g9')], [t(1, 'x', 'g3')], []),
    eq([t(5, null, 'g1'), t(-4, null, 'g2')], [], [t(1, 'x', 'g3')], [])
  ));

// Negating BOTH cards of a transposed group: (-2)·(-x) = +2x, sign flip cancels out
check('negating every card of a transposed group is rejected',
  !isEquivalentTransformation(
    eq([t(2, null, 'g1'), t(1, 'x', 'g1')], [], [t(6, null, 'g2')], []),
    eq([t(0, null, 'g0')], [], [t(6, null, 'g2'), t(-2, null, 'g1'), t(-1, 'x', 'g1')], [])
  ));

// Transposing without flipping the sign at all
check('transposing without a sign flip is rejected',
  !isEquivalentTransformation(
    eq([t(2, 'x', 'g1'), t(3, null, 'g2')], [], [t(9, null, 'g3')], []),
    eq([t(2, 'x', 'g1')], [], [t(9, null, 'g3'), t(3, null, 'g2')], [])
  ));

// Dropping an undivided term into an already-fractioned numerator: a/c + b ≠ (a+b)/c
check('dropping into a fractioned numerator is rejected',
  !isEquivalentTransformation(
    eq([t(1, 'x', 'g1')], [], [t(6, null, 'g2')], [t(2, null, 'g4')]),
    eq([t(0, null, 'g0')], [], [t(6, null, 'g2'), t(-1, 'x', 'g1')], [t(2, null, 'g4')])
  ));

/* ──────────────────────────────────────────────────────────────────────────
 * 3. algeBROS: the per-operation rules
 * ────────────────────────────────────────────────────────────────────────── */
console.log('algeBROS — rule D and rule C');

check('rule D allows dividing a single-group side',
  canMoveToDenominator([t(2, null, 'g1'), t(1, 'x', 'g1')]));

check('rule D blocks dividing a multi-term side',
  !canMoveToDenominator([t(2, 'x', 'g1'), t(3, null, 'g2')]));

check('rule C finds the factor when every group exposes it',
  findDistributiveCancel(
    [t(2, null, 'g1'), t(5, null, 'g1'), t(-1, null, 'g2'), t(2, null, 'g2'), t(2, null, 'g2')],
    t(2, null, 'gd')
  ) !== null);

check('rule C refuses when one group has not exposed the factor',
  findDistributiveCancel(
    [t(2, null, 'g1'), t(5, null, 'g1'), t(-4, null, 'g2')],
    t(2, null, 'gd')
  ) === null);

check('rule C returns one card id per additive group',
  findDistributiveCancel(
    [t(2, null, 'g1'), t(5, null, 'g1'), t(-1, null, 'g2'), t(2, null, 'g2'), t(2, null, 'g2')],
    t(2, null, 'gd')
  ).length === 2);

/* ──────────────────────────────────────────────────────────────────────────
 * 4. algeBROS: fuzz — long chains of legal moves must stay equivalent
 * ────────────────────────────────────────────────────────────────────────── */
console.log('algeBROS — fuzz (chains of legal moves)');

function transposeFirstConstant(state) {
  const groups = splitIntoAdditiveGroups(state.leftNum);
  const idx = groups.findIndex(g => g.length === 1 && g[0].variable === null && g[0].coeff !== 0);
  if (idx === -1 || groups.length < 2) return null;
  const moving = groups[idx][0];
  return eq(
    groups.filter((_, i) => i !== idx).flat(),
    state.leftDen,
    [...state.rightNum, makeTerm(-moving.coeff, moving.variable, moving.groupId)],
    state.rightDen
  );
}

function decomposeCoefficient(state) {
  const groups = splitIntoAdditiveGroups(state.leftNum);
  if (groups.length !== 1 || groups[0].length !== 1) return null;
  const term = groups[0][0];
  if (!term.variable || Math.abs(term.coeff) <= 1) return null;
  return eq(
    [makeTerm(term.coeff, null, term.groupId), makeTerm(1, term.variable, term.groupId)],
    state.leftDen, state.rightNum, state.rightDen
  );
}

function divideBothSides(state) {
  const groups = splitIntoAdditiveGroups(state.leftNum);
  if (groups.length !== 1) return null;
  const factor = groups[0].find(t => t.variable === null && Math.abs(t.coeff) > 1);
  if (!factor) return null;
  return eq(
    groups[0].filter(t => t.id !== factor.id),
    state.leftDen,
    state.rightNum,
    [...state.rightDen, makeTerm(Math.abs(factor.coeff), factor.variable, 'gd')]
  );
}

let fuzzViolations = 0;
let fuzzMoves = 0;
const starts = [
  eq([t(2, 'x', 'a1'), t(3, null, 'a2')], [], [t(9, null, 'a3')], []),
  eq([t(3, 'x', 'b1'), t(-4, null, 'b2')], [], [t(5, null, 'b3')], []),
  eq([t(5, 'x', 'c1'), t(2, null, 'c2')], [], [t(7, 'y', 'c3')], []),
];

for (const start of starts) {
  for (let run = 0; run < 40; run++) {
    let state = start;
    const ops = [transposeFirstConstant, decomposeCoefficient, divideBothSides];
    for (let step = 0; step < 6; step++) {
      const op = ops[Math.floor(Math.random() * ops.length)];
      const next = op(state);
      if (!next) continue;
      fuzzMoves++;
      if (!isEquivalentTransformation(start, next)) fuzzViolations++;
      state = next;
    }
  }
}
check(`fuzz: ${fuzzMoves} legal moves stayed equivalent`, fuzzViolations === 0);
check(`fuzz actually exercised the engine (${fuzzMoves} moves)`, fuzzMoves > 100);

/* ──────────────────────────────────────────────────────────────────────────
 * 5. Balanza: rearrangements must never change plateDelta
 * ────────────────────────────────────────────────────────────────────────── */
console.log('Balanza — delta invariant');

const weights = parseWeights('🍌=2');
const left = parseBalanzaExpression('🍎, 🍎, 🍌');
const right = parseBalanzaExpression('🍎');
const startDelta = plateDelta(left, right, weights);

// Transpose: left loses v, right gains -v  ->  delta unchanged
const moved = left[2];
const afterTransposeLeft = left.filter(x => x.id !== moved.id);
const afterTransposeRight = [...right, makeTerm(-moved.coeff, moved.variable)];
check('transposing a tile preserves delta',
  nearlyEqual(startDelta, plateDelta(afterTransposeLeft, afterTransposeRight, weights)));

// Merge two apples into 2🍎
const mergedLeft = [makeTerm(2, '🍎'), left[2]];
check('merging like tiles preserves delta',
  nearlyEqual(startDelta, plateDelta(mergedLeft, right, weights)));

// Decompose 2🍎 back into 🍎 + 🍎
check('decomposing a merged tile preserves delta',
  nearlyEqual(startDelta, plateDelta([makeTerm(1, '🍎'), makeTerm(1, '🍎'), left[2]], right, weights)));

// A supply-menu add is SUPPOSED to change the balance
check('adding from the supply menu changes delta',
  !nearlyEqual(startDelta, plateDelta([...left, makeTerm(1, '🍎')], right, weights)));

// Fractional weights must still be able to balance (epsilon, not ===)
const fracWeights = parseWeights('🍎=0.1\n🍌=0.3');
check('fractional weights can reach equilibrium',
  nearlyEqual(
    plateDelta(parseBalanzaExpression('🍎, 🍎, 🍎'), parseBalanzaExpression('🍌'), fracWeights),
    0
  ));

// Balanza fuzz: long chains of transposes must never move the beam
let balanzaViolations = 0;
let balanzaMoves = 0;
for (let run = 0; run < 200; run++) {
  let l = parseBalanzaExpression('🍎, 🍎, 🍌, 3');
  let r = parseBalanzaExpression('🍌, 🍎');
  const d0 = plateDelta(l, r, weights);
  for (let step = 0; step < 10; step++) {
    const fromLeft = Math.random() < 0.5;
    const src = fromLeft ? l : r;
    if (src.length === 0) continue;
    const pick = src[Math.floor(Math.random() * src.length)];
    const flipped = makeTerm(-pick.coeff, pick.variable);
    if (fromLeft) {
      l = l.filter(x => x.id !== pick.id);
      r = [...r, flipped];
    } else {
      r = r.filter(x => x.id !== pick.id);
      l = [...l, flipped];
    }
    balanzaMoves++;
    if (!nearlyEqual(d0, plateDelta(l, r, weights))) balanzaViolations++;
  }
}
check(`fuzz: ${balanzaMoves} transposes never moved the beam`, balanzaViolations === 0);
check(`Balanza fuzz actually ran (${balanzaMoves} moves)`, balanzaMoves > 500);

/* ────────────────────────────────────────────────────────────────────────── */
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
