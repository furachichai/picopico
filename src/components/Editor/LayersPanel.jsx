import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Lock, Unlock } from 'lucide-react';
import './LayersPanel.css';
import { useDraggable } from '../../hooks/useDraggable';

/**
 * Determines if an element type is "pinned" (always on top, cannot be reordered).
 */
const isPinnedType = (type) => ['quiz', 'isticker', 'game', 'result_field', 'explorenl_nl', 'explorenl_equation', 'cartridge'].includes(type);

/**
 * Gets an icon for the element type.
 */
const getTypeIcon = (element) => {
    if (element.icon) return element.icon;
    switch (element.type) {
        case 'explorenl_nl': return '📈';
        case 'explorenl_equation': return '🔢';
        case 'cartridge': return '🎮';
        case 'image': return '🖼️';
        case 'text': return '📝';
        case 'balloon': return '💬';
        case 'banner': return '🪧';
        case 'quiz': return '🎯';
        case 'line': return element.metadata?.isCurved ? '⌒' : '━';
        case 'isticker': return '🧩';
        case 'game': return '🎮';
        case 'popup': return '📌';
        case 'collectible': return '🃏';
        case 'result_field': return '🔲';
        case 'number_line': return '📏';
        default: return '◻️';
    }
};

/**
 * Gets a representative color for the element based on its slide properties or element type.
 */
const getElementColor = (element) => {
    if (element.color) return element.color;
    if (element.metadata?.color && element.metadata.color !== 'transparent' && element.metadata.color !== '#000000' && element.metadata.color !== 'black') {
        return element.metadata.color;
    }
    if (element.metadata?.backgroundColor && element.metadata.backgroundColor !== 'transparent') {
        return element.metadata.backgroundColor;
    }
    if (element.metadata?.bannerColor) return element.metadata.bannerColor;
    if (element.metadata?.symbolColor) return element.metadata.symbolColor;

    switch (element.type) {
        case 'explorenl_nl':
            return '#6366F1'; // Indigo
        case 'explorenl_equation':
            return '#F57C00'; // Amber/Orange
        case 'cartridge':
            return '#8B5CF6'; // Violet
        case 'banner':
            return '#F43F5E'; // Rose / Coral
        case 'balloon':
            return '#EAB308'; // Warm Yellow
        case 'text':
            return '#10B981'; // Emerald
        case 'quiz':
            return '#A855F7'; // Purple
        case 'line':
            return '#EC4899'; // Pink
        case 'image':
            return '#0EA5E9'; // Sky Blue
        case 'collectible':
            return '#F97316'; // Orange
        case 'isticker':
            return '#8B5CF6'; // Violet
        case 'number_line':
            return '#6366F1';
        case 'result_field':
            return '#64748B';
        default:
            return '#6366F1';
    }
};

/**
 * Derives a display name for an element.
 */
const getElementName = (element) => {
    if (element.name) return element.name;
    switch (element.type) {
        case 'explorenl_nl': return 'Number Line (ExploreNL)';
        case 'explorenl_equation': return 'Equation (ExploreNL)';
        case 'banner': {
            const raw = (element.content || '').replace(/<[^>]*>/g, '').trim();
            const badge = element.metadata?.badgeText ? `[${element.metadata.badgeText}] ` : '';
            return badge + (raw.length > 0 ? (raw.length > 18 ? raw.slice(0, 18) + '…' : raw) : 'Banner Card');
        }
        case 'image': {
            const path = element.content || '';
            const filename = path.split('/').pop() || 'Image';
            return filename.replace(/\.(png|jpg|jpeg|svg|webp|gif)$/i, '');
        }
        case 'text': {
            const raw = (element.content || '').replace(/<[^>]*>/g, '').trim();
            return raw.length > 0 ? (raw.length > 22 ? raw.slice(0, 22) + '…' : raw) : 'Text';
        }
        case 'collectible': {
            const raw = (element.content || '').replace(/<[^>]*>/g, '').trim();
            return raw.length > 0 ? 'Card: ' + (raw.length > 16 ? raw.slice(0, 16) + '…' : raw) : 'Collectible Card';
        }
        case 'result_field': return 'Result Field';
        case 'number_line': {
            const isVert = element.metadata?.orientation === 'vertical';
            return `Number Line (${isVert ? '↕️' : '↔️'} ${element.metadata?.startNumber ?? 0}..${element.metadata?.endNumber ?? 10})`;
        }
        case 'balloon': {
            const raw = (element.content || '').replace(/<[^>]*>/g, '').trim();
            return raw.length > 0 ? 'Balloon: ' + (raw.length > 14 ? raw.slice(0, 14) + '…' : raw) : 'Balloon';
        }
        case 'quiz': {
            const qt = element.metadata?.quizType || 'mc';
            const labels = { mc: 'Multiple Choice', tf: 'True/False', nl: 'Number Line', chatquiz: 'Chat Quiz', pem: 'PEMDAS', match: 'Match', conecta: 'Conecta', type: 'Type Answer' };
            return `Quiz — ${labels[qt] || qt}`;
        }
        case 'line': return element.metadata?.isCurved ? 'Curve (Bézier)' : 'Line';
        case 'isticker': {
            const st = element.metadata?.stickerType || '';
            if (st === 'expression_scanner_001') return 'iSticker — Scanner';
            if (st === 'pemdas_term_separator') return 'iSticker — Separator';
            if (st === 'exponent_expander') return 'iSticker — Exponent';
            return 'iSticker';
        }
        case 'popup': return 'Popup';
        case 'game': return `Game — ${element.metadata?.gameId || ''}`;
        case 'cartridge': return 'Interactive Cartridge';
        default: return element.type;
    }
};

