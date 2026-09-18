import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './AssetLibrary.css';
import { useEditor } from '../../context/EditorContext';
import { ELEMENT_TYPES } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import SaveAssetModal from './SaveAssetModal';
import AssetInfoModal from './AssetInfoModal';
import ConfirmationModal from './ConfirmationModal';
import RecycleBinModal from './RecycleBinModal';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { getCustomCharacterTags, EVENT_CUSTOM_TAGS_CHANGED } from '../../utils/characterTags';

const CRATE_MAP = {
    '📦x': '/assets/balanza/crate_x.png',
    'x📦': '/assets/balanza/crate_x.png',
    'crate_x': '/assets/balanza/crate_x.png',
    '[x]': '/assets/balanza/crate_x.png',
    'x': '/assets/balanza/crate_x.png',
    '📦?': '/assets/balanza/crate_q.png',
    '?📦': '/assets/balanza/crate_q.png',
    'crate_q': '/assets/balanza/crate_q.png',
    '[?]': '/assets/balanza/crate_q.png',
    '?': '/assets/balanza/crate_q.png',
    '📦': '/assets/balanza/crate.png',
    'crate': '/assets/balanza/crate.png',
    'box': '/assets/balanza/crate.png'
};

const ASSETS = {
    emojis: [
        '📦', '📦x', '📦?', '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥥', '🥝',
        '⭐', '🌟', '✨', '🔥', '💎', '🪙', '💰', '🏆', '👑', '🎈', '🎉', '🎁', '🍕', '🍔', '🍟', '🍦', '🍩', '🍪',
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦',
        '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐢', '🐙', '🐬', '🐳',
        '❤️', '👍', '👏', '🎯', '🚀', '🌸', '🌻', '🍀', '🌈', '⚡'
    ],
    backgrounds: [
        '#ffffff', '#f0f0f0', '#ffcccc', '#ccffcc', '#ccccff', '#ffffcc', '#ffccff', '#ccffff', '#e5e5e5', '#333333', '#000000',
        'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)',
        'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
        'url("https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80")', // Gradient
        'url("https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80")', // Texture
        'url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80")', // Abstract
        'url("https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&q=80")', // Paint
        'url("https://images.unsplash.com/photo-1508614999368-9260051292e5?w=400&q=80")', // Light
        'url("https://images.unsplash.com/photo-1550147760-44c9966d6bc7?w=400&q=80")', // Water
        'url("https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=400&q=80")', // Space
        'url("https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&q=80")', // Nature
        'url("https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80")', // Mountain
        'url("https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80")', // City
        'url("https://images.unsplash.com/photo-1534239143101-1b1c627395c5?w=400&q=80")', // Texture 2
    ],
    gifs: [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1Z2J6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6/3o7TKSjRrfIPjeiVyM/giphy.gif', // Cat
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1Z2J6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6/l0HlHFRbmaZtBRhXG/giphy.gif', // Dog
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1Z2J6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6/3o7TKMt1VVNkHVyPaE/giphy.gif', // Dance
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1Z2J6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6/l0HlO3BJ8LALPW4sE/giphy.gif', // Party
    ]
};

