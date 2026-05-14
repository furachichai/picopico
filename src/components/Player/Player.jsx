import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../context/EditorContext';
import { useLanguage } from '../../context/LanguageContext';
import QuizPlayer from './QuizPlayer';
import MinigamePlayer from './MinigamePlayer';
import FractionAlpha from '../../cartridges/FractionAlpha/FractionAlpha';
import FractionSlicer from '../../cartridges/FractionSlicer/FractionSlicer';
import SwipeSorter from '../../cartridges/SwipeSorter/SwipeSorter';
import PEMDASCartridge from '../../cartridges/PEMDAS/PEMDASCartridge';
import Potiondas from '../../cartridges/Potiondas/Potiondas';
import { formatExponents } from '../../utils/textFormatters';
import Balloon from '../Editor/Balloon';
import ErrorBoundary from '../ErrorBoundary';
import { saveLessonProgress, getLessonProgress } from '../../utils/storage';
import FullscreenToggle from '../FullscreenToggle';
import { X, Pencil } from 'lucide-react';
import './Player.css';

const Player = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const { language } = useLanguage();
    const { lesson } = state;

    // Initialize index based on the currentSlideId set by Dashboard or Editor
    const initialIndex = lesson.slides.findIndex(s => s.id === state.currentSlideId);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

    // START: Update storage when slide changes
    useEffect(() => {
        if (lesson.path) {
            saveLessonProgress(lesson.path, {
                lastSlideIndex: currentSlideIndex,
                // If this is the last slide, mark complete?
                // Let's rely on explicit completion logic if needed, or just "reached last slide"
                completed: currentSlideIndex === lesson.slides.length - 1
            });
        }
    }, [currentSlideIndex, lesson.path, lesson.slides.length]);
    const touchStartRef = useRef(null);
    const [isGameActive, setIsGameActive] = useState(false); // Enable/Disable navigation
    const [solvedSlides, setSolvedSlides] = useState(new Set()); // Track slides whose quiz/cartridge is complete

    const slides = lesson.slides;
    const currentSlide = slides[currentSlideIndex];

    // Check if current slide has a cartridge/quiz and enable game mode
    // Only block navigation if the slide hasn't been solved yet
    useEffect(() => {
        if (currentSlide?.cartridge && !solvedSlides.has(currentSlideIndex)) {
            setIsGameActive(true);
        } else {
            setIsGameActive(false);
        }
    }, [currentSlide, currentSlideIndex, solvedSlides]);

    const [debugMode, setDebugMode] = useState(false);

    // Initial check for cartridge...

    // Slide navigation SFX (use singleton context to prevent max contexts error)
    const playSlideSfx = () => {
        try {
            if (!window._slideAudioCtx) {
                window._slideAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = window._slideAudioCtx;
            if (ctx.state === 'suspended') ctx.resume();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.12);
        } catch (e) { /* ignore */ }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Debug toggle (T)
            if (e.key === 't' || e.key === 'T') {
                setDebugMode(prev => !prev);
                return;
            }

            // Keyboard navigation is UNRESTRICTED (testing/dev with physical keyboard)
            if (e.key === 'ArrowRight') {
                nextSlide(true); // force = true, skip all blocking
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'Escape') {
                dispatch({ type: 'TOGGLE_PREVIEW' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlideIndex, isGameActive, currentSlide]);

    // Check if a slide has an unsolved interactive (quiz or cartridge)
    const slideHasUnsolvedInteractive = (slideIndex) => {
        const slide = slides[slideIndex];
        if (!slide) return false;
        if (solvedSlides.has(slideIndex)) return false;
        // Check for quiz elements
        const hasQuiz = slide.elements?.some(el => el.type === 'quiz');
        // Check for cartridge (game)
        const hasCartridge = !!slide.cartridge;
        return hasQuiz || hasCartridge;
    };

    const markSlideSolved = (slideIndex) => {
        setSolvedSlides(prev => new Set(prev).add(slideIndex));
    };

    const nextSlide = (force = false) => {
        // Block if current slide has unsolved quiz/cartridge
        if (!force && slideHasUnsolvedInteractive(currentSlideIndex)) return;
        if (currentSlideIndex < slides.length - 1) {
            playSlideSfx();
            setCurrentSlideIndex(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlideIndex > 0) {
            playSlideSfx();
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    // Removed Swipe Logic (handleTouchStart, handleTouchEnd) as requested

    const [banner, setBanner] = useState(null); // { type: 'correct' | 'fail', text: string }
    const [scale, setScale] = useState(1);
    const viewportRef = useRef(null);

    // ── Web Audio SFX ──
    const playTone = (type) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'correct') {
                // Happy ascending arpeggio
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, ctx.currentTime);       // C5
                osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
                osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
                osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3); // C6
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            } else {
                // Descending sad tone
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            }
        } catch (e) {
            console.log('Audio not available:', e);
        }
    };

    const handleBanner = (type, text) => {
        if (!type) {
            setBanner(null);
            return;
        }
        playTone(type);
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
            const scaleX = width / 360;
            const scaleY = height / 640;
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
        try {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                if (elem.requestFullscreen) await elem.requestFullscreen();
                else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
                else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
            }
        } catch (err) {
            // Ignore
        }
        dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
    };

    const [isNavigating, setIsNavigating] = useState(false);

    // Debounced Navigation Handler (touch/hotzone — strict rules)
    const handleHotzoneNav = (direction) => {
        if (isNavigating) return;

        // Determine what kind of interactive is on the current slide
        const hasCartridge = !!currentSlide?.cartridge && !solvedSlides.has(currentSlideIndex);
        const hasQuiz = currentSlide?.elements?.some(el => el.type === 'quiz') && !solvedSlides.has(currentSlideIndex);

        if (direction === 'next') {
            // Forward is ALWAYS blocked when there's an unsolved quiz or cartridge
            if (hasCartridge || hasQuiz) return;
            setIsNavigating(true);
            nextSlide(false);
        } else {
            // Backward:
            //   - Cartridge/game: BLOCKED (can't leave mid-game)
            //   - Quiz: ALLOWED (can go back)
            if (hasCartridge) return;
            setIsNavigating(true);
            prevSlide();
        }

        // Lockout: Transition (300ms) + Delay (150ms) = 450ms
        setTimeout(() => {
            setIsNavigating(false);
        }, 450);
    };

    // Check for NL Quiz in current slide to adjust hotzones
    const hasNL = currentSlide?.elements?.some(
        el => el.type === 'quiz' && el.metadata?.quizType === 'nl'
    );

    // Hotzone Styles (Base)
    const hotzoneStyle = {
        position: 'absolute',
        top: '80px', // Start below progress bar (approx 72px)
        bottom: hasNL ? '25%' : 0, // Shorten hotzones for NL to allow knob interaction
        width: '15%', // 15% of STAGE width (54px of 360px)
        zIndex: 100, // Above stickers (10), below Buttons
        cursor: 'pointer',
        backgroundColor: debugMode ? 'rgba(255, 0, 0, 0.2)' : 'transparent',
    };

    // Determine active interactive elements
    const hasCartridge = !!currentSlide?.cartridge && !solvedSlides.has(currentSlideIndex);
    const hasQuiz = currentSlide?.elements?.some(el => el.type === 'quiz') && !solvedSlides.has(currentSlideIndex);

    return (
        <div className="player-container">

            {/* Removed external player-header */}

            <div
                className="player-viewport"
                ref={viewportRef}
            // Removed touch handlers
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
                    {/* Hotzones - Left (Prev) and Right (Next) - INSIDE STAGE */}
                    <div
                        className="hotzone-left"
                        style={{
                            ...hotzoneStyle,
                            left: 0,
                            borderRight: debugMode ? '1px solid red' : 'none',
                            pointerEvents: hasCartridge ? 'none' : 'auto'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleHotzoneNav('prev');
                        }}
                        title={debugMode ? "Prev Slide" : ""}
                    />

                    <div
                        className="hotzone-right"
                        style={{
                            ...hotzoneStyle,
                            right: 0,
                            borderLeft: debugMode ? '1px solid red' : 'none',
                            pointerEvents: (hasCartridge || hasQuiz) ? 'none' : 'auto'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleHotzoneNav('next');
                        }}
                        title={debugMode ? "Next Slide" : ""}
                    />

                    {/* Navigation Buttons */}
                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        pointerEvents: 'auto', // Re-enable clicks
                        display: 'flex',
                        gap: '10px'
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

                        <FullscreenToggle style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            color: '#334155',
                            padding: 0
                        }} />
                    </div>

                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        pointerEvents: 'auto'
                    }}>
                        {!state.readOnly && (
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
                        )}
                    </div>
                </div>

                {banner && (
                    <>
                        <div className={`sign-glow ${banner.type === 'correct' ? 'correct-glow' : 'fail-glow'}`} />
                        <div className={`quiz-result-sign ${banner.type === 'correct' ? 'correct-sign' : 'fail-sign'}`}>
                            {banner.text.split('').map((letter, i) => (
                                <span key={i} className="sign-letter">{letter}</span>
                            ))}
                        </div>
                    </>
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
                            className={`player-slide player-stage-scaled ${positionClass}`}
                            style={{
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
                            {/* Background Layer */}
                            {slide.background && (slide.background.includes('url') || slide.background.includes('gradient')) && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        backgroundImage: slide.background.replaceAll('/src/assets/', '/assets/'),
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
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                                    zIndex: slide.cartridge.type === 'Potiondas' && solvedSlides.has(index) ? 101 : 1, 
                                    pointerEvents: slide.cartridge.type === 'Potiondas' && solvedSlides.has(index) ? 'none' : 'auto'
                                }}>
                                    {slide.cartridge.type === 'FractionAlpha' && (
                                        <FractionAlpha
                                            config={slide.cartridge.config}
                                            onComplete={() => {
                                                markSlideSolved(index);
                                                setIsGameActive(false);
                                            }}
                                        />
                                    )}
                                    {slide.cartridge.type === 'FractionSlicer' && (
                                        <ErrorBoundary>
                                            <FractionSlicer
                                                config={slide.cartridge.config}
                                                onComplete={() => {
                                                    markSlideSolved(index);
                                                    setIsGameActive(false);
                                                }}
                                            />
                                        </ErrorBoundary>
                                    )}
                                    {slide.cartridge.type === 'SwipeSorter' && (
                                        <ErrorBoundary>
                                            <SwipeSorter
                                                config={slide.cartridge.config}
                                                onComplete={() => {
                                                    markSlideSolved(index);
                                                    setIsGameActive(false);
                                                }}
                                            />
                                        </ErrorBoundary>
                                    )}
                                    {slide.cartridge.type === 'PEMDAS' && (
                                        <ErrorBoundary>
                                            <PEMDASCartridge
                                                config={slide.cartridge.config}
                                                onComplete={() => {
                                                    markSlideSolved(index);
                                                    setIsGameActive(false);
                                                }}
                                            />
                                        </ErrorBoundary>
                                    )}
                                    {slide.cartridge.type === 'Potiondas' && (
                                        <ErrorBoundary>
                                            <Potiondas
                                                config={slide.cartridge.config}
                                                isAlreadySolved={solvedSlides.has(index)}
                                                onComplete={() => {
                                                    markSlideSolved(index);
                                                    setIsGameActive(false);
                                                }}
                                                onRestart={() => {
                                                    setSolvedSlides(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(index);
                                                        return next;
                                                    });
                                                    setIsGameActive(true);
                                                }}
                                                onNextSlide={() => nextSlide(true)}
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
                                            className={`player-element ${(element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem') ? 'player-element-chatquiz' : ''}`}
                                            style={{
                                                left: (element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem') ? '50%' : `${element.x}%`,
                                                top: (element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem') ? '55%' : `${element.y}%`,
                                                width: (element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem') ? '100%' : (element.type === 'quiz' ? '360px' : `${element.width}%`),
                                                height: (element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem') ? '85%' : (element.type === 'quiz' ? 'auto' : `${element.height}%`),
                                                transform: (element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem') ? 'translate(-50%, -50%)' : `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${element.scale * (element.metadata?.flipX ? -1 : 1)}, ${element.scale * (element.metadata?.flipY ? -1 : 1)})`,
                                                zIndex: (element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem') ? 100 : 10,
                                                pointerEvents: (element.metadata?.quizType === 'chatquiz' || element.metadata?.quizType === 'pem') ? 'auto' : undefined,
                                            }}
                                        >
                                            {element.type === 'text' && (
                                                <div
                                                    className="player-text"
                                                    style={{
                                                        fontFamily: element.metadata?.fontFamily || '"HVD Comic Serif Pro", sans-serif',
                                                        fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : '16px',
                                                        color: element.metadata?.color || 'black',
                                                        backgroundColor: element.metadata?.backgroundColor || 'transparent',
                                                        padding: element.metadata?.backgroundColor ? '0.5rem' : '0',
                                                        borderRadius: element.metadata?.borderRadius || '8px',
                                                        border: element.metadata?.border || 'none',
                                                        textAlign: element.metadata?.textAlign || 'left',
                                                        lineHeight: 1,
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: formatExponents(
                                                        (language !== 'es' && element.translations?.[language]?.content) || element.content
                                                    ) }}
                                                />
                                            )}
                                            {element.type === 'image' && <img src={element.content ? element.content.replaceAll('/src/assets/', '/assets/') : ''} alt="content" />}
                                            {element.type === 'quiz' && (
                                                <QuizPlayer
                                                    data={language !== 'es' && element.metadata?.translations?.[language]?.options
                                                        ? {
                                                            ...element,
                                                            metadata: {
                                                                ...element.metadata,
                                                                options: element.metadata.translations[language].options
                                                            }
                                                        }
                                                        : element
                                                    }
                                                    onNext={() => {
                                                        markSlideSolved(currentSlideIndex);
                                                    }}
                                                    onBanner={handleBanner}
                                                    disabled={isNavigating}
                                                    debugMode={debugMode}
                                                />
                                            )}
                                            {element.type === 'game' && <MinigamePlayer data={element} />}
                                            {element.type === 'balloon' && (
                                                <Balloon
                                                    element={language !== 'es' && element.translations?.[language]?.content
                                                        ? { ...element, content: element.translations[language].content }
                                                        : element
                                                    }
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
        </div>
    );
};

export default Player;
