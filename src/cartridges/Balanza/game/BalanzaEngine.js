/**
 * BalanzaEngine.js
 *
 * Logic engine for the Balanza balance-scale cartridge. Reuses AlgeBros' generic
 * term primitives (a term is just { id, coeff, variable, groupId }) rather than
 * duplicating them, since Balanza terms are structurally identical - `variable`
 * just as happily holds an emoji string as a letter.
 */
// Explicit .js extension so this module also loads under plain Node (used by
// scripts/test-equation-invariants.mjs); Vite resolves it identically.
import { makeTerm, combineTerms, areLikeTerms, formatTerm } from '../../AlgeBros/game/AlgeBrosEngine.js';

export { makeTerm, combineTerms, areLikeTerms, formatTerm };

/**
 * Parses a single token like "2🍎", "-🍎", "🍎", "-3", "5" into a term object.
 * Unlike AlgeBros' parseTermString, the symbol part is NOT restricted to a-zA-Z,
 * so any emoji/word works as a "variable".
 */
export function parseBalanzaToken(tok) {
  const cleanStr = tok.trim();
  const match = cleanStr.match(/^([+-]?)(\d*)(.*)$/);
  const signStr = match[1];
  const coeffStr = match[2];
  const symbol = match[3] || null;

  const sign = signStr === '-' ? -1 : 1;
  const coeff = coeffStr !== '' ? parseInt(coeffStr, 10) : 1;

  return makeTerm(coeff * sign, symbol);
}

/**
 * Parses a plate expression like "2🍎, 🍌" or "🍎 + 🍎 - 🍌" into an array of terms.
 */
export function parseBalanzaExpression(str) {
  if (!str || !str.trim()) return [];
  const normalized = str
    .replace(/,/g, ' ')
    .replace(/\s*([+-])\s*/g, '$1')
    .trim();
  const runs = normalized.match(/[+-]?[^+\-\s]+/g) || [];
  return runs.map(tok => parseBalanzaToken(tok)).filter(t => t.coeff !== 0 || t.variable !== null);
}

/**
 * Parses the optional weight-override table, one "symbol=weight" per line.
 * Symbols missing from this map default to a weight of 1 (see weightOf).
 */
export function parseWeights(weightsText) {
  const weights = {};
  if (!weightsText) return weights;
  weightsText.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [symbol, valueStr] = trimmed.split('=');
    if (!symbol || valueStr === undefined) return;
    const value = parseFloat(valueStr);
    if (!Number.isNaN(value)) {
      weights[symbol.trim()] = value;
    }
  });
  return weights;
}

/**
 * Parses the menu inventory, one "<count>x<symbolOrNumber>" per line, e.g. "3x🍎".
 */
export function parseMenuInventory(menuText) {
  if (!menuText) return [];
  const tokens = menuText.split(/[\n,]/).map(line => line.trim()).filter(Boolean);
  const itemsMap = new Map();

  tokens.forEach((tok) => {
    let count = 1;
    let rest = tok;

    const matchX = tok.match(/^(\d+)\s*x\s*(.+)$/i);
    if (matchX) {
      count = parseInt(matchX[1], 10);
      rest = matchX[2].trim();
      if (rest === '*') {
        rest = 'x*';
      }
    } else {
      const matchLeadingNum = tok.match(/^(\d+)(.+)$/);
      if (matchLeadingNum) {
        count = parseInt(matchLeadingNum[1], 10);
        rest = matchLeadingNum[2].trim();
      }
    }

    const isNumber = /^\d+$/.test(rest);
    const variable = isNumber ? null : rest;
    const unitCoeff = isNumber ? parseInt(rest, 10) : 1;
    const key = `${variable ?? 'num'}_${unitCoeff}`;

    if (itemsMap.has(key)) {
      itemsMap.get(key).available += count;
    } else {
      itemsMap.set(key, {
        key,
        variable,
        unitCoeff,
        available: count,
      });
    }
  });

  return Array.from(itemsMap.values());
}

/**
 * Scans all three authoring fields and returns the sorted list of distinct
 * symbols in use, so the editor can auto-populate one weight-override row per
 * symbol without the author ever typing a symbol name into a table by hand.
 */
export function collectUsedSymbols(leftPlateText, rightPlateText, menuText) {
  const symbols = new Set();
  [...parseBalanzaExpression(leftPlateText), ...parseBalanzaExpression(rightPlateText)].forEach(t => {
    if (t.variable) symbols.add(t.variable);
  });
  parseMenuInventory(menuText).forEach(item => {
    if (item.variable) symbols.add(item.variable);
  });
  return Array.from(symbols).sort();
}

