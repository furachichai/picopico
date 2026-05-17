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
import { useTranslation } from 'react-i18next';

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

        dispatch({
            type: 'UPDATE_LESSON_METADATA',
            payload: {
                title: data.title,
                path: data.path,
            }
        });

        // Construct the lesson object with the new data
        const lessonToSave = {
            ...state.lesson,
            title: data.title,
            path: data.path,
            updatedAt: new Date()
        };

        const { success, path: savedPath } = await saveToDisk(lessonToSave, data.path);

        if (success) {
            // Update metadata with the actual saved path (in case it fell back to local)
            dispatch({
                type: 'UPDATE_LESSON_METADATA',
                payload: { path: savedPath }
            });

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

    const handleGoToMenu = () => {
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
    };

    // Shared ContextualMenu handlers (used in both bottom-menus and floating keyboard mode)
    const handleContextMenuChange = (id, updates) => {
        if (id === 'cartridge') {
            const slide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            dispatch({
                type: 'UPDATE_SLIDE',
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
                if (updates.metadata.opacity !== undefined) newSettings.opacity = updates.metadata.opacity;
                if (updates.metadata.brightness !== undefined) newSettings.brightness = updates.metadata.brightness;
                if (updates.metadata.flipX !== undefined) newSettings.flipX = updates.metadata.flipX;
                if (updates.metadata.flipY !== undefined) newSettings.flipY = updates.metadata.flipY;
            }
            dispatch({
                type: 'UPDATE_SLIDE',
                payload: {
                    ...(newBackground ? { background: newBackground } : {}),
                    backgroundSettings: { ...slide?.backgroundSettings, ...newSettings }
                }
            });
        } else {
            dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } });
        }
    };

    const handleContextMenuDelete = (id) => {
        if (id === 'cartridge') {
            dispatch({ type: 'UPDATE_SLIDE', payload: { cartridge: null } });
            dispatch({ type: 'SELECT_ELEMENT', payload: null });
        } else {
            dispatch({ type: 'DELETE_ELEMENT', payload: id });
        }
    };

    const handleContextMenuDuplicate = () => {
        const sel = state.lesson.slides.find(s => s.id === state.currentSlideId)?.elements.find(e => e.id === state.selectedElementId);
        if (sel && sel.id !== 'cartridge') {
            dispatch({ type: 'DUPLICATE_ELEMENT', payload: sel.id });
        }
    };

    const handleReorderElement = (elementId, direction) => {
        dispatch({ type: 'REORDER_ELEMENT', payload: { elementId, direction } });
    };

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
            setLibraryAllowedTabs(['custom', 'emojis', 'gifs']);
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
    if (state.selectedElementId === 'cartridge' && currentSlide?.cartridge) {
        // Mock an element structure for the cartridge so ContextualMenu can consume it
        selectedElement = {
            id: 'cartridge',
            type: 'cartridge', // Special type
            cartridgeType: currentSlide.cartridge.type, // Pass specific cartridge type (FractionAlpha, FractionSlicer)
            config: currentSlide.cartridge.config, // Pass config directly
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

        // If we are clicking on the toolbar or slidestrip while they are disabled, we might want to deselect?
        // Or if we click anywhere else.

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
            if (
                e.target.isContentEditable ||
                e.target.closest('[contenteditable="true"]') ||
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.tagName === 'SELECT'
            ) return;

            // Text Formatting Shortcuts (Cmd+B, Cmd+I, Cmd+U)
            if ((e.metaKey || e.ctrlKey) && state.selectedElementId && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
                e.preventDefault();
                const key = e.key.toLowerCase();
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
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElementId) {
                e.preventDefault();
                handleContextMenuDelete(state.selectedElementId);
            }

            // Arrow key slide navigation
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevSlide();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextSlide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.selectedElementId, handlePrevSlide, handleNextSlide]);

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
                    <BurgerMenu
                        onInfo={() => setShowInfoModal(true)}
                        onNew={handleNewLesson}
                        onMenu={handleGoToMenu}
                        onLessons={() => dispatch({ type: 'SET_VIEW', payload: 'lessons' })}
                        onPresets={() => setShowPresetPanel(true)}
                        disabled={isTranslating}
                    />
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
                    {!isFirstSlide && (
                        <div className="nav-group nav-group-left">
                            <button
                                className="nav-insert"
                                onClick={() => dispatch({ type: 'INSERT_SLIDE', payload: 'before' })}
                                title={t('editor.insertBefore') || 'Insert before'}
                            >
                                +
                            </button>
                            <button className="nav-btn nav-prev" onClick={handlePrevSlide}>
                                &lt;
                            </button>
                        </div>
                    )}

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

                    {/* Floating Context Menu — appears above quiz when keyboard is visible */}
                    {isKeyboardVisible && selectedElement?.type === 'quiz' && (
                        <div className="floating-context-menu" style={{
                            bottom: `${100 - (selectedElement.y || 50)}%`
                        }}>
                            <ContextualMenu
                                element={selectedElement}
                                onChange={handleContextMenuChange}
                                onDelete={handleContextMenuDelete}
                                onDuplicate={handleContextMenuDuplicate}
                                onOpenLibrary={handleContextMenuOpenLibrary}
                                onOpenPresets={() => setShowPresetPanel(true)}
                                onReorderElement={handleReorderElement}
                                onUndo={handleUndo}
                                showGuides={state.showGuides}
                                onToggleGuides={() => dispatch({ type: 'TOGGLE_GUIDES' })}
                            />
                        </div>
                    )}
                </div>

                {!isTranslating && (
                <div className={`bottom-menus ${isKeyboardVisible && selectedElement?.type === 'quiz' ? 'hidden-menus' : ''}`}>
                    {/* SlideStrip Removed */}
                    {selectedElement ? (
                        <ContextualMenu
                            element={selectedElement}
                            onChange={handleContextMenuChange}
                            onDelete={handleContextMenuDelete}
                            onDuplicate={handleContextMenuDuplicate}
                            onOpenLibrary={handleContextMenuOpenLibrary}
                            onOpenPresets={() => setShowPresetPanel(true)}
                            onReorderElement={handleReorderElement}
                            onUndo={handleUndo}
                            showGuides={state.showGuides}
                            onToggleGuides={() => dispatch({ type: 'TOGGLE_GUIDES' })}
                        />
                    ) : (
                        <Toolbar
                            onOpenLibrary={(tab) => {
                                setLibraryTab(tab || 'custom');
                                setLibraryAllowedTabs(['custom', 'emojis', 'gifs']); // Sticker Mode
                                setShowLibrary(true);
                            }}
                        />
                    )}
                </div>
                )}
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
        </div >
    );
};

export default Editor;
