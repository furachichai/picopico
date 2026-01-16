import React, { useRef, useEffect, useState } from 'react';
import Sticker from './Sticker';

const SlideThumbnail = ({ slide, width = '100%', height = '100%' }) => {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);

    // Base resolution for the slide (matching Canvas.jsx)
    const BASE_WIDTH = 360;
    const BASE_HEIGHT = 640;

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();

            const scaleX = containerWidth / BASE_WIDTH;
            const scaleY = containerHeight / BASE_HEIGHT;

            // Use the smaller scale to fit entirely within the container
            setScale(Math.min(scaleX, scaleY));
        };

        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) {
            observer.observe(containerRef.current);
            updateScale();
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width,
                height,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#eee' // Placeholder background
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${BASE_WIDTH}px`,
                    height: `${BASE_HEIGHT}px`,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    transformOrigin: 'center center',
                    backgroundColor: 'white', // Base layer is always white
                    pointerEvents: 'none' // Disable interactions
                }}
            >
                {/* Background Layer */}
                {slide.background && (slide.background.includes('url') || slide.background.includes('gradient')) && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundImage: slide.background,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            zIndex: 0,
                            opacity: slide.backgroundSettings?.opacity ?? 1,
                            filter: `brightness(${slide.backgroundSettings?.brightness ?? 100}%)`,
                            transform: `scale(${slide.backgroundSettings?.flipX ? -1 : 1}, ${slide.backgroundSettings?.flipY ? -1 : 1})`,
                        }}
                    />
                )}
                {slide.background && !slide.background.includes('url') && !slide.background.includes('gradient') && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: slide.background,
                            zIndex: 0
                        }}
                    />
                )}
                {slide.elements.map(element => (
                    <Sticker
                        key={element.id}
                        element={element}
                        isSelected={false}
                        readOnly={true} // Assuming Sticker might support this or we just pass no-ops
                        onSelect={() => { }}
                        onChange={() => { }}
                        onEdit={() => { }}
                        onDelete={() => { }}
                    />
                ))}
            </div>
        </div>
    );
};

export default SlideThumbnail;
