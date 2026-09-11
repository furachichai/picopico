import React, { useRef, useEffect, useState } from 'react';
import { resolveAssetUrl } from '../../utils/assetUrl';

// Scotch tape asset (served from /src/assets/banners/scotch_tape.png in dev, /assets/banners/scotch_tape.png in prod)
const SCOTCH_TAPE_SRC = resolveAssetUrl('/src/assets/banners/scotch_tape.png');

const Banner = ({ element, onChange, isSelected, readOnly = false }) => {
    const textRef = useRef(null);
    const containerRef = useRef(null);
    const lastElementId = useRef(null);

    // Derive dimensions dynamically and synchronously from element width/height percentage
    const widthPx = Math.max(40, Math.round(((element.width || 51) / 100) * 360));
    const heightPx = Math.max(30, Math.round(((element.height || 12.5) / 100) * 640));

    const [size, setSize] = useState({ width: widthPx, height: heightPx });

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                const el = containerRef.current;
                const w = el.offsetWidth || widthPx;
                const h = el.offsetHeight || heightPx;
                if (w > 0 && h > 0) {
                    setSize({ width: Math.round(w), height: Math.round(h) });
                }
            }
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [element.width, element.height, widthPx, heightPx]);

    const activeWidth = (containerRef.current?.offsetWidth) || size.width || widthPx;
    const activeHeight = (containerRef.current?.offsetHeight) || size.height || heightPx;

    // Sync body text when element changes or on mount, but never while actively typing
    useEffect(() => {
        if (textRef.current && (element.id !== lastElementId.current || document.activeElement !== textRef.current)) {
            textRef.current.innerHTML = element.content || '';
            lastElementId.current = element.id;
        }
    }, [element.id, element.content]);

    const handleBodyInput = (e) => {
        if (readOnly || !onChange) return;
        onChange(element.id, { content: e.currentTarget.innerHTML });
    };

    const handleBlur = (e) => {
        if (readOnly || !onChange) return;
        onChange(element.id, { content: e.currentTarget.innerHTML });
    };

    const handlePaste = (e) => {
        if (readOnly) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    const meta = element.metadata || {};
    const skin = meta.skin || 'comic';
    const hasTape = Boolean(meta.showTape ?? (meta.hideTape !== undefined ? !meta.hideTape : false));
    const hasShadow = meta.hasShadow !== false;
    const shadowMode = (() => {
        if (!hasShadow || meta.shadow === 'none') return 'none';
        if (meta.shadow === 'black') return 'black';
        return 'grey'; // grey (moire) is default
    })();
    const borderColor = meta.borderColor || '#000000';
    const borderRadius = meta.borderRadius ? `${meta.borderRadius}px` : '20px';
    const bgColor = meta.backgroundColor || (skin === 'paper' ? '#f6efdd' : (skin === 'sticky' ? '#fff875' : '#ffffff'));

    // Dynamic hand-drawn torn paper SVG path with edge notches matching reference artwork
    const getPaperPath = (w, h) => {
        const nw = Math.min(16, Math.max(6, Math.round(w * 0.05)));
        const nd = Math.min(15, Math.max(6, Math.round(h * 0.12)));

        const tNx = Math.round(w * 0.35); // top notch X
        const rNy = Math.round(h * 0.35); // right double notch Y
        const bNx = Math.round(w * 0.65); // bottom notch X
        const lNy = Math.round(h * 0.65); // left zigzag notch Y

        return [
            `M 6,10`,
            // Top edge with notch
            `L ${tNx - nw},8`,
            `L ${tNx},${8 + nd}`,
            `L ${tNx + nw},7`,
            `L ${w - 8},5`,
            // Right edge with double jagged notch
            `L ${w - 6},${Math.max(10, rNy - nd)}`,
            `L ${w - 6 - nd * 1.2},${rNy - nd * 0.35}`,
            `L ${w - 6},${rNy}`,
            `L ${w - 6 - nd * 1.3},${rNy + nd * 0.6}`,
            `L ${w - 6},${Math.min(h - 10, rNy + nd * 1.2)}`,
            `L ${w - 10},${h - 8}`,
            // Bottom edge with notch
            `L ${bNx + nw},${h - 6}`,
            `L ${bNx},${h - 6 - nd}`,
            `L ${bNx - nw},${h - 7}`,
            `L 8,${h - 8}`,
            // Left edge with jagged notch
            `L 6,${Math.min(h - 10, lNy + nd * 1.2)}`,
            `L ${6 + nd},${lNy + nd * 0.6}`,
            `L 7,${lNy}`,
            `L ${6 + nd * 1.1},${lNy - nd * 0.6}`,
            `L 6,${Math.max(10, lNy - nd)}`,
            `Z`
        ].join(' ');
    };

    // Card styling based on active skin
    let containerStyle = {
        width: '100%',
        height: '100%',
        minHeight: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: (isSelected && !readOnly) ? 'default' : 'move',
        userSelect: (isSelected && !readOnly) ? 'text' : 'none',
        overflow: 'visible',
    };

    if (skin === 'comic') {
        containerStyle = {
            ...containerStyle,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: borderRadius,
            boxShadow: 'none',
            padding: '14px 20px',
        };
    } else if (skin === 'paper') {
        containerStyle = {
            ...containerStyle,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 0,
            boxShadow: 'none',
            padding: '18px 24px',
        };
    } else if (skin === 'sticky') {
        containerStyle = {
            ...containerStyle,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            boxShadow: 'none',
            padding: '16px 20px',
            transform: 'rotate(-0.8deg)',
        };
    } else if (skin === 'notebook') {
        containerStyle = {
            ...containerStyle,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '6px',
            boxShadow: 'none',
            padding: '16px 22px 16px 36px',
        };
    }

    return (
        <div
            ref={containerRef}
            className={`comic-banner-card banner-skin-${skin}`}
            style={containerStyle}
        >
            {/* Comic Skin: Moire Shadow */}
            {skin === 'comic' && shadowMode === 'grey' && (
                <div
                    className="banner-moire-shadow"
                    style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        width: '100%',
                        height: '100%',
                        borderRadius: borderRadius,
                        backgroundColor: '#a8a8a8',
                        backgroundImage: 'radial-gradient(#222222 1.15px, transparent 1.15px)',
                        backgroundSize: '3.5px 3.5px',
                        zIndex: 0,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            )}

            {/* Comic Skin: Card Face */}
            {skin === 'comic' && (
                <div
                    className="banner-comic-face"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: bgColor,
                        border: meta.border || `3.5px solid ${borderColor}`,
                        borderRadius: borderRadius,
                        boxShadow: shadowMode === 'black' ? (meta.boxShadow || '6px 6px 0px #000000') : 'none',
                        zIndex: 1,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            )}

            {/* Sticky Skin: Moire Shadow */}
            {skin === 'sticky' && shadowMode === 'grey' && (
                <div
                    className="banner-moire-shadow"
                    style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        width: '100%',
                        height: '100%',
                        borderRadius: '4px',
                        backgroundColor: '#a8a8a8',
                        backgroundImage: 'radial-gradient(#222222 1.15px, transparent 1.15px)',
                        backgroundSize: '3.5px 3.5px',
                        zIndex: 0,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            )}

            {/* Sticky Skin: Card Face */}
            {skin === 'sticky' && (
                <div
                    className="banner-sticky-face"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: bgColor,
                        border: `2.5px solid ${borderColor}`,
                        borderRadius: '4px',
                        boxShadow: shadowMode === 'black' ? '4px 5px 0px #000000' : 'none',
                        zIndex: 1,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            )}

            {/* Notebook Skin: Moire Shadow */}
            {skin === 'notebook' && shadowMode === 'grey' && (
                <div
                    className="banner-moire-shadow"
                    style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        width: '100%',
                        height: '100%',
                        borderRadius: '6px',
                        backgroundColor: '#a8a8a8',
                        backgroundImage: 'radial-gradient(#222222 1.15px, transparent 1.15px)',
                        backgroundSize: '3.5px 3.5px',
                        zIndex: 0,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            )}

            {/* Notebook Skin: Card Face */}
            {skin === 'notebook' && (
                <div
                    className="banner-notebook-face"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: bgColor,
                        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 23px, #d2e4f7 24px, #d2e4f7 25px)',
                        border: `3px solid ${borderColor}`,
                        borderRadius: '6px',
                        boxShadow: shadowMode === 'black' ? '5px 5px 0px #000000' : 'none',
                        zIndex: 1,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            )}

            {/* Paper Skin: SVG Torn Paper Background & Moire Shadow */}
            {skin === 'paper' && (
                <svg
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        overflow: 'visible',
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                    viewBox={`0 0 ${activeWidth} ${activeHeight}`}
                    preserveAspectRatio="none"
                >
                    <defs>
                        <pattern id={`paper-moire-${element.id}`} x="0" y="0" width="3.5" height="3.5" patternUnits="userSpaceOnUse">
                            <rect width="3.5" height="3.5" fill="#a8a8a8" />
                            <circle cx="1.75" cy="1.75" r="1.15" fill="#222222" />
                        </pattern>
                    </defs>

                    {/* Paper Skin: Grey (Moire) Halftone Shadow matching torn paper */}
                    {shadowMode === 'grey' && (
                        <g transform="translate(3.5, 3.5)">
                            <path
                                d={getPaperPath(activeWidth, activeHeight)}
                                fill={`url(#paper-moire-${element.id})`}
                                stroke="#222222"
                                strokeWidth="2"
                                strokeLinejoin="miter"
                                strokeLinecap="square"
                            />
                        </g>
                    )}

                    {/* Paper Skin: Solid Black Shadow matching torn paper */}
                    {shadowMode === 'black' && (
                        <g transform="translate(5, 5)">
                            <path
                                d={getPaperPath(activeWidth, activeHeight)}
                                fill="#000000"
                                stroke="#000000"
                                strokeWidth="3.5"
                                strokeLinejoin="miter"
                                strokeLinecap="square"
                            />
                        </g>
                    )}

                    {/* Paper Skin: Main Paper Body */}
                    <path
                        d={getPaperPath(activeWidth, activeHeight)}
                        fill={bgColor}
                        stroke={borderColor}
                        strokeWidth="3.5"
                        strokeLinejoin="miter"
                        strokeLinecap="square"
                    />
                </svg>
            )}

            {/* Notebook Skin: Left Red Margin Line */}
            {skin === 'notebook' && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '26px',
                        width: '2px',
                        backgroundColor: '#ff8a80',
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                />
            )}

            {/* Scotch Tape Overlays: Left-Top and Bottom-Right for every skin */}
            {hasTape && (
                <>
                    {/* Top-Left Scotch Tape */}
                    <img
                        src={SCOTCH_TAPE_SRC}
                        alt=""
                        draggable={false}
                        className="banner-scotch-tape tape-tl"
                        style={{
                            position: 'absolute',
                            top: '-14px',
                            left: '-14px',
                            width: 'clamp(40px, 20%, 75px)',
                            aspectRatio: '229 / 233',
                            objectFit: 'contain',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            zIndex: 4,
                            filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.18))',
                        }}
                    />
                    {/* Bottom-Right Scotch Tape */}
                    <img
                        src={SCOTCH_TAPE_SRC}
                        alt=""
                        draggable={false}
                        className="banner-scotch-tape tape-br"
                        style={{
                            position: 'absolute',
                            bottom: '-14px',
                            right: '-14px',
                            width: 'clamp(40px, 20%, 75px)',
                            aspectRatio: '229 / 233',
                            objectFit: 'contain',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            zIndex: 4,
                            filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.18))',
                        }}
                    />
                </>
            )}

            {/* Main Text Content */}
            <div
                ref={textRef}
                contentEditable={!readOnly}
                suppressContentEditableWarning={true}
                onInput={handleBodyInput}
                onBlur={handleBlur}
                onPaste={handlePaste}
                data-placeholder={readOnly ? undefined : "Type banner text..."}
                className="comic-banner-text"
                style={{
                    width: '100%',
                    minHeight: '1.2em',
                    position: 'relative',
                    zIndex: 3,
                    fontFamily: meta.fontFamily || '"Bangers", cursive, sans-serif',
                    fontSize: meta.fontSize ? `${meta.fontSize}px` : '26px',
                    fontWeight: meta.fontWeight || 'normal',
                    fontStyle: meta.fontStyle || 'normal',
                    color: meta.color || '#00b0ff',
                    textAlign: meta.textAlign || 'center',
                    textTransform: meta.textTransform || 'uppercase',
                    lineHeight: meta.lineHeight ?? 1.2,
                    letterSpacing: meta.letterSpacing || '0.5px',
                    textDecoration: meta.textDecoration || 'none',
                    outline: 'none',
                    cursor: (isSelected && !readOnly) ? 'text' : 'inherit',
                    pointerEvents: (isSelected && !readOnly) ? 'auto' : 'none',
                    userSelect: (isSelected && !readOnly) ? 'text' : 'none',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                }}
                dangerouslySetInnerHTML={readOnly ? { __html: element.content || '' } : undefined}
            />
        </div>
    );
};

export default Banner;
