/**
 * Utility functions for Result Field element.
 * Handles quiz resolution (limited to regular quiz, 4 squares, and number line)
 * and dimension calculation based on the largest answer.
 */

export const SUPPORTED_QUIZ_TYPES = ['classic', 'mc', '4sq', 'nl', 'type'];

/**
 * Extracts quiz options, largest answer, and correct answer for supported quiz types.
 * @param {Object} slide - Current slide object containing elements
 * @param {string} [language='es'] - Current language for translated options
 * @returns {Object} Quiz info with hasQuiz, quizType, largestAnswer, correctAnswer, options
 */
export const getQuizInfo = (slide, language = 'es') => {
    if (!slide || !Array.isArray(slide.elements)) {
        return {
            hasQuiz: false,
            quizType: null,
            largestAnswer: '0',
            correctAnswer: '?',
            options: []
        };
    }

    const quizEl = slide.elements.find(el => {
        if (el.type !== 'quiz') return false;
        const qt = el.metadata?.quizType || 'classic';
        return SUPPORTED_QUIZ_TYPES.includes(qt);
    });

    if (!quizEl) {
        return {
            hasQuiz: false,
            quizType: null,
            largestAnswer: '0',
            correctAnswer: '?',
            options: []
        };
    }

    let meta = quizEl.metadata || {};
    // Language translation fallback
    const trans = meta.translations?.[language];
    if (language !== 'es' && trans?.options) {
        meta = { ...meta, options: trans.options };
    }

    const quizType = meta.quizType || 'classic';
    let options = [];
    let correctAnswer = '';

    if (quizType === 'classic' || quizType === 'mc') {
        options = (meta.options || []).map(opt => String(opt ?? ''));
        const idx = meta.correctIndex ?? 0;
        correctAnswer = options[idx] !== undefined ? options[idx] : (options[0] || '');
    } else if (quizType === '4sq') {
        options = (meta.options || []).map(opt => String(opt ?? ''));
        const correctIndices = meta.correctIndices || (meta.correctIndex !== undefined ? [meta.correctIndex] : [0]);
        if (correctIndices.length > 1) {
            correctAnswer = correctIndices.map(i => options[i]).filter(Boolean).join(', ');
        } else {
            correctAnswer = options[correctIndices[0]] !== undefined ? options[correctIndices[0]] : (options[0] || '');
        }
    } else if (quizType === 'nl') {
        const val = meta.nlConfig?.correctValue ?? 0;
        correctAnswer = String(val);
        const minVal = String(meta.nlConfig?.min ?? 0);
        const maxVal = String(meta.nlConfig?.max ?? 10);
        options = [minVal, maxVal, correctAnswer];
    } else if (quizType === 'type') {
        const resultFields = (slide.elements || []).filter(el => el.type === 'result_field');
        options = resultFields.map(f => String(f.metadata?.correctAnswer ?? '0'));
        correctAnswer = options[0] || '0';
    }

    // Determine the largest answer by string length
    let longestAnswer = '0';
    if (options.length > 0) {
        longestAnswer = options.reduce((longest, current) => {
            return String(current).length > longest.length ? String(current) : longest;
        }, '');
    }
    if (!longestAnswer) longestAnswer = '0';

    return {
        hasQuiz: true,
        quizType,
        largestAnswer: longestAnswer,
        correctAnswer: correctAnswer || '?',
        options
    };
};

/**
 * Calculates static pixel dimensions for the Result field based on the largest answer.
 * @param {string} largestAnswer
 * @returns {{ width: number, height: number, isSquare: boolean }}
 */
export const calculateResultFieldDimensions = (largestAnswer) => {
    const str = String(largestAnswer ?? '0').trim();
    const len = Math.max(1, str.length);
    const baseHeight = 46;
    const baseWidth = 46;

    if (len <= 1) {
        return {
            width: baseWidth,
            height: baseHeight,
            isSquare: true,
            fontSize: 34
        };
    }

    let fontSize = 30;
    if (len >= 4 && len <= 7) fontSize = 24;
    else if (len > 7) fontSize = 20;

    // Snug rectangle with minimal empty space between text and border
    const calculatedWidth = Math.min(320, Math.max(baseWidth, Math.round(baseWidth + (len - 1) * (fontSize * 0.58))));
    return {
        width: calculatedWidth,
        height: baseHeight,
        isSquare: false,
        fontSize
    };
};

/**
 * Computes a non-overlapping coordinate { x, y } for a new or duplicated result_field.
 * Avoids spawning directly on top of existing result fields.
 * Coordinates are percentage values (15 to 85).
 */
export const getNonOverlappingResultFieldPosition = (slide, baseField = null) => {
    const existing = (slide?.elements || []).filter(el => el.type === 'result_field');
    if (existing.length === 0) {
        return { x: 50, y: 35 };
    }

    // Reference field to offset from: baseField, or the last added result_field
    const ref = baseField || existing[existing.length - 1];
    let startX = ref?.x !== undefined ? ref.x : 50;
    let startY = ref?.y !== undefined ? ref.y : 35;

    // Step rightwards by 18% (approx 65px on canvas, well clear of the ~56px field)
    let candidateX = startX + 18;
    let candidateY = startY;

    // Check collision with all existing fields
    const isColliding = (x, y) => {
        return existing.some(f => Math.abs(f.x - x) < 14 && Math.abs(f.y - y) < 12);
    };

    let attempts = 0;
    while (isColliding(candidateX, candidateY) || candidateX > 82 || candidateY > 65) {
        attempts++;
        if (attempts > 30) break;

        if (candidateX > 82) {
            candidateX = 26;
            candidateY += 14;
        } else {
            candidateX += 18;
        }

        if (candidateY > 65) {
            candidateY = 25;
            candidateX = 26 + (attempts % 4) * 16;
        }
    }

    return {
        x: Math.min(85, Math.max(15, Math.round(candidateX))),
        y: Math.min(65, Math.max(15, Math.round(candidateY)))
    };
};

/**
 * Re-indexes all result_field elements sequentially from 1 to N based on their relative order.
 * If multiple fields exist and any deletion happens, remaining fields are renamed #1, #2, etc.
 * @param {Array} elements - Array of slide elements
 * @returns {Array} Updated elements with sequential order in metadata
 */
export const reindexResultFields = (elements) => {
    if (!elements || !Array.isArray(elements)) return elements;

    const resultFields = elements.filter(el => el.type === 'result_field');
    if (resultFields.length === 0) return elements;

    // Sort existing result fields by their current order
    const sortedFields = [...resultFields].sort((a, b) => {
        const orderA = a.metadata?.order !== undefined ? Number(a.metadata.order) : 0;
        const orderB = b.metadata?.order !== undefined ? Number(b.metadata.order) : 0;
        return orderA - orderB;
    });

    const orderMap = new Map();
    sortedFields.forEach((rf, index) => {
        orderMap.set(rf.id, index + 1);
    });

    return elements.map(el => {
        if (el.type === 'result_field' && orderMap.has(el.id)) {
            const newOrder = orderMap.get(el.id);
            if (el.metadata?.order !== newOrder) {
                return {
                    ...el,
                    metadata: {
                        ...el.metadata,
                        order: newOrder
                    }
                };
            }
        }
        return el;
    });
};

