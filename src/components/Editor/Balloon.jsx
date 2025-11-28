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
                <path
                    d={`
                        M ${r} 0
                        H ${width - r}
                        Q ${width} 0 ${width} ${r}
                        V ${height - r}
                        Q ${width} ${height} ${width - r} ${height}
                        H ${tailBaseX + tailBaseWidth / 2}
                        L ${50 + tailX} ${50 + tailY}
                        L ${tailBaseX - tailBaseWidth / 2} ${height}
                        H ${r}
                        Q 0 ${height} 0 ${height - r}
                        V ${r}
                        Q 0 0 ${r} 0
                        Z
                    `}
                    fill={element.metadata?.backgroundColor || 'white'}
                    stroke="none"
                />
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
