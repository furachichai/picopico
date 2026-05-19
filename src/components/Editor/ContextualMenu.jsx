import React, { useState, useRef } from 'react';
import './ContextualMenu.css';
import { PEM_MODES } from '../Player/PEMExpressionPool';
import { serializeLevels, deserializeLevels } from '../../cartridges/Potiondas/Potiondas';
import { getSymbolSvg } from '../../utils/symbols';

const FONTS = [
    { name: 'HVD Comic', value: '"HVD Comic Serif Pro", sans-serif' },
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
    '#000000', '#ffffff', '#ff4b4b', '#58cc02', '#1cb0f6', '#ffc800', '#ce82ff',
    '#9333ea', '#e11d48', '#f97316', '#0d9488', '#475569', '#8b4513', '#ec4899'
];

const ColorPickerDropdown = ({ label, color, onSelect, onMouseDownItem, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="menu-group" style={{ position: 'relative' }}>
            {label && <label>{label}</label>}
            <div
                className="color-swatch-trigger"
                style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    backgroundColor: color || '#ffffff',
                    border: '2px solid rgba(0,0,0,0.1)', cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'transform 0.1s',
                    position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                onClick={() => setIsOpen(!isOpen)}
                onMouseDown={(e) => {
                    // Prevent blur if it's a highlighter
                    if (onMouseDownItem) e.preventDefault();
                }}
            >
                {children}
            </div>
            {isOpen && (
                <>
                    <div 
                        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99 }}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        onMouseDown={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    />
                    <div className="color-picker-submenu" style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        background: 'white', padding: '10px', borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', zIndex: 100,
                        marginBottom: '10px'
                    }}>
                        {COLORS.map(c => (
                            <div
                                key={c}
                                className={`color-swatch ${color === c ? 'active' : ''}`}
                                style={{ backgroundColor: c }}
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

const ContextualMenu = ({ element, onChange, onDelete, onDuplicate, onOpenLibrary, onOpenPresets, onReorderElement, onUndo, showGuides, onToggleGuides }) => {
    if (!element) return null;

    const { metadata = {} } = element; // Ensure metadata exists
    const isTextType = element.type === 'balloon' || element.type === 'text';
    const isImageType = element.type === 'image';

    const [activeCardIndex, setActiveCardIndex] = useState(element.config?.previewIndex || 0);
    const [showLevelsEditor, setShowLevelsEditor] = useState(false);
    const [levelsText, setLevelsText] = useState('');
    const [levelsOriginalText, setLevelsOriginalText] = useState('');

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
        if (optionIndex !== undefined) {
            const currentOptions = [...(element.metadata?.options || [])];
            currentOptions[parseInt(optionIndex)] = editableEl.innerHTML;
            onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
        }
    };

    // Removed crashing useEffect that attempted to force sync. 
    // Instead, we initialize state above to match the config.

    const updateMetadata = (updates) => {
        onChange(element.id, { metadata: { ...metadata, ...updates } });
    };

    const handleFormatCommand = (e, cmd, metaProp, activeValue, inactiveValue = 'normal') => {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            document.execCommand(cmd, false, null);
            const editableEl = getEditableFromSelection();
            if (editableEl) {
                const optionIndex = editableEl.dataset.optionIndex;
                if (optionIndex !== undefined) {
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
                                    style={{ width: '70px' }}
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
                                        const optionIndex = editableEl.dataset.optionIndex;
                                        if (optionIndex !== undefined) {
                                            const currentOptions = [...(element.metadata?.options || [])];
                                            currentOptions[parseInt(optionIndex)] = editableEl.innerHTML;
                                            onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
                                        } else {
                                            onChange(element.id, { content: editableEl.innerHTML });
                                        }
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
                                    const current = metadata.textAlign || 'left';
                                    const next = current === 'left' ? 'center' : current === 'center' ? 'right' : 'left';
                                    updateMetadata({ textAlign: next });
                                }}
                                title={`Align: ${metadata.textAlign || 'left'}`}
                                style={{ fontSize: '1rem', minWidth: '36px' }}
                            >
                                {(metadata.textAlign || 'left') === 'left' ? '⬅' : (metadata.textAlign === 'center' ? '⬛' : '➡')}
                            </button>
                        </div>
                    )}

                    <div className="menu-group" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '10px' }}>
                        <ColorPickerDropdown
                            label={element.type === 'balloon' ? 'Bubble' : 'Background'}
                            color={metadata.backgroundColor || '#ffffff'}
                            onSelect={(c) => updateMetadata({ backgroundColor: c })}
                        />
                        {element.type === 'background' && (
                            <button
                                className="btn-secondary"
                                onClick={() => onOpenLibrary('custom-bg')}
                                title="Open Background Library"
                                style={{ fontSize: '0.8rem', padding: '4px 8px', marginBottom: '2px' }}
                            >
                                LIBRARY
                            </button>
                        )}
                    </div>

                    {onOpenPresets && (
                        <button
                            className="btn-secondary"
                            onClick={onOpenPresets}
                            title="Text Presets"
                            style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            🎨 Presets
                        </button>
                    )}

                    {element.type !== 'background' && onReorderElement && (
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

            {element.type === 'cartridge' && (
                <>
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
                                if (optionIndex !== undefined) {
                                    const currentOptions = [...(element.metadata?.options || [])];
                                    currentOptions[parseInt(optionIndex)] = editableEl.innerHTML;
                                    onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
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
                                const optionIndex = editableEl.dataset.optionIndex;
                                if (optionIndex !== undefined) {
                                    const currentOptions = [...(element.metadata?.options || [])];
                                    currentOptions[parseInt(optionIndex)] = editableEl.innerHTML;
                                    onChange(element.id, { metadata: { ...element.metadata, options: currentOptions } });
                                }
                            }
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
                        />
                        <ColorPickerDropdown
                            label="Right Bubble"
                            color={metadata.rightBubbleColor || '#14B8A6'}
                            onSelect={(c) => updateMetadata({ rightBubbleColor: c })}
                        />
                    </div>
                )}
                {onOpenPresets && (
                    <button
                        className="btn-secondary"
                        onClick={onOpenPresets}
                        title="Text Presets"
                        style={{ fontSize: '0.8rem', padding: '4px 10px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        🎨 Presets
                    </button>
                )}
                </>
            )}

            {/* PEM Settings */}
            {element.type === 'quiz' && metadata.quizType === 'pem' && (
                <>
                    <div className="menu-group">
                        <label>Mode</label>
                        <select
                            value={metadata.pemMode || 'A'}
                            onChange={(e) => updateMetadata({ pemMode: e.target.value })}
                            style={{ fontSize: '0.8rem' }}
                        >
                            {PEM_MODES.map(m => (
                                <option key={m.key} value={m.key}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                    {metadata.pemMode !== 'MANUAL' && (
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
                    <div className="menu-divider"></div>
                </>
            )}

            {/* Match Quiz Settings */}
            {element.type === 'quiz' && metadata.quizType === 'match' && (
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
                </>
            )}

            {/* iSticker Settings */}
            {element.type === 'isticker' && (
                <>
                    <div className="menu-group">
                        <label>🧩 {metadata.stickerType === 'expression_scanner_001' ? 'Expression Scanner' : metadata.stickerType === 'pemdas_term_separator' ? 'Term Separator' : 'iSticker'}</label>
                    </div>
                    {(metadata.stickerType === 'expression_scanner_001' || metadata.stickerType === 'pemdas_term_separator') && (
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
                        </>
                    )}
                </>
            )}

            <div className="menu-group">
                <label>Actions</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {onToggleGuides && (
                        <button 
                            className={`btn-icon ${showGuides ? 'active' : ''}`} 
                            onClick={onToggleGuides} 
                            title={showGuides ? "Hide Guides" : "Show Guides"}
                        >
                            ⊞
                        </button>
                    )}
                    {onUndo && element.type !== 'cartridge' && element.type !== 'background' && (
                        <button className="btn-icon" onClick={onUndo} title="Undo Changes">
                            ↩️
                        </button>
                    )}
                    {element.type === 'image' && (
                        <button 
                            className={`btn-icon ${metadata.locked ? 'active' : ''}`} 
                            onClick={() => updateMetadata({ locked: !metadata.locked })} 
                            title={metadata.locked ? "Unlock Image" : "Lock Image"}
                            style={{ backgroundColor: metadata.locked ? '#ffcccc' : undefined }}
                        >
                            {metadata.locked ? '🔒' : '🔓'}
                        </button>
                    )}
                    {element.type !== 'cartridge' && element.type !== 'quiz' && (
                        <button className="btn-icon" onClick={onDuplicate} title="Duplicate Element">
                            ❐
                        </button>
                    )}
                    <button className="btn-delete" onClick={() => onDelete(element.type === 'cartridge' ? 'cartridge' : element.id)} title="Delete Element">
                        🗑️
                    </button>
                </div>
            </div>
        </div >
    );
};

export default ContextualMenu;
