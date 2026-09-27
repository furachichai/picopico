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
 * Helper to parse a parenthesized expression starting with '(' at startIndex,
 * properly tracking nested parentheses so expressions like 3(2x + 4) or ((a+b)(c+d))
 * are preserved completely without premature truncation.
 */
export const parseParenthesized = (str, startIndex) => {
    if (!str || str[startIndex] !== '(') return null;
    let depth = 0;
    let content = '';
    for (let i = startIndex; i < str.length; i++) {
        if (str[i] === '(') {
            depth++;
            if (depth > 1) content += str[i];
        } else if (str[i] === ')') {
            depth--;
            if (depth === 0) {
                return { content, endIndex: i + 1 };
            } else {
                content += str[i];
            }
        } else {
            content += str[i];
        }
    }
    return null;
};

/**
 * Helper to parse a braced expression starting with '{' at startIndex.
 */
export const parseBraced = (str, startIndex) => {
    if (!str || str[startIndex] !== '{') return null;
    let depth = 0;
    let content = '';
    for (let i = startIndex; i < str.length; i++) {
        if (str[i] === '{') {
            depth++;
            if (depth > 1) content += str[i];
        } else if (str[i] === '}') {
            depth--;
            if (depth === 0) {
                return { content, endIndex: i + 1 };
            } else {
                content += str[i];
            }
        } else {
            content += str[i];
        }
    }
    return null;
};

/**
 * Parses denominator after the slash '/'. Supports:
 * - Parenthesized denominator: /(3) or /(2(x + 1))
 * - Braced denominator: /{3}
 * - Bare denominator: /3 or /3(x + 1)
 */
export const parseDenominator = (str, startIndex) => {
    let i = startIndex;
    while (i < str.length && /\s/.test(str[i])) i++;
    if (i >= str.length) return null;

    if (str[i] === '(') {
        return parseParenthesized(str, i);
    }
    if (str[i] === '{') {
        return parseBraced(str, i);
    }

    let content = '';
    let depth = 0;
    while (i < str.length) {
        const ch = str[i];
        if (ch === '(') depth++;
        else if (ch === ')') {
            if (depth > 0) depth--;
            else break;
        } else if (depth === 0 && (/[\s=;,]/.test(ch) || ch === '<')) {
            break;
        }
        content += ch;
        i++;
    }
    if (!content) return null;
    return { content, endIndex: i };
};

/**
 * Formats math symbols (dots, times, superscripts) inside fraction terms.
 */
const formatInnerMath = (text) => {
    if (!text || typeof text !== 'string') return text;
    let s = text;
    s = s.replace(/!\./g, '·');
    s = s.replace(/!=+/g, '≠');
    s = s.replace(/\*/g, '×');
    s = s.replace(/[!^]\(?([+-]?[0-9a-zA-Z.]+)\)?/g, '<sup>$1</sup>');
    return s;
};

/**
 * Renders HTML for a stacked math fraction with vinculum aligned with the equal sign.
 */
export const renderFractionHtml = (num, den) => {
    const formattedNum = formatInnerMath(num);
    const formattedDen = formatInnerMath(den);
    return `<span class="pico-fraction"><span class="pico-fraction-num">${formattedNum}</span><span class="pico-fraction-den">${formattedDen}</span></span>`;
};

/**
 * Matches a complex fraction starting at index i.
 * Supports:
 * - !frac(num, den) or \frac(num, den) with balanced inner parens
 * - !frac{num}{den} or \frac{num}{den} with balanced inner braces
 * - !(num)/(den), !(num)/den, !(num)!/den with balanced inner parens
 * - (num)!/(den), (num)!/den with balanced inner parens
 */
