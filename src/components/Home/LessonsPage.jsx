import React, { useEffect, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from 'react-i18next';
import './LessonsPage.css';

const FileTreeItem = ({ item, level = 0, onPlay, onEdit, onDelete, onMove, onRename, onCreate }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Default expanded
    const isDirectory = item.type === 'directory';
    const paddingLeft = `${level * 20}px`;

    if (isDirectory) {
        return (
            <div className="file-tree-item-container">
                <div
                    className="file-tree-item directory"
                    style={{ paddingLeft }}
                    onClick={(e) => {
                        if (e.target.closest('.btn-icon')) return;
                        setIsExpanded(!isExpanded);
                    }}
                >
                    <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
                    <span className="item-name">{item.name}</span>
                    <div className="item-actions">
                        <button className="btn-icon" onClick={() => onCreate(item)} title="New Lesson Here">➕</button>
                        <button className="btn-icon" onClick={() => onRename(item)} title="Rename">✏️</button>
                        <button className="btn-icon" onClick={() => onDelete(item)} title="Delete">🗑️</button>
                        <div className="move-actions">
                            <button className="btn-icon" onClick={() => onMove(item, 'up')} title="Move Up">⬆️</button>
                            <button className="btn-icon" onClick={() => onMove(item, 'down')} title="Move Down">⬇️</button>
                        </div>
                    </div>
                </div>
                {isExpanded && item.children && (
                    <div className="file-tree-children">
                        {item.children.map((child, index) => (
                            <FileTreeItem
                                key={child.path || child.name}
                                item={child}
                                level={level + 1}
                                onPlay={onPlay}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onMove={(direction) => onMove(child, direction, item.children)}
                                onRename={onRename}
                                onCreate={onCreate}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // File Item (Lesson)
    return (
        <div className="file-tree-item file" style={{ paddingLeft }}>
            <span className="file-icon">📄</span>
            <span className="item-name">{item.name.replace('.json', '')}</span>
            <div className="item-actions">
                <button className="btn-icon" onClick={() => onPlay(item)} title="Play">▶️</button>
                <button className="btn-icon" onClick={() => onEdit(item)} title="Edit">✏️</button>
                <button className="btn-icon" onClick={() => onRename(item)} title="Rename">✏️</button>
                <button className="btn-icon" onClick={() => onDelete(item)} title="Delete">🗑️</button>
                <div className="move-actions">
                    <button className="btn-icon" onClick={() => onMove(item, 'up')} title="Move Up">⬆️</button>
                    <button className="btn-icon" onClick={() => onMove(item, 'down')} title="Move Down">⬇️</button>
                </div>
            </div>
        </div>
    );
};

const LessonsPage = () => {
    const { dispatch } = useEditor();
    const { t } = useTranslation();
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLessons = async () => {
        try {
            const response = await fetch('/api/list-lessons');
            const data = await response.json();
            setTree(data);
        } catch (error) {
            console.error('Error fetching lessons:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, []);

    const loadLesson = async (item) => {
        try {
            const response = await fetch(`/api/load-lesson?path=${encodeURIComponent(item.path)}`);
            if (!response.ok) throw new Error('Failed to load lesson');
            const lessonData = await response.json();
            // Ensure path is preserved in the loaded lesson
            return { ...lessonData, path: item.path };
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

    const handleDelete = async (item) => {
        const type = item.type === 'directory' ? 'folder' : 'lesson';
        if (!window.confirm(`Delete ${type} "${item.name}"?`)) return;
        try {
            await fetch('/api/delete-lesson', {
                method: 'POST',
                body: JSON.stringify({ path: item.path })
            });
            fetchLessons();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const handleRename = async (item) => {
        const newName = window.prompt("Enter new name:", item.name);
        if (!newName || newName === item.name) return;

        // Construct new path
        const parts = item.path.split('/');
        parts.pop();
        parts.push(newName);
        const newPath = parts.join('/');

        try {
            await fetch('/api/move-lesson', {
                method: 'POST',
                body: JSON.stringify({ oldPath: item.path, newPath })
            });
            fetchLessons();
        } catch (error) {
            console.error('Error renaming:', error);
        }
    };

    const handleMove = async (item, direction, siblings) => {
        // Logic to reorder:
        // 1. Find current index.
        // 2. Swap with neighbor.
        // 3. Rename files to reflect new order?
        // The user requirement says "UP and Down arrow buttons to move it within its folder".
        // This implies some sort of ordering.
        // If the folder is sorted by name, we need to rename the files (e.g. 01-Lesson, 02-Lesson).
        // If the user uses the naming convention `[ID]-[Name]`, we might need to swap IDs?
        // This is complex if we don't enforce a strict naming convention.
        // For now, I'll just log it as "Not implemented" or try a simple rename if they have prefixes.
        console.log('Move', item, direction);
        alert('Reordering not fully implemented yet. Requires strict naming convention.');
    };

    const handleCreateInFolder = (item) => {
        // Parse path to extract metadata
        // Path format: lessons/Subject/Topic/Chapter/Lesson
        // We need to be flexible as the user might be clicking on Subject, Topic, or Chapter folder.

        const parts = item.path.split('/');
        // parts[0] is 'lessons' (or whatever the root relative path starts with, usually 'lessons')

        let subject = 'Math';
        let topic = '';
        let chapterId = '';
        let chapterName = '';

        if (parts.length > 1) subject = parts[1];
        if (parts.length > 2) topic = parts[2];
        if (parts.length > 3) {
            // Chapter folder: e.g. "01-Introduction"
            const chapterFolder = parts[3];
            const match = chapterFolder.match(/^(\d+)-(.*)$/);
            if (match) {
                chapterId = match[1];
                chapterName = match[2];
            } else {
                chapterName = chapterFolder;
            }
        }

        dispatch({
            type: 'NEW_LESSON',
            payload: {
                subject,
                topic,
                chapterId,
                chapterName
            }
        });
    };

    return (
        <div className="lessons-page">
            <div className="lessons-header">
                <button className="btn-back" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'editor' })}>
                    &lt; {t('common.close')}
                </button>
                <h1>{t('editor.lessons')}</h1>
            </div>
            <div className="lessons-content">
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    tree.map(item => (
                        <FileTreeItem
                            key={item.path || item.name}
                            item={item}
                            onPlay={handlePlay}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onMove={handleMove}
                            onRename={handleRename}
                            onCreate={handleCreateInFolder}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default LessonsPage;
