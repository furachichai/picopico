import React, { useRef, useState, useEffect } from 'react';
import SlideThumbnail from '../Editor/SlideThumbnail';

/**
 * TitlecardCircleFrame / LessonCardArtwork
 * Renders the lesson's titlecard artwork focused via zoom and drag offsets.
 * Supports:
 * - shape="square" (default): fills the square lesson button (100% width/height or custom size)
 * - shape="circle": circle frame with circular border
 */
const TitlecardCircleFrame = ({
  slide,
  titlecardFrame,
  icon = 'icon_textbook.png',
  cardColor = '#8B5CF6',
  size = null, // if null, fills 100% of parent container!
  shape = 'square', // 'square' | 'circle'
  borderRadius = null,
  style = {},
  className = ''
}) => {
  const containerRef = useRef(null);
  const [measuredSize, setMeasuredSize] = useState(size || 180);

  useEffect(() => {
    if (size) return;
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        if (w > 0) setMeasuredSize(w);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [size]);

  const activeSize = size || measuredSize;

  const hasSlide = slide && (
    slide.background ||
    (slide.elements && slide.elements.length > 0) ||
    slide.cartridge
  );

  const useIcon = titlecardFrame?.useIcon || (!hasSlide && !titlecardFrame);

  if (useIcon || !hasSlide) {
    return (
      <div
        ref={containerRef}
        className={`lesson-card-artwork fallback-icon ${className}`}
        style={{
          width: size ? `${size}px` : '100%',
          height: size ? `${size}px` : '100%',
          borderRadius: shape === 'circle' ? '50%' : (borderRadius || '0px'),
          backgroundColor: cardColor || '#8B5CF6',
          border: shape === 'circle' ? '2.5px solid #000000' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: size ? 'relative' : 'absolute',
          inset: size ? 'auto' : 0,
          paddingBottom: shape === 'square' && !size ? '34%' : 0, // avoid overlapping bottom third
          boxSizing: 'border-box',
          pointerEvents: 'none',
          ...style
        }}
      >
        <img
          src={`/assets/graphics/${icon || 'icon_textbook.png'}`}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            width: shape === 'circle' ? '70%' : '48%',
            height: shape === 'circle' ? '70%' : '48%',
            objectFit: 'contain'
          }}
        />
      </div>
    );
  }

  const zoom = Math.max(0.4, titlecardFrame?.zoom || 1);
  const x = titlecardFrame?.x || 0; // percentage of container width
  const y = titlecardFrame?.y || 0; // percentage of container height

  // Base cover scale: slide is 360x640, frame is activeSize x activeSize.
  // Slight 1% overshoot ensures subpixel rounding in WebKit/Blink never creates a 1px edge seam.
  const baseScale = (activeSize / 360) * zoom * 1.01;
  const scaledWidth = 360 * baseScale;
  const scaledHeight = 640 * baseScale;

  // Maximum allowed pan offset so image fits cleanly within or fully covers boundaries
  const maxOffsetX = Math.abs(scaledWidth - activeSize) / 2;
  const maxOffsetY = Math.abs(scaledHeight - activeSize) / 2;

  const rawOffsetX = (x / 100) * activeSize;
  const rawOffsetY = (y / 100) * activeSize;

  // Clamp offsets so artwork fits cleanly within the frame
  const offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawOffsetX));
  const offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawOffsetY));

  return (
    <div
      ref={containerRef}
      className={`lesson-card-artwork ${className}`}
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        borderRadius: shape === 'circle' ? '50%' : (borderRadius || 'inherit'),
        backgroundColor: cardColor || '#8B5CF6',
        border: shape === 'circle' ? '2.5px solid #000000' : 'none',
        overflow: 'hidden',
        position: size ? 'relative' : 'absolute',
        inset: size ? 'auto' : 0,
        boxSizing: 'border-box',
        pointerEvents: 'none',
        ...style
      }}
    >
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
    </div>
  );
};

export default TitlecardCircleFrame;
