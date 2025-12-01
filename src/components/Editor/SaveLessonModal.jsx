import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ContextualMenu.css'; // Reuse styles

const SaveLessonModal = ({ isOpen, onSave, onClose, initialName }) => {
    const { t } = useTranslation();
    const [name, setName] = useState(initialName || '');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(name);
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                width: '300px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <h3>{t('editor.saveLesson')}</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>{t('editor.lessonName')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}
                            autoFocus
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn-primary" style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}>
                            {t('editor.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveLessonModal;
