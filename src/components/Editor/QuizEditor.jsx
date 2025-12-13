import React from 'react';
import './QuizEditor.css';

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
            // Ensure at least one is selected? Or allow 0? Plan said "if there are many...".
            // Let's allow empty for now in editor, but maybe warn? Or just let it be.
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

    if (quizType === 'nl') {
        const { min = 0, max = 10, stepCount = 10, hideLabels = false, correctValue = 5 } = element.metadata?.nlConfig || {};

        return (
            <div className={`quiz-editor-2 nl-mode`} onMouseDown={(e) => e.stopPropagation()}>
                <div className="nl-container">
                    <div className="nl-track"></div>
                    <div className="nl-ticks">
                        {Array.from({ length: stepCount + 1 }).map((_, i) => {
                            const value = min + (i * ((max - min) / stepCount));
                            const percent = (i / stepCount) * 100;
                            const isEndpoint = i === 0 || i === stepCount;

                            // Simple check: if not endpoint and hiding labels, skip text
                            // Note: Value calculation might have float issues, display only integers if intended? 
                            // User didn't specify integer-only, but usually number lines are integers or clean decimals.
                            // Let's format to locale string or max 1 decimal if needed.
                            const label = Number.isInteger(value) ? value : value.toFixed(1);

                            return (
                                <div
                                    key={i}
                                    className="nl-tick"
                                    style={{ left: `${percent}%` }}
                                >
                                    <div className="nl-tick-mark"></div>
                                    {(!hideLabels || isEndpoint) && (
                                        <span className="nl-tick-label">{label}</span>
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
                        <div className="nl-knob-bubble">{correctValue}</div>
                    </div>
                </div>
                <button className="nl-ready-btn" disabled>READY</button>
            </div>
        );
    }

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
                            <textarea
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                className="option-input-2"
                                placeholder={`Option ${index + 1}`}
                                maxLength={70}
                                rows={2}
                                style={{ resize: 'none', overflow: 'hidden' }}
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
