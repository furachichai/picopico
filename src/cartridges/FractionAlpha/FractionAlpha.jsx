import React, { useState, useEffect } from 'react';
import { Plus, Minus, ThumbsUp } from 'lucide-react';
import './FractionAlpha.css';
import confetti from 'canvas-confetti';

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
        let paths = [];

        if (denominator === 1) {
            return (
                <circle
                    cx={center} cy={center} r={radius}
                    fill={selectedSlices.includes(0) ? "#FACC15" : "#E2E8F0"}
                    stroke="#334155" strokeWidth="2"
                    onClick={() => handleSliceClick(0)}
                    className={config.mode === 'serve' && !preview ? 'slice-interactive' : ''}
                />
            );
        }

        for (let i = 0; i < denominator; i++) {
            const startAngle = (i * 360) / denominator;
            const endAngle = ((i + 1) * 360) / denominator;

            // Convert polar to cartesian
            const x1 = center + radius * Math.cos(Math.PI * startAngle / 180);
            const y1 = center + radius * Math.sin(Math.PI * startAngle / 180);
            const x2 = center + radius * Math.cos(Math.PI * endAngle / 180);
            const y2 = center + radius * Math.sin(Math.PI * endAngle / 180);

            // SVG Path command
            const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

            const isSelected = selectedSlices.includes(i);

            // Serve Animation: Move out from center
            let transform = 'scale(1)';
            if (isSelected) {
                if (config.mode === 'serve') {
                    const midAngle = (startAngle + endAngle) / 2;
                    const rad = Math.PI * midAngle / 180;
                    const offset = 10; // 10px pop out
                    const tx = offset * Math.cos(rad);
                    const ty = offset * Math.sin(rad);
                    transform = `translate(${tx}px, ${ty}px)`;
                } else {
                    transform = 'scale(1.05)'; // Default highlight for fracture or others
                }
            }

            paths.push(
                <path
                    key={i}
                    d={d}
                    fill={isSelected ? "#FACC15" : "#E2E8F0"}
                    stroke="#334155"
                    strokeWidth="2"
                    onClick={() => handleSliceClick(i)}
                    className={`slice ${isSelected ? 'selected' : ''} ${config.mode === 'serve' && !preview ? 'interactive' : ''}`}
                    style={{
                        transformOrigin: `${center}px ${center}px`,
                        transform: transform
                    }}
                />
            );
        }
        return paths;
    };

    const renderRect = () => {
        const width = 240; // 20% wider than 200
        const height = 100;
        const sliceWidth = width / denominator;
        let rects = [];

        for (let i = 0; i < denominator; i++) {
            const isSelected = selectedSlices.includes(i);

            // Serve Animation: Move UP
            let transform = 'translate(0, 0)';
            if (isSelected) {
                if (config.mode === 'serve') {
                    transform = 'translate(0, -10px)';
                } else {
                    // Slight scale or just fill color is enough? 
                    // Let's stick to fill color for fracture, maybe slight scale?
                    // Rect scale is tricky without affecting layout, so color is safest + maybe shadow?
                }
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
                        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                />
            );
        }
        return rects;
    };

    return (
        <div className={`fraction-alpha-container ${preview ? 'preview-mode' : ''}`}>

            {/* Level Indicator (Optional) */}
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 'bold' }}>
                Level {level}/5
            </div>

            {/* Goal Display */}
            <div className="goal-card">
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
            <div className="game-visual">
                <svg
                    viewBox={config.shape === 'rect' ? "0 0 240 200" : "0 0 200 200"}
                    className={`pie-svg ${config.shape === 'rect' ? 'rect-mode' : ''}`}
                >
                    {config.shape === 'rect' ? renderRect() : renderPie()}
                </svg>
            </div>

            {/* Controls */}
            <div className="controls-area">
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
            <button className={`ready-btn ${feedback}`} onClick={checkResult} disabled={preview}>
                {feedback === 'correct' ? <ThumbsUp /> : 'READY!'}
            </button>
        </div>
    );
};

export default FractionAlpha;
