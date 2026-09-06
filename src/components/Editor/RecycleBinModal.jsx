import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './RecycleBinModal.css';
import ConfirmationModal from './ConfirmationModal';

const CATEGORIES = [
    { id: 'characters', label: 'Characters' },
    { id: 'objects', label: 'Objects' },
    { id: 'backgrounds', label: 'Backgrounds' },
    { id: 'images', label: 'General Images' },
];

const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (ts) => {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '';
    }
};

const RecycleBinModal = ({ isOpen, onClose, onAssetRestored }) => {
    const [trashFiles, setTrashFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [restoringFile, setRestoringFile] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');

    const fetchTrash = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/assets/trash');
            if (!res.ok) throw new Error('Failed to load deleted assets');
            const data = await res.json();
            setTrashFiles(data.files || []);
        } catch (err) {
            console.error('Error fetching trash:', err);
            setError(err.message || 'Could not load recycle bin');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchTrash();
        }
    }, [isOpen, fetchTrash]);

    const handleRestore = async (file, chosenCategory = null) => {
        setRestoringFile(file.trashFilename);
        const targetCategory = chosenCategory || file.category || 'characters';

        try {
            const res = await fetch('/api/assets/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trashFilename: file.trashFilename,
                    targetCategory,
                    targetFilename: file.originalFilename
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to restore file');
            }

            const result = await res.json();
            // Remove from trash list
            setTrashFiles(prev => prev.filter(f => f.trashFilename !== file.trashFilename));

            if (onAssetRestored) {
                onAssetRestored(result);
            }
        } catch (err) {
            console.error('Error restoring asset:', err);
            alert(`Restore failed: ${err.message}`);
        } finally {
            setRestoringFile(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch('/api/assets/trash/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trashFilename: deleteTarget.trashFilename })
            });

            if (!res.ok) throw new Error('Failed to delete permanently');
            setTrashFiles(prev => prev.filter(f => f.trashFilename !== deleteTarget.trashFilename));
        } catch (err) {
            alert(`Delete failed: ${err.message}`);
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleEmptyTrash = async () => {
        try {
            const res = await fetch('/api/assets/trash/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true })
            });

            if (!res.ok) throw new Error('Failed to empty trash');
            setTrashFiles([]);
        } catch (err) {
            alert(`Empty trash failed: ${err.message}`);
        } finally {
            setEmptyTrashConfirm(false);
        }
    };

    if (!isOpen) return null;

    const filteredFiles = trashFiles.filter(f => {
        if (activeFilter === 'all') return true;
        return f.category === activeFilter;
    });

    const modalContent = (
        <div className="recycle-modal-overlay" onClick={onClose}>
            <div className="recycle-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="recycle-header">
                    <div className="recycle-header-title">
                        <span className="recycle-icon">♻️</span>
                        <div>
                            <h3>Recycle Bin</h3>
                            <span className="recycle-subtitle">
                                {trashFiles.length} {trashFiles.length === 1 ? 'deleted asset' : 'deleted assets'}
                            </span>
                        </div>
                    </div>
                    <div className="recycle-header-actions">
                        {trashFiles.length > 0 && (
                            <button
                                type="button"
                                className="recycle-empty-btn"
                                onClick={() => setEmptyTrashConfirm(true)}
                                title="Permanently delete all items"
                            >
                                Empty Bin
                            </button>
                        )}
                        <button className="recycle-close-btn" onClick={onClose}>×</button>
                    </div>
                </div>

                {/* Filter Tabs */}
                {trashFiles.length > 0 && (
                    <div className="recycle-filters">
                        <button
                            type="button"
                            className={`recycle-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveFilter('all')}
                        >
                            All ({trashFiles.length})
                        </button>
                        {CATEGORIES.map(cat => {
                            const count = trashFiles.filter(f => f.category === cat.id).length;
                            if (count === 0) return null;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`recycle-filter-pill ${activeFilter === cat.id ? 'active' : ''}`}
                                    onClick={() => setActiveFilter(cat.id)}
                                >
                                    {cat.label} ({count})
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Body Content */}
                <div className="recycle-body">
                    {isLoading ? (
                        <div className="recycle-loading">
                            <div className="recycle-spinner" />
                            <span>Loading deleted assets...</span>
                        </div>
                    ) : error ? (
                        <div className="recycle-error">
                            <span>⚠️ {error}</span>
                            <button type="button" onClick={fetchTrash}>Retry</button>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="recycle-empty-state">
                            <span className="recycle-empty-icon">♻️</span>
                            <h4>Recycle Bin is Empty</h4>
                            <p>Assets you delete from the library will be saved here so you can safely recover them.</p>
                        </div>
                    ) : (
                        <div className="recycle-grid">
                            {filteredFiles.map((file) => {
                                const isRestoring = restoringFile === file.trashFilename;
                                return (
                                    <div key={file.trashFilename} className="recycle-item-card">
                                        <div className="recycle-item-thumb-wrapper">
                                            <img
                                                src={file.previewUrl}
                                                alt={file.originalFilename}
                                                className="recycle-item-thumb"
                                                loading="lazy"
                                            />
                                            <span className="recycle-item-cat-badge">
                                                {file.category || 'image'}
                                            </span>
                                        </div>

                                        <div className="recycle-item-info">
                                            <span className="recycle-item-name" title={file.originalFilename}>
                                                {file.originalFilename}
                                            </span>
                                            <div className="recycle-item-meta">
                                                <span>{formatFileSize(file.size)}</span>
                                                <span>•</span>
                                                <span>{formatDate(file.timestamp)}</span>
                                            </div>
                                        </div>

                                        <div className="recycle-item-actions">
                                            <button
                                                type="button"
                                                className="recycle-restore-btn"
                                                onClick={() => handleRestore(file)}
                                                disabled={isRestoring}
                                                title="Restore to library"
                                            >
                                                {isRestoring ? 'Restoring...' : '♻️ Restore'}
                                            </button>
                                            <button
                                                type="button"
                                                className="recycle-delete-perm-btn"
                                                onClick={() => setDeleteTarget(file)}
                                                title="Delete permanently"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="recycle-footer">
                    <span className="recycle-footer-hint">
                        💡 Click <strong>Restore</strong> to return an asset back to its category in the library.
                    </span>
                    <button type="button" className="recycle-done-btn" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>

            {/* Permanent Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteTarget}
                message={`Permanently delete "${deleteTarget?.originalFilename}"? This cannot be undone.`}
                onConfirm={handlePermanentDelete}
                onCancel={() => setDeleteTarget(null)}
                confirmText="Delete Forever"
                cancelText="Keep"
            />

            {/* Empty Trash Confirmation Modal */}
            <ConfirmationModal
                isOpen={emptyTrashConfirm}
                message={`Permanently delete all ${trashFiles.length} items in the Recycle Bin? This cannot be undone.`}
                onConfirm={handleEmptyTrash}
                onCancel={() => setEmptyTrashConfirm(false)}
                confirmText="Empty Bin"
                cancelText="Cancel"
            />
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default RecycleBinModal;
