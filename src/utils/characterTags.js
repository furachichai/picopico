export const DEFAULT_CHARACTER_TAGS = [
    { id: 'chef', label: 'Chef' },
    { id: 'pesto', label: 'Pesto' },
    { id: 'sales', label: 'Sales' },
    { id: 'dilla', label: 'Dilla' },
    { id: 'wizard', label: 'Wizard' },
    { id: 'yara', label: 'Yara' },
    { id: 'keep', label: 'Original Names' },
];

export const STORAGE_KEY_CUSTOM_TAGS = 'picopico_custom_character_tags';
export const STORAGE_KEY_LAST_CHAR_TAG = 'picopico_last_save_character_tag';
export const EVENT_CUSTOM_TAGS_CHANGED = 'picopico-character-tags-changed';

/**
 * Sanitize a user label into a valid lowercase identifier for filename prefixes and filtering.
 */
export const sanitizeTagId = (label) => {
    if (!label) return '';
    return label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32);
};

/**
 * Load custom character tags from localStorage.
 */
export const getCustomCharacterTags = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_TAGS);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.filter(t => t && typeof t.id === 'string' && typeof t.label === 'string');
        }
    } catch {
        // ignore errors
    }
    return [];
};

/**
 * Save custom character tags to localStorage and notify all listeners.
 */
export const saveCustomCharacterTags = (tags) => {
    try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_TAGS, JSON.stringify(tags));
        window.dispatchEvent(new CustomEvent(EVENT_CUSTOM_TAGS_CHANGED, { detail: tags }));
    } catch (e) {
        console.warn('Could not save custom character tags:', e);
    }
};

/**
 * Returns merged list of all character tags: default characters, custom tags, and 'keep' at the end.
 */
export const getAllCharacterTags = (customList = null) => {
    const custom = customList !== null ? customList : getCustomCharacterTags();
    const keepTag = DEFAULT_CHARACTER_TAGS.find(t => t.id === 'keep') || { id: 'keep', label: 'Original Names' };
    const baseTags = DEFAULT_CHARACTER_TAGS.filter(t => t.id !== 'keep');
    return [...baseTags, ...custom, keepTag];
};

/**
 * Add a new custom character tag.
 * Throws an error if name is empty, invalid, or already exists.
 */
export const addCustomCharacterTag = (label) => {
    const trimmed = (label || '').trim();
    if (!trimmed) {
        throw new Error('Tag name cannot be empty');
    }
    const id = sanitizeTagId(trimmed);
    if (!id) {
        throw new Error('Tag name must contain letters or numbers');
    }

    const reserved = ['keep', 'all', 'other', 'objects', 'backgrounds', 'images', 'custom', 'characters', 'scenes', 'titlecards'];
    if (reserved.includes(id)) {
        throw new Error(`"${trimmed}" is a reserved system keyword`);
    }

    const currentCustom = getCustomCharacterTags();
    const all = getAllCharacterTags(currentCustom);
    if (all.some(t => t.id === id || t.label.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error(`Tag "${trimmed}" already exists`);
    }

    const newTag = { id, label: trimmed };
    const updated = [...currentCustom, newTag];
    saveCustomCharacterTags(updated);
    return newTag;
};

/**
 * Remove a custom character tag by its id.
 */
export const removeCustomCharacterTag = (tagId) => {
    const currentCustom = getCustomCharacterTags();
    const updated = currentCustom.filter(t => t.id !== tagId);
    saveCustomCharacterTags(updated);
    return updated;
};
