import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { ELEMENT_TYPES } from '../../types';
import AssetLibrary from './AssetLibrary';
const Toolbar = () => {
    const { dispatch } = useEditor();
    const [showLibrary, setShowLibrary] = useState(false);

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
                    <button className="btn-secondary" onClick={handleAddText}>Text</button>
                    <button className="btn-secondary" onClick={() => dispatch({
                        type: 'ADD_ELEMENT',
                        payload: { type: ELEMENT_TYPES.BALLOON, content: 'Hello!' }
                    })}>Balloon</button>
                    <button className="btn-secondary" onClick={handleAddQuiz}>Quiz</button>
                    <button className="btn-secondary" onClick={() => dispatch({
                        type: 'ADD_ELEMENT',
                        payload: { type: ELEMENT_TYPES.GAME, content: 'Game', metadata: { gameId: 'target' } }
                    })}>Game</button>
                    <button className="btn-primary" onClick={() => setShowLibrary(!showLibrary)}>Library</button>
                    <div className="color-picker-wrapper">
                        <label htmlFor="bg-color">Bg</label>
                        <input
                            type="color"
                            id="bg-color"
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
