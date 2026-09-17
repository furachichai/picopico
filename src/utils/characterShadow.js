import { getCustomCharacterTags } from './characterTags.js';

/**
 * Utility functions for detecting character elements and calculating their shadow metrics.
 */

const shadowMetricsCache = new Map();

/**
 * Determines whether an element is a character image (as opposed to an object, background, symbol, or other element).
 */
export function isCharacterElement(element) {
    if (!element || element.type !== 'image') return false;
    if (element.metadata?.isSymbol) return false;
    if (element.metadata?.category === 'characters') return true;
    if (element.metadata?.category === 'objects' || element.metadata?.category === 'backgrounds') return false;

    const src = typeof element.content === 'string' ? element.content : '';
    if (!src) return false;
    const lower = src.toLowerCase();

    // Direct path matches
    if (lower.includes('/assets/characters/') || lower.includes('/characters/')) {
        return true;
    }
    if (lower.includes('/assets/objects/') || lower.includes('/objects/') || lower.includes('/assets/backgrounds/') || lower.includes('/backgrounds/')) {
        return false;
    }

    const filename = lower.split('/').pop();

    // Reject known non-character objects/props
    const objectKeywords = [
        'whole_', 'part_', 'item_', 'prop_', 'shape-', 'chili', 'soup', 'bowl',
        'recipe', 'scroll', 'plate', 'knife', 'box', 'counter', 'cases', 'display',
        'mitten', 'safe', 'truck', 'kart', 'bottle', 'egg', 'avocado', 'banana',
        'orange', 'watermelon', 'broken_phone', 'phone_cases', 'shop_'
    ];
    if (objectKeywords.some(kw => filename.includes(kw))) {
        return false;
    }

    // Match known character keywords (including custom tags)
    const customTags = getCustomCharacterTags();
    const customKeywords = customTags.map(t => t.id);
    const characterKeywords = [
        'chef', 'pesto', 'pest_', 'sales', 'alien', 'dilla', 'tucu', 'wizard', 'yara', 'scientist',
        ...customKeywords
    ];
    return characterKeywords.some(kw => filename.includes(kw));
}

/**
 * Normalizes an image src or path into a consistent identifier (filename)
 * for shadow preference tracking across dev and production.
 */
export function normalizeImageShadowKey(src) {
    if (!src || typeof src !== 'string') return '';
    const clean = src.split('?')[0].split('#')[0];
    if (clean.startsWith('data:')) return '';

    let filename = clean.split('/').pop() || '';
    try {
        filename = decodeURIComponent(filename);
    } catch {
        // ignore decode errors
    }
    filename = filename.trim().toLowerCase();
    if (!filename) return '';

    // Strip Vite asset bundle hash in production builds (e.g. "chef_dipper-Cr4vvjnE.png" -> "chef_dipper.png")
    return filename.replace(/-[A-Za-z0-9_-]{8}\.([a-zA-Z0-9]+)$/, '.$1');
}

export const STORAGE_KEY_SHADOW_PREFS = 'picopico_image_shadow_prefs';

/**
 * Returns whether an image should be instantiated with a shadow.
 * Checks localStorage first, then looks for the most recent instance of the image across slides.
 * Defaults to true.
 */
export function getImageShadowPreference(src, slides = []) {
    const key = normalizeImageShadowKey(src);
    if (!key) return true;

    // 1. Check persistent preferences in localStorage
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SHADOW_PREFS);
        if (raw) {
            const prefs = JSON.parse(raw);
            if (key in prefs && typeof prefs[key] === 'boolean') {
                return prefs[key];
            }
        }
    } catch {
        // ignore errors
    }

    // 2. If not recorded in localStorage, check slides in the lesson for the last instantiation of this image
    if (Array.isArray(slides) && slides.length > 0) {
        for (let i = slides.length - 1; i >= 0; i--) {
            const slide = slides[i];
            if (!slide || !Array.isArray(slide.elements)) continue;
            for (let j = slide.elements.length - 1; j >= 0; j--) {
                const el = slide.elements[j];
                if (el && (el.type === 'image' || el.type === 'IMAGE') && el.content) {
                    if (normalizeImageShadowKey(el.content) === key) {
                        return el.metadata?.hasShadow !== false;
                    }
                }
            }
        }
    }

    return true;
}

/**
 * Records whether a character image has shadow enabled or disabled.
 */
