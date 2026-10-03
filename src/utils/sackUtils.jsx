import React from 'react';
import { CrateWithLetter, parseCrateTerm } from './crateUtils.jsx';
import { WeightRingGlyph, parseWeightSymbol } from '../cartridges/Balanza/game/WeightGlyph';

export const SACK_IMAGE_SRC = '/assets/objects/item_sack_flour.png';

/**
 * Parses a string to extract a sack number if it matches sack notation.
 * Supported patterns:
 *  - s5, s12, S5, S12 (direct s-prefix like w-prefix for weights)
 *  - sack5, sack_5, sack-5, sack(5)
 *  - flour5, flour_5, flour(5)
 *  - bag5, bag_5, bag(5)
 *  - [s5], [sack5]
 * Returns numeric string e.g. "5", "12", or null if not a sack.
 */
export function parseSackNumber(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();

  // s5, s12, s0, S5
  const sMatch = s.match(/^s(\d{1,3})$/i);
  if (sMatch) return sMatch[1];

  // sack5, sack_5, sack-5, sack(5)
  const sackMatch = s.match(/^sack[_\-]?(\d{1,3})$/i) || s.match(/^sack\((\d{1,3})\)$/i);
  if (sackMatch) return sackMatch[1];

  // flour5, flour_5, flour(5)
  const flourMatch = s.match(/^flour[_\-]?(\d{1,3})$/i) || s.match(/^flour\((\d{1,3})\)$/i);
  if (flourMatch) return flourMatch[1];

  // bag5, bag_5, bag(5)
  const bagMatch = s.match(/^bag[_\-]?(\d{1,3})$/i) || s.match(/^bag\((\d{1,3})\)$/i);
  if (bagMatch) return bagMatch[1];

  // [s5], [sack5]
  const bracketMatch = s.match(/^\[s(?:ack)?(\d{1,3})\]$/i);
  if (bracketMatch) return bracketMatch[1];

  return null;
}

/**
 * Parses a term that may contain a coefficient and a sack number:
 *  - "s5" -> { coeff: 1, number: 5, rawNumber: "5" }
 *  - "-s5" -> { coeff: -1, number: 5, rawNumber: "5" }
 *  - "2s5" -> { coeff: 2, number: 5, rawNumber: "5" }
 *  - "-3s10" -> { coeff: -3, number: 10, rawNumber: "10" }
 *  - "2xs5" or "2*s5" -> { coeff: 2, number: 5, rawNumber: "5" }
 *  - "2sack5" -> { coeff: 2, number: 5, rawNumber: "5" }
 */
export function parseSackTerm(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();

  // Direct single sack check
  const directNum = parseSackNumber(s);
  if (directNum !== null) {
    return {
      coeff: 1,
      number: parseFloat(directNum),
      rawNumber: directNum
    };
  }

  // Signed single sack: -s5, +s12, -sack5
  let sign = 1;
  let clean = s;
  if (clean.startsWith('-') || clean.startsWith('−')) {
    sign = -1;
    clean = clean.slice(1).trim();
  } else if (clean.startsWith('+')) {
    clean = clean.slice(1).trim();
  }

  const signedDirect = parseSackNumber(clean);
  if (signedDirect !== null) {
    return {
      coeff: sign,
      number: parseFloat(signedDirect),
      rawNumber: signedDirect
    };
  }

  // Count/coefficient check: "2s5", "3sack10", "2xs5", "3*s10"
  const coeffMatch = clean.match(/^(\d+(?:\.\d+)?)\s*[*x]?\s*(.+)$/i);
  if (coeffMatch) {
    const coeffVal = parseFloat(coeffMatch[1]);
    const rest = coeffMatch[2].trim();
    const restNum = parseSackNumber(rest);
    if (restNum !== null) {
      return {
        coeff: sign * coeffVal,
        number: parseFloat(restNum),
        rawNumber: restNum
      };
    }
  }

  return null;
}

/**
 * Checks if a string contains any sack token.
 */
export function isSackToken(str) {
  return parseSackNumber(str) !== null || parseSackTerm(str) !== null;
}

/**
 * Renders a white flour sack graphic with a centered dark number printed on its cloth body.
 */