export const matchComplexFractionAt = (text, i) => {
    if (!text || i >= text.length) return null;

    // 1. !frac(num, den) or \frac(num, den)
    const isFracParen = text.startsWith('!frac(', i) || text.startsWith('\\frac(', i);
    if (isFracParen) {
        const paren = parseParenthesized(text, i + 5);
        if (paren) {
            let commaIndex = -1;
            let depth = 0;
            for (let j = 0; j < paren.content.length; j++) {
                if (paren.content[j] === '(') depth++;
                else if (paren.content[j] === ')') depth--;
                else if (paren.content[j] === ',' && depth === 0) {
                    commaIndex = j;
                    break;
                }
            }
            if (commaIndex !== -1) {
                return {
                    num: paren.content.substring(0, commaIndex).trim(),
                    den: paren.content.substring(commaIndex + 1).trim(),
                    raw: text.substring(i, paren.endIndex),
                    startIndex: i,
                    endIndex: paren.endIndex
                };
            }
        }
    }

    // 2. !frac{num}{den} or \frac{num}{den}
    const isFracBraced = text.startsWith('!frac{', i) || text.startsWith('\\frac{', i);
    if (isFracBraced) {
        const numBraced = parseBraced(text, i + 5);
        if (numBraced) {
            let after = numBraced.endIndex;
            while (after < text.length && /\s/.test(text[after])) after++;
            if (text[after] === '{') {
                const denBraced = parseBraced(text, after);
                if (denBraced) {
                    return {
                        num: numBraced.content.trim(),
                        den: denBraced.content.trim(),
                        raw: text.substring(i, denBraced.endIndex),
                        startIndex: i,
                        endIndex: denBraced.endIndex
                    };
                }
            }
        }
    }

    // 3. !(num)/(den) or !(num)/den or !(num)!/den
    if (text.startsWith('!(', i)) {
        const numParen = parseParenthesized(text, i + 1);
        if (numParen) {
            let after = numParen.endIndex;
            while (after < text.length && /\s/.test(text[after])) after++;
            let hasSlash = false;
            if (text.startsWith('!/', after)) {
                hasSlash = true;
                after += 2;
            } else if (text[after] === '/') {
                hasSlash = true;
                after += 1;
            }
            if (hasSlash) {
                while (after < text.length && /\s/.test(text[after])) after++;
                const den = parseDenominator(text, after);
                if (den) {
                    return {
                        num: numParen.content.trim(),
                        den: den.content.trim(),
                        raw: text.substring(i, den.endIndex),
                        startIndex: i,
                        endIndex: den.endIndex
                    };
                }
            }
        }
    }

    // 4. (num)!/(den) or (num)!/den
    if (text[i] === '(') {
        const numParen = parseParenthesized(text, i);
        if (numParen) {
            let after = numParen.endIndex;
            while (after < text.length && /\s/.test(text[after])) after++;
            if (text.startsWith('!/', after)) {
                after += 2;
                while (after < text.length && /\s/.test(text[after])) after++;
                const den = parseDenominator(text, after);
                if (den) {
                    return {
                        num: numParen.content.trim(),
                        den: den.content.trim(),
                        raw: text.substring(i, den.endIndex),
                        startIndex: i,
                        endIndex: den.endIndex
                    };
                }
            }
        }
    }

    return null;
};

/**
 * Scans textBefore backwards to find a fraction shortcut ending right at the cursor.
 */
export const matchComplexFractionBeforeCursor = (textBefore) => {
    if (!textBefore || typeof textBefore !== 'string') return null;
    const candidates = [];
    const prefixes = ['!frac', '\\frac', '!(', '('];
    for (const p of prefixes) {
        let pos = 0;
        while ((pos = textBefore.indexOf(p, pos)) !== -1) {
            candidates.push(pos);
            pos += p.length;
        }
    }

    candidates.sort((a, b) => b - a);
    const seen = new Set();

    for (const c of candidates) {
        if (seen.has(c)) continue;
        seen.add(c);
        const match = matchComplexFractionAt(textBefore, c);
        if (match && match.endIndex === textBefore.length) {
            return match;
        }
    }
    return null;
};

/**
 * Replaces all complex fraction shortcuts in a string with stacked fraction HTML.
 */
