import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ReplaceAssetModal.css';
import { resolveAssetUrl } from '../../utils/assetUrl';

export const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const ReplaceAssetModal = ({
    isOpen,
    conflict,
    onReplace,
    onKeepBoth,
    onCancel,
    onCancelAll
}) => {
    const [existingDims, setExistingDims] = useState(null);
    const [incomingDims, setIncomingDims] = useState(null);

    useEffect(() => {
        setExistingDims(null);
        setIncomingDims(null);
    }, [conflict]);

    if (!isOpen || !conflict) return null;

    const {
        filename,
        existing = {},
        incoming = {},
        currentIndex = 0,
        totalCount = 1
    } = conflict;

    const isBatch = totalCount > 1;

    const modalContent = (
        <div
            className="replace-asset-modal-overlay"
            onClick={onCancel}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div
                className="replace-asset-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="replace-asset-header">
                    <div className="replace-asset-title-wrap">
                        <span className="replace-asset-icon-badge">🔄</span>
                        <div className="replace-asset-header-text">
                            <h3>
                                Replace Existing Asset?
                                {isBatch && (
                                    <span className="replace-asset-batch-badge">
                                        {currentIndex + 1} of {totalCount}
                                    </span>
                                )}
                            </h3>
                            <p>
                                A file named <strong>{filename}</strong> already exists in the library.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="replace-asset-close-btn"
                        onClick={onCancel}
                        title="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="replace-asset-body">
                    {/* Comparison Grid */}
                    <div className="replace-asset-comparison">
                        {/* Current Existing Asset */}
                        <div className="replace-asset-card existing-card">
                            <span className="replace-asset-card-badge">Current in Library</span>
                            <div className="replace-asset-thumb-box">
                                <img
                                    src={resolveAssetUrl(existing.url)}
                                    alt={existing.filename || 'Current asset'}
                                    onLoad={(e) => setExistingDims({
                                        width: e.target.naturalWidth,
                                        height: e.target.naturalHeight
                                    })}
                                />
                            </div>
                            <div className="replace-asset-card-details">
                                <div className="replace-asset-detail-row">
                                    <span className="replace-asset-detail-label">Name:</span>
                                    <span className="replace-asset-detail-val" title={existing.filename}>
                                        {existing.filename}
                                    </span>
                                </div>
                                {existing.category && (
                                    <div className="replace-asset-detail-row">
                                        <span className="replace-asset-detail-label">Folder:</span>
                                        <span className="replace-asset-detail-val">
                                            {existing.category}
                                        </span>
                                    </div>
                                )}
                                {existing.size > 0 && (
                                    <div className="replace-asset-detail-row">
                                        <span className="replace-asset-detail-label">Size:</span>
                                        <span className="replace-asset-detail-val">
                                            {formatBytes(existing.size)}
                                        </span>
                                    </div>
                                )}
                                {existingDims && (
                                    <div className="replace-asset-detail-row">
                                        <span className="replace-asset-detail-label">Dimensions:</span>
                                        <span className="replace-asset-detail-val">
                                            {existingDims.width} × {existingDims.height} px
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Incoming New Asset */}
                        <div className="replace-asset-card incoming-card">
                            <span className="replace-asset-card-badge">New Upload</span>
                            <div className="replace-asset-thumb-box">
                                <img
                                    src={incoming.dataUrl}
                                    alt={incoming.filename || 'New upload'}
                                    onLoad={(e) => setIncomingDims({
                                        width: e.target.naturalWidth,
                                        height: e.target.naturalHeight
                                    })}
                                />
                            </div>
                            <div className="replace-asset-card-details">
                                <div className="replace-asset-detail-row">
                                    <span className="replace-asset-detail-label">Name:</span>
                                    <span className="replace-asset-detail-val" title={incoming.filename}>
                                        {incoming.filename}
                                    </span>
                                </div>
                                {incoming.size > 0 && (
                                    <div className="replace-asset-detail-row">
                                        <span className="replace-asset-detail-label">Size:</span>
                                        <span className="replace-asset-detail-val">
                                            {formatBytes(incoming.size)}
                                        </span>
                                    </div>
                                )}
                                {incomingDims && (
                                    <div className="replace-asset-detail-row">
                                        <span className="replace-asset-detail-label">Dimensions:</span>
                                        <span className="replace-asset-detail-val">
                                            {incomingDims.width} × {incomingDims.height} px
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Explanatory Notice */}
                    <div className="replace-asset-notice">
                        <span className="replace-asset-notice-icon">💡</span>
                        <div>
                            Replacing this file will update the asset in the <strong>library</strong> and instantly update all <strong>backgrounds and images</strong> across your lesson slides in the editor.
                        </div>
                    </div>
                </div>

                <div className="replace-asset-footer">
                    <div className="replace-asset-actions-left">
                        <button
                            type="button"
                            className="replace-btn replace-btn-cancel"
                            onClick={onCancel}
                        >
                            {isBatch ? 'Skip' : 'Cancel'}
                        </button>
                        {isBatch && onCancelAll && (
                            <button
                                type="button"
                                className="replace-btn-cancel-all"
                                onClick={onCancelAll}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                    padding: '8px 10px',
                                    textDecoration: 'underline'
                                }}
                            >
                                Cancel All
                            </button>
                        )}
                    </div>

                    <div className="replace-asset-actions-right">
                        {onKeepBoth && (
                            <button
                                type="button"
                                className="replace-btn replace-btn-keep"
                                onClick={() => onKeepBoth(conflict)}
                                title="Save new file with a numbered suffix (e.g. name_1.png)"
                            >
                                Keep Both
                            </button>
                        )}
                        <button
                            type="button"
                            className="replace-btn replace-btn-confirm"
                            onClick={() => onReplace(conflict)}
                        >
                            <span>🔄</span> Replace File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ReplaceAssetModal;
