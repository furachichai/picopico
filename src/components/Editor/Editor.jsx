import React, { useState, useEffect, useRef } from 'react';
import { Disc } from 'lucide-react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import AssetLibrary from './AssetLibrary';
import './Editor.css';
import { useEditor } from '../../context/EditorContext';

import ContextualMenu from './ContextualMenu';
import BurgerMenu from './BurgerMenu';
import LessonInfoModal from './LessonInfoModal';
import ConfirmationModal from './ConfirmationModal';
import PresetPanel from './PresetPanel';
import LayersPanel from './LayersPanel';
import { useTranslation } from 'react-i18next';
import { getSymbolSvg } from '../../utils/symbols';
import { replaceMathShortcuts, replaceMathInHtml } from '../../utils/textFormatters';
import { deleteLocalLesson } from '../../utils/lessonStorage';

const Editor = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const [editingElementId, setEditingElementId] = useState(null);
    const [showSaveFeedback, setShowSaveFeedback] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showNewLessonConfirmation, setShowNewLessonConfirmation] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [libraryTab, setLibraryTab] = useState('custom');
    const [libraryAllowedTabs, setLibraryAllowedTabs] = useState(null);
    const [libraryCallback, setLibraryCallback] = useState(null);
    const [showPresetPanel, setShowPresetPanel] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [showTranslateConfirm, setShowTranslateConfirm] = useState(false);
    const [showDeleteSlideConfirmation, setShowDeleteSlideConfirmation] = useState(false);
    const [translationLang, setTranslationLang] = useState(() => {
        return localStorage.getItem('pico_translate_lang') || 'en';
    });

    const isTranslating = !!state.translationMode;
    const pendingSaveRef = useRef(false);

    // Auto-save to disk after SAVE_TRANSLATION commits translations to state
    useEffect(() => {
        if (pendingSaveRef.current && !state.translationMode && state.lesson.path) {
            pendingSaveRef.current = false;
            performSave();
        }
    }, [state.translationMode]);

    const TRANSLATE_LANGUAGES = [
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'en', label: 'English', flag: '🇺🇸' },
    ];

    // Detect mobile keyboard via VisualViewport
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const initialHeight = vv.height;
        const handleResize = () => {
            // If viewport shrinks by >150px, keyboard is likely open
            setIsKeyboardVisible(vv.height < initialHeight - 150);
        };
        vv.addEventListener('resize', handleResize);
        return () => vv.removeEventListener('resize', handleResize);
    }, []);

    const handleEdit = (id) => {
        setEditingElementId(id);
    };

    const handleSaveText = (data) => {
        if (editingElementId) {
            dispatch({
                type: 'UPDATE_ELEMENT',
                saveHistory: true,
                payload: { id: editingElementId, updates: { content: data.content, metadata: { ...data.metadata } } }
            });
            setEditingElementId(null);
        }
    };

    const saveToDisk = async (lessonData, path) => {
        // If it's already a local lesson, save directly to local storage
        if (path && path.startsWith('local://')) {
            try {
                const { saveLocalLesson } = await import('../../utils/lessonStorage');
                const saved = saveLocalLesson(lessonData);
                console.log('Lesson saved locally:', saved.path);
                return { success: true, path: saved.path };
            } catch (error) {
                console.error('Error saving local lesson:', error);
                alert('Error saving lesson locally');
                return { success: false };
            }
        }

        try {
            const response = await fetch('/api/save-lesson', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: path,
                    content: lessonData
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save lesson to server');
            }

            const result = await response.json();
            console.log('Lesson saved to:', result.path);
            return { success: true, path: result.path };
        } catch (error) {
            console.warn('Server save failed, attempting local fallback:', error);

            // Fallback to Local Storage
            if (confirm(t('editor.saveLocalConfirm') || "Server unreachable. Save to this device instead?")) {
                try {
                    const { saveLocalLesson } = await import('../../utils/lessonStorage');
                    const saved = saveLocalLesson(lessonData);
                    return { success: true, path: saved.path };
                } catch (e) {
                    console.error('Local fallback failed:', e);
                    alert('Failed to save locally');
                    return { success: false };
                }
            }

            return { success: false };
        }
    };

    const performSave = async (pathOverride = null) => {
        const path = pathOverride || state.lesson.path;

        if (!path) {
            // Should not happen if logic is correct, but fallback
            setShowInfoModal(true);
            return;
        }

        // Update timestamp
        const updatedLesson = {
            ...state.lesson,
            updatedAt: new Date(),
            path: path // Ensure path is in the lesson object
        };

        // Save to disk
        const { success, path: savedPath } = await saveToDisk(updatedLesson, path);

        if (success) {
            dispatch({
                type: 'UPDATE_LESSON_METADATA',
                payload: { updatedAt: new Date(), path: savedPath }
            });
            setShowSaveFeedback(true);
            setTimeout(() => setShowSaveFeedback(false), 2000);
        }
    };

    const handleSaveProject = () => {
        if (!state.lesson.path) {
            // First save (no path yet) -> Open Info Modal to set path
            setShowInfoModal(true);
        } else {
            performSave();
        }
    };

    const handleUpdateInfo = async (data) => {
        // data contains { path, title } from LessonInfoModal
        const oldPath = state.lesson.path;

        dispatch({
            type: 'UPDATE_LESSON_METADATA',
            payload: {
                title: data.title,
                path: data.path,
                description: data.description,
                icon: data.icon,
                cardColor: data.cardColor,
                translations: data.translations
            }
        });

        // Construct the lesson object with the new data
        const lessonToSave = {
            ...state.lesson,
            id: data.path, // Sync id with new path
            title: data.title,
            path: data.path,
            description: data.description,
            icon: data.icon,
            cardColor: data.cardColor,
            translations: data.translations,
            updatedAt: new Date()
        };

        const { success, path: savedPath } = await saveToDisk(lessonToSave, data.path);

        if (success) {
            // Update metadata with the actual saved path (in case it fell back to local)
            dispatch({
                type: 'UPDATE_LESSON_METADATA',
                payload: { path: savedPath }
            });

            // Clean up the old lesson folder if the path has changed and it's not a local fallback
            if (oldPath && oldPath !== savedPath && !oldPath.startsWith('local://')) {
                try {
                    const oldFolderPath = oldPath.replace('/lesson.json', '');
                    await fetch('/api/delete-lesson', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: oldFolderPath })
                    });
                    console.log('Successfully cleaned up old lesson folder:', oldFolderPath);
                } catch (error) {
                    console.error('Failed to clean up old lesson folder:', error);
                }
            }

            setShowInfoModal(false);
            setShowSaveFeedback(true);
            setTimeout(() => setShowSaveFeedback(false), 2000);
        }
    };

    const handleNewLesson = () => {
        // Check if current lesson is "Untitled Lesson" (heuristic for unsaved/new)
        // Or if we had a dirty flag. For now, using title as proxy or just always confirming.
        // Let's always confirm to be safe.
        setShowNewLessonConfirmation(true);
    };

    const confirmNewLesson = () => {
        dispatch({ type: 'NEW_LESSON' });
        setShowNewLessonConfirmation(false);
    };

    const handleDeleteLesson = async () => {
        const lessonPath = state.lesson?.path;
        if (lessonPath) {
            if (lessonPath.startsWith('local://')) {
                deleteLocalLesson(lessonPath);
            } else {
                try {
                    const folderPath = lessonPath.replace('/lesson.json', '');
                    const response = await fetch('/api/delete-lesson', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: folderPath })
                    });
                    if (!response.ok) {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(err.error || 'Delete failed');
                    }
                } catch (error) {
                    console.error('Error deleting lesson:', error);
                    alert('Failed to delete lesson: ' + error.message);
                    return;
                }
            }
        }
        setShowInfoModal(false);
        dispatch({ type: 'NEW_LESSON' });
        dispatch({ type: 'SET_VIEW', payload: 'lessons' });
    };

    const handleGoToMenu = () => {
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
    };

    const handleDeleteSlide = () => {
        dispatch({ type: 'DELETE_SLIDE', payload: state.currentSlideId });
        setShowDeleteSlideConfirmation(false);
    };

    const handleApplyBackgroundToAll = (backgroundElement) => {
        if (!backgroundElement) return;
        dispatch({ type: 'APPLY_BACKGROUND_TO_ALL', payload: backgroundElement });
    };

    const isRangeInteractingRef = useRef(false);

    const handleStartContinuousChange = () => {
        dispatch({ type: 'SAVE_HISTORY' });
        isRangeInteractingRef.current = true;
    };

    const handleEndContinuousChange = () => {
        isRangeInteractingRef.current = false;
    };

    // Shared ContextualMenu handlers (used in both bottom-menus and floating keyboard mode)
    const handleContextMenuChange = (id, updates) => {
        const shouldSave = !isRangeInteractingRef.current;
        if (id === 'cartridge' || (typeof id === 'string' && id.startsWith('cartridge:'))) {
            const slide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            dispatch({
                type: 'UPDATE_SLIDE',
                saveHistory: shouldSave,
                payload: {
                    cartridge: {
                        ...slide?.cartridge,
                        ...updates
                    }
                }
            });
        } else if (id === 'background') {
            const slide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            const newSettings = {};
            let newBackground = undefined;
            if (updates.metadata) {
                if (updates.metadata.backgroundColor) newBackground = updates.metadata.backgroundColor;
                // Copy all other fields dynamically to backgroundSettings
                Object.keys(updates.metadata).forEach(key => {
                    if (key !== 'backgroundColor') {
                        newSettings[key] = updates.metadata[key];
                    }
                });
            }
            dispatch({
                type: 'UPDATE_SLIDE',
                saveHistory: shouldSave,
                payload: {
                    ...(newBackground ? { background: newBackground } : {}),
                    backgroundSettings: { ...slide?.backgroundSettings, ...newSettings }
                }
            });
        } else if (state.selectedElementIds && state.selectedElementIds.length > 1 && state.selectedElementIds.includes(id)) {
            // Multi-selection parameter batch update:
            const slide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            const targetIds = state.selectedElementIds.filter(elId => elId !== 'background' && elId !== 'cartridge');
            
            const textKeys = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'lineHeight', 'textTransform', 'textAlign', 'textDecoration', 'letterSpacing'];
            const visualKeys = ['opacity', 'brightness', 'locked', 'hidden'];
            const symbolKeys = ['symbolColor', 'roundCorners'];
            const lineKeys = ['isCurved', 'curvature', 'curveSkew', 'lineType', 'startCap', 'endCap', 'height'];

            const updatesMap = {};

            targetIds.forEach(targetId => {
                const el = slide?.elements?.find(e => e.id === targetId);
                if (!el) return;

                if (targetId === id) {
                    updatesMap[targetId] = updates;
                    return;
                }

                const elUpdates = {};
                const elMetaUpdates = {};

                // Top-level property updates
                if (updates.scale !== undefined) elUpdates.scale = updates.scale;
                if (updates.rotation !== undefined) elUpdates.rotation = updates.rotation;

                // Metadata updates
                if (updates.metadata) {
                    const meta = updates.metadata;
                    const isTextElement = ['text', 'balloon', 'banner', 'collectible'].includes(el.type);
                    const isLineElement = el.type === 'line';
                    const isSymbolElement = !!el.metadata?.isSymbol || isLineElement;

                    // Text properties
                    if (isTextElement) {
                        textKeys.forEach(k => {
                            if (meta[k] !== undefined) elMetaUpdates[k] = meta[k];
                        });
                    }

                    // Visual properties (all elements)
                    visualKeys.forEach(k => {
                        if (meta[k] !== undefined) elMetaUpdates[k] = meta[k];
                    });

                    // Symbol / Shape properties
                    if (isSymbolElement) {
                        symbolKeys.forEach(k => {
                            if (meta[k] !== undefined) elMetaUpdates[k] = meta[k];
                        });

                        // Re-generate SVG symbol content if symbolColor or roundCorners changed
                        if (el.metadata?.symbolType && (meta.symbolColor !== undefined || meta.roundCorners !== undefined)) {
                            const newColor = meta.symbolColor !== undefined ? meta.symbolColor : (el.metadata.symbolColor || '#8B5CF6');
                            const mergedMeta = { ...el.metadata, ...elMetaUpdates };
                            try {
                                elUpdates.content = getSymbolSvg(el.metadata.symbolType, el.metadata.symbolValue, newColor, mergedMeta);
                            } catch (e) {
                                console.warn('Failed to regenerate symbol SVG', e);
                            }
                        }
                    }

                    // Line properties
                    if (isLineElement) {
                        lineKeys.forEach(k => {
                            if (meta[k] !== undefined) elMetaUpdates[k] = meta[k];
                        });
                        if (meta.symbolColor !== undefined) {
                            elMetaUpdates.symbolColor = meta.symbolColor;
                        }
                    }
                }

                if (Object.keys(elMetaUpdates).length > 0) {
                    elUpdates.metadata = elMetaUpdates;
                }

                if (Object.keys(elUpdates).length > 0) {
                    updatesMap[targetId] = elUpdates;
                }
            });

            dispatch({ type: 'UPDATE_ELEMENTS', payload: updatesMap, saveHistory: shouldSave });
        } else {
            dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates }, saveHistory: shouldSave });
        }
    };

    const handleContextMenuDelete = (id) => {
        if (id === 'cartridge' || (typeof id === 'string' && id.startsWith('cartridge:'))) {
            dispatch({ type: 'UPDATE_SLIDE', payload: { cartridge: null } });
            dispatch({ type: 'SELECT_ELEMENT', payload: null });
        } else {
            const selectedIds = state.selectedElementIds && state.selectedElementIds.length > 0
                ? state.selectedElementIds
                : (state.selectedElementId ? [state.selectedElementId] : []);
            const validIds = selectedIds.filter(selId => selId !== 'background' && selId !== 'cartridge' && !selId.startsWith('cartridge:'));
            if (validIds.length > 1 && validIds.includes(id)) {
                dispatch({ type: 'DELETE_ELEMENTS', payload: validIds });
            } else {
                dispatch({ type: 'DELETE_ELEMENT', payload: id });
            }
        }
    };

    const handleContextMenuDuplicate = () => {
        const selectedIds = state.selectedElementIds && state.selectedElementIds.length > 0
            ? state.selectedElementIds
            : (state.selectedElementId ? [state.selectedElementId] : []);
        const validIds = selectedIds.filter(id => id !== 'background' && id !== 'cartridge');
        if (validIds.length > 1) {
            dispatch({ type: 'DUPLICATE_ELEMENTS', payload: validIds });
        } else if (validIds.length === 1) {
            dispatch({ type: 'DUPLICATE_ELEMENT', payload: validIds[0] });
        }
    };

    const handleReorderElement = (elementId, direction) => {
        dispatch({ type: 'REORDER_ELEMENT', payload: { elementId, direction } });
    };

    const handleReorderElementTo = (elementId, toIndex, saveHistory = undefined) => {
        const shouldSave = saveHistory !== undefined ? saveHistory : !isRangeInteractingRef.current;
        dispatch({ type: 'REORDER_ELEMENT_TO', payload: { elementId, toIndex, saveHistory: shouldSave } });
    };

    const handleToggleLock = (elementId) => {
        if (typeof elementId === 'string' && elementId.startsWith('cartridge:')) {
            const slide = currentSlide;
            if (!slide?.cartridge) return;
            const config = slide.cartridge.config || {};
            dispatch({ type: 'SAVE_HISTORY' });
            if (elementId === 'cartridge:explorenl-nl') {
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        cartridge: {
                            ...slide.cartridge,
                            config: { ...config, lockNL: !config.lockNL }
                        }
                    }
                });
            } else if (elementId === 'cartridge:explorenl-equation') {
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        cartridge: {
                            ...slide.cartridge,
                            config: { ...config, lockEquation: !config.lockEquation }
                        }
                    }
                });
            } else {
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        cartridge: {
                            ...slide.cartridge,
                            config: { ...config, locked: !config.locked }
                        }
                    }
                });
            }
            return;
        }
        const el = currentSlide?.elements.find(e => e.id === elementId);
        if (!el) return;
        dispatch({ type: 'SAVE_HISTORY' });
        dispatch({ type: 'UPDATE_ELEMENT', payload: { id: elementId, updates: { metadata: { locked: !el.metadata?.locked } } } });
    };

    const handleToggleVisibility = (elementId) => {
        if (typeof elementId === 'string' && elementId.startsWith('cartridge:')) {
            const slide = currentSlide;
            if (!slide?.cartridge) return;
            const config = slide.cartridge.config || {};
            dispatch({ type: 'SAVE_HISTORY' });
            if (elementId === 'cartridge:explorenl-nl') {
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        cartridge: {
                            ...slide.cartridge,
                            config: { ...config, hideNL: !config.hideNL }
                        }
                    }
                });
            } else if (elementId === 'cartridge:explorenl-equation') {
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        cartridge: {
                            ...slide.cartridge,
                            config: { ...config, hideEquation: !config.hideEquation }
                        }
                    }
                });
            } else {
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        cartridge: {
                            ...slide.cartridge,
                            config: { ...config, hidden: !config.hidden }
                        }
                    }
                });
            }
            return;
        }
        const el = currentSlide?.elements.find(e => e.id === elementId);
        if (!el) return;
        dispatch({ type: 'SAVE_HISTORY' });
        dispatch({ type: 'UPDATE_ELEMENT', payload: { id: elementId, updates: { metadata: { hidden: !el.metadata?.hidden } } } });
    };

    const [showLayersPanel, setShowLayersPanel] = useState(false);

    const handleContextMenuOpenLibrary = (tab, callback) => {
        if (callback) {
            setLibraryCallback(() => callback);
        } else {
            setLibraryCallback(null);
        }
        const sel = state.lesson.slides.find(s => s.id === state.currentSlideId)?.elements.find(e => e.id === state.selectedElementId);
        if (sel?.type === 'background' || state.selectedElementId === 'background') {
            setLibraryTab(tab || 'custom-bg');
            setLibraryAllowedTabs(['custom-bg', 'backgrounds']);
        } else {
            setLibraryTab(tab || 'custom');
            setLibraryAllowedTabs(['custom', 'custom-objects', 'emojis', 'gifs']);
        }
        setShowLibrary(true);
    };

    const editingElement = state.lesson.slides
        .find(s => s.id === state.currentSlideId)
        ?.elements.find(e => e.id === editingElementId);

    // Helper to find the current slide
    const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);

    // Determine selected element (Sticker vs Cartridge)
    let selectedElement = null;
    const isCartridgeSelected = state.selectedElementId === 'cartridge' ||
        (typeof state.selectedElementId === 'string' && state.selectedElementId.startsWith('cartridge:'));

    if (isCartridgeSelected && currentSlide?.cartridge) {
        // Mock an element structure for the cartridge so ContextualMenu can consume it
        selectedElement = {
            id: state.selectedElementId,
            type: 'cartridge', // Special type
            cartridgeType: currentSlide.cartridge.type, // Pass specific cartridge type (FractionAlpha, FractionSlicer)
            config: currentSlide.cartridge.config, // Pass config directly
            selectedPart: typeof state.selectedElementId === 'string' && state.selectedElementId.includes(':') ? state.selectedElementId.split(':')[1] : null,
            // Add other props if needed by generic menu parts, but unlikely
        };
    } else if (state.selectedElementId === 'background') {
        const isImageOrGradient = currentSlide.background && (currentSlide.background.startsWith('url') || currentSlide.background.startsWith('gradient'));
        // Mock element for background settings
        selectedElement = {
            id: 'background',
            type: 'background',
            background: currentSlide.background,
            metadata: {
                ...currentSlide.backgroundSettings, // opacity, brightness, flipX, flipY
                // Only include backgroundColor if it's NOT an image/gradient, otherwise it overwrites the image on update
                ...(!isImageOrGradient ? { backgroundColor: currentSlide.background || '#ffffff' } : {})
            }
        };
    } else {
        selectedElement = currentSlide?.elements.find(e => e.id === state.selectedElementId);
    }

    const handleUndo = () => {
        dispatch({ type: 'UNDO_ELEMENT' });
    };

    const handleGlobalClick = (e) => {
        // If clicking on the workspace background (not on a sticker or menu), deselect
        // We check if the click target is strictly the editor-workspace or editor-layout
        // But we also need to allow clicking on the canvas background to deselect (which is handled in Canvas usually)
        // Here we want to catch clicks "somewhere else on the whole screen"

        // If we are clicking inside the contextual menu, do nothing
        if (e.target.closest('.contextual-menu')) return;

        // If we are clicking inside a sticker, do nothing (handled by Sticker)
        if (e.target.closest('.sticker')) return;

        // If we are clicking inside the cartridge container, do nothing (handled by Canvas)
        if (e.target.closest('.cartridge-container')) return;

        // If clicking inside a contentEditable (text edit), do nothing
        if (e.target.isContentEditable || e.target.closest('[contenteditable="true"]')) return;

        // If clicking inside the asset library or its submodals, do nothing
        if (e.target.closest('.asset-library, .confirmation-modal-overlay, .confirmation-modal, .save-asset-modal-overlay, .save-asset-modal, .asset-info-modal-overlay, .asset-info-modal, .recycle-modal-overlay, .recycle-modal')) return;

        // If an element is selected, any click outside it (and outside the menu) should deselect
        if (state.selectedElementId) {
            dispatch({ type: 'SELECT_ELEMENT', payload: null });
        }
    };

    const slides = state.lesson.slides;
    const currentSlideIndex = slides.findIndex(s => s.id === state.currentSlideId);
    const isFirstSlide = currentSlideIndex === 0;
    const isLastSlide = currentSlideIndex === slides.length - 1;
    const progress = ((currentSlideIndex + 1) / slides.length) * 100;

    const handlePrevSlide = () => {
        if (!isFirstSlide) {
            dispatch({ type: 'SET_CURRENT_SLIDE', payload: slides[currentSlideIndex - 1].id });
        }
    };

    const handleNextSlide = () => {
        if (!isLastSlide) {
            dispatch({ type: 'SET_CURRENT_SLIDE', payload: slides[currentSlideIndex + 1].id });
        }
    };

    const handleAddSlide = () => {
        dispatch({ type: 'ADD_SLIDE' });
    };

    // Keyboard handler for selected elements and slide navigation
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't intercept if user is typing in an input, textarea, or contentEditable
            // Exception: allow Cmd+B/I/U formatting shortcuts through
            const isUndoShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z';
            // Undo shortcut (Cmd+Z / Ctrl+Z): Always handle in editor even if banner/balloon contentEditable is active
            if (isUndoShortcut) {
                const isNativeTextInput = e.target.tagName === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'button';
                const isTextarea = e.target.tagName === 'TEXTAREA';
                if (!isNativeTextInput && !isTextarea) {
                    e.preventDefault();
                    if (document.activeElement && document.activeElement.blur) {
                        document.activeElement.blur();
                    }
                    handleUndo();
                    return;
                }
            }

            const isTextFormatShortcut = (e.metaKey || e.ctrlKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase());
            const isMathShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e';
            if (
                !isTextFormatShortcut && !isMathShortcut && (
                    e.target.isContentEditable ||
                    e.target.closest('[contenteditable="true"]') ||
                    e.target.tagName === 'INPUT' ||
                    e.target.tagName === 'TEXTAREA' ||
                    e.target.tagName === 'SELECT'
                )
            ) return;

            // Math replacement shortcut (Cmd+E / Ctrl+E)
            if (isMathShortcut) {
                const activeEl = document.activeElement;
                const isNativeInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
                let selectedText = '';
                let targetStart = null;
                let targetEnd = null;

                if (isNativeInput) {
                    let start = activeEl.selectionStart;
                    let end = activeEl.selectionEnd;
                    if (start !== end) {
                        selectedText = activeEl.value.substring(start, end);
                        targetStart = start;
                        targetEnd = end;
                    } else {
                        const val = activeEl.value;
                        const textBefore = val.substring(0, start);
                        const match = textBefore.match(/(?:[0-9a-zA-Z.]+)?[!^]\(?([+-]?[0-9a-zA-Z.]+)\)?$/)
                            || textBefore.match(/[!^]([0-9a-zA-Z+-]+)$/)
                            || textBefore.match(/[\*\/]$/);
                        if (match) {
                            targetStart = start - match[0].length;
                            targetEnd = start;
                            selectedText = match[0];
                        }
                    }
                } else {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                        if (!sel.isCollapsed) {
                            selectedText = sel.toString();
                        } else {
                            const range = sel.getRangeAt(0);
                            const node = range.startContainer;
                            if (node && node.nodeType === Node.TEXT_NODE) {
                                const text = node.nodeValue || '';
                                const offset = range.startOffset;
                                const textBefore = text.substring(0, offset);
                                const match = textBefore.match(/(?:[0-9a-zA-Z.]+)?[!^]\(?([+-]?[0-9a-zA-Z.]+)\)?$/)
                                    || textBefore.match(/[!^]([0-9a-zA-Z+-]+)$/)
                                    || textBefore.match(/[\*\/]$/);
                                if (match) {
                                    const matchStart = offset - match[0].length;
                                    const newRange = document.createRange();
                                    newRange.setStart(node, matchStart);
                                    newRange.setEnd(node, offset);
                                    sel.removeAllRanges();
                                    sel.addRange(newRange);
                                    selectedText = match[0];
                                }
                            }
                        }
                    }
                }

                // If nothing was selected/matched in focus, but a text/banner element is selected on canvas
                if (!selectedText && state.selectedElementId) {
                    const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
                    const selectedElement = currentSlide?.elements.find(el => el.id === state.selectedElementId);
                    if (selectedElement && (selectedElement.type === 'text' || selectedElement.type === 'banner')) {
                        const content = selectedElement.content || '';
                        if (/[!^\*\/]/.test(content)) {
                            e.preventDefault();
                            const newContent = replaceMathInHtml(content);
                            if (newContent !== content) {
                                handleContextMenuChange(state.selectedElementId, { content: newContent });
                                return;
                            }
                        }
                    }
                }

                if (selectedText) {
                    e.preventDefault();
                    const replacement = replaceMathShortcuts(selectedText);
                        
                    if (isNativeInput) {
                        const start = targetStart !== null ? targetStart : activeEl.selectionStart;
                        const end = targetEnd !== null ? targetEnd : activeEl.selectionEnd;
                        const val = activeEl.value;
                        const newVal = val.substring(0, start) + replacement + val.substring(end);
                        
                        // React 16+ overrides native setters, so we must get the native descriptor
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                            activeEl.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
                            "value"
                        ).set;
                        
                        nativeInputValueSetter.call(activeEl, newVal);
                        activeEl.setSelectionRange(start, start + replacement.length);
                        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        document.execCommand('insertText', false, replacement);
                        
                        if (activeEl) {
                            activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                            
                            const editableEl = activeEl.isContentEditable ? activeEl : activeEl.closest('[contenteditable="true"]');
                            if (editableEl && state.selectedElementId) {
                                const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
                                const selectedElement = currentSlide?.elements.find(el => el.id === state.selectedElementId);
                                
                                const optionIndex = editableEl.dataset.optionIndex;
                                const matchAnswerIndex = editableEl.dataset.matchAnswerIndex;
                                const nodeIndex = editableEl.dataset.nodeIndex;
                                
                                if (selectedElement && selectedElement.type === 'quiz') {
                                    const quizType = selectedElement.metadata?.quizType || 'classic';
                                    if (quizType === 'chatquiz') {
                                        if (nodeIndex !== undefined) {
                                            const nIdx = parseInt(nodeIndex, 10);
                                            const chatNodes = selectedElement.metadata?.chatNodes || [];
                                            const newNodes = [...chatNodes];
                                            if (optionIndex !== undefined) {
                                                const optIdx = parseInt(optionIndex, 10);
                                                const newOpts = [...(newNodes[nIdx]?.options || [])];
                                                newOpts[optIdx] = editableEl.innerHTML;
                                                newNodes[nIdx] = { ...newNodes[nIdx], options: newOpts };
                                            } else {
                                                newNodes[nIdx] = { ...newNodes[nIdx], text: editableEl.innerHTML };
                                            }
                                            handleContextMenuChange(state.selectedElementId, {
                                                metadata: {
                                                    ...selectedElement.metadata,
                                                    chatNodes: newNodes
                                                }
                                            });
                                        }
                                    } else if (quizType === 'match' || quizType === 'conecta') {
                                        if (optionIndex !== undefined) {
                                            const idx = parseInt(optionIndex, 10);
                                            const options = selectedElement.metadata?.options || [];
                                            const newOptions = [...options];
                                            newOptions[idx] = editableEl.innerHTML;
                                            handleContextMenuChange(state.selectedElementId, {
                                                metadata: {
                                                    ...selectedElement.metadata,
                                                    options: newOptions
                                                }
                                            });
                                        } else if (matchAnswerIndex !== undefined) {
                                            const idx = parseInt(matchAnswerIndex, 10);
                                            const matchAnswers = selectedElement.metadata?.matchAnswers || [];
                                            const newAnswers = [...matchAnswers];
                                            newAnswers[idx] = editableEl.innerHTML;
                                            handleContextMenuChange(state.selectedElementId, {
                                                metadata: {
                                                    ...selectedElement.metadata,
                                                    matchAnswers: newAnswers
                                                }
                                            });
                                        }
                                    } else {
                                        if (optionIndex !== undefined) {
                                            const idx = parseInt(optionIndex, 10);
                                            const options = selectedElement.metadata?.options || [];
                                            const newOptions = [...options];
                                            newOptions[idx] = editableEl.innerHTML;
                                            handleContextMenuChange(state.selectedElementId, {
                                                metadata: {
                                                    ...selectedElement.metadata,
                                                    options: newOptions
                                                }
                                            });
                                        }
                                    }
                                } else {
                                    if (optionIndex === undefined && matchAnswerIndex === undefined) {
                                        handleContextMenuChange(state.selectedElementId, { content: editableEl.innerHTML });
                                    }
                                }
                            }
                        }
                    }
                }
                return;
            }

            // Text Formatting Shortcuts (Cmd+B, Cmd+I, Cmd+U)
            if ((e.metaKey || e.ctrlKey) && state.selectedElementId && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                const key = e.key.toLowerCase();
                const isInContentEditable = e.target.isContentEditable || e.target.closest('[contenteditable="true"]');

                if (isInContentEditable) {
                    // Inline formatting on selected text using execCommand
                    const command = key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline';
                    document.execCommand(command, false, null);
                    // Save the updated innerHTML back to the element
                    const editableEl = e.target.isContentEditable ? e.target : e.target.closest('[contenteditable="true"]');
                    if (editableEl) {
                        handleContextMenuChange(state.selectedElementId, { content: editableEl.innerHTML });
                    }
                } else {
                    // Whole-element formatting when not actively editing text
                    const slide = state.lesson.slides.find(s => s.id === state.currentSlideId);
                    const el = slide?.elements.find(el => el.id === state.selectedElementId);
                    if (el && (el.type === 'text' || el.type === 'balloon' || el.type === 'quiz')) {
                        if (key === 'b') {
                            const val = el.metadata?.fontWeight === 'bold' ? 'normal' : 'bold';
                            handleContextMenuChange(el.id, { metadata: { ...el.metadata, fontWeight: val } });
                        } else if (key === 'i') {
                            const val = el.metadata?.fontStyle === 'italic' ? 'normal' : 'italic';
                            handleContextMenuChange(el.id, { metadata: { ...el.metadata, fontStyle: val } });
                        } else if (key === 'u') {
                            const val = el.metadata?.textDecoration === 'underline' ? 'none' : 'underline';
                            handleContextMenuChange(el.id, { metadata: { ...el.metadata, textDecoration: val } });
                        }
                    }
                }
                return;
            }

            // Copy selected element(s) (Cmd+C / Ctrl+C)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
                const selectedIds = state.selectedElementIds && state.selectedElementIds.length > 0
                    ? state.selectedElementIds
                    : (state.selectedElementId ? [state.selectedElementId] : []);
                
                const validIds = selectedIds.filter(id => id !== 'background' && id !== 'cartridge');
                
                if (validIds.length > 0) {
                    e.preventDefault();
                    const slide = state.lesson.slides.find(s => s.id === state.currentSlideId);
                    const elementsToCopy = slide?.elements.filter(el => validIds.includes(el.id));
                    
                    if (elementsToCopy && elementsToCopy.length > 0) {
                        const payload = JSON.stringify({ _picopicoCopy: true, elements: elementsToCopy });
                        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                            navigator.clipboard.writeText(payload).catch(() => {});
                        }
                        try {
                            localStorage.setItem('picopico-copied-element', payload);
                        } catch {}
                    }
                }
                return;
            }

            // Paste element(s) (Cmd+V / Ctrl+V)
            // Don't eagerly preventDefault — let the native 'paste' event fire so
            // Canvas's clipboard-image handler can work. Only intercept if the
            // clipboard actually contains PicoPico element-copy JSON.
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
                const processCopyData = (text) => {
                    if (!text || typeof text !== 'string') return false;

                    // Check for copied slide(s)
                    if (text.startsWith('picopico-slides:') || text.startsWith('picopico-slide:')) {
                        try {
                            let slidesToPaste = [];
                            if (text.startsWith('picopico-slides:')) {
                                slidesToPaste = JSON.parse(text.substring('picopico-slides:'.length));
                            } else if (text.startsWith('picopico-slide:')) {
                                slidesToPaste = [JSON.parse(text.substring('picopico-slide:'.length))];
                            }
                            if (Array.isArray(slidesToPaste) && slidesToPaste.length > 0) {
                                dispatch({ type: 'PASTE_SLIDES', payload: { slides: slidesToPaste, targetSlideId: state.currentSlideId } });
                                return true;
                            }
                        } catch { /* ignore and continue */ }
                    }

                    try {
                        const data = JSON.parse(text);
                        if (data._picopicoCopy) {
                            if (data.elements && data.elements.length > 0) {
                                dispatch({ type: 'PASTE_ELEMENTS', payload: data.elements });
                                return true;
                            } else if (data.element) {
                                dispatch({ type: 'PASTE_ELEMENT', payload: data.element });
                                return true;
                            }
                        }
                    } catch { /* not our data — let native paste event handle it */ }
                    return false;
                };

                if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                    navigator.clipboard.readText().then(text => {
                        const pasted = processCopyData(text);
                        if (!pasted) {
                            try {
                                const fallback = localStorage.getItem('picopico-copied-element') || localStorage.getItem('picopico-copied-slides');
                                if (fallback) processCopyData(fallback);
                            } catch {}
                        }
                    }).catch(() => {
                        try {
                            const fallback = localStorage.getItem('picopico-copied-element') || localStorage.getItem('picopico-copied-slides');
                            if (fallback) processCopyData(fallback);
                        } catch {}
                    });
                } else {
                    try {
                        const fallback = localStorage.getItem('picopico-copied-element') || localStorage.getItem('picopico-copied-slides');
                        if (fallback) processCopyData(fallback);
                    } catch {}
                }
                return;
            }

            // Group / Ungroup (Cmd+G / Ctrl+G / Cmd+Shift+G)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                const selectedIds = state.selectedElementIds && state.selectedElementIds.length > 0
                    ? state.selectedElementIds
                    : (state.selectedElementId ? [state.selectedElementId] : []);
                const validIds = selectedIds.filter(id => id && id !== 'background' && id !== 'cartridge');
                if (validIds.length === 0) return;

                const slide = state.lesson.slides.find(s => s.id === state.currentSlideId);
                const selElements = slide?.elements.filter(el => validIds.includes(el.id)) || [];

                if (e.shiftKey) {
                    // Explicit Ungroup (Cmd+Shift+G)
                    dispatch({ type: 'UNGROUP_ELEMENTS', payload: validIds });
                    return;
                }

                // Toggle Group / Ungroup (Cmd+G)
                const groupIds = new Set(selElements.map(el => el.metadata?.groupId).filter(Boolean));
                const allGroupedInSameGroup = selElements.length > 0 && groupIds.size === 1 && selElements.every(el => el.metadata?.groupId);

                if (allGroupedInSameGroup) {
                    dispatch({ type: 'UNGROUP_ELEMENTS', payload: validIds });
                } else if (selElements.length >= 2) {
                    dispatch({ type: 'GROUP_ELEMENTS', payload: validIds });
                }
                return;
            }

            // Delete selected element(s)
            if ((e.key === 'Delete' || e.key === 'Backspace') && (state.selectedElementId || (state.selectedElementIds && state.selectedElementIds.length > 0))) {
                e.preventDefault();
                const selectedIds = state.selectedElementIds && state.selectedElementIds.length > 0
                    ? state.selectedElementIds
                    : (state.selectedElementId ? [state.selectedElementId] : []);
                const validIds = selectedIds.filter(id => id && id !== 'background' && id !== 'cartridge');
                if (validIds.length > 1) {
                    dispatch({ type: 'DELETE_ELEMENTS', payload: validIds });
                } else if (validIds.length === 1) {
                    handleContextMenuDelete(validIds[0]);
                }
            }

            // Arrow keys: move selected element(s) / group, or navigate slides if nothing selected
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
                const rawSelectedIds = (state.selectedElementIds && state.selectedElementIds.length > 0)
                    ? state.selectedElementIds
                    : (state.selectedElementId ? [state.selectedElementId] : []);

                const movingIdsSet = new Set();
                if (currentSlide) {
                    rawSelectedIds.forEach(id => {
                        if (id && id !== 'background' && id !== 'cartridge') {
                            movingIdsSet.add(id);
                            // If element belongs to a group and user is not holding Alt/Option, move entire group together
                            const el = currentSlide.elements.find(e => e.id === id);
                            const groupId = el?.metadata?.groupId;
                            if (groupId && !e.altKey) {
                                currentSlide.elements.forEach(member => {
                                    if (member.metadata?.groupId === groupId) {
                                        movingIdsSet.add(member.id);
                                    }
                                });
                            }
                        }
                    });
                }

                const movingIds = Array.from(movingIdsSet);

                if (movingIds.length > 0) {
                    e.preventDefault();
                    
                    // Save history snapshot on initial key down (skip repeat keydown events when held down)
                    if (!e.repeat) {
                        dispatch({ type: 'SAVE_HISTORY' });
                    }

                    const canvas = document.querySelector('.slide-canvas');
                    if (!canvas) return;
                    const canvasW = canvas.offsetWidth;
                    const canvasH = canvas.offsetHeight;

                    const pxStep = e.shiftKey ? 10 : 1;
                    const dxPct = (pxStep / canvasW) * 100;
                    const dyPct = (pxStep / canvasH) * 100;

                    let dx = 0;
                    let dy = 0;
                    if (e.key === 'ArrowLeft') dx = -dxPct;
                    else if (e.key === 'ArrowRight') dx = dxPct;
                    else if (e.key === 'ArrowUp') dy = -dyPct;
                    else if (e.key === 'ArrowDown') dy = dyPct;

                    dispatch({ type: 'MOVE_ELEMENTS', payload: { ids: movingIds, dx, dy } });
                } else if (!state.selectedElementId || state.selectedElementId === 'background') {
                    e.preventDefault();
                    if (e.key === 'ArrowLeft') handlePrevSlide();
                    else if (e.key === 'ArrowRight') handleNextSlide();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.selectedElementId, state.selectedElementIds, state.currentSlideId, state.lesson.slides, handlePrevSlide, handleNextSlide]);

    return (
        <div className="editor-layout" onClick={handleGlobalClick}>
            {showSaveFeedback && (
                <div className="save-feedback">
                    {t('editor.saved')}
                </div>
            )}

            <div className="editor-container">
                <LessonInfoModal
                    isOpen={showInfoModal}
                    lesson={state.lesson}
                    onUpdate={handleUpdateInfo}
                    onClose={() => setShowInfoModal(false)}
                    onDelete={handleDeleteLesson}
                    translationLang={isTranslating ? translationLang : 'es'}
                />

                {showLibrary && (
                    <AssetLibrary
                        onClose={() => {
                            setShowLibrary(false);
                            setLibraryCallback(null);
                        }}
                        initialTab={libraryTab}
                        allowedTabs={libraryAllowedTabs}
                        onSelect={libraryCallback}
                    />
                )}

                <ConfirmationModal
                    isOpen={showNewLessonConfirmation}
                    message={t('editor.discardChanges')}
                    onConfirm={confirmNewLesson}
                    onCancel={() => setShowNewLessonConfirmation(false)}
                    confirmText={t('common.yes')}
                    cancelText={t('common.no')}
                />

                {showPresetPanel && (
                    <PresetPanel onClose={() => setShowPresetPanel(false)} />
                )}

                {/* Lesson Info Header */}
                <div className="lesson-info-header">
                    <span className="lesson-title">{state.lesson.title}</span>
                    <span className="slide-counter">{currentSlideIndex + 1}/{state.lesson.slides.length}</span>
                </div>

                {/* Translation Mode Banner */}
                {isTranslating && (
                    <div style={{
                        background: 'linear-gradient(90deg, #8B5CF6, #6D28D9)',
                        color: 'white',
                        padding: '6px 16px',
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        🌐 Translating to {TRANSLATE_LANGUAGES.find(l => l.code === state.translationMode.lang)?.label}
                        {/* Language switcher inside the banner */}
                        <select
                            value={state.translationMode.lang}
                            onChange={(e) => {
                                const newLang = e.target.value;
                                if (newLang === 'es') {
                                    // Switching to Spanish = save & exit translation mode
                                    dispatch({ type: 'SAVE_TRANSLATION' });
                                    setTranslationLang('es');
                                    localStorage.setItem('pico_translate_lang', 'es');
                                } else {
                                    // Save current translation, start new one
                                    dispatch({ type: 'SAVE_TRANSLATION' });
                                    dispatch({ type: 'START_TRANSLATION', payload: newLang });
                                    setTranslationLang(newLang);
                                    localStorage.setItem('pico_translate_lang', newLang);
                                }
                            }}
                            style={{
                                background: 'rgba(255,255,255,0.25)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                borderRadius: '6px',
                                color: 'white',
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {TRANSLATE_LANGUAGES.map(l => (
                                <option key={l.code} value={l.code} style={{ color: '#333' }}>
                                    {l.flag} {l.code.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => setShowTranslateConfirm(true)}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                padding: '2px 10px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '0.75rem'
                            }}
                        >
                            Done
                        </button>
                    </div>
                )}

                <div className={`editor-floating-actions ${selectedElement ? 'disabled-ui' : ''}`}>
                    <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
                        <BurgerMenu
                            onInfo={() => setShowInfoModal(true)}
                            onNew={handleNewLesson}
                            onMenu={handleGoToMenu}
                            onLessons={() => dispatch({ type: 'SET_VIEW', payload: 'lessons' })}
                            onPresets={() => setShowPresetPanel(true)}
                            disabled={isTranslating}
                        />
                        <button
                            className="btn-floating"
                            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'lessons' })}
                            title={t('editor.lessons')}
                            style={{ fontSize: '1.5rem', cursor: 'pointer', background: 'white' }}
                        >
                            📂
                        </button>
                    </div>
                    <div className="top-right-actions">
                        {/* Translate Toggle */}
                        {!isTranslating ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button
                                    className="btn-floating"
                                    onClick={() => {
                                        const lang = translationLang === 'es' ? 'en' : translationLang;
                                        setTranslationLang(lang);
                                        dispatch({ type: 'START_TRANSLATION', payload: lang });
                                    }}
                                    title="Translate"
                                    style={{ fontSize: '20px' }}
                                >
                                    🌐
                                </button>
                                {/* Language Selector - small dropdown next to globe */}
                                <select
                                    value={translationLang}
                                    onChange={(e) => {
                                        setTranslationLang(e.target.value);
                                        localStorage.setItem('pico_translate_lang', e.target.value);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        bottom: '-4px',
                                        right: '-4px',
                                        width: '22px',
                                        height: '18px',
                                        fontSize: '10px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        background: 'rgba(139, 92, 246, 0.9)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        padding: 0,
                                        textAlign: 'center',
                                        appearance: 'none',
                                        WebkitAppearance: 'none'
                                    }}
                                >
                                    {TRANSLATE_LANGUAGES.filter(l => l.code !== 'es').map(l => (
                                        <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        <button
                            className={`btn-floating btn-save ${!state.isDirty ? 'disabled' : ''}`}
                            onClick={handleSaveProject}
                            disabled={!state.isDirty || isTranslating}
                            title={t('editor.save')}
                        >
                            <span style={{ fontSize: '24px' }}>💾</span>
                        </button>
                        <button
                            className="btn-floating btn-preview"
                            onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
                            title={t('editor.preview')}
                            disabled={isTranslating}
                        >
                            ▶
                        </button>
                    </div>
                </div>

                {/* Navigation Buttons — hidden in translation mode */}
                {!isTranslating && (
                <div className={`editor-navigation ${selectedElement ? 'disabled-ui' : ''}`}>
                    <div className="nav-group nav-group-left">
                        <button
                            className="nav-insert"
                            onClick={() => dispatch({ type: 'INSERT_SLIDE', payload: 'before' })}
                            title={t('editor.insertBefore') || 'Insert before'}
                        >
                            +
                        </button>
                        {!isFirstSlide ? (
                            <button className="nav-btn nav-prev" onClick={handlePrevSlide}>
                                &lt;
                            </button>
                        ) : (
                            <div style={{ width: '48px', height: '48px' }} />
                        )}
                    </div>

                    <div className="nav-group nav-group-right">
                        <button
                            className="nav-insert"
                            onClick={() => dispatch({ type: 'INSERT_SLIDE', payload: 'after' })}
                            title={t('editor.insertAfter') || 'Insert after'}
                        >
                            +
                        </button>
                        {isLastSlide ? (
                            <button className="nav-btn nav-next" disabled style={{ opacity: 0.3, cursor: 'default' }}>
                                &gt;
                            </button>
                        ) : (
                            <button className="nav-btn nav-next" onClick={handleNextSlide}>
                                &gt;
                            </button>
                        )}
                    </div>
                </div>
                )}

                {/* Simplified Navigation in Translation Mode */}
                {isTranslating && (
                    <div className="editor-navigation">
                        {!isFirstSlide && (
                            <div className="nav-group nav-group-left">
                                <button className="nav-btn nav-prev" onClick={handlePrevSlide}>
                                    &lt;
                                </button>
                            </div>
                        )}
                        <div className="nav-group nav-group-right">
                            {!isLastSlide && (
                                <button className="nav-btn nav-next" onClick={handleNextSlide}>
                                    &gt;
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="editor-workspace">
                    <Canvas
                        onEditElement={handleEdit}
                        currentSlideIndex={currentSlideIndex}
                        totalSlides={state.lesson.slides.length}
                    />

                    {/* Compute group/ungroup capabilities for selected elements */}
                    {(() => {
                        const activeSelectedIds = state.selectedElementIds && state.selectedElementIds.length > 0
                            ? state.selectedElementIds
                            : (state.selectedElementId ? [state.selectedElementId] : []);
                        const validActiveSelectedElements = currentSlide?.elements.filter(el => activeSelectedIds.includes(el.id) && el.id !== 'background' && el.id !== 'cartridge') || [];
                        const activeGroupIds = new Set(validActiveSelectedElements.map(el => el.metadata?.groupId).filter(Boolean));
                        const isCurrentSelectionGrouped = validActiveSelectedElements.length > 0 && activeGroupIds.size === 1 && validActiveSelectedElements.every(el => el.metadata?.groupId);
                        const canCurrentSelectionGroup = validActiveSelectedElements.length >= 2 && !isCurrentSelectionGrouped;

                        return (
                            <>
                                {/* Floating Context Menu — appears above quiz when keyboard is visible */}
                                {isKeyboardVisible && selectedElement?.type === 'quiz' && (
                                    <div className="floating-context-menu" style={{
                                        bottom: `${100 - (selectedElement.y || 50)}%`
                                    }}>
                                        <ContextualMenu
                                            key={selectedElement.id}
                                            element={selectedElement}
                                            onChange={handleContextMenuChange}
                                            onDelete={handleContextMenuDelete}
                                            onDuplicate={handleContextMenuDuplicate}
                                            canGroup={canCurrentSelectionGroup}
                                            isGrouped={isCurrentSelectionGrouped}
                                            onGroup={() => dispatch({ type: 'GROUP_ELEMENTS', payload: activeSelectedIds })}
                                            onUngroup={() => dispatch({ type: 'UNGROUP_ELEMENTS', payload: activeSelectedIds })}
                                            onOpenLibrary={handleContextMenuOpenLibrary}
                                            onOpenPresets={() => setShowPresetPanel(true)}
                                            onReorderElement={handleReorderElement}
                                            onUndo={handleUndo}
                                            onStartContinuousChange={handleStartContinuousChange}
                                            onEndContinuousChange={handleEndContinuousChange}
                                            onApplyBackgroundToAll={handleApplyBackgroundToAll}
                                            showGuides={state.showGuides}
                                            guideMode={state.guideMode}
                                            onToggleGuides={() => dispatch({ type: 'CYCLE_GUIDE_MODE' })}
                                            translationMode={isTranslating}
                                        />
                                    </div>
                                )}

                                {/* Layers Panel */}
                                {!isTranslating && (
                                    <LayersPanel
                                        elements={currentSlide?.elements || []}
                                        cartridge={currentSlide?.cartridge}
                                        selectedElementId={state.selectedElementId}
                                        selectedElementIds={state.selectedElementIds}
                                        onSelect={(id, isMulti, isAlt) => dispatch({ type: 'SELECT_ELEMENT', payload: typeof id === 'object' ? id : { id, isShift: !!isMulti, isAlt: !!isAlt } })}
                                        onReorderTo={handleReorderElementTo}
                                        onStartContinuousChange={handleStartContinuousChange}
                                        onEndContinuousChange={handleEndContinuousChange}
                                        onToggleLock={handleToggleLock}
                                        onToggleVisibility={handleToggleVisibility}
                                        isOpen={showLayersPanel}
                                        onToggle={() => setShowLayersPanel(prev => !prev)}
                                        onReorder={(id, direction) => dispatch({ type: 'REORDER_ELEMENT', payload: { elementId: id, direction } })}
                                    />
                                )}
                            </>
                        );
                    })()}
                </div>

                <div className={`bottom-menus ${(isKeyboardVisible && selectedElement?.type === 'quiz') || (isTranslating && (!selectedElement || !['text', 'balloon', 'quiz'].includes(selectedElement.type))) ? 'hidden-menus' : ''}`}>
                    {/* SlideStrip Removed */}
                    {selectedElement ? (
                        (!isTranslating || ['text', 'balloon', 'quiz'].includes(selectedElement.type)) ? (
                            (() => {
                                const activeSelectedIds = state.selectedElementIds && state.selectedElementIds.length > 0
                                    ? state.selectedElementIds
                                    : (state.selectedElementId ? [state.selectedElementId] : []);
                                const validActiveSelectedElements = currentSlide?.elements.filter(el => activeSelectedIds.includes(el.id) && el.id !== 'background' && el.id !== 'cartridge' && !el.id.startsWith('cartridge:')) || [];
                                const activeGroupIds = new Set(validActiveSelectedElements.map(el => el.metadata?.groupId).filter(Boolean));
                                const isCurrentSelectionGrouped = validActiveSelectedElements.length > 0 && activeGroupIds.size === 1 && validActiveSelectedElements.every(el => el.metadata?.groupId);
                                const canCurrentSelectionGroup = validActiveSelectedElements.length >= 2 && !isCurrentSelectionGrouped;

                                return (
                                    <ContextualMenu
                                        key={selectedElement.id}
                                        element={selectedElement}
                                        onChange={handleContextMenuChange}
                                        onDelete={handleContextMenuDelete}
                                        onDuplicate={handleContextMenuDuplicate}
                                        canGroup={canCurrentSelectionGroup}
                                        isGrouped={isCurrentSelectionGrouped}
                                        onGroup={() => dispatch({ type: 'GROUP_ELEMENTS', payload: activeSelectedIds })}
                                        onUngroup={() => dispatch({ type: 'UNGROUP_ELEMENTS', payload: activeSelectedIds })}
                                        onOpenLibrary={handleContextMenuOpenLibrary}
                                        onOpenPresets={() => setShowPresetPanel(true)}
                                        onReorderElement={handleReorderElement}
                                        onUndo={handleUndo}
                                        onStartContinuousChange={handleStartContinuousChange}
                                        onEndContinuousChange={handleEndContinuousChange}
                                        onApplyBackgroundToAll={handleApplyBackgroundToAll}
                                        showGuides={state.showGuides}
                                        guideMode={state.guideMode}
                                        onToggleGuides={() => dispatch({ type: 'CYCLE_GUIDE_MODE' })}
                                        translationMode={isTranslating}
                                    />
                                );
                            })()
                        ) : null
                    ) : !isTranslating ? (
                        <Toolbar
                            onOpenLibrary={(tab) => {
                                setLibraryTab(tab || 'custom');
                                if (tab === 'custom-bg' || tab === 'backgrounds') {
                                    setLibraryAllowedTabs(['custom-bg', 'backgrounds']);
                                } else {
                                    setLibraryAllowedTabs(['custom', 'custom-objects', 'emojis', 'gifs']); // Sticker Mode
                                }
                                setShowLibrary(true);
                            }}
                            onDeleteSlide={() => setShowDeleteSlideConfirmation(true)}
                        />
                    ) : null}
                </div>
            </div>

            {/* Translation Save/Discard Confirmation */}
            <ConfirmationModal
                isOpen={showTranslateConfirm}
                message="Save translations?"
                onConfirm={() => {
                    dispatch({ type: 'SAVE_TRANSLATION' });
                    setShowTranslateConfirm(false);
                    // Flag for auto-save on next render (after state updates)
                    pendingSaveRef.current = true;
                }}
                onCancel={() => {
                    dispatch({ type: 'DISCARD_TRANSLATION' });
                    setShowTranslateConfirm(false);
                }}
                confirmText="Save"
                cancelText="Discard"
            />
            {/* Slide Deletion Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteSlideConfirmation}
                message="Are you sure you want to delete this slide?"
                onConfirm={handleDeleteSlide}
                onCancel={() => setShowDeleteSlideConfirmation(false)}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div >
    );
};

export default Editor;
