import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './SwipeSorter.css';

const SWIPE_THRESHOLD = 100; // Pixels to trigger a swipe

const SwipeSorter = ({ config = {}, onComplete, preview = false }) => {
    // Config Extraction
    const {
        leftLabel = 'FALSE',
        rightLabel = 'CORRECT',
        cards: initialCards = []
    } = config;

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

    // Render State (For visual feedback)
    const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect', null
    const [isShake, setIsShake] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const audioCtxRef = useRef(null);

    // Initialize Cards
    useEffect(() => {
        // Deep copy to avoid mutating prop
        // Add random ID if not present for keys
        const preppedCards = (initialCards.length > 0 ? initialCards : [
            { id: 1, text: '2 + 2 = 4', correctSide: 'right' },
            { id: 2, text: 'The sky is green', correctSide: 'left' },
            { id: 3, text: 'Cats are mammals', correctSide: 'right' }
        ]).map((c, i) => ({ ...c, id: c.id || `card-${i}` }));

        setCards(preppedCards);

        // Only reset index if NOT in preview mode. 
        // In preview mode, the previewIndex effect handles the current card.
        if (!preview) {
            setCurrentIndex(0);
        }
        setIsComplete(false);
    }, [initialCards, preview]);

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

        // Prevent scrolling on touch move
        if (e.type === 'touchmove') {
            // e.preventDefault(); // Handled by CSS
        }

        const { x, y } = getClientCoordinates(e);

        const dx = x - dragStartRef.current.x;
        const dy = 0; // Lock vertical movement

        dragDeltaRef.current = { x: dx, y: dy };
        setDragDelta({ x: dx, y: dy }); // Update visual state
    };

    const handleEnd = () => {
        if (!isDragging) return;
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
            // Use dragDelta state for rendering
            return {
                transform: `translate(${dragDelta.x}px, ${dragDelta.y}px) rotate(${dragDelta.x * 0.05}deg)`,
                zIndex: 100,
                opacity: 1
            };
        }
        // Stack effect
        const offset = index - currentIndex;
        if (offset > 0 && offset < 2) {
            return {
                transform: `scale(${1 - offset * 0.05}) translateY(${offset * 10}px)`,
                zIndex: 100 - offset,
                opacity: 1
            };
        }
        return { opacity: 0, pointerEvents: 'none' };
    };

    // ... rest of UseEffects ...

    useEffect(() => {
        if (isComplete && !preview && onComplete) {
            onComplete();
        }
    }, [isComplete, preview, onComplete]);

    useEffect(() => {
        if (config.globalBackground && audioCtxRef.current) {
            // Preload? No.
        }
    }, [config]);

    const cardStyle = (index) => {
        const style = getCardStyle(index);
        if (config.globalBackground) {
            style.backgroundImage = `url(${config.globalBackground})`;
            style.backgroundSize = 'cover';
            style.backgroundPosition = 'center';
        }
        return style;
    }

    // Start Screen state
    const [hasStarted, setHasStarted] = useState(preview);

    useEffect(() => {
        if (preview) {
            setHasStarted(true);
        }
    }, [preview]);

    if (!hasStarted) {
        return (
            <div className="swipe-sorter-container" style={{ flexDirection: 'column', gap: '20px' }}>
                <button
                    onClick={() => setHasStarted(true)}
                    style={{
                        padding: '15px 40px',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        backgroundColor: '#2ed573',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50px',
                        boxShadow: '0 5px 15px rgba(46, 213, 115, 0.4)',
                        cursor: 'pointer',
                        animation: 'pulse 1.5s infinite'
                    }}
                >
                    CHALLENGE
                </button>
                <style>
                    {`
                        @keyframes pulse {
                            0% { transform: scale(1); }
                            50% { transform: scale(1.05); }
                            100% { transform: scale(1); }
                        }
                    `}
                </style>
            </div>
        );
    }

    if (isComplete && !preview) {
        return null;
    }

    return (
        <div
            className="swipe-sorter-container"
        // Container handlers removed - using Window listeners
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
                {cards.map((card, index) => (
                    <div
                        key={card.id || index}
                        className={`swipe-card ${index === currentIndex ? (isDragging ? 'dragging' : '') : ''} ${index === currentIndex && isShake ? 'shake flash-red' : ''}`}
                        style={cardStyle(index)}
                        onMouseDown={index === currentIndex ? handleStart : undefined}
                        onTouchStart={index === currentIndex ? handleStart : undefined}
                    >
                        <div className="swipe-card-content" style={config.globalBackground ? { background: 'rgba(255,255,255,0.7)', borderRadius: '16px', padding: '10px' } : {}}>
                            {card.image && (
                                <img src={card.image} alt="Card" className="swipe-card-image" draggable="false" />
                            )}
                            {card.text && (
                                <div className="swipe-card-text">{card.text}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SwipeSorter;