const LayersPanel = ({
    elements = [],
    cartridge = null,
    selectedElementId = null,
    selectedElementIds = [],
    onSelect,
    onReorderTo,
    onToggleLock,
    onToggleVisibility,
    isOpen,
    onToggle,
    onReorder
}) => {
    const [dragState, setDragState] = useState(null); // { elementId, startIndex }
    const [dropIndex, setDropIndex] = useState(null); // visual drop indicator position
    const [copiedId, setCopiedId] = useState(null);
    const copyTimeoutRef = useRef(null);
    const listRef = useRef(null);
    const { popupRef, dragHandlers, style } = useDraggable('layersPanel');

    const handleCopy = (e, element) => {
        e.stopPropagation();
        if (!element || element.isInteractive) return;
        const payload = JSON.stringify({ _picopicoCopy: true, elements: [element] });

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(payload).catch((err) => {
                console.error('Failed to write to clipboard', err);
            });
        }
        try {
            localStorage.setItem('picopico-copied-element', payload);
        } catch {}

        setCopiedId(element.id);
        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
            setCopiedId(null);
        }, 1500);
    };

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    // Close on tap / click outside when open
    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) && !e.target.closest('.layers-toggle-tab')) {
                onToggle();
            }
        };
        const timer = setTimeout(() => {
            window.addEventListener('pointerdown', handleOutsideClick);
        }, 50);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('pointerdown', handleOutsideClick);
        };
    }, [isOpen, onToggle]);

    // Synthetic layers for interactive manipulatives & cartridges
    // Visual stack order for ExploreNL: Number Line (top) -> Equation (next)
    const cartridgeLayers = useMemo(() => {
        if (!cartridge) return [];
        const type = cartridge.type;
        const config = cartridge.config || {};

        if (type === 'ExploreNL' || type === 'ExloreNL') {
            return [
                {
                    id: 'cartridge:explorenl-nl',
                    type: 'explorenl_nl',
                    isInteractive: true,
                    name: 'Number Line (ExploreNL)',
                    icon: '📈',
                    color: config.lineColor || '#6366F1',
                    metadata: {
                        locked: !!config.lockNL,
                        hidden: !!config.hideNL
                    }
                },
                {
                    id: 'cartridge:explorenl-equation',
                    type: 'explorenl_equation',
                    isInteractive: true,
                    name: 'Equation (ExploreNL)',
                    icon: '🔢',
                    color: config.pointerColor || config.equationBorder || '#F57C00',
                    metadata: {
                        locked: !!config.lockEquation,
                        hidden: !!config.hideEquation
                    }
                }
            ];
        }

        const cartridgeMeta = {
            Balanza: { name: 'Balanza Scale', icon: '⚖️', color: '#F59E0B' },
            PEMDAS: { name: 'PEMDAS Manipulative', icon: '🧮', color: '#10B981' },
            Potiondas: { name: 'Potiondas Game', icon: '🧪', color: '#8B5CF6' },
            FractionAlpha: { name: 'Fraction Pizza', icon: '🍕', color: '#EF4444' },
            FractionSlicer: { name: 'Fraction Slicer', icon: '🔪', color: '#EC4899' },
            SwipeSorter: { name: 'Swipe Sorter', icon: '🗂️', color: '#3B82F6' },
            AlgeBros: { name: 'AlgeBros', icon: '📐', color: '#14B8A6' }
        };

        const meta = cartridgeMeta[type] || { name: `${type} Game`, icon: '🎮', color: '#8B5CF6' };
        return [
            {
                id: `cartridge:${type.toLowerCase()}`,
                type: 'cartridge',
                isInteractive: true,
                name: meta.name,
                icon: meta.icon,
                color: meta.color,
                metadata: {
                    locked: !!config.locked,
                    hidden: !!config.hidden
                }
            }
        ];
    }, [cartridge]);

    // Display order: reversed array (top of z-stack = top of list)
    // Interactive cartridge layers take top position (matching top z-sort)
    const reversedElements = [...elements].reverse();
    const pinnedElements = [...cartridgeLayers, ...reversedElements.filter(el => isPinnedType(el.type))];
    const draggableElements = reversedElements.filter(el => !isPinnedType(el.type));
    const totalCount = pinnedElements.length + draggableElements.length;

    // Normalizing selected element IDs
    const allSelectedIds = useMemo(() => {
        const ids = new Set(selectedElementIds || []);
        if (selectedElementId) ids.add(selectedElementId);
        return ids;
    }, [selectedElementIds, selectedElementId]);

    const isSelected = useCallback((id) => {
        if (allSelectedIds.has(id)) return true;
        if (allSelectedIds.has('cartridge') && typeof id === 'string' && id.startsWith('cartridge:')) return true;
        if (id === 'cartridge' && Array.from(allSelectedIds).some(sid => typeof sid === 'string' && sid.startsWith('cartridge:'))) return true;
        return false;
    }, [allSelectedIds]);

    // Automatically scroll to the selected element when selection changes on the slide
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const selectedEl = listRef.current.querySelector('.layer-row.selected');
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedElementId, selectedElementIds, isOpen]);

    const handleRowClick = (e, elementId) => {
        e.stopPropagation();
        const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
        onSelect(elementId, isMulti, e.altKey);
    };

    // ─── Drag-to-Reorder (pointer-based) ───
    const handleDragStart = (e, element, displayIndex) => {
        if (isPinnedType(element.type) || element.isInteractive) return;
        
        if (e.target.closest('.layer-action-btn')) {
            return;
        }

        e.stopPropagation();
        e.preventDefault();

        const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
        onSelect(element.id, isMulti, e.altKey);

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
                    if (mouseY > midY) closestIdx = i + 1;
                }
            });

            setDropIndex(closestIdx);
        };

        const handleDragEnd = () => {
            document.removeEventListener('pointermove', handleDragMove);
            document.removeEventListener('pointerup', handleDragEnd);

            if (dragState && dropIndex !== null) {
                const draggableOnly = elements.filter(el => !isPinnedType(el.type));
                const fromDisplayIdx = draggableElements.findIndex(el => el.id === element.id);
                
                if (fromDisplayIdx !== -1 && dropIndex !== fromDisplayIdx && dropIndex !== fromDisplayIdx + 1) {
                    let targetDisplayIdx = dropIndex > fromDisplayIdx ? dropIndex - 1 : dropIndex;
                    targetDisplayIdx = Math.max(0, Math.min(targetDisplayIdx, draggableOnly.length - 1));
                    
                    const sortedDraggable = elements.filter(el => !isPinnedType(el.type));
                    const realTargetIdx = elements.indexOf(sortedDraggable[sortedDraggable.length - 1 - targetDisplayIdx]);
                    const realFromIndex = elements.indexOf(elements.find(el => el.id === element.id));
                    
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

    const renderRow = (element, isPinned, displayIdx = 0, isTop = false, isBottom = false) => {
        const selected = isSelected(element.id);
        const color = getElementColor(element);
        const isHidden = !!element.metadata?.hidden;
        const isLocked = !!element.metadata?.locked;

        return (
            <div
                key={element.id}
                data-layer-id={element.id}
                className={`layer-row ${isPinned ? 'pinned-row' : ''} ${selected ? 'selected' : ''} ${dragState?.elementId === element.id ? 'dragging' : ''} ${isHidden ? 'hidden-element' : ''}`}
                style={{
                    '--row-color': color,
                    '--row-color-glow': `${color}99`,
                    '--row-color-bg': `${color}33`
                }}
                onPointerDown={!isPinned ? (e) => handleDragStart(e, element, displayIdx) : undefined}
                onClick={(e) => handleRowClick(e, element.id)}
            >
                {/* Drop indicator */}
                {!isPinned && dropIndex === displayIdx && dragState && dragState.elementId !== element.id && (
                    <div className="layer-drop-indicator top" />
                )}

                {/* Drag Handle / Pin indicator */}
                <div
                    className={`layer-drag-handle ${isPinned ? (element.isInteractive ? 'interactive' : 'pinned') : ''}`}
                    title={isPinned ? (element.isInteractive ? '⚡ Interactive Manipulative' : '📌 Pinned Layer') : 'Drag to reorder'}
                >
                    {isPinned ? (element.isInteractive ? '⚡' : '📌') : '⠿'}
                </div>

                {/* Type icon highlighted in object color */}
                <div
                    className={`layer-type-icon ${selected ? 'icon-selected' : ''}`}
                    style={{
                        backgroundColor: selected ? color : `${color}22`,
                        color: selected ? '#ffffff' : color,
                        borderColor: selected ? color : `${color}55`
                    }}
                >
                    {getTypeIcon(element)}
                </div>

                {/* Color swatch dot reflecting the object's color on the slide */}
                <div
                    className="layer-color-dot"
                    style={{ backgroundColor: color }}
                    title={`Object Color: ${color}`}
                />

                {/* Element Name */}
                <span className="layer-name">
                    {getElementName(element)}
                    {element.metadata?.groupId && (
                        <span className="layer-group-indicator" title="Grouped element">🔗</span>
                    )}
                </span>

                {/* Active / Selected Tag in Color */}
                {selected && (
                    <span
                        className="layer-selected-tag"
                        style={{
                            backgroundColor: `${color}2b`,
                            color: color,
                            borderColor: `${color}77`
                        }}
                    >
                        SELECTED
                    </span>
                )}

                {/* Actions (Move, Copy, Visibility, Lock) */}
                <div className={`layer-actions ${(isLocked || isHidden || copiedId === element.id) ? 'has-active' : ''}`}>
                    {!isPinned && (
                        <>
                            <button
                                className="layer-action-btn"
                                disabled={isTop}
                                onClick={(e) => { e.stopPropagation(); onReorder(element.id, 'forward'); }}
                                title="Move Up"
                            >
                                ▲
                            </button>
                            <button
                                className="layer-action-btn"
                                disabled={isBottom}
                                onClick={(e) => { e.stopPropagation(); onReorder(element.id, 'backward'); }}
                                title="Move Down"
                            >
                                ▼
                            </button>
                        </>
                    )}
                    {!element.isInteractive && (
                        <button
                            className={`layer-action-btn ${copiedId === element.id ? 'active-copied' : ''}`}
                            onClick={(e) => handleCopy(e, element)}
                            title={copiedId === element.id ? 'Copied to clipboard!' : 'Copy to clipboard'}
                        >
                            {copiedId === element.id ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                            )}
                        </button>
                    )}
                    <button
                        className={`layer-action-btn ${isHidden ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }}
                        title={isHidden ? 'Show' : 'Hide'}
                    >
                        {isHidden ? '👁‍🗨' : '👁'}
                    </button>
                    <button
                        className={`layer-action-btn layer-lock-btn ${isLocked ? 'locked' : 'unlocked'}`}
                        onClick={(e) => { e.stopPropagation(); onToggleLock(element.id); }}
                        title={isLocked ? 'Unlock' : 'Lock'}
                        aria-label={isLocked ? 'Unlock' : 'Lock'}
                    >
                        {isLocked ? <Lock size={15} strokeWidth={2.2} /> : <Unlock size={15} strokeWidth={2.2} />}
                    </button>
                </div>

                {/* Drop indicator at bottom of last element */}
                {!isPinned && dropIndex === draggableElements.length && isBottom && dragState && (
                    <div className="layer-drop-indicator bottom" />
                )}
            </div>
        );
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

                {totalCount === 0 ? (
                    <div className="layers-empty">No elements</div>
                ) : (
                    <div className="layers-list" ref={listRef}>
                        {/* Pinned & interactive elements */}
                        {pinnedElements.map((element) => renderRow(element, true))}

                        {/* Separator if there are both pinned and draggable elements */}
                        {pinnedElements.length > 0 && draggableElements.length > 0 && (
                            <div className="layers-pinned-separator" />
                        )}

                        {/* Draggable elements */}
                        {draggableElements.map((element, displayIdx) => {
                            const isTop = displayIdx === 0;
                            const isBottom = displayIdx === draggableElements.length - 1;
                            return renderRow(element, false, displayIdx, isTop, isBottom);
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

export default LayersPanel;
