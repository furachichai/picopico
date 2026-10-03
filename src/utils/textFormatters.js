export const SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '−': '⁻', '–': '⁻', '—': '⁻',
    '+': '⁺', '=': '⁼',
    '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'N': 'ⁿ',
    'x': 'ˣ', 'X': 'ˣ',
    'y': 'ʸ', 'Y': 'ʸ',
    'a': 'ᵃ', 'A': 'ᵃ',
    'b': 'ᵇ', 'B': 'ᵇ',
    'c': 'ᶜ', 'C': 'ᶜ',
    'd': 'ᵈ', 'D': 'ᵈ',
    'e': 'ᵉ', 'E': 'ᵉ',
    'f': 'ᶠ', 'F': 'ᶠ',
    'g': 'ᵍ', 'G': 'ᵍ',
    'h': 'ʰ', 'H': 'ʰ',
    'i': 'ⁱ', 'I': 'ⁱ',
    'j': 'ʲ', 'J': 'ʲ',
    'k': 'ᵏ', 'K': 'ᵏ',
    'l': 'ˡ', 'L': 'ˡ',
    'm': 'ᵐ', 'M': 'ᵐ',
    'o': 'ᵒ', 'O': 'ᵒ',
    'p': 'ᵖ', 'P': 'ᵖ',
    'r': 'ʳ', 'R': 'ʳ',
    's': 'ˢ', 'S': 'ˢ',
    't': 'ᵗ', 'T': 'ᵗ',
    'u': 'ᵘ', 'U': 'ᵘ',
    'v': 'ᵛ', 'V': 'ᵛ',
    'w': 'ʷ', 'W': 'ʷ',
    'z': 'ᶻ', 'Z': 'ᶻ'
};

export const SUBSCRIPT_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '−': '₋', '–': '₋', '—': '₋', '=': '₌', '(': '₍', ')': '₎',
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
    const signs = '\\-+−–—';
    s = s.replace(new RegExp('[!^]([' + signs + '])\\s*\\(\\s*([^()]+)\\s*\\)', 'g'), (_, sign, inner) => {
        const isNeg = /[-−–—]/.test(sign);
        const sTag = isNeg ? '<span class="pico-super-minus">−</span>' : sign;
        return `<sup>${sTag}${inner.replace(/\s+/g, '')}</sup>`;
    });
    s = s.replace(/[!^]\(\s*([^()]+)\s*\)/g, (_, inner) => {
        const clean = inner.replace(/\s+/g, '');
        const formatted = clean.replace(/^([-−–—])/, '<span class="pico-super-minus">−</span>');
        return `<sup>${formatted}</sup>`;
    });
    s = s.replace(new RegExp('[!^]([' + signs + ']?[0-9a-zA-Z.]+)', 'g'), (_, exp) => {
        const clean = exp.replace(/\s+/g, '');
        const formatted = clean.replace(/^([-−–—])/, '<span class="pico-super-minus">−</span>');
        return `<sup>${formatted}</sup>`;
    });
    s = s.replace(new RegExp('[!^]([0-9a-zA-Z' + signs + ']+)', 'g'), (_, exp) => {
        const clean = exp.replace(/\s+/g, '');
        const formatted = clean.replace(/^([-−–—])/, '<span class="pico-super-minus">−</span>');
        return `<sup>${formatted}</sup>`;
    });
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
    const signs = '\\-+−–—';
    return textBefore.match(/!\.$/)
        || textBefore.match(/(?:[0-9a-zA-Z.]+\s*)?!\/\s*[0-9a-zA-Z.]+$/)
        || textBefore.match(/!\(?([0-9a-zA-Z.]+)\/([0-9a-zA-Z.]+)\)?$/)
        || textBefore.match(/!=+$/)
        || textBefore.match(new RegExp('(?:[0-9a-zA-Z.]+\\s*)?[!^](?:[' + signs + ']\\s*\\(\\s*[' + signs + ']?[0-9a-zA-Z.\\s' + signs + ']+\\s*\\)|\\(\\s*[' + signs + ']?[0-9a-zA-Z.\\s' + signs + ']+\\s*\\)|[' + signs + ']?[0-9a-zA-Z.]+)$'))
        || textBefore.match(new RegExp('[!^]([0-9a-zA-Z' + signs + ']+)$'))
        || textBefore.match(/[*\/]$/);
};

