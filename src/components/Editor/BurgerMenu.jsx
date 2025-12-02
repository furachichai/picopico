import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ContextualMenu.css'; // Reusing contextual menu styles for simplicity or create new ones

const BurgerMenu = ({ onInfo, onNew, onMenu, onLessons }) => {
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
                    <div className="burger-menu-content">
                        <button className="menu-item" onClick={() => { onNew(); setIsOpen(false); }}>
                            <span className="menu-icon">📄</span>
                            <span className="menu-text">{t('editor.newLesson')}</span>
                        </button>
                        <button className="menu-item" onClick={() => { onLessons(); setIsOpen(false); }}>
                            <span className="menu-icon">📂</span>
                            <span className="menu-text">{t('editor.lessons')}</span>
                        </button>
                        <button className="menu-item" onClick={() => { onInfo(); setIsOpen(false); }}>
                            <span className="menu-icon">ℹ️</span>
                            <span className="menu-text">{t('editor.info')}</span>
                        </button>
                        <button className="menu-item" onClick={() => { onMenu(); setIsOpen(false); }}>
                            <span className="menu-icon">🏠</span>
                            <span className="menu-text">{t('editor.menu')}</span>
                        </button>
                    </div>

                    <div className="language-section">
                        <div className="language-label">{t('editor.language')}</div>
                        <div className="language-buttons">
                            <button className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`} onClick={() => changeLanguage('en')}>
                                <span className="lang-flag">🇬🇧</span>
                                <span className="lang-text">EN</span>
                            </button>
                            <button className={`lang-btn ${i18n.language === 'es' ? 'active' : ''}`} onClick={() => changeLanguage('es')}>
                                <span className="lang-flag">🇪🇸</span>
                                <span className="lang-text">ES</span>
                            </button>
                            <button className={`lang-btn ${i18n.language === 'fr' ? 'active' : ''}`} onClick={() => changeLanguage('fr')}>
                                <span className="lang-flag">🇫🇷</span>
                                <span className="lang-text">FR</span>
                            </button>
                        </div>
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
