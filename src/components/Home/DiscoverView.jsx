import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';
import Balloon from '../Editor/Balloon';
import QuizPlayer from '../Player/QuizPlayer';
import SwipeSorter from '../../cartridges/SwipeSorter/SwipeSorter';
import { saveLessonProgress } from '../../utils/storage';

// The app's view-transition system remounts the outgoing view (its exit animation
// renders in a fresh wrapper React can't reconcile against the prior mount), so this
// component gets torn down and rebuilt every time the player swipes into a lesson.
// EVERY piece of state that affects what's on screen must survive that remount, or
// the exiting view visibly snaps to a default during the 400ms exit animation:
//  - cachedLessons: without it the remount refetches and renders an empty feed (dark flash)
//  - cachedIndex: without it the remount renders lesson 1 instead of the lesson the
//    player was actually on (wrong-content flash — worse than the dark one)
//  - cachedHasVerticallySwiped: keeps the onboarding peek-hint from re-arming
// Side benefit: returning to the feed later restores the player's scroll position.
let cachedLessons = null;
let cachedIndex = 0;
let cachedHasVerticallySwiped = false;

const DiscoverView = () => {
    const { dispatch } = useEditor();
    const { t } = useTranslation();
    const [lessons, setLessons] = useState(() => cachedLessons || []);
    const [currentIndex, setCurrentIndex] = useState(() => cachedIndex);
    // Estimate synchronously from the viewport so a remount never has to render a
    // frame at the default/wrong scale before the ResizeObserver below corrects it.
    const [scale, setScale] = useState(() => {
        if (typeof window === 'undefined') return 1;
        return Math.min(window.innerWidth / 360, window.innerHeight / 640);
    });
    const containerRef = useRef(null);
    const touchStartRef = useRef(null);
    const dragAxis = useRef(null); // 'horizontal' or 'vertical'

    const [hasInteracted, setHasInteracted] = useState(false); // Kept for legacy or general "invoked" state if needed, but logic split below
    const [hasVerticallySwiped, setHasVerticallySwiped] = useState(() => cachedHasVerticallySwiped);
    const [interactionToken, setInteractionToken] = useState(0); // Used to reset timers

    const [hintOffset, setHintOffset] = useState(0);
    const [horizontalHintOffset, setHorizontalHintOffset] = useState(0);

    // Swipe Feedback State
    const [isDragging, setIsDragging] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [dragX, setDragX] = useState(0);

    // Mirror screen-affecting state into the module-level cache (see comment above
    // the component) so the exit-animation remount reproduces this exact frame.
    useEffect(() => { cachedIndex = currentIndex; }, [currentIndex]);
    useEffect(() => { cachedHasVerticallySwiped = hasVerticallySwiped; }, [hasVerticallySwiped]);

    // Fetch lessons on mount
    useEffect(() => {
        const fetchLessons = async () => {
            try {
                // Use API in development (localhost or network IP), static JSON in production
                const isDev = import.meta.env.DEV;

                let data;
                if (isDev) {
                    const response = await fetch('/api/list-lessons');
                    data = await response.json();
                } else {
                    const response = await fetch('/lessons-data.json');
                    data = await response.json();
                }

                const flatList = [];
                const traverse = (items) => {
                    if (!Array.isArray(items)) return;
                    items.forEach(item => {
                        if (item.type === 'directory' && item.children) {
                            traverse(item.children);
                        } else if (item.visible !== false) {
                            flatList.push(item);
                        }
                    });
                };
                traverse(data);

                let loadedLessons = await Promise.all(flatList.map(async (l) => {
                    if (l.content && l.content.slides && l.content.slides.length > 0) {
                        return { ...l.content, path: l.path || l.id };
                    }
                    if (l.slides && l.slides.length > 0) {
                        return { ...l, path: l.path || l.id };
                    }
                    if (isDev && l.path) {
                        try {
                            const res = await fetch(`/api/load-lesson?path=${encodeURIComponent(l.path)}`);
                            const content = await res.json();
                            return { ...content, path: l.path };
                        } catch (e) {
                            return null;
                        }
                    }
                    return null;
                }));

                // Load Local Lessons (Mobile/Offline support)
                try {
                    const { getLocalLessons } = await import('../../utils/lessonStorage');
                    const localLessons = getLocalLessons();
                    if (localLessons && localLessons.length > 0) {
                        // Prepend local lessons so they show up first (newly created)
                        loadedLessons = [...localLessons, ...loadedLessons];
                    }
                } catch (e) {
                    console.error('Failed to load local lessons:', e);
                }

                // Filter valid lessons
                const filtered = loadedLessons.filter(l => l !== null && l.slides && l.slides.length > 0);
                cachedLessons = filtered;
                setLessons(filtered);
            } catch (error) {
                console.error('Error loading discover feed:', error);
            }
        };
        // A remount (e.g. this view exiting mid swipe-to-lesson transition) already has
        // the last-fetched list from the lazy useState initializer above — no need to
        // block on the network again for a copy that's about to be thrown away anyway.
        if (!cachedLessons) fetchLessons();
    }, []);

    // Hint Animation Logic
    useEffect(() => {
        // Clear any ongoing animations immediately on interaction
        setHintOffset(0);
        setHorizontalHintOffset(0);

        if (lessons.length === 0) return;

        const timers = [];

        // 1. Vertical Hint (Onboarding)
        // Condition: Never vertically swiped AND on first lesson AND multiple lessons exist
        if (!hasVerticallySwiped && currentIndex === 0 && lessons.length > 1) {
            const vTimer = setTimeout(() => {
                setHintOffset(15); // Peek Up
                timers.push(setTimeout(() => setHintOffset(0), 600)); // Return
            }, 1500); // 1.5s delay
            timers.push(vTimer);
        }

        // 2. Horizontal Hint (Idle Persuasion)
        // Condition: Any lesson that has > 1 slide. Inactivity for 2.5s.
        const currentLesson = lessons[currentIndex];
        if (currentLesson && currentLesson.slides && currentLesson.slides.length > 1) {
            const startHorizontalLoop = () => {
                // Peek Left (Show next slide)
                setHorizontalHintOffset(15);

                // Return
                timers.push(setTimeout(() => {
                    setHorizontalHintOffset(0);
                    // Loop
                    timers.push(setTimeout(startHorizontalLoop, 4000));
                }, 600));
            };

            const hTimer = setTimeout(startHorizontalLoop, 2500); // 2.5s inactivity
            timers.push(hTimer);
        }

        return () => {
            timers.forEach(t => clearTimeout(t));
        };
    }, [interactionToken, hasVerticallySwiped, currentIndex, lessons]); // Re-run on interaction or nav

    // Responsive Scale. useLayoutEffect (not useEffect) so this — and the ResizeObserver's
    // own initial updateScale() call below — resolve before the browser paints. The lazy
    // useState above already estimates a close value; this corrects it before the user
    // can see a frame at the wrong scale, which matters most right after a remount.
    useLayoutEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const { width, height } = containerRef.current.getBoundingClientRect();
            const scaleX = width / 360;
            const scaleY = height / 640;
            setScale(Math.min(scaleX, scaleY));
        };
        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) {
            observer.observe(containerRef.current);
            updateScale();
        }
        return () => observer.disconnect();
    }, []);

    // Navigation Logic
    const markInteraction = (isVertical = false) => {
        setInteractionToken(t => t + 1); // Reset timers
        if (isVertical) setHasVerticallySwiped(true);
    };

    const nextLesson = () => {
        markInteraction(true); // Is Vertical
        if (currentIndex < lessons.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevLesson = () => {
        markInteraction(true); // Is Vertical
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };



    // ... (keep existing imports)

    const enterLesson = () => {
        markInteraction(false);
        const lesson = lessons[currentIndex];
        if (!lesson) return;
        // Merge path if missing in content
        const fullLesson = { ...lesson };

        // RESET PROGRESS: Force start from beginning (Slide 1 usually)
        if (fullLesson.path) {
            const startIndex = fullLesson.slides.length > 1 ? 1 : 0;
            saveLessonProgress(fullLesson.path, { lastSlideIndex: startIndex, completed: false });
        }

        dispatch({ type: 'LOAD_LESSON', payload: fullLesson });

        // If lesson has > 1 slides, start at index 1 (0-based)
        if (fullLesson.slides && fullLesson.slides.length > 1) {
            dispatch({ type: 'SET_CURRENT_SLIDE', payload: fullLesson.slides[1].id });
        }

        dispatch({ type: 'SET_VIEW', payload: 'player' });
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowUp') prevLesson();
            else if (e.key === 'ArrowDown') nextLesson();
            else if (e.key === 'ArrowRight') enterLesson();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, lessons]);

    // Touch/Mouse Handling for "Roll" + "Enter"
    const handleStart = (clientX, clientY) => {
        markInteraction(false);
        touchStartRef.current = { x: clientX, y: clientY };
        dragAxis.current = null; // Reset lock
        setIsDragging(true);
        setDragY(0);
        setDragX(0);
    };

    const handleMove = (clientX, clientY) => {
        if (!touchStartRef.current || !isDragging) return;
        const rawDeltaX = clientX - touchStartRef.current.x;
        const rawDeltaY = clientY - touchStartRef.current.y;

        // Direction Locking Logic
        if (!dragAxis.current) {
            // Check threshold to lock
            if (Math.abs(rawDeltaX) > 10) {
                dragAxis.current = 'horizontal';
            } else if (Math.abs(rawDeltaY) > 10) {
                dragAxis.current = 'vertical';
            }
        }

        if (dragAxis.current === 'horizontal') {
            setDragX(rawDeltaX);
            setDragY(0);
        } else if (dragAxis.current === 'vertical') {
            setDragX(0);
            setDragY(rawDeltaY);
        }
    };

    const handleEnd = (clientX, clientY) => {
        if (!touchStartRef.current) {
            setIsDragging(false);
            setDragX(0);
            setDragY(0);
            return;
        }

        const deltaX = clientX - touchStartRef.current.x;
        const deltaY = clientY - touchStartRef.current.y;
        touchStartRef.current = null;

        // Determine dominant axis
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal
            if (deltaX < -50) {
                // Swipe to enter lesson - smoothly hand off directly to player without snap-back
                enterLesson();
                return;
            }
        } else {
            // Vertical
            if (deltaY < -50) nextLesson();
            else if (deltaY > 50) prevLesson();
        }

        setIsDragging(false);
        setDragX(0);
        setDragY(0);
    };

    // Touch Wrappers
    const handleTouchStart = (e) => {
        if (e.target?.closest?.('button, a, input, select, textarea, [role="button"], .cartridge-container, .minigame-player, .quiz-player, .isticker-container, .player-popup')) return;
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleTouchMove = (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const handleTouchEnd = (e) => handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

    // Mouse Wrappers
    const handleMouseDown = (e) => {
        if (e.target?.closest?.('button, a, input, select, textarea, [role="button"], .cartridge-container, .minigame-player, .quiz-player, .isticker-container, .player-popup')) return;
        handleStart(e.clientX, e.clientY);
    };
    const handleMouseMove = (e) => isDragging && handleMove(e.clientX, e.clientY);
    const handleMouseUp = (e) => handleEnd(e.clientX, e.clientY);

    // Render a single slide (simplified for Mask integration)
    const renderSlide = (slide, additionalStyle = {}) => {
        if (!slide) return null;
        const mappedBackground = slide.background ? slide.background.replaceAll('/src/assets/', '/assets/') : slide.background;
        return (
            <div
                key={slide.id}
                style={{
                    backgroundColor: (mappedBackground && !mappedBackground.includes('url') && !mappedBackground.includes('gradient')) ? mappedBackground : 'transparent',
                    backgroundImage: (mappedBackground && (mappedBackground.includes('url') || mappedBackground.includes('gradient'))) ? mappedBackground : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    width: '360px',
                    height: '640px',
                    position: 'absolute',
                    top: 0,
                    ...additionalStyle, // Accept overrides (left, etc.)
                    overflow: 'hidden',
                    userSelect: 'none'
                }}
            >
                {/* Cartridge Layer */}
                {slide.cartridge && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none'
                    }}>
                        {slide.cartridge.type === 'SwipeSorter' && (
                            <SwipeSorter
                                config={slide.cartridge.config}
                                preview={true}
                            />
                        )}
                        {/* Add other cartridges here as needed */}
                    </div>
                )}

                {/* Elements */}
                {slide.elements.map(element => (
                    <div
                        key={element.id}
                        style={{
                            position: 'absolute',
                            left: `${element.x}%`,
                            top: `${element.y}%`,
                            width: element.type === 'quiz' ? '360px' : `${element.width}%`, // Full width for quiz
                            height: element.type === 'quiz' ? 'auto' : `${element.height}%`,
                            transform: `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${element.scale * (element.metadata?.flipX ? -1 : 1)}, ${element.scale * (element.metadata?.flipY ? -1 : 1)})`,
                            zIndex: 10,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            pointerEvents: 'none' // Preview only
                        }}
                    >
                        {element.type === 'text' && (
                            <div
                                style={{
                                    fontFamily: element.metadata?.fontFamily || '"HVD Comic Serif Pro", sans-serif',
                                    fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : '16px',
                                    color: element.metadata?.color || 'black',
                                    backgroundColor: element.metadata?.backgroundColor || 'transparent',
                                    padding: element.metadata?.backgroundColor ? '0.5rem' : '0',
                                    borderRadius: element.metadata?.borderRadius || '8px',
                                    border: element.metadata?.border || 'none',
                                    lineHeight: 1,
                                    whiteSpace: 'pre-wrap',
                                    textAlign: element.metadata?.textAlign || 'center',
                                    fontWeight: element.metadata?.fontWeight || 'normal',
                                    fontStyle: element.metadata?.fontStyle || 'normal',
                                    textDecoration: element.metadata?.textDecoration || 'none'
                                }}
                                dangerouslySetInnerHTML={{ __html: element.content }}
                            />
                        )}
                        {element.type === 'image' && <img src={element.content ? element.content.replaceAll('/src/assets/', '/assets/') : ''} alt="content" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                        {element.type === 'balloon' && (
                            <Balloon
                                element={element}
                                readOnly={true}
                            />
                        )}
                        {element.type === 'quiz' && (
                            <div style={{ pointerEvents: 'none' }}>
                                <QuizPlayer
                                    data={element}
                                    disabled={true}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100dvh',
            backgroundColor: 'transparent',
            overflow: 'hidden',
            touchAction: 'none',
            cursor: 'grab'
        }}
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Persistent Stage Layer (Overlays Feed, matches Stage Geometry) */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '360px',
                height: '640px',
                transform: `translate(-50%, -50%) scale(${scale}) translateZ(0)`,
                transformOrigin: 'center center',
                pointerEvents: 'none', // Let touches pass through to feed
                zIndex: 4000
            }}>
                {/* Home Button - Anchored to Stage Top Left */}
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    pointerEvents: 'auto' // Re-enable clicks
                }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
                        }}
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
                        <Home size={24} color="#334155" />
                    </button>
                </div>
            </div>

            {/* Vertical Feed Container */}
            <div style={{
                width: '100%',
                height: '100%',
                transform: `translateY(calc(${-currentIndex * 100}% - ${hintOffset}% + ${isDragging ? dragY : 0}px)) translateZ(0)`, // Hardware Acceleration
                transition: isDragging ? 'none' : 'transform 0.5s ease-in-out',
                willChange: 'transform',
                backfaceVisibility: 'hidden'
            }}>
                {lessons.map((lesson, index) => (
                    <div
                        key={lesson.id}
                        style={{
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                            top: `${index * 100}%`,
                            left: 0,
                        }}
                    >
                        {/* Full-Screen Background Fill (Fix for Tall Screens/Letterboxing) */}
                        <div style={{
                            position: 'absolute',
                            top: '-5%',
                            left: '-5%',
                            width: '110%',
                            height: '110%',
                            zIndex: -1,
                            backgroundColor: (lesson.slides && lesson.slides[0]?.background && !lesson.slides[0].background.includes('url') && !lesson.slides[0].background.includes('gradient')) ? lesson.slides[0].background : '#1a202c',
                            backgroundImage: (lesson.slides && lesson.slides[0]?.background && (lesson.slides[0].background.includes('url') || lesson.slides[0].background.includes('gradient'))) ? lesson.slides[0].background.replaceAll('/src/assets/', '/assets/') : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'blur(20px) brightness(0.8)', // Blur to make it distinct from content
                            transform: 'scale(1.2)' // Slight zoom to avoid edge artifacts
                        }} />

                        {/* Stage Wrapper (Centers and Scales Content) */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '360px',
                            height: '640px', // Explicit size for scaling source
                            transform: `translate(-50%, -50%) scale(${scale}) translateZ(0)`, // Hardware Acceleration
                            transformOrigin: 'center center',

                            // Mask Styles
                            boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
                            overflow: 'hidden',
                            backgroundColor: 'transparent',
                            backfaceVisibility: 'hidden',
                            perspective: '1000px'
                        }}>
                            {/* Sliding Track */}
                            <div style={{
                                width: '100%',
                                height: '100%',
                                // OPTIMIZATION: Only animate the current lesson
                                transform: `translateX(${index === currentIndex ? (isDragging && Math.abs(dragX) > Math.abs(dragY) ? dragX : -horizontalHintOffset) : 0}px) translateZ(0)`,
                                transition: isDragging ? 'none' : 'transform 0.5s ease-in-out',
                                willChange: index === currentIndex ? 'transform' : 'auto',
                                position: 'relative',
                                backfaceVisibility: 'hidden'
                            }}>
                                {/* Slide 0 */}
                                {lesson.slides && lesson.slides.length > 0 ? (
                                    renderSlide(lesson.slides[0], { left: 0 })
                                ) : null}

                                {/* Slide 1 */}
                                {lesson.slides && lesson.slides.length > 1 ? renderSlide(lesson.slides[1], { left: '100%' }) : null}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Hint */}
            <div style={{
                position: 'absolute',
                bottom: '40px',
                width: '100%',
                textAlign: 'center',
                color: 'white',
                opacity: 0.6,
                fontSize: '0.9rem',
                pointerEvents: 'none'
            }}>
                Swipe Right to Start • Up/Down to Browse
            </div>
        </div>
    );
};

export default DiscoverView;
