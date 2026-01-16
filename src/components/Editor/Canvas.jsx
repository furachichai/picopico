import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import Sticker from './Sticker';
import FractionAlpha from '../../cartridges/FractionAlpha/FractionAlpha';
import FractionSlicer from '../../cartridges/FractionSlicer/FractionSlicer';
import SwipeSorter from '../../cartridges/SwipeSorter/SwipeSorter';

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
  const handleSelect = useCallback((id) => {
    dispatch({ type: 'SELECT_ELEMENT', payload: id });
  }, [dispatch]);

  // Stable callback for updating an element
  const handleChange = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } });
  }, [dispatch]);

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
      <div
        className="slide-canvas"
        style={{
          width: '360px',
          height: '640px',
          overflow: 'hidden', // Added to contain background
          position: 'relative'
        }}
        onClick={handleCanvasClick}
      >
        {/* Background Layer */}
        {currentSlide?.background && (currentSlide.background.includes('url') || currentSlide.background.includes('gradient')) && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: currentSlide.background,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              zIndex: 0, // Behind content
              opacity: currentSlide.backgroundSettings?.opacity ?? 1,
              filter: `brightness(${currentSlide.backgroundSettings?.brightness ?? 100}%)`,
              transform: `scale(${currentSlide.backgroundSettings?.flipX ? -1 : 1}, ${currentSlide.backgroundSettings?.flipY ? -1 : 1})`,
              pointerEvents: 'none' // Click-through
            }}
          />
        )}
        {currentSlide?.background && !currentSlide.background.includes('url') && !currentSlide.background.includes('gradient') && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: currentSlide.background,
              zIndex: 0
            }}
          />
        )}
        {/* Progress Bar */}
        <div className="editor-progress-bar">
          {Array.from({ length: props.totalSlides }).map((_, index) => (
            <div
              key={index}
              className={`progress-segment ${index <= props.currentSlideIndex ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Cartridge Container - Lower layer */}
        {/* Cartridge Container - Lower layer */}
        <div className="cartridge-container">
          {currentSlide.cartridge && (currentSlide.cartridge.type === 'FractionAlpha' || currentSlide.cartridge.type === 'FractionSlicer' || currentSlide.cartridge.type === 'SwipeSorter') && (
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
            </div>
          )}
        </div>

        {currentSlide.elements.map(element => (
          <Sticker
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
            onSelect={handleSelect}
            onChange={handleChange}
            onEdit={() => handleEdit(element.id)}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
