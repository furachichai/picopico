import React, { useEffect, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../Editor/ConfirmationModal';
import SlideThumbnail from '../Editor/SlideThumbnail';
import LessonInfoModal from '../Editor/LessonInfoModal';
import './LessonsPage.css';

const LessonsPage = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const [lessons, setLessons] = useState([]);
    const [deletedLessons, setDeletedLessons] = useState([]);
    const [showDeleted, setShowDeleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null); // lesson item pending delete confirmation
    const [infoTarget, setInfoTarget] = useState(null); // lesson item to edit info for

    const fetchLessons = async () => {
        try {
            const response = await fetch('/api/list-lessons');
            const data = await response.json();
            setLessons(data);
        } catch (error) {
            console.error('Error fetching lessons:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeletedLessons = async () => {
        try {
            const response = await fetch('/api/list-deleted-lessons');
            const data = await response.json();
            setDeletedLessons(data);
        } catch (error) {
            console.error('Error fetching deleted lessons:', error);
        }
    };

    useEffect(() => {
        fetchLessons();
        if (showDeleted) {
            fetchDeletedLessons();
        }
    }, [showDeleted]);

    const loadLesson = async (item) => {
        try {
            const response = await fetch(`/api/load-lesson?path=${encodeURIComponent(item.path)}`);
            if (!response.ok) throw new Error('Failed to load lesson');
            const lessonData = await response.json();

            return {
                ...lessonData,
                title: lessonData.title || item.title,
                path: item.path
            };
        } catch (error) {
            console.error('Error loading lesson:', error);
            alert('Failed to load lesson');
            return null;
        }
    };

    const handlePlay = async (item) => {
        const lesson = await loadLesson(item);
        if (lesson) {
            dispatch({ type: 'LOAD_LESSON', payload: lesson });
            dispatch({ type: 'SET_VIEW', payload: 'player' });
        }
    };

    const handleEdit = async (item) => {
        const lesson = await loadLesson(item);
        if (lesson) {
            dispatch({ type: 'LOAD_LESSON', payload: lesson });
            dispatch({ type: 'SET_VIEW', payload: 'editor' });
        }
    };

    const handleDelete = (item) => {
        setDeleteTarget(item);
    };

    const handleEditInfo = async (item) => {
        const lesson = await loadLesson(item);
        if (lesson) {
            setInfoTarget(lesson);
        }
    };

    const handleUpdateInfo = async (data) => {
        try {
            // Merge updated info into infoTarget content
            const updatedLesson = {
                ...infoTarget,
                title: data.title,
                description: data.description,
                icon: data.icon,
                translations: data.translations,
                updatedAt: new Date().toISOString()
            };

            // If the path was changed, we might need a move-lesson API call.
            // But for simplicity, save-lesson can just save to the new path, and we let the user manage it.
            // Actually, we must use /api/move-lesson if path changed.
            if (infoTarget.path && infoTarget.path !== data.path) {
                await fetch('/api/move-lesson', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldPath: infoTarget.path, newPath: data.path })
                });
            }

            const response = await fetch('/api/save-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: data.path, content: updatedLesson })
            });

            if (!response.ok) throw new Error('Failed to save lesson info');
            
            // Refetch to reflect new info
            await fetchLessons();
        } catch (error) {
            console.error('Error saving lesson info:', error);
            alert('Failed to save lesson info');
        }
    };

    const confirmDelete = async () => {
        const item = deleteTarget;
        setDeleteTarget(null);
        if (!item) return;
        try {
            const folderPath = item.path.replace('/lesson.json', '');
            const response = await fetch('/api/delete-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: folderPath })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Delete failed');
            }
            // If the deleted lesson is the one currently loaded in the editor, reset state
            if (state.lesson?.path === item.path) {
                dispatch({ type: 'NEW_LESSON' });
                dispatch({ type: 'SET_VIEW', payload: 'lessons' });
            }
            await fetchLessons();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete lesson: ' + error.message);
        }
    };

    const handleRecover = async (item) => {
        try {
            const response = await fetch('/api/recover-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderName: item.name }) // name includes timestamp
            });
            if (!response.ok) {
                throw new Error('Recovery failed');
            }
            await fetchDeletedLessons();
            await fetchLessons();
        } catch (error) {
            console.error('Error recovering:', error);
            alert('Failed to recover lesson');
        }
    };

    const handleToggleVisibility = async (item) => {
        try {
            const lesson = await loadLesson(item);
            if (!lesson) return;

            const updatedLesson = {
                ...lesson,
                visible: !item.visible
            };

            await fetch('/api/save-lesson', {
                method: 'POST',
                body: JSON.stringify({ path: item.path, content: updatedLesson })
            });
            fetchLessons();
        } catch (error) {
            console.error('Error toggling visibility:', error);
        }
    };

    const handleMove = async (item, direction) => {
        const index = lessons.findIndex(l => l.path === item.path);
        if (index === -1) return;

        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= lessons.length) return;

        const newOrder = [...lessons];
        const [moved] = newOrder.splice(index, 1);
        newOrder.splice(swapIndex, 0, moved);

        const orderedFolders = newOrder.map(l => l.name);

        try {
            await fetch('/api/reorder-lessons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedFolders })
            });
            fetchLessons();
        } catch (error) {
            console.error('Error reordering:', error);
            alert('Failed to reorder');
        }
    };

    const handleCreateNew = () => {
        dispatch({ type: 'NEW_LESSON' });
    };

    return (
        <div className="lessons-page">
            <div className="lessons-header">
                <button className="btn-back" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'editor' })}>
                    &lt; {t('common.close')}
                </button>
                <h1>{showDeleted ? 'Deleted Lessons' : t('editor.lessons')}</h1>
                {!showDeleted && (
                    <button
                        className="btn-new-lesson"
                        onClick={handleCreateNew}
                        style={{
                            background: '#8B5CF6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        + New
                    </button>
                )}
            </div>
            <div className="lessons-content">
                {loading ? (
                    <div>Loading...</div>
                ) : showDeleted ? (
                    deletedLessons.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                            No deleted lessons.
                        </div>
                    ) : (
                        deletedLessons.map((item) => (
                            <div
                                key={item.path}
                                className="file-tree-item file"
                                style={{ opacity: 0.8 }}
                            >
                                <div className="lesson-card-preview">
                                    {item.content?.slides?.[0] ? (
                                        <SlideThumbnail slide={item.content.slides[0]} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
                                    )}
                                </div>
                                <div className="lesson-card-content">
                                    <div className="item-name">{item.title}</div>
                                    <div className="item-slides-count">
                                        #{item.content?.slides?.length || 0} slides
                                    </div>
                                    {item.description && (
                                        <div className="item-description" style={{ textAlign: 'center' }}>{item.description}</div>
                                    )}

                                    <div className="item-actions" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => { e.stopPropagation(); handleRecover(item); }}
                                            title="Recover"
                                            style={{ color: '#FCD34D', fontWeight: 'bold' }}
                                        >
                                            🔄 Recover
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                ) : lessons.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        No lessons yet. Create your first one!
                    </div>
                ) : (
                    lessons.map((item, idx) => (
                        <div
                            key={item.path}
                            className={`file-tree-item file ${!item.visible ? 'lesson-hidden' : ''}`}
                            onClick={(e) => {
                                if (e.target.closest('button') || e.target.tagName === 'BUTTON') return;
                                handleEdit(item);
                            }}
                            style={{ opacity: item.visible ? 1 : 0.5, backgroundColor: item.content?.cardColor || '#8B5CF6' }}
                        >
                            <div className="lesson-card-preview">
                                {item.content?.slides?.[0] ? (
                                    <SlideThumbnail slide={item.content.slides[0]} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
                                )}
                            </div>
                            <div className="lesson-card-content">
                                <div className="item-name">{item.title}</div>
                                <div className="item-slides-count">
                                    #{item.content?.slides?.length || 0} slides
                                </div>
                                {item.description && (
                                    <div className="item-description" style={{ textAlign: 'center' }}>{item.description}</div>
                                )}

                                <div className="item-actions" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {/* Visibility toggle */}
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handleToggleVisibility(item); }}
                                        title={item.visible ? 'Hide from menu' : 'Show on menu'}
                                        style={{ fontSize: '1.1rem' }}
                                    >
                                        {item.visible ? '👁️' : '🚫'}
                                    </button>
                                    {/* Reorder */}
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handleMove(item, 'up'); }}
                                        title="Move Up"
                                        style={{ opacity: idx === 0 ? 0.3 : 1 }}
                                    >
                                        ⬆️
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handleMove(item, 'down'); }}
                                        title="Move Down"
                                        style={{ opacity: idx === lessons.length - 1 ? 0.3 : 1 }}
                                    >
                                        ⬇️
                                    </button>
                                    {/* Edit Info */}
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handleEditInfo(item); }}
                                        title="Edit Info"
                                    >
                                        ✏️
                                    </button>
                                    {/* Play */}
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handlePlay(item); }}
                                        title="Play"
                                    >
                                        ▶️
                                    </button>
                                    {/* Delete */}
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                
                {/* Deleted Lessons Toggle Button */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={() => setShowDeleted(!showDeleted)}
                        style={{
                            background: 'transparent',
                            color: '#8B5CF6',
                            border: '1px solid #8B5CF6',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        {showDeleted ? 'Back to Active Lessons' : 'View Deleted Lessons 🗑️'}
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!deleteTarget}
                message={`Delete lesson "${deleteTarget?.title}"?`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                confirmText="Delete"
                cancelText="Cancel"
            />
            <LessonInfoModal
                isOpen={!!infoTarget}
                lesson={infoTarget}
                onUpdate={handleUpdateInfo}
                onClose={() => setInfoTarget(null)}
            />
        </div>
    );
};

export default LessonsPage;
