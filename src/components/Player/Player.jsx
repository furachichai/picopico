import React, { useEffect, useLayoutEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../context/EditorContext';
import { useLanguage, getTranslatedContent } from '../../context/LanguageContext';
import QuizPlayer from './QuizPlayer';
import MinigamePlayer from './MinigamePlayer';
import FractionAlpha from '../../cartridges/FractionAlpha/FractionAlpha';
import FractionSlicer from '../../cartridges/FractionSlicer/FractionSlicer';
import SwipeSorter from '../../cartridges/SwipeSorter/SwipeSorter';
import PEMDASCartridge from '../../cartridges/PEMDAS/PEMDASCartridge';
import AlgeBrosCartridge from '../../cartridges/AlgeBros/AlgeBrosCartridge';
import BalanzaCartridge from '../../cartridges/Balanza/BalanzaCartridge';
import ExloreNLCartridge from '../../cartridges/ExploreNL/ExloreNLCartridge';
import SpotCartridge from '../../cartridges/Spot/SpotCartridge';
import Potiondas from '../../cartridges/Potiondas/Potiondas';
import IStickerPlayer from './IStickerPlayer';
import { formatExponents } from '../../utils/textFormatters';
import Balloon from '../Editor/Balloon';
import Banner from '../Editor/Banner';
import ResultField from '../ResultField/ResultField';
import NumberLine from '../NumberLine/NumberLine';
import CharacterShadow from '../Editor/CharacterShadow';
import ErrorBoundary from '../ErrorBoundary';
import { saveLessonProgress, getLessonProgress } from '../../utils/storage';
import FullscreenToggle from '../FullscreenToggle';
import { X, Pencil } from 'lucide-react';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { getSharedAudioContext } from '../../utils/audioContext';
import { TypeQuizProvider } from '../../context/TypeQuizContext';
import './Player.css';

// Default fallback celebration slide matching _last_card / _last_slide
const DEFAULT_LAST_SLIDE = {
    background: 'url("/src/assets/backgrounds/bkg_geom_007.png")',
    backgroundSettings: {
        grayscale: true,
        tintColor: 'rgba(103, 232, 249, 0.4)'
    },
    elements: [
        {
            id: 'el-last-slide-yara',
            type: 'image',
            content: '/src/assets/characters/yara_jumping_celebration.png',
            x: 41.94444444444444,
            y: 51.40625,
            width: 40,
            height: 29.31428571428571,
            rotation: 0,
            scale: 2.064956090406779,
            metadata: {
                width: 40,
                height: 29.31428571428571,
                category: 'characters',
                hasShadow: false
            }
        },
        {
            id: 'el-last-slide-pesto',
            type: 'image',
            content: '/src/assets/characters/pesto_blows_kiss.png',
            x: 81.66666666666667,
            y: 76.09375,
            width: 40,
            height: 28.483146067415728,
            rotation: 0,
            scale: 1.1599244053694049,
            metadata: {
                width: 40,
                height: 28.483146067415728,
                category: 'characters',
                flipX: true
            }
        }
    ]
};

// Helper to detect if a cartridge or slide has an open manipulative without a win scenario
const isOpenManipulative = (cartridge) => {
    if (!cartridge) return false;
    // Balanza tutorial mode ALWAYS requires completing the tutorial cycle before advancing
    if (cartridge.type === 'Balanza' && (cartridge.config?.tutorial || cartridge.config?.isTutorial || cartridge.config?.tutorialMode)) {
        return false;
    }
    if (cartridge.type === 'ExploreNL' || cartridge.type === 'ExloreNL') return true;
    if (cartridge.hasWinScenario === false || cartridge.config?.hasWinScenario === false || cartridge.config?.openEnded === true) return true;
    return false;
};

const Player = () => {
    const { state, dispatch } = useEditor();
    const { t } = useTranslation();
    const { language, setLanguage, SUPPORTED_LANGUAGES } = useLanguage();
    const { lesson } = state;

    // Check if the current lesson is _last_card / _last_slide itself (avoid appending to itself)
    const isSelfLastCard = lesson?.title === '_last_card' || lesson?.title === '_last_slide' ||
        lesson?.path?.includes('_last_card') || lesson?.path?.includes('_last_slide') ||
        lesson?.id === 'draft-1790691723222';

    const [showLastSlideSetting, setShowLastSlideSetting] = useState(true);
    const [celebrationSlideTemplate, setCelebrationSlideTemplate] = useState(null);
    const [orderedLessons, setOrderedLessons] = useState([]);

    // Fetch menu settings & lessons to get the latest authored _last_slide and lesson order
    useEffect(() => {
        let isMounted = true;
        const isDev = import.meta.env.DEV;

        fetch(isDev ? '/api/menu-settings' : '/menu-settings.json')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (isMounted && data && typeof data.showLastSlide === 'boolean') {
                    setShowLastSlideSetting(data.showLastSlide);
                }
            })
            .catch(err => console.error('Error fetching menu-settings in Player:', err));

        fetch(isDev ? '/api/list-lessons' : '/lessons-data.json')
            .then(res => res.ok ? res.json() : null)
            .then(list => {
                if (!isMounted || !Array.isArray(list)) return;
                const lastCardLesson = list.find(item => {
                    const title = item.title?.toLowerCase() || '';
                    const p = item.path?.toLowerCase() || '';
                    return title === '_last_slide' || title === '_last_card' ||
                           p.includes('_last_slide') || p.includes('_last_card');
                });
                const tSlide = lastCardLesson?.content?.slides?.[0] || lastCardLesson?.slides?.[0];
                if (tSlide) {
                    setCelebrationSlideTemplate(tSlide);
                }
                const visible = list.filter(item => item.visible !== false);
                setOrderedLessons(visible);
            })
            .catch(err => console.error('Error fetching lessons in Player:', err));

        return () => {
            isMounted = false;
        };
    }, []);

    // Compose slides array, conditionally appending the celebration slide at the end
    const slides = useMemo(() => {
        const base = lesson?.slides || [];
        if (!showLastSlideSetting || isSelfLastCard || base.length === 0) {
            return base;
        }
        const template = celebrationSlideTemplate || DEFAULT_LAST_SLIDE;
        const lastSlide = {
            ...template,
            id: '_last_slide_celebration',
            isLastSlideCelebration: true,
            order: base.length
        };
        return [...base, lastSlide];
    }, [lesson?.slides, showLastSlideSetting, isSelfLastCard, celebrationSlideTemplate]);

    // Initialize index based on the currentSlideId set by Dashboard or Editor
    const initialIndex = slides.findIndex(s => s.id === state.currentSlideId);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

    const touchStartRef = useRef(null);
    const [isGameActive, setIsGameActive] = useState(false); // Enable/Disable navigation
    const [solvedSlides, setSolvedSlides] = useState(new Set()); // Track slides whose quiz/cartridge is complete
    const [solvedAnswers, setSolvedAnswers] = useState({}); // Track solved answers for result field

    // Stripper state
    const [stripperStep, setStripperStep] = useState(0); // Current revealed strip index
    const [visitedStripperSlides, setVisitedStripperSlides] = useState(new Set()); // Slides fully stepped through
    const [autoPlayIStickerId, setAutoPlayIStickerId] = useState(null); // iSticker to auto-play on stripper advance

    // Popup state
    const [activePopupText, setActivePopupText] = useState(null);

    // Close open popup when changing slides
    useEffect(() => {
        setActivePopupText(null);
    }, [currentSlideIndex]);

    const currentSlide = slides[currentSlideIndex];

    // Keep currentSlideId in sync with the slide being played (ignore celebration slide to preserve editor slide id)
    useEffect(() => {
        const slide = slides[currentSlideIndex];
        if (slide?.id && state.currentSlideId !== slide.id) {
            if (!slide.isLastSlideCelebration) {
                dispatch({ type: 'SET_CURRENT_SLIDE', payload: slide.id });
            }
        }
    }, [currentSlideIndex, slides, state.currentSlideId, dispatch]);

    // Update storage when slide changes
    useEffect(() => {
        if (lesson.path) {
            saveLessonProgress(lesson.path, {
                lastSlideIndex: currentSlideIndex,
                completed: currentSlideIndex >= (lesson.slides?.length ? lesson.slides.length - 1 : 0)
            });
        }
    }, [currentSlideIndex, lesson.path, lesson.slides?.length]);

    // Check if current slide has a cartridge/quiz and enable game mode
    // Only block navigation if the slide hasn't been solved yet (open manipulatives are not blocking games)
    useEffect(() => {
        const isGame = currentSlide?.cartridge && !isOpenManipulative(currentSlide.cartridge);
        if (isGame && !solvedSlides.has(currentSlideIndex)) {
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
            const ctx = getSharedAudioContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.onended = () => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch (_) {}
            };
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.12);
        } catch (e) { /* ignore */ }
    };

    // Stripper reveal SFX (gentle ascending chime)
    const playStripRevealSfx = () => {
        try {
            const ctx = getSharedAudioContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.onended = () => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch (_) {}
            };
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) { /* ignore */ }
    };

    // Determine which strip an element belongs to (0-based)
    const getElementStrip = (elementY, dividers) => {
        if (!dividers || dividers.length === 0) return 0;
        const sorted = [...dividers].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
            if (elementY < sorted[i]) return i;
        }
        return sorted.length; // Last strip
    };

    // Check if the current slide is playing an active (unsolved) Match Drag quiz
    const isMatchDragActive = !!(
        currentSlide?.elements?.some(el =>
            el.type === 'quiz' && (
                el.metadata?.quizType === 'match' ||
                el.quizType === 'match' ||
                el.metadata?.quizType === 'conecta' ||
                el.quizType === 'conecta'
            )
        ) && !solvedSlides.has(currentSlideIndex)
    );

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Debug toggle (T)
            if (e.key === 't' || e.key === 'T') {
                setDebugMode(prev => !prev);
                return;
            }

            // Keyboard navigation is UNRESTRICTED (testing/dev with physical keyboard)
            // EXCEPT when playing Spot, Match Drag, or games that lock navigation until completed
            if ((currentSlide?.cartridge?.type === 'Spot' || isMatchDragActive) && !solvedSlides.has(currentSlideIndex)) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    return;
                }
            }

            if (e.key === 'ArrowRight') {
                const s = currentSlide;
                const sActive = s?.stripper?.enabled && s.stripper?.dividers?.length > 0;
                if (sActive && !visitedStripperSlides.has(currentSlideIndex)) {
                    nextSlide(false);
                } else {
                    nextSlide(true); // force = true, skip all blocking
                }
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'Escape') {
                dispatch({ type: 'TOGGLE_PREVIEW' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlideIndex, isGameActive, currentSlide, solvedSlides, isMatchDragActive]);

    const [wiggleIStickerId, setWiggleIStickerId] = useState(null);
    const [wiggleCartridge, setWiggleCartridge] = useState(false);
    const cartridgeWiggleTimeoutRef = useRef(null);

    const triggerCartridgeWiggle = () => {
        setWiggleCartridge(false);
        requestAnimationFrame(() => {
            setWiggleCartridge(true);
            if (cartridgeWiggleTimeoutRef.current) clearTimeout(cartridgeWiggleTimeoutRef.current);
            cartridgeWiggleTimeoutRef.current = setTimeout(() => {
                setWiggleCartridge(false);
            }, 500);
        });
    };
    const autoNextTimeoutRef = useRef(null);

    // Clear any pending autonext when changing slides or unmounting
    useEffect(() => {
        return () => {
            if (autoNextTimeoutRef.current) {
                clearTimeout(autoNextTimeoutRef.current);
                autoNextTimeoutRef.current = null;
            }
        };
    }, [currentSlideIndex]);

    const isSlideAutonext = (slideIndex) => {
        const slide = slides[slideIndex];
        if (!slide) return false;
        if (slide.autonext) return true;
        if (slide.cartridge?.config?.autonext) return true;
        if (slide.elements?.some(el => el.metadata?.autonext || el.config?.autonext)) return true;
        return false;
    };

    // Check if a slide has an unsolved interactive (quiz or cartridge)
    const slideHasUnsolvedInteractive = (slideIndex) => {
        const slide = slides[slideIndex];
        if (!slide) return false;
        if (solvedSlides.has(slideIndex)) return false;
        // Check for quiz elements
        const hasQuiz = slide.elements?.some(el => el.type === 'quiz');
        // Check for cartridge (game) - open manipulatives don't have a blocking win condition
        const isGame = slide.cartridge && !isOpenManipulative(slide.cartridge);
        const hasCartridge = !!isGame;
        // Check for isticker
        const hasISticker = slide.elements?.some(el => el.type === 'isticker');
        return hasQuiz || hasCartridge || hasISticker;
    };

    const markSlideSolved = (slideIndex) => {
        setSolvedSlides(prev => new Set(prev).add(slideIndex));
    };

    const handleInteractiveSolve = (slideIndex, isSuccess = true, delay = 1000, forceAdvance = false) => {
        markSlideSolved(slideIndex);

        if (forceAdvance) {
            if (autoNextTimeoutRef.current) {
                clearTimeout(autoNextTimeoutRef.current);
                autoNextTimeoutRef.current = null;
            }
            nextSlide(true);
            return;
        }

        // Only auto-advance if the task was correctly solved AND autonext is enabled for this slide
        if (isSuccess && isSlideAutonext(slideIndex)) {
            if (autoNextTimeoutRef.current) {
                clearTimeout(autoNextTimeoutRef.current);
            }
            autoNextTimeoutRef.current = setTimeout(() => {
                autoNextTimeoutRef.current = null;
                const s = slides[slideIndex];
                const stripperActive = s?.stripper?.enabled && s.stripper?.dividers?.length > 0;
                if (stripperActive && stripperStep < s.stripper.dividers.length && !visitedStripperSlides.has(slideIndex)) {
                    nextSlide(false);
                } else {
                    nextSlide(true);
                }
            }, delay);
        }
    };

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

    const handleBackToMenuWithScroll = () => {
        if (lesson?.path) {
            saveLessonProgress(lesson.path, {
                completed: true,
                lastSlideIndex: lesson.slides?.length ? lesson.slides.length - 1 : 0
            });
        }

        // Always record the completed lesson
        const completedPath = lesson?.path || lesson?.id;
        if (completedPath) {
            try { sessionStorage.setItem('picopico_completed_lesson', completedPath); } catch (e) {}
            window.__pico_completed_lesson = completedPath;
        }

        // Determine the next lesson in menu order (completed + 1)
        if (orderedLessons.length > 0 && lesson) {
            const norm = (p) => (p || '').replace(/\\/g, '/').toLowerCase().trim();
            const currentNorm = norm(lesson.path);
            const currentIdx = orderedLessons.findIndex(item => {
                const itemNorm = norm(item.path);
                return (
                    (currentNorm && (itemNorm === currentNorm || itemNorm.endsWith(currentNorm) || currentNorm.endsWith(itemNorm))) ||
                    (lesson.id && (item.id === lesson.id || item.content?.id === lesson.id)) ||
                    (lesson.name && item.name === lesson.name) ||
                    (lesson.title && (item.title === lesson.title || item.content?.title === lesson.title))
                );
            });

            if (currentIdx !== -1) {
                const nextIdx = currentIdx + 1 < orderedLessons.length ? currentIdx + 1 : currentIdx;
                const nextLesson = orderedLessons[nextIdx];
                if (nextLesson?.path) {
                    try { sessionStorage.setItem('picopico_scroll_to_lesson', nextLesson.path); } catch (e) {}
                    window.__pico_scroll_to_lesson = nextLesson.path;
                }
            }
        }

        handleMenu();
    };

    const handleBackToMenuCurrentLesson = () => {
        const currentPath = lesson?.path || lesson?.id;
        if (currentPath) {
            try {
                sessionStorage.setItem('picopico_scroll_to_lesson', currentPath);
                sessionStorage.removeItem('picopico_completed_lesson');
            } catch (e) {}
            window.__pico_scroll_to_lesson = currentPath;
            window.__pico_completed_lesson = null;
        }
        handleMenu();
    };

    const handleTopBackToMenu = () => {
        const baseSlides = lesson?.slides || [];
        const lastContentIndex = Math.max(0, baseSlides.length - 1);
        const isCompletedExceptLastSlide =
            !!currentSlide?.isLastSlideCelebration ||
            (
                currentSlideIndex >= lastContentIndex &&
                !slideHasUnsolvedInteractive(currentSlideIndex)
            );

        if (isCompletedExceptLastSlide) {
            handleBackToMenuWithScroll();
        } else {
            handleBackToMenuCurrentLesson();
        }
    };

    const nextSlide = (force = false) => {
        if (autoNextTimeoutRef.current) {
            clearTimeout(autoNextTimeoutRef.current);
            autoNextTimeoutRef.current = null;
        }
        const slide = slides[currentSlideIndex];
        const stripper = slide?.stripper;
        const stripperActive = stripper?.enabled && stripper?.dividers?.length > 0;

        // Stripper interception: reveal next strip instead of advancing slide
        if (!force && stripperActive && !visitedStripperSlides.has(currentSlideIndex)) {
            const totalStrips = stripper.dividers.length; // number of dividers = number of additional strips
            if (stripperStep < totalStrips) {
                // Check if any iSticker or quiz in the CURRENT strip needs solving first
                const currentStripElements = slide.elements?.filter(el => {
                    const strip = getElementStrip(el.y, stripper.dividers);
                    return strip === stripperStep;
                });
                const unsolvedInStrip = currentStripElements?.find(
                    el => el.type === 'isticker' && !solvedSlides.has(currentSlideIndex)
                );
                if (unsolvedInStrip) {
                    // On stripper slides, auto-play the iSticker instead of wiggling.
                    // The iSticker's onComplete will mark it solved, then we advance the strip.
                    if (autoPlayIStickerId !== unsolvedInStrip.id) {
                        setAutoPlayIStickerId(unsolvedInStrip.id);
                    }
                    return;
                }

                const unsolvedQuizInStrip = currentStripElements?.find(
                    el => el.type === 'quiz' && !solvedSlides.has(currentSlideIndex)
                );
                if (unsolvedQuizInStrip) {
                    triggerSlideShake();
                    return;
                }

                // Advance to next strip with elements (skipping empty strips if any)
                let nextStep = stripperStep + 1;
                while (nextStep < totalStrips) {
                    const hasElements = slide.elements?.some(el => getElementStrip(el.y, stripper.dividers) === nextStep);
                    if (hasElements) break;
                    nextStep++;
                }

                playStripRevealSfx();
                setStripperStep(nextStep);
                return;
            }
            // All strips revealed — mark as visited, then check for blocking interactives
            setVisitedStripperSlides(prev => new Set(prev).add(currentSlideIndex));
        }

        // Block if current slide has unsolved quiz/cartridge/isticker
        if (!force && slideHasUnsolvedInteractive(currentSlideIndex)) {
            if (slide?.cartridge) {
                triggerCartridgeWiggle();
            }
            const isticker = slide?.elements?.find(el => el.type === 'isticker');
            if (isticker) {
                setWiggleIStickerId(isticker.id);
                setTimeout(() => setWiggleIStickerId(null), 500);
            }
            triggerSlideShake();
            return;
        }
        if (currentSlideIndex < slides.length - 1) {
            playSlideSfx();
            setCurrentSlideIndex(prev => prev + 1);
        } else {
            handleBackToMenuWithScroll();
        }
    };

    const prevSlide = () => {
        if (autoNextTimeoutRef.current) {
            clearTimeout(autoNextTimeoutRef.current);
            autoNextTimeoutRef.current = null;
        }
        const slide = slides[currentSlideIndex];
        const stripperActive = slide?.stripper?.enabled && slide?.stripper?.dividers?.length > 0;
        if (stripperActive && stripperStep > 0 && !visitedStripperSlides.has(currentSlideIndex)) {
            playStripRevealSfx();
            setStripperStep(prev => Math.max(0, prev - 1));
            return;
        }
        if (currentSlideIndex > 0) {
            playSlideSfx();
            setCurrentSlideIndex(prev => prev - 1);
        } else {
            triggerSlideShake();
        }
    };

    // Removed Swipe Logic (handleTouchStart, handleTouchEnd) as requested

    const [banner, setBanner] = useState(null); // { type: 'correct' | 'fail', text: string }
    const [bannerFadingOut, setBannerFadingOut] = useState(false);
    const bannerTimeoutRef = useRef(null);
    const bannerFadeTimeoutRef = useRef(null);
    // Estimate synchronously from the viewport so the first painted frame (e.g. while
    // this view slides in during the app's view transition) is already at the right
    // size, instead of rendering at scale 1 and visibly jumping when the
    // ResizeObserver below delivers the measured value.
    const [scale, setScale] = useState(() => {
        if (typeof window === 'undefined') return 1;
        return Math.min(window.innerWidth / 360, window.innerHeight / 640);
    });
    const viewportRef = useRef(null);

    // ── Web Audio SFX ──
    const playTone = (type) => {
        try {
            const ctx = getSharedAudioContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.onended = () => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch (_) {}
            };

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
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        if (bannerFadeTimeoutRef.current) clearTimeout(bannerFadeTimeoutRef.current);

        if (!type) {
            setBanner(null);
            setBannerFadingOut(false);
            return;
        }
        playTone(type);
        // Topo / Moco celebrations removed for now; sound and confetti are kept
    };

    // Clear banner and reset stripper step when slide changes
    useEffect(() => {
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        if (bannerFadeTimeoutRef.current) clearTimeout(bannerFadeTimeoutRef.current);
        setBanner(null);
        setBannerFadingOut(false);
        setAutoPlayIStickerId(null);
        // When entering a stripper slide: if already visited, show all; else start at 0
        const slide = slides[currentSlideIndex];
        if (slide?.stripper?.enabled && slide.stripper.dividers?.length > 0) {
            if (visitedStripperSlides.has(currentSlideIndex)) {
                setStripperStep(slide.stripper.dividers.length); // all revealed
            } else {
                setStripperStep(0);
            }
        } else {
            setStripperStep(0);
        }

        return () => {
            if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
            if (bannerFadeTimeoutRef.current) clearTimeout(bannerFadeTimeoutRef.current);
        };
    }, [currentSlideIndex]);

    // Handle responsive scaling. useLayoutEffect so the measured correction lands
    // before paint — the lazy useState above only estimates from the window.
    useLayoutEffect(() => {
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

    const progress = ((currentSlideIndex + 1) / slides.length) * 100;

    const handleEdit = () => {
        const slide = slides[currentSlideIndex];
        if (slide?.id) {
            dispatch({ type: 'SET_CURRENT_SLIDE', payload: slide.id });
        }
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
    };

    const [isNavigating, setIsNavigating] = useState(false);

    // Helper to detect if a touch or click target is an interactive control or draggable game piece
    const isInteractiveElement = (target) => {
        if (!target || !(target instanceof Element)) return false;

        // Specific interactive elements and controls only (never broad full-stage wrappers)
        const interactiveSelector = 
            'button, input, select, textarea, a, label, summary, ' +
            '[role="button"], [role="slider"], [role="checkbox"], [role="radio"], [role="tab"], [role="switch"], [role="link"], ' +
            '.balanza-tile, .balanza-menu-tile, .balanza-restart-btn, ' +
            '.algebros-card, .algebros-slot, .algebros-op-btn, .term-card, .term-item-wrapper, .term-group-wrapper, .drop-slot-placeholder, .dot-separator-btn, .operator-btn, .factor-option-btn, .floating-reset-btn, .ready-submit-btn, ' +
            '.fraction-slice, .swipe-card, ' +
            '.quiz-option, .quiz-option-match, .quiz-options-container-match, .match-mode, .conecta-item, .conecta-card, .conecta-column, .conecta-columns-container, .conecta-mode, .chatquiz-option-btn, .match-card, .nl-knob-player, .quiz-ready-btn, ' +
            '.explorenl-pointer, .explorenl-equation-card, ' +
            '.type-quiz-keyboard-container, .type-quiz-key-btn, .type-quiz-action-btn, ' +
            '.field-player-bottom-portal, .field-choices-section, .field-choice-cell, .field-choice-btn, .field-ok-section, .field-ok-btn, .field-player-expression-card, .field-player-slot, .field-placed-choice-btn, ' +
            '.isticker-container, .popup-character, img[alt="popup"], ' +
            '[data-interactive="true"], ' +
            '.fullscreen-toggle, .player-top-controls, .player-nav-btn, .close-btn, .edit-btn';

        if (target.closest(interactiveSelector)) return true;

        return false;
    };

    const [isShakingSlide, setIsShakingSlide] = useState(false);
    const shakeTimeoutRef = useRef(null);

    const triggerSlideShake = () => {
        playTone('fail');
        setIsShakingSlide(true);
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => {
            setIsShakingSlide(false);
        }, 450);
    };

    // Debounced Navigation Handler
    const handleHotzoneNav = (direction) => {
        if (isNavigating || isMatchDragActive) return;

        // Determine what kind of interactive is on the current slide (open manipulatives are not blocking games)
        const isGame = currentSlide?.cartridge && !isOpenManipulative(currentSlide.cartridge);
        const hasCartridge = !!isGame && !solvedSlides.has(currentSlideIndex);

        // While playing a game cartridge, Match Drag, or Spot specifically, navigation is completely disabled with NO shaking
        if (hasCartridge || isGameActive || isMatchDragActive || (currentSlide?.cartridge?.type === 'Spot' && !solvedSlides.has(currentSlideIndex))) return;

        const hasQuiz = currentSlide?.elements?.some(el => el.type === 'quiz') && !solvedSlides.has(currentSlideIndex);
        const hasISticker = currentSlide?.elements?.some(el => el.type === 'isticker') && !solvedSlides.has(currentSlideIndex);

        const stripperActive = currentSlide?.stripper?.enabled && currentSlide.stripper.dividers?.length > 0;
        const isStripperStepping = stripperActive && !visitedStripperSlides.has(currentSlideIndex);

        if (direction === 'next') {
            if (isStripperStepping) {
                // If on a stripper slide and strips remain, forward nav advances the stripper!
                const currentStripElements = currentSlide.elements?.filter(el => {
                    const strip = getElementStrip(el.y, currentSlide.stripper.dividers);
                    return strip === stripperStep;
                });
                const hasUnsolvedQuizInStrip = currentStripElements?.some(el => el.type === 'quiz') && !solvedSlides.has(currentSlideIndex);
                if (hasUnsolvedQuizInStrip) {
                    triggerSlideShake();
                    return;
                }

                setIsNavigating(true);
                nextSlide(false);
                setTimeout(() => {
                    setIsNavigating(false);
                }, 200);
                return;
            }

            // Normal slide forward navigation (or stripper fully completed):
            if (hasCartridge || hasQuiz || hasISticker || currentSlideIndex >= slides.length - 1 || (currentSlide?.cartridge?.type === 'Spot' && !solvedSlides.has(currentSlideIndex))) {
                if (hasCartridge) {
                    triggerCartridgeWiggle();
                }
                const isticker = currentSlide?.elements?.find(el => el.type === 'isticker');
                if (isticker && hasISticker) {
                    setWiggleIStickerId(isticker.id);
                    setTimeout(() => setWiggleIStickerId(null), 500);
                }
                triggerSlideShake();
                return;
            }
            setIsNavigating(true);
            nextSlide(false);
        } else {
            // Backward:
            //   - Cartridge/game: BLOCKED (can't leave mid-game)
            //   - At first slide (and no strips to step back): BLOCKED (no previous slide)
            if (hasCartridge || (currentSlideIndex === 0 && (!isStripperStepping || stripperStep === 0)) || (currentSlide?.cartridge?.type === 'Spot' && !solvedSlides.has(currentSlideIndex))) {
                triggerSlideShake();
                return;
            }
            setIsNavigating(true);
            prevSlide();
        }

        // Lockout: Transition (300ms) + Delay (150ms) = 450ms
        setTimeout(() => {
            setIsNavigating(false);
        }, 450);
    };

    // ── Slide Navigation Gestures: Swipe anywhere or Tap vertical border columns ──
    const SWIPE_TRIGGER = 35;  // min horizontal travel (px) to count as a swipe
    const TAP_TOLERANCE = 12;  // max travel (px) still treated as a tap

    const swipeRef = useRef(null);

    const handlePointerDown = (e) => {
        const isGamePlaying = (currentSlide?.cartridge && !isOpenManipulative(currentSlide.cartridge) && !solvedSlides.has(currentSlideIndex)) || isGameActive || (currentSlide?.cartridge?.type === 'Spot' && !solvedSlides.has(currentSlideIndex)) || isMatchDragActive;
        if (isGamePlaying || isInteractiveElement(e.target)) {
            swipeRef.current = null;
            return;
        }
        swipeRef.current = { startX: e.clientX, startY: e.clientY, startTime: Date.now() };
    };

    const handlePointerUp = (e) => {
        const gesture = swipeRef.current;
        swipeRef.current = null;
        if (!gesture) return;

        const isGamePlaying = (currentSlide?.cartridge && !isOpenManipulative(currentSlide.cartridge) && !solvedSlides.has(currentSlideIndex)) || isGameActive || (currentSlide?.cartridge?.type === 'Spot' && !solvedSlides.has(currentSlideIndex)) || isMatchDragActive;
        if (isGamePlaying) return;

        const dx = e.clientX - gesture.startX;
        const dy = e.clientY - gesture.startY;

        if (Math.abs(dx) >= SWIPE_TRIGGER && Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe anywhere across the slide:
            // Swiping left pulls next slide in, swiping right pulls previous slide
            handleHotzoneNav(dx < 0 ? 'next' : 'prev');
        } else if (Math.abs(dx) <= TAP_TOLERANCE && Math.abs(dy) <= TAP_TOLERANCE) {
            // Navigational border columns are inactive until all matches are completed
            if (isMatchDragActive) return;

            // Tap vertical border columns to navigate:
            // Left border column navigates back; Right border column navigates forward.
            // On a slide with active stripper, tapping anywhere on the slide (except the left back zone) reveals the next strip!
            const viewportRect = viewportRef.current?.getBoundingClientRect() || { left: 0, width: window.innerWidth };
            const stageWidth = 360 * scale;
            const stageLeft = viewportRect.left + (viewportRect.width - stageWidth) / 2;
            const stageRight = stageLeft + stageWidth;

            const isLeftBorder = e.clientX <= (stageLeft + stageWidth * 0.20) || e.clientX < stageLeft;
            const isRightBorder = e.clientX >= (stageRight - stageWidth * 0.20) || e.clientX > stageRight;

            const stripperActive = currentSlide?.stripper?.enabled && currentSlide.stripper.dividers?.length > 0;
            const isStripperStepping = stripperActive && !visitedStripperSlides.has(currentSlideIndex);

            if (isLeftBorder) {
                handleHotzoneNav('prev');
            } else if (isRightBorder || isStripperStepping) {
                handleHotzoneNav('next');
            }
        }
    };

    const handlePointerCancel = () => {
        swipeRef.current = null;
    };

    // Determine active interactive elements
    const isGame = currentSlide?.cartridge && !isOpenManipulative(currentSlide.cartridge);
    const hasCartridge = !!isGame && !solvedSlides.has(currentSlideIndex);
    const hasQuiz = currentSlide?.elements?.some(el => el.type === 'quiz') && !solvedSlides.has(currentSlideIndex);
    const hasISticker = currentSlide?.elements?.some(el => el.type === 'isticker') && !solvedSlides.has(currentSlideIndex);

    // ── Navigation Hint ──
    // After 5s of inactivity on a slide, peek the next slide from the right as a navigation cue.
    const [showNavHint, setShowNavHint] = useState(false);
    const navHintTimerRef = useRef(null);

    // Check if the stripper is still stepping (blocks forward nav)
    const stripperBlocking = currentSlide?.stripper?.enabled
        && currentSlide.stripper.dividers?.length > 0
        && !visitedStripperSlides.has(currentSlideIndex);

    // Open manipulatives (like ExploreNL) don't have a win scenario; don't show the swipe hint so users explore freely without being rushed
    const hasOpenManipulative = isOpenManipulative(currentSlide?.cartridge) ||
        currentSlide?.elements?.some(el => el.type === 'ExploreNL' || el.type === 'ExloreNL' || (el.metadata?.isManipulative && !el.metadata?.hasWinScenario));

    const canNavigateForward = currentSlideIndex < slides.length - 1
        && !hasCartridge && !hasQuiz && !hasISticker && !stripperBlocking;

    useEffect(() => {
        setShowNavHint(false);
        if (navHintTimerRef.current) clearTimeout(navHintTimerRef.current);

        // Do not trigger the swipe slide hint animation on slides with open manipulatives (no win scenario)
        if (!canNavigateForward || hasOpenManipulative) return;

        navHintTimerRef.current = setTimeout(() => {
            setShowNavHint(true);
            // Stays true — CSS animation loops with built-in pause.
            // Dismissed when currentSlideIndex changes or canNavigateForward becomes false.
        }, 5000);

        return () => {
            if (navHintTimerRef.current) clearTimeout(navHintTimerRef.current);
        };
    }, [currentSlideIndex, canNavigateForward, hasOpenManipulative, solvedSlides, visitedStripperSlides]);

    return (
        <div className="player-container">

            {/* Removed external player-header */}

            <div
                className={`player-viewport ${hasCartridge ? 'has-cartridge' : ''}`}
                ref={viewportRef}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                style={{ touchAction: (hasCartridge || isMatchDragActive) ? 'none' : 'pan-y' }}
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
                    {/* Top Controls Bar - Vertically centered between top edge (0px) and progress bar (64px / 10%) */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                        zIndex: 2000
                    }}>
                        {/* Navigation / System Buttons */}
                        <div style={{
                            pointerEvents: 'auto',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center'
                        }}>
                            <button
                                onClick={handleTopBackToMenu}
                                title={t('player.menu')}
                                className="player-top-btn"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                            </button>

                            <FullscreenToggle className="player-top-btn" />
                        </div>

                        {/* Action / Context Buttons */}
                        <div style={{
                            pointerEvents: 'auto',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center'
                        }}>
                            {/* Language Flag Toggle */}
                            <button
                                onClick={() => {
                                    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
                                    const idx = codes.indexOf(language);
                                    const nextLang = codes[(idx + 1) % codes.length];
                                    setLanguage(nextLang);
                                }}
                                title={`Language: ${SUPPORTED_LANGUAGES.find(l => l.code === language)?.label}`}
                                className="player-top-btn"
                                style={{ fontSize: '20px' }}
                            >
                                {SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag}
                            </button>

                            {!state.readOnly && !currentSlide?.isLastSlideCelebration && (
                                <button
                                    onClick={handleEdit}
                                    title={t('common.edit')}
                                    className="player-top-btn"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                        <path d="m15 5 4 4" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Topo / Moco celebrations removed for now */}
                    {false && banner && (
                        <>
                            <div className={`sign-glow ${banner.type === 'correct' ? 'correct-glow' : 'fail-glow'} ${bannerFadingOut ? 'banner-fade-out' : ''}`} />
                            <div className={`quiz-result-sign ${banner.type === 'correct' ? 'correct-sign' : 'fail-sign'} ${bannerFadingOut ? 'banner-fade-out' : ''}`}>
                                <img 
                                    src={banner.type === 'correct' ? '/assets/topo_logo.png' : '/assets/moco_logo.png'} 
                                    alt={banner.text} 
                                    className="result-graphic"
                                />
                            </div>
                        </>
                    )}
                </div>

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
                            className={`player-slide player-stage-scaled ${positionClass} ${isShakingSlide && positionClass === 'slide-active' ? 'slide-shake' : ''} ${showNavHint && positionClass === 'slide-active' ? 'nav-hint-nudge' : ''} ${showNavHint && positionClass === 'slide-next' ? 'nav-hint-peek' : ''}`}
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
                                            backgroundImage: resolveAssetUrl(slide.background),
                                            backgroundSize: slide.backgroundSettings?.sizeMode === 'custom'
                                                ? `${slide.backgroundSettings?.size ?? 100}%`
                                                : (slide.backgroundSettings?.sizeMode || 'cover'),
                                            backgroundPosition: `${slide.backgroundSettings?.positionX ?? 50}% ${slide.backgroundSettings?.positionY ?? 50}%`,
                                            backgroundRepeat: 'no-repeat',
                                            opacity: slide.backgroundSettings?.opacity ?? 1,
                                            filter: `grayscale(${slide.backgroundSettings?.grayscale ? 100 : 0}%) brightness(${slide.backgroundSettings?.brightness ?? 100}%) blur(${slide.backgroundSettings?.blur ?? 0}px)`,
                                            transform: `scale(${(slide.backgroundSettings?.flipX ? -1 : 1) * ((slide.backgroundSettings?.blur ?? 0) > 0 ? 1.05 : 1)}, ${(slide.backgroundSettings?.flipY ? -1 : 1) * ((slide.backgroundSettings?.blur ?? 0) > 0 ? 1.05 : 1)})`,
                                        }}
                                    />
                                    {slide.backgroundSettings?.grayscale && slide.backgroundSettings?.tintColor && slide.backgroundSettings.tintColor !== 'transparent' && (
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
                            {!slide.isLastSlideCelebration && (
                                <div className={`player-progress-bar ${
                                    !solvedSlides.has(currentSlideIndex) && (
                                        (currentSlide?.cartridge && (currentSlide.cartridge.type === 'Potiondas' || currentSlide.cartridge.type === 'PEMDAS' || currentSlide.cartridge.type === 'AlgeBros' || currentSlide.cartridge.type === 'Balanza' || currentSlide.cartridge.type === 'Spot')) ||
                                        currentSlide?.elements?.some(el => el.type === 'quiz' && el.metadata?.quizType === 'pem')
                                    )
                                        ? 'greyed-out'
                                        : ''
                                }`}>
                                    {slides.filter(s => !s.isLastSlideCelebration).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`progress-segment ${i <= currentSlideIndex ? 'active' : ''}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Cartridge Layer - Below Stickers but above background */}
                            {slide.cartridge && (
                                <div className="cartridge-container" style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                                    zIndex: (slide.cartridge.type === 'ExploreNL' || slide.cartridge.type === 'ExloreNL') ? 80 : (slide.cartridge.type === 'Potiondas' && solvedSlides.has(index) ? 101 : (slide.cartridge.type === 'Balanza' ? 20 : 1)), 
                                    pointerEvents: (slide.cartridge.type === 'ExploreNL' || slide.cartridge.type === 'ExloreNL') ? 'none' : ((slide.cartridge.type === 'Potiondas' || slide.cartridge.type === 'AlgeBros') && solvedSlides.has(index) ? 'none' : 'auto')
                                }}>
                                    {slide.cartridge.type === 'FractionAlpha' && (
                                        <FractionAlpha
                                            config={slide.cartridge.config}
                                            onComplete={() => {
                                                handleInteractiveSolve(index, true, 1000);
                                                setIsGameActive(false);
                                            }}
                                        />
                                    )}
                                    {slide.cartridge.type === 'FractionSlicer' && (
                                        <ErrorBoundary>
                                            <FractionSlicer
                                                config={slide.cartridge.config}
                                                onComplete={() => {
                                                    handleInteractiveSolve(index, true, 1000);
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
                                                    handleInteractiveSolve(index, true, 1000);
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
                                                    handleInteractiveSolve(index, true, 1000);
                                                    setIsGameActive(false);
                                                }}
                                            />
                                        </ErrorBoundary>
                                    )}
                                    {slide.cartridge.type === 'AlgeBros' && (
                                        <ErrorBoundary>
                                            <AlgeBrosCartridge
                                                config={slide.cartridge.config}
                                                slideBackground={slide.background}
                                                onComplete={() => {
                                                    handleInteractiveSolve(index, true, 1000);
                                                    setIsGameActive(false);
                                                }}
                                            />
                                        </ErrorBoundary>
                                    )}
                                    {slide.cartridge.type === 'Balanza' && (
                                        <ErrorBoundary>
                                            <BalanzaCartridge
                                                config={slide.cartridge.config}
                                                isWiggling={wiggleCartridge}
                                                onComplete={() => {
                                                    handleInteractiveSolve(index, true, 1000);
                                                    setIsGameActive(false);
                                                }}
                                            />
                                        </ErrorBoundary>
                                    )}
                                    {(slide.cartridge.type === 'ExploreNL' || slide.cartridge.type === 'ExloreNL') && (
                                        <ErrorBoundary>
                                            <ExloreNLCartridge
                                                config={slide.cartridge.config}
                                                preview={false}
                                                onComplete={() => {
                                                    handleInteractiveSolve(index, true, 1000);
                                                    setIsGameActive(false);
                                                }}
                                            />
                                        </ErrorBoundary>
                                    )}
                                    {slide.cartridge.type === 'Spot' && (
                                        <ErrorBoundary>
                                            <SpotCartridge
                                                config={slide.cartridge.config}
                                                slideBackground={slide.background}
                                                onComplete={() => {
                                                    handleInteractiveSolve(index, true, 1000);
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
                                                    handleInteractiveSolve(index, true, 1000);
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

                            {(() => {
                                const hasTypeQuiz = slide.elements?.some(el => el.type === 'quiz' && el.metadata?.quizType === 'type');
                                const renderedElements = slide.elements.map((element, idx) => {
                                    if (element.metadata?.hidden) return null;

                                    // Stripper: determine strip and visibility
                                    const stripperActive = slide.stripper?.enabled && slide.stripper?.dividers?.length > 0;
                                    const elementStrip = stripperActive ? getElementStrip(element.y, slide.stripper.dividers) : 0;
                                    const currentStep = index === currentSlideIndex ? stripperStep : (visitedStripperSlides.has(index) ? (slide.stripper?.dividers?.length || 0) : 0);
                                    const isStripVisible = !stripperActive || elementStrip <= currentStep;
                                    const isStripRevealing = stripperActive && elementStrip === currentStep && elementStrip > 0 && index === currentSlideIndex && !visitedStripperSlides.has(index);

                                    const isFullScreenQuiz = element.type === 'quiz' && (
                                        element.metadata?.quizType === 'chatquiz' || 
                                        element.metadata?.quizType === 'pem' || 
                                        element.metadata?.quizType === 'match' ||
                                        element.metadata?.quizType === 'conecta'
                                    );
                                    const isMatchQuiz = element.type === 'quiz' && (
                                        element.metadata?.quizType === 'match' ||
                                        element.metadata?.quizType === 'conecta'
                                    );
                                    const isTypeQuiz = element.type === 'quiz' && element.metadata?.quizType === 'type';

                                    let effectiveScale = element.scale ?? 1;
                                    let effectiveWidth = element.width;
                                    let effectiveY = element.y;

                                    try {
                                        return (
                                            <div
                                                key={element.id}
                                                className={`player-element ${isFullScreenQuiz ? 'player-element-chatquiz' : ''} ${stripperActive ? (isStripVisible ? (isStripRevealing ? 'stripper-strip-revealing' : 'stripper-strip-visible') : 'stripper-strip-hidden') : ''}`}
                                                style={{
                                                    left: isTypeQuiz ? '0' : (isFullScreenQuiz ? '50%' : `${element.x}%`),
                                                    top: isTypeQuiz ? 'auto' : (isMatchQuiz ? '50%' : (isFullScreenQuiz ? '55%' : `${(element.type === 'quiz' && effectiveY === 75) ? 78.59375 : effectiveY}%`)),
                                                    bottom: isTypeQuiz ? '0' : undefined,
                                                    width: (isFullScreenQuiz || isTypeQuiz) ? '100%' : (element.type === 'quiz' || element.type === 'result_field' ? 'auto' : ((element.type === 'text' || element.type === 'collectible') && !effectiveWidth ? 'auto' : `${effectiveWidth}%`)),
                                                    height: isTypeQuiz ? '30%' : (isMatchQuiz ? '100%' : (isFullScreenQuiz ? '85%' : (element.type === 'text' || element.type === 'collectible' || element.type === 'quiz' || element.type === 'result_field' ? 'auto' : `${element.type === 'popup' ? (element.width * 360 * 206) / (640 * 200) : element.height}%`))),
                                                    transform: isTypeQuiz ? 'none' : (isFullScreenQuiz ? 'translate(-50%, -50%)' : `translate(-50%, -50%) rotate(${element.rotation}deg) scale(${effectiveScale})`),
                                                    zIndex: (element.metadata?.quizType === 'chatquiz' ? 0 : (element.type === 'result_field' ? (idx + 1000) : (isTypeQuiz ? 1000 : (element.type === 'quiz' || element.type === 'cartridge' ? (idx + 50) : (idx + 1))))),
                                                    pointerEvents: (isFullScreenQuiz || isTypeQuiz || element.type === 'result_field' || element.type === 'isticker' || element.type === 'popup') ? 'auto' : undefined,
                                                }}
                                            >
                                            {(element.type === 'text' || element.type === 'collectible') && (
                                                <div
                                                    className={element.type === 'collectible' ? "player-collectible" : "player-text"}
                                                    style={{
                                                        fontFamily: element.metadata?.fontFamily || (element.type === 'collectible' ? '"Outfit", sans-serif' : '"HVD Comic Serif Pro", sans-serif'),
                                                        fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : (element.type === 'collectible' ? '18px' : '16px'),
                                                        fontWeight: element.metadata?.fontWeight || (element.type === 'collectible' ? '500' : 'normal'),
                                                        fontStyle: element.metadata?.fontStyle || 'normal',
                                                        textDecoration: element.metadata?.textDecoration || 'none',
                                                        color: element.metadata?.color || (element.type === 'collectible' ? '#ffffff' : 'black'),
                                                        backgroundColor: element.metadata?.backgroundColor || (element.type === 'collectible' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'),
                                                        padding: (element.metadata?.backgroundColor && element.metadata?.backgroundColor !== 'transparent') ? '0.5rem' : (element.type === 'collectible' ? '1.25rem 1.5rem' : '0'),
                                                        borderRadius: element.metadata?.borderRadius || (element.type === 'collectible' ? '16px' : '8px'),
                                                        border: element.metadata?.border || (element.type === 'collectible' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'),
                                                        boxShadow: element.type === 'collectible' ? '0 8px 32px rgba(0, 0, 0, 0.35)' : undefined,
                                                        backdropFilter: element.type === 'collectible' ? 'blur(8px)' : undefined,
                                                        textAlign: element.metadata?.textAlign || 'center',
                                                        lineHeight: element.metadata?.lineHeight ?? (element.type === 'collectible' ? 1.4 : 1),
                                                        boxSizing: 'border-box',
                                                        maxWidth: '100%',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: formatExponents(
                                                        getTranslatedContent(element, language)
                                                    ) }}
                                                />
                                            )}
                                            {element.type === 'line' && (() => {
                                                const thickness = element.metadata?.height || 10;
                                                const color = element.metadata?.symbolColor || '#8B5CF6';
                                                const lineType = element.metadata?.lineType || 'normal';
                                                const isCurved = !!element.metadata?.isCurved;

                                                if (isCurved) {
                                                    const curvature = element.metadata?.curvature ?? -40;
                                                    const curveSkew = element.metadata?.curveSkew ?? 0;
                                                    const widthPx = (element.width / 100) * 360;
                                                    const heightPx = (element.height / 100) * 640;
                                                    const y0 = heightPx / 2;

                                                    const mx = widthPx / 2 + curveSkew;
                                                    const my = y0 + curvature;

                                                    const cx = 2 * mx - widthPx / 2;
                                                    const cy = 2 * my - y0;

                                                    const pathData = `M 0 ${y0} Q ${cx} ${cy} ${widthPx} ${y0}`;

                                                    let strokeDash = undefined;
                                                    let strokeLinecap = 'round';
                                                    let filter = undefined;

                                                    if (lineType === 'dotted') {
                                                        strokeDash = `${Math.max(1, thickness * 0.15)} ${thickness * 1.6}`;
                                                        strokeLinecap = 'round';
                                                    } else if (lineType === 'cutting') {
                                                        strokeDash = `${thickness * 2.5} ${thickness * 1.5}`;
                                                        strokeLinecap = 'butt';
                                                    } else if (lineType === 'pencil') {
                                                        filter = 'url(#pencil-filter-curved-player)';
                                                    } else if (lineType === 'ink') {
                                                        filter = 'url(#ink-filter-curved-player)';
                                                    }

                                                    let vxStart = 0 - cx;
                                                    let vyStart = y0 - cy;
                                                    if (vxStart === 0 && vyStart === 0) { vxStart = -1; vyStart = 0; }
                                                    const thetaStart = Math.atan2(vyStart, vxStart) * (180 / Math.PI);

                                                    let vxEnd = widthPx - cx;
                                                    let vyEnd = y0 - cy;
                                                    if (vxEnd === 0 && vyEnd === 0) { vxEnd = 1; vyEnd = 0; }
                                                    const thetaEnd = Math.atan2(vyEnd, vxEnd) * (180 / Math.PI);

                                                    const arrowSize = Math.max(16, thickness * 2.2);

                                                    return (
                                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                                            <svg
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    overflow: 'visible',
                                                                    pointerEvents: 'none'
                                                                }}
                                                                viewBox={`0 0 ${widthPx} ${heightPx}`}
                                                            >
                                                                <defs>
                                                                    <filter id="pencil-filter-curved-player" x="-20%" y="-20%" width="140%" height="140%">
                                                                        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                                                                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                                                                    </filter>
                                                                    <filter id="ink-filter-curved-player" x="-20%" y="-20%" width="140%" height="140%">
                                                                        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise" />
                                                                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
                                                                    </filter>
                                                                </defs>

                                                                <path
                                                                    d={pathData}
                                                                    fill="none"
                                                                    stroke={color}
                                                                    strokeWidth={thickness}
                                                                    strokeDasharray={strokeDash}
                                                                    strokeLinecap={strokeLinecap}
                                                                    filter={filter}
                                                                />

                                                                {element.metadata?.startCap === 'arrow' && (
                                                                    <g transform={`translate(0, ${y0}) rotate(${thetaStart})`}>
                                                                        <polygon
                                                                            points={`0,0 ${arrowSize},${-arrowSize * 0.45} ${arrowSize * 0.75},0 ${arrowSize},${arrowSize * 0.45}`}
                                                                            fill={color}
                                                                        />
                                                                    </g>
                                                                )}
                                                                {element.metadata?.startCap === 'circle' && (
                                                                    <circle cx={0} cy={y0} r={thickness * 0.9} fill={color} />
                                                                )}

                                                                {element.metadata?.endCap === 'arrow' && (
                                                                    <g transform={`translate(${widthPx}, ${y0}) rotate(${thetaEnd})`}>
                                                                        <polygon
                                                                            points={`0,0 ${-arrowSize},${-arrowSize * 0.45} ${-arrowSize * 0.75},0 ${-arrowSize},${arrowSize * 0.45}`}
                                                                            fill={color}
                                                                        />
                                                                    </g>
                                                                )}
                                                                {element.metadata?.endCap === 'circle' && (
                                                                    <circle cx={widthPx} cy={y0} r={thickness * 0.9} fill={color} />
                                                                )}
                                                            </svg>
                                                        </div>
                                                    );
                                                }

                                                let lineStyle = {
                                                    width: '100%',
                                                    height: `${thickness}px`,
                                                    boxSizing: 'border-box'
                                                };

                                                if (lineType === 'normal') {
                                                    lineStyle.backgroundColor = color;
                                                    lineStyle.borderRadius = `${thickness / 2}px`;
                                                } else if (lineType === 'dotted') {
                                                    lineStyle.backgroundImage = `radial-gradient(circle, ${color} 30%, transparent 35%)`;
                                                    lineStyle.backgroundSize = `${thickness * 2}px ${thickness}px`;
                                                    lineStyle.backgroundRepeat = 'repeat-x';
                                                    lineStyle.backgroundPosition = 'center';
                                                } else if (lineType === 'cutting') {
                                                    lineStyle.backgroundImage = `linear-gradient(to right, ${color} 60%, transparent 60%)`;
                                                    lineStyle.backgroundSize = `${thickness * 3}px ${thickness}px`;
                                                    lineStyle.backgroundRepeat = 'repeat-x';
                                                    lineStyle.backgroundPosition = 'center';
                                                } else if (lineType === 'pencil') {
                                                    lineStyle.backgroundColor = color;
                                                    lineStyle.borderRadius = `${thickness / 2}px`;
                                                    lineStyle.filter = 'url(#pencil-filter)';
                                                } else if (lineType === 'ink') {
                                                    lineStyle.backgroundColor = color;
                                                    lineStyle.borderRadius = `${thickness / 2}px`;
                                                    lineStyle.filter = 'url(#ink-filter)';
                                                }

                                                return (
                                                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {/* Hidden SVG Filters for hand-drawn look */}
                                                        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none', visibility: 'hidden' }}>
                                                            <defs>
                                                                <filter id="pencil-filter" x="-20%" y="-20%" width="140%" height="140%">
                                                                    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
                                                                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                                                                </filter>
                                                                <filter id="ink-filter" x="-20%" y="-20%" width="140%" height="140%">
                                                                    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise" />
                                                                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
                                                                </filter>
                                                            </defs>
                                                        </svg>

                                                        {/* Line body */}
                                                        <div style={lineStyle} />
                                                        
                                                        {/* Start Cap */}
                                                        {element.metadata?.startCap === 'arrow' && (
                                                            <svg style={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%, -50%)', width: `${Math.max(20, (element.metadata?.height || 10) * 2.5)}px`, height: `${Math.max(20, (element.metadata?.height || 10) * 2.5)}px`, overflow: 'visible' }} viewBox="0 0 100 100">
                                                                <polygon points="100,0 0,50 100,100" fill={element.metadata?.symbolColor || '#8B5CF6'} />
                                                            </svg>
                                                        )}
                                                        {element.metadata?.startCap === 'circle' && (
                                                            <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%, -50%)', width: `${(element.metadata?.height || 10) * 2}px`, height: `${(element.metadata?.height || 10) * 2}px`, borderRadius: '50%', backgroundColor: element.metadata?.symbolColor || '#8B5CF6' }} />
                                                        )}

                                                        {/* End Cap */}
                                                        {element.metadata?.endCap === 'arrow' && (
                                                            <svg style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: `${Math.max(20, (element.metadata?.height || 10) * 2.5)}px`, height: `${Math.max(20, (element.metadata?.height || 10) * 2.5)}px`, overflow: 'visible' }} viewBox="0 0 100 100">
                                                                <polygon points="0,0 100,50 0,100" fill={element.metadata?.symbolColor || '#8B5CF6'} />
                                                            </svg>
                                                        )}
                                                        {element.metadata?.endCap === 'circle' && (
                                                            <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: `${(element.metadata?.height || 10) * 2}px`, height: `${(element.metadata?.height || 10) * 2}px`, borderRadius: '50%', backgroundColor: element.metadata?.symbolColor || '#8B5CF6' }} />
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            {element.type === 'image' && (
                                                <>
                                                    <CharacterShadow element={element} />
                                                    <img 
                                                        src={resolveAssetUrl(element.content)} 
                                                        alt="content" 
                                                        style={{
                                                            position: 'relative',
                                                            zIndex: 1,
                                                            transform: `scale(${element.metadata?.flipX ? -1 : 1}, ${element.metadata?.flipY ? -1 : 1})`,
                                                            opacity: element.metadata?.opacity ?? 1,
                                                            filter: element.metadata?.brightness !== undefined ? `brightness(${element.metadata.brightness}%)` : undefined,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: (element.metadata?.isSymbol && element.metadata?.symbolType?.startsWith('shape-')) ? 'fill' : 'contain'
                                                        }} 
                                                    />
                                                </>
                                            )}
                                            {element.type === 'quiz' && (
                                                <QuizPlayer
                                                    data={(() => {
                                                        let d = element;
                                                        const trans = element.metadata?.translations?.[language];
                                                        if (language !== 'es' && trans) {
                                                            d = {
                                                                ...element,
                                                                metadata: {
                                                                    ...element.metadata,
                                                                    ...(trans.options && { options: trans.options }),
                                                                    ...(trans.matchAnswers && { matchAnswers: trans.matchAnswers }),
                                                                    ...(trans.chatNodes && { chatNodes: trans.chatNodes }),
                                                                }
                                                            };
                                                        }
                                                        return d;
                                                    })()}
                                                    onNext={(isSuccess = false, force = false) => {
                                                         handleInteractiveSolve(index, isSuccess, 1000, force);
                                                     }}
                                                    onSolve={(answer) => {
                                                        setSolvedAnswers(prev => ({ ...prev, [index]: answer }));
                                                    }}
                                                    onBanner={handleBanner}
                                                    disabled={isNavigating}
                                                    debugMode={debugMode}
                                                    isActive={index === currentSlideIndex}
                                                />
                                            )}
                                            {element.type === 'game' && (
                                                <MinigamePlayer
                                                    data={element}
                                                    onComplete={() => handleInteractiveSolve(index, true, 1000)}
                                                />
                                            )}
                                            {element.type === 'result_field' && (
                                                <ResultField
                                                    element={element}
                                                    slide={slide}
                                                    isSolved={solvedSlides.has(index)}
                                                    solvedAnswer={solvedAnswers[index]}
                                                    isPlayMode={true}
                                                    language={language}
                                                />
                                            )}
                                            {element.type === 'number_line' && (
                                                <NumberLine element={element} />
                                            )}
                                              {element.type === 'banner' && (
                                                  <Banner
                                                      element={{
                                                          ...element,
                                                          content: getTranslatedContent(element, language)
                                                      }}
                                                      readOnly={true}
                                                  />
                                              )}
                                              {element.type === 'balloon' && (
                                                 <Balloon
                                                     element={{
                                                         ...element,
                                                         content: getTranslatedContent(element, language)
                                                     }}
                                                     readOnly={true}
                                                 />
                                             )}
                                            {element.type === 'isticker' && (
                                                <IStickerPlayer
                                                    data={element}
                                                    isActive={index === currentSlideIndex}
                                                    onComplete={() => {
                                                        markSlideSolved(index);
                                                        setAutoPlayIStickerId(null);
                                                        // If on a stripper slide, auto-advance to the next strip after animation
                                                        const s = slides[index];
                                                        const sActive = s?.stripper?.enabled && s.stripper.dividers?.length > 0;
                                                        if (sActive && !visitedStripperSlides.has(index)) {
                                                            playStripRevealSfx();
                                                            setStripperStep(prev => prev + 1);
                                                        }
                                                    }}
                                                    isWiggling={wiggleIStickerId === element.id}
                                                    autoPlay={autoPlayIStickerId === element.id}
                                                />
                                            )}
                                            {element.type === 'popup' && (
                                                <img 
                                                    src="/assets/characters/tutuTucaSticker_SMALL.png" 
                                                    alt="popup" 
                                                    onClick={() => setActivePopupText(element.metadata?.popupText || '')}
                                                    style={{
                                                        transform: `scale(${element.metadata?.flipX ? -1 : 1}, ${element.metadata?.flipY ? -1 : 1})`,
                                                        opacity: element.metadata?.opacity ?? 1,
                                                        filter: `brightness(${element.metadata?.brightness ?? 100}%)`,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'contain',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                } catch (err) {
                                    console.error('Failed to render element:', element, err);
                                    return null;
                                }
                            });

                            if (hasTypeQuiz) {
                                return (
                                    <TypeQuizProvider
                                        slide={slide}
                                        isActive={index === currentSlideIndex}
                                        onSolve={(answer) => {
                                            setSolvedAnswers(prev => ({ ...prev, [index]: answer }));
                                        }}
                                        onNext={(isSuccess = false, force = false) => {
                                            handleInteractiveSolve(index, isSuccess, 1000, force);
                                        }}
                                        onBanner={handleBanner}
                                    >
                                        {renderedElements}
                                    </TypeQuizProvider>
                                );
                            }

                            return renderedElements;
                        })()}

                            {/* Celebration Last Slide Back to Menu Button */}
                            {slide.isLastSlideCelebration && (
                                <div className="player-back-to-menu-container">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleBackToMenuWithScroll();
                                        }}
                                        className="player-back-to-menu-btn"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="19" y1="12" x2="5" y2="12" />
                                            <polyline points="12 19 5 12 12 5" />
                                        </svg>
                                        {t('player.backToMenu', 'BACK TO MENU')}
                                    </button>
                                </div>
                            )}

                            {/* Popup Overlay Modal */}
                            {index === currentSlideIndex && activePopupText !== null && (
                                <div className="popup-modal-overlay" onClick={() => setActivePopupText(null)}>
                                    <div className="popup-modal-window" onClick={(e) => e.stopPropagation()}>
                                        <button className="popup-modal-close" onClick={() => setActivePopupText(null)}>×</button>
                                        <div className="popup-modal-content">
                                            {activePopupText}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {/* End of render loop */}
        </div>
    );
};

export default Player;
