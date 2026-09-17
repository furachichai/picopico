import React from 'react';
import { parseFieldExpression, generateFieldChoices } from '../../utils/fieldQuizUtils';
import './FieldQuizBottomControls.css';

const FieldQuizBottomControls = ({ element, onSelect, isEditor = true }) => {
    if (!element) return null;

    const expr = element.metadata?.fieldExpression || '3 + *8 x 2* = 19';
    const segments = parseFieldExpression(expr);
    const rawChoices = generateFieldChoices(segments);
    const choices = rawChoices.length > 0 ? rawChoices : ['?', '?', '?', '?', '?'];
    const isHidden = !!(element.hidden || element.metadata?.hidden);

    return (
        <div
            className="field-player-bottom-portal field-editor-bottom-preview"
            style={{
                opacity: isHidden ? 0.45 : 1,
            }}
            onClick={(e) => {
                if (isEditor && onSelect) {
                    e.stopPropagation();
                    onSelect(element.id);
                }
            }}
        >
            <div className="field-choices-section">
                <div className="field-choices-grid">
                    {choices.map((choiceVal, idx) => (
                        <div key={idx} className="field-choice-cell">
                            <button
                                type="button"
                                className="field-choice-btn"
                                onClick={(e) => {
                                    if (isEditor && onSelect) {
                                        e.stopPropagation();
                                        onSelect(element.id);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    cursor: isEditor ? 'pointer' : undefined
                                }}
                            >
                                {choiceVal}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="field-ok-section">
                <button
                    type="button"
                    className="field-ok-btn"
                    onClick={(e) => {
                        if (isEditor && onSelect) {
                            e.stopPropagation();
                            onSelect(element.id);
                        }
                    }}
                    style={{
                        cursor: isEditor ? 'pointer' : undefined
                    }}
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default FieldQuizBottomControls;
