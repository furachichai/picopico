import React, { useState } from 'react';
import { Disc } from 'lucide-react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import './Editor.css';
import { useEditor } from '../../context/EditorContext';

import ContextualMenu from './ContextualMenu';
import BurgerMenu from './BurgerMenu';
import LessonInfoModal from './LessonInfoModal';
import ConfirmationModal from './ConfirmationModal';
import { useTranslation } from 'react-i18next';

const Editor = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const [editingElementId, setEditingElementId] = useState(null);
    const [showSaveFeedback, setShowSaveFeedback] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showNewLessonConfirmation, setShowNewLessonConfirmation] = useState(false);

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
                throw new Error('Failed to save lesson');
            }

            const result = await response.json();
            console.log('Lesson saved to:', result.path);
            return true;
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('Error saving lesson to disk');
            return false;
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
        const success = await saveToDisk(updatedLesson, path);

        if (success) {
            dispatch({
                type: 'UPDATE_LESSON_METADATA',
                payload: { updatedAt: new Date(), path: path }
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
        // data contains { path, title, subject, topic, ... } from LessonInfoModal

        dispatch({
            type: 'UPDATE_LESSON_METADATA',
            payload: {
                title: data.title,
                path: data.path,
                subject: data.subject,
                topic: data.topic,
                chapterId: data.chapterId,
                chapterName: data.chapterName,
                lessonId: data.lessonId
            }
        });

        // Construct the lesson object with the new data
        const lessonToSave = {
            ...state.lesson,
            title: data.title,
            path: data.path,
            subject: data.subject,
            topic: data.topic,
            chapterId: data.chapterId,
            chapterName: data.chapterName,
            lessonId: data.lessonId,
            updatedAt: new Date()
        };

        const success = await saveToDisk(lessonToSave, data.path);

        if (success) {
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
            config: currentSlide.cartridge.config, // Pass config directly
            // Add other props if needed by generic menu parts, but unlikely
        };
    } else {
        selectedElement = currentSlide?.elements.find(e => e.id === state.selectedElementId);
    }

    const handleGlobalClick = (e) => {
        // If clicking on the workspace background (not on a sticker or menu), deselect
        // We check if the click target is strictly the editor-workspace or editor-layout
        // But we also need to allow clicking on the canvas background to deselect (which is handled in Canvas usually)
        // Here we want to catch clicks "somewhere else on the whole screen"

        // If we are clicking inside the contextual menu, do nothing
        if (e.target.closest('.contextual-menu')) return;

        // If we are clicking inside a sticker, do nothing (handled by Sticker)
        if (e.target.closest('.sticker')) return;

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
        // The reducer should handle selecting the new slide, or we might need to do it here if it doesn't auto-select
        // Assuming ADD_SLIDE adds to the end. We might want to switch to it.
        // For now, let's assume the user manually navigates or the reducer handles it.
        // Actually, usually we want to jump to the new slide.
        // Let's trust the reducer or the user flow for now, but ideally the reducer sets currentSlideId to the new one.
    };

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
                <ConfirmationModal
                    isOpen={showNewLessonConfirmation}
                    message={t('editor.discardChanges')}
                    onConfirm={confirmNewLesson}
                    onCancel={() => setShowNewLessonConfirmation(false)}
                    confirmText={t('common.yes')}
                    cancelText={t('common.no')}
                />

                {/* Lesson Info Header */}
                <div className="lesson-info-header">
                    <span className="lesson-title">{state.lesson.title}</span>
                    <span className="slide-counter">{currentSlideIndex + 1}/{state.lesson.slides.length}</span>
                </div>

                <div className={`editor-floating-actions ${selectedElement ? 'disabled-ui' : ''}`}>
                    <BurgerMenu
                        onInfo={() => setShowInfoModal(true)}
                        onNew={handleNewLesson}
                        onMenu={handleGoToMenu}
                        onLessons={() => dispatch({ type: 'SET_VIEW', payload: 'lessons' })}
                    />
                    <div className="top-right-actions">
                        <button
                            className={`btn-floating btn-save ${!state.isDirty ? 'disabled' : ''}`}
                            onClick={handleSaveProject}
                            disabled={!state.isDirty}
                            title={t('editor.save')}
                        >
                            <span style={{ fontSize: '24px' }}>💾</span>
                        </button>
                        <button
                            className="btn-floating btn-preview"
                            onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
                            title={t('editor.preview')}
                        >
                            ▶
                        </button>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className={`editor-navigation ${selectedElement ? 'disabled-ui' : ''}`}>
                    {!isFirstSlide && (
                        <button className="nav-btn nav-prev" onClick={handlePrevSlide}>
                            &lt;
                        </button>
                    )}

                    {isLastSlide ? (
                        <button className="nav-btn nav-add" onClick={handleAddSlide}>
                            +
                        </button>
                    ) : (
                        <button className="nav-btn nav-next" onClick={handleNextSlide}>
                            &gt;
                        </button>
                    )}
                </div>

                <div className="editor-workspace">
                    <Canvas
                        onEditElement={handleEdit}
                        currentSlideIndex={currentSlideIndex}
                        totalSlides={state.lesson.slides.length}
                    />
                </div>

                <div className="bottom-menus">
                    {/* SlideStrip Removed */}
                    {selectedElement ? (
                        <ContextualMenu
                            element={selectedElement}
                            onChange={(id, updates) => {
                                if (id === 'cartridge') {
                                    // Updates contains { config: ... } here based on our ContextualMenu change
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: {
                                            cartridge: {
                                                ...currentSlide.cartridge, // Keep type
                                                ...updates // Merge updates (config)
                                            }
                                        }
                                    });
                                } else {
                                    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } });
                                }
                            }}
                            onDelete={(id) => {
                                if (id === 'cartridge') {
                                    dispatch({ type: 'UPDATE_SLIDE', payload: { cartridge: null } });
                                    dispatch({ type: 'SELECT_ELEMENT', payload: null });
                                } else {
                                    dispatch({ type: 'DELETE_ELEMENT', payload: id });
                                }
                            }}
                            onDuplicate={() => {
                                if (selectedElement.id !== 'cartridge') {
                                    dispatch({ type: 'DUPLICATE_ELEMENT', payload: selectedElement.id });
                                }
                            }}
                        />
                    ) : (
                        <Toolbar />
                    )}
                </div>
            </div>
        </div >
    );
};

export default Editor;
