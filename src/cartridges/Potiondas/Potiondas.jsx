import React, { useState, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import './Potiondas.css';

// ─── Fantasy Emoji Pool ───────────────────────────────────────
const EMOJI_POOL = [
  '🧙','🧛','🧟','👻','🎃','🦇','🕷️','🐉','🦄','🧜',
  '🧚','🪄','🔮','⚗️','🧪','🗡️','🛡️','💀','🐺','🦉',
  '🌙','⭐','🍄','🐸','🦎','🐍','🪲','🕯️','📜','💎',
  '🏰','🧝','🪬','🫧','🌿','🍵','🐈‍⬛','🦅','🐙','🫀',
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
// Each level: operators string + showArrow flag
const LEVELS = [
  { ops: 'x',              arrow: false },
  { ops: 'xx',             arrow: true  },
  { ops: 'xxx',            arrow: true  },
  { ops: '/xx',            arrow: false },
  { ops: 'x/x',           arrow: false },
  { ops: 'x/xx/x//',      arrow: false },
  { ops: '+x',             arrow: false },
  { ops: 'x+x',           arrow: false },
  { ops: 'x+xx+',         arrow: false },
  { ops: '+x++xx+',       arrow: false },
  { ops: 'x/x',           arrow: false },
  { ops: '+x/+',          arrow: false },
  { ops: '/++x/+',        arrow: false },
  { ops: '+-',            arrow: false },
  { ops: '-+',            arrow: true  },
  { ops: '+--++--+',      arrow: false },
  { ops: '+--x+--+',      arrow: false },
  { ops: '+-x-+x-+-',    arrow: false },
];

// ─── PEMDAS Ordering Logic ────────────────────────────────────
// Given an array of operators, return the indices in correct PEMDAS order
// Priority: * and / (left to right) before + and - (left to right)
function getPemdasOrder(operators) {
  const highPriority = []; // × ÷
  const lowPriority = [];  // + -
  
  operators.forEach((op, idx) => {
    if (op === '×' || op === '÷') {
      highPriority.push(idx);
    } else {
      lowPriority.push(idx);
    }
  });
  
  // Within each priority group, order is left-to-right (already sorted by index)
  return [...highPriority, ...lowPriority];
}

// Convert raw level op char to display symbol
function charToSymbol(ch) {
  switch (ch) {
    case 'x': return '×';
    case '/': return '÷';
    case '+': return '+';
    case '-': return '−';
    default: return ch;
  }
}

// ─── Audio ────────────────────────────────────────────────────
const C_MAJOR = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

function playNote(audioCtx, noteIdx) {
  try {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(C_MAJOR[noteIdx % C_MAJOR.length], ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

function playErrorSfx(audioCtx) {
  try {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

function playMergeSound(audioCtx) {
  try {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  } catch(e) {}
}

// ─── Main Component ───────────────────────────────────────────
export default function Potiondas({ config = {}, onComplete }) {
  const totalLevels = LEVELS.length;
  const audioCtx = useRef(null);

  // Game state
  const [level, setLevel] = useState(0);
  const [lives, setLives] = useState(5);
  const [noteIndex, setNoteIndex] = useState(0);
  const [step, setStep] = useState(0); // which operator in the pemdas order we're at
  const [levelKey, setLevelKey] = useState(0); // forces re-render on restart

  // Animation state
  const [wrongIdx, setWrongIdx] = useState(null); // index of wrong-pressed operator
  const [flashCorrectIdx, setFlashCorrectIdx] = useState(null); // correct op to flash
  const [showArrowRange, setShowArrowRange] = useState(null); // {from, to} indices for green arrow
  const [fadedOps, setFadedOps] = useState(false); // fade all ops on wrong
  const [merging, setMerging] = useState(null); // {opIdx, phase: 'slide'|'pop'}
  const [showRestart, setShowRestart] = useState(false);
  const [levelSolved, setLevelSolved] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Build the current level's data
  const levelData = useMemo(() => {
    const def = LEVELS[Math.min(level, totalLevels - 1)];
    const operators = def.ops.split('').map(charToSymbol);
    const emojiCount = operators.length + 1;
    const emojis = generateEmojis(emojiCount);
    const order = getPemdasOrder(operators);
    return { operators, emojis, order, arrow: def.arrow };
  }, [level, levelKey]);

  // Live mutable state for emojis (they change during merges)
  const [currentEmojis, setCurrentEmojis] = useState(levelData.emojis);
  const [solvedOps, setSolvedOps] = useState(new Set());

  // Reset emojis when level changes
  React.useEffect(() => {
    setCurrentEmojis(levelData.emojis);
    setSolvedOps(new Set());
    setStep(0);
    setNoteIndex(0);
    setWrongIdx(null);
    setFlashCorrectIdx(null);
    setShowArrowRange(null);
    setFadedOps(false);
    setMerging(null);
    setShowRestart(false);
    setLevelSolved(false);
  }, [level, levelKey]);

  // Find which op should be pressed next
  const correctOpIdx = levelData.order[step];

  // Find the arrow range: from correctOpIdx to the last op in the same priority group
  const getArrowRange = useCallback((correctIdx) => {
    const op = levelData.operators[correctIdx];
    const isHigh = op === '×' || op === '÷';
    
    // Find all indices of the same priority group
    const groupIndices = levelData.operators
      .map((o, i) => ({ op: o, idx: i }))
      .filter(({ op: o }) => {
        const oHigh = o === '×' || o === '÷';
        return isHigh === oHigh;
      })
      .map(({ idx }) => idx);
    
    // Find the last consecutive one from correctIdx
    const lastInGroup = groupIndices[groupIndices.length - 1];
    return { from: correctIdx, to: lastInGroup };
  }, [levelData.operators]);

  const handleOpClick = useCallback((opIdx) => {
    if (levelSolved || gameOver || merging || showRestart || solvedOps.has(opIdx)) return;

    if (opIdx === correctOpIdx) {
      // ─── Correct! ───
      playNote(audioCtx, noteIndex);
      setNoteIndex(prev => prev + 1);

      // Start merge animation
      setMerging({ opIdx, phase: 'slide' });

      setTimeout(() => {
        setMerging({ opIdx, phase: 'pop' });
      }, 300);

      setTimeout(() => {
        // Merge emojis: left and right combine into a new one
        setCurrentEmojis(prev => {
          const newEmojis = [...prev];
          const resultEmoji = pickRandomEmoji(newEmojis);
          // Replace the left emoji with result, mark right for removal
          newEmojis[opIdx] = resultEmoji;
          newEmojis[opIdx + 1] = null; // will be filtered visually
          return newEmojis;
        });

        const newSolved = new Set(solvedOps);
        newSolved.add(opIdx);
        setSolvedOps(newSolved);
        setMerging(null);

        const newStep = step + 1;
        setStep(newStep);

        // Check if level complete
        if (newStep >= levelData.order.length) {
          setLevelSolved(true);
          playMergeSound(audioCtx);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        }
      }, 600);

    } else {
      // ─── Wrong! ───
      playErrorSfx(audioCtx);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      setWrongIdx(opIdx);
      setFadedOps(true);
      setFlashCorrectIdx(correctOpIdx);
      setShowArrowRange(getArrowRange(correctOpIdx));
      setNoteIndex(0);

      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        // Game over — move to next slide after delay
        setTimeout(() => {
          setGameOver(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 2000);
        }, 1500);
      } else {
        // Show restart button after 1.5s
        setTimeout(() => {
          setShowRestart(true);
        }, 1500);
      }
    }
  }, [correctOpIdx, levelSolved, gameOver, merging, showRestart, solvedOps, step, noteIndex, lives, levelData, getArrowRange, onComplete]);

  const handleRestart = useCallback(() => {
    setLevelKey(prev => prev + 1);
  }, []);

  const handleNextLevel = useCallback(() => {
    if (level + 1 >= totalLevels) {
      // All levels complete
      if (onComplete) onComplete();
    } else {
      setLevel(prev => prev + 1);
      setLevelKey(prev => prev + 1);
    }
  }, [level, totalLevels, onComplete]);

  // Build the visible tokens (emojis + operators interleaved)
  // After merges, some emojis become null — we skip them
  const tokens = useMemo(() => {
    const result = [];
    for (let i = 0; i < levelData.operators.length; i++) {
      // Emoji before this operator
      if (currentEmojis[i] !== null) {
        result.push({ type: 'emoji', value: currentEmojis[i], emojiIdx: i });
      }
      // The operator itself
      if (!solvedOps.has(i)) {
        result.push({ type: 'op', value: levelData.operators[i], opIdx: i });
      }
    }
    // Last emoji
    const lastIdx = levelData.operators.length;
    if (currentEmojis[lastIdx] !== null) {
      result.push({ type: 'emoji', value: currentEmojis[lastIdx], emojiIdx: lastIdx });
    }
    return result;
  }, [currentEmojis, solvedOps, levelData]);

  const isHighPriority = (op) => op === '×' || op === '÷';

  return (
    <div className="pot-cartridge">
      {/* Progress Bar */}
      <div className="pot-header">
        <div className="pot-progress-bar">
          <div className="pot-progress-fill" style={{ width: `${((level) / totalLevels) * 100}%` }} />
          <span className="pot-progress-text">{level + 1} / {totalLevels}</span>
        </div>
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
        <div className="pot-expression">
          {tokens.map((token, i) => {
            if (token.type === 'emoji') {
              const isMergeLeft = merging?.phase === 'slide' && token.emojiIdx === merging.opIdx;
              const isMergeRight = merging?.phase === 'slide' && token.emojiIdx === merging.opIdx + 1;
              const isMergeFade = merging?.phase === 'pop' && (token.emojiIdx === merging.opIdx + 1);
              const isMergePop = merging?.phase === 'pop' && token.emojiIdx === merging.opIdx;

              return (
                <span
                  key={`emoji-${token.emojiIdx}-${levelKey}`}
                  className={`pot-token pot-token-emoji ${isMergeLeft ? 'pot-merge-left' : ''} ${isMergeRight ? 'pot-merge-right' : ''} ${isMergeFade ? 'pot-merge-fade' : ''} ${isMergePop ? 'pot-merge-pop' : ''}`}
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
                className={`pot-token pot-token-op ${isWrong ? 'pot-wrong' : ''} ${isFlashing ? 'pot-flash-correct' : ''} ${isFaded ? 'pot-faded' : ''} ${isMergeOp ? 'pot-merge-op' : ''} ${isMergeOpPop ? 'pot-merge-fade' : ''}`}
                onClick={() => handleOpClick(opIdx)}
              >
                <span className={`pot-op-circle ${isHigh ? 'pot-op-violet' : 'pot-op-lilac'}`}>
                  {token.value}
                </span>
              </span>
            );
          })}
        </div>

        {/* Green Arrow (level hint) */}
        {levelData.arrow && !wrongIdx && !levelSolved && (
          <div className="pot-arrow-hint">
            <svg className="pot-arrow-svg" viewBox="0 0 100 10" preserveAspectRatio="none" overflow="visible">
              <path d="M0,5 L90,5 M85,0 L95,5 L85,10" stroke="#34D399" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Wrong-answer arrow (from correct to end of priority group) */}
        {showArrowRange && (
          <div className="pot-arrow-hint pot-arrow-correction">
            <svg className="pot-arrow-svg" viewBox="0 0 100 10" preserveAspectRatio="none" overflow="visible">
              <path d="M0,5 L90,5 M85,0 L95,5 L85,10" stroke="#34D399" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="pot-bottom">
        {levelSolved && (
          <button className="pot-btn pot-btn-next" onClick={handleNextLevel}>
            {level + 1 >= totalLevels ? 'FINISH ✨' : 'NEXT LEVEL →'}
          </button>
        )}
        {showRestart && !gameOver && (
          <button className="pot-btn pot-btn-restart" onClick={handleRestart}>
            RESTART 🔄
          </button>
        )}
        {gameOver && (
          <div className="pot-game-over">
            <span>💀 No more lives!</span>
          </div>
        )}
      </div>
    </div>
  );
}
