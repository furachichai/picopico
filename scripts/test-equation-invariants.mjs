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
  combineTerms,
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
  buildEquationLineText,
  checkBalanzaGoal,
  isPlateFullySimplified,
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

/* ──────────────────────────────────────────────────────────────────────────
 * 6. Balanza: equation line weight token rendering
 * ────────────────────────────────────────────────────────────────────────── */
console.log('Balanza — equation line weight tokens');

// 2w5 must render as 2x5
const leftVars = parseBalanzaExpression('x, y, z, a, b');
const rightMergedW5 = [makeTerm(2, 'w5')];
const textMerged = buildEquationLineText(leftVars, rightMergedW5, 100, 10);
check('2w5 renders as 2x5 in inequation',
  textMerged === 'x + y + z + a + b  >  2x5');

// w5 + w5 must render as 5 + 5
const rightTwoW5 = [makeTerm(1, 'w5'), makeTerm(1, 'w5')];
const textTwoW5 = buildEquationLineText(leftVars, rightTwoW5, 100, 10);
check('w5 + w5 renders as 5 + 5 in inequation',
  textTwoW5 === 'x + y + z + a + b  >  5 + 5');

// Single weight w5 renders as 5
const textSingleW5 = buildEquationLineText([makeTerm(1, 'x')], [makeTerm(1, 'w5')], 5, 5);
check('w5 renders as 5',
  textSingleW5 === 'x  =  5');

// 3w10 renders as 3x10
const text3w10 = buildEquationLineText([makeTerm(1, 'x')], [makeTerm(3, 'w10')], 30, 30);
check('3w10 renders as 3x10',
  text3w10 === 'x  =  3x10');

// Mixed weights on plate: w5 + 2w2 renders as 5 + 2x2
const textMixed = buildEquationLineText([makeTerm(1, 'w5'), makeTerm(2, 'w2')], [makeTerm(1, 'x')], 9, 9);
check('w5 + 2w2 renders as 5 + 2x2',
  textMixed === '5 + 2x2  =  x');

/* ──────────────────────────────────────────────────────────────────────────
 * 7. Balanza: goal modes ('=', 'x', 'xx')
 * ────────────────────────────────────────────────────────────────────────── */
console.log('Balanza — goal modes');

// Goal '=' (Equilibrium)
const balancedL = [makeTerm(1, 'x'), makeTerm(1, 'w2')];
const balancedR = [makeTerm(1, 'w7')];
check("goal '=': wins when balanced",
  checkBalanzaGoal('=', balancedL, balancedR, 7, 7));
check("goal '=': fails when unbalanced",
  !checkBalanzaGoal('=', balancedL, balancedR, 7, 5));
check("goal '=': fails when a plate is empty",
  !checkBalanzaGoal('=', [], balancedR, 7, 7));

// Goal 'x' (Isolate x)
const isolatedL = [makeTerm(1, 'x')];
const unsimplifiedR = [makeTerm(1, 'w5'), makeTerm(1, 'w2')];
check("goal 'x': wins when x is alone on left plate and balanced",
  checkBalanzaGoal('x', isolatedL, unsimplifiedR, 7, 7));

// x isolated on right plate -> WINS
check("goal 'x': wins when x is alone on right plate and balanced",
  checkBalanzaGoal('x', unsimplifiedR, isolatedL, 7, 7));

// x with crate representation e.g. '📦x' -> WINS
check("goal 'x': works with crate token '📦x'",
  checkBalanzaGoal('x', [makeTerm(1, '📦x')], unsimplifiedR, 7, 7));

// x not alone: x + 2 on left plate -> FAILS
check("goal 'x': fails when other items are on the same plate as x",
  !checkBalanzaGoal('x', [makeTerm(1, 'x'), makeTerm(1, 'w2')], [makeTerm(1, 'w7')], 7, 7));

// 2x on left plate (coeff > 1) -> FAILS
check("goal 'x': fails when coeff is 2 (2x is not x alone)",
  !checkBalanzaGoal('x', [makeTerm(2, 'x')], [makeTerm(1, 'w10')], 10, 10));

// -x on left plate (coeff -1) -> FAILS
check("goal 'x': fails when coeff is -1 (-x is not x alone)",
  !checkBalanzaGoal('x', [makeTerm(-1, 'x')], [makeTerm(-1, 'w5')], -5, -5));

