export const evaluateMathExpression = (expr) => {
    try {
        if (!expr) return null;
        let clean = expr
            .replace(/[xX×]/g, '*')
            .replace(/[÷]/g, '/')
            .replace(/[−—–]/g, '-')
            .replace(/\s+/g, '');
        
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
    
    const segments = [];
    let lastIndex = 0;
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let match;
    
    while ((match = regex.exec(expression)) !== null) {
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: expression.substring(lastIndex, match.index)
            });
        }
        
        const isDouble = match[1].startsWith('**');
        const expr = isDouble ? match[2] : match[3];
        const val = evaluateMathExpression(expr);
        
        segments.push({
            type: 'field',
            isDouble,
            placeholder: expr,
            evaluated: val,
            raw: match[1]
        });
        
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < expression.length) {
        segments.push({
            type: 'text',
            content: expression.substring(lastIndex)
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
    
    return segments;
};

export const generateFieldChoices = (segments) => {
    const fields = segments.filter(s => s.type === 'field' && s.evaluated !== null);
    const correctAnswers = fields.map(f => f.evaluated);
    const uniqueCorrect = Array.from(new Set(correctAnswers));
    
    if (uniqueCorrect.length === 0) return [];
    
    const targetSet = new Set(uniqueCorrect);
    const candidates = [];
    
    fields.forEach(field => {
        const val = field.evaluated;
        const expr = field.placeholder;
        
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
                            const rounded = Math.round(o * 100) / 100;
                            candidates.push(rounded);
                        }
                    });
                }
            }
        }
        
        candidates.push(val + 1);
        candidates.push(val - 1);
        candidates.push(val + 2);
        candidates.push(val - 2);
        candidates.push(val + 3);
        candidates.push(val - 3);
        candidates.push(val + 10);
        if (val - 10 >= 0) candidates.push(val - 10);
        candidates.push(val * 2);
        if (val % 2 === 0) candidates.push(val / 2);
        
        const valStr = Math.abs(val).toString();
        if (valStr.length >= 2) {
            const swappedStr = valStr.split('').reverse().join('');
            const swappedVal = parseFloat(swappedStr) * (val < 0 ? -1 : 1);
            if (!isNaN(swappedVal)) {
                candidates.push(swappedVal);
            }
        }
    });
    
    const allIntegers = uniqueCorrect.every(n => Number.isInteger(n));
    
    let filteredCandidates = candidates.filter(c => {
        if (targetSet.has(c)) return false;
        if (allIntegers && !Number.isInteger(c)) return false;
        if (c < 0 && uniqueCorrect.every(n => n >= 0)) return false;
        return true;
    });
    
    filteredCandidates = Array.from(new Set(filteredCandidates));
    
    const baseVal = uniqueCorrect[0];
    let offset = 4;
    const targetSize = Math.max(5, uniqueCorrect.length);
    while (uniqueCorrect.length + filteredCandidates.length < targetSize) {
        const up = baseVal + offset;
        const down = baseVal - offset;
        if (!targetSet.has(up) && !filteredCandidates.includes(up)) {
            filteredCandidates.push(up);
        }
        if (down >= 0 || !uniqueCorrect.every(n => n >= 0)) {
            if (!targetSet.has(down) && !filteredCandidates.includes(down)) {
                filteredCandidates.push(down);
            }
        }
        offset++;
    }
    
    const choices = [...uniqueCorrect];
    for (let i = 0; i < filteredCandidates.length && choices.length < targetSize; i++) {
        choices.push(filteredCandidates[i]);
    }
    
    return choices.sort((a, b) => a - b);
};
