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

/**
 * Parses a single term string like "-3x^2", "7x", "-14", "x" into a term object.
 */
export function parseTermString(termStr) {
  const cleanStr = termStr.replace(/\s+/g, '');
  // Matches: optional sign (+|-), optional coefficient digits, optional variable (one or more letters and power)
  const regex = /^([+-]?)(\d*)([a-zA-Z]+(?:\^\d+)?)?$/;
  const match = cleanStr.match(regex);
  if (!match) {
    throw new Error(`Invalid term string: ${termStr}`);
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

/**
 * Checks if the division expression is fully simplified (no more equal pairs).
 */
export function isDivisionSimplified(numTerms, denTerms) {
  return countMatchingPairs(numTerms, denTerms) === 0;
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

  return options;
}

/**
 * Parses a variable string (like "x^2y", "ax", "z^3") into a map of { letter: exponent }
 */
function parseVariablePart(varStr) {
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
function serializeVariablePart(varMap) {
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

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
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
