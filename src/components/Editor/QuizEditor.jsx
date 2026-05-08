import React from 'react';
import './QuizEditor.css';
import { parseFraction, formatFraction, FractionComponent } from '../../utils/FractionUtils.jsx';

/**
 * QuizEditor Component
 * 
 * Allows the user to edit the options and correct answer for a quiz sticker.
 * Rendered directly inside the Sticker component when in edit mode.
 */
const QuizEditor = ({ element, onChange }) => {
    const options = element.metadata?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    const correctIndex = element.metadata?.correctIndex || 0;
    // For 4sq, we use correctIndices. Fallback to correctIndex if missing.
    const correctIndices = element.metadata?.correctIndices || [correctIndex];

    const quizType = element.metadata?.quizType || 'classic';
    const visualMode = element.metadata?.visualMode || false;

    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C00', '#95E1D3', '#F38181'];

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
                                ref={(el) => {
                                    if (el && el.innerHTML !== option && document.activeElement !== el) {
                                        el.innerHTML = option;
                                    }
                                }}
                                style={{ resize: 'none', overflow: 'hidden', minHeight: '1.2em', outline: 'none', cursor: 'text', userSelect: 'text' }}
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
        </div>
    );
};

export default QuizEditor;
