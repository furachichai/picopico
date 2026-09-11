import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../context/EditorContext';
import { ELEMENT_TYPES } from '../../types';
import { Gamepad2 } from 'lucide-react';
import { getSymbolSvg } from '../../utils/symbols';
import { getNonOverlappingResultFieldPosition } from '../../utils/ResultFieldUtils';
import ScriptImportModal from './ScriptImportModal';

const Toolbar = ({ onOpenLibrary, onDeleteSlide }) => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const [showQuizMenu, setShowQuizMenu] = useState(false);
    const [showQ2Menu, setShowQ2Menu] = useState(false);
    const [showGameMenu, setShowGameMenu] = useState(false);
    const [showIStickerMenu, setShowIStickerMenu] = useState(false);
    const [showSymbolsMenu, setShowSymbolsMenu] = useState(false);
    const [showScriptImport, setShowScriptImport] = useState(false);

    const hasAnyDropdown = showQuizMenu || showQ2Menu || showGameMenu || showIStickerMenu || showSymbolsMenu;

    // Close open toolbar submenus when clicking outside
    useEffect(() => {
        if (!hasAnyDropdown) return;
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.toolbar-dropdown-container')) {
                setShowQuizMenu(false);
                setShowQ2Menu(false);
                setShowGameMenu(false);
                setShowIStickerMenu(false);
                setShowSymbolsMenu(false);
            }
        };
        const timer = setTimeout(() => {
            window.addEventListener('pointerdown', handleOutsideClick);
        }, 50);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('pointerdown', handleOutsideClick);
        };
    }, [hasAnyDropdown]);

    const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
    const currentBackground = currentSlide?.background || '#ffffff';
    // Ensure it's a hex code for the color input. If it's a gradient or url, we can't show it in type="color".
    // We'll fallback to black or white if it's not a hex.
    const isHex = currentBackground.startsWith('#');
    const colorValue = isHex ? currentBackground : '#000000';

    const handleAddText = () => {
        const preset = state.lesson.textPreset;
        dispatch({
            type: 'ADD_ELEMENT',
            payload: {
                type: ELEMENT_TYPES.TEXT,
                content: 'New Text',
                metadata: {
                    fontFamily: '"Fira Sans"',
                    ...(preset?.text?.fontFamily && { fontFamily: preset.text.fontFamily }),
                    ...(preset?.text?.fontSize && { fontSize: preset.text.fontSize }),
                    ...(preset?.text?.color && { color: preset.text.color }),
                }
            }
        });
    };
    const handleAddBanner = () => {
        dispatch({
            type: 'ADD_ELEMENT',
            payload: {
                type: ELEMENT_TYPES.BANNER,
                content: '',
                width: 51,
                height: 12.5,
                rotation: 0,
                scale: 1,
                metadata: {
                    width: 51,
                    height: 12.5,
                    fontFamily: '"Bangers", cursive, sans-serif',
                    fontSize: 26,
                    fontStyle: 'normal',
                    fontWeight: 'normal',
                    color: '#00b0ff',
                    textAlign: 'center',
                    backgroundColor: '#ffffff',
                    borderColor: '#000000',
                    shadow: 'grey',
                    hasShadow: true,
                    borderRadius: 20,
                    skin: 'comic',
                    showTape: false,
                }
            }
        });
    };
    const handleAddQuiz = (type = 'classic') => {
        setShowQuizMenu(false);
        setShowQ2Menu(false);

        // Check for existing quiz
        const hasQuiz = currentSlide?.elements?.some(el => el.type === ELEMENT_TYPES.QUIZ);
        if (hasQuiz) {
            alert("Only one quiz allowed per slide!");
            return;
        }

        const isTF = type === 'tf';
        const isReorder = type === 'reorder';
        const isChatQuiz = type === 'chatquiz';
        const isPEM = type === 'pem';
        const isMatch = type === 'match';
        const isConecta = type === 'conecta';
        const isField = type === 'field';
        const isType = type === 'type';

        let defaultOptions;
        if (isTF) defaultOptions = ['True', 'False'];
        else if (isReorder) defaultOptions = ['First', 'Second', 'Third', 'Fourth'];
        else if (isChatQuiz) defaultOptions = [];
        else if (isPEM) defaultOptions = [];
        else if (isMatch || isConecta) defaultOptions = ['2 + 3', '4 + 2', '7 + 2', '1 + 6'];
        else if (isField || isType) defaultOptions = [];
        else defaultOptions = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];

        const preset = state.lesson.textPreset;
        const quizId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        dispatch({
            type: 'ADD_ELEMENT',
            payload: {
                id: quizId,
                type: ELEMENT_TYPES.QUIZ,
                content: isType ? 'Type Answer' : 'Quiz',
                metadata: {
                    fontFamily: '"Fira Sans"',
                    options: defaultOptions,
                    correctIndex: 0,
                    correctIndices: [0], // For 4sq multi-select
                    quizType: type, // 'classic', 'tf', '4sq', 'nl', 'reorder', 'match', 'conecta', 'field', 'type'
                    visualMode: false,
                    ...((isMatch || isConecta) && { matchAnswers: ['5', '6', '9', '7'] }),
                    ...(preset?.quizAnswers?.fontFamily && { answerFontFamily: preset.quizAnswers.fontFamily }),
                    ...(preset?.quizAnswers?.fontSize && { answerFontSize: preset.quizAnswers.fontSize }),
                    ...(preset?.quizAnswers?.color && { answerColor: preset.quizAnswers.color }),
                    // ChatQuiz Defaults
                    ...(isChatQuiz && {
                        chatNodes: [
                            { type: 'message', text: 'Hello! Let me ask you something.' },
                            { type: 'quiz', options: ['Answer A', 'Answer B'], correctIndex: 0 }
                        ]
                    }),
                    // PEM Defaults
                    ...(isPEM && {
                        pemMode: 'LEVELS',
                        pemDifficulty: 5,
                        pemExpression: null,
                    }),
                    // Field Defaults
                    ...(isField && {
                        fieldExpression: '3 + *8 x 2* = 19'
                    }),
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

        // If Type quiz, automatically create the 1st Result Field if none on slide
        if (isType) {
            const existingField = currentSlide?.elements?.find(el => el.type === ELEMENT_TYPES.RESULT_FIELD);
            if (!existingField) {
                const pos = getNonOverlappingResultFieldPosition(currentSlide);
                const fieldId = `el-${Date.now() + 1}-${Math.random().toString(36).substr(2, 9)}`;
                dispatch({
                    type: 'ADD_ELEMENT',
                    payload: {
                        id: fieldId,
                        type: ELEMENT_TYPES.RESULT_FIELD,
                        content: '60',
                        metadata: {
                            correctAnswer: '60',
                            order: 1,
                            locked: true
                        },
                        x: pos.x,
                        y: pos.y
                    }
                });
            } else if (!existingField.metadata?.correctAnswer) {
                // Ensure existing companion field has correctAnswer and order initialized
                dispatch({
                    type: 'UPDATE_ELEMENT',
                    payload: {
                        id: existingField.id,
                        updates: {
                            content: existingField.content || '60',
                            metadata: {
                                ...existingField.metadata,
                                correctAnswer: existingField.content || '60',
                                order: existingField.metadata?.order || 1,
                                locked: true
                            }
                        }
                    }
                });
            }
        }
    };

    const handleBackgroundChange = (e) => {
        dispatch({ type: 'UPDATE_SLIDE_BACKGROUND', payload: e.target.value });
    };

    return (
        <>
            <div className="editor-toolbar">
                <div className="toolbar-section">
                    <button className="btn-secondary" onClick={handleAddText} title={t('editor.addText')} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>T</button>
                    <button className="btn-secondary" onClick={() => {
                        const preset = state.lesson.textPreset;
                        dispatch({
                            type: 'ADD_ELEMENT',
                            payload: {
                                type: ELEMENT_TYPES.BALLOON,
                                content: 'Hello!',
                                metadata: {
                                    shadow: 'grey',
                                    hasShadow: true,
                                    borderColor: '#000000',
                                    ...(preset?.balloon?.fontFamily && { fontFamily: preset.balloon.fontFamily }),
                                    fontSize: preset?.balloon?.fontSize || 19,
                                    ...(preset?.balloon?.color && { color: preset.balloon.color }),
                                }
                            }
                        });
                    }} title={t('editor.addBalloon')} style={{ fontSize: '1.2rem' }}>💬</button>
                    <button className="btn-secondary" onClick={handleAddBanner} title="Add Comic Banner Card" style={{ fontSize: '1.2rem' }}>🪧</button>

                    <div className="toolbar-dropdown-container" style={{ position: 'relative' }}>
                        <button
                            className={`btn-secondary ${showQuizMenu ? 'active' : ''}`}
                            onClick={() => {
                                setShowQuizMenu(!showQuizMenu);
                                setShowQ2Menu(false);
                                setShowGameMenu(false);
                                setShowIStickerMenu(false);
                            }}
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
                                <button onClick={() => handleAddQuiz('reorder')}>Reorder</button>
                                <button onClick={() => handleAddQuiz('chatquiz')}>Chat</button>
                                <button onClick={() => handleAddQuiz('match')}>Match Drag</button>
                                <button onClick={() => handleAddQuiz('conecta')}>Conecta</button>
                                <button onClick={() => handleAddQuiz('field')}>Field</button>
                                <button onClick={() => handleAddQuiz('type')}>{t('editor.quizTypeAnswer') || 'Type Answer'}</button>
                            </div>
                        )}
                    </div>
                    <div className="toolbar-dropdown-container" style={{ position: 'relative' }}>
                        <button
                            className={`btn-secondary ${showQ2Menu ? 'active' : ''}`}
                            onClick={() => {
                                setShowQ2Menu(!showQ2Menu);
                                setShowQuizMenu(false);
                                setShowGameMenu(false);
                                setShowIStickerMenu(false);
                            }}
                            title="Interactive Q2"
                        >
                            Q2
                        </button>
                        {showQ2Menu && (
                            <div className="toolbar-submenu">
                                <button onClick={() => handleAddQuiz('pem')}>MEP</button>
                                <button onClick={() => {
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: {
                                            cartridge: {
                                                type: 'Potiondas',
                                                config: {}
                                            }
                                        }
                                    });
                                    setShowQ2Menu(false);
                                }}>POTIONDAS</button>
                            </div>
                        )}
                    </div>

                    <div className="toolbar-dropdown-container" style={{ position: 'relative' }}>
                        <button
                            className={`btn-secondary ${showGameMenu ? 'active' : ''}`}
                            onClick={() => {
                                setShowGameMenu(!showGameMenu);
                                setShowQuizMenu(false);
                                setShowQ2Menu(false);
                                setShowIStickerMenu(false);
                                setShowSymbolsMenu(false);
                            }}
                            title={t('editor.addGame')}
                        >
                            <Gamepad2 size={24} />
                        </button>
                        {showGameMenu && (
                            <div className="toolbar-submenu">
                                <button onClick={() => {
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
                                    setShowGameMenu(false);
                                }}>Fraction Alpha</button>
                                <button onClick={() => {
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
                                    setShowGameMenu(false);
                                }}>Fraction Slicer</button>
                                <button onClick={() => {
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: {
                                            cartridge: {
                                                type: 'SwipeSorter',
                                                config: {
                                                    leftLabel: 'FALSE',
                                                    rightLabel: 'CORRECT',
                                                    cards: [
                                                        { id: 'c1', text: '2 + 2 = 5', correctSide: 'left' },
                                                        { id: 'c2', text: 'Water is wet', correctSide: 'right' },
                                                        { id: 'c3', text: 'The moon is cheese', correctSide: 'left' }
                                                    ]
                                                }
                                            }
                                        }
                                    });
                                    setShowGameMenu(false);
                                }}>Swipe Sorter</button>
                                <button onClick={() => {
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: {
                                            cartridge: {
                                                type: 'PEMDAS',
                                                config: {
                                                    locale: 'US',
                                                    startLevel: 1,
                                                    targetLevel: 3
                                                }
                                            }
                                        }
                                    });
                                    setShowGameMenu(false);
                                }}>PEMDAS</button>
                                <button onClick={() => {
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: {
                                            cartridge: {
                                                type: 'AlgeBros',
                                                config: {
                                                    startLevel: 1,
                                                    targetLevel: 10
                                                }
                                            }
                                        }
                                    });
                                    setShowGameMenu(false);
                                }}>algeBROS</button>
                                <button onClick={() => {
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: {
                                            cartridge: {
                                                type: 'Balanza',
                                                config: {
                                                    weightsText: '',
                                                    leftPlateText: '🍎, 🍎',
                                                    rightPlateText: '🍎',
                                                    menuText: '2x🍎',
                                                    showZeroTiles: false
                                                }
                                            }
                                        }
                                    });
                                    setShowGameMenu(false);
                                }}>⚖️ Balanza</button>
                                <button onClick={() => {
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: {
                                            cartridge: {
                                                type: 'ExploreNL',
                                                config: {
                                                    orientation: 'vertical',
                                                    numbersSide: 'left',
                                                    pointerSide: 'right',
                                                    startNumber: -3,
                                                    endNumber: 3,
                                                    bottomNumber: -3,
                                                    topNumber: 3,
                                                    step: 1,
                                                    thickness: 3,
                                                    showArrows: true,
                                                    currentValue: 0,
                                                    equationTemplate: '2!n =',
                                                    lineColor: '#6366F1',
                                                    numberColor: '#1E293B',
                                                    pointerColor: '#4ECDC4',
                                                    equationColor: '#0F172A',
                                                    equationBg: '#FFFFFF',
                                                    equationBorder: '#6366F1',
                                                    equationFontSize: 28,
                                                    nlX: 25,
                                                    nlY: 50,
                                                    nlLength: 520,
                                                    equationX: 65,
                                                    equationY: 45,
                                                    equationRotation: 0
                                                }
                                            }
                                        }
                                    });
                                    setShowGameMenu(false);
                                }}>📈 ExploreNL</button>
                            </div>
                        )}
                    </div>
                    <div className="toolbar-dropdown-container" style={{ position: 'relative' }}>
                        <button
                            className={`btn-secondary ${showIStickerMenu ? 'active' : ''}`}
                            onClick={() => {
                                setShowIStickerMenu(!showIStickerMenu);
                                setShowQuizMenu(false);
                                setShowQ2Menu(false);
                                setShowGameMenu(false);
                                setShowSymbolsMenu(false);
                            }}
                            title="Interactive Stickers"
                        >
                            🧩
                        </button>
                        {showIStickerMenu && (
                            <div className="toolbar-submenu">
                                <button onClick={() => {
                                    dispatch({
                                        type: 'ADD_ELEMENT',
                                        payload: {
                                            type: ELEMENT_TYPES.ISTICKER,
                                            content: 'iSticker',
                                            metadata: {
                                                stickerType: 'expression_scanner_001',
                                                expression: '2 + 3 * 4 - 5',
                                                scanDuration: 3,
                                            }
                                        }
                                    });
                                    setShowIStickerMenu(false);
                                }}>Expression Scanner</button>
                                <button onClick={() => {
                                    dispatch({
                                        type: 'ADD_ELEMENT',
                                        payload: {
                                            type: ELEMENT_TYPES.ISTICKER,
                                            content: 'iSticker',
                                            metadata: {
                                                stickerType: 'pemdas_term_separator',
                                                expression: '2 + 3 × 4 - 5',
                                            }
                                        }
                                    });
                                    setShowIStickerMenu(false);
                                }}>Term Separator</button>
                                <button onClick={() => {
                                    dispatch({
                                        type: 'ADD_ELEMENT',
                                        payload: {
                                            type: ELEMENT_TYPES.ISTICKER,
                                            content: 'iSticker',
                                            metadata: {
                                                stickerType: 'exponent_expander',
                                                expression: '2!4',
                                            }
                                        }
                                    });
                                    setShowIStickerMenu(false);
                                }}>Exponent Expander</button>

                                <button onClick={() => {
                                    const hasPopup = currentSlide?.elements?.some(el => el.type === ELEMENT_TYPES.POPUP);
                                    if (hasPopup) {
                                        alert("Only one popup allowed per slide!");
                                        return;
                                    }
                                    dispatch({
                                        type: 'ADD_ELEMENT',
                                        payload: {
                                            type: ELEMENT_TYPES.POPUP,
                                            content: '/assets/characters/tutuTucaSticker_SMALL.png',
                                            metadata: {
                                                width: 30,
                                                height: 17.38125,
                                                popupText: 'Hello from the popup!',
                                            }
                                        }
                                    });
                                    setShowIStickerMenu(false);
                                }}>Popup</button>
                            </div>
                        )}
                    </div>
                    <div className="toolbar-dropdown-container" style={{ position: 'relative' }}>
                        <button
                            className={`btn-secondary ${showSymbolsMenu ? 'active' : ''}`}
                            onClick={() => {
                                setShowSymbolsMenu(!showSymbolsMenu);
                                setShowQuizMenu(false);
                                setShowQ2Menu(false);
                                setShowGameMenu(false);
                                setShowIStickerMenu(false);
                            }}
                            title="Symbols"
                            style={{ fontSize: '1.2rem' }}
                        >
                            #️⃣
                        </button>
                        {showSymbolsMenu && (
                            <div className="toolbar-submenu" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', width: 'max-content' }}>
                                {/* Numbers */}
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Numbers</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                            <button 
                                                key={`symbol-num-${num}`}
                                                onClick={() => {
                                                    dispatch({
                                                        type: 'ADD_ELEMENT',
                                                        payload: {
                                                            type: ELEMENT_TYPES.IMAGE,
                                                            content: getSymbolSvg('number', num),
                                                            metadata: { width: 50, height: 50, isSymbol: true, symbolType: 'number', symbolValue: num, symbolColor: '#8B5CF6' }
                                                        }
                                                    });
                                                    setShowSymbolsMenu(false);
                                                }}
                                                style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#8B5CF6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', padding: 0, border: 'none' }}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Shapes */}
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Shapes</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {[{id: 'square', name: 'Rectangle'}, {id: 'circle', name: 'Circle'}].map(shape => (
                                            <button 
                                                key={`symbol-shape-${shape.id}`}
                                                onClick={() => {
                                                    dispatch({
                                                        type: 'ADD_ELEMENT',
                                                        payload: {
                                                            type: ELEMENT_TYPES.IMAGE,
                                                            content: getSymbolSvg(`shape-${shape.id}`, null, '#8B5CF6'),
                                                            metadata: { width: 40, height: 40, isSymbol: true, symbolType: `shape-${shape.id}`, symbolColor: '#8B5CF6' }
                                                        }
                                                    });
                                                    setShowSymbolsMenu(false);
                                                }}
                                                style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', border: '1px solid #E2E8F0' }}
                                                title={shape.name}
                                            >
                                                <img src={getSymbolSvg(`shape-${shape.id}`, null, '#8B5CF6')} alt={shape.name} style={{ width: '100%', height: '100%' }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Line Tool */}
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Lines</div>
                                    <button 
                                        onClick={() => {
                                            dispatch({
                                                type: 'ADD_ELEMENT',
                                                payload: {
                                                    type: ELEMENT_TYPES.LINE,
                                                    metadata: { width: 50, height: 10 /* thickness */, isSymbol: true, symbolColor: '#8B5CF6', startCap: 'none', endCap: 'arrow' }
                                                }
                                            });
                                            setShowSymbolsMenu(false);
                                        }}
                                        style={{ width: '100%', height: '40px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', border: '1px solid #E2E8F0', fontWeight: 'bold', color: '#334155' }}
                                    >
                                        ✏️ Add Line
                                    </button>
                                </div>

                                {/* Number Lines */}
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Number Lines</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                        <button 
                                            onClick={() => {
                                                dispatch({
                                                    type: 'ADD_ELEMENT',
                                                    payload: {
                                                        type: ELEMENT_TYPES.NUMBER_LINE,
                                                        metadata: {
                                                            orientation: 'horizontal',
                                                            startNumber: 0,
                                                            endNumber: 10,
                                                            step: 1,
                                                            showNumbers: true,
                                                            numberColorMode: 'match',
                                                            showArrows: true,
                                                            symbolColor: '#8B5CF6',
                                                            thickness: 3
                                                        }
                                                    }
                                                });
                                                setShowSymbolsMenu(false);
                                            }}
                                            style={{ height: '40px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px 8px', border: '1px solid #E2E8F0', fontWeight: 'bold', color: '#334155', fontSize: '0.8rem', cursor: 'pointer' }}
                                            title="Add Horizontal Number Line"
                                        >
                                            ↔️ Horizontal
                                        </button>
                                        <button 
                                            onClick={() => {
                                                dispatch({
                                                    type: 'ADD_ELEMENT',
                                                    payload: {
                                                        type: ELEMENT_TYPES.NUMBER_LINE,
                                                        metadata: {
                                                            orientation: 'vertical',
                                                            startNumber: 0,
                                                            endNumber: 10,
                                                            step: 1,
                                                            showNumbers: true,
                                                            numberColorMode: 'match',
                                                            showArrows: true,
                                                            symbolColor: '#8B5CF6',
                                                            thickness: 3
                                                        }
                                                    }
                                                });
                                                setShowSymbolsMenu(false);
                                            }}
                                            style={{ height: '40px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px 8px', border: '1px solid #E2E8F0', fontWeight: 'bold', color: '#334155', fontSize: '0.8rem', cursor: 'pointer' }}
                                            title="Add Vertical Number Line"
                                        >
                                            ↕️ Vertical
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="btn-secondary" onClick={() => { console.log('Slides button clicked'); dispatch({ type: 'SET_VIEW', payload: 'slides' }); }} title={t('editor.slides')} style={{ fontSize: '1.2rem' }}>🎞️</button>
                    <button className="btn-primary" onClick={() => onOpenLibrary('custom')} title={t('editor.openLibrary')} style={{ fontSize: '1.2rem' }}>📚</button>
                    <button className="btn-secondary" onClick={() => { dispatch({ type: 'SELECT_ELEMENT', payload: 'background' }); onOpenLibrary('custom-bg'); }} title={t('editor.background')} style={{ fontSize: '1.2rem' }}>🖼️</button>
                </div>
                {/* Stripper Controls */}
                <div className="toolbar-section" style={{ display: 'flex', gap: '6px', alignItems: 'center', borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: '8px' }}>
                    <button
                        className={`btn-icon ${currentSlide?.stripper?.enabled ? 'active' : ''}`}
                        onClick={() => {
                            const current = currentSlide?.stripper || { enabled: false, dividers: [50] };
                            dispatch({
                                type: 'UPDATE_SLIDE',
                                payload: {
                                    stripper: { ...current, enabled: !current.enabled }
                                }
                            });
                        }}
                        title={currentSlide?.stripper?.enabled ? 'Disable Stripper' : 'Enable Stripper'}
                        style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 6px', minWidth: '44px', letterSpacing: '0.5px' }}
                    >
                        ✂️
                    </button>
                    {currentSlide?.stripper?.enabled && (
                        <>
                            <button
                                className="btn-icon"
                                onClick={() => {
                                    const dividers = [...(currentSlide.stripper.dividers || [50])];
                                    if (dividers.length >= 4) return;
                                    const lastDivider = dividers[dividers.length - 1] || 50;
                                    const newDivider = Math.min(95, lastDivider + 15);
                                    dividers.push(newDivider);
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: { stripper: { ...currentSlide.stripper, dividers: dividers } }
                                    });
                                }}
                                title="Add Divider"
                                style={{ fontSize: '1rem', padding: '2px 6px' }}
                                disabled={(currentSlide?.stripper?.dividers?.length || 1) >= 4}
                            >
                                +
                            </button>
                            <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600 }}>
                                {currentSlide?.stripper?.dividers?.length || 1}
                            </span>
                            <button
                                className="btn-icon"
                                onClick={() => {
                                    const dividers = [...(currentSlide.stripper.dividers || [50])];
                                    if (dividers.length <= 1) return;
                                    dividers.pop(); // Remove the last divider
                                    dispatch({
                                        type: 'UPDATE_SLIDE',
                                        payload: { stripper: { ...currentSlide.stripper, dividers: dividers } }
                                    });
                                }}
                                title="Remove Divider"
                                style={{ fontSize: '1rem', padding: '2px 6px' }}
                                disabled={(currentSlide?.stripper?.dividers?.length || 1) <= 1}
                            >
                                −
                            </button>
                        </>
                    )}
                </div>
                <div className="toolbar-section" style={{ display: 'flex', gap: '6px', alignItems: 'center', borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: '8px' }}>
                    {(() => {
                        const mode = state?.guideMode || 'both';
                        const isBoth = mode === 'both';
                        const isGuides = mode === 'guides';
                        const isNone = mode === 'none';

                        let titleText = 'Grid (tap for Grid + Guides)';
                        if (isBoth) titleText = 'Grid + Guides (tap for Guides only)';
                        else if (isGuides) titleText = 'Guides only (tap to hide all)';
                        else if (isNone) titleText = 'No guides (tap for Grid)';

                        return (
                            <button
                                className={`btn-icon ${!isNone ? 'active' : ''} guide-mode-btn mode-${mode}`}
                                onClick={() => dispatch({ type: 'CYCLE_GUIDE_MODE' })}
                                title={titleText}
                                style={{ position: 'relative', fontSize: '1.1rem', padding: '6px' }}
                            >
                                {isGuides ? '📏' : '⊞'}
                                {isBoth && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10B981',
                                        border: '1px solid white',
                                        boxShadow: '0 0 2px rgba(0,0,0,0.3)'
                                    }} />
                                )}
                            </button>
                        );
                    })()}
                    <button className="btn-secondary" onClick={() => setShowScriptImport(true)} title="Import Script" style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', letterSpacing: '0.3px' }}>📝</button>
                    <button className="btn-danger" onClick={onDeleteSlide} disabled={state.lesson.slides.length <= 1} title="Delete Slide" style={{ fontSize: '1.2rem' }}>🗑️</button>
                </div>
            </div>

            <ScriptImportModal
                isOpen={showScriptImport}
                onClose={() => setShowScriptImport(false)}
            />
        </>
    );
};

export default Toolbar;
