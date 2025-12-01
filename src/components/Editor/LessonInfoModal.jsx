import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ContextualMenu.css'; // Reuse styles

const LessonInfoModal = ({ isOpen, lesson, onUpdate, onClose }) => {
    const { t } = useTranslation();
    const [name, setName] = useState(lesson.title);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(lesson.title);
            setIsEditing(false);
        }
    }, [isOpen, lesson.title]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSaveName = () => {
        onUpdate({ title: name });
        setIsEditing(false);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString();
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
            zIndex: 2000,
            fontFamily: "'Inter', sans-serif" // Assuming Inter or similar is available
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                width: '320px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#333' }}>{t('editor.info')}</h3>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#999',
                        padding: '0 5px'
                    }}>×</button>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#555' }}>
                        {t('editor.lessonName')}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        fontSize: '1rem'
                                    }}
                                    autoFocus
                                />
                                <button onClick={handleSaveName} className="btn-primary" style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}>💾</button>
                            </>
                        ) : (
                            <>
                                <span style={{
                                    flex: 1,
                                    fontSize: '1.1rem',
                                    fontWeight: '500',
                                    color: '#333',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>{lesson.title}</span>
                                <button onClick={() => setIsEditing(true)} style={{
                                    background: 'none',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem'
                                }}>✏️</button>
                            </>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#333' }}>
                        <strong>{t('editor.lastSaved')}:</strong> {formatDate(lesson.updatedAt)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#999' }}>
                        <strong>{t('editor.created')}:</strong> {formatDate(lesson.createdAt)}
                    </div>
                </div>

                <button onClick={onClose} style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '2px solid #4CAF50',
                    backgroundColor: 'white',
                    color: '#4CAF50',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {t('common.close')}
                </button>
            </div>
        </div>
    );
};

export default LessonInfoModal;
