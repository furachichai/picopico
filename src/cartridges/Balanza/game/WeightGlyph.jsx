import React from 'react';
import { CrateWithLetter, parseCrateLetter } from '../../../utils/crateUtils.jsx';
import { SackWithNumber, parseSackNumber } from '../../../utils/sackUtils.jsx';

/**
 * Parses a weight token such as 'w12', 'w5', 'W3', 'w0'
 * Maximum 2 digit numbers: w0 to w99.
 * Returns the numeric string (e.g. "12", "5") or null if not a weight token.
 */
export function parseWeightSymbol(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.trim().match(/^w(\d{1,2})$/i);
  return match ? match[1] : null;
}

/**
 * Graphic component for weight emojis in Balanza using prop_weight_ring.png.
 * Displays the weight graphic with the number centered on its body.
 */
export function WeightRingGlyph({ value, size = 32, isNegative = false, className = '', style = {} }) {
  const isPx = typeof size === 'number';
  const dim = isPx ? `${size}px` : size;
  const rawStr = String(value);
  const isNeg = isNegative || rawStr.startsWith('-') || rawStr.startsWith('−');
  const cleanVal = rawStr.replace(/^[−-]/, '');
  const displayStr = isNeg ? `−${cleanVal}` : cleanVal;

  // Scale font size proportionally: 3+ chars slightly smaller (e.g. -12), 2 chars (e.g. -5, 12), 1 char (e.g. 5)
  const fontSize = isPx
    ? (displayStr.length >= 3 ? Math.round(size * 0.28) : displayStr.length >= 2 ? Math.round(size * 0.35) : Math.round(size * 0.40))
    : (displayStr.length >= 3 ? '0.30em' : displayStr.length >= 2 ? '0.36em' : '0.42em');

  return (
    <span
      className={`balanza-weight-glyph ${isNeg ? 'is-negative' : ''} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        verticalAlign: 'middle',
        userSelect: 'none',
        lineHeight: 1,
        flexShrink: 0,
        ...style
      }}
      title={`Weight ${displayStr}`}
    >
      <img
        src="/assets/objects/prop_weight_ring.png"
        alt={`w${displayStr}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          display: 'block',
          filter: isNeg ? 'brightness(0.50) contrast(1.10)' : 'none',
        }}
        draggable={false}
      />
      <span
        style={{
          position: 'absolute',
          top: '64%', // centered on the weight body
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: isPx ? `${Math.max(fontSize, 7)}px` : fontSize,
          fontWeight: 900,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          color: isNeg ? '#ffffff' : '#0f172a',
          letterSpacing: displayStr.length >= 2 ? '-0.5px' : '0px',
          pointerEvents: 'none',
          textAlign: 'center',
          lineHeight: 1,
          textShadow: isNeg ? '0 1px 2px rgba(0, 0, 0, 0.9)' : '0 0.5px 1px rgba(255, 255, 255, 0.7)'
        }}
      >
        {displayStr}
      </span>
    </span>
  );
}

/**
 * Helper to test if a string contains any weight or crate tokens.
 */
export function hasSpecialBalanzaTokens(text) {
  if (!text || typeof text !== 'string') return false;
  return /\bw\d{1,2}\b/i.test(text) || /\bs\d{1,3}\b/i.test(text) || /\b(?:sack|flour|bag)\d{1,3}\b/i.test(text) || /📦/.test(text) || /x\*/i.test(text) || /\[[a-zA-Z0-9?*!#$_~]{1,3}\]/.test(text);
}

/**
 * Renders a string with w12, w5, crates, sacks, and emojis converted to inline visual glyphs.
 */
export function renderBalanzaRichText(text, size = 20, crateMap = {}) {
  if (!text || typeof text !== 'string') return null;

  // Regex matching: (optional coeff)(optional x/times)(w12 | s5 | sack5 | crate tokens with letters | x*)
  const regex = /(?:(\d+)\s*x?\s*)?(\bw\d{1,2}\b|\bs\d{1,3}\b|\b(?:sack|flour|bag)[_\-]?(?:\(\d{1,3}\)|\d{1,3})\b|\[[a-zA-Z0-9?*!#$_~]{1,3}\]|📦[a-zA-Z0-9?*!#$_~]?|x\*|\*x|(?:crate|box)[_(][a-zA-Z0-9?*!#$_~]{1,3}\)?|📦|crate|box)/gi;
  const parts = [];
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', val: text.slice(lastIdx, match.index) });
    }
    const coeff = match[1] ? match[1] : null;
    const token = match[2];
    const weightVal = parseWeightSymbol(token);
    const sackVal = parseSackNumber(token);
    const crateLetter = parseCrateLetter(token);

    if (weightVal !== null) {
      parts.push({ type: 'weight', coeff, val: weightVal });
    } else if (sackVal !== null) {
      parts.push({ type: 'sack', coeff, val: sackVal });
    } else if (crateLetter !== null) {
      parts.push({ type: 'crate', coeff, letter: crateLetter });
    } else if (crateMap[token]) {
      parts.push({ type: 'legacy_crate', coeff, token, src: crateMap[token] });
    } else {
      parts.push({ type: 'text', val: match[0] });
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push({ type: 'text', val: text.slice(lastIdx) });
  }

  return (
    <>
      {parts.map((part, idx) => {
        if (part.type === 'weight') {
          return (
            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', verticalAlign: 'middle' }}>
              {part.coeff && <span style={{ fontWeight: 700, fontSize: '0.85em' }}>{part.coeff}</span>}
              <WeightRingGlyph value={part.val} size={size} />
            </span>
          );
        }
        if (part.type === 'sack') {
          return (
            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', verticalAlign: 'middle' }}>
              {part.coeff && <span style={{ fontWeight: 700, fontSize: '0.85em' }}>{part.coeff}</span>}
              <SackWithNumber value={part.val} size={size} />
            </span>
          );
        }
        if (part.type === 'crate') {
          return (
            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', verticalAlign: 'middle' }}>
              {part.coeff && <span style={{ fontWeight: 700, fontSize: '0.85em' }}>{part.coeff}</span>}
              <CrateWithLetter letter={part.letter} size={size} />
            </span>
          );
        }
        if (part.type === 'legacy_crate') {
          return (
            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', verticalAlign: 'middle' }}>
              {part.coeff && <span style={{ fontWeight: 700, fontSize: '0.85em' }}>{part.coeff}</span>}
              <img src={part.src} alt={part.token} style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', verticalAlign: 'middle' }} draggable={false} />
            </span>
          );
        }
        return <span key={idx}>{part.val}</span>;
      })}
    </>
  );
}
