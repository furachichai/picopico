import React, { useState, useEffect, useRef } from 'react';
import { Star, Lock, Play, Trophy, User, ChevronRight, BookOpen, Gamepad2, Compass, Layers, Plus, Settings } from 'lucide-react';

import { useEditor } from '../../context/EditorContext';
import { useLanguage } from '../../context/LanguageContext';
import { getLessonProgress } from '../../utils/storage';
import { resolveAssetUrl } from '../../utils/assetUrl';
import FullscreenToggle from '../FullscreenToggle';
import SlideThumbnail from '../Editor/SlideThumbnail';
import TitlecardCircleFrame from './TitlecardCircleFrame';
import CircleFrameModal from './CircleFrameModal';
import BannerModal from './BannerModal';
import MenuSettingsModal from './MenuSettingsModal';
import BottomNav from './BottomNav';

// Mock translation function
const t = (key) => {
  const translations = {
    'dashboard.greeting': 'Hi, Alex!',
    'dashboard.mission': "Today's Mission",
    'dashboard.progress': '2/3 Lessons',
    'dashboard.start': 'START',
    'dashboard.editor': 'EDITOR',
    'dashboard.locked': 'Locked',
    'dashboard.lessons': 'LESSONS',
    'dashboard.game': 'GAME',
    'lesson.1.title': 'Intro to Coding',
    'lesson.1.desc': 'Learn the basics',
    'lesson.2.title': 'Variables',
    'lesson.2.desc': 'Storing data',
    'lesson.3.title': 'Loops',
    'lesson.3.desc': 'Repeating actions',
    'lesson.4.title': 'Conditionals',
    'lesson.4.desc': 'Making decisions',
    'lesson.5.title': 'Functions',
    'lesson.5.desc': 'Reusable code',
    'lesson.6.title': 'Arrays',
    'lesson.6.desc': 'Lists of data',
    'lesson.7.title': 'Objects',
    'lesson.7.desc': 'Key-value pairs',
    'lesson.8.title': 'Async',
    'lesson.8.desc': 'Promises & more',
  };
  return translations[key] || key;
};


