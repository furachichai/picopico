export const evaluateMathExpression = (expr) => {
    try {
        if (!expr || typeof expr !== 'string') return null;
        let clean = expr
            .replace(/[×]/g, '*')
            .replace(/[÷]/g, '/')
            .replace(/[−—–]/g, '-')
            .trim();

        // If it uses 'x' or 'X' between digits (e.g. "8 x 2" or "8x2"), convert to multiplication
        clean = clean.replace(/(\d)\s*[xX]\s*(\d)/g, '$1 * $2');

        // Check if expression is purely arithmetic numbers and operators
        if (!/^[0-9+\-*/().\s]+$/.test(clean)) {
            return null;
        }

        const val = new Function(`return (${clean})`)();
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
            return val;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const parseFieldExpression = (expression) => {
    if (!expression) return [];

    let mainExpr = expression;
    let hasSemicolon = false;
    let manualDetractors = [];

    const semiIndex = expression.indexOf(';');
    if (semiIndex !== -1) {
        hasSemicolon = true;
        mainExpr = expression.substring(0, semiIndex).trim();
        const detPart = expression.substring(semiIndex + 1).trim();
        if (detPart.length > 0) {
            manualDetractors = detPart
                .split(',')
                .map(item => {
                    let clean = item.trim().replace(/^\*+|\*+$/g, '').trim();
                    if (!clean) return null;
                    const num = evaluateMathExpression(clean);
                    return num !== null ? num : clean;
                })
                .filter(item => item !== null && item !== '');
        }
    }

    const segments = [];
    let lastIndex = 0;
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let match;

    while ((match = regex.exec(mainExpr)) !== null) {
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: mainExpr.substring(lastIndex, match.index)
            });
        }

        const isDouble = match[1].startsWith('**');
        const expr = (isDouble ? match[2] : match[3]).trim();
        const numVal = evaluateMathExpression(expr);
        // If it evaluates arithmetically (e.g. "8 x 2" -> 16, "5" -> 5), use the evaluated number.
        // Otherwise, it's an algebraic value/term (e.g. "a", "2x", "a+b"), use the clean string expr.
        const evaluated = numVal !== null ? numVal : (expr.length > 0 ? expr : null);

        segments.push({
            type: 'field',
            isDouble,
            placeholder: expr,
            evaluated,
            raw: match[1]
        });

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < mainExpr.length) {
        segments.push({
            type: 'text',
            content: mainExpr.substring(lastIndex)
        });
    }

    // Trim trailing/leading whitespace from text segments adjacent to fields
    for (let i = 0; i < segments.length; i++) {
        if (segments[i].type === 'text') {
            if (i + 1 < segments.length && segments[i + 1].type === 'field') {
                segments[i].content = segments[i].content.replace(/\s+$/, '');
            }
            if (i - 1 >= 0 && segments[i - 1].type === 'field') {
                segments[i].content = segments[i].content.replace(/^\s+/, '');
            }
        }
    }

    // Attach semicolon metadata so choices generator knows about manual detractors
    segments.hasSemicolon = hasSemicolon;
    segments.manualDetractors = manualDetractors;
    segments.forEach(s => {
        s.hasSemicolon = hasSemicolon;
        s.manualDetractors = manualDetractors;
    });

    return segments;
};

