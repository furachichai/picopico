import React, { useState } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import './Editor.css';
import { useEditor } from '../../context/EditorContext';

import ContextualMenu from './ContextualMenu';
import BurgerMenu from './BurgerMenu';
import { useTranslation } from 'react-i18next';

const Editor = ({ onDelete, onBack }) => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const [editingElementId, setEditingElementId] = useState(null);
    const [showSaveFeedback, setShowSaveFeedback] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showTitlePrompt, setShowTitlePrompt] = useState(false);
    const [lessonTitle, setLessonTitle] = useState(state.lesson.title);

    // Update local title state when lesson title changes
    React.useEffect(() => {
        setLessonTitle(state.lesson.title);
    }, [state.lesson.title]);

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
        if (state.lesson.title === 'New Lesson') {
            setShowTitlePrompt(true);
            return;
        }
        // Mock save feedback
        setShowSaveFeedback(true);
        setTimeout(() => setShowSaveFeedback(false), 2000);
    };

    const handleUpdateTitle = () => {
        dispatch({
            type: 'UPDATE_LESSON_META',
            payload: { title: lessonTitle }
        });
        setShowTitlePrompt(false);
        setShowAboutModal(false);

        // Show feedback if it was a save action
        if (showTitlePrompt) {
            setShowSaveFeedback(true);
            setTimeout(() => setShowSaveFeedback(false), 2000);
        }
    };

    const editingElement = state.lesson.slides
        .find(s => s.id === state.currentSlideId)
        ?.elements.find(e => e.id === editingElementId);

    const selectedElement = state.lesson.slides
        .find(s => s.id === state.currentSlideId)
        ?.elements.find(e => e.id === state.selectedElementId);

    const handleGlobalClick = (e) => {
        if (e.target.closest('.contextual-menu')) return;
        if (e.target.closest('.sticker')) return;
        if (e.target.closest('.modal-overlay')) return; // Don't deselect if clicking in modal

        if (state.selectedElementId) {
            dispatch({ type: 'SELECT_ELEMENT', payload: null });
        }
    };

    const slides = state.lesson.slides;
    const currentSlideIndex = slides.findIndex(s => s.id === state.currentSlideId);
    const isFirstSlide = currentSlideIndex === 0;
    const isLastSlide = currentSlideIndex === slides.length - 1;

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

    return (
        <div className="editor-layout" onClickCapture={handleGlobalClick}>
            {showSaveFeedback && (
                <div className="save-feedback">
                    {t('editor.saved')}
                </div>
            )}

            {(showTitlePrompt || showAboutModal) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-overlay">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-80">
                        <h2 className="text-xl font-bold mb-4">
                            {showTitlePrompt ? 'Name your Lesson' : 'About this Lesson'}
                        </h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={lessonTitle}
                                onChange={(e) => setLessonTitle(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleUpdateTitle}
                                className="w-full bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600"
                            >
                                Save
                            </button>

                            {showAboutModal && (
                                <button
                                    onClick={() => {
                                        if (onDelete) onDelete();
                                    }}
                                    className="w-full bg-red-100 text-red-600 py-2 rounded-lg font-bold hover:bg-red-200"
                                >
                                    Delete Lesson
                                </button>
                            )}

                            {!showTitlePrompt && (
                                <button
                                    onClick={() => setShowAboutModal(false)}
                                    className="w-full text-gray-500 py-2 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="editor-container">
                <div className={`editor-floating-actions ${selectedElement ? 'disabled-ui' : ''}`}>
                    <BurgerMenu onSave={handleSaveProject} onAbout={() => setShowAboutModal(true)} onBack={onBack} />
                    <button
                        className="btn-floating btn-preview"
                        onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
                        title={t('editor.preview')}
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
