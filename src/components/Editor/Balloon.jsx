import React, { useRef, useEffect } from 'react';

const Balloon = ({ element, onChange, isSelected }) => {
    const textRef = useRef(null);
    const { width, height, metadata } = element;
    const { tailPos, backgroundColor, color, fontFamily, fontSize } = metadata;

    // Sync content only if not focused
    useEffect(() => {
        if (textRef.current && textRef.current.innerText !== element.content && document.activeElement !== textRef.current) {
            textRef.current.innerText = element.content;
        }
    }, [element.content]);

    const handleInput = (e) => {
        onChange(element.id, { content: e.target.innerText });
    };

    // Calculate tail path
    // tailPos is relative to center.
    // We want a curved tail.
    // Start: Bottom center (0, 50) in SVG coords relative to center?
    // Let's assume the SVG is 100x100 viewBox. Center is 50,50.
    // Bottom of bubble is roughly 50, 90 (if rx=45, ry=40).

    // Let's define the bubble shape first.
    // A slightly organic ellipse.
    const bubblePath = "M50,5 C75,5 95,25 95,50 C95,75 75,95 50,95 C25,95 5,75 5,50 C5,25 25,5 50,5 Z";

    // Tail logic
    // We need the tail to start from the bubble edge and go to tailPos.
    // tailPos is in pixels from center. We need to map it to SVG coords (0-100).
    // This is hard because we don't know the pixel size of the SVG here easily without refs.
    // BUT, we can just draw the tail as a separate absolute SVG that handles pixel coordinates, 
    // OR we assume the tailPos passed in is already adapted or we adapt it.
    // In Sticker.jsx, tailPos is pixels from center.

    // Let's use the absolute SVG approach for the tail like in Sticker.jsx, but render it HERE.
    // Actually, to make it merge nicely, it should be part of the same SVG or same visual layer.

    // Let's try to make the tail look good with a simple curve.
    // We'll draw the tail in a separate SVG overlay that is overflow visible.

    const tx = tailPos?.x || 0;
    const ty = tailPos?.y || 50;

    // Control point for curve. 
    // If tail goes right, curve down-right.
    // Simple quadratic: Midpoint + offset.
    const cx = tx * 0.5;
    const cy = ty * 0.5 + 20; // Curve downwards

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Tail SVG - Rendered absolutely behind */}
            <svg
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    overflow: 'visible',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            >
                <path
                    d={`M0,40 Q${cx},${cy} ${tx},${ty} Q${cx + 10},${cy} 20,40 Z`}
                    // Starts at 0,40 (relative to center) -> Curve -> Tip -> Curve -> 20,40
                    // This assumes the bubble bottom is around y=40 relative to center.
                    fill={backgroundColor}
                    stroke="black"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            </svg>

            {/* Main Bubble SVG */}
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1,
                    overflow: 'visible'
                }}
            >
                <path
                    d={bubblePath}
                    fill={backgroundColor}
                    stroke="black"
                    strokeWidth="2"
                />
            </svg>

            {/* Text Container */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '80%',
                    height: '80%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div
                    ref={textRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    style={{
                        width: '100%',
                        textAlign: 'center',
                        fontFamily: fontFamily,
                        fontSize: `${fontSize}px`,
                        color: color,
                        outline: 'none',
                        userSelect: 'text',
                        cursor: 'text',
                        pointerEvents: isSelected ? 'auto' : 'none',
                        wordBreak: 'break-word'
                    }}
                />
            </div>
        </div>
    );
};

export default Balloon;
