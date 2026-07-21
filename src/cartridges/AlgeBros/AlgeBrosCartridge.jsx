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
  multiplyTerms
} from './game/AlgeBrosEngine';
import { generateLevels, generateDivisionLevels } from './game/AlgeBrosLevelGenerator';
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
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
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

        {topic === 'divisions' ? (
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

  const [topic, setTopic] = useState('divisions'); // Default is 'divisions'
  const [numTerms, setNumTerms] = useState([]);
  const [denTerms, setDenTerms] = useState([]);
  const [slicedNum, setSlicedNum] = useState([]); // Sliced numerator term IDs
  const [slicedDen, setSlicedDen] = useState([]); // Sliced denominator term IDs
  const [crossedOutNum, setCrossedOutNum] = useState([]);
  const [crossedOutDen, setCrossedOutDen] = useState([]);
  const [cardAngles, setCardAngles] = useState({}); // Stores line rotation angle per card ID
  const [activeFactorMenu, setActiveFactorMenu] = useState(null); // { cardId, type } or null
  const [popoverPos, setPopoverPos] = useState(null); // { top, left, cardWidth }
  const [shakeDotButtons, setShakeDotButtons] = useState(false);
  const activeCardRef = useRef(null);

  const numTermsRef = React.useRef(numTerms);
  const denTermsRef = React.useRef(denTerms);
  const slicedNumRef = React.useRef(slicedNum);
  const slicedDenRef = React.useRef(slicedDen);

  React.useEffect(() => {
    numTermsRef.current = numTerms;
    denTermsRef.current = denTerms;
    slicedNumRef.current = slicedNum;
    slicedDenRef.current = slicedDen;
  }, [numTerms, denTerms, slicedNum, slicedDen]);

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
    } else {
      setTerms(levelObj.initialTerms || []);
    }
    setMinPresses(levelObj.minPresses);
    setUserPresses(0);
    setMistakes(0);
    setIsLevelPerfect(true);
    setFeedback({
      text: topic === 'divisions' ? 'Cross out matching terms!' : 'Reorder and combine like terms!',
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
    playMerge();
    if (type === 'num') {
      setNumTerms(prev => {
        const next = [...prev];
        const termA = next[index - 1];
        const termB = next[index];
        const product = multiplyTerms(termA, termB);
        next.splice(index - 1, 2, product);
        return next;
      });
    } else {
      setDenTerms(prev => {
        const next = [...prev];
        const termA = next[index - 1];
        const termB = next[index];
        const product = multiplyTerms(termA, termB);
        next.splice(index - 1, 2, product);
        return next;
      });
    }
  };

  const handleCardTap = (term, type) => {
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
        if (type === 'num') {
          setNumTerms(prev => {
            const idx = prev.findIndex(t => t.id === term.id);
            if (idx === -1) return prev;
            const next = [...prev];
            next.splice(idx, 1, ...splitTerms);
            return next;
          });
        } else {
          setDenTerms(prev => {
            const idx = prev.findIndex(t => t.id === term.id);
            if (idx === -1) return prev;
            const next = [...prev];
            next.splice(idx, 1, ...splitTerms);
            return next;
          });
        }
        return;
      }
    }

    if (Math.abs(term.coeff) > 1 && term.variable) {
      setActiveFactorMenu(null);
      playMerge();
      const splitA = makeTerm(term.coeff, null);
      const splitB = makeTerm(1, term.variable);
      if (type === 'num') {
        setNumTerms(prev => {
          const idx = prev.findIndex(t => t.id === term.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next.splice(idx, 1, splitA, splitB);
          return next;
        });
      } else {
        setDenTerms(prev => {
          const idx = prev.findIndex(t => t.id === term.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next.splice(idx, 1, splitA, splitB);
          return next;
        });
      }
    } else if (!term.variable) {
      const factors = getPrimeFactors(term.coeff);
      if (factors.length > 0) {
        if (activeFactorMenu?.cardId === term.id) {
          setActiveFactorMenu(null);
        } else {
          setActiveFactorMenu({ cardId: term.id, type });
        }
      }
    }
  };

  const handleDecompose = (term, factor, type) => {
    setActiveFactorMenu(null);
    playMerge();
    const splitA = makeTerm(factor * Math.sign(term.coeff), null);
    const splitB = makeTerm(Math.abs(term.coeff / factor), null);
    if (type === 'num') {
      setNumTerms(prev => {
        const idx = prev.findIndex(t => t.id === term.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1, splitA, splitB);
        return next;
      });
    } else {
      setDenTerms(prev => {
        const idx = prev.findIndex(t => t.id === term.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1, splitA, splitB);
        return next;
      });
    }
  };

  const handleStart = () => {
    const generated = topic === 'divisions' ? generateDivisionLevels() : generateLevels();
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

  const compareAndCrossOutSlice = useCallback((numId, numIdx, denId, denIdx) => {
    const termA = numTerms.find(t => t.id === numId);
    const termB = denTerms.find(t => t.id === denId);

    if (!termA || !termB) return;

    if (areEqualTerms(termA, termB)) {
      playPopFX();
      triggerFlash('success');
      setIsMatchingFading(true);
      
      setCrossedOutNum(prev => [...prev, numId]);
      setCrossedOutDen(prev => [...prev, denId]);
      
      setUserPresses(p => p + 1);
      
      setSlicedNum(prev => prev.filter(x => x !== numId));
      setSlicedDen(prev => prev.filter(x => x !== denId));
      
      setTimeout(() => {
        setNumTerms(prev => prev.filter(t => t.id !== numId));
        setDenTerms(prev => prev.filter(t => t.id !== denId));
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
      setIsMatchingFading(true);
      
      setTimeout(() => {
        setSlicedNum(prev => prev.filter(x => x !== numId));
        setSlicedDen(prev => prev.filter(x => x !== denId));
        setCardAngles(prev => {
          const next = { ...prev };
          delete next[numId];
          delete next[denId];
          return next;
        });
        setIsMatchingFading(false);
      }, 400);
    }
  }, [numTerms, denTerms, isLevelPerfect, playWrong, playMerge, triggerFlash, triggerShake]);

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
      if (isValidating || isMatchingFading || topic !== 'divisions') return;
      
      // If starting on a card, do not slice (allows horizontal dragging/reordering)
      if (
        e.target.closest('.term-card') || 
        e.target.closest('.dot-separator-btn') || 
        e.target.closest('.factor-menu-popover') ||
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
                  tempSlicedNum.current = id;
                }
              } else {
                if (!crossedOutDen.includes(id)) {
                  tempSlicedDen.current = id;
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
      
      const numId = tempSlicedNum.current;
      const denId = tempSlicedDen.current;
      
      // Reset slices if the slice begins and ends outside of a card, without crossing any card
      const endsOutside = !e || !e.target || !e.target.closest('.term-card');
      const crossedAny = numId || denId;
      
      if (endsOutside && !crossedAny) {
        setSlicedNum([]);
        setSlicedDen([]);
        setCrossedOutNum([]);
        setCrossedOutDen([]);
        setCardAngles({});
        return;
      }
      
      if (numId || denId) {
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
        if (numId) anglesObj[numId] = angle;
        if (denId) anglesObj[denId] = angle;
        setCardAngles(prev => ({ ...prev, ...anglesObj }));
        
        let nextSlicedNum = slicedNumRef.current;
        let nextSlicedDen = slicedDenRef.current;
        
        if (numId) {
          nextSlicedNum = [numId];
          setSlicedNum([numId]);
        }
        if (denId) {
          nextSlicedDen = [denId];
          setSlicedDen([denId]);
        }
        
        // Evaluate matching if both numerator and denominator cards are active
        const activeNumId = nextSlicedNum[0];
        const activeDenId = nextSlicedDen[0];
        if (activeNumId && activeDenId) {
          const numIdx = numTermsRef.current.findIndex(t => t.id === activeNumId);
          const denIdx = denTermsRef.current.findIndex(t => t.id === activeDenId);
          compareAndCrossOutSlice(activeNumId, numIdx, activeDenId, denIdx);
        }
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
  }, [numTerms, denTerms, crossedOutNum, crossedOutDen, compareAndCrossOutSlice, topic, isValidating, isMatchingFading]);


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
    
    // Check if there are multiple terms in the numerator or denominator
    // (meaning they are separated by dot separator buttons and not fully simplified/compacted)
    const hasDotSeparators = topic === 'divisions' && (numTerms.length > 1 || denTerms.length > 1);
    
    const isSimplified = topic === 'divisions'
      ? (isDivisionSimplified(numTerms, denTerms) && !hasDotSeparators)
      : isFullySimplified(terms);
    
    if (isSimplified) {
      const elegant = topic === 'divisions'
        ? (checkElegance(numTerms) && checkElegance(denTerms))
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
        showFeedback(topic === 'divisions' ? 'Doh! There are still matching terms you can cross out!' : 'Unlike terms cannot be combined!', 'error');
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
    return 14 + chars * 8.5;
  }, []);

  const expressionScale = useMemo(() => {
    const calculateScaleForList = (list) => {
      if (!list || list.length === 0) return 1.6;
      const totalBaseWidth = list.reduce((acc, term, idx) => {
        const cardW = getTermWidth(term);
        const opW = idx > 0 ? 32 : 0;
        const staticSignW = (idx === 0 && term.coeff < 0) ? 12 : 0;
        return acc + cardW + opW + staticSignW;
      }, 0);
      const targetWidth = 260;
      const calculatedScale = totalBaseWidth > 0 ? targetWidth / totalBaseWidth : 1;
      return Math.max(0.4, Math.min(2.0, calculatedScale));
    };

    if (topic === 'divisions') {
      const scaleNum = calculateScaleForList(numTerms);
      const scaleDen = calculateScaleForList(denTerms);
      return Math.min(scaleNum, scaleDen);
    } else {
      return calculateScaleForList(terms);
    }
  }, [topic, terms, numTerms, denTerms, getTermWidth]);

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
                  {topic === 'divisions' ? 'STEPS' : 'PRESSES'}: <span className="font-mono">{userPresses}</span> <span style={{ opacity: 0.5 }}>/ {minPresses}</span>
                </div>
              </div>

              {/* Expression Dragging Area */}
              <div className={`expression-wrapper ${shake ? 'shake-container' : ''} ${isValidating ? 'is-success-transition' : ''} ${isDraggingTerm ? 'is-dragging-active' : ''} ${topic === 'divisions' ? 'topic-divisions' : ''}`} style={{ pointerEvents: (isValidating || isMatchingFading) ? 'none' : 'auto' }}>
                {topic === 'divisions' ? (
                  numTerms.length === 0 && denTerms.length === 0 ? (
                    <div className="term-card" style={{ cursor: 'default', fontSize: '1.2rem', padding: '0 16px' }}>1</div>
                  ) : (denTerms.length === 0) ? (
                    <Reorder.Group
                      axis="x"
                      values={numTerms}
                      onReorder={setNumTerms}
                      className="expression-list"
                      style={{
                        transform: `scale(${expressionScale})`,
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
                              onDragStart={() => setIsDraggingTerm(true)}
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
                          transform: `scale(${expressionScale})`,
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
                                  onDragStart={() => setIsDraggingTerm(true)}
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
                          visibility: (isValidating && denTerms.every(t => crossedOutDen.includes(t.id))) ? 'hidden' : 'visible'
                        }}
                      />

                      {/* Denominator */}
                      <Reorder.Group
                        axis="x"
                        values={denTerms}
                        onReorder={setDenTerms}
                        className="expression-list"
                        style={{
                          transform: `scale(${expressionScale})`,
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
                                onDragStart={() => setIsDraggingTerm(true)}
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
                    </div>
                  )
                ) : (
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
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                            onDragStart={() => setIsDraggingTerm(true)}
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
        const allTerms = activeFactorMenu.type === 'den' ? denTerms : numTerms;
        const activeTerm = allTerms.find(t => t.id === activeFactorMenu.cardId);
        if (!activeTerm) return null;
        const factors = getPrimeFactors(activeTerm.coeff);
        if (factors.length === 0) return null;

        // Filter out equivalent options, keeping only the one starting with the lower prime number on the left.
        // E.g., for 15, we show 3 · 5 and skip 5 · 3.
        const seenSignatures = new Set();
        const uniqueOptions = [];
        for (const factor of factors) {
          const other = Math.abs(activeTerm.coeff / factor);
          const sig = [Math.min(factor, other), Math.max(factor, other)].join(',');
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            uniqueOptions.push({ factor, other });
          }
        }

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
            {uniqueOptions.map(({ factor, other }) => {
              return (
                <button
                  key={factor}
                  className="factor-option-btn"
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDecompose(activeTerm, factor, activeFactorMenu.type);
                  }}
                >
                  {factor} · {other}
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
