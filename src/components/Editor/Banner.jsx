import React, { useRef, useEffect, useState } from 'react';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { sanitizeFontFamily } from '../../utils/fontSanitizer';
import { formatExponents } from '../../utils/textFormatters';

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
            textRef.current.innerHTML = formatExponents(element.content || '');
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
        window.getSelection()?.removeAllRanges();
    };

    const handlePaste = (e) => {
        if (readOnly) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    const meta = element.metadata || {};
    const skin = meta.skin || 'comic';
    const isPhotoSkin = skin === 'photo' || skin === 'polaroid';
    const hasTape = Boolean(meta.showTape ?? (meta.hideTape !== undefined ? !meta.hideTape : false));
    const hasShadow = meta.hasShadow !== false;
    const shadowMode = (() => {
        if (!hasShadow || meta.shadow === 'none') return 'none';
        if (meta.shadow === 'black') return 'black';
        return 'grey'; // grey (moire) is default
    })();
    const borderColor = meta.borderColor || '#000000';
    const borderRadius = meta.borderRadius ? `${meta.borderRadius}px` : '20px';
    const bgColor = meta.backgroundColor || (skin === 'paper' ? '#f6efdd' : (skin === 'sticky' ? '#fff875' : (isPhotoSkin ? '#faf8f5' : '#ffffff')));

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

    const photoTop = Math.max(8, Math.min(16, Math.round(activeHeight * 0.12)));
    const photoSide = Math.max(8, Math.min(16, Math.round(activeWidth * 0.05)));
    const photoBottom = Math.max(16, Math.min(30, Math.round(activeHeight * 0.22)));

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
    } else if (isPhotoSkin) {
        containerStyle = {
            ...containerStyle,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            boxShadow: 'none',
            padding: `${photoTop + 4}px ${photoSide + 6}px ${photoBottom + 4}px ${photoSide + 6}px`,
            transform: 'rotate(-1.5deg)',
        };
    } else if (skin === 'signpost') {
        containerStyle = {
            ...containerStyle,
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            boxShadow: 'none',
            padding: '16px 22px',
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

            {/* Photo Skin: Moire Shadow */}
            {isPhotoSkin && shadowMode === 'grey' && (
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

            {/* Photo Skin: Card Face (Balanza Photo Frame - Always White Frame) */}
            {isPhotoSkin && (
                <div
                    className="banner-photo-face"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#ffffff',
                        border: meta.border || (borderColor && borderColor !== '#000000' ? `2px solid ${borderColor}` : (shadowMode === 'black' ? '2.5px solid #000000' : '1px solid rgba(0, 0, 0, 0.08)')),
                        borderRadius: '4px',
                        boxShadow: shadowMode === 'black'
                            ? (meta.boxShadow || '5px 5px 0px #000000')
                            : (shadowMode === 'grey'
                                ? '0 14px 34px rgba(15, 23, 42, 0.2), 0 3px 10px rgba(15, 23, 42, 0.08)'
                                : 'none'),
                        zIndex: 1,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            )}

            {/* Photo Skin: Inner Photo Surface (Card Color applied to inner rectangle) */}
            {isPhotoSkin && (
                <div
                    className="banner-photo-inner"
                    style={{
                        position: 'absolute',
                        top: `${photoTop}px`,
                        left: `${photoSide}px`,
                        right: `${photoSide}px`,
                        bottom: `${photoBottom}px`,
                        backgroundColor: bgColor,
                        borderRadius: '2px',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)',
                        filter: bgColor === '#faf8f5' ? 'contrast(97%) brightness(98%) sepia(8%)' : undefined,
                        overflow: 'hidden',
                        zIndex: 2,
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

            {/* Signpost Skin: Wooden Signboard, Post, and Ground Grass/Rocks */}
            {skin === 'signpost' && (() => {
                const postH = meta.postHeight || 75;
                const postW = 22;
                return (
                    <>
                        {/* Top Post Nub (Behind Board) */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: `${postW}px`,
                                height: '14px',
                                display: 'flex',
                                border: '2.5px solid #000000',
                                borderBottom: 'none',
                                borderRadius: '3px 3px 0 0',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                                zIndex: 0,
                                pointerEvents: 'none',
                            }}
                        >
                            {/* Bevel Cap */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3.5px',
                                    backgroundColor: '#C98A4B',
                                    borderBottom: '1px solid #000000',
                                }}
                            />
                            <div style={{ flex: 1, backgroundColor: '#854D0E', marginTop: '3.5px' }} />
                            <div style={{ flex: 1, backgroundColor: '#5C280E', marginTop: '3.5px' }} />
                        </div>

                        {/* Center Post below Sign (Behind Board) */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: `${postW}px`,
                                height: `${postH}px`,
                                display: 'flex',
                                border: '2.5px solid #000000',
                                borderTop: 'none',
                                boxSizing: 'border-box',
                                zIndex: 0,
                                pointerEvents: 'none',
                            }}
                        >
                            {/* Left sunlit wood */}
                            <div style={{ flex: 1, backgroundColor: '#854D0E', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: '1.5px', backgroundColor: 'rgba(0,0,0,0.25)' }} />
                                <div style={{ position: 'absolute', top: '65%', left: 0, right: 0, height: '1.5px', backgroundColor: 'rgba(0,0,0,0.25)' }} />
                            </div>
                            {/* Right shadow wood */}
                            <div style={{ flex: 1, backgroundColor: '#5C280E', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: '1.5px', backgroundColor: 'rgba(0,0,0,0.35)' }} />
                                <div style={{ position: 'absolute', top: '65%', left: 0, right: 0, height: '1.5px', backgroundColor: 'rgba(0,0,0,0.35)' }} />
                            </div>

                            {/* Ground Cluster: Grass, Rocks & Dirt Patch anchored at post bottom */}
                            <svg
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: '50%',
                                    transform: 'translate(-50%, -24px)',
                                    width: '260px',
                                    height: '56px',
                                    overflow: 'visible',
                                    pointerEvents: 'none',
                                    zIndex: 2,
                                }}
                                viewBox="0 0 260 56"
                            >
                                {/* Ground dirt/sand shadow */}
                                <ellipse cx="130" cy="42" rx="105" ry="12" fill="#F5E5C9" opacity="0.9" />
                                <ellipse cx="130" cy="42" rx="75" ry="8" fill="#E6D3B1" opacity="0.6" />

                                {/* Back grass blades behind post/rocks */}
                                <g stroke="#000000" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
                                    <path d="M 112 36 Q 106 20 98 12 Q 108 22 116 34 Z" fill="#84CC16" />
                                    <path d="M 116 36 Q 112 16 110 8 Q 118 20 122 34 Z" fill="#65A30D" />
                                    <path d="M 119 36 Q 123 15 127 7 Q 128 20 126 34 Z" fill="#84CC16" />
                                    <path d="M 135 36 Q 141 16 147 10 Q 143 23 138 34 Z" fill="#84CC16" />
                                    <path d="M 139 36 Q 150 20 160 14 Q 150 26 143 36 Z" fill="#65A30D" />
                                    <path d="M 142 36 Q 157 24 168 20 Q 155 29 146 36 Z" fill="#84CC16" />
                                </g>

                                {/* Left Rock */}
                                <g stroke="#000000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
                                    <polygon points="102,28 122,26 118,35 98,33" fill="#94A3B8" />
                                    <polygon points="98,33 118,35 124,41 94,40" fill="#64748B" />
                                </g>

                                {/* Big Right Rock (Faceted Cartoon Stone) */}
                                <g stroke="#000000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
                                    <polygon points="136,23 162,25 154,35 130,31" fill="#94A3B8" />
                                    <polygon points="162,25 174,38 154,35" fill="#475569" />
                                    <polygon points="130,31 154,35 174,38 138,42" fill="#64748B" />
                                </g>

                                {/* Center small base stones */}
                                <g stroke="#000000" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
                                    <polygon points="112,35 128,34 125,43 110,42" fill="#94A3B8" />
                                    <polygon points="110,42 125,43 128,46 108,45" fill="#64748B" />
                                    <polygon points="126,38 141,36 144,43 128,44" fill="#CBD5E1" />
                                </g>

                                {/* Left Satellite Clump: Rock, Grass & Pebble */}
                                <g stroke="#000000" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                                    <path d="M 46 36 Q 40 24 34 18 Q 44 26 48 35 Z" fill="#84CC16" />
                                    <path d="M 48 36 Q 46 20 44 14 Q 50 24 52 35 Z" fill="#65A30D" />
                                    <path d="M 50 36 Q 54 22 58 17 Q 56 26 53 35 Z" fill="#84CC16" />
                                    <polygon points="50,34 64,32 60,40 46,39" fill="#94A3B8" />
                                    <polygon points="46,39 60,40 62,44 45,43" fill="#64748B" />
                                    <polygon points="68,41 74,40 76,44 69,44" fill="#94A3B8" strokeWidth="1.2" />
                                </g>

                                {/* Right Satellite Clump: Rock, Grass & Pebble */}
                                <g stroke="#000000" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                                    <path d="M 204 36 Q 200 24 196 18 Q 204 26 207 35 Z" fill="#84CC16" />
                                    <path d="M 207 36 Q 210 20 214 14 Q 214 24 210 35 Z" fill="#65A30D" />
                                    <path d="M 209 36 Q 218 22 225 18 Q 218 28 212 36 Z" fill="#84CC16" />
                                    <polygon points="196,36 210,34 206,42 192,41" fill="#94A3B8" />
                                    <polygon points="192,41 206,42 208,45 190,44" fill="#64748B" />
                                    <polygon points="218,41 224,40 226,44 219,44" fill="#94A3B8" strokeWidth="1.2" />
                                </g>
                            </svg>
                        </div>

                        {/* Signpost 3D Wooden Bevel & Notched Frame (Behind White Face) */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '-6px',
                                left: '-2px',
                                right: '-8px',
                                bottom: '-4px',
                                pointerEvents: 'none',
                                zIndex: 1,
                            }}
                        >
                            {/* Top 3D Wooden Shelf */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '7px',
                                    backgroundColor: '#D97706',
                                    backgroundImage: 'linear-gradient(to bottom, #FBBF24, #D97706)',
                                    border: '2.5px solid #000000',
                                    borderBottom: 'none',
                                    borderRadius: '4px 4px 0 0',
                                    boxSizing: 'border-box',
                                }}
                            />

                            {/* Right 3D Wooden Edge with Cartoon Cuts */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: '8px',
                                    bottom: 0,
                                    backgroundColor: '#5C280E',
                                    border: '2.5px solid #000000',
                                    borderLeft: 'none',
                                    borderRadius: '0 4px 4px 0',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {/* Triangular Cut 1 */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '28%',
                                        right: '-1px',
                                        width: 0,
                                        height: 0,
                                        borderTop: '4px solid transparent',
                                        borderBottom: '4px solid transparent',
                                        borderRight: '5px solid #000000',
                                    }}
                                />
                                {/* Triangular Cut 2 */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '68%',
                                        right: '-1px',
                                        width: 0,
                                        height: 0,
                                        borderTop: '4px solid transparent',
                                        borderBottom: '4px solid transparent',
                                        borderRight: '5px solid #000000',
                                    }}
                                />
                            </div>

                            {/* Bottom 3D Wooden Shadow */}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '5px',
                                    backgroundColor: '#3E180A',
                                    border: '2.5px solid #000000',
                                    borderTop: 'none',
                                    borderRadius: '0 0 4px 4px',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {/* Front White Placard / Signboard Face */}
                        <div
                            className="banner-signpost-face"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: bgColor, // defaults to #FFFFFF
                                border: meta.border || `3px solid ${borderColor}`,
                                borderRadius: '4px',
                                zIndex: 2,
                                pointerEvents: 'none',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Subtle Wood Plank Divider Line */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '4px',
                                    right: '4px',
                                    height: '1.5px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                                    pointerEvents: 'none',
                                }}
                            />
                        </div>
                    </>
                );
            })()}

            {/* Scotch Tape Overlays: Left-Top and Bottom-Right for every skin */}
            {hasTape && (() => {
                const tapeWidth = Math.max(38, Math.min(56, Math.round(Math.min(activeWidth * 0.25, activeHeight * 0.45)) || 48));
                return (
                    <>
                        {/* Top-Left Scotch Tape */}
                        <img
                            src={SCOTCH_TAPE_SRC}
                            alt=""
                            draggable={false}
                            className="banner-scotch-tape tape-tl"
                            style={{
                                position: 'absolute',
                                top: '3px',
                                left: '3px',
                                transform: 'translate(-50%, -50%)',
                                width: `${tapeWidth}px`,
                                aspectRatio: '230 / 222',
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
                                bottom: '3px',
                                right: '3px',
                                transform: 'translate(50%, 50%)',
                                width: `${tapeWidth}px`,
                                aspectRatio: '230 / 222',
                                objectFit: 'contain',
                                pointerEvents: 'none',
                                userSelect: 'none',
                                zIndex: 4,
                                filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.18))',
                            }}
                        />
                    </>
                );
            })()}

            {/* Main Text Content */}
            <div
                ref={textRef}
                contentEditable={isSelected && !readOnly}
                suppressContentEditableWarning={true}
                onInput={handleBodyInput}
                onBlur={handleBlur}
                onPaste={handlePaste}
                className="comic-banner-text"
                style={{
                    width: '100%',
                    minHeight: '1.2em',
                    position: 'relative',
                    zIndex: 3,
                    fontFamily: sanitizeFontFamily(meta.fontFamily),
                    fontSize: meta.fontSize ? `${meta.fontSize}px` : '26px',
                    fontWeight: meta.fontWeight || '600',
                    fontStyle: meta.fontStyle || 'normal',
                    color: meta.color || '#000000',
                    textAlign: meta.textAlign || 'center',
                    textTransform: meta.textTransform !== undefined 
                        ? meta.textTransform 
                        : ((meta.fontFamily || '').toLowerCase().includes('bangers') ? 'uppercase' : 'none'),
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
                dangerouslySetInnerHTML={readOnly ? { __html: formatExponents(element.content || '') } : undefined}
            />
        </div>
    );
};

export default Banner;
