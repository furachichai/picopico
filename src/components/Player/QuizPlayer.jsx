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
const QuizPlayer = ({ data, onNext, onBanner }) => {
    const [selectedOption, setSelectedOption] = useState(null); // Track last selected option (for styling)
    const [wrongIndices, setWrongIndices] = useState(new Set()); // Track all wrong guesses
    const [isSolved, setIsSolved] = useState(false); // Correct answer found
    const [isFailed, setIsFailed] = useState(false); // Max attempts reached
    const [shakingIndex, setShakingIndex] = useState(null); // Track which button is shaking
    const [pulse, setPulse] = useState(false);

    const options = data.metadata?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    const correctIndex = data.metadata?.correctIndex || 0;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C00', '#95E1D3', '#F38181'];

    // Max attempts is total options minus 1
    const maxAttempts = Math.max(1, options.length - 1);
    const attemptsUsed = wrongIndices.size;

    const playSound = (type) => {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.play().catch(e => console.log('Audio play failed (user interaction needed first?):', e));
    };

    const handleSelect = (index) => {
        if (isSolved || isFailed || wrongIndices.has(index)) return;

        setSelectedOption(index);

        if (index === correctIndex) {
            // CORRECT
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

        } else {
            // INCORRECT
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
        }
    };

    return (
        <div className="quiz-player-2">
            <div className="quiz-options-2-container">
                {options.map((option, index) => {
                    let className = 'quiz-option-2-player';
                    const isWrong = wrongIndices.has(index);
                    const isCorrect = index === correctIndex;
                    const isShaking = index === shakingIndex;

                    if (isSolved) {
                        if (isCorrect) className += ' correct pulse';
                        else className += ' grayed-out';
                    } else if (isFailed) {
                        if (isCorrect) {
                            // Pulse and disable interaction on fail
                            className += ' correct pulse';
                            // Note: 'grayed-out' usually implies disabled, but here we want it visible but non-interactive.
                            // We'll handle pointer-events via inline style or specific class if needed, 
                            // but the disabled attribute on button handles clicks. 
                            // User asked for "nor clickable, nor mouseover". 
                            // 'correct' class usually has pointer-events: none? No, usually auto.
                            // We can add a 'non-interactive' class or rely on disabled prop + CSS.
                        } else {
                            className += ' grayed-out';
                        }
                    } else {
                        if (isWrong) className += ' wrong grayed-out';
                    }

                    if (isShaking) className += ' shake';

                    return (
                        <div key={index} className="quiz-option-row-player">
                            <button
                                className={className}
                                style={{
                                    backgroundColor: colors[index % colors.length],
                                    pointerEvents: (isFailed && isCorrect) ? 'none' : 'auto'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
                                    handleSelect(index);
                                }}
                                onAnimationEnd={() => setShakingIndex(null)}
                                disabled={isSolved || isFailed || isWrong}
                            >
                                <span className="quiz-option-text">{option}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuizPlayer;
