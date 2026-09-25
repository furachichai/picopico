import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder, MotionConfig, correctParentTransform } from 'framer-motion';
import {
  formatTerm,
  areLikeTerms,
  combineTerms,
  isFullySimplified,
  calculateMinPresses,
  areEqualTerms,
  countMatchingPairs,
  isDivisionSimplified,
  makeTerm,
  getPrimeFactors,
  getTermDecompositionOptions,
  multiplyTerms,
  isEquationSolved,
  isEquivalentTransformation,
  canMoveToDenominator,
  findDistributiveCancel,
  splitIntoAdditiveGroups,
  parseCustomEquationLevels,
  parseCustomDivisionLevels,
  parseCustomLikeTermsLevels,
  parseVariablePart,
  serializeVariablePart
} from './game/AlgeBrosEngine';
import { resolveAssetUrl } from '../../utils/assetUrl';
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

function GameOverScreen({ stats, onRestart, totalLevels = 10 }) {
  const isPerfectGame = stats.perfectLevels === totalLevels;
  
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
          <span className="stat-value success">{totalLevels} / {totalLevels}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Perfect Levels (No Mistakes & Ideal Moves)</span>
          <span className={`stat-value ${stats.perfectLevels > Math.floor(totalLevels / 2) ? 'perfect' : ''}`}>
            {stats.perfectLevels} / {totalLevels}
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

/* Geometry of one expression row, straight from AlgeBrosCartridge.css. Used to keep the
 * expression inside the banner, which clips anything that leaves it. */
const ROW_H = 44;                 // .equation-layout .term-card height (what is actually painted)
const ROW_BOX_H = 54;             // .expression-list min-height (the row's layout box)
const DEN_BLOCK_H = 93;           // .division-container gap + .division-line (+margins) + gap + row
const MIRROR_OVERHANG_H = 65;     // a mirrored denominator hanging under its term
const BANNER_PADDING_H = 32;      // .algebros-equation-banner padding, top + bottom
const BANNER_MIN_H = 135;         // .algebros-equation-banner min-height
const BANNER_MIN_H_FRACTION = 185;// .algebros-equation-banner.reserves-fraction min-height
const BANNER_POP_SLACK = 8;       // cards pop to 1.15 while a cancelled pair fades out

const checkElegance = (termsList) => {
  for (let i = 0; i < termsList.length - 1; i++) {
    if (compareElegant(termsList[i], termsList[i + 1]) > 0) {
      return false;
    }
  }
  return true;
};

/**
 * A Reorder.Group that is itself CSS-scaled (see expressionScale).
 *
 * framer-motion's drag works in two coordinate spaces at once here: pointer deltas and
 * measured boxes arrive in SCREEN pixels, while an item's offset is applied as a transform in
 * the group's scaled LOCAL space. Inside a scaled group the two disagree by `scale`, and that
 * is what left cards sitting on top of each other:
 *
 *  - a ref `dragConstraints` clamps a screen-measured box against a local-space offset, and a
 *    clamped drag ended with a leftover translate that never returned to zero. That is why the
 *    items here carry no dragConstraints — the group's axis lock and Reorder's own
 *    snap-to-origin keep the drag in bounds without the mismatched clamp.
 *  - the raw pointer delta made the card travel `scale`x further than the finger, so
 *    correctParentTransform maps pointer coordinates back through the inverse of the group's
 *    own transform (framer-motion's supported fix for dragging inside a transformed parent).
 *
 * The MotionConfig only reaches motion components inside this group, so the equations board —
 * whose custom drag handlers deliberately work in screen coordinates — is left alone.
 */
function ScaledReorderGroup({ children, isValidating, ...props }) {
  const groupRef = useRef(null);
  // Built per call rather than once at render: correctParentTransform reads the group's live
  // transform, and it should only reach for the ref while a pointer is actually moving.
  const transformPagePoint = useCallback((point) => correctParentTransform(groupRef)(point), []);

  return (
    <Reorder.Group ref={groupRef} transition={isValidating ? { duration: 0 } : undefined} {...props}>
      <MotionConfig transformPagePoint={transformPagePoint} transition={isValidating ? { duration: 0 } : undefined}>
        {children}
      </MotionConfig>
    </Reorder.Group>
  );
}

export default function AlgeBrosCartridge({ config = {}, onComplete, preview = false }) {
  const [screen, setScreen] = useState('game');
  const [levels, setLevels] = useState([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  
  // Topic from config (defaults to equations)
  const topic = config.topic || 'equations';

  // Background style from config (library, file upload, or preset)
  const bgImage = config.background || config.backgroundImage || config.globalBackground;
  const bgStyle = useMemo(() => {
    if (!bgImage) return null;
    const resolved = resolveAssetUrl(bgImage);
    const formatted = resolved.startsWith('url(') || resolved.startsWith('linear-gradient(') || resolved.startsWith('radial-gradient(')
      ? resolved
      : `url(${resolved})`;
    return {
      backgroundImage: formatted,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }, [bgImage]);
  
  // Level Gameplay State
  const [terms, setTerms] = useState([]);
  const [userPresses, setUserPresses] = useState(0);
  const [minPresses, setMinPresses] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isLevelPerfect, setIsLevelPerfect] = useState(true);
  
  // Visual/Feedback State
  const [feedback, setFeedback] = useState({ text: 'Reorder and combine like terms!', type: 'info' });
  const [shake, setShake] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isElegantCompleted, setIsElegantCompleted] = useState(false);
  const [isDraggingTerm, setIsDraggingTerm] = useState(false);
  const [isMatchingFading, setIsMatchingFading] = useState(false);

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
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOverlayTerm, setDragOverlayTerm] = useState(null);
  const activeCardRef = useRef(null);
  const justDraggedRef = useRef(false);
  const dragSessionRef = useRef(null);
  // Last RAW pointer position handled by handleDragCross. framer-motion re-emits onDrag
  // from its projection-update pipeline whenever our re-render changes the layout, so
  // without this guard every setState here would trigger another onDrag and spin forever.
  const lastDragPointRef = useRef(null);
  // Pending timer for the interrupted-drag fallback (see the global release listener).
  const fallbackReleaseRef = useRef(null);
  const cartridgeRef = useRef(null);
  const bannerRef = useRef(null);
  const [slideWidth, setSlideWidth] = useState(390);
  const threeTermScaleRef = useRef(null);
  const lastSlideWidthRef = useRef(390);


  useEffect(() => {
    const el = cartridgeRef.current;
    if (!el) return;
    const updateWidth = () => {
      const w = el.clientWidth || el.offsetWidth || (el.getBoundingClientRect && el.getBoundingClientRect().width);
      if (w && w > 50) {
        setSlideWidth(w);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    window.addEventListener('resize', updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

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

  // Game-wide statistics
  const [stats, setStats] = useState({
    totalUserPresses: 0,
    totalMinPresses: 0,
    totalMistakes: 0,
    perfectLevels: 0
  });

  // The level's starting equation, used as the baseline for the equivalence guard.
  const originalEquationRef = useRef(null);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const showFeedback = useCallback((text, type) => {
    setFeedback({ text, type });
  }, []);

  const loadLevel = useCallback((levelObj) => {
    threeTermScaleRef.current = null;
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

      // Baseline for the equivalence guard: every later state must have the same
      // solution set as this one.
      originalEquationRef.current = {
        leftNum: levelObj.initialLeftNum || [],
        leftDen: levelObj.initialLeftDen || [],
        rightNum: levelObj.initialRightNum || [],
        rightDen: levelObj.initialRightDen || [],
      };
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
    setShake(false);
    setIsValidating(false);
    setIsElegantCompleted(false);
    setIsDraggingTerm(false);
  }, [topic]);

  const generateLevelsForConfig = useCallback(() => {
    const customText = topic === 'divisions'
      ? (config.divisionText || config.levelsText || config.customText)
      : topic === 'liketerms'
      ? (config.likeTermsText || config.levelsText || config.customText)
      : (config.equationText || config.levelsText || config.customText);

    if (customText && typeof customText === 'string') {
      if (topic === 'equations') {
        const customLevels = parseCustomEquationLevels(customText);
        if (customLevels.length > 0) return customLevels;
      } else if (topic === 'divisions') {
        const customLevels = parseCustomDivisionLevels(customText);
        if (customLevels.length > 0) return customLevels;
      } else if (topic === 'liketerms') {
        const customLevels = parseCustomLikeTermsLevels(customText);
        if (customLevels.length > 0) return customLevels;
      }
    }

    return topic === 'equations'
      ? generateEquationLevels()
      : topic === 'divisions'
      ? generateDivisionLevels()
      : generateLevels();
  }, [topic, config.equationText, config.divisionText, config.likeTermsText, config.levelsText, config.customText]);

  useEffect(() => {
    const generated = generateLevelsForConfig();
    setLevels(generated);
    const startIdx = Math.max(0, Math.min((config.startLevel || 1) - 1, generated.length - 1));
    setCurrentLevelIndex(startIdx);
    if (generated[startIdx]) {
      loadLevel(generated[startIdx]);
    }
    setStats({
      totalUserPresses: 0,
      totalMinPresses: 0,
      totalMistakes: 0,
      perfectLevels: 0
    });
    setScreen('game');
  }, [generateLevelsForConfig, config.startLevel, loadLevel]);

  const handleDecompose = (term, splitA, splitB, type) => {
    setActiveFactorMenu(null);
    playMerge();

    const targetGroup = term.groupId || ('g_' + Math.random().toString(36).substr(2, 7));
    const splitAWithGroup = { ...splitA, groupId: splitA.groupId || targetGroup };
    const splitBWithGroup = { ...splitB, groupId: splitB.groupId || targetGroup };

    const setter = type === 'num' ? setNumTerms
                 : type === 'den' ? setDenTerms
                 : type === 'rightNum' ? setRightNumTerms
                 : setRightDenTerms;
    setter(prev => {
      const idx = prev.findIndex(t => t.id === term.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1, splitAWithGroup, splitBWithGroup);
      return next;
    });
  };

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
    const sharedGroupId = termA.groupId || termB.groupId;
    const product = multiplyTerms(termA, termB, sharedGroupId);
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
        const splitA = makeTerm(term.coeff, exponent - 1 === 1 ? base : `${base}^${exponent - 1}`, term.groupId);
        const splitB = makeTerm(1, base, term.groupId);
        handleDecompose(term, splitA, splitB, type);
        return;
      }
    }

    if (Math.abs(term.coeff) > 1 && term.variable) {
      const splitA = makeTerm(term.coeff, null, term.groupId);
      const splitB = makeTerm(1, term.variable, term.groupId);
      handleDecompose(term, splitA, splitB, type);
      return;
    }

    // Tapping a multi-variable term (e.g. "by", "xyz", "x^2y")
    if (term.variable) {
      const varMap = parseVariablePart(term.variable);
      const letters = Object.keys(varMap);
      if (letters.length > 1) {
        const firstLetter = letters[0];
        const firstExp = varMap[firstLetter];
        const firstVar = firstExp === 1 ? firstLetter : `${firstLetter}^${firstExp}`;
        const remainingMap = { ...varMap };
        delete remainingMap[firstLetter];
        const remainingVar = serializeVariablePart(remainingMap);
        const splitA = makeTerm(term.coeff, firstVar, term.groupId);
        const splitB = makeTerm(1, remainingVar, term.groupId);
        handleDecompose(term, splitA, splitB, type);
        return;
      }
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

  /* True when solving this level will need a division: the banner then reserves the
   * fraction's height from the start instead of growing once a denominator appears. Derived
   * rather than stored, because an extra render makes framer-motion re-resolve the cards'
   * drag constraints inside the scaled layout and misplace them. */
  const reservesFraction = useMemo(() => {
    if (topic !== 'equations') return false;
    const level = levels[currentLevelIndex];
    if (!level) return false;
    const startsWithFraction = (level.initialLeftDen || []).length > 0 || (level.initialRightDen || []).length > 0;
    const hasCoefficient = [...(level.initialLeftNum || []), ...(level.initialRightNum || [])]
      .some(t => t.variable && Math.abs(t.coeff) > 1);
    return startsWithFraction || hasCoefficient;
  }, [topic, levels, currentLevelIndex]);

  const isDenOne = (terms) => terms && terms.length === 1 && terms[0].coeff === 1 && !terms[0].variable;

  // The start screen (and its handleStart) is gone, so restarting from the game-over screen
  // replays the level set from the top.
  const handleRestartGame = useCallback(() => {
    playPopFX();
    setCurrentLevelIndex(0);
    setStats({ totalUserPresses: 0, totalMinPresses: 0, totalMistakes: 0, perfectLevels: 0 });
    if (levels[0]) loadLevel(levels[0]);
    setScreen('game');
  }, [levels, loadLevel, playPopFX]);

  const handleRestartLevel = () => {
    threeTermScaleRef.current = null;
    setActiveFactorMenu(null);
    playPopFX();
    if (levels[currentLevelIndex]) {
      loadLevel(levels[currentLevelIndex]);
    }
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

  /* ── Equation-equivalence guard ──────────────────────────────────────────────
   * Every equations-mode mutation builds a candidate state and commits it here.
   * The candidate is checked against the LEVEL'S ORIGINAL equation (not merely the
   * previous step) so a small per-step error can never accumulate unnoticed.
   * ─────────────────────────────────────────────────────────────────────────── */

  const EQ_KEY = { num: 'leftNum', den: 'leftDen', rightNum: 'rightNum', rightDen: 'rightDen' };

  const currentEquationState = () => ({
    leftNum: [...numTerms],
    leftDen: [...denTerms],
    rightNum: [...rightNumTerms],
    rightDen: [...rightDenTerms],
  });

  const rejectMove = (message) => {
    setMistakes(m => m + 1);
    setIsLevelPerfect(false);
    playWrong();
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    showFeedback(message, 'error');
    triggerShake();
  };

  const commitEquationMove = (candidate) => {
    const baseline = originalEquationRef.current;
    if (baseline && !isEquivalentTransformation(baseline, candidate)) {
      // Should be unreachable: the per-operation rules (D, C, T, F) are meant to catch
      // every illegal move first. Log loudly so a wrongly-blocked LEGAL move surfaces as
      // a bug report instead of a mystery no-op.
      console.error('[algeBROS] Rejected move: it would change the equation\'s solution set.', {
        original: baseline,
        candidate,
      });
      rejectMove('That move would change the equation.');
      return false;
    }
    setNumTerms(candidate.leftNum);
    setDenTerms(candidate.leftDen);
    setRightNumTerms(candidate.rightNum);
    setRightDenTerms(candidate.rightDen);
    return true;
  };

  const handleMoveCrossSide = (term, sourceType, targetType, insertIndex = null) => {
    if (!term || term.coeff === 0) return;
    setActiveFactorMenu(null);

    const isAdditiveTransposition = (sourceType === 'num' && targetType === 'rightNum') ||
                                    (sourceType === 'rightNum' && targetType === 'num');

    const isStandaloneOne = (list) => list.length === 1 && list[0].coeff === 1 && !list[0].variable;

    // Build a CANDIDATE state, then let commitEquationMove decide whether it's legal.
    const candidate = currentEquationState();
    const listOf = (t) => candidate[EQ_KEY[t]];
    const setList = (t, next) => { candidate[EQ_KEY[t]] = next; };

    if (isAdditiveTransposition) {
      const sourceList = listOf(sourceType);
      const groups = splitIntoAdditiveGroups(sourceList);
      const movingGroup = groups.find(g => g.some(t => t.id === term.id)) || [term];
      const idsToRemove = new Set(movingGroup.map(t => t.id));

      const remaining = sourceList.filter(t => !idsToRemove.has(t.id));
      setList(sourceType, remaining.length === 0 ? [makeTerm(0, null)] : remaining);

      // Rule T: negate ONLY the first card of the group. Negating every factor would
      // give (-2)*(-x) = +2x and quietly cancel the sign flip out.
      const sharedGroupId = movingGroup[0]?.groupId || ('g_' + Math.random().toString(36).substr(2, 7));
      const newTerms = movingGroup.map((t, idx) => makeTerm(idx === 0 ? -t.coeff : t.coeff, t.variable, sharedGroupId));

      const targetFiltered = listOf(targetType).filter(t => t.coeff !== 0);
      const targetNoOne = isStandaloneOne(targetFiltered) ? [] : targetFiltered;
      const existingGroups = splitIntoAdditiveGroups(targetNoOne);
      const idxToInsert = (typeof insertIndex === 'number' && insertIndex >= 0)
        ? Math.min(insertIndex, existingGroups.length)
        : existingGroups.length;
      existingGroups.splice(idxToInsert, 0, newTerms);
      setList(targetType, existingGroups.flat());
    } else {
      // Moving to/from a denominator across sides.
      const sourceRemaining = listOf(sourceType).filter(t => t.id !== term.id);
      setList(
        sourceType,
        (sourceType === 'den' || sourceType === 'rightDen')
          ? sourceRemaining
          : (sourceRemaining.length === 0 ? [makeTerm(1, null)] : sourceRemaining)
      );

      const isMovingToNumerator = targetType === 'num' || targetType === 'rightNum';
      const newCoeff = Math.abs(term.coeff);
      const filtered = listOf(targetType).filter(t => t.coeff !== 0);

      if (isMovingToNumerator) {
        if (filtered.length === 0 || isStandaloneOne(filtered)) {
          setList(targetType, [makeTerm(newCoeff, term.variable)]);
        } else {
          const existingGroups = splitIntoAdditiveGroups(filtered);
          const targetGroupIdx = (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < existingGroups.length)
            ? insertIndex
            : 0;
          const targetGroup = [...(existingGroups[targetGroupIdx] || existingGroups[0])];
          const oneIdx = targetGroup.findIndex(t => t.coeff === 1 && !t.variable);
          if (oneIdx !== -1 && targetGroup.length > 1) targetGroup.splice(oneIdx, 1);
          const sharedGroupId = targetGroup[0]?.groupId || ('g_' + Math.random().toString(36).substr(2, 7));
          targetGroup.push(makeTerm(newCoeff, term.variable, sharedGroupId));
          existingGroups[targetGroupIdx] = targetGroup;
          setList(targetType, existingGroups.flat());
        }
      } else {
        if (filtered.length === 0 || isStandaloneOne(filtered)) {
          const sharedGroupId = 'g_' + Math.random().toString(36).substr(2, 7);
          setList(targetType, [makeTerm(newCoeff, term.variable, sharedGroupId)]);
        } else {
          const sharedGroupId = filtered[0]?.groupId || ('g_' + Math.random().toString(36).substr(2, 7));
          setList(targetType, [...filtered, makeTerm(newCoeff, term.variable, sharedGroupId)]);
        }
      }
    }

    if (commitEquationMove(candidate)) {
      playMerge();
      setUserPresses(p => p + 1);
    }
  };

  const setDragPosIfMoved = useCallback((point) => {
    setDragPos(prev => (prev && prev.x === point.x && prev.y === point.y) ? prev : point);
  }, []);

  const setDragHintIfChanged = useCallback((next) => {
    setDragHintState(prev => {
      if (!prev || !next) return prev === next ? prev : next;
      if (prev.side === next.side && prev.insertIndex === next.insertIndex && prev.signHint === next.signHint) return prev;
      return next;
    });
  }, []);

  const clampPointToBanner = useCallback((point, cardEl) => {
    if (!bannerRef.current || !point) return point;
    const bannerRect = bannerRef.current.getBoundingClientRect();
    const cardW = ((cardEl?.offsetWidth || 50)) * 1.15;
    const cardH = ((cardEl?.offsetHeight || 46)) * 1.15;
    const halfW = cardW / 2;
    const halfH = cardH / 2;
    const pad = 6;
    const minX = bannerRect.left + halfW + pad;
    const maxX = Math.max(minX, bannerRect.right - halfW - pad);
    const minY = bannerRect.top + halfH + pad;
    const maxY = Math.max(minY, bannerRect.bottom - halfH - pad);
    return {
      x: Math.min(Math.max(point.x, minX), maxX),
      y: Math.min(Math.max(point.y, minY), maxY)
    };
  }, []);

  const handleDragStartInit = (term, currentType, event, info) => {
    setActiveFactorMenu(null);
    setIsDraggingTerm(true);
    setDraggingCardId(term.id);
    setDragOverlayTerm(term);
    const cardEl = document.querySelector(`.term-card[data-id="${term.id}"]`);
    activeCardRef.current = cardEl;
    if (info?.point) {
      lastDragPointRef.current = { x: info.point.x, y: info.point.y };
      const clamped = clampPointToBanner(info.point, cardEl);
      setDragPos(clamped);
    } else {
      lastDragPointRef.current = null;
    }

    const isStartLeft = currentType === 'num' || currentType === 'den';
    const initialSide = isStartLeft ? 'leftNum' : 'rightNum';
    const initialList = isStartLeft ? numTerms : rightNumTerms;
    const initialGroupIdx = splitIntoAdditiveGroups(initialList).findIndex(g => g.some(t => t.id === term.id));

    setDragHintState({
      side: initialSide,
      insertIndex: initialGroupIdx >= 0 ? initialGroupIdx : 0,
      signHint: (topic === 'equations' && term.coeff < 0) ? '-' : '+'
    });

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
      if (draggingGroupIdx >= 0 && groupEls[draggingGroupIdx]) {
        dragGroupWidth = groupEls[draggingGroupIdx].getBoundingClientRect().width;
      }

      const midpoints = [];
      realEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        let mid = rect.left + rect.width / 2;
        if (draggingGroupIdx >= 0 && i > draggingGroupIdx) {
          mid -= dragGroupWidth;
        }
        midpoints.push(mid);
      });

      return { midpoints, draggingGroupIdx };
    };

    dragSessionRef.current = {
      isUnlocked: false,
      leftSnapshot: snapshotSide('.left-side', numTerms),
      rightSnapshot: snapshotSide('.right-side', rightNumTerms),
    };
  };

  const handleDragCross = (term, currentType, event, info) => {
    // Only react to callbacks carrying a NEW pointer position. framer-motion also fires
    // onDrag again after each layout/projection update, and acting on those would feed
    // our own state updates straight back into it (endless re-render loop).
    if (info?.point) {
      const prevPoint = lastDragPointRef.current;
      if (prevPoint && prevPoint.x === info.point.x && prevPoint.y === info.point.y) return;
      lastDragPointRef.current = { x: info.point.x, y: info.point.y };
    }
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

    const cardEl = activeCardRef.current || document.querySelector(`.term-card[data-id="${term.id}"]`);
    const clampedPoint = clampPointToBanner(info.point, cardEl);
    const dropX = clampedPoint.x;
    const dropY = clampedPoint.y;
    setDragPosIfMoved(clampedPoint);

    const session = dragSessionRef.current;
    if (!session) return;

    const startedOnLeft = currentType === 'num' || currentType === 'den';
    const isTargetLeft = dropX <= centerX;
    const isSameSide = (startedOnLeft && isTargetLeft) || (!startedOnLeft && !isTargetLeft);

    // 1. Check if dragging into denominator region or cross-side to a side with a fraction
    let isUnderTerm = false;
    if (!isSameSide) {
      const targetDenTerms = isTargetLeft ? denTerms : rightDenTerms;
      const hasTargetDen = targetDenTerms && targetDenTerms.length > 0 && !isDenOne(targetDenTerms);

      if (hasTargetDen && (currentType === 'num' || currentType === 'rightNum')) {
        // When dragging a numerator term to a target side that HAS a denominator fraction,
        // it cannot be dropped into the target numerator (which would invalidly divide it by the denominator).
        // It MUST target the denominator!
        isUnderTerm = true;
      } else {
        const targetSideClassForDen = isTargetLeft ? '.left-side' : '.right-side';
        const targetNumEl = document.querySelector(`.equation-side${targetSideClassForDen} .expression-list`);
        const targetDenEl = document.querySelector(`.equation-side${targetSideClassForDen} .division-container > .expression-list:last-child`);

        if (targetDenTerms && targetDenTerms.length > 0 && targetDenEl) {
          const denRect = targetDenEl.getBoundingClientRect();
          isUnderTerm = dropY > (denRect.top - 4);
        } else if (targetNumEl) {
          const numRect = targetNumEl.getBoundingClientRect();
          isUnderTerm = dropY > (numRect.bottom + 6);
        }
      }
    }

    if (isUnderTerm) {
      // Rule D preview: don't promise a denominator drop the drop handler will reject.
      const sourceNum = currentType === 'num' ? numTerms : rightNumTerms;
      const denyByRuleD = (currentType === 'num' || currentType === 'rightNum') && !canMoveToDenominator(sourceNum);
      const targetSide = isTargetLeft ? 'leftDen' : 'rightDen';
      session.lastSide = denyByRuleD ? null : targetSide;
      session.lastInsertIndex = null;
      setDragHintIfChanged(denyByRuleD ? null : { side: targetSide });
      return;
    }

    // 2. Numerator drop position (same side or cross side)
    const side = isTargetLeft ? 'leftNum' : 'rightNum';
    const crossedSides = (startedOnLeft && !isTargetLeft) || (!startedOnLeft && isTargetLeft);

    session.isUnlocked = true;

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

    let signHint;
    if (crossedSides) {
      signHint = term.coeff > 0 ? '-' : '+';
    } else {
      signHint = term.coeff < 0 ? '-' : '+';
    }

    setDragHintIfChanged({ side, insertIndex, signHint });
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
    lastDragPointRef.current = null;
    if (fallbackReleaseRef.current) {
      clearTimeout(fallbackReleaseRef.current);
      fallbackReleaseRef.current = null;
    }
    setDragOverlayTerm(null);
    setDraggingCardId(null);
    setIsDraggingTerm(false);
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

    const rawX = info?.point?.x ?? dragPos.x;
    const rawY = info?.point?.y ?? dragPos.y;
    const cardEl = activeCardRef.current || document.querySelector(`.term-card[data-id="${term.id}"]`);
    const clampedPoint = clampPointToBanner({ x: rawX, y: rawY }, cardEl);
    const dropX = clampedPoint.x;
    const dropY = clampedPoint.y;
    const offsetX = info?.offset?.x ?? 0;

    const startedOnLeft = currentType === 'num' || currentType === 'den';
    const crossed = startedOnLeft
      ? (dropX > centerX || offsetX > 40 || hint?.side === 'rightNum' || hint?.side === 'rightDen')
      : (dropX <= centerX || offsetX < -40 || hint?.side === 'leftNum' || hint?.side === 'leftDen' || hint?.side === 'num' || hint?.side === 'den');

    if (crossed) {
      const targetSideClass = startedOnLeft ? '.right-side' : '.left-side';
      const targetNumEl = document.querySelector(`.equation-side${targetSideClass} .expression-list`);
      const targetDenTerms = startedOnLeft ? rightDenTerms : denTerms;
      const hasTargetDen = targetDenTerms && targetDenTerms.length > 0 && !isDenOne(targetDenTerms);

      let isUnderTerm = false;
      if (hint?.side === 'rightDen' || hint?.side === 'den' || hint?.side === 'leftDen') {
        isUnderTerm = true;
      } else if (hasTargetDen && (currentType === 'num' || currentType === 'rightNum')) {
        // When dragging a numerator term to a target side that HAS a denominator fraction,
        // it cannot be dropped into the target numerator. It MUST target the denominator!
        isUnderTerm = true;
      } else {
        const targetSideClass = startedOnLeft ? '.right-side' : '.left-side';
        const targetNumEl = document.querySelector(`.equation-side${targetSideClass} .expression-list`);
        const targetDenEl = document.querySelector(`.equation-side${targetSideClass} .division-container > .expression-list:last-child`);

        if (targetDenTerms && targetDenTerms.length > 0 && targetDenEl) {
          const denRect = targetDenEl.getBoundingClientRect();
          isUnderTerm = dropY > (denRect.top - 4);
        } else if (targetNumEl) {
          const numRect = targetNumEl.getBoundingClientRect();
          isUnderTerm = dropY > (numRect.bottom + 6);
        }
      }

      let targetType;
      if (hint?.side === 'rightDen' || hint?.side === 'leftDen' || hint?.side === 'den') {
        targetType = startedOnLeft ? 'rightDen' : 'den';
      } else if (isUnderTerm) {
        targetType = startedOnLeft ? 'rightDen' : 'den';
      } else {
        targetType = startedOnLeft ? 'rightNum' : 'num';
      }

      // Rule D: dividing a side must divide the WHOLE side, so a factor can only leave a
      // numerator that is a single additive group. Otherwise "2x + 3 = 9" would become
      // "x + 3 = 9/2", which has a different solution.
      if ((targetType === 'den' || targetType === 'rightDen')) {
        const sourceNum = currentType === 'num' ? numTerms : rightNumTerms;
        if ((currentType === 'num' || currentType === 'rightNum') && !canMoveToDenominator(sourceNum)) {
          rejectMove('Move or combine the other terms on that side first — dividing splits the whole side.');
          return;
        }
      }

      const insertIndex = hint?.insertIndex ?? calculateInsertIndex(targetSideClass, dropX);
      handleMoveCrossSide(term, currentType, targetType, insertIndex);
    } else {
      handleSameSideReorder(term, currentType, dropX);
    }
  };

  // Global drag release safety listener to prevent any UI freeze if pointer events are interrupted
  useEffect(() => {
    if (!isDraggingTerm) return;

    const handleGlobalDragRelease = (e) => {
      if (!isDraggingTerm) return;
      const term = dragOverlayTerm;
      const session = dragSessionRef.current;
      const currentType = session?.startType || 'num';
      const hint = dragHintState;

      setIsDraggingTerm(false);
      setDraggingCardId(null);
      setDragOverlayTerm(null);
      setDragHintState(null);
      dragSessionRef.current = null;
      lastDragPointRef.current = null;
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 200);

      if (!term || term.coeff === 0) return;
      if (!hint?.side) return;

      // framer-motion's own onDragEnd normally lands right after this listener and applies
      // the move with better drop geometry. Only step in when it never arrives (pointer
      // interrupted), otherwise the same move would be applied — and counted — twice.
      const fallback = () => {
        fallbackReleaseRef.current = null;
        const startedOnLeft = currentType === 'num' || currentType === 'den';
        const isTargetLeft = hint.side.startsWith('left') || hint.side === 'den' || hint.side === 'num';
        const crossed = (startedOnLeft && !isTargetLeft) || (!startedOnLeft && isTargetLeft);
        if (!crossed) return;

        let targetType;
        if (hint.side === 'rightDen' || hint.side === 'leftDen' || hint.side === 'den') {
          targetType = startedOnLeft ? 'rightDen' : 'den';
        } else {
          targetType = startedOnLeft ? 'rightNum' : 'num';
        }

        if (targetType === 'den' || targetType === 'rightDen') {
          const sourceNum = currentType === 'num' ? numTermsRef.current : rightNumTermsRef.current;
          if ((currentType === 'num' || currentType === 'rightNum') && !canMoveToDenominator(sourceNum)) {
            rejectMove('Move or combine the other terms on that side first — dividing splits the whole side.');
            return;
          }
        }
        handleMoveCrossSide(term, currentType, targetType, hint.insertIndex);
      };

      if (fallbackReleaseRef.current) clearTimeout(fallbackReleaseRef.current);
      fallbackReleaseRef.current = setTimeout(fallback, 150);
    };

    window.addEventListener('pointerup', handleGlobalDragRelease, { capture: true });
    window.addEventListener('pointercancel', handleGlobalDragRelease, { capture: true });
    window.addEventListener('touchend', handleGlobalDragRelease, { capture: true });
    return () => {
      window.removeEventListener('pointerup', handleGlobalDragRelease, { capture: true });
      window.removeEventListener('pointercancel', handleGlobalDragRelease, { capture: true });
      window.removeEventListener('touchend', handleGlobalDragRelease, { capture: true });
    };
  }, [isDraggingTerm, dragOverlayTerm, dragHintState]);

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

    const clearSliceVisuals = () => {
      sliceNumSetter(prev => prev.filter(x => x !== numId));
      sliceDenSetter(prev => prev.filter(x => x !== denId));
      setCardAngles(prev => {
        const next = { ...prev };
        delete next[numId];
        delete next[denId];
        return next;
      });
      setIsMatchingFading(false);
    };

    const failCancel = (message) => {
      setMistakes(m => m + 1);
      setIsLevelPerfect(false);
      playWrong();
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      triggerShake();
      showFeedback(message, 'error');
      setIsMatchingFading(true);
      setTimeout(clearSliceVisuals, 300);
    };

    if (!areEqualTerms(termA, termB)) {
      failCancel('Only identical terms can be cancelled out!');
      return;
    }

    // Rule C: in `equations` the numerator is a SUM and the denominator divides every
    // additive term at once, so a cancel must be DISTRIBUTIVE — the factor has to be
    // exposed in every group, and it's removed from all of them plus the denominator in
    // one atomic action. (In `divisions` the numerator is a PRODUCT, so one pair is right.)
    let numIdsToCancel = [numId];
    if (topic === 'equations') {
      const picks = findDistributiveCancel(numList, termB);
      if (!picks) {
        failCancel(`Every term on top needs a factor of ${formatTerm(termB, true).value} first!`);
        return;
      }
      numIdsToCancel = picks;
    }

    const pickSet = new Set(numIdsToCancel);
    const nextNum = topic === 'equations'
      ? splitIntoAdditiveGroups(numList.filter(t => t.coeff !== 0)).map(group => {
          const kept = group.filter(t => !pickSet.has(t.id));
          // A group emptied by the cancel is worth 1, not nothing: (2 + …)/2 -> 1 + …
          return kept.length > 0 ? kept : [makeTerm(1, null, group[0].groupId)];
        }).flat()
      : (() => {
          const remaining = numList.filter(t => t.id !== numId);
          return remaining.length === 0 ? [makeTerm(1, null)] : remaining;
        })();
    const nextDen = denList.filter(t => t.id !== denId);

    playPopFX();
    setIsMatchingFading(true);

    crossedNumSetter(prev => [...prev, ...numIdsToCancel]);
    crossedDenSetter(prev => [...prev, denId]);

    setUserPresses(p => p + 1);

    sliceNumSetter(prev => prev.filter(x => x !== numId));
    sliceDenSetter(prev => prev.filter(x => x !== denId));

    setTimeout(() => {
      numSetter(nextNum);
      denSetter(nextDen);
      setCardAngles(prev => {
        const next = { ...prev };
        numIdsToCancel.forEach(id => delete next[id]);
        delete next[denId];
        return next;
      });
      crossedNumSetter(prev => prev.filter(id => !numIdsToCancel.includes(id)));
      crossedDenSetter(prev => prev.filter(id => id !== denId));
      setIsMatchingFading(false);
    }, 300);
  }, [topic, numTerms, denTerms, rightNumTerms, rightDenTerms, isLevelPerfect, playWrong, playMerge, triggerShake, showFeedback]);

  const tempSlicedNum = React.useRef(null);
  const tempSlicedDen = React.useRef(null);
  const sliceAnimFrameRef = React.useRef(null);

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
        sliceAnimFrameRef.current = requestAnimationFrame(animateCanvas);
      } else {
        sliceAnimFrameRef.current = null;
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
      if (sliceAnimFrameRef.current) cancelAnimationFrame(sliceAnimFrameRef.current);
      sliceAnimFrameRef.current = requestAnimationFrame(animateCanvas);
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
      if (sliceAnimFrameRef.current) {
        cancelAnimationFrame(sliceAnimFrameRef.current);
        sliceAnimFrameRef.current = null;
      }
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
    if (!termA || !termB) return;

    if (areLikeTerms(termA, termB)) {
      const merged = combineTerms(termA, termB);
      const updatedTerms = [...terms];
      updatedTerms.splice(index - 1, 2, merged);

      setTerms(updatedTerms);
      setUserPresses(p => p + 1);
      playMerge();
      showFeedback('Merged like terms!', 'success');
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
      triggerShake();
    }
  };

  const handleCombineEquationGroup = (groupIdx, type) => {
    if (isValidating) return;
    unlockAudio();

    const getter = type === 'num' ? numTerms : rightNumTerms;
    const setter = type === 'num' ? setNumTerms : setRightNumTerms;

    const currentList = getter;
    const groups = splitIntoAdditiveGroups(currentList.filter(t => t.coeff !== 0 || currentList.length === 1));

    if (groupIdx <= 0 || groupIdx >= groups.length) return;

    const groupA = groups[groupIdx - 1];
    const groupB = groups[groupIdx];

    if (!groupA || !groupB) return;

    if (groupA.length > 1 || groupB.length > 1) {
      setShakeDotButtons(true);
      setTimeout(() => setShakeDotButtons(false), 500);
      playWrong();
      showFeedback('Multiply factors first before combining!', 'error');
      return;
    }

    const termA = groupA[0];
    const termB = groupB[0];

    if (areLikeTerms(termA, termB)) {
      playMerge();
      setUserPresses(p => p + 1);
      const combined = combineTerms(termA, termB);
      showFeedback('Combined like terms!', 'success');

      setter(prev => {
        const prevGroups = splitIntoAdditiveGroups(prev);
        const idxA = prevGroups.findIndex(g => g.some(t => t.id === termA.id));
        const idxB = prevGroups.findIndex(g => g.some(t => t.id === termB.id));

        if (idxA === -1 || idxB === -1) return prev;

        const nextGroups = [...prevGroups];
        if (combined.coeff === 0 && prevGroups.length > 2) {
          nextGroups.splice(Math.min(idxA, idxB), 2);
        } else {
          nextGroups.splice(Math.min(idxA, idxB), 2, [combined]);
        }
        return nextGroups.flat();
      });
    } else {
      setMistakes(m => m + 1);
      setIsLevelPerfect(false);
      playWrong();
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      showFeedback('Unlike terms cannot be combined!', 'error');
      triggerShake();
    }
  };

  const handleValidate = () => {
    if (isValidating) return;
    unlockAudio();
    
    // Check if there are leftover decomposed factors (same term split into multiple cards) still needing
    // to be re-multiplied. For equations, a numerator can legitimately have multiple INDEPENDENT additive
    // terms sharing one denominator (e.g. x = 7/2 - 3/2), so that alone isn't "unmerged factors".
    const hasUnmergedFactors = (list) => splitIntoAdditiveGroups(list).some(g => g.length > 1);
    const hasDotSeparators = (topic === 'divisions' && (numTerms.length > 1 || denTerms.length > 1)) ||
                            (topic === 'equations' && (hasUnmergedFactors(numTerms) || denTerms.length > 1 || hasUnmergedFactors(rightNumTerms) || rightDenTerms.length > 1));
    
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
        if (nextIndex >= (levels.length || 10)) {
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
        } else if (topic === 'divisions') {
          const hasMatches = countMatchingPairs(numTerms, denTerms) > 0;
          showFeedback(
            hasMatches
              ? 'Doh! There are still matching terms you can cross out!'
              : 'Expression can still be simplified! Tap terms to break them into factors.',
            'error'
          );
        } else {
          showFeedback('Unlike terms cannot be combined!', 'error');
        }
      }
      
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
    // Card padding is 28px (14px on each side).
    // In bold font at 1.35rem, each character averages ~13px.
    return Math.max(38, 28 + chars * 13);
  }, []);

  const expressionScale = useMemo(() => {
    // 1.8% white space on left + 1.8% white space on right = 3.6% total white space.
    // Expression container occupies exactly (100% - 3.6%) = 96.4% of slideWidth.
    const maxAvailableWidth = slideWidth * 0.964;
    // Internal container padding (12px on each side = 24px)
    const targetWidth = Math.max(260, maxAvailableWidth - 24);

    if (lastSlideWidthRef.current !== slideWidth) {
      lastSlideWidthRef.current = slideWidth;
      threeTermScaleRef.current = null;
    }

    if (topic === 'divisions') {
      const calculateDivListWidth = (list) => {
        if (!list || list.length === 0) return 40;
        return list.reduce((acc, term, idx) => {
          const cardW = getTermWidth(term);
          const dotW = idx > 0 ? 38 : 0;
          return acc + cardW + dotW;
        }, 0);
      };
      let numW = calculateDivListWidth(numTerms);
      let denW = calculateDivListWidth(denTerms);

      // In divisions, terms can grow up to the 3-term size as the fraction simplifies,
      // but must never get bigger than the size they have when 3 terms are available in a row.
      const maxTermCount = Math.max(numTerms.length, denTerms.length);
      if (maxTermCount < 3) {
        const allTerms = [...numTerms, ...denTerms];
        const avgCardW = allTerms.length > 0
          ? allTerms.reduce((acc, t) => acc + getTermWidth(t), 0) / allTerms.length
          : 54;
        const missingTerms = 3 - maxTermCount;
        const extraW = missingTerms * (avgCardW + 38);
        numW += extraW;
        denW += extraW;
      }

      const maxDivW = Math.max(numW, denW);
      let calculatedScale = maxDivW > 0 ? targetWidth / maxDivW : 1;
      calculatedScale = Math.max(0.45, Math.min(1.45, calculatedScale));

      if (maxTermCount === 3) {
        threeTermScaleRef.current = calculatedScale;
      } else if (maxTermCount < 3 && threeTermScaleRef.current !== null) {
        calculatedScale = Math.min(threeTermScaleRef.current, calculatedScale);
      }

      return calculatedScale;
    } else if (topic === 'equations') {
      const getSideBaseWidth = (numList, denList) => {
        const calcW = (list) => {
          if (!list || list.length === 0) return 34;
          return list.reduce((acc, term, idx) => {
            const cardW = getTermWidth(term);
            const opW = idx > 0 ? 30 : 0;
            const signW = (idx === 0 && term.coeff < 0) ? 14 : 0;
            return acc + cardW + opW + signW;
          }, 0);
        };
        return Math.max(calcW(numList), calcW(denList));
      };
      let leftW = getSideBaseWidth(numTerms, denTerms);
      let rightW = getSideBaseWidth(rightNumTerms, rightDenTerms);
      const equalsW = 38;
      let totalEqW = leftW + equalsW + rightW;

      const activeTerms = [
        ...numTerms.filter(t => t.coeff !== 0),
        ...denTerms.filter(t => !isDenOne([t])),
        ...rightNumTerms.filter(t => t.coeff !== 0),
        ...rightDenTerms.filter(t => !isDenOne([t]))
      ];
      const eqTermCount = activeTerms.length;
      if (eqTermCount < 3) {
        const avgCardW = activeTerms.length > 0
          ? activeTerms.reduce((acc, t) => acc + getTermWidth(t), 0) / activeTerms.length
          : 54;
        const missingTerms = 3 - eqTermCount;
        totalEqW += missingTerms * (avgCardW + 30);
      }

      let calculatedScale = totalEqW > 0 ? targetWidth / totalEqW : 1;
      calculatedScale = Math.max(0.45, Math.min(1.45, calculatedScale));

      if (eqTermCount === 3) {
        threeTermScaleRef.current = calculatedScale;
      } else if (eqTermCount < 3 && threeTermScaleRef.current !== null) {
        calculatedScale = Math.min(threeTermScaleRef.current, calculatedScale);
      }

      /* The banner clips whatever leaves it, so the width-driven scale above is not enough:
       * a fraction is three rows tall and blowing it up would push cards out of the white
       * card (most visibly while a cancelled pair animates out). Budget the height here,
       * from the same term lists — measuring the DOM and re-rendering with the result makes
       * framer-motion re-resolve the cards' drag constraints and misplace them. */
      const hasLeftDen = (denTerms.length > 0 && !isDenOne(denTerms)) || dragHintState?.side === 'leftDen';
      const hasRightDen = (rightDenTerms.length > 0 && !isDenOne(rightDenTerms)) || dragHintState?.side === 'rightDen';
      const leftGroups = splitIntoAdditiveGroups(numTerms.filter(t => t.coeff !== 0 || numTerms.length === 1)).length;
      const rightGroups = splitIntoAdditiveGroups(rightNumTerms.filter(t => t.coeff !== 0 || rightNumTerms.length === 1)).length;
      // A denominator under a multi-term side is mirrored under each term instead of shown once.
      const mirrored = (hasLeftDen && leftGroups > 1) || (hasRightDen && rightGroups > 1);
      const stacked = (hasLeftDen && leftGroups <= 1) || (hasRightDen && rightGroups <= 1);

      const boxH = ROW_BOX_H + (stacked ? DEN_BLOCK_H : 0);
      const paintedH = ROW_H + (stacked ? DEN_BLOCK_H : 0);
      // Mirrors hang BELOW the layout box, which the banner centres, so the content is
      // lopsided: what has to fit is twice its taller half.
      const contentH = paintedH + (mirrored ? 2 * MIRROR_OVERHANG_H : 0);
      const bannerH = Math.max(reservesFraction ? BANNER_MIN_H_FRACTION : BANNER_MIN_H, boxH + BANNER_PADDING_H);
      const heightCap = (bannerH - BANNER_PADDING_H - BANNER_POP_SLACK) / contentH;

      return Math.max(0.45, Math.min(1.45, calculatedScale, heightCap));
    } else {
      // topic === 'liketerms'
      const calculateLikeTermsWidth = (list) => {
        if (!list || list.length === 0) return 50;
        return list.reduce((acc, term, idx) => {
          const cardW = getTermWidth(term);
          // Operator button (+ or -) between terms
          const opW = idx > 0 ? 34 : 0;
          // The first term's leading minus renders inside the card (see term-negative-prefix)
          // rather than as a separate operator, so its extra width has to be budgeted here.
          const staticSignW = (idx === 0 && term.coeff < 0) ? 16 : 0;
          return acc + cardW + opW + staticSignW;
        }, 0);
      };

      // In Like Terms, terms can grow up to the 3-term size as the expression simplifies,
      // but must never get bigger than the size they have when only 3 terms are available.
      let baseWidth = calculateLikeTermsWidth(terms);
      if (terms.length < 3) {
        const avgCardW = terms.length > 0
          ? terms.reduce((acc, t) => acc + getTermWidth(t), 0) / terms.length
          : 54;
        const missingTerms = 3 - terms.length;
        baseWidth += missingTerms * (avgCardW + 34);
      }

      let calculatedScale = baseWidth > 0 ? targetWidth / baseWidth : 1;
      calculatedScale = Math.max(0.45, Math.min(1.45, calculatedScale));

      if (terms.length === 3) {
        threeTermScaleRef.current = calculatedScale;
      } else if (terms.length < 3 && threeTermScaleRef.current !== null) {
        calculatedScale = Math.min(threeTermScaleRef.current, calculatedScale);
      }

      return calculatedScale;
    }
  }, [topic, terms, numTerms, denTerms, rightNumTerms, rightDenTerms, slideWidth, bgStyle, getTermWidth, dragHintState, reservesFraction]);

  /* Scale is free to grow/shrink between actions (so the expression fills the available
   * space as it's simplified), but a WIDTH change mid-gesture would invalidate work already
   * anchored to the old scale: equations' custom drag snapshots card midpoints in screen space
   * at drag-start and re-uses them for the rest of the gesture, and Reorder's own live FLIP
   * preview assumes its container isn't also rescaling under it. Freeze the scale the instant a
   * drag begins and hold it for that drag's duration; release it as soon as the drag ends so the
   * NEXT render is free to resize again. */
  const dragFrozenScaleRef = useRef(null);
  useEffect(() => {
    if (isDraggingTerm) {
      if (dragFrozenScaleRef.current === null) dragFrozenScaleRef.current = expressionScale;
    } else {
      dragFrozenScaleRef.current = null;
    }
    // Deliberately omits expressionScale: it should be captured ONCE, at the moment the drag
    // starts, not re-captured as it changes during the very drag it's meant to hold steady.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraggingTerm]);
  const stableScale = (isDraggingTerm && dragFrozenScaleRef.current !== null) ? dragFrozenScaleRef.current : expressionScale;


  // Preview Card for Slide Thumbnails/Editor Preview
  if (preview) {
    return (
      <div className={`algebros-cartridge ${bgStyle ? 'has-background' : ''}`} style={{ pointerEvents: 'none', background: bgStyle ? 'transparent' : '#ffffff' }}>
        {bgStyle && <div className="algebros-bg-layer" style={bgStyle} />}
        <ParticlesBG />
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', padding: '16px' }}>
          <div className="algebros-equation-banner" style={{ padding: '12px 20px', minHeight: 'auto' }}>
            <h1 className="start-logo" style={{ fontSize: '1.6rem', margin: 0 }}>algeBROS</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cartridgeRef}
      className={`algebros-cartridge ${bgStyle ? 'has-background' : ''}`}
      style={{
        background: bgStyle ? 'transparent' : '#ffffff'
      }}
    >
      {bgStyle && <div className="algebros-bg-layer" style={bgStyle} />}
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
                  LVL <span className="font-mono">{currentLevelIndex + 1} / {levels.length || 10}</span>
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

              <div className={`expression-wrapper ${shake ? 'shake-container' : ''} ${isValidating ? 'is-success-transition' : ''} ${isDraggingTerm ? 'is-dragging-active' : ''} ${topic === 'divisions' || topic === 'equations' ? 'topic-divisions' : ''}`} style={{ pointerEvents: (isValidating || isMatchingFading) ? 'none' : 'auto' }}>
                <div className="algebros-banner-container">
                  <button
                    className="banner-reset-btn"
                    onClick={handleRestartLevel}
                    title="Restart level"
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                  >
                    ↺
                  </button>
                  <div className={`algebros-equation-banner ${reservesFraction ? 'reserves-fraction' : ''}`} ref={bannerRef}>
                  {topic === 'equations' ? (
                  (() => {
                    const activeLeftTerms = numTerms.filter(t => t.id !== draggingCardId && t.coeff !== 0);
                    const isLeftEmpty = activeLeftTerms.length === 0;
                    const activeRightTerms = rightNumTerms.filter(t => t.id !== draggingCardId && t.coeff !== 0);
                    const isRightEmpty = activeRightTerms.length === 0;
                    // When a side has multiple independent additive terms, a shared denominator divides
                    // ALL of them at once (e.g. (7-3)/2 = 7/2 - 3/2), so it's mirrored under each term
                    // instead of shown once under the whole row.
                    const leftNumGroupCount = splitIntoAdditiveGroups(numTerms.filter(t => t.coeff !== 0 || numTerms.length === 1)).length;
                    const rightNumGroupCount = splitIntoAdditiveGroups(rightNumTerms.filter(t => t.coeff !== 0 || rightNumTerms.length === 1)).length;
                    const showLeftDenMirrors = leftNumGroupCount > 1 && ((denTerms.length > 0 && !isDenOne(denTerms)) || dragHintState?.side === 'leftDen');
                    const showRightDenMirrors = rightNumGroupCount > 1 && ((rightDenTerms.length > 0 && !isDenOne(rightDenTerms)) || dragHintState?.side === 'rightDen');
                    const renderDenMirror = (denList) => (
                      <div
                        className="denominator-mirror"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          pointerEvents: 'none',
                          marginTop: '6px',
                          zIndex: 0
                        }}
                      >
                        <div className="division-line" style={{ width: '100%' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '6px' }}>
                          {denList.length > 0 && !isDenOne(denList) ? (
                            denList.map((dt, dIdx) => (
                              <React.Fragment key={dt.id}>
                                {dIdx > 0 && <span className="dot-separator" style={{ fontSize: '1rem', margin: '0 2px' }}>·</span>}
                                <div className={`term-card ${isOneChar(dt) ? 'one-char-card' : ''}`} style={{ cursor: 'default' }}>
                                  {renderTermValue(dt)}
                                </div>
                              </React.Fragment>
                            ))
                          ) : (
                            <div className="term-card drop-slot-placeholder" />
                          )}
                        </div>
                      </div>
                    );
                    const isDraggingFromLeft = isDraggingTerm && (numTerms.some(t => t.id === draggingCardId) || denTerms.some(t => t.id === draggingCardId));
                    const isDraggingFromRight = isDraggingTerm && (rightNumTerms.some(t => t.id === draggingCardId) || rightDenTerms.some(t => t.id === draggingCardId));

                    return (
                      <motion.div
                        className="equation-layout"
                        style={{
                          scale: stableScale,
                          transformOrigin: 'center',
                          position: 'relative'
                        }}
                        transition={isValidating ? { duration: 0 } : undefined}
                      >
                        {/* Left Side */}
                        <div className="equation-side left-side" style={{ zIndex: isDraggingFromLeft ? 99999 : 1, position: 'relative' }}>
                          <div className="division-container">
                            {/* Numerator */}
                            <div
                              className="expression-list"
                              style={{
                                zIndex: isDraggingFromLeft ? 99999 : (activeFactorMenu?.type === 'num' ? 1001 : 1),
                                position: 'relative'
                              }}
                            >
                              <AnimatePresence>
                                {isLeftEmpty ? (
                                  dragHintState?.side === 'leftNum' ? (
                                    <motion.div
                                      key="hint-slot-num-left-empty"
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      transition={{ duration: 0.12 }}
                                      className="term-group-wrapper"
                                      style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                                    >
                                      {dragHintState.signHint === '-' && (
                                        <span className="operator-static" style={{ marginRight: '4px', fontWeight: 800, color: 'var(--accent-purple)' }}>-</span>
                                      )}
                                      <div className="term-card drop-slot-placeholder" />
                                    </motion.div>
                                  ) : topic === 'equations' ? (
                                    (denTerms.length > 0 && !isDenOne(denTerms)) ? (
                                      <div className="term-card" style={{ cursor: 'default', padding: '0 12px' }}>1</div>
                                    ) : (
                                      <div className="term-card is-zero" style={{ cursor: 'default', padding: '0 12px' }}>0</div>
                                    )
                                  ) : (
                                    <div className="term-card" style={{ cursor: 'default', padding: '0 12px' }}>1</div>
                                  )
                                ) : (
                                  <>
                                    {splitIntoAdditiveGroups(numTerms.filter(t => t.coeff !== 0 || numTerms.length === 1)).map((group, groupIdx) => {
                                      const showHintHere = dragHintState?.side === 'leftNum' && dragHintState.insertIndex === groupIdx;
                                  return (
                                    <React.Fragment key={`group-${group[0]?.groupId || group[0]?.id || groupIdx}`}>
                                      {showHintHere && (
                                        <motion.div
                                          key="hint-slot-num-left"
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                          transition={{ duration: 0.12 }}
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
                                        <button
                                          className="operator-btn"
                                          style={{
                                            pointerEvents: 'auto',
                                            margin: '0 4px',
                                            visibility: (group[0].coeff < 0 && draggingCardId === group[0].id) ? 'hidden' : 'visible'
                                          }}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCombineEquationGroup(groupIdx, 'num');
                                          }}
                                        >
                                          {group[0].coeff < 0 ? '-' : '+'}
                                        </button>
                                      )}
                                      <motion.div
                                        className="term-group-wrapper"
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          position: 'relative',
                                          overflow: 'visible',
                                          zIndex: group.some(t => t.id === draggingCardId) ? 99999 : 1
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
                                                zIndex: term.id === draggingCardId ? 999999 : (activeFactorMenu?.cardId === term.id ? 1002 : 1),
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
                                                drag={!isValidating && term.coeff !== 0}
                                                dragConstraints={bannerRef}
                                                dragSnapToOrigin={true}
                                                dragElastic={0}
                                                whileDrag={isValidating ? undefined : { scale: 1.15, zIndex: 10000 }}
                                                transition={isValidating ? { duration: 0 } : undefined}
                                                onDragStart={(e, info) => handleDragStartInit(term, 'num', e, info)}
                                                onDrag={(e, info) => handleDragCross(term, 'num', e, info)}
                                                onDragEnd={(e, info) => {
                                                  setIsDraggingTerm(false);
                                                  setDraggingCardId(null);
                                                  handleDragEndCross(term, 'num', e, info);
                                                }}
                                                style={{ position: 'relative', pointerEvents: 'auto', touchAction: 'none', zIndex: draggingCardId === term.id ? 999999 : 1, opacity: draggingCardId === term.id ? 0.001 : 1 }}
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
                                        {showLeftDenMirrors && renderDenMirror(denTerms)}
                                      </motion.div>
                                    </React.Fragment>
                                  );
                                })}
                                {dragHintState?.side === 'leftNum' && dragHintState.insertIndex >= splitIntoAdditiveGroups(numTerms).length && (
                                  <motion.div
                                    key="hint-slot-num-left-end"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.12 }}
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
                            display: showLeftDenMirrors || ((denTerms.length === 0 || isDenOne(denTerms)) && dragHintState?.side !== 'leftDen') ? 'none' : 'block',
                            visibility: (isValidating && denTerms.every(t => crossedOutDen.includes(t.id))) ? 'hidden' : 'visible'
                          }}
                        />
                        {/* Denominator */}
                        {!showLeftDenMirrors && ((denTerms.length > 0 && !isDenOne(denTerms)) || dragHintState?.side === 'leftDen') && (
                          <div
                            className="expression-list"
                            style={{
                              zIndex: activeFactorMenu?.type === 'den' ? 1001 : 1,
                              position: 'relative'
                            }}
                          >
                            <AnimatePresence>
                              {denTerms.map((term, index) => {
                                const oneChar = isOneChar(term);
                                const isSliced = slicedDen.includes(term.id);
                                const isCrossed = crossedOutDen.includes(term.id);
                                return (
                                  <motion.div
                                    key={term.id}
                                    className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                                    
                                    transition={isValidating ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 30 }}
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
                                      dragConstraints={bannerRef}
                                      dragSnapToOrigin={true}
                                      dragElastic={0}
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
                        <div className="equation-side right-side" style={{ zIndex: isDraggingFromRight ? 99999 : 1, position: 'relative' }}>
                          <div className="division-container">
                            {/* Numerator */}
                            <div
                              className="expression-list"
                              style={{
                                zIndex: isDraggingFromRight ? 99999 : (activeFactorMenu?.type === 'rightNum' ? 1001 : 1),
                                position: 'relative'
                              }}
                            >
                                  <AnimatePresence>
                                    {isRightEmpty ? (
                                      dragHintState?.side === 'rightNum' ? (
                                        <motion.div
                                          key="hint-slot-num-right-empty"
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                          transition={{ duration: 0.12 }}
                                          className="term-group-wrapper"
                                          style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                                        >
                                          {dragHintState.signHint === '-' && (
                                            <span className="operator-static" style={{ marginRight: '4px', fontWeight: 800, color: 'var(--accent-purple)' }}>-</span>
                                          )}
                                          <div className="term-card drop-slot-placeholder" />
                                        </motion.div>
                                      ) : topic === 'equations' ? (
                                        (denTerms.length > 0 && !isDenOne(denTerms)) ? (
                                          <div className="term-card" style={{ cursor: 'default', padding: '0 12px' }}>1</div>
                                        ) : (
                                          <div className="term-card is-zero" style={{ cursor: 'default', padding: '0 12px' }}>0</div>
                                        )
                                      ) : (
                                        <div className="term-card" style={{ cursor: 'default', padding: '0 12px' }}>1</div>
                                      )
                                    ) : (
                                      <>
                                        {splitIntoAdditiveGroups(rightNumTerms.filter(t => t.coeff !== 0 || rightNumTerms.length === 1)).map((group, groupIdx) => {
                                          const showHintHere = dragHintState?.side === 'rightNum' && dragHintState.insertIndex === groupIdx;
                                  return (
                                    <React.Fragment key={`group-${group[0]?.groupId || group[0]?.id || groupIdx}`}>
                                      {showHintHere && (
                                        <motion.div
                                          key="hint-slot-num-right"
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                          transition={{ duration: 0.12 }}
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
                                        <button
                                          className="operator-btn"
                                          style={{
                                            pointerEvents: 'auto',
                                            margin: '0 4px',
                                            visibility: (group[0].coeff < 0 && draggingCardId === group[0].id) ? 'hidden' : 'visible'
                                          }}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCombineEquationGroup(groupIdx, 'rightNum');
                                          }}
                                        >
                                          {group[0].coeff < 0 ? '-' : '+'}
                                        </button>
                                      )}
                                      <motion.div
                                        className="term-group-wrapper"
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          position: 'relative',
                                          overflow: 'visible',
                                          zIndex: group.some(t => t.id === draggingCardId) ? 99999 : 1
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
                                                zIndex: term.id === draggingCardId ? 999999 : (activeFactorMenu?.cardId === term.id ? 1002 : 1),
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
                                                drag={!isValidating && term.coeff !== 0}
                                                dragConstraints={bannerRef}
                                                dragSnapToOrigin={true}
                                                dragElastic={0}
                                                whileDrag={isValidating ? undefined : { scale: 1.15, zIndex: 10000 }}
                                                transition={isValidating ? { duration: 0 } : undefined}
                                                onDragStart={(e, info) => handleDragStartInit(term, 'rightNum', e, info)}
                                                onDrag={(e, info) => handleDragCross(term, 'rightNum', e, info)}
                                                onDragEnd={(e, info) => {
                                                  setIsDraggingTerm(false);
                                                  setDraggingCardId(null);
                                                  handleDragEndCross(term, 'rightNum', e, info);
                                                }}
                                                style={{ position: 'relative', pointerEvents: 'auto', touchAction: 'none', zIndex: draggingCardId === term.id ? 999999 : 1, opacity: draggingCardId === term.id ? 0.001 : 1 }}
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
                                        {showRightDenMirrors && renderDenMirror(rightDenTerms)}
                                      </motion.div>
                                    </React.Fragment>
                                  );
                                })}
                                {dragHintState?.side === 'rightNum' && dragHintState.insertIndex >= splitIntoAdditiveGroups(rightNumTerms).length && (
                                  <motion.div
                                    key="hint-slot-num-right-end"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.12 }}
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
                            display: showRightDenMirrors || ((rightDenTerms.length === 0 || isDenOne(rightDenTerms)) && dragHintState?.side !== 'rightDen') ? 'none' : 'block',
                            visibility: (isValidating && rightDenTerms.every(t => crossedOutRightDen.includes(t.id))) ? 'hidden' : 'visible'
                          }}
                        />
                        {/* Denominator */}
                        {!showRightDenMirrors && ((rightDenTerms.length > 0 && !isDenOne(rightDenTerms)) || dragHintState?.side === 'rightDen') && (
                          <div
                            className="expression-list"
                            style={{
                              zIndex: activeFactorMenu?.type === 'rightDen' ? 1001 : 1,
                              position: 'relative'
                            }}
                          >
                            <AnimatePresence>
                              {rightDenTerms.map((term, index) => {
                                const oneChar = isOneChar(term);
                                const isSliced = slicedRightDen.includes(term.id);
                                const isCrossed = crossedOutRightDen.includes(term.id);
                                return (
                                  <motion.div
                                    key={term.id}
                                    className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                                    
                                    transition={isValidating ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 30 }}
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
                                      dragConstraints={bannerRef}
                                      dragSnapToOrigin={true}
                                      dragElastic={0}
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
                );
              })()
                ) : topic === 'divisions' ? (
                  numTerms.length === 0 && denTerms.length === 0 ? (
                    <div className="term-card" style={{ cursor: 'default', fontSize: '1.2rem', padding: '0 16px' }}>1</div>
                  ) : (denTerms.length === 0) ? (
                    <ScaledReorderGroup
                      axis="x"
                      values={numTerms}
                      onReorder={setNumTerms}
                      className="expression-list"
                      style={{
                        scale: stableScale,
                        transformOrigin: 'center',
                        zIndex: activeFactorMenu?.type === 'num' ? 1001 : 1,
                        position: 'relative'
                      }}
                      isValidating={isValidating}
                    >
                      <AnimatePresence initial={false}>
                        {numTerms.map((term, index) => {
                          const oneChar = isOneChar(term);
                          const isSliced = slicedNum.includes(term.id);
                          const isCrossed = crossedOutNum.includes(term.id);
                          return (
                            <Reorder.Item
                              key={term.id}
                              value={term}
                              initial={false}
                              layout={!isValidating}
                              dragListener={!isValidating}
                              className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                              dragElastic={0}
                              whileDrag={isValidating ? undefined : { scale: 1.06 }}
                              
                              transition={isValidating ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 50 }}
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
                                transition={isValidating ? { duration: 0 } : undefined}
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
                    </ScaledReorderGroup>
                  ) : (
                    <div className="division-container">
                      {/* Numerator */}
                      <ScaledReorderGroup
                        axis="x"
                        values={numTerms}
                        onReorder={setNumTerms}
                        className="expression-list"
                        style={{
                          scale: stableScale,
                          transformOrigin: 'center'
                        }}
                        isValidating={isValidating}
                      >
                        <AnimatePresence initial={false}>
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
                                  initial={false}
                                  layout={!isValidating}
                                  dragListener={!isValidating}
                                  className="term-item-wrapper"
                                  dragElastic={0}
                                  whileDrag={isValidating ? undefined : { scale: 1.06 }}
                                  
                                  transition={isValidating ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 50 }}
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
                                    transition={isValidating ? { duration: 0 } : undefined}
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
                      </ScaledReorderGroup>

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
                      <ScaledReorderGroup
                        axis="x"
                        values={denTerms}
                        onReorder={setDenTerms}
                        className="expression-list"
                        style={{
                          scale: stableScale,
                          transformOrigin: 'center',
                          zIndex: activeFactorMenu?.type === 'den' ? 1001 : 1,
                          position: 'relative'
                        }}
                        isValidating={isValidating}
                      >
                        <AnimatePresence initial={false}>
                          {denTerms.map((term, index) => {
                            const oneChar = isOneChar(term);
                            const isSliced = slicedDen.includes(term.id);
                            const isCrossed = crossedOutDen.includes(term.id);
                            return (
                              <Reorder.Item
                                key={term.id}
                                value={term}
                                initial={false}
                                layout={!isValidating}
                                dragListener={!isValidating}
                                className={`term-item-wrapper ${activeFactorMenu?.cardId === term.id ? 'card-active' : ''}`}
                                dragElastic={0}
                                whileDrag={isValidating ? undefined : { scale: 1.06 }}
                                
                                transition={isValidating ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 50 }}
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
                                  transition={isValidating ? { duration: 0 } : undefined}
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
                      </ScaledReorderGroup>
                      )}
                    </div>
                  )
                ) : (
                  <ScaledReorderGroup
                    axis="x"
                    values={terms}
                    onReorder={setTerms}
                    className="expression-list"
                    style={{
                      scale: stableScale,
                      transformOrigin: 'center'
                    }}
                    isValidating={isValidating}
                  >
                    <AnimatePresence initial={false}>
                      {terms.map((term, index) => {
                        const isFirst = index === 0;
                        const formatted = formatTerm(term, isFirst);
                        const hasVar = !!term.variable;
                        const oneChar = isOneChar(term);

                        return (
                          <Reorder.Item
                            key={term.id}
                            value={term}
                            initial={false}
                            layout={!isValidating}
                            dragListener={!isValidating}
                            className="term-item-wrapper"
                            dragElastic={0}
                            whileDrag={isValidating ? undefined : { scale: 1.06 }}
                            
                            // Reordering makes every card between the old and new slot hop into
                            // place live as the drag crosses each one — a close-to-critically-
                            // damped spring (vs. the more elastic default) keeps each of those
                            // hops a quick, contained settle instead of a springy overshoot.
                            transition={isValidating ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 50 }}
                            onDragStart={() => { setActiveFactorMenu(null); setIsDraggingTerm(true); setDraggingCardId(term.id); }}
                            onDragEnd={() => { setIsDraggingTerm(false); setDraggingCardId(null); }}
                          >
                            {/* Sign button (outside the card box!). It belongs to this term's
                                position in the ROW, not to the term itself, so it's hidden (not
                                dragged along) while the term is being picked up — it reappears in
                                the right place once the term settles into its dropped position.
                                The FIRST term has no "previous term" to sit between, so its own
                                leading minus (when negative) lives inside the card instead, same
                                as any other term's minus does while it's being dragged. */}
                            {!isFirst && (
                              <button
                                className="operator-btn"
                                style={{ visibility: draggingCardId === term.id ? 'hidden' : 'visible' }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCombine(index);
                                }}
                              >
                                {formatted.sign}
                              </button>
                            )}

                            {/* Term card box (only wraps the value!) */}
                            <div className={`term-card ${hasVar ? 'variable-term' : 'constant-term'} ${oneChar ? 'one-char-card' : ''}`} data-id={term.id}>
                              {formatted.sign === '-' && (isFirst || draggingCardId === term.id) && (
                                <span className="term-negative-prefix" style={{ marginRight: '2px', fontWeight: 800 }}>-</span>
                              )}
                              {renderTermValue(term)}
                            </div>
                          </Reorder.Item>
                        );
                      })}
                    </AnimatePresence>
                  </ScaledReorderGroup>
                )}
                </div>
                </div>
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
              totalLevels={levels.length || 10}
              onRestart={handleRestartGame}
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

      {isDraggingTerm && dragOverlayTerm && createPortal(
        <div
          className="drag-overlay-card-container"
          style={{
            position: 'fixed',
            left: dragPos.x,
            top: dragPos.y,
            transform: 'translate(-50%, -50%) scale(1.15)',
            zIndex: 99999999,
            pointerEvents: 'none'
          }}
        >
          <div
            className={`term-card is-dragging ${isOneChar(dragOverlayTerm) ? 'one-char-card' : ''}`}
            style={{
              boxShadow: '0 12px 36px rgba(139, 92, 246, 0.45), 0 0 24px rgba(139, 92, 246, 0.25)',
              background: '#ffffff',
              borderColor: 'var(--accent-purple, #8b5cf6)',
              color: 'var(--text-main, #1e1b4b)',
              cursor: 'grabbing',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 14px'
            }}
          >
            {dragOverlayTerm.coeff < 0 && (
              <span className="drag-negative-prefix" style={{ marginRight: '2px', fontWeight: 800 }}>-</span>
            )}
            {renderTermValue(dragOverlayTerm)}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
