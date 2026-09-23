import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { resolveAssetUrl } from '../../utils/assetUrl';
import {
  unlockAudio,
  playTap,
  playWrong,
  playCircleSketch,
  playVictory
} from './game/SpotSoundManager';
import './SpotCartridge.css';

// Classic quiz option palette matching regular PicoPico quiz
const QUIZ_OPTION_COLORS = ['#65BBF9', '#F9D639', '#C084FC', '#FFA756'];

/**
 * Strip outer balanced parentheses from a string:
 * e.g. "(6x + 12)" -> "6x + 12"
 */
function stripOuterParens(str) {
  if (!str) return '';
  const trimmed = str.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    let depth = 0;
    for (let i = 0; i < trimmed.length - 1; i++) {
      if (trimmed[i] === '(') depth++;
      else if (trimmed[i] === ')') depth--;
      if (depth === 0) {
        return trimmed;
      }
    }
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Hand-drawn animated Red Circle SVG specifically sized for an error token
 */
function HandDrawnCircleToken() {
  return (
    <div className="spot-token-circle-overlay">
      <svg
        className="spot-circle-svg"
        viewBox="0 0 54 54"
        preserveAspectRatio="none"
      >
        <path
          className="spot-circle-path"
          d="M 12,27 C 10,13 25,8 35,9 C 47,10 52,20 51,33 C 50,46 36,52 24,51 C 12,50 6,40 7,27 C 8,16 19,10 30,8"
        />
      </svg>
    </div>
  );
}

/**
 * Render sub-expression math tokens.
 * Each token (number, variable, operator) is interactively selectable in Spot mode.
 * When selected, the red circle is drawn around it.
 * In Quiz mode, the error target is rendered as a Result Field.
 */
function renderMathTokens({
  str,
  stepIdx,
  side,
  isMistakeStep,
  fallbackErrorToken,
  selectedTokenKey,
  onSelectToken,
  disabled,
  quizMode = false,
  quizResultValue = null,
  quizResultState = null
}) {
  if (!str) return null;

  let normalized = str
    .replace(/!=/g, '≠')
    .replace(/!\./g, '·');

  normalized = normalized.replace(/\s\*\s/g, ' · ');

  const tokenRegex = /(\*[^*]+\*|\d+(?:\.\d+)?|[a-zA-Z]|\^[\w\d]+|[+\-·≠±=()/]|\s+)/g;
  const rawTokens = normalized.match(tokenRegex) || [normalized];

  let fallbackMatched = false;

  return rawTokens.map((rawToken, idx) => {
    let token = rawToken;
    let isErrorTarget = false;

    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      isErrorTarget = true;
      token = token.slice(1, -1);
    } else if (
      isMistakeStep &&
      !fallbackMatched &&
      fallbackErrorToken &&
      token.trim() === String(fallbackErrorToken).trim()
    ) {
      isErrorTarget = true;
      fallbackMatched = true;
    }

    // In Quiz Mode: place Result Field in place of the error token
    if (quizMode && isErrorTarget) {
      return (
        <span
          key={`quiz-res-${idx}`}
          className={`spot-result-field ${quizResultState ? `is-${quizResultState}` : ''} ${quizResultValue !== null ? 'has-value' : 'is-empty'}`}
        >
          {quizResultValue !== null ? quizResultValue : '?'}
        </span>
      );
    }

    const tokenKey = `${stepIdx}-${side}-${idx}`;
    const isSelected = selectedTokenKey === tokenKey;

    const isWhitespace = /^\s+$/.test(token);
    const isClickable = !isWhitespace && !disabled && !quizMode;

    let tokenNode = null;
    if (isWhitespace) {
      return <span key={idx}> </span>;
    } else if (/^\d+(?:\.\d+)?$/.test(token)) {
      tokenNode = <span className="spot-math-token spot-math-num">{token}</span>;
    } else if (/^[a-zA-Z]$/.test(token)) {
      tokenNode = <span className="spot-math-token spot-math-var">{token}</span>;
    } else if (token.startsWith('^')) {
      tokenNode = <sup className="spot-math-token spot-math-sup">{token.slice(1)}</sup>;
    } else if (token === '(' || token === ')') {
      tokenNode = <span className="spot-math-token spot-math-paren">{token}</span>;
    } else if (/[+\-·≠±=]/.test(token)) {
      tokenNode = <span className="spot-math-token spot-math-op">{token}</span>;
    } else {
      tokenNode = <span className="spot-math-token">{token}</span>;
    }

    // Always wrap in spot-interactive-token to keep exact dimensions and never shrink when disabled/won
    return (
      <span
        key={idx}
        className={`spot-interactive-token ${isSelected ? 'is-selected' : ''} ${!isClickable ? 'disabled' : ''}`}
        onClick={(e) => {
          if (!isClickable) return;
          e.stopPropagation();
          onSelectToken({
            stepIdx,
            tokenKey,
            token,
            isErrorTarget
          });
        }}
      >
        {tokenNode}
        {isSelected && <HandDrawnCircleToken />}
      </span>
    );
  });
}

