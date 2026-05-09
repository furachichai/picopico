/**
 * PEMExpressionPool.js
 * Generates math expressions for the PEM manipulative.
 * Uses ! for exponents in editor notation, converts to ^ for the engine.
 * All expressions evaluate to positive integers.
 */

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Verify expression evaluates to a positive integer
function verify(expr) {
  try {
    const jsExpr = expr.replace(/\^/g, '**');
    const result = eval(jsExpr);
    
    // Ensure expression fits in a single line (max 16 tokens)
    const tokenCount = expr.replace(/\s+/g, '').match(/\d+|[+\-*/^()]/g)?.length || 0;
    if (tokenCount > 16) return false;

    return Number.isInteger(result) && result > 0 && result < 10000;
  } catch { return false; }
}

// Generate a single expression for a given mode and difficulty
function generateOne(mode, difficulty) {
  const numTerms = difficulty + 1; // 2-6 terms
  for (let attempt = 0; attempt < 100; attempt++) {
    let expr = '';
    try {
      switch (mode) {
        case 'A': expr = genAddOnly(numTerms); break;
        case 'S': expr = genSubOnly(numTerms); break;
        case 'AS': expr = genAddSub(numTerms); break;
        case 'M': expr = genMulOnly(numTerms); break;
        case 'D': expr = genDivOnly(numTerms); break;
        case 'MD': expr = genMulDiv(numTerms); break;
        case 'MDAS': expr = genMDAS(numTerms); break;
        case 'EAS': expr = genEAS(difficulty); break;
        case 'EMDAS': expr = genEMDAS(difficulty); break;
        case 'P': expr = genParen1(difficulty); break;
        case 'P2': expr = genParen2(difficulty); break;
        case 'PP': expr = genParenNested(difficulty, 2); break;
        case 'PPP': expr = genParenNested(difficulty, 3); break;
        default: expr = `${rand(1,9)} + ${rand(1,9)}`; break;
      }
      if (verify(expr)) return expr;
    } catch { /* retry */ }
  }
  // Fallback
  return '3 + 2';
}

function genAddOnly(n) {
  return Array.from({length: n}, () => rand(1, 20)).join(' + ');
}

function genSubOnly(n) {
  let first = rand(20, 50 + n * 10);
  let parts = [first];
  for (let i = 1; i < n; i++) parts.push(rand(1, Math.floor(first / n)));
  return parts.join(' - ');
}

function genAddSub(n) {
  let parts = [rand(10, 30)];
  for (let i = 1; i < n; i++) {
    parts.push(`${pick(['+','-'])} ${rand(1, 15)}`);
  }
  const expr = parts.join(' ');
  return verify(expr) ? expr : `${rand(10,20)} + ${rand(1,9)} - ${rand(1,5)}`;
}

function genMulOnly(n) {
  return Array.from({length: n}, () => rand(2, 6)).join(' * ');
}

function genDivOnly(n) {
  // Build backwards: start with result, multiply up
  let result = rand(2, 10);
  let divisors = [];
  for (let i = 0; i < n - 1; i++) {
    const d = rand(2, 5);
    divisors.push(d);
    result *= d;
  }
  return [result, ...divisors].join(' / ');
}

function genMulDiv(n) {
  // Mix multiply and divide, ensure integer results
  let result = rand(2, 6);
  let parts = [result];
  let current = result;
  for (let i = 1; i < n; i++) {
    if (Math.random() < 0.5 && current > 4) {
      const d = pick([2, 3, 4].filter(x => current % x === 0)) || 2;
      parts.push(`/ ${d}`);
      current = current / d;
    } else {
      const m = rand(2, 5);
      parts.push(`* ${m}`);
      current = current * m;
    }
  }
  return parts.join(' ');
}

function genMDAS(n) {
  const ops = ['+', '-', '*', '/'];
  let parts = [rand(2, 12)];
  for (let i = 1; i < n; i++) {
    const op = pick(ops);
    if (op === '/') {
      const d = rand(2, 4);
      parts.push(`* ${d}`); // ensure divisibility
      parts.push(`/ ${d}`);
      i++;
    } else {
      parts.push(`${op} ${rand(1, 8)}`);
    }
  }
  const expr = parts.join(' ');
  return verify(expr) ? expr : `3 + 2 * 4 - 1`;
}

function genEAS(diff) {
  const base = rand(2, 4);
  const exp = rand(2, 3);
  const extra = diff > 2 ? ` ${pick(['+','-'])} ${rand(1,10)}` : '';
  const more = diff > 3 ? ` ${pick(['+','-'])} ${rand(1,5)}` : '';
  return `${base} ^ ${exp}${extra}${more}`;
}

