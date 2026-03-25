import React from 'react';
import { motion } from 'framer-motion';

/**
 * ControlPanel.jsx
 *
 * 6 large, touch-friendly PEMDAS buttons at the bottom of the screen.
 * Button labels come from the active locale.
 */

export default function ControlPanel({ buttons, onButtonPress, disabled }) {
  return (
    <div className="control-panel">
      <div className="control-grid">
        {buttons.map(btn => (
          <motion.button
            key={btn.key}
            className="pemdas-btn"
            style={{
              '--btn-color': btn.color,
              '--btn-bg': btn.color + '22',
              '--btn-border': btn.color + '66',
            }}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => !disabled && onButtonPress(btn.key)}
            disabled={disabled}
          >
            <span className={`btn-symbol${btn.smallLabel ? ' btn-symbol-sm' : ''}`}>{btn.label}</span>
            <span className="btn-key">{btn.key}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
