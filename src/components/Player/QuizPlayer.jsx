import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import './QuizPlayer.css';

/**
 * QuizPlayer Component
 * 
 * Displays a multiple-choice quiz with advanced logic:
 * - Attempts tracking (Max attempts = Options - 1)
 * - Sound effects (Correct, Wrong, Fail)
 * - Confetti celebration for correct answer
 * - Auto-advance to next slide
 */
const QuizPlayer = ({ data, onNext, onBanner, disabled = false }) => {
    // Data from metadata
    const options = data.metadata?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    const correctIndex = data.metadata?.correctIndex || 0;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C00', '#95E1D3', '#F38181'];

    const quizType = data.metadata?.quizType || 'classic';
    const visualMode = data.metadata?.visualMode || false;
    const correctIndices = data.metadata?.correctIndices || [correctIndex];
    const isMultiSelect = quizType === '4sq' && correctIndices.length > 1;

    // State hooks
    const [selectedOption, setSelectedOption] = useState(null);
    const [wrongIndices, setWrongIndices] = useState(new Set());
    const [isSolved, setIsSolved] = useState(false);
    const [isFailed, setIsFailed] = useState(false);
    const [shakingIndex, setShakingIndex] = useState(null);
    const [pulse, setPulse] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    // Max attempts
    const maxAttempts = Math.max(1, options.length - 1);
    const attemptsUsed = wrongIndices.size;

    const playSound = (type) => {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const handleSelect = (index) => {
        if (isSolved || isFailed) return;

        if (isMultiSelect) {
            // Toggle selection
            const newSelected = new Set(selectedIndices);
            if (newSelected.has(index)) {
                newSelected.delete(index);
            } else {
                newSelected.add(index);
            }
            setSelectedIndices(newSelected);
            return;
        }

        // Single Select Logic (Classic/TF/Single-4SQ)
        if (wrongIndices.has(index)) return;

        setSelectedOption(index);

        if (index === correctIndex) {
            // CORRECT
            handleSuccess();
        } else {
            // INCORRECT
            handleWrong(index);
        }
    };

    const handleSuccess = () => {
        setIsSolved(true);
        setPulse(true);
        playSound('correct');
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        if (onBanner) onBanner('correct', 'CORRECT!');

        // Auto-advance after 2 seconds
        setTimeout(() => {
            if (onNext) onNext();
        }, 2000);
    };

    const handleWrong = (index) => {
        // Track attempts (for single select, index is unique guess. For multi, might be submission count?)
        // Let's stick to unique wrong guesses for single select.
        // For multi-select, we might just track number of failed submissions.

        const newWrongIndices = new Set(wrongIndices).add(index);
        setWrongIndices(newWrongIndices);

        // Shake only this button
        setShakingIndex(index);
        if (navigator.vibrate) navigator.vibrate(200);

        // Check for failure
        if (newWrongIndices.size >= maxAttempts) {
            // FAILED
            setIsFailed(true);
            playSound('fail');

            if (onBanner) onBanner('fail', 'This was the correct answer');

            // Auto-advance after 3 seconds
            setTimeout(() => {
                if (onNext) onNext();
            }, 3000);
        } else {
            // Just wrong, keep trying
            playSound('wrong');
        }
    };

    const handleReadySubmit = () => {
        if (selectedIndices.size === 0) return;

        // Check if selection matches correctIndices
        const selectionArray = Array.from(selectedIndices).sort();
        const correctArray = [...correctIndices].sort();

        const isCorrect = JSON.stringify(selectionArray) === JSON.stringify(correctArray);

        if (isCorrect) {
            handleSuccess();
        } else {
            // In multi-select, we don't necessarily have a specific "wrong index" to block.
            // But we can count this as a failed attempt.
            // Let's use a dummy index for setWrongIndices(size) logic or separate counter.
            // Reusing setWrongIndices for attempt counting:
            handleWrong(`attempt-${attemptsUsed}`);
        }
    };

    // Helper to get thumb image
    const getThumbImage = (index) => {
        return index === 0 ? '/assets/quiz/thumbs_up.png' : '/assets/quiz/thumbs_down.png';
    };

    const getContainerClass = () => {
        if (quizType === 'tf') return 'quiz-options-container-tf';
        if (quizType === '4sq') return 'quiz-options-container-4sq';
        return 'quiz-options-container-classic';
    };

    const getOptionClass = (index) => {
        let base = 'quiz-option-2-player';
        if (quizType === 'tf') base = 'quiz-option-tf';
        if (quizType === '4sq') base = 'quiz-option-4sq';

        if (isMultiSelect && selectedIndices.has(index)) {
            base += ' selected';
        }

        return base;
    };

    return (
        <div className={`quiz-player-2 ${quizType === 'tf' ? 'tf-mode' : ''} ${quizType === '4sq' ? 'four-sq-mode' : ''}`}>
            <div className={getContainerClass()}>
                {options.map((option, index) => {
                    let className = getOptionClass(index);
                    const isWrong = wrongIndices.has(index);
                    // For multi-select, "correctIndex" comparison isn't enough for highlighting ALL correct.
                    // But for "reveal" phase (isSolved/isFailed), we should highlight all correct indices.
                    const isCorrect = correctIndices.includes(index);
                    const isShaking = index === shakingIndex;

                    if (isSolved) {
                        if (isCorrect) className += ' correct pulse';
                        else className += ' grayed-out';
                    } else if (isFailed) {
                        if (isCorrect) {
                            className += ' correct pulse';
                        } else {
                            className += ' grayed-out';
                        }
                    } else {
                        if (isWrong && !isMultiSelect) className += ' wrong grayed-out';
                    }

                    if (isShaking) className += ' shake';

                    return (
                        <div key={index} className={quizType === 'tf' ? 'quiz-option-wrapper-tf' : 'quiz-option-wrapper'}>
                            <button
                                className={className}
                                style={{
                                    backgroundColor: colors[index % colors.length],
                                    pointerEvents: (isFailed || isSolved || disabled) ? 'none' : 'auto'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
                                    handleSelect(index);
                                }}
                                onAnimationEnd={() => setShakingIndex(null)}
                                disabled={(isSolved || isFailed || (isWrong && !isMultiSelect) || disabled)}
                            >
                                {quizType === 'tf' && visualMode ? (
                                    <div className="visual-answer">
                                        <img
                                            src={getThumbImage(index)}
                                            alt={index === 0 ? 'True' : 'False'}
                                            className="tf-image"
                                        />
                                    </div>
                                ) : (
                                    <span className="quiz-option-text">{option}</span>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* READY Button for Multi-Select */}
            {isMultiSelect && !isSolved && !isFailed && (
                <button
                    className="quiz-ready-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleReadySubmit();
                    }}
                    disabled={selectedIndices.size === 0}
                >
                    READY
                </button>
            )}
        </div>
    );
};

export default QuizPlayer;
