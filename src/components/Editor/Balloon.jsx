import React, { useRef, useEffect } from 'react';

const Balloon = ({ element, onChange, isSelected, readOnly = false }) => {
    const textRef = useRef(null);
    const lastElementId = useRef(null);

    // Only set content when element changes, not on every render
    useEffect(() => {
        if (textRef.current && element.id !== lastElementId.current) {
            textRef.current.innerText = element.content || '';
            lastElementId.current = element.id;
        }
    }, [element.id, element.content]);

    // Sync content changes
    const handleInput = (e) => {
        if (readOnly) return;
        onChange(element.id, { content: e.currentTarget.innerText });
    };

    // Calculate inverse scale to fix text direction if parent is flipped
    const flipX = element.metadata?.flipX ? -1 : 1;
    const flipY = element.metadata?.flipY ? -1 : 1;

    // Tail position relative to center (safe defaults)
    // Center is 100, 50 in 200x100 space?
    // Let's assume the viewbox is 0 0 200 100
    const tailX = typeof element.metadata?.tailPos?.x === 'number' ? element.metadata.tailPos.x : 20;
    const tailY = typeof element.metadata?.tailPos?.y === 'number' ? element.metadata.tailPos.y : 60;

    // Generate Path
    // Ellipse approx:
    // M 40 10 Q 100 10 160 10 Q 190 10 190 50 Q 190 90 160 90 Q 100 90 40 90 Q 10 90 10 50 Q 10 10 40 10
    // Tail needs to connect.
    // Let's stick to a simple rect with rounded corners or ellipse.
    // tailX/Y are offsets from center? Or absolute coords?
    // In `Sticker.jsx` handleStart 'tail', we calculated dx/dy relative to previous.
    // Let's assume tailX/Y are relative to the center of the balloon (0,0 in sticker space? No, Sticker is element).
    // The balloon SVG is inside the sticker div.
    // If we want the tail to point to `tailPos` in metadata.
    // We'll draw a path that includes the tail.

    // Better simple balloon:
    // A rounded rect/ellipse from (10,10) to (190,90).
    // With a tail pointing to (100 + tailX, 50 + tailY).

    const w = 200;
    const h = 100;
    const cx = w / 2;
    const cy = h / 2;

    // Control point for tail base
    const tx = cx + tailX;
    const ty = cy + tailY;

    // Simple path: generic ellipse + line to tail?
    // Let's make a path that looks like a comic bubble.

    // We can use a simple SVG path.
    const path = `
        M 20 ${cy}
        Q 20 10 ${cx} 10
        Q 180 10 180 ${cy}
        Q 180 90 ${cx} 90
        Q 120 90 110 90
        L ${tx} ${ty}
        L 90 90
        Q 20 90 20 ${cy}
        Z
    `;

    const backgroundColor = element.metadata?.backgroundColor || '#ffffff';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg
                viewBox="0 0 200 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 0, pointerEvents: 'none' }}
            >
                <path d={path} fill={backgroundColor} stroke="black" strokeWidth="2" strokeLinejoin="round" />
            </svg>

            {/* Text Content */}
            <div
                ref={textRef}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={() => {
                    if (!readOnly && textRef.current) {
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
                    padding: '20px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: readOnly ? 'default' : 'text',
                    userSelect: readOnly ? 'none' : 'text',
                    pointerEvents: readOnly ? 'none' : (isSelected ? 'auto' : 'none'),
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    // Counter-flip the text so it stays readable when the container is flipped
                    transform: `scale(${flipX}, ${flipY})`
                }}
            />
        </div>
    );
};

export default Balloon;
