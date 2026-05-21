import React, { useState, useRef, useCallback, useEffect } from 'react';
import './IStickerPlayer.css';

/**
 * Expression Scanner 001
 * 
 * Displays a math expression with a draggable pointer below it.
 * The user drags the pointer left→right. As it passes under an
 * operator (+, -, ×, ÷), the operator lights up green and pulses
 * with a discovery chime.
 */
const ExpressionScanner001 = ({ expression, isActive = true, onComplete, isWiggling = false }) => {
    const OPS = new Set(['+', '-', '*', '/', '×', '÷']);

    // Tokenize
    const tokens = [];
    const raw = (expression || '2 + 3 * 4 - 5').replace(/\s+/g, ' ').trim();
    raw.split(' ').forEach((part, i) => {
        if (part) {
            tokens.push({
                value: part,
                isOp: OPS.has(part),
                display: part === '*' ? '×' : part === '/' ? '÷' : part === '-' ? '−' : part,
                id: i,
            });
        }
    });

    const totalOps = tokens.filter(t => t.isOp).length;
    const [progress, setProgress] = useState(0); // 0 to 1
    const [scannedOps, setScannedOps] = useState(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [hasStartedDrag, setHasStartedDrag] = useState(false);
    const tokenRefs = useRef([]);
    const trackRef = useRef(null);
    const audioCtxRef = useRef(null);
    const scannedOpsRef = useRef(new Set());
    const tokensRef = useRef(tokens);
    tokensRef.current = tokens;

    // Play a discovery chime
    const playDiscoveryChime = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(880, now);
            osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
            osc2.frequency.setValueAtTime(1100, now);
            osc2.frequency.exponentialRampToValueAtTime(1650, now + 0.06);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.2);
            osc2.stop(now + 0.2);
        } catch (e) { /* ignore */ }
    }, []);

    // Update scanned ops from a progress value
    const computeScanned = useCallback((prog) => {
        if (!trackRef.current) return;
        const trackRect = trackRef.current.getBoundingClientRect();

        // Pointer center is now exactly at prog * trackRect.width
        const pointerCenterX = prog * trackRect.width;

        const newScanned = new Set();
        const currentTokens = tokensRef.current;
        tokenRefs.current.forEach((ref, i) => {
            if (!ref || !currentTokens[i]?.isOp) return;
            const tokenRect = ref.getBoundingClientRect();
            const tokenCenter = tokenRect.left + tokenRect.width / 2 - trackRect.left;
            // Scan when the pointer center passes the token center
            if (pointerCenterX >= tokenCenter) {
                newScanned.add(currentTokens[i].id);
            }
        });

        // Play sound for newly scanned operators
        newScanned.forEach(id => {
            if (!scannedOpsRef.current.has(id)) {
                playDiscoveryChime();
            }
        });

        scannedOpsRef.current = newScanned;
        setScannedOps(new Set(newScanned));
    }, [playDiscoveryChime]);

    // Unified pointer handler using Pointer Events API + setPointerCapture
    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        setIsDragging(true);
        setHasStartedDrag(true);
        // Do not jump progress on click
    }, []);

    const handlePointerMove = useCallback((e) => {
        if (!isDragging) return;
        e.preventDefault();

        if (trackRef.current) {
            const trackRect = trackRef.current.getBoundingClientRect();
            // Track is now perfectly the width of the expression.
            // Progress goes from 0 (pointer left edge at track left edge)
            // to 1 (pointer left edge at track right edge).
            const x = e.clientX - trackRect.left;
            const newProg = Math.max(0, Math.min(1, x / trackRect.width));
            
            setProgress(prev => {
                const nextProg = Math.max(prev, newProg); // Only move forward
                if (nextProg !== prev) {
                    computeScanned(nextProg);
                }
                return nextProg;
            });
        }
    }, [isDragging, computeScanned]);

    const handlePointerUp = useCallback((e) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    }, []);

    // Reset when expression changes or slide becomes inactive
    useEffect(() => {
        if (!isActive) {
            setProgress(0);
            setScannedOps(new Set());
            scannedOpsRef.current = new Set();
            setHasStartedDrag(false);
            setIsDragging(false);
        }
    }, [expression, isActive]);

    const isFinished = scannedOps.size === totalOps && totalOps > 0;

    useEffect(() => {
        if (isFinished && onComplete) {
            onComplete();
        }
    }, [isFinished, onComplete]);

    return (
        <div className={`isticker-scanner ${isWiggling ? 'wiggle' : ''}`}>
            <div className="isticker-scanner-inner">
                <div className="isticker-scanner-expression">
                    {tokens.map((token, i) => (
                        <span
                            key={`${token.id}-${token.value}`}
                            ref={el => tokenRefs.current[i] = el}
                            className={`isticker-scanner-token ${token.isOp ? 'is-op' : ''} ${token.isOp && scannedOps.has(token.id) ? 'scanned' : ''}`}
                        >
                            {token.display}
                        </span>
                    ))}
                </div>
                <div
                    className="isticker-scanner-track-area"
                    ref={trackRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {/* Rail */}
                    <div className="isticker-scanner-rail">
                        <div className={`isticker-scanner-trail ${isFinished ? 'finished' : ''}`} style={{ width: `${progress * 100}%` }} />
                    </div>
                    {/* Draggable pointer — sits on the rail */}
                    <div
                        className={`isticker-scanner-pointer ${isDragging ? 'dragging' : ''} ${!hasStartedDrag ? 'hint' : ''} ${isFinished ? 'finished' : ''}`}
                        style={{ left: `calc(${progress * 100}% - 18px)` }}
                    >
                        {/* Rightward-pointing playhead. SVG starts exactly at left edge to align perfectly. */}
                        <svg viewBox="0 0 24 36" width="24" height="36">
                            <path d="M2,2 L22,18 L2,34 Z" fill="#34D399" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * PEMDAS Term Separator
 * 
 * Displays a math expression. When the user presses the play button,
 * terms animate apart at + and - operators (like the Potiondas powerup).
 * Operators are static (not buttons). Play button greys out after use.
 */
const PemdasTermSeparator = ({ expression, isActive = true, onComplete, isWiggling = false, colorVersion = false, autoPlay = false }) => {
    const SEPARATORS = new Set(['+', '-', '−']);

    // Tokenize — split on spaces
    const raw = (expression || '2 + 3 × 4 - 5').replace(/\s+/g, ' ').trim();
    const tokens = raw.split(' ').map((part, i) => ({
        value: part,
        isSeparator: SEPARATORS.has(part),
        display: part === '*' ? '×' : part === '/' ? '÷' : part === '-' ? '−' : part,
        id: i,
    }));

    const [hasPlayed, setHasPlayed] = useState(false);
    const [isSeparating, setIsSeparating] = useState(false);
    const audioCtxRef = useRef(null);
    const autoPlayHandled = useRef(false);

    // Expanding sound (growing chime)
    const playSeparateSound = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 1.5);
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.3);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.2);
            gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.5);
        } catch (e) { /* ignore */ }
    }, []);

    const handlePlay = useCallback(() => {
        if (hasPlayed || isSeparating) return;
        setIsSeparating(true);
        playSeparateSound();
        setTimeout(() => {
            setHasPlayed(true);
            setIsSeparating(false);
            if (onComplete) onComplete();
        }, 1500);
    }, [hasPlayed, isSeparating, playSeparateSound, onComplete]);

    // Auto-play: when autoPlay transitions to true, trigger the animation automatically
    useEffect(() => {
        if (autoPlay && !hasPlayed && !isSeparating && !autoPlayHandled.current) {
            autoPlayHandled.current = true;
            handlePlay();
        }
    }, [autoPlay, hasPlayed, isSeparating, handlePlay]);

    // Reset when slide becomes inactive (navigating away and back)
    useEffect(() => {
        if (!isActive) {
            setHasPlayed(false);
            setIsSeparating(false);
            autoPlayHandled.current = false;
        }
    }, [isActive]);

    return (
        <div className={`isticker-termsep ${isWiggling ? 'wiggle' : ''}`}>
            <div className="isticker-termsep-inner">
                <div className={`isticker-termsep-expression ${isSeparating || hasPlayed ? 'separated' : ''}`}>
                    {tokens.map((token) => {
                        const isGreen = (isSeparating || hasPlayed) && (
                            colorVersion ? !token.isSeparator : (token.display === '×' || token.display === '÷')
                        );
                        return (
                            <span
                                key={token.id}
                                className={`isticker-termsep-token ${token.isSeparator ? 'is-separator' : 'is-element'} ${isGreen ? 'is-green' : ''}`}
                            >
                                {token.display}
                            </span>
                        );
                    })}
                </div>
                <button
                    className={`isticker-termsep-play ${hasPlayed ? 'played' : ''} ${isSeparating ? 'separating' : ''}`}
                    onClick={handlePlay}
                    disabled={hasPlayed || isSeparating}
                    aria-label="Play animation"
                >
                    <svg viewBox="0 0 48 48" width="32" height="32">
                        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        <path d="M18,14 L36,24 L18,34 Z" fill="currentColor" />
                    </svg>
                </button>
            </div>
        </div>
    );
};


/**
 * IStickerPlayer — Dispatcher component
 */
const IStickerPlayer = ({ data, isActive = true, onComplete, isWiggling = false, autoPlay = false }) => {
    const metadata = data.metadata || {};

    switch (metadata.stickerType) {
        case 'expression_scanner_001':
            return (
                <ExpressionScanner001
                    expression={metadata.expression}
                    scanDuration={metadata.scanDuration}
                    isActive={isActive}
                    onComplete={onComplete}
                    isWiggling={isWiggling}
                />
            );
        case 'pemdas_term_separator':
            return (
                <PemdasTermSeparator
                    expression={metadata.expression}
                    colorVersion={metadata.colorVersion}
                    isActive={isActive}
                    onComplete={onComplete}
                    isWiggling={isWiggling}
                    autoPlay={autoPlay}
                />
            );
        default:
            return (
                <div style={{ padding: '20px', color: 'white', background: '#1E1B4B', borderRadius: '12px', textAlign: 'center' }}>
                    🧩 Unknown iSticker type
                </div>
            );
    }
};

export default IStickerPlayer;
