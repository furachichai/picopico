import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../context/EditorContext';
import QuizPlayer from './QuizPlayer';
import MinigamePlayer from './MinigamePlayer';
import FractionAlpha from '../../cartridges/FractionAlpha/FractionAlpha';
import FractionSlicer from '../../cartridges/FractionSlicer/FractionSlicer';
import Balloon from '../Editor/Balloon';
import ErrorBoundary from '../ErrorBoundary';
import { X, Pencil } from 'lucide-react';
import './Player.css';

const Player = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const { lesson } = state;

    // Initialize index based on the currentSlideId in global state (set by DiscoverView)
    const initialIndex = lesson.slides.findIndex(s => s.id === state.currentSlideId);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(initialIndex !== -1 ? initialIndex : 0);
    const touchStartRef = useRef(null);
    const [isGameActive, setIsGameActive] = useState(false); // Enable/Disable navigation

    const slides = lesson.slides;
    const currentSlide = slides[currentSlideIndex];

    // Check if current slide has a cartridge and enable game mode
    useEffect(() => {
        if (currentSlide?.cartridge) {
            setIsGameActive(true);
        } else {
            setIsGameActive(false);
        }
    }, [currentSlide]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isGameActive && currentSlide?.cartridge) return; // Block nav keys

            if (e.key === 'ArrowRight') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'Escape') {
                dispatch({ type: 'TOGGLE_PREVIEW' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlideIndex, isGameActive, currentSlide]);

    const nextSlide = () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    const handleTouchStart = (e) => {
        // Skip if the touch originated from a slider handle (let slider handle its own drag)
        const target = e.target;
        if (target.closest('.slider-handle') || target.closest('.slider-player-container')) {
            touchStartRef.current = null; // Clear any previous value
            return;
        }
        touchStartRef.current = e.touches ? e.touches[0].clientX : e.clientX;
    };

    const handleTouchEnd = (e) => {
        if (isGameActive && currentSlide?.cartridge) return; // Block swipes

        if (!touchStartRef.current) return;
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const diff = touchStartRef.current - clientX;

        if (diff > 50) { // Swipe Left -> Next
            nextSlide();
        } else if (diff < -50) { // Swipe Right -> Prev
            prevSlide();
        }
        touchStartRef.current = null;
    };

    const [banner, setBanner] = useState(null); // { type: 'correct' | 'fail', text: string }
    const [scale, setScale] = useState(1);
    const viewportRef = useRef(null);

    const handleBanner = (type, text) => {
        setBanner({ type, text });
    };

    // Clear banner when slide changes
    useEffect(() => {
        setBanner(null);
    }, [currentSlideIndex]);

    // Handle responsive scaling
    useEffect(() => {
        const updateScale = () => {
            if (!viewportRef.current) return;
            const { width, height } = viewportRef.current.getBoundingClientRect();
            // Target resolution: 360x640
            // No padding needed for player usually, or minimal
            const scaleX = width / 360;
            const scaleY = height / 640;

            // Use the smaller scale to fit entirely (contain)
            const newScale = Math.min(scaleX, scaleY);
            setScale(newScale);
        };

        const observer = new ResizeObserver(updateScale);
        if (viewportRef.current) {
            observer.observe(viewportRef.current);
            updateScale(); // Initial calculation
        }

        return () => observer.disconnect();
    }, []);

    const progress = ((currentSlideIndex + 1) / lesson.slides.length) * 100;

    const handleMenu = async () => {
        // Attempt to keep/restore fullscreen on return
        try {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                } else if (elem.webkitRequestFullscreen) {
                    await elem.webkitRequestFullscreen();
                } else if (elem.msRequestFullscreen) {
                    await elem.msRequestFullscreen();
                }
            }
        } catch (err) {
            // Ignore (user might have actively exited or browser denied)
        }
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
    };

    return (
        <div className="player-container">

            {/* Removed external player-header */}

            <div
                className="player-viewport"
                ref={viewportRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
            >
                {/* Controls Overlay - Matches Slide Dimensions */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '360px',
                    height: '640px',
                    marginTop: '-320px',
                    marginLeft: '-180px',
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    pointerEvents: 'none', // Pass clicks through
                    zIndex: 2000
                }}>
                    {/* Navigation Buttons */}
                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        pointerEvents: 'auto' // Re-enable clicks
                    }}>
                        <button
                            onClick={handleMenu}
                            title={t('player.menu')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '50%',
                                width: '44px',
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#334155' }}>
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </button>
                    </div>

                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        pointerEvents: 'auto'
                    }}>
                        <button
                            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'editor' })}
                            title={t('common.edit')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '50%',
                                width: '44px',
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#334155' }}>
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {banner && (
                    <div className={`player-banner ${banner.type}-banner`}>
                        {banner.text}
                    </div>
                )}

                {/* Render all slides with transition classes */}
                {slides.map((slide, index) => {
                    let positionClass = 'slide-hidden';
                    if (index === currentSlideIndex) positionClass = 'slide-active';
                    else if (index === currentSlideIndex + 1) positionClass = 'slide-next';
                    else if (index === currentSlideIndex - 1) positionClass = 'slide-prev';

                    // Only render current, prev, and next to save resources (optional, but good for large decks)
                    // For now, render all if deck is small, or just neighbors
                    if (Math.abs(index - currentSlideIndex) > 1) return null;

                    return (
                        <div
                            key={slide.id}
                            className={`player-slide ${positionClass}`}
                            style={{
                                backgroundColor: (slide.background && !slide.background.includes('url') && !slide.background.includes('gradient')) ? slide.background : 'transparent',
                                backgroundImage: (slide.background && (slide.background.includes('url') || slide.background.includes('gradient'))) ? slide.background : 'none',
                                backgroundSize: 'contain', // Ensure whole image is visible
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                transformOrigin: 'center center',
                                width: '360px',
                                height: '640px',
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-320px', /* Half of height */
                                marginLeft: '-180px', /* Half of width */
                                '--scale': scale, // Pass scale as variable if needed or apply directly
                                transform: positionClass === 'slide-active'
                                    ? `translateX(0) scale(${scale})`
                                    : positionClass === 'slide-next'
                                        ? `translateX(100vw) scale(${scale})`
                                        : `translateX(-100vw) scale(${scale})`
                            }}
                        >
                            <div className="player-progress-bar">
                                {slides.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`progress-segment ${i <= currentSlideIndex ? 'active' : ''}`}
                                    />
                                ))}
                            </div>

                            {/* Cartridge Layer - Below Stickers but above background */}
                            {slide.cartridge && (
                                <div className="cartridge-container" style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'auto'
                                }}>
                                    {slide.cartridge.type === 'FractionAlpha' && (
                                        <FractionAlpha
                                            config={slide.cartridge.config}
                                            onComplete={() => {
                                                setIsGameActive(false);
                                                nextSlide();
                                            }}
                                        />
                                    )}
                                    {slide.cartridge.type === 'FractionSlicer' && (
                                        <ErrorBoundary>
                                            <FractionSlicer
                                                config={slide.cartridge.config}
                                                onComplete={() => {
                                                    setIsGameActive(false);
                                                    nextSlide();
                                                }}
                                            />
                                        </ErrorBoundary>
                                    )}
                                </div>
                            )}

                            {slide.elements.map(element => {
                                try {
                                    return (
                                        <div
                                            key={element.id}
                                            className="player-element"
                                            style={{
                                                left: `${element.x}%`,
                                                top: `${element.y}%`,
                                                left: `${element.x}%`,
                                                top: `${element.y}%`,
                                                width: element.type === 'quiz' ? '360px' : `${element.width}%`,
                                                height: element.type === 'quiz' ? 'auto' : `${element.height}%`,
                                                transform: `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${element.scale * (element.metadata?.flipX ? -1 : 1)}, ${element.scale * (element.metadata?.flipY ? -1 : 1)})`,
                                                zIndex: 10, // Ensure stickers render above cartridge (zIndex: 1)
                                            }}
                                        >
                                            {element.type === 'text' && (
                                                <div
                                                    className="player-text"
                                                    style={{
                                                        fontFamily: element.metadata?.fontFamily || 'Nunito',
                                                        fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : '16px',
                                                        color: element.metadata?.color || 'black',
                                                        backgroundColor: element.metadata?.backgroundColor || 'transparent',
                                                        padding: element.metadata?.backgroundColor ? '0.5rem' : '0',
                                                        borderRadius: element.metadata?.borderRadius || '8px',
                                                        border: element.metadata?.border || 'none',
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    {element.content}
                                                </div>
                                            )}
                                            {element.type === 'image' && <img src={element.content} alt="content" />}
                                            {element.type === 'quiz' && (
                                                <QuizPlayer
                                                    data={element}
                                                    onNext={nextSlide}
                                                    onBanner={handleBanner}
                                                />
                                            )}
                                            {element.type === 'game' && <MinigamePlayer data={element} />}
                                            {element.type === 'balloon' && (
                                                <Balloon
                                                    element={element}
                                                    readOnly={true}
                                                />
                                            )}
                                        </div>
                                    );
                                } catch (err) {
                                    console.error('Failed to render element:', element, err);
                                    return null;
                                }
                            })}
                        </div>
                    );
                })}
            </div>
            {/* End of render loop */}

            <div className="player-controls-hint">
                {t('player.hint')}
            </div>
        </div>
    );
};

export default Player;
