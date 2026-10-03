/**
 * Utility functions for Balanza + Field quiz (Scale & Expression Quiz)
 */
import { parseFieldExpression, evaluateMathExpression, generateFieldChoices, shuffleArray } from './fieldQuizUtils.js';
import { parseCrateLetter, parseCrateTerm } from './crateUtils.jsx';
import { parseSackNumber, parseSackTerm } from './sackUtils.jsx';

export function parseWeightSymbol(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.trim().match(/^w(\d{1,2})$/i);
  return match ? parseFloat(match[1]) : null;
}

// Tilt parameters
export const MAX_TILT_DEG = 12;
export const TILT_SOFTNESS = 10;

/**
 * Computes the tilt angle of the beam given left and right total weights.
 * When left > right, tilt is negative (tilts down on left).
 * When right > left, tilt is positive (tilts down on right).
 * When equal, tilt is 0.
 */
export function computeBalanzaFieldTilt(leftTotal, rightTotal) {
  const diff = rightTotal - leftTotal;
  return MAX_TILT_DEG * Math.tanh(diff / TILT_SOFTNESS);
}

/**
 * Parses a weights string like "c=3, t=5, ☕=3, 🌮=5" or "c:3, t:5" into a map.
 */
export function parseBalanzaFieldWeights(weightsText) {
  if (!weightsText) return {};
  if (typeof weightsText === 'object') return { ...weightsText };

  const map = {};
  const entries = String(weightsText).split(/[,;\n]/);
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[:=]/);
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parseFloat(parts[1].trim());
      if (key && !isNaN(val)) {
        map[key] = val;
        map[key.toLowerCase()] = val;
      }
    }
  }
  return map;
}

/**
 * Evaluates the numeric weight of a single term or choice string (e.g. "2c", "t", "c+c", "5", "3t").
 */
export function evaluateTermWeight(termStr, weights = {}) {
  if (!termStr) return 0;
  const str = String(termStr).trim();
  if (!str) return 0;

  // Direct number check (e.g. "5", "-2", "3.5")
  const directNum = parseFloat(str);
  if (!isNaN(directNum) && String(directNum) === str) {
    return directNum;
  }

  // Weight symbol check (e.g. "w5", "w10")
  const wVal = parseWeightSymbol(str);
  if (wVal !== null) {
    return wVal;
  }

  // Sack token check (e.g. "s5", "2s5", "sack10", "flour5")
  const sackTerm = parseSackTerm(str);
  if (sackTerm) {
    return sackTerm.coeff * sackTerm.number;
  }

  // Crate token check (e.g. "[c]", "2[c]", "📦x", "crate_a")
  const crateTerm = parseCrateTerm(str);
  if (crateTerm) {
    const letter = crateTerm.letter || 'crate';
    const varWeight = weights[letter] !== undefined
      ? weights[letter]
      : (weights[letter.toLowerCase()] !== undefined
        ? weights[letter.toLowerCase()]
        : (weights[str] !== undefined ? weights[str] : (weights['crate'] || 5)));
    return crateTerm.coeff * varWeight;
  }

  // Check if expression contains addition/subtraction (e.g. "c+c", "2c + t")
  if (str.includes('+') || (str.includes('-') && !str.startsWith('-'))) {
    let total = 0;
    const tokens = str.match(/([+-]?\s*[^+-]+)/g);
    if (tokens && tokens.length > 1) {
      for (const token of tokens) {
        const cleanToken = token.trim();
        const isMinus = cleanToken.startsWith('-');
        const subTerm = cleanToken.replace(/^[+-]/, '').trim();
        const subWeight = evaluateTermWeight(subTerm, weights);
        total += isMinus ? -subWeight : subWeight;
      }
      return total;
    }
  }

  // Check if token has a leading sign
  let sign = 1;
  let clean = str;
  if (clean.startsWith('-') || clean.startsWith('−')) {
    sign = -1;
    clean = clean.slice(1).trim();
  } else if (clean.startsWith('+')) {
    clean = clean.slice(1).trim();
  }

  // Check if it's a coefficient + variable/object/weight (e.g. "2c", "3t", "2☕", "2w5", "x", "c")
  const match = clean.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  if (match) {
    const coeff = parseFloat(match[1]);
    const varName = match[2].trim();
    // Check if varName is a weight symbol like w5
    const varWVal = parseWeightSymbol(varName);
    if (varWVal !== null) {
      return sign * coeff * varWVal;
    }
    const varSVal = parseSackNumber(varName);
    if (varSVal !== null) {
      return sign * coeff * parseFloat(varSVal);
    }
    const varWeight = weights[varName] !== undefined
      ? weights[varName]
      : (weights[varName.toLowerCase()] !== undefined ? weights[varName.toLowerCase()] : 0);
    return sign * coeff * varWeight;
  }

  // Single variable / emoji / object (coeff = 1)
  const varWeight = weights[clean] !== undefined
    ? weights[clean]
    : (weights[clean.toLowerCase()] !== undefined ? weights[clean.toLowerCase()] : 0);
  return sign * varWeight;
}

