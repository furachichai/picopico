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
                        />
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

            <div className="menu-group">
                <label>Actions</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn-icon" onClick={onDuplicate} title="Duplicate Element">
                        ❐
                    </button>
                    <button className="btn-delete" onClick={onDelete} title="Delete Element">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ContextualMenu;
