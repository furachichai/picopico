import React from 'react';
import './ResultField.css';
import { getQuizInfo, calculateResultFieldDimensions } from '../../utils/ResultFieldUtils';

/**
 * ResultField Component
 * 
 * Displays the correct answer after a quiz is solved (classic, 4sq, number line).
 * Sized dynamically according to the largest answer of the quiz (square for single chars,
 * rectangle for longer text). The size is static in play mode.
 * In play mode, it is empty until solved, and is NOT draggable.
 * In editor mode, it is draggable across the screen and starts in lock mode.
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
    // Determine quiz information from the current slide
    const quizInfo = getQuizInfo(slide, language);
    const dimensions = calculateResultFieldDimensions(quizInfo.largestAnswer);

    // Answer to display
    const finalAnswer = solvedAnswer !== null && solvedAnswer !== undefined
        ? String(solvedAnswer)
        : quizInfo.correctAnswer;

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

    if (isPlayMode) {
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

    // Editor Mode
    return (
        <div
            className={`result-field result-field-editor ${dimensions.isSquare ? 'is-square' : ''}`}
            style={dynamicStyle}
        >
            {isSelected && (
                <div className="result-field-editor-badge">
                    {element.metadata?.locked ? '🔒 Result' : '🔓 Result'}
                </div>
            )}
            {quizInfo.hasQuiz ? (
                <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {finalAnswer}
                </span>
            ) : (
                <span className="result-field-placeholder">?</span>
            )}
        </div>
    );
};

export default React.memo(ResultField);
