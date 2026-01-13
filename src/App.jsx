import React from 'react';
import { EditorProvider, useEditor } from './context/EditorContext'
import Editor from './components/Editor/Editor';
import Player from './components/Player/Player';
import SlidesPage from './components/Editor/SlidesPage';
import LessonsPage from './components/Home/LessonsPage';
import Dashboard from './components/Home/Dashboard';
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

      if (from === 'player' && (to === 'dashboard' || to === 'discover')) {
        animDir = 'back'; // Slide Out (Player -> Dashboard)
      } else if (from === 'slides' && to === 'editor') {
        // animDir = 'forward'; 
      } else if (from === 'editor' && to === 'slides') {
        // animDir = 'back';
      } else if ((from === 'dashboard' && to === 'discover') || (from === 'discover' && to === 'dashboard')) {
        shouldAnimate = false; // No animation for these transitions
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
    // Also prevent touchmove scaling with 2 fingers if possible (though gesturestart usually catches it)
    return () => {
      document.removeEventListener('gesturestart', handleGestureStart);
    };
    return () => {
      document.removeEventListener('gesturestart', handleGestureStart);
    };
  }, []);

  // Check for Read-Only Mode (Network IP vs Localhost)
  React.useEffect(() => {
    const hostname = window.location.hostname;
    // Allow localhost and 127.0.0.1 as Creator Mode
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    // Check if previously unlocked via PIN
    const isUnlocked = localStorage.getItem('pico_editor_unlocked') === 'true';

    // Dispatch readOnly state
    // We only want to set this once, but since it's driven by window, it's stable.
    if (!isLocal && !isUnlocked) {
      dispatch({ type: 'SET_READ_ONLY', payload: true });
      console.log('App running in Player Mode (Read-Only)');
    } else {
      // Explicitly set false just in case
      dispatch({ type: 'SET_READ_ONLY', payload: false });
      console.log('App running in Creator Mode (Unlocked)');
    }
  }, []);


  const renderView = (viewName) => {
    switch (viewName) {
      case 'dashboard': return <Dashboard />;
      case 'slides': return <SlidesPage />;
      case 'lessons': return <LessonsPage />;
      case 'player': return <Player />;
      case 'discover': return <DiscoverView />;
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pinValue === '2027') {
      localStorage.setItem('pico_app_unlocked', 'true');
      setIsUnlocked(true);
    } else {
      setError('Incorrect PIN');
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
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ marginBottom: '8px', fontSize: '2rem' }}>🔒 PicoPico</h1>
        <p style={{ opacity: 0.7, marginBottom: '24px' }}>Enter PIN to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pinValue}
            onChange={(e) => { setPinValue(e.target.value); setError(''); }}
            placeholder="Enter PIN"
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
      <EditorProvider>
        <AppContent />
      </EditorProvider>
    </PinGate>
  )
}

export default App
