import React, { useState } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import './Editor.css';
import { useEditor } from '../../context/EditorContext';

import ContextualMenu from './ContextualMenu';

const Editor = () => {
    const { state, dispatch } = useEditor();
    const [editingElementId, setEditingElementId] = useState(null);
    const [showSaveFeedback, setShowSaveFeedback] = useState(false);

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

    const handleSaveProject = () => {
        // Mock save
        setShowSaveFeedback(true);
        setTimeout(() => setShowSaveFeedback(false), 2000);
    };



    const editingElement = state.lesson.slides
        .find(s => s.id === state.currentSlideId)
        ?.elements.find(e => e.id === editingElementId);

    const selectedElement = state.lesson.slides
        .find(s => s.id === state.currentSlideId)
        ?.elements.find(e => e.id === state.selectedElementId);

    const handleGlobalClick = (e) => {
        // If clicking on the workspace background (not on a sticker or menu), deselect
        // We check if the click target is strictly the editor-workspace or editor-layout
        // But we also need to allow clicking on the canvas background to deselect (which is handled in Canvas usually)
        // Here we want to catch clicks "somewhere else on the whole screen"

        // If we are clicking inside the contextual menu, do nothing
        if (e.target.closest('.contextual-menu')) return;

        // If we are clicking inside a sticker, do nothing (handled by Sticker)
        if (e.target.closest('.sticker')) return;

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
        <div className="editor-layout" onClickCapture={handleGlobalClick}>
            {showSaveFeedback && (
                <div className="save-feedback">
                    Saved! ✅
                </div>
            )}

            <div className="editor-container">
                <div className={`editor-floating-actions ${selectedElement ? 'disabled-ui' : ''}`}>
                    <button
                        className="btn-floating btn-save"
                        onClick={handleSaveProject}
                        title="Save"
                    >
                        💾
                    </button>
                    <button
                        className="btn-floating btn-preview"
                        onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
                        title="Preview"
                    >
                        ▶
                    </button>

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
                            onChange={(id, updates) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } })}
                            onDelete={() => dispatch({ type: 'DELETE_ELEMENT', payload: selectedElement.id })}
                            onDuplicate={() => dispatch({ type: 'DUPLICATE_ELEMENT', payload: selectedElement.id })}
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
