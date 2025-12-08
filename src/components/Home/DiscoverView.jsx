import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';

const DiscoverView = () => {
    const { dispatch } = useEditor();
    const { t } = useTranslation();
    const [lessons, setLessons] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const containerRef = useRef(null);
    const touchStartRef = useRef(null);

    const [hasInteracted, setHasInteracted] = useState(false);
    const [hintOffset, setHintOffset] = useState(0);

    // Fetch lessons on mount
    useEffect(() => {
        const fetchLessons = async () => {
            try {
                const response = await fetch('/api/list-lessons');
                const data = await response.json();
                const flatList = [];
                const traverse = (items) => {
                    items.forEach(item => {
                        if (item.type === 'directory') {
                            if (item.children) traverse(item.children);
                        } else if (item.name.endsWith('.json')) {
                            flatList.push({ ...item, id: item.path }); // Use path as unique ID
                        }
                    });
                };
                traverse(data);
                // Load full content for the first few lessons to render covers?
                // Actually list-lessons only gives names/paths. We need to load content.
                // Optimally we load content on demand, but for prototype we can load all 
                // or just load the current + neighbors.
                // Let's load ALL for now (assuming small count) or just load the cover data.
                // Since we need to render the SLIDE, we need the lesson content.
                // Let's fetch them in parallel.
                const loadedLessons = await Promise.all(flatList.map(async (l) => {
                    try {
                        const res = await fetch(`/api/load-lesson?path=${encodeURIComponent(l.path)}`);
                        const content = await res.json();
                        return { ...content, path: l.path };
                    } catch (e) {
                        return null;
                    }
                }));
                setLessons(loadedLessons.filter(l => l !== null && l.slides && l.slides.length > 0));
            } catch (error) {
                console.error('Error loading discover feed:', error);
            }
        };
        fetchLessons();
    }, []);

    // Swipe Hint Animation Effect
    useEffect(() => {
        if (hasInteracted || currentIndex !== 0 || lessons.length <= 1) {
            setHintOffset(0);
            return;
        }

        let timeoutId;
        const animate = () => {
            // Wait 3s then peek
            timeoutId = setTimeout(() => {
                setHintOffset(15); // Move up 15% (peek next)

                // Spring back after 500ms
                setTimeout(() => {
                    setHintOffset(0);
                    // Loop again after short pause
                    setTimeout(animate, 1000);
                }, 600);
            }, 3000);
        };

        animate();

        return () => clearTimeout(timeoutId);
    }, [hasInteracted, currentIndex, lessons.length]);

    // Responsive Scale
    useEffect(() => {
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
    const markInteraction = () => setHasInteracted(true);

    const nextLesson = () => {
        markInteraction();
        if (currentIndex < lessons.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevLesson = () => {
        markInteraction();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const enterLesson = () => {
        markInteraction();
        const lesson = lessons[currentIndex];
        // Merge path if missing in content
        const fullLesson = { ...lesson };

        dispatch({ type: 'LOAD_LESSON', payload: fullLesson });

        // If lesson has > 1 slides, start at index 1 (0-based)
        if (fullLesson.slides.length > 1) {
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
        markInteraction();
        touchStartRef.current = { x: clientX, y: clientY };
    };

    const handleEnd = (clientX, clientY) => {
        if (!touchStartRef.current) return;
        const deltaX = clientX - touchStartRef.current.x;
        const deltaY = clientY - touchStartRef.current.y;

        // Determine dominant axis
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal
            if (Math.abs(deltaX) > 50) {
                if (deltaX < -50) enterLesson(); // Swipe Left (Finger moves left) -> Enter
            }
        } else {
            // Vertical
            if (deltaY < -50) nextLesson();
            else if (deltaY > 50) prevLesson();
        }
        touchStartRef.current = null;
    };

    // Touch Wrappers
    const handleTouchStart = (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
    const handleTouchEnd = (e) => handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

    // Mouse Wrappers
    const handleMouseDown = (e) => handleStart(e.clientX, e.clientY);
    const handleMouseUp = (e) => handleEnd(e.clientX, e.clientY);

    // Render a single slide (reused logic)
    const renderSlide = (slide) => {
        if (!slide) return null;
        return (
            <div
                key={slide.id}
                style={{
                    backgroundColor: (slide.background && !slide.background.includes('url') && !slide.background.includes('gradient')) ? slide.background : 'transparent',
                    backgroundImage: (slide.background && (slide.background.includes('url') || slide.background.includes('gradient'))) ? slide.background : 'none',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    transformOrigin: 'center center',
                    width: '360px',
                    height: '640px',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-320px',
                    marginLeft: '-180px',
                    transform: `translateX(0) scale(${scale})`,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)', // Add shadow to distinguish cards
                    overflow: 'hidden', // Ensure button stays within rounded corners if added
                    userSelect: 'none' // Prevent text selection during drag
                }}
            >
                {/* Home Button - Inside the Lesson Card */}
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    zIndex: 3000,
                    pointerEvents: 'auto'
                }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card clicks
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

                {/* Elements */}
                {slide.elements.map(element => (
                    <div
                        key={element.id}
                        style={{
                            position: 'absolute',
                            left: `${element.x}%`,
                            top: `${element.y}%`,
                            width: element.type === 'quiz' ? 'auto' : `${element.width}%`,
                            height: element.type === 'quiz' ? 'auto' : `${element.height}%`,
                            transform: `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${element.scale})`,
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
                        {element.type === 'image' && <img src={element.content} alt="content" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
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
            width: '100vw',
            height: '100vh',
            backgroundColor: '#1a202c',
            overflow: 'hidden',
            touchAction: 'none',
            cursor: 'grab' // Indicate draggable
        }}
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            {/* Removed Global Home Button */}

            {/* Vertical Feed Container */}
            <div style={{
                width: '100%',
                height: '100%',
                // transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth roll
                // No, we move the SLIDES.
                // Usually a feed transforms usage.
                transform: `translateY(calc(${-currentIndex * 100}% - ${hintOffset}%))`,
                transition: 'transform 0.5s ease-in-out',
                willChange: 'transform'
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {/* Render Slide 0 */}
                        {lesson.slides && lesson.slides.length > 0 ? renderSlide(lesson.slides[0]) : null}
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
