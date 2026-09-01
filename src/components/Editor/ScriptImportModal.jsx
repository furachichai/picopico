import React, { useState, useMemo } from 'react';
import { parseScript, buildLessonSlides } from '../../utils/scriptParser';
import { useEditor } from '../../context/EditorContext';
import './ScriptImportModal.css';

const ScriptImportModal = ({ isOpen, onClose }) => {
    const { state, dispatch } = useEditor();
    const [scriptText, setScriptText] = useState('');

    // Parse in real-time as user types/pastes
    const parseResult = useMemo(() => {
        if (!scriptText.trim()) return null;
        return parseScript(scriptText);
    }, [scriptText]);

    // Derived stats
    const stats = useMemo(() => {
        if (!parseResult || parseResult.slides.length === 0) return null;
        const narrative = parseResult.slides.filter(s => s.type === 'narrative').length;
        const quiz = parseResult.slides.filter(s => s.type === 'quiz').length;
        const collectible = parseResult.slides.filter(s => s.type === 'collectible').length;
        return { total: parseResult.slides.length, narrative, quiz, collectible };
    }, [parseResult]);

    const hasErrors = parseResult?.errors?.length > 0;
    const hasWarnings = parseResult?.warnings?.length > 0;
    const canBuild = parseResult && parseResult.slides.length > 0;

    const handleBuild = () => {
        if (!canBuild) return;

        // Snapshot current slides before replacing
        const currentSlides = state.lesson.slides;
        const snapshot = {
            timestamp: new Date().toISOString(),
            reason: 'Before script import',
            slides: JSON.parse(JSON.stringify(currentSlides)),
        };

        // Build new slides from script
        const newSlides = buildLessonSlides(parseResult.slides, state.lesson.textPreset);

        // Dispatch the import
        dispatch({
            type: 'IMPORT_SCRIPT',
            payload: {
                slides: newSlides,
                title: parseResult.title,
                snapshot,
            },
        });

        // Clear and close
        setScriptText('');
        onClose();
    };

    const handleClose = () => {
        setScriptText('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="script-import-overlay" onClick={handleClose}>
            <div className="script-import-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="script-import-header">
                    <h3>📝 Import Script</h3>
                    <button className="script-import-close" onClick={handleClose}>×</button>
                </div>

                {/* Body */}
                <div className="script-import-body">
                    <textarea
                        className="script-import-textarea"
                        placeholder={`Paste your lesson script here...\n\n# Microlesson: Title\n\n## SLIDE\n**Character:** Dialogue text\n\n## SLIDE (Quiz)\nQuestion text?\n1. Option A\n2. Option B *\n3. Option C`}
                        value={scriptText}
                        onChange={(e) => setScriptText(e.target.value)}
                        autoFocus
                    />

                    {/* Live Preview */}
                    {stats && (
                        <div className="script-import-preview">
                            <div className="script-preview-title">Preview</div>

                            {/* Stats badges */}
                            <div className="script-preview-stats">
                                <div className="script-preview-stat">
                                    <span className="stat-icon">📊</span>
                                    {stats.total} slides
                                </div>
                                {stats.narrative > 0 && (
                                    <div className="script-preview-stat narrative">
                                        <span className="stat-icon">💬</span>
                                        {stats.narrative} narrative
                                    </div>
                                )}
                                {stats.quiz > 0 && (
                                    <div className="script-preview-stat quiz">
                                        <span className="stat-icon">❓</span>
                                        {stats.quiz} quiz
                                    </div>
                                )}
                                {stats.collectible > 0 && (
                                    <div className="script-preview-stat collectible">
                                        <span className="stat-icon">🃏</span>
                                        {stats.collectible} card
                                    </div>
                                )}
                            </div>

                            {/* Slide thumbnails */}
                            <div className="script-preview-slides">
                                {parseResult.slides.map((slide, i) => (
                                    <div
                                        key={i}
                                        className={`script-preview-slide-thumb ${slide.type}`}
                                        title={`Slide ${i + 1}: ${slide.type}${slide.type === 'quiz' ? ` — ${slide.questionText || 'No question'}` : ''}`}
                                    >
                                        {slide.type === 'quiz' ? 'Q' : slide.type === 'collectible' ? '🃏' : i + 1}
                                    </div>
                                ))}
                            </div>

                            {/* Title detected */}
                            {parseResult.title && (
                                <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#64748B' }}>
                                    <strong>Title:</strong> {parseResult.title}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Errors */}
                    {hasErrors && (
                        <div className="script-import-messages">
                            {parseResult.errors.map((err, i) => (
                                <div key={`err-${i}`} className="script-import-message error">
                                    <span className="msg-icon">❌</span>{err}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Warnings */}
                    {hasWarnings && (
                        <div className="script-import-messages">
                            {parseResult.warnings.map((warn, i) => (
                                <div key={`warn-${i}`} className="script-import-message warning">
                                    <span className="msg-icon">⚠️</span>{warn}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="script-import-footer">
                    <button className="script-import-btn cancel" onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        className="script-import-btn build"
                        onClick={handleBuild}
                        disabled={!canBuild}
                        title={hasErrors ? 'Fix errors before building' : `Build ${stats?.total || 0} slides`}
                    >
                        {hasErrors
                            ? 'Fix Errors'
                            : `Build ${stats?.total || 0} Slides`
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScriptImportModal;
