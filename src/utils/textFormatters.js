export const formatExponents = (html) => {
    if (!html || typeof html !== 'string') return html;
    if (!html.includes('!')) return html;
    
    // Split by HTML tags to avoid replacing inside tags (like style="... !important")
    const parts = html.split(/(<[^>]*>)/);
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            // Text node: replace ! followed by alphanumeric/dash with superscript
            parts[i] = parts[i].replace(/!([a-zA-Z0-9\-]+)/g, '<sup>$1</sup>');
        }
    }
    return parts.join('');
};
