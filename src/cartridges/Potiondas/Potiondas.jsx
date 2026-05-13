import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './Potiondas.css';

// ─── Fantasy Emoji Pool ───────────────────────────────────────
const EMOJI_POOL = [
  '🧅','🧄','🌶️','🥕','🍄','🌿','🫚','🍋','🫐','🍇',
  '🍎','🍒','🥝','🍑','🫒','🌰','🍯','🧂','🫧','🧪',
  '⚗️','🔮','✨','💫','⭐','🌙','☄️','🌋','💎','🪨',
  '⚡','🌀','💨','🔥','❄️','💧','🫀','🪄','🌸','🍵',
];

function pickRandomEmoji(exclude = []) {
  const available = EMOJI_POOL.filter(e => !exclude.includes(e));
  return available[Math.floor(Math.random() * available.length)] || '✨';
}

function generateEmojis(count, exclude = []) {
  const result = [];
  const used = [...exclude];
  for (let i = 0; i < count; i++) {
    const e = pickRandomEmoji(used);
    result.push(e);
    used.push(e);
  }
  return result;
}

// ─── Level Definitions ────────────────────────────────────────
const DEFAULT_LEVELS = [
  { ops: 'x',              arrow: false },
  { ops: 'xx',             arrow: true  },
  { ops: 'xxx',            arrow: true  },
  { ops: '/xx',            arrow: false, newOp: '÷' },
  { ops: 'x/x',            arrow: false },
  { ops: 'x//x//',         arrow: false },
  { ops: '+x',             arrow: false, newOp: '+' },
  { ops: 'x+x',            arrow: false },
  { ops: 'x+xx+',          arrow: false },
  { ops: '+x++x+',         arrow: false },
  { ops: 'x/x',            arrow: false },
  { ops: '+x/+',           arrow: false },
  { ops: '/++x/+',         arrow: false },
  { ops: '+-',             arrow: false, newOp: '−' },
  { ops: '-+',             arrow: true  },
  { ops: '+-++-+',         arrow: false },
  { ops: '+-x+-+',         arrow: false },
  { ops: '-x-+x-',         arrow: false },
];

// Serialize levels array to user-friendly text format
export function serializeLevels(levels) {
  return levels.map(lv => {
    let line = lv.ops;
    if (lv.arrow) line += '>';
    if (lv.newOp) {
      const charMap = { '÷': '/', '+': '+', '−': '-', '×': 'x', '★': 'e' };
      const c = charMap[lv.newOp] || lv.newOp;
      line += ` n${c}`;
    }
    return line;
  }).join('\n');
}

// Deserialize user text back into levels array
export function deserializeLevels(text) {
  const newOpMap = { '/': '÷', '+': '+', '-': '−', 'x': '×', 'e': '★' };
  return text.split('\n').filter(l => l.trim()).map(line => {
    line = line.trim();
    let newOp = undefined;
    const nMatch = line.match(/\sn([/+\-xe])$/i);
    if (nMatch) {
      newOp = newOpMap[nMatch[1]] || nMatch[1];
      line = line.replace(/\sn[/+\-xe]$/i, '');
    }
    const arrow = line.endsWith('>');
    if (arrow) line = line.slice(0, -1);
    const result = { ops: line, arrow };
    if (newOp) result.newOp = newOp;
    return result;
  });
}

// ─── PEMDAS Ordering Logic ────────────────────────────────────
// Priority: 0 = Exponents (★), 1 = ×/÷, 2 = +/−
function getOpPriority(op) {
  if (op === '★') return 0;
  if (op === '×' || op === '÷') return 1;
  return 2;
}

function getPemdasOrder(operators) {
  const indexed = operators.map((op, idx) => ({ op, idx, priority: getOpPriority(op) }));
  // Sort by priority (ascending = highest first), then by index (left-to-right)
  indexed.sort((a, b) => a.priority - b.priority || a.idx - b.idx);
  return indexed.map(o => o.idx);
}

