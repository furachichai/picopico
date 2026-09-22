/**
 * AlgeBrosEngine.js
 * 
 * Logic engine for the algeBROS game (combining like terms).
 */

/**
 * Generates a unique term object.
 */
export function makeTerm(coeff, variable, groupId = null) {
  return {
    id: Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36),
    coeff: Number(coeff),
    variable: variable || null, // null means constant
    groupId: groupId || ('g_' + Math.random().toString(36).substr(2, 7) + '_' + Date.now().toString(36)),
  };
}

export const REVERSE_SUPERSCRIPT_MAP = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁻': '-', '⁺': '+', '⁽': '(', '⁾': ')'
};

/**
 * Normalizes user-input math strings into standard ASCII syntax (e.g. x!2 -> x^2, x² -> x^2)
 */
export function normalizeMathString(str) {
  if (!str || typeof str !== 'string') return '';
  let res = str;
  // Replace unicode superscripts with ^digits
  res = res.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (match) => {
    const normalDigits = match.split('').map(c => REVERSE_SUPERSCRIPT_MAP[c] || c).join('');
    return `^${normalDigits}`;
  });
  // Replace Picopico !exp syntax with ^exp (e.g. x!2 -> x^2, x!(2) -> x^2, x!-1 -> x^-1)
  res = res.replace(/!\(?([+-]?\d+)\)?/g, '^$1');
  res = res.replace(/!\(?([a-zA-Z]+)\)?/g, '^$1');
  return res;
}

/**
 * Parses a single term string like "-3x^2", "7x", "-14", "x", "x!2", "x²" into a term object.
 */
export function parseTermString(termStr) {
  if (!termStr) return null;
  const cleanStr = normalizeMathString(termStr).replace(/\s+/g, '');
  if (!cleanStr) return null;

  // Matches: optional sign (+|-), optional coefficient digits, optional variable (one or more letters and powers, e.g. x, x^2, x^2y, by)
  const regex = /^([+-]?)(\d*)((?:[a-zA-Z]+(?:\^[+-]?\d+)?)+)?$/;
  const match = cleanStr.match(regex);
  if (!match) {
    console.warn(`Could not parse term string: "${termStr}"`);
    return null;
  }

  const signStr = match[1];
  const coeffStr = match[2];
  const varStr = match[3] || null;

  let sign = 1;
  if (signStr === '-') sign = -1;

  let coeff = 1;
  if (coeffStr !== '') {
    coeff = parseInt(coeffStr, 10);
  } else if (signStr === '-' && !varStr) {
    coeff = 1; // Just "-" constant is invalid, but if it has no var, it will match digits
  } else if (signStr === '' && !varStr) {
    coeff = 1; // Handled below
  }

  // Handle edge cases like empty string or standalone sign with no var
  if (coeffStr === '' && !varStr) {
    coeff = 0; // fallback
  }

  return makeTerm(coeff * sign, varStr);
}

/**
 * Formats a term for horizontal rendering.
 * Returns { sign, value } where sign is "+" or "-" (or empty for the first term),
 * and value is the absolute formatted coefficient + variable (e.g. "14", "7x", "x^2").
 */
export function formatTerm(term, isFirst = false) {
  const absCoeff = Math.abs(term.coeff);
  const hasVar = !!term.variable;

  let sign = '';
  if (isFirst) {
    if (term.coeff < 0) {
      sign = '-';
    }
  } else {
    sign = term.coeff >= 0 ? '+' : '-';
  }

  let valueStr = '';
  if (term.coeff === 0) {
    valueStr = '0';
  } else {
    if (hasVar) {
      valueStr = absCoeff === 1 ? term.variable : `${absCoeff}${term.variable}`;
    } else {
      valueStr = `${absCoeff}`;
    }
  }

  return { sign, value: valueStr };
}

/**
 * Checks if two terms are like terms (compatible to be added).
 */
export function areLikeTerms(termA, termB) {
  if (!termA || !termB) return false;
  return termA.variable === termB.variable;
}

/**
 * Combines two adjacent like terms.
 */
export function combineTerms(termA, termB) {
  if (!areLikeTerms(termA, termB)) {
    throw new Error('Cannot combine unlike terms');
  }
  const newCoeff = termA.coeff + termB.coeff;
  return makeTerm(newCoeff, newCoeff === 0 ? null : termA.variable, termA.groupId);
}

