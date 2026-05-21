import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import ConfirmationModal from './ConfirmationModal';
import './SlideStrip.css';

const SlideStrip = () => {
    const { state, dispatch } = useEditor();
    const { lesson, currentSlideId } = state;
    const [slideToDelete, setSlideToDelete] = useState(null);

    const handleSelect = (id) => {
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: id });
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
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

    const handleMove = (e, id, direction) => {
        e.stopPropagation();
        dispatch({ type: 'MOVE_SLIDE', payload: { slideId: id, direction } });
    };

    return (
        <div className="slide-strip">
            <ConfirmationModal
                isOpen={slideToDelete !== null}
                message="Are you sure you want to delete this slide?"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmText="Delete"
                cancelText="Cancel"
            />
            <div className="slides-list">
                {lesson.slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className={`slide-thumbnail ${slide.id === currentSlideId ? 'active' : ''}`}
                        onClick={() => handleSelect(slide.id)}
                    >
                        <div className="slide-number">{index + 1}</div>
                        <div className="thumbnail-preview" style={{
                            background: slide.background,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                        }}>
                            {/* Mini preview of elements could go here */}
                            {slide.elements.length > 0 && <div className="element-count">{slide.elements.length} items</div>}
                        </div>
                        <div className="slide-controls">
                            <button
                                disabled={index === 0}
                                onClick={(e) => handleMove(e, slide.id, 'left')}
                            >
                                &lt;
                            </button>
                            <button
                                disabled={index === lesson.slides.length - 1}
                                onClick={(e) => handleMove(e, slide.id, 'right')}
                            >
                                &gt;
                            </button>
                            <button
                                className="btn-delete"
                                onClick={(e) => handleDelete(e, slide.id)}
                                disabled={lesson.slides.length <= 1}
                                title="Delete Slide"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    className="add-slide-btn"
                    onClick={() => dispatch({ type: 'ADD_SLIDE' })}
                >
                    +
                </button>
            </div>
        </div>
    );
};

export default SlideStrip;
