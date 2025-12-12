import React, { useState, useEffect, useRef } from 'react';
import { Apple, Banana, Cherry, Citrus, Grape } from 'lucide-react';
import confetti from 'canvas-confetti';
import './FractionSlicer.css';

const THEMES = [
    { name: 'Classic', color: '#00b894', pattern: 'none' },
    { name: 'Water', color: '#0984e3', pattern: 'radial-gradient(circle at 50% 50%, #74b9ff 10%, transparent 10%), radial-gradient(circle at 0% 0%, #74b9ff 10%, transparent 10%)' },
    { name: 'Space', color: '#6c5ce7', pattern: 'radial-gradient(white 1%, transparent 1%)', bgSize: '20px 20px' },
    { name: 'Candy', color: '#fd79a8', pattern: 'repeating-linear-gradient(90deg, #e84393 0, #e84393 20px, #fd79a8 20px, #fd79a8 40px)' },
    { name: 'Zebra', color: '#34495e', pattern: 'repeating-linear-gradient(45deg, #2c3e50 0, #2c3e50 20px, #34495e 20px, #34495e 40px)' },
    { name: 'Lime', color: '#badc58', pattern: 'radial-gradient(circle, #6ab04c 20%, transparent 20%)', bgSize: '30px 30px' }
];

const FractionSlicer = ({ config = {}, onComplete, preview = false }) => {
    // Config Sanitization
    const cfg = config || {};
    const DIFF_SETTINGS = {
        easy: 0.25,
        normal: 0.07,
        hard: 0.04
    };
    const difficulty = cfg.difficulty || 'normal';
    const TOLERANCE = cfg.tolerance || DIFF_SETTINGS[difficulty] || 0.20;
    const TOTAL_LEVELS = cfg.levels || 6;

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
    const [debugMsg, setDebugMsg] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    // To prevent goal swapping mid-animation
    const [snapshotGoal, setSnapshotGoal] = useState(null);

    // Visual Variety State
    const [themeIndex, setThemeIndex] = useState(0);
    const [rectOffset, setRectOffset] = useState({ x: 0, y: 0 });

    const [trail, setTrail] = useState([]);
    const containerRef = useRef(null);
    const rectRef = useRef(null);
    const audioCtxRef = useRef(null);

    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        return () => {
            if (audioCtxRef.current) audioCtxRef.current.close();
        };
    }, []);

    const playThud = () => {
        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

        const oscillator = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtxRef.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioCtxRef.current.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtxRef.current.currentTime + 0.2);
    };

    const playSuccess = () => {
        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        const now = audioCtxRef.current.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = audioCtxRef.current.createOscillator();
            const gain = audioCtxRef.current.createGain();
            osc.connect(gain);
            gain.connect(audioCtxRef.current.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.4);
        });
    };

    const hasInitialized = useRef(false);
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        generateLevel(1);
    }, []);

    const isSlicingRef = useRef(false);
    const failureTimeoutRef = useRef(null);
    const lastGenTimeRef = useRef(0);
    const generateLevel = (lvl) => {
        // Debounce: prevent double generation within 1000ms
        const now = Date.now();
        if (now - lastGenTimeRef.current < 1000) return;
        lastGenTimeRef.current = now;

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
        setSnapshotGoal(null); // Clear snapshot for new level
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
        setDebugMsg('');

        setOrientation(lvl % 2 === 0 ? 'vertical' : 'horizontal');
        setThemeIndex(Math.floor(Math.random() * THEMES.length));
        setRectOffset({
            x: 0,
            y: -10 + Math.random() * 20
        });
    };

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
        if (preview || feedback === 'correct' || feedback === 'failed' || isComplete) return;
        setIsSlicing(true);
        isSlicingRef.current = true;
        setDebugMsg('');
        const p = getPoint(e);
        setSliceStart(p);
        setSliceEnd(p);
        setTrail([p]);
    };

    const handleMove = (e) => {
        if (!isSlicing || !sliceStart) return;
        const p = getPoint(e);
        setSliceEnd(p);
        setTrail(prev => [...prev, p]);
    };

    const handleEnd = () => {
        if (!isSlicingRef.current) return;
        isSlicingRef.current = false;
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

        const targetPrimary = goal.num / goal.denom;
        const targetComplement = 1.0 - targetPrimary;

        const diffPrimary = ratioLeft - targetPrimary;
        const diffComplement = ratioLeft - targetComplement;

        let bestDiff = 0;
        let chosenSide = 'left';

        if (Math.abs(diffPrimary) < Math.abs(diffComplement)) {
            bestDiff = diffPrimary;
            chosenSide = 'left';
        } else {
            bestDiff = diffComplement;
            chosenSide = 'right';
        }

        const absDiff = Math.abs(bestDiff);
        const sign = bestDiff > 0 ? '+' : '';
        const pct = (bestDiff * 100).toFixed(1);
        const diffMsg = `${sign}${pct}%`;

        if (absDiff <= 0.07) {
            setLastRatio(ratioLeft);
            setVizSide(chosenSide);
            setDebugMsg(`${diffMsg}`);
            handleSuccess(ratioLeft);
        } else {
            setDebugMsg(`Miss: ${diffMsg}`);
            setLastRatio(ratioLeft);

            // Play Error Sound
            playThud();

            if (attempts < 1) { // 0 = First Attempt
                setAttempts(prev => prev + 1);
                setFeedback('incorrect');
                setTimeout(() => {
                    setFeedback(null);
                    setLastRatio(null);
                }, 1500);
            } else {
                setFeedback('failed');
                setShowVisualization(true);

                // Clear any existing timeout
                if (failureTimeoutRef.current) clearTimeout(failureTimeoutRef.current);

                failureTimeoutRef.current = setTimeout(() => {
                    generateLevel(level);
                }, 2000); // reduced from 4000
            }
        }
    };

    const handleSuccess = (cutRatio) => {
        setFeedback('correct');

        // FREEZE GOAL so animation doesn't jump
        setSnapshotGoal(goal);
        setShowVisualization(true);

        playSuccess();
        confetti({
            particleCount: 50,
            spread: 60,
            gravity: 2,
            ticks: 100,
            origin: { y: 0.6 }
        });
        setTimeout(() => {
            setDriftRatio(cutRatio);
        }, 300);
        setTimeout(() => {
            if (level < TOTAL_LEVELS) {
                setLevel(l => l + 1);
                generateLevel(level + 1);
            } else {
                setIsComplete(true);
                if (onComplete) onComplete();
            }
        }, 1400); // Wait for 1.2s drift + 0.2s buffer
    };

    const currentTheme = THEMES[themeIndex % THEMES.length];
    const rectStyle = {
        background: currentTheme.pattern !== 'none' ? currentTheme.pattern : currentTheme.color,
        backgroundSize: currentTheme.bgSize || 'auto',
        backgroundColor: currentTheme.color
        // Transform removed here, applied to wrapper
    };

    const isHorizontal = orientation === 'horizontal';

    const renderVisualization = () => {
        const showGrid = showVisualization || showSolution || preview;
        const validLastRatio = lastRatio || 0.5;

        // USE SNAPSHOT GOAL IF ANIMATING
        const currentGoal = snapshotGoal || goal;
        const goalRat = currentGoal.num / currentGoal.denom;

        // Derive side locally to ensure consistency with current geometry
        const diffL = Math.abs(validLastRatio - goalRat);
        const diffR = Math.abs(validLastRatio - (1 - goalRat));
        const localVizSide = diffL < diffR ? 'left' : 'right';

        // SNAP TO CUT: If success, paint exactly what was cut (prevent bleeding)
        let targetRat = goalRat;
        if (feedback === 'correct' && driftRatio) {
            targetRat = localVizSide === 'left' ? driftRatio : (1 - driftRatio);
        }

        const lines = [];
        for (let i = 1; i < currentGoal.denom; i++) {
            lines.push(i / currentGoal.denom);
        }

        // Determine highlight range to clip lines
        const highlightStart = localVizSide === 'left' ? 0 : 1 - targetRat;
        const highlightEnd = localVizSide === 'left' ? targetRat : 1;

        return (
            <div className={`viz-overlay ${orientation}`} style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: isHorizontal ? '266px' : '100px',
                height: isHorizontal ? '100px' : '266px'
            }}>
                {/* Grid Lines (Target) */}
                {showGrid && lines.map((l, i) => (
                    <div key={i} className={`viz-line ${orientation}`} style={isHorizontal ? { left: `${l * 100}%` } : { top: `${l * 100}%` }} />
                ))}

                {/* User Cut Line - Shows where you sliced */}
                {lastRatio && feedback !== 'correct' && (
                    <div
                        className={`viz-line ${orientation} cut-line`}
                        style={{
                            [isHorizontal ? 'left' : 'top']: `${validLastRatio * 100}%`
                        }}
                    />
                )}

                {/* Highlight Area (Target) */}
                {showGrid && (
                    <div
                        className="viz-highlight"
                        style={{
                            [isHorizontal ? 'left' : 'top']: `${highlightStart * 100}%`,
                            [isHorizontal ? 'width' : 'height']: `${targetRat * 100}%`,
                            [isHorizontal ? 'height' : 'width']: '100%',
                            background: 'rgba(255, 255, 255, 0.3)'
                        }}
                    />
                )}
            </div>
        );
    };

    return (
        <div
            className="fraction-slicer-container"
            ref={containerRef}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            <div className="level-badge-overlay">
                LEVEL: {level}/{TOTAL_LEVELS}
            </div>

            <div className="slicer-header">
                <div className="goal-display">
                    <span className="highlight-goal-block">
                        Slice <span style={{ fontSize: '1.2em', marginLeft: '6px' }}>{goal.num}/{goal.denom}</span>
                    </span>
                </div>
            </div>

            <div className="slicer-stage">
                <div
                    className="position-wrapper"
                    style={{
                        transform: `translate(${rectOffset.x}px, ${rectOffset.y}px) rotate(${orientation === 'vertical' ? 2 : -2}deg)`,
                        width: isHorizontal ? '266px' : '100px',
                        height: isHorizontal ? '100px' : '266px',
                        position: 'relative' // Ensure relative frame for abs children
                    }}
                >
                    {feedback === 'correct' && driftRatio && (
                        <>
                            <div className={`drift-part left ${orientation}`} style={{
                                width: isHorizontal ? `${driftRatio * 100}%` : '100%',
                                height: isHorizontal ? '100%' : `${driftRatio * 100}%`
                            }}>
                                <div className="rect-content" style={{
                                    ...rectStyle,
                                    width: isHorizontal ? '266px' : '100px',
                                    height: isHorizontal ? '100px' : '266px',
                                    minWidth: isHorizontal ? '266px' : '100px',
                                    minHeight: isHorizontal ? '100px' : '266px',
                                    maxWidth: 'none',
                                    boxSizing: 'border-box'
                                }}>
                                    {renderVisualization()}
                                </div>
                            </div>
                            <div className={`drift-part right ${orientation}`} style={{
                                width: isHorizontal ? `${(1 - driftRatio) * 100}%` : '100%',
                                height: isHorizontal ? '100%' : `${(1 - driftRatio) * 100}%`,
                                left: isHorizontal ? `${driftRatio * 100}%` : 0,
                                top: isHorizontal ? 0 : `${driftRatio * 100}%`
                            }}>
                                <div
                                    className="rect-content"
                                    style={{
                                        ...rectStyle,
                                        width: isHorizontal ? '266px' : '100px',
                                        height: isHorizontal ? '100px' : '266px',
                                        minWidth: isHorizontal ? '266px' : '100px',
                                        minHeight: isHorizontal ? '100px' : '266px',
                                        maxWidth: 'none',
                                        boxSizing: 'border-box',
                                        position: 'absolute',
                                        left: isHorizontal ? `-${driftRatio / (1 - driftRatio) * 100}%` : '0',
                                        top: isHorizontal ? '0' : `-${driftRatio / (1 - driftRatio) * 100}%`,
                                    }}
                                >
                                    {renderVisualization()}
                                </div>
                            </div>
                        </>
                    )}

                    <div
                        className={`target-rect ${orientation} ${isShaking ? 'shake' : ''}`}
                        ref={rectRef}
                        style={{
                            ...rectStyle,
                            opacity: feedback === 'correct' && driftRatio ? 0 : 1
                        }}
                    >
                        {(feedback === 'invalid' || feedback === 'incorrect') && (
                            <div className="error-flash" />
                        )}
                        {(showVisualization || showSolution || lastRatio) && renderVisualization()}
                    </div>
                </div>
            </div>

            <svg className="trail-svg" style={{ pointerEvents: 'none' }}>
                {trail.length > 1 && (
                    <polyline
                        points={trail.map(t => `${t.x},${t.y}`).join(' ')}
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
            </svg>

            {debugMsg && (
                <div className="debug-overlay" style={{ top: '80%', color: 'black', background: 'rgba(255,255,255,0.8)', padding: '5px 10px', borderRadius: '8px' }}>
                    {debugMsg}
                </div>
            )}

            {isComplete && (
                <div className="complete-overlay">
                    <h1>Lesson Complete!</h1>
                    <button onClick={onComplete}>Continue</button>
                </div>
            )}
        </div>
    );
};

export default FractionSlicer;