export const shuffleArray = (array) => {
    if (!Array.isArray(array)) return [];
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

export const generateFieldChoices = (segmentsOrExpression, explicitDetractors = null) => {
    const segments = typeof segmentsOrExpression === 'string'
        ? parseFieldExpression(segmentsOrExpression)
        : segmentsOrExpression;

    if (!segments || !Array.isArray(segments)) return [];

    const fields = segments.filter(s => s.type === 'field' && s.evaluated !== null && s.evaluated !== '');
    const correctAnswers = fields.map(f => f.evaluated);
    if (correctAnswers.length === 0) return [];

    const hasSemicolon = !!(explicitDetractors !== null || segments.hasSemicolon || (segments.length > 0 && segments[0].hasSemicolon));
    let manualDetractors = explicitDetractors !== null
        ? explicitDetractors
        : (segments.manualDetractors || (segments.length > 0 && segments[0].manualDetractors) || []);

    // Detect casing from variables in correct answers
    const allLettersInAnswers = correctAnswers.flatMap(a => String(a).match(/[a-zA-Z]/g) || []);
    const isEquationLowercase = allLettersInAnswers.length > 0 && allLettersInAnswers.every(l => l === l.toLowerCase());
    const isEquationUppercase = allLettersInAnswers.length > 0 && allLettersInAnswers.every(l => l === l.toUpperCase());

    // If expression has semicolon, do NOT generate automatic detractors!
    // The detractors must be the ones following the ; and separated by commas
    if (hasSemicolon) {
        if (isEquationLowercase) {
            manualDetractors = manualDetractors.map(d => typeof d === 'string' ? d.toLowerCase() : d);
        } else if (isEquationUppercase) {
            manualDetractors = manualDetractors.map(d => typeof d === 'string' ? d.toUpperCase() : d);
        }
        return shuffleArray([...correctAnswers, ...manualDetractors]);
    }

    // Helper: is a value purely numeric?
    const isNumeric = (v) => typeof v === 'number' || (!isNaN(v) && !isNaN(parseFloat(v)) && /^-?\d+(\.\d+)?$/.test(String(v).trim()));

    // Rule:
    // If only 1 field -> create only 4 buttons including detractors
    // If 2 fields -> display a total of 5 buttons including detractors
    // If more than 2 fields -> two rows of 5 buttons (10 buttons)
    const targetSize = correctAnswers.length === 1
        ? 4
        : (correctAnswers.length === 2 ? 5 : Math.max(10, Math.ceil(correctAnswers.length / 5) * 5));

    // Initial choices pool MUST contain all correct answers with their exact needed frequencies!
    // e.g. for *a*+*a*, correctAnswers is ['a', 'a']. Both 'a' cards are present!
    const choices = [...correctAnswers];

    // Track unique answer strings to prevent detractors from colliding with ANY correct answer
    const correctSet = new Set(correctAnswers.map(a => String(a).trim()));
    let candidates = [];

    // 1. Generate numeric detractors if there are numeric answers
    fields.forEach(field => {
        const val = field.evaluated;
        if (!isNumeric(val)) return;
        const num = typeof val === 'number' ? val : parseFloat(val);
        const expr = String(field.placeholder || '');

        const hasOp = /[+\-*/xX×÷]/.test(expr);
        if (hasOp) {
            const numbers = expr.match(/\d+(\.\d+)?/g);
            if (numbers && numbers.length >= 2) {
                const n1 = parseFloat(numbers[0]);
                const n2 = parseFloat(numbers[1]);
                if (!isNaN(n1) && !isNaN(n2)) {
                    const opsVal = [
                        n1 + n2,
                        n1 - n2,
                        n2 - n1,
                        n1 * n2,
                        n2 !== 0 ? n1 / n2 : null,
                        n1 !== 0 ? n2 / n1 : null,
                    ];
                    opsVal.forEach(o => {
                        if (o !== null && !isNaN(o) && isFinite(o)) {
                            candidates.push(Math.round(o * 100) / 100);
                        }
                    });
                }
            }
        }

        candidates.push(num + 1);
        candidates.push(num - 1);
        candidates.push(num + 2);
        candidates.push(num - 2);
        candidates.push(num + 3);
        candidates.push(num - 3);
        candidates.push(num + 10);
        if (num - 10 >= 0) candidates.push(num - 10);
        candidates.push(num * 2);
        if (num % 2 === 0) candidates.push(num / 2);

        const valStr = Math.abs(num).toString();
        if (valStr.length >= 2) {
            const swappedStr = valStr.split('').reverse().join('');
            const swappedVal = parseFloat(swappedStr) * (num < 0 ? -1 : 1);
            if (!isNaN(swappedVal)) candidates.push(swappedVal);
        }
    });

    // 2. Generate algebraic detractors if there are algebraic answers
    const hasAlgebraic = correctAnswers.some(a => !isNumeric(a));
    if (hasAlgebraic) {
        fields.forEach(field => {
            const str = String(field.evaluated).trim();
            if (isNumeric(str)) return;

            // Pattern A: Single variable (e.g. 'a', 'x', 'y')
            if (/^[a-zA-Z]$/.test(str)) {
                const char = str;
                const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
                candidates.push(`2${char}`);
                candidates.push(`3${char}`);
                candidates.push(`${char}²`);
                candidates.push(`${char}/2`);
                // Related letters matching case
                const baseLetters = char.toLowerCase() <= 'd' ? ['b', 'c', 'x', 'y'] : ['y', 'z', 'a', 'b', 'x'];
                const otherLetters = baseLetters.map(l => isUpper ? l.toUpperCase() : l.toLowerCase());
                otherLetters.forEach(l => {
                    if (l !== char) candidates.push(l);
                });
                // Common numbers
                candidates.push(1, 2, 0);
            }
            // Pattern B: Term with coefficient (e.g. '2a', '3x', '5y')
            else if (/^(\d+)([a-zA-Z])$/.test(str)) {
                const match = str.match(/^(\d+)([a-zA-Z])$/);
                const coef = parseInt(match[1], 10);
                const char = match[2];
                const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
                candidates.push(char); // 1a -> just 'a'
                candidates.push(`${coef + 1}${char}`);
                if (coef > 2) candidates.push(`${coef - 1}${char}`);
                candidates.push(`${coef * 2}${char}`);
                candidates.push(`${char}²`);
                // Switch letter matching case
                const altChar = isUpper ? (char === 'A' ? 'B' : 'A') : (char === 'a' ? 'b' : 'a');
                candidates.push(`${coef}${altChar}`);
                candidates.push(altChar);
                candidates.push(coef);
            }
            // Pattern C: Expression with operators (e.g. 'a+b', 'x-y', '2a+1')
            else {
                if (str.includes('+')) {
                    candidates.push(str.replace('+', '-'));
                } else if (str.includes('-')) {
                    candidates.push(str.replace('-', '+'));
                }
                const vars = str.match(/[a-zA-Z]/g) || ['a'];
                vars.forEach(v => {
                    candidates.push(v);
                    candidates.push(`2${v}`);
                });
                candidates.push(1, 2, 0);
            }
        });

        // Add general algebraic detractors pool respecting casing
        let generalPool = ['a', 'b', '2a', 'x', 'y', '2x', '3a', '2', '1', '0', '3', 'a²', 'x²'];
        if (isEquationUppercase) {
            generalPool = generalPool.map(item => typeof item === 'string' ? item.toUpperCase() : item);
        } else if (isEquationLowercase) {
            generalPool = generalPool.map(item => typeof item === 'string' ? item.toLowerCase() : item);
        }
        generalPool.forEach(item => candidates.push(item));
    }

    // Force casing consistency if equation is uniformly lowercase or uppercase
    if (isEquationLowercase) {
        candidates = candidates.map(c => typeof c === 'string' ? c.toLowerCase() : c);
    } else if (isEquationUppercase) {
        candidates = candidates.map(c => typeof c === 'string' ? c.toUpperCase() : c);
    }

    // Filter candidates: must not be in correctSet, and must be unique
    const uniqueCandidates = [];
    const seenCandidates = new Set();

    candidates.forEach(c => {
        const cStr = String(c).trim();
        if (correctSet.has(cStr)) return;
        if (seenCandidates.has(cStr)) return;
        seenCandidates.add(cStr);
        uniqueCandidates.push(c);
    });

    // If numeric only, ensure integer consistency if all correct are integers
    const allNumeric = correctAnswers.every(isNumeric);
    if (allNumeric) {
        const allIntegers = correctAnswers.every(n => Number.isInteger(Number(n)));
        const allPositive = correctAnswers.every(n => Number(n) >= 0);

        let numFiltered = uniqueCandidates.filter(c => {
            if (!isNumeric(c)) return false;
            const n = Number(c);
            if (allIntegers && !Number.isInteger(n)) return false;
            if (allPositive && n < 0) return false;
            return true;
        });

        // Numeric fallback generator if not enough
        const baseVal = Number(correctAnswers[0]);
        let offset = 4;
        while (choices.length + numFiltered.length < targetSize) {
            const up = baseVal + offset;
            const down = baseVal - offset;
            if (!correctSet.has(String(up)) && !numFiltered.includes(up)) {
                numFiltered.push(up);
            }
            if ((down >= 0 || !allPositive) && !correctSet.has(String(down)) && !numFiltered.includes(down)) {
                numFiltered.push(down);
            }
            offset++;
        }

        for (let i = 0; i < numFiltered.length && choices.length < targetSize; i++) {
            choices.push(numFiltered[i]);
        }
    } else {
        // Mixed or algebraic: fill from uniqueCandidates
        for (let i = 0; i < uniqueCandidates.length && choices.length < targetSize; i++) {
            choices.push(uniqueCandidates[i]);
        }

        // Final fallback if still under targetSize
        let fallbackAlgebraic = ['a', 'b', 'c', 'x', 'y', 'z', '2a', '2x', '3a', '1', '2', '0', '4'];
        if (isEquationUppercase) {
            fallbackAlgebraic = fallbackAlgebraic.map(item => typeof item === 'string' ? item.toUpperCase() : item);
        } else if (isEquationLowercase) {
            fallbackAlgebraic = fallbackAlgebraic.map(item => typeof item === 'string' ? item.toLowerCase() : item);
        }

        for (const item of fallbackAlgebraic) {
            if (choices.length >= targetSize) break;
            const itemStr = String(item).trim();
            if (!correctSet.has(itemStr) && !choices.map(c => String(c).trim()).includes(itemStr)) {
                choices.push(item);
            }
        }
    }

    return shuffleArray(choices);
};