// x on both plates -> FAILS
check("goal 'x': fails when x is on both plates",
  !checkBalanzaGoal('x', isolatedL, [makeTerm(1, 'x')], 5, 5));

// Goal 'x': fails when unbalanced
check("goal 'x': fails when unbalanced even if x is alone",
  !checkBalanzaGoal('x', isolatedL, unsimplifiedR, 7, 5));

// Goal 'xx' (Isolate x + Simplify other plate)
// Other plate has unmerged like terms (w5 + w5) -> FAILS
const twoW5 = [makeTerm(1, 'w5'), makeTerm(1, 'w5')];
check("goal 'xx': fails when other plate has unmerged like terms (w5 + w5)",
  !checkBalanzaGoal('xx', isolatedL, twoW5, 10, 10));

// Other plate merged into 2w5 -> WINS
const merged2w5 = [makeTerm(2, 'w5')];
check("goal 'xx': wins when like terms are merged into 2w5",
  checkBalanzaGoal('xx', isolatedL, merged2w5, 10, 10));

// Other plate has distinct items that cannot be merged (2w5 + 1w2) -> WINS
const distinctWeights = [makeTerm(2, 'w5'), makeTerm(1, 'w2')];
check("goal 'xx': wins when distinct unmergeable items are present (2w5 + 1w2)",
  checkBalanzaGoal('xx', isolatedL, distinctWeights, 12, 12));

// Other plate has unmerged constants (3 + 4) -> FAILS
const twoConstants = [makeTerm(3, null), makeTerm(4, null)];
check("goal 'xx': fails when other plate has unmerged constants (3 + 4)",
  !checkBalanzaGoal('xx', isolatedL, twoConstants, 7, 7));

// Other plate has merged constant (7) -> WINS
const oneConstant = [makeTerm(7, null)];
check("goal 'xx': wins when other plate is a single constant",
  checkBalanzaGoal('xx', isolatedL, oneConstant, 7, 7));

// Goal 'xx': fails when unbalanced
check("goal 'xx': fails when unbalanced even if x alone and other plate simplified",
  !checkBalanzaGoal('xx', isolatedL, merged2w5, 10, 8));

// x* crate token works with goal 'x'
check("goal 'x': works with crate token 'x*'",
  checkBalanzaGoal('x', [makeTerm(1, 'x*')], unsimplifiedR, 7, 7));

// x* parses correctly from expression 'x*, w5'
const parsedXStar = parseBalanzaExpression('x*, w5');
check("parseBalanzaExpression parses 'x*' variable",
  parsedXStar.length === 2 && parsedXStar[0].variable === 'x*' && parsedXStar[0].coeff === 1);

// 2x* parses correctly from expression '2x*'
const parsed2XStar = parseBalanzaExpression('2x*');
check("parseBalanzaExpression parses '2x*' variable",
  parsed2XStar.length === 1 && parsed2XStar[0].variable === 'x*' && parsed2XStar[0].coeff === 2);

// x parses correctly from expression 'x, w5'
const parsedX = parseBalanzaExpression('x, w5');
check("parseBalanzaExpression parses 'x' variable",
  parsedX.length === 2 && parsedX[0].variable === 'x' && parsedX[0].coeff === 1);

// Equation line renders x* as x
check("buildEquationLineText renders 'x*' as 'x'",
  buildEquationLineText([makeTerm(1, 'x*')], [makeTerm(1, 'w5')], 5, 5) === 'x  =  5');

// Opposite pairs create a 0 card
const oppX = combineTerms(makeTerm(1, 'x'), makeTerm(-1, 'x'));
check("combining opposites x and -x creates a 0 card",
  oppX.coeff === 0);

const oppConst = combineTerms(makeTerm(2, null), makeTerm(-2, null));
check("combining opposites 2 and -2 creates a 0 card",
  oppConst.coeff === 0);

// Plate with 0 card is not simplified for goal 'xx' until it vanishes
check("goal 'xx': fails when plate contains a 0 card",
  !checkBalanzaGoal('xx', isolatedL, [makeTerm(7, null), oppConst], 7, 7));

// Once 0 card vanishes, goal 'xx' passes
const vanishedPlate = [makeTerm(7, null), oppConst].filter(t => t.coeff !== 0);
check("goal 'xx': passes once 0 card vanishes",
  checkBalanzaGoal('xx', isolatedL, vanishedPlate, 7, 7));

/* ────────────────────────────────────────────────────────────────────────── */
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

