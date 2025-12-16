import React, { useState } from 'react';
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

    const [activeCardIndex, setActiveCardIndex] = useState(element.config?.previewIndex || 0);

    // Removed crashing useEffect that attempted to force sync. 
    // Instead, we initialize state above to match the config.

    const updateMetadata = (updates) => {
        onChange(element.id, { metadata: { ...metadata, ...updates } });
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
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileUpload(e, activeCardIndex)}
                                                    style={{ width: '90px', fontSize: '0.7rem' }}
                                                />
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
        </div >
    );
};

export default ContextualMenu;
