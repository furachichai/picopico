import React from 'react';
import { motion } from 'framer-motion';

/**
 * HUD.jsx
 * Top bar: Score (left), Potiondas-style Progress bar (right). No hearts/lives.
 */

export default function HUD({ score, level, progress, totalLevels = 9, locale }) {
  return (
    <div className="hud" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.4rem 0.3rem', position: 'relative' }}>
      <div className="hud-score" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

      <div className="hud-progress" style={{ 
        position: 'absolute',
        top: '68px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Potiondas-style progress bar */}
        <div style={{
          position: 'relative',
          width: `${totalLevels * 12}px`,
          maxWidth: '176px',
          height: '16px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.2)',
          border: '2px solid rgba(255,255,255,0.5)',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
          flexShrink: 0
        }}>
          <motion.div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #34D399, #10B981)',
              boxShadow: '0 0 8px #34D399'
            }}
            initial={false}
            animate={{ width: `${Math.min(progress * 100, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Glossy overlay for glass effect */}
          <div style={{
            position: 'absolute',
            top: '1px',
            left: '2px',
            right: '2px',
            height: '4px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0))',
            borderRadius: '10px',
            pointerEvents: 'none'
          }} />
        </div>
      </div>
    </div>
  );
}
