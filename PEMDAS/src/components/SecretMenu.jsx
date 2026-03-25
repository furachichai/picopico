import React from 'react';
import { motion } from 'framer-motion';

/**
 * SecretMenu.jsx
 *
 * Hidden debug/test menu activated by pressing W twice.
 * Settings are ephemeral — lost on page reload.
 */

const DIFFICULTY_LABELS = [
  'Complex (all buttons)',
  'Arrow in parens',
  'Arrow full expression',
  'Exponents heavy',
];

export default function SecretMenu({ settings, onUpdate, onClose }) {
  return (
    <motion.div
      className="secret-menu-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="secret-menu">
        <h2 className="secret-menu-title">🔧 Secret Menu</h2>

        <div className="secret-menu-row">
          <span className="secret-menu-label">Fall Speed</span>
          <div className="secret-menu-controls">
            <button onClick={() => onUpdate({ speedMult: Math.max(0.2, settings.speedMult - 0.1) })}>−</button>
            <span className="secret-menu-value">{(settings.speedMult * 100).toFixed(0)}%</span>
            <button onClick={() => onUpdate({ speedMult: Math.min(3, settings.speedMult + 0.1) })}>+</button>
          </div>
          <span className="secret-menu-hint">[ + / − ]</span>
        </div>

        <div className="secret-menu-row">
          <span className="secret-menu-label">Fruit Mode</span>
          <span className="secret-menu-value">{settings.fruitMode ? '🍎 ON' : 'OFF'}</span>
          <span className="secret-menu-hint">[ F ]</span>
        </div>

        <div className="secret-menu-row">
          <span className="secret-menu-label">Difficulty</span>
          <span className="secret-menu-value">{DIFFICULTY_LABELS[settings.difficulty]}</span>
          <span className="secret-menu-hint">[ R ]</span>
        </div>

        <p className="secret-menu-footer">Press W W to return to game</p>
      </div>
    </motion.div>
  );
}