export function SackWithNumber({
  value,
  size = 32,
  isNegative = false,
  className = '',
  style = {}
}) {
  const isPx = typeof size === 'number';
  const widthDim = isPx ? `${Math.round(size * 0.78)}px` : `calc(${size} * 0.78)`;
  const heightDim = isPx ? `${size}px` : size;

  const rawStr = String(value);
  const isNeg = isNegative || rawStr.startsWith('-') || rawStr.startsWith('−');
  const cleanVal = rawStr.replace(/^[−-]/, '');
  const displayStr = isNeg ? `−${cleanVal}` : cleanVal;

  // Font sizing: single digit fits comfortably, 2 digits scaled slightly, 3+ smaller
  let fontSize;
  if (isPx) {
    if (displayStr.length >= 3) {
      fontSize = Math.max(Math.round(size * 0.22), 7);
    } else if (displayStr.length >= 2) {
      fontSize = Math.max(Math.round(size * 0.28), 8);
    } else {
      fontSize = Math.max(Math.round(size * 0.35), 9);
    }
  } else {
    fontSize = displayStr.length >= 3 ? '0.24em' : (displayStr.length >= 2 ? '0.30em' : '0.36em');
  }

  return (
    <span
      className={`balanza-sack-glyph ${isNeg ? 'is-negative' : ''} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: widthDim,
        height: heightDim,
        verticalAlign: 'middle',
        userSelect: 'none',
        lineHeight: 1,
        flexShrink: 0,
        ...style
      }}
      title={`Flour sack ${displayStr}`}
    >
      <img
        src={SACK_IMAGE_SRC}
        alt={`s${displayStr}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          display: 'block',
          filter: isNeg ? 'brightness(0.75) contrast(1.15)' : 'none'
        }}
        draggable={false}
      />
      <span
        style={{
          position: 'absolute',
          top: '63%', // Centered on the plump lower body of the flour sack
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: isPx ? `${fontSize}px` : fontSize,
          fontWeight: 900,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          color: isNeg ? '#000000' : '#1e293b',
          letterSpacing: displayStr.length >= 2 ? '-0.5px' : '0px',
          pointerEvents: 'none',
          textAlign: 'center',
          lineHeight: 1,
          textShadow: '0 1px 0 rgba(255, 255, 255, 0.85), 0 0 2px rgba(255, 255, 255, 0.5)'
        }}
      >
        {displayStr}
      </span>
    </span>
  );
}

/**
 * Universal scale object renderer:
 * Formats a valueStr (which may be a crate "[x]", sack "s5", weight ring "w10", or normal text)
 * into its visual component representation.
 */
export function renderScaleTokenOrText(valueStr, size = 26) {
  if (!valueStr) return null;
  const str = String(valueStr).trim();

  // Check Crate
  const crateTerm = parseCrateTerm(str);
  if (crateTerm) {
    const absCoeff = Math.abs(crateTerm.coeff);
    const isNeg = crateTerm.coeff < 0;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', verticalAlign: 'middle' }}>
        {isNeg && <span style={{ fontWeight: 900 }}>−</span>}
        {absCoeff > 1 && <span style={{ fontWeight: 900, fontSize: '0.9em' }}>{absCoeff}</span>}
        <CrateWithLetter letter={crateTerm.letter} size={size} />
      </span>
    );
  }

  // Check Flour Sack
  const sackTerm = parseSackTerm(str);
  if (sackTerm) {
    const absCoeff = Math.abs(sackTerm.coeff);
    const isNeg = sackTerm.coeff < 0;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', verticalAlign: 'middle' }}>
        {isNeg && <span style={{ fontWeight: 900 }}>−</span>}
        {absCoeff > 1 && <span style={{ fontWeight: 900, fontSize: '0.9em' }}>{absCoeff}</span>}
        <SackWithNumber value={sackTerm.number} size={size} isNegative={isNeg} />
      </span>
    );
  }

  // Check Weight Ring
  const weightVal = parseWeightSymbol(str);
  if (weightVal !== null) {
    return <WeightRingGlyph value={weightVal} size={size} />;
  }

  return valueStr;
}

export default SackWithNumber;
