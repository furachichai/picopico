import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp } from 'lucide-react';
import confetti from 'canvas-confetti';
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
    const TOTAL_LEVELS = cfg.levels || 3;
    const TOLERANCE = cfg.tolerance || 0.15;

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
    const [vizSide, setVizSide] = useState('left'); // 'left' or 'right'
    const [driftRatio, setDriftRatio] = useState(null);

    const containerRef = useRef(null);
    const rectRef = useRef(null);

    // Initialize Level
    useEffect(() => {
        generateLevel(1);
    }, [config]);

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
        setIsSlicing(false);
        setAttempts(0);
        setShowSolution(false);
        setShowVisualization(false);
        setVizSide('left');
        setDriftRatio(null);
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
    };

    const handleMove = (e) => {
        if (!isSlicing) return;
        // e.preventDefault(); 
        const p = getPoint(e);
        setSliceEnd(p);
    };

    const handleEnd = () => {
        if (!isSlicing) return;
        setIsSlicing(false);
        if (sliceStart && sliceEnd) {
            // Only slice if length is significant to avoid single-click triggers
            const dx = sliceEnd.x - sliceStart.x;
            const dy = sliceEnd.y - sliceStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 20) {
                checkSlice(sliceStart, sliceEnd);
            } else {
                // Too short, cancel
                setSliceStart(null);
                setSliceEnd(null);
                setIsSlicing(false);
            }
        }
    };

    // Math Logic for Slicing
    const checkSlice = (p1, p2) => {
        if (!rectRef.current) return;

        // Visual Rect Props - Fixed logical size from CSS to ensure consistency
        // (If CSS changes, these need to substring match or be dynamic, but hardcoding for the specific logic requested is safer for the math)
        // Actually, let's derive standard deviation from the bounding box if possible, or simpler:
        const RECT_W = 280;
        const RECT_H = 100;
        const ROTATION_DEG = -2;
        const ROTATION_RAD = ROTATION_DEG * (Math.PI / 180);

        const svgRect = rectRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Calculate Scale again to ensure consistency with inputs
        const scaleX = containerRect.width / containerRef.current.offsetWidth;
        const scaleY = containerRect.height / containerRef.current.offsetHeight;

        // Center of the rotated rect in container coordinates (Internal/Unscaled Space)
        const cx = ((svgRect.left + svgRect.width / 2) - containerRect.left) / scaleX;
        const cy = ((svgRect.top + svgRect.height / 2) - containerRect.top) / scaleY;

        // Function to rotate a point around center by -ROTATION_RAD (to un-rotate)
        const unrotate = (p) => {
            const dx = p.x - cx;
            const dy = p.y - cy;
            // rotate by positive angle to counteract negative rotation
            const angle = -ROTATION_RAD;
            return {
                x: cx + (dx * Math.cos(angle) - dy * Math.sin(angle)),
                y: cy + (dx * Math.sin(angle) + dy * Math.cos(angle))
            };
        };

        const up1 = unrotate(p1);
        const up2 = unrotate(p2);

        // Now calculate intersection with Axis-Aligned box centered at cx, cy
        const left = cx - RECT_W / 2;
        const right = cx + RECT_W / 2;
        const top = cy - RECT_H / 2;
        const bottom = cy + RECT_H / 2;

        // Line equation on unrotated points
        // x = (y - y1)/m + x1
        // Intersect at y = cy (horizontal middle line slice)
        // OR simply finding where the line crosses the rect horizontally?
        // The slice is a line segment. We want to know where it cuts the width of the rect content.
        // Assuming the user slices roughly vertically, we want the X intersection at the generic Y center.

        let intersectX;
        if (up2.x === up1.x) {
            intersectX = up1.x;
        } else {
            const m = (up2.y - up1.y) / (up2.x - up1.x);
            // Safety check for horizontal lines is still valid
            if (Math.abs(m) < 0.2) {
                setFeedback('invalid');
                setTimeout(() => setFeedback(null), 1000);
                return;
            }
            intersectX = (cy - up1.y) / m + up1.x;
        }

        // Check if Missed (relative to unrotated box with slight padding)
        if (intersectX < left - 15 || intersectX > right + 15) {
            // Sliced outside the box -> Ignore completely (no feedback, no penalty)
            return;
        }

        // Clamp and Calculate Ratio
        const clampedX = Math.max(left, Math.min(right, intersectX));
        const ratioLeft = (clampedX - left) / RECT_W;
        const ratioRight = 1 - ratioLeft;

        // Target ratio
        const target = goal.num / goal.denom;

        // Check both sides
        const diffLeft = Math.abs(ratioLeft - target);
        const diffRight = Math.abs(ratioRight - target);

        const isLeftMatch = diffLeft <= TOLERANCE;
        const isRightMatch = diffRight <= TOLERANCE;

        if (isLeftMatch || isRightMatch) {
            // SUCCESS
            const cutPos = isLeftMatch ? ratioLeft : ratioLeft; // Visual cut is always where the line is
            // Note: If user cut 0.75 for a 0.25 target, it's a match (Right side).
            // Visually we want to split at 0.75.

            setLastRatio(ratioLeft);
            setVizSide(isLeftMatch ? 'left' : 'right');
            handleSuccess(ratioLeft);
        } else {
            // FAIL
            setLastRatio(ratioLeft); // Show where they actually cut

            // Check attempts
            if (attempts < 1) {
                // First fail
                setAttempts(prev => prev + 1);
                setFeedback('incorrect');
                setTimeout(() => {
                    setFeedback(null);
                    setLastRatio(null);
                }, 1500);
            } else {
                // Second fail
                setFeedback('failed');
                setShowVisualization(true);
                // We show visualization instead of just "solution line".

                setTimeout(() => {
                    generateLevel(level);
                }, 4000);
            }
        }
    };

    const handleSuccess = (cutRatio) => {
        setFeedback('correct');
        setShowVisualization(true);

        // Confetti
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

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

    const renderVisualization = (offsetLeftPx = 0) => {
        if (!showVisualization) return null;

        // If offsetLeftPx is provided (not null/undefined), we force fixed width layout for drift parts
        // otherwise default to 100% width for main rect
        const style = offsetLeftPx !== null ? {
            width: '280px', // Fixed original width
            left: `${offsetLeftPx}px`
        } : {};

        // Lines
        const lines = [];
        for (let i = 1; i < goal.denom; i++) {
            lines.push(
                <div
                    key={i}
                    className="viz-line"
                    style={{ left: `${(i / goal.denom) * 100}%` }}
                />
            );
        }
        const highlightStyle = {
            width: `${(goal.num / goal.denom) * 100}%`,
            ...(vizSide === 'right' ? { right: 0, left: 'auto', borderRadius: '0 12px 12px 0' } : {})
        };

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
                <div className={`target-rect ${driftRatio ? 'drifting' : ''}`} ref={rectRef} style={!driftRatio ? rectStyle : {}}>
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
                                className="drift-part left"
                                style={{ width: `${driftRatio * 100}%`, ...rectStyle }}
                            >
                                <div className="rect-content"></div>
                                {renderVisualization(0)}
                            </div>
                            <div
                                className="drift-part right"
                                style={{ width: `${(1 - driftRatio) * 100}%`, left: `${driftRatio * 100}%`, ...rectStyle }}
                            >
                                <div className="rect-content"></div>
                                {renderVisualization(-driftRatio * 280)}
                            </div>
                        </>
                    )}

                    {/* Show last cut result (User's cut) */}
                    {feedback && lastRatio && !driftRatio && (
                        <div className="cut-line" style={{ left: `${lastRatio * 100}%` }}>
                            {/* Percentage label removed per request */}
                        </div>
                    )}

                    {/* Show Solution Line (Correct target) */}
                    {showSolution && (
                        <div className="solution-line" style={{ left: `${(goal.num / goal.denom) * 100}%` }}>
                            <div className="solution-label">
                                {goal.num}/{goal.denom}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* User Slash Line */}
            {isSlicing && sliceStart && sliceEnd && (
                <svg className="slash-layer">
                    <line
                        x1={sliceStart.x} y1={sliceStart.y}
                        x2={sliceEnd.x} y2={sliceEnd.y}
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
