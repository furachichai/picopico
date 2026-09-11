import React, { useState, useRef, useCallback, useMemo } from 'react';
import { processEquation, parseEquationTemplate, toSuperscript, playTickSound } from './game/ExploreNLEngine';
import './ExloreNLCartridge.css';

/**
 * ExloreNLCartridge (ExploreNL)
 * 
 * Interactive Number Line Manipulative for exploring exponents, zero powers, and algebraic equations.
 * Consistent with # menu NumberLine styling and Number Line Quiz pointer behavior.
 */
export default function ExloreNLCartridge({
    config = {},
    preview = false,
    isSelected = false,
    onSelect,
    onConfigChange
}) {
    // Config values with defaults
    const orientation = config.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    const isVertical = orientation === 'vertical';

    // Support both startNumber/endNumber and bottomNumber/topNumber
    const rawStart = Number.isFinite(config.startNumber)
        ? Number(config.startNumber)
        : (Number.isFinite(config.bottomNumber) ? Number(config.bottomNumber) : -3);
    const rawEnd = Number.isFinite(config.endNumber)
        ? Number(config.endNumber)
        : (Number.isFinite(config.topNumber) ? Number(config.topNumber) : 3);

    const isReversed = rawStart > rawEnd;
    let minVal = Math.min(rawStart, rawEnd);
    let maxVal = Math.max(rawStart, rawEnd);
    if (minVal === maxVal) {
        maxVal = minVal + 1;
    }

    const rawStep = Number(config.step) || 1;
    const step = Math.max(0.001, Math.abs(rawStep));

    const thickness = Math.max(1, Math.min(10, Number(config.thickness) || 3));
    const showArrows = config.showArrows ?? true;
    const showNumbers = config.showNumbers ?? true;

    // Styling & Colors
    const lineColor = config.lineColor || config.symbolColor || '#6366F1';
    const numberColor = config.numberColor || '#1E293B';
    const pointerColor = config.pointerColor || '#4ECDC4'; // Exact Number Line Quiz teal default
    const equationColor = config.equationColor || '#0F172A';
    const equationBg = config.equationBg || '#FFFFFF';
    const equationBorder = config.equationBorder || '#6366F1';

    // Geometry for Number Line (Relocate & Resize)
    const nlX = config.nlX !== undefined ? config.nlX : (isVertical ? 25 : 50);
    const nlY = config.nlY !== undefined ? config.nlY : (isVertical ? 50 : 72);
    const nlLength = config.nlLength || (isVertical ? 520 : 620);

    // Equation card geometry
    const equationX = config.equationX !== undefined ? config.equationX : (isVertical ? 65 : 50);
    const equationY = config.equationY !== undefined ? config.equationY : (isVertical ? 45 : 28);
    const equationRotation = config.equationRotation !== undefined ? config.equationRotation : 0;
    const equationFontSize = config.equationFontSize || 28;
    const equationTemplate = config.equationTemplate || '2!n =';

    // Generate tick values (safeguarded against infinite loops)
    const tickValues = useMemo(() => {
        const ticks = [];
        if (isReversed) {
            for (let v = rawStart; v >= rawEnd - 0.0001; v -= step) {
                ticks.push(Math.round(v * 10000) / 10000);
                if (ticks.length >= 60) break;
            }
        } else {
            for (let v = rawStart; v <= rawEnd + 0.0001; v += step) {
                ticks.push(Math.round(v * 10000) / 10000);
                if (ticks.length >= 60) break;
            }
        }
        if (ticks.length === 0) ticks.push(minVal);
        return ticks;
    }, [rawStart, rawEnd, step, isReversed, minVal]);

    // Clamping helper to guarantee currentN is ALWAYS valid and on the line
    const getClampedValidN = useCallback((targetVal) => {
        if (!tickValues || tickValues.length === 0) return 0;
        let t = Number.isFinite(targetVal) ? targetVal : tickValues[0];
        t = Math.max(minVal, Math.min(maxVal, t));
        let closest = tickValues[0];
        let minDist = Infinity;
        for (const val of tickValues) {
            const d = Math.abs(val - t);
            if (d < minDist) {
                minDist = d;
                closest = val;
            }
        }
        return closest;
    }, [minVal, maxVal, tickValues]);

    // Initial default start value for pointer in play mode
    const defaultStartVal = useMemo(() => {
        if (Number.isFinite(config.currentValue)) return Number(config.currentValue);
        if (Number.isFinite(config.startVal)) return Number(config.startVal);
        if (Number.isFinite(config.initialValue)) return Number(config.initialValue);
        return (0 >= minVal && 0 <= maxVal) ? 0 : minVal;
    }, [config.currentValue, config.startVal, config.initialValue, minVal, maxVal]);

    // User selected value for n (if user interacted in play mode)
    const [userN, setUserN] = useState(null);

    // Current value for n: user-selected value if set and valid, otherwise clamped start value
    const currentN = useMemo(() => {
        if (!preview && userN !== null && userN >= minVal && userN <= maxVal && tickValues.includes(userN)) {
            return userN;
        }
        return getClampedValidN(defaultStartVal);
    }, [preview, userN, minVal, maxVal, tickValues, defaultStartVal, getClampedValidN]);

    // Continuous dragging value for smooth 60fps tracking like Number Line Quiz
    const [dragN, setDragN] = useState(null);
    const [isDraggingPointer, setIsDraggingPointer] = useState(false);

    const containerRef = useRef(null);
    const nlWrapperRef = useRef(null);
    const svgRef = useRef(null);
    const eqCardRef = useRef(null);

    // Side configuration for vertical mode:
    // Default: numbers on LEFT, pointer on RIGHT
    // Swapped position: pointer on LEFT, numbers on RIGHT
    const isSwapped = Boolean(config.swapSides) || (config.pointerSide === 'left' && config.numbersSide === 'right');
    const numbersSide = isVertical
        ? (isSwapped ? 'right' : (config.numbersSide || 'left'))
        : (config.numbersSide || 'top');
    const pointerSide = isVertical
        ? (isSwapped ? 'left' : (config.pointerSide || 'right'))
        : (config.pointerSide || 'bottom');

    // Number line dimensions in true 1:1 pixels (never stretched or squeezed!)
    const svgWidth = isVertical ? 160 : nlLength;
    const svgHeight = isVertical ? nlLength : 130;
    const padding = showArrows ? 32 : 18;
    const usableLength = nlLength - 2 * padding;

    // Stroke width and font sizes in real pixels
    const strokeWidth = thickness;
    const tickWidth = Math.max(1.5, strokeWidth * 0.9);
    const N_ticks = tickValues.length;
    const fontSize = isVertical
        ? Math.min(18, Math.max(12, Math.round(nlLength / (Math.max(6, N_ticks) * 2.8))))
        : Math.min(18, Math.max(12, Math.round(nlLength / (Math.max(6, N_ticks) * 3.2))));

    // Axis center coordinates in real pixels
    let centerX = 80;
    let tickX1 = centerX - 12;
    let tickX2 = centerX + 12;
    let numberX = centerX + 22;
    let numberAnchor = 'start';

    if (isVertical) {
        if (numbersSide === 'left' && pointerSide === 'left') {
            // Both on LEFT: Axis on right side of wrapper (122px).
            // Pointer knob (42px wide) touches tick at 106px (spans 64px..106px).
            // Numbers end at 54px, giving 10px clear margin.
            centerX = 122;
            tickX1 = 106;
            tickX2 = 126;
            numberX = 54;
            numberAnchor = 'end';
        } else if (numbersSide === 'right' && pointerSide === 'right') {
            // Both on RIGHT: Axis on left side of wrapper (38px).
            // Pointer knob touches tick at 54px (spans 54px..96px).
            // Numbers start at 106px, giving 10px clear margin.
            centerX = 38;
            tickX1 = 34;
            tickX2 = 54;
            numberX = 106;
            numberAnchor = 'start';
        } else if (numbersSide === 'left' && pointerSide === 'right') {
            // Numbers Left, Pointer Right: Axis centered at 80px.
            // Pointer touches tick at 92px (spans 92px..134px).
            // Numbers end at 56px.
            centerX = 80;
            tickX1 = 68;
            tickX2 = 92;
            numberX = 56;
            numberAnchor = 'end';
        } else {
            // Numbers Right, Pointer Left: Axis centered at 80px.
            // Pointer touches tick at 68px (spans 26px..68px).
            // Numbers start at 104px.
            centerX = 80;
            tickX1 = 68;
            tickX2 = 92;
            numberX = 104;
            numberAnchor = 'start';
        }
    }
    const centerY = showNumbers ? 46 : 65;

    // Convert value val to pixel coordinate along the line (strictly clamped)
    const valueToPos = useCallback((val) => {
        const clampedVal = Math.max(minVal, Math.min(maxVal, Number.isFinite(val) ? val : minVal));
        const ratio = maxVal !== minVal ? (clampedVal - minVal) / (maxVal - minVal) : 0.5;
        const clampedRatio = Math.max(0, Math.min(1, ratio));

        if (isVertical) {
            // Standard vertical: bottom is min, top is max
            return isReversed
                ? (padding + clampedRatio * usableLength)
                : (nlLength - padding - clampedRatio * usableLength);
        } else {
            // Standard horizontal: left is min, right is max
            return isReversed
                ? (nlLength - padding - clampedRatio * usableLength)
                : (padding + clampedRatio * usableLength);
        }
    }, [isVertical, isReversed, minVal, maxVal, usableLength, padding, nlLength]);

    // Convert event client coordinate back to value n along the line
    const clientToValue = useCallback((clientCoord, rect) => {
        let ratio;
        if (isVertical) {
            const svgY = (clientCoord - rect.top);
            if (isReversed) {
                ratio = (svgY - padding) / usableLength;
            } else {
                ratio = (nlLength - padding - svgY) / usableLength;
            }
        } else {
            const svgX = (clientCoord - rect.left);
            if (isReversed) {
                ratio = (nlLength - padding - svgX) / usableLength;
            } else {
                ratio = (svgX - padding) / usableLength;
            }
        }
        ratio = Math.max(0, Math.min(1, ratio));
        return minVal + ratio * (maxVal - minVal);
    }, [isVertical, isReversed, minVal, maxVal, usableLength, padding, nlLength]);

    // ----------------------------------------------------
    // Pointer Dragging (Behavior matching Number Line Quiz)
    // ----------------------------------------------------
    const handlePointerDragStart = (e) => {
        if (preview) return; // In editor mode, whole surface drags the number line
        e.stopPropagation();
        e.preventDefault();
        setIsDraggingPointer(true);

        const svgEl = svgRef.current;
        if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();

        const getCoord = (evt) => evt.touches ? (isVertical ? evt.touches[0].clientY : evt.touches[0].clientX) : (isVertical ? evt.clientY : evt.clientX);
        const rawVal = clientToValue(getCoord(e), rect);
        setDragN(rawVal);

        const closest = getClampedValidN(rawVal);
        if (closest !== currentN) {
            setUserN(closest);
            const normalized = maxVal !== minVal ? (closest - minVal) / (maxVal - minVal) : 0.5;
            playTickSound(300 + normalized * 500);
        }

        const handleMove = (moveEvt) => {
            moveEvt.preventDefault();
            const coord = getCoord(moveEvt);
            const currentRaw = clientToValue(coord, rect);
            setDragN(currentRaw);

            const snapped = getClampedValidN(currentRaw);
            setUserN(prev => {
                if (snapped !== prev) {
                    const normalized = maxVal !== minVal ? (snapped - minVal) / (maxVal - minVal) : 0.5;
                    playTickSound(300 + normalized * 500);
                    return snapped;
                }
                return prev;
            });
        };

        const handleUp = () => {
            setIsDraggingPointer(false);
            setDragN(null); // Snaps with spring animation

            setUserN(prev => {
                const finalN = prev !== null ? prev : getClampedValidN(defaultStartVal);
                return finalN;
            });

            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
    };

    // ----------------------------------------------------
    // Number Line Move & Resize (Editor Mode)
    // ----------------------------------------------------
    const handleNLMoveStart = (e) => {
        if (!preview) return;
        e.stopPropagation();
        e.preventDefault();
        if (onSelect) onSelect();

        const parent = containerRef.current?.closest('.slide-canvas') || containerRef.current;
        const rect = parent.getBoundingClientRect();

        const startClientX = e.touches ? e.touches[0].clientX : e.clientX;
        const startClientY = e.touches ? e.touches[0].clientY : e.clientY;
        const startNLX = nlX;
        const startNLY = nlY;

        const handleMove = (evt) => {
            evt.preventDefault();
            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

            const dxPercent = ((clientX - startClientX) / rect.width) * 100;
            const dyPercent = ((clientY - startClientY) / rect.height) * 100;

            const newX = Math.round(Math.max(5, Math.min(95, startNLX + dxPercent)));
            const newY = Math.round(Math.max(5, Math.min(95, startNLY + dyPercent)));

            if (onConfigChange) {
                onConfigChange({ nlX: newX, nlY: newY });
            }
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
    };

    const handleNLResizeStart = (e, edge) => {
        if (!preview) return;
        e.stopPropagation();
        e.preventDefault();

        const startClientX = e.touches ? e.touches[0].clientX : e.clientX;
        const startClientY = e.touches ? e.touches[0].clientY : e.clientY;
        const startLength = nlLength;

        const handleMove = (evt) => {
            evt.preventDefault();
            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

            let delta;
            if (isVertical) {
                delta = edge === 'bottom' ? (clientY - startClientY) : (startClientY - clientY);
            } else {
                delta = edge === 'right' ? (clientX - startClientX) : (startClientX - clientX);
            }

            const newLength = Math.max(220, Math.min(880, Math.round(startLength + delta)));
            if (onConfigChange) {
                onConfigChange({ nlLength: newLength });
            }
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
    };

    // ----------------------------------------------------
    // Equation Card Interaction (Move, Resize, Rotate in Editor)
    // ----------------------------------------------------
    const handleEquationDragStart = (e) => {
        if (!preview) return; // Only moveable in Editor
        e.stopPropagation();
        if (onSelect) onSelect();

        const parent = containerRef.current?.closest('.slide-canvas') || containerRef.current;
        const rect = parent.getBoundingClientRect();

        const startClientX = e.touches ? e.touches[0].clientX : e.clientX;
        const startClientY = e.touches ? e.touches[0].clientY : e.clientY;
        const startEqX = equationX;
        const startEqY = equationY;

        const handleMove = (evt) => {
            evt.preventDefault();
            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

            const dxPercent = ((clientX - startClientX) / rect.width) * 100;
            const dyPercent = ((clientY - startClientY) / rect.height) * 100;

            const newX = Math.round(Math.max(10, Math.min(90, startEqX + dxPercent)));
            const newY = Math.round(Math.max(10, Math.min(90, startEqY + dyPercent)));

            if (onConfigChange) {
                onConfigChange({ equationX: newX, equationY: newY });
            }
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
    };

    const handleRotateStart = (e) => {
        e.stopPropagation();
        e.preventDefault();

        const cardEl = eqCardRef.current;
        if (!cardEl) return;
        const cardRect = cardEl.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;

        const handleMove = (evt) => {
            evt.preventDefault();
            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

            const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
            let angleDeg = Math.round(angleRad * (180 / Math.PI)) + 90;
            if (angleDeg < 0) angleDeg += 360;
            // Snap to 0, 90, 180, 270 if close
            if (Math.abs(angleDeg % 90) < 5 || Math.abs((angleDeg % 90) - 90) < 5) {
                angleDeg = Math.round(angleDeg / 90) * 90;
            }

            if (onConfigChange) {
                onConfigChange({ equationRotation: angleDeg % 360 });
            }
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
    };

    const handleResizeStart = (e) => {
        e.stopPropagation();
        e.preventDefault();

        const startY = e.touches ? e.touches[0].clientY : e.clientY;
        const startSize = equationFontSize;

        const handleMove = (evt) => {
            evt.preventDefault();
            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
            const dy = clientY - startY;
            const newSize = Math.max(16, Math.min(56, Math.round(startSize + dy * 0.4)));

            if (onConfigChange) {
                onConfigChange({ equationFontSize: newSize });
            }
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
    };

    // Parse template structure for stable non-jittering equation rendering
    const templateParts = useMemo(() => {
        return parseEquationTemplate(equationTemplate);
    }, [equationTemplate]);

    // Precalculate all possible equations across all ticks in the current range
    // Sizing slots to the maximums ensures the box NEVER resizes when moving the pointer!
    const allEquations = useMemo(() => {
        return tickValues.map(val => {
            const eq = processEquation(equationTemplate, val);
            let varDisplay = '';
            if (templateParts.varType === 'superscript') {
                varDisplay = toSuperscript(val);
            } else if (templateParts.varType === 'normal') {
                varDisplay = String(val);
            }
            return {
                val,
                varDisplay,
                fracObj: eq.fracObj,
                resultDisplay: eq.resultDisplay,
                lhsFormatted: eq.lhsFormatted
            };
        });
    }, [tickValues, equationTemplate, templateParts]);

    // Active item matching current value of n
    const activeEqItem = useMemo(() => {
        const found = allEquations.find(item => Math.abs(item.val - currentN) < 0.0001);
        return found || allEquations[0] || {
            val: currentN,
            varDisplay: templateParts.varType === 'superscript' ? toSuperscript(currentN) : String(currentN),
            fracObj: null,
            resultDisplay: '?',
            lhsFormatted: ''
        };
    }, [allEquations, currentN, templateParts]);

    // Position of the pointer (continuous while dragging, snapped when idle)
    const activePointerValue = (isDraggingPointer && dragN !== null) ? dragN : currentN;
    const pointerPos = valueToPos(activePointerValue);

    // Pointer placement in wrapper (pixel-perfect alignment to tick endpoints)
    let pointerStyle;
    if (isVertical) {
        if (pointerSide === 'right') {
            // Pointer on right of axis, pointing LEFT at tick endpoint (tickX2)
            pointerStyle = {
                left: `${tickX2}px`,
                top: `${pointerPos}px`,
                transform: 'translate(0, -50%)',
                pointerEvents: preview ? 'none' : 'auto'
            };
        } else {
            // Pointer on left of axis, pointing RIGHT at tick endpoint (tickX1)
            pointerStyle = {
                left: `${tickX1}px`,
                top: `${pointerPos}px`,
                transform: 'translate(-100%, -50%)',
                pointerEvents: preview ? 'none' : 'auto'
            };
        }
    } else {
        // Horizontal: pointer below axis, pointing UP at tick endpoint (centerY + 10)
        pointerStyle = {
            left: `${pointerPos}px`,
            top: `${centerY + 10}px`,
            transform: 'translate(-50%, 0)',
            pointerEvents: preview ? 'none' : 'auto'
        };
    }

    // Dynamic number line wrapper style based on nlX, nlY, and nlLength in true pixels
    const nlWrapperStyle = isVertical ? {
        left: `${nlX}%`,
        top: `${nlY}%`,
        width: `${svgWidth}px`,
        height: `${nlLength}px`,
        transform: 'translate(-50%, -50%)',
        position: 'absolute'
    } : {
        left: `${nlX}%`,
        top: `${nlY}%`,
        width: `${nlLength}px`,
        height: `${svgHeight}px`,
        transform: 'translate(-50%, -50%)',
        position: 'absolute'
    };

    return (
        <div
            ref={containerRef}
            className={`explorenl-cartridge ${preview ? 'is-preview' : 'is-play'}`}
            onClick={() => {
                if (preview && onSelect) onSelect();
            }}
        >
            {/* ─── Number Line (Whole surface draggable in editor, resizable via handles) ─── */}
            <div
                ref={nlWrapperRef}
                className={`explorenl-nl-wrapper ${orientation} ${preview && isSelected ? 'is-selected' : ''}`}
                style={nlWrapperStyle}
                onMouseDown={preview ? handleNLMoveStart : undefined}
                onTouchStart={preview ? handleNLMoveStart : undefined}
            >
                {/* SVG rebuilt in true 1:1 pixels (never squeezed or distorted) */}
                <svg
                    ref={svgRef}
                    className="explorenl-svg"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                >
                    {isVertical ? (
                        <>
                            {/* Top Arrowhead */}
                            {showArrows && (
                                <polygon
                                    points={`${centerX},10 ${centerX - 7},24 ${centerX + 7},24`}
                                    fill={lineColor}
                                />
                            )}
                            {/* Bottom Arrowhead */}
                            {showArrows && (
                                <polygon
                                    points={`${centerX},${nlLength - 10} ${centerX - 7},${nlLength - 24} ${centerX + 7},${nlLength - 24}`}
                                    fill={lineColor}
                                />
                            )}
                            {/* Main Axis */}
                            <line
                                x1={centerX}
                                y1={showArrows ? 20 : padding}
                                x2={centerX}
                                y2={showArrows ? (nlLength - 20) : (nlLength - padding)}
                                stroke={lineColor}
                                strokeWidth={strokeWidth}
                                strokeLinecap={showArrows ? "round" : "butt"}
                            />
                            {/* Ticks & Numbers */}
                            {tickValues.map((val, i) => {
                                const y = valueToPos(val);
                                const isSelectedVal = val === currentN;

                                return (
                                    <g key={`v-tick-${i}`}>
                                        <line
                                            x1={tickX1}
                                            y1={y}
                                            x2={tickX2}
                                            y2={y}
                                            stroke={lineColor}
                                            strokeWidth={isSelectedVal ? tickWidth * 1.3 : tickWidth}
                                            strokeLinecap="round"
                                        />
                                        {showNumbers && (
                                            <text
                                                x={numberX}
                                                y={y + fontSize * 0.35}
                                                fill={isSelectedVal ? pointerColor : numberColor}
                                                fontSize={isSelectedVal ? fontSize * 1.15 : fontSize}
                                                fontWeight="bold"
                                                fontFamily="'Outfit', 'Nunito', 'Fira Sans', sans-serif"
                                                textAnchor={numberAnchor}
                                                className={`explorenl-tick-label ${isSelectedVal ? 'active' : ''}`}
                                            >
                                                {val}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </>
                    ) : (
                        <>
                            {/* Left Arrowhead */}
                            {showArrows && (
                                <polygon
                                    points={`10,${centerY} 24,${centerY - 7} 24,${centerY + 7}`}
                                    fill={lineColor}
                                />
                            )}
                            {/* Right Arrowhead */}
                            {showArrows && (
                                <polygon
                                    points={`${nlLength - 10},${centerY} ${nlLength - 24},${centerY - 7} ${nlLength - 24},${centerY + 7}`}
                                    fill={lineColor}
                                />
                            )}
                            {/* Main Axis */}
                            <line
                                x1={showArrows ? 20 : padding}
                                y1={centerY}
                                x2={showArrows ? (nlLength - 20) : (nlLength - padding)}
                                y2={centerY}
                                stroke={lineColor}
                                strokeWidth={strokeWidth}
                                strokeLinecap={showArrows ? "round" : "butt"}
                            />
                            {/* Ticks & Numbers */}
                            {tickValues.map((val, i) => {
                                const x = valueToPos(val);
                                const isSelectedVal = val === currentN;

                                return (
                                    <g key={`h-tick-${i}`}>
                                        <line
                                            x1={x}
                                            y1={centerY - 10}
                                            x2={x}
                                            y2={centerY + 10}
                                            stroke={lineColor}
                                            strokeWidth={isSelectedVal ? tickWidth * 1.3 : tickWidth}
                                            strokeLinecap="round"
                                        />
                                        {showNumbers && (
                                            <text
                                                x={x}
                                                y={centerY - 16}
                                                fill={isSelectedVal ? pointerColor : numberColor}
                                                fontSize={isSelectedVal ? fontSize * 1.15 : fontSize}
                                                fontWeight="bold"
                                                fontFamily="'Outfit', 'Nunito', 'Fira Sans', sans-serif"
                                                textAnchor="middle"
                                                className={`explorenl-tick-label ${isSelectedVal ? 'active' : ''}`}
                                            >
                                                {val}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </>
                    )}
                </svg>

                {/* Number Line Quiz Pointer (Unified vector SVG knob with exact alignment) */}
                <div
                    className={`explorenl-pointer ${orientation} ${isDraggingPointer ? 'dragging' : ''}`}
                    style={pointerStyle}
                    onMouseDown={!preview ? handlePointerDragStart : undefined}
                    onTouchStart={!preview ? handlePointerDragStart : undefined}
                    title={preview ? undefined : "Drag to explore values"}
                >
                    {isVertical ? (
                        pointerSide === 'right' ? (
                            /* Pointer on right, tip pointing LEFT */
                            <svg width="42" height="32" viewBox="0 0 42 32" className="explorenl-pointer-svg">
                                <polygon points="0,16 10,7 10,25" fill={pointerColor} />
                                <rect x="10" y="0" width="32" height="32" rx="6" fill={pointerColor} />
                            </svg>
                        ) : (
                            /* Pointer on left, tip pointing RIGHT */
                            <svg width="42" height="32" viewBox="0 0 42 32" className="explorenl-pointer-svg">
                                <rect x="0" y="0" width="32" height="32" rx="6" fill={pointerColor} />
                                <polygon points="42,16 32,7 32,25" fill={pointerColor} />
                            </svg>
                        )
                    ) : (
                        /* Horizontal: Pointer on bottom, tip pointing UP */
                        <svg width="32" height="42" viewBox="0 0 32 42" className="explorenl-pointer-svg">
                            <polygon points="16,0 7,10 25,10" fill={pointerColor} />
                            <rect x="0" y="10" width="32" height="32" rx="6" fill={pointerColor} />
                        </svg>
                    )}
                </div>

                {/* Editor Resize handles for Number Line endpoints */}
                {preview && isSelected && (
                    <>
                        {isVertical ? (
                            <>
                                <div
                                    className="explorenl-nl-resize-handle top"
                                    style={{ left: `${centerX}px` }}
                                    onMouseDown={(e) => handleNLResizeStart(e, 'top')}
                                    onTouchStart={(e) => handleNLResizeStart(e, 'top')}
                                    title="Drag to resize line length"
                                >
                                    ▲
                                </div>
                                <div
                                    className="explorenl-nl-resize-handle bottom"
                                    style={{ left: `${centerX}px` }}
                                    onMouseDown={(e) => handleNLResizeStart(e, 'bottom')}
                                    onTouchStart={(e) => handleNLResizeStart(e, 'bottom')}
                                    title="Drag to resize line length"
                                >
                                    ▼
                                </div>
                            </>
                        ) : (
                            <>
                                <div
                                    className="explorenl-nl-resize-handle left"
                                    onMouseDown={(e) => handleNLResizeStart(e, 'left')}
                                    onTouchStart={(e) => handleNLResizeStart(e, 'left')}
                                    title="Drag to resize line length"
                                >
                                    ◀
                                </div>
                                <div
                                    className="explorenl-nl-resize-handle right"
                                    onMouseDown={(e) => handleNLResizeStart(e, 'right')}
                                    onTouchStart={(e) => handleNLResizeStart(e, 'right')}
                                    title="Drag to resize line length"
                                >
                                    ▶
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* ─── Movable & Rotatable Equation Card ─── */}
            <div
                ref={eqCardRef}
                className={`explorenl-equation-card ${preview ? 'is-editor' : ''} ${isSelected ? 'selected' : ''}`}
                style={{
                    left: `${equationX}%`,
                    top: `${equationY}%`,
                    transform: `translate(-50%, -50%) rotate(${equationRotation}deg)`,
                    backgroundColor: equationBg,
                    border: `3px solid ${equationBorder}`,
                    color: equationColor,
                    fontSize: `${equationFontSize}px`
                }}
                onMouseDown={handleEquationDragStart}
                onTouchStart={handleEquationDragStart}
            >
                {/* Stabilized Equation Layout (No resize, zero jitter) */}
                <div className="explorenl-equation-grid">
                    {/* Prefix: Numbers/symbols before n that NEVER change (e.g. '2' in '2!n =', '8 + ' in '8 + n =') */}
                    {templateParts.prefix && (
                        <span className="explorenl-eq-prefix">
                            {templateParts.prefix}
                        </span>
                    )}

                    {/* Variable n Slot: sized to max width across all ticks, colored with pointerColor */}
                    {templateParts.varType !== 'none' && (
                        <div
                            className={`explorenl-eq-slot explorenl-eq-slot-var ${templateParts.suffix ? 'has-suffix' : ''}`}
                            style={{ color: pointerColor }}
                        >
                            {allEquations.map(({ val, varDisplay }) => {
                                const isActive = Math.abs(val - activeEqItem.val) < 0.0001;
                                return (
                                    <span
                                        key={`var-${val}`}
                                        className={`explorenl-eq-item ${isActive ? 'is-active' : 'is-hidden'}`}
                                        aria-hidden={!isActive}
                                    >
                                        {varDisplay}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Suffix: Numbers/symbols after n that NEVER change (e.g. '²' in 'n!2 =', ' × 3' in 'n * 3 =') */}
                    {templateParts.suffix && (
                        <span className="explorenl-eq-suffix">
                            {templateParts.suffix}
                        </span>
                    )}

                    {/* Equals Sign: Remains completely stationary in the exact same spot */}
                    {templateParts.hasEquals && (
                        <span className="explorenl-eq-equal">
                            =
                        </span>
                    )}

                    {/* Result Slot: sized to max width and height of all results (including fractions) */}
                    {templateParts.hasEquals && (
                        <div className="explorenl-eq-slot explorenl-eq-slot-rhs">
                            {allEquations.map(({ val, fracObj, resultDisplay }) => {
                                const isActive = Math.abs(val - activeEqItem.val) < 0.0001;
                                return (
                                    <div
                                        key={`rhs-${val}`}
                                        className={`explorenl-eq-item ${isActive ? 'is-active' : 'is-hidden'}`}
                                        aria-hidden={!isActive}
                                    >
                                        {fracObj ? (
                                            <span className="explorenl-fraction">
                                                <span className="explorenl-num">{fracObj.n}</span>
                                                <span className="explorenl-denom">{fracObj.d}</span>
                                            </span>
                                        ) : (
                                            <span>{resultDisplay || '?'}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Editor handles for equation card */}
                {preview && isSelected && (
                    <>
                        <div
                            className="explorenl-handle-rotate"
                            title="Rotate Equation"
                            onMouseDown={handleRotateStart}
                            onTouchStart={handleRotateStart}
                        >
                            🔄
                        </div>
                        <div
                            className="explorenl-handle-resize"
                            title="Resize Equation Font"
                            onMouseDown={handleResizeStart}
                            onTouchStart={handleResizeStart}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
