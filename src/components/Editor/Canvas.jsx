import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import Sticker from './Sticker';

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
    if (e.target === e.currentTarget) {
      dispatch({ type: 'SELECT_ELEMENT', payload: null });
    }
  }, [dispatch]);

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
          background: currentSlide.background,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: '360px',
          height: '640px'
        }}
        onClick={handleCanvasClick}
      >
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