function genEMDAS(diff) {
  const base = rand(2, 3);
  const exp = 2;
  const ops = ['*', '+', '-'];
  let expr = `${base} ^ ${exp}`;
  for (let i = 0; i < diff; i++) {
    expr += ` ${pick(ops)} ${rand(1, 6)}`;
  }
  return verify(expr) ? expr : `2 ^ 2 * 3 + 1`;
}

function genParen1(diff) {
  if (diff <= 2) {
    // Need at least 2 operations inside: (a + b * c)
    const a = rand(1, 6), b = rand(1, 6), c = rand(1, 6);
    const inner = `${a} ${pick(['+','-'])} ${b} * ${c}`;
    const outer = rand(2, 5);
    return `(${inner}) * ${outer}`;
  }
  // Difficulty 3-5: mixed ops with parens
  const allOps = ['+', '-', '*', '/'];
  // Build inner paren with at least 3 terms (2 operations)
  const innerTerms = 3;
  let inner = `${rand(1, 8)}`;
  for (let i = 1; i < innerTerms; i++) {
    inner += ` ${pick(allOps.slice(0,2))} ${rand(1, 6)}`;
    if (i === 1 && diff >= 4) inner += ` ${pick(['*','/'])} ${rand(2, 4)}`;
  }
  let expr = '';
  // Prefix: optional number + op
  if (Math.random() > 0.3) expr += `${rand(1, 8)} ${pick(allOps)} `;
  expr += `(${inner})`;
  // Optional exponent at high difficulty
  if (diff >= 5 && Math.random() > 0.4) expr += ` ^ 2`;
  // Suffix: more terms
  const suffixCount = diff >= 4 ? 1 : 0;
  for (let i = 0; i < suffixCount; i++) {
    const op = pick(allOps);
    if (op === '/') {
      expr += ` / ${pick([2, 3])}`;
    } else {
      expr += ` ${op} ${rand(1, 5)}`;
    }
  }
  return verify(expr) ? expr : `(3 + 2 * 2) * 2`;
}

function genParen2(diff) {
  // Ensure both parens have at least 2 operations
  const a = rand(1, 5), b = rand(1, 5), c = rand(1, 5);
  const d = rand(1, 5), e = rand(1, 5), f = rand(1, 5);
  let expr = `(${a} + ${b} * ${c}) + (${d} * ${e} - ${f})`;
  return verify(expr) ? expr : `(1 + 2 * 2) + (3 * 2 - 1)`;
}

function genParenNested(diff, depth) {
  // Inner most needs 2 operations
  let inner = `${rand(1, 5)} ${pick(['+','-'])} ${rand(1, 5)} * ${rand(2, 4)}`;
  for (let d = 1; d < depth; d++) {
    inner = `(${inner}) ${pick(['*','+'])} ${rand(2, 4)} + ${rand(1, 3)}`;
  }
  let expr = `(${inner})`;
  if (diff > 2) expr += ` ${pick(['+','-'])} ${rand(1, 5)}`;
  return verify(expr) ? expr : `((2 + 1 * 2) * 2 + 1)`;
}

// Cache pools per mode+difficulty
const _cache = {};

/**
 * Get a random expression for the given mode and difficulty.
 * Generates a pool of 10 on first call, picks randomly from cache.
 */
export function getExpression(mode, difficulty) {
  const key = `${mode}_${difficulty}`;
  if (!_cache[key]) {
    _cache[key] = [];
    for (let i = 0; i < 10; i++) {
      _cache[key].push(generateOne(mode, difficulty));
    }
  }
  return pick(_cache[key]);
}

/**
 * Convert editor notation (! for exponents) to engine notation (^ for exponents)
 */
export function editorToEngine(expr) {
  return expr.replace(/!/g, '^');
}

/**
 * All available PEM modes
 */
export const PEM_MODES = [
  { key: 'A', label: 'A (Addition)' },
  { key: 'S', label: 'S (Subtraction)' },
  { key: 'AS', label: 'AS (Add+Sub)' },
  { key: 'M', label: 'M (Multiply)' },
  { key: 'D', label: 'D (Division)' },
  { key: 'MD', label: 'MD (Mul+Div)' },
  { key: 'MDAS', label: 'MDAS (All 4)' },
  { key: 'EAS', label: 'EAS (Exp+Add+Sub)' },
  { key: 'EMDAS', label: 'EMDAS (All 5)' },
  { key: 'P', label: 'P (1 paren)' },
  { key: 'P2', label: 'P2 (2 parens)' },
  { key: 'PP', label: 'PP (nested)' },
  { key: 'PPP', label: 'PPP (3 nested)' },
  { key: 'MANUAL', label: 'Manual' },
  { key: 'GAME', label: 'Lesson Mode' },
];

export function clearCache() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
}
