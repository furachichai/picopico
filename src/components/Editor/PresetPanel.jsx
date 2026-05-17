import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import './PresetPanel.css';

const FONTS = [
    { name: 'Nunito', value: 'Nunito' },
    { name: 'Comic Sans', value: '"Comic Sans MS", "Chalkboard SE", sans-serif' },
    { name: 'Serif', value: 'Georgia, serif' },
    { name: 'Monospace', value: 'monospace' },
];

const COLORS = [
    '#000000', '#ffffff', '#ff4b4b', '#58cc02', '#1cb0f6', '#ffc800', '#ce82ff',
    '#9333ea', '#e11d48', '#f97316', '#0d9488', '#475569', '#8b4513', '#ec4899'
];

const PresetPanel = ({ onClose }) => {
    const { state, dispatch } = useEditor();
    const existing = state.lesson.textPreset || {};

    const [textFont, setTextFont] = useState(existing.text?.fontFamily || '"HVD Comic Serif Pro", sans-serif');
    const [textSize, setTextSize] = useState(existing.text?.fontSize || 24);
    const [textColor, setTextColor] = useState(existing.text?.color || '#000000');

    const [quizFont, setQuizFont] = useState(existing.quizAnswers?.fontFamily || 'Nunito');
    const [quizSize, setQuizSize] = useState(existing.quizAnswers?.fontSize || 16);
    const [quizColor, setQuizColor] = useState(existing.quizAnswers?.color || '#ffffff');

    const [balloonFont, setBalloonFont] = useState(existing.balloon?.fontFamily || '"HVD Comic Serif Pro", sans-serif');
    const [balloonSize, setBalloonSize] = useState(existing.balloon?.fontSize || 16);
    const [balloonColor, setBalloonColor] = useState(existing.balloon?.color || '#000000');

    const [mathOpColor, setMathOpColor] = useState(existing.mathOperatorColor || '#ff4b4b');

    const [showConfirm, setShowConfirm] = useState(false);

    const buildPreset = () => ({
        text: { fontFamily: textFont, fontSize: textSize, color: textColor },
        quizAnswers: { fontFamily: quizFont, fontSize: quizSize, color: quizColor },
        balloon: { fontFamily: balloonFont, fontSize: balloonSize, color: balloonColor },
        mathOperatorColor: mathOpColor,
    });

    const handleSave = () => {
        dispatch({ type: 'SET_TEXT_PRESET', payload: buildPreset() });
        onClose();
    };

    const handleApply = () => {
        setShowConfirm(true);
    };

    const confirmApply = () => {
        // First save the preset
        dispatch({ type: 'SET_TEXT_PRESET', payload: buildPreset() });
        // Then apply it retroactively
        // Need a small delay so the preset is saved first
        setTimeout(() => {
            dispatch({ type: 'APPLY_TEXT_PRESET' });
        }, 0);
        setShowConfirm(false);
        onClose();
    };

    const renderSection = (title, emoji, font, setFont, size, setSize, color, setColor) => (
        <div className="preset-section">
            <div className="preset-section-header">
                <span className="preset-emoji">{emoji}</span>
                <span className="preset-section-title">{title}</span>
            </div>
            <div className="preset-row">
                <div className="preset-field">
                    <label>Font</label>
                    <select value={font} onChange={e => setFont(e.target.value)}>
                        {FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                    </select>
                </div>
                <div className="preset-field">
                    <label>Size</label>
                    <input
                        type="number"
                        value={size}
                        onChange={e => setSize(parseInt(e.target.value) || 16)}
                        min="8" max="100"
                    />
                </div>
            </div>
            <div className="preset-field">
                <label>Color</label>
                <div className="preset-color-row">
                    {COLORS.map(c => (
                        <div
                            key={c}
                            className={`preset-swatch ${color === c ? 'active' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setColor(c)}
                        />
                    ))}
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="preset-color-input"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="preset-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="preset-panel">
                <div className="preset-header">
                    <h2>Text Presets</h2>
                    <button className="preset-close" onClick={onClose}>✕</button>
                </div>

                <div className="preset-body">
                    {renderSection('Text Elements', '📝', textFont, setTextFont, textSize, setTextSize, textColor, setTextColor)}
                    {renderSection('Quiz Answers', '🧩', quizFont, setQuizFont, quizSize, setQuizSize, quizColor, setQuizColor)}
                    {renderSection('Balloons', '💬', balloonFont, setBalloonFont, balloonSize, setBalloonSize, balloonColor, setBalloonColor)}

                    <div className="preset-section">
                        <div className="preset-section-header">
                            <span className="preset-emoji">🔢</span>
                            <span className="preset-section-title">Math Operators</span>
                        </div>
                        <p className="preset-hint">Color for + - × ÷ = ( )</p>
                        <div className="preset-field">
                            <label>Operator Color</label>
                            <div className="preset-color-row">
                                {COLORS.map(c => (
                                    <div
                                        key={c}
                                        className={`preset-swatch ${mathOpColor === c ? 'active' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setMathOpColor(c)}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={mathOpColor}
                                    onChange={e => setMathOpColor(e.target.value)}
                                    className="preset-color-input"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="preset-footer">
                    <button className="preset-btn preset-btn-secondary" onClick={handleSave}>
                        Save Preset
                    </button>
                    <button className="preset-btn preset-btn-primary" onClick={handleApply}>
                        Apply to Lesson
                    </button>
                </div>

                {showConfirm && (
                    <div className="preset-confirm-overlay">
                        <div className="preset-confirm">
                            <p>This will update <strong>all existing</strong> text, quiz answers, and balloons in the lesson with these preset values.</p>
                            <p>Math operators will be re-colored across all content.</p>
                            <div className="preset-confirm-actions">
                                <button className="preset-btn preset-btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                                <button className="preset-btn preset-btn-primary" onClick={confirmApply}>Confirm</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PresetPanel;
