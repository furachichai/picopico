import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import Sticker from './Sticker';
import FractionAlpha from '../../cartridges/FractionAlpha/FractionAlpha';
import FractionSlicer from '../../cartridges/FractionSlicer/FractionSlicer';
import SwipeSorter from '../../cartridges/SwipeSorter/SwipeSorter';
import PEMDASCartridge from '../../cartridges/PEMDAS/PEMDASCartridge';
import Potiondas from '../../cartridges/Potiondas/Potiondas';
import { PotiondasThumbnail } from './SlideThumbnail';

/**
 * Canvas Component
 * 
 * The main editing area where slides are composed. It handles:
 * - Rendering the current slide's background and elements (Stickers).
 * - Managing selection state (clicking background deselects).
 * - Passing update/delete callbacks to children.
 * - Responsive scaling to fit the container.
 */
const Canvas = (props) => {
  const { state, dispatch } = useEditor();
  const { lesson, currentSlideId, selectedElementId } = state;
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Memoize current slide lookup to avoid recalculating on every render
  const currentSlide = useMemo(() =>
    lesson.slides.find(s => s.id === currentSlideId),
    [lesson.slides, currentSlideId]
  );

  // Handle responsive scaling
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      // Target resolution: 360x640
      // Add some padding (e.g., 40px total horizontal/vertical)
      const availableWidth = width - 40;
      const availableHeight = height - 40;

      const scaleX = availableWidth / 360;
      const scaleY = availableHeight / 640;

      // Use the smaller scale to fit entirely
      const newScale = Math.min(scaleX, scaleY, 1.5); // Cap max scale at 1.5x
      setScale(Math.max(0.1, newScale)); // Prevent scale from being too small
    };

    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
      updateScale(); // Initial calculation
    }

    return () => observer.disconnect();
  }, []);

  if (!currentSlide) return <div className="canvas-error">No slide selected</div>;

  // Stable callback for selecting an element
  const handleSelect = useCallback((id, isShift = false) => {
    dispatch({ type: 'SELECT_ELEMENT', payload: { id, isShift } });
  }, [dispatch]);

  // Stable callback for updating an element
  const handleChange = useCallback((id, updates) => {
    // In translation mode, only allow content changes and route to translation draft
    if (state.translationMode) {
      const el = currentSlide?.elements.find(e => e.id === id);
      if (!el) return;
      // Text/balloon content is translatable
      if ((el.type === 'text' || el.type === 'balloon') && 'content' in updates) {
        dispatch({
          type: 'UPDATE_TRANSLATION',
          payload: {
            slideId: currentSlide.id,
            elementId: id,
            value: { content: updates.content }
          }
        });
      }
      if (el.type === 'quiz') {
        const transValue = {};
        if (updates.metadata?.options) transValue.options = updates.metadata.options;
        if (updates.metadata?.matchAnswers) transValue.matchAnswers = updates.metadata.matchAnswers;
        if (updates.metadata?.chatNodes) transValue.chatNodes = updates.metadata.chatNodes;
        
        if (Object.keys(transValue).length > 0) {
          dispatch({
            type: 'UPDATE_TRANSLATION',
            payload: {
              slideId: currentSlide.id,
              elementId: id,
              value: transValue
            }
          });
        }
        return;
      }
      // Block all other changes (position, scale, rotation, etc.)
      return;
    }
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } });
  }, [dispatch, state.translationMode, currentSlide]);

  // Handle background clicks to deselect elements
  const handleCanvasClick = useCallback((e) => {
    // Deselect if clicking on canvas background directly
    if (e.target === e.currentTarget || e.target.closest('.cartridge-container')) {
      // Prevent Editor.jsx's global click handler from firing and deselecting
      e.stopPropagation();

      // If there is a cartridge, select it
      if (currentSlide?.cartridge) {
        dispatch({ type: 'SELECT_ELEMENT', payload: 'cartridge' });
      } else {
        dispatch({ type: 'SELECT_ELEMENT', payload: null });
      }
    }
  }, [dispatch, currentSlide]);

  // Stable callback for deleting an element
  const handleDelete = useCallback((id) => {
    dispatch({ type: 'DELETE_ELEMENT', payload: id });
  }, [dispatch]);

  // Stable callback for editing an element (passed from parent props)
  const handleEdit = useCallback((id) => {
    if (props.onEditElement) {
      props.onEditElement(id);
    }
  }, [props.onEditElement]);

  return (
    <div className="canvas-container" ref={containerRef}>
      {/* Wrapper: position:relative so pointers can sit outside the overflow:hidden canvas */}
      <div style={{ position: 'relative', width: '360px', height: '640px', flexShrink: 0 }}>
        <div
          className="slide-canvas"
          style={{
            width: '360px',
            height: '640px',
            overflow: 'hidden',
            position: 'relative'
          }}
          onClick={handleCanvasClick}
        >
          {/* Background Layer */}
          {currentSlide?.background && (currentSlide.background.includes('url') || currentSlide.background.includes('gradient')) && (
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: currentSlide.background,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: 0,
                opacity: currentSlide.backgroundSettings?.opacity ?? 1,
                filter: `brightness(${currentSlide.backgroundSettings?.brightness ?? 100}%)`,
                transform: `scale(${currentSlide.backgroundSettings?.flipX ? -1 : 1}, ${currentSlide.backgroundSettings?.flipY ? -1 : 1})`,
                pointerEvents: 'none'
              }}
            />
          )}
          {currentSlide?.background && !currentSlide.background.includes('url') && !currentSlide.background.includes('gradient') && (
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: currentSlide.background,
                zIndex: 0
              }}
            />
          )}

          {/* Alignment Guides */}
          {state.showGuides && (
            <div className="editor-guides" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', backgroundColor: 'rgba(255, 100, 100, 0.5)' }} />
              <div style={{ position: 'absolute', top: 0, left: '50%', width: '1px', height: '100%', backgroundColor: 'rgba(255, 100, 100, 0.5)' }} />
              {[20, 40, 60, 80].map(percent => (
                <React.Fragment key={percent}>
                  <div style={{ position: 'absolute', top: `${percent}%`, left: 0, width: '100%', height: '1px', borderTop: '1px dashed rgba(255, 100, 100, 0.3)' }} />
                  <div style={{ position: 'absolute', top: 0, left: `${percent}%`, width: '1px', height: '100%', borderLeft: '1px dashed rgba(255, 100, 100, 0.3)' }} />
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Stripper Divider Lines (inside canvas) */}
          {currentSlide?.stripper?.enabled && currentSlide.stripper.dividers?.map((divY, idx) => (
            <div key={`stripper-line-${idx}`} style={{
              position: 'absolute',
              top: `${divY}%`,
              left: 0,
              width: '100%',
              height: '0',
              borderTop: '2.5px dashed rgba(30, 144, 255, 0.7)',
              zIndex: 900,
              pointerEvents: 'none',
            }} />
          ))}

          {/* Progress Bar */}
          <div className="editor-progress-bar">
            {Array.from({ length: props.totalSlides }).map((_, index) => (
              <div
                key={index}
                className={`progress-segment ${index <= props.currentSlideIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Cartridge Container */}
          <div className="cartridge-container">
            {currentSlide.cartridge && (currentSlide.cartridge.type === 'FractionAlpha' || currentSlide.cartridge.type === 'FractionSlicer' || currentSlide.cartridge.type === 'SwipeSorter' || currentSlide.cartridge.type === 'PEMDAS' || currentSlide.cartridge.type === 'Potiondas') && (
              <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                {currentSlide.cartridge.type === 'FractionAlpha' && (
                  <FractionAlpha config={currentSlide.cartridge.config} preview={true} />
                )}
                {currentSlide.cartridge.type === 'FractionSlicer' && (
                  <FractionSlicer config={currentSlide.cartridge.config} preview={true} />
                )}
                {currentSlide.cartridge.type === 'SwipeSorter' && (
                  <SwipeSorter config={currentSlide.cartridge.config} preview={true} />
                )}
                {currentSlide.cartridge.type === 'PEMDAS' && (
                  <PEMDASCartridge config={currentSlide.cartridge.config} preview={true} />
                )}
                {currentSlide.cartridge.type === 'Potiondas' && (
                  <PotiondasThumbnail config={currentSlide.cartridge.config} />
                )}
              </div>
            )}
          </div>

          {currentSlide.elements.map((element, elementIndex) => {
            // In translation mode, show draft content for text/balloon/quiz elements
            let displayElement = element;
            if (state.translationMode) {
              const draft = state.translationMode.draft[currentSlide.id]?.[element.id];
              if (draft && (element.type === 'text' || element.type === 'balloon')) {
                displayElement = { ...element, content: draft.content };
              }
              if (draft && element.type === 'quiz') {
                displayElement = {
                  ...element,
                  metadata: {
                    ...element.metadata,
                    ...(draft.options && { options: draft.options }),
                    ...(draft.matchAnswers && { matchAnswers: draft.matchAnswers }),
                    ...(draft.chatNodes && { chatNodes: draft.chatNodes }),
                  }
                };
              }
            }
            return (
              <Sticker
                key={`${element.id}-${state.translationMode ? state.translationMode.lang : 'base'}`}
                element={displayElement}
                elementIndex={elementIndex}
                isSelected={state.selectedElementIds?.includes(element.id) || element.id === selectedElementId}
                onSelect={handleSelect}
                onChange={handleChange}
                onEdit={() => handleEdit(element.id)}
                onDelete={handleDelete}
                translationMode={state.translationMode || false}
              />
            );
          })}
        </div>

        {/* Stripper Draggable Pointers (OUTSIDE slide-canvas, inside relative wrapper) */}
        {currentSlide?.stripper?.enabled && currentSlide.stripper.dividers?.map((divY, idx) => (
          <div
            key={`stripper-ptr-${idx}`}
            style={{
              position: 'absolute',
              top: `${divY}%`,
              right: '-32px',
              transform: 'translateY(-50%)',
              width: '28px',
              height: '28px',
              cursor: 'ns-resize',
              zIndex: 901,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const canvasEl = containerRef.current?.querySelector('.slide-canvas');
              if (!canvasEl) return;
              const rect = canvasEl.getBoundingClientRect();

              const onMove = (ev) => {
                const rawY = ((ev.clientY - rect.top) / rect.height) * 100;
                const clampedY = Math.max(5, Math.min(95, Math.round(rawY)));
                const newDividers = [...currentSlide.stripper.dividers];
                newDividers[idx] = clampedY;
                newDividers.sort((a, b) => a - b);
                dispatch({
                  type: 'UPDATE_SLIDE',
                  payload: { stripper: { ...currentSlide.stripper, dividers: newDividers } }
                });
              };

              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };

              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const canvasEl = containerRef.current?.querySelector('.slide-canvas');
              if (!canvasEl) return;
              const rect = canvasEl.getBoundingClientRect();

              const onMove = (ev) => {
                const touch = ev.touches[0];
                const rawY = ((touch.clientY - rect.top) / rect.height) * 100;
                const clampedY = Math.max(5, Math.min(95, Math.round(rawY)));
                const newDividers = [...currentSlide.stripper.dividers];
                newDividers[idx] = clampedY;
                newDividers.sort((a, b) => a - b);
                dispatch({
                  type: 'UPDATE_SLIDE',
                  payload: { stripper: { ...currentSlide.stripper, dividers: newDividers } }
                });
              };

              const onEnd = () => {
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
              };

              window.addEventListener('touchmove', onMove, { passive: false });
              window.addEventListener('touchend', onEnd);
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
              <path d="M4,12 L16,4 L16,20 Z" fill="rgba(80,80,100,0.75)" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Canvas;
