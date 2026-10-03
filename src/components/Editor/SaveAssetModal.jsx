import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SaveAssetModal.css';
import { useEditor } from '../../context/EditorContext';
import ReplaceAssetModal from './ReplaceAssetModal';
import {
    DEFAULT_CHARACTER_TAGS,
    getCustomCharacterTags,
    getAllCharacterTags,
    addCustomCharacterTag,
    removeCustomCharacterTag,
    EVENT_CUSTOM_TAGS_CHANGED
} from '../../utils/characterTags';

const CATEGORIES = [
    { id: 'characters', label: 'Characters', icon: '👤', folder: 'src/assets/characters' },
    { id: 'objects', label: 'Objects', icon: '📦', folder: 'src/assets/objects' },
    { id: 'backgrounds', label: 'Backgrounds', icon: '🌄', folder: 'src/assets/backgrounds' },
    { id: 'images', label: 'General', icon: '🖼️', folder: 'src/assets/images' },
];

const OBJECT_TAGS = [
    { id: 'whole', label: 'Whole' },
    { id: 'part', label: 'Part' },
    { id: 'item', label: 'Item' },
    { id: 'prop', label: 'Prop' },
    { id: 'keep', label: 'Original Names' },
];

const BACKGROUND_TAGS = [
    { id: 'titlecard', label: '🎬 Titlecard' },
    { id: 'bkg', label: '🌄 Scene / Bkg' },
    { id: 'keep', label: 'Original Names' },
];

const getSavedCategory = (fallback = 'characters') => {
    try {
        const saved = localStorage.getItem('picopico_last_save_category');
        if (saved && CATEGORIES.some(c => c.id === saved)) {
            return saved;
        }
    } catch {
        // ignore
    }
    return fallback;
};

const getSavedCharacterTag = (fallback = 'chef', availableTags = null) => {
    try {
        const saved = localStorage.getItem('picopico_last_save_character_tag');
        const tags = availableTags || getAllCharacterTags();
        if (saved && tags.some(t => t.id === saved)) {
            return saved;
        }
    } catch {
        // ignore
    }
    return fallback;
};

const getSavedObjectTag = (fallback = 'whole') => {
    try {
        const saved = localStorage.getItem('picopico_last_save_object_tag');
        if (saved && OBJECT_TAGS.some(t => t.id === saved)) {
            return saved;
        }
    } catch {
        // ignore
    }
    return fallback;
};

const getSavedBackgroundTag = (fallback = 'bkg') => {
    try {
        const saved = localStorage.getItem('picopico_last_save_background_tag');
        if (saved && BACKGROUND_TAGS.some(t => t.id === saved)) {
            return saved;
        }
    } catch {
        // ignore
    }
    return fallback;
};

// Helper to format/prefix a filename according to category and selected sub-tag
const formatItemFilename = (rawName, category, characterTag, objectTag, backgroundTag, charTagsList = null) => {
    let clean = (rawName || 'asset').replace(/\.[^/.]+$/, '');
    clean = clean.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    // Strip previous tag prefixes
    const allCharTags = charTagsList || getAllCharacterTags();
    allCharTags.forEach(t => {
        if (t.id !== 'keep' && clean.startsWith(t.id + '_')) {
            clean = clean.replace(new RegExp(`^${t.id}_`), '');
        }
    });
    OBJECT_TAGS.forEach(t => {
        if (t.id !== 'keep' && clean.startsWith(t.id + '_')) {
            clean = clean.replace(new RegExp(`^${t.id}_`), '');
        }
    });
    BACKGROUND_TAGS.forEach(t => {
        if (t.id !== 'keep' && clean.startsWith(t.id + '_')) {
            clean = clean.replace(new RegExp(`^${t.id}_`), '');
        }
    });

    if (category === 'characters') {
        if (characterTag && characterTag !== 'keep') {
            return `${characterTag}_${clean || 'character'}`;
        }
        return clean || 'character';
    }

    if (category === 'objects') {
        if (objectTag && objectTag !== 'keep') {
            return `${objectTag}_${clean || 'object'}`;
        }
        return clean || 'object';
    }

    if (category === 'backgrounds') {
        if (backgroundTag && backgroundTag !== 'keep') {
            const prefix = backgroundTag === 'titlecard' ? 'titlecard' : 'bkg';
            return `${prefix}_${clean || 'background'}`;
        }
        return clean || 'background';
    }

    return clean || 'image';
};

