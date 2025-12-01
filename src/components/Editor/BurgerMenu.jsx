import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ContextualMenu.css'; // Reusing contextual menu styles for simplicity or create new ones

const BurgerMenu = ({ onSave, onAbout, onBack }) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);



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
                    <button className="btn-secondary" onClick={handleSave} style={{ width: '100%', textAlign: 'left' }}>
                        💾 {t('editor.save')}
                    </button>

                    <button className="btn-secondary" onClick={onAbout} style={{ width: '100%', textAlign: 'left' }}>
                        ℹ️ {t('editor.about')}
                    </button>

                    <button className="btn-secondary" onClick={onBack} style={{ width: '100%', textAlign: 'left' }}>
                        ⬅️ {t('editor.back')}
                    </button>
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
