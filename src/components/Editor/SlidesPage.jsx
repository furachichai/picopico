import React, { useState } from 'react';
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

    const [slideToDelete, setSlideToDelete] = useState(null);

    const handleAddSlide = () => {
        dispatch({ type: 'ADD_SLIDE' });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
    };

    const handleDeleteSlide = (id) => {
        // Show confirmation modal instead of window.confirm
        setSlideToDelete(id);
    };

    const confirmDelete = () => {
        if (slideToDelete) {
            dispatch({ type: 'DELETE_SLIDE', payload: slideToDelete });
        }
        setSlideToDelete(null);
    };

    const cancelDelete = () => {
        setSlideToDelete(null);
    };

    const handleMoveSlide = (id, direction) => {
        dispatch({ type: 'MOVE_SLIDE', payload: { slideId: id, direction } });
    };

    const handleEditSlide = (id) => {
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: id });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
    };

    const handleCopySlide = async (slide) => {
        try {
            const slideClone = JSON.parse(JSON.stringify(slide));
            const dataString = `picopico-slide:${JSON.stringify(slideClone)}`;
            localStorage.setItem('picopico-copied-slide', dataString);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(dataString);
            }
            alert('Slide copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy slide:', err);
            alert('Failed to copy slide');
        }
    };

    const handlePasteSlide = async () => {
        let clipboardText = '';
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                clipboardText = await navigator.clipboard.readText();
            }
        } catch (err) {
            console.warn('Clipboard read failed, trying localStorage:', err);
        }

        if (!clipboardText || !clipboardText.startsWith('picopico-slide:')) {
            clipboardText = localStorage.getItem('picopico-copied-slide') || '';
        }

        if (clipboardText && clipboardText.startsWith('picopico-slide:')) {
            try {
                const slideJson = clipboardText.substring('picopico-slide:'.length);
                const slideObj = JSON.parse(slideJson);
                dispatch({ type: 'PASTE_SLIDE', payload: slideObj });
            } catch (err) {
                console.error('Failed to paste slide:', err);
                alert('Failed to paste slide: invalid slide data');
            }
        } else {
            alert('No copied slide found! Please copy a slide first.');
        }
    };

    return (
        <div className="slides-page">
            <ConfirmationModal
                isOpen={slideToDelete !== null}
                message={t('slides.confirmDelete') || 'Are you sure you want to delete this slide?'}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmText={t('common.yes') || 'Delete'}
                cancelText={t('common.no') || 'Cancel'}
            />

            <div className="slides-header">
                <button className="btn-back" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'editor' })}>
                    &lt; {t('slides.back')}
                </button>
                <h1>{t('slides.title')}</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-paste" onClick={handlePasteSlide} title={t('slides.paste') || "Paste Slide"}>
                        📋 {t('slides.paste') || 'Paste'}
                    </button>
                    <button className="btn-primary btn-create" onClick={handleAddSlide}>
                        + {t('slides.create')}
                    </button>
                </div>
            </div>

            <div className="slides-grid">
                {lesson.slides.map((slide, index) => (
                    <div key={slide.id} className="slide-card">
                        <div
                            className="slide-preview"
                            onClick={() => handleEditSlide(slide.id)}
                        >
                            <ErrorBoundary>
                                <SlideThumbnail slide={slide} />
                            </ErrorBoundary>
                            <span className="slide-number">{index + 1}</span>
                        </div>
                        <div className="slide-actions">
                            <button
                                className="btn-icon"
                                onClick={() => handleMoveSlide(slide.id, 'left')}
                                disabled={index === 0}
                                title={t('slides.moveLeft')}
                            >
                                ⬅️
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => dispatch({ type: 'DUPLICATE_SLIDE', payload: slide.id })}
                                title={t('slides.duplicate') || "Duplicate"}
                            >
                                📄
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => handleCopySlide(slide)}
                                title={t('slides.copy') || "Copy Slide"}
                            >
                                📋
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => handleMoveSlide(slide.id, 'right')}
                                disabled={index === lesson.slides.length - 1}
                                title={t('slides.moveRight')}
                            >
                                ➡️
                            </button>
                            <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteSlide(slide.id)}
                                disabled={lesson.slides.length <= 1}
                                title={t('slides.delete')}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SlidesPage;
