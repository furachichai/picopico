/**
 * LevelGenerator.js
 * 
 * Generates curated math expressions per difficulty tier.
 * All expressions evaluate to natural numbers (positive integers).
 */

// Each level definition: { expr: string, answer: number }
// Organized by difficulty tier.

const TIER_1 = [
  // Simple: two operations, no parentheses
  { expr: '3 + 4 * 2', answer: 11 },
  { expr: '10 - 2 * 3', answer: 4 },
  { expr: '8 / 2 + 5', answer: 9 },
  { expr: '6 * 3 - 8', answer: 10 },
  { expr: '12 / 4 + 7', answer: 10 },
  { expr: '5 * 2 + 3', answer: 13 },
  { expr: '15 - 9 / 3', answer: 12 },
  { expr: '7 + 6 / 2', answer: 10 },
];

const TIER_2 = [
  // Medium: three operations, no parentheses
  { expr: '2 + 3 * 4 - 1', answer: 13 },
  { expr: '10 - 2 * 3 + 4', answer: 8 },
  { expr: '8 / 2 + 5 * 3', answer: 19 },
  { expr: '6 * 3 - 8 + 2', answer: 12 },
  { expr: '20 / 4 + 3 * 2', answer: 11 },
  { expr: '4 * 5 - 12 / 3', answer: 16 },
  { expr: '9 + 6 / 2 - 1', answer: 11 },
  { expr: '15 / 3 + 2 * 4', answer: 13 },
];

const TIER_3 = [
  // Single parentheses
  { expr: '(3 + 4) * 2', answer: 14 },
  { expr: '(10 - 6) * 3', answer: 12 },
  { expr: '5 * (8 - 3)', answer: 25 },
  { expr: '(12 + 8) / 4', answer: 5 },
  { expr: '(9 - 3) * (2 + 1)', answer: 18 },
  { expr: '6 * (4 + 2) - 10', answer: 26 },
  { expr: '(15 - 5) / 2 + 3', answer: 8 },
  { expr: '8 + (6 * 3) - 4', answer: 22 },
];

const TIER_4 = [
  // Multiple operations with parentheses
  { expr: '2 * (3 + 5) - 4', answer: 12 },
  { expr: '(8 - 2) * 3 + 6', answer: 24 },
  { expr: '10 / (2 + 3) * 4', answer: 8 },
  { expr: '(4 + 6) * (3 - 1)', answer: 20 },
  { expr: '3 * (7 - 2) + 5', answer: 20 },
  { expr: '(12 / 4) * (3 + 2)', answer: 15 },
  { expr: '(9 + 3) / 2 - 1', answer: 5 },
  { expr: '(6 * 2 + 8) / 4', answer: 5 },
];

const TIER_5 = [
  // Nested parentheses with exponents
  { expr: '12 / 2 * 3 + (4 - 1)', answer: 21 },
  { expr: '(3 ^ 2 - (4 + 2)) * 3', answer: 9 },
  { expr: '((8 - 2) * 3 + 6) / 4', answer: 6 },
  { expr: '5 * (3 + (12 - 8))', answer: 35 },
  { expr: '(4 * (2 + 3) - 10) * 2', answer: 20 },
  { expr: '((15 - 3) / 4 + 1) * 5', answer: 20 },
  { expr: '(6 + 2) * (9 - (3 + 2))', answer: 32 },
  { expr: '3 * ((8 + 4) / 2 - 1)', answer: 15 },
];

const TIER_6 = [
  // Complex nested, multiple groups
  { expr: '9 * (6 / (8 - 3 * 2) * (20 + 4 * 5) - 1) + 7', answer: 1087 },
  { expr: '(3 + 2) * (10 - (8 / 4 + 1))', answer: 35 },
  { expr: '((6 + 2) * 3 - (4 + 2)) / 3', answer: 6 },
  { expr: '(5 * (4 + 2) - 6) / (3 + 1)', answer: 6 },
  { expr: '8 + (3 * (7 - 2) + 5) / 4', answer: 13 },
  { expr: '(12 / (2 + 1) + 5) * (8 - 3)', answer: 45 },
  { expr: '((10 - 2) * 3 + 6) / (5 + 1)', answer: 5 },
  { expr: '2 * (3 + (4 * 5 - 8) / 3) + 1', answer: 15 },
];

// Start with complex expressions and cycle through all tiers
const ALL_TIERS = [TIER_5, TIER_4, TIER_6, TIER_3, TIER_5, TIER_6];

/**
 * Get an expression for a given level.
 * Levels 1-3 use Tier 1 (complex nested), 4-6 Tier 2, etc.
 * Within a tier, expressions cycle through the bank.
 */
export function getExpressionForLevel(level) {
  const LEVELS_PER_TIER = 3;
  const tierIndex = Math.min(Math.floor((level - 1) / LEVELS_PER_TIER), ALL_TIERS.length - 1);
  const tier = ALL_TIERS[tierIndex];
  const exprIndex = (level - 1) % tier.length;
  return tier[exprIndex];
}

/**
 * Get total number of tiers for progress calculation.
 */
export function getTotalLevels() {
  return ALL_TIERS.length * 3;
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
