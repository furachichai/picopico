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
        if (onBanner) onBanner('correct', 'Topo!');
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
            if (onBanner) onBanner('fail', 'Moco!');
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
        if (quizType === 'reorder') return 'quiz-options-container-reorder';
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
    // REORDER STATE & LOGIC
    // -------------------------------------------------------------------------
    const [reorderItems, setReorderItems] = useState([]);
    const [isShuffling, setIsShuffling] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOffset, setDragOffset] = useState(0);
    const reorderContainerRef = React.useRef(null);
    const dragStartY = React.useRef(0);
    const itemHeight = 56; // Height of each bar + gap

    // Initialize shuffled items on mount
    useEffect(() => {
        if (quizType !== 'reorder') return;
        const items = options.map((text, i) => ({ text, originalIndex: i }));
        // Fisher-Yates shuffle (ensure different order)
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        // If shuffle produced same order, swap first two
        const isSame = shuffled.every((item, idx) => item.originalIndex === idx);
        if (isSame && shuffled.length > 1) {
            [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
        }
        setReorderItems(shuffled);
        // Brief shuffle animation
        setIsShuffling(true);
        const timer = setTimeout(() => setIsShuffling(false), 700);
        return () => clearTimeout(timer);
    }, [quizType]);

    const handleReorderDragStart = (e, index) => {
        if (isShuffling || isSolved || isFailed || disabled) return;
        e.preventDefault();
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStartY.current = clientY;
        setDraggedIndex(index);
        setDragOffset(0);
    };

    const handleReorderDragMove = useCallback((e) => {
        if (draggedIndex === null) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        let offset = clientY - dragStartY.current;

        // Clamp: don't let bar go above first position or below last
        const maxUp = -draggedIndex * itemHeight;
        const maxDown = (reorderItems.length - 1 - draggedIndex) * itemHeight;
        offset = Math.max(maxUp, Math.min(maxDown, offset));
        setDragOffset(offset);

        // Calculate swap
        const currentItems = [...reorderItems];
        const direction = offset > 0 ? 1 : -1;
        const threshold = itemHeight * 0.5;
        if (Math.abs(offset) > threshold) {
            const targetIndex = draggedIndex + direction;
            if (targetIndex >= 0 && targetIndex < currentItems.length) {
                [currentItems[draggedIndex], currentItems[targetIndex]] = [currentItems[targetIndex], currentItems[draggedIndex]];
                setReorderItems(currentItems);
                setDraggedIndex(targetIndex);
                dragStartY.current = clientY;
                setDragOffset(0);
            }
        }
    }, [draggedIndex, reorderItems, itemHeight]);

    const handleReorderDragEnd = useCallback(() => {
        setDraggedIndex(null);
        setDragOffset(0);
    }, []);

    useEffect(() => {
        if (draggedIndex !== null) {
            window.addEventListener('mousemove', handleReorderDragMove);
            window.addEventListener('mouseup', handleReorderDragEnd);
            window.addEventListener('touchmove', handleReorderDragMove, { passive: false });
            window.addEventListener('touchend', handleReorderDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleReorderDragMove);
            window.removeEventListener('mouseup', handleReorderDragEnd);
            window.removeEventListener('touchmove', handleReorderDragMove);
            window.removeEventListener('touchend', handleReorderDragEnd);
        };
    }, [draggedIndex, handleReorderDragMove, handleReorderDragEnd]);

    const handleReorderSubmit = () => {
        if (isShuffling || isSolved || isFailed) return;
        const isCorrect = reorderItems.every((item, idx) => item.originalIndex === idx);
        if (isCorrect) {
            handleSuccess();
        } else {
            handleWrong(`reorder-attempt-${attemptsUsed}`);
        }
    };

    // -------------------------------------------------------------------------
    // 5. RENDER
    // -------------------------------------------------------------------------

    // REORDER MODE
    if (quizType === 'reorder') {
        return (
            <div className={`quiz-player-2 reorder-mode`}>
                <div className="quiz-options-container-reorder" ref={reorderContainerRef}>
                    {reorderItems.map((item, index) => {
                        const isDragged = index === draggedIndex;
                        let transformY = 0;
                        if (isDragged) transformY = dragOffset;

                        return (
                            <div
                                key={`${item.originalIndex}`}
                                className={`quiz-option-reorder ${isDragged ? 'dragging' : ''} ${isShuffling ? 'shuffling' : ''} ${isSolved ? (item.originalIndex === index ? 'correct' : '') : ''} ${isFailed ? (item.originalIndex === index ? 'correct' : 'wrong') : ''}`}
                                style={{
                                    backgroundColor: colors[item.originalIndex % colors.length],
                                    transform: isDragged ? `translateY(${transformY}px) scale(1.05)` : 'none',
                                    transition: isDragged ? 'none' : 'transform 0.25s ease, opacity 0.3s',
                                    zIndex: isDragged ? 100 : 1,
                                    pointerEvents: (isShuffling || isSolved || isFailed || disabled) ? 'none' : 'auto',
                                    animationDelay: isShuffling ? `${index * 80}ms` : undefined,
                                }}
                                onMouseDown={(e) => handleReorderDragStart(e, index)}
                                onTouchStart={(e) => handleReorderDragStart(e, index)}
                            >
                                <span className="quiz-option-text" dangerouslySetInnerHTML={{ __html: item.text }} />
                                <span className="reorder-grip">⋮⋮</span>
                            </div>
                        );
                    })}
                </div>
                {!isSolved && !isFailed && (
                    <button
                        className="quiz-ready-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReorderSubmit();
                        }}
                        disabled={isShuffling}
                    >
                        READY
                    </button>
                )}
            </div>
        );
    }

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
                                    <span className="quiz-option-text" dangerouslySetInnerHTML={{ __html: option }} />
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
