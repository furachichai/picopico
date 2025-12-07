import React, { useState, useEffect } from 'react';
import { Plus, Minus, ThumbsUp } from 'lucide-react';
import './FractionAlpha.css';
import confetti from 'canvas-confetti';
import pizzaCheese from '../../assets/pizza_flavors/pizza_cheese.png';
import pizzaPepperoni from '../../assets/pizza_flavors/pizza_pepperoni.png';
import pizzaVeggie from '../../assets/pizza_flavors/pizza_veggie.png';
import pizzaMushroom from '../../assets/pizza_flavors/pizza_mushroom.png';
import pizzaHawaiian from '../../assets/pizza_flavors/pizza_hawaiian.png';
import pizzaBox from '../../assets/pizza_box.png';
import kitchenCounter from '../../assets/kitchen_counter.png';

const FractionAlpha = ({ config, onComplete, preview = false }) => {
    // Config mainly sets the "Theme" or "Starting Point" now, but logic handles 5 levels
    // We'll trust config for the *first* level if provided, otherwise random.

    const [level, setLevel] = useState(1);
    const [denominator, setDenominator] = useState(config?.initialDenominator || 1);
    const [numerator, setNumerator] = useState(0);
    const [selectedSlices, setSelectedSlices] = useState([]);
    const [isComplete, setIsComplete] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Level State Goals
    const [currentGoal, setCurrentGoal] = useState({
        denom: config?.targetDenominator || 3,
        num: config?.targetNumerator || 1
    });

    // Reset when config changes (new game instance)
    useEffect(() => {
        setLevel(1);
        setDenominator(config?.initialDenominator || 1);
        setNumerator(0);
        setSelectedSlices([]);
        setIsComplete(false);
        setFeedback(null);
        setCurrentGoal({
            denom: config?.targetDenominator || 3,
            num: config?.targetNumerator || 1
        });
    }, [config]);

    const [animating, setAnimating] = useState(false);

    // Trigger animation on denominator change (ALL MODES)
    useEffect(() => {
        // if (config.mode !== 'serve') { <--- REMOVED check, allow for all modes
        setAnimating(true);
        const timer = setTimeout(() => setAnimating(false), 300);
        return () => clearTimeout(timer);
        // }
    }, [denominator, config.mode]);

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
        if (config.mode !== 'serve') return;

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

        const isCorrect = config.mode === 'fracture'
            ? denominator === currentGoal.denom
            : (denominator === currentGoal.denom && numerator === currentGoal.num);

        if (isCorrect) {
            setFeedback('correct');
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

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

    // Helper to generate SVG paths for slices
    const renderPie = () => {
        const center = 100;
        const radius = 90;
        let elements = [];

        const flavor = config?.flavor || 'cheese';

        // Map flavor to image source
        const flavorImages = {
            cheese: pizzaCheese,
            pepperoni: pizzaPepperoni,
            veggie: pizzaVeggie,
            mushroom: pizzaMushroom,
            hawaiian: pizzaHawaiian
        };
        const currentImage = flavorImages[flavor];

        if (denominator === 1) {
            const isSelected = selectedSlices.includes(0);
            let transform = 'scale(1)';
            if (config.mode === 'serve' && isSelected) {
                transform = 'scale(0.95)';
            } else if (animating) {
                transform = 'scale(1.02)';
            }

            // Opacity Logic
            let opacity = 1.0;
            if (config.mode === 'serve' && !isSelected) {
                opacity = 0.6;
            }

            const patternId = `pat-${flavor}-0-whole`;

            elements.push(
                <defs key="defs-0">
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="200" height="200" patternTransform={transform}>
                        <image href={currentImage} x="0" y="0" width="200" height="200" />
                    </pattern>
                </defs>
            );

            elements.push(
                <circle
                    key="slice-0"
                    cx={center} cy={center} r={radius}
                    fill={`url(#${patternId})`}
                    stroke={isSelected ? "#FACC15" : "#334155"}
                    strokeWidth={isSelected ? "4" : "2"}
                    onClick={() => handleSliceClick(0)}
                    className={`slice ${isSelected ? 'selected' : ''} ${config.mode === 'serve' ? 'interactive' : ''}`}
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
            if (config.mode === 'serve' && isSelected) {
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
            if (config.mode === 'serve' && !isSelected) {
                opacity = 0.6;
            }

            // Define unique pattern for this slice to lock texture to slice movement
            const patternId = `pat-${flavor}-${i}`;
            // NOTE: patternTransform must match the element transform for the texture to "stick"

            elements.push(
                <defs key={`defs-${i}`}>
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="200" height="200" patternTransform={transform}>
                        <image href={currentImage} x="0" y="0" width="200" height="200" />
                    </pattern>
                </defs>
            );

            elements.push(
                <path
                    key={`slice-${i}`}
                    d={d}
                    fill={`url(#${patternId})`}
                    stroke={isSelected ? "#FACC15" : "#334155"}
                    strokeWidth={isSelected ? "4" : "2"}
                    onClick={() => handleSliceClick(i)}
                    className={`slice ${isSelected ? 'selected' : ''} ${config.mode === 'serve' ? 'interactive' : ''}`}
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
            if (config.mode === 'serve' && isSelected) {
                // Serve Selection: Move UP 10px
                transform = 'translate(0, -10px)';
            } else if (animating) {
                // Fracture Transient: Move UP 4px
                transform = 'translate(0, -4px)';
            }

            // Opacity Logic
            let opacity = 1.0;
            if (config.mode === 'serve' && !isSelected) {
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
                    className={`slice ${isSelected ? 'selected' : ''} ${config.mode === 'serve' && !preview ? 'interactive' : ''}`}
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
            {config.mode === 'fracture' && config.shape !== 'rect' && (
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
            {config.mode === 'serve' && (
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
                {config.mode === 'fracture' && (
                    <span className="goal-text">{currentGoal.denom}</span>
                )}
                {config.mode === 'serve' && (
                    <div className="fraction-goal">
                        <span className="numerator">{currentGoal.num}</span>
                        <span className="divider"></span>
                        <span className="denominator">{currentGoal.denom}</span>
                    </div>
                )}
            </div>

            {/* Game Area (Pie or Rect) */}
            <div className={`game-visual ${config.mode === 'fracture' && config.shape !== 'rect' ? 'in-box' : ''}`} style={{ position: 'relative', zIndex: 10, marginTop: '40px' }}>
                {/* Added zIndex: 10 to ensure it's well above background (zIndex: 0) */}
                <svg
                    viewBox={config.shape === 'rect' ? "0 0 240 200" : "0 0 200 200"}
                    className={`pie-svg ${config.shape === 'rect' ? 'rect-mode' : ''}`}
                    style={{ overflow: 'visible', cursor: config.mode === 'serve' ? 'pointer' : 'default' }}
                >
                    <defs>
                        <pattern id="pattern-cheese" patternUnits="objectBoundingBox" width="1" height="1">
                            <image href={pizzaCheese} x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid slice" />
                        </pattern>
                        <pattern id="pattern-pepperoni" patternUnits="objectBoundingBox" width="1" height="1">
                            <image href={pizzaPepperoni} x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid slice" />
                        </pattern>
                        <pattern id="pattern-veggie" patternUnits="objectBoundingBox" width="1" height="1">
                            <image href={pizzaVeggie} x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid slice" />
                        </pattern>
                        <pattern id="pattern-mushroom" patternUnits="objectBoundingBox" width="1" height="1">
                            <image href={pizzaMushroom} x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid slice" />
                        </pattern>
                        <pattern id="pattern-hawaiian" patternUnits="objectBoundingBox" width="1" height="1">
                            <image href={pizzaHawaiian} x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid slice" />
                        </pattern>
                    </defs>
                    {config.shape === 'rect' ? renderRect() : renderPie()}
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
