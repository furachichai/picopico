import React, { useState } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import SlideStrip from './SlideStrip';
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

    return (
        <div className="editor-layout">
            {showSaveFeedback && (
                <div className="save-feedback">
                    Saved! ✅
                </div>
            )}

            <div className="editor-header">
                <h2>Microlesson Editor</h2>
                <div className="editor-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
                    >
                        Preview
                    </button>
                    <button className="btn-primary" onClick={handleSaveProject}>Save</button>
                </div>
            </div>
            <div className="editor-container">
                <div className="editor-workspace">
                    <Canvas onEditElement={handleEdit} />
                </div>

                <SlideStrip />
                <Toolbar />
                {selectedElement && (
                    <ContextualMenu
                        element={selectedElement}
                        onChange={(id, updates) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } })}
                        onDelete={() => dispatch({ type: 'DELETE_ELEMENT', payload: selectedElement.id })}
                    />
                )}
            </div>
        </div >
    );
};

export default Editor;
