import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';
import './ContextualMenu.css';

const AVAILABLE_ICONS = [
    'icon_potion.png',
    'icon_gym.png',
    'icon_book.png',
    'icon_game.png',
    'icon_lightbulb.png',
    'icon_textbook.png'
];

const LessonInfoModal = ({ isOpen, lesson, onUpdate, onClose, translationLang = 'es' }) => {
    const { t } = useTranslation();
    const { SUPPORTED_LANGUAGES } = useLanguage();

    const [activeLangTab, setActiveLangTab] = useState('es');
    const [formData, setFormData] = useState({});
    const [lessonIcon, setLessonIcon] = useState('icon_textbook.png');
    const [cardColor, setCardColor] = useState('#8B5CF6');

    useEffect(() => {
        if (isOpen && lesson) {
            setLessonIcon(lesson.icon || lesson.content?.icon || 'icon_textbook.png');
            setCardColor(lesson.cardColor || lesson.content?.cardColor || '#8B5CF6');
            
            // Initialize form data for all supported languages
            const initialData = {};
            SUPPORTED_LANGUAGES.forEach(lang => {
                if (lang.code === 'es') {
                    initialData[lang.code] = {
                        title: lesson.title || '',
                        description: lesson.description || '',
                        hashtag: lesson.hashtag || lesson.content?.hashtag || ''
                    };
                } else {
                    initialData[lang.code] = {
                        title: lesson.translations?.[lang.code]?.title || '',
                        description: lesson.translations?.[lang.code]?.description || '',
                        hashtag: lesson.translations?.[lang.code]?.hashtag || ''
                    };
                }
            });
            setFormData(initialData);
            
            // Default tab to the one requested, or fallback to 'es'
            const validLang = SUPPORTED_LANGUAGES.find(l => l.code === translationLang) ? translationLang : 'es';
            setActiveLangTab(validLang);
        }
    }, [isOpen, lesson, translationLang, SUPPORTED_LANGUAGES]);

    if (!isOpen || !formData[activeLangTab]) return null;

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [activeLangTab]: {
                ...prev[activeLangTab],
                [field]: value
            }
        }));
    };

    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            const target = e.target;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const text = target.value;
            const selectedText = text.substring(start, end);
            
            if (selectedText) {
                const toSuperscript = (str) => {
                    const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
                    return str.split('').map(c => map[c] || c).join('');
                };
                
                const replacement = selectedText
                    .replace(/\*/g, '×')
                    .replace(/\//g, '÷')
                    .replace(/!(\d+)/g, (_, digits) => toSuperscript(digits));
                    
                const newVal = text.substring(0, start) + replacement + text.substring(end);
                
                const fieldName = target.name;
                handleFieldChange(fieldName, newVal);
                
                setTimeout(() => {
                    target.setSelectionRange(start, start + replacement.length);
                }, 0);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const safeName = formData['es']?.title?.trim() || 'Untitled Lesson';
        const finalDescription = formData['es']?.description || '';
        const finalHashtag = formData['es']?.hashtag || '';

        const newTranslations = {};
        SUPPORTED_LANGUAGES.forEach(lang => {
            if (lang.code !== 'es') {
                newTranslations[lang.code] = {
                    title: formData[lang.code]?.title?.trim() || '',
                    description: formData[lang.code]?.description || '',
                    hashtag: formData[lang.code]?.hashtag || ''
                };
            }
        });

        // If lesson already has a path, preserve its order prefix
        // Otherwise, generate a new path with a timestamp-based order
        let fullPath;
        if (lesson.path) {
            const parts = lesson.path.split('/');
            if (parts.length >= 3) {
                const folderName = parts[1]; // e.g. "01-Potions"
                const match = folderName.match(/^(\d+)-(.*)$/);
                const order = match ? match[1] : '99';
                fullPath = `lessons/${order}-${safeName}/lesson.json`;
            } else {
                fullPath = lesson.path;
            }
        } else {
            const order = String(Date.now()).slice(-4).padStart(2, '0');
            fullPath = `lessons/${order}-${safeName}/lesson.json`;
        }

        onUpdate({
            path: fullPath,
            title: safeName,
            description: finalDescription,
            hashtag: finalHashtag,
            icon: lessonIcon,
            cardColor: cardColor,
            translations: newTranslations
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

    const isTranslating = activeLangTab !== 'es';

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
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#333' }}>
                        {t('editor.info')}
                    </h3>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999'
                    }}>×</button>
                </div>

                {/* Language Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '8px' }}>
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => setActiveLangTab(lang.code)}
                            style={{
                                padding: '8px 16px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeLangTab === lang.code ? '3px solid #8B5CF6' : '3px solid transparent',
                                color: activeLangTab === lang.code ? '#8B5CF6' : '#666',
                                fontWeight: activeLangTab === lang.code ? 'bold' : 'normal',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {lang.flag} {lang.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Lesson Name */}
                    <div>
                        <label style={labelStyle}>Lesson Name {isTranslating && `(${activeLangTab.toUpperCase()})`}</label>
                        <input
                            type="text"
                            name="title"
                            value={formData[activeLangTab].title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. Potions"
                            style={inputStyle}
                            autoFocus
                        />
                    </div>

                    {/* Lesson Description */}
                    <div>
                        <label style={labelStyle}>Description {isTranslating && `(${activeLangTab.toUpperCase()})`}</label>
                        <textarea
                            name="description"
                            value={formData[activeLangTab].description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Brief description of the lesson..."
                            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                        />
                    </div>

                    {/* Hashtag */}
                    <div>
                        <label style={labelStyle}>Hashtag {isTranslating && `(${activeLangTab.toUpperCase()})`}</label>
                        <input
                            type="text"
                            name="hashtag"
                            value={formData[activeLangTab].hashtag}
                            onChange={(e) => handleFieldChange('hashtag', e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="#OrderOfOperations"
                            style={inputStyle}
                        />
                    </div>

                    {/* Icon Selection - only show when not translating */}
                    {!isTranslating && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Icon</label>
                                <div style={{ display: 'flex', gap: '8px', padding: '4px', overflowX: 'auto' }}>
                                    {AVAILABLE_ICONS.map(icon => (
                                        <div
                                            key={icon}
                                            onClick={() => setLessonIcon(icon)}
                                            style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '8px',
                                                border: lessonIcon === icon ? '3px solid #8B5CF6' : '1px solid #ddd',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: lessonIcon === icon ? 'rgba(139, 92, 246, 0.1)' : '#f9f9f9',
                                                padding: '4px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <img 
                                                src={`/assets/graphics/${icon}`} 
                                                alt={icon} 
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Card Color</label>
                                <div style={{ display: 'flex', gap: '8px', padding: '4px', overflowX: 'auto' }}>
                                    {[
                                        '#FF6B6B', '#8B5CF6', '#06B6D4', '#EC4899', 
                                        '#F59E0B', '#14B8A6', '#A855F7', '#22D3EE'
                                    ].map(color => (
                                        <div
                                            key={color}
                                            onClick={() => setCardColor(color)}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                backgroundColor: color,
                                                border: cardColor === color ? '3px solid #333' : '2px solid transparent',
                                                cursor: 'pointer',
                                                boxShadow: cardColor === color ? '0 0 0 2px white inset' : 'none',
                                                flexShrink: 0
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

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
