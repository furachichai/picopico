import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ContextualMenu.css'; // Reusing contextual menu styles for simplicity or create new ones

const BurgerMenu = ({ onInfo, onNew, onMenu }) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
    };

    const handleSave = () => {
        onSave();
        setIsOpen(false);
    };

    return (
        <div className="burger-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
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
                    <button className="btn-secondary" onClick={() => { onMenu(); setIsOpen(false); }} style={{ width: '100%', textAlign: 'left' }}>
                        🏠 {t('editor.menu')}
                    </button>
                    <button className="btn-secondary" onClick={() => { onNew(); setIsOpen(false); }} style={{ width: '100%', textAlign: 'left' }}>
                        ➕ {t('editor.newLesson')}
                    </button>
                    <button className="btn-secondary" onClick={() => { onInfo(); setIsOpen(false); }} style={{ width: '100%', textAlign: 'left' }}>
                        ℹ️ {t('editor.info')}
                    </button>

                    <div className="language-selector" style={{ width: '100%' }}>
                        <div style={{ fontSize: '0.8rem', marginBottom: '5px', color: '#666' }}>{t('editor.language')}</div>
                        <button className="btn-secondary" onClick={() => changeLanguage('en')} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '5px' }}>
                            🇬🇧 English
                        </button>
                        <button className="btn-secondary" onClick={() => changeLanguage('es')} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '5px' }}>
                            🇪🇸 Español
                        </button>
                        <button className="btn-secondary" onClick={() => changeLanguage('fr')} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
                            🇫🇷 Français
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
