import React, { useMemo } from 'react';
import { parseFieldExpression, generateFieldChoices } from '../../utils/fieldQuizUtils';
import { renderScaleTokenOrText } from '../../utils/sackUtils.jsx';
import './FieldQuizBottomControls.css';

const FieldQuizBottomControls = ({ element, onSelect, isEditor = true }) => {
    if (!element) return null;

    const isBalanzaField = element.metadata?.quizType === 'balanza_field';
    const targetExpr = element.metadata?.targetExpression !== undefined
        ? element.metadata.targetExpression
        : (element.metadata?.fieldExpression ? element.metadata.fieldExpression.split(';')[0].trim() : (isBalanzaField ? '*2c* + *t*' : '3 + *8 x 2* = 19'));
    const cardsText = element.metadata?.cardsText !== undefined
        ? element.metadata.cardsText
        : (element.metadata?.fieldExpression && element.metadata.fieldExpression.includes(';')
            ? element.metadata.fieldExpression.split(';').slice(1).join(';').trim()
            : (isBalanzaField ? '2c, t, 2t, 3t, c+c' : ''));

    const choices = useMemo(() => {
        if (isBalanzaField && cardsText.trim()) {
            const parsed = cardsText.split(',').map(s => s.trim()).filter(Boolean);
            if (parsed.length > 0) return parsed;
        }
        const expr = cardsText.trim() ? `${targetExpr}; ${cardsText.trim()}` : targetExpr;
        const segments = parseFieldExpression(expr);
        const rawChoices = generateFieldChoices(segments);
        return rawChoices.length > 0 ? rawChoices : ['?', '?', '?', '?', '?'];
    }, [isBalanzaField, targetExpr, cardsText]);
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
                <div className={`field-choices-grid ${choices.length === 4 ? 'four-cols' : ''}`}>
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
                                {isBalanzaField ? renderScaleTokenOrText(choiceVal, 22) : choiceVal}
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