const SaveAssetModal = ({
    isOpen,
    imageData = null,
    items: propItems = null,
    initialCategory = null,
    initialFilename = '',
    onSave,
    onCancel
}) => {
    const { dispatch } = useEditor();
    const [conflict, setConflict] = useState(null);
    const [category, setCategory] = useState('characters');
    const [characterTag, setCharacterTag] = useState('chef');
    const [objectTag, setObjectTag] = useState('whole');
    const [backgroundTag, setBackgroundTag] = useState('bkg');
    const [items, setItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, name: '' });
    const [error, setError] = useState(null);

    // Custom character tags state
    const [customTags, setCustomTags] = useState(() => getCustomCharacterTags());
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const [newTagError, setNewTagError] = useState(null);

    // Keep custom tags synchronized
    useEffect(() => {
        const handleSync = () => {
            setCustomTags(getCustomCharacterTags());
        };
        window.addEventListener(EVENT_CUSTOM_TAGS_CHANGED, handleSync);
        window.addEventListener('storage', handleSync);
        return () => {
            window.removeEventListener(EVENT_CUSTOM_TAGS_CHANGED, handleSync);
            window.removeEventListener('storage', handleSync);
        };
    }, []);

    // Initialize items and tags on open
    useEffect(() => {
        if (!isOpen) return;

        const loadedCustom = getCustomCharacterTags();
        setCustomTags(loadedCustom);
        const allTags = getAllCharacterTags(loadedCustom);

        const effectiveCategory = initialCategory || getSavedCategory('characters');
        const effectiveCharTag = getSavedCharacterTag('chef', allTags);
        const effectiveObjTag = getSavedObjectTag('whole');
        const effectiveBgTag = getSavedBackgroundTag('bkg');

        setCategory(effectiveCategory);
        setCharacterTag(effectiveCharTag);
        setObjectTag(effectiveObjTag);
        setBackgroundTag(effectiveBgTag);
        setError(null);
        setIsSaving(false);
        setIsCreatingTag(false);
        setNewTagInput('');
        setNewTagError(null);
        setSaveProgress({ current: 0, total: 0, name: '' });

        // Normalize raw items list
        let rawList = [];
        if (propItems && propItems.length > 0) {
            rawList = propItems;
        } else if (imageData) {
            rawList = [{
                dataUrl: imageData,
                filename: initialFilename || ''
            }];
        }

        if (rawList.length === 0) {
            setItems([]);
            return;
        }

        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

        const initializedItems = rawList.map((item, idx) => {
            const rawName = item.filename || `asset_${timestamp}_${idx + 1}`;
            const targetName = formatItemFilename(rawName, effectiveCategory, effectiveCharTag, effectiveObjTag, effectiveBgTag, allTags);

            return {
                id: `asset_${idx}_${Date.now()}`,
                dataUrl: item.dataUrl,
                originalName: rawName,
                filename: targetName,
                dimensions: item.dimensions || { width: 0, height: 0 }
            };
        });

        // If dimensions are missing, calculate them asynchronously
        initializedItems.forEach(item => {
            if (!item.dimensions.width && item.dataUrl) {
                const img = new Image();
                img.onload = () => {
                    setItems(prev => prev.map(p => p.id === item.id ? { ...p, dimensions: { width: img.naturalWidth, height: img.naturalHeight } } : p));
                };
                img.src = item.dataUrl;
            }
        });

        setItems(initializedItems);
    }, [isOpen, imageData, propItems, initialCategory, initialFilename]);

    // Update prefix when character tag changes
    const handleCharacterTagChange = (tagId, tagsList = null) => {
        setCharacterTag(tagId);
        try {
            localStorage.setItem('picopico_last_save_character_tag', tagId);
        } catch {}

        const currentTags = tagsList || getAllCharacterTags(customTags);
        setItems(prev => prev.map(item => ({
            ...item,
            filename: formatItemFilename(item.originalName, category, tagId, objectTag, backgroundTag, currentTags)
        })));
    };

    // Create a new custom character tag
    const handleCreateTag = (e) => {
        if (e) e.preventDefault();
        const trimmed = newTagInput.trim();
        if (!trimmed) {
            setNewTagError('Please enter a tag name');
            return;
        }

        try {
            const newTag = addCustomCharacterTag(trimmed);
            const updatedCustom = getCustomCharacterTags();
            setCustomTags(updatedCustom);
            setNewTagInput('');
            setIsCreatingTag(false);
            setNewTagError(null);

            const updatedAll = getAllCharacterTags(updatedCustom);
            handleCharacterTagChange(newTag.id, updatedAll);
        } catch (err) {
            setNewTagError(err.message || 'Could not add tag');
        }
    };

    // Delete a custom character tag
    const handleDeleteCustomTag = (tagId, e) => {
        if (e) e.stopPropagation();
        const updatedCustom = removeCustomCharacterTag(tagId);
        setCustomTags(updatedCustom);
        const updatedAll = getAllCharacterTags(updatedCustom);
        if (characterTag === tagId) {
            handleCharacterTagChange('chef', updatedAll);
        }
    };

    // Update prefix when object tag changes
    const handleObjectTagChange = (tagId) => {
        setObjectTag(tagId);
        try {
            localStorage.setItem('picopico_last_save_object_tag', tagId);
        } catch {}

        const allTags = getAllCharacterTags(customTags);
        setItems(prev => prev.map(item => ({
            ...item,
            filename: formatItemFilename(item.originalName, category, characterTag, tagId, backgroundTag, allTags)
        })));
    };

    // Update prefix when background tag changes
    const handleBackgroundTagChange = (tagId) => {
        setBackgroundTag(tagId);
        try {
            localStorage.setItem('picopico_last_save_background_tag', tagId);
        } catch {}

        const allTags = getAllCharacterTags(customTags);
        setItems(prev => prev.map(item => ({
            ...item,
            filename: formatItemFilename(item.originalName, category, characterTag, objectTag, tagId, allTags)
        })));
    };

    // Handle category change (applies to all queued items)
    const handleCategoryChange = (newCat) => {
        setCategory(newCat);
        try {
            localStorage.setItem('picopico_last_save_category', newCat);
        } catch {}

        const allTags = getAllCharacterTags(customTags);
        setItems(prev => prev.map(item => ({
            ...item,
            filename: formatItemFilename(item.originalName, newCat, characterTag, objectTag, backgroundTag, allTags)
        })));
    };

    // Handle individual item filename rename in list
    const handleItemFilenameChange = (itemId, newName) => {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, filename: newName } : item));
    };

    // Handle removing an item from the batch
    const handleRemoveItem = (itemId) => {
        setItems(prev => {
            const next = prev.filter(item => item.id !== itemId);
            if (next.length === 0 && onCancel) {
                onCancel();
            }
            return next;
        });
    };

    // Execute save for all items in batch (with duplicate collision detection)
    const executeUpload = async (itemsToSave) => {
        if (!itemsToSave || itemsToSave.length === 0) return;

        // Check for empty filenames
        const hasEmpty = itemsToSave.some(item => !item.filename || !item.filename.trim());
        if (hasEmpty) {
            setError('All files must have a valid filename');
            setIsSaving(false);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Fetch asset list to check for collisions
            let assetMeta = {};
            try {
                const listRes = await fetch('/api/assets/list');
                if (listRes.ok) {
                    const listData = await listRes.json();
                    assetMeta = listData.assetMeta || {};
                }
            } catch {}

            const collidingIndex = itemsToSave.findIndex(item => {
                if (item.overwrite) return false;
                let fn = item.filename.trim();
                if (!fn.endsWith('.png') && !fn.endsWith('.jpg') && !fn.endsWith('.jpeg') && !fn.endsWith('.webp') && !fn.endsWith('.svg')) {
                    fn += '.png';
                }
                const clean = fn.replace(/[^a-zA-Z0-9._-]/g, '_');
                return Boolean(assetMeta[fn] || assetMeta[clean]);
            });

            if (collidingIndex !== -1) {
                const item = itemsToSave[collidingIndex];
                let fn = item.filename.trim();
                if (!fn.endsWith('.png') && !fn.endsWith('.jpg') && !fn.endsWith('.jpeg') && !fn.endsWith('.webp') && !fn.endsWith('.svg')) {
                    fn += '.png';
                }
                const clean = fn.replace(/[^a-zA-Z0-9._-]/g, '_');
                const existing = assetMeta[fn] || assetMeta[clean];

                setConflict({
                    itemIndex: collidingIndex,
                    filename: existing.filename || fn,
                    category: category,
                    existing: {
                        url: existing.url,
                        filename: existing.filename || fn,
                        category: existing.category || category,
                        size: existing.size || 0
                    },
                    incoming: {
                        dataUrl: item.dataUrl,
                        filename: fn,
                        size: item.size || 0,
                        category: category
                    }
                });
                setIsSaving(false);
                return;
            }

            try {
                localStorage.setItem('picopico_last_save_category', category);
            } catch {}

            const savedResults = [];

            for (let i = 0; i < itemsToSave.length; i++) {
                const item = itemsToSave[i];
                let finalName = item.filename.trim();
                if (!finalName.endsWith('.png') && !finalName.endsWith('.jpg') && !finalName.endsWith('.jpeg') && !finalName.endsWith('.webp') && !finalName.endsWith('.svg')) {
                    finalName += '.png';
                }

                setSaveProgress({
                    current: i + 1,
                    total: itemsToSave.length,
                    name: finalName
                });

                const response = await fetch('/api/assets/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dataUrl: item.dataUrl,
                        filename: finalName,
                        category: category,
                        overwrite: Boolean(item.overwrite)
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || `Failed saving ${finalName}`);
                }

                const result = await response.json();

                if (item.overwrite) {
                    // Dispatch REPLACE_ASSET_INSTANCES to editor context
                    dispatch({
                        type: 'REPLACE_ASSET_INSTANCES',
                        payload: {
                            oldFilename: finalName,
                            oldUrl: item.existingUrl,
                            newUrl: result.url || item.existingUrl,
                            timestamp: Date.now()
                        }
                    });
                    window.dispatchEvent(new CustomEvent('picopico-asset-saved'));
                }

                savedResults.push({
                    ...result,
                    dimensions: item.dimensions,
                    characterTag: category === 'characters' ? characterTag : null
                });
            }

            if (onSave) {
                // If single item was passed as prop, return single object; else array
                onSave(propItems ? savedResults : (savedResults.length === 1 ? savedResults[0] : savedResults));
            }
        } catch (err) {
            console.error('Failed saving assets:', err);
            setError(err.message || 'Error saving files to disk');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = () => {
        executeUpload(items);
    };

    const handleConflictReplace = (conf) => {
        const idx = conf.itemIndex;
        const updated = [...items];
        updated[idx] = {
            ...updated[idx],
            overwrite: true,
            existingUrl: conf.existing?.url
        };
        setItems(updated);
        setConflict(null);
        executeUpload(updated);
    };

    const handleConflictKeepBoth = (conf) => {
        const idx = conf.itemIndex;
        const fullFilename = conf.incoming?.filename || conf.filename;
        const lastDot = fullFilename.lastIndexOf('.');
        const ext = lastDot !== -1 ? fullFilename.slice(lastDot) : '.png';
        const base = lastDot !== -1 ? fullFilename.slice(0, lastDot) : fullFilename;

        let counter = 1;
        let nextName = `${base}_${counter}${ext}`;

        const updated = [...items];
        updated[idx] = {
            ...updated[idx],
            filename: nextName,
            overwrite: false
        };
        setItems(updated);
        setConflict(null);
        executeUpload(updated);
    };

    const handleConflictCancel = () => {
        setConflict(null);
        setIsSaving(false);
    };

    if (!isOpen || items.length === 0) return null;

    const isBatch = items.length > 1;

    const modalContent = (
        <div className="save-asset-modal-overlay" onClick={onCancel}>
            <div className="save-asset-modal" onClick={e => e.stopPropagation()}>
                <div className="save-asset-header">
                    <div className="save-asset-header-left">
                        <h3>
                            {isBatch ? `Save ${items.length} Images to Library` : 'Save Image to Library'}
                        </h3>
                        {isBatch && (
                            <span className="save-asset-batch-badge">
                                BATCH ({items.length})
                            </span>
                        )}
                    </div>
                    <button className="save-asset-close-btn" onClick={onCancel} title="Close">×</button>
                </div>

                <div className="save-asset-body">
                    {/* Preview / Queue Reel */}
                    {isBatch ? (
                        <div className="save-asset-batch-reel-card">
                            <div className="batch-reel-header">
                                <span className="batch-reel-title">
                                    Queue ({items.length} images selected)
                                </span>
                                <span className="batch-reel-hint">
                                    Applying category: <strong>{category}</strong>
                                </span>
                            </div>
                            <div className="batch-reel-thumbnails">
                                {items.map((item, idx) => (
                                    <div key={item.id} className="batch-thumb-item" title={item.filename}>
                                        <img src={item.dataUrl} alt={item.filename} />
                                        <button
                                            type="button"
                                            className="batch-thumb-remove"
                                            title="Remove from import"
                                            onClick={() => handleRemoveItem(item.id)}
                                        >
                                            ×
                                        </button>
                                        <span className="batch-thumb-idx">{idx + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="save-asset-top-row">
                            <div className="save-asset-preview-box">
                                <img src={items[0]?.dataUrl} alt="Preview" />
                            </div>
                            <div className="save-asset-meta">
                                {items[0]?.dimensions?.width > 0 && (
                                    <span className="save-asset-dim-badge">
                                        {items[0].dimensions.width} × {items[0].dimensions.height} px
                                    </span>
                                )}
                                <span className="save-asset-path-hint">
                                    Target: <code>src/assets/{category}/{items[0]?.filename || 'image'}.png</code>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Form Controls */}
                    <div className="save-asset-form">
                        <div className="save-asset-field">
                            <label>Apply Destination Category to All</label>
                            <div className="save-asset-category-grid">
                                {CATEGORIES.map(cat => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        className={`save-cat-btn ${category === cat.id ? 'active' : ''}`}
                                        onClick={() => handleCategoryChange(cat.id)}
                                    >
                                        <div className="cat-header-line">
                                            <span className="cat-icon">{cat.icon}</span>
                                            <span className="cat-name">{cat.label}</span>
                                        </div>
                                        <span className="cat-folder">{cat.folder}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Character Tag Selector */}
                        {category === 'characters' && (
                            <div className="save-asset-field">
                                <div className="save-asset-field-header">
                                    <label>Character Tag / Category for All</label>
                                    {!isCreatingTag && (
                                        <button
                                            type="button"
                                            className="save-asset-add-tag-trigger"
                                            onClick={() => {
                                                setIsCreatingTag(true);
                                                setNewTagError(null);
                                            }}
                                            title="Create new character category/tag"
                                        >
                                            + New Tag
                                        </button>
                                    )}
                                </div>

                                {isCreatingTag && (
                                    <div className="save-asset-new-tag-row">
                                        <input
                                            type="text"
                                            className="save-asset-new-tag-input"
                                            placeholder="e.g. Knight, Robot, Monster..."
                                            value={newTagInput}
                                            onChange={e => {
                                                setNewTagInput(e.target.value);
                                                if (newTagError) setNewTagError(null);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleCreateTag();
                                                } else if (e.key === 'Escape') {
                                                    setIsCreatingTag(false);
                                                    setNewTagInput('');
                                                    setNewTagError(null);
                                                }
                                            }}
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            className="save-asset-new-tag-btn add"
                                            onClick={handleCreateTag}
                                            disabled={!newTagInput.trim()}
                                        >
                                            Add
                                        </button>
                                        <button
                                            type="button"
                                            className="save-asset-new-tag-btn cancel"
                                            onClick={() => {
                                                setIsCreatingTag(false);
                                                setNewTagInput('');
                                                setNewTagError(null);
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {newTagError && (
                                    <div className="save-asset-tag-error">
                                        ⚠️ {newTagError}
                                    </div>
                                )}

                                <div className="save-asset-tag-pills">
                                    {getAllCharacterTags(customTags).map(tag => {
                                        const isCustom = !DEFAULT_CHARACTER_TAGS.some(d => d.id === tag.id);
                                        return (
                                            <div
                                                key={tag.id}
                                                className={`save-tag-pill-container ${characterTag === tag.id ? 'active' : ''}`}
                                            >
                                                <button
                                                    type="button"
                                                    className={`save-tag-pill ${characterTag === tag.id ? 'active' : ''} ${isCustom ? 'custom-tag' : ''}`}
                                                    onClick={() => handleCharacterTagChange(tag.id)}
                                                    title={isCustom ? `Custom character tag: ${tag.label}` : tag.label}
                                                >
                                                    {tag.label}
                                                </button>
                                                {isCustom && (
                                                    <button
                                                        type="button"
                                                        className="save-tag-delete-btn"
                                                        onClick={(e) => handleDeleteCustomTag(tag.id, e)}
                                                        title={`Delete tag "${tag.label}"`}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Object Tag Selector */}
                        {category === 'objects' && (
                            <div className="save-asset-field">
                                <label>Object Type / Prefix for All</label>
                                <div className="save-asset-tag-pills">
                                    {OBJECT_TAGS.map(tag => (
                                        <button
                                            type="button"
                                            key={tag.id}
                                            className={`save-tag-pill ${objectTag === tag.id ? 'active' : ''}`}
                                            onClick={() => handleObjectTagChange(tag.id)}
                                        >
                                            {tag.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Background Tag Selector */}
                        {category === 'backgrounds' && (
                            <div className="save-asset-field">
                                <label>Background Type / Prefix for All</label>
                                <div className="save-asset-tag-pills">
                                    {BACKGROUND_TAGS.map(tag => (
                                        <button
                                            type="button"
                                            key={tag.id}
                                            className={`save-tag-pill ${backgroundTag === tag.id ? 'active' : ''}`}
                                            onClick={() => handleBackgroundTagChange(tag.id)}
                                        >
                                            {tag.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Filenames list (Batch or Single) */}
                        {isBatch ? (
                            <div className="save-asset-field">
                                <label>Files ({items.length})</label>
                                <div className="batch-files-list">
                                    {items.map((item) => (
                                        <div key={item.id} className="batch-file-row">
                                            <div className="batch-file-thumb">
                                                <img src={item.dataUrl} alt="thumb" />
                                            </div>
                                            <div className="batch-file-input-wrap">
                                                <input
                                                    type="text"
                                                    value={item.filename}
                                                    onChange={e => handleItemFilenameChange(item.id, e.target.value)}
                                                    placeholder="filename"
                                                />
                                                <span className="ext-label">.png</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="batch-file-remove-btn"
                                                onClick={() => handleRemoveItem(item.id)}
                                                title="Remove file"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="save-asset-field">
                                <label>Filename</label>
                                <div className="save-asset-filename-input-group">
                                    <input
                                        type="text"
                                        value={items[0]?.filename || ''}
                                        onChange={e => handleItemFilenameChange(items[0]?.id, e.target.value)}
                                        placeholder="filename_without_ext"
                                        autoFocus
                                    />
                                    <span className="ext-label">.png</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="save-asset-error">
                                ⚠️ {error}
                            </div>
                        )}
                    </div>
                </div>

                <div className="save-asset-footer">
                    <button
                        type="button"
                        className="save-asset-btn-cancel"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="save-asset-btn-confirm"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving
                            ? `Saving (${saveProgress.current}/${saveProgress.total})...`
                            : isBatch
                                ? `💾 Save ${items.length} Images to ${CATEGORIES.find(c => c.id === category)?.label || 'Library'}`
                                : '💾 Save to Library'
                        }
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {createPortal(modalContent, document.body)}
            <ReplaceAssetModal
                isOpen={!!conflict}
                conflict={conflict}
                onReplace={handleConflictReplace}
                onKeepBoth={handleConflictKeepBoth}
                onCancel={handleConflictCancel}
            />
        </>
    );
};

export default SaveAssetModal;


