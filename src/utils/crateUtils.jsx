import React from 'react';

export const CRATE_IMAGE_SRC = '/assets/objects/item_crate_side_1x1_001.png';

/**
 * Extracts the letter/character marked on a crate token.
 * Supports:
 * - Bracket notation: "[x]", "[c]", "[t]", "[A]", "[?]"
 * - Emoji notation: "📦x", "📦c", "📦t", "📦?"
 * - Prefix notation: "crate_x", "crate_c", "crate(c)", "box_c", "box(c)"
 * - Plain crates: "📦", "crate", "box" (returns "")
 * Returns null if not a crate token.
 */
export function parseCrateLetter(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();

  // Match [x], [c], [?], [a1], etc.
  const bracketMatch = s.match(/^\[([a-zA-Z0-9?*!#$_~]{1,3})\]$/);
  if (bracketMatch) return bracketMatch[1];

  // Match 📦x, 📦c, 📦?, 📦A, etc.
  const boxMatch = s.match(/^📦([a-zA-Z0-9?*!#$_~]{1,3})$/);
  if (boxMatch) return boxMatch[1];

  // Match crate_x, crate_c, crate(c), box_c, box(c)
  const prefixMatch = s.match(/^(?:crate|box)[_(]([a-zA-Z0-9?*!#$_~]{1,3})\)?$/i);
  if (prefixMatch) return prefixMatch[1];

  // Plain unlabelled crate
  if (s === '📦' || s.toLowerCase() === 'crate' || s.toLowerCase() === 'box' || s === '[]') {
    return '';
  }

  return null;
}

/**
 * Parses an algebraic term that may contain a crate: e.g. "2[c]", "-[x]", "3📦t", "[c]".
 * Returns { coeff: number, letter: string, raw: string, isCrate: true } or null if not a crate term.
 */
export function parseCrateTerm(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();

  const match = s.match(/^([+-]?)(\d*(?:\.\d+)?)\s*x?\s*(\[[a-zA-Z0-9?*!#$_~]{1,3}\]|📦[a-zA-Z0-9?*!#$_~]?|(?:crate|box)[_(][a-zA-Z0-9?*!#$_~]{1,3}\)?|📦|crate|box|\[\])$/i);
  if (!match) return null;

  const sign = match[1] === '-' ? -1 : 1;
  const coeff = match[2] ? parseFloat(match[2]) * sign : sign;
  const letter = parseCrateLetter(match[3]);

  if (letter === null) return null;

  return {
    isCrate: true,
    coeff,
    letter,
    raw: s
  };
}

/**
 * Checks if a string or token represents a crate.
 */
export function isCrateToken(str) {
  return parseCrateLetter(str) !== null || parseCrateTerm(str) !== null;
}

/**
 * Visual Wooden Crate Component marked with a white variable letter on its wooden planks.
 * Uses /assets/objects/item_crate_side_1x1_001.png
 */
export function CrateWithLetter({
  letter = '',
  size = 32,
  className = '',
  style = {},
  imgStyle = {},
  textStyle = {},
  draggable = false
}) {
  const pixelSize = typeof size === 'number' ? size : 32;
  // Font scale: ~44% of crate size fits neatly within the inner wooden frame
  const calcFontSize = Math.max(10, Math.round(pixelSize * 0.44));

  return (
    <div
      className={`balanza-wooden-crate-wrap ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        verticalAlign: 'middle',
        userSelect: 'none',
        flexShrink: 0,
        ...style
      }}
      title={letter ? `Wooden Crate [${letter}]` : 'Wooden Crate'}
    >
      <img
        src={CRATE_IMAGE_SRC}
        alt={letter ? `Crate [${letter}]` : 'Crate'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28))',
          ...imgStyle
        }}
        draggable={draggable}
      />
      {letter && (
        <span
          className="balanza-crate-white-letter"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ffffff',
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 700,
            fontSize: `${calcFontSize}px`,
            lineHeight: 1,
            textAlign: 'center',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.75)',
            pointerEvents: 'none',
            zIndex: 2,
            ...textStyle
          }}
        >
          {letter}
        </span>
      )}
    </div>
  );
}

/**
 * Renders crate token or standard text.
 */
export function renderCrateOrText(valueStr, size = 26) {
  if (!valueStr) return null;
  const parsed = parseCrateTerm(valueStr);
  if (parsed) {
    const absCoeff = Math.abs(parsed.coeff);
    const isNeg = parsed.coeff < 0;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', verticalAlign: 'middle' }}>
        {isNeg && <span style={{ fontWeight: 900 }}>−</span>}
        {absCoeff > 1 && <span style={{ fontWeight: 900, fontSize: '0.9em' }}>{absCoeff}</span>}
        <CrateWithLetter letter={parsed.letter} size={size} />
      </span>
    );
  }
  return valueStr;
}

export default CrateWithLetter;
