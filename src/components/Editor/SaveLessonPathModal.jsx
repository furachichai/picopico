import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './ContextualMenu.css';

const SaveLessonPathModal = ({ isOpen, onSave, onClose, initialPath, initialTitle }) => {
    const { t } = useTranslation();

    // State for path components
    const [subject, setSubject] = useState('Math');
    const [topic, setTopic] = useState('');
    const [chapterId, setChapterId] = useState('');
    const [chapterName, setChapterName] = useState('');
    const [lessonId, setLessonId] = useState('');
    const [lessonName, setLessonName] = useState(initialTitle || '');

    // Parse initial path if provided to populate fields (optional, for "Save As")
    useEffect(() => {
        if (isOpen && initialTitle) {
            setLessonName(initialTitle);
        }
    }, [isOpen, initialTitle]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Construct path
        // Format: lessons/[Subject]/[Topic]/[ChapterID]-[ChapterName]/[LessonID]-[LessonName]/lesson.json

        const safeSubject = subject.trim() || 'Uncategorized';
        const safeTopic = topic.trim() || 'General';

        const cId = chapterId.trim().padStart(2, '0') || '00';
        const cName = chapterName.trim() || 'Chapter';
        const chapterDir = `${cId}-${cName}`;

        const lId = lessonId.trim().padStart(2, '0') || '00';
        const lName = lessonName.trim() || 'Lesson';
        const lessonDir = `${lId}-${lName}`;

        const fullPath = `lessons/${safeSubject}/${safeTopic}/${chapterDir}/${lessonDir}/lesson.json`;

        onSave({
            path: fullPath,
            title: lName,
            metadata: {
                subject: safeSubject,
                topic: safeTopic,
                chapterId: cId,
                chapterName: cName,
                lessonId: lId
            }
        });
    };

    const inputStyle = {
        width: '100%',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        marginBottom: '10px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '4px',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        color: '#333'
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
                padding: '24px',
                borderRadius: '12px',
                width: '400px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#8B5CF6' }}>{t('editor.saveLesson')}</h3>
                <form onSubmit={handleSubmit}>

                    {/* Subject */}
                    <div>
                        <label style={labelStyle}>Subject</label>
                        <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="Math">Math</option>
                            <option value="History">History</option>
                            <option value="Geography">Geography</option>
                            <option value="Science">Science</option>
                            <option value="Language">Language</option>
                        </select>
                    </div>

                    {/* Topic */}
                    <div>
                        <label style={labelStyle}>Topic</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Fractions"
                            style={inputStyle}
                            required
                        />
                    </div>

                    {/* Chapter */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Chapter ID</label>
                            <input
                                type="text"
                                value={chapterId}
                                onChange={(e) => setChapterId(e.target.value)}
                                placeholder="01"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ flex: 3 }}>
                            <label style={labelStyle}>Chapter Name</label>
                            <input
                                type="text"
                                value={chapterName}
                                onChange={(e) => setChapterName(e.target.value)}
                                placeholder="Introduction"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>

                    {/* Lesson */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Lesson ID</label>
                            <input
                                type="text"
                                value={lessonId}
                                onChange={(e) => setLessonId(e.target.value)}
                                placeholder="01"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ flex: 3 }}>
                            <label style={labelStyle}>Lesson Name</label>
                            <input
                                type="text"
                                value={lessonName}
                                onChange={(e) => setLessonName(e.target.value)}
                                placeholder="Adding Fractions"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn-primary" style={{
                            backgroundColor: '#8B5CF6',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                            {t('editor.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveLessonPathModal;
