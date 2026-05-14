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
  { ops: 'x(+x)',           arrow: false, newOp: '()' },
  { ops: '(+x)-',           arrow: false },
  { ops: 'x(+-x)+',         arrow: false },
];

// Serialize levels array to user-friendly text format
export function serializeLevels(levels) {
  return levels.map(lv => {
    let line = lv.ops;
    if (lv.arrow) line += '>';
    if (lv.newOp) {
      const charMap = { '÷': '/', '+': '+', '−': '-', '×': 'x', '★': 'e', '()': '()' };
      const c = charMap[lv.newOp] || lv.newOp;
      line += ` n${c}`;
    }
    return line;
  }).join('\n');
}

// Deserialize user text back into levels array
export function deserializeLevels(text) {
  const newOpMap = { '/': '÷', '+': '+', '-': '−', 'x': '×', 'e': '★', '()': '()' };
  return text.split('\n').filter(l => l.trim()).map(line => {
    line = line.trim();
    let newOp = undefined;
    const nMatch = line.match(/\sn([/+\-xe]|\(\))$/i);
    if (nMatch) {
      newOp = newOpMap[nMatch[1]] || nMatch[1];
      line = line.replace(/\sn(?:[/+\-xe]|\(\))$/i, '');
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

function getPemdasOrder(operators, parenDepths = {}) {
  const indexed = operators.map((op, idx) => ({
    op, idx,
    priority: getOpPriority(op),
    depth: parenDepths[idx] || 0
  }));
  // Sort: deepest parens first, then by priority, then left-to-right
  indexed.sort((a, b) => b.depth - a.depth || a.priority - b.priority || a.idx - b.idx);
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

function getOpImage(op) {
  switch (op) {
    case '+': return 'potiondas_symbol_addition.png';
    case '-': 
    case '−': return 'potiondas_symbol_minus.png';
    case '×': 
    case 'x': return 'potiondas_symbol_multiplication.png';
    case '÷': return 'potiondas_symbol_division.png';
    default: return null;
  }
}

// Parse ops string into operators, paren depths, and a token template
function parseOpsString(opsStr) {
  const operators = [];
  const parenDepths = {};
  const template = [];
  const parenGroups = {};
  let emojiIdx = 0, opIdx = 0, depth = 0, parenId = 0;
  const parenStack = [];

  let i = 0;
  // Handle leading parens
  while (i < opsStr.length && (opsStr[i] === '(' || opsStr[i] === ')')) {
    if (opsStr[i] === '(') {
      const gid = parenId++;
      parenStack.push(gid);
      parenGroups[gid] = { opIndices: [], openTokenIdx: template.length };
      template.push({ type: 'paren', value: '(', groupId: gid });
      depth++;
    } else {
      const gid = parenStack.pop();
      if (gid !== undefined) parenGroups[gid].closeTokenIdx = template.length;
      template.push({ type: 'paren', value: ')', groupId: gid });
      depth--;
    }
    i++;
  }

  // First emoji
  template.push({ type: 'emoji', emojiIdx: emojiIdx++ });

  while (i < opsStr.length) {
    const ch = opsStr[i];
    if (ch === '(' || ch === ')') {
      if (ch === '(') {
        const gid = parenId++;
        parenStack.push(gid);
        parenGroups[gid] = { opIndices: [], openTokenIdx: template.length };
        template.push({ type: 'paren', value: '(', groupId: gid });
        depth++;
      } else {
        const gid = parenStack.pop();
        if (gid !== undefined) parenGroups[gid].closeTokenIdx = template.length;
        template.push({ type: 'paren', value: ')', groupId: gid });
        depth--;
      }
      i++;
    } else if (ch === 'e') {
      // Exponent occupies an emoji slot — it's a value, not an operator
      const expNum = Math.floor(Math.random() * 8) + 2;
      template.push({ type: 'exponent', emojiIdx: emojiIdx, number: expNum });
      emojiIdx++;
      i++;
      // Handle parens after exponent
      while (i < opsStr.length && (opsStr[i] === '(' || opsStr[i] === ')')) {
        if (opsStr[i] === '(') {
          const gid = parenId++;
          parenStack.push(gid);
          parenGroups[gid] = { opIndices: [], openTokenIdx: template.length };
          template.push({ type: 'paren', value: '(', groupId: gid });
          depth++;
        } else {
          const gid = parenStack.pop();
          if (gid !== undefined) parenGroups[gid].closeTokenIdx = template.length;
          template.push({ type: 'paren', value: ')', groupId: gid });
          depth--;
        }
        i++;
      }
    } else {
      const sym = charToSymbol(ch);
      parenDepths[opIdx] = depth;
      for (const gid of parenStack) {
        parenGroups[gid].opIndices.push(opIdx);
      }
      operators.push(sym);
      template.push({ type: 'op', opIdx: opIdx });
      opIdx++;
      i++;
      // Parens after operator, before next emoji
      while (i < opsStr.length && (opsStr[i] === '(' || opsStr[i] === ')')) {
        if (opsStr[i] === '(') {
          const gid = parenId++;
          parenStack.push(gid);
          parenGroups[gid] = { opIndices: [], openTokenIdx: template.length };
          template.push({ type: 'paren', value: '(', groupId: gid });
          depth++;
        } else {
          const gid = parenStack.pop();
          if (gid !== undefined) parenGroups[gid].closeTokenIdx = template.length;
          template.push({ type: 'paren', value: ')', groupId: gid });
          depth--;
        }
        i++;
      }
      // Next emoji
      template.push({ type: 'emoji', emojiIdx: emojiIdx++ });
    }
  }

  // Collect exponent indices for solve order
  const exponentSlots = template.filter(t => t.type === 'exponent').map(t => ({ type: 'exponent', emojiIdx: t.emojiIdx, number: t.number }));

  return { operators, parenDepths, template, parenGroups, emojiCount: emojiIdx, exponentSlots };
}

// ─── Main Component ───────────────────────────────────────────
export default function Potiondas({ config = {}, isAlreadySolved = false, onComplete, onRestart, onNextSlide }) {
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
  const [level, setLevel] = useState(isAlreadySolved ? totalLevels - 1 : 0);
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
  const [levelSolved, setLevelSolved] = useState(isAlreadySolved);
  const [gameOver, setGameOver] = useState(false);
  const [showGoodJob, setShowGoodJob] = useState(isAlreadySolved);
  const [showNextBtn, setShowNextBtn] = useState(isAlreadySolved);
  const [arrowStyle, setArrowStyle] = useState(null); // {left, width} for green arrow
  const [showNewBalloon, setShowNewBalloon] = useState(false);
  const [newOpIdx, setNewOpIdx] = useState(null);
  const [seenLevels, setSeenLevels] = useState(new Set());
  const [expressionWidth, setExpressionWidth] = useState(0);
  const [winFadeOut, setWinFadeOut] = useState(false);
  const [pulsingParens, setPulsingParens] = useState(null); // array of groupIds to pulse

  // Build the current level's data
  const levelData = useMemo(() => {
    const def = levels[Math.min(level, totalLevels - 1)];
    const parsed = parseOpsString(def.ops);
    const { operators, parenDepths, template, parenGroups, exponentSlots } = parsed;
    const emojis = generateEmojis(parsed.emojiCount);
    // Mark exponent emoji slots as null (they show as exponent tiles until tapped)
    exponentSlots.forEach(exp => { emojis[exp.emojiIdx] = null; });
    const order = getPemdasOrder(operators, parenDepths);
    // Build combined solve order: exponents first (left to right), then operators by PEMDAS
    const exponentActions = exponentSlots.map(exp => ({ type: 'exponent', emojiIdx: exp.emojiIdx, number: exp.number }));
    const operatorActions = order.map(idx => ({ type: 'op', opIdx: idx }));
    const combinedOrder = [...exponentActions, ...operatorActions];
    return { operators, emojis, order: combinedOrder, arrow: def.arrow, newOp: def.newOp, parenDepths, template, parenGroups, exponentSlots };
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
    setPulsingParens(null);
    if (!isAlreadySolved) {
      setLevelSolved(false);
      setShowGoodJob(false);
    }
    setArrowStyle(null);

    if (levelData.newOp && !seenLevels.has(level)) {
      if (levelData.newOp === '()') {
        // NEW balloon on closing paren
        setNewOpIdx('paren-close');
        setShowNewBalloon(true);
        setSeenLevels(prev => new Set(prev).add(level));
      } else {
        const idx = levelData.operators.indexOf(levelData.newOp);
        if (idx !== -1) {
          setNewOpIdx(idx);
          setShowNewBalloon(true);
          setSeenLevels(prev => new Set(prev).add(level));
        } else {
          setShowNewBalloon(false);
        }
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

  const correctAction = levelData.order[step]; // { type: 'exponent', emojiIdx, number } or { type: 'op', opIdx }

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

  // Helper to advance step after a correct action
  const advanceStep = useCallback((newStep) => {
    setStep(newStep);
    if (newStep >= levelData.order.length) {
      setLevelSolved(true);
      playMergeSound();
      setTimeout(() => playGrowingSound(), 100);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, ticks: 60 });
      if (level + 1 >= totalLevels) {
        setTimeout(() => {
          setWinFadeOut(true);
          setTimeout(() => {
            setShowGoodJob(true);
            if (onComplete) onComplete();
            setTimeout(() => { setShowNextBtn(true); }, 1500);
          }, 800);
        }, 600);
      }
    }
  }, [levelData, level, totalLevels, onComplete]);

  // Handle wrong tap (shared by operators and exponents)
  const handleWrongTap = useCallback((tappedOpIdx) => {
    playErrorSfx();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setWrongIdx(tappedOpIdx);
    setFadedOps(true);
    setNoteIndex(0);

    const correctOpIdx = correctAction?.type === 'op' ? correctAction.opIdx : null;

    if (correctAction?.type === 'exponent') {
      // Should have tapped an exponent first — no specific hint
      setFlashCorrectIdx(null);
      setArrowStyle(null);
    } else if (correctOpIdx !== null) {
      const correctDepth = levelData.parenDepths?.[correctOpIdx] || 0;
      const tappedDepth = levelData.parenDepths?.[tappedOpIdx] || 0;
      const isParenHint = correctDepth > tappedDepth && levelData.parenGroups;

      if (isParenHint) {
        const relevantGroups = Object.entries(levelData.parenGroups)
          .filter(([, g]) => g.opIndices.includes(correctOpIdx) && !g.opIndices.includes(tappedOpIdx))
          .map(([gid]) => parseInt(gid));
        if (relevantGroups.length > 0) setPulsingParens(relevantGroups);
        setFlashCorrectIdx(null);
        setArrowStyle(null);
      } else {
        setFlashCorrectIdx(correctOpIdx);
        const group = getSamePriorityGroup(correctOpIdx);
        if (group.length > 1) {
          requestAnimationFrame(() => computeArrowFromRefs(group));
        } else {
          setArrowStyle(null);
        }
      }
    }

    const newLives = lives - 1;
    setLives(newLives);
    if (newLives <= 0) {
      setTimeout(() => {
        setGameOver(true);
        setTimeout(() => { if (onComplete) onComplete(); }, 2000);
      }, 1500);
    } else {
      setShowRestart(true);
    }
  }, [correctAction, levelData, lives, getSamePriorityGroup, computeArrowFromRefs, onComplete]);

  const handleExponentClick = useCallback((emojiIdx) => {
    if (levelSolved || gameOver || merging || showRestart || wrongIdx !== null) return;
    // Check if this exponent is the current correct action
    if (correctAction?.type === 'exponent' && correctAction.emojiIdx === emojiIdx) {
      // Correct! Transform exponent into an emoji
      playNote(noteIndex);
      setNoteIndex(prev => prev + 1);
      setCurrentEmojis(prev => {
        const newEmojis = [...prev];
        newEmojis[emojiIdx] = pickRandomEmoji(newEmojis);
        return newEmojis;
      });
      advanceStep(step + 1);
    }
    // If wrong exponent tapped, just ignore (no penalty for tapping wrong exponent)
  }, [correctAction, levelSolved, gameOver, merging, showRestart, wrongIdx, noteIndex, step, advanceStep]);

  const handleOpClick = useCallback((opIdx) => {
    if (levelSolved || gameOver || merging || showRestart || solvedOps.has(opIdx) || wrongIdx !== null) return;

    const isCorrect = correctAction?.type === 'op' && correctAction.opIdx === opIdx;

    if (isCorrect) {
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

        advanceStep(step + 1);
      }, 200);

    } else {
      // ─── Wrong! ───
      handleWrongTap(opIdx);
    }
  }, [correctAction, levelSolved, gameOver, merging, showRestart, solvedOps, step, noteIndex, currentEmojis, advanceStep, handleWrongTap, wrongIdx]);

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

  // Build visible tokens from template
  const tokens = useMemo(() => {
    const result = [];
    for (const t of levelData.template) {
      if (t.type === 'emoji') {
        if (currentEmojis[t.emojiIdx] !== null) {
          result.push({ type: 'emoji', value: currentEmojis[t.emojiIdx], emojiIdx: t.emojiIdx });
        }
      } else if (t.type === 'op') {
        if (!solvedOps.has(t.opIdx)) {
          result.push({ type: 'op', value: levelData.operators[t.opIdx], opIdx: t.opIdx });
        }
      } else if (t.type === 'exponent') {
        if (currentEmojis[t.emojiIdx] === null) {
          // Not yet tapped — show as exponent tile
          result.push({ type: 'exponent', emojiIdx: t.emojiIdx, number: t.number });
        } else {
          // Already tapped — show as regular emoji
          result.push({ type: 'emoji', value: currentEmojis[t.emojiIdx], emojiIdx: t.emojiIdx });
        }
      } else if (t.type === 'paren') {
        // Show paren only if its group still has unsolved ops
        const group = levelData.parenGroups[t.groupId];
        const groupSolved = group && group.opIndices.every(idx => solvedOps.has(idx));
        if (!groupSolved) {
          result.push({ type: 'paren', value: t.value, groupId: t.groupId });
        }
      }
    }
    return result;
  }, [currentEmojis, solvedOps, levelData]);

  const resetGame = () => {
    setLevel(0);
    setLives(5);
    setStep(0);
    setLevelKey(k => k + 1);
    setGameOver(false);
    setShowGoodJob(false);
    setShowNextBtn(false);
    setLevelSolved(false);
    setSolvedOps(new Set());
    setMerging(null);
    setNoteIndex(0);
    setWrongIdx(null);
    setFlashCorrectIdx(null);
    setFadedOps(false);
    setShowRestart(false);
    setShowNewBalloon(false);
    setSeenLevels(new Set());
    setArrowStyle(null);
    setWinFadeOut(false);
    setPulsingParens(null);
    if (onRestart) onRestart();
  };

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

  // ─── Completed Screen (when revisiting a solved game or after win) ───
  if (showGoodJob) {
    const monsterPrefix = config.monsterType === 'forest' ? 'monster_forest' : 'monster_plant';
    const isRevisit = isAlreadySolved;
    return (
      <div className="pot-cartridge" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header with Play Again */}
        <div className="pot-header" style={{ position: 'relative', zIndex: 55 }}>
          <div className="pot-hearts" style={{ justifyContent: 'space-between', alignItems: 'center', paddingLeft: '16px' }}>
            <button 
              className="pot-btn" 
              style={{ padding: '6px 12px', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', margin: 0, pointerEvents: 'auto', zIndex: 55 }}
              onClick={resetGame}
            >
              Play Again
            </button>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`pot-heart ${i < lives ? '' : 'pot-heart-lost'}`}>
                  {i < lives ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* GOOD JOB text - upper center below header */}
        <div style={{ 
          textAlign: 'center', 
          padding: '20px 0 10px',
          animation: isRevisit ? 'none' : 'potGoodJobFadeIn 0.6s ease-out 0.8s both'
        }}>
          <div style={{ color: '#fff', fontSize: '3rem', fontWeight: 900, textShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            GOOD JOB! ✨
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Wizard */}
        <img 
          src="/assets/characters/wizard party blower.png" 
          alt="Wizard"
          className={isRevisit ? '' : 'pot-wizard-win'}
          style={isRevisit ? { position: 'absolute', left: '50%', bottom: 0, width: '50%', transform: 'translateX(-50%)', zIndex: 50, pointerEvents: 'none' } : {}}
        />

        {/* Next Slide Button */}
        {showNextBtn && (
          <button className="pot-btn pot-btn-next" style={{position: 'absolute', bottom: '20px', right: '20px', zIndex: 52, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'}} onClick={() => { if(onNextSlide) onNextSlide(); }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pot-cartridge" onClick={() => showNewBalloon && setShowNewBalloon(false)}>
      {/* Header / Hearts */}
      <div className="pot-header" style={{ position: 'relative', zIndex: 55 }}>
        <div className="pot-hearts" style={{ justifyContent: 'space-between', alignItems: 'center', paddingLeft: '16px' }}>
          {showGoodJob ? (
            <button 
              className="pot-btn" 
              style={{ padding: '6px 12px', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', margin: 0, pointerEvents: 'auto', zIndex: 55 }}
              onClick={resetGame}
            >
              Play Again
            </button>
          ) : (
            <div style={{ position: 'relative', width: '130px', height: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
              <div style={{ width: `${((level + (levelSolved ? 1 : 0)) / totalLevels) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #34D399, #10B981)', transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: '0 0 8px #34D399' }} />
              {/* Glossy overlay for glass effect */}
              <div style={{ position: 'absolute', top: '1px', left: '2px', right: '2px', height: '4px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0))', borderRadius: '10px', pointerEvents: 'none' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`pot-heart ${i < lives ? '' : 'pot-heart-lost'}`}>
                {i < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Evolution Monster Area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', minHeight: 0, margin: '10px 0', transition: 'opacity 0.6s ease-out', opacity: winFadeOut ? 0 : 1 }}>
        <img 
          src={`/assets/characters/evolution monsters/${config.monsterType === 'forest' ? 'monster_forest' : 'monster_plant'}_0${Math.min(level + 1 + (levelSolved ? 1 : 0), 9)}.png`} 
          alt={`Monster Evolution Stage ${Math.min(level + 1 + (levelSolved ? 1 : 0), 9)}`}
          style={{ 
            maxHeight: '180px', // Scaling down to ~29% of its original 622px height
            maxWidth: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))',
            transform: 'translateY(15px)'
          }}
        />
      </div>

      {/* Expression Area */}
      <div className="pot-expression-area" style={{ transition: 'opacity 0.6s ease-out', opacity: winFadeOut ? 0 : 1 }}>
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

            // Exponent token (tappable value tile)
            if (token.type === 'exponent') {
              return (
                <span
                  key={`exp-${token.emojiIdx}-${levelKey}`}
                  className="pot-token pot-token-op pot-token-exponent"
                  onClick={() => handleExponentClick(token.emojiIdx)}
                >
                  <span className="pot-op-circle pot-exp-circle">
                    <span className="pot-exp-star">e</span>
                    <span className="pot-exp-number">{token.number}</span>
                  </span>
                </span>
              );
            }

            // Paren token
            if (token.type === 'paren') {
              const isPulsing = pulsingParens && pulsingParens.includes(token.groupId);
              const isCloseParen = token.value === ')';
              const showParenNew = showNewBalloon && newOpIdx === 'paren-close' && isCloseParen;
              return (
                <span
                  key={`paren-${token.groupId}-${token.value}-${levelKey}`}
                  className={`pot-token pot-token-paren ${isPulsing ? 'pot-paren-pulse' : ''}`}
                >
                  {showParenNew && (
                    <div className="pot-new-balloon">NEW</div>
                  )}
                  <img
                    src={`/assets/potiondas/curve_parentheses_${token.value === '(' ? 'open' : 'closed'}.png`}
                    alt={token.value}
                    className="pot-paren-img"
                  />
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
                ref={(el) => opRefs.current[opIdx] = el}
                className={`pot-token pot-token-op ${isWrong ? 'pot-wrong' : ''} ${isFlashing ? 'pot-flash-correct' : ''} ${isFaded ? 'pot-faded' : ''} ${isMergeOp ? 'pot-merge-op' : ''} ${isMergeOpPop ? 'pot-merge-fade' : ''} ${isHigh ? 'pot-token-high' : ''} ${level === 0 && step === 0 && levels[level]?.ops === 'x' && !levelSolved && !merging && correctAction?.type === 'op' && opIdx === correctAction.opIdx ? 'pot-hint-pulse' : ''}`}
                onClick={() => handleOpClick(opIdx)}
                style={{ visibility: isMergeOpPop ? 'hidden' : 'visible' }}
              >
                {showNewBalloon && newOpIdx === opIdx && (
                  <div className="pot-new-balloon">NEW</div>
                )}
                <span className={`pot-op-circle ${getOpImage(token.value) ? 'pot-op-circle-image' : ''}`}>
                  {getOpImage(token.value) ? (
                    <img 
                      src={`/assets/potiondas/${getOpImage(token.value)}`} 
                      alt={token.value} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    />
                  ) : (
                    token.value === '÷' ? <span style={{ fontFamily: 'Verdana, Arial, sans-serif', fontSize: '1.1em' }}>÷</span> : token.value
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
        {levelSolved && !showGoodJob && (level + 1 < totalLevels) && (
          <button className="pot-btn pot-btn-next" onClick={handleNextLevel}>
            NEXT LEVEL →
          </button>
        )}
        {showRestart && !gameOver && (
          <button className="pot-btn pot-btn-restart" onClick={handleRestart}>
            RESTART 🔄
          </button>
        )}
      </div>


    </div>
  );
}
