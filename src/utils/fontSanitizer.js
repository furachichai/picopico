/**
 * Font sanitizer utility.
 * Prevents WebKit (iOS Safari) from resolving the generic keyword `cursive`
 * to Snell Roundhand or other illegible script calligraphy fonts.
 */
export const sanitizeFontFamily = (family) => {
    if (!family) return '"Fredoka", sans-serif';
    return family
        .replace(/,\s*cursive\b/gi, ', "Comic Neue", "Fredoka", "Nunito"')
        .replace(/\bcursive\b/gi, '"Comic Neue", "Fredoka", "Nunito", sans-serif');
};
