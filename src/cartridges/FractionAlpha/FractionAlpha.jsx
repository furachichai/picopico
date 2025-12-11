import React, { useState, useEffect } from 'react';
import { Plus, Minus, ThumbsUp } from 'lucide-react';
import './FractionAlpha.css';
// import confetti from 'canvas-confetti';
import pizzaBox from '../../assets/pizza_box.png';
import kitchenCounter from '../../assets/kitchen_counter.png';

const FractionAlpha = ({ config = {}, onComplete, preview = false }) => {
    // Config mainly sets the "Theme" or "Starting Point" now, but logic handles 5 levels
    // We'll trust config for the *first* level if provided, otherwise random.

    // Sanitize config to prevent crashes on null/undefined
    const cfg = config || {};

    const [level, setLevel] = useState(1);
    const [denominator, setDenominator] = useState(cfg.initialDenominator || 1);
    const [numerator, setNumerator] = useState(0);
    const [selectedSlices, setSelectedSlices] = useState([]);
    const [isComplete, setIsComplete] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Level State Goals
    const [currentGoal, setCurrentGoal] = useState({
        denom: cfg.targetDenominator || 3,
        num: cfg.targetNumerator || 1
    });

    // Reset when config changes (new game instance)
    useEffect(() => {
        const safeCfg = config || {};
        setLevel(1);
        setDenominator(safeCfg.initialDenominator || 1);
        setNumerator(0);
        setSelectedSlices([]);
        setIsComplete(false);
        setFeedback(null);
        setCurrentGoal({
            denom: safeCfg.targetDenominator || 3,
            num: safeCfg.targetNumerator || 1
        });
    }, [config]);

    const [animating, setAnimating] = useState(false);

    // Trigger animation on denominator change (ALL MODES)
    useEffect(() => {
        // if (cfg.mode !== 'serve') { <--- REMOVED check, allow for all modes
        setAnimating(true);
        const timer = setTimeout(() => setAnimating(false), 300);
        return () => clearTimeout(timer);
        // }
    }, [denominator, cfg.mode]);

    // Simple Synth for "Chop" sound
    const playChopSound = () => {
        if (preview) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    const handleIncrement = () => {
        if (preview) return;
        if (denominator < 10) {
            setDenominator(prev => prev + 1);
            playChopSound();
        }
        setSelectedSlices([]);
    };

    const handleDecrement = () => {
        if (preview) return;
        if (denominator > 1) {
            setDenominator(prev => prev - 1);
            // playChopSound(); // Maybe optional for remove?
        }
        setSelectedSlices([]);
    };

    const handleSliceClick = (index) => {
        if (preview) return;
        if (cfg.mode !== 'serve') return;

        const isSelected = selectedSlices.includes(index);
        let newSelected;
        if (isSelected) {
            newSelected = selectedSlices.filter(i => i !== index);
        } else {
            newSelected = [...selectedSlices, index];
        }
        setSelectedSlices(newSelected);
        // Only update logic-related numerator if in Serve mode?
        // Fracture mode logic relies on DENOMINATOR matching goal. Numerator is irrelevant for win condition in fracture mode.
        // So safe to update numerator state even if unused.
        setNumerator(newSelected.length);
    };

    const generateNextLevel = () => {
        // Simple logic: increase complexity or random
        let nextDenom = Math.floor(Math.random() * 8) + 2; // 2 to 9
        // Avoid same goal?
        if (nextDenom === currentGoal.denom) nextDenom = nextDenom === 9 ? 2 : nextDenom + 1;

        let nextNum = 1;
        if (config.mode === 'serve') {
            nextNum = Math.floor(Math.random() * (nextDenom - 1)) + 1;
        }

        setCurrentGoal({ denom: nextDenom, num: nextNum });
        setDenominator(1); // Reset user's pie
        setNumerator(0);
        setSelectedSlices([]);
        setFeedback(null);
    };

    const checkResult = () => {
        if (preview) return;

        const isCorrect = cfg.mode === 'fracture'
            ? denominator === currentGoal.denom
            : (denominator === currentGoal.denom && numerator === currentGoal.num);

        if (isCorrect) {
            setFeedback('correct');
            // Confetti removed for debugging/stability
            /*
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            */

            setTimeout(() => {
                if (level < 5) {
                    setLevel(l => l + 1);
                    generateNextLevel();
                } else {
                    setIsComplete(true);
                    if (onComplete) onComplete();
                }
            }, 1500);
        } else {
            setFeedback('incorrect');
            setTimeout(() => setFeedback(null), 1000);
        }
    };

    // Helper to generate SVG content for flavors
    const getPizzaPatternContent = (flavor) => {
        // Base Cheese Color
        const cheeseBase = <rect width="200" height="200" fill="#FDB813" />; // Golden Yellow
        const cheeseDetail = (
            <g opacity="0.4">
                <circle cx="50" cy="80" r="5" fill="#F79F1F" />
                <circle cx="150" cy="120" r="8" fill="#F79F1F" />
                <circle cx="100" cy="40" r="4" fill="#F79F1F" />
                <circle cx="120" cy="160" r="6" fill="#F79F1F" />
            </g>
        );

        let toppings = null;

        switch (flavor) {
            case 'pepperoni':
                toppings = (
                    <g fill="#D63031" opacity="0.9">
                        <circle cx="60" cy="60" r="12" />
                        <circle cx="140" cy="50" r="12" />
                        <circle cx="100" cy="100" r="12" />
                        <circle cx="50" cy="140" r="12" />
                        <circle cx="150" cy="150" r="12" />
                    </g>
                );
                break;
            case 'veggie':
                toppings = (
                    <g stroke="#009432" strokeWidth="4" fill="none" strokeLinecap="round">
                        <path d="M 40 60 Q 60 40 80 60" />
                        <path d="M 120 40 Q 140 60 160 40" />
                        <path d="M 50 120 Q 70 140 90 120" />
                        <path d="M 130 140 Q 150 120 170 140" />
                        {/* Onions (White) */}
                        <g stroke="#FFF" opacity="0.7">
                            <path d="M 90 80 Q 100 60 110 80" />
                            <path d="M 100 130 Q 110 150 120 130" />
                        </g>
                    </g>
                );
                break;
            case 'mushroom':
                toppings = (
                    <g fill="#A0987D">
                        <path d="M 60 70 A 10 10 0 0 1 80 70 L 75 70 L 75 80 L 65 80 L 65 70 Z" />
                        <path d="M 130 50 A 10 10 0 0 1 150 50 L 145 50 L 145 60 L 135 60 L 135 50 Z" />
                        <path d="M 90 110 A 10 10 0 0 1 110 110 L 105 110 L 105 120 L 95 120 L 95 110 Z" />
                        <path d="M 50 130 A 10 10 0 0 1 70 130 L 65 130 L 65 140 L 55 140 L 55 130 Z" />
                        <path d="M 140 130 A 10 10 0 0 1 160 130 L 155 130 L 155 140 L 145 140 L 145 130 Z" />
                    </g>
                );
                break;
            case 'hawaiian':
                toppings = (
                    <g>
                        {/* Ham (Pink Squares) */}
                        <g fill="#FAB1A0">
                            <rect x="50" y="50" width="15" height="15" rx="2" />
                            <rect x="130" y="80" width="15" height="15" rx="2" />
                            <rect x="70" y="140" width="15" height="15" rx="2" />
                        </g>
                        {/* Pineapple (Yellow Chunks) */}
                        <g fill="#FFEAA7">
                            <circle cx="100" cy="100" r="8" />
                            <circle cx="150" cy="50" r="8" />
                            <circle cx="50" cy="110" r="8" />
                            <circle cx="120" cy="150" r="8" />
                        </g>
                    </g>
                );
                break;
            default: // Cheese only
                break;
        }

        return (
            <>
                {cheeseBase}
                {cheeseDetail}
                {toppings}
                {/* Crust Effect (Edge) */}
                <circle cx="100" cy="100" r="96" fill="none" stroke="#E67E22" strokeWidth="6" opacity="0.6" />
            </>
        );
    };

    // Helper to generate SVG paths for slices
    const renderPie = () => {
        const center = 100;
        const radius = 90;
        let elements = [];

        const flavor = cfg.flavor || 'cheese';

        // NOTE: No longer mapping to images. Using getPizzaPatternContent

        if (denominator === 1) {
            // ...
            const isSelected = selectedSlices.includes(0);
            let transform = 'scale(1)';
            if (cfg.mode === 'serve' && isSelected) {
                transform = 'scale(0.95)';
            } else if (animating) {
                transform = 'scale(1.02)';
            }

            // Opacity Logic
            let opacity = 1.0;
            if (cfg.mode === 'serve' && !isSelected) {
                opacity = 0.6;
            }

            const patternId = `pat-${flavor}-0-whole`;

            elements.push(
                <defs key="defs-0">
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="200" height="200" patternTransform={transform}>
                        {getPizzaPatternContent(flavor)}
                    </pattern>
                </defs>
            );

            elements.push(
                <circle
                    key="slice-0"
                    cx={center} cy={center} r={radius}
                    fill={`url(#${patternId})`}
                    stroke={isSelected ? "#FACC15" : "#B33939"} // Darker red/brown stroke for vector
                    strokeWidth={isSelected ? "4" : "2"}
                    onClick={() => handleSliceClick(0)}
                    className={`slice ${isSelected ? 'selected' : ''} ${cfg.mode === 'serve' ? 'interactive' : ''}`}
                    style={{
                        transform,
                        transformOrigin: 'center',
                        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
                        opacity: opacity
                    }}
                />
            );
            return elements;
        }

        for (let i = 0; i < denominator; i++) {
            const startAngle = (i * 360) / denominator;
            const endAngle = ((i + 1) * 360) / denominator;

            const x1 = center + radius * Math.cos(Math.PI * startAngle / 180);
            const y1 = center + radius * Math.sin(Math.PI * startAngle / 180);
            const x2 = center + radius * Math.cos(Math.PI * endAngle / 180);
            const y2 = center + radius * Math.sin(Math.PI * endAngle / 180);

            const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

            const isSelected = selectedSlices.includes(i);

            let transform = 'scale(1)';
            if (cfg.mode === 'serve' && isSelected) {
                const midAngle = (startAngle + endAngle) / 2;
                const rad = Math.PI * midAngle / 180;
                const offset = 10;
                const tx = offset * Math.cos(rad);
                const ty = offset * Math.sin(rad);
                transform = `translate(${tx}px, ${ty}px)`;
            } else if (animating) {
                const midAngle = (startAngle + endAngle) / 2;
                const rad = Math.PI * midAngle / 180;
                const offset = 4;
                const tx = offset * Math.cos(rad);
                const ty = offset * Math.sin(rad);
                transform = `translate(${tx}px, ${ty}px)`;
            }

            // Opacity Logic
            let opacity = 1.0;
            if (cfg.mode === 'serve' && !isSelected) {
                opacity = 0.6;
            }

            // Define unique pattern for this slice to lock texture to slice movement
            const patternId = `pat-${flavor}-${i}`;
            // NOTE: patternTransform must match the element transform for the texture to "stick"

            elements.push(
                <defs key={`defs-${i}`}>
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="200" height="200" patternTransform={transform}>
                        {getPizzaPatternContent(flavor)}
                    </pattern>
                </defs>
            );

            elements.push(
                <path
                    key={`slice-${i}`}
                    d={d}
                    fill={`url(#${patternId})`}
                    stroke={isSelected ? "#FACC15" : "#B33939"} // Darker red/brown stroke
                    strokeWidth={isSelected ? "4" : "2"}
                    onClick={() => handleSliceClick(i)}
                    className={`slice ${isSelected ? 'selected' : ''} ${cfg.mode === 'serve' ? 'interactive' : ''}`}
                    style={{
                        transformOrigin: `${center}px ${center}px`,
                        transform: transform,
                        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
                        opacity: opacity
                    }}
                />
            );
        }
        return elements;
    };

    const renderRect = () => {
        const width = 240; // 20% wider than 200
        const height = 100;
        const sliceWidth = width / denominator;
        let rects = [];

        for (let i = 0; i < denominator; i++) {
            const isSelected = selectedSlices.includes(i);

            // Animation Logic
            let transform = 'translate(0, 0)';
            if (cfg.mode === 'serve' && isSelected) {
                // Serve Selection: Move UP 10px
                transform = 'translate(0, -10px)';
            } else if (animating) {
                // Fracture Transient: Move UP 4px
                transform = 'translate(0, -4px)';
            }

            // Opacity Logic
            let opacity = 1.0;
            if (cfg.mode === 'serve' && !isSelected) {
                opacity = 0.6;
            }

            rects.push(
                <rect
                    key={i}
                    x={i * sliceWidth}
                    y={50} // Centered vertically in 200x200 box? Box is 200x200 viewbox.
                    // Let's place it around y=50 to y=150 (height 100)
                    width={sliceWidth}
                    height={height}
                    fill={isSelected ? "#FACC15" : "#E2E8F0"}
                    stroke="#334155"
                    strokeWidth="2"
                    onClick={() => handleSliceClick(i)}
                    className={`slice ${isSelected ? 'selected' : ''} ${cfg.mode === 'serve' && !preview ? 'interactive' : ''}`}
                    style={{
                        transform: transform,
                        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
                        opacity: opacity
                    }}
                />
            );
        }
        return rects;
    };

    return (
        <div className={`fraction-alpha-container ${preview ? 'preview-mode' : ''}`} style={{ position: 'relative' }}>

            {/* Backgrounds */}
            {cfg.mode === 'fracture' && cfg.shape !== 'rect' && (
                <img
                    src={pizzaBox}
                    alt="Pizza Box"
                    className="pizza-box-bg"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '600px',
                        height: 'auto',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        zIndex: 0,
                        pointerEvents: 'none'
                    }}
                />
            )}
            {cfg.mode === 'serve' && (
                <img
                    src={kitchenCounter}
                    alt="Kitchen Counter"
                    className="kitchen-bg"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 0,
                        pointerEvents: 'none',
                        opacity: 0.8 // Soft feel
                    }}
                />
            )}

            {/* Level Indicator (Optional) */}
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                Level {level}/5
            </div>

            {/* Goal Display */}
            <div className="goal-card" style={{ position: 'relative', zIndex: 1 }}>
                {cfg.mode === 'fracture' && (
                    <span className="goal-text">{currentGoal.denom}</span>
                )}
                {cfg.mode === 'serve' && (
                    <div className="fraction-goal">
                        <span className="numerator">{currentGoal.num}</span>
                        <span className="divider"></span>
                        <span className="denominator">{currentGoal.denom}</span>
                    </div>
                )}
            </div>

            {/* Game Area (Pie or Rect) */}
            <div className={`game-visual ${cfg.mode === 'fracture' && cfg.shape !== 'rect' ? 'in-box' : ''}`} style={{ position: 'relative', zIndex: 10, marginTop: '40px' }}>
                {/* Added zIndex: 10 to ensure it's well above background (zIndex: 0) */}
                <svg
                    viewBox={cfg.shape === 'rect' ? "0 0 240 200" : "0 0 200 200"}
                    className={`pie-svg ${cfg.shape === 'rect' ? 'rect-mode' : ''}`}
                    style={{ overflow: 'visible', cursor: cfg.mode === 'serve' ? 'pointer' : 'default' }}
                >
                    {/* Defs removed - switched to inline vector rendering */}
                    {cfg.shape === 'rect' ? renderRect() : renderPie()}
                </svg>
            </div>

            {/* Controls */}
            <div className="controls-area" style={{ position: 'relative', zIndex: 10 }}>
                <button
                    className="ctrl-btn"
                    onClick={handleDecrement}
                    disabled={preview || denominator <= 1}
                >
                    <Minus size={32} />
                </button>
                <div className="current-val-display">
                    {denominator}
                </div>
                <button
                    className="ctrl-btn"
                    onClick={handleIncrement}
                    disabled={preview || denominator >= 10}
                >
                    <Plus size={32} />
                </button>
            </div>

            {/* Ready Button */}
            <button className={`ready-btn ${feedback}`} onClick={checkResult} disabled={preview} style={{ position: 'relative', zIndex: 1 }}>
                {feedback === 'correct' ? <ThumbsUp /> : 'READY!'}
            </button>
        </div>
    );
};

export default FractionAlpha;
