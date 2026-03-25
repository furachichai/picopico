import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * HUD.jsx
 * Top bar: Score (left), Progress bar (center), Lives/hearts (right).
 */

export default function HUD({ score, lives, maxLives, level, progress, locale }) {
  return (
    <div className="hud">
      <div className="hud-score">
        <span className="hud-label">{locale?.score || 'SCORE'}</span>
        <motion.span
          key={score}
          className="hud-value"
          initial={{ scale: 1.4, color: '#8b5cf6' }}
          animate={{ scale: 1, color: '#ffffff' }}
          transition={{ duration: 0.3 }}
        >
          {score}
        </motion.span>
      </div>

      <div className="hud-progress">
        <span className="hud-label">{locale?.level || 'LEVEL'} {level}</span>
        <div className="progress-bar-track">
          <motion.div
            className="progress-bar-fill"
            initial={false}
            animate={{ width: `${Math.min(progress * 100, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="hud-lives">
        {Array.from({ length: maxLives }).map((_, i) => (
          <AnimatePresence key={i} mode="wait">
            {i < lives ? (
              <motion.span
                key={`heart-${i}-full`}
                className="heart full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0, rotate: -30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                ❤️
              </motion.span>
            ) : (
              <motion.span
                key={`heart-${i}-empty`}
                className="heart empty"
                initial={{ scale: 0 }}
                animate={{ scale: 1, opacity: 0.3 }}
              >
                🖤
              </motion.span>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
}
