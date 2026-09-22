export const SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '−': '⁻', '–': '⁻', '—': '⁻',
    '+': '⁺',
    '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'N': 'ⁿ',
    'x': 'ˣ', 'X': 'ˣ',
    'y': 'ʸ', 'Y': 'ʸ',
    'a': 'ᵃ', 'A': 'ᵃ',
    'b': 'ᵇ', 'B': 'ᵇ',
    'c': 'ᶜ', 'C': 'ᶜ',
    'd': 'ᵈ', 'D': 'ᵈ',
    'e': 'ᵉ', 'E': 'ᵉ',
    'i': 'ⁱ', 'I': 'ⁱ',
    'm': 'ᵐ', 'M': 'ᵐ',
    'p': 'ᵖ', 'P': 'ᵖ',
    'r': 'ʳ', 'R': 'ʳ',
    't': 'ᵗ', 'T': 'ᵗ'
};

export const SUBSCRIPT_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
    'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
    'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
    'v': 'ᵥ', 'x': 'ₓ'
};

export const VULGAR_FRACTIONS = {
    '1/2': '½',
    '1/3': '⅓',
    '2/3': '⅔',
    '1/4': '¼',
    '3/4': '¾',
    '1/5': '⅕',
    '2/5': '⅖',
    '3/5': '⅗',
    '4/5': '⅘',
    '1/6': '⅙',
    '5/6': '⅚',
    '1/7': '⅐',
    '1/8': '⅛',
    '3/8': '⅜',
    '5/8': '⅝',
    '7/8': '⅞',
    '1/9': '⅑',
    '1/10': '⅒'
};

export const toSuperscript = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .split('')
        .map(char => SUPERSCRIPT_MAP[char] || char)
        .join('');
};

export const toSubscript = (str) => {
    if (str === null || str === undefined) return '';
    const chars = String(str).split('');
    if (chars.every(c => SUBSCRIPT_MAP[c])) {
        return chars.map(c => SUBSCRIPT_MAP[c]).join('');
    }
    return '';
};

/**
 * Matches a math shortcut pattern ending at the cursor position in textBefore.
 */
export const matchMathShortcutBeforeCursor = (textBefore) => {
    if (!textBefore || typeof textBefore !== 'string') return null;
    return textBefore.match(/!\.$/)
        || textBefore.match(/(?:[0-9a-zA-Z.]+\s*)?!\/\s*[0-9a-zA-Z.]+$/)
        || textBefore.match(/!\(?([0-9a-zA-Z.]+)\/([0-9a-zA-Z.]+)\)?$/)
        || textBefore.match(/!=+$/)
        || textBefore.match(/(?:[0-9a-zA-Z.]+)?[!^]\(?([+-]?[0-9a-zA-Z.]+)\)?$/)
        || textBefore.match(/[!^]([0-9a-zA-Z+-]+)$/)
        || textBefore.match(/[\*\/]$/);
};

/**
 * Replaces math shortcuts in a string:
 * - '!.' with '·' (multiplication middle dot)
 * - '!=' with '≠'
 * - '1!/2' or '!/2' or '3!/4' with clean unicode fractions (e.g. '1!/2' -> '½')
 * - '*' with '×'
 * - '/' with '÷'
 * - '!(-1)' or '!-1' or '!1' or '^1' with clean unicode superscripts (e.g., '2!-1' -> '2⁻¹')
 */
export const replaceMathShortcuts = (text) => {
    if (!text || typeof text !== 'string') return text;
    let res = text;

    // 0. Multiplication dot: !. -> ·
    res = res.replace(/!\./g, '·');

    // 1. Not equal sign: != -> ≠
    res = res.replace(/!=+/g, '≠');

    // 2. Fractions with !/: e.g. 1!/2 -> ½, 3!/4 -> ¾, !/2 -> ½
    res = res.replace(/(?:([0-9a-zA-Z.]+)\s*)?!\/\s*([0-9a-zA-Z.]+)/g, (_, num, den) => {
        const n = num || '1';
        const key = `${n}/${den}`;
        if (VULGAR_FRACTIONS[key]) {
            return VULGAR_FRACTIONS[key];
        }
        const subDen = toSubscript(den);
        if (subDen) {
            return `${toSuperscript(n)}⁄${subDen}`;
        }
        return `${n}/${den}`;
    });

    // Parenthesized or prefixed fraction: e.g. !(1/2) -> ½, !1/2 -> ½
    res = res.replace(/!\(?([0-9]+)\/([0-9]+)\)?/g, (_, num, den) => {
        const key = `${num}/${den}`;
        if (VULGAR_FRACTIONS[key]) {
            return VULGAR_FRACTIONS[key];
        }
        const subDen = toSubscript(den);
        if (subDen) {
            return `${toSuperscript(num)}⁄${subDen}`;
        }
        return `${num}/${den}`;
    });

    // 3. Multiplication and division operators
    res = res.replace(/\*/g, '×');
    res = res.replace(/\//g, '÷');

    // 4. Superscripts
    res = res.replace(/[!^]\(?([+-]?[0-9a-zA-Z.]+)\)?/g, (_, exp) => toSuperscript(exp));
    res = res.replace(/[!^]([0-9a-zA-Z+-]+)/g, (_, exp) => toSuperscript(exp));

    return res;
};

/**
 * Safely replaces math shortcuts in HTML strings without mutating HTML tags or attributes.
 */
export const replaceMathInHtml = (html) => {
    if (!html || typeof html !== 'string') return html;
    const parts = html.split(/(<[^>]*>)/);
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            parts[i] = replaceMathShortcuts(parts[i]);
        }
    }
    return parts.join('');
};

