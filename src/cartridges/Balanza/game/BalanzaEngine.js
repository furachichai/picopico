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
  const items = [];

  tokens.forEach((tok, idx) => {
    let count = 1;
    let rest = tok;

    const matchX = tok.match(/^(\d+)\s*x\s*(.+)$/i);
    if (matchX) {
      count = parseInt(matchX[1], 10);
      rest = matchX[2].trim();
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

    for (let i = 0; i < count; i++) {
      items.push({
        key: `menu-${idx}-${i}`,
        variable,
        unitCoeff,
        available: 1,
      });
    }
  });

  return items;
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
  return weights[variable] ?? 5;
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
 * Builds the live "equation line" text, e.g. "🍎 + 🍎 = 🍌", reusing AlgeBros'
 * formatTerm for consistent sign/value formatting.
 */
export function buildEquationLineText(leftTerms, rightTerms) {
  const sideText = (terms) => {
    if (terms.length === 0) return '0';
    return terms.map((t, idx) => {
      const { sign, value } = formatTerm(t, idx === 0);
      return idx === 0 ? `${sign}${value}` : ` ${sign} ${value}`;
    }).join('');
  };
  return `${sideText(leftTerms)}  =  ${sideText(rightTerms)}`;
}