/**
 * Parses left plate objects from a string like "☕, ☕, 🌮", "2c, t", or inline weights "☕=3, 🌮=5", "w5, 2w10".
 * Returns an array of parsed item objects, plus the total left weight.
 */
export function parseLeftPlateObjects(leftPlateText, weights = {}) {
  if (!leftPlateText) return { items: [], totalWeight: 0 };

  const rawItems = String(leftPlateText).split(/[,+]/).map(s => s.trim()).filter(Boolean);
  const items = [];
  let totalWeight = 0;

  rawItems.forEach((raw, idx) => {
    let sign = 1;
    let clean = raw;
    if (clean.startsWith('-') || clean.startsWith('−')) {
      sign = -1;
      clean = clean.slice(1).trim();
    }

    let coeff = 1;
    let variable = clean;
    let inlineWeight = null;

    // Check for inline weight definition: e.g. "☕=3", "☕:3", "☕(3)"
    const parenMatch = clean.match(/^(.+?)\s*\(\s*(\d+(?:\.\d+)?)\s*\)$/);
    if (parenMatch) {
      clean = parenMatch[1].trim();
      inlineWeight = parseFloat(parenMatch[2]);
    } else if (clean.includes('=') || clean.includes(':')) {
      const parts = clean.split(/[:=]/);
      clean = parts[0].trim();
      inlineWeight = parseFloat(parts[1].trim());
    }

    const crateTerm = parseCrateTerm(clean);
    const sackTerm = parseSackTerm(clean);
    if (crateTerm) {
      coeff = Math.abs(crateTerm.coeff);
      variable = `[${crateTerm.letter}]`;
    } else if (sackTerm) {
      coeff = Math.abs(sackTerm.coeff);
      variable = `s${sackTerm.number}`;
    } else {
      const match = clean.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
      if (match) {
        coeff = parseFloat(match[1]);
        variable = match[2].trim();
      } else {
        variable = clean;
      }
    }

    let itemWeight;
    if (inlineWeight !== null && !isNaN(inlineWeight)) {
      itemWeight = sign * coeff * inlineWeight;
    } else {
      itemWeight = evaluateTermWeight(clean, weights) * sign;
    }
    totalWeight += itemWeight;

    items.push({
      id: `left-${idx}-${raw}`,
      raw,
      sign,
      coeff,
      variable,
      weight: itemWeight
    });
  });

  return { items, totalWeight };
}

/**
 * Evaluates the total weight of the right plate given the field segments and placed selections.
 * Segments are from parseFieldExpression(fieldExpression).
 * fieldSelections maps slotIndex -> choiceObj.
 */
