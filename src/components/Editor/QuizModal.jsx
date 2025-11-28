import React, { useState, useEffect } from 'react';
import './QuizModal.css';

const QuizModal = ({ initialData, onSave, onClose }) => {
    const [question, setQuestion] = useState(initialData?.question || '');
    const [options, setOptions] = useState(initialData?.options || ['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(initialData?.correctIndex || 0);

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSave = () => {
        onSave({
            question,
            options,
            correctIndex,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="quiz-modal">
                <h3>Edit Quiz</h3>

                <div className="form-group">
                    <label>Question:</label>
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Enter your question"
                    />
                </div>

                <div className="options-list">
                    <label>Options (Select correct answer):</label>
                    {options.map((opt, index) => (
                        <div key={index} className="option-row">
                            <input
                                type="radio"
                                name="correct-answer"
                                checked={correctIndex === index}
                                onChange={() => setCorrectIndex(index)}
                            />
                            <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                            />
                        </div>
                    ))}
                </div>

                <div className="modal-actions">
                    <button onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave}>Save Quiz</button>
                </div>
            </div>
        </div>
    );
};

export default QuizModal;
