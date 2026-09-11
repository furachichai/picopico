import React from 'react';
import './ResultField.css';
import { getQuizInfo, calculateResultFieldDimensions } from '../../utils/ResultFieldUtils';
import { useTypeQuiz } from '../../context/TypeQuizContext';

/**
 * ResultField Component
 * 
 * Displays the correct answer after a quiz is solved (classic, 4sq, number line)
 * OR acts as an interactive typed answer field for the 'Type Answer' quiz.
 */
const ResultField = ({
    element,
    slide,
    isSolved = false,
    solvedAnswer = null,
    isPlayMode = false,
    isSelected = false,
    language = 'es'
}) => {
    const typeQuiz = useTypeQuiz();
    const isTypeQuizSlide = slide?.elements?.some(el => el.type === 'quiz' && el.metadata?.quizType === 'type');

    // Sizing: if this field has a configured correctAnswer (or is a type quiz), size strictly to its answer!
    const targetAnswer = element.metadata?.correctAnswer !== undefined
        ? String(element.metadata.correctAnswer)
        : null;

    const quizInfo = getQuizInfo(slide, language);
    const dimensions = calculateResultFieldDimensions(
        targetAnswer !== null ? targetAnswer : quizInfo.largestAnswer
    );

    // Answer to display in classic / non-interactive mode
    const finalAnswer = targetAnswer !== null
        ? targetAnswer
        : (solvedAnswer !== null && solvedAnswer !== undefined
            ? String(solvedAnswer)
            : quizInfo.correctAnswer);

    // Custom metadata overrides if author configured them
    const customBg = element.metadata?.backgroundColor;
    const customBorder = element.metadata?.borderColor;
    const customColor = element.metadata?.color;
    const customFontSize = element.metadata?.fontSize;

    const dynamicStyle = {
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        fontSize: customFontSize ? `${customFontSize}px` : `${dimensions.fontSize || 34}px`,
        ...(dimensions.isSquare ? { aspectRatio: '1 / 1' } : {}),
        ...(customBg && { background: customBg }),
        ...(customBorder && { borderColor: customBorder }),
        ...(customColor && { color: customColor }),
    };

    // ----------------------------------------------------
    // PLAY MODE
    // ----------------------------------------------------
    if (isPlayMode) {
        // If this is an interactive Type Quiz slide with active context
        if (typeQuiz) {
            const isActive = typeQuiz.activeFieldId === element.id;
            const fieldState = typeQuiz.fieldStates[element.id] || 'idle'; // 'idle' | 'wrong' | 'solved'
            const typedVal = typeQuiz.typedValues[element.id] || '';

            return (
                <div
                    className={`result-field result-field-player type-quiz-interactive ${dimensions.isSquare ? 'is-square' : ''} state-${fieldState} ${isActive && fieldState !== 'solved' ? 'state-active' : ''}`}
                    style={dynamicStyle}
                    onClick={(e) => {
                        e.stopPropagation();
                        typeQuiz.handleSelectField(element.id);
                    }}
                >
                    {fieldState === 'solved' ? (
                        <span className="result-field-content-pop">
                            {element.metadata?.correctAnswer ?? typedVal}
                        </span>
                    ) : (
                        <span>
                            {typedVal}
                            {isActive && fieldState !== 'wrong' && (
                                <span className="type-quiz-cursor" />
                            )}
                        </span>
                    )}
                </div>
            );
        }

        // Classic companion Result Field
        return (
            <div
                className={`result-field result-field-player ${dimensions.isSquare ? 'is-square' : ''} ${isSolved ? 'solved' : 'empty'}`}
                style={dynamicStyle}
            >
                {isSolved && (
                    <span className="result-field-content-pop">
                        {finalAnswer}
                    </span>
                )}
            </div>
        );
    }

    // ----------------------------------------------------
    // EDITOR MODE
    // ----------------------------------------------------
    const allResultFields = (slide?.elements || []).filter(el => el.type === 'result_field');
    const hasMultipleResultFields = allResultFields.length > 1;
    const fieldOrder = element.metadata?.order !== undefined
        ? Number(element.metadata.order)
        : (allResultFields.findIndex(f => f.id === element.id) + 1);

    const showOrderBadge = hasMultipleResultFields || isTypeQuizSlide;

    return (
        <div
            className={`result-field result-field-editor ${dimensions.isSquare ? 'is-square' : ''}`}
            style={dynamicStyle}
        >
            {/* Small comic badge indicating order */}
            {showOrderBadge && (
                <div className="result-field-order-badge" title={`Order #${fieldOrder}`}>
                    {fieldOrder}
                </div>
            )}

            {isSelected && (
                <div className="result-field-editor-badge">
                    {element.metadata?.locked ? '🔒 Result' : '🔓 Result'}
                </div>
            )}

            {targetAnswer !== null ? (
                <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {targetAnswer || <span className="result-field-placeholder">0</span>}
                </span>
            ) : (quizInfo.hasQuiz ? (
                <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {finalAnswer}
                </span>
            ) : (
                <span className="result-field-placeholder">?</span>
            ))}
        </div>
    );
};

export default React.memo(ResultField);
