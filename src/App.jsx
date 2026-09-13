import React from 'react';
import { EditorProvider, useEditor } from './context/EditorContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import Editor from './components/Editor/Editor';
import Player from './components/Player/Player';
import SlidesPage from './components/Editor/SlidesPage';
import LessonsPage from './components/Home/LessonsPage';
import Dashboard from './components/Home/Dashboard';
import PEMDASCartridge from './cartridges/PEMDAS/PEMDASCartridge';
import AlgeBrosCartridge from './cartridges/AlgeBros/AlgeBrosCartridge';
import BalanzaCartridge from './cartridges/Balanza/BalanzaCartridge';
import ExloreNLCartridge from './cartridges/ExploreNL/ExloreNLCartridge';
import DiscoverView from './components/Home/DiscoverView';
import './components/Player/TypeQuizKeyboard.css';
import './index.css'

// Error Boundary to prevent white screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('PicoPico crashed:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#1a202c',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontFamily: 'Inter, system-ui, sans-serif', gap: '16px'
        }}>
          <div style={{ fontSize: '3rem' }}>😵</div>
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ opacity: 0.6, fontSize: '0.85rem', maxWidth: '300px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              background: '#8B5CF6', color: 'white', border: 'none',
              borderRadius: '12px', padding: '12px 32px', fontSize: '1rem',
              fontWeight: 700, cursor: 'pointer', marginTop: '8px'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  const { state, dispatch } = useEditor();
  const [selectedGame, setSelectedGame] = React.useState(null);

  React.useEffect(() => {
    if (state.view !== 'game') {
      setSelectedGame(null);
    }
  }, [state.view]);

  React.useEffect(() => {
    const handleFocusOut = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        // Force iOS Safari viewport recalculation
        window.scrollTo(0, 0);
        setTimeout(() => {
          window.scrollTo(0, 0);
          // Toggle height to force layout redraw
          if (document.body) {
            document.body.style.height = '100.1%';
            setTimeout(() => {
              document.body.style.height = '100%';
            }, 50);
          }
        }, 100);
      }
    };

    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // View transitions render a stack of views, each in a container KEYED BY VIEW NAME.
  // During a transition both the outgoing and incoming views are in the stack; when the
  // outgoing entry flips from 'current' to 'exiting' its key is unchanged, so React
  // reconciles the SAME component instance and only the animation class changes. The
  // previous implementation rendered the outgoing view in a separate "prev" wrapper,
  // which remounted it from scratch — resetting its state mid-exit (the Discover feed
  // visibly snapped to its default lesson) and burning the whole 400ms animation window
  // on mounting two view trees at once (so the incoming view seemed to pop in).
  const [viewStack, setViewStack] = React.useState([{ name: state.view, phase: 'current' }]);
  const currentViewRef = React.useRef(state.view);
  const transitionTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    if (currentViewRef.current === state.view) return;
    const from = currentViewRef.current;
    const to = state.view;
    currentViewRef.current = to;

    // Returning to the dashboard reads as "back" (slide right); everything else is "forward"
    const animDir = (to === 'dashboard' && (from === 'player' || from === 'game' || from === 'discover'))
      ? 'back'
      : 'forward';

    clearTimeout(transitionTimeoutRef.current);
    setViewStack([
      { name: from, phase: 'exiting', direction: animDir },
      { name: to, phase: 'entering', direction: animDir },
    ]);
    transitionTimeoutRef.current = setTimeout(() => {
      setViewStack([{ name: to, phase: 'current' }]);
    }, 400); // matches the CSS animation duration
  }, [state.view]);

  React.useEffect(() => () => clearTimeout(transitionTimeoutRef.current), []);


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

  // Track real viewport height for iOS Safari URL bar & mobile Chrome
  React.useEffect(() => {
    const setAppHeight = () => {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${h}px`);
    };

    setAppHeight();

    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setAppHeight);
      window.visualViewport.addEventListener('scroll', setAppHeight);
    }
    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setAppHeight);
        window.visualViewport.removeEventListener('scroll', setAppHeight);
      }
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
      case 'game': {
        if (selectedGame === 'pemdas') {
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0a0a0f' }}>
              <PEMDASCartridge
                config={{ locale: 'US', startLevel: 1, targetLevel: 9 }}
                onComplete={() => setSelectedGame(null)}
              />
              <button
                onClick={() => setSelectedGame(null)}
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
        }
        if (selectedGame === 'algebros') {
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#ffffff' }}>
              <AlgeBrosCartridge
                config={{ startLevel: 1, targetLevel: 10 }}
                onComplete={() => setSelectedGame(null)}
              />
              <button
                onClick={() => setSelectedGame(null)}
                style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 200,
                  background: 'rgba(0,0,0,0.08)', border: 'none',
                  borderRadius: '50%', width: 40, height: 40,
                  color: '#334155', fontSize: '1.2rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          );
        }
        if (selectedGame === 'balanza') {
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#ffffff' }}>
              <BalanzaCartridge
                config={{
                  weightsText: '',
                  leftPlateText: '🍎, 🍎',
                  rightPlateText: '🍎',
                  menuText: '2x🍎',
                  showZeroTiles: false
                }}
                onComplete={() => {}}
              />
              <button
                onClick={() => setSelectedGame(null)}
                style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 200,
                  background: 'rgba(0,0,0,0.08)', border: 'none',
                  borderRadius: '50%', width: 40, height: 40,
                  color: '#334155', fontSize: '1.2rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          );
        }
        if (selectedGame === 'explorenl') {
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#ffffff' }}>
              <ExloreNLCartridge
                config={{
                  orientation: 'vertical',
                  numbersSide: 'left',
                  pointerSide: 'right',
                  startNumber: -3,
                  endNumber: 3,
                  bottomNumber: -3,
                  topNumber: 3,
                  step: 1,
                  thickness: 3,
                  showArrows: true,
                  currentValue: 0,
                  equationTemplate: '2!n =',
                  lineColor: '#6366F1',
                  numberColor: '#1E293B',
                  pointerColor: '#4ECDC4',
                  equationColor: '#0F172A',
                  equationBg: '#FFFFFF',
                  equationBorder: '#6366F1',
                  equationFontSize: 28,
                  nlX: 25,
                  nlY: 50,
                  nlLength: 520,
                  equationX: 65,
                  equationY: 45,
                  equationRotation: 0
                }}
                onComplete={() => {}}
              />
              <button
                onClick={() => setSelectedGame(null)}
                style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 200,
                  background: 'rgba(0,0,0,0.08)', border: 'none',
                  borderRadius: '50%', width: 40, height: 40,
                  color: '#334155', fontSize: '1.2rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          );
        }
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100, background: '#090810',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '24px', fontFamily: "'Outfit', sans-serif", color: '#fff',
            backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 70%)'
          }}>
            {/* Back Button */}
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
              style={{
                position: 'absolute', top: 12, left: 12, zIndex: 200,
                background: 'rgba(255,255,255,0.1)', border: 'none',
                borderRadius: '50%', width: 40, height: 40,
                color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(6px)'
              }}
            >
              ✕
            </button>

            <h1 style={{
              fontSize: '2.2rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-1px',
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              PicoPico ARCADE
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '32px', textAlign: 'center' }}>
              Choose a cartridge to load and play
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '340px' }}>
              {/* PEMDAS Game Card */}
              <div
                onClick={() => setSelectedGame('pemdas')}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px', padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '16px', transition: 'transform 0.2s, border-color 0.2s', backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <div style={{
                  fontSize: '2.5rem', background: 'rgba(139, 92, 246, 0.1)', width: '64px', height: '64px',
                  borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  🧮
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>PEMDAS</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    Master the order of operations by solving arithmetic expressions.
                  </p>
                </div>
              </div>

              {/* algeBROS Game Card */}
              <div
                onClick={() => setSelectedGame('algebros')}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px', padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '16px', transition: 'transform 0.2s, border-color 0.2s', backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <div style={{
                  fontSize: '2.5rem', background: 'rgba(236, 72, 153, 0.1)', width: '64px', height: '64px',
                  borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(236, 72, 153, 0.2)'
                }}>
                  📐
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>algeBROS</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    Learn to simplify equations by dragging and combining like terms.
                  </p>
                </div>
              </div>

              {/* Balanza Game Card */}
              <div
                onClick={() => setSelectedGame('balanza')}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px', padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '16px', transition: 'transform 0.2s, border-color 0.2s', backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(242, 183, 5, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <div style={{
                  fontSize: '2.5rem', background: 'rgba(242, 183, 5, 0.1)', width: '64px', height: '64px',
                  borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(242, 183, 5, 0.2)'
                }}>
                  ⚖️
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Balanza</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    Balance a two-plate scale by dragging emojis to see an equation come into equilibrium.
                  </p>
                </div>
              </div>

              {/* ExploreNL Game Card */}
              <div
                onClick={() => setSelectedGame('explorenl')}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px', padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '16px', transition: 'transform 0.2s, border-color 0.2s', backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <div style={{
                  fontSize: '2.5rem', background: 'rgba(99, 102, 241, 0.1)', width: '64px', height: '64px',
                  borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  📈
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>ExploreNL</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    Interactive number line to explore zero powers (2⁰=1), negative exponents (2⁻¹=½), and dynamic equations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }
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
      {/* View stack: keys are view names, so a view keeps its mounted instance across
          phase changes (current -> exiting) and only its animation class updates. */}
      {viewStack.map(v => {
        const animClass = v.phase === 'exiting'
          ? (v.direction === 'forward' ? 'view-slide-exit' : 'view-pop-exit')
          : v.phase === 'entering'
            ? (v.direction === 'forward' ? 'view-slide-enter' : 'view-pop-enter')
            : '';
        return (
          <div key={v.name} className={`view-container ${animClass}`}>
            {renderView(v.name)}
          </div>
        );
      })}
    </div>
  );
};

// PIN Gate Component
const PinGate = ({ children }) => {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const forceGate = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('pin');
  const [isUnlocked, setIsUnlocked] = React.useState(isLocal && !forceGate);
  const [pinValue, setPinValue] = React.useState('');
  const [error, setError] = React.useState('');
  const [selectedLang, setSelectedLang] = React.useState(() => {
    return localStorage.getItem('pico_language') || 'es';
  });

  React.useEffect(() => {
    if (isLocal && !forceGate) {
      localStorage.setItem('pico_app_unlocked', 'true');
      localStorage.setItem('pico_access_level', 'editor');
      localStorage.setItem('pico_editor_unlocked', 'true');
    }
  }, [isLocal, forceGate]);

  const languages = [
    { code: 'es', flag: '🇪🇸' },
    { code: 'en', flag: '🇺🇸' },
  ];

  const verifyPin = (code) => {
    if (code === '2027') {
      // Player-only access
      localStorage.setItem('pico_app_unlocked', 'true');
      localStorage.setItem('pico_access_level', 'player');
      localStorage.removeItem('pico_editor_unlocked');
      localStorage.setItem('pico_language', selectedLang);
      setIsUnlocked(true);
      return true;
    } else if (code === '1314') {
      // Editor access
      localStorage.setItem('pico_app_unlocked', 'true');
      localStorage.setItem('pico_access_level', 'editor');
      localStorage.setItem('pico_editor_unlocked', 'true');
      localStorage.setItem('pico_language', selectedLang);
      setIsUnlocked(true);
      return true;
    } else {
      setError('Incorrect code');
      setPinValue('');
      return false;
    }
  };

  const handleDigit = (digit) => {
    if (pinValue.length >= 4) return;
    const nextPin = pinValue + digit;
    setPinValue(nextPin);
    setError('');

    if (nextPin.length === 4) {
      setTimeout(() => {
        verifyPin(nextPin);
      }, 150);
    }
  };

  const handleBackspace = () => {
    setPinValue((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleUnlock = () => {
    if (pinValue.length > 0) {
      verifyPin(pinValue);
    }
  };

  // Physical keyboard support for desktop
  React.useEffect(() => {
    if (isUnlocked) return;

    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnlocked, pinValue, selectedLang]);

  if (isUnlocked) {
    return children;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      minHeight: '100dvh',
      height: 'var(--app-height, 100dvh)',
      backgroundColor: '#1a202c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', 'Nunito', Inter, system-ui, sans-serif",
      color: 'white',
      padding: '16px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      userSelect: 'none',
      WebkitUserSelect: 'none'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.08)',
        padding: '24px 20px',
        borderRadius: '24px',
        textAlign: 'center',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        width: '100%',
        maxWidth: '340px',
        boxSizing: 'border-box',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
          🔒 PicoPico
        </h1>
        <p style={{ opacity: 0.7, margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 600 }}>
          Enter code to continue
        </p>

        {/* Language Selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelectedLang(lang.code)}
              style={{
                fontSize: '1.8rem',
                background: selectedLang === lang.code ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                border: selectedLang === lang.code ? '2px solid #8B5CF6' : '2px solid transparent',
                borderRadius: '12px',
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                filter: selectedLang === lang.code ? 'none' : 'grayscale(0.6)',
                opacity: selectedLang === lang.code ? 1 : 0.55
              }}
            >
              {lang.flag}
            </button>
          ))}
        </div>

        {/* PIN Dots Display (No native input, prevents mobile keyboard) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: error ? '8px' : '18px' }}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pinValue.length > idx;
            return (
              <div
                key={idx}
                style={{
                  width: '46px',
                  height: '52px',
                  borderRadius: '12px',
                  border: error ? '2px solid #EF4444' : (isFilled ? '2px solid #8B5CF6' : '2px solid rgba(255, 255, 255, 0.2)'),
                  backgroundColor: isFilled ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  color: '#ffffff',
                  boxShadow: isFilled ? '0 0 10px rgba(139, 92, 246, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {isFilled ? '●' : ''}
              </div>
            );
          })}
        </div>

        {error && (
          <p style={{ color: '#EF4444', margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: 700 }}>
            {error}
          </p>
        )}

        {/* Custom Onscreen Numeric Keypad (Type Answer Style) */}
        <div
          className="type-quiz-keypad-grid"
          style={{
            width: '100%',
            maxWidth: '280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(4, 1fr)',
            gap: '8px'
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="type-quiz-key-btn"
              onClick={() => handleDigit(digit)}
              style={{ height: '48px', fontSize: '1.35rem', fontWeight: 900 }}
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: spacer, 0, backspace */}
          <div className="type-quiz-key-spacer" />
          <button
            type="button"
            className="type-quiz-key-btn"
            onClick={() => handleDigit('0')}
            style={{ height: '48px', fontSize: '1.35rem', fontWeight: 900 }}
          >
            0
          </button>
          <button
            type="button"
            className="type-quiz-key-btn type-quiz-key-backspace"
            onClick={handleBackspace}
            style={{ height: '48px' }}
            title="Backspace"
            aria-label="Backspace"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, strokeWidth: 2.5 }}>
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        </div>

        {/* Action / Unlock Button */}
        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className={`type-quiz-action-btn ${pinValue.length >= 4 ? 'check' : 'disabled'}`}
            disabled={pinValue.length === 0}
            onClick={handleUnlock}
            style={{
              width: '100%',
              maxWidth: '280px',
              height: '42px',
              fontSize: '0.95rem',
              letterSpacing: '1px',
              borderRadius: '10px'
            }}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <PinGate>
        <LanguageProvider>
          <EditorProvider>
            <AppContent />
          </EditorProvider>
        </LanguageProvider>
      </PinGate>
    </ErrorBoundary>
  )
}

export default App
