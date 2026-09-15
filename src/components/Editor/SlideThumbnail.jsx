import React, { useRef, useEffect, useState } from 'react';
import { resolveAssetUrl } from '../../utils/assetUrl';
import Sticker from './Sticker';
import SwipeSorter from '../../cartridges/SwipeSorter/SwipeSorter';
import { deserializeLevels, DEFAULT_LEVELS } from '../../cartridges/Potiondas/Potiondas';
import ExloreNLCartridge from '../../cartridges/ExploreNL/ExloreNLCartridge';
import BalanzaCartridge from '../../cartridges/Balanza/BalanzaCartridge';

export const PotiondasThumbnail = ({ config }) => {
    let levels = DEFAULT_LEVELS;
    if (config?.levelsText) {
        try {
            const parsed = deserializeLevels(config.levelsText);
            if (parsed.length > 0) levels = parsed;
        } catch (e) {}
    }
    
    // Get first 3 levels
    const displayLevels = levels.slice(0, 3);
    
    return (
        <div style={{ 
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', gap: '8px', 
            background: 'linear-gradient(135deg, #0F0A2E, #1E1B4B)'
        }}>
            <div style={{ fontSize: '36px', opacity: 0.85 }}>🧪</div>
            <div style={{
                fontSize: '12px',
                fontWeight: '700',
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '4px'
            }}>POTIONDAS</div>
            {displayLevels.map((lv, i) => (
                <div key={i} style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    color: 'white',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    letterSpacing: '2px'
                }}>
                    {lv.ops.replace(/x/g, '×').replace(/\//g, '÷')}
                </div>
            ))}
            {levels.length > 3 && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px', fontWeight: 'bold' }}>+{levels.length - 3} more</div>
            )}
        </div>
    );
};

