import React, { useRef, useState, useEffect, useCallback } from 'react';
import './GroupTransformBox.css';

/**
 * Unified Group Transform Box
 * Enables moving, resizing, and rotating multiple selected or grouped elements together as a single unit.
 */
const GroupTransformBox = ({ selectedElements, canvasRef, dispatch, onSnapGuideline }) => {
    const [bounds, setBounds] = useState(null);
    const [isInteracting, setIsInteracting] = useState(false);
    const activeDragRef = useRef(null);

    // Compute bounding box across all selected elements
    const computeBounds = useCallback(() => {
        if (!canvasRef.current || !selectedElements || selectedElements.length <= 1) {
            return null;
        }

        const canvasRect = canvasRef.current.getBoundingClientRect();
        if (canvasRect.width === 0 || canvasRect.height === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let foundCount = 0;

        selectedElements.forEach(el => {
            const domNode = canvasRef.current.querySelector(`[data-element-id="${el.id}"]`);
            if (domNode) {
                const r = domNode.getBoundingClientRect();
                const leftPct = ((r.left - canvasRect.left) / canvasRect.width) * 100;
                const topPct = ((r.top - canvasRect.top) / canvasRect.height) * 100;
                const rightPct = ((r.right - canvasRect.left) / canvasRect.width) * 100;
                const bottomPct = ((r.bottom - canvasRect.top) / canvasRect.height) * 100;

                if (leftPct < minX) minX = leftPct;
                if (topPct < minY) minY = topPct;
                if (rightPct > maxX) maxX = rightPct;
                if (bottomPct > maxY) maxY = bottomPct;
                foundCount++;
            } else {
                // Mathematical fallback if DOM node not immediately ready
                const w = el.width || 20;
                const h = el.height || 20;
                const leftPct = el.x - w / 2;
                const topPct = el.y - h / 2;
                const rightPct = el.x + w / 2;
                const bottomPct = el.y + h / 2;

                if (leftPct < minX) minX = leftPct;
                if (topPct < minY) minY = topPct;
                if (rightPct > maxX) maxX = rightPct;
                if (bottomPct > maxY) maxY = bottomPct;
                foundCount++;
            }
        });

        if (foundCount === 0 || !isFinite(minX) || !isFinite(minY)) {
            return null;
        }

        // Add small padding around the group
        const padX = 1.0;
        const padY = 0.8;
        const finalLeft = minX - padX;
        const finalTop = minY - padY;
        const finalWidth = (maxX - minX) + padX * 2;
        const finalHeight = (maxY - minY) + padY * 2;

        return {
            left: finalLeft,
            top: finalTop,
            width: Math.max(3, finalWidth),
            height: Math.max(3, finalHeight),
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2
        };
    }, [selectedElements, canvasRef]);

    // Update bounds on selectedElements change or animation frame
    useEffect(() => {
        if (isInteracting) return;
        const b = computeBounds();
        setBounds(b);
    }, [selectedElements, computeBounds, isInteracting]);

    // Handle Start of interaction (move, resize, rotate)
    const handleStart = (e, type) => {
        e.preventDefault();
        e.stopPropagation();

        if (!canvasRef.current || !bounds || selectedElements.length <= 1) return;

        if (document.activeElement && document.activeElement.blur && (document.activeElement.isContentEditable || document.activeElement.closest?.('[contenteditable="true"]'))) {
            document.activeElement.blur();
        }

        dispatch({ type: 'SAVE_HISTORY' });
        setIsInteracting(true);

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const startClientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
        const startClientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

        const startBounds = { ...bounds };
        const centerPx = {
            x: canvasRect.left + (startBounds.cx / 100) * canvasRect.width,
            y: canvasRect.top + (startBounds.cy / 100) * canvasRect.height
        };

        const startDist = Math.hypot(startClientX - centerPx.x, startClientY - centerPx.y);
        const startAngle = Math.atan2(startClientY - centerPx.y, startClientX - centerPx.x) * (180 / Math.PI);

        const startElements = selectedElements.map(el => ({
            id: el.id,
            x: el.x,
            y: el.y,
            scale: el.scale ?? 1,
            rotation: el.rotation ?? 0,
            type: el.type,
            metadata: el.metadata || {}
        }));

        activeDragRef.current = {
            type,
            startBounds,
            centerPx,
            startDist,
            startAngle,
            startElements,
            canvasRect,
            wasSnappedX: false,
            wasSnappedY: false
        };

        const handleMove = (moveEvent) => {
            moveEvent.preventDefault();
            const stateRef = activeDragRef.current;
            if (!stateRef) return;

            const clientX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0]?.clientX) || 0;
            const clientY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0]?.clientY) || 0;

            const updatesMap = {};

            if (type === 'move') {
                let dx = ((clientX - startClientX) / stateRef.canvasRect.width) * 100;
                let dy = ((clientY - startClientY) / stateRef.canvasRect.height) * 100;

                // Center snapping (8px threshold)
                const snapThresholdX = (8 / stateRef.canvasRect.width) * 100;
                const snapThresholdY = (8 / stateRef.canvasRect.height) * 100;
                const newCx = stateRef.startBounds.cx + dx;
                const newCy = stateRef.startBounds.cy + dy;

                let snappedX = false;
                let snappedY = false;

                if (!moveEvent.altKey) {
                    if (Math.abs(newCx - 50) <= snapThresholdX) {
                        dx = 50 - stateRef.startBounds.cx;
                        snappedX = true;
                    }
                    if (Math.abs(newCy - 50) <= snapThresholdY) {
                        dy = 50 - stateRef.startBounds.cy;
                        snappedY = true;
                    }
                }

                // Haptic feedback tick on entering snap
                if (snappedX && !stateRef.wasSnappedX) {
                    if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
                }
                if (snappedY && !stateRef.wasSnappedY) {
                    if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
                }
                stateRef.wasSnappedX = snappedX;
                stateRef.wasSnappedY = snappedY;

                if (onSnapGuideline) {
                    onSnapGuideline({ vertical: snappedX, horizontal: snappedY });
                }

                stateRef.startElements.forEach(el => {
                    updatesMap[el.id] = {
                        x: el.x + dx,
                        y: el.y + dy
                    };
                });

                // Update visual bounds in real-time
                setBounds({
                    ...stateRef.startBounds,
                    left: stateRef.startBounds.left + dx,
                    top: stateRef.startBounds.top + dy,
                    cx: stateRef.startBounds.cx + dx,
                    cy: stateRef.startBounds.cy + dy
                });
            } else if (type === 'resize') {
                const currentDist = Math.hypot(clientX - stateRef.centerPx.x, clientY - stateRef.centerPx.y);
                const scaleFactor = Math.max(0.08, currentDist / Math.max(10, stateRef.startDist));

                stateRef.startElements.forEach(el => {
                    const newX = stateRef.startBounds.cx + (el.x - stateRef.startBounds.cx) * scaleFactor;
                    const newY = stateRef.startBounds.cy + (el.y - stateRef.startBounds.cy) * scaleFactor;
                    const newScale = Math.max(0.05, el.scale * scaleFactor);

                    updatesMap[el.id] = {
                        x: newX,
                        y: newY,
                        scale: newScale
                    };
                });

                // Update visual bounds
                const newWidth = stateRef.startBounds.width * scaleFactor;
                const newHeight = stateRef.startBounds.height * scaleFactor;
                setBounds({
                    ...stateRef.startBounds,
                    width: newWidth,
                    height: newHeight,
                    left: stateRef.startBounds.cx - newWidth / 2,
                    top: stateRef.startBounds.cy - newHeight / 2
                });
            } else if (type === 'rotate') {
                const currentAngle = Math.atan2(clientY - stateRef.centerPx.y, clientX - stateRef.centerPx.x) * (180 / Math.PI);
                let dTheta = currentAngle - stateRef.startAngle;

                // Shift key snaps to 15-degree increments
                if (moveEvent.shiftKey) {
                    dTheta = Math.round(dTheta / 15) * 15;
                }

                const alpha = dTheta * (Math.PI / 180);
                const cosA = Math.cos(alpha);
                const sinA = Math.sin(alpha);

                stateRef.startElements.forEach(el => {
                    // Aspect ratio corrected pixel coordinates (360 x 640)
                    const dxPx = (el.x - stateRef.startBounds.cx) * (360 / 100);
                    const dyPx = (el.y - stateRef.startBounds.cy) * (640 / 100);

                    const rotDxPx = dxPx * cosA - dyPx * sinA;
                    const rotDyPx = dxPx * sinA + dyPx * cosA;

                    const newX = stateRef.startBounds.cx + rotDxPx * (100 / 360);
                    const newY = stateRef.startBounds.cy + rotDyPx * (100 / 640);
                    const newRotation = Math.round(((el.rotation + dTheta) % 360 + 360) % 360);

                    updatesMap[el.id] = {
                        x: newX,
                        y: newY,
                        rotation: newRotation
                    };
                });
            }

            dispatch({ type: 'UPDATE_ELEMENTS', payload: updatesMap });
        };

        const handleEnd = () => {
            setIsInteracting(false);
            activeDragRef.current = null;
            if (onSnapGuideline) {
                onSnapGuideline({ vertical: false, horizontal: false, immediate: true });
            }
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);

            // Re-calculate true DOM bounds after interaction
            setTimeout(() => {
                const b = computeBounds();
                setBounds(b);
            }, 50);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    };

    if (!bounds || selectedElements.length <= 1) {
        return null;
    }

    const firstGroupId = selectedElements[0]?.metadata?.groupId;
    const isGrouped = firstGroupId && selectedElements.every(el => el.metadata?.groupId === firstGroupId);

    return (
        <div
            className="group-transform-box"
            style={{
                left: `${bounds.left}%`,
                top: `${bounds.top}%`,
                width: `${bounds.width}%`,
                height: `${bounds.height}%`,
            }}
        >
            {/* Group / Selection Pill Badge (draggable to move) */}
            <div
                className="group-transform-badge"
                onMouseDown={(e) => handleStart(e, 'move')}
                onTouchStart={(e) => handleStart(e, 'move')}
                title="Drag to move group"
            >
                <span>{isGrouped ? '🔗 Group' : 'Selection'} ({selectedElements.length})</span>
            </div>

            {/* Rotate Stem & Handle */}
            <div className="group-rotate-stem" />
            <div
                className="group-rotate-handle"
                onMouseDown={(e) => handleStart(e, 'rotate')}
                onTouchStart={(e) => handleStart(e, 'rotate')}
                title="Rotate Group (Hold Shift for 15° snap)"
            >
                ↻
            </div>

            {/* 4 Corner Resize Handles */}
            <div
                className="group-corner-handle nw"
                onMouseDown={(e) => handleStart(e, 'resize')}
                onTouchStart={(e) => handleStart(e, 'resize')}
                title="Resize Group"
            />
            <div
                className="group-corner-handle ne"
                onMouseDown={(e) => handleStart(e, 'resize')}
                onTouchStart={(e) => handleStart(e, 'resize')}
                title="Resize Group"
            />
            <div
                className="group-corner-handle sw"
                onMouseDown={(e) => handleStart(e, 'resize')}
                onTouchStart={(e) => handleStart(e, 'resize')}
                title="Resize Group"
            />
            <div
                className="group-corner-handle se"
                onMouseDown={(e) => handleStart(e, 'resize')}
                onTouchStart={(e) => handleStart(e, 'resize')}
                title="Resize Group"
            />
        </div>
    );
};

export default GroupTransformBox;
