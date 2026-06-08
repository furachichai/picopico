import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, Lock, Play, Trophy, User, ChevronRight, BookOpen, Gamepad2, Compass } from 'lucide-react';

import { useEditor } from '../../context/EditorContext';
import { useLanguage, getTranslatedContent } from '../../context/LanguageContext';
import { getLessonProgress } from '../../utils/storage';
import FullscreenToggle from '../FullscreenToggle';
import SlideThumbnail from '../Editor/SlideThumbnail';

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
  const { language } = useLanguage();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
              icon: isCompleted ? <Trophy size={24} /> : <Play size={24} />,
              progress
            };
          });

        setLessons(visibleLessons);
      } catch (error) {
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, []);

  const handleOpenEditor = () => {
    dispatch({ type: 'SET_VIEW', payload: 'editor' });
  };

  // Editing State
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [editDescriptionValue, setEditDescriptionValue] = useState('');

  const startEditing = (lesson) => {
    setEditingLessonId(lesson.id);
    setEditDescriptionValue(lesson.description || '');
  };

  const cancelEdit = () => {
    setEditingLessonId(null);
    setEditDescriptionValue('');
  };

  const handleSaveDescription = async (lessonItem) => {
    try {
      // Load current lesson content first to ensure we don't lose anything
      // We need to load from disk properly
      const response = await fetch(`/api/load-lesson?path=${encodeURIComponent(lessonItem.path)}`);
      if (!response.ok) throw new Error('Failed to load lesson for saving');
      const currentLessonData = await response.json();

      // Update description
      const updatedLesson = {
        ...currentLessonData,
        description: editDescriptionValue
      };

      // Save back
      const saveResponse = await fetch('/api/save-lesson', {
        method: 'POST',
        body: JSON.stringify({ path: lessonItem.path, content: updatedLesson })
      });

      if (!saveResponse.ok) throw new Error('Failed to save description');

      // Update local state to reflect change immediately
      setLessons(prev => prev.map(l => l.id === lessonItem.id ? { ...l, description: editDescriptionValue } : l));

      setEditingLessonId(null);
    } catch (error) {
      console.error('Error saving description:', error);
      alert('Failed to save description');
    }
  };

  const handlePlayLesson = async (lessonItem) => {
    if (editingLessonId) return; // Don't play if editing something

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

  return (
    <div className="dashboard-container">
      <style>{`
        :root {
          --primary: #8B5CF6;
          --primary-dark: #7C3AED;
          --secondary: #FACC15;
          --secondary-dark: #EAB308;
          --bg: linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%);
          --text: #F8FAFC;
          --text-light: #CBD5E1;
          --white: #ffffff;
          --radius: 20px;
          --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .dashboard-container {
          font-family: 'Outfit', 'Inter', sans-serif;
          background: var(--bg);
          height: 100vh;
          display: flex;
          flex-direction: column;
          color: var(--text);
          max-width: 480px;
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
          padding: 20px;
          background: transparent;
          z-index: 10;
          flex-shrink: 0;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar {
          width: 48px;
          height: 48px;
          background-color: #E2E8F0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--white);
          box-shadow: var(--shadow);
          color: var(--primary);
        }

        .greeting {
          font-weight: 700;
          font-size: 1.1rem;
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

        /* Scroll Area */
        .scroll-area {
          flex: 1;
          overflow-y: auto;
          padding: 0 20px 20px 20px;
          -webkit-overflow-scrolling: touch;
          /* Hide scrollbar for cleaner look */
          scrollbar-width: none; /* Firefox */
        }
        .scroll-area::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
        }

        /* Lesson Path */
        .lesson-path {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 20px;
        }

        .lesson-card {
          padding: 0;
          display: flex;
          align-items: stretch;
          background: #8B5CF6; /* Purple background from mockup */
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          min-height: 160px;
          box-shadow: var(--shadow);
        }

        .lesson-card:active {
          transform: scale(0.97);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .lesson-card-preview {
          width: 90px;
          min-height: 160px;
          flex-shrink: 0;
          background: #333;
          position: relative;
          overflow: hidden;
        }

        .lesson-icon-box {
          width: 62.5px;
          height: 62.5px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #2563EB; /* Dark blue background for icon circle */
          margin: 0 auto 8px auto;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.1);
        }

        .lesson-icon-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .lesson-info {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          z-index: 1;
        }

        .lesson-title {
          font-weight: 800;
          font-size: 1.2rem;
          margin-bottom: 2px;
          color: var(--secondary); /* Yellow title */
        }

        .lesson-desc {
          font-size: 0.9rem;
          color: var(--secondary); /* Yellow desc */
          opacity: 0.9;
        }

        /* Status Styles */
        .status-completed .lesson-info {
          background: rgba(0,0,0,0.1);
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
          padding: 8px 20px;
          /* Handle iOS Safe Area - increased padding */
          padding-bottom: calc(8px + env(safe-area-inset-bottom));
          display: flex;
          justify-content: space-around;
          align-items: center;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
          z-index: 10;
          flex-shrink: 0;
          border-top: 1px solid #F1F5F9;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #94A3B8;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          transition: transform 0.1s, color 0.2s;
          height: auto;
        }
        
        .nav-item:active {
            transform: scale(0.9);
        }

        .nav-item.active {
          color: var(--primary);
        }
        
        /* Specific colors for inactive state to be more visible if needed, 
           but user asked for "in color". 
           Let's make icons larger and colored by default?
           Or just larger. User said "icons way too small".
        */

        .nav-label {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.5px;
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

      {/* Top Bar */}
      <div className="top-bar">
        <div className="user-profile">
          <div className="avatar">
            <User size={24} />
          </div>
          <span className="greeting">{t('dashboard.greeting')}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <FullscreenToggle style={{
            background: 'var(--white)',
            color: 'var(--text-light)',
            border: '1px solid #E2E8F0',
            boxShadow: 'var(--shadow)',
            width: '36px',
            height: '36px',
            padding: 0
          }} />
          {!state.readOnly && (
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
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="scroll-area">
        {/* Lesson Path */}
        <div className="lesson-path">
          {loading ? (
            <div>Loading lessons...</div>
          ) : (
            lessons.map((lesson, idx) => {
              const COLORS = [
                '#FF6B6B', '#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B', '#14B8A6', '#A855F7', '#22D3EE'
              ];
              const color = COLORS[idx % COLORS.length];

              return (
                <div
                  key={lesson.id}
                  className={`lesson-card status-${lesson.status}`}
                  style={{ backgroundColor: lesson.content?.cardColor || '#8B5CF6' }}
                  onClick={(e) => {
                    if (e.target.closest('input') || e.target.closest('button')) return;
                    handlePlayLesson(lesson)
                  }}
                >
                  <div className="lesson-card-preview">
                     {lesson.content?.slides?.[0] ? (
                         <SlideThumbnail slide={lesson.content.slides[0]} hideTextAndBalloons={true} />
                     ) : (
                         <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
                     )}
                  </div>
                  <div className="lesson-info">
                    <div className="lesson-icon-box">
                      <img src={`/assets/graphics/${lesson.content?.icon || 'icon_book.png'}`} alt="icon" />
                    </div>
                    <div className="lesson-title">
                      {(language !== 'es' && lesson.content?.translations?.[language]?.title) || lesson.title}
                    </div>
                    <div className="lesson-desc-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div className="lesson-desc">
                          {(language !== 'es' && lesson.content?.translations?.[language]?.description) || lesson.description || ''}
                        </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button
          className="nav-item active"
          style={{ color: 'var(--primary)' }}
        >
          <BookOpen size={36} strokeWidth={1.5} />
          <span className="nav-label">{t('dashboard.lessons')}</span>
        </button>
        <button
          className="nav-item"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'game' })}
          style={{ color: '#F59E0B' }}
        >
          <Gamepad2 size={36} strokeWidth={1.5} />
          <span className="nav-label">{t('dashboard.game')}</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
