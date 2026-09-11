import React, { useRef, useState, useEffect } from 'react';
import { resolveAssetUrl } from '../../utils/assetUrl';
import './Sticker.css';
import QuizEditor from './QuizEditor';
import Balloon from './Balloon';
import Banner from './Banner';
import ResultField from '../ResultField/ResultField';
import NumberLine from '../NumberLine/NumberLine';
import CharacterShadow from './CharacterShadow';
import { useEditor } from '../../context/EditorContext';

/**
 * Sticker Component
 * 
 * Represents a single element on the canvas (text, image, quiz, etc.).
 * Handles its own drag-and-drop, resizing, and rotation interactions.
 * 
 * Wrapped in React.memo to prevent re-renders when other stickers change,
 * provided its props (element, callbacks) remain stable.
 */

// Helper to rotate point
const rotatePoint = (x, y, angle) => {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos
    };
};

const Sticker = React.memo(({ element, elementIndex = 0, isSelected, onSelect, onChange, onMoveMultiple, onEdit, onDelete, onSnapGuideline, translationMode = false, readOnly = false }) => {
    const { state, dispatch } = useEditor();
    const stickerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [interactionType, setInteractionType] = useState(null); // 'move', 'resize', 'rotate'
    const wasSnappedXRef = useRef(false);
    const wasSnappedYRef = useRef(false);

    useEffect(() => {
        return () => {
            if (onSnapGuideline) {
                onSnapGuideline({ vertical: false, horizontal: false, immediate: true });
            }
        };
    }, [onSnapGuideline]);

    // Helper to get client coordinates from mouse or touch
    const getClientCoords = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    /**
     * Handles the start of an interaction (drag, resize, rotate).
     * Sets up global event listeners for move/end to handle dragging outside the element.
     */
    const handleStart = (e, type) => {
        // Fix: Allow interaction with contentEditable if selected
        if (isSelected && (e.target.isContentEditable || e.target.closest('[contenteditable="true"]'))) {
            // Do not start drag, allow default browser focus/caret
            e.stopPropagation(); // Prevent bubbling to Editor
            return;
        }

        const isMultiSelectModifier = e.shiftKey || e.metaKey || e.ctrlKey;
        const isAlt = e.altKey;

        // ChatQuiz & TypeQuiz: no dragging, resizing, or rotating — they fill the stage / dock to bottom
        const isLockedQuiz = element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'type';
        if (isLockedQuiz && type === 'move') {
            e.stopPropagation();
            return;
        }

        e.stopPropagation();

        if (element.metadata?.locked && !(element.type === 'result_field' && type === 'move')) {
            return;
        }

        // In translation mode, block all physical manipulations
        if (translationMode && type !== 'move') {
            return;
        }
        if (translationMode && type === 'move') {
            // In translation mode, allow selection but not movement
            return;
        }

        setInteractionType(type);
        setIsDragging(true);

        const startCoords = getClientCoords(e);
        const startX = startCoords.x;
        const startY = startCoords.y;

        const startLeft = element.x;
        const startTop = element.y;
        const startWidth = element.width;
        const startHeight = element.height;
        const startRotation = element.rotation;
        const startScale = element.scale;
        const startCurvature = element.metadata?.curvature ?? -40;
        const startCurveSkew = element.metadata?.curveSkew ?? 0;

        // For rotation calculation
        const rect = stickerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate initial distance from center for resize
        const startDist = Math.sqrt(Math.pow(startX - centerX, 2) + Math.pow(startY - centerY, 2));

        let prevCoords = startCoords;
        let historySaved = false;

        const handleMove = (moveEvent) => {
            moveEvent.preventDefault(); // Prevent scrolling/selection while dragging
            const moveCoords = getClientCoords(moveEvent);
            const dx = moveCoords.x - startX;
            const dy = moveCoords.y - startY;
            
            const frameDx = moveCoords.x - prevCoords.x;
            const frameDy = moveCoords.y - prevCoords.y;
            prevCoords = moveCoords;

            // Only save history if we actually started moving/scaling/rotating!
            if (!historySaved && (Math.abs(dx) > 1 || Math.abs(dy) > 1 || type !== 'move')) {
                dispatch({ type: 'SAVE_HISTORY' });
                historySaved = true;
            }

            const parent = stickerRef.current.parentElement;
            const parentWidth = parent.offsetWidth;
            const parentHeight = parent.offsetHeight;

            if (type === 'move') {
                const isMultiSelected = state.selectedElementIds?.includes(element.id) && state.selectedElementIds.length > 1;
                
                if (isMultiSelected && onMoveMultiple) {
                    const dxPct = (frameDx / parentWidth) * 100;
                    const dyPct = (frameDy / parentHeight) * 100;
                    onMoveMultiple(state.selectedElementIds.filter(id => id !== 'background' && id !== 'cartridge'), dxPct, dyPct);
                } else {
                    // Single element move uses absolute positioning for perfection
                    const pWidth = parentWidth || 360;
                    const pHeight = parentHeight || 640;
                    let rawX = startLeft + (dx / pWidth) * 100;
                    let rawY = startTop + (dy / pHeight) * 100;

                    // Center snapping logic (8px threshold)
                    const SNAP_PIXELS = 8;
                    const snapThresholdX = (SNAP_PIXELS / pWidth) * 100;
                    const snapThresholdY = (SNAP_PIXELS / pHeight) * 100;

                    let snappedX = false;
                    let snappedY = false;
                    let newX = rawX;
                    let newY = rawY;

                    const isBypass = moveEvent.altKey;
                    if (!isBypass) {
                        if (Math.abs(rawX - 50) <= snapThresholdX) {
                            newX = 50;
                            snappedX = true;
                        }
                        if (Math.abs(rawY - 50) <= snapThresholdY) {
                            newY = 50;
                            snappedY = true;
                        }
                    }

                    // Quiz elements only move vertically, locked horizontally (except field type)
                    if (element.type === 'quiz' && element.metadata?.quizType !== 'field') {
                        snappedX = false;
                    }

                    // Haptic feedback tick on entering snap
                    if (snappedX && !wasSnappedXRef.current) {
                        if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
                    }
                    if (snappedY && !wasSnappedYRef.current) {
                        if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
                    }
                    wasSnappedXRef.current = snappedX;
                    wasSnappedYRef.current = snappedY;

                    if (onSnapGuideline) {
                        onSnapGuideline({ vertical: snappedX, horizontal: snappedY });
                    }

                    if (element.type === 'quiz') {
                        if (element.metadata?.quizType === 'field') {
                            onChange(element.id, { x: newX, y: newY });
                        } else {
                            onChange(element.id, { y: newY });
                        }
                    } else {
                        if (element.type === 'popup') {
                            const halfWidth = ((element.width || 30) * element.scale) / 2;
                            const minX = 15 + halfWidth;
                            const maxX = 85 - halfWidth;
                            if (minX <= maxX) {
                                newX = Math.max(minX, Math.min(maxX, newX));
                            } else {
                                newX = 50;
                            }
                        }
                        onChange(element.id, { x: newX, y: newY });
                    }
                }
            } else if (type === 'resize') {
                // Distance-based resize logic:
                // Calculate current distance from center
                const currentDist = Math.sqrt(Math.pow(moveCoords.x - centerX, 2) + Math.pow(moveCoords.y - centerY, 2));

                // Scale factor is the ratio of current distance to start distance
                // We multiply the startScale by this ratio
                const scaleFactor = currentDist / startDist;
                let newScale = startScale * scaleFactor;

                if (element.type === 'popup') {
                    const distLeft = element.x - 15;
                    const distRight = 85 - element.x;
                    const maxHalfWidth = Math.min(distLeft, distRight);
                    const maxScale = (2 * maxHalfWidth) / (element.width || 30);
                    newScale = Math.min(maxScale, newScale);
                }

                onChange(element.id, { scale: Math.max(0.1, newScale) });
            } else if (type === 'rotate') {
                // Calculate angle relative to center
                const currentAngle = Math.atan2(moveCoords.y - centerY, moveCoords.x - centerX) * (180 / Math.PI);
                const startAngle = Math.atan2(startY - centerY, startX - centerX) * (180 / Math.PI);
                const rotationDiff = currentAngle - startAngle;
                onChange(element.id, { rotation: startRotation + rotationDiff });
            } else if (type === 'tail') {
                // Calculate relative position for tail
                // We need to account for rotation and scale to make it intuitive, but for now simple relative
                const dx = (moveCoords.x - startX) / element.scale; // Adjust for scale
                const dy = (moveCoords.y - startY) / element.scale;

                const currentTailX = element.metadata?.tailPos?.x || 0;
                const currentTailY = element.metadata?.tailPos?.y || 60;

                onChange(element.id, {
                    metadata: {
                        ...element.metadata,
                        tailPos: { x: currentTailX + dx, y: currentTailY + dy }
                    }
                });
            } else if (['resize-n', 'resize-s', 'resize-e', 'resize-w'].includes(type)) {
                // Convert global delta to local delta (unrotated)
                // We rotate the global drag vector by -rotation to get local alignement
                const localDelta = rotatePoint(dx, dy, -startRotation);
                const localDx = localDelta.x / startScale; // Adjust for scale
                const localDy = localDelta.y / startScale;

                let dW = 0;
                let dH = 0;
                let centerXShift = 0;
                let centerYShift = 0;

                // Current dimensions in pixels (unscaled)
                const currentWidthPx = (startWidth / 100) * parentWidth;
                const currentHeightPx = (startHeight / 100) * parentHeight;

                if (type === 'resize-e') {
                    dW = localDx;
                } else if (type === 'resize-w') {
                    dW = -localDx;
                } else if (type === 'resize-s') {
                    dH = localDy;
                } else if (type === 'resize-n') {
                    dH = -localDy;
                }

                // Min dimensions
                const newWidthPx = Math.max(30, currentWidthPx + dW); // Min 30px
                const newHeightPx = Math.max(30, currentHeightPx + dH); // Min 30px

                // Actual delta used (in case of min clamping)
                const actualDw = newWidthPx - currentWidthPx;
                const actualDh = newHeightPx - currentHeightPx;

                // Recalculate shift based on actual change
                if (type === 'resize-e') centerXShift = actualDw / 2;
                else if (type === 'resize-w') centerXShift = -actualDw / 2;
                else if (type === 'resize-s') centerYShift = actualDh / 2;
                else if (type === 'resize-n') centerYShift = -actualDh / 2;

                // Rotate shift back to global
                const globalShift = rotatePoint(centerXShift * startScale, centerYShift * startScale, startRotation);

                // Convert back to %
                const newWidthPct = (newWidthPx / parentWidth) * 100;
                const newHeightPct = (newHeightPx / parentHeight) * 100;

                const newXPct = startLeft + (globalShift.x / parentWidth) * 100;
                const newYPct = startTop + (globalShift.y / parentHeight) * 100;

                onChange(element.id, {
                    width: newWidthPct,
                    height: newHeightPct,
                    x: newXPct,
                    y: newYPct
                });
            } else if (type === 'line-start' || type === 'line-end') {
                // Line endpoint dragging
                const localDelta = rotatePoint(dx, dy, -startRotation);
                const localDx = localDelta.x / startScale;
                const localDy = localDelta.y / startScale;

                // Current length in pixels
                const currentLengthPx = (startWidth / 100) * parentWidth;
                
                // Which end is fixed?
                // If dragging 'end' (right), the 'start' (left) is fixed.
                const fixedXLocal = (type === 'line-end') ? -currentLengthPx / 2 : currentLengthPx / 2;
                
                // New position of the dragged handle (local space)
                const newHandleXLocal = (type === 'line-end') ? (currentLengthPx / 2 + localDx) : (-currentLengthPx / 2 + localDx);
                const newHandleYLocal = localDy; // localDy is the deviation from the line's axis

                // New length
                const newLengthPx = Math.sqrt(Math.pow(newHandleXLocal - fixedXLocal, 2) + Math.pow(newHandleYLocal, 2));
                const minLengthPx = 20; // 20px minimum length
                const actualLengthPx = Math.max(minLengthPx, newLengthPx);

                // New angle relative to the original rotation
                let angleOffset = Math.atan2(newHandleYLocal, newHandleXLocal - fixedXLocal) * (180 / Math.PI);
                if (type === 'line-start') {
                    angleOffset = Math.atan2(newHandleYLocal, newHandleXLocal - fixedXLocal) * (180 / Math.PI) - 180;
                }

                let newAngle = startRotation + angleOffset;

                // Snapping logic (snap if within 5 degrees of orthogonal angles)
                const snapAngles = [0, 90, 180, 270, 360, -90, -180, -270];
                for (let sa of snapAngles) {
                    if (Math.abs(newAngle - sa) < 5) {
                        newAngle = sa;
                        break;
                    }
                }

                // New center calculation
                // The new center is halfway between the fixed point and the newly dragged point
                const newCenterXLocal = (fixedXLocal + newHandleXLocal) / 2;
                const newCenterYLocal = newHandleYLocal / 2;

                // Rotate the center shift back to global space
                const globalShift = rotatePoint(newCenterXLocal * startScale, newCenterYLocal * startScale, startRotation);
                
                const newXPct = startLeft + (globalShift.x / parentWidth) * 100;
                const newYPct = startTop + (globalShift.y / parentHeight) * 100;
                const newWidthPct = (actualLengthPx / parentWidth) * 100;

                onChange(element.id, {
                    width: newWidthPct,
                    x: newXPct,
                    y: newYPct,
                    rotation: newAngle
                });
            } else if (type === 'line-curve') {
                // Curvature handle dragging
                const localDelta = rotatePoint(dx, dy, -startRotation);
                const localDx = localDelta.x / startScale;
                const localDy = localDelta.y / startScale;

                const newCurvature = Math.max(-200, Math.min(200, Math.round(startCurvature + localDy)));
                const newSkew = Math.max(-150, Math.min(150, Math.round(startCurveSkew + localDx)));

                onChange(element.id, {
                    metadata: {
                        ...element.metadata,
                        curvature: newCurvature,
                        curveSkew: newSkew
                    }
                });
            }
        };

        const handleEnd = () => {
            setIsDragging(false);
            setInteractionType(null);
            wasSnappedXRef.current = false;
            wasSnappedYRef.current = false;
            if (onSnapGuideline) {
                onSnapGuideline({ vertical: false, horizontal: false, immediate: true });
            }
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);

            // If user clicked without dragging on an already selected element while multiple items were selected,
            // isolate selection on release (respecting group membership or Alt drill-down)
            if (!historySaved && !isMultiSelectModifier && (state.selectedElementIds?.length > 1 || isAlt)) {
                onSelect(element.id, false, isAlt);
            }
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    };

    return (
        <div
            ref={stickerRef}
            className={`sticker ${isSelected ? 'selected' : ''} ${element.metadata?.groupId ? 'is-grouped' : ''} ${element.type === 'line' ? 'is-line' : ''} ${element.metadata?.hidden ? 'is-hidden' : ''} ${element.metadata?.locked ? 'is-locked' : ''}`}
            style={{
                left: (element.metadata?.quizType === 'chatquiz') ? '50%' : (element.metadata?.quizType === 'type' ? '0' : `${element.x}%`),
                top: (element.metadata?.quizType === 'chatquiz') ? '55%' : (element.metadata?.quizType === 'type' ? 'auto' : `${(element.type === 'quiz' && element.y === 75) ? 78.59375 : element.y}%`),
                bottom: (element.metadata?.quizType === 'type') ? '0' : undefined,
                width: (element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'type') ? '100%' : (element.type === 'quiz' || element.type === 'result_field' ? 'auto' : ((element.type === 'text' || element.type === 'collectible') && !element.width ? 'auto' : `${element.width}%`)),
                height: (element.metadata?.quizType === 'chatquiz') ? '85%' : (element.metadata?.quizType === 'type' ? 'auto' : (element.type === 'text' || element.type === 'collectible' || element.type === 'quiz' || element.type === 'result_field' ? 'auto' : `${element.type === 'popup' ? (element.width * 360 * 206) / (640 * 200) : element.height}%`)),
                transform: (element.metadata?.quizType === 'chatquiz') ? 'translate(-50%, -50%)' : (element.metadata?.quizType === 'type' ? 'none' : `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${element.scale})`),
                zIndex: (element.metadata?.quizType === 'chatquiz' ? 0 : (element.type === 'result_field' ? (elementIndex + 1000) : (element.metadata?.quizType === 'type' ? 100 : (element.type === 'quiz' || element.type === 'cartridge' ? (elementIndex + 50) : (elementIndex + 1))))),
            }}
            onMouseDown={(e) => handleStart(e, 'move')}
            onTouchStart={(e) => handleStart(e, 'move')}
            onMouseDownCapture={(e) => {
                // Don't intercept selection if child specifies data-no-select-parent
                if (e.target?.closest?.('[data-no-select-parent]')) return;
                // Capture phase fires parent-first, before child stopPropagation
                // Support Cmd/Ctrl and Shift keys for toggling multi-selection
                const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
                const isAlt = e.altKey;
                if (!isSelected || isMulti) {
                    onSelect(element.id, isMulti, isAlt);
                }
            }}
            onTouchStartCapture={(e) => {
                if (e.target?.closest?.('[data-no-select-parent]')) return;
                const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
                if (!isSelected || isMulti) {
                    onSelect(element.id, isMulti, false);
                }
            }}
            onDoubleClick={() => {
                if (element.type !== 'quiz' && onEdit) onEdit();
            }}
        >
            <div className="sticker-content" style={{
                pointerEvents: (element.metadata?.quizType === 'chatquiz') ? 'auto' : undefined
            }}>
                {(element.type === 'text' || element.type === 'collectible') && (
                    <div
                        className={element.type === 'collectible' ? "sticker-collectible" : "sticker-text"}
                        contentEditable={!element.metadata?.locked}
                        suppressContentEditableWarning
                        onInput={(e) => {
                            // Capture innerHTML to preserve per-character color spans
                            onChange(element.id, { content: e.currentTarget.innerHTML });
                        }}
                        onPaste={(e) => {
                            e.preventDefault();
                            const text = e.clipboardData.getData('text/plain');
                            document.execCommand('insertText', false, text);
                        }}
                        ref={(el) => {
                            if (el && el.innerHTML !== element.content && document.activeElement !== el) {
                                el.innerHTML = element.content;
                            }
                        }}
                        style={{
                            fontFamily: element.metadata?.fontFamily || (element.type === 'collectible' ? '"Outfit", sans-serif' : '"HVD Comic Serif Pro", sans-serif'),
                            fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : (element.type === 'collectible' ? '18px' : '16px'),
                            fontWeight: element.metadata?.fontWeight || (element.type === 'collectible' ? '500' : 'normal'),
                            fontStyle: element.metadata?.fontStyle || 'normal',
                            textDecoration: element.metadata?.textDecoration || 'none',
                            color: element.metadata?.color || (element.type === 'collectible' ? '#ffffff' : 'black'),
                            backgroundColor: element.metadata?.backgroundColor || (element.type === 'collectible' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'),
                            padding: (element.metadata?.backgroundColor && element.metadata?.backgroundColor !== 'transparent') ? '0.5rem' : (element.type === 'collectible' ? '1.25rem 1.5rem' : '0'),
                            borderRadius: element.metadata?.borderRadius || (element.type === 'collectible' ? '16px' : '8px'),
                            border: element.metadata?.border || (element.type === 'collectible' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'),
                            boxShadow: element.type === 'collectible' ? '0 8px 32px rgba(0, 0, 0, 0.35)' : undefined,
                            backdropFilter: element.type === 'collectible' ? 'blur(8px)' : undefined,
                            textAlign: element.metadata?.textAlign || 'center',
                            lineHeight: element.metadata?.lineHeight ?? (element.type === 'collectible' ? 1.4 : 1),
                            position: 'relative',
                            outline: 'none',
                            cursor: element.metadata?.locked ? 'default' : 'text',
                            userSelect: element.metadata?.locked ? 'none' : 'text',
                            pointerEvents: isSelected && !element.metadata?.locked ? 'auto' : 'none',
                            minWidth: '50px', // Ensure it's clickable if empty
                            boxSizing: 'border-box',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    />
                )}
                {element.type === 'line' && (() => {
                    const thickness = element.metadata?.height || 10;
                    const color = element.metadata?.symbolColor || '#8B5CF6';
                    const lineType = element.metadata?.lineType || 'normal';
                    const isCurved = !!element.metadata?.isCurved;

                    if (isCurved) {
                        const curvature = element.metadata?.curvature ?? -40;
                        const curveSkew = element.metadata?.curveSkew ?? 0;
                        const widthPx = (element.width / 100) * 360;
                        const heightPx = (element.height / 100) * 640;
                        const y0 = heightPx / 2;

                        const mx = widthPx / 2 + curveSkew;
                        const my = y0 + curvature;

                        // Quadratic Bézier control point: P1 = 2*M - 0.5*(P0 + P2)
                        const cx = 2 * mx - widthPx / 2;
                        const cy = 2 * my - y0;

                        const pathData = `M 0 ${y0} Q ${cx} ${cy} ${widthPx} ${y0}`;

                        let strokeDash = undefined;
                        let strokeLinecap = 'round';
                        let filter = undefined;

                        if (lineType === 'dotted') {
                            strokeDash = `${Math.max(1, thickness * 0.15)} ${thickness * 1.6}`;
                            strokeLinecap = 'round';
                        } else if (lineType === 'cutting') {
                            strokeDash = `${thickness * 2.5} ${thickness * 1.5}`;
                            strokeLinecap = 'butt';
                        } else if (lineType === 'pencil') {
                            filter = 'url(#pencil-filter-curved)';
                        } else if (lineType === 'ink') {
                            filter = 'url(#ink-filter-curved)';
                        }

                        // Tangent angles for arrow caps
                        let vxStart = 0 - cx;
                        let vyStart = y0 - cy;
                        if (vxStart === 0 && vyStart === 0) { vxStart = -1; vyStart = 0; }
                        const thetaStart = Math.atan2(vyStart, vxStart) * (180 / Math.PI);

                        let vxEnd = widthPx - cx;
                        let vyEnd = y0 - cy;
                        if (vxEnd === 0 && vyEnd === 0) { vxEnd = 1; vyEnd = 0; }
                        const thetaEnd = Math.atan2(vyEnd, vxEnd) * (180 / Math.PI);

                        const arrowSize = Math.max(16, thickness * 2.2);

                        return (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <svg
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        overflow: 'visible',
                                        pointerEvents: 'none'
                                    }}
                                    viewBox={`0 0 ${widthPx} ${heightPx}`}
                                >
                                    <defs>
                                        <filter id="pencil-filter-curved" x="-20%" y="-20%" width="140%" height="140%">
                                            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                                        </filter>
                                        <filter id="ink-filter-curved" x="-20%" y="-20%" width="140%" height="140%">
                                            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise" />
                                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
                                        </filter>
                                    </defs>

                                    {/* Bézier curve path */}
                                    <path
                                        d={pathData}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth={thickness}
                                        strokeDasharray={strokeDash}
                                        strokeLinecap={strokeLinecap}
                                        filter={filter}
                                    />

                                    {/* Start Cap */}
                                    {element.metadata?.startCap === 'arrow' && (
                                        <g transform={`translate(0, ${y0}) rotate(${thetaStart})`}>
                                            <polygon
                                                points={`0,0 ${arrowSize},${-arrowSize * 0.45} ${arrowSize * 0.75},0 ${arrowSize},${arrowSize * 0.45}`}
                                                fill={color}
                                            />
                                        </g>
                                    )}
                                    {element.metadata?.startCap === 'circle' && (
                                        <circle cx={0} cy={y0} r={thickness * 0.9} fill={color} />
                                    )}

                                    {/* End Cap */}
                                    {element.metadata?.endCap === 'arrow' && (
                                        <g transform={`translate(${widthPx}, ${y0}) rotate(${thetaEnd})`}>
                                            <polygon
                                                points={`0,0 ${-arrowSize},${-arrowSize * 0.45} ${-arrowSize * 0.75},0 ${-arrowSize},${arrowSize * 0.45}`}
                                                fill={color}
                                            />
                                        </g>
                                    )}
                                    {element.metadata?.endCap === 'circle' && (
                                        <circle cx={widthPx} cy={y0} r={thickness * 0.9} fill={color} />
                                    )}
                                </svg>
                            </div>
                        );
                    }

                    let lineStyle = {
                        width: '100%',
                        height: `${thickness}px`,
                        boxSizing: 'border-box'
                    };

                    if (lineType === 'normal') {
                        lineStyle.backgroundColor = color;
                        lineStyle.borderRadius = `${thickness / 2}px`;
                    } else if (lineType === 'dotted') {
                        lineStyle.backgroundImage = `radial-gradient(circle, ${color} 30%, transparent 35%)`;
                        lineStyle.backgroundSize = `${thickness * 2}px ${thickness}px`;
                        lineStyle.backgroundRepeat = 'repeat-x';
                        lineStyle.backgroundPosition = 'center';
                    } else if (lineType === 'cutting') {
                        lineStyle.backgroundImage = `linear-gradient(to right, ${color} 60%, transparent 60%)`;
                        lineStyle.backgroundSize = `${thickness * 3}px ${thickness}px`;
                        lineStyle.backgroundRepeat = 'repeat-x';
                        lineStyle.backgroundPosition = 'center';
                    } else if (lineType === 'pencil') {
                        lineStyle.backgroundColor = color;
                        lineStyle.borderRadius = `${thickness / 2}px`;
                        lineStyle.filter = 'url(#pencil-filter)';
                    } else if (lineType === 'ink') {
                        lineStyle.backgroundColor = color;
                        lineStyle.borderRadius = `${thickness / 2}px`;
                        lineStyle.filter = 'url(#ink-filter)';
                    }

                    return (
                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Hidden SVG Filters for hand-drawn look */}
                            <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none', visibility: 'hidden' }}>
                                <defs>
                                    <filter id="pencil-filter" x="-20%" y="-20%" width="140%" height="140%">
                                        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                                    </filter>
                                    <filter id="ink-filter" x="-20%" y="-20%" width="140%" height="140%">
                                        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise" />
                                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
                                    </filter>
                                </defs>
                            </svg>

                            {/* Line body */}
                            <div style={lineStyle} />
                            
                            {/* Start Cap */}
                            {element.metadata?.startCap === 'arrow' && (
                                <svg style={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%, -50%)', width: `${Math.max(20, (element.metadata?.height || 10) * 2.5)}px`, height: `${Math.max(20, (element.metadata?.height || 10) * 2.5)}px`, overflow: 'visible' }} viewBox="0 0 100 100">
                                    <polygon points="100,0 0,50 100,100" fill={element.metadata?.symbolColor || '#8B5CF6'} />
                                </svg>
                            )}
                            {element.metadata?.startCap === 'circle' && (
                                <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%, -50%)', width: `${(element.metadata?.height || 10) * 2}px`, height: `${(element.metadata?.height || 10) * 2}px`, borderRadius: '50%', backgroundColor: element.metadata?.symbolColor || '#8B5CF6' }} />
                            )}

                            {/* End Cap */}
                            {element.metadata?.endCap === 'arrow' && (
                                <svg style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: `${Math.max(20, (element.metadata?.height || 10) * 2.5)}px`, height: `${Math.max(20, (element.metadata?.height || 10) * 2.5)}px`, overflow: 'visible' }} viewBox="0 0 100 100">
                                    <polygon points="0,0 100,50 0,100" fill={element.metadata?.symbolColor || '#8B5CF6'} />
                                </svg>
                            )}
                            {element.metadata?.endCap === 'circle' && (
                                <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: `${(element.metadata?.height || 10) * 2}px`, height: `${(element.metadata?.height || 10) * 2}px`, borderRadius: '50%', backgroundColor: element.metadata?.symbolColor || '#8B5CF6' }} />
                            )}
                        </div>
                    );
                })()}
                {element.type === 'banner' && (
                    <Banner
                        element={element}
                        onChange={onChange}
                        isSelected={isSelected}
                        readOnly={readOnly}
                    />
                )}
                {element.type === 'balloon' && (
                    <>
                        <Balloon
                            element={element}
                            onChange={onChange}
                            isSelected={isSelected}
                        />
                        {isSelected && !translationMode && !element.metadata?.locked && (
                            <div
                                className="handle tail-handle"
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(${element.metadata?.tailPos?.x || 0}px, ${element.metadata?.tailPos?.y || 60}px) scale(${1 / element.scale})`,
                                }}
                                onMouseDown={(e) => handleStart(e, 'tail')}
                                onTouchStart={(e) => handleStart(e, 'tail')}
                            >
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: '#3b82f6',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                        )}
                    </>
                )}
                {element.type === 'image' && (
                    <>
                        <CharacterShadow element={element} />
                        <img
                            src={resolveAssetUrl(element.content)}
                            alt="sticker"
                            draggable="false"
                            style={{
                                position: 'relative',
                                zIndex: 1,
                                transform: `scale(${element.metadata?.flipX ? -1 : 1}, ${element.metadata?.flipY ? -1 : 1})`,
                                opacity: element.metadata?.opacity ?? 1,
                                filter: `brightness(${element.metadata?.brightness ?? 100}%)`,
                                width: '100%',
                                height: '100%',
                                objectFit: (element.metadata?.isSymbol && element.metadata?.symbolType?.startsWith('shape-')) ? 'fill' : 'contain'
                            }}
                        />
                    </>
                )}
                {element.type === 'popup' && (
                    <img
                        src="/assets/characters/tutuTucaSticker_SMALL.png"
                        alt="popup-sticker"
                        draggable="false"
                        style={{
                            transform: `scale(${element.metadata?.flipX ? -1 : 1}, ${element.metadata?.flipY ? -1 : 1})`,
                            opacity: element.metadata?.opacity ?? 1,
                            filter: `brightness(${element.metadata?.brightness ?? 100}%)`,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }}
                    />
                )}
                {element.type === 'quiz' && (
                    <div className={`sticker-quiz-wysiwyg ${element.metadata?.quizType === 'field' ? 'field-wysiwyg' : ''}`}
                        onClick={(e) => {
                            const isLockedQuiz = element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem' || element.metadata?.quizType === 'type';
                            if (isLockedQuiz && !isSelected) {
                                e.stopPropagation();
                                onSelect(element.id);
                            }
                        }}
                    >
                        <QuizEditor
                            element={element}
                            onChange={(id, updates) => onChange(id, { metadata: { ...element.metadata, ...updates } })}
                            onSelect={onSelect}
                            translationMode={translationMode}
                        />
                    </div>
                )}
                {element.type === 'result_field' && (
                    <ResultField
                        element={element}
                        slide={state?.lesson?.slides?.find(s => s.id === state.currentSlideId)}
                        isPlayMode={false}
                        isSelected={isSelected}
                    />
                )}
                {element.type === 'number_line' && (
                    <NumberLine element={element} />
                )}
                {element.type === 'game' && (
                    <div className="sticker-game-preview">
                        🎮 Minigame: {element.metadata?.gameId}
                    </div>
                )}
                {element.type === 'isticker' && (
                    <div className="sticker-isticker-preview" style={{
                        background: 'linear-gradient(135deg, #0F0A2E, #1E1B4B)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        color: 'white',
                        fontFamily: '"Outfit", sans-serif',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                    }}>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, letterSpacing: '1px' }}>🧩 {element.metadata?.stickerType === 'expression_scanner_001' ? 'EXPRESSION SCANNER' : element.metadata?.stickerType === 'pemdas_term_separator' ? 'TERM SEPARATOR' : element.metadata?.stickerType === 'exponent_expander' ? 'EXPONENT EXPANDER' : 'iSTICKER'}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '2px', fontFamily: 'monospace' }}>
                            {element.metadata?.expression || '2 + 3 * 4'}
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(52, 211, 153, 0.3)', marginTop: '4px' }}>
                            <div style={{ width: '30%', height: '100%', borderRadius: '2px', background: '#34D399' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Lock icon for locked elements — always clickable so user can select them */}
            {element.metadata?.locked && !isSelected && !readOnly && element.type !== 'result_field' && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(element.id);
                    }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        background: 'rgba(0,0,0,0.45)',
                        borderRadius: '0 0 6px 0',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        opacity: 0.7,
                        zIndex: 2,
                    }}
                    title="Locked — click to select"
                >
                    🔒
                </div>
            )}

            {isSelected && element.metadata?.groupId && (
                <div className="sticker-group-badge" title="Grouped (Cmd+G to ungroup)">
                    🔗
                </div>
            )}

            {isSelected && !translationMode && (!state.selectedElementIds || state.selectedElementIds.length <= 1) && element.type !== 'quiz' && element.type !== 'balloon' && element.type !== 'line' && !element.metadata?.locked && (
                <div className="sticker-controls">
                    {/* Top Left Resize */}
                    <div
                        className="handle resize-handle nw"
                        style={{ transform: `scale(${1 / element.scale})` }}
                        onMouseDown={(e) => handleStart(e, 'resize')}
                        onTouchStart={(e) => handleStart(e, 'resize')}
                    />
                    {/* Top Right Resize */}
                    <div
                        className="handle resize-handle ne"
                        style={{ transform: `scale(${1 / element.scale})` }}
                        onMouseDown={(e) => handleStart(e, 'resize')}
                        onTouchStart={(e) => handleStart(e, 'resize')}
                    />
                    {/* Bottom Left Resize */}
                    <div
                        className="handle resize-handle sw"
                        style={{ transform: `scale(${1 / element.scale})` }}
                        onMouseDown={(e) => handleStart(e, 'resize')}
                        onTouchStart={(e) => handleStart(e, 'resize')}
                    />
                    {/* Bottom Right Resize */}
                    <div
                        className="handle resize-handle se"
                        style={{ transform: `scale(${1 / element.scale})` }}
                        onMouseDown={(e) => handleStart(e, 'resize')}
                        onTouchStart={(e) => handleStart(e, 'resize')}
                    />

                    {/* East Resize */}
                    {(element.type === 'text' || element.type === 'collectible' || element.type === 'number_line') && (
                        <div
                            className="handle resize-handle e"
                            style={{
                                right: 0, top: '50%', marginRight: '-6px', marginTop: '-6px',
                                cursor: 'ew-resize',
                                position: 'absolute',
                                width: '12px', height: '12px',
                                backgroundColor: 'white',
                                border: '1px solid #3b82f6',
                                pointerEvents: 'auto',
                                transform: `scale(${1 / element.scale})`
                            }}
                            onMouseDown={(e) => handleStart(e, 'resize-e')}
                            onTouchStart={(e) => handleStart(e, 'resize-e')}
                        />
                    )}
                    
                    {/* West Resize */}
                    {(element.type === 'text' || element.type === 'collectible' || element.type === 'number_line') && (
                        <div
                            className="handle resize-handle w"
                            style={{
                                left: 0, top: '50%', marginLeft: '-6px', marginTop: '-6px',
                                cursor: 'ew-resize',
                                position: 'absolute',
                                width: '12px', height: '12px',
                                backgroundColor: 'white',
                                border: '1px solid #3b82f6',
                                pointerEvents: 'auto',
                                transform: `scale(${1 / element.scale})`
                            }}
                            onMouseDown={(e) => handleStart(e, 'resize-w')}
                            onTouchStart={(e) => handleStart(e, 'resize-w')}
                        />
                    )}

                    {/* North Resize */}
                    {element.type === 'number_line' && (
                        <div
                            className="handle resize-handle n"
                            style={{
                                top: 0, left: '50%', marginLeft: '-6px', marginTop: '-6px',
                                cursor: 'ns-resize',
                                position: 'absolute',
                                width: '12px', height: '12px',
                                backgroundColor: 'white',
                                border: '1px solid #3b82f6',
                                pointerEvents: 'auto',
                                transform: `scale(${1 / element.scale})`
                            }}
                            onMouseDown={(e) => handleStart(e, 'resize-n')}
                            onTouchStart={(e) => handleStart(e, 'resize-n')}
                        />
                    )}

                    {/* South Resize */}
                    {element.type === 'number_line' && (
                        <div
                            className="handle resize-handle s"
                            style={{
                                bottom: 0, left: '50%', marginLeft: '-6px', marginBottom: '-6px',
                                cursor: 'ns-resize',
                                position: 'absolute',
                                width: '12px', height: '12px',
                                backgroundColor: 'white',
                                border: '1px solid #3b82f6',
                                pointerEvents: 'auto',
                                transform: `scale(${1 / element.scale})`
                            }}
                            onMouseDown={(e) => handleStart(e, 'resize-s')}
                            onTouchStart={(e) => handleStart(e, 'resize-s')}
                        />
                    )}

                    {/* Rotate Handle */}
                    <div
                        className="handle rotate-handle"
                        style={{ transform: `scale(${1 / element.scale})` }}
                        onMouseDown={(e) => handleStart(e, 'rotate')}
                        onTouchStart={(e) => handleStart(e, 'rotate')}
                    >
                        ↻
                    </div>
                </div>
            )}

            {isSelected && !translationMode && (!state.selectedElementIds || state.selectedElementIds.length <= 1) && element.type === 'quiz' && element.metadata?.quizType === 'field' && !element.metadata?.locked && (
                <div className="sticker-controls">
                    {/* Rotate Handle for Field Quiz */}
                    <div
                        className="handle rotate-handle"
                        style={{ transform: `scale(${1 / element.scale})` }}
                        onMouseDown={(e) => handleStart(e, 'rotate')}
                        onTouchStart={(e) => handleStart(e, 'rotate')}
                    >
                        ↻
                    </div>
                </div>
            )}


            {isSelected && !translationMode && (!state.selectedElementIds || state.selectedElementIds.length <= 1) && element.type === 'line' && (
                <div className="sticker-controls">
                    {/* If curved, render dashed guideline between the 3 points */}
                    {element.metadata?.isCurved && (() => {
                        const curvature = element.metadata?.curvature ?? -40;
                        const curveSkew = element.metadata?.curveSkew ?? 0;
                        const widthPx = (element.width / 100) * 360;
                        const heightPx = (element.height / 100) * 640;
                        const y0 = heightPx / 2;
                        const mx = widthPx / 2 + curveSkew;
                        const my = y0 + curvature;

                        return (
                            <svg
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    overflow: 'visible',
                                    pointerEvents: 'none'
                                }}
                                viewBox={`0 0 ${widthPx} ${heightPx}`}
                            >
                                <polyline
                                    points={`0,${y0} ${mx},${my} ${widthPx},${y0}`}
                                    fill="none"
                                    stroke="#8B5CF6"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 3"
                                    opacity="0.6"
                                />
                            </svg>
                        );
                    })()}

                    {/* Point 1: Line Start Handle */}
                    <div
                        className="handle resize-handle w"
                        style={{
                            left: 0, top: '50%', marginLeft: '-8px', marginTop: '-8px',
                            cursor: 'pointer',
                            position: 'absolute',
                            width: '16px', height: '16px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            border: '2px solid #3b82f6',
                            pointerEvents: 'auto',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            transform: `scale(${1 / element.scale})`
                        }}
                        onMouseDown={(e) => handleStart(e, 'line-start')}
                        onTouchStart={(e) => handleStart(e, 'line-start')}
                        title="Start Point (Point 1)"
                    />

                    {/* Point 2: Curvature Apex Handle (when curved) */}
                    {element.metadata?.isCurved && (() => {
                        const curvature = element.metadata?.curvature ?? -40;
                        const curveSkew = element.metadata?.curveSkew ?? 0;
                        return (
                            <div
                                className="handle curve-handle"
                                style={{
                                    left: `calc(50% + ${curveSkew}px)`,
                                    top: `calc(50% + ${curvature}px)`,
                                    marginLeft: '-11px',
                                    marginTop: '-11px',
                                    cursor: 'grab',
                                    position: 'absolute',
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    backgroundColor: '#8B5CF6',
                                    border: '2.5px solid white',
                                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.65)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'auto',
                                    zIndex: 10,
                                    transform: `scale(${1 / element.scale})`
                                }}
                                onMouseDown={(e) => handleStart(e, 'line-curve')}
                                onTouchStart={(e) => handleStart(e, 'line-curve')}
                                title="Curvature Control (Point 2) — Drag to change curvature"
                            >
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'white' }} />
                            </div>
                        );
                    })()}
                    
                    {/* Point 3: Line End Handle */}
                    <div
                        className="handle resize-handle e"
                        style={{
                            right: 0, top: '50%', marginRight: '-8px', marginTop: '-8px',
                            cursor: 'pointer',
                            position: 'absolute',
                            width: '16px', height: '16px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            border: '2px solid #3b82f6',
                            pointerEvents: 'auto',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            transform: `scale(${1 / element.scale})`
                        }}
                        onMouseDown={(e) => handleStart(e, 'line-end')}
                        onTouchStart={(e) => handleStart(e, 'line-end')}
                        title="End Point (Point 3)"
                    />

                    {/* Rotate Handle */}
                    <div
                        className="handle rotate-handle"
                        style={{ transform: `scale(${1 / element.scale})` }}
                        onMouseDown={(e) => handleStart(e, 'rotate')}
                        onTouchStart={(e) => handleStart(e, 'rotate')}
                        title="Rotate"
                    >
                        ↻
                    </div>
                </div>
            )}

            {isSelected && !translationMode && (!state.selectedElementIds || state.selectedElementIds.length <= 1) && (element.type === 'balloon' || element.type === 'banner' || (element.type === 'image' && element.metadata?.isSymbol && element.metadata?.symbolType?.startsWith('shape-'))) && (
                <div className="sticker-controls">
                    {/* North Resize */}
                    <div
                        className="handle resize-handle n"
                        style={{
                            top: 0, left: '50%', marginLeft: '-6px', marginTop: '-6px',
                            cursor: 'ns-resize',
                            position: 'absolute',
                            width: '12px', height: '12px',
                            backgroundColor: 'white',
                            border: '1px solid #3b82f6',
                            pointerEvents: 'auto',
                            transform: `scale(${1 / element.scale})`
                        }}
                        onMouseDown={(e) => handleStart(e, 'resize-n')}
                        onTouchStart={(e) => handleStart(e, 'resize-n')}
                    />
                    {/* South Resize */}
                    <div
                        className="handle resize-handle s"
                        style={{
                            bottom: 0, left: '50%', marginLeft: '-6px', marginBottom: '-6px',
                            cursor: 'ns-resize',
                            position: 'absolute',
                            width: '12px', height: '12px',
                            backgroundColor: 'white',
                            border: '1px solid #3b82f6',
                            pointerEvents: 'auto',
                            transform: `scale(${1 / element.scale})`
                        }}
                        onMouseDown={(e) => handleStart(e, 'resize-s')}
                        onTouchStart={(e) => handleStart(e, 'resize-s')}
                    />
                    {/* East Resize */}
                    <div
                        className="handle resize-handle e"
                        style={{
                            right: 0, top: '50%', marginRight: '-6px', marginTop: '-6px',
                            cursor: 'ew-resize',
                            position: 'absolute',
                            width: '12px', height: '12px',
                            backgroundColor: 'white',
                            border: '1px solid #3b82f6',
                            pointerEvents: 'auto',
                            transform: `scale(${1 / element.scale})`
                        }}
                        onMouseDown={(e) => handleStart(e, 'resize-e')}
                        onTouchStart={(e) => handleStart(e, 'resize-e')}
                    />
                    {/* West Resize */}
                    <div
                        className="handle resize-handle w"
                        style={{
                            left: 0, top: '50%', marginLeft: '-6px', marginTop: '-6px',
                            cursor: 'ew-resize',
                            position: 'absolute',
                            width: '12px', height: '12px',
                            backgroundColor: 'white',
                            border: '1px solid #3b82f6',
                            pointerEvents: 'auto',
                            transform: `scale(${1 / element.scale})`
                        }}
                        onMouseDown={(e) => handleStart(e, 'resize-w')}
                        onTouchStart={(e) => handleStart(e, 'resize-w')}
                    />

                    {/* Rotate Handle */}
                    <div
                        className="handle rotate-handle"
                        style={{ transform: `scale(${1 / element.scale})` }}
                        onMouseDown={(e) => handleStart(e, 'rotate')}
                        onTouchStart={(e) => handleStart(e, 'rotate')}
                    >
                        ↻
                    </div>
                </div>
            )}
        </div >
    );
});

export default Sticker;
