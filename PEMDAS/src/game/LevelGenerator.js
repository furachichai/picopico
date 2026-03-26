/**
 * LevelGenerator.js
 * 
 * Generates curated math expressions per difficulty tier.
 * All expressions evaluate to natural numbers (positive integers).
 */

// Each level definition: { expr: string, answer: number }
// Organized by difficulty tier.

// Each level definition: { expr: string, answer: number }

const LEVEL_1 = [
  // level 1: expression with addition and subtraction, 3 elements.
  { expr: '5 + 3 - 2', answer: 6 },
  { expr: '8 - 4 + 2', answer: 6 },
  { expr: '10 - 5 + 3', answer: 8 },
];

const LEVEL_2 = [
  // level 2: idem, 5 elements.
  { expr: '8 - 4 + 2 - 1 + 3', answer: 8 },
  { expr: '5 + 5 - 2 + 4 - 3', answer: 9 },
  { expr: '10 - 2 + 1 - 4 + 5', answer: 10 },
];

const LEVEL_3 = [
  // Level 3: mix addition, multiplication, subtraction, 4 elements.
  { expr: '2 * 3 + 5 - 1', answer: 10 },
  { expr: '8 - 2 * 3 + 4', answer: 6 },
  { expr: '5 + 4 * 2 - 3', answer: 10 },
];

const LEVEL_4 = [
  // Level 4: add division, 5 elements.
  { expr: '10 / 2 * 3 + 4 - 1', answer: 18 },
  { expr: '8 - 6 / 2 * 2 + 5', answer: 7 },
  { expr: '12 / 3 * 2 + 5 - 3', answer: 10 },
];

const LEVEL_5 = [
  // Level 5: same with one parentheses
  { expr: '(4 + 2) * 3 - 5 + 1', answer: 14 },
  { expr: '10 / (2 + 3) * 4 - 2', answer: 6 },
  { expr: '8 - (3 + 1) * 2 / 4', answer: 6 },
];

const LEVEL_6 = [
  // Level 6: 2 nested parenthesis
  { expr: '2 * (3 + (4 - 1))', answer: 12 },
  { expr: '((8 - 2) / 3 + 1) * 4', answer: 12 },
  { expr: '12 / (2 * (1 + 2))', answer: 2 },
];

const LEVEL_7 = [
  // Level 7: 3 nested parenthesis.
  { expr: '((5 + (2 * 3)) - 1) * 2', answer: 20 },
  { expr: '3 * (((8 / 2) + 1) * 2)', answer: 30 },
  { expr: '((12 - (2 + 4)) * 3) / 2', answer: 9 },
];

const LEVEL_8 = [
  // Level 8: add exponents
  { expr: '3 ^ 2 + (4 * 2) - 1', answer: 16 },
  { expr: '2 ^ 3 * (8 - 5)', answer: 24 },
  { expr: '(4 + 1) ^ 2 / 5', answer: 5 },
];

const LEVEL_9 = [
  // Level 9: more exponents.
  { expr: '(2 ^ 3) / 4 + 5 ^ 2', answer: 27 },
  { expr: '3 ^ 2 * 2 ^ 2 - 10', answer: 26 },
  { expr: '((3 ^ 2 - 1) / 2) ^ 2', answer: 16 },
];

const SHOWCASE_LEVELS = [
  LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5,
  LEVEL_6, LEVEL_7, LEVEL_8, LEVEL_9
];

/**
 * Get an expression for a given level.
 * Showcases a pedagogical progression from 1 to 9.
 */
export function getExpressionForLevel(level) {
  const levelIndex = Math.min(level - 1, SHOWCASE_LEVELS.length - 1);
  const bank = SHOWCASE_LEVELS[levelIndex];
  const exprIndex = (level - 1) % bank.length;
  return bank[exprIndex];
}

/**
 * Get total number of specific pedagogical tiers.
 */
export function getTotalLevels() {
  return SHOWCASE_LEVELS.length;
}

/**
 * Verify that an expression evaluates to the stated answer.
 * Uses a simple eval for checking purposes only.
 */
export function verifyExpression(exprStr, expectedAnswer) {
  try {
    // Replace ^ with ** for JS eval
    const jsExpr = exprStr.replace(/\^/g, '**');
    // eslint-disable-next-line no-eval
    const result = eval(jsExpr);
    return Math.abs(result - expectedAnswer) < 0.001;
  } catch {
    return false;
  }
}

// ─── Secret Menu Test Expression Banks ───────────────────────
const TEST_BANKS = [
  // 0: Complex (all buttons)
  [
    { expr: '(2 ^ 3 + 1) * (8 - (6 / 2))', answer: 45 },
    { expr: '(3 ^ 2 - (4 + 2)) * 3', answer: 9 },
    { expr: '((8 - 2) * 3 + 6) / 4', answer: 6 },
  ],
  // 1: Arrow in parens (mixed ops inside parens)
  [
    { expr: '(6 / 2 * 3) + 1', answer: 10 },
    { expr: '5 + (8 / 4 * 2)', answer: 9 },
    { expr: '(12 / 3 * 2 - 1) + 4', answer: 11 },
  ],
  // 2: Arrow full expression (mixed ops at top level)
  [
    { expr: '12 / 2 * 3 + 5', answer: 23 },
    { expr: '8 * 2 / 4 + 3 - 1', answer: 6 },
    { expr: '10 / 5 * 3 - 2 + 4', answer: 8 },
  ],
  // 3: Exponents heavy
  [
    { expr: '2 ^ 3 + 4 ^ 2 - 1', answer: 23 },
    { expr: '3 ^ 2 * 2 - 2 ^ 3', answer: 10 },
    { expr: '(2 ^ 2) ^ 2 + 1', answer: 17 },
  ],
];

/**
 * Get a test expression for the secret menu difficulty preset.
 * @param {number} difficulty - 0-3
 * @param {number} level - current level
 */
export function getTestExpression(difficulty, level) {
  const bank = TEST_BANKS[difficulty] || TEST_BANKS[0];
  const idx = (level - 1) % bank.length;
  return bank[idx];
}
