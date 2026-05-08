import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HUD from './HUD';
import ExpressionDisplay from './ExpressionDisplay';
import ControlPanel from './ControlPanel';
import {
  parseExpression,
  resetIdCounter,
  getParenGroups,
  validateOperation,
  replaceNodeWithResult,
  isFullySimplified,
  findNodeById,
  getOperationTokenIds,
  getWrongFlashTargets,
  astToString,
} from '../game/ExpressionEngine';
import { KEY_TO_OPERATION } from '../game/locales';
import { getExpressionForLevel, getTestExpression, getTotalLevels } from '../game/LevelGenerator';
import {
  unlockAudio,
  playCorrect,
  playWrong,
  playSelect,
  playMerge,
  playLevelUp,
  playGameOver,
  playNotPresent,
  playHeartLost,
} from '../game/SoundManager';

const MAX_LIVES = 5;
const FALL_DURATION = 56250; // 56.25 seconds to fall (50% slower)
const FALL_TICK = 50; // update every 50ms

export default function GameScreen({ onGameOver, locale, secretSettings }) {
  const speedMult = secretSettings?.speedMult || 1.0;
  const fruitMode = secretSettings?.fruitMode || false;
  const testDifficulty = secretSettings?.difficulty ?? null;
  const [gameState, setGameState] = useState('playing'); // playing | levelComplete | gameOver
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [ast, setAst] = useState(null);
  const [selectedScopeId, setSelectedScopeId] = useState(null);
  const [parenCycleIndex, setParenCycleIndex] = useState(-1);
  const [flashIds, setFlashIds] = useState(null);
  const [mergeInfo, setMergeInfo] = useState(null);
  const [fallProgress, setFallProgress] = useState(0);
  const [showArrow, setShowArrow] = useState(false);
  const [arrowScopeId, setArrowScopeId] = useState(null);
  const [flyingNumber, setFlyingNumber] = useState(null);


  const fallTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const isProcessingRef = useRef(false);

  // ─── Initialize a level ──────────────────────────────────
  const startLevel = useCallback((lvl) => {
    resetIdCounter();
    const { expr } = testDifficulty !== null
      ? getTestExpression(testDifficulty, lvl)
      : getExpressionForLevel(lvl);
    const parsed = parseExpression(expr);
    setAst(parsed);
    setSelectedScopeId(null);
    setParenCycleIndex(-1);
    setFlashIds(null);
    setMergeInfo(null);
    setFallProgress(0);
    setShowArrow(false);
    setArrowScopeId(null);
    setGameState('playing');
    isProcessingRef.current = false;
  }, [testDifficulty]);

  // Start first level
  useEffect(() => {
    startLevel(1);
  }, [startLevel]);

  // ─── Falling timer ───────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'playing') return;

    const effectiveDuration = FALL_DURATION * (1 / speedMult);
    const startTime = Date.now() - fallProgress * effectiveDuration;

    fallTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / effectiveDuration, 1);
      setFallProgress(progress);

      if (progress >= 1) {
        // Expression hit the bottom — game over
        clearInterval(fallTimerRef.current);
        setGameState('gameOver');
        playGameOver();
      }
    }, FALL_TICK);

    return () => clearInterval(fallTimerRef.current);
  }, [gameState, level]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Game Over effect ────────────────────────────────────
  useEffect(() => {
    if (gameState === 'gameOver' && onGameOver) {
      setTimeout(() => onGameOver(score, level), 2000);
    }
  }, [gameState, score, onGameOver]);

  // (arrow hint is now shown only on left_to_right errors)

  // ─── Flash helper ────────────────────────────────────────
  const doFlash = useCallback((nodeIds, color, duration = 600) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashIds({ nodeIds, color });
    flashTimerRef.current = setTimeout(() => {
      setFlashIds(null);
    }, duration);
  }, []);

  // ─── Handle P button ────────────────────────────────────
  const handleP = useCallback(() => {
    if (!ast) return;
    const groups = getParenGroups(ast);
    if (groups.length === 0) {
      playNotPresent();
      return;
    }

    playSelect();

    const nextIndex = (parenCycleIndex + 1) % groups.length;
    setParenCycleIndex(nextIndex);
    setSelectedScopeId(groups[nextIndex].id);
  }, [ast, parenCycleIndex]);

  // ─── Handle operation buttons (E, M, D, A, S) ──────────
  const handleOperation = useCallback((key) => {
    if (!ast || isProcessingRef.current) return;

    const result = validateOperation(ast, selectedScopeId, key);

    if (!result.valid) {
      if (result.errorType === 'not_present') {
        // Operation not present — error sound, no life lost
        playNotPresent();
        return;
      }

      // Wrong order — flash red, lose a life
      playWrong();
      playHeartLost();

      // If it's a left-to-right error, show the scoped arrow hint
      if (result.errorType === 'left_to_right') {
        setShowArrow(true);
        setArrowScopeId(selectedScopeId);
      }

      // Flash wrong targets
      const wrongTargets = getWrongFlashTargets(ast, selectedScopeId, key);
      if (wrongTargets && wrongTargets.allIds) {
        doFlash(wrongTargets.allIds, 'red');
      }

      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameOver');
          playGameOver();
        }
        return newLives;
      });
      return;
    }

    // Correct operation — hide arrow if showing
    isProcessingRef.current = true;
    playCorrect();
    setShowArrow(false);
    setArrowScopeId(null);

    // Flash green on the target operation
    const opTokens = getOperationTokenIds(result.targetNode);
    doFlash(opTokens.allIds, 'green');

    // After flash, merge the operation
    setTimeout(() => {
      playMerge();
      const newAst = replaceNodeWithResult(ast, result.targetNodeId);
      setAst(newAst);
      setScore(prev => prev + 10);

      // Check if fully simplified
      if (isFullySimplified(newAst)) {
        // Level complete — show flying number, then start next
        setGameState('levelComplete');
        playLevelUp();
        setFlyingNumber(newAst.value);

        setTimeout(() => {
          setFlyingNumber(null);
          const nextLevel = level + 1;
          
          // If we completed a full set of levels, grant an extra life
          if (nextLevel > 1 && (nextLevel - 1) % getTotalLevels() === 0) {
            setLives(prev => Math.min(prev + 1, MAX_LIVES));
          }

          setLevel(nextLevel);
          startLevel(nextLevel);
        }, 1200);
      } else {
        // Check if selected scope still exists and if it simplified to a number
        if (selectedScopeId) {
          const scopeNode = findNodeById(newAst, selectedScopeId);
          if (!scopeNode || isFullySimplified(scopeNode)) {
            // Scope dissolved — deselect
            setSelectedScopeId(null);
            setParenCycleIndex(-1);
          }
        }
        isProcessingRef.current = false;
      }
    }, 500);
  }, [ast, selectedScopeId, doFlash, level, startLevel]);

  // ─── Button press handler ────────────────────────────────
  const handleButtonPress = useCallback((key) => {
    unlockAudio();
    if (gameState !== 'playing') return;

    // Map locale-specific key to engine operation key
    const engineKey = KEY_TO_OPERATION[key] || key;

    if (engineKey === 'P') {
      handleP();
    } else {
      handleOperation(engineKey);
    }
  }, [gameState, handleP, handleOperation]);

  // ─── Keyboard input ─────────────────────────────────────
  useEffect(() => {
    const validKeys = locale.buttons.map(b => b.key);
    const handler = (e) => {
      const key = e.key.toUpperCase();
      if (validKeys.includes(key)) {
        e.preventDefault();
        handleButtonPress(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleButtonPress, locale]);

  const total = getTotalLevels();
  const progress = ((level - 1) % total) / (total - 1 || 1);

  return (
    <div className="game-screen" onClick={unlockAudio}>
      <HUD
        score={score}
        lives={lives}
        maxLives={MAX_LIVES}
        level={level}
        progress={progress}
        locale={locale}
      />

      {flyingNumber === null && (
        <ExpressionDisplay
          ast={ast}
          selectedScopeId={selectedScopeId}
          flashIds={flashIds}
          mergeInfo={mergeInfo}
          showArrow={showArrow}
          arrowScopeId={arrowScopeId}
          fallProgress={fallProgress}
          fruitMode={fruitMode}
        />
      )}

      {/* Flying number animation on level complete */}
      <AnimatePresence>
        {flyingNumber !== null && (
          <div className="expression-area">
            <motion.div
              className="flying-number"
              style={{ top: `${fallProgress * 100}%` }}
              initial={{ opacity: 1, scale: 1.2 }}
              animate={{
                opacity: [1, 1, 0],
                scale: [1.2, 1.8, 0.3],
                y: [0, -40, -300],
              }}
              transition={{ duration: 1.1, times: [0, 0.4, 1], ease: 'easeInOut' }}
            >
              {flyingNumber}
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {gameState === 'gameOver' && (
          <motion.div
            className="game-over-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-over-content">
              <h2>{locale.gameOver}</h2>
              <p>{locale.score}: {score}</p>
              <p>{locale.level}: {level}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ControlPanel
        buttons={locale.buttons}
        onButtonPress={handleButtonPress}
        disabled={gameState !== 'playing'}
      />
    </div>
  );
}
