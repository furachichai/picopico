import React from 'react';
import './NumberLine.css';

/**
 * Non-interactive NumberLine component.
 * Supports:
 * - Orientation: 'horizontal' | 'vertical'
 * - Range: startNumber to endNumber
 * - Step: tick interval
 * - Show/hide numbers: showNumbers (boolean)
 * - Color: custom color for line, ticks, arrowheads, and labels
 * - Line thickness
 */
const NumberLine = ({ element }) => {
    const meta = element?.metadata || {};
    const orientation = meta.orientation === 'vertical' ? 'vertical' : 'horizontal';
    const startNumber = Number.isFinite(meta.startNumber) ? meta.startNumber : 0;
    const endNumber = Number.isFinite(meta.endNumber) ? meta.endNumber : 10;
    const rawStep = Number(meta.step) || 1;
    const step = Math.max(0.001, Math.abs(rawStep));
    const showArrows = meta.showArrows ?? true;

    // Numbers 4-state mode: 'match' (same color as line), 'invisible', 'black', 'white'
    let numberColorMode = meta.numberColorMode;
    if (!numberColorMode) {
        numberColorMode = (meta.showNumbers ?? true) ? 'match' : 'invisible';
    }
    const showNumbers = numberColorMode !== 'invisible';

    const color = meta.symbolColor || meta.color || '#8B5CF6';
    const thickness = Math.max(1, Math.min(10, meta.thickness || 3));

    let numberColor = color;
    if (numberColorMode === 'black') numberColor = '#000000';
    else if (numberColorMode === 'white') numberColor = '#FFFFFF';

    // Generate tick values (max 50 to prevent performance degradation)
    const tickValues = [];
    const isReversed = startNumber > endNumber;
    if (isReversed) {
        for (let v = startNumber; v >= endNumber - 0.0001; v -= step) {
            tickValues.push(Math.round(v * 1000) / 1000);
            if (tickValues.length >= 50) break;
        }
    } else {
        for (let v = startNumber; v <= endNumber + 0.0001; v += step) {
            tickValues.push(Math.round(v * 1000) / 1000);
            if (tickValues.length >= 50) break;
        }
    }
    if (tickValues.length === 0) tickValues.push(startNumber);

    const N = tickValues.length;

    if (orientation === 'vertical') {
        const viewBox = "0 0 200 1000";
        const centerX = showNumbers ? 75 : 100;
        const padding = showArrows ? 60 : 35;
        const usableHeight = 1000 - 2 * padding;
        const fontSize = Math.min(42, Math.max(20, Math.round(420 / Math.max(6, N))));
        const strokeWidth = thickness * 2.5;
        const tickWidth = strokeWidth * 0.9;

        // When showArrows is false, line starts and ends exactly at the first and last marks
        const lineY1 = showArrows ? 45 : padding;
        const lineY2 = showArrows ? 955 : (1000 - padding);

        return (
            <div className="number-line-container">
                <svg className="number-line-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
                    {/* Top Arrowhead */}
                    {showArrows && (
                        <polygon
                            points={`${centerX},25 ${centerX - 12},48 ${centerX + 12},48`}
                            fill={color}
                        />
                    )}
                    {/* Bottom Arrowhead */}
                    {showArrows && (
                        <polygon
                            points={`${centerX},975 ${centerX - 12},952 ${centerX + 12},952`}
                            fill={color}
                        />
                    )}
                    {/* Main Axis */}
                    <line
                        x1={centerX}
                        y1={lineY1}
                        x2={centerX}
                        y2={lineY2}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap={showArrows ? "round" : "butt"}
                    />
                    {/* Ticks & Numbers */}
                    {(() => {
                        const hasOutline = numberColorMode === 'white' || numberColorMode === 'black';
                        const outlineStroke = numberColorMode === 'white' ? '#000000' : (numberColorMode === 'black' ? '#FFFFFF' : 'none');
                        const outlineWidth = hasOutline ? Math.max(3.5, fontSize * 0.12) : 0;

                        return tickValues.map((val, i) => {
                            const fraction = N === 1 ? 0.5 : (i / (N - 1));
                            // In vertical, standard number line has smaller values at bottom, larger at top
                            const y = isReversed
                                ? (padding + fraction * usableHeight)
                                : (1000 - padding - fraction * usableHeight);

                            return (
                                <g key={`v-tick-${i}`}>
                                    <line
                                        x1={centerX - 18}
                                        y1={y}
                                        x2={centerX + 18}
                                        y2={y}
                                        stroke={color}
                                        strokeWidth={tickWidth}
                                        strokeLinecap="round"
                                    />
                                    {showNumbers && (
                                        <text
                                            x={centerX + 35}
                                            y={y + fontSize * 0.35}
                                            fill={numberColor}
                                            stroke={outlineStroke}
                                            strokeWidth={outlineWidth}
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                            paintOrder="stroke fill"
                                            style={hasOutline ? { paintOrder: 'stroke fill' } : undefined}
                                            fontSize={fontSize}
                                            fontWeight="bold"
                                            fontFamily="'Outfit', 'Nunito', 'Fira Sans', sans-serif"
                                            textAnchor="start"
                                        >
                                            {val}
                                        </text>
                                    )}
                                </g>
                            );
                        });
                    })()}
                </svg>
            </div>
        );
    }

    // Horizontal Number Line
    const viewBox = "0 0 1000 200";
    const centerY = showNumbers ? 70 : 100;
    const padding = showArrows ? 60 : 35;
    const usableWidth = 1000 - 2 * padding;
    const fontSize = Math.min(42, Math.max(20, Math.round(420 / Math.max(6, N))));
    const strokeWidth = thickness * 2.5;
    const tickWidth = strokeWidth * 0.9;

    // When showArrows is false, line starts and ends exactly at the first and last marks
    const lineX1 = showArrows ? 45 : padding;
    const lineX2 = showArrows ? 955 : (1000 - padding);

    return (
        <div className="number-line-container">
            <svg className="number-line-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
                {/* Left Arrowhead */}
                {showArrows && (
                    <polygon
                        points={`25,${centerY} 48,${centerY - 12} 48,${centerY + 12}`}
                        fill={color}
                    />
                )}
                {/* Right Arrowhead */}
                {showArrows && (
                    <polygon
                        points={`975,${centerY} 952,${centerY - 12} 952,${centerY + 12}`}
                        fill={color}
                    />
                )}
                {/* Main Axis */}
                <line
                    x1={lineX1}
                    y1={centerY}
                    x2={lineX2}
                    y2={centerY}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap={showArrows ? "round" : "butt"}
                />
                {/* Ticks & Numbers */}
                {(() => {
                    const hasOutline = numberColorMode === 'white' || numberColorMode === 'black';
                    const outlineStroke = numberColorMode === 'white' ? '#000000' : (numberColorMode === 'black' ? '#FFFFFF' : 'none');
                    const outlineWidth = hasOutline ? Math.max(3.5, fontSize * 0.12) : 0;

                    return tickValues.map((val, i) => {
                        const fraction = N === 1 ? 0.5 : (i / (N - 1));
                        const x = padding + fraction * usableWidth;

                        return (
                            <g key={`h-tick-${i}`}>
                                <line
                                    x1={x}
                                    y1={centerY - 18}
                                    x2={x}
                                    y2={centerY + 18}
                                    stroke={color}
                                    strokeWidth={tickWidth}
                                    strokeLinecap="round"
                                />
                                {showNumbers && (
                                    <text
                                        x={x}
                                        y={centerY + 55}
                                        fill={numberColor}
                                        stroke={outlineStroke}
                                        strokeWidth={outlineWidth}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                        paintOrder="stroke fill"
                                        style={hasOutline ? { paintOrder: 'stroke fill' } : undefined}
                                        fontSize={fontSize}
                                        fontWeight="bold"
                                        fontFamily="'Outfit', 'Nunito', 'Fira Sans', sans-serif"
                                        textAnchor="middle"
                                    >
                                        {val}
                                    </text>
                                )}
                            </g>
                        );
                    });
                })()}
            </svg>
        </div>
    );
};

export default React.memo(NumberLine);
