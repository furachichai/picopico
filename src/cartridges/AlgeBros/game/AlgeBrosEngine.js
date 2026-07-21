/**
 * AlgeBrosEngine.js
 * 
 * Logic engine for the algeBROS game (combining like terms).
 */

/**
 * Generates a unique term object.
 */
export function makeTerm(coeff, variable) {
  return {
    id: Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36),
    coeff: Number(coeff),
    variable: variable || null, // null means constant
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
  return makeTerm(newCoeff, newCoeff === 0 ? null : termA.variable);
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
export function multiplyTerms(termA, termB) {
  const newCoeff = termA.coeff * termB.coeff;
  
  const mapA = parseVariablePart(termA.variable);
  const mapB = parseVariablePart(termB.variable);
  
  const mergedMap = { ...mapA };
  for (const letter in mapB) {
    mergedMap[letter] = (mergedMap[letter] || 0) + mapB[letter];
  }
  
  const newVar = serializeVariablePart(mergedMap);
  return makeTerm(newCoeff, newVar);
}
