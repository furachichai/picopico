import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../context/EditorContext';
import { ELEMENT_TYPES } from '../../types';
import AssetLibrary from './AssetLibrary';
import { Gamepad2 } from 'lucide-react';

const Toolbar = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const [showLibrary, setShowLibrary] = useState(false);
    const [showQuizMenu, setShowQuizMenu] = useState(false);

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

    const handleAddQuiz = (type = 'classic') => {
        setShowQuizMenu(false);

        // Check for existing quiz
        const hasQuiz = currentSlide?.elements?.some(el => el.type === ELEMENT_TYPES.QUIZ);
        if (hasQuiz) {
            alert("Only one quiz allowed per slide!");
            return;
        }

        const isTF = type === 'tf';

        dispatch({
            type: 'ADD_ELEMENT',
            payload: {
                type: ELEMENT_TYPES.QUIZ,
                content: 'Quiz',
                metadata: {
                    options: isTF ? ['True', 'False'] : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                    correctIndex: 0,
                    correctIndices: [0], // For 4sq multi-select
                    quizType: type, // 'classic', 'tf', '4sq', 'nl'
                    visualMode: false,
                    // NL Defaults
                    nlConfig: type === 'nl' ? {
                        min: 0,
                        max: 10,
                        stepCount: 10,
                        hideLabels: false,
                        correctValue: 5
                    } : undefined
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
                    <button className="btn-secondary" onClick={handleAddText} title={t('editor.addText')} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>T</button>
                    <button className="btn-secondary" onClick={() => dispatch({
                        type: 'ADD_ELEMENT',
                        payload: { type: ELEMENT_TYPES.BALLOON, content: 'Hello!' }
                    })} title={t('editor.addBalloon')} style={{ fontSize: '1.2rem' }}>💬</button>

                    <div className="toolbar-dropdown-container" style={{ position: 'relative' }}>
                        <button
                            className={`btn-secondary ${showQuizMenu ? 'active' : ''}`}
                            onClick={() => setShowQuizMenu(!showQuizMenu)}
                            title={t('editor.addQuiz')}
                        >
                            Quiz
                        </button>
                        {showQuizMenu && (
                            <div className="toolbar-submenu">
                                <button onClick={() => handleAddQuiz('classic')}>Classic</button>
                                <button onClick={() => handleAddQuiz('tf')}>True/False</button>
                                <button onClick={() => handleAddQuiz('4sq')}>4 Squares</button>
                                <button onClick={() => handleAddQuiz('nl')}>Number Line</button>
                            </div>
                        )}
                    </div>

                    <button className="btn-secondary" onClick={() => {
                        dispatch({
                            type: 'UPDATE_SLIDE',
                            payload: {
                                cartridge: {
                                    type: 'FractionAlpha',
                                    config: {
                                        mode: 'fracture',
                                        targetDenominator: 3,
                                        targetNumerator: 1,
                                        initialDenominator: 1
                                    }
                                }
                            }
                        });
                    }} title="Add Fraction Alpha">
                        <Gamepad2 size={24} />
                    </button>
                    <button className="btn-secondary" onClick={() => {
                        dispatch({
                            type: 'UPDATE_SLIDE',
                            payload: {
                                cartridge: {
                                    type: 'FractionSlicer',
                                    config: {
                                        levels: 5,
                                        tolerance: 0.10
                                    }
                                }
                            }
                        });
                    }} title="Add Fraction Slicer">
                        <span style={{ fontSize: '1.4rem' }}>⚔️</span>
                    </button>
                    <button className="btn-secondary" onClick={() => { console.log('Slides button clicked'); dispatch({ type: 'SET_VIEW', payload: 'slides' }); }} title={t('editor.slides')} style={{ fontSize: '1.2rem' }}>🎞️</button>
                    <button className="btn-primary" onClick={() => setShowLibrary(!showLibrary)} title={t('editor.openLibrary')} style={{ fontSize: '1.2rem' }}>📚</button>
                    <div className="color-picker-wrapper">
                        <label htmlFor="bg-color">{t('editor.background')}</label>
                        <input
                            type="color"
                            id="bg-color"
                            value={colorValue}
                            onChange={handleBackgroundChange}
                            title={t('editor.background')}
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
