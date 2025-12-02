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
                                onMove={(childItem, direction, childSiblings) => onMove(childItem, direction, childSiblings || item.children)}
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
                <button className="btn-icon" onClick={() => onDelete(item)} title="Delete">🗑️</button>
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

    const parsePathToMetadata = (path) => {
        const parts = path.split('/');
        // parts[0] is 'lessons'

        let subject = 'Math';
        let topic = '';
        let chapterId = '';
        let chapterName = '';
        let lessonId = '';
        let lessonName = '';

        if (parts.length > 1) subject = parts[1];
        if (parts.length > 2) topic = parts[2];

        if (parts.length > 3) {
            const chapterFolder = parts[3];
            const match = chapterFolder.match(/^(\d+)-(.*)$/);
            if (match) {
                chapterId = match[1];
                chapterName = match[2];
            } else {
                chapterName = chapterFolder;
            }
        }

        if (parts.length > 4) {
            const lessonFolder = parts[4]; // Assuming lesson.json is inside a folder
            // If path ends in lesson.json, parts[4] is the folder name
            // If path is just to the folder, parts[4] is the folder name

            // Check if parts[4] is 'lesson.json' (flat structure?) 
            // No, our structure is .../LessonFolder/lesson.json

            const match = lessonFolder.match(/^(\d+)-(.*)$/);
            if (match) {
                lessonId = match[1];
                lessonName = match[2];
            } else {
                lessonName = lessonFolder;
            }
        }

        return {
            subject,
            topic,
            chapterId,
            chapterName,
            lessonId,
            title: lessonName // Map lessonName to title
        };
    };

    const loadLesson = async (item) => {
        try {
            const response = await fetch(`/api/load-lesson?path=${encodeURIComponent(item.path)}`);
            if (!response.ok) throw new Error('Failed to load lesson');
            const lessonData = await response.json();

            // Parse metadata from path
            const pathMetadata = parsePathToMetadata(item.path);

            // Ensure path is preserved and metadata is updated from path
            return {
                ...lessonData,
                ...pathMetadata, // Override stored metadata with path-derived metadata
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
        const index = siblings.findIndex(s => s.path === item.path);
        if (index === -1) return;

        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= siblings.length) return;

        const sibling = siblings[swapIndex];

        // Helper to extract prefix and name
        const parseName = (name) => {
            const match = name.match(/^(\d+)-(.*)$/);
            if (match) {
                return { prefix: parseInt(match[1], 10), name: match[2], hasPrefix: true };
            }
            return { prefix: null, name: name, hasPrefix: false };
        };

        // Check if all siblings have prefixes
        const allHavePrefixes = siblings.every(s => parseName(s.name).hasPrefix);

        try {
            // If not all have prefixes, we need to normalize the entire folder first
            if (!allHavePrefixes) {
                if (!window.confirm("To reorder, we need to add number prefixes (e.g. 01-Lesson) to all items in this folder. Proceed?")) {
                    return;
                }

                // Rename ALL siblings to have prefixes based on current order
                for (let i = 0; i < siblings.length; i++) {
                    const s = siblings[i];
                    const { name: cleanName } = parseName(s.name);
                    const newPrefix = (i + 1).toString().padStart(2, '0');
                    const newName = `${newPrefix}-${cleanName}`;

                    if (s.name !== newName) {
                        const parts = s.path.split('/');
                        parts.pop();
                        parts.push(newName);
                        const newPath = parts.join('/');

                        await fetch('/api/move-lesson', {
                            method: 'POST',
                            body: JSON.stringify({ oldPath: s.path, newPath })
                        });
                    }
                }
                // Fetch updated list and then perform the swap? 
                // Actually, if we just normalized, the order is effectively "locked" to the current state.
                // We should probably stop here and let the user click move again, or try to proceed.
                // For simplicity, let's refresh and let them click again to avoid race conditions.
                await fetchLessons();
                return;
            }

            // If we are here, everything has a prefix. We just swap the prefixes of item and sibling.
            const itemParsed = parseName(item.name);
            const siblingParsed = parseName(sibling.name);

            // We want to swap their prefixes. 
            // BUT, simply swapping prefixes might not be enough if the numbers aren't sequential or if there are gaps.
            // However, if we assume they are sorted by name (which includes prefix), then swapping prefixes *should* swap their order.

            // Let's just swap their entire names' prefixes.
            const newItemName = `${siblingParsed.prefix.toString().padStart(2, '0')}-${itemParsed.name}`;
            const newSiblingName = `${itemParsed.prefix.toString().padStart(2, '0')}-${siblingParsed.name}`;

            // Construct new paths
            const itemParts = item.path.split('/');
            itemParts.pop();
            itemParts.push(newItemName);
            const newItemPath = itemParts.join('/');

            const siblingParts = sibling.path.split('/');
            siblingParts.pop();
            siblingParts.push(newSiblingName);
            const newSiblingPath = siblingParts.join('/');

            // We need to do this carefully to avoid name collisions if we are just swapping.
            // E.g. 01-A -> 02-A and 02-B -> 01-B.
            // If we rename 01-A to 02-A first, and 02-A already exists (wait, 02-B exists, not 02-A), we are fine.
            // But if we rename 01-A to 02-A, we are not colliding with 02-B.
            // So we can do it sequentially.

            // We need to use a temporary name to avoid collisions if the names are identical (e.g. 01-Lesson and 02-Lesson)
            // or if the target file already exists.

            const tempName = `TEMP-${Date.now()}-${itemParsed.name}`;
            const tempPathParts = item.path.split('/');
            tempPathParts.pop();
            tempPathParts.push(tempName);
            const tempPath = tempPathParts.join('/');

            // Step 1: Rename item to temp
            await fetch('/api/move-lesson', {
                method: 'POST',
                body: JSON.stringify({ oldPath: item.path, newPath: tempPath })
            });

            // Step 2: Rename sibling to newSiblingName
            // Note: newSiblingName takes item's prefix.
            // If sibling was 02-B and becomes 01-B.
            await fetch('/api/move-lesson', {
                method: 'POST',
                body: JSON.stringify({ oldPath: sibling.path, newPath: newSiblingPath })
            });

            // Step 3: Rename temp to newItemName
            // item was 01-A, becomes 02-A.
            await fetch('/api/move-lesson', {
                method: 'POST',
                body: JSON.stringify({ oldPath: tempPath, newPath: newItemPath })
            });

            fetchLessons();

        } catch (error) {
            console.error('Error moving:', error);
            alert('Failed to move item');
        }
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
                            onMove={(item, direction, siblings) => handleMove(item, direction, siblings || tree)}
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
