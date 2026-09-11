import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTypeQuiz } from '../../context/TypeQuizContext';
import './TypeQuizKeyboard.css';

const TypeQuizKeyboard = ({ isActive = true }) => {
    const { t } = useTranslation();
    const typeQuiz = useTypeQuiz();

    if (!typeQuiz) return null;

    const {
        checkButtonState,
        keyboardSlidDown,
        handleKeyPress,
        handleCheck
    } = typeQuiz;

    // Listen to physical keyboard events when slide is active
    useEffect(() => {
        if (!isActive || keyboardSlidDown) return;

        const handleKeyDown = (e) => {
            // Do not capture if typing in an input/textarea outside
            if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            if (/^[0-9]$/.test(e.key)) {
                e.preventDefault();
                handleKeyPress(e.key);
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                handleKeyPress('backspace');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleCheck();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, keyboardSlidDown, handleKeyPress, handleCheck]);

    // Button label based on state
    let buttonLabel = t('quiz.check', 'CHECK');
    if (checkButtonState === 'try_again') {
        buttonLabel = t('quiz.tryAgain', 'TRY AGAIN');
    } else if (checkButtonState === 'next') {
        buttonLabel = t('quiz.next', 'NEXT');
    } else if (checkButtonState === 'solved') {
        buttonLabel = t('quiz.done', 'DONE');
    }

    const isBtnDisabled = checkButtonState === 'disabled';

    return (
        <div className={`type-quiz-keyboard-container ${keyboardSlidDown ? 'slid-down' : ''}`}>
            {/* Action Check / Next / Try Again Button */}
            <div className="type-quiz-action-wrapper">
                <button
                    type="button"
                    className={`type-quiz-action-btn ${checkButtonState}`}
                    disabled={isBtnDisabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCheck();
                    }}
                >
                    {buttonLabel}
                </button>
            </div>

            {/* Custom Onscreen Numeric Keypad */}
            <div className="type-quiz-keypad-grid">
                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('1'); }}
                >
                    1
                </button>
                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('2'); }}
                >
                    2
                </button>
                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('3'); }}
                >
                    3
                </button>

                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('4'); }}
                >
                    4
                </button>
                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('5'); }}
                >
                    5
                </button>
                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('6'); }}
                >
                    6
                </button>

                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('7'); }}
                >
                    7
                </button>
                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('8'); }}
                >
                    8
                </button>
                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('9'); }}
                >
                    9
                </button>

                {/* Bottom row: empty spacer, 0, backspace */}
                <div className="type-quiz-key-spacer" />
                <button
                    type="button"
                    className="type-quiz-key-btn"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('0'); }}
                >
                    0
                </button>
                <button
                    type="button"
                    className="type-quiz-key-btn type-quiz-key-backspace"
                    onClick={(e) => { e.stopPropagation(); handleKeyPress('backspace'); }}
                    title="Backspace"
                    aria-label="Backspace"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                        <line x1="18" y1="9" x2="12" y2="15" />
                        <line x1="12" y1="9" x2="18" y2="15" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default TypeQuizKeyboard;
