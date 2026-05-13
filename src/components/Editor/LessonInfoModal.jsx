import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ContextualMenu.css';

const LessonInfoModal = ({ isOpen, lesson, onUpdate, onClose }) => {
    const { t } = useTranslation();

    const [lessonName, setLessonName] = useState('');

    useEffect(() => {
        if (isOpen && lesson) {
            setLessonName(lesson.title || '');
        }
    }, [isOpen, lesson]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        const safeName = lessonName.trim() || 'Untitled Lesson';

        // If lesson already has a path, preserve its order prefix
        // Otherwise, generate a new path with a timestamp-based order
        let fullPath;
        if (lesson.path) {
            // Extract the folder part from the existing path
            const parts = lesson.path.split('/');
            // lessons/{order}-{name}/lesson.json
            if (parts.length >= 3) {
                const folderName = parts[1]; // e.g. "01-Potions"
                const match = folderName.match(/^(\d+)-(.*)$/);
                const order = match ? match[1] : '99';
                fullPath = `lessons/${order}-${safeName}/lesson.json`;
            } else {
                fullPath = lesson.path;
            }
        } else {
            // New lesson — use timestamp for ordering (will be normalized later)
            const order = String(Date.now()).slice(-4).padStart(2, '0');
            fullPath = `lessons/${order}-${safeName}/lesson.json`;
        }

        onUpdate({
            path: fullPath,
            title: safeName,
        });

        onClose();
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString();
    };

    const inputStyle = {
        width: '100%',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        marginBottom: '10px',
        fontSize: '0.9rem',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '4px',
        fontWeight: '600',
        fontSize: '0.85rem',
        color: '#555'
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            fontFamily: "'Inter', sans-serif"
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                width: '400px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                maxHeight: '90vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#333' }}>{t('editor.info')}</h3>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999'
                    }}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Lesson Name */}
                    <div>
                        <label style={labelStyle}>Lesson Name</label>
                        <input
                            type="text"
                            value={lessonName}
                            onChange={(e) => setLessonName(e.target.value)}
                            placeholder="e.g. Potions"
                            style={inputStyle}
                            autoFocus
                        />
                    </div>

                    {/* Metadata Display */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#333' }}>
                            <strong>{t('editor.lastSaved')}:</strong> {formatDate(lesson.updatedAt)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#999' }}>
                            <strong>{t('editor.created')}:</strong> {formatDate(lesson.createdAt)}
                        </div>
                        {lesson.path && (
                            <div style={{ fontSize: '0.75rem', color: '#999', wordBreak: 'break-all' }}>
                                <strong>Path:</strong> {lesson.path}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button type="button" onClick={onClose} style={{
                            flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer'
                        }}>
                            {t('common.close')}
                        </button>
                        <button type="submit" style={{
                            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#8B5CF6', color: 'white', fontWeight: 'bold', cursor: 'pointer'
                        }}>
                            {t('editor.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LessonInfoModal;