/**
 * Render a mathematical expression (left or right side of equation).
 * Supports fractions, token-level selection, and quiz result fields.
 */
function renderMathExpression({
  rawStr,
  stepIdx,
  side,
  isMistakeStep,
  fallbackErrorToken,
  selectedTokenKey,
  onSelectToken,
  disabled,
  quizMode = false,
  quizResultValue = null,
  quizResultState = null
}) {
  if (!rawStr) return null;
  const str = rawStr.trim();

  const fractionMatch = str.match(
    /^(.*?)(?:\(([^)]+)\)|([a-zA-Z0-9^.·*+-]+))\s*\/\s*(?:\(([^)]+)\)|([a-zA-Z0-9^.·*+-]+))(.*?)$/
  );

  if (fractionMatch) {
    const prefix = fractionMatch[1];
    const num = fractionMatch[2] || fractionMatch[3];
    const den = fractionMatch[4] || fractionMatch[5];
    const suffix = fractionMatch[6];

    return (
      <span className="spot-math-expr">
        {prefix
          ? renderMathTokens({
              str: prefix,
              stepIdx,
              side: `${side}-pre`,
              isMistakeStep,
              fallbackErrorToken,
              selectedTokenKey,
              onSelectToken,
              disabled,
              quizMode,
              quizResultValue,
              quizResultState
            })
          : null}
        <span className="spot-fraction">
          <span className="spot-fraction-num">
            {renderMathTokens({
              str: stripOuterParens(num),
              stepIdx,
              side: `${side}-num`,
              isMistakeStep,
              fallbackErrorToken,
              selectedTokenKey,
              onSelectToken,
              disabled,
              quizMode,
              quizResultValue,
              quizResultState
            })}
          </span>
          <span className="spot-fraction-bar" />
          <span className="spot-fraction-den">
            {renderMathTokens({
              str: stripOuterParens(den),
              stepIdx,
              side: `${side}-den`,
              isMistakeStep,
              fallbackErrorToken,
              selectedTokenKey,
              onSelectToken,
              disabled,
              quizMode,
              quizResultValue,
              quizResultState
            })}
          </span>
        </span>
        {suffix
          ? renderMathTokens({
              str: suffix,
              stepIdx,
              side: `${side}-suf`,
              isMistakeStep,
              fallbackErrorToken,
              selectedTokenKey,
              onSelectToken,
              disabled,
              quizMode,
              quizResultValue,
              quizResultState
            })
          : null}
      </span>
    );
  }

  return (
    <span className="spot-math-expr">
      {renderMathTokens({
        str,
        stepIdx,
        side,
        isMistakeStep,
        fallbackErrorToken,
        selectedTokenKey,
        onSelectToken,
        disabled,
        quizMode,
        quizResultValue,
        quizResultState
      })}
    </span>
  );
}

/**
 * Safe arithmetic expression evaluator for basic algebraic terms (+, -, *, /, parens).
 */
