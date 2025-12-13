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
  const { state } = useEditor();
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

function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  )
}

export default App
