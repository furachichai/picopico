import React, { useRef, useEffect } from 'react';

const Balloon = ({ element, onChange, isSelected }) => {
    const textRef = useRef(null);

    // Sync content changes
    const handleInput = (e) => {
        onChange(element.id, { content: e.currentTarget.innerText });
    };

    // Tail position relative to center
    const tailX = element.metadata?.tailPos?.x || 0;
    const tailY = element.metadata?.tailPos?.y || 60;

    // Balloon dimensions (relative to SVG coordinate system 0-100)
    const width = 100;
    const height = 100;
    const r = 10; // Corner radius

    // Tail base logic
    const tailBaseWidth = 20;
    const tailBaseX = 50; // Center

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Background Shape */}
            <svg
                width="100%"
                height="100%"
                style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                {(() => {
                    // Calculate angle in degrees
                    const angle = Math.atan2(tailY, tailX) * (180 / Math.PI);

                    // Normalize angle to 0-360 for easier logic
                    const normAngle = (angle + 360) % 360;

                    let side = 'bottom';
                    // 45 to 135 -> Bottom (90 center)
                    if (normAngle >= 45 && normAngle < 135) side = 'bottom';
                    // 135 to 225 -> Left (180 center)
                    else if (normAngle >= 135 && normAngle < 225) side = 'left';
                    // 225 to 315 -> Top (270 center)
                    else if (normAngle >= 225 && normAngle < 315) side = 'top';
                    // 315 to 45 -> Right (0 center)
                    else side = 'right';

                    const cx = 50;
                    const cy = 50;
                    const rx = 48;
                    const ry = 36; // More oblong
                    const tipX = cx + tailX;
                    const tipY = cy + tailY;

                    let d = '';

                    // Ellipse equation calculations for gap points (hw=8)
                    // Top/Bottom (x offset 8): y_rel = 35.5 -> y = 14.5, 85.5
                    // Left/Right (y offset 8): x_rel = 46.8 -> x = 3.2, 96.8

                    if (side === 'top') {
                        // Gap at top. Right: (58, 14.5), Left: (42, 14.5)
                        d = `
                            M 58 14.5
                            A 48 36 0 1 1 42 14.5
                            Q 46 5 ${tipX} ${tipY}
                            Q 54 5 58 14.5
                            Z
                        `;
                    } else if (side === 'right') {
                        // Gap at right. Bottom: (96.8, 58), Top: (96.8, 42)
                        d = `
                            M 96.8 58
                            A 48 36 0 1 1 96.8 42
                            Q 105 46 ${tipX} ${tipY}
                            Q 105 54 96.8 58
                            Z
                        `;
                    } else if (side === 'bottom') {
                        // Gap at bottom. Left: (42, 85.5), Right: (58, 85.5)
                        d = `
                            M 42 85.5
                            A 48 36 0 1 1 58 85.5
                            Q 54 95 ${tipX} ${tipY}
                            Q 46 95 42 85.5
                            Z
                        `;
                    } else if (side === 'left') {
                        // Gap at left. Top: (3.2, 42), Bottom: (3.2, 58)
                        d = `
                            M 3.2 42
                            A 48 36 0 1 1 3.2 58
                            Q -5 54 ${tipX} ${tipY}
                            Q -5 46 3.2 42
                            Z
                        `;
                    }

                    return (
                        <path
                            d={d}
                            fill={element.metadata?.backgroundColor || 'white'}
                            stroke="black"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    );
                })()}
            </svg>

            {/* Text Content */}
            <div
                ref={textRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={() => {
                    // Ensure sync on blur
                    if (textRef.current) {
                        onChange(element.id, { content: textRef.current.innerText });
                    }
                }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontFamily: element.metadata?.fontFamily || 'monospace',
                    fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : '16px',
                    color: element.metadata?.color || 'black',
                    padding: '10px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'text',
                    userSelect: 'text',
                    pointerEvents: isSelected ? 'auto' : 'none',
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden'
                }}
            >
                {element.content}
            </div>
        </div>
    );
};

export default Balloon;
