import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const ASSETS = {
    emojis: [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', 'cow', 'pig', 'frog', 'monkey', 'chicken', 'penguin', 'bird', 'duck', 'eagle', 'owl', 'bat', 'wolf', 'boar', 'horse', 'unicorn',
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
const customBackgrounds = import.meta.glob('../../assets/backgrounds/*.{png,jpg,jpeg,svg,webp}', { eager: true, query: '?url', import: 'default' });
const customBackgroundList = Object.values(customBackgrounds);

const classifyAsset = (src) => {
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

const CATEGORIES = [
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

    // Modal states
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalData, setSaveModalData] = useState({ items: [], initialCategory: 'characters' });
    const [infoModalAsset, setInfoModalAsset] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [recycleModalOpen, setRecycleModalOpen] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    // Persist last selected image category tag
    const savedTag = (() => {
        try {
            return localStorage.getItem('picopico_last_image_tag') || 'all';
        } catch {
            return 'all';
        }
    })();
    const [activeSubCategory, setActiveSubCategory] = useState(() => {
        return CATEGORIES.some(c => c.id === savedTag) ? savedTag : 'all';
    });

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

    // Live asset sync from server
    const fetchServerAssets = useCallback(async () => {
        try {
            const res = await fetch('/api/assets/list');
            if (res.ok) {
                const data = await res.json();
                if (data.assets) {
                    setServerAssets(data.assets);
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

    // Open file upload / save modal (supports batch files)
    const handleFilesChosen = async (fileList) => {
        if (!fileList || fileList.length === 0) return;
        const validFiles = Array.from(fileList).filter(f => f && f.type && f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

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
        const readPromises = validFiles.map(file => {
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
        const newUrls = results.map(r => r.url).filter(Boolean);
        if (newUrls.length > 0) {
            setLocallyAdded(prev => [...newUrls, ...prev]);

            // If user imported objects while on the custom images tab, switch to Objects subcategory pill
            const savedCategory = results[0]?.category;
            if (savedCategory === 'objects' && activeTab === 'custom') {
                handleSubCategoryChange('objects');
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
    const allObjects = mergeWithServer(customObjectsList, serverAssets?.allObjects).filter(url => !deletedUrls.has(url));

    return (
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

            <div className="library-content" ref={contentRef}>
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
                        {CATEGORIES.map(cat => (
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

                <div className="assets-grid">
                    {activeTab === 'custom' && (() => {
                        const filtered = allImages.filter(src => {
                            if (activeSubCategory === 'all') return true;
                            return classifyAsset(src) === activeSubCategory;
                        });
                        return filtered.length > 0 ? (
                            filtered.map((src, index) => {
                                const filename = src.split('/').pop();
                                return (
                                    <div
                                        key={`${src}-${index}`}
                                        className="asset-item custom"
                                        draggable
                                        onDragStart={(e) => {
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
                                        onDragStart={(e) => {
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

                    {activeTab === 'custom-bg' && (
                        allBackgrounds.length > 0 ? (
                            allBackgrounds.map((src, index) => {
                                const filename = src.split('/').pop();
                                return (
                                    <div
                                        key={`${src}-${index}`}
                                        className="asset-item custom-bg"
                                        onClick={() => handleSelect(src)}
                                    >
                                        <img src={src} alt="background" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
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
                                {t('library.noBackgrounds')} <br />
                                Click <strong>+ Upload</strong> or drop images into <code>src/assets/backgrounds</code>
                            </div>
                        )
                    )}

                    {activeTab === 'emojis' && ASSETS.emojis.map((item, index) => (
                        <div
                            key={index}
                            className="asset-item emojis"
                            onClick={() => handleSelect(item)}
                        >
                            {item}
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

                    {activeTab === 'gifs' && ASSETS.gifs.map((item, index) => (
                        <div
                            key={index}
                            className="asset-item gifs"
                            onClick={() => handleSelect(item)}
                        >
                            <img src={item} alt="gif" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                        </div>
                    ))}
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
    );
};

export default AssetLibrary;
