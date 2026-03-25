import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameScreen from './components/GameScreen';
import SecretMenu from './components/SecretMenu';
import { unlockAudio } from './game/SoundManager';
import { LOCALES, LOCALE_ORDER } from './game/locales';

function ParticlesBG() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }).map((_, i) => ({
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

function FlagToggle({ localeKey, onToggle }) {
  const locale = LOCALES[localeKey];
  return (
    <motion.button
      className="flag-toggle"
      onClick={onToggle}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.1 }}
      title={`${locale.acronym} (${localeKey})`}
    >
      <span className="flag-emoji">{locale.flag}</span>
    </motion.button>
  );
}

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

function GameOverScreen({ score, level, onRestart, locale }) {
  return (
    <motion.div
      className="start-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.h2
        style={{
          fontSize: '3rem',
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

      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '1.2rem' }}>
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

// ─── Default secret menu settings ────────────────────────────
const DEFAULT_SETTINGS = {
  speedMult: 1.0,      // 1.0 = default speed
  fruitMode: false,
  difficulty: null,     // null = normal game, 0-3 = test presets
};

export default function App() {
  const [screen, setScreen] = useState('start');
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [localeKey, setLocaleKey] = useState('US');
  const [showSecretMenu, setShowSecretMenu] = useState(false);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

  // Double-W detection
  const lastWRef = useRef(0);

  const locale = LOCALES[localeKey];

  const toggleLocale = () => {
    setLocaleKey(prev => {
      const idx = LOCALE_ORDER.indexOf(prev);
      return LOCALE_ORDER[(idx + 1) % LOCALE_ORDER.length];
    });
  };

  const handleGameOver = (score, level) => {
    setFinalScore(score);
    setFinalLevel(level);
    setScreen('gameOver');
  };

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Global keyboard handler for double-W and secret menu controls
  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toUpperCase();

      // Escape closes secret menu
      if (e.key === 'Escape' && showSecretMenu) {
        setShowSecretMenu(false);
        return;
      }

      // Double-W detection
      if (key === 'W') {
        const now = Date.now();
        if (now - lastWRef.current < 500) {
          setShowSecretMenu(prev => !prev);
          lastWRef.current = 0;
        } else {
          lastWRef.current = now;
        }
        return;
      }

      // Secret menu controls (only when menu is visible)
      if (!showSecretMenu) return;

      if (key === 'F') {
        e.preventDefault();
        setSettings(prev => ({ ...prev, fruitMode: !prev.fruitMode }));
      } else if (key === 'R') {
        e.preventDefault();
        setSettings(prev => {
          const next = prev.difficulty === null ? 0 : (prev.difficulty + 1) % 4;
          return { ...prev, difficulty: next };
        });
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setSettings(prev => ({ ...prev, speedMult: Math.min(3, prev.speedMult + 0.1) }));
      } else if (e.key === '-') {
        e.preventDefault();
        setSettings(prev => ({ ...prev, speedMult: Math.max(0.2, prev.speedMult - 0.1) }));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSecretMenu]);

  return (
    <>
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
              onGameOver={(score, level) => handleGameOver(score, level)}
              locale={locale}
              secretSettings={settings}
            />
          </motion.div>
        )}
        {screen === 'gameOver' && (
          <GameOverScreen
            key="gameover"
            score={finalScore}
            level={finalLevel}
            onRestart={() => setScreen('game')}
            locale={locale}
          />
        )}
      </AnimatePresence>

      {/* Secret Menu Overlay */}
      <AnimatePresence>
        {showSecretMenu && (
          <SecretMenu
            settings={settings}
            onUpdate={updateSettings}
            onClose={() => setShowSecretMenu(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
