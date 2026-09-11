/**
 * ExploreNLEngine.js
 * 
 * Core mathematical engine for the ExploreNL interactive number line manipulative.
 * Supports:
 * - Exponentiation using '!' (e.g., 2!n = or 2!3 = 8) and fallback '^'
 * - Variable substitution for 'n' (current number line pointer value)
 * - Safe expression evaluation supporting powers, negative exponents, fractions
 * - Unicode superscript exponent formatting (e.g. 2⁻¹ = 1/2 = 0.5, 2⁰ = 1)
 */

const SUPERSCRIPTS = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '+': '⁺', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'N': 'ⁿ'
};

export const toSuperscript = (str) => {
    return String(str)
        .split('')
        .map(char => SUPERSCRIPTS[char] || char)
        .join('');
};

/**
 * Converts a decimal number to a simplified fraction { n, d } using continued fractions.
 */
export const decimalToFraction = (value, maxDenominator = 999) => {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return null;
    if (Number.isInteger(value)) return { n: value, d: 1 };

    const sign = value < 0 ? -1 : 1;
    const absVal = Math.abs(value);

    const tolerance = 1.0e-6;
    let h1 = 1, h2 = 0;
    let k1 = 0, k2 = 1;
    let b = absVal;

    let iterations = 0;
    do {
        iterations++;
        if (iterations > 25) break;

        const a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;

        if (k1 > maxDenominator) break;
        if (Math.abs(b - a) < 1e-12) break;

        b = 1 / (b - a);
    } while (Math.abs(absVal - h1 / k1) > absVal * tolerance);

    if (k1 > 0 && k1 <= maxDenominator && Math.abs(absVal - h1 / k1) < 0.001) {
        return { n: sign * h1, d: k1 };
    }
    return null;
};

/**
 * Evaluates a sanitized JavaScript math expression string.
 */
