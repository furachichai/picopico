import React, { useMemo } from 'react';
import './Rulers.css';

const Rulers = ({ onStartGuideDrag, cursorPos, children }) => {
    // Generate horizontal ticks for 360px
    const horizontalTicks = useMemo(() => {
        const elements = [];
        for (let x = 10; x < 360; x += 10) {
            const isMajor = x % 50 === 0;
            elements.push(
                <line
                    key={`h-tick-${x}`}
                    x1={x}
                    y1={isMajor ? 12 : 16}
                    x2={x}
                    y2={22}
                    stroke={isMajor ? '#64748B' : '#94A3B8'}
                    strokeWidth="1"
                />
            );
            if (isMajor) {
                elements.push(
                    <text
                        key={`h-label-${x}`}
                        x={x + 2}
                        y={10}
                        fill="#64748B"
                        fontSize="8"
                        fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
                    >
                        {x}
                    </text>
                );
            }
        }
        return elements;
    }, []);

    // Generate vertical ticks for 640px
    const verticalTicks = useMemo(() => {
        const elements = [];
        for (let y = 10; y < 640; y += 10) {
            const isMajor = y % 50 === 0;
            elements.push(
                <line
                    key={`v-tick-${y}`}
                    x1={isMajor ? 12 : 16}
                    y1={y}
                    x2={22}
                    y2={y}
                    stroke={isMajor ? '#64748B' : '#94A3B8'}
                    strokeWidth="1"
                />
            );
            if (isMajor) {
                elements.push(
                    <text
                        key={`v-label-${y}`}
                        x={2}
                        y={y + 8}
                        fill="#64748B"
                        fontSize="7.5"
                        fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
                    >
                        {y}
                    </text>
                );
            }
        }
        return elements;
    }, []);

    return (
        <div className="canvas-with-rulers">
            {/* Top Row: Corner Box + Top Horizontal Ruler */}
            <div className="canvas-rulers-top-row">
                <div className="ruler-corner" title="Canvas Origin (0, 0)">
                    px
                </div>
                <div
                    className="ruler-bar horizontal"
                    title="Drag down onto the slide to create a horizontal guide"
                    onPointerDown={(e) => onStartGuideDrag('horizontal', e)}
                >
                    <svg width="360" height="22" className="ruler-svg">
                        {horizontalTicks}
                    </svg>
                    {cursorPos && cursorPos.x !== null && cursorPos.x >= 0 && cursorPos.x <= 360 && (
                        <div
                            className="ruler-cursor-indicator horizontal"
                            style={{ left: `${cursorPos.x}px` }}
                        />
                    )}
                </div>
            </div>

            {/* Bottom Row: Left Vertical Ruler + Slide Canvas */}
            <div className="canvas-rulers-bottom-row">
                <div
                    className="ruler-bar vertical"
                    title="Drag right onto the slide to create a vertical guide"
                    onPointerDown={(e) => onStartGuideDrag('vertical', e)}
                >
                    <svg width="22" height="640" className="ruler-svg">
                        {verticalTicks}
                    </svg>
                    {cursorPos && cursorPos.y !== null && cursorPos.y >= 0 && cursorPos.y <= 640 && (
                        <div
                            className="ruler-cursor-indicator vertical"
                            style={{ top: `${cursorPos.y}px` }}
                        />
                    )}
                </div>
                {children}
            </div>
        </div>
    );
};

export default Rulers;
