import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import confetti from 'canvas-confetti';
import './QuizPlayer.css';
import { parseFraction, FractionComponent } from '../../utils/FractionUtils.jsx';

/**
 * QuizPlayer Component
 * ...
 */
const QuizPlayer = ({ data, onNext, onBanner, disabled = false, debugMode = false }) => {
    // -------------------------------------------------------------------------
    // 1. DATA EXTRACTION (Common + NL)
    // -------------------------------------------------------------------------
    const quizType = data.metadata?.quizType || 'classic';
    const visualMode = data.metadata?.visualMode || false;

    // Classic/TF/4SQ Data
    const options = data.metadata?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    const correctIndex = data.metadata?.correctIndex || 0;
    const correctIndices = data.metadata?.correctIndices || [correctIndex];
    const isMultiSelect = quizType === '4sq' && correctIndices.length > 1;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C00', '#95E1D3', '#F38181'];
    const maxAttempts = Math.max(1, options.length - 1);

    // NL Data
    const nlConfig = data.metadata?.nlConfig || {};
    // Extract raw values first
    const { min: rawMin = 0, max: rawMax = 10, stepCount = 10, hideLabels = false, correctValue: rawCorrect = 5, useFractions = false } = nlConfig;

    // Parse values to floats
    const min = parseFraction(rawMin);
    const max = parseFraction(rawMax);
    const correctValue = parseFraction(rawCorrect);

    // -------------------------------------------------------------------------
    // 2. STATE DEFINITIONS
    // -------------------------------------------------------------------------
    // Common State
    const [selectedOption, setSelectedOption] = useState(null);
    const [wrongIndices, setWrongIndices] = useState(new Set());
    const [isSolved, setIsSolved] = useState(false);
    const [isFailed, setIsFailed] = useState(false);
    const [shakingIndex, setShakingIndex] = useState(null);
    const [pulse, setPulse] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    // NL State
    const [nlValue, setNlValue] = useState(min);
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = React.useRef(null);

    const attemptsUsed = wrongIndices.size;

    // -------------------------------------------------------------------------
    // 3. HELPERS & EFFECTS
    // -------------------------------------------------------------------------
    const playSound = (type) => {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

    const getThumbImage = (index) => {
        return index === 0 ? '/assets/quiz/thumbs_up.png' : '/assets/quiz/thumbs_down.png';
    };

    // -------------------------------------------------------------------------
    // 4. HANDLERS
    // -------------------------------------------------------------------------
    const handleSuccess = () => {
        setIsSolved(true);
        setPulse(true);
        playSound('correct');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        if (onBanner) onBanner('correct', 'CORRECT!');
        setTimeout(() => { if (onNext) onNext(); }, 2000);
    };

    const handleWrong = (index) => {
        const newWrongIndices = new Set(wrongIndices).add(index);
        setWrongIndices(newWrongIndices);
        setShakingIndex(index);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        if (newWrongIndices.size >= maxAttempts) {
            setIsFailed(true);
            playSound('fail');
            if (onBanner) onBanner('fail', 'This was the correct answer');
            setTimeout(() => { if (onNext) onNext(); }, 3000);
        } else {
            playSound('wrong');
        }
    };

    const handleSelect = (index) => {
        if (isSolved || isFailed) return;
        if (isMultiSelect) {
            const newSelected = new Set(selectedIndices);
            newSelected.has(index) ? newSelected.delete(index) : newSelected.add(index);
            setSelectedIndices(newSelected);
            return;
        }
        if (wrongIndices.has(index)) return;
        setSelectedOption(index);
        index === correctIndex ? handleSuccess() : handleWrong(index);
    };

    const handleReadySubmit = () => {
        if (selectedIndices.size === 0) return;
        const selectionArray = Array.from(selectedIndices).sort();
        const correctArray = [...correctIndices].sort();
        const isCorrect = JSON.stringify(selectionArray) === JSON.stringify(correctArray);
        isCorrect ? handleSuccess() : handleWrong(`attempt-${attemptsUsed}`);
    };

    // NL Handlers
    const handleNlSubmit = () => {
        if (isSolved || isFailed) return;
        if (Math.abs(nlValue - correctValue) < 0.001) handleSuccess();
        else handleWrong(nlValue);
    };

    const handleDragStart = (e) => {
        if (isSolved || isFailed || disabled) return;
        setIsDragging(true);
    };

    const handleDragMove = useCallback((e) => {
        if (!isDragging || !trackRef.current) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        setNlValue(min + (percent * (max - min)));
    }, [isDragging, min, max]);

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);
        const stepSize = (max - min) / stepCount;
        const stepsTaken = Math.round((nlValue - min) / stepSize);
        const snapped = min + (stepsTaken * stepSize);
        setNlValue(Math.min(max, Math.max(min, snapped)));
    }, [isDragging, nlValue, max, min, stepCount]);

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
        if (isMultiSelect && selectedIndices.has(index)) base += ' selected';
        return base;
    };

    // -------------------------------------------------------------------------
    // 5. RENDER
    // -------------------------------------------------------------------------
    if (quizType === 'nl') {
        return (
            <div className={`quiz-player-2 nl-mode ${useFractions ? 'nl-fractions' : ''}`}>
                <div className="quiz-options-container-nl" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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

                                return (
                                    <div key={i} className="nl-tick-player" style={{ left: `${percent}%` }}>
                                        <div className="nl-tick-mark-player"></div>
                                        {(!hideLabels || isEndpoint) && (
                                            <div className="nl-tick-label-player">
                                                <FractionComponent value={value} useFractions={useFractions} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className={`nl-knob-player ${isDragging ? 'dragging' : ''} ${isSolved ? 'correct' : ''} ${isFailed ? 'failed' : ''} ${shakingIndex === nlValue ? 'wrong knob-shake' : ''}`}
                            style={{ left: `${((nlValue - min) / (max - min)) * 100}%` }}
                            onAnimationEnd={() => setShakingIndex(null)}
                        >
                            <div className="nl-knob-bubble-player">
                                <FractionComponent value={nlValue} useFractions={useFractions} />
                            </div>
                        </div>
                    </div>
                    <button
                        className="quiz-ready-btn"
                        onClick={handleNlSubmit}
                        disabled={isSolved || isFailed || disabled}
                        style={{ width: '200px' }}
                    >
                        READY
                    </button>
                </div>
            </div>
        );
    }

    // Classic / TF / 4SQ Render
    return (
        <div className={`quiz-player-2 ${quizType === 'tf' ? 'tf-mode' : ''} ${quizType === '4sq' ? 'four-sq-mode' : ''}`}>
            <div className={getContainerClass()}>
                {options.map((option, index) => {
                    let className = getOptionClass(index);
                    const isWrong = wrongIndices.has(index);
                    const isCorrect = correctIndices.includes(index);
                    const isShaking = index === shakingIndex;

                    if (isSolved) {
                        className += isCorrect ? ' correct pulse' : ' grayed-out';
                    } else if (isFailed) {
                        className += isCorrect ? ' correct pulse' : ' grayed-out';
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
                                        <img src={getThumbImage(index)} alt={index === 0 ? 'True' : 'False'} className="tf-image" />
                                    </div>
                                ) : (
                                    <span className="quiz-option-text">{option}</span>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
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