const Dashboard = () => {
  const { state, dispatch } = useEditor();
  const { language, setLanguage, SUPPORTED_LANGUAGES } = useLanguage();

  const currentLangObj = SUPPORTED_LANGUAGES?.find(l => l.code === language) || { code: language, label: language, flag: '🇪🇸' };

  const handleToggleLanguage = () => {
    if (!SUPPORTED_LANGUAGES || SUPPORTED_LANGUAGES.length === 0) return;
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    const idx = codes.indexOf(language);
    const nextLang = codes[(idx + 1) % codes.length];
    setLanguage(nextLang);
  };
  const [lessons, setLessons] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFrameLesson, setEditingFrameLesson] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [menuSettings, setMenuSettings] = useState({
    menuBg: '#FFFFFF',
    buttonBorderColor: '#000000',
    buttonShadowColor: '#42DEE8',
    bannerBorderColor: '#000000',
    buttonTitleColor: '#FFFFFF',
    titleShadowColor: '#000000',
    buttonOverlayBg: 'rgba(0, 0, 0, 0.68)',
    buttonTitleFontSize: '1.6rem',
    buttonOverlayHeight: 38,
    showStars: true,
    showLastSlide: true
  });
  const [isMenuSettingsOpen, setIsMenuSettingsOpen] = useState(false);

  const fetchLessons = async () => {
    try {
      const isDev = import.meta.env.DEV;

      let data;
      if (isDev) {
        const response = await fetch('/api/list-lessons');
        data = await response.json();
      } else {
        const response = await fetch('/lessons-data.json');
        data = await response.json();
      }

      // data is already a flat array — filter to visible only
      const visibleLessons = data
        .filter(item => item.visible !== false)
        .map(item => {
          const progress = getLessonProgress(item.path);
          const isCompleted = progress?.completed;
          return {
            ...item,
            id: item.path,
            status: isCompleted ? 'completed' : 'active',
            statusIcon: isCompleted ? <Trophy size={24} /> : <Play size={24} />,
            progress
          };
        });

      setLessons(visibleLessons);

      // Fetch banners
      try {
        const bannerRes = await fetch(isDev ? '/api/banners' : '/banners.json');
        if (bannerRes.ok) {
          const bannerData = await bannerRes.json();
          setBanners(bannerData);
        }
      } catch (err) {
        console.error('Error fetching banners:', err);
      }

      // Fetch menu settings
      try {
        const settingsRes = await fetch(isDev ? '/api/menu-settings' : '/menu-settings.json');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setMenuSettings(prev => ({ ...prev, ...settingsData }));
        }
      } catch (err) {
        console.error('Error fetching menu settings:', err);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  // When returning from completing a lesson, scroll so the next lesson button (completed + 1) is centered
  useEffect(() => {
    let targetPath = null;
    let completedPath = null;

    try {
      targetPath = sessionStorage.getItem('picopico_scroll_to_lesson') || window.__pico_scroll_to_lesson;
      completedPath = sessionStorage.getItem('picopico_completed_lesson') || window.__pico_completed_lesson;
    } catch (e) {
      targetPath = window.__pico_scroll_to_lesson;
      completedPath = window.__pico_completed_lesson;
    }

    if (!targetPath && !completedPath) return;
    if (loading || lessons.length === 0) return;

    const norm = (p) => (p || '').replace(/\\/g, '/').toLowerCase().trim();

    // If targetPath is not directly set, compute next lesson (completed + 1) from dashboard's own lessons array
    if (!targetPath && completedPath) {
      const cNorm = norm(completedPath);
      const cIdx = lessons.findIndex(l => {
        const lp = norm(l.path);
        return (lp && (lp === cNorm || lp.endsWith(cNorm) || cNorm.endsWith(lp))) ||
               (l.id && l.id === completedPath) ||
               (l.name && cNorm.includes(norm(l.name)));
      });
      if (cIdx !== -1) {
        const nextIdx = cIdx + 1 < lessons.length ? cIdx + 1 : cIdx;
        targetPath = lessons[nextIdx]?.path || lessons[nextIdx]?.id;
      }
    }

    if (!targetPath) return;

    const targetNorm = norm(targetPath);

    const performScroll = () => {
      const scrollArea = document.querySelector('.scroll-area');
      const cards = Array.from(document.querySelectorAll('.lesson-square-card'));
      const card = cards.find(el => {
        const elPath = norm(el.getAttribute('data-lesson-path'));
        const elId = el.getAttribute('data-lesson-id');
        const elName = norm(el.getAttribute('data-lesson-name'));
        return (
          (elPath && (elPath === targetNorm || elPath.endsWith(targetNorm) || targetNorm.endsWith(elPath))) ||
          (elId && (elId === targetPath || elId === targetNorm)) ||
          (elName && targetNorm.includes(elName))
        );
      });

      if (scrollArea && card) {
        const scrollAreaRect = scrollArea.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const targetScrollTop = scrollArea.scrollTop + (cardRect.top - scrollAreaRect.top) - (scrollAreaRect.height / 2) + (cardRect.height / 2);

        scrollArea.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });

        card.classList.add('next-lesson-pulse');
        setTimeout(() => card.classList.remove('next-lesson-pulse'), 3000);

        try {
          sessionStorage.removeItem('picopico_scroll_to_lesson');
          sessionStorage.removeItem('picopico_completed_lesson');
        } catch (e) {}
        window.__pico_scroll_to_lesson = null;
        window.__pico_completed_lesson = null;
        return true;
      }
      return false;
    };

    // Execute scroll with a short delay for layout calculation and retry once if not ready
    const timer1 = setTimeout(() => {
      const ok = performScroll();
      if (!ok) {
        setTimeout(performScroll, 250);
      }
    }, 150);

    return () => clearTimeout(timer1);
  }, [loading, lessons]);

  const handleSaveMenuSettings = async (newSettings) => {
    try {
      setMenuSettings(newSettings);
      await fetch('/api/menu-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (err) {
      console.error('Error saving menu settings:', err);
      alert('Failed to save menu settings');
    }
  };

  const handleSaveBanner = async (bannerData) => {
    try {
      let updatedBanners;
      const index = banners.findIndex(b => b.id === bannerData.id);
      if (index >= 0) {
        updatedBanners = [...banners];
        updatedBanners[index] = bannerData;
      } else {
        updatedBanners = [...banners, bannerData];
      }
      setBanners(updatedBanners);

      await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBanners)
      });
    } catch (err) {
      console.error('Error saving banner:', err);
      alert('Failed to save banner');
    }
  };

  const handleDeleteBanner = async (bannerToDelete) => {
    try {
      const updatedBanners = banners.filter(b => b.id !== bannerToDelete.id);
      setBanners(updatedBanners);

      await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBanners)
      });
    } catch (err) {
      console.error('Error deleting banner:', err);
      alert('Failed to delete banner');
    }
  };

  const handleSaveCircleFrame = async (newFrame, visibilityOptions = {}) => {
    if (!editingFrameLesson) return;
    try {
      const targetLesson = editingFrameLesson;
      const res = await fetch(`/api/load-lesson?path=${encodeURIComponent(targetLesson.path)}`);
      if (!res.ok) throw new Error('Failed to load lesson for frame save');
      const currentData = await res.json();

      const updated = {
        ...currentData,
        titlecardFrame: newFrame
      };

      if (typeof visibilityOptions.visible === 'boolean') {
        updated.visible = visibilityOptions.visible;
        if (updated.content) updated.content.visible = visibilityOptions.visible;
      }
      if (typeof visibilityOptions.visibleInFeed === 'boolean') {
        updated.visibleInFeed = visibilityOptions.visibleInFeed;
        if (updated.content) updated.content.visibleInFeed = visibilityOptions.visibleInFeed;
      }

      const saveRes = await fetch('/api/save-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetLesson.path, content: updated })
      });

      if (!saveRes.ok) throw new Error('Failed to save frame');

      try {
        const { getLocalLessons, saveLocalLesson } = await import('../../utils/lessonStorage');
        const local = getLocalLessons().find(l => l.path === targetLesson.path);
        if (local) {
          saveLocalLesson({
            ...local,
            titlecardFrame: newFrame,
            ...(typeof visibilityOptions.visible === 'boolean' && { visible: visibilityOptions.visible }),
            ...(typeof visibilityOptions.visibleInFeed === 'boolean' && { visibleInFeed: visibilityOptions.visibleInFeed })
          });
        }
      } catch (e) {
        // Ignore
      }

      try {
        const { invalidateDiscoverCache } = await import('./DiscoverView');
        invalidateDiscoverCache();
      } catch (e) {
        // Ignore
      }

      setEditingFrameLesson(null);
      await fetchLessons();
    } catch (err) {
      console.error('Error saving titlecard frame:', err);
      alert('Failed to save lesson settings');
    }
  };

  const handleOpenEditor = () => {
    dispatch({ type: 'SET_VIEW', payload: 'editor' });
  };

  const handlePlayLesson = async (lessonItem) => {
    // Try to enter fullscreen to maximize screen space
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { /* Safari/Chrome Mobile might need this */
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE11 */
        await elem.msRequestFullscreen();
      }
    } catch (err) {
      console.log("Fullscreen request failed or denied:", err);
      // Continue anyway
    }

    try {
      const isDev = import.meta.env.DEV;

      let lessonData;
      if (isDev) {
        // Use API on localhost
        const response = await fetch(`/api/load-lesson?path=${encodeURIComponent(lessonItem.path)}`);
        if (!response.ok) throw new Error('Failed to load lesson');
        lessonData = await response.json();
      } else {
        // On Vercel, use embedded content from the lesson item (already loaded in lessons state)
        lessonData = lessonItem.content || lessonItem;
      }

      // Merge metadata
      const fullLesson = {
        ...lessonData,
        ...lessonItem, // Contains parsed metadata
        path: lessonItem.path
      };

      dispatch({ type: 'LOAD_LESSON', payload: fullLesson });
      dispatch({ type: 'SET_VIEW', payload: 'player' });
    } catch (error) {
      console.error('Error loading lesson:', error);
      alert('Failed to load lesson');
    }
  };

  const titleShadow = (menuSettings.titleShadowColor === 'none' || menuSettings.titleShadowColor === 'transparent')
    ? 'none'
    : (menuSettings.titleShadowColor
        ? `0 2px 4px ${menuSettings.titleShadowColor}`
        : ((menuSettings.buttonTitleColor === '#000000' || menuSettings.buttonTitleColor === '#1E293B')
            ? 'none'
            : '0 2px 4px rgba(0, 0, 0, 0.95)'));

  const planeDeepRef = useRef(null);
  const planeMidRef = useRef(null);

  const handleScroll = (e) => {
    const top = e.target.scrollTop;
    if (planeDeepRef.current) {
      planeDeepRef.current.style.transform = `translate3d(0, ${-top * 0.12}px, 0)`;
    }
    if (planeMidRef.current) {
      planeMidRef.current.style.transform = `translate3d(0, ${-top * 0.28}px, 0)`;
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <div
        className="dashboard-container"
        style={{
          backgroundColor: menuSettings.menuBg || '#FFFFFF',
          '--btn-border': menuSettings.buttonBorderColor || '#000000',
          '--btn-shadow': menuSettings.buttonShadowColor || menuSettings.buttonBorderColor || '#000000',
          '--btn-overlay-bg': menuSettings.buttonOverlayBg || 'rgba(0, 0, 0, 0.68)',
          '--btn-title-color': menuSettings.buttonTitleColor || '#FFFFFF',
          '--btn-title-shadow': titleShadow,
          '--btn-overlay-height': `${menuSettings.buttonOverlayHeight ?? 38}%`,
          '--btn-title-font-size': menuSettings.buttonTitleFontSize || '1.6rem'
        }}
      >
        <style>{`
        :root {
          --primary: #8B5CF6;
          --primary-dark: #7C3AED;
          --secondary: #FACC15;
          --secondary-dark: #EAB308;
          --bg: #ffffff;
          --text: #1E293B;
          --text-light: #64748B;
          --white: #ffffff;
          --radius: 20px;
          --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .dashboard-container {
          font-family: 'Outfit', 'Inter', sans-serif;
          background: var(--bg);
          height: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--text);
          max-width: 480px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
        }

        /* Top Bar */
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px clamp(12px, 3vw, 20px);
          padding-top: max(12px, calc(12px + env(safe-area-inset-top, 0px)));
          padding-left: max(12px, calc(12px + env(safe-area-inset-left, 0px)));
          padding-right: max(12px, calc(12px + env(safe-area-inset-right, 0px)));
          background-color: #FFFFFF !important;
          border-bottom: 2px solid #F1F5F9;
          z-index: 10;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          box-sizing: border-box;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .avatar {
          width: 44px;
          height: 44px;
          background-color: #E2E8F0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #E2E8F0;
          box-shadow: var(--shadow);
          color: var(--primary);
          flex-shrink: 0;
        }

        .greeting {
          font-weight: 700;
          font-size: 1.05rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gem-counter {
          background-color: var(--white);
          padding: 6px 12px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: var(--secondary-dark);
          box-shadow: var(--shadow);
          border: 2px solid #F1F5F9;
        }

        /* Parallax Starfield Background */
        .dashboard-stars-wrapper {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
        }

        .stars-parallax-plane {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: -2500px;
          will-change: transform;
          pointer-events: none;
        }

        .stars-drift-deep,
        .stars-drift-mid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-repeat: repeat;
          pointer-events: none;
        }

        /* Deep layer: distant small stars, slower 80s continuous ambient drift */
        .stars-drift-deep {
          background-image:
            radial-gradient(1px 1px at 15px 12px, rgba(255,255,255,0.7), rgba(255,255,255,0)),
            radial-gradient(0.8px 0.8px at 45px 38px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
            radial-gradient(1.2px 1.2px at 75px 18px, rgba(255,255,255,0.65), rgba(255,255,255,0)),
            radial-gradient(0.7px 0.7px at 105px 42px, rgba(255,255,255,0.45), rgba(255,255,255,0)),
            radial-gradient(1px 1px at 135px 15px, rgba(255,255,255,0.6), rgba(255,255,255,0)),
            radial-gradient(0.8px 0.8px at 165px 35px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
            radial-gradient(1.1px 1.1px at 190px 10px, rgba(255,255,255,0.7), rgba(255,255,255,0)),
            radial-gradient(0.9px 0.9px at 25px 75px, rgba(255,255,255,0.55), rgba(255,255,255,0)),
            radial-gradient(1.2px 1.2px at 60px 88px, rgba(255,255,255,0.65), rgba(255,255,255,0)),
            radial-gradient(0.7px 0.7px at 90px 65px, rgba(255,255,255,0.45), rgba(255,255,255,0)),
            radial-gradient(1px 1px at 120px 82px, rgba(255,255,255,0.6), rgba(255,255,255,0)),
            radial-gradient(0.8px 0.8px at 155px 70px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
            radial-gradient(1.1px 1.1px at 180px 92px, rgba(255,255,255,0.7), rgba(255,255,255,0)),
            radial-gradient(0.8px 0.8px at 35px 135px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
            radial-gradient(1.2px 1.2px at 70px 120px, rgba(255,255,255,0.65), rgba(255,255,255,0)),
            radial-gradient(0.7px 0.7px at 105px 145px, rgba(255,255,255,0.45), rgba(255,255,255,0)),
            radial-gradient(1px 1px at 145px 125px, rgba(255,255,255,0.6), rgba(255,255,255,0)),
            radial-gradient(0.8px 0.8px at 175px 140px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
            radial-gradient(1px 1px at 20px 180px, rgba(255,255,255,0.6), rgba(255,255,255,0)),
            radial-gradient(0.8px 0.8px at 85px 175px, rgba(255,255,255,0.5), rgba(255,255,255,0)),
            radial-gradient(1.1px 1.1px at 130px 185px, rgba(255,255,255,0.65), rgba(255,255,255,0)),
            radial-gradient(0.9px 0.9px at 170px 170px, rgba(255,255,255,0.55), rgba(255,255,255,0));
          background-size: 200px 200px;
          animation: starDriftDeep 80s linear infinite;
        }

        /* Mid layer: nearer brighter stars, 45s continuous ambient drift */
        .stars-drift-mid {
          background-image:
            radial-gradient(2px 2px at 30px 25px, #ffffff, rgba(255,255,255,0)),
            radial-gradient(1.5px 1.5px at 85px 45px, rgba(255,255,255,0.9), rgba(255,255,255,0)),
            radial-gradient(2.4px 2.4px at 150px 20px, #ffffff, rgba(255,255,255,0)),
            radial-gradient(1.6px 1.6px at 210px 50px, rgba(255,255,255,0.85), rgba(255,255,255,0)),
            radial-gradient(1.8px 1.8px at 50px 105px, rgba(255,255,255,0.95), rgba(255,255,255,0)),
            radial-gradient(2.2px 2.2px at 120px 90px, #ffffff, rgba(255,255,255,0)),
            radial-gradient(1.5px 1.5px at 185px 115px, rgba(255,255,255,0.9), rgba(255,255,255,0)),
            radial-gradient(2.5px 2.5px at 240px 80px, #ffffff, rgba(255,255,255,0)),
            radial-gradient(1.6px 1.6px at 25px 165px, rgba(255,255,255,0.85), rgba(255,255,255,0)),
            radial-gradient(2px 2px at 95px 150px, #ffffff, rgba(255,255,255,0)),
            radial-gradient(1.7px 1.7px at 160px 175px, rgba(255,255,255,0.9), rgba(255,255,255,0)),
            radial-gradient(2.2px 2.2px at 225px 155px, #ffffff, rgba(255,255,255,0)),
            radial-gradient(1.5px 1.5px at 60px 225px, rgba(255,255,255,0.85), rgba(255,255,255,0)),
            radial-gradient(2.4px 2.4px at 135px 210px, #ffffff, rgba(255,255,255,0)),
            radial-gradient(1.8px 1.8px at 195px 240px, rgba(255,255,255,0.95), rgba(255,255,255,0)),
            radial-gradient(2px 2px at 245px 220px, #ffffff, rgba(255,255,255,0));
          background-size: 260px 260px;
          animation: starDriftMid 45s linear infinite;
        }

        @keyframes starDriftDeep {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(0, -200px, 0); }
        }

        @keyframes starDriftMid {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(0, -260px, 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .stars-drift-deep, .stars-drift-mid {
            animation: none !important;
          }
        }

        /* Scroll Area */
        .scroll-area {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 16px 20px 20px 20px;
          -webkit-overflow-scrolling: touch;
          /* Hide scrollbar for cleaner look */
          scrollbar-width: none; /* Firefox */
          position: relative;
          z-index: 2;
        }
        .scroll-area::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }

        /* Lesson Path */
        .lesson-path {
          display: flex;
          flex-direction: column;
          gap: 22px;
          padding-bottom: clamp(60px, 25vh, 220px);
          width: 100%;
          box-sizing: border-box;
        }

        /* Horizontal Banner */
        .horizontal-banner-wrapper {
          width: 100%;
          position: relative;
          margin: 14px 0 4px 0;
          box-sizing: border-box;
          content-visibility: auto;
          contain-intrinsic-size: 320px 80px;
        }

        .horizontal-banner {
          width: 100%;
          border: 3.5px solid #000000;
          border-radius: 999px;
          background-color: #FFFFFF;
          box-shadow: none !important;
          padding: 8px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          min-height: 76px;
          pointer-events: none; /* Non-clickable */
          user-select: none;
        }

        .horizontal-banner-img {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 3px solid #000000;
          overflow: hidden;
          background-color: #FFFFFF;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .horizontal-banner-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .horizontal-banner-title {
          font-family: 'Fredoka', 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #000000;
          text-align: center;
          flex: 1;
          padding: 0 8px;
        }

        .banner-creator-edit-btn {
          pointer-events: auto;
          position: absolute;
          right: -6px;
          top: -8px;
          background: #FFFFFF;
          border: 2px solid #000000;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.8rem;
          box-shadow: 2px 2px 0px #000000;
          z-index: 5;
        }

        /* Square Lesson Button with Round Edges - 20% bigger */
        .lesson-square-card {
          width: clamp(204px, 58vw, 248px);
          aspect-ratio: 1 / 1;
          border-radius: 32px;
          border: 3.5px solid var(--btn-border, #000000);
          box-shadow: 7px 7px 0px var(--btn-shadow, var(--btn-border, #000000));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 0;
          box-sizing: border-box;
          cursor: pointer;
          position: relative;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          overflow: hidden;
          content-visibility: auto;
          contain-intrinsic-size: 220px 220px;
        }

        .lesson-square-card:active {
          transform: translate(3.5px, 3.5px);
          box-shadow: 3.5px 3.5px 0px var(--btn-shadow, var(--btn-border, #000000));
        }

        @keyframes nextLessonGlow {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); box-shadow: 0 0 24px rgba(66, 222, 232, 0.8), 7px 7px 0px var(--btn-shadow, var(--btn-border, #000000)); }
          100% { transform: scale(1); }
        }

        .lesson-square-card.next-lesson-pulse {
          animation: nextLessonGlow 1s ease-in-out 2;
          z-index: 10;
        }

        /* Frameless & shadowless target icon button (just the emoji in place) */
        .lesson-adjust-frame-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.35rem;
          box-shadow: none !important;
          transition: transform 0.15s ease, opacity 0.15s ease;
          z-index: 10;
          padding: 0;
          line-height: 1;
        }

        .lesson-adjust-frame-btn:hover {
          transform: scale(1.2);
          opacity: 0.85;
        }
        .lesson-adjust-frame-btn:active {
          transform: scale(0.9);
        }

        /* Bottom Third Semi-transparent Overlay */
        .lesson-title-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--btn-overlay-height, 38%);
          background: var(--btn-overlay-bg, rgba(0, 0, 0, 0.68));
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          border-top: 2.5px solid rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          box-sizing: border-box;
          z-index: 5;
          pointer-events: none;
        }

        .lesson-square-title {
          font-family: 'Outfit', 'Inter', sans-serif;
          font-weight: 900;
          font-size: var(--btn-title-font-size, 1.6rem);
          line-height: 1.12;
          color: var(--btn-title-color, #FFFFFF);
          text-shadow: var(--btn-title-shadow, 0 2px 4px rgba(0, 0, 0, 0.95));
          word-break: break-word;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-align: center;
          width: 100%;
          letter-spacing: -0.5px;
        }

        .menu-wheel-btn:hover {
          transform: scale(1.08) rotate(25deg);
          background-color: #F8FAFC !important;
        }
        .menu-wheel-btn:active {
          transform: scale(0.92);
        }

        .menu-flag-btn:hover {
          transform: scale(1.08);
          background-color: #F8FAFC !important;
        }
        .menu-flag-btn:active {
          transform: scale(0.92);
        }

        /* Status Styles */
        .status-completed {
          box-shadow: 5px 5px 0px #10B981;
        }

        .status-active {
          transform: scale(1.02);
        }
        
        .status-active:active {
           transform: scale(0.98);
        }

        .status-locked {
          opacity: 0.5;
          filter: grayscale(0.5);
          pointer-events: none;
        }

        /* Bottom Nav */
        .bottom-nav {
          background-color: var(--white);
          padding: 4px 12px;
          /* Trimmed vertical spacing while cleanly extending to iOS Home bar edge */
          padding-bottom: max(6px, calc(6px + env(safe-area-inset-bottom, 0px)));
          padding-left: max(12px, calc(12px + env(safe-area-inset-left, 0px)));
          padding-right: max(12px, calc(12px + env(safe-area-inset-right, 0px)));
          display: flex;
          justify-content: space-around;
          align-items: center;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
          z-index: 10;
          flex-shrink: 0;
          border-top: 1px solid #F1F5F9;
          box-sizing: border-box;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          color: #94A3B8;
          background: none;
          border: none;
          padding: 3px 6px;
          cursor: pointer;
          transition: transform 0.1s, color 0.2s;
          height: auto;
        }
        
        .nav-item:active {
            transform: scale(0.92);
        }

        .nav-item.active {
          color: var(--primary);
        }

        .nav-label {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.3px;
          line-height: 1;
        }

        /* Animations */
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .animate-bounce {
          animation: bounce 2s infinite;
        }
      `}</style>

      {/* Parallax Starfield Layers */}
      {menuSettings.showStars !== false && (
        <div className="dashboard-stars-wrapper" aria-hidden="true">
          <div ref={planeDeepRef} className="stars-parallax-plane stars-plane-deep">
            <div className="stars-drift-deep" />
          </div>
          <div ref={planeMidRef} className="stars-parallax-plane stars-plane-mid">
            <div className="stars-drift-mid" />
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="top-bar">
        <div className="user-profile">
          <div className="avatar">
            <User size={24} />
          </div>
          <span className="greeting">{t('dashboard.greeting')}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Flag Toggle Button (Lesson Content Language) */}
          <button
            onClick={handleToggleLanguage}
            title={`Language: ${currentLangObj.label}`}
            className="menu-flag-btn"
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '12px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '2px 2px 0px #000000',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
              transition: 'transform 0.15s ease',
              userSelect: 'none'
            }}
          >
            {currentLangObj.flag}
          </button>

          <FullscreenToggle />
          {!state.readOnly && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setIsMenuSettingsOpen(true)}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  border: '2px solid #000000',
                  borderRadius: '12px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0px #000000',
                  transition: 'transform 0.15s ease'
                }}
                className="menu-wheel-btn"
                title="Menu Customization (Background, Buttons & Banners)"
              >
                <Settings size={20} strokeWidth={2.4} />
              </button>
              <button
                onClick={handleOpenEditor}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow)',
                  borderBottom: '3px solid var(--primary-dark)'
                }}
              >
                {t('dashboard.editor')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="scroll-area" onScroll={handleScroll}>
        {/* Lesson Path with Zig-Zag */}
        <div className="lesson-path">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              Loading lessons...
            </div>
          ) : (
            (() => {
              let sectionLessonIndex = 0;
              const renderedElements = [];
              const renderedBannerIds = new Set();

              const normalizeLessonKey = (p) => {
                if (!p || typeof p !== 'string') return '';
                return p
                  .toLowerCase()
                  .replace(/\\/g, '/')
                  .replace(/^.*lessons\//, '')
                  .replace(/\/lesson\.json$/, '')
                  .replace(/^\d+[-_ ]*/, '')
                  .replace(/[^a-z0-9]/g, '');
              };

              const matchesBannerLesson = (banner, lesson, index) => {
                if (!banner || !lesson) return false;
                if (banner.beforeLesson === lesson.path) return true;
                if (index === 0 && (banner.beforeLesson === 'START' || (lessons.length > 0 && banner.beforeLesson === lessons[0].path))) {
                  return true;
                }
                if (banner.beforeLesson === 'END') return false;

                const bKey = normalizeLessonKey(banner.beforeLesson);
                const lKey = normalizeLessonKey(lesson.path);
                if (bKey && lKey && bKey === lKey) return true;

                return false;
              };

              // Helper to render a banner
              const renderBanner = (banner) => {
                const bBorder = banner.borderColor || menuSettings.bannerBorderColor || '#000000';
                return (
                  <div key={banner.id} className="horizontal-banner-wrapper">
                    <div
                      className="horizontal-banner"
                      style={{
                        backgroundColor: banner.backgroundColor || '#FFFFFF',
                        color: banner.textColor || '#1E293B',
                        borderColor: bBorder
                      }}
                    >
                      {banner.leftImage ? (
                        <div className="horizontal-banner-img" style={{ borderColor: bBorder }}>
                          <img src={resolveAssetUrl(banner.leftImage)} alt="" loading="lazy" decoding="async" />
                        </div>
                      ) : (
                        <div style={{ width: 56, height: 56, visibility: 'hidden', flexShrink: 0 }} />
                      )}

                      <span
                        className="horizontal-banner-title"
                        style={{ color: banner.textColor || '#000000' }}
                      >
                        {banner.title}
                      </span>

                      {banner.rightImage ? (
                        <div className="horizontal-banner-img" style={{ borderColor: bBorder }}>
                          <img src={resolveAssetUrl(banner.rightImage)} alt="" loading="lazy" decoding="async" />
                        </div>
                      ) : (
                        <div style={{ width: 56, height: 56, visibility: 'hidden', flexShrink: 0 }} />
                      )}
                    </div>

                    {!state.readOnly && (
                      <button
                        className="banner-creator-edit-btn"
                        style={{ borderColor: bBorder, boxShadow: `2px 2px 0px ${bBorder}` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBanner(banner);
                          setIsBannerModalOpen(true);
                        }}
                        title="Edit banner"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                );
              };

              // 1. Render banners placed at 'START' or matching first lesson
              const startBanners = banners.filter(b => matchesBannerLesson(b, lessons[0], 0));
              startBanners.forEach(b => {
                renderedBannerIds.add(b.id);
                renderedElements.push(renderBanner(b));
                sectionLessonIndex = 0; // reset zig-zag index per section
              });

              // 2. Iterate through lessons
              lessons.forEach((lesson, index) => {
                // If banners are positioned before this lesson (and not already rendered)
                if (index > 0) {
                  const matchingBanners = banners.filter(b => !renderedBannerIds.has(b.id) && matchesBannerLesson(b, lesson, index));
                  matchingBanners.forEach(b => {
                    renderedBannerIds.add(b.id);
                    renderedElements.push(renderBanner(b));
                    sectionLessonIndex = 0; // reset zig-zag index under each banner!
                  });
                }

                // Zig-zag pattern: Left -> Center -> Right -> Center
                const ZIG_ZAG_POSITIONS = [
                  { alignSelf: 'flex-start', marginLeft: '8px' },   // 0: Left
                  { alignSelf: 'center' },                           // 1: Center
                  { alignSelf: 'flex-end', marginRight: '8px' },    // 2: Right
                  { alignSelf: 'center' }                            // 3: Center
                ];
                const zigZagStyle = ZIG_ZAG_POSITIONS[sectionLessonIndex % 4];
                sectionLessonIndex++;

                renderedElements.push(
                  <div
                    key={lesson.id}
                    data-lesson-path={lesson.path}
                    data-lesson-id={lesson.id}
                    data-lesson-name={lesson.name}
                    className={`lesson-square-card status-${lesson.status}`}
                    style={{
                      ...zigZagStyle,
                      backgroundColor: lesson.content?.cardColor || '#8B5CF6'
                    }}
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      handlePlayLesson(lesson);
                    }}
                  >
                    {/* The whole button is the frame */}
                    <TitlecardCircleFrame
                      slide={lesson.content?.slides?.[0]}
                      titlecardFrame={lesson.content?.titlecardFrame || lesson.titlecardFrame}
                      icon={lesson.content?.icon || lesson.icon}
                      cardColor={lesson.content?.cardColor || '#8B5CF6'}
                    />

                    {!state.readOnly && (
                      <button
                        className="lesson-adjust-frame-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFrameLesson(lesson);
                        }}
                        title="Button Focus & Visibility"
                      >
                        🎯
                      </button>
                    )}

                    {/* Bottom third semi-transparent title overlay */}
                    <div className="lesson-title-overlay">
                      <div className="lesson-square-title">
                        {(language !== 'es' && (lesson.content?.translations?.[language]?.title || lesson.translations?.[language]?.title)) || lesson.title}
                      </div>
                    </div>
                  </div>
                );
              });

              // 3. Render banners placed at 'END'
              const endBanners = banners.filter(b => b.beforeLesson === 'END');
              endBanners.forEach(b => {
                renderedBannerIds.add(b.id);
                renderedElements.push(renderBanner(b));
              });

              // 4. Fallback: render any banners that haven't been placed yet so none are lost
              banners.forEach(b => {
                if (!renderedBannerIds.has(b.id)) {
                  renderedBannerIds.add(b.id);
                  renderedElements.push(renderBanner(b));
                }
              });

              return renderedElements;
            })()
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav activeSector="lessons" theme="light" />

      {/* Circle Frame Adjuster Modal */}
      {editingFrameLesson && (
        <CircleFrameModal
          isOpen={!!editingFrameLesson}
          lesson={editingFrameLesson}
          overlayHeight={menuSettings.buttonOverlayHeight ?? 38}
          overlayBg={menuSettings.buttonOverlayBg || 'rgba(0, 0, 0, 0.68)'}
          titleColor={menuSettings.buttonTitleColor || '#FFFFFF'}
          titleShadow={titleShadow}
          titleFontSize={menuSettings.buttonTitleFontSize || '1.6rem'}
          onSave={handleSaveCircleFrame}
          onClose={() => setEditingFrameLesson(null)}
        />
      )}

      {/* Banner Add/Edit Modal */}
      {isBannerModalOpen && (
        <BannerModal
          isOpen={isBannerModalOpen}
          banner={editingBanner}
          lessons={lessons}
          defaultBorderColor={menuSettings.bannerBorderColor || '#000000'}
          onSave={handleSaveBanner}
          onDelete={handleDeleteBanner}
          onClose={() => {
            setIsBannerModalOpen(false);
            setEditingBanner(null);
          }}
        />
      )}

      {/* Menu Settings Modal */}
      {isMenuSettingsOpen && (
        <MenuSettingsModal
          isOpen={isMenuSettingsOpen}
          settings={menuSettings}
          banners={banners}
          onSaveSettings={handleSaveMenuSettings}
          onCreateBanner={() => {
            setIsMenuSettingsOpen(false);
            setEditingBanner(null);
            setIsBannerModalOpen(true);
          }}
          onEditBanner={(banner) => {
            setIsMenuSettingsOpen(false);
            setEditingBanner(banner);
            setIsBannerModalOpen(true);
          }}
          onDeleteBanner={handleDeleteBanner}
          onClose={() => setIsMenuSettingsOpen(false)}
        />
      )}
    </div>
  </div>
);
};

export default Dashboard;