export function evaluateRightPlateWeight(segments, fieldSelections = {}, weights = {}) {
  if (!segments || !Array.isArray(segments)) return 0;

  let total = 0;
  let currentOp = '+';

  segments.forEach((seg, idx) => {
    if (seg.type === 'text') {
      const trimmed = seg.content.trim();
      if (trimmed.includes('-') || trimmed.includes('−')) {
        currentOp = '-';
      } else if (trimmed.includes('+')) {
        currentOp = '+';
      }
    } else if (seg.type === 'field') {
      const placed = fieldSelections[idx];
      const slotWeight = placed ? evaluateTermWeight(placed.value, weights) : 0;
      if (currentOp === '-') {
        total -= slotWeight;
      } else {
        total += slotWeight;
      }
      currentOp = '+'; // default back to +
    }
  });

  return total;
}

/**
 * Decomposes a simple algebraic term into variable count map: e.g. "2c" -> { c: 2 }, "c+c" -> { c: 2 }, "t" -> { t: 1 }.
 */
export function decomposeTermVariables(termStr) {
  const result = {};
  if (!termStr) return result;
  const str = String(termStr).trim().toLowerCase().replace(/\s+/g, '');

  const tokens = str.split('+');
  for (const tok of tokens) {
    if (!tok) continue;
    const crateTerm = parseCrateTerm(tok);
    if (crateTerm) {
      const letter = (crateTerm.letter || 'crate').toLowerCase();
      result[letter] = (result[letter] || 0) + crateTerm.coeff;
      continue;
    }
    const sackTerm = parseSackTerm(tok);
    if (sackTerm) {
      const sackKey = `s${sackTerm.number}`;
      result[sackKey] = (result[sackKey] || 0) + sackTerm.coeff;
      continue;
    }
    const match = tok.match(/^(\d+)([a-zA-Z\u00A0-\uFFFF_]+)$/);
    if (match) {
      const c = parseInt(match[1], 10);
      const v = match[2];
      result[v] = (result[v] || 0) + c;
    } else if (/^[a-zA-Z\u00A0-\uFFFF_]+$/.test(tok)) {
      result[tok] = (result[tok] || 0) + 1;
    } else {
      result[tok] = (result[tok] || 0) + 1;
    }
  }
  return result;
}

/**
 * Checks if two term strings are algebraically identical in object count, e.g. "2c" == "c+c".
 */
export function areTermsAlgebraicallyEquivalent(termA, termB) {
  const normA = String(termA || '').trim().toLowerCase().replace(/\s+/g, '');
  const normB = String(termB || '').trim().toLowerCase().replace(/\s+/g, '');
  if (normA === normB) return true;

  const mapA = decomposeTermVariables(normA);
  const mapB = decomposeTermVariables(normB);

  const keysA = Object.keys(mapA);
  const keysB = Object.keys(mapB);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(k => mapA[k] === mapB[k]);
}

/**
 * Generates slots and operators for Balanza Field scale plate.
 * If fieldCount is specified (> 0), creates exactly fieldCount slots.
 * Otherwise, uses parseFieldExpression on clean targetExpression (preserving asterisks *...*).
 */
export function getBalanzaFieldSegments(targetExpression, fieldCount = null) {
  const cleanTarget = String(targetExpression || '*2c* + *t*').split(';')[0].trim();
  const explicitCount = parseInt(fieldCount, 10);

  const hasStars = /\*[^*]+\*/.test(cleanTarget);

  if ((isNaN(explicitCount) || explicitCount <= 0) && hasStars) {
    return parseFieldExpression(cleanTarget);
  }

  // Determine number of slots
  let count = explicitCount;
  if (isNaN(count) || count <= 0) {
    if (hasStars) {
      count = parseFieldExpression(cleanTarget).filter(s => s.type === 'field').length;
    } else {
      const terms = cleanTarget.split(/[+-]/).filter(t => t.trim().length > 0);
      count = Math.max(1, terms.length);
    }
  }

  // Extract operators from target (e.g. from "x + 6 - 2", operators = ['+', '-'])
  const operatorMatches = cleanTarget.replace(/\*[^*]+\*/g, '_').match(/[+-]/g) || [];

  const segments = [];
  for (let i = 0; i < count; i++) {
    segments.push({
      type: 'field',
      isDouble: false,
      placeholder: '',
      evaluated: null,
      slotIndex: segments.length
    });

    if (i < count - 1) {
      const op = operatorMatches[i] || '+';
      segments.push({
        type: 'text',
        content: ` ${op} `
      });
    }
  }

  return segments;
}

