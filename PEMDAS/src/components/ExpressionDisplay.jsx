import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { astToTokens, getNodeIdsInScope, findNodeById } from '../game/ExpressionEngine';

/**
 * ExpressionDisplay.jsx
 *
 * Renders the AST as styled tokens.
 * Handles: scope highlighting, flash red/green, merge animation, canvas-drawn arrow hint.
 */

function ArrowCanvas({ visible }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const arrowLen = 30;
    const headSize = 8;
    const yMid = H / 2;
    const pad = 16;
    const travelDist = W - pad * 2 - arrowLen;

    let start = null;
    const duration = 1800; // ms for a full sweep

    function draw(ts) {
      if (!start) start = ts;
      const elapsed = (ts - start) % duration;
      const t = elapsed / duration; // 0..1

      ctx.clearRect(0, 0, W, H);

      // Current arrow x (tip position)
      const tipX = pad + arrowLen + t * travelDist;
      const tailX = tipX - arrowLen;

      // Glow trail
      const trailGrad = ctx.createLinearGradient(pad, 0, tipX, 0);
      trailGrad.addColorStop(0, 'rgba(139, 92, 246, 0)');
      trailGrad.addColorStop(Math.max(0, (tailX - pad) / (tipX - pad) - 0.1), 'rgba(139, 92, 246, 0)');
      trailGrad.addColorStop(1, 'rgba(139, 92, 246, 0.25)');

      ctx.beginPath();
      ctx.moveTo(pad, yMid);
      ctx.lineTo(tipX - headSize, yMid);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arrow body (brighter)
      const bodyGrad = ctx.createLinearGradient(tailX, 0, tipX, 0);
      bodyGrad.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
      bodyGrad.addColorStop(1, 'rgba(139, 92, 246, 0.9)');

      ctx.beginPath();
      ctx.moveTo(tailX, yMid);
      ctx.lineTo(tipX - headSize, yMid);
      ctx.strokeStyle = bodyGrad;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(tipX, yMid);
      ctx.lineTo(tipX - headSize, yMid - headSize * 0.7);
      ctx.lineTo(tipX - headSize, yMid + headSize * 0.7);
      ctx.closePath();
      ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
      ctx.fill();

      // Glow around arrowhead
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(tipX, yMid, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#8b5cf6';
      ctx.fill();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="arrow-canvas"
      style={{ width: '100%', height: '24px', display: 'block', marginTop: '6px' }}
    />
  );
}

export default function ExpressionDisplay({
  ast,
  selectedScopeId,
  flashIds,          // { nodeIds: [...], color: 'green' | 'red' }
  mergeInfo,         // { nodeId, resultValue } - the node being merged
  showArrow,
  fallProgress,      // 0..1, how far the expression has fallen
}) {
  const tokens = useMemo(() => ast ? astToTokens(ast) : [], [ast]);

  // Get IDs in the selected scope for highlighting
  const scopeIds = useMemo(() => {
    if (selectedScopeId === null || !ast) return null;
    const scopeNode = findNodeById(ast, selectedScopeId);
    if (!scopeNode) return null;
    return new Set(getNodeIdsInScope(scopeNode));
  }, [ast, selectedScopeId]);

  // Flash set
  const flashSet = useMemo(() => {
    if (!flashIds || !flashIds.nodeIds) return null;
    return new Set(flashIds.nodeIds);
  }, [flashIds]);

  const flashColor = flashIds?.color || null;

  return (
    <div className="expression-area">
      <motion.div
        className="expression-container"
        style={{ top: `${fallProgress * 100}%` }}
      >
        <div className="expression-tokens">
          <AnimatePresence mode="popLayout">
            {tokens.map((token, idx) => {
              const isInScope = scopeIds ? scopeIds.has(token.nodeId) : true;
              const isFlashing = flashSet ? flashSet.has(token.nodeId) : false;
              const isMerging = mergeInfo && mergeInfo.nodeId === token.nodeId;

              let className = 'token';
              if (token.type === 'number') className += ' token-number';
              else if (token.type === 'op') className += ' token-op';
              else if (token.type === 'paren') className += ' token-paren';

              if (!isInScope) className += ' token-dimmed';
              if (isFlashing && flashColor === 'green') className += ' token-flash-green';
              if (isFlashing && flashColor === 'red') className += ' token-flash-red';

              // Display value - add spaces around operators
              let display = token.value;
              if (token.type === 'op') {
                display = ` ${token.value} `;
              }
              // Use × for multiplication, ÷ for division
              if (token.value === '*') display = ' × ';
              if (token.value === '/') display = ' ÷ ';

              return (
                <motion.span
                  key={`${token.nodeId}-${idx}`}
                  className={className}
                  layout
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{
                    opacity: isMerging ? 0 : 1,
                    scale: isMerging ? 0 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {display}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Canvas-drawn animated arrow hint */}
        <ArrowCanvas visible={showArrow} />
      </motion.div>
    </div>
  );
}

