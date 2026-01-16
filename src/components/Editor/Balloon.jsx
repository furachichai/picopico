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
    const tailX = typeof element.metadata?.tailPos?.x === 'number' ? element.metadata.tailPos.x : 20;
    const tailY = typeof element.metadata?.tailPos?.y === 'number' ? element.metadata.tailPos.y : 60;

    // Use actual dimensions if available, matching the sticker's sizing logic
    // We map the percentage width/height to a virtual canvas of 360x640 for internal path calculations
    // This allows the SVG viewBox to match the sticker's aspect ratio
    const parentW = 360;
    const parentH = 640;

    // Default to ~200x100 if undefined (legacy fallback)
    const w = element.width ? (element.width / 100) * parentW : 200;
    const h = element.height ? (element.height / 100) * parentH : 100;

    const cx = w / 2;
    const cy = h / 2;

    // Tail tip position (absolute in viewBox)
    const tx = cx + tailX;
    const ty = cy + tailY;

    // Determine which edge the tail should originate from based on angle
    const angle = Math.atan2(tailY, tailX) * (180 / Math.PI);

    // Determine edge: right (-45 to 45), bottom (45 to 135), left (135 to 180 or -180 to -135), top (-135 to -45)
    let edge;
    if (angle >= -45 && angle < 45) {
        edge = 'right';
    } else if (angle >= 45 && angle < 135) {
        edge = 'bottom';
    } else if (angle >= -135 && angle < -45) {
        edge = 'top';
    } else {
        edge = 'left';
    }

    // Tail base width (half-width of the tail base)
    const tailBaseHalf = 10;

    // Generate path based on edge
    let path;
    const padding = 10; // Less padding to maximize space
    const r = 20; // Corner radius

    // Safety bounds
    const left = padding;
    const right = w - padding;
    const top = padding;
    const bottom = h - padding;

    // Clamp tail base position to stay within the edge (taking corners into account)
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    if (edge === 'bottom') {
        const tailWidth = 20; // Width of tail at base
        const baseX = cx; // Fixed at center

        path = `
            M ${left + r} ${top}
            L ${right - r} ${top}
            Q ${right} ${top} ${right} ${top + r}
            L ${right} ${bottom - r}
            Q ${right} ${bottom} ${right - r} ${bottom}
            L ${baseX + tailWidth} ${bottom}
            Q ${baseX + tailWidth * 0.5} ${bottom + 5} ${tx} ${ty}
            Q ${baseX - tailWidth * 0.5} ${bottom + 5} ${baseX - tailWidth} ${bottom}
            L ${left + r} ${bottom}
            Q ${left} ${bottom} ${left} ${bottom - r}
            L ${left} ${top + r}
            Q ${left} ${top} ${left + r} ${top}
            Z
        `;
    } else if (edge === 'top') {
        const tailWidth = 20;
        const baseX = cx; // Fixed at center

        path = `
            M ${left + r} ${top}
            L ${baseX - tailWidth} ${top}
            Q ${baseX - tailWidth * 0.5} ${top - 5} ${tx} ${ty}
            Q ${baseX + tailWidth * 0.5} ${top - 5} ${baseX + tailWidth} ${top}
            L ${right - r} ${top}
            Q ${right} ${top} ${right} ${top + r}
            L ${right} ${bottom - r}
            Q ${right} ${bottom} ${right - r} ${bottom}
            L ${left + r} ${bottom}
            Q ${left} ${bottom} ${left} ${bottom - r}
            L ${left} ${top + r}
            Q ${left} ${top} ${left + r} ${top}
            Z
        `;
    } else if (edge === 'right') {
        const tailWidth = 20;
        const baseY = cy; // Fixed at center

        path = `
            M ${left + r} ${top}
            L ${right - r} ${top}
            Q ${right} ${top} ${right} ${top + r}
            L ${right} ${baseY - tailWidth}
            Q ${right + 5} ${baseY - tailWidth * 0.5} ${tx} ${ty}
            Q ${right + 5} ${baseY + tailWidth * 0.5} ${right} ${baseY + tailWidth}
            L ${right} ${bottom - r}
            Q ${right} ${bottom} ${right - r} ${bottom}
            L ${left + r} ${bottom}
            Q ${left} ${bottom} ${left} ${bottom - r}
            L ${left} ${top + r}
            Q ${left} ${top} ${left + r} ${top}
            Z
        `;
    } else {
        // edge === 'left'
        const tailWidth = 20;
        const baseY = cy; // Fixed at center

        path = `
            M ${left + r} ${top}
            L ${right - r} ${top}
            Q ${right} ${top} ${right} ${top + r}
            L ${right} ${bottom - r}
            Q ${right} ${bottom} ${right - r} ${bottom}
            L ${left + r} ${bottom}
            Q ${left} ${bottom} ${left} ${bottom - r}
            L ${left} ${baseY + tailWidth}
            Q ${left - 5} ${baseY + tailWidth * 0.5} ${tx} ${ty}
            Q ${left - 5} ${baseY - tailWidth * 0.5} ${left} ${baseY - tailWidth}
            L ${left} ${top + r}
            Q ${left} ${top} ${left + r} ${top}
            Z
        `;
    }

    const backgroundColor = element.metadata?.backgroundColor || '#ffffff';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg
                viewBox={`0 0 ${w} ${h}`}
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 0, pointerEvents: 'none', filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.1))' }}
            >
                <path d={path} fill={backgroundColor} stroke="black" strokeWidth="2" strokeLinejoin="round" />
            </svg>

            {/* Text Container: Handles centering */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    boxSizing: 'border-box',
                    pointerEvents: 'none', // Container shouldn't block, but child will be auto
                }}
            >
                {/* Editable Element: Handles text content */}
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
                        fontFamily: element.metadata?.fontFamily || 'monospace',
                        fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : '16px',
                        color: element.metadata?.color || 'black',
                        outline: 'none',
                        cursor: readOnly ? 'default' : 'text',
                        userSelect: readOnly ? 'none' : 'text',
                        // Let's stick to that logic for the input itself.
                        pointerEvents: readOnly ? 'none' : (isSelected ? 'auto' : 'none'),
                        whiteSpace: 'pre-wrap',
                        textAlign: 'center',
                        width: '100%',
                        display: 'block', // Important: Layout text as block, not flex items
                        // Counter-flip the text so it stays readable when the container is flipped
                        transform: `scale(${flipX}, ${flipY})`
                    }}
                />
            </div>
        </div>
    );
};

export default Balloon;