export const formatExponents = (html) => {
    if (!html || typeof html !== 'string') return html;
    if (!html.includes('!') && !html.includes('^')) return html;
    
    // Split by HTML tags to avoid replacing inside tags (like style="... !important")
    const parts = html.split(/(<[^>]*>)/);
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            let s = parts[i];
            s = s.replace(/!\./g, '·');
            s = s.replace(/!=+/g, '≠');
            s = s.replace(/(?:([0-9a-zA-Z.]+)\s*)?!\/\s*([0-9a-zA-Z.]+)/g, (_, num, den) => {
                const n = num || '1';
                const key = `${n}/${den}`;
                return VULGAR_FRACTIONS[key] || `${n}/${den}`;
            });
            s = s.replace(/!\(?([a-zA-Z0-9\-]+)\)?/g, '<sup>$1</sup>');
            parts[i] = s;
        }
    }
    return parts.join('');
};

/**
 * Colors numbers and math signs within text or HTML in a specified color (default '#000000').
 * Preserves existing HTML tags and attributes.
 * Automatically merges adjacent and whitespace-separated font tags for clean markup.
 */
export const colorNumbersAndMath = (text, color = '#000000') => {
    if (!text || typeof text !== 'string') return text;

    const supers = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿˣʸᵃᵇᶜᵈᵉⁱᵐᵖʳᵗ';
    const fracs = '½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒⁄';
    // Math signs / operators: plus, equals, multiply, divide, relations, exponents, etc.
    const ops = '+=\\u00d7\\u00f7*\\u00b7\\u22c5\\u2260\\u00b1\\u2213<>\\u2264\\u2265\\u2248\\u2261~^%\\u221a\\u221b\\u221c\\u03c0\\u00b0';

    const parts = text.split(/(<[^>]*>)/);

    // Math operator words (English and Spanish, longer phrases first)
    const mathWords = '\\b(?:plus or minus|equal to|divided by|multiplied by|igual a|dividido por|multiplicado por|plus|minus|equals?|equal|times|más|menos|igual(?:es)?)\\b';
    // Numbers (integers, decimals, superscripts, fractions)
    const numbers = `[0-9${supers}${fracs}]+(?:\\.[0-9${supers}]+)?`;
    // Minus / negative sign (not inside hyphenated words like step-by-step)
    const minus = '(?<![a-zA-ZáéíóúñÁÉÍÓÚÑ])[-−–—](?![a-zA-ZáéíóúñÁÉÍÓÚÑ])';
    // Math symbols
    const symbols = `[${ops}]`;
    // Division slash between numbers
    const slash = '(?<=[0-9])\\/(?=[0-9])';
    // Math parentheses / brackets (around numbers, ops, or math words)
    const parens = '(?<=\\s|^|[\\"\\\'‘“])[()\\[\\]{}](?=[0-9+\\-−–—×÷*=])|(?<=[0-9+\\-−–—×÷*=])[()\\[\\]{}](?=\\s|$|[?!,;.\\"\\\'’”])';

    const tokenRegex = new RegExp(
        `(${mathWords}|${numbers}|${minus}|${symbols}|${slash}|${parens})`,
        'gi'
    );

    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            let s = parts[i].replace(tokenRegex, (m) => `<font color="${color}">${m}</font>`);
            // Merge adjacent or whitespace-separated font tags
            s = s.replace(new RegExp(`</font>([ \t]*)<font color="${color}">`, 'gi'), '$1');
            parts[i] = s;
        }
    }

    return parts.join('');
};

/**
 * Prepares and formats quiz question text for rendering inside a comic banner card:
 * 1. Converts markdown bold (**text**) to <b>text</b>
 * 2. Replaces math shortcuts (* to ×, / to ÷, !exp or ^exp to superscripts)
 * 3. Renders numbers and math signs in black (#000000)
 */
export const formatQuizQuestion = (text, mathColor = '#000000') => {
    if (!text || typeof text !== 'string') return text;
    let formatted = text.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    formatted = replaceMathInHtml(formatted);
    formatted = colorNumbersAndMath(formatted, mathColor);
    return formatted;
};

