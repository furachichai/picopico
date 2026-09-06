/**
 * Utility functions for Result Field element.
 * Handles quiz resolution (limited to regular quiz, 4 squares, and number line)
 * and dimension calculation based on the largest answer.
 */

export const SUPPORTED_QUIZ_TYPES = ['classic', 'mc', '4sq', 'nl'];

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