// Load custom characters from src/assets/characters
const customCharacters = import.meta.glob('../../assets/characters/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });
const customCharacterList = Object.values(customCharacters);

// Load custom images from src/assets/images
const customImages = import.meta.glob('../../assets/images/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });
const customImageList = Object.values(customImages);

// Load custom graphics from src/assets/graphics
const customGraphics = import.meta.glob('../../assets/graphics/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });
const customGraphicsList = Object.values(customGraphics);

// Load custom objects from src/assets/objects and public/assets/objects
const customObjects = import.meta.glob('../../assets/objects/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });
const customObjectsListGlob = Object.values(customObjects);

const staticObjects = [
    '/assets/objects/broken_phone.png',
    '/assets/objects/phone_cases.png',
    '/assets/objects/shop_counter.png',
    '/assets/objects/shop_wall_display.png'
];

const filteredStaticObjects = staticObjects.filter(url => {
    const filename = url.split('/').pop();
    return !customObjectsListGlob.some(globPath => typeof globPath === 'string' && globPath.includes(filename));
});

const customObjectsList = [...filteredStaticObjects, ...customObjectsListGlob];

const combinedImageList = [...customCharacterList, ...customImageList, ...customGraphicsList, ...customObjectsList];

// Load custom backgrounds from src/assets/backgrounds
const customBackgrounds = import.meta.glob(['../../assets/backgrounds/*.{png,jpg,jpeg,svg,webp}', '../../assets/backgrounds/**/*.{png,jpg,jpeg,svg,webp}'], { eager: true, query: '?url', import: 'default' });
const customBackgroundList = Object.values(customBackgrounds);

export const isTitlecard = (src) => {
    if (!src) return false;
    const url = typeof src === 'object' ? src.default || '' : src;
    const normalized = url.toLowerCase();
    const filename = normalized.split('/').pop().split('?')[0];
    return (
        normalized.includes('/titlecards/') ||
        normalized.includes('/titlecard') ||
        filename.includes('titlecard') ||
        filename.includes('title_card') ||
        filename.includes('title-card') ||
        filename.startsWith('title_') ||
        filename.startsWith('titlecard')
    );
};

const classifyAsset = (src, customTags = []) => {
    if (!src) return 'other';
    const url = typeof src === 'object' ? src.default || '' : src;
    const filename = url.split('/').pop().toLowerCase();
    
    if (url.includes('/assets/objects/')) {
        return 'objects';
    }
    if (filename.includes('chef')) {
        return 'chef';
    }
    if (filename.includes('pesto') || filename.includes('pest') || filename.includes('robot') || filename.includes('juicer')) {
        return 'pesto';
    }
    if (filename.includes('sales') || filename.includes('alien') || filename.includes('salesman')) {
        return 'sales';
    }
    if (filename.includes('dilla') || filename.includes('tucu')) {
        return 'dilla';
    }
    if (filename.includes('wizard')) {
        return 'wizard';
    }
    if (filename.includes('yara')) {
        return 'yara';
    }
    // Check custom character tags
    for (const tag of customTags) {
        if (filename.includes(tag.id) || filename.includes(tag.id.replace(/_/g, ' '))) {
            return tag.id;
        }
    }
    if (
        filename.startsWith('whole_') || 
        filename.startsWith('part_') || 
        filename.includes('chili') || 
        filename.includes('soup') || 
        filename.includes('bowl') || 
        filename.includes('recipe') || 
        filename.includes('scroll') || 
        filename.includes('plate') || 
        filename.includes('knife') ||
        filename.includes('box') ||
        filename.includes('counter') ||
        filename.includes('cases') ||
        filename.includes('display')
    ) {
        return 'objects';
    }
    return 'other';
};

const DEFAULT_CATEGORIES = [
    { id: 'chef', name: 'Chef' },
    { id: 'pesto', name: 'Pesto' },
    { id: 'sales', name: 'Sales' },
    { id: 'dilla', name: 'Dilla' },
    { id: 'wizard', name: 'Wizard' },
    { id: 'yara', name: 'Yara' },
    { id: 'objects', name: 'Objects' },
    { id: 'other', name: 'Other' },
    { id: 'all', name: 'All' }
];

const AssetLibrary = ({ onClose, initialTab = 'custom', allowedTabs = null, onSelect = null }) => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(initialTab);
    const fileInputRef = useRef(null);
    const contentRef = useRef(null);

    const handleTabClick = (tab) => {
        if (activeTab === tab) {
            contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setActiveTab(tab);
            contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
        }
    };

    // Dynamic locally added / deleted assets and server disk assets
    const [locallyAdded, setLocallyAdded] = useState([]);
    const [deletedUrls, setDeletedUrls] = useState(new Set());
    const [serverAssets, setServerAssets] = useState(null);

    // Full-size object preview outside the library
    const [hoveredAsset, setHoveredAsset] = useState(null); // { url, filename, type }
    const [previewDimensions, setPreviewDimensions] = useState(null); // { width, height }
    const [previewPos, setPreviewPos] = useState({ side: 'left', top: 100, x: 20 });

    // Modal states
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalData, setSaveModalData] = useState({ items: [], initialCategory: 'characters' });
    const [infoModalAsset, setInfoModalAsset] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [recycleModalOpen, setRecycleModalOpen] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    // Custom character tags state and sync
    const [customTags, setCustomTags] = useState(() => getCustomCharacterTags());

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

    const libraryCategories = useMemo(() => {
        const base = DEFAULT_CATEGORIES.filter(c => !['objects', 'other', 'all'].includes(c.id));
        const custom = customTags.map(t => ({ id: t.id, name: t.label }));
        return [
            ...base,
            ...custom,
            { id: 'objects', name: 'Objects' },
            { id: 'other', name: 'Other' },
            { id: 'all', name: 'All' }
        ];
    }, [customTags]);

    // Persist last selected image category tag
    const savedTag = (() => {
        try {
            return localStorage.getItem('picopico_last_image_tag') || 'all';
        } catch {
            return 'all';
        }
    })();
    const [activeSubCategory, setActiveSubCategory] = useState(() => {
        const initialCustom = getCustomCharacterTags();
        const allValid = [
            ...DEFAULT_CATEGORIES,
            ...initialCustom.map(t => ({ id: t.id, name: t.label }))
        ];
        return allValid.some(c => c.id === savedTag) ? savedTag : 'all';
    });

    // Reset to 'all' if activeSubCategory was deleted
    useEffect(() => {
        if (activeSubCategory !== 'all' && !libraryCategories.some(c => c.id === activeSubCategory)) {
            setActiveSubCategory('all');
        }
    }, [libraryCategories, activeSubCategory]);

    const handleSubCategoryChange = (catId) => {
        const isSame = activeSubCategory === catId;
        setActiveSubCategory(catId);
        contentRef.current?.scrollTo({ top: 0, behavior: isSame ? 'smooth' : 'auto' });
        try {
            localStorage.setItem('picopico_last_image_tag', catId);
        } catch {
            // ignore
        }
    };

    const savedBgTag = (() => {
        try {
            return localStorage.getItem('picopico_last_bg_tag') || 'all';
        } catch {
            return 'all';
        }
    })();
    const [activeBgSubCategory, setActiveBgSubCategory] = useState(savedBgTag);

    const handleBgSubCategoryChange = (catId) => {
        const isSame = activeBgSubCategory === catId;
        setActiveBgSubCategory(catId);
        contentRef.current?.scrollTo({ top: 0, behavior: isSame ? 'smooth' : 'auto' });
        try {
            localStorage.setItem('picopico_last_bg_tag', catId);
        } catch {}
    };

    // Live asset sync from server
    const fetchServerAssets = useCallback(async () => {
        try {
            const res = await fetch('/api/assets/list');
            if (res.ok) {
                const data = await res.json();
                if (data.assets) {
                    setServerAssets({
                        ...data.assets,
                        assetMeta: data.assetMeta || {}
                    });
                }
            }
        } catch (err) {
            console.warn('Could not fetch server assets:', err);
        }
    }, []);

    useEffect(() => {
        fetchServerAssets();
        const handleSaved = () => {
            fetchServerAssets();
        };
        window.addEventListener('picopico-asset-saved', handleSaved);
        return () => window.removeEventListener('picopico-asset-saved', handleSaved);
    }, [fetchServerAssets]);

    const { popupRef, dragHandlers, style } = useDraggable('assetLibrary');

    // Calculate outside-library preview position based on current popupRef position
    useEffect(() => {
        if (!hoveredAsset) {
            setPreviewDimensions(null);
            return;
        }

        if (popupRef.current) {
            const rect = popupRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const spaceOnLeft = rect.left;
            const spaceOnRight = viewportWidth - rect.right;

            let side = 'left';
            let x = 20;

            if (spaceOnLeft >= 320 || spaceOnLeft >= spaceOnRight) {
                side = 'left';
                x = Math.max(16, rect.left - 16);
            } else {
                side = 'right';
                x = Math.min(viewportWidth - 16, rect.right + 16);
            }

            const top = Math.max(16, Math.min(viewportHeight - 340, rect.top));
            setPreviewPos({ side, top, x });
        }
    }, [hoveredAsset]);

    useEffect(() => {
        setHoveredAsset(null);
    }, [activeTab, activeSubCategory, activeBgSubCategory]);

    // Find last background data
    const getLastBackground = () => {
        if (state.lastAppliedBackground?.background) {
            return state.lastAppliedBackground;
        }
        try {
            const saved = localStorage.getItem('picopico_last_background');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.background) return parsed;
            }
        } catch {
            // ignore
        }
        const currentIdx = state.lesson?.slides?.findIndex(s => s.id === state.currentSlideId);
        if (currentIdx !== undefined && currentIdx >= 0) {
            for (let i = currentIdx - 1; i >= 0; i--) {
                const s = state.lesson.slides[i];
                if (s.background) {
                    return { background: s.background, backgroundSettings: s.backgroundSettings ? { ...s.backgroundSettings } : {} };
                }
            }
            for (const s of (state.lesson?.slides || [])) {
                if (s.background) {
                    return { background: s.background, backgroundSettings: s.backgroundSettings ? { ...s.backgroundSettings } : {} };
                }
            }
        }
        return null;
    };

    const lastBg = getLastBackground();

    const handleApplyLastBackground = () => {
        if (!lastBg || !lastBg.background) return;

        if (onSelect) {
            onSelect(lastBg.background);
        } else {
            dispatch({ type: 'APPLY_LAST_BACKGROUND', payload: lastBg });
        }
        onClose();
    };

    // Close on tap / click outside
    useEffect(() => {
        const handleOutsideClick = (e) => {
            // Never close library if any sub-modal is open
            if (deleteTarget || saveModalOpen || infoModalAsset || recycleModalOpen) return;

            if (popupRef.current && !popupRef.current.contains(e.target)) {
                if (e.target?.closest?.('.toolbar-btn, .btn-secondary, .btn-primary, .save-asset-modal, .save-asset-modal-overlay, .asset-info-modal, .asset-info-modal-overlay, .confirmation-modal, .confirmation-modal-overlay, .recycle-modal, .recycle-modal-overlay')) return;
                onClose();
            }
        };
        const timer = setTimeout(() => {
            window.addEventListener('pointerdown', handleOutsideClick);
        }, 50);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('pointerdown', handleOutsideClick);
        };
    }, [onClose, deleteTarget, saveModalOpen, infoModalAsset, recycleModalOpen]);

    const showTab = (tabName) => {
        if (!allowedTabs) return true;
        return allowedTabs.includes(tabName);
    };

    const handleSelect = (item) => {
        setHoveredAsset(null);
        if (onSelect) {
            onSelect(item);
            onClose();
            return;
        }

        if (activeTab === 'backgrounds' || activeTab === 'custom-bg') {
            const finalPayload = item.includes('url(') || item.startsWith('#') || item.startsWith('linear-gradient') ? item : `url("${item}")`;
            dispatch({ type: 'UPDATE_SLIDE_BACKGROUND', payload: finalPayload });
            onClose();
        } else if (activeTab === 'gifs' || activeTab === 'custom' || activeTab === 'custom-objects') {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 1;
                const targetWidthPercent = 40;
                const targetWidthPx = 360 * (targetWidthPercent / 100);
                const targetHeightPx = targetWidthPx / aspectRatio;
                const targetHeightPercent = (targetHeightPx / 640) * 100;

                dispatch({
                    type: 'ADD_ELEMENT',
                    payload: {
                        type: ELEMENT_TYPES.IMAGE,
                        content: item,
                        metadata: {
                            width: targetWidthPercent,
                            height: targetHeightPercent,
                            ...(activeTab === 'gifs' && { isGif: true }),
                            ...(activeTab === 'custom' && { category: 'characters' }),
                            ...(activeTab === 'custom-objects' && { category: 'objects' })
                        }
                    }
                });
                onClose();
            };
            img.onerror = () => {
                dispatch({
                    type: 'ADD_ELEMENT',
                    payload: {
                        type: ELEMENT_TYPES.IMAGE,
                        content: item,
                        metadata: {
                            width: 40,
                            height: 40,
                            ...(activeTab === 'gifs' && { isGif: true }),
                            ...(activeTab === 'custom' && { category: 'characters' }),
                            ...(activeTab === 'custom-objects' && { category: 'objects' })
                        }
                    }
                });
                onClose();
            };
            img.src = item;
        } else {
            // Emojis
            dispatch({
                type: 'ADD_ELEMENT',
                payload: { type: ELEMENT_TYPES.TEXT, content: item, metadata: { fontSize: '4rem' } }
            });
            onClose();
        }
    };

    // Open file upload / save modal (supports batch files with duplicate checking)
    const handleFilesChosen = async (fileList) => {
        if (!fileList || fileList.length === 0) return;
        const validFiles = Array.from(fileList).filter(f => f && f.type && f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        // Check for duplicates against existing library assets (by matching filename and filesize)
        const duplicateFiles = [];
        const nonDuplicateFiles = [];

        validFiles.forEach(file => {
            const rawName = file.name;
            const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const meta = serverAssets?.assetMeta?.[rawName] || serverAssets?.assetMeta?.[cleanName];
            if (meta && meta.size === file.size) {
                duplicateFiles.push(file);
            } else {
                nonDuplicateFiles.push(file);
            }
        });

        if (duplicateFiles.length > 0) {
            if (nonDuplicateFiles.length === 0) {
                // All files are duplicates
                alert(
                    duplicateFiles.length === 1
                        ? `"${duplicateFiles[0].name}" already exists in the library with the exact same file size (${duplicateFiles[0].size} bytes). Import skipped.`
                        : `All ${duplicateFiles.length} files already exist in the library with matching filenames and file sizes. Import skipped.`
                );
                return;
            } else {
                // In a batch import, only duplicates are not imported, the rest are imported as expected
                alert(
                    `Skipped ${duplicateFiles.length} duplicate file(s) already in the library (${duplicateFiles.map(f => f.name).join(', ')}).\nImporting remaining ${nonDuplicateFiles.length} new file(s).`
                );
            }
        }

        const filesToProcess = nonDuplicateFiles;
        if (filesToProcess.length === 0) return;

        let savedCat = null;
        try {
            savedCat = localStorage.getItem('picopico_last_save_category');
        } catch {
            // ignore
        }

        let defCategory = savedCat || 'characters';
        if (activeTab === 'custom-objects') {
            defCategory = 'objects';
        } else if (activeTab === 'custom-bg') {
            defCategory = 'backgrounds';
        } else if (activeTab === 'custom') {
            if (activeSubCategory === 'objects') {
                defCategory = 'objects';
            } else if (savedCat) {
                defCategory = savedCat;
            } else if (activeSubCategory !== 'all' && activeSubCategory !== 'other') {
                defCategory = 'characters';
            }
        }

        // Read all images to data URLs
        const readPromises = filesToProcess.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        dataUrl: e.target.result,
                        filename: file.name
                    });
                };
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        });

        const items = (await Promise.all(readPromises)).filter(Boolean);
        if (items.length === 0) return;

        setSaveModalData({
            items,
            initialCategory: defCategory
        });
        setSaveModalOpen(true);
    };

    const handleSaveSuccess = (savedResult) => {
        setSaveModalOpen(false);
        const results = Array.isArray(savedResult) ? savedResult : (savedResult ? [savedResult] : []);
        const newUrls = results.filter(r => !r.skipped).map(r => r.url).filter(Boolean);
        if (newUrls.length > 0) {
            setLocallyAdded(prev => [...newUrls, ...prev]);

            // If user imported objects while on the custom images tab, switch to Objects subcategory pill
            const savedCategory = results[0]?.category;
            const charTag = results[0]?.characterTag;
            if (savedCategory === 'objects' && activeTab === 'custom') {
                handleSubCategoryChange('objects');
            } else if (savedCategory === 'characters' && charTag && charTag !== 'keep' && activeTab === 'custom') {
                handleSubCategoryChange(charTag);
            }
        }
    };

    // Delete asset handler
    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        const targetSrc = deleteTarget.src;

        try {
            const res = await fetch('/api/assets/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetSrc })
            });

            if (res.ok) {
                setDeletedUrls(prev => new Set([...prev, targetSrc]));
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Could not delete asset: ${err.error || 'Server error'}`);
            }
        } catch (e) {
            console.error('Error deleting asset:', e);
            alert(`Delete failed: ${e.message}`);
        } finally {
            setDeleteTarget(null);
            if (infoModalAsset === targetSrc) {
                setInfoModalAsset(null);
            }
        }
    };

    // Helper to merge and deduplicate assets by basename
    const mergeWithServer = useCallback((staticList, serverList = []) => {
        const map = new Map();
        for (const url of staticList) {
            const src = typeof url === 'object' ? url?.default || '' : url;
            const fname = src ? src.split('/').pop().split('?')[0] : '';
            if (fname) map.set(fname, src);
        }
        for (const url of serverList) {
            const fname = url ? url.split('/').pop().split('?')[0] : '';
            if (fname) map.set(fname, url);
        }
        for (const url of locallyAdded) {
            const fname = url ? url.split('/').pop().split('?')[0] : '';
            if (fname) map.set(fname, url);
        }
        return Array.from(map.values());
    }, [locallyAdded]);

    // Filter combined list by deletions and additions
    const allImages = mergeWithServer(combinedImageList, serverAssets?.allImages).filter(url => !deletedUrls.has(url));
    const allBackgrounds = mergeWithServer(customBackgroundList, serverAssets?.allBackgrounds).filter(url => !deletedUrls.has(url));
    const titlecardBackgrounds = allBackgrounds.filter(src => isTitlecard(src));
    const sceneBackgrounds = allBackgrounds.filter(src => !isTitlecard(src));
    const allObjects = mergeWithServer(customObjectsList, serverAssets?.allObjects).filter(url => !deletedUrls.has(url));

    const maxPreviewWidth = previewPos.side === 'left'
        ? Math.max(180, previewPos.x - 32)
        : Math.max(180, (typeof window !== 'undefined' ? window.innerWidth : 1200) - previewPos.x - 32);

    return (
        <>
        <div
            ref={popupRef}
            style={style}
            className={`asset-library ${allowedTabs && allowedTabs.includes('custom-bg') ? 'bg-library' : ''} ${isDraggingOver ? 'dragging-over' : ''}`}
            onDragOver={(e) => {
                if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    setIsDraggingOver(true);
                }
            }}
            onDragLeave={(e) => {
                if (popupRef.current && !popupRef.current.contains(e.relatedTarget)) {
                    setIsDraggingOver(false);
                }
            }}
            onDrop={(e) => {
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    handleFilesChosen(e.dataTransfer.files);
                }
            }}
        >
            <div className="library-header" {...dragHandlers}>
                <div className="library-header-left">
                    <h3>{t('library.title')}</h3>
                    <button
                        type="button"
                        className="library-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload image(s) to project folder"
                    >
                        <span>+</span> Upload
                    </button>
                    <button
                        type="button"
                        className="library-recycle-btn"
                        onClick={() => setRecycleModalOpen(true)}
                        title="Recycle Bin (Restore deleted assets)"
                    >
                        <span>♻️</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFilesChosen(e.target.files);
                                e.target.value = '';
                            }
                        }}
                    />
                </div>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="library-tabs">
                {showTab('custom') && (
                    <button
                        className={activeTab === 'custom' ? 'active' : ''}
                        onClick={() => handleTabClick('custom')}
                    >
                        {t('library.imgs')}
                    </button>
                )}
                {showTab('custom-objects') && (
                    <button
                        className={activeTab === 'custom-objects' ? 'active' : ''}
                        onClick={() => handleTabClick('custom-objects')}
                    >
                        {t('library.objects')}
                    </button>
                )}
                {showTab('custom-bg') && (
                    <button
                        className={activeTab === 'custom-bg' ? 'active' : ''}
                        onClick={() => handleTabClick('custom-bg')}
                    >
                        {t('library.bkgs')}
                    </button>
                )}
                {showTab('emojis') && (
                    <button
                        className={activeTab === 'emojis' ? 'active' : ''}
                        onClick={() => handleTabClick('emojis')}
                    >
                        {t('library.emojis')}
                    </button>
                )}
                {showTab('backgrounds') && (
                    <button
                        className={activeTab === 'backgrounds' ? 'active' : ''}
                        onClick={() => handleTabClick('backgrounds')}
                    >
                        {t('library.colors')}
                    </button>
                )}
                {showTab('gifs') && (
                    <button
                        className={activeTab === 'gifs' ? 'active' : ''}
                        onClick={() => handleTabClick('gifs')}
                    >
                        {t('library.gifs')}
                    </button>
                )}
            </div>

            <div className="library-content" ref={contentRef} onScroll={() => setHoveredAsset(null)}>
                {(activeTab === 'custom-bg' || activeTab === 'backgrounds') && (
                    <div className="library-last-bg-bar">
                        <button
                            type="button"
                            className={`last-bg-btn ${!lastBg ? 'disabled' : ''}`}
                            onClick={handleApplyLastBackground}
                            disabled={!lastBg}
                            title={lastBg ? "Apply last background with its customized settings" : "No previous background available"}
                        >
                            <div className="last-bg-btn-left">
                                <span className="last-bg-badge">LAST</span>
                                <div className="last-bg-preview-wrapper">
                                    {lastBg?.background ? (
                                        (lastBg.background.includes('url') || lastBg.background.includes('gradient')) ? (
                                            <div className="last-bg-thumb">
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0, left: 0, width: '100%', height: '100%',
                                                        backgroundImage: resolveAssetUrl(lastBg.background),
                                                        backgroundSize: lastBg.backgroundSettings?.sizeMode === 'custom'
                                                            ? `${lastBg.backgroundSettings?.size ?? 100}%`
                                                            : (lastBg.backgroundSettings?.sizeMode || 'cover'),
                                                        backgroundPosition: `${lastBg.backgroundSettings?.positionX ?? 50}% ${lastBg.backgroundSettings?.positionY ?? 50}%`,
                                                        backgroundRepeat: 'no-repeat',
                                                        opacity: lastBg.backgroundSettings?.opacity ?? 1,
                                                        filter: `grayscale(${lastBg.backgroundSettings?.grayscale ? 100 : 0}%) brightness(${lastBg.backgroundSettings?.brightness ?? 100}%) blur(${lastBg.backgroundSettings?.blur ?? 0}px)`,
                                                        transform: `scale(${(lastBg.backgroundSettings?.flipX ? -1 : 1) * ((lastBg.backgroundSettings?.blur ?? 0) > 0 ? 1.05 : 1)}, ${(lastBg.backgroundSettings?.flipY ? -1 : 1) * ((lastBg.backgroundSettings?.blur ?? 0) > 0 ? 1.05 : 1)})`
                                                    }}
                                                />
                                                {lastBg.backgroundSettings?.grayscale && lastBg.backgroundSettings?.tintColor && lastBg.backgroundSettings.tintColor !== 'transparent' && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0, left: 0, width: '100%', height: '100%',
                                                            backgroundColor: lastBg.backgroundSettings.tintColor,
                                                            mixBlendMode: 'color'
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="last-bg-thumb" style={{ backgroundColor: lastBg.background }} />
                                        )
                                    ) : (
                                        <div className="last-bg-thumb empty" />
                                    )}
                                </div>
                                <div className="last-bg-text-col">
                                    <span className="last-bg-title">Apply Last Background</span>
                                    <span className="last-bg-subtitle">
                                        {lastBg ? 'Includes customized scale, position & filters' : 'No previous background recorded'}
                                    </span>
                                </div>
                            </div>
                            <span className="last-bg-action-icon">⚡</span>
                        </button>
                    </div>
                )}

                {activeTab === 'custom' && (
                    <div className="library-subcategories">
                        {libraryCategories.map(cat => (
                            <button
                                key={cat.id}
                                className={`subcategory-pill ${activeSubCategory === cat.id ? 'active' : ''}`}
                                onClick={() => handleSubCategoryChange(cat.id)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'custom-bg' && (
                    <div className="library-subcategories bg-subcategories">
                        {[
                            { id: 'all', name: 'All' },
                            { id: 'titlecards', name: '🎬 Titlecards' },
                            { id: 'scenes', name: '🌄 Scenes' },
                        ].map(cat => (
                            <button
                                key={cat.id}
                                className={`subcategory-pill ${activeBgSubCategory === cat.id ? 'active' : ''}`}
                                onClick={() => handleBgSubCategoryChange(cat.id)}
                            >
                                {cat.name} {cat.id === 'all' ? `(${allBackgrounds.length})` : (cat.id === 'titlecards' ? `(${titlecardBackgrounds.length})` : `(${sceneBackgrounds.length})`)}
                            </button>
                        ))}
                    </div>
                )}

                <div className="assets-grid">
                    {activeTab === 'custom' && (() => {
                        const filtered = allImages.filter(src => {
                            if (activeSubCategory === 'all') return true;
                            return classifyAsset(src, customTags) === activeSubCategory;
                        });
                        return filtered.length > 0 ? (
                            filtered.map((src, index) => {
                                const filename = src.split('/').pop();
                                return (
                                    <div
                                        key={`${src}-${index}`}
                                        className="asset-item custom"
                                        draggable
                                        onMouseEnter={() => setHoveredAsset({ url: src, filename })}
                                        onMouseLeave={() => setHoveredAsset(null)}
                                        onDragStart={(e) => {
                                            setHoveredAsset(null);
                                            e.dataTransfer.setData('text/plain', src);
                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                                type: 'image',
                                                src,
                                                category: activeTab === 'custom' ? 'characters' : (activeTab === 'custom-objects' ? 'objects' : undefined)
                                            }));
                                        }}
                                        onClick={() => handleSelect(src)}
                                    >
                                        <img src={src} alt="character" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        <div className="asset-item-actions" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className="asset-action-btn info-btn"
                                                title="View asset info"
                                                onClick={() => setInfoModalAsset(src)}
                                            >
                                                ℹ️
                                            </button>
                                            <button
                                                type="button"
                                                className="asset-action-btn delete-btn"
                                                title="Delete asset"
                                                onClick={() => setDeleteTarget({ src, filename })}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#666' }}>
                                No images found in this category.<br />
                                Click <strong>+ Upload</strong> or drop images here.
                            </div>
                        );
                    })()}

                    {activeTab === 'custom-objects' && (
                        allObjects.length > 0 ? (
                            allObjects.map((src, index) => {
                                const filename = src.split('/').pop();
                                return (
                                    <div
                                        key={`${src}-${index}`}
                                        className="asset-item custom"
                                        draggable
                                        onMouseEnter={() => setHoveredAsset({ url: src, filename })}
                                        onMouseLeave={() => setHoveredAsset(null)}
                                        onDragStart={(e) => {
                                            setHoveredAsset(null);
                                            e.dataTransfer.setData('text/plain', src);
                                            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'image', src }));
                                        }}
                                        onClick={() => handleSelect(src)}
                                    >
                                        <img src={src} alt="object" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        <div className="asset-item-actions" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className="asset-action-btn info-btn"
                                                title="View asset info"
                                                onClick={() => setInfoModalAsset(src)}
                                            >
                                                ℹ️
                                            </button>
                                            <button
                                                type="button"
                                                className="asset-action-btn delete-btn"
                                                title="Delete asset"
                                                onClick={() => setDeleteTarget({ src, filename })}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#666' }}>
                                No objects found. <br />
                                Click <strong>+ Upload</strong> or drop images into <code>src/assets/objects</code>
                            </div>
                        )
                    )}

                    {activeTab === 'custom-bg' && (() => {
                        const showTitlecards = activeBgSubCategory === 'all' || activeBgSubCategory === 'titlecards';
                        const showScenes = activeBgSubCategory === 'all' || activeBgSubCategory === 'scenes';

                        if (allBackgrounds.length === 0) {
                            return (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#666' }}>
                                    {t('library.noBackgrounds')} <br />
                                    Click <strong>+ Upload</strong> or drop images into <code>src/assets/backgrounds</code>
                                </div>
                            );
                        }

                        const renderBgItem = (src, index, isTc = false) => {
                            const filename = src.split('/').pop();
                            return (
                                <div
                                    key={`${src}-${index}`}
                                    className={`asset-item custom-bg ${isTc ? 'titlecard-item' : ''}`}
                                    onMouseEnter={() => setHoveredAsset({ url: src, filename })}
                                    onMouseLeave={() => setHoveredAsset(null)}
                                    onClick={() => handleSelect(src)}
                                    title={filename}
                                >
                                    <img
                                        src={src}
                                        alt={isTc ? "titlecard" : "background"}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                    />
                                    {isTc && (
                                        <span className="titlecard-badge">🎬 TITLECARD</span>
                                    )}
                                    <div className="asset-item-actions" onClick={e => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            className="asset-action-btn info-btn"
                                            title="View asset info"
                                            onClick={() => setInfoModalAsset(src)}
                                        >
                                            ℹ️
                                        </button>
                                        <button
                                            type="button"
                                            className="asset-action-btn delete-btn"
                                            title="Delete asset"
                                            onClick={() => setDeleteTarget({ src, filename })}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <>
                                {showTitlecards && (
                                    <>
                                        <div className="bg-section-header titlecards-header">
                                            <div className="bg-section-title-wrap">
                                                <span className="bg-section-icon">🎬</span>
                                                <div className="bg-section-text-col">
                                                    <span className="bg-section-title">Titlecards</span>
                                                    <span className="bg-section-desc">First slide openers & lesson announcements</span>
                                                </div>
                                            </div>
                                            <span className="bg-section-counter">{titlecardBackgrounds.length}</span>
                                        </div>
                                        {titlecardBackgrounds.length > 0 ? (
                                            titlecardBackgrounds.map((src, idx) => renderBgItem(src, idx, true))
                                        ) : (
                                            <div className="bg-section-empty">
                                                No titlecards found yet.<br />
                                                Click <strong>+ Upload</strong> and choose Titlecard, or add images with <em>titlecard</em> in their filename.
                                            </div>
                                        )}
                                    </>
                                )}

                                {showScenes && (
                                    <>
                                        {activeBgSubCategory === 'all' && (
                                            <div className="bg-section-header scenes-header">
                                                <div className="bg-section-title-wrap">
                                                    <span className="bg-section-icon">🌄</span>
                                                    <div className="bg-section-text-col">
                                                        <span className="bg-section-title">Backgrounds & Sceneries</span>
                                                        <span className="bg-section-desc">Standard slide backgrounds & textures</span>
                                                    </div>
                                                </div>
                                                <span className="bg-section-counter">{sceneBackgrounds.length}</span>
                                            </div>
                                        )}
                                        {sceneBackgrounds.map((src, idx) => renderBgItem(src, idx, false))}
                                    </>
                                )}
                            </>
                        );
                    })()}

                    {activeTab === 'emojis' && ASSETS.emojis.map((item, index) => (
                        <div
                            key={index}
                            className="asset-item emojis"
                            onClick={() => handleSelect(item)}
                            title={item}
                        >
                            {CRATE_MAP[item] ? (
                                <img
                                    src={CRATE_MAP[item]}
                                    alt={item}
                                    style={{ width: '60%', height: '60%', objectFit: 'contain', pointerEvents: 'none' }}
                                />
                            ) : (
                                item
                            )}
                        </div>
                    ))}

                    {activeTab === 'backgrounds' && ASSETS.backgrounds.map((item, index) => (
                        <div
                            key={index}
                            className="asset-item backgrounds"
                            onClick={() => handleSelect(item)}
                            style={{ background: item }}
                        />
                    ))}

                    {activeTab === 'gifs' && ASSETS.gifs.map((item, index) => {
                        const filename = item.split('/').pop();
                        return (
                            <div
                                key={index}
                                className="asset-item gifs"
                                onMouseEnter={() => setHoveredAsset({ url: item, filename })}
                                onMouseLeave={() => setHoveredAsset(null)}
                                onClick={() => handleSelect(item)}
                            >
                                <img src={item} alt="gif" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Save Asset Modal */}
            <SaveAssetModal
                isOpen={saveModalOpen}
                items={saveModalData.items}
                initialCategory={saveModalData.initialCategory}
                onSave={handleSaveSuccess}
                onCancel={() => setSaveModalOpen(false)}
            />

            {/* Info Modal */}
            <AssetInfoModal
                isOpen={!!infoModalAsset}
                src={infoModalAsset}
                onClose={() => setInfoModalAsset(null)}
                onDeleteRequest={(src, filename) => {
                    setDeleteTarget({ src, filename });
                }}
                onCategoryChanged={(data) => {
                    // Update list
                    if (data?.newUrl) {
                        setLocallyAdded(prev => [data.newUrl, ...prev.filter(u => u !== infoModalAsset)]);
                    }
                }}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteTarget}
                message={`Are you sure you want to delete "${deleteTarget?.filename || 'this asset'}" from the project library?`}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                confirmText="Delete"
                cancelText="Keep"
            />

            {/* Recycle Bin / Trash Modal */}
            <RecycleBinModal
                isOpen={recycleModalOpen}
                onClose={() => setRecycleModalOpen(false)}
                onAssetRestored={(restored) => {
                    if (restored?.restoredUrl) {
                        setDeletedUrls(prev => {
                            const next = new Set(prev);
                            next.delete(restored.restoredUrl);
                            for (const u of next) {
                                if (u.includes(restored.filename)) {
                                    next.delete(u);
                                }
                            }
                            return next;
                        });
                        setLocallyAdded(prev => [restored.restoredUrl, ...prev.filter(u => u !== restored.restoredUrl)]);
                    }
                }}
            />
        </div>

        {/* Full-size object preview outside the library */}
        {hoveredAsset && (
            <div
                className={`asset-library-preview-outside ${previewPos.side}`}
                style={{
                    top: `${previewPos.top}px`,
                    maxWidth: `${maxPreviewWidth}px`,
                    ...(previewPos.side === 'left'
                        ? { right: `calc(100vw - ${previewPos.x}px)` }
                        : { left: `${previewPos.x}px` })
                }}
            >
                <div className="preview-image-container">
                    <img
                        src={hoveredAsset.url}
                        alt={hoveredAsset.filename || "asset preview"}
                        onLoad={(e) => {
                            setPreviewDimensions({
                                width: e.target.naturalWidth,
                                height: e.target.naturalHeight
                            });
                        }}
                    />
                </div>
                <div className="preview-meta-badge">
                    <span className="preview-filename" title={hoveredAsset.filename}>
                        {hoveredAsset.filename}
                    </span>
                    {previewDimensions && (
                        <span className="preview-resolution">
                            {previewDimensions.width} × {previewDimensions.height} px
                        </span>
                    )}
                </div>
            </div>
        )}
        </>
    );
};

export default AssetLibrary;