function charToSymbol(ch) {
  switch (ch) {
    case 'x': return '×';
    case '/': return '÷';
    case '+': return '+';
    case '-': return '−';
    case 'e': return '★';
    default: return ch;
  }
}

// ─── Audio ────────────────────────────────────────────────────
const C_MAJOR = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

let globalAudioCtx = null;
function getAudioCtx() {
  if (!globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

function playNote(noteIdx) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle'; // Louder and clearer
    osc.frequency.setValueAtTime(C_MAJOR[noteIdx % C_MAJOR.length], ctx.currentTime);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

function playErrorSfx() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

function playMergeSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

function playGrowingSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.3);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
  } catch(e) {}
}

// Check if an operator is high priority (× ÷) — used for arrow grouping
function isHighPriority(op) {
  return op === '×' || op === '÷';
}

function isExponent(op) {
  return op === '★';
}

// ─── Main Component ───────────────────────────────────────────
export default function Potiondas({ config = {}, onComplete, onNextSlide }) {
  // Initialize levels from config or use defaults
  const [levels, setLevels] = useState(() => {
    if (config.levelsText) {
      try {
        const parsed = deserializeLevels(config.levelsText);
        if (parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_LEVELS;
  });
  const totalLevels = levels.length;
  const expressionRef = useRef(null);
  const opRefs = useRef({});

  // Game state
  const [level, setLevel] = useState(0);
  const [lives, setLives] = useState(5);
  const [noteIndex, setNoteIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [levelKey, setLevelKey] = useState(0);

  // Animation state
  const [wrongIdx, setWrongIdx] = useState(null);
  const [flashCorrectIdx, setFlashCorrectIdx] = useState(null);
  const [fadedOps, setFadedOps] = useState(false);
  const [merging, setMerging] = useState(null);
  const [showRestart, setShowRestart] = useState(false);
  const [levelSolved, setLevelSolved] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showGoodJob, setShowGoodJob] = useState(false);
  const [showNextBtn, setShowNextBtn] = useState(false);
  const [arrowStyle, setArrowStyle] = useState(null); // {left, width} for green arrow
  const [showNewBalloon, setShowNewBalloon] = useState(false);
  const [newOpIdx, setNewOpIdx] = useState(null);
  const [seenLevels, setSeenLevels] = useState(new Set());
  const [expressionWidth, setExpressionWidth] = useState(0);

  // Build the current level's data
  const levelData = useMemo(() => {
    const def = levels[Math.min(level, totalLevels - 1)];
    const operators = def.ops.split('').map(charToSymbol);
    const emojiCount = operators.length + 1;
    const emojis = generateEmojis(emojiCount);
    const order = getPemdasOrder(operators);
    // Generate random exponent numbers for ★ operators
    const exponents = {};
    operators.forEach((op, idx) => {
      if (op === '★') {
        exponents[idx] = Math.floor(Math.random() * 8) + 2; // 2-9
      }
    });
    return { operators, emojis, order, arrow: def.arrow, newOp: def.newOp, exponents };
  }, [level, levelKey]);

  const [currentEmojis, setCurrentEmojis] = useState(levelData.emojis);
  const [solvedOps, setSolvedOps] = useState(new Set());

  // Reset when level changes
  useEffect(() => {
    setCurrentEmojis(levelData.emojis);
    setSolvedOps(new Set());
    setStep(0);
    setNoteIndex(0);
    setWrongIdx(null);
    setFlashCorrectIdx(null);
    setFadedOps(false);
    setMerging(null);
    setShowRestart(false);
    setLevelSolved(false);
    setShowGoodJob(false);
    setArrowStyle(null);

    if (levelData.newOp && !seenLevels.has(level)) {
      const idx = levelData.operators.indexOf(levelData.newOp);
      if (idx !== -1) {
        setNewOpIdx(idx);
        setShowNewBalloon(true);
        setSeenLevels(prev => new Set(prev).add(level));
      } else {
        setShowNewBalloon(false);
      }
    } else {
      setShowNewBalloon(false);
    }
  }, [level, levelKey, levelData]);

  // Measure expression content bounds after render
  useEffect(() => {
    if (expressionRef.current) {
      const measure = () => {
        const container = expressionRef.current;
        if (!container) return;
        const children = container.querySelectorAll('.pot-token');
        if (children.length === 0) return;
        const containerRect = container.getBoundingClientRect();
        const firstRect = children[0].getBoundingClientRect();
        const lastRect = children[children.length - 1].getBoundingClientRect();
        const totalW = (lastRect.left + lastRect.width) - firstRect.left;
        const arrowW = totalW / 3;
        setExpressionWidth({
          left: firstRect.left - containerRect.left,
          width: totalW,
          arrowWidth: arrowW,
          slideDist: totalW - arrowW
        });
      };
      const timer = setTimeout(measure, 50);
      return () => clearTimeout(timer);
    }
  }, [level, levelKey, currentEmojis]);

  const correctOpIdx = levelData.order[step];

  // Get all unsolved operator indices in the same priority group as the given index
  const getSamePriorityGroup = useCallback((correctIdx) => {
    const op = levelData.operators[correctIdx];
    const priority = getOpPriority(op);
    return levelData.operators
      .map((o, i) => ({ op: o, idx: i }))
      .filter(({ op: o, idx }) => {
        return getOpPriority(o) === priority && !solvedOps.has(idx);
      })
      .map(({ idx }) => idx);
  }, [levelData.operators, solvedOps]);

  // Compute arrow position from DOM refs
  const computeArrowFromRefs = useCallback((groupIndices) => {
    if (!expressionRef.current || groupIndices.length < 2) {
      setArrowStyle(null);
      return;
    }
    
    const firstIdx = groupIndices[0];
    const lastIdx = groupIndices[groupIndices.length - 1];
    const firstEl = opRefs.current[firstIdx];
    const lastEl = opRefs.current[lastIdx];
    const container = expressionRef.current;
    
    if (!firstEl || !lastEl || !container) {
      setArrowStyle(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const firstRect = firstEl.getBoundingClientRect();
    const lastRect = lastEl.getBoundingClientRect();

    // Span from left edge of first op to right edge of last op
    const startLeft = firstRect.left - containerRect.left;
    const totalWidth = (lastRect.left + lastRect.width) - firstRect.left;
    const arrowWidth = Math.max(totalWidth / 3, 16);

    setArrowStyle({
      left: startLeft,
      width: arrowWidth,
      slideDistance: totalWidth - arrowWidth
    });
  }, []);

  const handleOpClick = useCallback((opIdx) => {
    if (levelSolved || gameOver || merging || showRestart || solvedOps.has(opIdx) || wrongIdx !== null) return;

    if (opIdx === correctOpIdx) {
      // ─── Correct! ───
      playNote(noteIndex);
      setNoteIndex(prev => prev + 1);

      let leftIdx = opIdx;
      while (leftIdx >= 0 && currentEmojis[leftIdx] === null) leftIdx--;
      let rightIdx = opIdx + 1;
      while (rightIdx < currentEmojis.length && currentEmojis[rightIdx] === null) rightIdx++;

      setMerging({ opIdx, leftIdx, rightIdx, phase: 'slide' });

      setTimeout(() => {
        setMerging(prev => ({ ...prev, phase: 'pop' }));
      }, 100);

      setTimeout(() => {
        setCurrentEmojis(prev => {
          const newEmojis = [...prev];
          const resultEmoji = pickRandomEmoji(newEmojis);
          newEmojis[leftIdx] = resultEmoji;
          newEmojis[rightIdx] = null;
          return newEmojis;
        });

        const newSolved = new Set(solvedOps);
        newSolved.add(opIdx);
        setSolvedOps(newSolved);
        setMerging(null);

        const newStep = step + 1;
        setStep(newStep);

        if (newStep >= levelData.order.length) {
          setLevelSolved(true);
          playMergeSound();
          setTimeout(() => playGrowingSound(), 100);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, ticks: 60 });
          
          if (level + 1 >= totalLevels) {
            setTimeout(() => {
              setShowGoodJob(true);
              if (onComplete) onComplete();
              setTimeout(() => {
                setShowNextBtn(true);
              }, 1000); // Wait 1s for the wizard animation to finish
            }, 1000);
          }
        }
      }, 200);

    } else {
      // ─── Wrong! ───
      playErrorSfx();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      setWrongIdx(opIdx);
      setFadedOps(true);
      setFlashCorrectIdx(correctOpIdx);
      setNoteIndex(0);

      // Only show arrow if there are >1 buttons in the correct priority group
      const group = getSamePriorityGroup(correctOpIdx);
      if (group.length > 1) {
        // Delay slightly so DOM refs are up to date
        requestAnimationFrame(() => computeArrowFromRefs(group));
      } else {
        setArrowStyle(null);
      }

      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        setTimeout(() => {
          setGameOver(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 2000);
        }, 1500);
      } else {
        setTimeout(() => {
          setShowRestart(true);
        }, 1500);
      }
    }
  }, [correctOpIdx, levelSolved, gameOver, merging, showRestart, solvedOps, step, noteIndex, lives, levelData, getSamePriorityGroup, computeArrowFromRefs, onComplete]);

  const handleRestart = useCallback(() => {
    setLevelKey(prev => prev + 1);
  }, []);

  const handleNextLevel = useCallback(() => {
    if (level + 1 >= totalLevels) {
      if (onComplete) onComplete();
    } else {
      setLevel(prev => prev + 1);
      setLevelKey(prev => prev + 1);
    }
  }, [level, totalLevels, onComplete]);

  // Build visible tokens
  const tokens = useMemo(() => {
    const result = [];
    for (let i = 0; i < levelData.operators.length; i++) {
      if (currentEmojis[i] !== null) {
        result.push({ type: 'emoji', value: currentEmojis[i], emojiIdx: i });
      }
      if (!solvedOps.has(i)) {
        result.push({ type: 'op', value: levelData.operators[i], opIdx: i });
      }
    }
    const lastIdx = levelData.operators.length;
    if (currentEmojis[lastIdx] !== null) {
      result.push({ type: 'emoji', value: currentEmojis[lastIdx], emojiIdx: lastIdx });
    }
    return result;
  }, [currentEmojis, solvedOps, levelData]);

  if (gameOver) {
    return (
      <div className="pot-cartridge" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'white', fontWeight: '900', fontSize: '2.5rem', letterSpacing: '4px', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>GAME OVER</div>
        </div>
        <div className="pot-bottom">
          <button className="pot-btn pot-btn-restart" onClick={() => {
            setLives(5);
            setLevel(0);
            setLevelKey(prev => prev + 1);
            setSeenLevels(new Set());
          }}>
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pot-cartridge" onClick={() => showNewBalloon && setShowNewBalloon(false)}>
      {/* Header / Hearts */}
      <div className="pot-header">
        <div className="pot-hearts">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`pot-heart ${i < lives ? '' : 'pot-heart-lost'}`}>
              {i < lives ? '❤️' : '🖤'}
            </span>
          ))}
        </div>
      </div>

      {/* Expression Area */}
      <div className="pot-expression-area">
        <div className="pot-expression" ref={expressionRef}>
          {tokens.map((token, i) => {
            if (token.type === 'emoji') {
              const isMergeLeft = merging?.phase === 'slide' && token.emojiIdx === merging.leftIdx;
              const isMergeRight = merging?.phase === 'slide' && token.emojiIdx === merging.rightIdx;
              const isMergeFade = merging?.phase === 'pop' && token.emojiIdx === merging.rightIdx;
              const isMergePop = merging?.phase === 'pop' && token.emojiIdx === merging.leftIdx;
              const isFinalGrow = levelSolved && !isMergeFade && !isMergeRight;

              return (
                <span
                  key={`emoji-${token.emojiIdx}-${levelKey}`}
                  className={`pot-token pot-token-emoji ${isMergeLeft ? 'pot-merge-left' : ''} ${isMergeRight ? 'pot-merge-right' : ''} ${isMergeFade ? 'pot-merge-fade' : ''} ${isMergePop ? 'pot-merge-pop' : ''} ${isFinalGrow ? 'pot-final-grow' : ''}`}
                >
                  {token.value}
                </span>
              );
            }

            // Operator token
            const opIdx = token.opIdx;
            const isWrong = wrongIdx === opIdx;
            const isFlashing = flashCorrectIdx === opIdx;
            const isFaded = fadedOps && !isWrong && !isFlashing;
            const isMergeOp = merging?.phase === 'slide' && merging.opIdx === opIdx;
            const isMergeOpPop = merging?.phase === 'pop' && merging.opIdx === opIdx;
            const isHigh = isHighPriority(token.value);

            return (
              <span
                key={`op-${opIdx}-${levelKey}`}
                ref={el => { opRefs.current[opIdx] = el; }}
                className={`pot-token pot-token-op ${isWrong ? 'pot-wrong' : ''} ${isFlashing ? 'pot-flash-correct' : ''} ${isFaded ? 'pot-faded' : ''} ${isMergeOp ? 'pot-merge-op' : ''} ${isMergeOpPop ? 'pot-merge-fade' : ''}`}
                onClick={() => handleOpClick(opIdx)}
              >
                {showNewBalloon && newOpIdx === opIdx && (
                  <div className="pot-new-balloon">NEW</div>
                )}
                <span className={`pot-op-circle`}>
                  {isExponent(token.value) ? (
                    <>
                      <span className="pot-exp-star">e</span>
                      <span className="pot-exp-number">{levelData.exponents[opIdx]}</span>
                    </>
                  ) : (
                    token.value
                  )}
                </span>
              </span>
            );
          })}

          {/* Dynamic green arrow positioned under the correct priority group */}
          {arrowStyle && (
            <div className="pot-green-arrow" style={{ left: arrowStyle.left, width: arrowStyle.width, '--slide-dist': `${arrowStyle.slideDistance}px` }}>
              <svg viewBox="0 0 100 10" preserveAspectRatio="none" overflow="visible">
                <path d="M0,5 L90,5 M85,0 L95,5 L85,10" stroke="#34D399" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {/* Level hint arrow — inside expression, positioned under tokens */}
          {levelData.arrow && step === 0 && !wrongIdx && !levelSolved && expressionWidth && (
            <div className="pot-arrow-hint" style={{
              left: expressionWidth.left,
              width: expressionWidth.arrowWidth,
              '--slide-dist': `${expressionWidth.slideDist}px`
            }}>
              <svg className="pot-arrow-svg" viewBox="0 0 100 10" preserveAspectRatio="none" overflow="visible">
                <path d="M0,5 L90,5 M85,0 L95,5 L85,10" stroke="#34D399" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="pot-bottom">
        {levelSolved && !showGoodJob && (
          <button className="pot-btn pot-btn-next" onClick={handleNextLevel}>
            {level + 1 >= totalLevels ? 'FINISH ✨' : 'NEXT LEVEL →'}
          </button>
        )}
        {showRestart && !gameOver && (
          <button className="pot-btn pot-btn-restart" onClick={handleRestart}>
            RESTART 🔄
          </button>
        )}
      </div>

      {/* GOOD JOB Overlay */}
      {showGoodJob && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, overflow: 'hidden' }}>
          <div style={{ color: '#fff', fontSize: '3rem', fontWeight: 900, textShadow: '0 4px 15px rgba(0,0,0,0.5)', animation: 'potBtnAppear 0.5s ease-out', zIndex: 51 }}>
            GOOD JOB! ✨
          </div>
          <img 
            src="/assets/characters/wizard party blower.png" 
            alt="Wizard"
            className="pot-wizard-win"
          />
          {showNextBtn && (
            <button className="pot-btn pot-btn-next" style={{position: 'absolute', bottom: '20px', right: '20px', zIndex: 52}} onClick={() => { if(onNextSlide) onNextSlide(); }}>
              NEXT LEVEL →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
