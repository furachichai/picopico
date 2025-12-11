import React, { useState, useEffect, useRef } from 'react';
import { Apple, Banana, Cherry, Citrus, Grape } from 'lucide-react';
// import confetti from 'canvas-confetti';
import './FractionSlicer.css';

const THEMES = [
    { name: 'Classic', color: '#00b894', pattern: 'none' },
    { name: 'Wood', color: '#e67e22', pattern: 'repeating-linear-gradient(45deg, #d35400 0, #d35400 10px, #e67e22 10px, #e67e22 20px)' },
    { name: 'Water', color: '#0984e3', pattern: 'radial-gradient(circle at 50% 50%, #74b9ff 10%, transparent 10%), radial-gradient(circle at 0% 0%, #74b9ff 10%, transparent 10%)' },
    { name: 'Space', color: '#6c5ce7', pattern: 'radial-gradient(white 1%, transparent 1%)', bgSize: '20px 20px' },
    { name: 'Candy', color: '#fd79a8', pattern: 'repeating-linear-gradient(90deg, #e84393 0, #e84393 20px, #fd79a8 20px, #fd79a8 40px)' },
    { name: 'Zebra', color: '#34495e', pattern: 'repeating-linear-gradient(45deg, #2c3e50 0, #2c3e50 20px, #34495e 20px, #34495e 40px)' },
    { name: 'Lime', color: '#badc58', pattern: 'radial-gradient(circle, #6ab04c 20%, transparent 20%)', bgSize: '30px 30px' }
];

// Internal Component for Background Ambience - Static Pattern
const BackgroundFruits = () => {
    const [fruits, setFruits] = useState([]);

    useEffect(() => {
        const icons = [Apple, Banana, Cherry, Citrus, Grape];
        const newFruits = [];
        const rows = 6;
        const cols = 6;

        // Grid Layout (Wallpaper)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const Icon = icons[(r + c) % icons.length]; // Deterministic pattern
                // Offset every other row
                const xOffset = (r % 2 === 0) ? 0 : 50;
                const left = (c * 20) + (xOffset / cols);

                newFruits.push({
                    id: `${r}-${c}`,
                    Icon,
                    left: `${(c * 20) + (r % 2 ? 10 : 0)}%`, // Staggered grid
                    top: `${r * 20}%`,
                    size: 48, // Larger icons
                    rotation: (c + r) * 15, // Fixed pattern rotation
                    color: '#8b4513'
                });
            }
        }
        setFruits(newFruits);
    }, []);

    return (
        <div className="bg-fruits-container">
            {fruits.map(f => (
                <div
                    key={f.id}
                    className="floating-fruit"
                    style={{
                        left: f.left,
                        top: f.top,
                        width: f.size,
                        height: f.size,
                        transform: `rotate(${f.rotation}deg)`,
                        opacity: 0.12 // Slight tweak
                    }}
                >
                    <f.Icon size={f.size} color={f.color} strokeWidth={2} />
                </div>
            ))}
        </div>
    );
};

