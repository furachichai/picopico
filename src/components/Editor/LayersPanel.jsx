import React, { useState, useRef, useCallback } from 'react';
import './LayersPanel.css';
import { useDraggable } from '../../hooks/useDraggable';

/**
 * Determines if an element type is "pinned" (always on top, cannot be reordered).
 */
const isPinnedType = (type) => ['quiz', 'isticker', 'game'].includes(type);

/**
 * Gets an icon for the element type.
 */
const getTypeIcon = (element) => {
    switch (element.type) {
        case 'image': return '🖼️';
        case 'text': return '📝';
        case 'balloon': return '💬';
        case 'quiz': return '🎯';
        case 'line': return '━';
        case 'isticker': return '🧩';
        case 'game': return '🎮';
        case 'popup': return '📌';
        default: return '◻️';
    }
};

/**
 * Derives a display name for an element.
 */
const getElementName = (element) => {
    switch (element.type) {
        case 'image': {
            const path = element.content || '';
            const filename = path.split('/').pop() || 'Image';
            // Remove extension for cleaner display
            return filename.replace(/\.(png|jpg|jpeg|svg|webp|gif)$/i, '');
        }
        case 'text': {
            const raw = (element.content || '').replace(/<[^>]*>/g, '').trim();
            return raw.length > 0 ? (raw.length > 22 ? raw.slice(0, 22) + '…' : raw) : 'Text';
        }
        case 'balloon': {
            const raw = (element.content || '').replace(/<[^>]*>/g, '').trim();
            return raw.length > 0 ? 'Balloon: ' + (raw.length > 14 ? raw.slice(0, 14) + '…' : raw) : 'Balloon';
        }
        case 'quiz': {
            const qt = element.metadata?.quizType || 'mc';
            const labels = { mc: 'Multiple Choice', tf: 'True/False', nl: 'Number Line', chatquiz: 'Chat Quiz', pem: 'PEMDAS', match: 'Match', conecta: 'Conecta' };
            return `Quiz — ${labels[qt] || qt}`;
        }
        case 'line': return 'Line';
        case 'isticker': {
            const st = element.metadata?.stickerType || '';
            if (st === 'expression_scanner_001') return 'iSticker — Scanner';
            if (st === 'pemdas_term_separator') return 'iSticker — Separator';
            if (st === 'exponent_expander') return 'iSticker — Exponent';
            return 'iSticker';
        }
        case 'popup': return 'Popup';
        case 'game': return `Game — ${element.metadata?.gameId || ''}`;
        default: return element.type;
    }
};