const SlideThumbnail = ({ slide, width = '100%', height = '100%', hideTextAndBalloons = false, hideTextAndShapes = false, cover = false }) => {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(cover ? 0.28 : 0.5);
    const shouldFilterText = hideTextAndBalloons || hideTextAndShapes;
    const shouldFilterShapes = hideTextAndShapes;

    // Base resolution for the slide (matching Canvas.jsx)
    const BASE_WIDTH = 360;
    const BASE_HEIGHT = 640;

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
            if (!containerWidth || !containerHeight) return;

            const scaleX = containerWidth / BASE_WIDTH;
            const scaleY = containerHeight / BASE_HEIGHT;

            if (cover) {
                // Cover mode + 6% overshoot to eliminate any letterboxing or top/bottom gap lines
                setScale(Math.max(scaleX, scaleY) * 1.06);
            } else {
                // Use the smaller scale to fit entirely within the container
                setScale(Math.min(scaleX, scaleY));
            }
        };

        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) {
            observer.observe(containerRef.current);
            updateScale();
        }

        return () => observer.disconnect();
    }, [cover]);

    const rawBg = slide?.background || '';
    const isColor = rawBg.startsWith('#') || rawBg.startsWith('rgb');
    const isUrlOrGradient = !isColor && (rawBg.includes('url(') || rawBg.includes('gradient') || rawBg.startsWith('/') || rawBg.startsWith('http') || rawBg.startsWith('data:'));
    const resolvedBg = isUrlOrGradient
        ? (rawBg.includes('url(') || rawBg.includes('gradient') ? resolveAssetUrl(rawBg) : `url("${resolveAssetUrl(rawBg)}")`)
        : rawBg;

    return (
        <div
            ref={containerRef}
            style={{
                width,
                height,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                pointerEvents: 'none'
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
                {isUrlOrGradient && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 0,
                            pointerEvents: 'none',
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundImage: resolvedBg,
                                backgroundSize: slide?.backgroundSettings?.sizeMode === 'custom'
                                    ? `${slide?.backgroundSettings?.size ?? 100}%`
                                    : (slide?.backgroundSettings?.sizeMode || 'cover'),
                                backgroundPosition: `${slide?.backgroundSettings?.positionX ?? 50}% ${slide?.backgroundSettings?.positionY ?? 50}%`,
                                backgroundRepeat: 'no-repeat',
                                opacity: slide?.backgroundSettings?.opacity ?? 1,
                                filter: `grayscale(${slide?.backgroundSettings?.grayscale ? 100 : 0}%) brightness(${slide?.backgroundSettings?.brightness ?? 100}%) blur(${slide?.backgroundSettings?.blur ?? 0}px)`,
                                transform: `scale(${(slide?.backgroundSettings?.flipX ? -1 : 1) * ((slide?.backgroundSettings?.blur ?? 0) > 0 ? 1.05 : 1)}, ${(slide?.backgroundSettings?.flipY ? -1 : 1) * ((slide?.backgroundSettings?.blur ?? 0) > 0 ? 1.05 : 1)})`,
                            }}
                        />
                        {slide?.backgroundSettings?.grayscale && slide?.backgroundSettings?.tintColor && slide?.backgroundSettings.tintColor !== 'transparent' && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: slide.backgroundSettings.tintColor,
                                    mixBlendMode: 'color'
                                }}
                            />
                        )}
                    </div>
                )}
                {!isUrlOrGradient && rawBg && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundColor: rawBg,
                            zIndex: 0
                        }}
                    />
                )}
                {slide.cartridge && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 30,
                            pointerEvents: 'none'
                        }}
                    >
                        {slide.cartridge.type === 'SwipeSorter' ? (
                            <SwipeSorter config={slide.cartridge.config} preview={true} />
                        ) : slide.cartridge.type === 'Potiondas' ? (
                            <PotiondasThumbnail config={slide.cartridge.config} />
                        ) : (slide.cartridge.type === 'ExploreNL' || slide.cartridge.type === 'ExloreNL') ? (
                            <ExloreNLCartridge config={slide.cartridge.config} preview={false} readOnly={true} />
                        ) : slide.cartridge.type === 'Balanza' ? (
                            <BalanzaCartridge config={slide.cartridge.config} />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <div style={{ fontSize: '48px', opacity: 0.7 }}>
                                    {slide.cartridge.type === 'FractionAlpha' && '🍕'}
                                    {slide.cartridge.type === 'FractionSlicer' && '🔪'}
                                    {slide.cartridge.type === 'PEMDAS' && '🧮'}
                                    {slide.cartridge.type === 'AlgeBros' && '📐'}
                                    {!['FractionAlpha', 'FractionSlicer', 'PEMDAS', 'Potiondas', 'SwipeSorter', 'AlgeBros', 'Balanza', 'ExploreNL', 'ExloreNL'].includes(slide.cartridge.type) && '🎮'}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    color: '#555',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    opacity: 0.7
                                }}>
                                    {slide.cartridge.type === 'FractionAlpha' && 'FRACTIONS'}
                                    {slide.cartridge.type === 'FractionSlicer' && 'SLICER'}
                                    {slide.cartridge.type === 'PEMDAS' && 'PEMDAS'}
                                    {slide.cartridge.type === 'AlgeBros' && 'algeBROS'}
                                    {slide.cartridge.type === 'Balanza' && 'BALANZA'}
                                    {(slide.cartridge.type === 'ExploreNL' || slide.cartridge.type === 'ExloreNL') && 'EXPLORENL'}
                                    {!['FractionAlpha', 'FractionSlicer', 'PEMDAS', 'Potiondas', 'SwipeSorter', 'AlgeBros', 'Balanza', 'ExploreNL', 'ExloreNL'].includes(slide.cartridge.type) && 'GAME'}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {(slide.elements || [])
                    .filter(el => {
                        if (shouldFilterText) {
                            if (['text', 'balloon', 'quiz', 'result_field', 'emoji'].includes(el.type)) {
                                return false;
                            }
                            if (['isticker', 'popup', 'game'].includes(el.type)) {
                                return false;
                            }
                        }
                        if (shouldFilterShapes) {
                            if (el.type === 'line' || el.type === 'number_line' || el.type === 'banner') {
                                return false;
                            }
                            if (el.metadata?.isSymbol || el.metadata?.symbolType || el.metadata?.isShape) {
                                return false;
                            }
                        }
                        return true;
                    })
                    .map((element, idx) => (
                    <Sticker
                        key={element.id}
                        element={element}
                        elementIndex={idx}
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