export const replaceComplexFractions = (text) => {
    if (!text || typeof text !== 'string') return text;
    let result = '';
    let i = 0;

    while (i < text.length) {
        const match = matchComplexFractionAt(text, i);
        if (match) {
            result += renderFractionHtml(match.num, match.den);
            i = match.endIndex;
            continue;
        }
        result += text[i];
        i++;
    }

    return result;
};

/**
 * Matches a math shortcut pattern ending at the cursor position in textBefore.
 */
export const matchMathShortcutBeforeCursor = (textBefore) => {
    if (!textBefore || typeof textBefore !== 'string') return null;
    const complexMatch = matchComplexFractionBeforeCursor(textBefore);
    if (complexMatch) {
        const res = [complexMatch.raw];
        res.index = complexMatch.startIndex;
        res.input = textBefore;
        return res;
    }
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
 * - '!(numerator)/denominator' or '!frac(num, den)' with stacked fractions
 * - '1!/2' or '!/2' or '3!/4' with clean unicode fractions (e.g. '1!/2' -> '½')
 * - '*' with '×'
 * - '/' with '÷'
 * - '!(-1)' or '!-1' or '!1' or '^1' with clean unicode superscripts (e.g., '2!-1' -> '2⁻¹')
 */
export const replaceMathShortcuts = (text) => {
    if (!text || typeof text !== 'string') return text;
    let res = text;

    // 0. Complex fractions first (handles !(3(2x+4))/3, !frac(3(2x+4), 3), etc.)
    res = replaceComplexFractions(res);

    // 1. Multiplication dot: !. -> ·
    res = res.replace(/!\./g, '·');

    // 2. Not equal sign: != -> ≠
    res = res.replace(/!=+/g, '≠');

    // 3. Vulgar fractions with !/: e.g. 1!/2 -> ½, 3!/4 -> ¾, !/2 -> ½
    res = res.replace(/(?:([0-9a-zA-Z.]+)\s*)?!\/\s*([0-9a-zA-Z.]+)/g, (_, num, den) => {
        const n = num || '1';
        const key = `${n}/${den}`;
        if (VULGAR_FRACTIONS[key]) {
            return VULGAR_FRACTIONS[key];
        }
        return renderFractionHtml(n, den);
    });

    // Parenthesized or prefixed fraction: e.g. !(1/2) -> ½, !1/2 -> ½
    res = res.replace(/!\(?([0-9]+)\/([0-9]+)\)?/g, (_, num, den) => {
        const key = `${num}/${den}`;
        if (VULGAR_FRACTIONS[key]) {
            return VULGAR_FRACTIONS[key];
        }
        return renderFractionHtml(num, den);
    });

    // 4. Multiplication, division operators, and superscripts (protecting HTML tags from slash corruption)
    const parts = res.split(/(<[^>]*>)/);
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            let part = parts[i];
            part = part.replace(/\*/g, '×');
            part = part.replace(/\//g, '÷');
            part = part.replace(/[!^]\(?([+-]?[0-9a-zA-Z.]+)\)?/g, (_, exp) => toSuperscript(exp));
            part = part.replace(/[!^]([0-9a-zA-Z+-]+)/g, (_, exp) => toSuperscript(exp));
            parts[i] = part;
        }
    }
    res = parts.join('');

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
    if (!html.includes('!') && !html.includes('^') && !html.includes('\\frac')) return html;
    
    // Split by HTML tags to avoid replacing inside tags (like style="... !important")
    const parts = html.split(/(<[^>]*>)/);
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            let s = parts[i];
            s = replaceComplexFractions(s);
            s = s.replace(/!\./g, '·');
            s = s.replace(/!=+/g, '≠');
            s = s.replace(/(?:([0-9a-zA-Z.]+)\s*)?!\/\s*([0-9a-zA-Z.]+)/g, (_, num, den) => {
                const n = num || '1';
                const key = `${n}/${den}`;
                return VULGAR_FRACTIONS[key] || renderFractionHtml(n, den);
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

