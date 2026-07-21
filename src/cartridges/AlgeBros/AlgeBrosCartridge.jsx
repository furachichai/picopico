import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  formatTerm,
  areLikeTerms,
  combineTerms,
  isFullySimplified,
  calculateMinPresses,
  areEqualTerms,
  isDivisionSimplified,
  makeTerm,
  getPrimeFactors,
  getTermDecompositionOptions,
  multiplyTerms,
  isEquationSolved
} from './game/AlgeBrosEngine';
import { generateLevels, generateDivisionLevels, generateEquationLevels } from './game/AlgeBrosLevelGenerator';
import {
  unlockAudio,
  playSelect,
  playMerge,
  playWrong,
  playLevelUp,
  playGameOver,
  playVictory,
  playPopFX
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

function StartScreen({ onStart, topic, setTopic }) {
  return (
    <motion.div
      className="start-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h1 className="start-logo">algeBROS</h1>
      
      <div className="start-card" style={{ marginBottom: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p className="start-subtitle" style={{ fontWeight: 800, color: 'var(--accent-purple)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem' }}>
          Select Topic:
        </p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="hud-badge"
            style={{
              cursor: 'pointer',
              background: topic === 'equations' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              borderColor: topic === 'equations' ? 'var(--accent-purple)' : 'rgba(15,23,42,0.08)',
              color: topic === 'equations' ? 'var(--accent-purple)' : 'inherit',
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: '0.75rem',
              borderRadius: '8px'
            }}
            onClick={() => {
              unlockAudio();
              playSelect();
              setTopic('equations');
            }}
          >
            ⚖️ EQUATIONS
          </button>
          <button
            className="hud-badge"
            style={{
              cursor: 'pointer',
              background: topic === 'divisions' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              borderColor: topic === 'divisions' ? 'var(--accent-purple)' : 'rgba(15,23,42,0.08)',
              color: topic === 'divisions' ? 'var(--accent-purple)' : 'inherit',
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: '0.75rem',
              borderRadius: '8px'
            }}
            onClick={() => {
              unlockAudio();
              playSelect();
              setTopic('divisions');
            }}
          >
            🌸 DIVISIONS
          </button>
          <button
            className="hud-badge"
            style={{
              cursor: 'pointer',
              background: topic === 'liketerms' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              borderColor: topic === 'liketerms' ? 'var(--accent-purple)' : 'rgba(15,23,42,0.08)',
              color: topic === 'liketerms' ? 'var(--accent-purple)' : 'inherit',
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: '0.75rem',
              borderRadius: '8px'
            }}
            onClick={() => {
              unlockAudio();
              playSelect();
              setTopic('liketerms');
            }}
          >
            📐 LIKE TERMS
          </button>
        </div>

        {topic === 'equations' ? (
          <>
            <p className="start-subtitle">
              Isolate the variable on one side of the equals sign to solve the equation!
            </p>
            <div className="rule-item">
              <span className="rule-icon">⚖️</span>
              <span>Tap a term, then click the arrow to move it to the other side's denominator.</span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">✖️</span>
              <span>Decompose terms and cross out matching pairs to simplify.</span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">🎯</span>
              <span>Get the variable isolated (e.g. x = 3) and click <strong>READY</strong>.</span>
            </div>
          </>
        ) : topic === 'divisions' ? (
          <>
            <p className="start-subtitle">
              Simplify fractions by crossing out identical terms on the top and bottom!
            </p>
            <div className="rule-item">
              <span className="rule-icon">🫳</span>
              <span>Drag cards horizontally in the top (numerator) or bottom (denominator) to reorder.</span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">✖️</span>
              <span>Tap a card on top, then tap an identical card on the bottom to cross them out.</span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">🌸</span>
              <span>Simplify completely and press <strong>READY</strong>. Keep them sorted alphabetically for the Elegance bonus!</span>
            </div>
          </>
        ) : (
          <>
            <p className="start-subtitle">
              Master the art of combining like terms through spatial dragging and operations!
            </p>
            <div className="rule-item">
              <span className="rule-icon">🫳</span>
              <span>Drag term cards left or right to reorder them. The sign and number move together.</span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">➕</span>
              <span>Click the sign buttons (operators) between adjacent like terms to combine them.</span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">🎯</span>
              <span>Combine all compatible terms and click <strong>READY</strong> to progress. Try to use minimum actions!</span>
            </div>
          </>
        )}
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
  const [isDraggingTerm, setIsDraggingTerm] = useState(false);
  const [isMatchingFading, setIsMatchingFading] = useState(false);

  const [topic, setTopic] = useState('equations'); // Default is 'equations'
  const [numTerms, setNumTerms] = useState([]);
  const [denTerms, setDenTerms] = useState([]);
  const [slicedNum, setSlicedNum] = useState([]); // Sliced numerator term IDs
  const [slicedDen, setSlicedDen] = useState([]); // Sliced denominator term IDs
  const [crossedOutNum, setCrossedOutNum] = useState([]);
  const [crossedOutDen, setCrossedOutDen] = useState([]);

  // Right side of equation state variables
  const [rightNumTerms, setRightNumTerms] = useState([]);
  const [rightDenTerms, setRightDenTerms] = useState([]);
  const [slicedRightNum, setSlicedRightNum] = useState([]);
  const [slicedRightDen, setSlicedRightDen] = useState([]);
  const [crossedOutRightNum, setCrossedOutRightNum] = useState([]);
  const [crossedOutRightDen, setCrossedOutRightDen] = useState([]);
  const [unknownVar, setUnknownVar] = useState('x');

  const [cardAngles, setCardAngles] = useState({}); // Stores line rotation angle per card ID
  const [activeFactorMenu, setActiveFactorMenu] = useState(null); // { cardId, type } or null
  const [popoverPos, setPopoverPos] = useState(null);
  const [dragHintState, setDragHintState] = useState(null); // { side, insertIndex, signHint } or null
  const [shakeDotButtons, setShakeDotButtons] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState(null);
  const activeCardRef = useRef(null);
  const justDraggedRef = useRef(false);
  const dragSessionRef = useRef(null);

  const numTermsRef = React.useRef(numTerms);
  const denTermsRef = React.useRef(denTerms);
  const slicedNumRef = React.useRef(slicedNum);
  const slicedDenRef = React.useRef(slicedDen);

  const rightNumTermsRef = React.useRef(rightNumTerms);
  const rightDenTermsRef = React.useRef(rightDenTerms);
  const slicedRightNumRef = React.useRef(slicedRightNum);
  const slicedRightDenRef = React.useRef(slicedRightDen);

  React.useEffect(() => {
    numTermsRef.current = numTerms;
    denTermsRef.current = denTerms;
    slicedNumRef.current = slicedNum;
    slicedDenRef.current = slicedDen;

    rightNumTermsRef.current = rightNumTerms;
    rightDenTermsRef.current = rightDenTerms;
    slicedRightNumRef.current = slicedRightNum;
    slicedRightDenRef.current = slicedRightDen;
  }, [numTerms, denTerms, slicedNum, slicedDen, rightNumTerms, rightDenTerms, slicedRightNum, slicedRightDen]);

  const playPopFX = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playPop = (delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const startTime = ctx.currentTime + delay;
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, startTime);
        osc.frequency.exponentialRampToValueAtTime(150, startTime + 0.12);
        
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);
        
        osc.start(startTime);
        osc.stop(startTime + 0.12);
      };
      
      playPop(0);
      playPop(0.08);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Game-wide statistics
  const [stats, setStats] = useState({
    totalUserPresses: 0,
    totalMinPresses: 0,
    totalMistakes: 0,
    perfectLevels: 0
  });

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const triggerFlash = useCallback((type) => {
    setFlash(type);
    setTimeout(() => setFlash(null), 500);
  }, []);

  const showFeedback = useCallback((text, type) => {
    setFeedback({ text, type });
  }, []);

  const loadLevel = useCallback((levelObj) => {
    if (topic === 'divisions') {
      setNumTerms(levelObj.initialNum || []);
      setDenTerms(levelObj.initialDen || []);
      setSlicedNum([]);
      setSlicedDen([]);
      setCrossedOutNum([]);
      setCrossedOutDen([]);
      setCardAngles({});
    } else if (topic === 'equations') {
      setNumTerms(levelObj.initialLeftNum || []);
      setDenTerms(levelObj.initialLeftDen || []);
      setRightNumTerms(levelObj.initialRightNum || []);
      setRightDenTerms(levelObj.initialRightDen || []);
      setSlicedNum([]);
      setSlicedDen([]);
      setCrossedOutNum([]);
      setCrossedOutDen([]);
      setSlicedRightNum([]);
      setSlicedRightDen([]);
      setCrossedOutRightNum([]);
      setCrossedOutRightDen([]);
      setCardAngles({});
      
      const firstVarTerm = (levelObj.initialLeftNum || []).find(t => t.variable);
      setUnknownVar(firstVarTerm ? firstVarTerm.variable : 'x');
    } else {
      setTerms(levelObj.initialTerms || []);
    }
    setMinPresses(levelObj.minPresses);
    setUserPresses(0);
    setMistakes(0);
    setIsLevelPerfect(true);
    setFeedback({
      text: topic === 'equations'
        ? 'Isolate the variable on one side of the equals sign!'
        : topic === 'divisions'
        ? 'Cross out matching terms!'
        : 'Reorder and combine like terms!',
      type: 'info'
    });
    setFlash(null);
    setShake(false);
    setIsValidating(false);
    setIsElegantCompleted(false);
    setIsDraggingTerm(false);
  }, [topic]);

  const handleMultiplyAdjacent = (index, type) => {
    setActiveFactorMenu(null);
    const getList = () => type === 'num' ? numTerms
                        : type === 'den' ? denTerms
                        : type === 'rightNum' ? rightNumTerms
                        : rightDenTerms;

    const list = getList();
    const termA = list[index - 1];
    const termB = list[index];
    if (!termA || !termB) return;

    if (topic === 'equations' && termB.coeff < 0) {
      if (areLikeTerms(termA, termB)) {
        playMerge();
        const combined = combineTerms(termA, termB);
        const setter = type === 'num' ? setNumTerms
                     : type === 'den' ? setDenTerms
                     : type === 'rightNum' ? setRightNumTerms
                     : setRightDenTerms;
        setter(prev => {
          const next = [...prev];
          next.splice(index - 1, 2, combined);
          return next;
        });
      } else {
        playWrong();
        setShakeDotButtons(true);
        setTimeout(() => setShakeDotButtons(false), 500);
      }
      return;
    }

    playMerge();
    const product = multiplyTerms(termA, termB);
    const setter = type === 'num' ? setNumTerms
                 : type === 'den' ? setDenTerms
                 : type === 'rightNum' ? setRightNumTerms
                 : setRightDenTerms;
    setter(prev => {
      const next = [...prev];
      next.splice(index - 1, 2, product);
      return next;
    });
  };

  const handleCardTap = (term, type) => {
    if (!term || term.coeff === 0 || isDraggingTerm || justDraggedRef.current) return;
    const expMatch = term.variable ? term.variable.match(/^([a-zA-Z])\^(\d+)$/) : null;
    if (expMatch) {
      const base = expMatch[1];
      const exponent = parseInt(expMatch[2], 10);
      if (exponent > 1) {
        setActiveFactorMenu(null);
        playMerge();
        const splitA = makeTerm(term.coeff, exponent - 1 === 1 ? base : `${base}^${exponent - 1}`);
        const splitB = makeTerm(1, base);
        const splitTerms = [splitA, splitB];
        const setter = type === 'num' ? setNumTerms
                     : type === 'den' ? setDenTerms
                     : type === 'rightNum' ? setRightNumTerms
                     : setRightDenTerms;
        setter(prev => {
          const idx = prev.findIndex(t => t.id === term.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next.splice(idx, 1, ...splitTerms);
          return next;
        });
        return;
      }
    }

    if (Math.abs(term.coeff) > 1 && term.variable) {
      setActiveFactorMenu(null);
      playMerge();
      const splitA = makeTerm(term.coeff, null);
      const splitB = makeTerm(1, term.variable);
      const setter = type === 'num' ? setNumTerms
                   : type === 'den' ? setDenTerms
                   : type === 'rightNum' ? setRightNumTerms
                   : setRightDenTerms;
      setter(prev => {
        const idx = prev.findIndex(t => t.id === term.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1, splitA, splitB);
        return next;
      });
      return;
    }

    // Tapping a simple card
    const decompOptions = getTermDecompositionOptions(term);
    if (decompOptions.length === 1) {
      handleDecompose(term, decompOptions[0].splitA, decompOptions[0].splitB, type);
    } else if (decompOptions.length > 1) {
      if (activeFactorMenu?.cardId === term.id) {
        setActiveFactorMenu(null);
      } else {
        setActiveFactorMenu({ cardId: term.id, type });
      }
    }
  };

  const handleDecompose = (term, splitA, splitB, type) => {
    setActiveFactorMenu(null);
    playMerge();
    const setter = type === 'num' ? setNumTerms
                 : type === 'den' ? setDenTerms
                 : type === 'rightNum' ? setRightNumTerms
                 : setRightDenTerms;
    setter(prev => {
      const idx = prev.findIndex(t => t.id === term.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1, splitA, splitB);
      return next;
    });
  };

  const isDenOne = (terms) => terms && terms.length === 1 && terms[0].coeff === 1 && !terms[0].variable;

  const handleRestartLevel = () => {
    setActiveFactorMenu(null);
    playPopFX();
    if (levels[currentLevelIndex]) {
      loadLevel(levels[currentLevelIndex]);
    }
  };

  const splitIntoAdditiveGroups = (sourceList) => {
    if (!sourceList || sourceList.length === 0) return [];
    const groups = [];
    let currentGroup = [];
    sourceList.forEach((t, idx) => {
      if (idx === 0) {
        currentGroup.push(t);
      } else if (t.groupId && currentGroup[0].groupId && t.groupId === currentGroup[0].groupId) {
        currentGroup.push(t);
      } else {
        if (currentGroup.length > 0) groups.push(currentGroup);
        currentGroup = [t];
      }
    });
    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
  };

  const calculateInsertIndex = (targetSideClass, dropX) => {
    return calculateInsertIndexWithHysteresis(targetSideClass, dropX, null);
  };

  const calculateInsertIndexWithHysteresis = (targetSideClass, dropX, lastInsertIndex) => {
    const sideEl = document.querySelector(`.equation-side${targetSideClass} .expression-list`);
    if (!sideEl) return 0;

    const allGroupEls = Array.from(sideEl.querySelectorAll(':scope > .term-group-wrapper'));
    if (allGroupEls.length === 0) return 0;

    let placeholderIdx = -1;
    let placeholderWidth = 0;
    const realGroupEls = [];

    allGroupEls.forEach((el) => {
      const isPlaceholder = el.querySelector('.drop-slot-placeholder') || el.classList.contains('drop-slot-placeholder');
      if (isPlaceholder) {
        placeholderIdx = realGroupEls.length;
        placeholderWidth = el.getBoundingClientRect().width;
      } else {
        realGroupEls.push(el);
      }
    });

    if (realGroupEls.length === 0) return 0;

    const midXList = realGroupEls.map((el, i) => {
      const rect = el.getBoundingClientRect();
      const isShifted = placeholderIdx !== -1 && i >= placeholderIdx;
      const naturalLeft = isShifted ? (rect.left - placeholderWidth) : rect.left;
      return naturalLeft + rect.width / 2;
    });

    const numSlots = realGroupEls.length + 1;

    if (lastInsertIndex !== null && lastInsertIndex !== undefined && lastInsertIndex >= 0 && lastInsertIndex < numSlots) {
      const H = 24; // 24px hysteresis buffer

      let leftBound = -Infinity;
      if (lastInsertIndex > 0) {
        leftBound = midXList[lastInsertIndex - 1] - H;
      }

      let rightBound = Infinity;
      if (lastInsertIndex < realGroupEls.length) {
        rightBound = midXList[lastInsertIndex] + H;
      }

      if (dropX >= leftBound && dropX <= rightBound) {
        return lastInsertIndex;
      }
    }

    for (let i = 0; i < midXList.length; i++) {
      if (dropX < midXList[i]) {
        return i;
      }
    }
    return realGroupEls.length;
  };

  const handleMoveCrossSide = (term, sourceType, targetType, insertIndex = null) => {
    if (!term || term.coeff === 0) return;
    setActiveFactorMenu(null);
    playMerge();
    setUserPresses(p => p + 1);

    const isAdditiveTransposition = (sourceType === 'num' && targetType === 'rightNum') ||
                                    (sourceType === 'rightNum' && targetType === 'num');

    const getSetter = (t) => t === 'num' ? setNumTerms
                           : t === 'den' ? setDenTerms
                           : t === 'rightNum' ? setRightNumTerms
                           : setRightDenTerms;

    const sourceSetter = getSetter(sourceType);
    const targetSetter = getSetter(targetType);

    if (sourceSetter && targetSetter) {
      if (isAdditiveTransposition) {
        const getList = (t) => t === 'num' ? numTerms : rightNumTerms;
        const sourceList = getList(sourceType);
        
        const groups = splitIntoAdditiveGroups(sourceList);
        const targetGroup = groups.find(g => g.some(t => t.id === term.id)) || [term];
        const targetGroupIds = new Set(targetGroup.map(t => t.id));

        sourceSetter(prev => {
          const prevGroups = splitIntoAdditiveGroups(prev);
          const prevTargetGroup = prevGroups.find(g => g.some(t => t.id === term.id)) || targetGroup;
          const idsToRemove = new Set(prevTargetGroup.map(t => t.id));
          const remaining = prev.filter(t => !idsToRemove.has(t.id));
          return remaining.length === 0 ? [{ coeff: 0 }] : remaining;
        });

        const sharedGroupId = targetGroup[0]?.groupId || ('g_' + Math.random().toString(36).substr(2, 7));
        const newTerms = targetGroup.map((t, idx) => {
          const newCoeff = idx === 0 ? -t.coeff : t.coeff;
          return makeTerm(newCoeff, t.variable, sharedGroupId);
        });

        targetSetter(prev => {
          const filtered = prev.filter(t => t.coeff !== 0);
          const existingGroups = splitIntoAdditiveGroups(filtered);
          const idxToInsert = (typeof insertIndex === 'number' && insertIndex >= 0)
            ? Math.min(insertIndex, existingGroups.length)
            : existingGroups.length;
          existingGroups.splice(idxToInsert, 0, newTerms);
          return existingGroups.flat();
        });
      } else {
        // Drop under term: move ONLY the dragged term to denominator
        sourceSetter(prev => {
          const remaining = prev.filter(t => t.id !== term.id);
          if (sourceType === 'den' || sourceType === 'rightDen') {
            return remaining;
          }
          return remaining.length === 0 ? [{ coeff: 1 }] : remaining;
        });
        const newCoeff = Math.abs(term.coeff);
        const newTerm = makeTerm(newCoeff, term.variable);
        targetSetter(prev => {
          const filtered = prev.filter(t => t.coeff !== 0);
          return [...filtered, newTerm];
        });
      }
    }
  };

  const handleDragStartInit = (term, currentType, event, info) => {
    setActiveFactorMenu(null);
    setIsDraggingTerm(true);
    setDraggingCardId(term.id);

    // Snapshot group midpoints BEFORE any layout changes.
    // We exclude the dragged group and adjust positions of groups after it.
    const snapshotSide = (sideClass, termList) => {
      const sideEl = document.querySelector(`.equation-side${sideClass} .expression-list`);
      if (!sideEl) return { midpoints: [], draggingGroupIdx: -1 };
      const groups = splitIntoAdditiveGroups(termList);
      const groupEls = Array.from(sideEl.querySelectorAll(':scope > .term-group-wrapper'));
      // Filter to real groups only (exclude any leftover placeholders)
      const realEls = groupEls.filter(el =>
        !el.querySelector('.drop-slot-placeholder') && !el.classList.contains('drop-slot-placeholder')
      );

      const draggingGroupIdx = groups.findIndex(g => g.some(t => t.id === term.id));
      let dragGroupWidth = 0;
      const midpoints = [];

      for (let i = 0; i < realEls.length && i < groups.length; i++) {
        const rect = realEls[i].getBoundingClientRect();
        if (i === draggingGroupIdx) {
          // Also account for the operator span before this group (~28px)
          dragGroupWidth = rect.width + (i > 0 ? 28 : 0);
          continue;
        }
        const adjustedLeft = (draggingGroupIdx >= 0 && i > draggingGroupIdx)
          ? rect.left - dragGroupWidth
          : rect.left;
        midpoints.push(adjustedLeft + rect.width / 2);
      }
      return { midpoints, draggingGroupIdx };
    };

    dragSessionRef.current = {
      termId: term.id,
      startX: info?.point?.x || 0,
      startY: info?.point?.y || 0,
      startType: currentType,
      lastSide: null,
      lastInsertIndex: null,
      isUnlocked: false,
      leftSnapshot: snapshotSide('.left-side', numTerms),
      rightSnapshot: snapshotSide('.right-side', rightNumTerms),
    };
  };

  const handleDragCross = (term, currentType, event, info) => {
    if (!term || term.coeff === 0) {
      setDragHintState(null);
      return;
    }
    const equalsEl = document.querySelector('.equals-sign');
    if (!equalsEl) {
      setDragHintState(null);
      return;
    }

    const equalsRect = equalsEl.getBoundingClientRect();
    const centerX = equalsRect.left + equalsRect.width / 2;

    const dropX = info.point.x;
    const dropY = info.point.y;

    const session = dragSessionRef.current;
    if (!session) return;

    const startedOnLeft = currentType === 'num' || currentType === 'den';

    // 1. Check if dragging into denominator region
    const targetSideClassForDen = dropX <= centerX ? '.left-side' : '.right-side';
    const targetNumEl = document.querySelector(`.equation-side${targetSideClassForDen} .expression-list`);
    const targetDenEl = document.querySelector(`.equation-side${targetSideClassForDen} .division-container > .expression-list:last-child`);
    const targetDenTerms = dropX <= centerX ? denTerms : rightDenTerms;

    let isUnderTerm = false;
    if (targetDenTerms && targetDenTerms.length > 0 && targetDenEl) {
      const denRect = targetDenEl.getBoundingClientRect();
      isUnderTerm = dropY > (denRect.top - 4);
    } else if (targetNumEl) {
      const numRect = targetNumEl.getBoundingClientRect();
      isUnderTerm = dropY > (numRect.bottom + 6);
    }

    if (isUnderTerm) {
      const targetSide = dropX <= centerX ? 'leftDen' : 'rightDen';
      session.lastSide = targetSide;
      session.lastInsertIndex = null;
      setDragHintState({ side: targetSide });
      return;
    }

    // 2. Numerator drop position (same side or cross side)
    const isTargetLeft = dropX <= centerX;
    const side = isTargetLeft ? 'leftNum' : 'rightNum';
    const crossedSides = (startedOnLeft && !isTargetLeft) || (!startedOnLeft && isTargetLeft);

    // Initial deadzone lock-in near original start position when on same side
    if (!crossedSides && (currentType === 'num' || currentType === 'rightNum')) {
      const dist = Math.hypot(dropX - session.startX, dropY - session.startY);
      if (!session.isUnlocked && dist < 36) {
        setDragHintState(null);
        return;
      }
      session.isUnlocked = true;
    } else {
      session.isUnlocked = true;
    }

    // Use snapshot midpoints (frozen at drag start) instead of live DOM
    const snapshot = isTargetLeft ? session.leftSnapshot : session.rightSnapshot;
    const midpoints = snapshot?.midpoints || [];

    if (session.lastSide !== side) {
      session.lastSide = side;
      session.lastInsertIndex = null;
    }

    // Calculate insertIndex from static snapshot with hysteresis
    let insertIndex;
    const H = 28; // hysteresis buffer in px

    if (session.lastInsertIndex !== null && session.lastInsertIndex >= 0 && session.lastInsertIndex <= midpoints.length) {
      // Check if still within hysteresis zone of current slot
      const li = session.lastInsertIndex;
      const leftBound = li > 0 ? midpoints[li - 1] - H : -Infinity;
      const rightBound = li < midpoints.length ? midpoints[li] + H : Infinity;
      if (dropX >= leftBound && dropX <= rightBound) {
        insertIndex = li;
      }
    }

    if (insertIndex === undefined) {
      // Fresh calculation from snapshot
      insertIndex = midpoints.length; // default: after all
      for (let i = 0; i < midpoints.length; i++) {
        if (dropX < midpoints[i]) {
          insertIndex = i;
          break;
        }
      }
    }

    session.lastInsertIndex = insertIndex;

    // Suppress hint if near original placement on same side
    // The draggingGroupIdx is relative to the ORIGINAL groups (before the dragged group was removed from midpoints).
    // insertIndex is relative to the midpoints array (which excludes the dragged group).
    // So "near original" means insertIndex equals the draggingGroupIdx in the snapshot.
    if (!crossedSides && (currentType === 'num' || currentType === 'rightNum')) {
      const dgi = snapshot?.draggingGroupIdx;
      if (dgi !== undefined && dgi >= 0 && insertIndex === dgi) {
        setDragHintState(null);
        return;
      }
    }

    let signHint;
    if (crossedSides) {
      signHint = term.coeff > 0 ? '-' : '+';
    } else {
      signHint = term.coeff < 0 ? '-' : '+';
    }

    setDragHintState({ side, insertIndex, signHint });
  };

  const handleSameSideReorder = (term, currentType, dropX) => {
    if (currentType !== 'num' && currentType !== 'rightNum') return;

    const isLeft = currentType === 'num';
    const sideClass = isLeft ? '.left-side' : '.right-side';
    const setter = isLeft ? setNumTerms : setRightNumTerms;
    const currentList = isLeft ? numTerms : rightNumTerms;

    const groups = splitIntoAdditiveGroups(currentList);
    const movingGroupIdx = groups.findIndex(g => g.some(t => t.id === term.id));
    if (movingGroupIdx === -1) return;

    const insertIndex = calculateInsertIndex(sideClass, dropX);

    if (insertIndex !== movingGroupIdx && insertIndex !== movingGroupIdx + 1) {
      playMerge();
      setUserPresses(p => p + 1);
      setter(prev => {
        const prevGroups = splitIntoAdditiveGroups(prev);
        const sourceIdx = prevGroups.findIndex(g => g.some(t => t.id === term.id));
        if (sourceIdx === -1) return prev;

        const [movingGroup] = prevGroups.splice(sourceIdx, 1);
        const targetIdx = insertIndex > sourceIdx ? insertIndex - 1 : insertIndex;
        prevGroups.splice(targetIdx, 0, movingGroup);
        return prevGroups.flat();
      });
    }
  };

  const handleDragEndCross = (term, currentType, event, info) => {
    const hint = dragHintState;
    setDragHintState(null);
    dragSessionRef.current = null;
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 200);

    if (!term || term.coeff === 0) return;
    const equalsEl = document.querySelector('.equals-sign');
    if (!equalsEl) return;

    const equalsRect = equalsEl.getBoundingClientRect();
    const centerX = equalsRect.left + equalsRect.width / 2;

    const dropX = info.point.x;
    const dropY = info.point.y;
    const offsetX = info.offset?.x || 0;

    const startedOnLeft = currentType === 'num' || currentType === 'den';
    const crossed = startedOnLeft
      ? (dropX > centerX || offsetX > 40)
      : (dropX <= centerX || offsetX < -40);

    if (crossed) {
      const targetSideClass = startedOnLeft ? '.right-side' : '.left-side';
      const targetNumEl = document.querySelector(`.equation-side${targetSideClass} .expression-list`);
      const targetDenEl = document.querySelector(`.equation-side${targetSideClass} .division-container > .expression-list:last-child`);
      const targetDenTerms = startedOnLeft ? rightDenTerms : denTerms;

      let isUnderTerm = false;
      if (targetDenTerms && targetDenTerms.length > 0 && targetDenEl) {
        const denRect = targetDenEl.getBoundingClientRect();
        isUnderTerm = dropY > (denRect.top - 4);
      } else if (targetNumEl) {
        const numRect = targetNumEl.getBoundingClientRect();
        isUnderTerm = dropY > (numRect.bottom + 6);
      }

      let targetType;
      if (isUnderTerm) {
        targetType = startedOnLeft ? 'rightDen' : 'den';
      } else {
        targetType = startedOnLeft ? 'rightNum' : 'num';
      }

      const insertIndex = hint?.insertIndex ?? calculateInsertIndex(targetSideClass, dropX);
      handleMoveCrossSide(term, currentType, targetType, insertIndex);
    } else {
      handleSameSideReorder(term, currentType, dropX);
    }
  };

  const handleStart = () => {
    const generated = topic === 'equations'
      ? generateEquationLevels()
      : topic === 'divisions'
      ? generateDivisionLevels()
      : generateLevels();
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

  const isGlobalSlicing = React.useRef(false);
  const canvasRef = React.useRef(null);
  const swipePoints = React.useRef([]);

  // Resize canvas to match bounds on screen changes or viewport resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [screen]);

  // Click outside to close factor popovers
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeFactorMenu) {
        if (!e.target.closest('.term-card') && !e.target.closest('.factor-menu-portal')) {
          setActiveFactorMenu(null);
        }
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [activeFactorMenu]);

  // Compute popover position from the active card's DOM rect
  useEffect(() => {
    if (!activeFactorMenu) {
      setPopoverPos(null);
      activeCardRef.current = null;
      return;
    }
    const cardEl = document.querySelector(`.term-card[data-id="${activeFactorMenu.cardId}"]`);
    if (!cardEl) {
      setPopoverPos(null);
      setActiveFactorMenu(null);
      return;
    }
    activeCardRef.current = cardEl;
    const rect = cardEl.getBoundingClientRect();
    setPopoverPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
      cardWidth: rect.width
    });
  }, [activeFactorMenu]);

  const compareAndCrossOutSlice = useCallback((numId, denId, side) => {
    const isLeft = side === 'left';
    const numList = isLeft ? numTerms : rightNumTerms;
    const denList = isLeft ? denTerms : rightDenTerms;
    const crossedNumSetter = isLeft ? setCrossedOutNum : setCrossedOutRightNum;
    const crossedDenSetter = isLeft ? setCrossedOutDen : setCrossedOutRightDen;
    const sliceNumSetter = isLeft ? setSlicedNum : setSlicedRightNum;
    const sliceDenSetter = isLeft ? setSlicedDen : setSlicedRightDen;
    const numSetter = isLeft ? setNumTerms : setRightNumTerms;
    const denSetter = isLeft ? setDenTerms : setRightDenTerms;

    const termA = numList.find(t => t.id === numId);
    const termB = denList.find(t => t.id === denId);

    if (!termA || !termB) return;

    if (areEqualTerms(termA, termB)) {
      playPopFX();
      triggerFlash('success');
      setIsMatchingFading(true);
      
      crossedNumSetter(prev => [...prev, numId]);
      crossedDenSetter(prev => [...prev, denId]);
      
      setUserPresses(p => p + 1);
      
      sliceNumSetter(prev => prev.filter(x => x !== numId));
      sliceDenSetter(prev => prev.filter(x => x !== denId));
      
      setTimeout(() => {
        numSetter(prev => prev.filter(t => t.id !== numId));
        denSetter(prev => prev.filter(t => t.id !== denId));
        setCardAngles(prev => {
          const next = { ...prev };
          delete next[numId];
          delete next[denId];
          return next;
        });
        setIsMatchingFading(false);
      }, 300);
    } else {
      setMistakes(m => m + 1);
      setIsLevelPerfect(false);
      playWrong();
      
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      triggerFlash('error');
      triggerShake();
      showFeedback('Only identical terms can be cancelled out!', 'error');
      setIsMatchingFading(true);
      
      setTimeout(() => {
        sliceNumSetter(prev => prev.filter(x => x !== numId));
        sliceDenSetter(prev => prev.filter(x => x !== denId));
        setCardAngles(prev => {
          const next = { ...prev };
          delete next[numId];
          delete next[denId];
          return next;
        });
        setIsMatchingFading(false);
      }, 400);
    }
  }, [numTerms, denTerms, rightNumTerms, rightDenTerms, isLevelPerfect, playWrong, playMerge, triggerFlash, triggerShake]);

  const tempSlicedNum = React.useRef(null);
  const tempSlicedDen = React.useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    
    const animateCanvas = () => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const now = Date.now();
      // Filter out points older than 250ms for a snappy, fast-fading tail
      swipePoints.current = swipePoints.current.filter(p => now - p.time < 250);
      
      if (swipePoints.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(swipePoints.current[0].x, swipePoints.current[0].y);
        for (let i = 1; i < swipePoints.current.length; i++) {
          ctx.lineTo(swipePoints.current[i].x, swipePoints.current[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#10b981';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#10b981';
        ctx.stroke();
      }
      
      if (isGlobalSlicing.current || swipePoints.current.length > 0) {
        requestAnimationFrame(animateCanvas);
      }
    };

    const handleGlobalDown = (e) => {
      if (isValidating || isMatchingFading || (topic !== 'divisions' && topic !== 'equations')) return;
      
      // If starting on a card, do not slice (allows horizontal dragging/reordering)
      if (
        e.target.closest('.term-card') || 
        e.target.closest('.dot-separator-btn') || 
        e.target.closest('.factor-menu-popover') ||
        e.target.closest('.factor-menu-portal') ||
        e.target.closest('button')
      ) {
        isGlobalSlicing.current = false;
        return;
      }
      
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvasEl.width / rect.width);
      const y = (e.clientY - rect.top) * (canvasEl.height / rect.height);
      
      isGlobalSlicing.current = true;
      tempSlicedNum.current = null;
      tempSlicedDen.current = null;
      
      swipePoints.current = [{
        x,
        y,
        clientX: e.clientX,
        clientY: e.clientY,
        time: Date.now()
      }];
      
      requestAnimationFrame(animateCanvas);
    };

    const handleGlobalMove = (e) => {
      if (!isGlobalSlicing.current) return;
      
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvasEl.width / rect.width);
      const y = (e.clientY - rect.top) * (canvasEl.height / rect.height);
      
      const lastPoint = swipePoints.current[swipePoints.current.length - 1];
      const newPoint = {
        x,
        y,
        clientX: e.clientX,
        clientY: e.clientY,
        time: Date.now()
      };
      
      swipePoints.current.push(newPoint);
      
      // Collision segment interpolation
      if (lastPoint) {
        const dx = e.clientX - lastPoint.clientX;
        const dy = e.clientY - lastPoint.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.floor(dist / 8)); // sample every 8px
        
        for (let s = 0; s <= steps; s++) {
          const t = steps === 0 ? 0 : s / steps;
          const interpClientX = lastPoint.clientX + dx * t;
          const interpClientY = lastPoint.clientY + dy * t;
          
          const elem = document.elementFromPoint(interpClientX, interpClientY);
          const card = elem?.closest('.term-card');
          if (card) {
            const id = card.getAttribute('data-id');
            const type = card.getAttribute('data-type');
            
            if (id && type) {
              if (type === 'num') {
                if (!crossedOutNum.includes(id)) {
                  tempSlicedNum.current = { id, side: 'left' };
                }
              } else if (type === 'den') {
                if (!crossedOutDen.includes(id)) {
                  tempSlicedDen.current = { id, side: 'left' };
                }
              } else if (type === 'rightNum') {
                if (!crossedOutRightNum.includes(id)) {
                  tempSlicedNum.current = { id, side: 'right' };
                }
              } else if (type === 'rightDen') {
                if (!crossedOutRightDen.includes(id)) {
                  tempSlicedDen.current = { id, side: 'right' };
                }
              }
            }
          }
        }
      }
    };

    const handleGlobalUp = (e) => {
      if (!isGlobalSlicing.current) return;
      isGlobalSlicing.current = false;
      
      const numSlice = tempSlicedNum.current;
      const denSlice = tempSlicedDen.current;
      
      // Reset slices if the slice begins and ends outside of a card, without crossing any card
      const endsOutside = !e || !e.target || !e.target.closest('.term-card');
      const crossedAny = numSlice || denSlice;
      
      if (endsOutside && !crossedAny) {
        setSlicedNum([]);
        setSlicedDen([]);
        setCrossedOutNum([]);
        setCrossedOutDen([]);
        setSlicedRightNum([]);
        setSlicedRightDen([]);
        setCrossedOutRightNum([]);
        setCrossedOutRightDen([]);
        setCardAngles({});
        return;
      }
      
      if (numSlice || denSlice) {
        unlockAudio();
        
        // Calculate the slice gesture's direction/angle
        let angle = -12; // default fallback
        const points = swipePoints.current;
        if (points.length > 1) {
          const first = points[0];
          const last = points[points.length - 1];
          const dx = last.clientX - first.clientX;
          const dy = last.clientY - first.clientY;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            let rawAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            // Normalize to [-90, 90] degrees to keep the line oriented nicely
            while (rawAngle > 90) rawAngle -= 180;
            while (rawAngle < -90) rawAngle += 180;
            angle = rawAngle;
          }
        }
        
        // Save angles for crossed card IDs
        const anglesObj = {};
        if (numSlice) anglesObj[numSlice.id] = angle;
        if (denSlice) anglesObj[denSlice.id] = angle;
        setCardAngles(prev => ({ ...prev, ...anglesObj }));
        
        const side = numSlice ? numSlice.side : denSlice.side;
        if (numSlice && denSlice && numSlice.side !== denSlice.side) {
          return; // invalid cross-side slice
        }

        const isLeft = side === 'left';
        const sliceNumSetter = isLeft ? setSlicedNum : setSlicedRightNum;
        const sliceDenSetter = isLeft ? setSlicedDen : setSlicedRightDen;
        const sliceNumRef = isLeft ? slicedNumRef : slicedRightNumRef;
        const sliceDenRef = isLeft ? slicedDenRef : slicedRightDenRef;

        if (numSlice) {
          sliceNumSetter([numSlice.id]);
        }
        if (denSlice) {
          sliceDenSetter([denSlice.id]);
        }
        
        setTimeout(() => {
          const activeNumId = sliceNumRef.current[0];
          const activeDenId = sliceDenRef.current[0];
          if (activeNumId && activeDenId) {
            compareAndCrossOutSlice(activeNumId, activeDenId, side);
          }
        }, 10);
      }
    };

    window.addEventListener('pointerdown', handleGlobalDown);
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => {
      window.removeEventListener('pointerdown', handleGlobalDown);
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [numTerms, denTerms, rightNumTerms, rightDenTerms, crossedOutNum, crossedOutDen, crossedOutRightNum, crossedOutRightDen, compareAndCrossOutSlice, topic, isValidating, isMatchingFading]);


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
    
    // Check if there are multiple terms in the numerator or denominator on either side
    const hasDotSeparators = (topic === 'divisions' && (numTerms.length > 1 || denTerms.length > 1)) ||
                            (topic === 'equations' && (numTerms.length > 1 || denTerms.length > 1 || rightNumTerms.length > 1 || rightDenTerms.length > 1));
    
    const isSimplified = topic === 'divisions'
      ? (isDivisionSimplified(numTerms, denTerms) && !hasDotSeparators)
      : topic === 'equations'
      ? isEquationSolved(numTerms, denTerms, rightNumTerms, rightDenTerms, unknownVar)
      : isFullySimplified(terms);
    
    if (isSimplified) {
      const elegant = topic === 'divisions'
        ? (checkElegance(numTerms) && checkElegance(denTerms))
        : topic === 'equations'
        ? (checkElegance(numTerms) && checkElegance(denTerms) && checkElegance(rightNumTerms) && checkElegance(rightDenTerms))
        : checkElegance(terms);
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
      
      if (hasDotSeparators) {
        setShakeDotButtons(true);
        setTimeout(() => setShakeDotButtons(false), 500);
        showFeedback('Combine all multiplied terms first!', 'error');
      } else {
        if (topic === 'equations') {
          showFeedback(`Isolate the variable '${unknownVar}' with coefficient 1 on one side!`, 'error');
        } else {
          showFeedback(topic === 'divisions' ? 'Doh! There are still matching terms you can cross out!' : 'Unlike terms cannot be combined!', 'error');
        }
      }
      
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

  const getTermWidth = useCallback((term) => {
    if (!term) return 0;
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
    return topic === 'equations' ? (18 + chars * 11) : (28 + chars * 12.5);
  }, [topic]);

  const expressionScale = useMemo(() => {
    const calculateScaleForList = (list) => {
      if (!list || list.length === 0) return 1.0;
      const totalBaseWidth = list.reduce((acc, term, idx) => {
        const cardW = getTermWidth(term);
        const opW = idx > 0 ? (topic === 'equations' ? 26 : 38) : 0;
        const staticSignW = (idx === 0 && term.coeff < 0) ? 12 : 0;
        return acc + cardW + opW + staticSignW;
      }, 0);
      const targetWidth = topic === 'equations' ? 140 : 260;
      const calculatedScale = totalBaseWidth > 0 ? targetWidth / totalBaseWidth : 1;
      return Math.max(topic === 'equations' ? 0.6 : 0.4, Math.min(1.0, calculatedScale));
    };

    if (topic === 'divisions') {
      const scaleNum = calculateScaleForList(numTerms);
      const scaleDen = calculateScaleForList(denTerms);
      return Math.min(scaleNum, scaleDen);
    } else if (topic === 'equations') {
      const getSideBaseWidth = (numList, denList) => {
        const calcW = (list) => {
          if (!list || list.length === 0) return 29;
          return list.reduce((acc, term, idx) => {
            const cardW = getTermWidth(term);
            const opW = idx > 0 ? 26 : 0;
            const signW = (idx === 0 && term.coeff < 0) ? 12 : 0;
            return acc + cardW + opW + signW;
          }, 0);
        };
        return Math.max(calcW(numList), calcW(denList));
      };
      const leftW = getSideBaseWidth(numTerms, denTerms);
      const rightW = getSideBaseWidth(rightNumTerms, rightDenTerms);
      const totalEqW = leftW + 28 + rightW;
      const targetWidth = 310;
      const calculatedScale = totalEqW > 0 ? targetWidth / totalEqW : 1;
      return Math.max(0.45, Math.min(1.0, calculatedScale));
    } else {
      return calculateScaleForList(terms);
    }
  }, [topic, terms, numTerms, denTerms, rightNumTerms, rightDenTerms, getTermWidth]);

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
      
      <div className={`screen-container ${activeFactorMenu ? 'has-active-popover' : ''}`}>
        <canvas
          ref={canvasRef}
          className="slice-canvas"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />
        <AnimatePresence mode="wait">
          {screen === 'start' && (
            <StartScreen key="start" onStart={handleStart} topic={topic} setTopic={setTopic} />
          )}

          {screen === 'game' && (
            <motion.div
              key="game"
              className="algebros-game-area"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}
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
                  {topic === 'divisions' || topic === 'equations' ? 'STEPS' : 'PRESSES'}: <span className="font-mono">{userPresses}</span> <span style={{ opacity: 0.5 }}>/ {minPresses}</span>
                </div>
              </div>

              {/* Sub-HUD Controls Bar (Below HUD) */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '2px', marginBottom: '6px', zIndex: 10 }}>
                <button
                  className="floating-reset-btn"
                  onClick={handleRestartLevel}
                  title="Restart level"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(15, 23, 42, 0.12)',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 800
                  }}
                >
                  ↺
                </button>
              </div>

              <div className={`expression-wrapper ${shake ? 'shake-container' : ''} ${isValidating ? 'is-success-transition' : ''} ${isDraggingTerm ? 'is-dragging-active' : ''} ${topic === 'divisions' || topic === 'equations' ? 'topic-divisions' : ''}`} style={{ pointerEvents: (isValidating || isMatchingFading) ? 'none' : 'auto' }}>
                {topic === 'equations' ? (
                  <motion.div
                    className="equation-layout"
                    style={{
                      scale: expressionScale,
                      transformOrigin: 'center',
                      position: 'relative'
                    }}
                  >
                    {/* Left Side */}
                    <div className="equation-side left-side">
                      <div className="division-container">
                        {/* Numerator */}
                        <div
                          className="expression-list"
                          style={{
                            zIndex: activeFactorMenu?.type === 'num' ? 1001 : 1,
                            position: 'relative'
                          }}
                        >
                          <AnimatePresence mode="popLayout">
                            {numTerms.length === 0 && dragHintState?.side !== 'leftNum' ? (
                              <div className="term-card" style={{ cursor: 'default', padding: '0 12px' }}>1</div>
                            ) : (
                              <>
                                {splitIntoAdditiveGroups(numTerms).map((group, groupIdx) => {
                                  const showHintHere = dragHintState?.side === 'leftNum' && dragHintState.insertIndex === groupIdx;
                                  return (
                                    <React.Fragment key={`group-${group[0].id}`}>
                                      {showHintHere && (
                                        <motion.div
                                          key="hint-slot-num-left"
                                          layout
                                          initial={{ width: 0, opacity: 0, scale: 0.6 }}
                                          animate={{ width: 'auto', opacity: 1, scale: 1 }}
                                          exit={{ width: 0, opacity: 0, scale: 0.6 }}
                                          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                          className="term-group-wrapper"
                                          style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                                        >
                                          {(groupIdx > 0 || dragHintState.signHint === '-') && (
                                            <span className="operator-static" style={{ marginRight: '4px', fontWeight: 800, color: 'var(--accent-purple)' }}>
                                              {groupIdx > 0 && dragHintState.signHint === '+' ? '+' : dragHintState.signHint}
                                            </span>
                                          )}
                                          <div className="term-card drop-slot-placeholder" />
                                        </motion.div>
                                      )}
                                      {groupIdx > 0 && (
                                        <span
                                          className="operator-static"
                                          style={{
                                            margin: '0 4px',
                                            fontWeight: 800,
                                            visibility: (group[0].coeff < 0 && draggingCardId === group[0].id) ? 'hidden' : 'visible'
                                          }}
                                        >
                                          {group[0].coeff < 0 ? '-' : '+'}
                                        </span>
                                      )}
                                      <motion.div
                                        layout
                                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                        className="term-group-wrapper"
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          position: 'relative',
                                          width: group.some(t => t.id === draggingCardId) ? 0 : 'auto',
                                          overflow: 'visible'
                                        }}
                                      >
                                        {group.map((term, termIdx) => {
                                          const index = numTerms.findIndex(t => t.id === term.id);
                                          const oneChar = isOneChar(term);
                                          const isSliced = slicedNum.includes(term.id);
                                          const isCrossed = crossedOutNum.includes(term.id);
                                          return (
                                            <div
                                              key={term.id}
                                              className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                                              style={{
                                                zIndex: activeFactorMenu?.cardId === term.id ? 1002 : 1,
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'row',
                                                alignItems: 'center'
                                              }}
                                            >
                                              {termIdx === 0 && groupIdx === 0 && topic === 'equations' && term.coeff < 0 && (
                                                <span
                                                  className="operator-static"
                                                  style={{
                                                    marginRight: '4px',
                                                    fontWeight: 800,
                                                    visibility: draggingCardId === term.id ? 'hidden' : 'visible'
                                                  }}
                                                >
                                                  -
                                                </span>
                                              )}
                                              {termIdx > 0 && (
                                                <button
                                                  className={`dot-separator-btn ${shakeDotButtons ? 'shake-dot-active' : ''}`}
                                                  style={{
                                                    pointerEvents: 'auto',
                                                    visibility: (topic === 'equations' && term.coeff < 0 && draggingCardId === term.id) ? 'hidden' : 'visible'
                                                  }}
                                                  onMouseDown={e => e.stopPropagation()}
                                                  onTouchStart={e => e.stopPropagation()}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMultiplyAdjacent(index, 'num');
                                                  }}
                                                >
                                                  {topic === 'equations' && term.coeff < 0 ? '-' : '·'}
                                                </button>
                                              )}
                                              <motion.div
                                                className={`term-card ${term.coeff === 0 ? 'is-zero' : ''} ${oneChar ? 'one-char-card' : ''} ${isSliced ? 'is-sliced' : ''} ${isCrossed ? 'is-crossed-out' : ''} ${activeFactorMenu?.cardId === term.id ? 'is-decomposing' : ''}`}
                                                data-id={term.id}
                                                data-type="num"
                                                data-index={index}
                                                drag={term.coeff !== 0}
                                                dragSnapToOrigin={true}
                                                dragElastic={0.4}
                                                whileDrag={{ scale: 1.15, zIndex: 10000 }}
                                                onDragStart={(e, info) => handleDragStartInit(term, 'num', e, info)}
                                                onDrag={(e, info) => handleDragCross(term, 'num', e, info)}
                                                onDragEnd={(e, info) => {
                                                  setIsDraggingTerm(false);
                                                  setDraggingCardId(null);
                                                  handleDragEndCross(term, 'num', e, info);
                                                }}
                                                style={{ position: 'relative', pointerEvents: 'auto', touchAction: 'none' }}
                                                onTap={() => handleCardTap(term, 'num')}
                                              >
                                                {draggingCardId === term.id && term.coeff < 0 && (
                                                  <span className="drag-negative-prefix" style={{ marginRight: '2px', fontWeight: 800 }}>-</span>
                                                )}
                                                {renderTermValue(term)}
                                                {(isSliced || isCrossed) && (
                                                  <div
                                                    className="strike-line"
                                                    style={{
                                                      transform: `translateY(-50%) rotate(${isCrossed ? -12 : (cardAngles[term.id] ?? -12)}deg)`
                                                    }}
                                                  />
                                                )}
                                              </motion.div>
                                            </div>
                                          );
                                        })}
                                      </motion.div>
                                    </React.Fragment>
                                  );
                                })}
                                {dragHintState?.side === 'leftNum' && dragHintState.insertIndex >= splitIntoAdditiveGroups(numTerms).length && (
                                  <motion.div
                                    key="hint-slot-num-left-end"
                                    layout
                                    initial={{ width: 0, opacity: 0, scale: 0.6 }}
                                    animate={{ width: 'auto', opacity: 1, scale: 1 }}
                                    exit={{ width: 0, opacity: 0, scale: 0.6 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                    className="term-group-wrapper"
                                    style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                                  >
                                    {(splitIntoAdditiveGroups(numTerms).length > 0 || dragHintState.signHint === '-') && (
                                      <span className="operator-static" style={{ marginRight: '4px', fontWeight: 800, color: 'var(--accent-purple)' }}>
                                        {splitIntoAdditiveGroups(numTerms).length > 0 && dragHintState.signHint === '+' ? '+' : dragHintState.signHint}
                                      </span>
                                    )}
                                    <div className="term-card drop-slot-placeholder" />
                                  </motion.div>
                                )}
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Division Line */}
                        <div
                          className="division-line"
                          style={{
                            display: (denTerms.length === 0 || isDenOne(denTerms)) && dragHintState?.side !== 'leftDen' ? 'none' : 'block',
                            visibility: (isValidating && denTerms.every(t => crossedOutDen.includes(t.id))) ? 'hidden' : 'visible'
                          }}
                        />
                        {/* Denominator */}
                        {((denTerms.length > 0 && !isDenOne(denTerms)) || dragHintState?.side === 'leftDen') && (
                          <div
                            className="expression-list"
                            style={{
                              zIndex: activeFactorMenu?.type === 'den' ? 1001 : 1,
                              position: 'relative'
                            }}
                          >
                            <AnimatePresence mode="popLayout">
                              {denTerms.map((term, index) => {
                                const oneChar = isOneChar(term);
                                const isSliced = slicedDen.includes(term.id);
                                const isCrossed = crossedOutDen.includes(term.id);
                                return (
                                  <motion.div
                                    key={term.id}
                                    layout
                                    className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                                    style={{
                                      pointerEvents: 'none',
                                      zIndex: activeFactorMenu?.cardId === term.id ? 1002 : 1,
                                      position: 'relative'
                                    }}
                                  >
                                    {index > 0 && (
                                      <button
                                        className={`dot-separator-btn ${shakeDotButtons ? 'shake-dot-active' : ''}`}
                                        style={{ pointerEvents: 'auto' }}
                                        onMouseDown={e => e.stopPropagation()}
                                        onTouchStart={e => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMultiplyAdjacent(index, 'den');
                                        }}
                                      >
                                        ·
                                      </button>
                                    )}
                                    <motion.div
                                      className={`term-card ${term.coeff === 0 ? 'is-zero' : ''} ${oneChar ? 'one-char-card' : ''} ${isSliced ? 'is-sliced' : ''} ${isCrossed ? 'is-crossed-out' : ''} ${activeFactorMenu?.cardId === term.id ? 'is-decomposing' : ''}`}
                                      data-id={term.id}
                                      data-type="den"
                                      data-index={index}
                                      drag
                                      dragSnapToOrigin={true}
                                      dragElastic={0.4}
                                      whileDrag={{ scale: 1.15, zIndex: 10000 }}
                                      onDragStart={() => { setActiveFactorMenu(null); setIsDraggingTerm(true); }}
                                      onDrag={(e, info) => handleDragCross(term, 'den', e, info)}
                                      onDragEnd={(e, info) => {
                                        setIsDraggingTerm(false);
                                        handleDragEndCross(term, 'den', e, info);
                                      }}
                                      style={{ position: 'relative', pointerEvents: 'auto', touchAction: 'none' }}
                                      onTap={() => handleCardTap(term, 'den')}
                                    >
                                      {renderTermValue(term)}
                                      {(isSliced || isCrossed) && (
                                        <div
                                          className="strike-line"
                                          style={{
                                            transform: `translateY(-50%) rotate(${isCrossed ? -12 : (cardAngles[term.id] ?? -12)}deg)`
                                          }}
                                        />
                                      )}
                                    </motion.div>
                                  </motion.div>
                                );
                              })}
                              {dragHintState?.side === 'leftDen' && (
                                <div key="hint-slot-left" className="term-item-wrapper" style={{ pointerEvents: 'none' }}>
                                  {denTerms.length > 0 && !isDenOne(denTerms) && (
                                    <button className="dot-separator-btn" style={{ pointerEvents: 'none', opacity: 0.4 }}>·</button>
                                  )}
                                  <div className="term-card drop-slot-placeholder" />
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Equals Sign */}
                    <div className="equals-sign">=</div>
                    {/* Right Side */}
                    <div className="equation-side right-side">
                      <div className="division-container">
                        {/* Numerator */}
                        <div
                          className="expression-list"
                          style={{
                            zIndex: activeFactorMenu?.type === 'rightNum' ? 1001 : 1,
                            position: 'relative'
                          }}
                        >
                          <AnimatePresence mode="popLayout">
                            {rightNumTerms.length === 0 && dragHintState?.side !== 'rightNum' ? (
                              <div className="term-card" style={{ cursor: 'default', padding: '0 12px' }}>1</div>
                            ) : (
                              <>
                                {splitIntoAdditiveGroups(rightNumTerms).map((group, groupIdx) => {
                                  const showHintHere = dragHintState?.side === 'rightNum' && dragHintState.insertIndex === groupIdx;
                                  return (
                                    <React.Fragment key={`group-${group[0].id}`}>
                                      {showHintHere && (
                                        <motion.div
                                          key="hint-slot-num-right"
                                          layout
                                          initial={{ width: 0, opacity: 0, scale: 0.6 }}
                                          animate={{ width: 'auto', opacity: 1, scale: 1 }}
                                          exit={{ width: 0, opacity: 0, scale: 0.6 }}
                                          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                          className="term-group-wrapper"
                                          style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                                        >
                                          {(groupIdx > 0 || dragHintState.signHint === '-') && (
                                            <span className="operator-static" style={{ marginRight: '4px', fontWeight: 800, color: 'var(--accent-purple)' }}>
                                              {groupIdx > 0 && dragHintState.signHint === '+' ? '+' : dragHintState.signHint}
                                            </span>
                                          )}
                                          <div className="term-card drop-slot-placeholder" />
                                        </motion.div>
                                      )}
                                      {groupIdx > 0 && (
                                        <span
                                          className="operator-static"
                                          style={{
                                            margin: '0 4px',
                                            fontWeight: 800,
                                            visibility: (group[0].coeff < 0 && draggingCardId === group[0].id) ? 'hidden' : 'visible'
                                          }}
                                        >
                                          {group[0].coeff < 0 ? '-' : '+'}
                                        </span>
                                      )}
                                      <motion.div
                                        layout
                                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                        className="term-group-wrapper"
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          position: 'relative',
                                          width: group.some(t => t.id === draggingCardId) ? 0 : 'auto',
                                          overflow: 'visible'
                                        }}
                                      >
                                        {group.map((term, termIdx) => {
                                          const index = rightNumTerms.findIndex(t => t.id === term.id);
                                          const oneChar = isOneChar(term);
                                          const isSliced = slicedRightNum.includes(term.id);
                                          const isCrossed = crossedOutRightNum.includes(term.id);
                                          return (
                                            <div
                                              key={term.id}
                                              className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                                              style={{
                                                zIndex: activeFactorMenu?.cardId === term.id ? 1002 : 1,
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'row',
                                                alignItems: 'center'
                                              }}
                                            >
                                              {termIdx === 0 && groupIdx === 0 && topic === 'equations' && term.coeff < 0 && (
                                                <span
                                                  className="operator-static"
                                                  style={{
                                                    marginRight: '4px',
                                                    fontWeight: 800,
                                                    visibility: draggingCardId === term.id ? 'hidden' : 'visible'
                                                  }}
                                                >
                                                  -
                                                </span>
                                              )}
                                              {termIdx > 0 && (
                                                <button
                                                  className={`dot-separator-btn ${shakeDotButtons ? 'shake-dot-active' : ''}`}
                                                  style={{
                                                    pointerEvents: 'auto',
                                                    visibility: (topic === 'equations' && term.coeff < 0 && draggingCardId === term.id) ? 'hidden' : 'visible'
                                                  }}
                                                  onMouseDown={e => e.stopPropagation()}
                                                  onTouchStart={e => e.stopPropagation()}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMultiplyAdjacent(index, 'rightNum');
                                                  }}
                                                >
                                                  {topic === 'equations' && term.coeff < 0 ? '-' : '·'}
                                                </button>
                                              )}
                                              <motion.div
                                                className={`term-card ${term.coeff === 0 ? 'is-zero' : ''} ${oneChar ? 'one-char-card' : ''} ${isSliced ? 'is-sliced' : ''} ${isCrossed ? 'is-crossed-out' : ''} ${activeFactorMenu?.cardId === term.id ? 'is-decomposing' : ''}`}
                                                data-id={term.id}
                                                data-type="rightNum"
                                                data-index={index}
                                                drag={term.coeff !== 0}
                                                dragSnapToOrigin={true}
                                                dragElastic={0.4}
                                                whileDrag={{ scale: 1.15, zIndex: 10000 }}
                                                onDragStart={(e, info) => handleDragStartInit(term, 'rightNum', e, info)}
                                                onDrag={(e, info) => handleDragCross(term, 'rightNum', e, info)}
                                                onDragEnd={(e, info) => {
                                                  setIsDraggingTerm(false);
                                                  setDraggingCardId(null);
                                                  handleDragEndCross(term, 'rightNum', e, info);
                                                }}
                                                style={{ position: 'relative', pointerEvents: 'auto', touchAction: 'none' }}
                                                onTap={() => handleCardTap(term, 'rightNum')}
                                              >
                                                {draggingCardId === term.id && term.coeff < 0 && (
                                                  <span className="drag-negative-prefix" style={{ marginRight: '2px', fontWeight: 800 }}>-</span>
                                                )}
                                                {renderTermValue(term)}
                                                {(isSliced || isCrossed) && (
                                                  <div
                                                    className="strike-line"
                                                    style={{
                                                      transform: `translateY(-50%) rotate(${isCrossed ? -12 : (cardAngles[term.id] ?? -12)}deg)`
                                                    }}
                                                  />
                                                )}
                                              </motion.div>
                                            </div>
                                          );
                                        })}
                                      </motion.div>
                                    </React.Fragment>
                                  );
                                })}
                                {dragHintState?.side === 'rightNum' && dragHintState.insertIndex >= splitIntoAdditiveGroups(rightNumTerms).length && (
                                  <motion.div
                                    key="hint-slot-num-right-end"
                                    layout
                                    initial={{ width: 0, opacity: 0, scale: 0.6 }}
                                    animate={{ width: 'auto', opacity: 1, scale: 1 }}
                                    exit={{ width: 0, opacity: 0, scale: 0.6 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                    className="term-group-wrapper"
                                    style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                                  >
                                    {(splitIntoAdditiveGroups(rightNumTerms).length > 0 || dragHintState.signHint === '-') && (
                                      <span className="operator-static" style={{ marginRight: '4px', fontWeight: 800, color: 'var(--accent-purple)' }}>
                                        {splitIntoAdditiveGroups(rightNumTerms).length > 0 && dragHintState.signHint === '+' ? '+' : dragHintState.signHint}
                                      </span>
                                    )}
                                    <div className="term-card drop-slot-placeholder" />
                                  </motion.div>
                                )}
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Division Line */}
                        <div
                          className="division-line"
                          style={{
                            display: (rightDenTerms.length === 0 || isDenOne(rightDenTerms)) && dragHintState?.side !== 'rightDen' ? 'none' : 'block',
                            visibility: (isValidating && rightDenTerms.every(t => crossedOutRightDen.includes(t.id))) ? 'hidden' : 'visible'
                          }}
                        />
                        {/* Denominator */}
                        {((rightDenTerms.length > 0 && !isDenOne(rightDenTerms)) || dragHintState?.side === 'rightDen') && (
                          <div
                            className="expression-list"
                            style={{
                              zIndex: activeFactorMenu?.type === 'rightDen' ? 1001 : 1,
                              position: 'relative'
                            }}
                          >
                            <AnimatePresence mode="popLayout">
                              {rightDenTerms.map((term, index) => {
                                const oneChar = isOneChar(term);
                                const isSliced = slicedRightDen.includes(term.id);
                                const isCrossed = crossedOutRightDen.includes(term.id);
                                return (
                                  <motion.div
                                    key={term.id}
                                    layout
                                    className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                                    style={{
                                      pointerEvents: 'none',
                                      zIndex: activeFactorMenu?.cardId === term.id ? 1002 : 1,
                                      position: 'relative'
                                    }}
                                  >
                                    {index > 0 && (
                                      <button
                                        className={`dot-separator-btn ${shakeDotButtons ? 'shake-dot-active' : ''}`}
                                        style={{ pointerEvents: 'auto' }}
                                        onMouseDown={e => e.stopPropagation()}
                                        onTouchStart={e => e.stopPropagation()}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMultiplyAdjacent(index, 'rightDen');
                                        }}
                                      >
                                        ·
                                      </button>
                                    )}
                                    <motion.div
                                      className={`term-card ${term.coeff === 0 ? 'is-zero' : ''} ${oneChar ? 'one-char-card' : ''} ${isSliced ? 'is-sliced' : ''} ${isCrossed ? 'is-crossed-out' : ''} ${activeFactorMenu?.cardId === term.id ? 'is-decomposing' : ''}`}
                                      data-id={term.id}
                                      data-type="rightDen"
                                      data-index={index}
                                      drag
                                      dragSnapToOrigin={true}
                                      dragElastic={0.4}
                                      whileDrag={{ scale: 1.15, zIndex: 10000 }}
                                      onDragStart={() => { setActiveFactorMenu(null); setIsDraggingTerm(true); }}
                                      onDrag={(e, info) => handleDragCross(term, 'rightDen', e, info)}
                                      onDragEnd={(e, info) => {
                                        setIsDraggingTerm(false);
                                        handleDragEndCross(term, 'rightDen', e, info);
                                      }}
                                      style={{ position: 'relative', pointerEvents: 'auto', touchAction: 'none' }}
                                      onTap={() => handleCardTap(term, 'rightDen')}
                                    >
                                      {renderTermValue(term)}
                                      {(isSliced || isCrossed) && (
                                        <div
                                          className="strike-line"
                                          style={{
                                            transform: `translateY(-50%) rotate(${isCrossed ? -12 : (cardAngles[term.id] ?? -12)}deg)`
                                          }}
                                        />
                                      )}
                                    </motion.div>
                                  </motion.div>
                                );
                              })}
                              {dragHintState?.side === 'rightDen' && (
                                <div key="hint-slot-right" className="term-item-wrapper" style={{ pointerEvents: 'none' }}>
                                  {rightDenTerms.length > 0 && !isDenOne(rightDenTerms) && (
                                    <button className="dot-separator-btn" style={{ pointerEvents: 'none', opacity: 0.4 }}>·</button>
                                  )}
                                  <div className="term-card drop-slot-placeholder" />
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : topic === 'divisions' ? (
                  numTerms.length === 0 && denTerms.length === 0 ? (
                    <div className="term-card" style={{ cursor: 'default', fontSize: '1.2rem', padding: '0 16px' }}>1</div>
                  ) : (denTerms.length === 0) ? (
                    <Reorder.Group
                      axis="x"
                      values={numTerms}
                      onReorder={setNumTerms}
                      className="expression-list"
                      style={{
                        scale: expressionScale,
                        transformOrigin: 'center',
                        zIndex: activeFactorMenu?.type === 'num' ? 1001 : 1,
                        position: 'relative'
                      }}
                    >
                      <AnimatePresence mode="popLayout">
                        {numTerms.map((term, index) => {
                          const oneChar = isOneChar(term);
                          const isSliced = slicedNum.includes(term.id);
                          const isCrossed = crossedOutNum.includes(term.id);
                          return (
                            <Reorder.Item
                              key={term.id}
                              value={term}
                              className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                              whileDrag={{ scale: 1.06 }}
                              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                              onDragStart={() => { setActiveFactorMenu(null); setIsDraggingTerm(true); }}
                              onDragEnd={() => setIsDraggingTerm(false)}
                              style={{
                                zIndex: activeFactorMenu?.cardId === term.id ? 1002 : 1,
                                position: 'relative'
                              }}
                            >
                              {index > 0 && (
                                <button
                                  className={`dot-separator-btn ${shakeDotButtons ? 'shake-dot-active' : ''}`}
                                  style={{ pointerEvents: 'auto' }}
                                  onMouseDown={e => e.stopPropagation()}
                                  onTouchStart={e => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMultiplyAdjacent(index, 'num');
                                  }}
                                >
                                  ·
                                </button>
                              )}
                              <motion.div
                                className={`term-card ${oneChar ? 'one-char-card' : ''} ${isSliced ? 'is-sliced' : ''} ${isCrossed ? 'is-crossed-out' : ''} ${activeFactorMenu?.cardId === term.id ? 'is-decomposing' : ''}`}
                                data-id={term.id}
                                data-type="num"
                                data-index={index}
                                style={{ position: 'relative' }}
                                onTap={() => handleCardTap(term, 'num')}
                              >
                                {renderTermValue(term)}
                                {(isSliced || isCrossed) && (
                                  <div
                                    className="strike-line"
                                    style={{
                                      transform: `translateY(-50%) rotate(${isCrossed ? -12 : (cardAngles[term.id] ?? -12)}deg)`
                                    }}
                                  />
                                )}

                              </motion.div>
                            </Reorder.Item>
                          );
                        })}
                      </AnimatePresence>
                    </Reorder.Group>
                  ) : (
                    <div className="division-container">
                      {/* Numerator */}
                      <Reorder.Group
                        axis="x"
                        values={numTerms}
                        onReorder={setNumTerms}
                        className="expression-list"
                        style={{
                          scale: expressionScale,
                          transformOrigin: 'center'
                        }}
                      >
                        <AnimatePresence mode="popLayout">
                          {numTerms.length === 0 ? (
                            <div className="term-card" style={{ cursor: 'default', padding: '0 16px' }}>1</div>
                          ) : (
                            numTerms.map((term, index) => {
                              const oneChar = isOneChar(term);
                              const isSliced = slicedNum.includes(term.id);
                              const isCrossed = crossedOutNum.includes(term.id);
                              return (
                                <Reorder.Item
                                  key={term.id}
                                  value={term}
                                  className="term-item-wrapper"
                                  whileDrag={{ scale: 1.06 }}
                                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                                  onDragStart={() => { setActiveFactorMenu(null); setIsDraggingTerm(true); }}
                                  onDragEnd={() => setIsDraggingTerm(false)}
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {index > 0 && (
                                    <button
                                      className={`dot-separator-btn ${shakeDotButtons ? 'shake-dot-active' : ''}`}
                                      onMouseDown={e => e.stopPropagation()}
                                      onTouchStart={e => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMultiplyAdjacent(index, 'num');
                                      }}
                                    >
                                      ·
                                    </button>
                                  )}
                                  <motion.div
                                    className={`term-card ${oneChar ? 'one-char-card' : ''} ${isSliced ? 'is-sliced' : ''} ${isCrossed ? 'is-crossed-out' : ''} ${activeFactorMenu?.cardId === term.id ? 'is-decomposing' : ''}`}
                                    data-id={term.id}
                                    data-type="num"
                                    data-index={index}
                                    style={{ position: 'relative', pointerEvents: 'auto' }}
                                    onTap={() => handleCardTap(term, 'num')}
                                  >
                                    {renderTermValue(term)}
                                    {(isSliced || isCrossed) && (
                                      <div
                                        className="strike-line"
                                        style={{
                                          transform: `translateY(-50%) rotate(${isCrossed ? -12 : (cardAngles[term.id] ?? -12)}deg)`
                                        }}
                                      />
                                    )}

                                  </motion.div>
                                </Reorder.Item>
                              );
                            })
                          )}
                        </AnimatePresence>
                      </Reorder.Group>

                      {/* Division Line */}
                      <div
                        className="division-line"
                        style={{
                          display: (denTerms.length === 0 || isDenOne(denTerms)) ? 'none' : 'block',
                          visibility: (isValidating && denTerms.every(t => crossedOutDen.includes(t.id))) ? 'hidden' : 'visible'
                        }}
                      />

                      {/* Denominator */}
                      {denTerms.length > 0 && !isDenOne(denTerms) && (
                      <Reorder.Group
                        axis="x"
                        values={denTerms}
                        onReorder={setDenTerms}
                        className="expression-list"
                        style={{
                          scale: expressionScale,
                          transformOrigin: 'center',
                          zIndex: activeFactorMenu?.type === 'den' ? 1001 : 1,
                          position: 'relative'
                        }}
                      >
                        <AnimatePresence mode="popLayout">
                          {denTerms.map((term, index) => {
                            const oneChar = isOneChar(term);
                            const isSliced = slicedDen.includes(term.id);
                            const isCrossed = crossedOutDen.includes(term.id);
                            return (
                              <Reorder.Item
                                key={term.id}
                                value={term}
                                className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                                whileDrag={{ scale: 1.06 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                                onDragStart={() => { setActiveFactorMenu(null); setIsDraggingTerm(true); }}
                                onDragEnd={() => setIsDraggingTerm(false)}
                                style={{
                                  pointerEvents: 'none',
                                  zIndex: activeFactorMenu?.cardId === term.id ? 1002 : 1,
                                  position: 'relative'
                                }}
                              >
                                {index > 0 && (
                                  <button
                                    className={`dot-separator-btn ${shakeDotButtons ? 'shake-dot-active' : ''}`}
                                    style={{ pointerEvents: 'auto' }}
                                    onMouseDown={e => e.stopPropagation()}
                                    onTouchStart={e => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMultiplyAdjacent(index, 'den');
                                    }}
                                  >
                                    ·
                                  </button>
                                )}
                                <motion.div
                                  className={`term-card ${oneChar ? 'one-char-card' : ''} ${isSliced ? 'is-sliced' : ''} ${isCrossed ? 'is-crossed-out' : ''} ${activeFactorMenu?.cardId === term.id ? 'is-decomposing' : ''}`}
                                  data-id={term.id}
                                  data-type="den"
                                  data-index={index}
                                  style={{ position: 'relative', pointerEvents: 'auto' }}
                                  onTap={() => handleCardTap(term, 'den')}
                                >
                                  {renderTermValue(term)}
                                  {(isSliced || isCrossed) && (
                                    <div
                                      className="strike-line"
                                      style={{
                                        transform: `translateY(-50%) rotate(${isCrossed ? -12 : (cardAngles[term.id] ?? -12)}deg)`
                                      }}
                                    />
                                  )}

                                </motion.div>
                              </Reorder.Item>
                            );
                          })}
                        </AnimatePresence>
                      </Reorder.Group>
                      )}
                    </div>
                  )
                ) : (
                  <Reorder.Group
                    axis="x"
                    values={terms}
                    onReorder={setTerms}
                    className="expression-list"
                    style={{
                      scale: expressionScale,
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
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                            onDragStart={() => { setActiveFactorMenu(null); setIsDraggingTerm(true); }}
                            onDragEnd={() => setIsDraggingTerm(false)}
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
                )}
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

      {/* Factor menu portal – renders outside all overflow:hidden containers */}
      {activeFactorMenu && popoverPos && (() => {
        const allTerms = activeFactorMenu.type === 'den' ? denTerms
                       : activeFactorMenu.type === 'num' ? numTerms
                       : activeFactorMenu.type === 'rightDen' ? rightDenTerms
                       : rightNumTerms;
        const activeTerm = allTerms.find(t => t.id === activeFactorMenu.cardId);
        if (!activeTerm) return null;
        const options = getTermDecompositionOptions(activeTerm);

        if (options.length === 0) return null;

        const formatLabel = (t) => {
          if (!t.variable) return `${t.coeff}`;
          const absC = Math.abs(t.coeff);
          return absC === 1 ? `${t.variable}` : `${absC}${t.variable}`;
        };

        return createPortal(
          <div
            className="factor-menu-portal"
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: popoverPos.top - 8,
              left: popoverPos.left,
              transform: 'translate(-50%, -100%)',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(15,23,42,0.12)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              animation: 'popoverFadeIn 0.15s ease-out',
              width: 'max-content',
              touchAction: 'auto',
            }}
          >
            {options.map(({ splitA, splitB }, i) => {
              return (
                <button
                  key={i}
                  className="factor-option-btn"
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDecompose(activeTerm, splitA, splitB, activeFactorMenu.type);
                  }}
                >
                  {formatLabel(splitA)} · {formatLabel(splitB)}
                </button>
              );
            })}
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
