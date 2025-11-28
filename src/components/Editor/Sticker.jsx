import React, { useRef, useState, useEffect } from 'react';
import './Sticker.css';
import QuizEditor from './QuizEditor';
import Balloon from './Balloon';

/**
 * Sticker Component
 * 
 * Represents a single element on the canvas (text, image, quiz, etc.).
 * Handles its own drag-and-drop, resizing, and rotation interactions.
 * 
 * Wrapped in React.memo to prevent re-renders when other stickers change,
 * provided its props (element, callbacks) remain stable.
 */
const Sticker = React.memo(({ element, isSelected, onSelect, onChange, onEdit, onDelete }) => {
    const stickerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [interactionType, setInteractionType] = useState(null); // 'move', 'resize', 'rotate'

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
        e.stopPropagation();
        // Only select if not already selected to avoid re-triggering selection logic unnecessarily
        if (!isSelected) {
            onSelect(element.id);
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

        // For rotation calculation
        const rect = stickerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const handleMove = (moveEvent) => {
            moveEvent.preventDefault(); // Prevent scrolling/selection while dragging
            const moveCoords = getClientCoords(moveEvent);
            const dx = moveCoords.x - startX;
            const dy = moveCoords.y - startY;

            const parent = stickerRef.current.parentElement;
            const parentWidth = parent.offsetWidth;
            const parentHeight = parent.offsetHeight;

            if (type === 'move') {
                // Calculate new position as percentage of parent
                const newX = startLeft + (dx / parentWidth) * 100;
                const newY = startTop + (dy / parentHeight) * 100;
                onChange(element.id, { x: newX, y: newY });
            } else if (type === 'resize') {
                // Simple resize logic: adjust scale based on horizontal drag distance
                const newScale = startScale + (dx / 100);
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
                const currentTailY = element.metadata?.tailPos?.y || 20;

                onChange(element.id, {
                    metadata: {
                        ...element.metadata,
                        tailPos: { x: currentTailX + dx, y: currentTailY + dy }
                    }
                });
            }
        };

        const handleEnd = () => {
            setIsDragging(false);
            setInteractionType(null);
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    };

    return (
        <div
            ref={stickerRef}
            className={`sticker ${isSelected ? 'selected' : ''}`}
            style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: element.type === 'text' || element.type === 'quiz' ? 'auto' : `${element.width}%`,
                height: element.type === 'text' || element.type === 'quiz' ? 'auto' : `${element.height}%`,
                transform: `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${element.scale})`,
                zIndex: isSelected ? 100 : 1,
            }}
            onMouseDown={(e) => handleStart(e, 'move')}
            onTouchStart={(e) => handleStart(e, 'move')}
            onDoubleClick={() => {
                if (element.type !== 'quiz' && onEdit) onEdit();
            }}
        >
            <div className="sticker-content">
                {element.type === 'text' && (
                    <div
                        className="sticker-text"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => {
                            // Update state but don't force re-render of children
                            onChange(element.id, { content: e.currentTarget.innerText });
                        }}
                        ref={(el) => {
                            if (el && el.innerText !== element.content && document.activeElement !== el) {
                                el.innerText = element.content;
                            }
                        }}
                        style={{
                            fontFamily: element.metadata?.fontFamily || 'Nunito',
                            color: element.metadata?.color || 'black',
                            backgroundColor: element.metadata?.backgroundColor || 'transparent',
                            padding: element.metadata?.backgroundColor ? '0.5rem' : '0',
                            borderRadius: element.metadata?.borderRadius || '8px',
                            border: element.metadata?.border || 'none',
                            lineHeight: 1,
                            position: 'relative',
                            outline: 'none',
                            cursor: 'text',
                            userSelect: 'text',
                            pointerEvents: isSelected ? 'auto' : 'none',
                            minWidth: '50px', // Ensure it's clickable if empty
                        }}
                    />
                )}
                {element.type === 'balloon' && (
                    <>
                        <Balloon
                            element={element}
                            onChange={onChange}
                            isSelected={isSelected}
                        />
                        {isSelected && (
                            <div
                                className="handle tail-handle"
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(${element.metadata?.tailPos?.x || 20}px, ${element.metadata?.tailPos?.y || 50}px) scale(${1 / element.scale})`,
                                }}
                                onMouseDown={(e) => handleStart(e, 'tail')}
                                onTouchStart={(e) => handleStart(e, 'tail')}
                            >
                                📍
                            </div>
                        )}
                    </>
                )}
                {element.type === 'image' && (
                    <img
                        src={element.content}
                        alt="sticker"
                        draggable="false"
                        style={{
                            transform: `scale(${element.metadata?.flipX ? -1 : 1}, ${element.metadata?.flipY ? -1 : 1})`,
                            opacity: element.metadata?.opacity ?? 1,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }}
                    />
                )}
                {element.type === 'quiz' && (
                    <div className="sticker-quiz-wysiwyg">
                        <QuizEditor
                            element={element}
                            onChange={(id, updates) => onChange(id, { metadata: { ...element.metadata, ...updates } })}
                        />
                    </div>
                )}
                {element.type === 'game' && (
                    <div className="sticker-game-preview">
                        🎮 Minigame: {element.metadata?.gameId}
                    </div>
                )}
            </div>

            {
                isSelected && element.type !== 'quiz' && (
                    <div className="sticker-controls">
                        <div
                            className="handle resize-handle"
                            style={{ transform: `scale(${1 / element.scale})` }}
                            onMouseDown={(e) => handleStart(e, 'resize')}
                            onTouchStart={(e) => handleStart(e, 'resize')}
                        >
                            ↔️
                        </div>
                        <div
                            className="handle rotate-handle"
                            style={{ transform: `scale(${1 / element.scale})` }}
                            onMouseDown={(e) => handleStart(e, 'rotate')}
                            onTouchStart={(e) => handleStart(e, 'rotate')}
                        >
                            🔄
                        </div>
                    </div>
                )
            }
        </div >
    );
});

export default Sticker;
