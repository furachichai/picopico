import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameScreen from './components/GameScreen';
import { LOCALES, LOCALE_ORDER } from './game/locales';
import { unlockAudio } from './game/SoundManager';
import './PEMDASCartridge.css';

/**
 * PEMDASCartridge — Wrapper that adapts the standalone PEMDAS game
 * to the PicoPico cartridge interface.
 *
 * Props:
 *   config.locale       — 'US' | 'UK' | 'ES' | 'CA' (default 'US')
 *   config.startLevel   — 1-9 (default 1)
 *   config.targetLevel  — 1-9, must be ≥ startLevel (default 3)
 *   onComplete()        — called when player reaches targetLevel
 *   preview             — if true, renders a static preview only
 */

/* ─── Lightweight particles for the cartridge background ── */
function ParticlesBG() {
  const particles = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${8 + Math.random() * 12}s`,
      delay: `${Math.random() * 10}s`,
      size: `${1 + Math.random() * 2}px`,
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

/* ─── Flag toggle button ──────────────────────────────── */
function FlagToggle({ localeKey, onToggle }) {
  const locale = LOCALES[localeKey];
  return (
    <motion.button
      className="flag-toggle"
      onClick={onToggle}
      whileTap={{ scale: 0.85 }}
      title={`${locale.acronym} (${localeKey})`}
    >
      <span className="flag-emoji">{locale.flag}</span>
    </motion.button>
  );
}

/* ─── Start screen shown before play ──────────────────── */
function StartScreen({ onStart, localeKey, onToggleLocale }) {
  const locale = LOCALES[localeKey];
  const letters = locale.letters || locale.acronym.split('');
  const buttonConfigs = locale.buttons;

  const letterColors = letters.map((letter, i) => {
    const btn = buttonConfigs[i];
    return { letter, color: btn ? btn.color : '#8b5cf6' };
  });

  return (
    <motion.div
      className="start-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      <FlagToggle localeKey={localeKey} onToggle={onToggleLocale} />

      <motion.h1
        className="start-title"
        key={locale.acronym}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
      >
        {locale.title}
      </motion.h1>

      <div className="start-letters">
        {letterColors.map((l, i) => (
          <motion.div
            key={`${localeKey}-${l.letter}-${i}`}
            className="start-letter"
            style={{
              background: l.color + '15',
              borderColor: l.color + '55',
              color: l.color,
            }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 200 }}
          >
            {l.letter}
          </motion.div>
        ))}
      </div>

      <motion.p
        className="start-subtitle"
        key={`sub-${localeKey}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {locale.subtitle}
      </motion.p>

      <motion.button
        className="start-btn"
        onClick={() => { unlockAudio(); onStart(); }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 150 }}
        whileTap={{ scale: 0.95 }}
      >
        {locale.play}
      </motion.button>
    </motion.div>
  );
}

/* ─── Game Over screen ────────────────────────────────── */
function GameOverScreen({ score, level, onRestart, locale }) {
  return (
    <motion.div
      className="start-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.h2
        style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #ef4444, #f97316)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
      >
        {locale.gameOver}
      </motion.h2>

      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '1rem' }}>
        <p>{locale.score}: <span style={{ color: '#fff', fontWeight: 700 }}>{score}</span></p>
        <p>{locale.level}: <span style={{ color: '#fff', fontWeight: 700 }}>{level}</span></p>
      </div>

      <motion.button
        className="start-btn"
        onClick={() => { unlockAudio(); onRestart(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.95 }}
      >
        {locale.playAgain}
      </motion.button>
    </motion.div>
  );
}

/* ─── Static preview for the editor canvas ────────────── */
function PreviewCard({ localeKey }) {
  const locale = LOCALES[localeKey];
  const letters = locale.letters || locale.acronym.split('');
  const buttonConfigs = locale.buttons;

  return (
    <div className="pemdas-cartridge" style={{ pointerEvents: 'none' }}>
      <ParticlesBG />
      <div className="start-screen" style={{ gap: '1rem' }}>
        <h1
          className="start-title"
          style={{ fontSize: '2rem' }}
        >
          {locale.title}
        </h1>
        <div className="start-letters">
          {letters.map((letter, i) => {
            const btn = buttonConfigs[i];
            const color = btn ? btn.color : '#8b5cf6';
            return (
              <div
                key={`preview-${letter}-${i}`}
                className="start-letter"
                style={{
                  background: color + '15',
                  borderColor: color + '55',
                  color: color,
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>
        <p className="start-subtitle" style={{ fontSize: '0.8rem' }}>
          {locale.subtitle}
        </p>
      </div>
    </div>
  );
}

/* ─── Default secret menu settings (disabled in cartridge) */
const DEFAULT_SETTINGS = {
  speedMult: 1.0,
  fruitMode: false,
  difficulty: null,
};

/* ═══════════════════════════════════════════════════════════
   Main Cartridge Component
   ═══════════════════════════════════════════════════════════ */
export default function PEMDASCartridge({ config = {}, onComplete, preview = false }) {
  const {
    locale: configLocale = 'US',
    startLevel = 1,
    targetLevel = 3,
  } = config;

  const [screen, setScreen] = useState('start');
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [localeKey, setLocaleKey] = useState(configLocale);

  const locale = LOCALES[localeKey] || LOCALES['US'];

  const toggleLocale = useCallback(() => {
    setLocaleKey(prev => {
      const idx = LOCALE_ORDER.indexOf(prev);
      return LOCALE_ORDER[(idx + 1) % LOCALE_ORDER.length];
    });
  }, []);

  const handleGameOver = useCallback((score, level) => {
    setFinalScore(score);
    setFinalLevel(level);

    // If the player reached the target level, call onComplete
    if (level >= targetLevel && onComplete) {
      onComplete();
    } else {
      setScreen('gameOver');
    }
  }, [targetLevel, onComplete]);

  const handleRestart = useCallback(() => {
    setScreen('game');
  }, []);

  // Preview mode — static display for editor canvas
  if (preview) {
    return <PreviewCard localeKey={configLocale} />;
  }

  return (
    <div className="pemdas-cartridge">
      <ParticlesBG />
      <AnimatePresence mode="wait">
        {screen === 'start' && (
          <StartScreen
            key="start"
            onStart={() => setScreen('game')}
            localeKey={localeKey}
            onToggleLocale={toggleLocale}
          />
        )}
        {screen === 'game' && (
          <motion.div
            key={`game-${localeKey}`}
            style={{ height: '100%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameScreen
              onGameOver={handleGameOver}
              locale={locale}
              secretSettings={DEFAULT_SETTINGS}
            />
          </motion.div>
        )}
        {screen === 'gameOver' && (
          <GameOverScreen
            key="gameover"
            score={finalScore}
            level={finalLevel}
            onRestart={handleRestart}
            locale={locale}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
