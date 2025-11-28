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
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C00', '#95E1D3', '#F38181']; // Red, Teal, Yellow, Orange, etc.

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange(element.id, { options: newOptions });
    };

    const handleCorrectChange = (index) => {
        onChange(element.id, { correctIndex: index });
    };

    const removeOption = (index) => {
        if (options.length <= 1) return;
        const newOptions = options.filter((_, i) => i !== index);
        // Adjust correct index if needed
        let newCorrect = correctIndex;
        if (index === correctIndex) newCorrect = 0;
        else if (index < correctIndex) newCorrect = correctIndex - 1;

        // Ensure correct index is within bounds
        if (newCorrect >= newOptions.length) newCorrect = newOptions.length - 1;

        onChange(element.id, { options: newOptions, correctIndex: newCorrect });
    };

    return (
        <div className="quiz-editor-2" onMouseDown={(e) => e.stopPropagation()}>
            {options.map((option, index) => (
                <div key={index} className="quiz-option-row">
                    {options.length > 1 && (
                        <button className="remove-btn-2" onClick={() => removeOption(index)} title="Remove option">×</button>
                    )}

                    <div
                        className={`quiz-option-2 ${index === correctIndex ? 'correct' : ''}`}
                        style={{ backgroundColor: colors[index % colors.length] }}
                    >
                        <textarea
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            className="option-input-2"
                            placeholder={`Option ${index + 1}`}
                            maxLength={70}
                            rows={2}
                            style={{ resize: 'none', overflow: 'hidden' }}
                        />
                    </div>

                    <input
                        type="radio"
                        name={`correct-${element.id}`}
                        checked={index === correctIndex}
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
