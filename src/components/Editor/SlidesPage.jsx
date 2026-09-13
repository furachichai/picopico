import React, { useState, useEffect, useMemo } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from 'react-i18next';
import SlideThumbnail from './SlideThumbnail';
import ConfirmationModal from './ConfirmationModal';
import ErrorBoundary from '../ErrorBoundary';
import './SlidesPage.css';

const SlidesPage = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const { lesson } = state;

    const [selectedSlideIds, setSelectedSlideIds] = useState(() => {
        return state.currentSlideId ? [state.currentSlideId] : [];
    });
    const [lastSelectedSlideId, setLastSelectedSlideId] = useState(() => state.currentSlideId || null);

    const [slideToDelete, setSlideToDelete] = useState(null);
    const [slidesToDelete, setSlidesToDelete] = useState(null);
    const [slideToSplit, setSlideToSplit] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');

    const selectedIndices = useMemo(() => {
        return selectedSlideIds
            .map(id => lesson.slides.findIndex(s => s.id === id))
            .filter(idx => idx !== -1);
    }, [selectedSlideIds, lesson.slides]);
    const minSelectedIndex = selectedIndices.length > 0 ? Math.min(...selectedIndices) : -1;
    const maxSelectedIndex = selectedIndices.length > 0 ? Math.max(...selectedIndices) : -1;

    const showFeedback = (msg) => {
        setFeedbackMessage(msg);
        setTimeout(() => setFeedbackMessage(''), 2000);
    };

    // Clean up selection if slides change
    useEffect(() => {
        setSelectedSlideIds(prev => {
            const existingIds = new Set(lesson.slides.map(s => s.id));
            const valid = prev.filter(id => existingIds.has(id));
            if (valid.length > 0) return valid;
            if (state.currentSlideId && existingIds.has(state.currentSlideId)) {
                return [state.currentSlideId];
            }
            return lesson.slides.length > 0 ? [lesson.slides[0].id] : [];
        });
    }, [lesson.slides]);

    const handleAddSlide = () => {
        dispatch({ type: 'ADD_SLIDE' });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
    };

    const handleEditSlide = (id) => {
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: id });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
    };

    const handleSlideClick = (e, slideId, index) => {
        // If clicking inside slide-actions or edit-btn, let them handle it
        if (e.target.closest('.slide-actions') || e.target.closest('.slide-edit-btn')) {
            return;
        }

        if (e.shiftKey) {
            e.preventDefault();
            window.getSelection()?.removeAllRanges();

            // Find anchor slide index
            let anchorIndex = 0;
            if (lastSelectedSlideId) {
                const found = lesson.slides.findIndex(s => s.id === lastSelectedSlideId);
                if (found !== -1) anchorIndex = found;
            } else if (selectedSlideIds.length > 0) {
                const found = lesson.slides.findIndex(s => s.id === selectedSlideIds[0]);
                if (found !== -1) anchorIndex = found;
            } else {
                const found = lesson.slides.findIndex(s => s.id === state.currentSlideId);
                if (found !== -1) anchorIndex = found;
            }

            const start = Math.min(anchorIndex, index);
            const end = Math.max(anchorIndex, index);
            const range = lesson.slides.slice(start, end + 1).map(s => s.id);

            setSelectedSlideIds(range);
            dispatch({ type: 'SET_CURRENT_SLIDE', payload: slideId });
        } else if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setSelectedSlideIds(prev => {
                if (prev.includes(slideId)) {
                    const next = prev.filter(id => id !== slideId);
                    return next.length > 0 ? next : [slideId];
                } else {
                    return [...prev, slideId];
                }
            });
            setLastSelectedSlideId(slideId);
            dispatch({ type: 'SET_CURRENT_SLIDE', payload: slideId });
        } else {
            setSelectedSlideIds([slideId]);
            setLastSelectedSlideId(slideId);
            dispatch({ type: 'SET_CURRENT_SLIDE', payload: slideId });
        }
    };

    const handleToggleCheckbox = (e, slideId) => {
        e.stopPropagation();
        setSelectedSlideIds(prev => {
            if (prev.includes(slideId)) {
                const next = prev.filter(id => id !== slideId);
                return next.length > 0 ? next : [slideId];
            } else {
                return [...prev, slideId];
            }
        });
        setLastSelectedSlideId(slideId);
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: slideId });
    };

    const handleCopySelected = async () => {
        try {
            const idsToCopy = selectedSlideIds.length > 0
                ? selectedSlideIds
                : (state.currentSlideId ? [state.currentSlideId] : []);

            const slidesToCopy = lesson.slides.filter(s => idsToCopy.includes(s.id));
            if (slidesToCopy.length === 0) return;

            const slidesClone = JSON.parse(JSON.stringify(slidesToCopy));
            const multiDataString = `picopico-slides:${JSON.stringify(slidesClone)}`;
            const singleDataString = `picopico-slide:${JSON.stringify(slidesClone[0])}`;

            localStorage.setItem('picopico-copied-slides', multiDataString);
            localStorage.setItem('picopico-copied-slide', singleDataString);

            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(multiDataString);
            }

            showFeedback(slidesToCopy.length === 1
                ? (t('slides.copied') || '1 slide copied!')
                : `${slidesToCopy.length} slides copied!`);
        } catch (err) {
            console.error('Failed to copy slides:', err);
            showFeedback(t('slides.copyFailed') || 'Failed to copy slides');
        }
    };

    const handleCopySingleSlide = async (slide) => {
        try {
            const slideClone = JSON.parse(JSON.stringify(slide));
            const multiDataString = `picopico-slides:${JSON.stringify([slideClone])}`;
            const singleDataString = `picopico-slide:${JSON.stringify(slideClone)}`;

            localStorage.setItem('picopico-copied-slides', multiDataString);
            localStorage.setItem('picopico-copied-slide', singleDataString);

            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(multiDataString);
            }
            showFeedback(t('slides.copied') || '1 slide copied!');
        } catch (err) {
            console.error('Failed to copy slide:', err);
            showFeedback(t('slides.copyFailed') || 'Failed to copy slide');
        }
    };

    const handlePasteSlide = async () => {
        let clipboardText = '';
        try {
            if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                clipboardText = await navigator.clipboard.readText();
            }
        } catch (err) {
            console.warn('Clipboard read failed, trying localStorage:', err);
        }

        if (!clipboardText || (!clipboardText.startsWith('picopico-slides:') && !clipboardText.startsWith('picopico-slide:'))) {
            clipboardText = localStorage.getItem('picopico-copied-slides') || localStorage.getItem('picopico-copied-slide') || '';
        }

        if (clipboardText) {
            try {
                let slidesToPaste = [];
                if (clipboardText.startsWith('picopico-slides:')) {
                    const json = clipboardText.substring('picopico-slides:'.length);
                    slidesToPaste = JSON.parse(json);
                } else if (clipboardText.startsWith('picopico-slide:')) {
                    const json = clipboardText.substring('picopico-slide:'.length);
                    slidesToPaste = [JSON.parse(json)];
                } else {
                    const parsed = JSON.parse(clipboardText);
                    if (Array.isArray(parsed)) slidesToPaste = parsed;
                    else if (parsed._picopicoSlides && Array.isArray(parsed.slides)) slidesToPaste = parsed.slides;
                    else if (parsed && typeof parsed === 'object') slidesToPaste = [parsed];
                }

                if (Array.isArray(slidesToPaste) && slidesToPaste.length > 0) {
                    const targetId = lastSelectedSlideId || state.currentSlideId;
                    dispatch({
                        type: 'PASTE_SLIDES',
                        payload: {
                            slides: slidesToPaste,
                            targetSlideId: targetId
                        }
                    });
                    showFeedback(slidesToPaste.length === 1
                        ? (t('slides.pasted') || '1 slide pasted!')
                        : `${slidesToPaste.length} slides pasted!`);
                } else {
                    showFeedback(t('slides.noCopiedSlide') || 'No copied slide found!');
                }
            } catch (err) {
                console.error('Failed to paste slide:', err);
                showFeedback(t('slides.pasteFailed') || 'Failed to paste: invalid data');
            }
        } else {
            showFeedback(t('slides.noCopiedSlide') || 'No copied slide found!');
        }
    };

    const handleUndo = () => {
        if (state.past && state.past.length > 0) {
            dispatch({ type: 'UNDO_ELEMENT' });
            showFeedback('Undone!');
        }
    };

    const handleDeleteSingleSlide = (id) => {
        setSlideToDelete(id);
    };

    const handleDeleteSelected = () => {
        const toDelete = selectedSlideIds.length > 0
            ? selectedSlideIds
            : (state.currentSlideId ? [state.currentSlideId] : []);

        if (toDelete.length === 0) return;
        if (toDelete.length >= lesson.slides.length) {
            showFeedback('Cannot delete all slides');
            return;
        }
        setSlidesToDelete(toDelete);
    };

    const confirmDelete = () => {
        if (slidesToDelete && slidesToDelete.length > 0) {
            dispatch({ type: 'DELETE_SLIDES', payload: slidesToDelete });
            showFeedback(slidesToDelete.length === 1 ? '1 slide deleted' : `${slidesToDelete.length} slides deleted`);
            setSelectedSlideIds([]);
            setSlidesToDelete(null);
        } else if (slideToDelete) {
            dispatch({ type: 'DELETE_SLIDE', payload: slideToDelete });
            setSlideToDelete(null);
        }
    };

    const cancelDelete = () => {
        setSlideToDelete(null);
        setSlidesToDelete(null);
    };

    const handleSplitLesson = (id) => {
        setSlideToSplit(id);
    };

    const confirmSplit = async () => {
        if (!slideToSplit) return;

        const splitIndex = lesson.slides.findIndex(s => s.id === slideToSplit);
        if (splitIndex === -1 || splitIndex === lesson.slides.length - 1) {
            setSlideToSplit(null);
            return;
        }

        const lesson1Slides = lesson.slides.slice(0, splitIndex + 1);
        const lesson2Slides = lesson.slides.slice(splitIndex + 1);

        let newPath = '';
        if (lesson.path && lesson.path.startsWith('local://')) {
            newPath = `local://${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        } else if (lesson.path) {
            const baseFolder = lesson.path.substring(0, lesson.path.lastIndexOf('/'));
            newPath = `${baseFolder}_Part_2/lesson.json`;
        } else {
            newPath = `local://${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        const lesson2 = {
            ...lesson,
            id: newPath,
            path: newPath,
            title: `${lesson.title || 'Lesson'} - Part 2`,
            slides: lesson2Slides,
            updatedAt: new Date()
        };

        try {
            if (newPath.startsWith('local://')) {
                const { saveLocalLesson } = await import('../../utils/lessonStorage');
                saveLocalLesson(lesson2);
            } else {
                await fetch('/api/save-lesson', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: newPath, content: lesson2 })
                });
            }

            dispatch({ type: 'REPLACE_SLIDES', payload: lesson1Slides });

            const updatedLesson1 = {
                ...lesson,
                slides: lesson1Slides,
                updatedAt: new Date()
            };

            if (lesson.path && lesson.path.startsWith('local://')) {
                const { saveLocalLesson } = await import('../../utils/lessonStorage');
                saveLocalLesson(updatedLesson1);
            } else if (lesson.path) {
                await fetch('/api/save-lesson', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: lesson.path, content: updatedLesson1 })
                });
            }

            showFeedback(t('slides.splitSuccess') || 'Lesson split successfully!');
        } catch (error) {
            console.error('Failed to split lesson:', error);
            showFeedback(t('slides.splitFailed') || 'Failed to split lesson');
        }

        setSlideToSplit(null);
    };

    const cancelSplit = () => {
        setSlideToSplit(null);
    };

    const handleMoveSlide = (id, direction) => {
        if (selectedSlideIds.length > 1 && selectedSlideIds.includes(id)) {
            dispatch({ type: 'MOVE_SLIDES', payload: { slideIds: selectedSlideIds, direction } });
            showFeedback(`Moved ${selectedSlideIds.length} slides ${direction === 'left' ? 'left' : 'right'}`);
        } else {
            dispatch({ type: 'MOVE_SLIDE', payload: { slideId: id, direction } });
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Cmd+Z / Ctrl+Z: Undo
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                handleUndo();
                return;
            }

            // Cmd+C / Ctrl+C: Copy
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCopySelected();
                return;
            }

            // Cmd+V / Ctrl+V: Paste
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                handlePasteSlide();
                return;
            }

            // Cmd+A / Ctrl+A: Select All
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setSelectedSlideIds(lesson.slides.map(s => s.id));
                return;
            }

            // Alt + ArrowLeft / Alt + ArrowRight: Move selected slide(s)
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                const direction = e.key === 'ArrowLeft' ? 'left' : 'right';
                if (selectedSlideIds.length > 1) {
                    if (direction === 'left' && minSelectedIndex > 0) {
                        handleMoveSlide(selectedSlideIds[0], 'left');
                    } else if (direction === 'right' && maxSelectedIndex < lesson.slides.length - 1 && maxSelectedIndex !== -1) {
                        handleMoveSlide(selectedSlideIds[0], 'right');
                    }
                } else if (selectedSlideIds.length === 1) {
                    const currIdx = lesson.slides.findIndex(s => s.id === selectedSlideIds[0]);
                    if (direction === 'left' && currIdx > 0) {
                        handleMoveSlide(selectedSlideIds[0], 'left');
                    } else if (direction === 'right' && currIdx < lesson.slides.length - 1 && currIdx !== -1) {
                        handleMoveSlide(selectedSlideIds[0], 'right');
                    }
                }
                return;
            }

            // Backspace / Delete: Delete selected
            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (selectedSlideIds.length > 0 && selectedSlideIds.length < lesson.slides.length) {
                    e.preventDefault();
                    handleDeleteSelected();
                }
                return;
            }

            // Enter: Edit focused slide
            if (e.key === 'Enter') {
                const targetId = lastSelectedSlideId || state.currentSlideId;
                if (targetId) {
                    handleEditSlide(targetId);
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSlideIds, lastSelectedSlideId, lesson.slides, state.currentSlideId, state.past, minSelectedIndex, maxSelectedIndex]);

    return (
        <div className="slides-page">
            {feedbackMessage && (
                <div className="slides-feedback">
                    {feedbackMessage}
                </div>
            )}
            <ConfirmationModal
                isOpen={slideToDelete !== null || slidesToDelete !== null}
                message={slidesToDelete && slidesToDelete.length > 1
                    ? `Are you sure you want to delete these ${slidesToDelete.length} slides?`
                    : (t('slides.confirmDelete') || 'Are you sure you want to delete this slide?')}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmText={t('common.yes') || 'Delete'}
                cancelText={t('common.no') || 'Cancel'}
            />
            <ConfirmationModal
                isOpen={slideToSplit !== null}
                message={t('slides.confirmSplit') || 'Split the lesson here? This slide will be the last slide of the first lesson.'}
                onConfirm={confirmSplit}
                onCancel={cancelSplit}
                confirmText={t('common.yes') || 'Split'}
                cancelText={t('common.no') || 'Cancel'}
            />

            <div className="slides-header">
                <div className="slides-header-left">
                    <button className="btn-back" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'editor' })}>
                        &lt; {t('slides.back')}
                    </button>
                    <h1>{t('slides.title')}</h1>
                    {selectedSlideIds.length > 1 && (
                        <span className="slides-selected-badge">
                            {selectedSlideIds.length} {t('slides.selected') || 'selected'}
                        </span>
                    )}
                </div>
                <div className="slides-header-actions">
                    <button
                        className="btn-header btn-undo"
                        onClick={handleUndo}
                        disabled={!state.past || state.past.length === 0}
                        title="Undo (Cmd+Z)"
                    >
                        ↩️
                    </button>
                    <button
                        className="btn-header btn-copy"
                        onClick={handleCopySelected}
                        title="Copy selected slides (Cmd+C)"
                    >
                        📋 {selectedSlideIds.length > 1 ? `(${selectedSlideIds.length})` : ''} {t('slides.copy') || 'Copy'}
                    </button>
                    <button
                        className="btn-header btn-paste"
                        onClick={handlePasteSlide}
                        title="Paste slides (Cmd+V)"
                    >
                        📥 {t('slides.paste') || 'Paste'}
                    </button>
                    {selectedSlideIds.length > 1 && (
                        <button
                            className="btn-header btn-delete-multi"
                            onClick={handleDeleteSelected}
                            title="Delete selected slides"
                            disabled={selectedSlideIds.length >= lesson.slides.length}
                        >
                            🗑️ ({selectedSlideIds.length})
                        </button>
                    )}
                    <button className="btn-primary btn-create" onClick={handleAddSlide}>
                        + {t('slides.create')}
                    </button>
                </div>
            </div>

            <div className="slides-grid">
                {lesson.slides.map((slide, index) => {
                    const isSelected = selectedSlideIds.includes(slide.id);
                    const isMultiSelected = isSelected && selectedSlideIds.length > 1;
                    const isLeftDisabled = isMultiSelected ? minSelectedIndex <= 0 : index === 0;
                    const isRightDisabled = isMultiSelected ? maxSelectedIndex >= lesson.slides.length - 1 : index === lesson.slides.length - 1;
                    const leftTitle = isMultiSelected
                        ? (minSelectedIndex <= 0 ? 'Cannot move slides further left' : `Move ${selectedSlideIds.length} slides left`)
                        : t('slides.moveLeft');
                    const rightTitle = isMultiSelected
                        ? (maxSelectedIndex >= lesson.slides.length - 1 ? 'Cannot move slides further right' : `Move ${selectedSlideIds.length} slides right`)
                        : t('slides.moveRight');

                    return (
                        <div
                            key={slide.id}
                            className={`slide-card ${isSelected ? 'is-selected' : ''}`}
                            onClick={(e) => handleSlideClick(e, slide.id, index)}
                            onDoubleClick={() => handleEditSlide(slide.id)}
                        >
                            <div className="slide-preview">
                                <ErrorBoundary>
                                    <SlideThumbnail slide={slide} />
                                </ErrorBoundary>
                                <span className="slide-number">{index + 1}</span>
                                <button
                                    className={`slide-select-checkbox ${isSelected ? 'is-checked' : ''}`}
                                    onClick={(e) => handleToggleCheckbox(e, slide.id)}
                                    title={isSelected ? "Deselect slide" : "Select slide (Shift-click to select range)"}
                                >
                                    {isSelected ? '✓' : ''}
                                </button>
                                <button
                                    className="slide-edit-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditSlide(slide.id);
                                    }}
                                    title="Edit Slide"
                                >
                                    ✏️ Edit
                                </button>
                            </div>
                            <div className="slide-actions">
                                <button
                                    className="btn-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveSlide(slide.id, 'left');
                                    }}
                                    disabled={isLeftDisabled}
                                    title={leftTitle}
                                >
                                    ⬅️
                                </button>
                                <button
                                    className="btn-icon btn-duplicate"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch({ type: 'DUPLICATE_SLIDE', payload: slide.id });
                                    }}
                                    title={t('slides.duplicate') || "Duplicate"}
                                >
                                    x2
                                </button>
                                <button
                                    className="btn-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopySingleSlide(slide);
                                    }}
                                    title={t('slides.copy') || "Copy Slide"}
                                >
                                    📋
                                </button>
                                <button
                                    className="btn-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveSlide(slide.id, 'right');
                                    }}
                                    disabled={isRightDisabled}
                                    title={rightTitle}
                                >
                                    ➡️
                                </button>
                                <button
                                    className="btn-icon btn-split"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSplitLesson(slide.id);
                                    }}
                                    disabled={index === lesson.slides.length - 1}
                                    title={t('slides.split') || "Split Lesson Here"}
                                >
                                    ✂️
                                </button>
                                <button
                                    className="btn-icon btn-delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSingleSlide(slide.id);
                                    }}
                                    disabled={lesson.slides.length <= 1}
                                    title={t('slides.delete')}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SlidesPage;

