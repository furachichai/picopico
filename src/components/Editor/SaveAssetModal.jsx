import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './SaveAssetModal.css';

const CATEGORIES = [
    { id: 'characters', label: 'Characters', icon: '👤', folder: 'src/assets/characters' },
    { id: 'objects', label: 'Objects', icon: '📦', folder: 'src/assets/objects' },
    { id: 'backgrounds', label: 'Backgrounds', icon: '🌄', folder: 'src/assets/backgrounds' },
    { id: 'images', label: 'General', icon: '🖼️', folder: 'src/assets/images' },
];

const CHARACTER_TAGS = [
    { id: 'chef', label: 'Chef' },
    { id: 'pesto', label: 'Pesto' },
    { id: 'sales', label: 'Sales' },
    { id: 'dilla', label: 'Dilla' },
    { id: 'wizard', label: 'Wizard' },
    { id: 'yara', label: 'Yara' },
    { id: 'keep', label: 'Original Names' },
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

const getSavedCharacterTag = (fallback = 'chef') => {
    try {
        const saved = localStorage.getItem('picopico_last_save_character_tag');
        if (saved && CHARACTER_TAGS.some(t => t.id === saved)) {
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
const formatItemFilename = (rawName, category, characterTag, objectTag, backgroundTag) => {
    let clean = (rawName || 'asset').replace(/\.[^/.]+$/, '');
    clean = clean.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    // Strip previous tag prefixes
    CHARACTER_TAGS.forEach(t => {
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
    const { t } = useTranslation();
    const [category, setCategory] = useState('characters');
    const [characterTag, setCharacterTag] = useState('chef');
    const [objectTag, setObjectTag] = useState('whole');
    const [backgroundTag, setBackgroundTag] = useState('bkg');
    const [items, setItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, name: '' });
    const [error, setError] = useState(null);

    // Initialize items and tags on open
    useEffect(() => {
        if (!isOpen) return;

        const effectiveCategory = initialCategory || getSavedCategory('characters');
        const effectiveCharTag = getSavedCharacterTag('chef');
        const effectiveObjTag = getSavedObjectTag('whole');
        const effectiveBgTag = getSavedBackgroundTag('bkg');

        setCategory(effectiveCategory);
        setCharacterTag(effectiveCharTag);
        setObjectTag(effectiveObjTag);
        setBackgroundTag(effectiveBgTag);
        setError(null);
        setIsSaving(false);
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
            const targetName = formatItemFilename(rawName, effectiveCategory, effectiveCharTag, effectiveObjTag, effectiveBgTag);

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
    const handleCharacterTagChange = (tagId) => {
        setCharacterTag(tagId);
        try {
            localStorage.setItem('picopico_last_save_character_tag', tagId);
        } catch {}

        setItems(prev => prev.map(item => ({
            ...item,
            filename: formatItemFilename(item.originalName, category, tagId, objectTag)
        })));
    };

    // Update prefix when object tag changes
    const handleObjectTagChange = (tagId) => {
        setObjectTag(tagId);
        try {
            localStorage.setItem('picopico_last_save_object_tag', tagId);
        } catch {}

        setItems(prev => prev.map(item => ({
            ...item,
            filename: formatItemFilename(item.originalName, category, characterTag, tagId, backgroundTag)
        })));
    };

    // Update prefix when background tag changes
    const handleBackgroundTagChange = (tagId) => {
        setBackgroundTag(tagId);
        try {
            localStorage.setItem('picopico_last_save_background_tag', tagId);
        } catch {}

        setItems(prev => prev.map(item => ({
            ...item,
            filename: formatItemFilename(item.originalName, category, characterTag, objectTag, tagId)
        })));
    };

    // Handle category change (applies to all queued items)
    const handleCategoryChange = (newCat) => {
        setCategory(newCat);
        try {
            localStorage.setItem('picopico_last_save_category', newCat);
        } catch {}

        setItems(prev => prev.map(item => ({
            ...item,
            filename: formatItemFilename(item.originalName, newCat, characterTag, objectTag, backgroundTag)
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

    // Execute save for all items in batch
    const handleSave = async () => {
        if (!items || items.length === 0) return;

        // Check for empty filenames
        const hasEmpty = items.some(item => !item.filename || !item.filename.trim());
        if (hasEmpty) {
            setError('All files must have a valid filename');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            try {
                localStorage.setItem('picopico_last_save_category', category);
            } catch {}

            const savedResults = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                let finalName = item.filename.trim();
                if (!finalName.endsWith('.png') && !finalName.endsWith('.jpg') && !finalName.endsWith('.jpeg') && !finalName.endsWith('.webp') && !finalName.endsWith('.svg')) {
                    finalName += '.png';
                }

                setSaveProgress({
                    current: i + 1,
                    total: items.length,
                    name: finalName
                });

                const response = await fetch('/api/assets/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dataUrl: item.dataUrl,
                        filename: finalName,
                        category: category,
                        overwrite: false
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || `Failed saving ${finalName}`);
                }

                const result = await response.json();
                savedResults.push({
                    ...result,
                    dimensions: item.dimensions
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
                                <label>Character Tag / Prefix for All</label>
                                <div className="save-asset-tag-pills">
                                    {CHARACTER_TAGS.map(tag => (
                                        <button
                                            type="button"
                                            key={tag.id}
                                            className={`save-tag-pill ${characterTag === tag.id ? 'active' : ''}`}
                                            onClick={() => handleCharacterTagChange(tag.id)}
                                        >
                                            {tag.label}
                                        </button>
                                    ))}
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
                                    {items.map((item, idx) => (
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

    return createPortal(modalContent, document.body);
};

export default SaveAssetModal;