const FractionSlicer = ({ config = {}, onComplete, preview = false }) => {
    // Config Sanitization
    const cfg = config || {};
    const DIFF_SETTINGS = {
        easy: 0.25,
        normal: 0.20,
        hard: 0.10
    };
    const difficulty = cfg.difficulty || 'normal';
    const TOLERANCE = cfg.tolerance || DIFF_SETTINGS[difficulty] || 0.20;
    const TOTAL_LEVELS = cfg.levels || 5;

    const [level, setLevel] = useState(1);
    const [goal, setGoal] = useState({ num: 1, denom: 2 });
    const [isSlicing, setIsSlicing] = useState(false);
    const [sliceStart, setSliceStart] = useState(null);
    const [sliceEnd, setSliceEnd] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [lastRatio, setLastRatio] = useState(null);
    const [isComplete, setIsComplete] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [showSolution, setShowSolution] = useState(false);
    const [showVisualization, setShowVisualization] = useState(false);
    const [vizSide, setVizSide] = useState('left');
    const [driftRatio, setDriftRatio] = useState(null);
    const [orientation, setOrientation] = useState('horizontal');

    // Visual Variety State
    const [themeIndex, setThemeIndex] = useState(0);
    const [rectOffset, setRectOffset] = useState({ x: 0, y: 0 });

    const [trail, setTrail] = useState([]);
    const [isShaking, setIsShaking] = useState(false);
    const [debugMsg, setDebugMsg] = useState('');

    const containerRef = useRef(null);
    const rectRef = useRef(null);

    // Audio Context for Sound Effects
    const playThud = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(100, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.error(e);
        }
    };

    // Initialize Level
    useEffect(() => {
        generateLevel(1);
    }, [cfg.levels, cfg.tolerance, cfg.difficulty]);

    const generateLevel = (lvl) => {
        // Random fraction
        const options = [
            { num: 1, denom: 2 },
            { num: 1, denom: 3 },
            { num: 1, denom: 4 },
            { num: 2, denom: 3 },
            { num: 3, denom: 4 },
            { num: 2, denom: 5 },
            { num: 1, denom: 5 }
        ];
        const nextGoal = options[Math.floor(Math.random() * options.length)];
        setGoal(nextGoal);
        setFeedback(null);
        setLastRatio(null);
        setSliceStart(null);
        setSliceEnd(null);
        setTrail([]);
        setIsSlicing(false);
        setIsShaking(false);
        setAttempts(0);
        setShowSolution(false);
        setShowVisualization(false);
        setVizSide('left');
        setDriftRatio(null);
        // Vertical on even levels
        setOrientation(lvl % 2 === 0 ? 'vertical' : 'horizontal');

        // Randomized Visuals
        setThemeIndex(Math.floor(Math.random() * THEMES.length));
        // Random offset: +/- 3% (approx 15px) - Subtle shift only
        setRectOffset({
            x: -15 + Math.random() * 30,
            y: -10 + Math.random() * 20
        });
    };

    // Input Handlers
    const getPoint = (e) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const scaleX = rect.width / containerRef.current.offsetWidth;
        const scaleY = rect.height / containerRef.current.offsetHeight;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / scaleX,
            y: (clientY - rect.top) / scaleY
        };
    };

    const handleStart = (e) => {
        if (preview || feedback === 'correct' || isComplete) return;
        setIsSlicing(true);
        const p = getPoint(e);
        setSliceStart(p);
        setSliceEnd(p);
        setTrail([p]);
    };

    const handleMove = (e) => {
        if (!isSlicing) return;
        const p = getPoint(e);
        setSliceEnd(p);
        setTrail(prev => [...prev, p]);
    };

    const handleEnd = () => {
        if (!isSlicing) return;
        setIsSlicing(false);

        if (sliceStart && sliceEnd) {
            const dx = sliceEnd.x - sliceStart.x;
            const dy = sliceEnd.y - sliceStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 20) {
                checkSlice(sliceStart, sliceEnd);
            } else {
                setSliceStart(null);
                setSliceEnd(null);
                setTrail([]);
            }
        }
        setTimeout(() => setTrail([]), 200);
    };

    // Math Logic for Slicing
    const checkSlice = (p1, p2) => {
        if (!rectRef.current) return;

        const isVertical = orientation === 'vertical';

        const currentW = rectRef.current.offsetWidth;
        const currentH = rectRef.current.offsetHeight;

        const RECT_W = isVertical ? currentH : currentW;
        const RECT_H = isVertical ? currentW : currentH;

        const ROTATION_DEG = isVertical ? 2 : -2;
        const ROTATION_RAD = ROTATION_DEG * (Math.PI / 180);

        const svgRect = rectRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        const scaleX = containerRect.width / containerRef.current.offsetWidth;
        const scaleY = containerRect.height / containerRef.current.offsetHeight;

        const cx = ((svgRect.left + svgRect.width / 2) - containerRect.left) / scaleX;
        const cy = ((svgRect.top + svgRect.height / 2) - containerRect.top) / scaleY;

        const unrotate = (p) => {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const angle = -ROTATION_RAD;
            return {
                x: cx + (dx * Math.cos(angle) - dy * Math.sin(angle)),
                y: cy + (dx * Math.sin(angle) + dy * Math.cos(angle))
            };
        };

        const up1 = unrotate(p1);
        const up2 = unrotate(p2);

        const left = cx - (isVertical ? RECT_H : RECT_W) / 2;
        const top = cy - ((isVertical ? RECT_W : RECT_H) / 2);

        // Correct Top/Bottom/Left/Right needed for bound check logic.
        // Actually, let's stick to the center-relative logic I used before or reuse cx/cy.
        // PREVIOUS LOGIC was:
        // const visualHalfW = (isVertical ? RECT_H : RECT_W) / 2;
        // const visualHalfH = (isVertical ? RECT_W : RECT_H) / 2;
        // const left = cx - visualHalfW;
        // const right = cx + visualHalfW;
        // const top = cy - visualHalfH;
        // const bottom = cy + visualHalfH;

        // Let's ensure this matches exactly what I had to avoid regression.
        const visualHalfW = (isVertical ? RECT_H : RECT_W) / 2;
        const visualHalfH = (isVertical ? RECT_W : RECT_H) / 2;
        const bLeft = cx - visualHalfW;
        const bRight = cx + visualHalfW;
        const bTop = cy - visualHalfH;
        const bBottom = cy + visualHalfH;

        let ratioLeft = 0;

        const checkDiagonal = isVertical
            ? Math.abs(up1.y - up2.y)
            : Math.abs(up1.x - up2.x);

        if (checkDiagonal > RECT_H * 0.5) {
            setFeedback('invalid');
            setIsShaking(true);
            playThud();
            setTimeout(() => {
                setFeedback(null);
                setIsShaking(false);
            }, 1000);
            return;
        }

        if (isVertical) {
            if (up2.x === up1.x) {
                setFeedback('invalid');
                setTimeout(() => setFeedback(null), 1000);
                return;
            }

            const m = (up2.y - up1.y) / (up2.x - up1.x);
            const intersectY = m * (cx - up1.x) + up1.y;

            if (intersectY < bTop - 40 || intersectY > bBottom + 40) {
                setDebugMsg(`Bounds Y: ${Math.round(intersectY)} vs ${Math.round(bTop)}-${Math.round(bBottom)}`);
                return;
            }

            const clampedY = Math.max(bTop, Math.min(bBottom, intersectY));
            ratioLeft = (clampedY - bTop) / RECT_W;

        } else {
            let intersectX;
            if (up2.x === up1.x) {
                intersectX = up1.x;
            } else {
                const m = (up2.y - up1.y) / (up2.x - up1.x);
                if (Math.abs(m) < 0.2) {
                    setFeedback('invalid');
                    setTimeout(() => setFeedback(null), 1000);
                    return;
                }
                intersectX = (cy - up1.y) / m + up1.x;
            }

            if (intersectX < bLeft - 40 || intersectX > bRight + 40) {
                setDebugMsg(`Bounds X: ${Math.round(intersectX)} vs ${Math.round(bLeft)}-${Math.round(bRight)}`);
                return;
            }

            const clampedX = Math.max(bLeft, Math.min(bRight, intersectX));
            ratioLeft = (clampedX - bLeft) / RECT_W;
        }

        const target = goal.num / goal.denom;
        const diffLeft = Math.abs(ratioLeft - target);
        const ratioRight = 1.0 - ratioLeft;
        const diffRight = Math.abs(ratioRight - target);

        if (diffLeft <= TOLERANCE) {
            setLastRatio(ratioLeft);
            setVizSide('left');
            handleSuccess(ratioLeft);
        } else if (diffRight <= TOLERANCE) {
            setLastRatio(ratioLeft);
            setVizSide('right');
            handleSuccess(ratioLeft);
        } else {
            const direction = ratioLeft < target ? (isVertical ? "Too High" : "Too Left") : (isVertical ? "Too Low" : "Too Right");
            setDebugMsg(`${direction} (Diff: ${diffLeft.toFixed(2)})`);
            setLastRatio(ratioLeft);

            if (attempts < 2) {
                setAttempts(prev => prev + 1);
                setFeedback('incorrect');
                setTimeout(() => {
                    setFeedback(null);
                    setLastRatio(null);
                }, 1500);
            } else {
                setFeedback('failed');
                setShowVisualization(true);
                setTimeout(() => {
                    generateLevel(level);
                }, 4000);
            }
        }
    };

    const handleSuccess = (cutRatio) => {
        setFeedback('correct');
        setShowVisualization(true);

        setTimeout(() => {
            setDriftRatio(cutRatio);
        }, 1000);

        setTimeout(() => {
            if (level < TOTAL_LEVELS) {
                setLevel(l => l + 1);
                generateLevel(level + 1);
            } else {
                setIsComplete(true);
                if (onComplete) onComplete();
            }
        }, 4000);
    };

    const currentTheme = THEMES[themeIndex % THEMES.length];
    const rectStyle = {
        background: currentTheme.pattern !== 'none' ? currentTheme.pattern : currentTheme.color,
        backgroundColor: currentTheme.color,
        backgroundSize: currentTheme.bgSize || 'auto'
    };

    const renderVisualization = (offsetPx = 0) => {
        if (!showVisualization) return null;

        const isVertical = orientation === 'vertical';

        const style = offsetPx !== null ? {
            width: isVertical ? '100px' : '280px',
            height: isVertical ? '280px' : '100px',
            [isVertical ? 'top' : 'left']: `${offsetPx}px`
        } : {};

        const lines = [];
        for (let i = 1; i < goal.denom; i++) {
            lines.push(
                <div
                    key={i}
                    className={`viz-line ${isVertical ? 'vertical' : ''}`}
                    style={{ [isVertical ? 'top' : 'left']: `${(i / goal.denom) * 100}%` }}
                />
            );
        }

        const highlightStyle = {
            [isVertical ? 'height' : 'width']: `${(goal.num / goal.denom) * 100}%`,
        };

        if (vizSide === 'right') {
            highlightStyle[isVertical ? 'bottom' : 'right'] = 0;
            highlightStyle[isVertical ? 'top' : 'left'] = 'auto';
            highlightStyle.borderRadius = isVertical ? '0 0 12px 12px' : '0 12px 12px 0';
        } else {
            highlightStyle.borderRadius = isVertical ? '12px 12px 0 0' : '12px 0 0 12px';
        }

        return (
            <div className="visualization-overlay" style={style}>
                <div className={`viz-highlight ${vizSide}`} style={highlightStyle} />
                {lines}
                <div className="viz-border" />
            </div>
        );
    };

    // Apply Random Position Check Wrapper
    // We wrap the target-rect in a div that applies the transform translation offset.
    // This allows the inner target-rect to keep its own rotation/scale transforms.
    // IMPORTANT: checkSlice relies on rectRef (target-rect) getBoundingClientRect.
    // This will work correctly even inside a transformed wrapper.

    return (
        <div
            className={`fraction-slicer-container ${preview ? 'preview-mode' : ''}`}
            ref={containerRef}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
        >
            <BackgroundFruits />

            <div className="level-badge-overlay">
                LEVEL: {level}/{TOTAL_LEVELS}
            </div>

            <div className="slicer-header">
                <div className="goal-display">
                    Slice <span className="highlight">{goal.num}/{goal.denom}</span>
                </div>
            </div>

            <div className="slicer-stage">
                {/* Position Wrapper for Random Offsets */}
                <div style={{ transform: `translate(${rectOffset.x}px, ${rectOffset.y}px)` }}>
                    <div
                        className={`target-rect ${orientation} ${driftRatio ? 'drifting' : ''} ${isShaking ? 'shaking' : ''}`}
                        ref={rectRef}
                        style={!driftRatio ? rectStyle : {}}
                    >
                        {!driftRatio && (
                            <>
                                <div className="rect-content"></div>
                                {feedback === 'incorrect' && <div className="error-flash" />}
                                {renderVisualization(null)}
                            </>
                        )}

                        {driftRatio && (
                            <>
                                <div
                                    className={`drift-part left ${orientation === 'vertical' ? 'vertical' : ''}`}
                                    style={{
                                        [orientation === 'vertical' ? 'height' : 'width']: `${driftRatio * 100}%`,
                                        ...rectStyle
                                    }}
                                >
                                    <div className="rect-content"></div>
                                    {renderVisualization(0)}
                                </div>
                                <div
                                    className={`drift-part right ${orientation === 'vertical' ? 'vertical' : ''}`}
                                    style={{
                                        [orientation === 'vertical' ? 'height' : 'width']: `${(1 - driftRatio) * 100}%`,
                                        [orientation === 'vertical' ? 'top' : 'left']: `${driftRatio * 100}%`,
                                        ...rectStyle
                                    }}
                                >
                                    <div className="rect-content"></div>
                                    {renderVisualization(orientation === 'vertical' ? -driftRatio * 280 : -driftRatio * 280)}
                                </div>
                            </>
                        )}

                        {feedback && lastRatio && !driftRatio && (
                            <div
                                className={`cut-line ${orientation === 'vertical' ? 'vertical' : ''}`}
                                style={{
                                    [orientation === 'vertical' ? 'top' : 'left']: `${lastRatio * 100}%`
                                }}
                            >
                            </div>
                        )}

                        {showSolution && (
                            <div
                                className={`solution-line ${orientation === 'vertical' ? 'vertical' : ''}`}
                                style={{
                                    [orientation === 'vertical' ? 'top' : 'left']: `${(goal.num / goal.denom) * 100}%`
                                }}
                            >
                                <div className="solution-label">
                                    {goal.num}/{goal.denom}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isSlicing && trail.length > 1 && (
                <svg className="slash-layer">
                    <polyline
                        points={trail.map(p => `${p.x},${p.y}`).join(' ')}
                        className="slash-line"
                    />
                </svg>
            )}

            <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.8)', color: '#000', fontSize: '10px', pointerEvents: 'none', zIndex: 2000, padding: '2px 4px', borderRadius: '4px' }}>
                {debugMsg}
            </div>

            {feedback === 'correct' && (
                <div className="feedback-overlay success">
                    {/* Icon removed */}
                    <div className="feedback-text">Nice Slice!</div>
                </div>
            )}
            {feedback === 'incorrect' && (
                <div className="feedback-overlay error try-again">
                    <div className="feedback-text">Try Again!</div>
                    <div style={{ fontSize: '1.2rem', color: '#000', marginTop: '10px', fontWeight: 'bold' }}>{debugMsg}</div>
                </div>
            )}
            {feedback === 'failed' && (
                <div className="feedback-overlay error">
                </div>
            )}
            {feedback === 'miss' && (
                <div className="feedback-overlay error try-again">
                    <div className="feedback-text">Missed!</div>
                </div>
            )}
            {isComplete && (
                <div className="feedback-overlay complete">
                    <div className="feedback-text">Great Job!</div>
                </div>
            )}
        </div>
    );
};

export default FractionSlicer;
