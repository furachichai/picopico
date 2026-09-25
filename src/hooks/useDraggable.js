import { useState, useEffect, useRef } from 'react';

export function useDraggable(id) {
    const [position, setPosition] = useState(() => {
        try {
            const saved = localStorage.getItem(`draggable_${id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Ensure it's not totally off screen
                const x = Math.max(0, Math.min(parsed.x, window.innerWidth - 50));
                const y = Math.max(0, Math.min(parsed.y, window.innerHeight - 50));
                return { x, y };
            }
        } catch (e) {
            console.error('Failed to parse draggable position', e);
        }
        return null;
    });
    
    const [isDragging, setIsDragging] = useState(false);
    const popupRef = useRef(null);
    const isDraggingRef = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startMouse = useRef({ x: 0, y: 0 });
    const cleanupRef = useRef(null);
    const positionRef = useRef(position);

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const handleMouseDown = (e) => {
        // Only trigger on left mouse button
        if (e.button !== 0) return;
        
        // Prevent drag if clicking on interactive elements (buttons, inputs)
        if (e.target.closest('button') || e.target.closest('input')) return;

        if (cleanupRef.current) {
            cleanupRef.current();
        }

        isDraggingRef.current = true;
        setIsDragging(true);
        startMouse.current = { x: e.clientX, y: e.clientY };
        
        if (!positionRef.current && popupRef.current) {
            const rect = popupRef.current.getBoundingClientRect();
            startPos.current = { x: rect.left, y: rect.top };
            setPosition({ x: rect.left, y: rect.top });
        } else if (positionRef.current) {
            startPos.current = { ...positionRef.current };
        }
        
        const handleMouseMove = (ev) => {
            if (!isDraggingRef.current) return;
            
            const deltaX = ev.clientX - startMouse.current.x;
            const deltaY = ev.clientY - startMouse.current.y;
            
            const newPos = {
                x: Math.max(0, Math.min(startPos.current.x + deltaX, window.innerWidth - 100)),
                y: Math.max(0, Math.min(startPos.current.y + deltaY, window.innerHeight - 50))
            };
            
            setPosition(newPos);
        };

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                setIsDragging(false);
                if (cleanupRef.current) {
                    cleanupRef.current();
                }
                // Save to localStorage once when dragging completes (avoids 60fps I/O lag)
                if (positionRef.current) {
                    try {
                        localStorage.setItem(`draggable_${id}`, JSON.stringify(positionRef.current));
                    } catch (err) {
                        void err;
                    }
                }
            }
        };

        cleanupRef.current = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            cleanupRef.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Clean up any active listeners on unmount
    useEffect(() => {
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
            }
        };
    }, []);

    // Use !important like style properties or combine with a class
    const style = position ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
        bottom: 'auto',
        transform: 'none',
        margin: 0,
        zIndex: 9999 // Ensure it's on top when dragged
    } : {};

    return {
        popupRef,
        dragHandlers: {
            onMouseDown: handleMouseDown,
            style: { cursor: isDragging ? 'grabbing' : 'grab' }
        },
        style
    };
}