/**
 * Parses an algebraic expression into a polynomial map of variables and constant sum.
 * Example:
 * "*x* + *6*" -> { variables: { x: 1 }, constant: 6 }
 * "x + 2 + 4" -> { variables: { x: 1 }, constant: 6 }
 */
export function parseAlgebraicPolynomial(exprStr) {
  const result = {
    variables: {},
    constant: 0
  };

  if (!exprStr) return result;
  const str = String(exprStr).replace(/\*/g, '').trim();
  if (!str) return result;

  const tokens = str.match(/[+-]?[^+-]+/g) || [str];

  for (const rawToken of tokens) {
    const trimmed = rawToken.trim();
    if (!trimmed) continue;

    let sign = 1;
    let clean = trimmed;
    if (clean.startsWith('-') || clean.startsWith('−')) {
      sign = -1;
      clean = clean.slice(1).trim();
    } else if (clean.startsWith('+')) {
      sign = 1;
      clean = clean.slice(1).trim();
    }
    if (!clean) continue;

    // Direct number check
    const directNum = parseFloat(clean);
    if (!isNaN(directNum) && String(directNum) === clean) {
      result.constant += sign * directNum;
      continue;
    }

    // Weight symbol (e.g. "w5", "2w5")
    const wMatch = clean.match(/^(\d*(?:\.\d+)?)\s*w(\d{1,2})$/i);
    if (wMatch) {
      const coeff = wMatch[1] ? parseFloat(wMatch[1]) : 1;
      const val = parseFloat(wMatch[2]);
      result.constant += sign * coeff * val;
      continue;
    }

    // Flour sack (e.g. "s5", "2s5")
    const sackTerm = parseSackTerm(clean);
    if (sackTerm) {
      result.constant += sign * sackTerm.coeff * sackTerm.number;
      continue;
    }

    // Wooden crate (e.g. "[x]", "2[c]")
    const crateTerm = parseCrateTerm(clean);
    if (crateTerm) {
      const varKey = (crateTerm.letter || 'crate').toLowerCase();
      result.variables[varKey] = (result.variables[varKey] || 0) + sign * crateTerm.coeff;
      continue;
    }

    // Pure math expression
    const mathVal = evaluateMathExpression(clean);
    if (mathVal !== null) {
      result.constant += sign * mathVal;
      continue;
    }

    // Coefficient + variable/emoji (e.g. "2x", "3c", "2☕")
    const coeffVarMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
    if (coeffVarMatch) {
      const coeff = parseFloat(coeffVarMatch[1]);
      const rawVar = coeffVarMatch[2].trim();
      const isEmoji = /\p{Extended_Pictographic}/u.test(rawVar);
      const varName = isEmoji ? rawVar : rawVar.toLowerCase();
      result.variables[varName] = (result.variables[varName] || 0) + sign * coeff;
      continue;
    }

    // Single variable or emoji
    const isEmoji = /\p{Extended_Pictographic}/u.test(clean);
    const varName = isEmoji ? clean : clean.toLowerCase();
    result.variables[varName] = (result.variables[varName] || 0) + sign * 1;
  }

  return result;
}

/**
 * Checks if two polynomials are algebraically equivalent.
 */