function safeEvalMath(expr, xVal = 0, slotVal = null) {
  if (!expr) return null;
  try {
    let s = expr
      .replace(/·/g, '*')
      .replace(/≠/g, '!=');
    if (slotVal !== null) {
      s = s.replace(/\*([^*]+)\*/g, String(slotVal));
    }
    // Implicit multiplication: 3( -> 3 * (
    s = s.replace(/(\d)\s*\(/g, '$1 * (').replace(/\)\s*\(/g, ') * (').replace(/\)\s*(\d)/g, ') * $1');
    // 2x -> 2 * (x)
    s = s.replace(/(\d+)\s*([a-zA-Z])/g, `$1 * ($2)`);
    // variable -> xVal
    s = s.replace(/\b[a-zA-Z]\b/g, `(${xVal})`);

    const tokens = s.match(/\d+(?:\.\d+)?|[+\-*/()]|\S/g);
    if (!tokens) return null;

    let pos = 0;

    function parseExpression() {
      let val = parseTerm();
      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        const op = tokens[pos++];
        const right = parseTerm();
        val = op === '+' ? val + right : val - right;
      }
      return val;
    }

    function parseTerm() {
      let val = parseFactor();
      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
        const op = tokens[pos++];
        const right = parseFactor();
        val = op === '*' ? val * right : val / right;
      }
      return val;
    }

    function parseFactor() {
      if (pos >= tokens.length) return 0;
      const tok = tokens[pos++];
      if (tok === '+') return parseFactor();
      if (tok === '-') return -parseFactor();
      if (tok === '(') {
        const val = parseExpression();
        if (tokens[pos] === ')') pos++;
        return val;
      }
      const num = parseFloat(tok);
      return isNaN(num) ? 0 : num;
    }

    const res = parseExpression();
    return Number.isFinite(res) ? res : null;
  } catch {
    return null;
  }
}

/**
 * Attempt to solve linear root x of step equation:
 */
function solveLinearRoot(step) {
  if (!step || !step.hasEquals) return null;
  for (let x = -50; x <= 50; x++) {
    const l = safeEvalMath(step.left, x);
    const r = safeEvalMath(step.right, x);
    if (l !== null && r !== null && Math.abs(l - r) < 0.0001) {
      return x;
    }
  }
  return null;
}

/**
 * Solve missing slot value in mistake step:
 */
function solveMissingSlot(mistakeStep, rootX, errorToken) {
  if (!mistakeStep || !mistakeStep.hasEquals) return null;
  for (let v = -100; v <= 100; v++) {
    let lStr = mistakeStep.left;
    let rStr = mistakeStep.right;
    if (lStr.includes(`*${errorToken}*`) || lStr.includes(errorToken)) {
      lStr = lStr.replace(`*${errorToken}*`, String(v));
    }
    if (rStr.includes(`*${errorToken}*`) || rStr.includes(errorToken)) {
      rStr = rStr.replace(`*${errorToken}*`, String(v));
    }
    const l = safeEvalMath(lStr, rootX !== null ? rootX : 0);
    const r = safeEvalMath(rStr, rootX !== null ? rootX : 0);
    if (l !== null && r !== null && Math.abs(l - r) < 0.0001) {
      return v;
    }
  }
  return null;
}

/**
 * Automatically deduce what the correct value should be from math context.
 */
function deduceCorrectValue(prevStep, mistakeStep, errorToken) {
  if (!prevStep || !mistakeStep) return null;

  // 1. Solve root and substitute into missing slot
  const rootX = solveLinearRoot(prevStep);
  const solved = solveMissingSlot(mistakeStep, rootX, errorToken);
  if (solved !== null) {
    return String(solved);
  }

  // 2. Division term heuristic: (6x + 12)/3 -> 12/3 = 4
  const fracMatch = prevStep.raw.match(/\(([^)]+)\)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (fracMatch) {
    const numPart = fracMatch[1];
    const denom = parseFloat(fracMatch[2]);
    if (denom !== 0) {
      const numbers = numPart.match(/\d+(?:\.\d+)?/g);
      if (numbers) {
        for (const numStr of numbers) {
          const val = parseFloat(numStr);
          const div = val / denom;
          if (Number.isInteger(div) && String(div) !== String(errorToken)) {
            return String(div);
          }
        }
      }
    }
  }

  // 3. Multiplication factor heuristic: 3(2x + 4) -> 3*4 = 12
  const multMatch = prevStep.raw.match(/(\d+(?:\.\d+)?)\s*\(([^)]+)\)/);
  if (multMatch) {
    const factor = parseFloat(multMatch[1]);
    const inner = multMatch[2];
    const numbers = inner.match(/\d+(?:\.\d+)?/g);
    if (numbers) {
      for (const numStr of numbers) {
        const val = parseFloat(numStr);
        const prod = factor * val;
        if (Number.isInteger(prod) && String(prod) !== String(errorToken)) {
          return String(prod);
        }
      }
    }
  }

  return null;
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate 4 distinct options (1 correct, 3 plausible distractors).
 */
