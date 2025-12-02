import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from 'react-i18next';
import SlideThumbnail from './SlideThumbnail';
import './SlidesPage.css';

const SlidesPage = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const { lesson } = state;

    console.log('SlidesPage rendered', lesson);

    const handleAddSlide = () => {
        dispatch({ type: 'ADD_SLIDE' });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
    };

    const handleDeleteSlide = (id) => {
        if (window.confirm(t('slides.confirmDelete'))) {
            dispatch({ type: 'DELETE_SLIDE', payload: id });
        }
    };

    const handleMoveSlide = (id, direction) => {
        dispatch({ type: 'MOVE_SLIDE', payload: { slideId: id, direction } });
    };

    const handleEditSlide = (id) => {
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: id });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
    };

    return (
        <div className="slides-page">
            <div className="slides-header">
                <button className="btn-back" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'editor' })}>
                    &lt; {t('slides.back')}
                </button>
                <h1>{t('slides.title')}</h1>
                <button className="btn-primary btn-create" onClick={handleAddSlide}>
                    + {t('slides.create')}
                </button>
            </div>

            <div className="slides-grid">
                {lesson.slides.map((slide, index) => (
                    <div key={slide.id} className="slide-card">
                        <div
                            className="slide-preview"
                            onClick={() => handleEditSlide(slide.id)}
                        >
                            <SlideThumbnail slide={slide} />
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
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteSlide(slide.id)}
                                disabled={lesson.slides.length <= 1}
                                title={t('slides.delete')}
                            >
                                🗑️
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => handleMoveSlide(slide.id, 'right')}
                                disabled={index === lesson.slides.length - 1}
                                title={t('slides.moveRight')}
                            >
                                ➡️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SlidesPage;