/**
 * Replaces math shortcuts in a string:
 * - '!.' with '·' (multiplication middle dot)
 * - '!=' with '≠'
 * - '!(numerator)/denominator' or '!frac(num, den)' with stacked fractions
 * - '1!/2' or '!/2' or '3!/4' with clean unicode fractions (e.g. '1!/2' -> '½')
 * - '*' with '×'
 * - '/' with '÷'
 * - '2!(−4)' or '2!(-4)' or '2!-(4)' or '2!-4' or '!(-1)' or '^1' with clean unicode superscripts (e.g., '2!(−4)' -> '2⁻⁴', '2!-1' -> '2⁻¹')
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
    const signs = '\\-+−–—';
    const cleanExp = (str) => toSuperscript(str ? str.replace(/\s+/g, '') : '');

    const parts = res.split(/(<[^>]*>)/);
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            let part = parts[i];
            part = part.replace(/\*/g, '×');
            part = part.replace(/\//g, '÷');

            // Exponent replacements (negative and positive exponents):
            // e.g. 2!(−4) -> 2⁻⁴, 2!(-4) -> 2⁻⁴, 2!-(4) -> 2⁻⁴, 2!-4 -> 2⁻⁴, 2!3 -> 2³
            // 4a. Sign outside parens: !-(4), !−(4), ^-(4), ^−(4)
            part = part.replace(new RegExp('[!^]([' + signs + '])\\s*\\(\\s*([^()]+)\\s*\\)', 'g'), (_, sign, inner) => {
                return cleanExp(sign + inner);
            });
            // 4b. Parenthesized exponent: !(−4), !(-4), !(4), !(n-1), ^(-4), ^(n-1)
            part = part.replace(/[!^]\(\s*([^()]+)\s*\)/g, (_, inner) => {
                return cleanExp(inner);
            });
            // 4c. Unparenthesized exponent: !-4, !−4, !4, ^-4, ^−4, ^4
            part = part.replace(new RegExp('[!^]([' + signs + ']?[0-9a-zA-Z.]+)', 'g'), (_, exp) => {
                return cleanExp(exp);
            });
            // 4d. Fallback for any remaining: !n-1, !n+1
            part = part.replace(new RegExp('[!^]([0-9a-zA-Z' + signs + ']+)', 'g'), (_, exp) => {
                return cleanExp(exp);
            });

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
    if (!html.includes('!') && !html.includes('^') && !html.includes('\\frac') && !html.includes('⁻') && !html.includes('<sup>')) return html;
    
    // Unwrap any existing pico-super-minus spans first for complete idempotency
    let cleaned = html.replace(/<span class="pico-super-minus">([^<]+)<\/span>/g, '$1');

    const signs = '\\-+−–—';
    // Split by HTML tags to avoid replacing inside tags (like style="... !important")
    const parts = cleaned.split(/(<[^>]*>)/);
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
            // 0. Format unicode superscript minus (non-nesting)
            s = s.replace(/(?:<span class="pico-super-minus">)?⁻(?:<\/span>)?/g, '<span class="pico-super-minus">⁻</span>');
            // 1. Sign outside parens: !-(4), !−(4), ^-(4), ^−(4)
            s = s.replace(new RegExp('[!^]([' + signs + '])\\s*\\(\\s*([^()]+)\\s*\\)', 'g'), (_, sign, inner) => {
                const isNeg = /[-−–—]/.test(sign);
                const sTag = isNeg ? '<span class="pico-super-minus">−</span>' : sign;
                return `<sup>${sTag}${inner.replace(/\s+/g, '')}</sup>`;
            });
            // 2. Parenthesized: !(−4), !(-4), !(4), !(n-1), ^(-4), ^(n-1)
            s = s.replace(/[!^]\(\s*([^()]+)\s*\)/g, (_, inner) => {
                const clean = inner.replace(/\s+/g, '');
                const formattedInner = clean.replace(/^([-−–—])/, '<span class="pico-super-minus">−</span>');
                return `<sup>${formattedInner}</sup>`;
            });
            // 3. Unparenthesized: !-4, !−4, !4, ^-4, ^−4, ^4
            s = s.replace(new RegExp('[!^]([' + signs + ']?[0-9a-zA-Z.]+)', 'g'), (_, exp) => {
                const clean = exp.replace(/\s+/g, '');
                const formattedExp = clean.replace(/^([-−–—])/, '<span class="pico-super-minus">−</span>');
                return `<sup>${formattedExp}</sup>`;
            });
            // 4. Fallback: !([a-zA-Z0-9-+−–—]+)
            s = s.replace(new RegExp('[!^]([0-9a-zA-Z' + signs + ']+)', 'g'), (_, exp) => {
                const clean = exp.replace(/\s+/g, '');
                const formattedExp = clean.replace(/^([-−–—])/, '<span class="pico-super-minus">−</span>');
                return `<sup>${formattedExp}</sup>`;
            });
            parts[i] = s;
        }
    }
    let res = parts.join('');
    // Format leading minus inside any existing <sup> tags (e.g. <sup>-4</sup> or <sup>−2</sup>)
    res = res.replace(/<sup>\s*([-−–—])\s*([^<]+)<\/sup>/g, '<sup><span class="pico-super-minus">−</span>$2</sup>');
    return res;
};

