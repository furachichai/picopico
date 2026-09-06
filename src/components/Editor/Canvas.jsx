import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { resolveAssetUrl } from '../../utils/assetUrl';
import Sticker from './Sticker';
import FractionAlpha from '../../cartridges/FractionAlpha/FractionAlpha';
import FractionSlicer from '../../cartridges/FractionSlicer/FractionSlicer';
import SwipeSorter from '../../cartridges/SwipeSorter/SwipeSorter';
import PEMDASCartridge from '../../cartridges/PEMDAS/PEMDASCartridge';
import AlgeBrosCartridge from '../../cartridges/AlgeBros/AlgeBrosCartridge';
import BalanzaCartridge from '../../cartridges/Balanza/BalanzaCartridge';
import Potiondas from '../../cartridges/Potiondas/Potiondas';
import { PotiondasThumbnail } from './SlideThumbnail';
import SaveAssetModal from './SaveAssetModal';

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
  const canvasRef = useRef(null);
  const marqueeRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [marquee, setMarquee] = useState(null);

  // Ingestion & Dropzone states
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalData, setSaveModalData] = useState({
    items: [],
    createdElementIds: [],
    initialCategory: 'characters'
  });

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
      // Text/balloon/collectible content is translatable
      if ((el.type === 'text' || el.type === 'balloon' || el.type === 'collectible') && 'content' in updates) {
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
      }

      // Allow styling/formatting updates to pass through globally to the baseline element metadata
      if (updates.metadata) {
        const filteredMetadata = { ...updates.metadata };
        // Exclude translatable fields from global metadata updates in translation mode
        delete filteredMetadata.options;
        delete filteredMetadata.matchAnswers;
        delete filteredMetadata.chatNodes;
        // Exclude layout positioning properties in metadata (e.g. bubble tail position)
        delete filteredMetadata.tailPos;
        delete filteredMetadata.locked;

        if (Object.keys(filteredMetadata).length > 0) {
          dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              id,
              updates: { metadata: filteredMetadata }
            }
          });
        }
      }
      return;
    }
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } });
  }, [dispatch, state.translationMode, currentSlide]);

  const handlePointerDown = useCallback((e) => {
    // If the click is inside a sticker, let it handle its own interaction
    if (e.target.closest('.sticker')) {
      return;
    }
    
    // Determine initial selection
    const isMultiSelectModifier = e.shiftKey || e.metaKey || e.ctrlKey;
    
    // If the click is inside a cartridge, select it and don't start lasso
    if (e.target.closest('.cartridge-container')) {
      if (currentSlide?.cartridge) {
        dispatch({ type: 'SELECT_ELEMENT', payload: 'cartridge' });
      }
      return;
    }
    
    // Prevent default if it's mouse to avoid text selection during drag
    if (e.pointerType === 'mouse') {
      e.preventDefault();
    }
    
    e.stopPropagation();

    let baseSelection = [];
    if (isMultiSelectModifier && state.selectedElementIds) {
      baseSelection = [...state.selectedElementIds];
    } else {
      dispatch({ type: 'SELECT_ELEMENT', payload: null });
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const startX = ((e.clientX - rect.left) / rect.width) * 100;
    const startY = ((e.clientY - rect.top) / rect.height) * 100;

    const startMarquee = { startX, startY, endX: startX, endY: startY };
    setMarquee(startMarquee);
    marqueeRef.current = startMarquee;

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      if (!marqueeRef.current) return;
      const currentX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const currentY = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      const newMarquee = { ...marqueeRef.current, endX: currentX, endY: currentY };
      marqueeRef.current = newMarquee;
      setMarquee(newMarquee);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      
      const finalMarquee = marqueeRef.current;
      setMarquee(null);
      marqueeRef.current = null;
      
      if (!finalMarquee) return;
      
      const left = Math.min(finalMarquee.startX, finalMarquee.endX);
      const right = Math.max(finalMarquee.startX, finalMarquee.endX);
      const top = Math.min(finalMarquee.startY, finalMarquee.endY);
      const bottom = Math.max(finalMarquee.startY, finalMarquee.endY);
      
      if (right - left > 1 || bottom - top > 1) {
          const intersectedIds = currentSlide?.elements.filter(el => {
              const w = el.width || 20;
              const h = el.height || 20;
              const elLeft = el.x - (w / 2);
              const elRight = el.x + (w / 2);
              const elTop = el.y - (h / 2);
              const elBottom = el.y + (h / 2);
              
              return !(elRight < left || elLeft > right || elBottom < top || elTop > bottom);
          }).map(el => el.id) || [];
          
          if (intersectedIds.length > 0) {
              const newSelection = Array.from(new Set([...baseSelection, ...intersectedIds]));
              dispatch({ type: 'SELECT_ELEMENTS', payload: newSelection });
          }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [dispatch, currentSlide, state.selectedElementIds]);

  const handleIngestImages = useCallback(async (files, dropCoords = null) => {
    const validFiles = Array.from(files).filter(f => f && f.type && f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    // Read all files asynchronously and get their dimensions
    const readAndLoad = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          const img = new Image();
          img.onload = () => {
            resolve({
              file,
              dataUrl,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              filename: file.name || 'image'
            });
          };
          img.onerror = () => {
            resolve({
              file,
              dataUrl,
              naturalWidth: 400,
              naturalHeight: 400,
              filename: file.name || 'image'
            });
          };
          img.src = dataUrl;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    };

    const loadedImages = (await Promise.all(validFiles.map(readAndLoad))).filter(Boolean);
    if (loadedImages.length === 0) return;

    const baseX = dropCoords ? dropCoords.x : 50;
    const baseY = dropCoords ? dropCoords.y : 50;

    const elementIds = [];
    const modalItems = [];

    loadedImages.forEach((item, idx) => {
      const newElementId = `el-${Date.now()}-${idx}`;
      elementIds.push(newElementId);

      const aspectRatio = (item.naturalWidth && item.naturalHeight) ? (item.naturalWidth / item.naturalHeight) : 1;
      const targetWidthPercent = 40;
      const targetWidthPx = 360 * (targetWidthPercent / 100);
      const targetHeightPx = targetWidthPx / aspectRatio;
      const targetHeightPercent = (targetHeightPx / 640) * 100;

      // Stagger slightly if multiple items dropped at once
      const offset = loadedImages.length > 1 ? (idx * 4 - (loadedImages.length - 1) * 2) : 0;
      const posX = dropCoords
        ? Math.max(0, Math.min(100 - targetWidthPercent, (baseX + offset) - targetWidthPercent / 2))
        : Math.max(0, Math.min(100 - targetWidthPercent, 30 + (idx * 5)));
      const posY = dropCoords
        ? Math.max(0, Math.min(100 - targetHeightPercent, (baseY + offset) - targetHeightPercent / 2))
        : Math.max(0, Math.min(100 - targetHeightPercent, 30 + (idx * 5)));

      dispatch({
        type: 'ADD_ELEMENT',
        payload: {
          id: newElementId,
          type: 'image',
          content: item.dataUrl,
          x: posX,
          y: posY,
          metadata: {
            width: targetWidthPercent,
            height: targetHeightPercent
          }
        }
      });

      modalItems.push({
        dataUrl: item.dataUrl,
        filename: item.filename,
        dimensions: { width: item.naturalWidth, height: item.naturalHeight }
      });
    });

    // Check saved category or smart suggestion from filenames
    let savedCat = null;
    try {
      savedCat = localStorage.getItem('picopico_last_save_category');
    } catch {
      // ignore
    }

    let cat = savedCat || 'characters';
    if (!savedCat) {
      const hasObjectNames = loadedImages.some(img => {
        const fname = img.filename.toLowerCase();
        return (
          fname.startsWith('whole_') ||
          fname.startsWith('part_') ||
          fname.startsWith('item_') ||
          fname.includes('soup') ||
          fname.includes('counter') ||
          fname.includes('bowl') ||
          fname.includes('prop')
        );
      });

      if (hasObjectNames) {
        cat = 'objects';
      } else if (loadedImages.some(img => img.filename.toLowerCase().includes('bg') || img.filename.toLowerCase().includes('background'))) {
        cat = 'backgrounds';
      }
    }

    setSaveModalData({
      items: modalItems,
      createdElementIds: elementIds,
      initialCategory: cat
    });
    setSaveModalOpen(true);
  }, [dispatch]);

  // Global paste handler for images
  useEffect(() => {
    const handlePaste = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable ||
        activeEl.closest?.('[contenteditable="true"]')
      );
      if (isInput) return;

      if (e.clipboardData && e.clipboardData.items) {
        const pasteFiles = [];
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) pasteFiles.push(file);
          }
        }
        if (pasteFiles.length > 0) {
          e.preventDefault();
          handleIngestImages(pasteFiles);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleIngestImages]);

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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dropX = ((e.clientX - rect.left) / rect.width) * 100;
    const dropY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check for internal library drag data FIRST — browsers also populate
    // e.dataTransfer.files when dragging <img> elements, which would
    // incorrectly trigger the desktop-file ingestion path.
    const rawData = e.dataTransfer.getData('application/json');
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed.src) {
          const src = parsed.src;
          const img = new Image();
          img.onload = () => {
            const aspectRatio = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 1;
            const targetWidthPercent = 40;
            const targetWidthPx = 360 * (targetWidthPercent / 100);
            const targetHeightPx = targetWidthPx / aspectRatio;
            const targetHeightPercent = (targetHeightPx / 640) * 100;

            dispatch({
              type: 'ADD_ELEMENT',
              payload: {
                type: 'image',
                content: src,
                x: Math.max(0, Math.min(100 - targetWidthPercent, dropX - targetWidthPercent / 2)),
                y: Math.max(0, Math.min(100 - targetHeightPercent, dropY - targetHeightPercent / 2)),
                metadata: {
                  width: targetWidthPercent,
                  height: targetHeightPercent,
                  ...(parsed.category && { category: parsed.category })
                }
              }
            });
          };
          img.onerror = () => {
            dispatch({
              type: 'ADD_ELEMENT',
              payload: {
                type: 'image',
                content: src,
                x: Math.max(0, dropX - 20),
                y: Math.max(0, dropY - 20),
                metadata: { width: 40, height: 40, ...(parsed.category && { category: parsed.category }) }
              }
            });
          };
          img.src = src;
          return;
        }
      } catch (err) {
        // ignore, fall through
      }
    }

    // Check for text/plain fallback (e.g. URL dragged from text)
    const textSrc = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (textSrc && (textSrc.startsWith('/') || textSrc.startsWith('http'))) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : 1;
        const targetWidthPercent = 40;
        const targetWidthPx = 360 * (targetWidthPercent / 100);
        const targetHeightPx = targetWidthPx / aspectRatio;
        const targetHeightPercent = (targetHeightPx / 640) * 100;

        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            type: 'image',
            content: textSrc,
            x: Math.max(0, Math.min(100 - targetWidthPercent, dropX - targetWidthPercent / 2)),
            y: Math.max(0, Math.min(100 - targetHeightPercent, dropY - targetHeightPercent / 2)),
            metadata: {
              width: targetWidthPercent,
              height: targetHeightPercent
            }
          }
        });
      };
      img.onerror = () => {
        dispatch({
          type: 'ADD_ELEMENT',
          payload: {
            type: 'image',
            content: textSrc,
            x: Math.max(0, dropX - 20),
            y: Math.max(0, dropY - 20),
            metadata: { width: 40, height: 40 }
          }
        });
      };
      img.src = textSrc;
      return;
    }

    // Native dragged files from desktop / Finder (only if no internal data)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imgFiles = Array.from(e.dataTransfer.files).filter(f => f && f.type && f.type.startsWith('image/'));
      if (imgFiles.length > 0) {
        handleIngestImages(imgFiles, { x: dropX, y: dropY });
        return;
      }
    }
  }, [dispatch, handleIngestImages]);

  const handleSaveAssetSuccess = (savedResult) => {
    setSaveModalOpen(false);
    const results = Array.isArray(savedResult) ? savedResult : (savedResult ? [savedResult] : []);
    results.forEach((res, idx) => {
      const elId = saveModalData.createdElementIds?.[idx] || (idx === 0 ? saveModalData.createdElementId : null);
      if (res?.url && elId) {
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            id: elId,
            updates: {
              content: res.url
            }
          }
        });
      }
    });

    if (results.length > 0) {
      try {
        window.dispatchEvent(new CustomEvent('picopico-asset-saved', { detail: results }));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="canvas-container" ref={containerRef}>
      {/* Wrapper: position:relative so pointers can sit outside the overflow:hidden canvas */}
      <div style={{ position: 'relative', width: '360px', height: '640px', flexShrink: 0 }}>
        <div
          ref={canvasRef}
          className="slide-canvas"
          style={{
            width: '360px',
            height: '640px',
            overflow: 'hidden',
            position: 'relative'
          }}
          onPointerDown={handlePointerDown}
          onDragOver={(e) => {
            e.preventDefault();
            if (e.dataTransfer.types.includes('Files')) {
              setIsDraggingOver(true);
            }
          }}
          onDragLeave={(e) => {
            if (canvasRef.current && !canvasRef.current.contains(e.relatedTarget)) {
              setIsDraggingOver(false);
            }
          }}
          onDrop={handleDrop}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Dropzone visual indicator */}
          {isDraggingOver && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, width: '100%', height: '100%',
              border: '3px dashed #8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              backdropFilter: 'blur(2px)'
            }}>
              <div style={{
                background: '#8b5cf6',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '24px',
                fontWeight: '700',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '0.95rem',
                boxShadow: '0 6px 16px rgba(139, 92, 246, 0.4)'
              }}>
                📥 Drop Image Here to Add
              </div>
            </div>
          )}
          {/* Background Layer */}
          {currentSlide?.background && (currentSlide.background.includes('url') || currentSlide.background.includes('gradient')) && (
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                zIndex: 0,
                pointerEvents: 'none'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 0, width: '100%', height: '100%',
                  backgroundImage: currentSlide.background ? resolveAssetUrl(currentSlide.background) : currentSlide.background,
                  backgroundSize: currentSlide.backgroundSettings?.sizeMode === 'custom'
                    ? `${currentSlide.backgroundSettings?.size ?? 100}%`
                    : (currentSlide.backgroundSettings?.sizeMode || 'cover'),
                  backgroundPosition: `${currentSlide.backgroundSettings?.positionX ?? 50}% ${currentSlide.backgroundSettings?.positionY ?? 50}%`,
                  backgroundRepeat: 'no-repeat',
                  opacity: currentSlide.backgroundSettings?.opacity ?? 1,
                  filter: `grayscale(${currentSlide.backgroundSettings?.grayscale ? 100 : 0}%) brightness(${currentSlide.backgroundSettings?.brightness ?? 100}%)`,
                  transform: `scale(${currentSlide.backgroundSettings?.flipX ? -1 : 1}, ${currentSlide.backgroundSettings?.flipY ? -1 : 1})`
                }}
              />
              {currentSlide.backgroundSettings?.grayscale && currentSlide.backgroundSettings?.tintColor && currentSlide.backgroundSettings.tintColor !== 'transparent' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: currentSlide.backgroundSettings.tintColor,
                    mixBlendMode: 'color'
                  }}
                />
              )}
            </div>
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

          {/* Marquee Selection Box */}
          {marquee && (
            <div style={{
              position: 'absolute',
              border: '1px dashed #3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              pointerEvents: 'none',
              zIndex: 9999,
              left: `${Math.min(marquee.startX, marquee.endX)}%`,
              top: `${Math.min(marquee.startY, marquee.endY)}%`,
              width: `${Math.abs(marquee.endX - marquee.startX)}%`,
              height: `${Math.abs(marquee.endY - marquee.startY)}%`,
            }} />
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
            {currentSlide.cartridge && (currentSlide.cartridge.type === 'FractionAlpha' || currentSlide.cartridge.type === 'FractionSlicer' || currentSlide.cartridge.type === 'SwipeSorter' || currentSlide.cartridge.type === 'PEMDAS' || currentSlide.cartridge.type === 'Potiondas' || currentSlide.cartridge.type === 'AlgeBros' || currentSlide.cartridge.type === 'Balanza') && (
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
                {currentSlide.cartridge.type === 'AlgeBros' && (
                  <AlgeBrosCartridge config={currentSlide.cartridge.config} preview={true} />
                )}
                {currentSlide.cartridge.type === 'Balanza' && (
                  <BalanzaCartridge
                    config={currentSlide.cartridge.config}
                    preview={true}
                    isSelected={state.selectedElementId === 'cartridge'}
                    onSelect={() => dispatch({ type: 'SELECT_ELEMENT', payload: 'cartridge' })}
                    onConfigChange={(newConfig) => {
                      dispatch({ type: 'SAVE_HISTORY' });
                      dispatch({
                        type: 'UPDATE_SLIDE',
                        payload: {
                          cartridge: {
                            ...currentSlide.cartridge,
                            config: {
                              ...currentSlide.cartridge.config,
                              ...newConfig
                            }
                          }
                        }
                      });
                    }}
                  />
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
              if (draft && (element.type === 'text' || element.type === 'balloon' || element.type === 'collectible')) {
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
                onMoveMultiple={(ids, dx, dy) => dispatch({ type: 'MOVE_ELEMENTS', payload: { ids, dx, dy } })}
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

      {/* Save Asset Modal for Pasted / Dropped Images */}
      <SaveAssetModal
        isOpen={saveModalOpen}
        items={saveModalData.items}
        initialCategory={saveModalData.initialCategory}
        onSave={handleSaveAssetSuccess}
        onCancel={() => setSaveModalOpen(false)}
      />
    </div>
  );
};

export default Canvas;