function generateFourOptions(correctValue, errorToken) {
  const optsSet = new Set();
  const cVal = String(correctValue).trim();
  optsSet.add(cVal);

  if (errorToken && String(errorToken).trim() !== cVal) {
    optsSet.add(String(errorToken).trim());
  }

  const num = parseFloat(cVal);
  if (!isNaN(num) && Number.isFinite(num)) {
    const candidates = [
      num + 2,
      num - 2,
      num + 1,
      num - 1,
      num * 2,
      Math.floor(num / 2),
      num + 3,
      num - 3
    ];
    for (const c of candidates) {
      if (optsSet.size >= 4) break;
      if (c > 0 || num <= 0) {
        optsSet.add(String(c));
      }
    }
    let offset = 1;
    while (optsSet.size < 4) {
      optsSet.add(String(num + offset));
      offset++;
      if (optsSet.size < 4 && num - offset > 0) {
        optsSet.add(String(num - offset));
      }
    }
  } else {
    const fallback = ['+', '-', '·', '÷', '=', '±', 'x', 'y', 'z', '2', '3', '4'];
    for (const f of fallback) {
      if (optsSet.size >= 4) break;
      optsSet.add(f);
    }
  }

  const result = Array.from(optsSet).slice(0, 4);
  return shuffleArray(result);
}

/**
 * Automatically determine the correct replacement token and 4 options for the quiz.
 */
