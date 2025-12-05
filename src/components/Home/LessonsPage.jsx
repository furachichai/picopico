import React, { useEffect, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from 'react-i18next';
import './LessonsPage.css';

const FileTreeItem = ({ item, level = 0, onPlay, onEdit, onDelete, onMove, onRename, onCreate, onSaveDescription }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Default expanded
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [description, setDescription] = useState(item.description || '');

    // Reset local state when item changes
    useEffect(() => {
        setDescription(item.description || '');
    }, [item.description]);

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
                                onSaveDescription={onSaveDescription}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // File Item (Lesson)
    return (
        <div
            className="file-tree-item file"
            style={{ marginLeft: paddingLeft }} // Use margin for indentation on cards to avoid internal padding issues
            onClick={(e) => {
                // Determine if we should play
                if (isEditingDescription) return;
                if (e.target.closest('.btn-icon')) return;
                if (e.target.closest('.description-input')) return;
                if (e.target.closest('.btn-save') || e.target.closest('.btn-cancel')) return;
                onPlay(item);
            }}
        >
            <span className="item-name">{item.title || item.name.replace('.json', '')}</span>

            {!isEditingDescription ? (
                <div className="item-description">{item.description}</div>
            ) : (
                <div className="description-edit-container" onClick={(e) => e.stopPropagation()}>
                    <textarea
                        className="description-input"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter lesson description..."
                        rows={2}
                    />
                    <div className="description-actions">
                        <button className="btn-cancel" onClick={(e) => { e.stopPropagation(); setIsEditingDescription(false); setDescription(item.description || ''); }}>Cancel</button>
                        <button className="btn-save" onClick={(e) => { e.stopPropagation(); onSaveDescription(item, description); setIsEditingDescription(false); }}>Save</button>
                    </div>
                </div>
            )}

            <div className="item-actions">
                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setIsEditingDescription(true); }} title="Edit Description">📝</button>
                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(item); }} title="Edit Lesson Content">✏️</button>
                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onDelete(item); }} title="Delete">🗑️</button>
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
            const lessonFolder = parts[4];
            // folder name e.g. "00-Untitled Lesson"
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
            title: lessonName
        };
    };

    const loadLesson = async (item) => {
        try {
            const response = await fetch(`/api/load-lesson?path=${encodeURIComponent(item.path)}`);
            if (!response.ok) throw new Error('Failed to load lesson');
            const lessonData = await response.json();

            // Parse metadata from path
            const pathMetadata = parsePathToMetadata(item.path);

            return {
                ...lessonData,
                ...pathMetadata,
                // Don't overwrite title/description from file if they exist, 
                // but we might want path metadata to be the source of truth for structural things?
                // Actually, title in JSON >> folder name derived title usually.
                title: lessonData.title || pathMetadata.title,
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

    const handleSaveDescription = async (item, newDescription) => {
        try {
            // Load current lesson content first to ensure we don't lose anything
            const lesson = await loadLesson(item);
            if (!lesson) return;

            // Update description
            const updatedLesson = {
                ...lesson,
                description: newDescription
            };

            // Save back
            await fetch('/api/save-lesson', {
                method: 'POST',
                body: JSON.stringify({ path: item.path, content: updatedLesson })
            });

            // Refresh tree
            fetchLessons();
        } catch (error) {
            console.error('Error saving description:', error);
            alert('Failed to save description');
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
                await fetchLessons();
                return;
            }

            // If we are here, everything has a prefix. We just swap the prefixes of item and sibling.
            const itemParsed = parseName(item.name);
            const siblingParsed = parseName(sibling.name);

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
            await fetch('/api/move-lesson', {
                method: 'POST',
                body: JSON.stringify({ oldPath: sibling.path, newPath: newSiblingPath })
            });

            // Step 3: Rename temp to newItemName
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
        const parts = item.path.split('/');

        let subject = 'Math';
        let topic = '';
        let chapterId = '';
        let chapterName = '';

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
                            onSaveDescription={handleSaveDescription}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default LessonsPage;
