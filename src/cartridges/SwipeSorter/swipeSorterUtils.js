/**
 * Utility functions for Swipe Sorter cartridge.
 * Supports parsing batch card lists, randomizing/interleaving,
 * and limiting card counts.
 */

/**
 * Parses batch text into top group (swiped left) and second group (swiped right).
 * Format:
 * Top group lines (one phrase per line)
 * [one or more blank lines]
 * Second group lines (one phrase per line)
 *
 * @param {string} text - The raw batch text
 * @returns {{ left: string[], right: string[] }}
 */
export function parseBatchCards(text) {
    if (!text || typeof text !== 'string') {
        return { left: [], right: [] };
    }

    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const left = [];
    const right = [];
    let inSecondGroup = false;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) {
            // Once we have collected at least one line for the top group,
            // the first empty line marks the transition to the second group.
            if (left.length > 0) {
                inSecondGroup = true;
            }
            continue;
        }

        if (!inSecondGroup) {
            left.push(trimmed);
        } else {
            right.push(trimmed);
        }
    }

    return { left, right };
}

/**
 * In-place or copy Fisher-Yates shuffle using provided random function.
 */
function shuffleArray(array, rng = Math.random) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Simple pseudo-random generator for deterministic previews (seeded).
 */
function createPrng(seedString = 'picopico-swipe') {
    let h = 1779033703 ^ seedString.length;
    for (let i = 0; i < seedString.length; i++) {
        h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let seed = h >>> 0;
    return function next() {
        seed = Math.imul(seed ^ (seed >>> 15), 0x5bd1e995);
        seed ^= seed >>> 13;
        seed = Math.imul(seed ^ (seed >>> 15), 0x5bd1e995);
        return ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
    };
}

/**
 * Selects a balanced sample from left and right card pools, then shuffles them together.
 */
function selectBalancedCards(leftCards, rightCards, limit, rng = Math.random) {
    const shuffledLeft = shuffleArray(leftCards, rng);
    const shuffledRight = shuffleArray(rightCards, rng);

    let targetLeft = Math.ceil(limit / 2);
    let targetRight = limit - targetLeft;

    if (shuffledLeft.length < targetLeft) {
        targetLeft = shuffledLeft.length;
        targetRight = Math.min(shuffledRight.length, limit - targetLeft);
    } else if (shuffledRight.length < targetRight) {
        targetRight = shuffledRight.length;
        targetLeft = Math.min(shuffledLeft.length, limit - targetRight);
    }

    const selected = [
        ...shuffledLeft.slice(0, targetLeft),
        ...shuffledRight.slice(0, targetRight)
    ];

    return shuffleArray(selected, rng);
}

/**
 * Generates an array of card objects from batch configuration.
 *
 * @param {Object} options
 * @param {string} [options.batch=''] - Raw batch text
 * @param {'random'|'linear'} [options.order='random'] - Shuffle or linear
 * @param {number|string} [options.totalCards] - Max number of cards to include
 * @param {boolean} [options.isDeterministic=false] - For preview/reproducible order
 * @returns {Array<{ id: string, text: string, correctSide: 'left'|'right' }>}
 */
export function generateBatchCards({
    batch = '',
    order = 'random',
    totalCards = null,
    isDeterministic = false
} = {}) {
    const { left: leftPhrases, right: rightPhrases } = parseBatchCards(batch);

    if (leftPhrases.length === 0 && rightPhrases.length === 0) {
        return [];
    }

    const leftCards = leftPhrases.map((phrase, i) => ({
        id: `batch-l-${i}`,
        text: phrase,
        correctSide: 'left'
    }));

    const rightCards = rightPhrases.map((phrase, i) => ({
        id: `batch-r-${i}`,
        text: phrase,
        correctSide: 'right'
    }));

    const totalAvailable = leftCards.length + rightCards.length;
    let limit = totalAvailable;
    if (totalCards !== null && totalCards !== undefined && totalCards !== '') {
        const parsedLimit = parseInt(totalCards, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
            limit = Math.min(parsedLimit, totalAvailable);
        }
    }

    if (order === 'linear') {
        // Linear mode: interleave top group (left) and second group (right)
        // so questions alternate smoothly in document order.
        const interleaved = [];
        const maxLen = Math.max(leftCards.length, rightCards.length);
        for (let i = 0; i < maxLen; i++) {
            if (i < leftCards.length) interleaved.push(leftCards[i]);
            if (i < rightCards.length) interleaved.push(rightCards[i]);
        }
        return interleaved.slice(0, limit);
    }

    // Random mode (default):
    const rng = isDeterministic ? createPrng(batch) : Math.random;
    return selectBalancedCards(leftCards, rightCards, limit, rng);
}

/**
 * Optimizes an image (File, Blob, or base64 data URL) by downscaling it
 * to fit within maxWidth/maxHeight and compressing to JPEG.
 * Returns a Promise resolving to a lightweight data URL.
 */
export function optimizeImage(source, maxWidth = 1080, maxHeight = 1920, quality = 0.82) {
    if (!source) {
        return Promise.resolve(null);
    }

    // Node.js environment fallback
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return Promise.resolve(typeof source === 'string' ? source : null);
    }

    // Don't re-compress SVG or tiny strings (under 50KB data URLs)
    if (typeof source === 'string' && (source.startsWith('data:image/svg') || (source.startsWith('data:') && source.length < 50000))) {
        return Promise.resolve(source);
    }

    return new Promise((resolve) => {
        const img = new Image();
        let objectUrl = null;

        const cleanup = () => {
            if (objectUrl) {
                try {
                    URL.revokeObjectURL(objectUrl);
                } catch (_) {}
                objectUrl = null;
            }
        };

        img.onload = () => {
            try {
                let { width, height } = img;
                if (!width || !height) {
                    cleanup();
                    resolve(typeof source === 'string' ? source : null);
                    return;
                }

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.max(1, Math.round(width * ratio));
                    height = Math.max(1, Math.round(height * ratio));
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    cleanup();
                    resolve(compressed);
                } else {
                    cleanup();
                    resolve(typeof source === 'string' ? source : null);
                }
            } catch (err) {
                console.warn('optimizeImage draw failed:', err);
                cleanup();
                resolve(typeof source === 'string' ? source : null);
            }
        };

        img.onerror = () => {
            cleanup();
            resolve(typeof source === 'string' ? source : null);
        };

        if (source instanceof Blob || (typeof File !== 'undefined' && source instanceof File)) {
            try {
                objectUrl = URL.createObjectURL(source);
                img.src = objectUrl;
            } catch (e) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    img.src = ev.target.result;
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(source);
            }
        } else if (typeof source === 'string') {
            img.src = source;
        } else {
            resolve(null);
        }
    });
}

