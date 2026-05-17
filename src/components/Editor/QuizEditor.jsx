import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './QuizEditor.css';
import { parseFraction, formatFraction, FractionComponent } from '../../utils/FractionUtils.jsx';

/**
 * QuizEditor Component
 * 
 * Allows the user to edit the options and correct answer for a quiz sticker.
 * Rendered directly inside the Sticker component when in edit mode.
 */
const STICKER_DIR = '/assets/images/stickers/';

const QuizEditor = ({ element, onChange, onSelect, translationMode }) => {
    const options = element.metadata?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    const correctIndex = element.metadata?.correctIndex || 0;
    // For 4sq, we use correctIndices. Fallback to correctIndex if missing.
    const correctIndices = element.metadata?.correctIndices || [correctIndex];

    const quizType = element.metadata?.quizType || 'classic';
    const visualMode = element.metadata?.visualMode || false;

    const colors = ['#3A86FF', '#4ECDC4', '#9B72CF', '#FF8C00', '#00B4D8', '#8338EC'];

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange(element.id, { options: newOptions });
    };

    const handleCorrectChange = (index) => {
        if (quizType === '4sq') {
            // Multi-select logic
            let newIndices;
            if (correctIndices.includes(index)) {
                // Remove if already selected
                newIndices = correctIndices.filter(i => i !== index);
            } else {
                // Add if not selected
                newIndices = [...correctIndices, index];
            }
            onChange(element.id, { correctIndices: newIndices });
        } else {
            // Single-select logic
            onChange(element.id, { correctIndex: index });
        }
    };

    const removeOption = (index) => {
        if (options.length <= 1) return;
        const newOptions = options.filter((_, i) => i !== index);

        // Update correctIndex for single-select types
        let newCorrect = correctIndex;
        if (index === correctIndex) newCorrect = 0;
        else if (index < correctIndex) newCorrect = correctIndex - 1;
        if (newCorrect >= newOptions.length) newCorrect = newOptions.length - 1;

        onChange(element.id, { options: newOptions, correctIndex: newCorrect });
    };

    const toggleVisualMode = () => {
        onChange(element.id, { visualMode: !visualMode });
    };

    // Helper to get thumb image for preview
    const getThumbImage = (index) => {
        return index === 0 ? '/assets/quiz/thumbs_up.png' : '/assets/quiz/thumbs_down.png';
    };

    const isCorrect = (index) => {
        if (quizType === '4sq') return correctIndices.includes(index);
        return index === correctIndex;
    };

    const getContainerClass = () => {
        if (quizType === 'tf') return 'tf-mode';
        if (quizType === '4sq') return 'four-sq-mode';
        if (quizType === 'nl') return 'nl-mode';
        return '';
    };

    // -------------------------------------------------------------------------
    // PEM RENDER LOGIC
    // -------------------------------------------------------------------------
    if (quizType === 'pem') {
        const pemMode = element.metadata?.pemMode || 'A';
        const pemDifficulty = element.metadata?.pemDifficulty || 1;
        const pemExpression = element.metadata?.pemExpression || null;

        return (
            <div className="quiz-editor-2 pem-editor-mode">
                <div className="pem-editor-preview">
                    <div className="pem-editor-icon">🧮</div>
                    <div className="pem-editor-info">
                        <div className="pem-editor-title">MEP Expression</div>
                        <div className="pem-editor-detail">
                            Mode: <strong>{pemMode}</strong> &nbsp;|&nbsp; Difficulty: <strong>{pemDifficulty}</strong>
                        </div>
                        {pemMode === 'MANUAL' && (
                            <div className="pem-editor-manual">
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    className="pem-manual-input"
                                    onInput={(e) => onChange(element.id, { pemExpression: e.currentTarget.textContent })}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const text = e.clipboardData.getData('text/plain');
                                        document.execCommand('insertText', false, text);
                                    }}
                                    ref={(el) => {
                                        if (el && el.textContent !== (pemExpression || '') && document.activeElement !== el) {
                                            el.textContent = pemExpression || '';
                                        }
                                    }}
                                    data-placeholder="e.g. 2!3 + (4 * 5)"
                                />
                                <div className="pem-manual-hint">Use ! for exponents: 2!3 = 2³</div>
                            </div>
                        )}
                        {pemMode !== 'MANUAL' && (
                            <div className="pem-editor-hint">Expression auto-generated. Configure in contextual menu.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // CHATQUIZ RENDER LOGIC
    // -------------------------------------------------------------------------
    if (quizType === 'chatquiz') {
        // Canvas merges draft translations into element.metadata.chatNodes when translating
        const chatNodes = element.metadata?.chatNodes || [];

        const updateChatNodes = (newNodes) => {
            onChange(element.id, { chatNodes: newNodes });
        };

        const addMessageNode = () => {
            updateChatNodes([...chatNodes, { type: 'message', text: '' }]);
        };

        const addNarratorNode = () => {
            updateChatNodes([...chatNodes, { type: 'message', text: '', style: 'narrator' }]);
        };

        const addReplyNode = () => {
            updateChatNodes([...chatNodes, { type: 'reply', text: '' }]);
        };

        const addQuizNode = () => {
            updateChatNodes([...chatNodes, { type: 'quiz', options: ['', ''], correctIndex: 0 }]);
        };

        const [showStickerPicker, setShowStickerPicker] = useState(false);
        const [stickerPickerSide, setStickerPickerSide] = useState('right');
        const [availableStickers, setAvailableStickers] = useState([]);

        const openStickerPicker = () => {
            // Dynamically load sticker list
            fetch('/assets/images/stickers/')
                .then(() => {
                    // We can't list a directory from fetch, so we use a hardcoded list
                    // that we maintain. Users add files to the folder and update this.
                })
                .catch(() => {});
            // Use import.meta.glob or a known list - simplest: scan at build or hardcode
            // For now, we'll use a manifest approach: load a known list
            setAvailableStickers([
                'cat_helpme_sticker.png',
                'pesto_rock_sticker.png',
            ]);
            setStickerPickerSide('right');
            setShowStickerPicker(true);
        };

        const selectSticker = (filename) => {
            updateChatNodes([...chatNodes, { type: 'sticker', src: `${STICKER_DIR}${filename}`, side: stickerPickerSide }]);
            setShowStickerPicker(false);
        };

        const toggleStickerSide = (index) => {
            const newNodes = [...chatNodes];
            newNodes[index] = { ...newNodes[index], side: newNodes[index].side === 'left' ? 'right' : 'left' };
            updateChatNodes(newNodes);
        };

        const deleteNode = (index) => {
            if (chatNodes.length <= 1) return;
            updateChatNodes(chatNodes.filter((_, i) => i !== index));
        };

        const moveNode = (index, direction) => {
            const target = index + direction;
            if (target < 0 || target >= chatNodes.length) return;
            const newNodes = [...chatNodes];
            [newNodes[index], newNodes[target]] = [newNodes[target], newNodes[index]];
            updateChatNodes(newNodes);
        };

        const moveToTop = (index) => {
            if (index === 0) return;
            const newNodes = [...chatNodes];
            const [node] = newNodes.splice(index, 1);
            newNodes.unshift(node);
            updateChatNodes(newNodes);
        };

        const moveToBottom = (index) => {
            if (index === chatNodes.length - 1) return;
            const newNodes = [...chatNodes];
            const [node] = newNodes.splice(index, 1);
            newNodes.push(node);
            updateChatNodes(newNodes);
        };

        const updateNodeText = (index, text) => {
            const newNodes = [...chatNodes];
            newNodes[index] = { ...newNodes[index], text };
            updateChatNodes(newNodes);
        };

        const toggleNodeStyle = (index) => {
            const newNodes = [...chatNodes];
            const current = newNodes[index].style || 'bubble';
            newNodes[index] = { ...newNodes[index], style: current === 'bubble' ? 'narrator' : 'bubble' };
            updateChatNodes(newNodes);
        };

        const updateQuizOption = (nodeIndex, optIndex, value) => {
            const newNodes = [...chatNodes];
            const newOpts = [...newNodes[nodeIndex].options];
            newOpts[optIndex] = value;
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], options: newOpts };
            updateChatNodes(newNodes);
        };

        const setQuizCorrect = (nodeIndex, optIndex) => {
            const newNodes = [...chatNodes];
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], correctIndex: optIndex };
            updateChatNodes(newNodes);
        };

        const addQuizOption = (nodeIndex) => {
            const newNodes = [...chatNodes];
            const newOpts = [...newNodes[nodeIndex].options, `Option ${newNodes[nodeIndex].options.length + 1}`];
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], options: newOpts };
            updateChatNodes(newNodes);
        };

        const removeQuizOption = (nodeIndex, optIndex) => {
            const newNodes = [...chatNodes];
            const opts = newNodes[nodeIndex].options;
            if (opts.length <= 1) return;
            const newOpts = opts.filter((_, i) => i !== optIndex);
            let newCorrect = newNodes[nodeIndex].correctIndex;
            if (optIndex === newCorrect) newCorrect = 0;
            else if (optIndex < newCorrect) newCorrect--;
            newNodes[nodeIndex] = { ...newNodes[nodeIndex], options: newOpts, correctIndex: newCorrect };
            updateChatNodes(newNodes);
        };

        return (
            <div className="quiz-editor-2 chatquiz-mode" onMouseDown={(e) => { if (onSelect) onSelect(element.id); e.stopPropagation(); }}>
                <div className="chatquiz-timeline">
                    {chatNodes.map((node, index) => (
                        <div key={index} className={`chatquiz-node chatquiz-node-${node.type} ${node.style === 'narrator' ? 'chatquiz-node-narrator' : ''}`}>
                            <div className="chatquiz-node-header">
                                <span className="chatquiz-node-icon">{node.type === 'message' ? (node.style === 'narrator' ? '📢' : '👨‍🍳') : node.type === 'reply' ? '🤖' : node.type === 'sticker' ? '🌟' : '🧩'}</span>
                                <span className="chatquiz-node-label">{node.type === 'message' ? (node.style === 'narrator' ? 'Narrator' : 'Chef') : node.type === 'reply' ? 'Pesto' : node.type === 'sticker' ? 'Sticker' : 'Quiz'}</span>
                                {node.type === 'message' && (
                                    <button
                                        className={`chatquiz-style-toggle ${node.style === 'narrator' ? 'active' : ''}`}
                                        onClick={() => toggleNodeStyle(index)}
                                        title={node.style === 'narrator' ? 'Switch to bubble' : 'Switch to narrator'}
                                    >
                                        {node.style === 'narrator' ? '💬' : '📢'}
                                    </button>
                                )}
                                {!translationMode && (
                                <div className="chatquiz-node-actions">
                                    <button className="chatquiz-arrow" onClick={() => moveToTop(index)} disabled={index === 0} title="Move to top">⏫</button>
                                    <button className="chatquiz-arrow" onClick={() => moveNode(index, -1)} disabled={index === 0} title="Move up">▲</button>
                                    <button className="chatquiz-arrow" onClick={() => moveNode(index, 1)} disabled={index === chatNodes.length - 1} title="Move down">▼</button>
                                    <button className="chatquiz-arrow" onClick={() => moveToBottom(index)} disabled={index === chatNodes.length - 1} title="Move to bottom">⏬</button>
                                    {chatNodes.length > 1 && (
                                        <button className="chatquiz-delete" onClick={() => deleteNode(index)}>×</button>
                                    )}
                                </div>
                                )}
                            </div>

                            {(node.type === 'message' || node.type === 'reply') && (
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    className="chatquiz-message-input"
                                    style={{
                                        ...(element.metadata?.fontFamily && { fontFamily: element.metadata.fontFamily }),
                                        ...(element.metadata?.fontSize && { fontSize: `${element.metadata.fontSize}px` }),
                                        ...(element.metadata?.color && { color: element.metadata.color }),
                                        ...(node.type === 'message' && node.style !== 'narrator' && element.metadata?.leftBubbleColor && { backgroundColor: element.metadata.leftBubbleColor }),
                                        ...(node.type === 'reply' && element.metadata?.rightBubbleColor && { backgroundColor: element.metadata.rightBubbleColor }),
                                    }}
                                    onInput={(e) => updateNodeText(index, e.currentTarget.innerHTML)}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const text = e.clipboardData.getData('text/plain');
                                        document.execCommand('insertText', false, text);
                                    }}
                                    ref={(el) => {
                                        if (el && el.innerHTML !== node.text && document.activeElement !== el) {
                                            el.innerHTML = node.text || '';
                                        }
                                    }}
                                    data-placeholder={node.type === 'reply' ? 'Type a reply...' : 'Type a message...'}
                                />
                            )}

                            {node.type === 'sticker' && (
                                <div className="chatquiz-sticker-preview">
                                    <img src={node.src} alt="sticker" className="chatquiz-sticker-thumb" />
                                    <button
                                        className={`chatquiz-side-toggle ${node.side === 'right' ? 'side-right' : 'side-left'}`}
                                        onClick={() => toggleStickerSide(index)}
                                        title={node.side === 'left' ? 'Sent by Chef (left)' : 'Sent by Pesto (right)'}
                                    >
                                        {node.side === 'left' ? '👨‍🍳 Chef' : '🤖 Pesto'}
                                    </button>
                                </div>
                            )}

                            {node.type === 'quiz' && (
                                <div className="chatquiz-options">
                                    {node.options.map((opt, optIdx) => (
                                        <div key={optIdx} className="chatquiz-option-row">
                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                className="chatquiz-option-input"
                                                data-option-index={optIdx}
                                                onInput={(e) => updateQuizOption(index, optIdx, e.currentTarget.innerHTML)}
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const text = e.clipboardData.getData('text/plain');
                                                    document.execCommand('insertText', false, text);
                                                }}
                                                ref={(el) => {
                                                    if (el && el.innerHTML !== opt && document.activeElement !== el) {
                                                        el.innerHTML = opt;
                                                    }
                                                }}
                                                data-placeholder={`Option ${optIdx + 1}`}
                                            />
                                            <input
                                                type="radio"
                                                name={`chatquiz-correct-${element.id}-${index}`}
                                                checked={node.correctIndex === optIdx}
                                                onChange={() => setQuizCorrect(index, optIdx)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="correct-radio-2"
                                                title="Mark as correct"
                                            />
                                            {node.options.length > 1 && (
                                                <button className="chatquiz-opt-delete" onClick={() => removeQuizOption(index, optIdx)}>×</button>
                                            )}
                                        </div>
                                    ))}
                                    {node.options.length < 5 && (
                                        <button className="chatquiz-add-opt" onClick={() => addQuizOption(index)}>+ Option</button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {!translationMode && (
                <div className="chatquiz-add-buttons">
                    <button className="chatquiz-add-btn" onClick={addMessageNode}>+ Chef</button>
                    <button className="chatquiz-add-btn" onClick={addReplyNode}>+ Pesto</button>
                    <button className="chatquiz-add-btn" onClick={addNarratorNode}>+ Narrator</button>
                    <button className="chatquiz-add-btn" onClick={addQuizNode}>+ Quiz</button>
                    <button className="chatquiz-add-btn chatquiz-add-sticker" onClick={openStickerPicker}>+ Sticker</button>
                </div>
                )}

                {showStickerPicker && ReactDOM.createPortal(
                    <div className="chatquiz-sticker-modal" onClick={() => setShowStickerPicker(false)}>
                        <div className="chatquiz-sticker-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="chatquiz-sticker-modal-header">
                                <span>Pick a Sticker</span>
                                <div className="chatquiz-sticker-side-picker">
                                    <button
                                        className={`chatquiz-side-btn ${stickerPickerSide === 'left' ? 'active' : ''}`}
                                        onClick={() => setStickerPickerSide('left')}
                                    >👨‍🍳 Chef</button>
                                    <button
                                        className={`chatquiz-side-btn ${stickerPickerSide === 'right' ? 'active' : ''}`}
                                        onClick={() => setStickerPickerSide('right')}
                                    >🤖 Pesto</button>
                                </div>
                            </div>
                            <div className="chatquiz-sticker-grid">
                                {availableStickers.map((filename) => (
                                    <div key={filename} className="chatquiz-sticker-item" onClick={() => selectSticker(filename)}>
                                        <img src={`${STICKER_DIR}${filename}`} alt={filename} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // REORDER RENDER LOGIC
    // -------------------------------------------------------------------------
    if (quizType === 'reorder') {
        const moveOption = (index, direction) => {
            const newOptions = [...options];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= newOptions.length) return;
            [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
            onChange(element.id, { options: newOptions });
        };

        const addOption = () => {
            if (options.length >= 5) return;
            const newOptions = [...options, `Step ${options.length + 1}`];
            onChange(element.id, { options: newOptions });
        };

        const removeReorderOption = (index) => {
            if (options.length <= 2) return;
            const newOptions = options.filter((_, i) => i !== index);
            onChange(element.id, { options: newOptions });
        };

        return (
            <div className="quiz-editor-2 reorder-mode" onMouseDown={(e) => e.stopPropagation()}>
                {options.map((option, index) => (
                    <div key={index} className="quiz-option-row reorder-row">
                        <span className="reorder-index">{index + 1}</span>
                        <div
                            className="quiz-option-2"
                            style={{ backgroundColor: colors[index % colors.length], flex: 1 }}
                        >
                            <div
                                contentEditable
                                suppressContentEditableWarning
                                className="option-input-2"
                                data-option-index={index}
                                onInput={(e) => handleOptionChange(index, e.currentTarget.innerHTML)}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData('text/plain');
                                    document.execCommand('insertText', false, text);
                                }}
                                ref={(el) => {
                                    if (el && el.innerHTML !== option && document.activeElement !== el) {
                                        el.innerHTML = option;
                                    }
                                }}
                                style={{ resize: 'none', overflow: 'hidden', minHeight: '1.2em', outline: 'none', cursor: 'text', userSelect: 'text' }}
                                data-placeholder={`Step ${index + 1}`}
                            />
                        </div>
                        <div className="reorder-arrows">
                            <button
                                className="reorder-arrow-btn"
                                onClick={() => moveOption(index, -1)}
                                disabled={index === 0}
                                title="Move up"
                            >▲</button>
                            <button
                                className="reorder-arrow-btn"
                                onClick={() => moveOption(index, 1)}
                                disabled={index === options.length - 1}
                                title="Move down"
                            >▼</button>
                        </div>
                        {options.length > 2 && (
                            <button className="remove-btn-2" onClick={() => removeReorderOption(index)} title="Remove">×</button>
                        )}
                    </div>
                ))}
                {options.length < 5 && (
                    <button className="reorder-add-btn" onClick={addOption}>+ Add Step</button>
                )}
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // NL RENDER LOGIC
    // -------------------------------------------------------------------------
    if (quizType === 'nl') {
        const { min: rawMin = 0, max: rawMax = 10, stepCount = 10, hideLabels = false, correctValue: rawCorrect = 5, useFractions = false } = element.metadata?.nlConfig || {};

        // Parse values (handles "1/2" strings vs numbers)
        const min = parseFraction(rawMin);
        const max = parseFraction(rawMax);
        const correctValue = parseFraction(rawCorrect);

        return (
            <div className={`quiz-editor-2 nl-mode ${(useFractions ? 'nl-fractions' : '')}`}>
                <div className="nl-container">
                    <div className="nl-track"></div>
                    <div className="nl-ticks">
                        {Array.from({ length: stepCount + 1 }).map((_, i) => {
                            const value = min + (i * ((max - min) / stepCount));
                            const percent = (i / stepCount) * 100;
                            const isEndpoint = i === 0 || i === stepCount;

                            return (
                                <div
                                    key={i}
                                    className="nl-tick"
                                    style={{ left: `${percent}%` }}
                                >
                                    <div className="nl-tick-mark"></div>
                                    {(!hideLabels || isEndpoint) && (
                                        <div className="nl-tick-label">
                                            <FractionComponent value={value} useFractions={useFractions} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* Static Knob Preview at Correct Value */}
                    <div
                        className="nl-knob"
                        style={{
                            left: `${((correctValue - min) / (max - min)) * 100}%`
                        }}
                    >
                        <div className="nl-knob-bubble">
                            <FractionComponent value={correctValue} useFractions={useFractions} />
                        </div>
                    </div>
                </div>
                <button className="nl-ready-btn" disabled>READY</button>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // STANDARD RENDER LOGIC
    // -------------------------------------------------------------------------
    return (
        <div className={`quiz-editor-2 ${getContainerClass()}`} onMouseDown={(e) => e.stopPropagation()}>
            {options.map((option, index) => (
                <div key={index} className={`quiz-option-row ${quizType === '4sq' ? (index % 2 === 0 ? 'column-left' : 'column-right') : ''}`}>
                    {/* Hide remove button for TF and 4SQ (fixed options) */}
                    {quizType !== 'tf' && quizType !== '4sq' && options.length > 1 && (
                        <button className="remove-btn-2" onClick={() => removeOption(index)} title="Remove option">×</button>
                    )}

                    <div
                        className={`quiz-option-2 ${isCorrect(index) ? 'correct' : ''}`}
                        style={{ backgroundColor: colors[index % colors.length] }}
                    >
                        {quizType === 'tf' && visualMode ? (
                            <div className="visual-preview">
                                <img
                                    src={getThumbImage(index)}
                                    alt={index === 0 ? 'True' : 'False'}
                                />
                            </div>
                        ) : (
                            <div
                                contentEditable
                                suppressContentEditableWarning
                                className="option-input-2"
                                data-option-index={index}
                                onInput={(e) => handleOptionChange(index, e.currentTarget.innerHTML)}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData('text/plain');
                                    document.execCommand('insertText', false, text);
                                }}
                                ref={(el) => {
                                    if (el && el.innerHTML !== option && document.activeElement !== el) {
                                        el.innerHTML = option;
                                    }
                                }}
                                style={{
                                    resize: 'none', overflow: 'hidden', minHeight: '1.2em', outline: 'none', cursor: 'text', userSelect: 'text',
                                    fontFamily: element.metadata?.fontFamily || '"HVD Comic Serif Pro", sans-serif',
                                    fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : '16px',
                                    fontWeight: element.metadata?.fontWeight || 'normal',
                                    fontStyle: element.metadata?.fontStyle || 'normal',
                                    textDecoration: element.metadata?.textDecoration || 'none'
                                }}
                                data-placeholder={`Option ${index + 1}`}
                            />
                        )}
                    </div>

                    <input
                        type={quizType === '4sq' ? 'checkbox' : 'radio'}
                        name={quizType === '4sq' ? undefined : `correct-${element.id}`}
                        checked={isCorrect(index)}
                        onChange={(e) => {
                            e.stopPropagation();
                            handleCorrectChange(index);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="correct-radio-2"
                        title="Mark as correct answer"
                    />
                </div>
            ))}

            {/* Add answer button for classic quiz */}
            {quizType === 'classic' && (
                <button
                    className="quiz-add-answer-btn"
                    onClick={() => {
                        const newOptions = [...options, `Option ${options.length + 1}`];
                        onChange(element.id, { options: newOptions });
                    }}
                    style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px dashed rgba(255,255,255,0.4)',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.7)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        marginTop: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    + Add Answer
                </button>
            )}
        </div>
    );
};

export default QuizEditor;
