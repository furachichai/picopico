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

    // NL State
    const nlConfig = data.metadata?.nlConfig || {};
    const { min = 0, max = 10, stepCount = 10, hideLabels = false, correctValue = 5 } = nlConfig;
    const [nlValue, setNlValue] = useState(min); // Start at min
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = React.useRef(null);

    const handleNlSubmit = () => {
        if (isSolved || isFailed) return;

        // Validation
        // User might have float values, handle precision (e.g. epsilon or rounded)
        // Usually step values are precise enough if derived from integers.
        // Let's use a small epsilon for float comparison just in case.
        if (Math.abs(nlValue - correctValue) < 0.001) {
            handleSuccess();
        } else {
            handleWrong(nlValue);
        }
    };

    const handleDragStart = (e) => {
        if (isSolved || isFailed || disabled) return;
        setIsDragging(true);
        // Initial jump to pointer? Usually users grab the knob.
        // If track click, jump? "Draggable knob". Usually implies grabbing knob.
        // But click-jump on track is good UX.
        // Let's handle both via common logic if possible, or bind to window logic immediately.
    };

    const handleDragMove = useCallback((e) => {
        if (!isDragging || !trackRef.current) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));

        const rawValue = min + (percent * (max - min));
        setNlValue(rawValue);
    }, [isDragging, min, max]);

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);

        // Snap logic
        const stepSize = (max - min) / stepCount;
        const stepsTaken = Math.round((nlValue - min) / stepSize);
        const snapped = min + (stepsTaken * stepSize);

        // Clamp (just in case)
        const clamped = Math.min(max, Math.max(min, snapped));
        setNlValue(clamped);
    }, [isDragging, nlValue, max, min, stepCount]);

    // Global Event Listeners for Drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        } else {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);


    const getThumbImage = (index) => {
        return index === 0 ? '/assets/quiz/thumbs_up.png' : '/assets/quiz/thumbs_down.png';
    };

    const getContainerClass = () => {
        if (quizType === 'tf') return 'quiz-options-container-tf';
        if (quizType === '4sq') return 'quiz-options-container-4sq';
        if (quizType === 'nl') return 'quiz-options-container-nl';
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

    // NL Render Logic
    if (quizType === 'nl') {
        return (
            <div className={`quiz-player-2 nl-mode`}>
                <div className="quiz-options-container-nl" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                    {/* Reusing NL HTML structure from Editor but interactive */}
                    <div
                        className="nl-container-player"
                        ref={trackRef}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        style={{ pointerEvents: (isSolved || isFailed || disabled) ? 'none' : 'auto' }}
                    >
                        <div className="nl-track-player"></div>
                        <div className="nl-ticks-player">
                            {Array.from({ length: stepCount + 1 }).map((_, i) => {
                                const value = min + (i * ((max - min) / stepCount));
                                const percent = (i / stepCount) * 100;
                                const isEndpoint = i === 0 || i === stepCount;
                                const label = Number.isInteger(value) ? value : value.toFixed(1);

                                return (
                                    <div
                                        key={i}
                                        className="nl-tick-player"
                                        style={{ left: `${percent}%` }}
                                    >
                                        <div className="nl-tick-mark-player"></div>
                                        {(!hideLabels || isEndpoint) && (
                                            <span className="nl-tick-label-player">{label}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Interactive Knob */}
                        <div
                            className={`nl-knob-player ${isDragging ? 'dragging' : ''} ${isSolved ? 'correct' : ''} ${isFailed ? 'failed' : ''}`}
                            style={{
                                left: `${((nlValue - min) / (max - min)) * 100}%`
                            }}
                        >
                            <div className="nl-knob-bubble-player">{
                                Number.isInteger(nlValue) ? nlValue : nlValue.toFixed(1)
                            }</div>
                        </div>
                    </div>

                    <button
                        className="quiz-ready-btn"
                        onClick={handleNlSubmit}
                        disabled={isSolved || isFailed || disabled}
                        style={{ width: '200px' }} // Override width for single button
                    >
                        READY
                    </button>
                </div>
            </div>
        )
    }

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
