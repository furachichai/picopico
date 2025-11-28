import React from 'react';
import { useEditor } from '../../context/EditorContext';
import './SlideStrip.css';

const SlideStrip = () => {
    const { state, dispatch } = useEditor();
    const { lesson, currentSlideId } = state;

    const handleSelect = (id) => {
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: id });
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (confirm('Delete this slide?')) {
            dispatch({ type: 'DELETE_SLIDE', payload: id });
        }
    };

    const handleMove = (e, id, direction) => {
        e.stopPropagation();
        dispatch({ type: 'MOVE_SLIDE', payload: { slideId: id, direction } });
    };

    return (
        <div className="slide-strip">
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
                                className="btn-delete"
                                onClick={(e) => handleDelete(e, slide.id)}
                            >
                                &times;
                            </button>
                            <button
                                disabled={index === lesson.slides.length - 1}
                                onClick={(e) => handleMove(e, slide.id, 'right')}
                            >
                                &gt;
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