export function arePolynomialsEquivalent(polyA, polyB) {
  if (Math.abs((polyA.constant || 0) - (polyB.constant || 0)) > 0.001) {
    return false;
  }

  const getActiveVars = (p) => {
    const vars = {};
    for (const [k, v] of Object.entries(p?.variables || {})) {
      if (Math.abs(v) > 0.001) {
        vars[k] = v;
      }
    }
    return vars;
  };

  const varsA = getActiveVars(polyA);
  const varsB = getActiveVars(polyB);

  const keysA = Object.keys(varsA);
  const keysB = Object.keys(varsB);
  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const k of keysA) {
    if (Math.abs(varsA[k] - (varsB[k] || 0)) > 0.001) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates the total algebraic polynomial of all placed cards in the scale slots.
 */
export function evaluatePlacedPolynomial(segments, fieldSelections = {}) {
  const result = {
    variables: {},
    constant: 0
  };

  if (!segments || !Array.isArray(segments)) return result;

  let currentOp = '+';

  segments.forEach((seg, idx) => {
    if (seg.type === 'text') {
      const trimmed = seg.content.trim();
      if (trimmed.includes('-') || trimmed.includes('−')) {
        currentOp = '-';
      } else if (trimmed.includes('+')) {
        currentOp = '+';
      }
    } else if (seg.type === 'field') {
      const placed = fieldSelections[idx];
      if (placed && placed.value !== undefined && placed.value !== null) {
        const slotSign = currentOp === '-' ? -1 : 1;
        const cardPoly = parseAlgebraicPolynomial(placed.value);

        result.constant += slotSign * cardPoly.constant;
        for (const [varName, coeff] of Object.entries(cardPoly.variables)) {
          result.variables[varName] = (result.variables[varName] || 0) + slotSign * coeff;
        }
      }
      currentOp = '+';
    }
  });

  return result;
}

/**
 * Checks solution correctness:
 * 1. All field slots must be filled.
 * 2. Left total weight must equal right total weight (Scale is equilibrated).
 * 3. The placed terms must match the target expression algebraically.
 */
export function checkBalanzaFieldSolution(
  segments,
  fieldSelections,
  leftTotalWeight,
  rightTotalWeight,
  commutative = true,
  targetExpression = null
) {
  if (!segments || !Array.isArray(segments)) {
    return { isComplete: false, isAllFilled: false, isEquilibrated: false, isExpressionMatch: false, errorType: 'empty_slots' };
  }

  const fieldSlots = segments
    .map((s, idx) => ({ ...s, slotIndex: idx }))
    .filter(s => s.type === 'field');

  const allFilled = fieldSlots.every(s => Boolean(fieldSelections[s.slotIndex]));
  if (!allFilled) {
    return {
      isComplete: false,
      isAllFilled: false,
      isEquilibrated: false,
      isExpressionMatch: false,
      errorType: 'empty_slots'
    };
  }

  const isEquilibrated = Math.abs(leftTotalWeight - rightTotalWeight) < 0.001;

  // Check expression matching
  let isExpressionMatch = false;

  if (targetExpression) {
    const polyTarget = parseAlgebraicPolynomial(targetExpression);
    const polyPlaced = evaluatePlacedPolynomial(segments, fieldSelections);
    isExpressionMatch = arePolynomialsEquivalent(polyTarget, polyPlaced);
  } else {
    const expectedValues = fieldSlots.map(s => String(s.evaluated || '').trim());
    const placedValues = fieldSlots.map(s => String(fieldSelections[s.slotIndex]?.value || '').trim());

    if (commutative) {
      const unmatchedExpected = [...expectedValues];
      let allMatched = true;

      for (const placed of placedValues) {
        const matchIdx = unmatchedExpected.findIndex(exp => areTermsAlgebraicallyEquivalent(placed, exp));
        if (matchIdx !== -1) {
          unmatchedExpected.splice(matchIdx, 1);
        } else {
          allMatched = false;
          break;
        }
      }
      isExpressionMatch = allMatched && unmatchedExpected.length === 0;
    } else {
      isExpressionMatch = expectedValues.every((exp, i) => areTermsAlgebraicallyEquivalent(placedValues[i], exp));
    }
  }

  const isComplete = isEquilibrated && isExpressionMatch;

  let errorType = null;
  if (!isComplete) {
    if (!isEquilibrated) {
      errorType = 'imbalanced';
    } else if (!isExpressionMatch) {
      errorType = 'expression_mismatch';
    }
  }

  return {
    isComplete,
    isAllFilled: true,
    isEquilibrated,
    isExpressionMatch,
    errorType
  };
}
