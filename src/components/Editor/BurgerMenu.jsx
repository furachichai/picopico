import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ContextualMenu.css'; // Reusing contextual menu styles for simplicity or create new ones

const BurgerMenu = ({ onInfo, onNew, onMenu, onLessons, onPresets, disabled }) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => { if (!disabled) setIsOpen(!isOpen); };

    const handleSave = () => {
        onSave();
        setIsOpen(false);
    };

    return (
        <div className="burger-menu-container" style={{ position: 'relative', display: 'inline-block', top: 0, left: 0 }}>
            <button
                className="btn-floating btn-burger"
                onClick={toggleMenu}
                title="Menu"
                style={{ fontSize: '1.5rem', cursor: 'pointer' }}
            >
                ☰
            </button>

            {isOpen && (
                <div className="contextual-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '10px',
                    gap: '10px',
                    zIndex: 1000,
                    minWidth: '150px'
                }}>
                    <div className="burger-menu-content">
                        <button className="menu-item" onClick={() => { onNew(); setIsOpen(false); }}>
                            <span className="menu-icon">📄</span>
                            <span className="menu-text">{t('editor.newLesson')}</span>
                        </button>
                        <button className="menu-item" onClick={() => { onInfo(); setIsOpen(false); }}>
                            <span className="menu-icon">ℹ️</span>
                            <span className="menu-text">{t('editor.info')}</span>
                        </button>
                        <button className="menu-item" onClick={() => { if (onPresets) onPresets(); setIsOpen(false); }}>
                            <span className="menu-icon">🎨</span>
                            <span className="menu-text">Text Presets</span>
                        </button>
                        <button className="menu-item" onClick={() => { onMenu(); setIsOpen(false); }}>
                            <span className="menu-icon">🏠</span>
                            <span className="menu-text">{t('editor.menu')}</span>
                        </button>
                    </div>

                </div>
            )}
            {/* Overlay to close menu when clicking outside */}
            {isOpen && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default BurgerMenu;
