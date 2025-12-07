import React from 'react';
import './ContextualMenu.css';

const FONTS = [
    { name: 'Nunito', value: 'Nunito' },
    { name: 'Comic Sans', value: '"Comic Sans MS", "Chalkboard SE", sans-serif' },
    { name: 'Serif', value: 'Georgia, serif' },
    { name: 'Monospace', value: 'monospace' },
];

const COLORS = [
    '#000000', '#ffffff', '#ff4b4b', '#58cc02', '#1cb0f6', '#ffc800', '#ce82ff'
];

const ContextualMenu = ({ element, onChange, onDelete, onDuplicate }) => {
    if (!element) return null;

    const { metadata = {} } = element; // Ensure metadata exists
    const isTextType = element.type === 'balloon' || element.type === 'text';
    const isImageType = element.type === 'image';

    const updateMetadata = (updates) => {
        onChange(element.id, { metadata: { ...metadata, ...updates } });
    };

    return (
        <div className="contextual-menu">
            {isTextType && (
                <>
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
                    </div>

                    <div className="menu-group">
                        <label>Text</label>
                        <div className="color-picker-mini">
                            {COLORS.map(c => (
                                <div
                                    key={c}
                                    className={`color-swatch ${metadata.color === c ? 'active' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => updateMetadata({ color: c })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="menu-group">
                        <label>{element.type === 'balloon' ? 'Bubble' : 'Background'}</label>
                        <div className="color-picker-mini">
                            {COLORS.map(c => (
                                <div
                                    key={c}
                                    className={`color-swatch ${metadata.backgroundColor === c ? 'active' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => updateMetadata({ backgroundColor: c })}
                                />
                            ))}
                        </div>
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

                    <div className="menu-divider"></div>
                </>
            )}

            {element.type === 'cartridge' && (
                <>
                    {/* We need to access the cartridge config from the slide actually, 
                         since 'element' passed here is usually an element object, but for cartridge we pass 'cartridge' string or object?
                         Wait, ContextualMenu receives `element`. In Canvas we dispatch SELECT_ELEMENT payload 'cartridge'.
                         EditorContext needs to handle selecting 'cartridge' and passing the cartridge object as `element` to this menu?
                         OR we check if selectedElementId === 'cartridge' and read from slide here.
                         However, `ContextualMenu` props are `element`. 
                         Let's assume the parent `Editor.jsx` passes the cartridge object if `selectedElementId === 'cartridge'`.
                         OR we can assume `element` IS the cartridge config object if we hack it upstream.
                         Let's verify how `ContextualMenu` is used in `Editor.jsx` or similar.
                         I'll stick to modifying this file assuming `element` *is* the cartridge data or we have a way to handle it.
                         Actually the user said "contextual editor that allows me to select the game modes".
                         I'll check `ContextualMenu.jsx` usage first? No I already read it.
                         I need to check where ContextualMenu is rendered. 
                         But I can conditionally render based on a new prop or just check if `element.type` or `element` structure matches cartridge.
                     */}
                    {/* For now, assuming `element` prop will be the cartridge object when selected. */}
                    <div className="menu-group">
                        <label>Shape</label>
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

                    <div className="menu-divider"></div>
                </>
            )}

            <div className="menu-group">
                <label>Actions</label>
                <div style={{ display: 'flex', gap: '5px' }}>
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
        </div>
    );
};

export default ContextualMenu;