/**
 * Checks if the entire expression is fully simplified.
 * An expression is simplified if all remaining terms have distinct variables.
 */
export function isFullySimplified(terms) {
  const seenVars = new Set();
  for (const term of terms) {
    if (seenVars.has(term.variable)) {
      return false;
    }
    seenVars.add(term.variable);
  }
  return true;
}

/**
 * Calculates the minimum number of addition/subtraction steps required to simplify the expression.
 */
export function calculateMinPresses(initialTerms) {
  const counts = {};
  for (const term of initialTerms) {
    const v = term.variable;
    counts[v] = (counts[v] || 0) + 1;
  }

  let total = 0;
  for (const v in counts) {
    if (counts[v] > 1) {
      total += counts[v] - 1;
    }
  }
  return total;
}

/**
 * Checks if two terms are exactly equal (same coefficient and variable).
 */
export function areEqualTerms(termA, termB) {
  if (!termA || !termB) return false;
  return termA.coeff === termB.coeff && termA.variable === termB.variable;
}

/**
 * Counts the number of matching pairs between numerator and denominator lists.
 */
export function countMatchingPairs(numTerms, denTerms) {
  let count = 0;
  const tempDen = [...denTerms];
  for (const numTerm of numTerms) {
    const matchIdx = tempDen.findIndex(denTerm => areEqualTerms(numTerm, denTerm));
    if (matchIdx !== -1) {
      count++;
      tempDen.splice(matchIdx, 1);
    }
  }
  return count;
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Checks if the division expression is fully simplified:
 * 1. No unmerged factors (numTerms.length <= 1, denTerms.length <= 1).
 * 2. No matching pairs remaining to cross out.
 * 3. No shared numerical factors (gcd(|num|, |den|) === 1).
 * 4. No shared variable factors (e.g. x^3 / x^2, xy / y).
 * 5. No redundant denominator (e.g. denominator is not 1 or -1).
 */
export function isDivisionSimplified(numTerms = [], denTerms = []) {
  const activeNum = (numTerms || []).filter(Boolean);
  const activeDen = (denTerms || []).filter(Boolean);

  // If there are multiple unmerged factors in numerator or denominator, not simplified yet
  if (activeNum.length > 1 || activeDen.length > 1) {
    return false;
  }

  // Any remaining direct matching pair means they can still be crossed out
  if (countMatchingPairs(activeNum, activeDen) > 0) {
    return false;
  }

  // If denominator is completely eliminated, the single numerator term is simplified
  if (activeDen.length === 0) {
    return true;
  }

  const denTerm = activeDen[0];
  const numTerm = activeNum.length === 1 ? activeNum[0] : makeTerm(1, null);

  // Denominator cannot be 1 or -1 without a variable (e.g. N/1 or N/-1 is not simplified)
  if (!denTerm.variable && Math.abs(denTerm.coeff) === 1) {
    return false;
  }

  // If numerator is 0, denominator should be eliminated
  if (numTerm.coeff === 0) {
    return false;
  }

  // Check if coefficients share a common factor (e.g. 6/4 or 12/4 or 10/15)
  if (gcd(numTerm.coeff, denTerm.coeff) > 1) {
    return false;
  }

  // Check if variables share any common base letter (e.g. x^3/x^2 or xy/y or x/x^2)
  const numVars = parseVariablePart(numTerm.variable);
  const denVars = parseVariablePart(denTerm.variable);
  for (const letter in numVars) {
    if ((denVars[letter] || 0) > 0) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates unique prime factors of a number (excluding 1 and itself).
 */
export function getPrimeFactors(n) {
  const factors = [];
  let temp = Math.abs(n);
  let d = 2;
  while (temp > 1) {
    if (temp % d === 0) {
      if (!factors.includes(d)) {
        factors.push(d);
      }
      temp /= d;
    } else {
      d++;
    }
  }
  return factors.filter(f => f !== 1 && f !== Math.abs(n));
}

/**
 * Returns all possible 2-factor decomposition options for a given term object.
 * Handles both numerical prime factors and splitting variable parts (e.g. 5x -> 5 · x).
 */
export function getTermDecompositionOptions(term) {
  if (!term) return [];
  const absCoeff = Math.abs(term.coeff);
  const sign = Math.sign(term.coeff) || 1;
  const hasVar = !!term.variable;

  const options = [];
  const seenSignatures = new Set();

  // 0. If term has negative coefficient (e.g. -6 or -2x), the ONLY primary option is to split off -1:
  // -1 · positiveTerm (e.g. -6 -> -1 · 6, -2x -> -1 · 2x)
  if (term.coeff < 0) {
    const splitA = makeTerm(-1, null, term.groupId);
    const splitB = makeTerm(absCoeff, term.variable, term.groupId);
    return [{ splitA, splitB }];
  }

  // 1. If term has a variable and coeff > 1, we can split into coeff · var (e.g. 5x -> 5 · x)
  if (hasVar && absCoeff > 1) {
    const splitA = makeTerm(term.coeff, null, term.groupId);
    const splitB = makeTerm(1, term.variable, term.groupId);
    const sig = `${splitA.coeff},${splitA.variable}|${splitB.coeff},${splitB.variable}`;
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      options.push({ splitA, splitB });
    }
  }

  // 2. Numerical prime factors of absCoeff
  const primeFactors = getPrimeFactors(absCoeff);
  for (const factor of primeFactors) {
    const otherCoeff = absCoeff / factor;

    // Option A: factor is constant, other keeps the variable (if any)
    let splitA1 = makeTerm(factor * sign, null, term.groupId);
    let splitB1 = makeTerm(otherCoeff, term.variable, term.groupId);
    if (!splitA1.variable && !splitB1.variable && Math.abs(splitA1.coeff) > Math.abs(splitB1.coeff)) {
      const temp = splitA1;
      splitA1 = splitB1;
      splitB1 = temp;
    }
    const sig1 = `${splitA1.coeff},${splitA1.variable}|${splitB1.coeff},${splitB1.variable}`;
    if (!seenSignatures.has(sig1)) {
      seenSignatures.add(sig1);
      options.push({ splitA: splitA1, splitB: splitB1 });
    }

    // Option B: if otherCoeff > 1 and has variable, factor keeps variable, other is constant
    if (hasVar && otherCoeff > 1) {
      let splitA2 = makeTerm(factor * sign, term.variable, term.groupId);
      let splitB2 = makeTerm(otherCoeff, null, term.groupId);
      if (!splitA2.variable && !splitB2.variable && Math.abs(splitA2.coeff) > Math.abs(splitB2.coeff)) {
        const temp = splitA2;
        splitA2 = splitB2;
        splitB2 = temp;
      }
      const sig2 = `${splitA2.coeff},${splitA2.variable}|${splitB2.coeff},${splitB2.variable}`;
      if (!seenSignatures.has(sig2)) {
        seenSignatures.add(sig2);
        options.push({ splitA: splitA2, splitB: splitB2 });
      }
    }
  }

  // 3. Multi-variable decomposition (e.g. by -> b · y, x^2y -> x^2 · y)
  if (hasVar) {
    const varMap = parseVariablePart(term.variable);
    const letters = Object.keys(varMap);
    if (letters.length > 1) {
      const firstLetter = letters[0];
      const firstExp = varMap[firstLetter];
      const firstVar = firstExp === 1 ? firstLetter : `${firstLetter}^${firstExp}`;
      const remainingMap = { ...varMap };
      delete remainingMap[firstLetter];
      const remainingVar = serializeVariablePart(remainingMap);
      const splitA = makeTerm(term.coeff, firstVar, term.groupId);
      const splitB = makeTerm(1, remainingVar, term.groupId);
      const sig = `${splitA.coeff},${splitA.variable}|${splitB.coeff},${splitB.variable}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        options.push({ splitA, splitB });
      }
    }
  }

  return options;
}

/**
 * Parses a variable string (like "x^2y", "ax", "z^3") into a map of { letter: exponent }
 */
export function parseVariablePart(varStr) {
  const result = {};
  if (!varStr) return result;
  const regex = /([a-zA-Z])(?:\^(\d+))?/g;
  let match;
  while ((match = regex.exec(varStr)) !== null) {
    const letter = match[1];
    const exp = match[2] ? parseInt(match[2], 10) : 1;
    result[letter] = (result[letter] || 0) + exp;
  }
  return result;
}

/**
 * Serializes a letter-exponent map back to a sorted string (like "x^2y")
 */
export function serializeVariablePart(varMap) {
  const sortedLetters = Object.keys(varMap).sort();
  let result = '';
  for (const letter of sortedLetters) {
    const exp = varMap[letter];
    if (exp === 0) continue;
    if (exp === 1) {
      result += letter;
    } else {
      result += `${letter}^${exp}`;
    }
  }
  return result || null;
}

/**
 * Multiplies two terms together, combining coefficients and variable exponents.
 */
export function multiplyTerms(termA, termB, groupId = null) {
  const newCoeff = termA.coeff * termB.coeff;
  
  const mapA = parseVariablePart(termA.variable);
  const mapB = parseVariablePart(termB.variable);
  
  const mergedMap = { ...mapA };
  for (const letter in mapB) {
    mergedMap[letter] = (mergedMap[letter] || 0) + mapB[letter];
  }
  
  const newVar = serializeVariablePart(mergedMap);
  const targetGroupId = groupId || (termA && termB && termA.groupId === termB.groupId ? termA.groupId : (termA?.groupId || termB?.groupId || null));
  return makeTerm(newCoeff, newVar, targetGroupId);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Equation-equivalence layer.
 *
 * Every legal algebraic operation turns "A = B" into "A' = B'" such that
 *     (A' - B') = k * (A - B)   for some NONZERO constant k, for all variable values.
 * Transposing a term is k = 1. Dividing both sides by d is k = 1/d. Cancelling a
 * common factor d is k = 1/d. Decomposing/recombining is k = 1. Anything that cannot
 * be written this way has changed the solution set and must be rejected.
 * ──────────────────────────────────────────────────────────────────────────── */

export const EQUIV_EPS = 1e-9;

/** Splits a flat term list into additive groups (consecutive same-groupId runs). */
export function splitIntoAdditiveGroups(sourceList) {
  if (!sourceList || sourceList.length === 0) return [];
  const groups = [];
  let currentGroup = [];
  sourceList.forEach((t, idx) => {
    if (idx === 0) {
      currentGroup.push(t);
    } else if (t.groupId && currentGroup[0].groupId && t.groupId === currentGroup[0].groupId) {
      currentGroup.push(t);
    } else {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [t];
    }
  });
  if (currentGroup.length > 0) groups.push(currentGroup);
  return groups;
}

/** Collects every distinct variable letter appearing anywhere in the equation. */
export function collectVariableLetters(...termLists) {
  const letters = new Set();
  termLists.flat().forEach(t => {
    Object.keys(parseVariablePart(t.variable)).forEach(l => letters.add(l));
  });
  return Array.from(letters);
}

function evaluateTerm(term, assignment) {
  const vars = parseVariablePart(term.variable);
  let value = term.coeff;
  for (const letter in vars) {
    value *= Math.pow(assignment[letter] ?? 1, vars[letter]);
  }
  return value;
}

/**
 * Value of one side: the numerator is a SUM of additive groups (each group being a
 * PRODUCT of its factors), all divided by the denominator, itself a PRODUCT.
 * Returns null when the denominator evaluates to zero (probe is unusable).
 */
export function evaluateSide(numTerms, denTerms, assignment) {
  const numerator = splitIntoAdditiveGroups(numTerms)
    .reduce((sum, group) => sum + group.reduce((prod, t) => prod * evaluateTerm(t, assignment), 1), 0);
  const denominator = denTerms.reduce((prod, t) => prod * evaluateTerm(t, assignment), 1);
  if (Math.abs(denominator) < EQUIV_EPS) return null;
  return numerator / denominator;
}

/** left - right for a given probe assignment; null if any denominator is zero. */
export function equationDelta(state, assignment) {
  const left = evaluateSide(state.leftNum, state.leftDen, assignment);
  const right = evaluateSide(state.rightNum, state.rightDen, assignment);
  if (left === null || right === null) return null;
  return left - right;
}

const PROBE_VALUES = [1.7, -2.3, 0.6, 3.4];

/**
 * True when `after` has the same solution set as `before`, i.e. their deltas are
 * related by one nonzero constant across several probe assignments.
 */
export function isEquivalentTransformation(before, after) {
  const letters = collectVariableLetters(
    before.leftNum, before.leftDen, before.rightNum, before.rightDen,
    after.leftNum, after.leftDen, after.rightNum, after.rightDen
  );

  const ratios = [];
  for (let i = 0; i < PROBE_VALUES.length; i++) {
    const assignment = {};
    letters.forEach((letter, j) => {
      assignment[letter] = PROBE_VALUES[(i + j) % PROBE_VALUES.length];
    });

    const d0 = equationDelta(before, assignment);
    const d1 = equationDelta(after, assignment);
    if (d0 === null || d1 === null) continue;     // unusable probe (zero denominator)
    if (Math.abs(d0) < EQUIV_EPS) continue;       // probe happens to be a solution
    ratios.push(d1 / d0);
  }

  if (ratios.length === 0) return true;           // nothing testable; don't block the player
  if (Math.abs(ratios[0]) < EQUIV_EPS) return false;  // k must be nonzero
  return ratios.every(r => Math.abs(r - ratios[0]) < 1e-6);
}

/**
 * Rule D: dividing a side must divide the WHOLE side. Moving a factor into a
 * denominator is only valid when the source numerator is a single additive group —
 * otherwise only one term of the sum would get divided (2x + 3 = 9 -> x + 3 = 9/2).
 */
export function canMoveToDenominator(sourceNumTerms) {
  return splitIntoAdditiveGroups(sourceNumTerms.filter(t => t.coeff !== 0)).length <= 1;
}

/**
 * Rule C: a factor may only be cancelled against a shared denominator when it is
 * exposed as a factor in EVERY additive group of that numerator, so the cancel can be
 * applied to all of them at once. Returns the indices of the matching factor in each
 * group, or null when the cancel is not (yet) legal.
 */
export function findDistributiveCancel(numTerms, denTerm) {
  const groups = splitIntoAdditiveGroups(numTerms.filter(t => t.coeff !== 0));
  if (groups.length === 0) return null;
  const picks = [];
  for (const group of groups) {
    const match = group.find(t => areEqualTerms(t, denTerm));
    if (!match) return null;      // this group hasn't exposed the factor yet
    picks.push(match.id);
  }
  return picks;
}

function isFractionSimplified(numTerms, denTerms) {
  if (numTerms.length === 0 || denTerms.length === 0) return true;
  // A shared denominator applies to every additive numerator term at once (e.g. (7-3)/2 = 7/2 - 3/2),
  // so it's only simplified once none of those terms share a common factor with any denominator factor.
  for (const numTerm of numTerms) {
    for (const denTerm of denTerms) {
      if (gcd(numTerm.coeff, denTerm.coeff) > 1) return false;

      const numVars = parseVariablePart(numTerm.variable);
      const denVars = parseVariablePart(denTerm.variable);
      for (const letter in numVars) {
        if (denVars[letter] > 0) return false;
      }
    }
  }

  return true;
}

/**
 * Checks if the equation is solved.
 * Solved when:
 * 1. The isolated side (the one holding the unknown) is compacted to exactly [unknownVar] with coeff 1
 *    and an empty denominator.
 * 2. The other side has no unknownVar left. It may still hold multiple additive terms sharing one
 *    denominator (e.g. x = 7/2 - 3/2), since a denominator divides every term on that side at once.
 * 3. That other side's fraction is fully simplified (no common factor between any of its numerator
 *    terms and its denominator).
 */
export function isEquationSolved(leftNum, leftDen, rightNum, rightDen, unknownVar) {
  const hasVar = (terms) => terms.some(t => t.variable && t.variable.includes(unknownVar));
  const leftHasVar = hasVar(leftNum) || hasVar(leftDen);
  const rightHasVar = hasVar(rightNum) || hasVar(rightDen);

  const leftIsolated = leftNum.length === 1 && leftNum[0].coeff === 1 && leftNum[0].variable === unknownVar && leftDen.length === 0;
  const rightIsolated = rightNum.length === 1 && rightNum[0].coeff === 1 && rightNum[0].variable === unknownVar && rightDen.length === 0;

  if (leftIsolated && !rightHasVar) {
    return isFractionSimplified(rightNum, rightDen);
  }
  if (rightIsolated && !leftHasVar) {
    return isFractionSimplified(leftNum, leftDen);
  }

  return false;
}

/**
 * Splits a sum string into signed term strings (e.g. "2x + 3 - y" -> ["2x", "3", "-y"]).
 */
export function splitAdditiveExpression(exprStr) {
  if (!exprStr) return [];
  const clean = normalizeMathString(exprStr).trim().replace(/\s+/g, '');
  if (!clean) return [];

  // Match signed chunks: optional leading [+-], followed by everything up to next [+-]
  const matches = clean.match(/[+-]?[^+-]+/g);
  if (!matches) return [];

  return matches.map(token => token.startsWith('+') ? token.slice(1) : token).filter(Boolean);
}

/**
 * Parses one side of an equation (e.g. "2x + 3" or "(6x - 4) / 2") into numerator and denominator term arrays.
 */
export function parseEquationSide(sideStr) {
  if (!sideStr) return { num: [], den: [] };
  const clean = normalizeMathString(sideStr).trim();
  if (!clean) return { num: [], den: [] };

  const slashIdx = clean.search(/[\/÷]/);
  if (slashIdx === -1) {
    const tokens = splitAdditiveExpression(clean);
    return {
      num: tokens.map(t => parseTermString(t)).filter(Boolean),
      den: []
    };
  }

  let numPart = clean.slice(0, slashIdx).trim();
  let denPart = clean.slice(slashIdx + 1).trim();

  // Strip wrapping parentheses: "(2x + 4)" -> "2x + 4"
  if (numPart.startsWith('(') && numPart.endsWith(')')) {
    numPart = numPart.slice(1, -1).trim();
  }
  if (denPart.startsWith('(') && denPart.endsWith(')')) {
    denPart = denPart.slice(1, -1).trim();
  }

  const numTokens = splitAdditiveExpression(numPart);
  const denTokens = splitAdditiveExpression(denPart);

  return {
    num: numTokens.map(t => parseTermString(t)).filter(Boolean),
    den: denTokens.map(t => parseTermString(t)).filter(Boolean)
  };
}

/**
 * Parses a single equation string like "2x = 6", "2x + 3 = 9", or "3x - 4 = 5 | 2" into a level object.
 */
export function parseEquationLevel(lineStr, index = 0) {
  if (!lineStr) return null;
  let text = normalizeMathString(lineStr).trim();
  if (!text || text.startsWith('#') || text.startsWith('//')) return null;

  // Optional manual minPresses at end, e.g. "2x = 6 | 3" or "2x = 6 [3]"
  let explicitMinPresses = null;
  const pipeMatch = text.match(/[|\[]\s*(\d+)\s*\]?$/);
  if (pipeMatch) {
    explicitMinPresses = parseInt(pipeMatch[1], 10);
    text = text.slice(0, pipeMatch.index).trim();
  }

  const equalsIdx = text.indexOf('=');
  if (equalsIdx === -1) return null;

  const leftStr = text.slice(0, equalsIdx).trim();
  const rightStr = text.slice(equalsIdx + 1).trim();

  const left = parseEquationSide(leftStr);
  const right = parseEquationSide(rightStr);
  if (left.num.length === 0 && left.den.length === 0 && right.num.length === 0 && right.den.length === 0) {
    return null;
  }

  let defaultPresses = 3;
  // Estimate steps: if single var with coeff > 1, ~3 steps (tap to split, drag, simplify)
  const allTerms = [...left.num, ...left.den, ...right.num, ...right.den];
  const varTerms = allTerms.filter(t => t.variable);
  const constTerms = allTerms.filter(t => !t.variable && t.coeff !== 0);
  if (varTerms.length === 1 && Math.abs(varTerms[0].coeff) > 1 && constTerms.length <= 1) {
    defaultPresses = 3; // 2x = 6 -> split 2, drag 2 under 6, simplify 6/2
  } else if (varTerms.length === 1 && constTerms.length >= 2) {
    defaultPresses = 2; // 2x + 3 = 9 -> transpose 3, then divide
  }

  return {
    levelNum: index + 1,
    initialLeftNum: left.num,
    initialLeftDen: left.den,
    initialRightNum: right.num,
    initialRightDen: right.den,
    minPresses: explicitMinPresses !== null && !isNaN(explicitMinPresses) ? explicitMinPresses : defaultPresses
  };
}

/**
 * Parses multiline custom equations text into an array of levels.
 */
export function parseCustomEquationLevels(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const levels = [];
  lines.forEach((line) => {
    try {
      const level = parseEquationLevel(line, levels.length);
      if (level && (level.initialLeftNum.length > 0 || level.initialRightNum.length > 0)) {
        levels.push(level);
      }
    } catch (e) {
      console.warn("Skipping invalid equation level line:", line, e);
    }
  });
  return levels;
}

/**
 * Splits a factor list string (e.g. "5 · by", "7x * 12", "(5a)(y)", "y 15") into an array of parsed term objects.
 */
export function parseFactorList(factorsStr) {
  if (!factorsStr) return [];
  let clean = normalizeMathString(factorsStr).trim();
  if (clean.startsWith('(') && clean.endsWith(')')) {
    clean = clean.slice(1, -1).trim();
  }
  clean = clean.replace(/\)\s*\(/g, ')*(');
  const hasExplicitSep = /[*·\u00b7\u22c5×,]/.test(clean);
  const rawTokens = hasExplicitSep ? clean.split(/[*·\u00b7\u22c5×,]+/) : clean.split(/\s+/);
  return rawTokens
    .map(t => t.trim().replace(/^\(|\)$/g, ''))
    .filter(Boolean)
    .map(t => parseTermString(t))
    .filter(Boolean);
}

/**
 * Parses a single division expression line into a level object.
 * Format examples:
 * "(5 · by) / (y · 15)"
 * "7x * 12 / 4 * b | 2"
 * "5a / y"
 */
export function parseDivisionLevel(lineStr, index = 0) {
  if (!lineStr) return null;
  let text = normalizeMathString(lineStr).trim();
  if (!text || text.startsWith('#') || text.startsWith('//')) return null;

  let explicitMinPresses = null;
  const pipeMatch = text.match(/[|\[]\s*(\d+)\s*\]?$/);
  if (pipeMatch) {
    explicitMinPresses = parseInt(pipeMatch[1], 10);
    text = text.slice(0, pipeMatch.index).trim();
  }

  const slashIdx = text.search(/[\/÷]/);
  let numStr = text;
  let denStr = '';
  if (slashIdx !== -1) {
    numStr = text.slice(0, slashIdx).trim();
    denStr = text.slice(slashIdx + 1).trim();
  }

  const numTerms = parseFactorList(numStr);
  const denTerms = parseFactorList(denStr);
  if (numTerms.length === 0 && denTerms.length === 0) return null;

  const matches = countMatchingPairs(numTerms, denTerms);
  const defaultMinPresses = explicitMinPresses !== null && !isNaN(explicitMinPresses)
    ? explicitMinPresses
    : Math.max(1, matches > 0 ? matches : Math.min(numTerms.length || 1, denTerms.length || 1));

  return {
    levelNum: index + 1,
    initialNum: numTerms,
    initialDen: denTerms,
    minPresses: defaultMinPresses
  };
}

/**
 * Parses multiline custom divisions text into an array of division levels.
 */
export function parseCustomDivisionLevels(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const levels = [];
  lines.forEach((line) => {
    try {
      const level = parseDivisionLevel(line, levels.length);
      if (level && (level.initialNum.length > 0 || level.initialDen.length > 0)) {
        levels.push(level);
      }
    } catch (e) {
      console.warn("Skipping invalid division level line:", line, e);
    }
  });
  return levels;
}

/**
 * Parses a single like-terms expression line into a level object.
 * Format examples:
 * "3x + 5 + 4x"
 * "8 - 2x - 5 | 1"
 * "-4a + 7b + 9a - 2b"
 */
export function parseLikeTermsLevel(lineStr, index = 0) {
  if (!lineStr) return null;
  let text = normalizeMathString(lineStr).trim();
  if (!text || text.startsWith('#') || text.startsWith('//')) return null;

  let explicitMinPresses = null;
  const pipeMatch = text.match(/[|\[]\s*(\d+)\s*\]?$/);
  if (pipeMatch) {
    explicitMinPresses = parseInt(pipeMatch[1], 10);
    text = text.slice(0, pipeMatch.index).trim();
  }

  const tokens = splitAdditiveExpression(text);
  if (tokens.length === 0) return null;
  const terms = tokens.map(t => parseTermString(t)).filter(Boolean);
  if (terms.length === 0) return null;

  return {
    levelNum: index + 1,
    initialTerms: terms,
    minPresses: explicitMinPresses !== null && !isNaN(explicitMinPresses)
      ? explicitMinPresses
      : calculateMinPresses(terms)
  };
}

/**
 * Parses multiline custom like-terms text into an array of levels.
 */
export function parseCustomLikeTermsLevels(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const levels = [];
  lines.forEach((line) => {
    try {
      const level = parseLikeTermsLevel(line, levels.length);
      if (level && level.initialTerms.length > 0) {
        levels.push(level);
      }
    } catch (e) {
      console.warn("Skipping invalid like terms level line:", line, e);
    }
  });
  return levels;
}


