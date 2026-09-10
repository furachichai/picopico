/**
 * Utility functions for layer management and z-sorting.
 */

/**
 * Ensures text balloons (type === 'balloon') are always placed on top of images (type === 'image')
 * by default, unless their z-sort has been manually modified (el.metadata?.manualZ === true).
 *
 * Preserves the exact positions of all other elements, the relative order of non-manual images,
 * and the relative order of non-manual balloons.
 *
 * @param {Array} elements - Array of slide elements
 * @returns {Array} - Elements array with balloons guaranteed above images (if not manually sorted)
 */
export function ensureBalloonsAboveImages(elements) {
    if (!elements || elements.length <= 1) return elements;

    // Check for violation: any non-manual balloon situated before any non-manual image
    let seenNonManualBalloon = false;
    let hasViolation = false;

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el) continue;
        if (el.type === 'balloon' && !el.metadata?.manualZ) {
            seenNonManualBalloon = true;
        } else if (seenNonManualBalloon && el.type === 'image' && !el.metadata?.manualZ) {
            hasViolation = true;
            break;
        }
    }

    if (!hasViolation) {
        return elements;
    }

    // Violation found: collect indices and non-manual elements to re-order
    const nonManualImages = [];
    const nonManualBalloons = [];
    const targetIndices = [];

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el) continue;
        if (el.type === 'image' && !el.metadata?.manualZ) {
            nonManualImages.push(el);
            targetIndices.push(i);
        } else if (el.type === 'balloon' && !el.metadata?.manualZ) {
            nonManualBalloons.push(el);
            targetIndices.push(i);
        }
    }

    const reorderedGroup = [...nonManualImages, ...nonManualBalloons];
    const result = [...elements];

    for (let i = 0; i < targetIndices.length; i++) {
        result[targetIndices[i]] = reorderedGroup[i];
    }

    return result;
}