/**
 * Weight of a single symbol. Plain numbers (variable === null) are their own
 * weight; symbolic tokens default to 5 unless overridden in the weights map.
 */
export function weightOf(variable, weights) {
  if (variable === null || variable === undefined) return 1;
  if (weights) {
    if (weights[variable] !== undefined) return weights[variable];
    const cleaned = typeof variable === 'string' ? variable.replace(/[\*📦\[\]]/g, '').trim() : '';
    if (cleaned && weights[cleaned] !== undefined) return weights[cleaned];
    if (cleaned && weights[`${cleaned}*`] !== undefined) return weights[`${cleaned}*`];
    if (cleaned && weights[`📦${cleaned}`] !== undefined) return weights[`📦${cleaned}`];
    if (cleaned && weights[`${cleaned}📦`] !== undefined) return weights[`${cleaned}📦`];
  }
  const wMatch = typeof variable === 'string' && variable.trim().match(/^w(\d{1,2})$/i);
  if (wMatch) {
    return parseInt(wMatch[1], 10);
  }
  return 5;
}

export function termValue(term, weights) {
  return term.coeff * weightOf(term.variable, weights);
}

export function plateTotal(terms, weights) {
  return terms.reduce((sum, t) => sum + termValue(t, weights), 0);
}

/** Tolerance for every weight comparison. Weights may be fractional (parseFloat),
 *  and 0.1 * 3 !== 0.3 in floating point, so exact === would make some perfectly
 *  balanced scales impossible to balance. */
export const EPS = 1e-9;

export function nearlyEqual(a, b) {
  return Math.abs(a - b) < EPS;
}

/**
 * The scale's whole state as one number. This is the quantity the equivalence
 * invariant is written in terms of: merging, decomposing and transposing must
 * leave it EXACTLY unchanged; only supply-menu moves may change it.
 */
export function plateDelta(leftTerms, rightTerms, weights) {
  return plateTotal(leftTerms, weights) - plateTotal(rightTerms, weights);
}

const MAX_TILT_DEG = 18;
const TILT_SOFTNESS = 4;

/**
 * Bounded, smooth tilt angle: positive means the right plate is heavier (beam
 * dips right). Uses tanh so it's sensitive near balance and saturates instead
 * of clipping hard for large imbalances.
 */
export function computeTiltAngle(leftTotal, rightTotal) {
  return MAX_TILT_DEG * Math.tanh((rightTotal - leftTotal) / TILT_SOFTNESS);
}

/**
 * Builds the live "equation line" text, e.g. "2x + 3 = 11", rendering 'x'
 * directly for crate tokens instead of showing the crate emoji/icon.
 */
export function buildEquationLineText(leftTerms, rightTerms, leftTotal, rightTotal) {
  if (!leftTerms?.length && !rightTerms?.length) {
    return '';
  }

  const formatBalanzaEqVariable = (v) => {
    if (!v) return v;
    // When rendering the x crate in the equation, just display the x
    if (v === '📦x' || v === 'x📦' || v === 'crate_x' || v === '[x]' || v === 'x' || v === 'x*' || v === '*x') {
      return 'x';
    }
    if (v === '📦?' || v === '?📦' || v === 'crate_q' || v === '[?]' || v === '?') {
      return '?';
    }
    if (v === '📦' || v === 'crate' || v === 'box') {
      return 'x';
    }
    // Clean any residual crate emoji, asterisk or prefix
    const cleaned = v.replace(/📦/g, '').replace(/^crate_/g, '').replace(/\*/g, '').trim();
    return cleaned || 'x';
  };

  const sideText = (terms) => {
    if (!terms || terms.length === 0) return '0';
    return terms.map((t, idx) => {
      const isFirst = idx === 0;
      const wMatch = typeof t.variable === 'string' && t.variable.trim().match(/^w(\d{1,2})$/i);
      if (wMatch) {
        const wVal = wMatch[1];
        const absCoeff = Math.abs(t.coeff);
        if (absCoeff === 0) {
          return isFirst ? '0' : ' + 0';
        }
        const sign = isFirst ? (t.coeff < 0 ? '-' : '') : (t.coeff < 0 ? '-' : '+');
        const valStr = absCoeff === 1 ? wVal : `${absCoeff}x${wVal}`;
        return isFirst ? `${sign}${valStr}` : ` ${sign} ${valStr}`;
      }

      const cleanTerm = { ...t, variable: formatBalanzaEqVariable(t.variable) };
      const { sign, value } = formatTerm(cleanTerm, isFirst);
      return isFirst ? `${sign}${value}` : ` ${sign} ${value}`;
    }).join('');
  };

  let comparator = '=';
  if (typeof leftTotal === 'number' && typeof rightTotal === 'number') {
    if (leftTotal > rightTotal + 0.001) {
      comparator = '>';
    } else if (leftTotal < rightTotal - 0.001) {
      comparator = '<';
    } else {
      comparator = '=';
    }
  }

  return `${sideText(leftTerms)}  ${comparator}  ${sideText(rightTerms)}`;
}

