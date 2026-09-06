import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './AssetInfoModal.css';

const CATEGORIES = [
    { id: 'characters', label: 'Characters' },
    { id: 'objects', label: 'Objects' },
    { id: 'backgrounds', label: 'Backgrounds' },
    { id: 'images', label: 'General Images' },
    { id: 'graphics', label: 'Graphics' },
];

const AssetInfoModal = ({
    isOpen,
    src,
    onClose,
    onDeleteRequest,
    onCategoryChanged
}) => {
    const { t } = useTranslation();
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
    const [categoryUpdateMsg, setCategoryUpdateMsg] = useState(null);

    useEffect(() => {
        if (!isOpen || !src) return;

        setLoading(true);
        setCategoryUpdateMsg(null);

        // 1. Fetch natural resolution
        const img = new Image();
        img.onload = () => {
            setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = src;

        // 2. Fetch file info from dev endpoint
        const fetchInfo = async () => {
            try {
                const res = await fetch(`/api/assets/info?path=${encodeURIComponent(src)}`);
                if (res.ok) {
                    const data = await res.json();
                    setInfo(data);
                    // Detect category from path
                    const parts = data.path.split('/');
                    const catPart = parts[2] || 'images';
                    setSelectedCategory(catPart);
                } else {
                    // Fallback using URL/src
                    const filename = src.split('/').pop().split('?')[0];
                    setInfo({
                        filename,
                        path: src,
                        size: null
                    });
                }
            } catch (e) {
                const filename = src.split('/').pop().split('?')[0];
                setInfo({
                    filename,
                    path: src,
                    size: null
                });
            } finally {
                setLoading(false);
            }
        };

        fetchInfo();
    }, [isOpen, src]);

    if (!isOpen || !src) return null;

    const formatFileSize = (bytes) => {
        if (!bytes && bytes !== 0) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const handleCategoryChange = async (newCat) => {
        if (!newCat || newCat === selectedCategory || !info?.path) return;
        setIsUpdatingCategory(true);
        setCategoryUpdateMsg(null);

        try {
            const res = await fetch('/api/assets/update-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: info.path,
                    newCategory: newCat
                })
            });

            if (!res.ok) throw new Error('Failed to update category');
            const data = await res.json();
            setSelectedCategory(newCat);
            setInfo(prev => ({ ...prev, path: data.newPath }));
            setCategoryUpdateMsg('Category updated successfully!');
            if (onCategoryChanged) {
                onCategoryChanged(data);
            }
        } catch (err) {
            setCategoryUpdateMsg(`Error: ${err.message}`);
        } finally {
            setIsUpdatingCategory(false);
        }
    };

    const modalContent = (
        <div className="asset-info-modal-overlay" onClick={onClose}>
            <div className="asset-info-modal" onClick={e => e.stopPropagation()}>
                <div className="asset-info-header">
                    <div className="asset-info-title-wrap">
                        <span className="asset-info-icon-badge">ℹ️</span>
                        <h3>Asset Details</h3>
                    </div>
                    <button className="asset-info-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="asset-info-body">
                    {/* Thumbnail View */}
                    <div className="asset-info-preview-card">
                        <div className="asset-info-thumb-container">
                            <img src={src} alt="Asset" />
                        </div>
                        <div className="asset-info-primary-name">
                            {info?.filename || src.split('/').pop()}
                        </div>
                    </div>

                    {/* Meta Table */}
                    <div className="asset-info-table">
                        <div className="asset-info-row">
                            <span className="asset-info-label">Filename</span>
                            <span className="asset-info-val highlight">{info?.filename || '—'}</span>
                        </div>

                        <div className="asset-info-row">
                            <span className="asset-info-label">Resolution</span>
                            <span className="asset-info-val">
                                {dimensions.width > 0 ? `${dimensions.width} × ${dimensions.height} px` : 'Calculating...'}
                            </span>
                        </div>

                        <div className="asset-info-row">
                            <span className="asset-info-label">File Size</span>
                            <span className="asset-info-val">
                                {loading ? 'Loading...' : formatFileSize(info?.size)}
                            </span>
                        </div>

                        <div className="asset-info-row">
                            <span className="asset-info-label">Directory Path</span>
                            <span className="asset-info-val code" title={info?.fullPath || info?.path}>
                                {info?.path || src}
                            </span>
                        </div>

                        {/* Category Selector */}
                        <div className="asset-info-row category-row">
                            <span className="asset-info-label">Category</span>
                            <div className="asset-info-cat-select-wrapper">
                                <select
                                    value={selectedCategory}
                                    onChange={e => handleCategoryChange(e.target.value)}
                                    disabled={isUpdatingCategory || !info?.path}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.label} (src/assets/{cat.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {categoryUpdateMsg && (
                            <div className={`asset-info-msg ${categoryUpdateMsg.startsWith('Error') ? 'error' : 'success'}`}>
                                {categoryUpdateMsg}
                            </div>
                        )}
                    </div>
                </div>

                <div className="asset-info-footer">
                    <button
                        type="button"
                        className="asset-info-delete-btn"
                        onClick={() => {
                            if (onDeleteRequest) {
                                onDeleteRequest(src, info?.filename || src.split('/').pop());
                            }
                        }}
                    >
                        🗑️ Delete Asset
                    </button>
                    <button
                        type="button"
                        className="asset-info-done-btn"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default AssetInfoModal;

