import React, { useState, useEffect, useRef } from 'react';
import TitlecardCircleFrame from './TitlecardCircleFrame';
import SlideThumbnail from '../Editor/SlideThumbnail';

const VIEWPORT_SIZE = 220; // Diameter of the interactive editor viewport

const CircleFrameModal = ({
  isOpen,
  lesson,
  overlayHeight = 38,
  overlayBg = 'rgba(0, 0, 0, 0.68)',
  titleColor = '#FFFFFF',
  titleShadow = '0 2px 4px rgba(0, 0, 0, 0.95)',
  titleFontSize = '1.6rem',
  onSave,
  onClose
}) => {
  const [slide, setSlide] = useState(null);
  const [frame, setFrame] = useState({ zoom: 1, x: 0, y: 0 });
  const [useIcon, setUseIcon] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isVisibleInFeed, setIsVisibleInFeed] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, frameX: 0, frameY: 0 });

  useEffect(() => {
    if (isOpen && lesson) {
      const v = lesson.visible !== undefined
        ? lesson.visible !== false
        : (lesson.content?.visible !== undefined ? lesson.content.visible !== false : true);
      setIsVisible(v);

      const vf = lesson.visibleInFeed !== undefined
        ? lesson.visibleInFeed !== false
        : (lesson.content?.visibleInFeed !== undefined
            ? lesson.content.visibleInFeed !== false
            : v);
      setIsVisibleInFeed(vf);

      const existingFrame = lesson.titlecardFrame || lesson.content?.titlecardFrame;
      if (existingFrame && typeof existingFrame.zoom === 'number') {
        setFrame({
          zoom: existingFrame.zoom || 1,
          x: existingFrame.x || 0,
          y: existingFrame.y || 0
        });
        setUseIcon(false);
      } else {
        setFrame({ zoom: 1, x: 0, y: 0 });
        setUseIcon(true);
      }

      // Check if slide 0 is already present in content
      const firstSlide = lesson.content?.slides?.[0] || lesson.slides?.[0];
      if (firstSlide) {
        setSlide(firstSlide);
      } else if (lesson.path) {
        // Fetch lesson data to get slides & fresh visibility flags
        fetch(`/api/load-lesson?path=${encodeURIComponent(lesson.path)}`)
          .then(res => res.json())
          .then(data => {
            if (data?.slides?.[0]) {
              setSlide(data.slides[0]);
            }
            if (data?.visible !== undefined) {
              setIsVisible(data.visible !== false);
            }
            if (data?.visibleInFeed !== undefined) {
              setIsVisibleInFeed(data.visibleInFeed !== false);
            }
          })
          .catch(err => console.error('Error loading slide for circle frame:', err));
      }
    }
  }, [isOpen, lesson]);

  if (!isOpen || !lesson) return null;

  const handlePointerDown = (e) => {
    if (useIcon) return;
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      frameX: frame.x,
      frameY: frame.y
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = ((e.clientX - dragStartRef.current.pointerX) / VIEWPORT_SIZE) * 100;
    const dy = ((e.clientY - dragStartRef.current.pointerY) / VIEWPORT_SIZE) * 100;

    const curZoom = Math.max(0.4, frame.zoom || 1);
    const scaledWidth = 360 * (VIEWPORT_SIZE / 360) * curZoom;
    const scaledHeight = 640 * (VIEWPORT_SIZE / 360) * curZoom;
    const maxXPercent = (Math.abs(scaledWidth - VIEWPORT_SIZE) / 2 / VIEWPORT_SIZE) * 100;
    const maxYPercent = (Math.abs(scaledHeight - VIEWPORT_SIZE) / 2 / VIEWPORT_SIZE) * 100;

    const rawX = dragStartRef.current.frameX + dx;
    const rawY = dragStartRef.current.frameY + dy;

    setFrame(prev => ({
      ...prev,
      x: Math.round(Math.max(-maxXPercent, Math.min(maxXPercent, rawX)) * 10) / 10,
      y: Math.round(Math.max(-maxYPercent, Math.min(maxYPercent, rawY)) * 10) / 10
    }));
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleWheel = (e) => {
    if (useIcon) return;
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.002;
    setFrame(prev => {
      const newZoom = Math.min(4, Math.max(0.4, Math.round((prev.zoom + zoomDelta) * 100) / 100));
      const scaledWidth = 360 * (VIEWPORT_SIZE / 360) * newZoom;
      const scaledHeight = 640 * (VIEWPORT_SIZE / 360) * newZoom;
      const maxXPercent = (Math.abs(scaledWidth - VIEWPORT_SIZE) / 2 / VIEWPORT_SIZE) * 100;
      const maxYPercent = (Math.abs(scaledHeight - VIEWPORT_SIZE) / 2 / VIEWPORT_SIZE) * 100;
      return {
        ...prev,
        zoom: newZoom,
        x: Math.max(-maxXPercent, Math.min(maxXPercent, prev.x)),
        y: Math.max(-maxYPercent, Math.min(maxYPercent, prev.y))
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalFrame = useIcon ? null : frame;
      await onSave(finalFrame, {
        visible: isVisible,
        visibleInFeed: isVisibleInFeed
      });
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const baseScale = (VIEWPORT_SIZE / 360) * Math.max(0.4, frame.zoom || 1) * 1.01;
  const scaledWidth = 360 * baseScale;
  const scaledHeight = 640 * baseScale;
  const maxOffsetX = Math.abs(scaledWidth - VIEWPORT_SIZE) / 2;
  const maxOffsetY = Math.abs(scaledHeight - VIEWPORT_SIZE) / 2;
  const rawOffsetX = (frame.x / 100) * VIEWPORT_SIZE;
  const rawOffsetY = (frame.y / 100) * VIEWPORT_SIZE;
  const offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawOffsetX));
  const offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawOffsetY));

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        fontFamily: "'Outfit', 'Inter', sans-serif",
        padding: '16px'
      }}
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '3.5px solid #000000',
          boxShadow: '8px 8px 0px #000000',
          maxWidth: '420px',
          maxHeight: '90vh',
          overflowY: 'auto',
          width: '100%',
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1E293B' }}>
              Focus Button Artwork
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
              Drag to pan & zoom to fit artwork inside the button
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: '2px solid #000000',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Mode Selector: Titlecard vs Icon */}
        <div style={{
          display: 'flex',
          gap: '8px',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '12px',
          border: '2px solid #000000'
        }}>
          <button
            type="button"
            onClick={() => setUseIcon(false)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: !useIcon ? '2px solid #000000' : 'none',
              background: !useIcon ? '#8B5CF6' : 'transparent',
              color: !useIcon ? '#FFFFFF' : '#64748B',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            🎯 Slide Titlecard
          </button>
          <button
            type="button"
            onClick={() => setUseIcon(true)}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: useIcon ? '2px solid #000000' : 'none',
              background: useIcon ? '#8B5CF6' : 'transparent',
              color: useIcon ? '#FFFFFF' : '#64748B',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            🖼️ Lesson Icon
          </button>
        </div>

        {/* Interactive Viewport Area - Square Button Shape */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          {!useIcon ? (
            <div
              style={{
                position: 'relative',
                width: `${VIEWPORT_SIZE}px`,
                height: `${VIEWPORT_SIZE}px`,
                borderRadius: '28px',
                border: '3.5px solid #000000',
                boxShadow: '0 0 0 5px rgba(139, 92, 246, 0.25), 5px 5px 0px #000000',
                overflow: 'hidden',
                backgroundColor: lesson.content?.cardColor || lesson.cardColor || '#8B5CF6',
                touchAction: 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              {slide ? (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '360px',
                    height: '640px',
                    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${baseScale})`,
                    transformOrigin: 'center center',
                    pointerEvents: 'none'
                  }}
                >
                  <SlideThumbnail
                    slide={slide}
                    width="360px"
                    height="640px"
                    hideTextAndBalloons={true}
                    fixedScale={1}
                  />
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#FFFFFF',
                  fontWeight: 700
                }}>
                  Loading slide...
                </div>
              )}

              {/* Center Crosshair Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '1.5px dashed rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 0 4px rgba(0,0,0,0.6)'
                }} />
              </div>

              {/* Bottom Semi-transparent Title Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${overlayHeight}%`,
                  background: overlayBg,
                  backdropFilter: 'blur(5px)',
                  borderTop: '2.5px solid rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                  zIndex: 5,
                  transition: 'height 0.1s ease, background 0.15s ease'
                }}
              >
                <div style={{
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                  fontWeight: 900,
                  fontSize: `${((parseFloat(titleFontSize) || 1.6) * 0.78).toFixed(2)}rem`,
                  lineHeight: 1.15,
                  color: titleColor,
                  textAlign: 'center',
                  textShadow: titleShadow,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                  letterSpacing: '-0.5px'
                }}>
                  {lesson.title}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                width: `${VIEWPORT_SIZE}px`,
                height: `${VIEWPORT_SIZE}px`,
                borderRadius: '28px',
                border: '3.5px solid #000000',
                boxShadow: '0 0 0 5px rgba(139, 92, 246, 0.25), 5px 5px 0px #000000',
                backgroundColor: lesson.content?.cardColor || lesson.cardColor || '#8B5CF6',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              <img
                src={`/assets/graphics/${lesson.content?.icon || lesson.icon || 'icon_textbook.png'}`}
                alt="icon"
                style={{ width: '48%', height: '48%', objectFit: 'contain', marginBottom: '25%' }}
              />

              {/* Bottom Third Semi-transparent Title Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '38%',
                  background: 'rgba(0, 0, 0, 0.68)',
                  backdropFilter: 'blur(5px)',
                  borderTop: '2.5px solid rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                  zIndex: 5
                }}
              >
                <div style={{
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  lineHeight: 1.15,
                  color: '#FFFFFF',
                  textAlign: 'center',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.95)',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                  letterSpacing: '-0.5px'
                }}>
                  {lesson.title}
                </div>
              </div>
            </div>
          )}

          {!useIcon && (
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
              ✋ Click & drag to pan • Scroll to zoom
            </div>
          )}
        </div>

        {/* Zoom Controls (only when titlecard is selected) */}
        {!useIcon && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#F8FAFC',
            padding: '8px 14px',
            borderRadius: '14px',
            border: '2px solid #E2E8F0'
          }}>
            <button
              type="button"
              onClick={() => setFrame(f => ({ ...f, zoom: Math.max(0.4, Math.round((f.zoom - 0.1) * 10) / 10) }))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '2px solid #000000',
                background: '#FFFFFF',
                fontWeight: 900,
                fontSize: '1.1rem',
                cursor: 'pointer'
              }}
            >
              −
            </button>
            <input
              type="range"
              min="0.4"
              max="4"
              step="0.05"
              value={frame.zoom}
              onChange={e => setFrame(f => ({ ...f, zoom: parseFloat(e.target.value) }))}
              style={{ flex: 1, accentColor: '#8B5CF6' }}
            />
            <button
              type="button"
              onClick={() => setFrame(f => ({ ...f, zoom: Math.min(4, Math.round((f.zoom + 0.1) * 10) / 10) }))}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '2px solid #000000',
                background: '#FFFFFF',
                fontWeight: 900,
                fontSize: '1.1rem',
                cursor: 'pointer'
              }}
            >
              +
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: '40px', textAlign: 'right' }}>
              {frame.zoom.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={() => setFrame({ zoom: 1, x: 0, y: 0 })}
              title="Reset center"
              style={{
                marginLeft: '4px',
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        )}

        {/* Live Square Button Preview */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: '#F1F5F9',
          padding: '12px',
          borderRadius: '16px',
          border: '2px dashed #CBD5E1'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
            Preview:
          </span>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '20px',
              border: '3px solid #000000',
              boxShadow: '3px 3px 0px #000000',
              backgroundColor: lesson.content?.cardColor || lesson.cardColor || '#8B5CF6',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          >
            <TitlecardCircleFrame
              slide={slide}
              titlecardFrame={useIcon ? null : frame}
              icon={lesson.content?.icon || lesson.icon}
              cardColor={lesson.content?.cardColor || lesson.cardColor || '#8B5CF6'}
              size={120}
            />
            {/* Bottom Third Semi-transparent Title Overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '38%',
                background: 'rgba(0, 0, 0, 0.68)',
                backdropFilter: 'blur(3px)',
                borderTop: '1.5px solid rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 6px',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                zIndex: 5
              }}
            >
              <div style={{
                fontFamily: "'Outfit', 'Inter', sans-serif",
                fontWeight: 900,
                fontSize: '0.8rem',
                lineHeight: 1.12,
                color: '#FFFFFF',
                textAlign: 'center',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.95)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word'
              }}>
                {lesson.title}
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Settings */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: '#F8FAFC',
          padding: '12px 14px',
          borderRadius: '16px',
          border: '2px solid #E2E8F0'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Visibility:
          </span>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>{isVisible ? '👁️' : '🚫'}</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1E293B' }}>
                  Show in Main Menu
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  {isVisible ? 'Visible on lesson road' : 'Hidden from main menu'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: '#8B5CF6',
                cursor: 'pointer'
              }}
            />
          </label>

          <div style={{ height: '1px', background: '#E2E8F0' }} />

          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>{isVisibleInFeed ? '🎬' : '🚫'}</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1E293B' }}>
                  Show in Feed
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  {isVisibleInFeed ? 'Included in Discover swipe feed' : 'Hidden from Discover feed'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isVisibleInFeed}
              onChange={(e) => setIsVisibleInFeed(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: '#8B5CF6',
                cursor: 'pointer'
              }}
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '14px',
              border: '2px solid #000000',
              background: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '14px',
              border: '2px solid #000000',
              background: '#8B5CF6',
              color: '#FFFFFF',
              boxShadow: '3px 3px 0px #000000',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: saving ? 'wait' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircleFrameModal;