/**
 * Checks if a token/variable represents 'x' (or crate x).
 */
export function isExplicitX(variable) {
  if (!variable) return false;
  const v = String(variable).trim().toLowerCase();
  if (['x', 'x*', '*x', '📦x', 'x📦', 'crate_x', '[x]', '📦', 'crate', 'box'].includes(v)) {
    return true;
  }
  const cleaned = v.replace(/📦/g, '').replace(/^crate_/g, '').replace(/\*/g, '').trim();
  return cleaned === 'x';
}

/**
 * Detects the unknown variable in the puzzle. Defaults to 'x', or the first letter variable found.
 */
export function detectUnknownVariable(plates = []) {
  const allTerms = plates.flat().filter(Boolean);
  if (allTerms.some(t => isExplicitX(t.variable))) {
    return 'x';
  }
  const letterTerm = allTerms.find(t => {
    if (!t.variable || typeof t.variable !== 'string') return false;
    const v = t.variable.trim();
    return /^[a-zA-Z]/i.test(v) && !/^w\d{1,2}$/i.test(v);
  });
  if (letterTerm) {
    return letterTerm.variable.trim().toLowerCase();
  }
  return 'x';
}

export function isSingleXTerm(term, targetVar = 'x') {
  if (!term || term.coeff !== 1) return false;
  if (targetVar === 'x') {
    return isExplicitX(term.variable);
  }
  return !!term.variable && String(term.variable).trim().toLowerCase() === targetVar;
}

export function containsTargetVariable(terms, targetVar = 'x') {
  if (!terms || !terms.length) return false;
  return terms.some(t => {
    if (!t || !t.variable) return false;
    if (targetVar === 'x') {
      return isExplicitX(t.variable);
    }
    return String(t.variable).trim().toLowerCase() === targetVar;
  });
}

export function isSingleXPlate(plate, targetVar = 'x') {
  if (!plate || plate.length !== 1) return false;
  return isSingleXTerm(plate[0], targetVar);
}

export function isPlateFullySimplified(plate) {
  if (!plate || plate.length === 0) return false;
  if (plate.some(t => t.coeff === 0)) return false;
  const seenVars = new Set();
  for (const t of plate) {
    const key = (t.variable === null || t.variable === undefined)
      ? '__const__'
      : String(t.variable).trim().toLowerCase();
    if (seenVars.has(key)) {
      return false;
    }
    seenVars.add(key);
  }
  return true;
}

/**
 * Checks win conditions for Balanza:
 * - '=': Equilibrium (default)
 * - 'x': Equilibrium + x by itself on one plate (and not on the other plate)
 * - 'xx': Equilibrium + x by itself on one plate + other plate fully simplified
 */
export function checkBalanzaGoal(goalMode = '=', leftPlate = [], rightPlate = [], leftTotal = 0, rightTotal = 0) {
  const goal = goalMode || '=';

  // Both plates must have at least one element
  if (!leftPlate?.length || !rightPlate?.length) {
    return false;
  }

  // The scale must be in equilibrium
  if (!nearlyEqual(leftTotal, rightTotal)) {
    return false;
  }

  // Goal '=': equilibrium achieved
  if (goal === '=') {
    return true;
  }

  const targetVar = detectUnknownVariable([leftPlate, rightPlate]);

  const leftIsX = isSingleXPlate(leftPlate, targetVar) && !containsTargetVariable(rightPlate, targetVar);
  const rightIsX = isSingleXPlate(rightPlate, targetVar) && !containsTargetVariable(leftPlate, targetVar);

  if (!leftIsX && !rightIsX) {
    return false;
  }

  // Goal 'x': isolated x on one plate, scale in equilibrium
  if (goal === 'x') {
    return true;
  }

  // Goal 'xx': isolated x on one plate, scale in equilibrium,
  // AND all terms on the other plate are simplified
  if (goal === 'xx') {
    const otherPlate = leftIsX ? rightPlate : leftPlate;
    return isPlateFullySimplified(otherPlate);
  }

  return true;
}

