import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  formatTerm,
  areLikeTerms,
  combineTerms,
  isFullySimplified,
  calculateMinPresses
} from './game/AlgeBrosEngine';
import { generateLevels } from './game/AlgeBrosLevelGenerator';
import {
  unlockAudio,
  playSelect,
  playMerge,
  playWrong,
  playLevelUp,
  playGameOver,
  playVictory
} from './game/AlgeBrosSoundManager';
import './AlgeBrosCartridge.css';

function ParticlesBG() {
  const particles = useMemo(() =>
    Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${10 + Math.random() * 15}s`,
      delay: `${Math.random() * 8}s`,
      size: `${1.5 + Math.random() * 2.5}px`,
    })), []);

  return (
    <div className="particles-bg">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

function StartScreen({ onStart }) {
  return (
    <motion.div
      className="start-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h1 className="start-logo">algeBROS</h1>
      
      <div className="start-card">
        <p className="start-subtitle">
          Master the art of combining like terms through spatial dragging and operations!
        </p>
        
        <div className="rule-item">
          <span className="rule-icon">🫳</span>
          <span>Drag term cards left or right to reorder them. The sign and number move together.</span>
        </div>
        <div className="rule-item">
          <span className="rule-icon">➕</span>
          <span>Click the sign buttons (operators) between adjacent like terms to add/combine them.</span>
        </div>
        <div className="rule-item">
          <span className="rule-icon">🎯</span>
          <span>Combine all compatible terms and click <strong>READY</strong> to progress. Try to use the minimum number of presses!</span>
        </div>
      </div>

      <button
        className="primary-btn"
        onClick={() => {
          unlockAudio();
          playSelect();
          onStart();
        }}
      >
        START MISSION
      </button>
    </motion.div>
  );
}

function GameOverScreen({ stats, onRestart }) {
  const isPerfectGame = stats.perfectLevels === 10;
  
  return (
    <motion.div
      className="summary-screen"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      <h1 className="summary-title">MISSION COMPLETE</h1>
      
      <div className="summary-stats">
        <div className="stat-row">
          <span className="stat-label">Total Levels Solved</span>
          <span className="stat-value success">10 / 10</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Perfect Levels (No Mistakes & Ideal Moves)</span>
          <span className={`stat-value ${stats.perfectLevels > 5 ? 'perfect' : ''}`}>
            {stats.perfectLevels} / 10
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total Sign Presses</span>
          <span className="stat-value">{stats.totalUserPresses}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Perfect Target Presses</span>
          <span className="stat-value perfect">{stats.totalMinPresses}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label font-bold">Mistakes Made</span>
          <span className="stat-value mistakes">{stats.totalMistakes}</span>
        </div>
      </div>

      <button
        className="primary-btn"
        onClick={() => {
          unlockAudio();
          playSelect();
          onRestart();
        }}
      >
        PLAY AGAIN
      </button>
    </motion.div>
  );
}

const isOneChar = (term) => {
  const absCoeff = Math.abs(term.coeff);
  const isOne = absCoeff === 1;
  const hasVar = !!term.variable;
  
  if (term.coeff === 0) return true;
  if (!hasVar) {
    return absCoeff.toString().length === 1;
  } else {
    if (isOne) {
      return !term.variable.includes('^') && term.variable.length === 1;
    }
    return false;
  }
};

const getTermOrderInfo = (term) => {
  if (!term.variable) {
    return { isConst: true, base: '', exp: 0, coeffParam: '' };
  }
  
  let coeffParam = '';
  let unknown = '';
  let exp = 1;
  
  let remaining = term.variable;
  
  // Extract parameter coefficient a, b, or c at the beginning
  if (remaining.startsWith('a') || remaining.startsWith('b') || remaining.startsWith('c')) {
    coeffParam = remaining[0];
    remaining = remaining.substring(1);
  }
  
  // Extract unknown variable x, y, or z
  if (remaining.startsWith('x') || remaining.startsWith('y') || remaining.startsWith('z')) {
    unknown = remaining[0];
    remaining = remaining.substring(1);
    
    if (remaining.startsWith('^')) {
      exp = parseInt(remaining.substring(1), 10) || 1;
    }
  } else {
    // If no unknown variable is found after the parameter, it is a constant parameter (like 'a')
    if (coeffParam) {
      return { isConst: true, base: '', exp: 0, coeffParam };
    }
  }
  
  return { isConst: false, base: unknown, exp, coeffParam };
};

const compareElegant = (a, b) => {
  const infoA = getTermOrderInfo(a);
  const infoB = getTermOrderInfo(b);
  
  // 1. Both are constants
  if (infoA.isConst && infoB.isConst) {
    // parameter constants (a, b, c) before literal constants
    if (infoA.coeffParam && infoB.coeffParam) {
      return infoA.coeffParam.localeCompare(infoB.coeffParam);
    }
    if (infoA.coeffParam) return -1;
    if (infoB.coeffParam) return 1;
    return 0;
  }
  
  // 2. One is constant, one is variable
  if (infoA.isConst) return 1; // variable before constant
  if (infoB.isConst) return -1;
  
  // 3. Both are variables
  // Alphabetical unknowns (x < y < z)
  if (infoA.base !== infoB.base) {
    return infoA.base.localeCompare(infoB.base);
  }
  
  // Descending exponents (x^2 before x)
  if (infoA.exp !== infoB.exp) {
    return infoB.exp - infoA.exp;
  }
  
  // Alphabetical parameter coefficients (ax^2 before bx^2)
  return infoA.coeffParam.localeCompare(infoB.coeffParam);
};

const checkElegance = (termsList) => {
  for (let i = 0; i < termsList.length - 1; i++) {
    if (compareElegant(termsList[i], termsList[i + 1]) > 0) {
      return false;
    }
  }
  return true;
};

export default function AlgeBrosCartridge({ config = {}, onComplete, preview = false }) {
  const [screen, setScreen] = useState('start');
  const [levels, setLevels] = useState([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  
  // Level Gameplay State
  const [terms, setTerms] = useState([]);
  const [userPresses, setUserPresses] = useState(0);
  const [minPresses, setMinPresses] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isLevelPerfect, setIsLevelPerfect] = useState(true);
  
  // Visual/Feedback State
  const [feedback, setFeedback] = useState({ text: 'Reorder and combine like terms!', type: 'info' });
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isElegantCompleted, setIsElegantCompleted] = useState(false);

  // Game-wide statistics
  const [stats, setStats] = useState({
    totalUserPresses: 0,
    totalMinPresses: 0,
    totalMistakes: 0,
    perfectLevels: 0
  });

  const handleStart = () => {
    const generated = generateLevels();
    setLevels(generated);
    setCurrentLevelIndex(0);
    loadLevel(generated[0]);
    setStats({
      totalUserPresses: 0,
      totalMinPresses: 0,
      totalMistakes: 0,
      perfectLevels: 0
    });
    setScreen('game');
  };

  const loadLevel = (levelObj) => {
    setTerms(levelObj.initialTerms);
    setMinPresses(levelObj.minPresses);
    setUserPresses(0);
    setMistakes(0);
    setIsLevelPerfect(true);
    setFeedback({ text: 'Reorder and combine like terms!', type: 'info' });
    setFlash(null);
    setShake(false);
    setIsValidating(false);
    setIsElegantCompleted(false);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const triggerFlash = (type) => {
    setFlash(type);
    setTimeout(() => setFlash(null), 500);
  };

  const showFeedback = (text, type) => {
    setFeedback({ text, type });
  };

  const handleCombine = (index) => {
    if (isValidating) return;
    unlockAudio();
    const termA = terms[index - 1];
    const termB = terms[index];

    if (areLikeTerms(termA, termB)) {
      const merged = combineTerms(termA, termB);
      const updatedTerms = [...terms];
      updatedTerms.splice(index - 1, 2, merged);
      
      setTerms(updatedTerms);
      setUserPresses(p => p + 1);
      playMerge();
      showFeedback('Merged like terms!', 'success');
      triggerFlash('success');
    } else {
      // Incompatible terms clicked
      setMistakes(m => m + 1);
      setIsLevelPerfect(false);
      playWrong();
      
      // Haptics
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      showFeedback('Unlike terms cannot be combined!', 'error');
      triggerFlash('error');
      triggerShake();
    }
  };

  const handleValidate = () => {
    if (isValidating) return;
    unlockAudio();
    
    if (isFullySimplified(terms)) {
      const elegant = checkElegance(terms);
      if (elegant) {
        setIsElegantCompleted(true);
      }
      setIsValidating(true);
      // Success! Level solved.
      const isPerfect = isLevelPerfect && mistakes === 0 && userPresses === minPresses;
      playLevelUp();
      showFeedback(isPerfect ? 'Perfect! Clean work!' : 'Simplified successfully!', 'success');
      triggerFlash('success');

      // Accumulate stats
      const levelStats = {
        totalUserPresses: userPresses,
        totalMinPresses: minPresses,
        totalMistakes: mistakes,
        perfectLevelInc: isPerfect ? 1 : 0
      };

      setStats(prev => ({
        totalUserPresses: prev.totalUserPresses + levelStats.totalUserPresses,
        totalMinPresses: prev.totalMinPresses + levelStats.totalMinPresses,
        totalMistakes: prev.totalMistakes + levelStats.totalMistakes,
        perfectLevels: prev.perfectLevels + levelStats.perfectLevelInc
      }));

      // Delay loading next level for animation
      setTimeout(() => {
        const nextIndex = currentLevelIndex + 1;
        if (nextIndex >= 10) {
          playVictory();
          setScreen('gameOver');
          if (onComplete) {
            onComplete();
          }
          setIsValidating(false);
        } else {
          setCurrentLevelIndex(nextIndex);
          loadLevel(levels[nextIndex]);
        }
      }, 1200);
    } else {
      // Not simplified
      setMistakes(m => m + 1);
      setIsLevelPerfect(false);
      playWrong();
      
      if ('vibrate' in navigator) {
        navigator.vibrate([150, 70, 150]);
      }
      
      showFeedback('Equation is not fully simplified! Keep combining.', 'error');
      triggerFlash('error');
      triggerShake();
    }
  };

  const renderTermValue = (term) => {
    const absCoeff = Math.abs(term.coeff);
    const isOne = absCoeff === 1;
    const hasVar = !!term.variable;
    
    if (term.coeff === 0) {
      return <span className="term-value">0</span>;
    }
    
    let coeffStr = '';
    if (!hasVar) {
      coeffStr = `${absCoeff}`;
    } else {
      coeffStr = isOne ? '' : `${absCoeff}`;
    }
    
    let varContent = null;
    if (hasVar) {
      if (term.variable.includes('^')) {
        const [base, exp] = term.variable.split('^');
        varContent = (
          <span>
            <span className="math-variable">{base}</span>
            <sup>{exp}</sup>
          </span>
        );
      } else {
        varContent = <span className="math-variable">{term.variable}</span>;
      }
    }
    
    return (
      <span className="term-value">
        {coeffStr}{varContent}
      </span>
    );
  };

  const expressionScale = useMemo(() => {
    if (!terms || terms.length === 0) return 1;
    
    const getTermWidth = (term) => {
      const absCoeff = Math.abs(term.coeff);
      const isOne = absCoeff === 1;
      const hasVar = !!term.variable;
      let chars = 0;
      if (term.coeff === 0) {
        chars = 1;
      } else {
        if (!hasVar) {
          chars = absCoeff.toString().length;
        } else {
          chars = (isOne ? 0 : absCoeff.toString().length) + term.variable.length;
        }
      }
      return 14 + chars * 8.5;
    };

    const totalBaseWidth = terms.reduce((acc, term, idx) => {
      const cardW = getTermWidth(term);
      const opW = idx > 0 ? 32 : 0; // 26px operator button + 4px margin + 2px list gap
      const staticSignW = (idx === 0 && term.coeff < 0) ? 12 : 0;
      return acc + cardW + opW + staticSignW;
    }, 0);

    const targetWidth = 288;
    const calculatedScale = totalBaseWidth > 0 ? targetWidth / totalBaseWidth : 1;
    
    return Math.max(0.55, Math.min(2.0, calculatedScale));
  }, [terms]);

  // Preview Card for Slide Thumbnails/Editor Preview
  if (preview) {
    return (
      <div className="algebros-cartridge" style={{ pointerEvents: 'none' }}>
        <ParticlesBG />
        <div className="start-screen" style={{ gap: '12px' }}>
          <h1 className="start-logo" style={{ fontSize: '2.2rem' }}>algeBROS</h1>
          <div className="start-card" style={{ padding: '16px' }}>
            <p className="start-subtitle" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
              Algebraic Term Simplifier
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`algebros-cartridge ${flash === 'error' ? 'error-flash' : ''} ${flash === 'success' ? 'success-flash' : ''}`}>
      <ParticlesBG />
      
      <div className="screen-container">
        <AnimatePresence mode="wait">
          {screen === 'start' && (
            <StartScreen key="start" onStart={handleStart} />
          )}

          {screen === 'game' && (
            <motion.div
              key="game"
              className="algebros-game-area"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              {/* HUD */}
              <div className="hud-header">
                <div className="hud-badge">
                  LVL <span className="font-mono">{currentLevelIndex + 1} / 10</span>
                </div>
                <div 
                  className="hud-badge"
                  style={{
                    filter: isElegantCompleted ? 'none' : 'grayscale(100%) opacity(0.35)',
                    transition: 'all 0.5s ease-in-out',
                    borderColor: isElegantCompleted ? 'rgba(236, 72, 153, 0.4)' : 'rgba(15,23,42,0.08)',
                    boxShadow: isElegantCompleted ? '0 0 10px rgba(236, 72, 153, 0.15)' : 'none',
                    color: isElegantCompleted ? '#ec4899' : 'inherit'
                  }}
                  title={isElegantCompleted ? "Elegant solution!" : "Solve with variables sorted alphabetically and exponents descending to get the flower!"}
                >
                  🌸 <span style={{ fontSize: '0.75rem', fontWeight: 800, marginLeft: '2px' }}>ELEGANT</span>
                </div>
                <div className={`hud-badge ${userPresses > minPresses ? '' : 'hud-badge-highlight'}`}>
                  PRESSES: <span className="font-mono">{userPresses}</span> <span style={{ opacity: 0.5 }}>/ {minPresses}</span>
                </div>
              </div>

              {/* Expression Dragging Area */}
              <div className={`expression-wrapper ${shake ? 'shake-container' : ''} ${isValidating ? 'is-success-transition' : ''}`} style={{ pointerEvents: isValidating ? 'none' : 'auto' }}>
                <Reorder.Group
                  axis="x"
                  values={terms}
                  onReorder={setTerms}
                  className="expression-list"
                  style={{
                    transform: `scale(${expressionScale})`,
                    transformOrigin: 'center'
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {terms.map((term, index) => {
                      const isFirst = index === 0;
                      const formatted = formatTerm(term, isFirst);
                      const hasVar = !!term.variable;
                      const oneChar = isOneChar(term);

                      return (
                        <Reorder.Item
                          key={term.id}
                          value={term}
                          className="term-item-wrapper"
                          whileDrag={{ scale: 1.06 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                        >
                          {/* Sign button / text (outside the card box!) */}
                          {!isFirst && (
                            <button
                              className="operator-btn"
                              onMouseDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onClick={() => handleCombine(index)}
                            >
                              {formatted.sign}
                            </button>
                          )}
                          {isFirst && formatted.sign === '-' && (
                            <span className="operator-static">-</span>
                          )}

                          {/* Term card box (only wraps the value!) */}
                          <div className={`term-card ${hasVar ? 'variable-term' : 'constant-term'} ${oneChar ? 'one-char-card' : ''}`}>
                            {renderTermValue(term)}
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </AnimatePresence>
                </Reorder.Group>
              </div>

              {/* Feedback messages & Actions */}
              <div className="bottom-controls" style={{ paddingBottom: '24px' }}>
                <button
                  className="ready-btn"
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  READY
                </button>
              </div>
            </motion.div>
          )}

          {screen === 'gameOver' && (
            <GameOverScreen
              key="gameover"
              stats={stats}
              onRestart={handleStart}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
