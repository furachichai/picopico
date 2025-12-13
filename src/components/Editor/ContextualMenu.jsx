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

                    <div className="menu-divider"></div>
                </>
            )}

            {/* Quiz Settings */}
            {element.type === 'quiz' && metadata.quizType === 'tf' && (
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
            {element.type === 'quiz' && metadata.quizType === 'nl' && (
                <>
                    <div className="menu-group">
                        <label>Range</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input
                                type="number"
                                placeholder="Min"
                                value={metadata.nlConfig?.min ?? 0}
                                onChange={(e) => updateMetadata({ nlConfig: { ...metadata.nlConfig, min: parseInt(e.target.value) } })}
                                style={{ width: '40px' }}
                            />
                            <span>-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={metadata.nlConfig?.max ?? 10}
                                onChange={(e) => updateMetadata({ nlConfig: { ...metadata.nlConfig, max: parseInt(e.target.value) } })}
                                style={{ width: '40px' }}
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
                            type="number"
                            min={metadata.nlConfig?.min ?? 0}
                            max={metadata.nlConfig?.max ?? 10}
                            value={metadata.nlConfig?.correctValue ?? 5}
                            onChange={(e) => updateMetadata({ nlConfig: { ...metadata.nlConfig, correctValue: parseInt(e.target.value) } })}
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
