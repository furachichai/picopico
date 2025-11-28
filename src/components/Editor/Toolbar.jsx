import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { ELEMENT_TYPES } from '../../types';
import AssetLibrary from './AssetLibrary';
const Toolbar = () => {
    const { state, dispatch } = useEditor();
    const [showLibrary, setShowLibrary] = useState(false);

    const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
    const currentBackground = currentSlide?.background || '#ffffff';
    // Ensure it's a hex code for the color input. If it's a gradient or url, we can't show it in type="color".
    // We'll fallback to black or white if it's not a hex.
    const isHex = currentBackground.startsWith('#');
    const colorValue = isHex ? currentBackground : '#000000';

    const handleAddText = () => {
        dispatch({
            type: 'ADD_ELEMENT',
            payload: { type: ELEMENT_TYPES.TEXT, content: 'New Text' }
        });
    };

    const handleAddQuiz = () => {
        dispatch({
            type: 'ADD_ELEMENT',
            payload: {
                type: ELEMENT_TYPES.QUIZ,
                content: 'Quiz',
                metadata: {
                    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                    correctIndex: 0
                }
            }
        });
    };

    const handleBackgroundChange = (e) => {
        dispatch({ type: 'UPDATE_SLIDE_BACKGROUND', payload: e.target.value });
    };

    return (
        <>
            {showLibrary && <AssetLibrary onClose={() => setShowLibrary(false)} />}
            <div className="editor-toolbar">
                <div className="toolbar-section">
                    <button className="btn-secondary" onClick={handleAddText} title="Add Text" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>T</button>
                    <button className="btn-secondary" onClick={() => dispatch({
                        type: 'ADD_ELEMENT',
                        payload: { type: ELEMENT_TYPES.BALLOON, content: 'Hello!' }
                    })} title="Add Balloon" style={{ fontSize: '1.2rem' }}>💬</button>
                    <button className="btn-secondary" onClick={handleAddQuiz}>Quiz</button>
                    <button className="btn-primary" onClick={() => setShowLibrary(!showLibrary)} title="Open Library" style={{ fontSize: '1.2rem' }}>📚</button>
                    <div className="color-picker-wrapper">
                        <label htmlFor="bg-color">Bg</label>
                        <input
                            type="color"
                            id="bg-color"
                            value={colorValue}
                            onChange={handleBackgroundChange}
                            title="Change Background"
                        />
                    </div>
                </div>
                <div className="toolbar-section">
                    {/* Add Slide button moved back to SlideStrip */}
                </div>
            </div>
        </>
    );
};

export default Toolbar;
