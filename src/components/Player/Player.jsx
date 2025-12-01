import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../context/EditorContext';
import LessonMenu from './LessonMenu';
import QuizPlayer from './QuizPlayer';
import MinigamePlayer from './MinigamePlayer';
import './Player.css';

const Player = ({ onFinish }) => {
    const { state } = useEditor();
    const { t } = useTranslation();
    const { lesson } = state;
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [view, setView] = useState('lesson'); // 'lesson' or 'menu'
    const [lessonComplete, setLessonComplete] = useState(false);
    const touchStartRef = useRef(null);

    const slides = lesson.slides;
    const currentSlide = slides[currentSlideIndex];

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (view !== 'lesson' || lessonComplete) return;

            if (e.key === 'ArrowRight') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'Escape') {
                if (onFinish) onFinish();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlideIndex, view, lessonComplete, onFinish]);

    const nextSlide = () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        } else {
            setLessonComplete(true);
        }
    };

    const prevSlide = () => {
        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    const handleTouchStart = (e) => {
        touchStartRef.current = e.touches ? e.touches[0].clientX : e.clientX;
    };

    const handleTouchEnd = (e) => {
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

    if (lessonComplete) {
        return (
            <div className="player-container flex items-center justify-center bg-green-500 text-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Lesson Complete!</h1>
                    <button
                        onClick={onFinish}
                        className="bg-white text-green-500 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="player-container">
            <div
                className="player-viewport"
                ref={viewportRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
            >
                {banner && (
                    <div className={`player-banner ${banner.type}-banner`}>
                        {banner.text}
                    </div>
                )}
                <div
                    className="player-slide"
                    style={{
                        backgroundColor: (currentSlide.background && !currentSlide.background.includes('url') && !currentSlide.background.includes('gradient')) ? currentSlide.background : 'transparent',
                        backgroundImage: (currentSlide.background && (currentSlide.background.includes('url') || currentSlide.background.includes('gradient'))) ? currentSlide.background : 'none',
                        backgroundSize: 'contain', // Ensure whole image is visible
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                        width: '360px',
                        height: '640px',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-320px', /* Half of height */
                        marginLeft: '-180px' /* Half of width */
                    }}
                >
                    <div className="player-header-row" style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        right: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        zIndex: 100
                    }}>
                        <button
                            onClick={onFinish}
                            className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
                            style={{ background: 'none', border: 'none', padding: '5px', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                        <div className="player-progress-bar" style={{ flex: 1 }}>
                            {slides.map((_, index) => (
                                <div
                                    key={index}
                                    className={`progress-segment ${index <= currentSlideIndex ? 'active' : ''}`}
                                />
                            ))}
                        </div>
                    </div>

                    {currentSlide.elements.map(element => (
                        <div
                            key={element.id}
                            className="player-element"
                            style={{
                                left: `${element.x}%`,
                                top: `${element.y}%`,
                                width: element.type === 'quiz' ? 'auto' : `${element.width}%`,
                                height: element.type === 'quiz' ? 'auto' : `${element.height}%`,
                                transform: `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${element.scale})`,
                            }}
                        >
                            {element.type === 'text' && (
                                <div
                                    className="player-text"
                                    style={{
                                        fontFamily: element.metadata?.fontFamily || 'Nunito',
                                        color: element.metadata?.color || 'black',
                                        backgroundColor: element.metadata?.backgroundColor || 'transparent',
                                        padding: element.metadata?.backgroundColor ? '0.5rem' : '0',
                                        borderRadius: element.metadata?.borderRadius || '8px',
                                        border: element.metadata?.border || 'none',
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
                        </div>
                    ))}
                </div>
            </div>

            <div className="player-controls-hint">
                {t('player.hint')}
            </div>
        </div>
    );
};

export default Player;
