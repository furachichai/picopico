import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, Lock, Play, Trophy, User, ChevronRight, BookOpen, Compass, Settings, Flame } from 'lucide-react';

import { useEditor } from '../../context/EditorContext';
import { getLessonProgress } from '../../utils/storage';
import FullscreenToggle from '../FullscreenToggle';

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
    'dashboard.discover': 'DISCOVER',
    'dashboard.settings': 'SETTINGS',
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
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lessons');

  // Helper to parse metadata from path (same as in LessonsPage)
  const parsePathToMetadata = (path) => {
    const parts = path.split('/');
    let subject = 'Math';
    let topic = '';
    let chapterId = '';
    let chapterName = '';
    let lessonId = '';
    let lessonName = '';

    if (parts.length > 1) subject = parts[1];
    if (parts.length > 2) topic = parts[2];

    if (parts.length > 3) {
      const chapterFolder = parts[3];
      const match = chapterFolder.match(/^(\d+)-(.*)$/);
      if (match) {
        chapterId = match[1];
        chapterName = match[2];
      } else {
        chapterName = chapterFolder;
      }
    }

    if (parts.length > 4) {
      const lessonFolder = parts[4];
      const match = lessonFolder.match(/^(\d+)-(.*)$/);
      if (match) {
        lessonId = match[1];
        lessonName = match[2];
      } else {
        lessonName = lessonFolder;
      }
    }

    return {
      subject,
      topic,
      chapterId,
      chapterName,
      lessonId,
      title: lessonName
    };
  };

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch('/api/list-lessons');
        const data = await response.json();

        // Flatten the tree into a list of lessons
        const flatList = [];
        const traverse = (items) => {
          items.forEach(item => {
            if (item.type === 'directory') {
              if (item.children) traverse(item.children);
            } else if (item.name.endsWith('.json')) {
              const metadata = parsePathToMetadata(item.path);
              const progress = getLessonProgress(item.path);
              const isCompleted = progress?.completed;

              flatList.push({
                ...item,
                ...metadata,
                id: item.path, // Use path as unique ID
                status: isCompleted ? 'completed' : 'active',
                icon: isCompleted ? <Trophy size={24} /> : <Play size={24} />,
                progress // pass down full progress object
              });
            }
          });
        };

        traverse(data);
        setLessons(flatList);
      } catch (error) {
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, []);

  const handleOpenEditor = () => {
    if (state.readOnly) {
      const pin = window.prompt("Enter Admin PIN:");
      if (pin === '2027') {
        localStorage.setItem('pico_editor_unlocked', 'true');
        dispatch({ type: 'SET_READ_ONLY', payload: false });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
      } else if (pin !== null) { // If user cancelled, don't alert
        alert("Incorrect PIN");
      }
    } else {
      dispatch({ type: 'SET_VIEW', payload: 'editor' });
    }
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
      const response = await fetch(`/api/load-lesson?path=${encodeURIComponent(lessonItem.path)}`);
      if (!response.ok) throw new Error('Failed to load lesson');
      const lessonData = await response.json();

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
          --bg: #F8FAFC;
          --text: #1E293B;
          --text-light: #64748B;
          --white: #ffffff;
          --radius: 20px;
          --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .dashboard-container {
          font-family: 'Outfit', 'Inter', sans-serif;
          background-color: var(--bg);
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
          background-color: var(--bg);
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

        /* Hero Card */
        .hero-card {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          border-radius: var(--radius);
          padding: 24px;
          color: var(--white);
          margin-bottom: 32px;
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .hero-card::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }

        .mission-label {
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 1px;
          opacity: 0.9;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .mission-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 16px;
          line-height: 1.2;
        }

        .progress-container {
          background: rgba(0, 0, 0, 0.2);
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-bar {
          height: 100%;
          background: var(--secondary);
          width: 66%;
          border-radius: 4px;
        }

        .progress-text {
          font-size: 0.85rem;
          text-align: right;
          opacity: 0.9;
          font-weight: 500;
        }

        /* Lesson Path */
        .lesson-path {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 20px;
        }

        .lesson-card {
          background: var(--white);
          border-radius: var(--radius);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          border-bottom: 4px solid #E2E8F0;
        }

        .lesson-card:active {
          transform: translateY(2px);
          border-bottom-width: 2px;
        }

        .lesson-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-weight: 700;
          font-size: 1.2rem;
        }

        .lesson-info {
          flex: 1;
        }

        .lesson-title {
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 4px;
          color: var(--text);
        }

        .lesson-desc {
          font-size: 0.9rem;
          color: var(--text-light);
        }

        /* Status Styles */
        .status-completed .lesson-icon-box {
          background-color: #DCFCE7;
          color: #16A34A;
        }
        
        .status-completed .lesson-card {
           border-bottom-color: #CBD5E1;
        }

        .status-active {
          transform: scale(1.02);
          box-shadow: var(--shadow-lg);
          border: 2px solid var(--primary);
          border-bottom: 6px solid var(--primary);
        }
        
        .status-active:active {
           transform: scale(1.02) translateY(2px);
           border-bottom-width: 4px;
        }

        .status-active .lesson-icon-box {
          background-color: var(--primary);
          color: var(--white);
        }

        .status-locked {
          opacity: 0.6;
          filter: grayscale(1);
          pointer-events: none;
        }

        .status-locked .lesson-icon-box {
          background-color: #F1F5F9;
          color: #94A3B8;
        }

        /* Start Button */
        .start-btn {
          background-color: var(--secondary);
          color: #713F12;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          border-bottom: 4px solid var(--secondary-dark);
          transition: all 0.1s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .start-btn:active {
          transform: translateY(2px);
          border-bottom-width: 2px;
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
          <div className="streak-counter" style={{
            backgroundColor: 'var(--white)',
            padding: '6px 12px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '700',
            color: '#F97316', // Orange-500
            boxShadow: 'var(--shadow)',
            border: '2px solid #F1F5F9'
          }}>
            <Flame size={16} fill="#F97316" stroke="none" />
            <span>0</span>
          </div>
          <div className="gem-counter">
            <Trophy size={16} fill="#EAB308" stroke="none" />
            <span>1,240</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="scroll-area">
        {/* Hero Card */}
        <div className="hero-card">
          <div className="mission-label">{t('dashboard.mission')}</div>
          <div className="mission-title">{lessons.length > 0 ? lessons[0].title : 'Start Learning'}</div>
          <div className="progress-container">
            <div className="progress-bar"></div>
          </div>
          <div className="progress-text">1/{lessons.length} Lessons</div>
        </div>

        {/* Lesson Path */}
        <div className="lesson-path">
          {loading ? (
            <div>Loading lessons...</div>
          ) : (
            lessons.map((lesson) => (
              <div
                key={lesson.id}
                className={`lesson-card status-${lesson.status}`}
                onClick={(e) => {
                  // Prevent playing if editing or clicking inputs
                  if (e.target.closest('input') || e.target.closest('button')) return;
                  handlePlayLesson(lesson)
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="lesson-icon-box">
                  {lesson.icon}
                </div>
                <div className="lesson-info">
                  <div className="lesson-title">{lesson.title}</div>
                  {/* Description Editing Logic */}
                  {editingLessonId === lesson.id ? (
                    <div className="description-edit-area" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <input
                        autoFocus
                        value={editDescriptionValue}
                        onChange={(e) => setEditDescriptionValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit'
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveDescription(lesson);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveDescription(lesson);
                        }}
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        style={{
                          background: '#E2E8F0',
                          color: '#64748B',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="lesson-desc-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="lesson-desc">{lesson.description || lesson.chapterName}</div>
                      {!state.readOnly && (
                        <button
                          className="edit-desc-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(lesson);
                          }}
                          title="Edit Description"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: 0.5,
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Settings size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
          style={{ color: activeTab === 'lessons' ? 'var(--primary)' : '#94A3B8' }}
        >
          <BookOpen size={36} strokeWidth={1.5} />
          <span className="nav-label">{t('dashboard.lessons')}</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'discover' })}
          style={{ color: activeTab === 'discover' ? '#F59E0B' : '#94A3B8' }}
        >
          <Compass size={36} strokeWidth={1.5} />
          <span className="nav-label">{t('dashboard.discover')}</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ color: activeTab === 'settings' ? '#3B82F6' : '#94A3B8' }}
        >
          <Settings size={36} strokeWidth={1.5} />
          <span className="nav-label">{t('dashboard.settings')}</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