export const evaluateMath = (expr) => {
    try {
        if (!expr || typeof expr !== 'string') return null;
        let clean = expr
            .replace(/[xX×]/g, '*')
            .replace(/[÷]/g, '/')
            .replace(/[−—–]/g, '-')
            .replace(/\s+/g, '');

        // Convert exponent operators ! and ^ to JS **
        clean = clean.replace(/!/g, '**').replace(/\^/g, '**');

        // Only allow digits, operators, parens, decimal points
        if (!/^[0-9+\-*/().\s*]+$/.test(clean)) {
            return null;
        }

        // Avoid invalid double operations like /0 or syntax errors
        const val = new Function(`return (${clean})`)();
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
            return val;
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Parses an equation template (e.g., "2!n =" or "8 + n =") with the current value of n.
 * Returns formatted expression, computed result, and full equation string.
 * 
 * @param {string} template - The equation template string entered by author
 * @param {number} n - Current pointer value on the number line
 * @returns {Object} { lhsFormatted, fullDisplay, value, fractionStr, hasEquals }
 */
export const processEquation = (template, n) => {
    if (!template || typeof template !== 'string') {
        return {
            lhsFormatted: '',
            fullDisplay: '',
            value: null,
            fractionStr: null,
            hasEquals: false
        };
    }

    const trimmed = template.trim();
    const hasEquals = trimmed.includes('=');
    const [rawLhs] = trimmed.split('=');
    const lhs = rawLhs ? rawLhs.trim() : '';

    if (!lhs) {
        return {
            lhsFormatted: '',
            fullDisplay: hasEquals ? '= ?' : '',
            value: null,
            fractionStr: null,
            hasEquals
        };
    }

    // Replace 'n' or 'N' with parenthesized value for evaluation
    const nValStr = Number.isInteger(n) ? String(n) : String(n);
    const evalExpr = lhs.replace(/\b[nN]\b/g, `(${nValStr})`);
    const evaluatedVal = evaluateMath(evalExpr);

    // Format LHS for display with clean superscripts for ! or ^
    // Pattern: base!exponent or base^exponent, e.g. 2!n -> 2ⁿ or 2⁻¹
    let lhsFormatted = lhs.replace(/\b[nN]\b/g, nValStr);

    // Format power operations for display
    // Handles forms like 2!(-1), 2!-1, 2!n, 10!0, etc.
    lhsFormatted = lhsFormatted.replace(/([0-9a-zA-Z.]+)[!^]\(?([+-]?[0-9.]+)\)?/g, (_, base, exp) => {
        return `${base}${toSuperscript(exp)}`;
    });

    // Also replace standalone ! or ^ remaining with superscript if possible
    lhsFormatted = lhsFormatted.replace(/[!^]([0-9nN+-]+)/g, (_, exp) => toSuperscript(exp));

    // Beautify multiplication and division signs for display with clean single spacing
    lhsFormatted = lhsFormatted
        .replace(/\s*\*\s*/g, ' × ')
        .replace(/\s*\/\s*/g, ' ÷ ')
        .replace(/\s*\+\s*/g, ' + ')
        .replace(/\s*-\s*/g, ' − ');

    if (!hasEquals) {
        return {
            lhsFormatted,
            fullDisplay: lhsFormatted,
            value: evaluatedVal,
            fractionStr: null,
            fracObj: null,
            resultDisplay: '',
            hasEquals: false
        };
    }

    if (evaluatedVal === null) {
        return {
            lhsFormatted,
            fullDisplay: `${lhsFormatted} = ?`,
            value: null,
            fractionStr: null,
            fracObj: null,
            resultDisplay: '?',
            hasEquals: true
        };
    }

    // Format evaluated result
    let resultDisplay = '';
    let fractionStr = null;
    let fracObj = null;

    if (Number.isInteger(evaluatedVal)) {
        resultDisplay = String(evaluatedVal);
    } else {
        // By default, when the result is a fraction with up to 3 digit denominator, show the fraction.
        // Otherwise, a rational number. Do not show both fraction and rational.
        const foundFrac = decimalToFraction(evaluatedVal, 999);
        if (foundFrac && foundFrac.d > 1 && foundFrac.d <= 999) {
            fracObj = foundFrac;
            fractionStr = `${foundFrac.n}/${foundFrac.d}`;
            resultDisplay = fractionStr;
        } else {
            // Rational / decimal number
            const rounded = Math.round(evaluatedVal * 10000) / 10000;
            resultDisplay = String(rounded);
        }
    }

    const fullDisplay = `${lhsFormatted} = ${resultDisplay}`;

    return {
        lhsFormatted,
        fullDisplay,
        value: evaluatedVal,
        fractionStr,
        fracObj,
        resultDisplay,
        hasEquals: true
    };
};

/**
 * Parses an equation template into structural segments for stable, non-jittering rendering:
 * - prefix: fixed symbols/numbers before variable n (e.g. '2' in '2!n =', '8 + ' in '8 + n =')
 * - varType: 'superscript' | 'normal' | 'none'
 * - suffix: fixed symbols/numbers after variable n (e.g. '²' in 'n!2 =', ' × 3' in 'n * 3 =')
 * - hasEquals: boolean
 * - rawLhs: string
 */
export const parseEquationTemplate = (template) => {
    if (!template || typeof template !== 'string') {
        return {
            hasEquals: false,
            prefix: '',
            varType: 'none',
            suffix: '',
            rawLhs: ''
        };
    }

    const trimmed = template.trim();
    const hasEquals = trimmed.includes('=');
    const [rawLhs] = trimmed.split('=');
    const lhs = rawLhs ? rawLhs.trim() : '';

    if (!lhs) {
        return {
            hasEquals,
            prefix: '',
            varType: 'none',
            suffix: '',
            rawLhs: ''
        };
    }

    // Pattern 1: base!n or base^n (e.g. 2!n, 10!n, 3^n, (-2)!n)
    const baseExpMatch = lhs.match(/^\(?([+-]?[0-9a-zA-Z.]+)\)?[!^]\(?([nN])\)?$/);
    if (baseExpMatch) {
        return {
            hasEquals,
            prefix: baseExpMatch[1],
            varType: 'superscript',
            suffix: '',
            rawLhs: lhs
        };
    }

    // Pattern 2: n!exp or n^exp (e.g. n!2, n^3)
    const nBaseMatch = lhs.match(/^\(?([nN])\)?[!^]\(?([+-]?[0-9a-zA-Z.]+)\)?$/);
    if (nBaseMatch) {
        return {
            hasEquals,
            prefix: '',
            varType: 'normal',
            suffix: toSuperscript(nBaseMatch[2]),
            rawLhs: lhs
        };
    }

    // Pattern 3: general expression containing standalone n or N
    const generalMatch = lhs.match(/^(.*?)(\b[nN]\b)(.*)$/);
    if (generalMatch) {
        const prefix = generalMatch[1]
            .replace(/\s*\*\s*/g, ' × ')
            .replace(/\s*\/\s*/g, ' ÷ ')
            .replace(/\s*\+\s*/g, ' + ')
            .replace(/\s*-\s*/g, ' − ');
        const suffix = generalMatch[3]
            .replace(/\s*\*\s*/g, ' × ')
            .replace(/\s*\/\s*/g, ' ÷ ')
            .replace(/\s*\+\s*/g, ' + ')
            .replace(/\s*-\s*/g, ' − ');

        return {
            hasEquals,
            prefix,
            varType: 'normal',
            suffix,
            rawLhs: lhs
        };
    }

    // No variable n found
    const formattedLhs = lhs
        .replace(/\s*\*\s*/g, ' × ')
        .replace(/\s*\/\s*/g, ' ÷ ')
        .replace(/\s*\+\s*/g, ' + ')
        .replace(/\s*-\s*/g, ' − ');

    return {
        hasEquals,
        prefix: formattedLhs,
        varType: 'none',
        suffix: '',
        rawLhs: lhs
    };
};

/**
 * Play subtle snap / tick sound using Web Audio API.
 */
let exploreNLAudioCtx = null;
export const playTickSound = (pitch = 440) => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!exploreNLAudioCtx || exploreNLAudioCtx.state === 'closed') {
            exploreNLAudioCtx = new AudioCtx();
        }
        if (exploreNLAudioCtx.state === 'suspended') {
            exploreNLAudioCtx.resume().catch(() => {});
        }

        const osc = exploreNLAudioCtx.createOscillator();
        const gain = exploreNLAudioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, exploreNLAudioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(pitch * 1.3, exploreNLAudioCtx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.12, exploreNLAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, exploreNLAudioCtx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(exploreNLAudioCtx.destination);

        osc.start();
        osc.stop(exploreNLAudioCtx.currentTime + 0.05);
    } catch {
        // Ignore audio errors
    }
};
