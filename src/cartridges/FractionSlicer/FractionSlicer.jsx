import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp } from 'lucide-react';
// import confetti from 'canvas-confetti';
import './FractionSlicer.css';

const THEMES = [
    { name: 'Classic', color: '#00b894', pattern: 'none' },
    { name: 'Wood', color: '#e67e22', pattern: 'repeating-linear-gradient(45deg, #d35400 0, #d35400 10px, #e67e22 10px, #e67e22 20px)' },
    { name: 'Water', color: '#0984e3', pattern: 'radial-gradient(circle at 50% 50%, #74b9ff 10%, transparent 10%), radial-gradient(circle at 0% 0%, #74b9ff 10%, transparent 10%)' },
    { name: 'Space', color: '#6c5ce7', pattern: 'radial-gradient(white 1%, transparent 1%)', bgSize: '20px 20px' },
    { name: 'Candy', color: '#fd79a8', pattern: 'repeating-linear-gradient(90deg, #e84393 0, #e84393 20px, #fd79a8 20px, #fd79a8 40px)' },
];

const FractionSlicer = ({ config = {}, onComplete, preview = false }) => {
    // Config Sanitization
    const cfg = config || {};
    const DIFF_SETTINGS = {
        easy: 0.15,
        normal: 0.10,
        hard: 0.05
    };
    const difficulty = cfg.difficulty || 'normal';
    const TOLERANCE = cfg.tolerance || DIFF_SETTINGS[difficulty] || 0.10; // Allow override or use preset
    const TOTAL_LEVELS = cfg.levels || 5;

    const [level, setLevel] = useState(1);
    const [goal, setGoal] = useState({ num: 1, denom: 2 });
    const [isSlicing, setIsSlicing] = useState(false);
    const [sliceStart, setSliceStart] = useState(null);
    const [sliceEnd, setSliceEnd] = useState(null);
    const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect', null
    const [lastRatio, setLastRatio] = useState(null);
    const [isComplete, setIsComplete] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [showSolution, setShowSolution] = useState(false);
    const [showVisualization, setShowVisualization] = useState(false);
    const [vizSide, setVizSide] = useState('left'); // 'left' or 'right' (or 'top'/'bottom' for vertical)
    const [driftRatio, setDriftRatio] = useState(null);
    const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' | 'vertical'

    const [trail, setTrail] = useState([]);
    const [isShaking, setIsShaking] = useState(false);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cfg.levels, cfg.tolerance, cfg.difficulty]);

    const generateLevel = (lvl) => {
        // Random fraction: 1/2, 1/3, 1/4, 2/3, 3/4
        const options = [
            { num: 1, denom: 2 },
            { num: 1, denom: 3 },
            { num: 1, denom: 4 },
            { num: 2, denom: 3 },
            { num: 3, denom: 4 },
            { num: 2, denom: 5 },
            { num: 1, denom: 5 }
        ];
        // Pick random
        const nextGoal = options[Math.floor(Math.random() * options.length)];
        setGoal(nextGoal);
        setFeedback(null);
        setLastRatio(null);
        setSliceStart(null);
        setSliceEnd(null);
        setTrail([]); // Reset trail
        setIsSlicing(false);
        setIsShaking(false);
        setAttempts(0);
        setShowSolution(false);
        setShowVisualization(false);
        setVizSide('left');
        setDriftRatio(null);
        // Vertical on even levels (2, 4)
        setOrientation(lvl % 2 === 0 ? 'vertical' : 'horizontal');
    };

    // Input Handlers
    const getPoint = (e) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();

        // Account for any CSS transform scaling on the container
        const scaleX = rect.width / containerRef.current.offsetWidth;
        const scaleY = rect.height / containerRef.current.offsetHeight;

        // Handle both Touch and Mouse events consistently
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) / scaleX,
            y: (clientY - rect.top) / scaleY
        };
    };

    const handleStart = (e) => {
        // Prevent default to stop scrolling/gestures
        // e.preventDefault(); // Note: React passive events might complain, but usually fine for game logic
        if (preview || feedback === 'correct' || isComplete) return;
        setIsSlicing(true);
        const p = getPoint(e);
        setSliceStart(p);
        setSliceEnd(p);
        setTrail([p]); // Start trail
    };

    const handleMove = (e) => {
        if (!isSlicing) return;
        // e.preventDefault(); 
        const p = getPoint(e);
        setSliceEnd(p);
        setTrail(prev => [...prev, p]); // Append to trail
    };

    const handleEnd = () => {
        if (!isSlicing) return;
        setIsSlicing(false);

        // Use Start and End for calculation
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

        // Fade trail out visually? 
        // For now, clear it immediately or keep it briefly?
        // User said "soon fade away". 
        // We'll let CSS fade it or clear it after a timeout.
        // Let's clear logic state but maybe leave a visual echo?
        // Simplest: Clear immediately on end, but rely on CSS transition? 
        // Actually, let's keep it for a moment if valid?
        // For invalid, we might want to keep it to show why?
        // Let's clear it 200ms later
        setTimeout(() => setTrail([]), 200);
    };

    // Math Logic for Slicing
    const checkSlice = (p1, p2) => {
        if (!rectRef.current) return;

        const isVertical = orientation === 'vertical';

        // Dynamic Size Usage (Fixes shrinkage issues)
        const currentW = rectRef.current.offsetWidth;
        const currentH = rectRef.current.offsetHeight;

        // Logical Width/Height for the cut calculation
        // If vertical (visually), we slice across the Height (longer dim).
        // If horizontal (visually), we slice across the Width (longer dim).

        const RECT_W = isVertical ? currentH : currentW; // This is the dimension along which the cut ratio is calculated (e.g., 280px)
        const RECT_H = isVertical ? currentW : currentH; // This is the perpendicular dimension (e.g., 100px)

        const ROTATION_DEG = -2;
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

        // Bounds relative to center (Visual Bounding Box)
        // If Vertical: Width is short (RECT_H), Height is long (RECT_W).
        // If Horizontal: Width is long (RECT_W), Height is short (RECT_H).

        const visualHalfW = (isVertical ? RECT_H : RECT_W) / 2;
        const visualHalfH = (isVertical ? RECT_W : RECT_H) / 2;

        const left = cx - visualHalfW;
        const right = cx + visualHalfW;
        const top = cy - visualHalfH;
        const bottom = cy + visualHalfH;

        let ratioLeft = 0;
        let intersectVal = 0;

        // Angle/Diagonal Clamp
        // If the cut is too diagonal relative to the axis, reject it.

        // Vertical Box (Tall) -> We want Horizontal Cut.
        // Horizontal Cut means large dx, small dy. 
        // We check dy (deviation from horizontal).

        // Horizontal Box (Wide) -> We want Vertical Cut.
        // Vertical Cut means large dy, small dx.
        // We check dx (deviation from vertical).

        const checkDiagonal = isVertical
            ? Math.abs(up1.y - up2.y)
            : Math.abs(up1.x - up2.x);

        // Allow slant.
        // Relaxation: Increased from 0.3 to 0.5 of height to be more tolerant.
        // This means for a 100px thick box, you can be off by 50px from start to end.
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
            // VERTICAL RECT -> Horizontal Slice (finding Y intersection)
            // x = cx (vertical centerline)
            // y = m(x - x1) + y1

            // Check for vertical slice line (invalid for this mode usually)
            if (up2.x === up1.x) { // Safety for divide by zero (vertical line)
                setFeedback('invalid');
                setTimeout(() => setFeedback(null), 1000);
                return;
            }

            const m = (up2.y - up1.y) / (up2.x - up1.x);
            // intersectY at x = cx (centerline)
            const intersectY = m * (cx - up1.x) + up1.y;
            intersectVal = intersectY;

            // Check bounds (Y axis)
            if (intersectY < top - 15 || intersectY > bottom + 15) return;

            const clampedY = Math.max(top, Math.min(bottom, intersectY));
            // Top-down ratio. Top is 0 ratio.
            ratioLeft = (clampedY - top) / RECT_W; // RECT_W is the height of the rect (e.g., 280)

        } else {
            // HORIZONTAL RECT -> Vertical Slice (finding X intersection)
            // y = cy
            // x = (y - y1)/m + x1
            let intersectX;
            if (up2.x === up1.x) {
                intersectX = up1.x;
            } else {
                const m = (up2.y - up1.y) / (up2.x - up1.x);
                if (Math.abs(m) < 0.2) { // Too horizontal
                    setFeedback('invalid');
                    setTimeout(() => setFeedback(null), 1000);
                    return;
                }
                intersectX = (cy - up1.y) / m + up1.x;
            }
            intersectVal = intersectX;

            if (intersectX < left - 15 || intersectX > right + 15) return;

            const clampedX = Math.max(left, Math.min(right, intersectX));
            ratioLeft = (clampedX - left) / RECT_W; // RECT_W is the width of the rect (e.g., 280)
        }

        // Strict Left-to-Right Matching
        // Removed "Right Side" match. User must cut at the specific Target ratio.
        const target = goal.num / goal.denom;
        const diffLeft = Math.abs(ratioLeft - target);

        // Strict Tolerance Check
        if (diffLeft <= TOLERANCE) {
            setLastRatio(ratioLeft);
            setVizSide('left'); // Always Left now
            handleSuccess(ratioLeft);
        } else {
            setLastRatio(ratioLeft);

            if (attempts < 1) {
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

        // Confetti removed for debugging Brave crash
        // if (typeof confetti === 'function') {
        //     confetti({
        //         particleCount: 100,
        //         spread: 70,
        //         origin: { y: 0.6 }
        //     });
        // }

        // Delay drift to let user see the visualization
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
        }, 4000); // 1s wait + 3s drift = 4s total
    };

    const currentTheme = THEMES[(level - 1) % THEMES.length];
    const rectStyle = {
        background: currentTheme.pattern !== 'none' ? currentTheme.pattern : currentTheme.color,
        backgroundColor: currentTheme.color,
        backgroundSize: currentTheme.bgSize || 'auto'
    };

    const renderVisualization = (offsetPx = 0) => {
        if (!showVisualization) return null;

        const isVertical = orientation === 'vertical';

        // Override size for drift parts
        const style = offsetPx !== null ? {
            width: isVertical ? '100px' : '280px',
            height: isVertical ? '280px' : '100px',
            [isVertical ? 'top' : 'left']: `${offsetPx}px`
        } : {};

        // Lines
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

        // Handle Side highlight logic
        if (vizSide === 'right') { // 'right' implies 'second part' (bottom for vertical)
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
            {/* Level UI - Separate and 'Over' everything */}
            <div className="level-badge-overlay">
                LEVEL: {level}/{TOTAL_LEVELS}
            </div>

            {/* Goal Header */}
            <div className="slicer-header">
                {/* <div className="level-badge">Level {level}/{TOTAL_LEVELS}</div> -- MOVED UP */}
                <div className="goal-display">
                    Slice <span className="highlight">{goal.num}/{goal.denom}</span>
                </div>
            </div>

            {/* Game Area */}
            <div className="slicer-stage">
                <div
                    className={`target-rect ${orientation} ${driftRatio ? 'drifting' : ''} ${isShaking ? 'shaking' : ''}`}
                    ref={rectRef}
                    style={!driftRatio ? rectStyle : {}}
                >
                    {/* Visual Reference? No, that spoils it. Just a colorful rect. */}
                    {!driftRatio && (
                        <>
                            <div className="rect-content"></div>
                            {renderVisualization(null)}
                        </>
                    )}

                    {/* Drift Parts */}
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

                    {/* Show last cut result (User's cut) */}
                    {feedback && lastRatio && !driftRatio && (
                        <div
                            className={`cut-line ${orientation === 'vertical' ? 'vertical' : ''}`}
                            style={{
                                [orientation === 'vertical' ? 'top' : 'left']: `${lastRatio * 100}%`
                            }}
                        >
                            {/* Percentage label removed per request */}
                        </div>
                    )}

                    {/* Show Solution Line (Correct target) */}
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

            {/* User Slash Trail */}
            {isSlicing && trail.length > 1 && (
                <svg className="slash-layer">
                    <polyline
                        points={trail.map(p => `${p.x},${p.y}`).join(' ')}
                        className="slash-line"
                    />
                </svg>
            )}

            {/* Feedback Overlay */}
            {feedback === 'correct' && (
                <div className="feedback-overlay success">
                    <ThumbsUp size={64} />
                    <div className="feedback-text">Nice Slice!</div>
                </div>
            )}
            {feedback === 'incorrect' && (
                <div className="feedback-overlay error try-again">
                    <div className="feedback-text">Try Again!</div>
                </div>
            )}
            {feedback === 'failed' && (
                <div className="feedback-overlay error">
                    {/* Text removed per request */}
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
