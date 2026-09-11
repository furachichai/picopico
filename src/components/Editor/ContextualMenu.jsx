import React, { useState, useRef } from 'react';
import './ContextualMenu.css';
import { PEM_MODES, DEFAULT_PEM_LEVELS_TEXT, deserializePemLevels } from '../Player/PEMExpressionPool';
import { serializeLevels, deserializeLevels } from '../../cartridges/Potiondas/Potiondas';
import { getSymbolSvg } from '../../utils/symbols';
import { collectUsedSymbols, parseWeights } from '../../cartridges/Balanza/game/BalanzaEngine';
import { useEditor } from '../../context/EditorContext';
import { ELEMENT_TYPES } from '../../types';
import { SUPPORTED_QUIZ_TYPES, getNonOverlappingResultFieldPosition } from '../../utils/ResultFieldUtils';
import { isCharacterElement } from '../../utils/characterShadow';

const CRATE_MAP = {
    '📦x': '/assets/balanza/crate_x.png',
    'x📦': '/assets/balanza/crate_x.png',
    'crate_x': '/assets/balanza/crate_x.png',
    '[x]': '/assets/balanza/crate_x.png',
    'x': '/assets/balanza/crate_x.png',
    '📦?': '/assets/balanza/crate_q.png',
    '?📦': '/assets/balanza/crate_q.png',
    'crate_q': '/assets/balanza/crate_q.png',
    '[?]': '/assets/balanza/crate_q.png',
    '?': '/assets/balanza/crate_q.png',
    '📦': '/assets/balanza/crate.png',
    'crate': '/assets/balanza/crate.png',
    'box': '/assets/balanza/crate.png'
};

const renderEmojiOrCrate = (emoji, size = 26) => {
    const crateSrc = CRATE_MAP[emoji];
    if (crateSrc) {
        return <img src={crateSrc} alt={emoji} style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', verticalAlign: 'middle', pointerEvents: 'none' }} />;
    }
    return <span>{emoji}</span>;
};

const EMOJI_CATEGORIES = [
    {
        name: '📦 Crates & Mystery Boxes (Algebra)',
        items: ['📦x', '📦', '📦?', '🧰', '🧱', '🪵', '🧺', '💼', '🪨', '💎', '🪙', '🧪', '⚗️', '🔮', '🏺', '🗝️', '💰', '🏆', '👑', '🏅', '🎖️']
    },
    {
        name: '🍎 Fruits, Vegetables & Food',
        items: [
            '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🥑',
            '🍆', '🥕', '🌽', '🥒', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥞', '🧇', '🧀', '🍖',
            '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥗', '🍲', '🍜', '🍝', '🍠', '🍣', '🍤',
            '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍿', '☕', '🍵', '🧃', '🥤'
        ]
    },
    {
        name: '🐶 Animals & Wildlife',
        items: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦',
            '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗', '🕷️', '🐢',
            '🐍', '🦎', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍',
            '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌'
        ]
    },
    {
        name: '🎈 Objects, Sports & Toys',
        items: [
            '🎈', '🎁', '💎', '⭐', '🌟', '💥', '🔥', '✨', '⚡', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🥏',
            '🎱', '🪀', '🏓', '🏸', '🏒', '🥊', '🥋', '🛹', '🛼', '🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚐',
            '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🚀', '🛸', '🚁', '✈️', '⛵', '🚤', '🚢', '🔔', '🔑',
            '🎨', '🎲', '🎯', '🧸', '💡', '📚', '✏️', '🖍️', '🖌️', '📏', '📐', '✂️', '📌', '📎', '🔒', '🔓', '🧲', '🔭', '🔬', '🕹️', '🎮', '🧩', '🎸', '🎹', '🎺', '🎻', '🥁'
        ]
    },
    {
        name: '🌸 Nature, Plants & Weather',
        items: [
            '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '💐', '🌾', '🌿', '🍀', '🍁', '🍂', '🍃', '🌲', '🌳', '🌴', '🌵', '🌱',
            '🪴', '🍄', '🌰', '🌍', '🌎', '🌏', '🌕', '🌙', '⭐', '🌟', '💫', '🪐', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️',
            '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌈', '🌊', '💧'
        ]
    },
    {
        name: '➕ Math, Numbers & Shapes',
        items: [
            '➕', '➖', '✖️', '➗', '🟰', '🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '🟤', '⬛', '⬜', '🔺', '🔻', '🔹', '🔶',
            '🔷', '🔸', '💠', '🔘', '⚪', '⚫', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '💯', '❓', '❗',
            '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '🔣'
        ]
    }
];

const evaluateMathExpression = (expr) => {
    try {
        if (!expr) return null;
        let clean = expr
            .replace(/[xX×]/g, '*')
            .replace(/[÷]/g, '/')
            .replace(/[−—–]/g, '-')
            .replace(/\s+/g, '');
        
        if (!/^[0-9+\-*/().\s]+$/.test(clean)) {
            return null;
        }
        
        const val = new Function(`return (${clean})`)();
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
            return val;
        }
        return null;
    } catch (e) {
        return null;
    }
};

const parseFieldExpression = (expression) => {
    if (!expression) return [];
    
    const segments = [];
    let lastIndex = 0;
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let match;
    
    while ((match = regex.exec(expression)) !== null) {
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: expression.substring(lastIndex, match.index)
            });
        }
        
        const isDouble = match[1].startsWith('**');
        const expr = isDouble ? match[2] : match[3];
        const val = evaluateMathExpression(expr);
        
        segments.push({
            type: 'field',
            isDouble,
            placeholder: expr,
            evaluated: val,
            raw: match[1]
        });
        
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < expression.length) {
        segments.push({
            type: 'text',
            content: expression.substring(lastIndex)
        });
    }

    // Trim trailing/leading whitespace from text segments adjacent to fields
    for (let i = 0; i < segments.length; i++) {
        if (segments[i].type === 'text') {
            if (i + 1 < segments.length && segments[i + 1].type === 'field') {
                segments[i].content = segments[i].content.replace(/\s+$/, '');
            }
            if (i - 1 >= 0 && segments[i - 1].type === 'field') {
                segments[i].content = segments[i].content.replace(/^\s+/, '');
            }
        }
    }
    
    return segments;
};

const FONTS = [
    { name: 'Acme', value: 'Acme' },
    { name: 'Bangers (Comic)', value: '"Bangers", cursive, sans-serif' },
    { name: 'HVD Comic', value: '"HVD Comic Serif Pro", sans-serif' },
    { name: 'Outfit', value: 'Outfit' },
    { name: 'Nunito', value: 'Nunito' },
    { name: 'Nunito Sans', value: '"Nunito Sans"' },
    { name: 'Noto Sans', value: '"Noto Sans"' },
    { name: 'Source Sans', value: '"Source Sans 3"' },
    { name: 'Fira Sans', value: '"Fira Sans"' },
    { name: 'Atkinson', value: '"Atkinson Hyperlegible Next"' },
    { name: 'Comic Sans', value: '"Comic Sans MS", "Chalkboard SE", sans-serif' },
    { name: 'Serif', value: 'Georgia, serif' },
    { name: 'Monospace', value: 'monospace' },
    { name: 'Verdana', value: 'Verdana, Arial, sans-serif' },
];

const COLORS = [
    // Row 1 — Light
    '#7EC8E3', '#5EEDC9', '#69F05E', '#FDE74C', '#F88B8B', '#F9A0C7',
    // Row 2 — Medium
    '#2196F3', '#00BFA5', '#4CAF50', '#FFC107', '#F44336', '#E91E8F',
    // Row 3 — Dark
    '#0D47A1', '#00897B', '#2E7D32', '#F57C00', '#C62828', '#880E4F',
    // Row 4 — Neutrals & Paper tone
    '#FFFFFF', '#f6efdd', '#C8C8C8', '#969696', '#5A5A5A', '#000000',
];