/**
 * Colors numbers and math signs within text or HTML in a specified color (default '#000000').
 * Preserves existing HTML tags and attributes.
 * Automatically merges adjacent and whitespace-separated font tags for clean markup.
 */
export const colorNumbersAndMath = (text, color = '#000000') => {
    if (!text || typeof text !== 'string') return text;

    const supers = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣʸᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷᶻ';
    const fracs = '½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒⁄';
    // Math signs / operators: plus, equals, multiply, divide, relations, exponents, etc.
    const ops = '+=\\u00d7\\u00f7*\\u00b7\\u22c5\\u2260\\u00b1\\u2213\\u2212\\u2013\\u2014<>\\u2264\\u2265\\u2248\\u2261~^%\\u221a\\u221b\\u221c\\u03c0\\u00b0';

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
    formatted = formatExponents(formatted);
    return formatted;
};

/**
 * Formats inline explanation text for reading clarity (non-flashy educational palette):
 * - Custom semantic colors: <blue>, <green>, <purple>, <amber>, <red>, <mark>, <muted>
 * - Markdown bold: **text** or __text__
 * - Markdown italics: *text* or _text_
 * - Inline code / math chips: `text`
 * - Math shortcuts: fractions, exponents, multiplication dots, not-equal
 */
export const formatExplanationHtml = (text) => {
    if (!text || typeof text !== 'string') return '';
    let s = text;

    const colorMap = {
        blue: 'exp-color-blue',
        green: 'exp-color-green',
        purple: 'exp-color-purple',
        violet: 'exp-color-purple',
        amber: 'exp-color-amber',
        orange: 'exp-color-amber',
        red: 'exp-color-red',
        rose: 'exp-color-red',
        muted: 'exp-color-muted'
    };

    // 1. Semantic color and highlight BBCode/HTML tags
    s = s.replace(/\[(blue|green|purple|violet|amber|orange|red|rose|muted)\](.*?)\[\/\1\]/gi, (_, c, inner) => {
        return `<span class="${colorMap[c.toLowerCase()]}">${inner}</span>`;
    });
    s = s.replace(/<(blue|green|purple|violet|amber|orange|red|rose|muted)>(.*?)<\/\1>/gi, (_, c, inner) => {
        return `<span class="${colorMap[c.toLowerCase()]}">${inner}</span>`;
    });
    s = s.replace(/\[(?:highlight|mark)\](.*?)\[\/(?:highlight|mark)\]/gi, '<mark class="exp-mark">$1</mark>');
    s = s.replace(/<(?:highlight|mark)>(.*?)<\/(?:highlight|mark)>/gi, '<mark class="exp-mark">$1</mark>');

    // 2. Inline code / math chip: `x = 2` -> <code class="exp-code">x = 2</code>
    s = s.replace(/`([^`]+)`/g, '<code class="exp-code">$1</code>');

    // 3. Markdown Bold: **bold** or __bold__
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(?<=^|[\s([{"'¿¡])__([^_]+)__(?=[\s)\]}"'.,?!:;]|$)/g, '<strong>$1</strong>');

    // 4. Markdown Italics: *italic* or _italic_ (excludes math expressions like 2 * 3)
    s = s.replace(/(?<=^|[\s([{"'¿¡])\*([^*\s](?:[^*]*?[^*\s])?)\*(?=[\s)\]}"'.,?!:;]|$)/g, '<em>$1</em>');
    s = s.replace(/(?<=^|[\s([{"'¿¡])_([^\s_](?:[^_]*?[^\s_])?)_(?=[\s)\]}"'.,?!:;]|$)/g, '<em>$1</em>');

    // 5. Exponent and math shortcut formatting
    const signs = '\\-+−–—';
    s = s.replace(new RegExp('([0-9a-zA-Z)])\\^\\(([' + signs + '0-9a-zA-Z\\s]+)\\)', 'g'), '$1<sup>$2</sup>');
    s = s.replace(new RegExp('([0-9a-zA-Z)])\\^([' + signs + '0-9a-zA-Z]+)', 'g'), '$1<sup>$2</sup>');
    s = formatExponents(s);

    // 6. Dot multiplication and not-equal
    s = s.replace(/!\./g, '·');
    s = s.replace(/!=+/g, '≠');

    return s;
};

/**
 * Parses raw explanation text into structured blocks:
 * - Steps: "Step 1: ...", "Paso 1: ..."
 * - Results: "Result: ...", "Resultado: ...", "Conclusion: ..."
 * - Rules: "Rule: ...", "Regla: ..."
 * - Notes: "Note: ...", "Nota: ...", "Reminder: ..."
 * - Definition / Acronym list items: "P: Parentheses", "E: Exponents"
 * - Sub-lines: Equations or indented continuation lines attached to the active card
 * - Paragraphs: Standard text paragraphs
 */
export const parseExplanationBlocks = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return [];
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const blocks = [];
    let currentBlock = null;

    const stepRegex = /^(Paso \d+|Step \d+):?\s*(.*)$/i;
    const resultRegex = /^(Resultado|Result|Conclusi[oó]n|Conclusion):?\s*(.*)$/i;
    const ruleRegex = /^(Regla|Rule|Principio|Principle):?\s*(.*)$/i;
    const noteRegex = /^(Nota|Note|Recordatorio|Reminder|Tip|Consejo|Dato clave|Key point):?\s*(.*)$/i;
    const defItemRegex = /^([A-Z0-9]):\s+(.+)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const stepMatch = line.match(stepRegex);
        if (stepMatch) {
            currentBlock = { type: 'step', label: stepMatch[1], text: stepMatch[2], subLines: [] };
            blocks.push(currentBlock);
            continue;
        }

        const resultMatch = line.match(resultRegex);
        if (resultMatch) {
            currentBlock = { type: 'result', label: resultMatch[1], text: resultMatch[2], subLines: [] };
            blocks.push(currentBlock);
            continue;
        }

        const ruleMatch = line.match(ruleRegex);
        if (ruleMatch) {
            currentBlock = { type: 'rule', label: ruleMatch[1], text: ruleMatch[2], subLines: [] };
            blocks.push(currentBlock);
            continue;
        }

        const noteMatch = line.match(noteRegex);
        if (noteMatch) {
            currentBlock = { type: 'note', label: noteMatch[1], text: noteMatch[2], subLines: [] };
            blocks.push(currentBlock);
            continue;
        }

        const defMatch = line.match(defItemRegex);
        if (defMatch) {
            if (currentBlock && currentBlock.type === 'def-list') {
                currentBlock.items.push({ key: defMatch[1], value: defMatch[2] });
            } else {
                currentBlock = { type: 'def-list', items: [{ key: defMatch[1], value: defMatch[2] }] };
                blocks.push(currentBlock);
            }
            continue;
        }

        // If currently in a step, rule, note, or result card, subsequent lines are sub-lines (e.g. math equations)
        if (currentBlock && (currentBlock.type === 'step' || currentBlock.type === 'rule' || currentBlock.type === 'note' || currentBlock.type === 'result')) {
            currentBlock.subLines.push(line);
            continue;
        }

        // Standalone paragraph
        currentBlock = { type: 'paragraph', text: line };
        blocks.push(currentBlock);
    }
    return blocks;
};