function generateQuizData({ steps, mistakeIndex, errorToken, config = {} }) {
  const explicitCorrect = config.correctToken || config.correctAnswer;
  let correctValue = explicitCorrect ? String(explicitCorrect).trim() : null;

  const prevIndex = mistakeIndex > 0 ? mistakeIndex - 1 : 0;
  const prevStep = steps[prevIndex] || steps[0];
  const mistakeStep = steps[mistakeIndex] || steps[0];

  // 1. Check if error token has inline syntax: *3|4* or *3->4*
  if (!correctValue && mistakeStep) {
    const inlineMatch = mistakeStep.raw.match(/\*([^*|>-]+)(?:\||->)([^*]+)\*/);
    if (inlineMatch) {
      correctValue = inlineMatch[2].trim();
    }
  }

  // 2. Term-by-term algebraic deduction from previous step
  if (!correctValue) {
    correctValue = deduceCorrectValue(prevStep, mistakeStep, errorToken);
  }

  // 3. Fallback
  if (!correctValue) {
    const num = parseFloat(errorToken);
    if (!isNaN(num)) {
      correctValue = String(num + 1);
    } else {
      correctValue = errorToken === '+' ? '-' : errorToken === '-' ? '+' : '4';
    }
  }

  // 4. Generate 4 options
  let options = [];
  if (config.quizOptions) {
    if (Array.isArray(config.quizOptions)) {
      options = config.quizOptions.map(String);
    } else if (typeof config.quizOptions === 'string') {
      options = config.quizOptions.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  if (options.length !== 4) {
    options = generateFourOptions(correctValue, errorToken);
  }

  return {
    correctValue,
    options,
    prevIndex,
    prevStep,
    mistakeStep
  };
}

/**
 * Parse lines of equation steps from config.
 */
function parseStepsConfig(stepsText, explicitMistakeIndex, explicitErrorToken) {
  const defaultSteps = [
    '3(2x + 4) = 24',
    '6x + 12 = 24',
    '(6x + 12)/3 = 24/3',
    '2x + *3* = 8',
    '2x = 5',
    'x = 5/2'
  ];

  const rawLines = (stepsText ? stepsText.split('\n') : defaultSteps)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('#'));

  let detectedMistakeIdx = -1;
  let detectedToken = null;

  const parsedSteps = rawLines.map((line, idx) => {
    let cleanLine = line;
    let isMarked = false;

    const inlineMatch = cleanLine.match(/\*([^*]+)\*/);
    if (inlineMatch && !cleanLine.startsWith('* ') && !cleanLine.endsWith(' *')) {
      isMarked = true;
      detectedMistakeIdx = idx;
      detectedToken = inlineMatch[1];
    } else if (cleanLine.startsWith('*') || cleanLine.startsWith('!')) {
      isMarked = true;
      cleanLine = cleanLine.slice(1).trim();
      detectedMistakeIdx = idx;
    }

    const eqIdx = cleanLine.indexOf('=');
    let left = cleanLine;
    let right = '';
    let hasEquals = false;

    if (eqIdx !== -1) {
      left = cleanLine.slice(0, eqIdx).trim();
      right = cleanLine.slice(eqIdx + 1).trim();
      hasEquals = true;
    }

    return {
      id: idx,
      raw: cleanLine,
      left,
      right,
      hasEquals,
      isMarked
    };
  });

  let finalMistakeIndex = 0;
  if (detectedMistakeIdx !== -1) {
    finalMistakeIndex = detectedMistakeIdx;
  } else if (typeof explicitMistakeIndex === 'number') {
    if (explicitMistakeIndex >= parsedSteps.length && explicitMistakeIndex > 0) {
      finalMistakeIndex = explicitMistakeIndex - 1;
    } else {
      finalMistakeIndex = explicitMistakeIndex;
    }
  } else {
    finalMistakeIndex = Math.min(3, Math.max(0, parsedSteps.length - 2));
  }

  const finalErrorToken = detectedToken || explicitErrorToken || '3';

  return { steps: parsedSteps, mistakeIndex: finalMistakeIndex, errorToken: finalErrorToken };
}

export default function SpotCartridge({
  config = {},
  slideBackground = null,
  onComplete,
  preview = false
}) {
  const maxAttempts = config.maxAttempts || 2;

  // Background resolution: cartridge config.background or inherited slideBackground
  const bgImage = config.background || config.backgroundImage || config.globalBackground;
  const hasAnyBackground = Boolean(bgImage || slideBackground);

  const bgStyle = useMemo(() => {
    if (!bgImage) {
      if (slideBackground) {
        return { background: 'transparent' };
      }
      return null;
    }
    const resolved = resolveAssetUrl(bgImage);
    const isGradient = resolved.startsWith('linear-gradient(') || resolved.startsWith('radial-gradient(');
    const isUrl = resolved.startsWith('url(') || resolved.startsWith('data:') || resolved.startsWith('http://') || resolved.startsWith('https://') || resolved.startsWith('/') || resolved.startsWith('./') || resolved.startsWith('blob:');

    if (isGradient) {
      return { backgroundImage: resolved };
    }
    if (isUrl) {
      const formatted = resolved.startsWith('url(') ? resolved : `url("${resolved}")`;
      return {
        backgroundImage: formatted,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return { backgroundColor: resolved };
  }, [bgImage, slideBackground]);

  const { steps, mistakeIndex, errorToken } = useMemo(
    () => parseStepsConfig(config.stepsText, config.mistakeIndex, config.errorToken),
    [config.stepsText, config.mistakeIndex, config.errorToken]
  );

  // Automatically generate quiz data (previous step, mistake step, correct value, 4 options)
  const quizData = useMemo(
    () => generateQuizData({ steps, mistakeIndex, errorToken, config }),
    [steps, mistakeIndex, errorToken, config]
  );

  // Game Phases: 'spot' (spot the error) -> 'quiz' (replace error with correct token)
  const [gamePhase, setGamePhase] = useState('spot');
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttempts);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizState, setQuizState] = useState(null); // 'correct' | 'wrong' | null
  const [disabledQuizOptions, setDisabledQuizOptions] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const shakeTimerRef = useRef(null);

  // Reset state during render if config changes (React recommended pattern)
  const configKey = `${config.stepsText || ''}-${config.mistakeIndex ?? ''}-${config.errorToken || ''}-${config.correctToken || ''}-${config.correctAnswer || ''}-${maxAttempts}`;
  const [prevConfigKey, setPrevConfigKey] = useState(configKey);
  if (prevConfigKey !== configKey) {
    setPrevConfigKey(configKey);
    setGamePhase('spot');
    setAttemptsLeft(maxAttempts);
    setSelectedToken(null);
    setSelectedQuizOption(null);
    setQuizState(null);
    setDisabledQuizOptions([]);
    setIsShaking(false);
    setIsWon(false);
    setIsFailed(false);
  }

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  const handleSelectToken = (tokenData) => {
    if (preview || isWon || isFailed || gamePhase !== 'spot') return;
    unlockAudio();
    playCircleSketch();
    setSelectedToken(tokenData);
  };

  const handleGotcha = () => {
    if (preview || isWon || isFailed || !selectedToken || gamePhase !== 'spot') return;
    unlockAudio();

    if (selectedToken.isErrorTarget) {
      // Correct! Error validated!
      setIsWon(true);
      playVictory();

      // Confetti burst!
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.55 },
        zIndex: 9999
      });

      // After confetti, automatically generate & transition to the Quiz phase
      setTimeout(() => {
        setGamePhase('quiz');
        setIsWon(false);
        setAttemptsLeft(maxAttempts);
        setSelectedQuizOption(null);
        setQuizState(null);
        setDisabledQuizOptions([]);
      }, 1250);
    } else {
      // Wrong selection!
      playWrong();

      setIsShaking(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        setIsShaking(false);
      }, 500);

      const nextAttempts = attemptsLeft - 1;
      setAttemptsLeft(nextAttempts);

      if (nextAttempts <= 0) {
        setIsFailed(true);
      }
    }
  };

  const handleQuizOptionSelect = (opt) => {
    if (preview || isWon || isFailed || disabledQuizOptions.includes(opt) || gamePhase !== 'quiz') return;
    unlockAudio();
    setSelectedQuizOption(opt);

    const isCorrect = String(opt).trim() === String(quizData.correctValue).trim();

    if (isCorrect) {
      setQuizState('correct');
      playVictory();

      // Confetti burst for solving the quiz!
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.5 },
        zIndex: 9999
      });

      setIsWon(true);

      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 1300);
      }
    } else {
      setQuizState('wrong');
      playWrong();
      setDisabledQuizOptions(prev => [...prev, opt]);

      setIsShaking(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        setIsShaking(false);
      }, 500);

      const nextAttempts = attemptsLeft - 1;
      setAttemptsLeft(nextAttempts);

      if (nextAttempts <= 0) {
        setIsFailed(true);
      } else {
        setTimeout(() => {
          setSelectedQuizOption(null);
          setQuizState(null);
        }, 750);
      }
    }
  };

  const handleRetry = () => {
    unlockAudio();
    playTap();
    setAttemptsLeft(maxAttempts);
    setIsShaking(false);
    setIsWon(false);
    setIsFailed(false);
    if (gamePhase === 'quiz') {
      setSelectedQuizOption(null);
      setQuizState(null);
      setDisabledQuizOptions([]);
    } else {
      setSelectedToken(null);
    }
  };

  const prevStep = quizData.prevStep;
  const mistakeStep = quizData.mistakeStep;
  const prevIndex = quizData.prevIndex;

  return (
    <div
      className={`spot-cartridge ${hasAnyBackground ? 'has-bg' : 'no-bg'} ${gamePhase === 'quiz' ? 'is-quiz-phase' : ''}`}
      style={bgStyle || undefined}
    >
      {/* Live hearts below progress bar, top right */}
      <div className="spot-hearts-container">
        {Array.from({ length: maxAttempts }).map((_, i) => (
          <span
            key={i}
            className={`spot-heart ${i >= attemptsLeft ? 'lost' : ''}`}
          >
            ❤️
          </span>
        ))}
      </div>

      {/* Scrollable equations strictly under the progress bar */}
      <div className="spot-scroll-container">
        {gamePhase === 'spot' ? (
          /* Spot Phase: Full Equation Steps */
          <div className={`spot-steps-grid ${isShaking ? 'shake' : ''}`}>
            {steps.map((step, idx) => {
              const isTargetMistakeStep = idx === mistakeIndex;

              if (step.hasEquals) {
                return (
                  <React.Fragment key={step.id}>
                    {/* Left expression: Column 1, right-aligned to '=' */}
                    <div className="spot-cell spot-cell-left">
                      {renderMathExpression({
                        rawStr: step.left,
                        stepIdx: idx,
                        side: 'left',
                        isMistakeStep: isTargetMistakeStep,
                        fallbackErrorToken: errorToken,
                        selectedTokenKey: selectedToken?.tokenKey,
                        onSelectToken: handleSelectToken,
                        disabled: preview || isWon || isFailed
                      })}
                    </div>

                    {/* '=' sign: Column 2, collinear across all rows */}
                    <div className="spot-cell spot-cell-equals">
                      <span
                        className={`spot-interactive-token ${selectedToken?.tokenKey === `${idx}-equals` ? 'is-selected' : ''}`}
                        onClick={(e) => {
                          if (preview || isWon || isFailed) return;
                          e.stopPropagation();
                          handleSelectToken({
                            stepIdx: idx,
                            tokenKey: `${idx}-equals`,
                            token: '=',
                            isErrorTarget: isTargetMistakeStep && (errorToken === '=' || step.raw.includes('*=*'))
                          });
                        }}
                      >
                        =
                        {selectedToken?.tokenKey === `${idx}-equals` && <HandDrawnCircleToken />}
                      </span>
                    </div>

                    {/* Right expression: Column 3, left-aligned starting after '=' */}
                    <div className="spot-cell spot-cell-right">
                      {renderMathExpression({
                        rawStr: step.right,
                        stepIdx: idx,
                        side: 'right',
                        isMistakeStep: isTargetMistakeStep,
                        fallbackErrorToken: errorToken,
                        selectedTokenKey: selectedToken?.tokenKey,
                        onSelectToken: handleSelectToken,
                        disabled: preview || isWon || isFailed
                      })}
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <div
                  key={step.id}
                  className="spot-cell spot-cell-full"
                >
                  {renderMathExpression({
                    rawStr: step.raw,
                    stepIdx: idx,
                    side: 'center',
                    isMistakeStep: isTargetMistakeStep,
                    fallbackErrorToken: errorToken,
                    selectedTokenKey: selectedToken?.tokenKey,
                    onSelectToken: handleSelectToken,
                    disabled: preview || isWon || isFailed
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          /* Quiz Phase: Only previous step + step with result field (all text removed) */
          <div className={`spot-steps-grid ${isShaking ? 'shake' : ''}`}>
            {/* Row 1: Previous Step */}
            <div className="spot-cell spot-cell-left spot-quiz-prev-row">
              {renderMathExpression({
                rawStr: prevStep.left,
                stepIdx: prevIndex,
                side: 'left',
                disabled: true
              })}
            </div>
            <div className="spot-cell spot-cell-equals spot-quiz-prev-row">
              {prevStep.hasEquals ? '=' : ''}
            </div>
            <div className="spot-cell spot-cell-right spot-quiz-prev-row">
              {renderMathExpression({
                rawStr: prevStep.right,
                stepIdx: prevIndex,
                side: 'right',
                disabled: true
              })}
            </div>

            {/* Row 2: Step where the mistake was spotted, with Result Field */}
            <div className="spot-cell spot-cell-left">
              {renderMathExpression({
                rawStr: mistakeStep.left,
                stepIdx: mistakeIndex,
                side: 'left',
                isMistakeStep: true,
                fallbackErrorToken: errorToken,
                quizMode: true,
                quizResultValue: selectedQuizOption,
                quizResultState: quizState,
                disabled: true
              })}
            </div>
            <div className="spot-cell spot-cell-equals">
              {mistakeStep.hasEquals ? '=' : ''}
            </div>
            <div className="spot-cell spot-cell-right">
              {renderMathExpression({
                rawStr: mistakeStep.right,
                stepIdx: mistakeIndex,
                side: 'right',
                isMistakeStep: true,
                fallbackErrorToken: errorToken,
                quizMode: true,
                quizResultValue: selectedQuizOption,
                quizResultState: quizState,
                disabled: true
              })}
            </div>
          </div>
        )}

        {/* Retry button if player ran out of attempts in either phase */}
        {isFailed && (
          <div className="spot-retry-wrapper">
            <button
              type="button"
              className="spot-retry-btn"
              onClick={handleRetry}
            >
              <span>🔄</span>
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>

      {/* GOTCHA! Validation button at the bottom (only in spot phase) */}
      {gamePhase === 'spot' && !isFailed && !preview && (
        <div className="spot-bottom-bar">
          <button
            type="button"
            className={`spot-gotcha-btn ${!selectedToken ? 'disabled' : ''}`}
            disabled={!selectedToken || isWon}
            onClick={handleGotcha}
          >
            GOTCHA!
          </button>
        </div>
      )}

      {/* Quiz Options at the bottom of the screen */}
      {gamePhase === 'quiz' && !isFailed && !preview && (
        <div className="spot-quiz-bottom-bar">
          <div className="spot-quiz-options-grid">
            {quizData.options.map((opt, idx) => {
              const isSelected = selectedQuizOption === opt;
              const isDisabled = disabledQuizOptions.includes(opt);
              const optionClass = isSelected
                ? (quizState === 'correct' ? 'is-correct' : 'is-wrong')
                : (isDisabled ? 'is-disabled' : '');

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled || isWon}
                  className={`spot-quiz-option-btn ${optionClass}`}
                  style={{ backgroundColor: QUIZ_OPTION_COLORS[idx % QUIZ_OPTION_COLORS.length] }}
                  onClick={() => handleQuizOptionSelect(opt)}
                >
                  <span className="spot-quiz-option-val">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