export function setImageShadowPreference(src, hasShadow) {
    const key = normalizeImageShadowKey(src);
    if (!key) return;

    try {
        let prefs = {};
        const raw = localStorage.getItem(STORAGE_KEY_SHADOW_PREFS);
        if (raw) {
            prefs = JSON.parse(raw) || {};
        }
        prefs[key] = Boolean(hasShadow);
        localStorage.setItem(STORAGE_KEY_SHADOW_PREFS, JSON.stringify(prefs));
    } catch (e) {
        console.warn('Could not save image shadow preference:', e);
    }
}

/**
 * Returns cached shadow metrics for an asset URL if available.
 */
export function getCachedShadowMetrics(imgUrl) {
    if (!imgUrl) return null;
    return shadowMetricsCache.get(imgUrl) || null;
}

/**
 * Analyzes a character image to calculate the exact width and center of its body/feet
 * using a fast offscreen canvas scan. Results are cached per image URL.
 */
export function analyzeCharacterImage(imgUrl, onReady) {
    if (!imgUrl) return;

    if (shadowMetricsCache.has(imgUrl)) {
        const cached = shadowMetricsCache.get(imgUrl);
        if (onReady) onReady(cached);
        return cached;
    }

    const fallbackMetrics = {
        widthPercent: 70,
        heightPercent: 12,
        centerXPercent: 50,
        bottomPercent: 99
    };

    if (typeof window === 'undefined' || typeof Image === 'undefined') {
        shadowMetricsCache.set(imgUrl, fallbackMetrics);
        if (onReady) onReady(fallbackMetrics);
        return fallbackMetrics;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
        try {
            const targetWidth = 100;
            const aspect = (img.naturalHeight && img.naturalWidth) ? (img.naturalHeight / img.naturalWidth) : 1;
            const targetHeight = Math.max(10, Math.round(targetWidth * aspect));

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (ctx) {
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                const data = ctx.getImageData(0, 0, targetWidth, targetHeight).data;

                let minX = targetWidth, maxX = 0, minY = targetHeight, maxY = 0;

                // Find full non-transparent bounds
                for (let y = 0; y < targetHeight; y++) {
                    for (let x = 0; x < targetWidth; x++) {
                        const alpha = data[(y * targetWidth + x) * 4 + 3];
                        if (alpha > 25) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }

                if (maxX > minX && maxY > minY) {
                    const charHeight = maxY - minY;
                    // Lower body / stance cutoff (bottom 35% of the character figure)
                    const lowerBodyTop = Math.floor(maxY - charHeight * 0.35);

                    let bodyMinX = targetWidth, bodyMaxX = 0;
                    for (let y = lowerBodyTop; y <= maxY; y++) {
                        for (let x = 0; x < targetWidth; x++) {
                            const alpha = data[(y * targetWidth + x) * 4 + 3];
                            if (alpha > 25) {
                                if (x < bodyMinX) bodyMinX = x;
                                if (x > bodyMaxX) bodyMaxX = x;
                            }
                        }
                    }

                    const bodyWidth = bodyMaxX > bodyMinX ? (bodyMaxX - bodyMinX) : (maxX - minX);
                    const widthPercent = Math.max(25, Math.min(100, (bodyWidth / targetWidth) * 100));
                    const centerXPercent = Math.max(10, Math.min(90, (((bodyMinX + bodyMaxX) / 2) / targetWidth) * 100));
                    const bottomPercent = Math.min(100, (maxY / targetHeight) * 100);

                    // Perspective height of shadow (~20% of shadow width adjusted for aspect)
                    const stickerAspect = targetWidth / targetHeight;
                    const heightPercent = Math.max(4, Math.min(22, (widthPercent * 0.20) * stickerAspect));

                    const metrics = {
                        widthPercent,
                        heightPercent,
                        centerXPercent,
                        bottomPercent
                    };
                    shadowMetricsCache.set(imgUrl, metrics);
                    if (onReady) onReady(metrics);
                    return;
                }
            }
        } catch (err) {
            // Fallback on CORS/canvas read issues
        }

        shadowMetricsCache.set(imgUrl, fallbackMetrics);
        if (onReady) onReady(fallbackMetrics);
    };

    img.onerror = () => {
        shadowMetricsCache.set(imgUrl, fallbackMetrics);
        if (onReady) onReady(fallbackMetrics);
    };

    img.src = imgUrl;

    return fallbackMetrics;
}