const ColorPickerDropdown = ({ label, color, onSelect, onMouseDownItem, children, align = 'center', allowNone = false, noneLabel = "No background", extraColors = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isNone = color === 'transparent' || color === 'none';
    
    return (
        <div className="menu-group" style={{ position: 'relative' }}>
            {label && <label>{label}</label>}
            <div
                className="color-swatch-trigger"
                style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    backgroundColor: isNone ? '#ffffff' : (color || '#ffffff'),
                    border: isNone ? '1.5px solid #ef4444' : '2px solid rgba(0,0,0,0.1)', cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'transform 0.1s',
                    position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden'
                }}
                onClick={() => setIsOpen(!isOpen)}
                onMouseDown={(e) => {
                    // Prevent blur if it's a highlighter
                    if (onMouseDownItem) e.preventDefault();
                }}
            >
                {isNone && !children && (
                    <span style={{
                        position: 'absolute',
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#ef4444',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'center'
                    }} />
                )}
                {children}
            </div>
            {isOpen && (
                <>
                    <div 
                        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99 }}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        onMouseDown={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    />
                    <div className="color-picker-popup" style={{
                        position: 'absolute', bottom: 'calc(100% + 12px)',
                        ...(align === 'left' ? { left: '0px' } : align === 'right' ? { right: '0px' } : { left: '50%', transform: 'translateX(-50%)' }),
                        background: 'white', padding: '12px', borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', zIndex: 100,
                    }}>
                        {extraColors && extraColors.length > 0 && (
                            <div style={{
                                gridColumn: '1 / -1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                paddingBottom: '8px',
                                marginBottom: '6px',
                                borderBottom: '1px solid #e2e8f0'
                            }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Paper / Theme
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {extraColors.map(c => (
                                        <div
                                            key={c}
                                            className={`color-swatch ${color === c ? 'active' : ''}`}
                                            title={c === '#f6efdd' ? 'Default Paper Dark Yellow (#f6efdd)' : (c === '#fff875' ? 'Sticky Note Yellow (#fff875)' : c)}
                                            style={{
                                                backgroundColor: c,
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                border: color === c ? '2.5px solid #2563eb' : '1.5px solid rgba(0,0,0,0.18)',
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                            }}
                                            onMouseDown={(e) => {
                                                if (onMouseDownItem) onMouseDownItem(e, c);
                                            }}
                                            onClick={(e) => {
                                                if (onSelect) onSelect(c, e);
                                                setIsOpen(false);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {allowNone && (
                            <div
                                className={`color-swatch-none ${isNone ? 'active' : ''}`}
                                title={noneLabel}
                                style={{
                                    gridColumn: '1 / -1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: isNone ? '2px solid #ef4444' : '1.5px dashed #cbd5e1',
                                    backgroundColor: isNone ? '#fef2f2' : '#f8fafc',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: isNone ? '#dc2626' : '#475569',
                                    marginBottom: '4px',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fef2f2';
                                    e.currentTarget.style.borderColor = '#f87171';
                                    e.currentTarget.style.color = '#dc2626';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isNone ? '#fef2f2' : '#f8fafc';
                                    e.currentTarget.style.borderColor = isNone ? '#ef4444' : '#cbd5e1';
                                    e.currentTarget.style.color = isNone ? '#dc2626' : '#475569';
                                }}
                                onMouseDown={(e) => {
                                    if (onMouseDownItem) onMouseDownItem(e, 'transparent');
                                }}
                                onClick={(e) => {
                                    if (onSelect) onSelect('transparent', e);
                                    setIsOpen(false);
                                }}
                            >
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: '2px solid #ef4444',
                                    position: 'relative',
                                    background: '#ffffff',
                                    boxSizing: 'border-box'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '-1px',
                                        right: '-1px',
                                        height: '2px',
                                        backgroundColor: '#ef4444',
                                        transform: 'rotate(-45deg)',
                                        transformOrigin: 'center'
                                    }} />
                                </span>
                                <span>{noneLabel}</span>
                            </div>
                        )}
                        {COLORS.map(c => (
                            <div
                                key={c}
                                className={`color-swatch ${color === c ? 'active' : ''}`}
                                style={{ backgroundColor: c, width: '28px', height: '28px', borderRadius: '6px' }}
                                onMouseDown={(e) => {
                                    if (onMouseDownItem) onMouseDownItem(e, c);
                                }}
                                onClick={(e) => {
                                    if (onSelect) onSelect(c, e);
                                    setIsOpen(false);
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const ContextualMenu = ({ element, onChange, onDelete, onDuplicate, onOpenLibrary, onOpenPresets, onReorderElement, onUndo, onApplyBackgroundToAll, showGuides, onToggleGuides, translationMode = false, canGroup = false, isGrouped = false, onGroup, onUngroup }) => {
    const { state, dispatch } = useEditor();
    const [applyToAllChecked, setApplyToAllChecked] = useState(false);

    if (!element) return null;

    const currentSlide = state?.lesson?.slides?.find(s => s.id === state.currentSlideId);
    const existingResultField = currentSlide?.elements?.find(el => el.type === ELEMENT_TYPES.RESULT_FIELD);

    const handleToggleResultField = () => {
        if (!existingResultField) {
            const pos = getNonOverlappingResultFieldPosition(currentSlide);
            const fieldId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            dispatch({
                type: 'ADD_ELEMENT',
                payload: {
                    id: fieldId,
                    type: ELEMENT_TYPES.RESULT_FIELD,
                    content: '60',
                    metadata: {
                        correctAnswer: '60',
                        order: 1,
                        locked: true
                    },
                    x: pos.x,
                    y: pos.y
                }
            });
        } else {
            dispatch({ type: 'SELECT_ELEMENT', payload: existingResultField.id });
        }
    };

    const { metadata = {} } = element; // Ensure metadata exists
    const isTextType = element.type === 'balloon' || element.type === 'text' || element.type === 'collectible' || element.type === 'banner';
    const isImageType = element.type === 'image';
    const isCharacter = isImageType && isCharacterElement(element);
    const hasShadow = metadata.hasShadow !== false;

    const [activeCardIndex, setActiveCardIndex] = useState(element.config?.previewIndex || 0);
    const [showLevelsEditor, setShowLevelsEditor] = useState(false);
    const [levelsText, setLevelsText] = useState('');
    const [levelsOriginalText, setLevelsOriginalText] = useState('');
    const [showBalanzaMenuEditor, setShowBalanzaMenuEditor] = useState(false);
    const [balanzaMenuText, setBalanzaMenuText] = useState('');
    const [balanzaMenuOriginalText, setBalanzaMenuOriginalText] = useState('');

    const [emojiPickerTarget, setEmojiPickerTarget] = useState(null); // 'left' | 'right' | 'menu' | null
    const [recentEmojis, setRecentEmojis] = useState(() => {
        try {
            const saved = localStorage.getItem('pico_recent_emojis');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return ['🍎', '🍌', '🍊', '🍉', '🍓', '⭐', '🎈', '📦', '🍔', '🚀'];
    });

    const handleSelectEmoji = (emoji) => {
        if (!emojiPickerTarget) return;

        setRecentEmojis(prev => {
            const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 12);
            try { localStorage.setItem('pico_recent_emojis', JSON.stringify(next)); } catch (e) {}
            return next;
        });

        const configKey = emojiPickerTarget === 'left'
            ? 'leftPlateText'
            : emojiPickerTarget === 'right'
                ? 'rightPlateText'
                : 'menuText';

        const currentVal = element.config?.[configKey] || '';
        const nextVal = currentVal ? `${currentVal}, ${emoji}` : emoji;

        onChange('cartridge', { config: { ...element.config, [configKey]: nextVal } });
    };

    // Saved selection for per-letter quiz formatting
    const savedSelectionRef = useRef(null);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        } else {
            savedSelectionRef.current = null;
        }
    };

    const restoreSelection = () => {
        if (savedSelectionRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelectionRef.current);
            return true;
        }
        return false;
    };

    const getEditableFromSelection = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
        const container = sel.getRangeAt(0).commonAncestorContainer;
        return container.nodeType === 3
            ? container.parentElement?.closest('[contenteditable="true"]')
            : container.closest?.('[contenteditable="true"]');
    };

    const saveQuizOption = (editableEl) => {
        if (!editableEl) return;
        const optionIndex = editableEl.dataset.optionIndex;
        const matchAnswerIndex = editableEl.dataset.matchAnswerIndex;
        if (optionIndex !== undefined) {
            const currentOptions = [...(element.metadata?.options || [])];
            currentOptions[parseInt(optionIndex)] = editableEl.innerHTML;
            onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
        } else if (matchAnswerIndex !== undefined) {
            const currentAnswers = [...(element.metadata?.matchAnswers || [])];
            currentAnswers[parseInt(matchAnswerIndex)] = editableEl.innerHTML;
            onChange(element.id, { metadata: { ...element.metadata, matchAnswers: currentAnswers } });
        }
    };

    // Removed crashing useEffect that attempted to force sync. 
    // Instead, we initialize state above to match the config.

    const updateMetadata = (updates) => {
        onChange(element.id, { metadata: { ...metadata, ...updates } });
    };

    const isInteractiveSlide = !!(
        currentSlide?.cartridge ||
        currentSlide?.elements?.some(el => el.type === 'quiz' || el.type === 'game' || el.type === 'result_field') ||
        element.type === 'quiz' ||
        element.type === 'cartridge' ||
        element.type === 'result_field' ||
        element.type === 'game'
    );

    const isAutonext = !!(
        currentSlide?.autonext ||
        currentSlide?.cartridge?.config?.autonext ||
        currentSlide?.elements?.some(el => el.metadata?.autonext || el.config?.autonext) ||
        element.metadata?.autonext ||
        element.config?.autonext
    );

    const handleToggleAutonext = () => {
        const nextVal = !isAutonext;
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: {
                autonext: nextVal,
                ...(currentSlide?.cartridge ? {
                    cartridge: {
                        ...currentSlide.cartridge,
                        config: {
                            ...(currentSlide.cartridge.config || {}),
                            autonext: nextVal
                        }
                    }
                } : {})
            }
        });

        if (element.id && (element.type === 'quiz' || element.type === 'result_field' || element.type === 'game')) {
            updateMetadata({ autonext: nextVal });
        } else if (element.type === 'cartridge') {
            onChange('cartridge', {
                config: {
                    ...(element.config || {}),
                    autonext: nextVal
                }
            });
        }
    };

    const renderAutonextButton = (size = 'normal') => (
        <div className="menu-group">
            <label>Autonext</label>
            <button
                type="button"
                className={`btn-secondary ${isAutonext ? 'active' : ''}`}
                onClick={handleToggleAutonext}
                title={`Autonext: Automatically advance to next slide when task is correctly solved (${isAutonext ? 'ON' : 'OFF'})`}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: size === 'compact' ? '30px' : '34px',
                    height: size === 'compact' ? '30px' : '34px',
                    padding: 0,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isAutonext ? '#DCFCE7' : '#F1F5F9',
                    border: isAutonext ? '1.5px solid #22C55E' : '1.5px solid #CBD5E1',
                    boxShadow: isAutonext ? '0 0 0 2px rgba(34, 197, 94, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                }}
            >
                <span style={{ fontSize: '1rem', opacity: isAutonext ? 1 : 0.35, filter: isAutonext ? 'none' : 'grayscale(100%)' }}>⏭️</span>
            </button>
        </div>
    );

    const handleFormatCommand = (e, cmd, metaProp, activeValue, inactiveValue = 'normal') => {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            document.execCommand(cmd, false, null);
            const editableEl = getEditableFromSelection();
            if (editableEl) {
                const optionIndex = editableEl.dataset.optionIndex;
                const matchAnswerIndex = editableEl.dataset.matchAnswerIndex;
                if (optionIndex !== undefined || matchAnswerIndex !== undefined) {
                    saveQuizOption(editableEl);
                } else {
                    onChange(element.id, { content: editableEl.innerHTML });
                }
            }
        } else {
            updateMetadata({ [metaProp]: metadata[metaProp] === activeValue ? inactiveValue : activeValue });
        }
    };

    const handleFileUpload = (e, cardIndex) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const newCards = [...(element.config.cards || [])];
            newCards[cardIndex] = { ...newCards[cardIndex], image: ev.target.result };
            onChange('cartridge', { config: { ...element.config, cards: newCards } });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="contextual-menu">
            {(isTextType || element.type === 'background') && (
                <>
                    {element.type !== 'background' && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div className="menu-group">
                                <label>Font</label>
                                <select
                                    value={metadata.fontFamily}
                                    onChange={(e) => updateMetadata({ fontFamily: e.target.value })}
                                >
                                    {FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                                </select>
                            </div>

                            <div className="menu-group">
                                <label>Size</label>
                                <input
                                    type="number"
                                    value={metadata.fontSize}
                                    onChange={(e) => updateMetadata({ fontSize: parseInt(e.target.value) })}
                                    min="10" max="100"
                                    style={{ width: '60px' }}
                                />
                            </div>

                            <div className="menu-group">
                                <label>Leading</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={metadata.lineHeight ?? 1}
                                    onChange={(e) => updateMetadata({ lineHeight: parseFloat(e.target.value) })}
                                    min="0.5" max="3"
                                    style={{ width: '50px' }}
                                />
                            </div>

                            <div className="menu-group" style={{ flexDirection: 'row', gap: '4px' }}>
                                <button
                                    className={`btn-icon ${metadata.fontWeight === 'bold' ? 'active' : ''}`}
                                    onMouseDown={(e) => handleFormatCommand(e, 'bold', 'fontWeight', 'bold')}
                                    title="Bold"
                                    style={{ fontWeight: 'bold', fontSize: '1rem' }}
                                >B</button>
                                <button
                                    className={`btn-icon ${metadata.fontStyle === 'italic' ? 'active' : ''}`}
                                    onMouseDown={(e) => handleFormatCommand(e, 'italic', 'fontStyle', 'italic')}
                                    title="Italic"
                                    style={{ fontStyle: 'italic', fontSize: '1rem' }}
                                >I</button>
                                <button
                                    className={`btn-icon ${metadata.textDecoration === 'underline' ? 'active' : ''}`}
                                    onMouseDown={(e) => handleFormatCommand(e, 'underline', 'textDecoration', 'underline', 'none')}
                                    title="Underline"
                                    style={{ textDecoration: 'underline', fontSize: '1rem' }}
                                >U</button>
                            </div>
                        </div>
                    )}

                    {element.type !== 'background' && (
                        <ColorPickerDropdown
                            label="Text"
                            color={metadata.color || '#000000'}
                            onMouseDownItem={(e, c) => {
                                e.preventDefault(); // Prevent losing selection
                                // Check if there's a text selection inside a contentEditable
                                const sel = window.getSelection();
                                if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                                    const range = sel.getRangeAt(0);
                                    const container = range.commonAncestorContainer;
                                    const editableEl = container.nodeType === 3
                                        ? container.parentElement?.closest('[contenteditable="true"]')
                                        : container.closest?.('[contenteditable="true"]');
                                    if (editableEl) {
                                        // Apply color to selection only
                                        document.execCommand('foreColor', false, c);
                                        
                                        // Check if this is a quiz option (has data-option-index)
                                        const optionIndex = editableEl.dataset.optionIndex;
                                        if (optionIndex !== undefined) {
                                            // Update the specific option in the options array
                                            const currentOptions = [...(element.metadata?.options || [])];
                                            currentOptions[parseInt(optionIndex)] = editableEl.innerHTML;
                                            onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
                                        } else {
                                            // Regular text sticker
                                            onChange(element.id, { content: editableEl.innerHTML });
                                        }
                                        return;
                                    }
                                }
                                // Fallback: apply to whole element
                                updateMetadata({ color: c });
                            }}
                            onSelect={(c) => {
                                const sel = window.getSelection();
                                if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
                                    updateMetadata({ color: c });
                                }
                            }}
                        />
                    )}

                    {element.type !== 'background' && (
                        <ColorPickerDropdown
                            label="Text BG"
                            color="#ffc800"
                            allowNone={true}
                            children={<span style={{fontSize:'12px'}}>A</span>}
                            onMouseDownItem={(e, c) => {
                                e.preventDefault();
                                const sel = window.getSelection();
                                if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                                    const range = sel.getRangeAt(0);
                                    const container = range.commonAncestorContainer;
                                    const editableEl = container.nodeType === 3
                                        ? container.parentElement?.closest('[contenteditable="true"]')
                                        : container.closest?.('[contenteditable="true"]');
                                    if (editableEl) {
                                        document.execCommand('hiliteColor', false, c);
                                        const cleanedHtml = (c === 'transparent' || c === 'none')
                                            ? editableEl.innerHTML.replace(/background-color:\s*(?:transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)|inherit);?/gi, '')
                                            : editableEl.innerHTML;
                                        editableEl.innerHTML = cleanedHtml;
                                        const optionIndex = editableEl.dataset.optionIndex;
                                        if (optionIndex !== undefined) {
                                            const currentOptions = [...(element.metadata?.options || [])];
                                            currentOptions[parseInt(optionIndex)] = cleanedHtml;
                                            onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
                                        } else {
                                            onChange(element.id, { content: cleanedHtml });
                                        }
                                        return;
                                    }
                                }
                                if (c === 'transparent' || c === 'none') {
                                    if (element.content) {
                                        const cleaned = element.content
                                            .replace(/background-color:\s*[^;"]+;?/gi, '')
                                            .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
                                        onChange(element.id, { content: cleaned });
                                    }
                                    if (element.metadata?.options) {
                                        const currentOptions = (element.metadata.options || []).map(opt =>
                                            typeof opt === 'string'
                                                ? opt.replace(/background-color:\s*[^;"]+;?/gi, '').replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
                                                : opt
                                        );
                                        onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
                                    }
                                }
                            }}
                            onSelect={(c) => {
                                const sel = window.getSelection();
                                if ((!sel || sel.rangeCount === 0 || sel.isCollapsed) && (c === 'transparent' || c === 'none')) {
                                    if (element.content) {
                                        const cleaned = element.content
                                            .replace(/background-color:\s*[^;"]+;?/gi, '')
                                            .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
                                        onChange(element.id, { content: cleaned });
                                    }
                                    if (element.metadata?.options) {
                                        const currentOptions = (element.metadata.options || []).map(opt =>
                                            typeof opt === 'string'
                                                ? opt.replace(/background-color:\s*[^;"]+;?/gi, '').replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
                                                : opt
                                        );
                                        onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
                                    }
                                }
                            }}
                        />
                    )}

                    {element.type !== 'background' && (
                        <div className="menu-group">
                            <label>Align</label>
                            <button
                                className="btn-icon"
                                onClick={() => {
                                    const current = metadata.textAlign || 'center';
                                    const next = current === 'left' ? 'center' : current === 'center' ? 'right' : 'left';
                                    updateMetadata({ textAlign: next });
                                }}
                                title={`Align: ${metadata.textAlign || 'center'}`}
                                style={{ fontSize: '1rem', minWidth: '36px' }}
                            >
                                {(metadata.textAlign || 'center') === 'left' ? '⬅' : ((metadata.textAlign || 'center') === 'center' ? '⬛' : '➡')}
                            </button>
                        </div>
                    )}

                    <div className="menu-group" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '10px' }}>
                        <ColorPickerDropdown
                            label={element.type === 'balloon' ? 'Bubble' : (element.type === 'banner' ? 'Card' : 'Background')}
                            color={(metadata.backgroundColor && metadata.backgroundColor !== '')
                                ? metadata.backgroundColor
                                : (element.type === 'banner'
                                    ? (metadata.skin === 'paper' ? '#f6efdd' : (metadata.skin === 'sticky' ? '#fff875' : '#ffffff'))
                                    : (element.type === 'balloon' ? '#ffffff' : 'transparent'))}
                            onSelect={(c) => updateMetadata({ backgroundColor: c })}
                            align="left"
                            allowNone={true}
                            noneLabel="No background"
                            extraColors={element.type === 'banner' ? ['#f6efdd', '#fff875'] : undefined}
                        />
                        {element.type === 'banner' && (() => {
                            const currentSkin = metadata.skin || 'comic';
                            const skins = [
                                { id: 'comic', icon: '🪧', label: 'Comic Box', defaultBg: '#ffffff' },
                                { id: 'paper', icon: '📜', label: 'Taped Paper', defaultBg: '#f6efdd' },
                                { id: 'sticky', icon: '📝', label: 'Sticky Note', defaultBg: '#fff875' },
                                { id: 'notebook', icon: '📓', label: 'Notebook Paper', defaultBg: '#ffffff' },
                            ];
                            const currSkinObj = skins.find(s => s.id === currentSkin) || skins[0];

                            const shadowMode = (() => {
                                if (metadata.hasShadow === false || metadata.shadow === 'none') return 'none';
                                if (metadata.shadow === 'black') return 'black';
                                return 'grey'; // default is grey (moire)
                            })();

                            const hasTape = Boolean(metadata.showTape ?? (metadata.hideTape !== undefined ? !metadata.hideTape : false));

                            return (
                                <>
                                    <div className="menu-group">
                                        <label>Skin</label>
                                        <button
                                            className="btn-icon active"
                                            onClick={() => {
                                                const currIdx = skins.findIndex(s => s.id === currentSkin);
                                                const nextSkin = skins[(currIdx + 1) % skins.length];
                                                const updates = { skin: nextSkin.id };
                                                const prevDefaultBg = skins[currIdx >= 0 ? currIdx : 0].defaultBg;
                                                if (!metadata.backgroundColor || metadata.backgroundColor === prevDefaultBg) {
                                                    updates.backgroundColor = nextSkin.defaultBg;
                                                }
                                                updateMetadata(updates);
                                            }}
                                            title={`Skin: ${currSkinObj.label} (${currSkinObj.icon}) - Click to cycle`}
                                            style={{ fontSize: '1.1rem', minWidth: '36px', padding: '4px 6px' }}
                                        >
                                            {currSkinObj.icon}
                                        </button>
                                    </div>
                                    <div className="menu-group">
                                        <label>Tape</label>
                                        <button
                                            className={`btn-icon ${hasTape ? 'active' : ''}`}
                                            onClick={() => updateMetadata({ showTape: !hasTape, hideTape: hasTape })}
                                            title={hasTape ? "Hide Scotch Tape" : "Show Scotch Tape"}
                                            style={{ fontSize: '1rem', minWidth: '34px', padding: '4px 6px' }}
                                        >
                                            🩹
                                        </button>
                                    </div>
                                    <ColorPickerDropdown
                                        label="Border"
                                        color={metadata.borderColor || '#000000'}
                                        onSelect={(c) => updateMetadata({ borderColor: c })}
                                    />
                                    <div className="menu-group">
                                        <label>Shadow</label>
                                        <button
                                            className={`btn-icon ${shadowMode !== 'none' ? 'active' : ''}`}
                                            onClick={() => {
                                                const nextShadow = shadowMode === 'grey' ? 'black' : (shadowMode === 'black' ? 'none' : 'grey');
                                                updateMetadata({
                                                    shadow: nextShadow,
                                                    hasShadow: nextShadow !== 'none',
                                                });
                                            }}
                                            title={`Shadow: ${shadowMode === 'grey' ? 'Grey (Moire)' : (shadowMode === 'black' ? 'Black' : 'None')} (Click to cycle)`}
                                            style={{ fontSize: '1rem', minWidth: '34px', padding: '4px 6px' }}
                                        >
                                            {shadowMode === 'grey' ? '◽' : (shadowMode === 'black' ? '⬛' : '⬜')}
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                        {element.type === 'balloon' && (() => {
                            const shadowMode = (() => {
                                if (metadata.hasShadow === false || metadata.shadow === 'none') return 'none';
                                if (metadata.shadow === 'black') return 'black';
                                return 'grey'; // default is grey (moire)
                            })();

                            return (
                                <>
                                    <ColorPickerDropdown
                                        label="Border"
                                        color={metadata.borderColor || '#000000'}
                                        onSelect={(c) => updateMetadata({ borderColor: c })}
                                    />
                                    <div className="menu-group">
                                        <label>Shadow</label>
                                        <button
                                            className={`btn-icon ${shadowMode !== 'none' ? 'active' : ''}`}
                                            onClick={() => {
                                                const nextShadow = shadowMode === 'grey' ? 'black' : (shadowMode === 'black' ? 'none' : 'grey');
                                                updateMetadata({
                                                    shadow: nextShadow,
                                                    hasShadow: nextShadow !== 'none',
                                                });
                                            }}
                                            title={`Shadow: ${shadowMode === 'grey' ? 'Grey (Moire)' : (shadowMode === 'black' ? 'Black' : 'None')} (Click to cycle)`}
                                            style={{ fontSize: '1rem', minWidth: '34px', padding: '4px 6px' }}
                                        >
                                            {shadowMode === 'grey' ? '◽' : (shadowMode === 'black' ? '⬛' : '⬜')}
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                        {element.type === 'background' && onOpenLibrary && (
                            <button
                                className="btn-secondary"
                                onClick={() => onOpenLibrary('custom-bg')}
                                title="Open Background Library"
                                style={{ fontSize: '0.8rem', padding: '6px 12px', height: '36px', fontWeight: 'bold' }}
                            >
                                LIBRARY
                            </button>
                        )}
                        {element.type === 'background' && onApplyBackgroundToAll && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 8px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', marginLeft: 'auto' }}>
                                <input
                                    type="checkbox"
                                    id="apply-bg-all"
                                    checked={applyToAllChecked}
                                    onChange={(e) => {
                                        setApplyToAllChecked(e.target.checked);
                                        if (e.target.checked) {
                                            onApplyBackgroundToAll(element);
                                            setTimeout(() => setApplyToAllChecked(false), 1500);
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                                <label htmlFor="apply-bg-all" style={{ fontSize: '0.8rem', cursor: 'pointer', margin: 0, fontWeight: '500' }}>
                                    Apply to all
                                </label>
                            </div>
                        )}
                        {element.type === 'background' && isInteractiveSlide && renderAutonextButton()}
                    </div>

                    {!translationMode && onOpenPresets && (
                        <button
                            className="btn-secondary"
                            onClick={onOpenPresets}
                            title="Text Presets"
                            style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            🎨 Presets
                        </button>
                    )}

                    {!translationMode && element.type !== 'background' && onReorderElement && (
                        <div className="menu-group">
                            <label>Layer</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                    className="btn-icon"
                                    onClick={() => onReorderElement(element.id, 'backward')}
                                    title="Send Backward"
                                    style={{ fontSize: '1rem' }}
                                >
                                    ⬇️
                                </button>
                                <button
                                    className="btn-icon"
                                    onClick={() => onReorderElement(element.id, 'forward')}
                                    title="Bring Forward"
                                    style={{ fontSize: '1rem' }}
                                >
                                    ⬆️
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="menu-divider"></div>
                </>
            )}

            {element.type === 'background' && element.background && (element.background.startsWith('url') || element.background.startsWith('gradient')) && (
                <>
                    <div className="menu-group">
                        <label>Size Mode</label>
                        <select
                            value={metadata.sizeMode || 'cover'}
                            onChange={(e) => updateMetadata({ sizeMode: e.target.value })}
                            style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.15)' }}
                        >
                            <option value="cover">Cover (Fill)</option>
                            <option value="contain">Contain (Fit)</option>
                            <option value="custom">Custom (Scale)</option>
                        </select>
                    </div>

                    {metadata.sizeMode === 'custom' && (
                        <div className="menu-group">
                            <label>Scale</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="range"
                                    min="10"
                                    max="400"
                                    value={metadata.size ?? 100}
                                    onChange={(e) => updateMetadata({ size: parseInt(e.target.value) })}
                                    style={{ width: '80px' }}
                                />
                                <span style={{ fontSize: '0.75rem', minWidth: '32px', color: '#666' }}>{metadata.size ?? 100}%</span>
                            </div>
                        </div>
                    )}

                    <div className="menu-group">
                        <label>Position X</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={metadata.positionX ?? 50}
                                onChange={(e) => updateMetadata({ positionX: parseInt(e.target.value) })}
                                style={{ width: '80px' }}
                            />
                            <span style={{ fontSize: '0.75rem', minWidth: '32px', color: '#666' }}>{metadata.positionX ?? 50}%</span>
                        </div>
                    </div>

                    <div className="menu-group">
                        <label>Position Y</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={metadata.positionY ?? 50}
                                onChange={(e) => updateMetadata({ positionY: parseInt(e.target.value) })}
                                style={{ width: '80px' }}
                            />
                            <span style={{ fontSize: '0.75rem', minWidth: '32px', color: '#666' }}>{metadata.positionY ?? 50}%</span>
                        </div>
                    </div>

                    <div className="menu-group">
                        <label>Filter</label>
                        <button
                            className={`btn-icon ${metadata.grayscale ? 'active' : ''}`}
                            onClick={() => {
                                const nextGrayscale = !metadata.grayscale;
                                updateMetadata({
                                    grayscale: nextGrayscale,
                                    tintColor: nextGrayscale ? (metadata.tintColor || 'transparent') : 'transparent'
                                });
                            }}
                            title="Convert to Black & White"
                            style={{
                                fontSize: '1rem',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid rgba(0,0,0,0.15)',
                                borderRadius: '8px',
                                background: metadata.grayscale ? '#3b82f6' : 'white',
                                color: metadata.grayscale ? 'white' : 'black',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {metadata.grayscale ? '🖤 B&W' : '🤍 Grayscale'}
                        </button>
                    </div>

                    {metadata.grayscale && (
                        <div className="menu-group" style={{ gridColumn: 'span 2', width: '100%', marginTop: '6px' }}>
                            <label style={{ marginBottom: '6px', display: 'block', fontWeight: 'bold' }}>Tint Color</label>
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                overflowX: 'auto',
                                padding: '4px 2px',
                                width: '100%',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}>
                                {[
                                    { name: 'None', value: 'transparent', display: '🚫' },
                                    { name: 'Warm Sepia', value: 'rgba(198, 138, 76, 0.4)', display: '🟤' },
                                    { name: 'Rose Pink', value: 'rgba(253, 164, 175, 0.4)', display: '🔴' },
                                    { name: 'Ocean Cyan', value: 'rgba(103, 232, 249, 0.4)', display: '🔵' },
                                    { name: 'Forest Green', value: 'rgba(134, 239, 172, 0.4)', display: '🟢' },
                                    { name: 'Lavender Purple', value: 'rgba(192, 132, 252, 0.4)', display: '🟣' },
                                    { name: 'Amber Gold', value: 'rgba(253, 224, 71, 0.4)', display: '🟡' },
                                    { name: 'Slate Blue', value: 'rgba(148, 163, 184, 0.4)', display: '⚫' }
                                ].map((t) => (
                                    <button
                                        key={t.value}
                                        onClick={() => updateMetadata({ tintColor: t.value })}
                                        style={{
                                            border: (metadata.tintColor || 'transparent') === t.value ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.15)',
                                            borderRadius: '20px',
                                            padding: '4px 10px',
                                            fontSize: '0.75rem',
                                            backgroundColor: (metadata.tintColor || 'transparent') === t.value ? 'rgba(59, 130, 246, 0.1)' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s ease',
                                            boxShadow: (metadata.tintColor || 'transparent') === t.value ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none',
                                            transform: (metadata.tintColor || 'transparent') === t.value ? 'scale(1.05)' : 'none'
                                        }}
                                        title={t.name}
                                    >
                                        <span>{t.display}</span>
                                        <span style={{ fontWeight: (metadata.tintColor || 'transparent') === t.value ? 'bold' : 'normal' }}>{t.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="menu-group">
                        <label>Flip</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className={`btn-icon ${metadata.flipX ? 'active' : ''}`}
                                onClick={() => updateMetadata({ flipX: !metadata.flipX })}
                                title="Flip Horizontal"
                            >
                                ↔️
                            </button>
                            <button
                                className={`btn-icon ${metadata.flipY ? 'active' : ''}`}
                                onClick={() => updateMetadata({ flipY: !metadata.flipY })}
                                title="Flip Vertical"
                            >
                                ↕️
                            </button>
                        </div>
                    </div>

                    <div className="menu-group">
                        <label>Opacity</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={(metadata.opacity ?? 1) * 100}
                            onChange={(e) => updateMetadata({ opacity: parseInt(e.target.value) / 100 })}
                            style={{ width: '80px' }}
                        />
                    </div>

                    <div className="menu-group">
                        <label>Brightness</label>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={metadata.brightness ?? 100}
                            onChange={(e) => updateMetadata({ brightness: parseInt(e.target.value) })}
                            style={{ width: '80px' }}
                            title={metadata.brightness ? `${metadata.brightness}%` : '100%'}
                        />
                    </div>

                    <div className="menu-group">
                        <label>Blur</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="range"
                                min="0"
                                max="25"
                                value={metadata.blur ?? 0}
                                onChange={(e) => updateMetadata({ blur: parseInt(e.target.value) || 0 })}
                                style={{ width: '80px' }}
                                title={metadata.blur ? `${metadata.blur}px` : '0px'}
                            />
                            <span style={{ fontSize: '0.75rem', minWidth: '28px', color: '#666' }}>{metadata.blur ?? 0}px</span>
                        </div>
                    </div>

                    <div className="menu-group">
                        <label>Actions</label>
                        <button className="btn-delete" onClick={() => updateMetadata({ backgroundColor: '#ffffff' })} title="Clear Image">
                            🗑️ Image
                        </button>
                    </div>

                    <div className="menu-divider"></div>
                </>
            )}


            {isImageType && (
                <>
                    {isCharacter && (
                        <div className="menu-group">
                            <label>Shadow</label>
                            <button
                                className={`btn-icon ${hasShadow ? 'active' : ''}`}
                                onClick={() => updateMetadata({ hasShadow: !hasShadow })}
                                title={hasShadow ? "Turn off shadow" : "Turn on shadow"}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <ellipse cx="12" cy="15" rx="8" ry="3.5" fill="currentColor" fillOpacity={hasShadow ? "0.85" : "0.3"} stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <div className="menu-group">
                        <label>Flip</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className={`btn-icon ${metadata.flipX ? 'active' : ''}`}
                                onClick={() => updateMetadata({ flipX: !metadata.flipX })}
                                title="Flip Horizontal"
                            >
                                ↔️
                            </button>
                            <button
                                className={`btn-icon ${metadata.flipY ? 'active' : ''}`}
                                onClick={() => updateMetadata({ flipY: !metadata.flipY })}
                                title="Flip Vertical"
                            >
                                ↕️
                            </button>
                        </div>
                    </div>

                    <div className="menu-group">
                        <label>Opacity</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={(metadata.opacity ?? 1) * 100}
                            onChange={(e) => updateMetadata({ opacity: parseInt(e.target.value) / 100 })}
                            style={{ width: '80px' }}
                        />
                    </div>

                    <div className="menu-group">
                        <label>Brightness</label>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={metadata.brightness ?? 100}
                            onChange={(e) => updateMetadata({ brightness: parseInt(e.target.value) })}
                            style={{ width: '80px' }}
                            title={metadata.brightness ? `${metadata.brightness}%` : '100%'}
                        />
                    </div>

                    {metadata.isSymbol && (
                        <>
                            <div className="menu-group">
                                <label>Symbol Color</label>
                                <ColorPickerDropdown
                                    color={metadata.symbolColor || '#8B5CF6'}
                                    onSelect={(c) => {
                                        const newContent = getSymbolSvg(metadata.symbolType, metadata.symbolValue, c, metadata);
                                        onChange(element.id, {
                                            content: newContent,
                                            metadata: { ...metadata, symbolColor: c }
                                        });
                                    }}
                                />
                            </div>

                            {metadata.symbolType === 'shape-square' && (
                                <div className="menu-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={metadata.roundCorners || false}
                                            onChange={(e) => {
                                                const roundCorners = e.target.checked;
                                                const newMetadata = { ...metadata, roundCorners };
                                                const newContent = getSymbolSvg(metadata.symbolType, metadata.symbolValue, metadata.symbolColor || '#8B5CF6', newMetadata);
                                                onChange(element.id, {
                                                    content: newContent,
                                                    metadata: newMetadata
                                                });
                                            }}
                                        />
                                        Round Corners
                                    </label>
                                </div>
                            )}
                        </>
                    )}

                    <div className="menu-group">
                        <label>Layer</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className="btn-icon"
                                onClick={() => onReorderElement && onReorderElement(element.id, 'backward')}
                                title="Send Backward"
                                style={{ fontSize: '1rem' }}
                            >
                                ⬇️
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => onReorderElement && onReorderElement(element.id, 'forward')}
                                title="Bring Forward"
                                style={{ fontSize: '1rem' }}
                            >
                                ⬆️
                            </button>
                        </div>
                    </div>

                    <div className="menu-divider"></div>
                </>
            )}

            {element.type === 'line' && (
                <>
                    <div className="menu-group">
                        <label>Line Style</label>
                        <div style={{ display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.06)', padding: '2px', borderRadius: '6px' }}>
                            <button
                                type="button"
                                className={`btn-toggle ${!metadata.isCurved ? 'active' : ''}`}
                                onClick={() => updateMetadata({ isCurved: false })}
                                style={{
                                    padding: '3px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: !metadata.isCurved ? '700' : 'normal',
                                    backgroundColor: !metadata.isCurved ? '#8B5CF6' : 'transparent',
                                    color: !metadata.isCurved ? 'white' : '#475569',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                                title="Straight Line"
                            >
                                ━ Straight
                            </button>
                            <button
                                type="button"
                                className={`btn-toggle ${metadata.isCurved ? 'active' : ''}`}
                                onClick={() => updateMetadata({ isCurved: true, curvature: metadata.curvature ?? -40, curveSkew: metadata.curveSkew ?? 0 })}
                                style={{
                                    padding: '3px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: metadata.isCurved ? '700' : 'normal',
                                    backgroundColor: metadata.isCurved ? '#8B5CF6' : 'transparent',
                                    color: metadata.isCurved ? 'white' : '#475569',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                                title="3-Point Bézier Curve"
                            >
                                ⌒ Curve
                            </button>
                        </div>
                    </div>

                    {metadata.isCurved && (
                        <div className="menu-group">
                            <label>Curvature ({metadata.curvature ?? -40}px)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="range"
                                    min="-120"
                                    max="120"
                                    value={metadata.curvature ?? -40}
                                    onChange={(e) => updateMetadata({ curvature: parseInt(e.target.value) })}
                                    style={{ width: '75px' }}
                                    title="Adjust Curvature Depth"
                                />
                                <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => updateMetadata({ curvature: -(metadata.curvature ?? -40) })}
                                    title="Flip / Invert Curve Direction"
                                    style={{ fontSize: '0.85rem', padding: '2px 5px', minWidth: '24px' }}
                                >
                                    ⇅
                                </button>
                                <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => updateMetadata({ curvature: -40, curveSkew: 0 })}
                                    title="Reset Curvature"
                                    style={{ fontSize: '0.85rem', padding: '2px 5px', minWidth: '24px' }}
                                >
                                    ⟲
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="menu-group">
                        <label>Line Thickness</label>
                        <input
                            type="range"
                            min="2"
                            max="50"
                            value={metadata.height || 10}
                            onChange={(e) => updateMetadata({ height: parseInt(e.target.value) })}
                            style={{ width: '80px' }}
                        />
                    </div>
                    <div className="menu-group">
                        <label>Line Type</label>
                        <select
                            value={metadata.lineType || 'normal'}
                            onChange={(e) => updateMetadata({ lineType: e.target.value })}
                            style={{ fontSize: '0.8rem', padding: '2px 4px' }}
                        >
                            <option value="normal">Normal</option>
                            <option value="dotted">Dotted</option>
                            <option value="cutting">Cutting Line</option>
                            <option value="pencil">Pencil Line</option>
                            <option value="ink">Ink Line</option>
                        </select>
                    </div>
                    <div className="menu-group">
                        <label>Start Cap</label>
                        <select
                            value={metadata.startCap || 'none'}
                            onChange={(e) => updateMetadata({ startCap: e.target.value })}
                            style={{ fontSize: '0.8rem', padding: '2px 4px' }}
                        >
                            <option value="none">None</option>
                            <option value="arrow">Arrow</option>
                            <option value="circle">Circle</option>
                        </select>
                    </div>
                    <div className="menu-group">
                        <label>End Cap</label>
                        <select
                            value={metadata.endCap || 'none'}
                            onChange={(e) => updateMetadata({ endCap: e.target.value })}
                            style={{ fontSize: '0.8rem', padding: '2px 4px' }}
                        >
                            <option value="none">None</option>
                            <option value="arrow">Arrow</option>
                            <option value="circle">Circle</option>
                        </select>
                    </div>
                    <div className="menu-group">
                        <label>Line Color</label>
                        <ColorPickerDropdown
                            color={metadata.symbolColor || '#8B5CF6'}
                            onSelect={(c) => updateMetadata({ symbolColor: c })}
                        />
                    </div>
                    
                    <div className="menu-group">
                        <label>Layer</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className="btn-icon"
                                onClick={() => onReorderElement && onReorderElement(element.id, 'backward')}
                                title="Send Backward"
                                style={{ fontSize: '1rem' }}
                            >
                                ⬇️
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => onReorderElement && onReorderElement(element.id, 'forward')}
                                title="Bring Forward"
                                style={{ fontSize: '1rem' }}
                            >
                                ⬆️
                            </button>
                        </div>
                    </div>

                    <div className="menu-divider"></div>
                </>
            )}

            {element.type === 'result_field' && (() => {
                const allResultFields = (currentSlide?.elements || [])
                    .filter(el => el.type === 'result_field')
                    .sort((a, b) => {
                        const orderA = a.metadata?.order !== undefined ? Number(a.metadata.order) : 0;
                        const orderB = b.metadata?.order !== undefined ? Number(b.metadata.order) : 0;
                        return orderA - orderB;
                    });
                const isTypeQuizSlide = currentSlide?.elements?.some(el => el.type === 'quiz' && el.metadata?.quizType === 'type');
                const currentOrder = element.metadata?.order !== undefined ? Number(element.metadata.order) : (allResultFields.findIndex(f => f.id === element.id) + 1);
                const answerValue = element.metadata?.correctAnswer !== undefined ? String(element.metadata.correctAnswer) : (element.content || '');

                return (
                    <>
                        {allResultFields.length > 1 && (
                            <div className="menu-group">
                                <label>Field</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {allResultFields.map((f, i) => {
                                        const orderNum = f.metadata?.order !== undefined ? Number(f.metadata.order) : (i + 1);
                                        const isCurrent = f.id === element.id;
                                        return (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => dispatch({ type: 'SELECT_ELEMENT', payload: f.id })}
                                                style={{
                                                    minWidth: '32px',
                                                    height: '30px',
                                                    borderRadius: '8px',
                                                    background: isCurrent ? '#0284C7' : '#F1F5F9',
                                                    color: isCurrent ? '#ffffff' : '#334155',
                                                    fontWeight: 900,
                                                    fontSize: '0.85rem',
                                                    border: isCurrent ? '2px solid #0369A1' : '1.5px solid #CBD5E1',
                                                    cursor: 'pointer',
                                                    padding: '0 6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title={`Select Field #${orderNum}`}
                                            >
                                                #{orderNum}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="menu-group">
                            <label>Result Answer</label>
                            <input
                                key={`result-answer-${element.id}`}
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 60"
                                value={answerValue}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    onChange(element.id, {
                                        content: val,
                                        metadata: { ...metadata, correctAnswer: val }
                                    });
                                }}
                                style={{
                                    width: '80px',
                                    padding: '5px 8px',
                                    borderRadius: '8px',
                                    border: '1.5px solid #CBD5E1',
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                }}
                            />
                        </div>

                        {(allResultFields.length > 1 || isTypeQuizSlide) && (
                            <div className="menu-group">
                                <label>Order</label>
                                <select
                                    key={`result-order-${element.id}`}
                                    value={currentOrder}
                                    onChange={(e) => {
                                        const newOrder = Number(e.target.value);
                                        const otherField = allResultFields.find(f => {
                                            if (f.id === element.id) return false;
                                            const fOrder = f.metadata?.order !== undefined
                                                ? Number(f.metadata.order)
                                                : (allResultFields.findIndex(item => item.id === f.id) + 1);
                                            return fOrder === newOrder;
                                        });
                                        if (otherField) {
                                            onChange(otherField.id, {
                                                metadata: { ...otherField.metadata, order: currentOrder }
                                            });
                                        }
                                        updateMetadata({ order: newOrder });
                                    }}
                                    style={{
                                        padding: '5px 8px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #CBD5E1',
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {allResultFields.map((_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            #{i + 1}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {allResultFields.length < 5 && (
                            <div className="menu-group" style={{ alignSelf: 'center' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        const pos = getNonOverlappingResultFieldPosition(currentSlide, element);
                                        const fieldId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                        dispatch({
                                            type: 'ADD_ELEMENT',
                                            payload: {
                                                id: fieldId,
                                                type: ELEMENT_TYPES.RESULT_FIELD,
                                                content: '100',
                                                metadata: {
                                                    correctAnswer: '100',
                                                    order: allResultFields.length + 1,
                                                    locked: true
                                                },
                                                x: pos.x,
                                                y: pos.y
                                            }
                                        });
                                    }}
                                    title="Add another Result Field (max 5)"
                                    style={{
                                        fontSize: '0.8rem',
                                        padding: '5px 10px',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    ➕ Add Field ({allResultFields.length}/5)
                                </button>
                            </div>
                        )}

                        {renderAutonextButton()}

                        <div className="menu-divider"></div>
                    </>
                );
            })()}


            {element.type === 'number_line' && (
                <>
                    {/* Orientation */}
                    <div className="menu-group">
                        <label>Orientation</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className={`btn-icon ${metadata.orientation !== 'vertical' ? 'active' : ''}`}
                                onClick={() => {
                                    if (metadata.orientation === 'vertical') {
                                        onChange(element.id, {
                                            width: Math.max(element.height || 60, 60),
                                            height: 14,
                                            metadata: { ...metadata, orientation: 'horizontal' }
                                        });
                                    }
                                }}
                                title="Horizontal"
                                style={{ fontSize: '1rem', width: '36px', height: '36px' }}
                            >
                                ↔️
                            </button>
                            <button
                                className={`btn-icon ${metadata.orientation === 'vertical' ? 'active' : ''}`}
                                onClick={() => {
                                    if (metadata.orientation !== 'vertical') {
                                        onChange(element.id, {
                                            width: 16,
                                            height: Math.max(element.width || 60, 50),
                                            metadata: { ...metadata, orientation: 'vertical' }
                                        });
                                    }
                                }}
                                title="Vertical"
                                style={{ fontSize: '1rem', width: '36px', height: '36px' }}
                            >
                                ↕️
                            </button>
                        </div>
                    </div>

                    {/* Arrows Toggle */}
                    <div className="menu-group">
                        <label>Arrows</label>
                        <button
                            className={`btn-icon ${(metadata.showArrows ?? true) ? 'active' : ''}`}
                            onClick={() => updateMetadata({ showArrows: !(metadata.showArrows ?? true) })}
                            title={(metadata.showArrows ?? true) ? "Arrows On (Click to start/end at marks)" : "Arrows Off (Click to add arrows)"}
                            style={{ fontSize: '0.95rem', fontWeight: 'bold', width: '42px', height: '36px' }}
                        >
                            {(metadata.showArrows ?? true) ? '⇄' : '|—|'}
                        </button>
                    </div>

                    {/* Numbers 4-state Mode Button */}
                    <div className="menu-group">
                        <label>Numbers</label>
                        {(() => {
                            const mode = metadata.numberColorMode || ((metadata.showNumbers ?? true) ? 'match' : 'invisible');
                            const nextMode = mode === 'match' ? 'invisible' : mode === 'invisible' ? 'black' : mode === 'black' ? 'white' : 'match';
                            const titles = {
                                match: 'Numbers: Same color as line (Tap to hide)',
                                invisible: 'Numbers: Invisible (Tap for Black)',
                                black: 'Numbers: Black with white outline (Tap for White)',
                                white: 'Numbers: White with black outline (Tap for Line Color)'
                            };

                            return (
                                <button
                                    className={`btn-icon ${mode !== 'invisible' ? 'active' : ''}`}
                                    onClick={() => updateMetadata({
                                        numberColorMode: nextMode,
                                        showNumbers: nextMode !== 'invisible'
                                    })}
                                    title={titles[mode]}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: '58px',
                                        height: '36px',
                                        padding: '0 6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {mode === 'match' && (
                                        <span style={{ color: metadata.symbolColor || '#8B5CF6', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            🎨 123
                                        </span>
                                    )}
                                    {mode === 'invisible' && (
                                        <span style={{ color: '#94A3B8' }}>
                                            — —
                                        </span>
                                    )}
                                    {mode === 'black' && (
                                        <span style={{
                                            color: '#000000',
                                            textShadow: '-1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF, 1px 1px 0 #FFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                        }}>
                                            ⚫ 123
                                        </span>
                                    )}
                                    {mode === 'white' && (
                                        <span style={{
                                            color: '#FFFFFF',
                                            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                        }}>
                                            ⚪ 123
                                        </span>
                                    )}
                                </button>
                            );
                        })()}
                    </div>

                    {/* Start Number */}
                    <div className="menu-group">
                        <label>Start</label>
                        <input
                            type="number"
                            value={metadata.startNumber ?? 0}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateMetadata({ startNumber: isNaN(val) ? 0 : val });
                            }}
                            style={{ width: '55px' }}
                        />
                    </div>

                    {/* End Number */}
                    <div className="menu-group">
                        <label>End</label>
                        <input
                            type="number"
                            value={metadata.endNumber ?? 10}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateMetadata({ endNumber: isNaN(val) ? 10 : val });
                            }}
                            style={{ width: '55px' }}
                        />
                    </div>

                    {/* Step */}
                    <div className="menu-group">
                        <label>Step</label>
                        <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={metadata.step ?? 1}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateMetadata({ step: isNaN(val) || val <= 0 ? 1 : val });
                            }}
                            style={{ width: '50px' }}
                        />
                    </div>

                    {/* Line Color */}
                    <div className="menu-group">
                        <label>Color</label>
                        <ColorPickerDropdown
                            color={metadata.symbolColor || '#8B5CF6'}
                            onSelect={(c) => updateMetadata({ symbolColor: c })}
                        />
                    </div>

                    {/* Thickness */}
                    <div className="menu-group">
                        <label>Thickness</label>
                        <input
                            type="range"
                            min="1"
                            max="8"
                            value={metadata.thickness ?? 3}
                            onChange={(e) => updateMetadata({ thickness: parseInt(e.target.value) })}
                            style={{ width: '60px' }}
                            title={`${metadata.thickness ?? 3}px`}
                        />
                    </div>

                    {/* Layer */}
                    <div className="menu-group">
                        <label>Layer</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className="btn-icon"
                                onClick={() => onReorderElement && onReorderElement(element.id, 'backward')}
                                title="Send Backward"
                                style={{ fontSize: '1rem' }}
                            >
                                ⬇️
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => onReorderElement && onReorderElement(element.id, 'forward')}
                                title="Bring Forward"
                                style={{ fontSize: '1rem' }}
                            >
                                ⬆️
                            </button>
                        </div>
                    </div>

                    <div className="menu-divider"></div>
                </>
            )}

            {element.type === 'cartridge' && (
                <>
                    {renderAutonextButton()}
                    <div className="menu-divider"></div>

                    {/* Fraction Alpha Settings */}
                    {element.cartridgeType === 'FractionAlpha' && (
                        <>
                            <div className="menu-group">
                                <label>Shape</label>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button
                                        className="btn-icon"
                                        title="Toggle Shape (Pie/Rectangle)"
                                        style={{ width: '40px', height: '40px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => {
                                            const newShape = (element.config?.shape || 'pie') === 'pie' ? 'rect' : 'pie';
                                            onChange('cartridge', { config: { ...element.config, shape: newShape } });
                                        }}
                                    >
                                        {(element.config?.shape || 'pie') === 'pie' ? '🍕' : '🍫'}
                                    </button>

                                    {/* Pizza Flavor Toggle (Only for Pie) */}
                                    {(!element.config?.shape || element.config.shape === 'pie') && (
                                        <button
                                            className="btn-icon"
                                            title="Change Pizza Flavor"
                                            style={{ width: '40px', height: '40px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => {
                                                const flavors = ['cheese', 'pepperoni', 'veggie', 'mushroom', 'hawaiian'];
                                                const currentFlavor = element.config?.flavor || 'cheese';
                                                const nextIndex = (flavors.indexOf(currentFlavor) + 1) % flavors.length;
                                                onChange('cartridge', { config: { ...element.config, flavor: flavors[nextIndex] } });
                                            }}
                                        >
                                            {/* Map flavor to emoji/icon manually or just cycle? Let's use specific emojis for feedback */}
                                            {(!element.config?.flavor || element.config.flavor === 'cheese') && '🧀'}
                                            {element.config?.flavor === 'pepperoni' && '🥩'}
                                            {element.config?.flavor === 'veggie' && '🥦'}
                                            {element.config?.flavor === 'mushroom' && '🍄'}
                                            {element.config?.flavor === 'hawaiian' && '🍍'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="menu-group">
                                <label>Game Mode</label>
                                <select
                                    value={element.config?.mode || 'fracture'}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, mode: e.target.value } })}
                                >
                                    <option value="fracture">Fracture</option>
                                    <option value="serve">Serve</option>
                                </select>
                            </div>

                            <div className="menu-group">
                                <label>Target Denom</label>
                                <input
                                    type="number"
                                    min="1" max="10"
                                    value={element.config?.targetDenominator || 3}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, targetDenominator: parseInt(e.target.value) } })}
                                    style={{ width: '50px' }}
                                />
                            </div>

                            {element.config?.mode === 'serve' && (
                                <div className="menu-group">
                                    <label>Target Num</label>
                                    <input
                                        type="number"
                                        min="1" max={element.config?.targetDenominator || 10}
                                        value={element.config?.targetNumerator || 1}
                                        onChange={(e) => onChange('cartridge', { config: { ...element.config, targetNumerator: parseInt(e.target.value) } })}
                                        style={{ width: '50px' }}
                                    />
                                </div>
                            )}

                            <div className="menu-group">
                                <label>Start Denom</label>
                                <input
                                    type="number"
                                    min="1" max="10"
                                    value={element.config?.initialDenominator || 1}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, initialDenominator: parseInt(e.target.value) } })}
                                    style={{ width: '50px' }}
                                />
                            </div>
                        </>
                    )}

                    {/* Fraction Slicer Settings */}
                    {element.cartridgeType === 'FractionSlicer' && (
                        <>
                            <div className="menu-group">
                                <label>Levels</label>
                                <input
                                    type="number"
                                    min="1" max="10"
                                    value={element.config?.levels || 5}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, levels: parseInt(e.target.value) } })}
                                    style={{ width: '50px' }}
                                />
                            </div>
                            <div className="menu-group">
                                <label>Tolerance</label>
                                <select
                                    value={element.config?.tolerance || 0.10}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, tolerance: parseFloat(e.target.value) } })}
                                >
                                    <option value={0.15}>Easy (15%)</option>
                                    <option value={0.10}>Normal (10%)</option>
                                    <option value={0.05}>Hard (5%)</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* Swipe Sorter Settings */}
                    {element.cartridgeType === 'SwipeSorter' && (
                        <>
                            <div className="menu-group">
                                <label>Labels</label>
                                <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                                    <input
                                        type="text"
                                        placeholder="Left (False)"
                                        value={element.config?.leftLabel || ''}
                                        onChange={(e) => onChange('cartridge', { config: { ...element.config, leftLabel: e.target.value } })}
                                        style={{ flex: 1, padding: '5px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Right (True)"
                                        value={element.config?.rightLabel || ''}
                                        onChange={(e) => onChange('cartridge', { config: { ...element.config, rightLabel: e.target.value } })}
                                        style={{ flex: 1, padding: '5px' }}
                                    />
                                </div>
                            </div>

                            <div className="menu-group" style={{ alignItems: 'flex-start' }}>
                                <label style={{ marginTop: '6px' }}>Global BG</label>
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const newConfig = { ...element.config, globalBackground: ev.target.result };
                                                    onChange('cartridge', { config: newConfig });
                                                };
                                                reader.readAsDataURL(file);
                                            }}
                                            style={{ width: '100%', fontSize: '0.7rem' }}
                                        />
                                        {element.config?.globalBackground && (
                                            <button className="btn-icon" onClick={() => onChange('cartridge', { config: { ...element.config, globalBackground: null } })} title="Clear BG">❌</button>
                                        )}
                                    </div>
                                    <small style={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic' }}>Rec: 1080x1920 (9:16)</small>
                                </div>
                            </div>

                            <div className="menu-divider"></div>

                            <div className="menu-group" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '5px' }}>
                                    <label>Cards ({activeCardIndex + 1} / {element.config?.cards?.length || 0})</label>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button className="btn-icon" onClick={() => {
                                            const newIndex = Math.max(0, activeCardIndex - 1);
                                            setActiveCardIndex(newIndex);
                                            onChange('cartridge', { config: { ...element.config, previewIndex: newIndex } });
                                        }} disabled={activeCardIndex === 0}>◀</button>
                                        <span style={{ fontSize: '0.8rem', alignSelf: 'center' }}>{activeCardIndex + 1}</span>
                                        <button className="btn-icon" onClick={() => {
                                            const newIndex = Math.min((element.config?.cards?.length || 1) - 1, activeCardIndex + 1);
                                            setActiveCardIndex(newIndex);
                                            onChange('cartridge', { config: { ...element.config, previewIndex: newIndex } });
                                        }} disabled={activeCardIndex >= (element.config?.cards?.length || 1) - 1}>▶</button>
                                        <button className="btn-icon" onClick={() => {
                                            if (activeCardIndex === 0) return;
                                            const newCards = [...element.config.cards];
                                            const temp = newCards[activeCardIndex - 1];
                                            newCards[activeCardIndex - 1] = newCards[activeCardIndex];
                                            newCards[activeCardIndex] = temp;
                                            onChange('cartridge', { config: { ...element.config, cards: newCards } });
                                            setActiveCardIndex(activeCardIndex - 1);
                                        }} disabled={activeCardIndex === 0} title="Move Left">⬅️</button>
                                        <button className="btn-icon" onClick={() => {
                                            if (activeCardIndex >= element.config.cards.length - 1) return;
                                            const newCards = [...element.config.cards];
                                            const temp = newCards[activeCardIndex + 1];
                                            newCards[activeCardIndex + 1] = newCards[activeCardIndex];
                                            newCards[activeCardIndex] = temp;
                                            onChange('cartridge', { config: { ...element.config, cards: newCards } });
                                            setActiveCardIndex(activeCardIndex + 1);
                                        }} disabled={activeCardIndex >= element.config.cards.length - 1} title="Move Right">➡️</button>
                                        <button className="btn-icon" onClick={() => {
                                            const newCards = [...(element.config?.cards || [])];
                                            newCards.push({ id: Date.now(), text: 'New Card', correctSide: 'right' });
                                            onChange('cartridge', { config: { ...element.config, cards: newCards, previewIndex: newCards.length - 1 } });
                                            setActiveCardIndex(newCards.length - 1);
                                        }} title="Add Card">➕</button>
                                        <button className="btn-icon" onClick={() => {
                                            const newCards = [...(element.config?.cards || [])];
                                            if (newCards.length <= 1) return;
                                            newCards.splice(activeCardIndex, 1);
                                            const newIndex = Math.max(0, activeCardIndex - 1);
                                            onChange('cartridge', { config: { ...element.config, cards: newCards, previewIndex: newIndex } });
                                            setActiveCardIndex(newIndex);
                                        }} title="Delete Card" disabled={(element.config?.cards?.length || 0) <= 1}>🗑️</button>
                                    </div>
                                </div>

                                {element.config?.cards && element.config.cards[activeCardIndex] && (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.05)', padding: '5px', borderRadius: '4px' }}>
                                        <textarea
                                            value={element.config.cards[activeCardIndex].text || ''}
                                            onChange={(e) => {
                                                const newCards = [...element.config.cards];
                                                newCards[activeCardIndex] = { ...newCards[activeCardIndex], text: e.target.value };
                                                onChange('cartridge', { config: { ...element.config, cards: newCards } });
                                            }}
                                            placeholder="Card Text"
                                            style={{ width: '100%', height: '40px', fontSize: '0.8rem' }}
                                        />

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <label style={{ fontSize: '0.7rem' }}>Image:</label>
                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={() => {
                                                            onOpenLibrary('custom', (selectedImage) => {
                                                                const newCards = [...element.config.cards];
                                                                newCards[activeCardIndex] = { ...newCards[activeCardIndex], image: selectedImage };
                                                                onChange('cartridge', { config: { ...element.config, cards: newCards } });
                                                            });
                                                        }}
                                                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                                    >
                                                        LIBRARY
                                                    </button>
                                                    {element.config.cards[activeCardIndex].image && (
                                                        <button
                                                            className="btn-icon"
                                                            style={{ fontSize: '0.8rem', padding: '2px 5px' }}
                                                            onClick={() => {
                                                                const newCards = [...element.config.cards];
                                                                newCards[activeCardIndex] = { ...newCards[activeCardIndex], image: null };
                                                                onChange('cartridge', { config: { ...element.config, cards: newCards } });
                                                            }}
                                                            title="Clear Image"
                                                        >
                                                            ❌
                                                        </button>
                                                    )}
                                                </div>
                                                {element.config.cards[activeCardIndex].image && <span title="Image Set">🖼️</span>}
                                            </div>
                                            <small style={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', textAlign: 'right' }}>Rec: 600x800 (3:4)</small>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <label style={{ fontSize: '0.7rem' }}>Correct Side:</label>
                                            <button
                                                onClick={() => {
                                                    const newCards = [...element.config.cards];
                                                    const current = newCards[activeCardIndex].correctSide;
                                                    newCards[activeCardIndex] = { ...newCards[activeCardIndex], correctSide: current === 'left' ? 'right' : 'left' };
                                                    onChange('cartridge', { config: { ...element.config, cards: newCards } });
                                                }}
                                                style={{
                                                    fontSize: '0.8rem',
                                                    padding: '4px 10px',
                                                    borderRadius: '15px',
                                                    border: 'none',
                                                    background: element.config.cards[activeCardIndex].correctSide === 'left' ? '#ff9f43' : '#a55eea',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.3s',
                                                    width: '80px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {element.config.cards[activeCardIndex].correctSide === 'left' ? 'Left' : 'Right'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* PEMDAS Settings */}
                    {element.cartridgeType === 'PEMDAS' && (
                        <>
                            <div className="menu-group">
                                <label>Locale</label>
                                <select
                                    value={element.config?.locale || 'US'}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, locale: e.target.value } })}
                                >
                                    <option value="US">🇺🇸 PEMDAS</option>
                                    <option value="UK">🇬🇧 BODMAS</option>
                                    <option value="ES">🇪🇸 PAPOMUDAS</option>
                                    <option value="CA">🇨🇦 BEDMAS</option>
                                </select>
                            </div>

                            <div className="menu-group">
                                <label>Start Lvl</label>
                                <input
                                    type="number"
                                    min="1" max="9"
                                    value={element.config?.startLevel || 1}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, startLevel: parseInt(e.target.value) } })}
                                    style={{ width: '50px' }}
                                />
                            </div>

                            <div className="menu-group">
                                <label>Target Lvl</label>
                                <input
                                    type="number"
                                    min={element.config?.startLevel || 1} max="9"
                                    value={element.config?.targetLevel || 3}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, targetLevel: parseInt(e.target.value) } })}
                                    style={{ width: '50px' }}
                                />
                            </div>
                        </>
                    )}

                    {/* AlgeBros Settings */}
                    {element.cartridgeType === 'AlgeBros' && (
                        <>
                            <div className="menu-group">
                                <label>Start Lvl</label>
                                <input
                                    type="number"
                                    min="1" max="10"
                                    value={element.config?.startLevel || 1}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, startLevel: parseInt(e.target.value) } })}
                                    style={{ width: '50px' }}
                                />
                            </div>

                            <div className="menu-group">
                                <label>Target Lvl</label>
                                <input
                                    type="number"
                                    min={element.config?.startLevel || 1} max="10"
                                    value={element.config?.targetLevel || 10}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, targetLevel: parseInt(e.target.value) } })}
                                    style={{ width: '50px' }}
                                />
                            </div>
                        </>
                    )}

                    {/* Balanza Settings */}
                    {element.cartridgeType === 'Balanza' && (
                        <>
                            {/* Left Plate Row */}
                            <div className="menu-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                                <label style={{ width: '65px', fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>Left Plate</label>
                                <input
                                    type="text"
                                    value={element.config?.leftPlateText || ''}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, leftPlateText: e.target.value } })}
                                    placeholder="e.g. 2🍎"
                                    style={{ width: '80px', padding: '4px 6px', fontSize: '0.85rem' }}
                                />
                                <button
                                    type="button"
                                    title="Open Emoji Picker"
                                    onClick={() => setEmojiPickerTarget('left')}
                                    style={{
                                        height: '28px', width: '28px', minWidth: '28px', padding: 0, borderRadius: '6px', border: '1px solid #cbd5e1',
                                        background: '#f8fafc', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >😊</button>
                                <button
                                    type="button"
                                    title={element.config?.lockLeftPlate ? "Left Plate Locked" : "Left Plate Unlocked"}
                                    onClick={() => onChange('cartridge', { config: { ...element.config, lockLeftPlate: !element.config?.lockLeftPlate } })}
                                    style={{
                                        height: '28px', width: '28px', minWidth: '28px', padding: 0, borderRadius: '6px',
                                        border: element.config?.lockLeftPlate ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                        background: element.config?.lockLeftPlate ? '#fee2e2' : '#f8fafc',
                                        cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    {element.config?.lockLeftPlate ? '🔒' : '🔓'}
                                </button>
                            </div>

                            {/* Right Plate Row */}
                            <div className="menu-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                                <label style={{ width: '65px', fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>Right Plate</label>
                                <input
                                    type="text"
                                    value={element.config?.rightPlateText || ''}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, rightPlateText: e.target.value } })}
                                    placeholder="e.g. 🍌"
                                    style={{ width: '80px', padding: '4px 6px', fontSize: '0.85rem' }}
                                />
                                <button
                                    type="button"
                                    title="Open Emoji Picker"
                                    onClick={() => setEmojiPickerTarget('right')}
                                    style={{
                                        height: '28px', width: '28px', minWidth: '28px', padding: 0, borderRadius: '6px', border: '1px solid #cbd5e1',
                                        background: '#f8fafc', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >😊</button>
                                <button
                                    type="button"
                                    title={element.config?.lockRightPlate ? "Right Plate Locked" : "Right Plate Unlocked"}
                                    onClick={() => onChange('cartridge', { config: { ...element.config, lockRightPlate: !element.config?.lockRightPlate } })}
                                    style={{
                                        height: '28px', width: '28px', minWidth: '28px', padding: 0, borderRadius: '6px',
                                        border: element.config?.lockRightPlate ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                        background: element.config?.lockRightPlate ? '#fee2e2' : '#f8fafc',
                                        cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    {element.config?.lockRightPlate ? '🔒' : '🔓'}
                                </button>
                            </div>

                            {/* Bottom Supply Row */}
                            <div className="menu-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                                <label style={{ width: '65px', fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>Supply Menu</label>
                                <input
                                    type="text"
                                    value={element.config?.menuText || ''}
                                    onChange={(e) => onChange('cartridge', { config: { ...element.config, menuText: e.target.value } })}
                                    placeholder="e.g. 2🍎, 3🍌"
                                    style={{ width: '80px', padding: '4px 6px', fontSize: '0.85rem' }}
                                />
                                <button
                                    type="button"
                                    title="Open Emoji Picker"
                                    onClick={() => setEmojiPickerTarget('menu')}
                                    style={{
                                        height: '28px', width: '28px', minWidth: '28px', padding: 0, borderRadius: '6px', border: '1px solid #cbd5e1',
                                        background: '#f8fafc', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >😊</button>
                            </div>

                            <div className="menu-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={element.config?.freeMovement !== false}
                                        onChange={(e) => onChange('cartridge', { config: { ...element.config, freeMovement: e.target.checked } })}
                                    />
                                    🖐️ Free
                                </label>
                            </div>
                            <div className="menu-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>Equation</label>
                                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', border: '1px solid #cbd5e1' }}>
                                    {['up', 'down', 'off'].map((pos) => {
                                        const currentPos = element.config?.equationPosition || (element.config?.showEquation === false ? 'off' : 'up');
                                        const isActive = currentPos === pos;
                                        const labels = { up: '⬆️ Up', down: '⬇️ Down', off: '🚫 Off' };
                                        return (
                                            <button
                                                key={pos}
                                                type="button"
                                                onClick={() => {
                                                    onChange('cartridge', {
                                                        config: {
                                                            ...element.config,
                                                            equationPosition: pos,
                                                            showEquation: pos !== 'off'
                                                        }
                                                    });
                                                }}
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: isActive ? 700 : 500,
                                                    background: isActive ? '#ffffff' : 'transparent',
                                                    color: isActive ? '#0f172a' : '#64748b',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {labels[pos]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="menu-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={element.config?.showZeroTiles || false}
                                        onChange={(e) => onChange('cartridge', { config: { ...element.config, showZeroTiles: e.target.checked } })}
                                    />
                                    Zero
                                </label>
                            </div>
                            <div className="menu-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={!!element.config?.photoMode}
                                        onChange={(e) => onChange('cartridge', { config: { ...element.config, photoMode: e.target.checked } })}
                                    />
                                    📸 Photo
                                </label>
                                {!!element.config?.photoMode && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        style={{ fontSize: '0.72rem', padding: '2px 8px', height: '26px' }}
                                        title="Reset photo position to center"
                                        onClick={() => onChange('cartridge', { config: { ...element.config, photoX: 50, photoY: 50 } })}
                                    >
                                        🎯 Center
                                    </button>
                                )}
                            </div>
                            <div className="menu-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={element.config?.confetti !== false}
                                        onChange={(e) => onChange('cartridge', { config: { ...element.config, confetti: e.target.checked } })}
                                    />
                                    🎉 Confetti
                                </label>
                            </div>
                            <div className="menu-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>Background</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => {
                                            if (onOpenLibrary) {
                                                onOpenLibrary('custom-bg', (selectedImage) => {
                                                    onChange('cartridge', { config: { ...element.config, background: selectedImage } });
                                                });
                                            }
                                        }}
                                        style={{ fontSize: '0.75rem', padding: '4px 8px', fontWeight: 'bold' }}
                                        title="Choose Background from Library"
                                    >
                                        🖼️ LIBRARY
                                    </button>
                                    <label
                                        className="btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '4px 8px', cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center' }}
                                        title="Upload Custom Image"
                                    >
                                        📁 UPLOAD
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    onChange('cartridge', { config: { ...element.config, background: ev.target.result } });
                                                };
                                                reader.readAsDataURL(file);
                                            }}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    {element.config?.background && (
                                        <button
                                            type="button"
                                            className="btn-icon"
                                            onClick={() => onChange('cartridge', { config: { ...element.config, background: null } })}
                                            title="Clear Background"
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            ❌
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="menu-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <label style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700 }}>Weights (default 5)</label>
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                    {collectUsedSymbols(element.config?.leftPlateText || '', element.config?.rightPlateText || '', element.config?.menuText || '').map(symbol => {
                                        const weights = parseWeights(element.config?.weightsText || '');
                                        const current = weights[symbol] ?? 5;
                                        return (
                                            <div key={symbol} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px' }}>
                                                <span style={{ fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
                                                    {renderEmojiOrCrate(symbol, 20)}
                                                </span>
                                                <input
                                                    type="number"
                                                    value={current}
                                                    onChange={(e) => {
                                                        const nextWeights = { ...weights, [symbol]: parseFloat(e.target.value) || 0 };
                                                        const nextText = Object.entries(nextWeights)
                                                            .filter(([, w]) => w !== 5)
                                                            .map(([s, w]) => `${s}=${w}`)
                                                            .join('\n');
                                                        onChange('cartridge', { config: { ...element.config, weightsText: nextText } });
                                                    }}
                                                    style={{ width: '42px', padding: '2px 4px', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Emoji Selection Modal */}
                    {emojiPickerTarget && element.cartridgeType === 'Balanza' && (
                        <div
                            style={{
                                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                                zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '16px'
                            }}
                            onClick={() => setEmojiPickerTarget(null)}
                        >
                            <div
                                style={{
                                    background: '#1e1b3a', border: '1px solid rgba(167,139,250,0.4)',
                                    borderRadius: '16px', padding: '16px', width: '100%', maxWidth: '380px',
                                    maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '12px',
                                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)', color: 'white'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px' }}>
                                        SELECT EMOJI ({emojiPickerTarget.toUpperCase()})
                                    </span>
                                    <button
                                        onClick={() => setEmojiPickerTarget(null)}
                                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', cursor: 'pointer' }}
                                    >✕</button>
                                </div>

                                <div style={{ overflowY: 'auto', maxHeight: '50vh', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                                    {EMOJI_CATEGORIES.map(category => (
                                        <div key={category.name}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{category.name}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                                {category.items.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => handleSelectEmoji(emoji)}
                                                        title={emoji}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '8px', fontSize: '1.4rem', padding: '6px 0',
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'transform 0.1s, background 0.1s'
                                                        }}
                                                    >
                                                        {renderEmojiOrCrate(emoji, 28)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#facc15', letterSpacing: '0.5px' }}>
                                        ⏱️ RECENTLY USED:
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {recentEmojis.map(emoji => (
                                            <button
                                                key={`recent-${emoji}`}
                                                type="button"
                                                onClick={() => handleSelectEmoji(emoji)}
                                                title={emoji}
                                                style={{
                                                    background: 'rgba(250, 204, 21, 0.15)', border: '1px solid rgba(250, 204, 21, 0.4)',
                                                    borderRadius: '8px', fontSize: '1.3rem', minWidth: '36px', height: '36px',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {renderEmojiOrCrate(emoji, 24)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Balanza Menu Supply Editor Modal */}
                    {showBalanzaMenuEditor && element.cartridgeType === 'Balanza' && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px'
                        }} onClick={() => { setShowBalanzaMenuEditor(false); setBalanzaMenuText(balanzaMenuOriginalText); }}>
                            <div style={{
                                background: '#1e1b3a', border: '1px solid rgba(167,139,250,0.4)',
                                borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px',
                                maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '2px', textAlign: 'center' }}>MENU SUPPLY</div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>One per line: &lt;count&gt;x&lt;emoji or number&gt;, e.g. 3x🍎</div>
                                <textarea
                                    value={balanzaMenuText}
                                    onChange={(e) => setBalanzaMenuText(e.target.value)}
                                    spellCheck={false}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    style={{
                                        width: '100%', minHeight: '200px', maxHeight: '50vh',
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.3)',
                                        borderRadius: '8px', color: '#e2e8f0', fontFamily: "'Courier New', monospace",
                                        fontSize: '0.85rem', padding: '12px', resize: 'vertical',
                                        outline: 'none', lineHeight: '1.6', boxSizing: 'border-box'
                                    }}
                                />
                                {balanzaMenuText !== balanzaMenuOriginalText && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setBalanzaMenuText(balanzaMenuOriginalText); setShowBalanzaMenuEditor(false); }}
                                            style={{
                                                flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                                                letterSpacing: '1px'
                                            }}
                                        >CANCEL</button>
                                        <button
                                            onClick={() => {
                                                onChange('cartridge', { config: { ...element.config, menuText: balanzaMenuText } });
                                                setShowBalanzaMenuEditor(false);
                                            }}
                                            style={{
                                                flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                                background: '#8b5cf6', color: 'white', letterSpacing: '1px'
                                            }}
                                        >SAVE</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Potiondas Settings */}
                    {element.cartridgeType === 'Potiondas' && (
                        <>
                            <div className="menu-group">
                                <label>Monster</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['plant', 'forest'].map(mType => (
                                        <button
                                            key={mType}
                                            className={`btn-icon ${element.config?.monsterType === mType || (!element.config?.monsterType && mType === 'plant') ? 'active' : ''}`}
                                            onClick={() => onChange('cartridge', { config: { ...element.config, monsterType: mType } })}
                                            title={`Select ${mType} monster`}
                                            style={{ width: '40px', height: '40px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}
                                        >
                                            <img 
                                                src={`/assets/characters/evolution monsters/monster_${mType}_09.png`} 
                                                alt={mType} 
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="menu-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={element.config?.enablePowerup || false}
                                        onChange={(e) => onChange('cartridge', { config: { ...element.config, enablePowerup: e.target.checked } })}
                                    />
                                    Enable Separator Powerup (↔)
                                </label>
                            </div>
                            <div className="menu-group">
                                <button
                                    className="btn-secondary"
                                    style={{ width: '100%', padding: '8px', fontWeight: 700, letterSpacing: '1px' }}
                                    onClick={() => {
                                        const currentText = element.config?.levelsText || serializeLevels([
                                            { ops: 'x', arrow: false },
                                            { ops: 'xx', arrow: true },
                                            { ops: 'xxx', arrow: true },
                                            { ops: '/xx', arrow: false, newOp: '÷' },
                                            { ops: 'x/x', arrow: false },
                                            { ops: 'x//x//', arrow: false },
                                            { ops: '+x', arrow: false, newOp: '+' },
                                            { ops: 'x+x', arrow: false },
                                            { ops: 'x+xx+', arrow: false },
                                            { ops: '+x++x+', arrow: false },
                                            { ops: 'x/x', arrow: false },
                                            { ops: '+x/+', arrow: false },
                                            { ops: '/++x/+', arrow: false },
                                            { ops: '+-', arrow: false, newOp: '−' },
                                            { ops: '-+', arrow: true },
                                            { ops: '+-++-+', arrow: false },
                                            { ops: '+-x+-+', arrow: false },
                                            { ops: '-x-+x-', arrow: false },
                                        ]);
                                        setLevelsText(currentText);
                                        setLevelsOriginalText(currentText);
                                        setShowLevelsEditor(true);
                                    }}
                                >
                                    📋 LEVELS
                                </button>
                            </div>
                        </>
                    )}

                    {/* Potiondas Levels Editor Modal */}
                    {showLevelsEditor && element.cartridgeType === 'Potiondas' && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px'
                        }} onClick={() => { setShowLevelsEditor(false); setLevelsText(levelsOriginalText); }}>
                            <div style={{
                                background: '#1e1b3a', border: '1px solid rgba(167,139,250,0.4)',
                                borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px',
                                maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '2px', textAlign: 'center' }}>LEVELS</div>
                                <textarea
                                    value={levelsText}
                                    onChange={(e) => setLevelsText(e.target.value)}
                                    spellCheck={false}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    style={{
                                        width: '100%', minHeight: '300px', maxHeight: '50vh',
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.3)',
                                        borderRadius: '8px', color: '#e2e8f0', fontFamily: "'Courier New', monospace",
                                        fontSize: '0.85rem', padding: '12px', resize: 'vertical',
                                        outline: 'none', lineHeight: '1.6', boxSizing: 'border-box'
                                    }}
                                />
                                {levelsText !== levelsOriginalText && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setLevelsText(levelsOriginalText); setShowLevelsEditor(false); }}
                                            style={{
                                                flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                                                letterSpacing: '1px'
                                            }}
                                        >CANCEL</button>
                                        <button
                                            onClick={() => {
                                                try {
                                                    const parsed = deserializeLevels(levelsText);
                                                    if (parsed.length === 0) return;
                                                    onChange('cartridge', { config: { ...element.config, levelsText: levelsText } });
                                                    setShowLevelsEditor(false);
                                                } catch (err) {
                                                    console.error('Failed to parse levels:', err);
                                                }
                                            }}
                                            style={{
                                                flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                                background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: 'white',
                                                letterSpacing: '1px'
                                            }}
                                        >SAVE</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    <div className="menu-divider"></div>
                </>
            )}

            {/* Quiz Text Color */}
            {element.type === 'quiz' && (
                <>
                {/* Quiz Font & Size */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="menu-group">
                        <label>Font</label>
                        <select
                            value={metadata.fontFamily || '"Fira Sans"'}
                            onMouseDown={saveSelection}
                            onChange={(e) => {
                                const fontVal = e.target.value;
                                if (restoreSelection()) {
                                    document.execCommand('fontName', false, fontVal);
                                    const editableEl = getEditableFromSelection();
                                    saveQuizOption(editableEl);
                                    savedSelectionRef.current = null;
                                } else {
                                    updateMetadata({ fontFamily: fontVal });
                                }
                            }}
                        >
                            {FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                        </select>
                    </div>

                    <div className="menu-group">
                        <label>Size</label>
                        <input
                            type="number"
                            value={metadata.fontSize || 16}
                            onMouseDown={saveSelection}
                            onChange={(e) => {
                                const sizeVal = parseInt(e.target.value);
                                if (restoreSelection()) {
                                    // Use fontSize execCommand then override with exact px
                                    document.execCommand('fontSize', false, '7');
                                    const editableEl = getEditableFromSelection();
                                    if (editableEl) {
                                        const fonts = editableEl.querySelectorAll('font[size="7"]');
                                        fonts.forEach(font => {
                                            font.removeAttribute('size');
                                            font.style.fontSize = `${sizeVal}px`;
                                        });
                                        saveQuizOption(editableEl);
                                    }
                                    savedSelectionRef.current = null;
                                } else {
                                    updateMetadata({ fontSize: sizeVal });
                                }
                            }}
                            min="10" max="60"
                            style={{ width: '60px' }}
                        />
                    </div>

                    <div className="menu-group" style={{ flexDirection: 'row', gap: '4px' }}>
                        <button
                            className={`btn-icon ${metadata.fontWeight === 'bold' ? 'active' : ''}`}
                            onMouseDown={(e) => handleFormatCommand(e, 'bold', 'fontWeight', 'bold')}
                            title="Bold"
                            style={{ fontWeight: 'bold', fontSize: '1rem' }}
                        >B</button>
                        <button
                            className={`btn-icon ${metadata.fontStyle === 'italic' ? 'active' : ''}`}
                            onMouseDown={(e) => handleFormatCommand(e, 'italic', 'fontStyle', 'italic')}
                            title="Italic"
                            style={{ fontStyle: 'italic', fontSize: '1rem' }}
                        >I</button>
                        <button
                            className={`btn-icon ${metadata.textDecoration === 'underline' ? 'active' : ''}`}
                            onMouseDown={(e) => handleFormatCommand(e, 'underline', 'textDecoration', 'underline', 'none')}
                            title="Underline"
                            style={{ textDecoration: 'underline', fontSize: '1rem' }}
                        >U</button>
                    </div>

                    {renderAutonextButton()}
                </div>

                {/* Quiz Text Color */}
                <ColorPickerDropdown
                    label="Text Color"
                    color={metadata.color || '#000000'}
                    onMouseDownItem={(e, c) => {
                        e.preventDefault();
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                            const range = sel.getRangeAt(0);
                            const container = range.commonAncestorContainer;
                            const editableEl = container.nodeType === 3
                                ? container.parentElement?.closest('[contenteditable="true"]')
                                : container.closest?.('[contenteditable="true"]');
                            if (editableEl) {
                                document.execCommand('foreColor', false, c);
                                const optionIndex = editableEl.dataset.optionIndex;
                                const matchAnswerIndex = editableEl.dataset.matchAnswerIndex;
                                if (optionIndex !== undefined) {
                                    const currentOptions = [...(element.metadata?.options || [])];
                                    currentOptions[parseInt(optionIndex)] = editableEl.innerHTML;
                                    onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
                                } else if (matchAnswerIndex !== undefined) {
                                    const currentAnswers = [...(element.metadata?.matchAnswers || [])];
                                    currentAnswers[parseInt(matchAnswerIndex)] = editableEl.innerHTML;
                                    onChange(element.id, { metadata: { ...element.metadata, matchAnswers: currentAnswers } });
                                }
                            }
                        } else {
                            updateMetadata({ color: c });
                        }
                    }}
                    onSelect={(c) => {
                        const sel = window.getSelection();
                        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
                            updateMetadata({ color: c });
                        }
                    }}
                />

                {/* Quiz Text BG Color */}
                <ColorPickerDropdown
                    label="Text BG"
                    color="#ffc800"
                    allowNone={true}
                    children={<span style={{fontSize:'12px'}}>A</span>}
                    onMouseDownItem={(e, c) => {
                        e.preventDefault();
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                            const range = sel.getRangeAt(0);
                            const container = range.commonAncestorContainer;
                            const editableEl = container.nodeType === 3
                                ? container.parentElement?.closest('[contenteditable="true"]')
                                : container.closest?.('[contenteditable="true"]');
                            if (editableEl) {
                                document.execCommand('hiliteColor', false, c);
                                const cleanedHtml = (c === 'transparent' || c === 'none')
                                    ? editableEl.innerHTML.replace(/background-color:\s*(?:transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)|inherit);?/gi, '')
                                    : editableEl.innerHTML;
                                editableEl.innerHTML = cleanedHtml;
                                const optionIndex = editableEl.dataset.optionIndex;
                                const matchAnswerIndex = editableEl.dataset.matchAnswerIndex;
                                if (optionIndex !== undefined) {
                                    const currentOptions = [...(element.metadata?.options || [])];
                                    currentOptions[parseInt(optionIndex)] = cleanedHtml;
                                    onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
                                } else if (matchAnswerIndex !== undefined) {
                                    const currentAnswers = [...(element.metadata?.matchAnswers || [])];
                                    currentAnswers[parseInt(matchAnswerIndex)] = cleanedHtml;
                                    onChange(element.id, { metadata: { ...element.metadata, matchAnswers: currentAnswers } });
                                }
                                return;
                            }
                        }
                        if (c === 'transparent' || c === 'none') {
                            const currentOptions = (element.metadata?.options || []).map(opt =>
                                typeof opt === 'string'
                                    ? opt.replace(/background-color:\s*[^;"]+;?/gi, '').replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
                                    : opt
                            );
                            const currentAnswers = (element.metadata?.matchAnswers || []).map(ans =>
                                typeof ans === 'string'
                                    ? ans.replace(/background-color:\s*[^;"]+;?/gi, '').replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
                                    : ans
                            );
                            onChange(element.id, {
                                metadata: {
                                    ...element.metadata,
                                    options: currentOptions,
                                    ...(element.metadata?.matchAnswers ? { matchAnswers: currentAnswers } : {})
                                }
                            });
                        }
                    }}
                    onSelect={(c) => {
                        const sel = window.getSelection();
                        if ((!sel || sel.rangeCount === 0 || sel.isCollapsed) && (c === 'transparent' || c === 'none')) {
                            const currentOptions = (element.metadata?.options || []).map(opt =>
                                typeof opt === 'string'
                                    ? opt.replace(/background-color:\s*[^;"]+;?/gi, '').replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
                                    : opt
                            );
                            const currentAnswers = (element.metadata?.matchAnswers || []).map(ans =>
                                typeof ans === 'string'
                                    ? ans.replace(/background-color:\s*[^;"]+;?/gi, '').replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1')
                                    : ans
                            );
                            onChange(element.id, {
                                metadata: {
                                    ...element.metadata,
                                    options: currentOptions,
                                    ...(element.metadata?.matchAnswers ? { matchAnswers: currentAnswers } : {})
                                }
                            });
                        }
                    }}
                />

                {/* Chat Bubble BG Colors */}
                {metadata.quizType === 'chatquiz' && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <ColorPickerDropdown
                            label="Left Bubble"
                            color={metadata.leftBubbleColor || '#ffffff'}
                            onSelect={(c) => updateMetadata({ leftBubbleColor: c })}
                            allowNone={true}
                            noneLabel="No background"
                        />
                        <ColorPickerDropdown
                            label="Right Bubble"
                            color={metadata.rightBubbleColor || '#14B8A6'}
                            onSelect={(c) => updateMetadata({ rightBubbleColor: c })}
                            allowNone={true}
                            noneLabel="No background"
                        />
                    </div>
                )}
                {onOpenPresets && metadata.quizType !== 'pem' && (
                    <button
                        className="btn-secondary"
                        onClick={onOpenPresets}
                        title="Text Presets"
                        style={{ fontSize: '0.8rem', padding: '4px 10px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        🎨 Presets
                    </button>
                )}
                {SUPPORTED_QUIZ_TYPES.includes(metadata.quizType || 'classic') && metadata.quizType !== 'nl' && (
                    <div className="menu-group">
                        <label>Result</label>
                        <button
                            className={`btn-icon ${existingResultField ? 'active' : ''}`}
                            onClick={handleToggleResultField}
                            title={existingResultField ? "Select Result Field" : "Add Result Field"}
                            style={{
                                width: '34px',
                                height: '34px',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                background: existingResultField ? '#E0F2FE' : '#F1F5F9',
                                border: existingResultField ? '1.5px solid #0284C7' : '1.5px solid transparent',
                                boxShadow: existingResultField ? '0 0 0 2px rgba(2, 132, 199, 0.25)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="1.5" y="1.5" width="17" height="17" rx="4" fill="#0284C7" stroke="#0369A1" strokeWidth="1" />
                                <path d="M5.5 10.5L8.5 13.5L14.5 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                )}
                {!translationMode && (metadata.quizType === 'classic' || !metadata.quizType) && (
                    <div className="menu-group">
                        <label>Answer</label>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                const currentOptions = metadata.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
                                const newOptions = [...currentOptions, `Option ${currentOptions.length + 1}`];
                                updateMetadata({ options: newOptions });
                            }}
                            title="+ ANSWER"
                            style={{
                                fontSize: '0.78rem',
                                padding: '4px 8px',
                                height: '34px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                            }}
                        >
                            + ANSWER
                        </button>
                    </div>
                )}
                </>
            )}

            {/* PEM Settings */}
            {element.type === 'quiz' && metadata.quizType === 'pem' && (
                <>
                    <div className="menu-group">
                        <label>Mode</label>
                        <select
                            value={metadata.pemMode || 'LEVELS'}
                            onChange={(e) => updateMetadata({ pemMode: e.target.value })}
                            style={{ fontSize: '0.8rem' }}
                        >
                            {PEM_MODES.map(m => (
                                <option key={m.key} value={m.key}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                    {metadata.pemMode !== 'MANUAL' && metadata.pemMode !== 'LEVELS' && (
                        <div className="menu-group">
                            <label>Difficulty</label>
                            <input
                                type="number"
                                min="1" max="5"
                                value={metadata.pemDifficulty || 1}
                                onChange={(e) => updateMetadata({ pemDifficulty: parseInt(e.target.value) })}
                                style={{ width: '50px' }}
                            />
                        </div>
                    )}
                    {metadata.pemMode === 'MANUAL' && (
                        <div className="menu-group">
                            <label>Expression</label>
                            <input
                                type="text"
                                value={metadata.pemExpression || ''}
                                onChange={(e) => updateMetadata({ pemExpression: e.target.value })}
                                placeholder="e.g. 2!3 + 4 * 5"
                                style={{ flex: 1, padding: '5px', fontFamily: 'monospace' }}
                            />
                        </div>
                    )}
                    {metadata.pemMode === 'LEVELS' && (
                        <div className="menu-group">
                            <button
                                className="btn-secondary"
                                style={{ width: '100%', padding: '8px', fontWeight: 700, letterSpacing: '1px' }}
                                onClick={() => {
                                    const currentText = metadata.pemLevelsText || DEFAULT_PEM_LEVELS_TEXT;
                                    setLevelsText(currentText);
                                    setLevelsOriginalText(currentText);
                                    setShowLevelsEditor(true);
                                }}
                            >
                                📋 LEVELS
                            </button>
                        </div>
                    )}
                    <div className="menu-group">
                        <label>Parentheses Select</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0' }}>
                            <input
                                type="checkbox"
                                id="disable-paren-select-checkbox"
                                checked={metadata.disableParenSelect !== false}
                                onChange={(e) => updateMetadata({ disableParenSelect: e.target.checked })}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#333' }}>Disable (solve directly)</span>
                        </div>
                    </div>
                    <div className="menu-divider"></div>
                </>
            )}

            {/* MEP Levels Editor Modal */}
            {showLevelsEditor && element.type === 'quiz' && metadata.quizType === 'pem' && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => { setShowLevelsEditor(false); setLevelsText(levelsOriginalText); }}>
                    <div style={{
                        background: '#1e1b3a', border: '1px solid rgba(167,139,250,0.4)',
                        borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px',
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '2px', textAlign: 'center' }}>MEP LEVELS</div>
                        <textarea
                            value={levelsText}
                            onChange={(e) => setLevelsText(e.target.value)}
                            spellCheck={false}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            style={{
                                width: '100%', minHeight: '300px', maxHeight: '50vh',
                                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.3)',
                                borderRadius: '8px', color: '#e2e8f0', fontFamily: "'Courier New', monospace",
                                fontSize: '0.85rem', padding: '12px', resize: 'vertical',
                                outline: 'none', lineHeight: '1.6', boxSizing: 'border-box'
                            }}
                        />
                        {levelsText !== levelsOriginalText && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => { setLevelsText(levelsOriginalText); setShowLevelsEditor(false); }}
                                    style={{
                                        flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                                        letterSpacing: '1px'
                                    }}
                                >CANCEL</button>
                                <button
                                    onClick={() => {
                                        try {
                                            const parsed = deserializePemLevels(levelsText);
                                            if (parsed.length === 0) return;
                                            updateMetadata({ pemLevelsText: levelsText });
                                            setShowLevelsEditor(false);
                                        } catch (err) {
                                            console.error('Failed to parse levels:', err);
                                        }
                                    }}
                                    style={{
                                        flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: 'white',
                                        letterSpacing: '1px'
                                    }}
                                >SAVE</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Match/Conecta Quiz Settings */}
            {element.type === 'quiz' && (metadata.quizType === 'match' || metadata.quizType === 'conecta') && (
                <>
                    {metadata.quizType === 'match' && (
                        <>
                            <div className="menu-group">
                                <label>Content Type</label>
                                <select
                                    value={metadata.matchContentType || 'order_of_operations'}
                                    onChange={(e) => updateMetadata({ matchContentType: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        background: '#fff',
                                        cursor: 'pointer',
                                        color: '#333'
                                    }}
                                >
                                    <option value="order_of_operations">Order of Operations</option>
                                    <option value="basic_arithmetic">Basic Arithmetic</option>
                                    <option value="custom">Custom (manual)</option>
                                </select>
                            </div>
                            <div className="menu-divider"></div>
                        </>
                    )}
                    <div className="menu-group">
                        <label>Card Shape</label>
                        <select
                            value={metadata.cardShape || 'square'}
                            onChange={(e) => updateMetadata({ cardShape: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #ddd',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: '#fff',
                                cursor: 'pointer',
                                color: '#333'
                            }}
                        >
                            <option value="square">Square (Default)</option>
                            <option value="circle">Circular Plate (White)</option>
                        </select>
                    </div>
                    <div className="menu-divider"></div>
                    <div className="menu-group">
                        <label>Floating Bubbles</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0' }}>
                            <input
                                type="checkbox"
                                id="enable-bubbles-checkbox"
                                checked={metadata.enableBubbles !== false}
                                onChange={(e) => updateMetadata({ enableBubbles: e.target.checked })}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#333' }}>On by default</span>
                        </div>
                    </div>
                    <div className="menu-divider"></div>
                </>
            )}

            {/* Quiz Settings */}
            {element.type === 'quiz' && metadata.quizType === 'tf' && metadata.quizType !== 'chatquiz' && (
                <>
                    <div className="menu-group">
                        <label>Visual Answer</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className={`btn-icon ${metadata.visualMode ? 'active' : ''}`}
                                onClick={() => updateMetadata({ visualMode: !metadata.visualMode })}
                                title={metadata.visualMode ? 'Switch to Text' : 'Switch to Thumbs'}
                            >
                                {metadata.visualMode ? '👍' : 'ABC'}
                            </button>
                        </div>
                    </div>
                    <div className="menu-divider"></div>
                </>
            )}

            {/* Field Quiz Settings */}
            {element.type === 'quiz' && metadata.quizType === 'field' && (
                <>
                    <div className="menu-group" style={{ flex: 1, minWidth: '220px' }}>
                        <label>Field Expression (manual mode)</label>
                        <input
                            type="text"
                            value={metadata.fieldExpression || '3 + *8 x 2* = 19'}
                            onChange={(e) => updateMetadata({ fieldExpression: e.target.value })}
                            placeholder="e.g. 3 + *8 x 2* = 19"
                            style={{ fontSize: '0.8rem', padding: '6px', width: '100%', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.15)' }}
                        />
                        <span style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '2px' }}>
                            Use *expr* for empty box, **expr** for grey text placeholder.
                        </span>
                    </div>

                    <div className="menu-group" style={{ minWidth: '150px' }}>
                        <label>Correct Values</label>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {parseFieldExpression(metadata.fieldExpression || '3 + *8 x 2* = 19')
                                .filter(s => s.type === 'field')
                                .map((s, i) => (
                                    <span key={i} style={{
                                        fontSize: '0.75rem',
                                        background: s.evaluated !== null ? 'rgba(52, 211, 153, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                                        border: s.evaluated !== null ? '1px solid #10B981' : '1px solid #EF4444',
                                        color: s.evaluated !== null ? '#10B981' : '#EF4444',
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        Slot {i + 1}: {s.evaluated !== null ? s.evaluated : '?'}
                                    </span>
                                ))}
                        </div>
                    </div>

                    <div className="menu-divider"></div>
                </>
            )}

            {/* NL Quiz Settings */}
            {element.type === 'quiz' && metadata.quizType === 'nl' && metadata.quizType !== 'chatquiz' && (
                <>
                    <div className="menu-group">
                        <label>Mode</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className={`btn-icon ${metadata.nlConfig?.useFractions ? 'active' : ''}`}
                                onClick={() => updateMetadata({ nlConfig: { ...metadata.nlConfig, useFractions: !metadata.nlConfig?.useFractions } })}
                                title="Toggle Fractions Mode"
                                style={{ width: '80px', fontSize: '0.8rem' }}
                            >
                                {metadata.nlConfig?.useFractions ? 'Fractions' : 'Numbers'}
                            </button>
                        </div>
                    </div>

                    <div className="menu-group">
                        <label>Range</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input
                                type={metadata.nlConfig?.useFractions ? "text" : "number"}
                                placeholder="Min"
                                value={metadata.nlConfig?.min ?? 0}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    updateMetadata({
                                        nlConfig: {
                                            ...metadata.nlConfig,
                                            min: metadata.nlConfig?.useFractions ? val : parseInt(val)
                                        }
                                    });
                                }}
                                style={{ width: '50px' }}
                            />
                            <span>-</span>
                            <input
                                type={metadata.nlConfig?.useFractions ? "text" : "number"}
                                placeholder="Max"
                                value={metadata.nlConfig?.max ?? 10}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    updateMetadata({
                                        nlConfig: {
                                            ...metadata.nlConfig,
                                            max: metadata.nlConfig?.useFractions ? val : parseInt(val)
                                        }
                                    });
                                }}
                                style={{ width: '50px' }}
                            />
                        </div>
                    </div>

                    <div className="menu-group">
                        <label>Steps</label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={metadata.nlConfig?.stepCount ?? 10}
                            onChange={(e) => updateMetadata({ nlConfig: { ...metadata.nlConfig, stepCount: Math.max(1, parseInt(e.target.value)) } })}
                            style={{ width: '40px' }}
                        />
                    </div>

                    <div className="menu-group">
                        <label>Target</label>
                        <input
                            type={metadata.nlConfig?.useFractions ? "text" : "number"}
                            value={metadata.nlConfig?.correctValue ?? 5}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateMetadata({
                                    nlConfig: {
                                        ...metadata.nlConfig,
                                        correctValue: metadata.nlConfig?.useFractions ? val : parseInt(val)
                                    }
                                });
                            }}
                            style={{ width: '50px' }}
                        />
                    </div>

                    <div className="menu-group">
                        <label>Labels</label>
                        <button
                            className={`btn-icon ${metadata.nlConfig?.hideLabels ? 'active' : ''}`}
                            onClick={() => updateMetadata({ nlConfig: { ...metadata.nlConfig, hideLabels: !metadata.nlConfig?.hideLabels } })}
                            title="Toggle Intermediate Labels"
                            style={{ width: '40px', fontSize: '1rem' }}
                        >
                            {metadata.nlConfig?.hideLabels ? 'Ends' : 'All'}
                        </button>
                    </div>

                    <div className="menu-group">
                        <label>Result</label>
                        <button
                            className={`btn-icon ${existingResultField ? 'active' : ''}`}
                            onClick={handleToggleResultField}
                            title={existingResultField ? "Select Result Field" : "Add Result Field"}
                            style={{
                                width: '34px',
                                height: '34px',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                background: existingResultField ? '#E0F2FE' : '#F1F5F9',
                                border: existingResultField ? '1.5px solid #0284C7' : '1.5px solid transparent',
                                boxShadow: existingResultField ? '0 0 0 2px rgba(2, 132, 199, 0.25)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="1.5" y="1.5" width="17" height="17" rx="4" fill="#0284C7" stroke="#0369A1" strokeWidth="1" />
                                <path d="M5.5 10.5L8.5 13.5L14.5 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </>
            )}

            {/* iSticker Settings */}
            {element.type === 'isticker' && (
                <>
                    <div className="menu-group">
                        <label>🧩 {metadata.stickerType === 'expression_scanner_001' ? 'Expression Scanner' : metadata.stickerType === 'pemdas_term_separator' ? 'Term Separator' : metadata.stickerType === 'exponent_expander' ? 'Exponent Expander' : 'iSticker'}</label>
                    </div>
                    {(metadata.stickerType === 'expression_scanner_001' || metadata.stickerType === 'pemdas_term_separator' || metadata.stickerType === 'exponent_expander') && (
                        <>
                            <div className="menu-group">
                                <label>Expression</label>
                                <input
                                    type="text"
                                    value={metadata.expression || ''}
                                    onChange={(e) => updateMetadata({ expression: e.target.value })}
                                    placeholder="e.g. 2 + 3 × 4 - 5"
                                    style={{ flex: 1, padding: '5px', fontFamily: 'monospace' }}
                                />
                            </div>
                            {metadata.stickerType === 'expression_scanner_001' && (
                                <div className="menu-group">
                                    <label>Scan Speed ({metadata.scanDuration || 3}s)</label>
                                    <input
                                        type="range"
                                        min="1" max="6" step="0.5"
                                        value={metadata.scanDuration || 3}
                                        onChange={(e) => updateMetadata({ scanDuration: parseFloat(e.target.value) })}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            )}
                            {metadata.stickerType === 'pemdas_term_separator' && (
                                <div className="menu-group">
                                    <label>Color version</label>
                                    <button
                                        className={`btn-icon ${metadata.colorVersion ? 'active' : ''}`}
                                        onClick={() => updateMetadata({ colorVersion: !metadata.colorVersion })}
                                        title={metadata.colorVersion ? "Switch to Default style" : "Switch to Color version style"}
                                    >
                                        🎨
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Popup Settings */}
            {element.type === 'popup' && (
                <>
                    <div className="menu-group" style={{ flex: 1 }}>
                        <label>Popup Text</label>
                        <textarea
                            value={metadata.popupText || ''}
                            onChange={(e) => updateMetadata({ popupText: e.target.value })}
                            placeholder="Enter the text to display in the popup window..."
                            style={{ 
                                flex: 1, 
                                minHeight: '38px', 
                                maxHeight: '80px', 
                                padding: '6px 8px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(0,0,0,0.15)',
                                fontFamily: 'inherit',
                                fontSize: '0.85rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>
                    <div className="menu-group">
                        <label>Flip</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className={`btn-icon ${metadata.flipX ? 'active' : ''}`}
                                onClick={() => updateMetadata({ flipX: !metadata.flipX })}
                                title="Flip Horizontal"
                            >
                                ↔️
                            </button>
                            <button
                                className={`btn-icon ${metadata.flipY ? 'active' : ''}`}
                                onClick={() => updateMetadata({ flipY: !metadata.flipY })}
                                title="Flip Vertical"
                            >
                                ↕️
                            </button>
                        </div>
                    </div>
                    
                    <div className="menu-group">
                        <label>Opacity</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={(metadata.opacity ?? 1) * 100}
                            onChange={(e) => updateMetadata({ opacity: parseInt(e.target.value) / 100 })}
                            style={{ width: '80px' }}
                        />
                    </div>

                    <div className="menu-group">
                        <label>Brightness</label>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={metadata.brightness ?? 100}
                            onChange={(e) => updateMetadata({ brightness: parseInt(e.target.value) })}
                            style={{ width: '80px' }}
                            title={metadata.brightness ? `${metadata.brightness}%` : '100%'}
                        />
                    </div>

                    <div className="menu-group">
                        <label>Layer</label>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                                className="btn-icon"
                                onClick={() => onReorderElement && onReorderElement(element.id, 'backward')}
                                title="Send Backward"
                                style={{ fontSize: '1rem' }}
                            >
                                ⬇️
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => onReorderElement && onReorderElement(element.id, 'forward')}
                                title="Bring Forward"
                                style={{ fontSize: '1rem' }}
                            >
                                ⬆️
                            </button>
                        </div>
                    </div>

                    <div className="menu-divider"></div>
                </>
            )}

            {element.type === 'game' && (
                <>
                    <div className="menu-group">
                        <label>🎮 Minigame</label>
                    </div>
                    {renderAutonextButton()}
                    <div className="menu-divider"></div>
                </>
            )}

            <div className="menu-group">
                <label>Actions</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {onToggleGuides && (() => {
                        const mode = state?.guideMode || (showGuides ? 'grid' : 'none');
                        const isBoth = mode === 'both';
                        const isGuides = mode === 'guides';
                        const isNone = mode === 'none';

                        let titleText = 'Grid (tap for Grid + Guides)';
                        if (isBoth) titleText = 'Grid + Guides (tap for Guides only)';
                        else if (isGuides) titleText = 'Guides only (tap to hide all)';
                        else if (isNone) titleText = 'No guides (tap for Grid)';

                        return (
                            <button 
                                className={`btn-icon ${!isNone ? 'active' : ''} guide-mode-btn mode-${mode}`} 
                                onClick={onToggleGuides} 
                                title={titleText}
                                style={{ position: 'relative' }}
                            >
                                {isGuides ? '📏' : '⊞'}
                                {isBoth && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10B981',
                                        border: '1px solid white',
                                        boxShadow: '0 0 2px rgba(0,0,0,0.3)'
                                    }} />
                                )}
                            </button>
                        );
                    })()}
                    {onUndo && element.type !== 'cartridge' && element.type !== 'background' && (
                        <button className="btn-icon" onClick={onUndo} title="Undo Changes">
                            ↩️
                        </button>
                    )}
                    {!translationMode && (element.type === 'image' || element.type === 'result_field' || element.type === 'number_line' || isTextType) && (
                        <button 
                            className={`btn-icon ${metadata.locked ? 'active' : ''}`} 
                            onClick={() => updateMetadata({ locked: !metadata.locked })} 
                            title={metadata.locked ? (isTextType ? "Unlock Text" : "Unlock (Enable Rotate & Scale)") : (isTextType ? "Lock Text" : "Lock (Fixed Size)")}
                            style={{ backgroundColor: metadata.locked ? '#ffcccc' : undefined }}
                        >
                            {metadata.locked ? '🔒' : '🔓'}
                        </button>
                    )}
                    {!translationMode && element.type !== 'cartridge' && element.type !== 'quiz' && (
                        <button 
                            className="btn-icon" 
                            onClick={() => {
                                if (element.type === 'result_field') {
                                    const count = (currentSlide?.elements || []).filter(el => el.type === 'result_field').length;
                                    if (count >= 5) {
                                        alert('A maximum of 5 Result Fields are allowed on this slide!');
                                        return;
                                    }
                                }
                                onDuplicate();
                            }} 
                            title="Duplicate Element"
                        >
                            ❐
                        </button>
                    )}
                    {!translationMode && canGroup && onGroup && (
                        <button className="btn-icon" onClick={onGroup} title="Group Elements (Cmd+G)">
                            🔗
                        </button>
                    )}
                    {!translationMode && isGrouped && onUngroup && (
                        <button className="btn-icon" onClick={onUngroup} title="Ungroup Elements (Cmd+G)">
                            ⛓️‍💥
                        </button>
                    )}
                    {!translationMode && (
                        <button 
                            className="btn-delete" 
                            onClick={() => {
                                if (element.type === 'result_field') {
                                    const isTypeQuizSlide = currentSlide?.elements?.some(el => el.type === 'quiz' && el.metadata?.quizType === 'type');
                                    const count = (currentSlide?.elements || []).filter(el => el.type === 'result_field').length;
                                    if (isTypeQuizSlide && count <= 1) {
                                        alert('A Type Answer quiz must have at least one Result Field!');
                                        return;
                                    }
                                }
                                onDelete(element.type === 'cartridge' ? 'cartridge' : element.id);
                            }} 
                            title="Delete Element"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>

        </div >
    );
};

export default ContextualMenu;