const LayersPanel = ({ elements, selectedElementIds, onSelect, onReorderTo, onToggleLock, onToggleVisibility, isOpen, onToggle, onReorder }) => {
    const [dragState, setDragState] = useState(null); // { elementId, startIndex }
    const [dropIndex, setDropIndex] = useState(null); // visual drop indicator position
    const listRef = useRef(null);
    const { popupRef, dragHandlers, style } = useDraggable('layersPanel');

    // Separate pinned (quiz/isticker/game) from draggable elements
    // Display order: reversed array (top of z-stack = top of list)
    const reversedElements = [...elements].reverse();
    const pinnedElements = reversedElements.filter(el => isPinnedType(el.type));
    const draggableElements = reversedElements.filter(el => !isPinnedType(el.type));

    const isSelected = useCallback((id) => selectedElementIds?.includes(id), [selectedElementIds]);

    const handleRowClick = (e, elementId) => {
        e.stopPropagation();
        const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
        onSelect(elementId, isMulti);
    };

    // ─── Drag-to-Reorder (pointer-based) ───
    const handleDragStart = (e, element, displayIndex) => {
        if (isPinnedType(element.type)) return;
        
        // If clicking action buttons, do NOT start a drag or selection
        if (e.target.closest('.layer-action-btn')) {
            return;
        }

        e.stopPropagation();
        e.preventDefault();

        // Select immediately on pointerdown (matches Figma/design tool behavior)
        const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
        onSelect(element.id, isMulti);

        const startY = e.clientY;
        setDragState({ elementId: element.id, displayIndex });

        const handleDragMove = (moveEvent) => {
            moveEvent.preventDefault();
            const listEl = listRef.current;
            if (!listEl) return;

            const rows = listEl.querySelectorAll('.layer-row:not(.pinned-row)');
            const mouseY = moveEvent.clientY;

            let closestIdx = 0;
            let closestDist = Infinity;

            rows.forEach((row, i) => {
                const rect = row.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const dist = Math.abs(mouseY - midY);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = i;
                    // If mouse is below midpoint, drop AFTER this row
                    if (mouseY > midY) closestIdx = i + 1;
                }
            });

            setDropIndex(closestIdx);
        };

        const handleDragEnd = () => {
            document.removeEventListener('pointermove', handleDragMove);
            document.removeEventListener('pointerup', handleDragEnd);

            if (dragState && dropIndex !== null) {
                // Convert display indices back to array indices
                // Display is reversed, so we need to convert
                const draggableOnly = elements.filter(el => !isPinnedType(el.type));
                const fromDisplayIdx = draggableElements.findIndex(el => el.id === element.id);
                
                if (fromDisplayIdx !== -1 && dropIndex !== fromDisplayIdx && dropIndex !== fromDisplayIdx + 1) {
                    // Convert reversed display index to real array index
                    // draggableElements is reversed, so display 0 = last in array
                    const realFromIndex = elements.indexOf(elements.find(el => el.id === element.id));
                    
                    // The drop position in display space (reversed) needs to be converted
                    let targetDisplayIdx = dropIndex > fromDisplayIdx ? dropIndex - 1 : dropIndex;
                    targetDisplayIdx = Math.max(0, Math.min(targetDisplayIdx, draggableOnly.length - 1));
                    
                    // Convert: display index (reversed) to real array index
                    // In reversed display, index 0 = last real index among draggable elements
                    const sortedDraggable = elements.filter(el => !isPinnedType(el.type));
                    const realTargetIdx = elements.indexOf(sortedDraggable[sortedDraggable.length - 1 - targetDisplayIdx]);
                    
                    if (realFromIndex !== -1 && realTargetIdx !== -1) {
                        onReorderTo(element.id, realTargetIdx);
                    }
                }
            }

            setDragState(null);
            setDropIndex(null);
        };

        document.addEventListener('pointermove', handleDragMove);
        document.addEventListener('pointerup', handleDragEnd);
    };

    return (
        <>
            {/* Toggle tab */}
            <div
                className={`layers-toggle-tab ${isOpen ? 'panel-open' : ''}`}
                onClick={onToggle}
                title={isOpen ? 'Hide Layers' : 'Show Layers'}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                </svg>
            </div>

            {/* Panel */}
            <div ref={popupRef} style={style} className={`layers-panel ${isOpen ? '' : 'collapsed'}`}>
                <div className="layers-panel-header" {...dragHandlers}>
                    <span className="layers-panel-title">Layers</span>
                    <button className="layers-panel-close" onClick={onToggle} title="Close">
                        ✕
                    </button>
                </div>

                {elements.length === 0 ? (
                    <div className="layers-empty">No elements</div>
                ) : (
                    <div className="layers-list" ref={listRef}>
                        {/* Pinned elements (quiz, isticker, game) */}
                        {pinnedElements.map((element) => (
                            <div
                                key={element.id}
                                className={`layer-row pinned-row ${isSelected(element.id) ? 'selected' : ''} ${element.metadata?.hidden ? 'hidden-element' : ''}`}
                                onClick={(e) => handleRowClick(e, element.id)}
                            >
                                <div className="layer-drag-handle pinned" title="Pinned">📌</div>
                                <div className="layer-type-icon">{getTypeIcon(element)}</div>
                                <span className="layer-name">{getElementName(element)}</span>
                                <div className={`layer-actions ${(element.metadata?.locked || element.metadata?.hidden) ? 'has-active' : ''}`}>
                                    <button
                                        className={`layer-action-btn ${element.metadata?.hidden ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }}
                                        title={element.metadata?.hidden ? 'Show' : 'Hide'}
                                    >
                                        {element.metadata?.hidden ? '👁‍🗨' : '👁'}
                                    </button>
                                    <button
                                        className={`layer-action-btn ${element.metadata?.locked ? 'active locked' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); onToggleLock(element.id); }}
                                        title={element.metadata?.locked ? 'Unlock' : 'Lock'}
                                    >
                                        {element.metadata?.locked ? '🔒' : '🔓'}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Separator if there are both pinned and draggable elements */}
                        {pinnedElements.length > 0 && draggableElements.length > 0 && (
                            <div className="layers-pinned-separator" />
                        )}

                        {/* Draggable elements */}
                        {draggableElements.map((element, displayIdx) => {
                            const isTopDraggable = displayIdx === 0;
                            const isBottomDraggable = displayIdx === draggableElements.length - 1;

                            return (
                                <div
                                    key={element.id}
                                    className={`layer-row ${isSelected(element.id) ? 'selected' : ''} ${dragState?.elementId === element.id ? 'dragging' : ''} ${element.metadata?.hidden ? 'hidden-element' : ''}`}
                                    onPointerDown={(e) => handleDragStart(e, element, displayIdx)}
                                    onClick={(e) => handleRowClick(e, element.id)}
                                >
                                    {/* Drop indicator */}
                                    {dropIndex === displayIdx && dragState && dragState.elementId !== element.id && (
                                        <div className="layer-drop-indicator top" />
                                    )}

                                    <div
                                        className="layer-drag-handle"
                                        title="Drag to reorder"
                                    >
                                        ⠿
                                    </div>
                                    <div className="layer-type-icon">{getTypeIcon(element)}</div>
                                    <span className="layer-name">{getElementName(element)}</span>
                                    <div className={`layer-actions ${(element.metadata?.locked || element.metadata?.hidden) ? 'has-active' : ''}`}>
                                        <button
                                            className="layer-action-btn"
                                            disabled={isTopDraggable}
                                            onClick={(e) => { e.stopPropagation(); onReorder(element.id, 'forward'); }}
                                            title="Move Up"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            className="layer-action-btn"
                                            disabled={isBottomDraggable}
                                            onClick={(e) => { e.stopPropagation(); onReorder(element.id, 'backward'); }}
                                            title="Move Down"
                                        >
                                            ▼
                                        </button>
                                        <button
                                            className={`layer-action-btn ${element.metadata?.hidden ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }}
                                            title={element.metadata?.hidden ? 'Show' : 'Hide'}
                                        >
                                            {element.metadata?.hidden ? '👁‍🗨' : '👁'}
                                        </button>
                                        <button
                                            className={`layer-action-btn ${element.metadata?.locked ? 'active locked' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); onToggleLock(element.id); }}
                                            title={element.metadata?.locked ? 'Unlock' : 'Lock'}
                                        >
                                            {element.metadata?.locked ? '🔒' : '🔓'}
                                        </button>
                                    </div>

                                {/* Drop indicator at bottom of last element */}
                                {dropIndex === draggableElements.length && displayIdx === draggableElements.length - 1 && dragState && (
                                    <div className="layer-drop-indicator bottom" />
                                )}
                            </div>
                        )})}
                    </div>
                )}
            </div>
        </>
    );
};

export default LayersPanel;
