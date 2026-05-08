import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { astToTokens, getNodeIdsInScope, findNodeById } from '../game/ExpressionEngine';

/**
 * ExpressionDisplay.jsx
 *
 * Renders the AST as styled tokens.
 * Handles: scope highlighting, flash red/green, merge animation, canvas-drawn arrow hint.
 */

function ArrowCanvas({ visible, leftOffset, arrowWidth }) {
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
    const W = arrowWidth || canvas.getBoundingClientRect().width;
    const H = 24;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const arrowLen = 30;
    const headSize = 8;
    const yMid = H / 2;
    const pad = 4;
    const travelDist = Math.max(W - pad * 2 - arrowLen, 10);

    let start = null;
    const duration = 900;

    function draw(ts) {
      if (!start) start = ts;
      const elapsed = (ts - start) % duration;
      const t = elapsed / duration;

      ctx.clearRect(0, 0, W, H);

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

      // Arrow body
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

      // Glow for the arrow head itself instead of a circle
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(tipX, yMid);
      ctx.lineTo(tipX - 6, yMid - 4);
      ctx.lineTo(tipX - 6, yMid + 4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(139, 92, 246, 0.9)'; // Use the same color as the arrowhead
      ctx.fill();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [visible, arrowWidth]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="arrow-canvas"
      style={{
        position: 'absolute',
        left: `${leftOffset || 0}px`,
        bottom: '2px',
        width: `${arrowWidth || 100}px`,
        height: '24px',
        display: 'block',
      }}
    />
  );
}

const FRUIT_MAP = ['🍇', '🍎', '🍊', '🍋', '🍌', '🍑', '🫐', '🍓', '🍒', '🥝'];

function toFruit(str) {
  return str.replace(/[0-9]/g, d => FRUIT_MAP[parseInt(d)]);
}

export default function ExpressionDisplay({
  ast,
  selectedScopeId,
  flashIds,
  mergeInfo,
  showArrow,
  arrowScopeId,
  fallProgress,
  levelComplete,
  fruitMode,
}) {
  const tokens = useMemo(() => ast ? astToTokens(ast) : [], [ast]);
  const tokensContainerRef = useRef(null);
  const tokenRefsMap = useRef({});

  // Arrow positioning
  const [arrowPos, setArrowPos] = useState({ left: 0, width: 0 });

  // Get IDs in the selected scope for highlighting
  const scopeIds = useMemo(() => {
    if (selectedScopeId === null || !ast) return null;
    const scopeNode = findNodeById(ast, selectedScopeId);
    if (!scopeNode) return null;
    return new Set(getNodeIdsInScope(scopeNode));
  }, [ast, selectedScopeId]);

  // Get IDs in the arrow scope
  const arrowScopeIds = useMemo(() => {
    if (!showArrow || !ast) return null;
    if (arrowScopeId === null) return null;
    const scopeNode = findNodeById(ast, arrowScopeId);
    if (!scopeNode) return null;
    return new Set(getNodeIdsInScope(scopeNode));
  }, [ast, showArrow, arrowScopeId]);

  // Measure scoped token positions for arrow
  useEffect(() => {
    if (!showArrow || !tokensContainerRef.current) return;

    const container = tokensContainerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Find the first and last token elements that belong to the arrow scope
    const tokenEls = container.querySelectorAll('.token');
    let minLeft = Infinity;
    let maxRight = -Infinity;
    let found = false;

    tokens.forEach((token, idx) => {
      const inArrowScope = arrowScopeIds ? arrowScopeIds.has(token.nodeId) : true;
      // Skip parenthesis characters themselves — arrow should only cover inner content
      const isParen = token.type === 'paren';
      if (inArrowScope && !isParen && tokenEls[idx]) {
        const rect = tokenEls[idx].getBoundingClientRect();
        minLeft = Math.min(minLeft, rect.left - containerRect.left);
        maxRight = Math.max(maxRight, rect.right - containerRect.left);
        found = true;
      }
    });

    if (found) {
      setArrowPos({ left: minLeft, width: maxRight - minLeft });
    } else {
      setArrowPos({ left: 0, width: containerRect.width });
    }
  }, [showArrow, arrowScopeIds, tokens]);

  // Flash set
  const flashSet = useMemo(() => {
    if (!flashIds || !flashIds.nodeIds) return null;
    return new Set(flashIds.nodeIds);
  }, [flashIds]);

  const flashColor = flashIds?.color || null;

  // Build token elements
  const tokenElements = tokens.map((token, idx) => {
    // Hidden tokens (the ^ operator) — skip rendering
    if (token.hidden) return null;

    const isInScope = scopeIds ? scopeIds.has(token.nodeId) : true;
    const isFlashing = flashSet ? flashSet.has(token.nodeId) : false;
    const isMerging = mergeInfo && mergeInfo.nodeId === token.nodeId;

    let className = 'token';
    if (token.superscript) className += ' token-superscript';
    else if (token.type === 'number') className += ' token-number';
    else if (token.type === 'op') className += ' token-op';
    else if (token.type === 'paren') className += ' token-paren';

    if (!isInScope) className += ' token-dimmed';
    if (isFlashing && flashColor === 'green') className += ' token-flash-green';
    if (isFlashing && flashColor === 'red') className += ' token-flash-red';

    let display = token.value;
    if (token.type === 'op') {
      display = ` ${token.value} `;
    }
    if (token.value === '*') display = ' × ';
    if (token.value === '/') display = ' ÷ ';

    // Fruit mode: replace digits with fruit emoji
    if (fruitMode && token.type === 'number') {
      display = toFruit(display);
    }

    return (
      <motion.span
        key={`${token.nodeId}-${idx}`}
        className={className}
        layout
        initial={{ opacity: 1, scale: 1 }}
        animate={{
          opacity: isMerging ? 0 : (levelComplete ? 0 : 1),
          scale: isMerging ? 0 : 1,
        }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.3 }}
      >
        {token.superscript ? <sup>{display}</sup> : display}
      </motion.span>
    );
  }).filter(Boolean);

  return (
    <div className="expression-area">
      <motion.div
        className="expression-container"
        style={{ top: `${fallProgress * 100}%`, position: 'relative' }}
      >
        <div className="expression-tokens" ref={tokensContainerRef} style={{ position: 'relative' }}>
          <AnimatePresence mode="popLayout">
            {tokenElements}
          </AnimatePresence>

          {/* Canvas-drawn animated arrow — positioned under the scoped tokens */}
          <ArrowCanvas
            visible={showArrow}
            leftOffset={arrowPos.left}
            arrowWidth={arrowPos.width}
          />
        </div>
      </motion.div>
    </div>
  );
}
