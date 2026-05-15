import React from 'react';
import { EditorProvider, useEditor } from './context/EditorContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import Editor from './components/Editor/Editor';
import Player from './components/Player/Player';
import SlidesPage from './components/Editor/SlidesPage';
import LessonsPage from './components/Home/LessonsPage';
import Dashboard from './components/Home/Dashboard';
import PEMDASCartridge from './cartridges/PEMDAS/PEMDASCartridge';
import DiscoverView from './components/Home/DiscoverView';
import './index.css'

const AppContent = () => {
  const { state, dispatch } = useEditor();
  const [displayView, setDisplayView] = React.useState(state.view);
  const [animating, setAnimating] = React.useState(false);
  const [prevView, setPrevView] = React.useState(null);
  const [direction, setDirection] = React.useState('forward'); // 'forward' or 'back'

  // Ref to track previous state.view to detect changes
  const lastStateView = React.useRef(state.view);

  React.useEffect(() => {
    if (state.view !== lastStateView.current) {
      const from = lastStateView.current;
      const to = state.view;

      // Determine animation direction
      let animDir = 'forward'; // Default: Slide In (Discover -> Player, etc)
      let shouldAnimate = true;

      if (from === 'player' && (to === 'dashboard')) {
        animDir = 'back'; // Slide Out (Player -> Dashboard)
      } else if (from === 'game' && to === 'dashboard') {
        animDir = 'back';
      } else if (from === 'discover' && to === 'dashboard') {
        animDir = 'back';
      }

      setDirection(animDir);
      setPrevView(from);
      setDisplayView(to);

      if (shouldAnimate) {
        setAnimating(true);
        const timeout = setTimeout(() => {
          setAnimating(false);
          setPrevView(null);
        }, 400); // 400ms matches CSS animation
        lastStateView.current = to;
        return () => clearTimeout(timeout);
      } else {
        setAnimating(false);
        setPrevView(null);
        lastStateView.current = to;
      }
    }
  }, [state.view]);


  // Prevent iOS Pinch-to-Zoom
  React.useEffect(() => {
    const handleGestureStart = (e) => {
      e.preventDefault();
    };

    document.addEventListener('gesturestart', handleGestureStart);
    return () => {
      document.removeEventListener('gesturestart', handleGestureStart);
    };
  }, []);

  // Track real viewport height for iOS Safari URL bar
  React.useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };

    setAppHeight();

    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

  // Check for Read-Only Mode based on access level
  React.useEffect(() => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const accessLevel = localStorage.getItem('pico_access_level'); // 'editor' or 'player'
    // Legacy support: check old keys too
    const legacyEditorUnlocked = localStorage.getItem('pico_editor_unlocked') === 'true';

    if (isLocal || accessLevel === 'editor' || legacyEditorUnlocked) {
      dispatch({ type: 'SET_READ_ONLY', payload: false });
      console.log('App running in Creator Mode');
    } else {
      dispatch({ type: 'SET_READ_ONLY', payload: true });
      console.log('App running in Player Mode (Read-Only)');
    }
  }, []);


  const renderView = (viewName) => {
    switch (viewName) {
      case 'dashboard': return <Dashboard />;
      case 'slides': return <SlidesPage />;
      case 'lessons': return <LessonsPage />;
      case 'player': return <Player />;
      case 'discover': return <DiscoverView />;
      case 'game': return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0a0a0f' }}>
          <PEMDASCartridge
            config={{ locale: 'US', startLevel: 1, targetLevel: 9 }}
            onComplete={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
          />
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
            style={{
              position: 'absolute', top: 12, left: 12, zIndex: 200,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '50%', width: 40, height: 40,
              color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)'
            }}
          >
            ✕
          </button>
        </div>
      );
      default: return <Editor />;
    }
  };

  return (
    <div className="app-content-wrapper">
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#1a202c',
        zIndex: -5
      }} />
      {/* Exiting View */}
      {animating && prevView && (
        <div key="prev" className={`view-container ${direction === 'forward' ? 'view-slide-exit' : 'view-pop-exit'}`}>
          {renderView(prevView)}
        </div>
      )}

      {/* Entering View (or Current Static) */}
      <div key="current" className={`view-container ${animating ? (direction === 'forward' ? 'view-slide-enter' : 'view-pop-enter') : ''}`}>
        {renderView(displayView)}
      </div>
    </div>
  );
};

// PIN Gate Component
const PinGate = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = React.useState(() => {
    return localStorage.getItem('pico_app_unlocked') === 'true';
  });
  const [pinValue, setPinValue] = React.useState('');
  const [error, setError] = React.useState('');
  const [selectedLang, setSelectedLang] = React.useState(() => {
    return localStorage.getItem('pico_language') || 'es';
  });

  const languages = [
    { code: 'es', flag: '🇪🇸' },
    { code: 'en', flag: '🇺🇸' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pinValue === '2027') {
      // Player-only access
      localStorage.setItem('pico_app_unlocked', 'true');
      localStorage.setItem('pico_access_level', 'player');
      localStorage.setItem('pico_language', selectedLang);
      setIsUnlocked(true);
    } else if (pinValue === '1314b') {
      // Editor access
      localStorage.setItem('pico_app_unlocked', 'true');
      localStorage.setItem('pico_access_level', 'editor');
      localStorage.setItem('pico_editor_unlocked', 'true');
      localStorage.setItem('pico_language', selectedLang);
      setIsUnlocked(true);
    } else {
      setError('Incorrect code');
      setPinValue('');
    }
  };

  if (isUnlocked) {
    return children;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#1a202c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: 'white'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        backdropFilter: 'blur(10px)',
        minWidth: '280px'
      }}>
        <h1 style={{ marginBottom: '8px', fontSize: '2rem' }}>🔒 PicoPico</h1>
        <p style={{ opacity: 0.7, marginBottom: '20px' }}>Enter code to continue</p>

        {/* Language Selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setSelectedLang(lang.code)}
              style={{
                fontSize: '2rem',
                background: selectedLang === lang.code ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.1)',
                border: selectedLang === lang.code ? '2px solid #8B5CF6' : '2px solid transparent',
                borderRadius: '12px',
                padding: '8px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                filter: selectedLang === lang.code ? 'none' : 'grayscale(0.5)',
                opacity: selectedLang === lang.code ? 1 : 0.6
              }}
            >
              {lang.flag}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pinValue}
            onChange={(e) => { setPinValue(e.target.value); setError(''); }}
            placeholder="Enter code"
            autoFocus
            style={{
              padding: '12px 20px',
              fontSize: '1.2rem',
              borderRadius: '12px',
              border: error ? '2px solid #EF4444' : '2px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              textAlign: 'center',
              width: '150px',
              outline: 'none'
            }}
          />
          <br />
          {error && <p style={{ color: '#EF4444', marginTop: '8px', fontSize: '0.9rem' }}>{error}</p>}
          <button
            type="submit"
            style={{
              marginTop: '16px',
              padding: '12px 32px',
              fontSize: '1rem',
              fontWeight: '700',
              borderRadius: '12px',
              border: 'none',
              background: '#8B5CF6',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

function App() {
  return (
    <PinGate>
      <LanguageProvider>
        <EditorProvider>
          <AppContent />
        </EditorProvider>
      </LanguageProvider>
    </PinGate>
  )
}

export default App
