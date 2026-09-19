import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { generateBatchCards, optimizeImage } from './swipeSorterUtils';
import './SwipeSorter.css';

const SWIPE_THRESHOLD = 25; // Pixels to trigger a swipe

const SwipeSorter = ({ config = {}, onComplete, preview = false }) => {
    // Config Extraction
    const {
        leftLabel = 'FALSE',
        rightLabel = 'CORRECT',
        cards: initialCards = [],
        mode = 'manual',
        batch = '',
        batchText: aliasBatchText = '',
        order = 'random',
        batchOrder: aliasBatchOrder,
        totalCards = null,
        batchTotalCards: aliasBatchTotalCards
    } = config;

    const rawBatch = (batch !== undefined && batch !== '') ? batch : aliasBatchText;
    const effectiveOrder = aliasBatchOrder || order || 'random';
    const effectiveTotalCards = aliasBatchTotalCards !== undefined ? aliasBatchTotalCards : totalCards;
    const isBatchMode = mode === 'batch' || (mode !== 'manual' && typeof rawBatch === 'string' && rawBatch.trim().length > 0);

    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // State Refs to prevent stale closures in timeouts
    const cardsRef = useRef(cards);
    const currentIndexRef = useRef(currentIndex);

    useEffect(() => {
        cardsRef.current = cards;
        currentIndexRef.current = currentIndex;
    }, [cards, currentIndex]);

    // Logic Refs (Mutable state for events)
    const dragStartRef = useRef(null);
    const dragDeltaRef = useRef({ x: 0, y: 0 });
    const rafIdRef = useRef(null);

    // Render State (For visual feedback)
    const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect', null
    const [isShake, setIsShake] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [optimizedBg, setOptimizedBg] = useState(config.globalBackground || null);

    const audioCtxRef = useRef(null);

    // Initialize Cards
    useEffect(() => {
        let preppedCards = [];

        if (isBatchMode && rawBatch && rawBatch.trim().length > 0) {
            preppedCards = generateBatchCards({
                batch: rawBatch,
                order: effectiveOrder,
                totalCards: effectiveTotalCards,
                isDeterministic: preview
            });
        }

        if (preppedCards.length === 0) {
            preppedCards = (initialCards.length > 0 ? initialCards : [
                { id: 1, text: '2 + 2 = 4', correctSide: 'right' },
                { id: 2, text: 'The sky is green', correctSide: 'left' },
                { id: 3, text: 'Cats are mammals', correctSide: 'right' }
            ]).map((c, i) => ({ ...c, id: c.id || `card-${i}` }));
        }

        setCards(preppedCards);

        // Only reset index if NOT in preview mode. 
        // In preview mode, the previewIndex effect handles the current card.
        if (!preview) {
            setCurrentIndex(0);
        }
        setIsComplete(false);
    }, [isBatchMode, rawBatch, effectiveOrder, effectiveTotalCards, initialCards, preview]);

    // Audio Setup
    useEffect(() => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtxRef.current = new AudioContext();
            }
        } catch (e) {
            console.error('AudioContext creation failed:', e);
        }
        return () => {
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                try {
                    audioCtxRef.current.close();
                } catch (e) {
                    // Ignore close errors
                }
            }
        };
    }, []);

    const playSound = (type) => {
        try {
            if ('vibrate' in navigator) {
                if (type === 'success') {
                    navigator.vibrate([80, 40, 80]);
                } else if (type === 'error') {
                    navigator.vibrate(100);
                }
            }
        } catch (e) {}

        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.linearRampToValueAtTime(1046.50, now + 0.1);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    };

    // Sync with editor preview selection
    useEffect(() => {
        if (preview && typeof config.previewIndex === 'number') {
            setCurrentIndex(config.previewIndex);
        }
    }, [config.previewIndex, preview]);

    // Helper to get client coordinates safely
    const getClientCoordinates = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    // Handle user interaction (mouse/touch)
    const handleStart = (e) => {
        if (isComplete) return; // Prevent interaction if complete

        console.log('SwipeSorter: handleStart', e.type);

        // Prevent default behavior for touch to avoid scrolling
        if (e.type === 'touchstart') {
            // e.preventDefault(); // Note: React synthetic events might warn if passive. 
            // We'll handle this via CSS touch-action: none.
        }

        const { x, y } = getClientCoordinates(e);

        setIsDragging(true);
        dragStartRef.current = { x, y };
        dragDeltaRef.current = { x: 0, y: 0 };
        setDragDelta({ x: 0, y: 0 }); // Reset visual delta
        setFeedback(null); // Reset feedback on new drag
    };

    const handleMove = (e) => {
        if (!isDragging || !dragStartRef.current) return;

        const { x, y } = getClientCoordinates(e);

        const dx = x - dragStartRef.current.x;
        const dy = 0; // Lock vertical movement

        dragDeltaRef.current = { x: dx, y: dy };

        // Batch visual updates with display refresh rate via requestAnimationFrame
        if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(() => {
                setDragDelta({ x: dragDeltaRef.current.x, y: dragDeltaRef.current.y });
                rafIdRef.current = null;
            });
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        console.log('SwipeSorter: handleEnd', dragDeltaRef.current);
        setIsDragging(false);

        const deltaX = dragDeltaRef.current.x;
        const deltaY = dragDeltaRef.current.y;

        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            const side = deltaX > 0 ? 'right' : 'left';
            checkAnswer(side, deltaY);
        } else {
            // Reset position if not swiped enough
            setDragDelta({ x: 0, y: 0 });
            dragDeltaRef.current = { x: 0, y: 0 };
        }
        dragStartRef.current = null;
    };

    const checkAnswer = (side, finalY = 0) => {
        // Use Refs to get latest state inside async/callbacks
        const currentCards = cardsRef.current;
        const currIndex = currentIndexRef.current;
        const currentCard = currentCards[currIndex];

        console.log('SwipeSorter: checkAnswer', side, currentCard);

        if (currentCard.correctSide === side) {
            // Correct!
            playSound('success');
            setFeedback('correct');
            confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.6 }
            });

            // Animate card off screen
            const offScreenX = side === 'right' ? 1000 : -1000;
            // Use current deltaY for smooth exit trajectory
            setDragDelta({ x: offScreenX, y: finalY });

            setTimeout(() => {
                const nextIndex = currIndex + 1;
                if (nextIndex >= currentCards.length) {
                    setIsComplete(true);
                    if (onComplete) onComplete();
                } else {
                    setCurrentIndex(nextIndex);
                    setDragDelta({ x: 0, y: 0 });
                    dragDeltaRef.current = { x: 0, y: 0 };
                    setFeedback(null);
                }
            }, 300);
        } else {
            // Incorrect - Recycle card to bottom of deck
            playSound('error');
            setIsShake(true);
            setFeedback('incorrect');

            setTimeout(() => {
                setIsShake(false);

                // Use latest refs again inside timeout in case of fast updates (though unlikely here)
                const latestCards = cardsRef.current;
                // Note: currentCard is fixed for this interaction turn

                // Check if card has already been recycled
                const retryCount = currentCard.retryCount || 0;

                if (retryCount < 1) {
                    // Recycle card: Add copy to end of deck
                    setCards(prev => [...prev, {
                        ...currentCard,
                        id: `${currentCard.id}-retry-${Date.now()}`,
                        retryCount: retryCount + 1
                    }]);

                    // Advance to next card (game continues)
                    setCurrentIndex(prev => prev + 1);
                    setDragDelta({ x: 0, y: 0 });
                    dragDeltaRef.current = { x: 0, y: 0 };
                    setFeedback(null);
                } else {
                    // Card discarded (no recycle)
                    // Check if this was the last card
                    const nextIndex = currIndex + 1;
                    if (nextIndex >= latestCards.length) {
                        setIsComplete(true);
                        if (onComplete) onComplete();
                    } else {
                        setCurrentIndex(nextIndex);
                        setDragDelta({ x: 0, y: 0 });
                        dragDeltaRef.current = { x: 0, y: 0 };
                        setFeedback(null);
                    }
                }
            }, 500);
        }
    };

    // Window Event Listeners for robust drag handling
    useEffect(() => {
        if (isDragging) {
            const onMove = (e) => handleMove(e);
            const onEnd = (e) => handleEnd(e);

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);

            return () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onEnd);
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
            };
        }
    }, [isDragging]); // Re-bind on drag state change. State deps (cards, currentIndex) are accessed via refs or closure, checkAnswer uses state.

    // ... getCardStyle ...

    const getCardStyle = (index) => {
        if (index === currentIndex) {
            // Hardware-accelerated 3D transform for top dragging card
            return {
                transform: `translate3d(${dragDelta.x}px, ${dragDelta.y}px, 0) rotate(${dragDelta.x * 0.05}deg)`,
                zIndex: 100,
                opacity: 1
            };
        }
        // Stack effect
        const offset = index - currentIndex;
        if (offset > 0 && offset < 2) {
            return {
                transform: `scale(${1 - offset * 0.05}) translate3d(0, ${offset * 10}px, 0)`,
                zIndex: 100 - offset,
                opacity: 1
            };
        }
        return { opacity: 0, pointerEvents: 'none' };
    };

    // Clean up rAF on unmount
    useEffect(() => {
        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isComplete && !preview && onComplete) {
            onComplete();
        }
    }, [isComplete, preview, onComplete]);

    // Optimize background image if it is a large data URL or image source
    useEffect(() => {
        let isCancelled = false;
        const bg = config.globalBackground;
        if (!bg) {
            setOptimizedBg(null);
            return;
        }

        if (typeof bg === 'string' && (bg.length > 150000 || !bg.startsWith('data:image/jpeg'))) {
            optimizeImage(bg, 1080, 1920, 0.82).then((res) => {
                if (!isCancelled && res) {
                    setOptimizedBg(res);
                }
            });
        } else {
            setOptimizedBg(bg);
        }

        return () => {
            isCancelled = true;
        };
    }, [config.globalBackground]);

    const activeBg = optimizedBg || config.globalBackground;

    const cardStyle = (index) => {
        const style = getCardStyle(index);
        if (activeBg) {
            style.backgroundImage = `url(${activeBg})`;
            style.backgroundSize = 'cover';
            style.backgroundPosition = 'center';
        }
        return style;
    };

    if (isComplete && !preview) {
        return null;
    }

    return (
        <div
            className={`swipe-sorter-container ${isDragging ? 'is-dragging' : ''}`}
        >
            {/* Banner Overlays */}
            <div className={`swipe-banner left`} style={{ opacity: isDragging && dragDelta.x < -5 ? Math.min(Math.abs(dragDelta.x) / 15, 1) : 0 }}>
                {leftLabel}
            </div>
            <div className={`swipe-banner right`} style={{ opacity: isDragging && dragDelta.x > 5 ? Math.min(Math.abs(dragDelta.x) / 15, 1) : 0 }}>
                {rightLabel}
            </div>

            <div className="level-indicator">
                {Math.min(currentIndex + 1, cards.length)} / {cards.length}
            </div>

            <div className="swipe-card-stack">
                {cards.slice(currentIndex, currentIndex + 2).map((card, sliceIdx) => {
                    const index = currentIndex + sliceIdx;
                    return (
                        <div
                            key={card.id || index}
                            className={`swipe-card ${index === currentIndex ? (isDragging ? 'dragging' : '') : ''} ${index === currentIndex && isShake ? 'shake flash-red' : ''} ${activeBg ? 'has-global-bg' : ''}`}
                            style={cardStyle(index)}
                            onMouseDown={index === currentIndex ? handleStart : undefined}
                            onTouchStart={index === currentIndex ? handleStart : undefined}
                        >
                            <div className="swipe-card-content">
                                {card.image && (
                                    <img src={card.image} alt="Card" className="swipe-card-image" draggable="false" />
                                )}
                                {card.text && (
                                    <div className="swipe-card-text">{card.text}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SwipeSorter;
