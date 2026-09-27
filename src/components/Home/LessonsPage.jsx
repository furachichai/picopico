import React, { useEffect, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../Editor/ConfirmationModal';
import SlideThumbnail from '../Editor/SlideThumbnail';
import LessonInfoModal from '../Editor/LessonInfoModal';
import CircleFrameModal from './CircleFrameModal';
import BannerModal from './BannerModal';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { invalidateDiscoverCache } from './DiscoverView';
import './LessonsPage.css';

const LessonsPage = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const [lessons, setLessons] = useState([]);
    const [banners, setBanners] = useState([]);
    const [deletedLessons, setDeletedLessons] = useState([]);
    const [showDeleted, setShowDeleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null); // lesson item pending delete confirmation
    const [infoTarget, setInfoTarget] = useState(null); // lesson item to edit info for
    const [editingBanner, setEditingBanner] = useState(null);
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [editingFrameLesson, setEditingFrameLesson] = useState(null);
    const [draggedLessonPath, setDraggedLessonPath] = useState(null);
    const [dragOverLessonInfo, setDragOverLessonInfo] = useState(null); // { targetPath, position: 'before' | 'after' }

    const fetchLessons = async () => {
        try {
            const response = await fetch('/api/list-lessons');
            const data = await response.json();
            setLessons(data);

            try {
                const bRes = await fetch('/api/banners');
                if (bRes.ok) {
                    const bData = await bRes.json();
                    setBanners(bData);
                }
            } catch {
                // ignore
            }
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
                cardColor: data.cardColor,
                titlecardFrame: data.titlecardFrame !== undefined ? data.titlecardFrame : infoTarget.titlecardFrame,
                translations: data.translations,
                updatedAt: new Date().toISOString()
            };

            // If the path was changed, we might need a move-lesson API call.
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

    const handleSaveBanner = async (bannerData) => {
        try {
            let updated;
            const idx = banners.findIndex(b => b.id === bannerData.id);
            if (idx >= 0) {
                updated = [...banners];
                updated[idx] = bannerData;
            } else {
                updated = [...banners, bannerData];
            }
            setBanners(updated);
            await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
        } catch {
            alert('Failed to save banner');
        }
    };

    const handleDeleteBanner = async (bannerToDelete) => {
        try {
            const updated = banners.filter(b => b.id !== bannerToDelete.id);
            setBanners(updated);
            await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
        } catch {
            alert('Failed to delete banner');
        }
    };

    const handleMoveBanner = async (banner, direction) => {
        const currentIdx = lessons.findIndex(l => l.path === banner.beforeLesson);
        let newTargetLessonPath;
        if (banner.beforeLesson === 'START') {
            if (direction === 'down' && lessons.length > 0) {
                newTargetLessonPath = lessons[1]?.path || 'END';
            }
        } else if (banner.beforeLesson === 'END') {
            if (direction === 'up' && lessons.length > 0) {
                newTargetLessonPath = lessons[lessons.length - 1].path;
            }
        } else if (currentIdx !== -1) {
            if (direction === 'up') {
                if (currentIdx === 0) newTargetLessonPath = 'START';
                else newTargetLessonPath = lessons[currentIdx - 1].path;
            } else {
                if (currentIdx === lessons.length - 1) newTargetLessonPath = 'END';
                else newTargetLessonPath = lessons[currentIdx + 1].path;
            }
        }
        if (newTargetLessonPath !== undefined) {
            const updated = banners.map(b => b.id === banner.id ? { ...b, beforeLesson: newTargetLessonPath } : b);
            setBanners(updated);
            await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
        }
    };

    const handleSaveCircleFrame = async (newFrame) => {
        if (!editingFrameLesson) return;
        try {
            const targetLesson = editingFrameLesson;
            const res = await fetch(`/api/load-lesson?path=${encodeURIComponent(targetLesson.path)}`);
            if (!res.ok) throw new Error('Failed to load lesson for frame save');
            const currentData = await res.json();

            const updated = {
                ...currentData,
                titlecardFrame: newFrame
            };

            await fetch('/api/save-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: targetLesson.path, content: updated })
            });

            await fetchLessons();
            setEditingFrameLesson(null);
        } catch (err) {
            console.error('Error saving frame:', err);
            alert('Failed to save frame');
        }
    };

    const confirmDelete = async (targetOverride) => {
        const item = targetOverride || deleteTarget;
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

            const isCurrentlyVisible = item.visible !== undefined ? item.visible : lesson.visible !== false;
            const newVis = !isCurrentlyVisible;
            const updatedLesson = {
                ...lesson,
                visible: newVis
            };
            if (updatedLesson.content) {
                updatedLesson.content.visible = newVis;
            }

            try {
                const { getLocalLessons, saveLocalLesson } = await import('../../utils/lessonStorage');
                const local = getLocalLessons().find(l => l.path === item.path);
                if (local) {
                    saveLocalLesson({ ...local, visible: newVis });
                }
            } catch (e) {
                // Ignore
            }

            await fetch('/api/save-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: item.path, content: updatedLesson })
            });
            invalidateDiscoverCache();
            fetchLessons();
        } catch (error) {
            console.error('Error toggling visibility:', error);
        }
    };

    const handleToggleFeedVisibility = async (item) => {
        try {
            const lesson = await loadLesson(item);
            if (!lesson) return;

            const isCurrentlyFeedVisible = item.visibleInFeed !== undefined
                ? item.visibleInFeed
                : (lesson.visibleInFeed !== undefined ? lesson.visibleInFeed !== false : (lesson.visible !== false));

            const newFeedVis = !isCurrentlyFeedVisible;
            const updatedLesson = {
                ...lesson,
                visibleInFeed: newFeedVis
            };
            if (updatedLesson.content) {
                updatedLesson.content.visibleInFeed = newFeedVis;
            }

            try {
                const { getLocalLessons, saveLocalLesson } = await import('../../utils/lessonStorage');
                const local = getLocalLessons().find(l => l.path === item.path);
                if (local) {
                    saveLocalLesson({ ...local, visibleInFeed: newFeedVis });
                }
            } catch (e) {
                // Ignore
            }

            await fetch('/api/save-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: item.path, content: updatedLesson })
            });
            invalidateDiscoverCache();
            fetchLessons();
        } catch (error) {
            console.error('Error toggling feed visibility:', error);
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

    const handleLessonDragStart = (e, item) => {
        if (e.target.closest('button') || e.target.tagName === 'BUTTON' || e.target.closest('input')) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.path);
        setDraggedLessonPath(item.path);
    };

    const handleLessonDragOver = (e, item) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedLessonPath === item.path) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'before' : 'after';

        if (!dragOverLessonInfo || dragOverLessonInfo.targetPath !== item.path || dragOverLessonInfo.position !== position) {
            setDragOverLessonInfo({ targetPath: item.path, position });
        }
    };

    const handleLessonDragLeave = (e, item) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            if (dragOverLessonInfo && dragOverLessonInfo.targetPath === item.path) {
                setDragOverLessonInfo(null);
            }
        }
    };

    const handleLessonDrop = async (e, item) => {
        e.preventDefault();
        if (!draggedLessonPath || !dragOverLessonInfo) {
            setDraggedLessonPath(null);
            setDragOverLessonInfo(null);
            return;
        }

        if (draggedLessonPath === dragOverLessonInfo.targetPath) {
            setDraggedLessonPath(null);
            setDragOverLessonInfo(null);
            return;
        }

        const fromIndex = lessons.findIndex(l => l.path === draggedLessonPath);
        if (fromIndex === -1) {
            setDraggedLessonPath(null);
            setDragOverLessonInfo(null);
            return;
        }

        const newLessons = [...lessons];
        const [movedLesson] = newLessons.splice(fromIndex, 1);

        let insertIndex = newLessons.findIndex(l => l.path === dragOverLessonInfo.targetPath);
        if (insertIndex === -1) {
            setDraggedLessonPath(null);
            setDragOverLessonInfo(null);
            return;
        }

        if (dragOverLessonInfo.position === 'after') {
            insertIndex += 1;
        }

        newLessons.splice(insertIndex, 0, movedLesson);

        // Optimistic update
        setLessons(newLessons);
        setDraggedLessonPath(null);
        setDragOverLessonInfo(null);

        const orderedFolders = newLessons.map(l => l.name);
        try {
            await fetch('/api/reorder-lessons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedFolders })
            });
            fetchLessons();
        } catch (error) {
            console.error('Error reordering lessons:', error);
            fetchLessons();
        }
    };

    const handleLessonDragEnd = () => {
        setDraggedLessonPath(null);
        setDragOverLessonInfo(null);
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="btn-new-banner"
                            onClick={() => {
                                setEditingBanner(null);
                                setIsBannerModalOpen(true);
                            }}
                            style={{
                                background: '#10B981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            + Banner
                        </button>
                        <button
                            className="btn-new-lesson"
                            onClick={handleCreateNew}
                            style={{
                                background: '#8B5CF6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            + New
                        </button>
                    </div>
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
                                        <SlideThumbnail slide={item.content.slides[0]} hideTextAndBalloons={true} cover={true} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
                                    )}
                                </div>
                                <div className="lesson-card-content">
                                    <div className="item-name" title={item.title}>{item.title}</div>
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
                    (() => {
                        const itemsToRender = [];
                        const renderBannerRow = (banner) => (
                            <div
                                key={banner.id}
                                style={{
                                    background: banner.backgroundColor || '#FFFFFF',
                                    border: '3px solid #000000',
                                    borderRadius: '16px',
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    margin: '12px 0',
                                    boxShadow: 'none',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                    {banner.leftImage ? (
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #000', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={resolveAssetUrl(banner.leftImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : null}
                                    <span style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '1px', textTransform: 'uppercase', color: banner.textColor || '#1E293B' }}>
                                        🏷️ {banner.title}
                                    </span>
                                    {banner.rightImage ? (
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #000', overflow: 'hidden', flexShrink: 0 }}>
                                            <img src={resolveAssetUrl(banner.rightImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : null}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handleMoveBanner(banner, 'up'); }}
                                        title="Move Banner Up"
                                        style={{ fontSize: '1rem', padding: '4px' }}
                                    >
                                        ⬆️
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); handleMoveBanner(banner, 'down'); }}
                                        title="Move Banner Down"
                                        style={{ fontSize: '1rem', padding: '4px' }}
                                    >
                                        ⬇️
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingBanner(banner);
                                            setIsBannerModalOpen(true);
                                        }}
                                        title="Edit Banner"
                                        style={{ fontSize: '1rem', padding: '4px' }}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete banner "${banner.title}"?`)) {
                                                handleDeleteBanner(banner);
                                            }
                                        }}
                                        title="Delete Banner"
                                        style={{ fontSize: '1rem', padding: '4px', color: '#EF4444' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );

                        const renderedBannerIds = new Set();

                        const normalizeLessonKey = (p) => {
                            if (!p || typeof p !== 'string') return '';
                            return p
                                .toLowerCase()
                                .replace(/\\/g, '/')
                                .replace(/^.*lessons\//, '')
                                .replace(/\/lesson\.json$/, '')
                                .replace(/^\d+[-_ ]*/, '')
                                .replace(/[^a-z0-9]/g, '');
                        };

                        const matchesBannerLesson = (banner, lesson, index) => {
                            if (!banner || !lesson) return false;
                            if (banner.beforeLesson === lesson.path) return true;
                            if (index === 0 && (banner.beforeLesson === 'START' || (lessons.length > 0 && banner.beforeLesson === lessons[0].path))) {
                                return true;
                            }
                            if (banner.beforeLesson === 'END') return false;

                            const bKey = normalizeLessonKey(banner.beforeLesson);
                            const lKey = normalizeLessonKey(lesson.path);
                            if (bKey && lKey && bKey === lKey) return true;

                            return false;
                        };

                        // Start banners
                        const startBanners = banners.filter(b => matchesBannerLesson(b, lessons[0], 0));
                        startBanners.forEach(b => {
                            renderedBannerIds.add(b.id);
                            itemsToRender.push(renderBannerRow(b));
                        });

                        lessons.forEach((item, idx) => {
                            if (idx > 0) {
                                const matching = banners.filter(b => !renderedBannerIds.has(b.id) && matchesBannerLesson(b, item, idx));
                                matching.forEach(b => {
                                    renderedBannerIds.add(b.id);
                                    itemsToRender.push(renderBannerRow(b));
                                });
                            }

                            const isMenuVisible = item.visible !== false;
                            const isFeedVisible = item.visibleInFeed !== undefined
                                ? item.visibleInFeed !== false
                                : (item.content?.visibleInFeed !== undefined
                                    ? item.content.visibleInFeed !== false
                                    : isMenuVisible);
                            const isFullyHidden = !isMenuVisible && !isFeedVisible;
                            const isDragging = draggedLessonPath === item.path;
                            const isDropTarget = dragOverLessonInfo && dragOverLessonInfo.targetPath === item.path;
                            const dropClass = isDropTarget ? `drop-target-${dragOverLessonInfo.position}` : '';

                            itemsToRender.push(
                                <div
                                    key={item.path}
                                    className={`file-tree-item file ${isFullyHidden ? 'lesson-hidden' : ''} ${isDragging ? 'is-dragging' : ''} ${dropClass}`}
                                    draggable={!showDeleted}
                                    onDragStart={(e) => handleLessonDragStart(e, item)}
                                    onDragOver={(e) => handleLessonDragOver(e, item)}
                                    onDragLeave={(e) => handleLessonDragLeave(e, item)}
                                    onDrop={(e) => handleLessonDrop(e, item)}
                                    onDragEnd={handleLessonDragEnd}
                                    onClick={(e) => {
                                        if (e.target.closest('button') || e.target.tagName === 'BUTTON') return;
                                        handleEdit(item);
                                    }}
                                    style={{
                                        opacity: isDragging ? 0.35 : (isFullyHidden ? 0.45 : (!isMenuVisible ? 0.75 : 1)),
                                        backgroundColor: item.content?.cardColor || '#8B5CF6'
                                    }}
                                >
                                    <div className="lesson-card-preview">
                                        {item.content?.slides?.[0] ? (
                                            <SlideThumbnail slide={item.content.slides[0]} hideTextAndBalloons={true} cover={true} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
                                        )}
                                        <div className="lesson-drag-handle" title="Drag to reorder">⠿</div>
                                    </div>
                                    <div className="lesson-card-content">
                                        <div className="item-name" title={item.title}>{item.title}</div>
                                        <div className="item-slides-count">
                                            #{item.content?.slides?.length || 0} slides
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '0.68rem',
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: isMenuVisible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                                                color: isMenuVisible ? '#A7F3D0' : '#FCA5A5'
                                            }}>
                                                {isMenuVisible ? 'Menu: ON' : 'Menu: OFF'}
                                            </span>
                                            <span style={{
                                                fontSize: '0.68rem',
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: isFeedVisible ? 'rgba(236, 72, 153, 0.35)' : 'rgba(239, 68, 68, 0.3)',
                                                color: isFeedVisible ? '#FBCFE8' : '#FCA5A5'
                                            }}>
                                                {isFeedVisible ? 'Feed: ON' : 'Feed: OFF'}
                                            </span>
                                        </div>
                                        {item.description && (
                                            <div className="item-description" style={{ textAlign: 'center' }}>{item.description}</div>
                                        )}

                                        <div className="item-actions">
                                            {/* Menu Visibility toggle */}
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => { e.stopPropagation(); handleToggleVisibility(item); }}
                                                title={isMenuVisible ? 'Hide from menu' : 'Show in menu'}
                                                style={{ fontSize: '1.1rem' }}
                                            >
                                                {isMenuVisible ? '👁️' : '🚫'}
                                            </button>

                                            {/* TikTok Feed Visibility toggle */}
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => { e.stopPropagation(); handleToggleFeedVisibility(item); }}
                                                title={isFeedVisible ? 'Hide from TikTok feed' : 'Show in TikTok feed'}
                                                style={{
                                                    fontSize: '1.1rem',
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <span style={{
                                                    opacity: isFeedVisible ? 1 : 0.35,
                                                    filter: isFeedVisible ? 'none' : 'grayscale(1)'
                                                }}>
                                                    🧭
                                                </span>
                                                {!isFeedVisible && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        color: '#ef4444',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 900,
                                                        lineHeight: 1,
                                                        pointerEvents: 'none'
                                                    }}>
                                                        ✕
                                                    </span>
                                                )}
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
                                            {/* Focus Circle Frame */}
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => { e.stopPropagation(); setEditingFrameLesson(item); }}
                                                title="Focus Circle Frame (Zoom & Drag)"
                                            >
                                                🎯
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
                            );
                        });

                        // End banners
                        const endBanners = banners.filter(b => b.beforeLesson === 'END');
                        endBanners.forEach(b => {
                            renderedBannerIds.add(b.id);
                            itemsToRender.push(renderBannerRow(b));
                        });

                        // Fallback: render any banners not yet placed
                        banners.forEach(b => {
                            if (!renderedBannerIds.has(b.id)) {
                                renderedBannerIds.add(b.id);
                                itemsToRender.push(renderBannerRow(b));
                            }
                        });

                        return itemsToRender;
                    })()
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
                onDelete={(item) => {
                    setInfoTarget(null);
                    confirmDelete(item);
                }}
            />

            {editingFrameLesson && (
                <CircleFrameModal
                    isOpen={!!editingFrameLesson}
                    lesson={editingFrameLesson}
                    onSave={handleSaveCircleFrame}
                    onClose={() => setEditingFrameLesson(null)}
                />
            )}

            {isBannerModalOpen && (
                <BannerModal
                    isOpen={isBannerModalOpen}
                    banner={editingBanner}
                    lessons={lessons}
                    onSave={handleSaveBanner}
                    onDelete={handleDeleteBanner}
                    onClose={() => {
                        setIsBannerModalOpen(false);
                        setEditingBanner(null);
                    }}
                />
            )}
        </div>
    );
};

export default LessonsPage;
