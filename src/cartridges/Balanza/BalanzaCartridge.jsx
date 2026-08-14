import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  makeTerm,
  combineTerms,
  areLikeTerms,
  formatTerm,
  parseBalanzaExpression,
  parseWeights,
  parseMenuInventory,
  plateTotal,
  plateDelta,
  nearlyEqual,
  computeTiltAngle,
  buildEquationLineText,
} from './game/BalanzaEngine';
import { unlockAudio, playSelect, playMerge, playWrong } from '../AlgeBros/game/AlgeBrosSoundManager';
import './BalanzaCartridge.css';

const HIT_PADDING = 26;

// Move categories. A PRESERVING move (merge / decompose / transpose) is a pure
// rearrangement and must never change plateDelta — so the beam never moves for one.
// A CHANGING move (supply menu add / remove) deliberately alters the balance.
const MOVE_PRESERVING = 'preserving';
const MOVE_CHANGING = 'changing';

function rectContainsPoint(rect, x, y, padding = 0) {
  if (!rect) return false;
  return x >= rect.left - padding && x <= rect.right + padding &&
         y >= rect.top - padding && y <= rect.bottom + padding;
}

function TileGlyph({ term }) {
  const isNeg = term.coeff < 0;
  const isZero = term.coeff === 0;
  const formatted = formatTerm(term, true);
  const text = (formatted.sign === '-' ? '-' : '') + formatted.value;
  return (
    <div className={`balanza-tile-card ${isNeg ? 'is-negative' : ''} ${isZero ? 'is-zero' : ''}`}>
      <span className="balanza-tile-text">{text}</span>
    </div>
  );
}

function PlateTile({ term, side, isLocked, showZeroTiles, onDragStart, onDrag, onDragEnd, onTap, isDragging, cartridgeRef }) {
  const isZero = term.coeff === 0;
  const disabled = isZero || isLocked;
  if (isZero && !showZeroTiles) return null;
  return (
    <motion.div
      className={`balanza-tile ${isZero ? 'is-zero' : ''} ${isLocked ? 'is-locked' : ''}`}
      data-term-id={term.id}
      drag={!disabled}
      dragConstraints={cartridgeRef}
      dragElastic={0.15}
      dragSnapToOrigin
      whileDrag={disabled ? {} : { scale: 1.08 }}
      onDragStart={(e, info) => !disabled && onDragStart(e, info, { origin: side, termId: term.id })}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onTap={() => !disabled && onTap(side, term.id)}
      style={{ opacity: isDragging === term.id ? 0 : 1, touchAction: disabled ? 'auto' : 'none' }}
    >
      <TileGlyph term={term} />
    </motion.div>
  );
}

function MenuTile({ item, cartridgeRef, isDragging, onDragStart, onDrag, onDragEnd }) {
  const disabled = item.available <= 0;
  const previewTerm = makeTerm(item.unitCoeff, item.variable);
  return (
    <motion.div
      className={`balanza-menu-tile ${disabled ? 'is-empty' : ''}`}
      drag={!disabled}
      dragConstraints={cartridgeRef}
      dragElastic={0.15}
      dragSnapToOrigin
      whileDrag={disabled ? {} : { scale: 1.08 }}
      onDragStart={(e, info) => !disabled && onDragStart(e, info, { origin: 'menu', key: item.key, variable: item.variable, unitCoeff: item.unitCoeff })}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      style={{
        opacity: isDragging === `menu-${item.key}` ? 0 : disabled ? 0.35 : 1,
        filter: disabled ? 'grayscale(100%)' : 'none',
        pointerEvents: disabled ? 'none' : 'auto',
        touchAction: 'none'
      }}
    >
      <span className="balanza-menu-tile-glyph">{previewTerm.variable ?? previewTerm.coeff}</span>
      {item.available >= 2 && <span className="balanza-menu-tile-count">×{item.available}</span>}
    </motion.div>
  );
}

export default function BalanzaCartridge({ config = {}, onComplete, preview = false }) {
  const weights = useMemo(() => parseWeights(config.weightsText), [config.weightsText]);
  const showZeroTiles = !!config.showZeroTiles;
  const freeMovement = config.freeMovement !== false && config.allowFreeMovement !== false;
  const showEquation = config.showEquation !== false;

  const isLeftLocked = useMemo(() => !!(config.lockLeftPlate || config.leftPlateLocked || config.lockedPlate === 'left'), [config]);
  const isRightLocked = useMemo(() => !!(config.lockRightPlate || config.rightPlateLocked || config.lockedPlate === 'right'), [config]);
  const isSideLocked = (side) => (side === 'left' ? isLeftLocked : side === 'right' ? isRightLocked : false);

  const [leftPlate, setLeftPlate] = useState(() => parseBalanzaExpression(config.leftPlateText));
  const [rightPlate, setRightPlate] = useState(() => parseBalanzaExpression(config.rightPlateText));
  const [menuItems, setMenuItems] = useState(() => parseMenuInventory(config.menuText));

  const [hasInteracted, setHasInteracted] = useState(false);
  const hasCompletedRef = useRef(false);
  const hasFiredConfettiRef = useRef(false);
  const [moveFlash, setMoveFlash] = useState(null); // { category, side, nonce }
  const moveNonceRef = useRef(0);

  const [draggingKey, setDraggingKey] = useState(null);
  const [dragOverlayTerm, setDragOverlayTerm] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const dragSourceRef = useRef(null);

  const cartridgeRef = useRef(null);
  const leftPlateRef = useRef(null);
  const rightPlateRef = useRef(null);
  const menuRef = useRef(null);

  const leftTotal = useMemo(() => plateTotal(leftPlate, weights), [leftPlate, weights]);
  const rightTotal = useMemo(() => plateTotal(rightPlate, weights), [rightPlate, weights]);
  const tiltAngle = useMemo(() => computeTiltAngle(leftTotal, rightTotal), [leftTotal, rightTotal]);
  const equationLineText = useMemo(() => buildEquationLineText(leftPlate, rightPlate), [leftPlate, rightPlate]);

  useEffect(() => {
    if (preview) return;
    if (!hasInteracted || hasCompletedRef.current) return;
    if (leftPlate.length === 0 || rightPlate.length === 0) return;
    if (!nearlyEqual(leftTotal, rightTotal)) return;
    hasCompletedRef.current = true;
    onComplete?.();
  }, [preview, hasInteracted, leftTotal, rightTotal, leftPlate.length, rightPlate.length, onComplete]);

  useEffect(() => {
    if (preview) return;
    if (!hasInteracted) {
      hasFiredConfettiRef.current = false;
      return;
    }
    const isBalanced = nearlyEqual(leftTotal, rightTotal);
    if (isBalanced && !hasFiredConfettiRef.current) {
      hasFiredConfettiRef.current = true;
      if (config.confetti !== false) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } else if (!isBalanced) {
      hasFiredConfettiRef.current = false;
    }
  }, [preview, hasInteracted, leftTotal, rightTotal, config.confetti]);

  useEffect(() => {
    if (!moveFlash) return;
    const timer = setTimeout(() => setMoveFlash(null), 450);
    return () => clearTimeout(timer);
  }, [moveFlash]);

  if (preview) {
    return (
      <div className="balanza-cartridge" style={{ pointerEvents: 'none' }}>
        <div className="balanza-header-area">
          <div className="balanza-top-row"></div>
          {showEquation && <div className="balanza-equation-line">{equationLineText}</div>}
        </div>
        <Scale
          tiltAngle={tiltAngle}
          leftPlate={leftPlate}
          rightPlate={rightPlate}
          isLeftLocked={isLeftLocked}
          isRightLocked={isRightLocked}
          showZeroTiles={showZeroTiles}
          draggingKey={null}
          cartridgeRef={cartridgeRef}
          leftPlateRef={leftPlateRef}
          rightPlateRef={rightPlateRef}
          noop
        />
      </div>
    );
  }

  const plateArrayForSide = (side) => (side === 'left' ? leftPlate : rightPlate);
  const plateRefForSide = (side) => (side === 'left' ? leftPlateRef : rightPlateRef);

  const applyZeroFilter = (terms) => (showZeroTiles ? terms : terms.filter(t => t.coeff !== 0));

  function mergeOrAddToPlate(terms, incoming, collisionId) {
    if (collisionId) {
      const idx = terms.findIndex(t => t.id === collisionId);
      if (idx !== -1 && areLikeTerms(terms[idx], incoming)) {
        const merged = combineTerms(terms[idx], incoming);
        const next = [...terms];
        next.splice(idx, 1, merged);
        return applyZeroFilter(next);
      }
    }
    return applyZeroFilter([...terms, incoming]);
  }

  function resolveDropZone(x, y) {
    if (rectContainsPoint(leftPlateRef.current?.getBoundingClientRect(), x, y, HIT_PADDING)) return 'left';
    if (rectContainsPoint(rightPlateRef.current?.getBoundingClientRect(), x, y, HIT_PADDING)) return 'right';
    if (rectContainsPoint(menuRef.current?.getBoundingClientRect(), x, y, HIT_PADDING)) return 'menu';
    return null;
  }

  function findCollisionTermId(side, x, y, excludeTermId) {
    const container = plateRefForSide(side).current;
    if (!container) return null;
    const cardEls = container.querySelectorAll('[data-term-id]');
    for (const el of cardEls) {
      const id = el.getAttribute('data-term-id');
      if (id === excludeTermId) continue;
      const rect = el.getBoundingClientRect();
      if (rectContainsPoint(rect, x, y, 12)) return id;
    }
    return null;
  }

  function findMenuRowIndexForTerm(term) {
    return menuItems.findIndex(m => (
      term.variable === null
        ? m.variable === null && m.unitCoeff === Math.abs(term.coeff)
        : m.variable === term.variable
    ));
  }

  const handleRestart = () => {
    setLeftPlate(parseBalanzaExpression(config.leftPlateText));
    setRightPlate(parseBalanzaExpression(config.rightPlateText));
    setMenuItems(parseMenuInventory(config.menuText));
    setHasInteracted(false);
    setMoveFlash(null);
    hasCompletedRef.current = false;
  };

  const withSide = (side, terms) => ({
    left: side === 'left' ? terms : leftPlate,
    right: side === 'left' ? rightPlate : terms,
    menu: menuItems,
  });

  const commitMove = (next, category, flashSide = null) => {
    const before = plateDelta(leftPlate, rightPlate, weights);
    const after = plateDelta(next.left, next.right, weights);

    if (category === MOVE_PRESERVING && !nearlyEqual(before, after)) {
      console.error('[Balanza] Rejected move: a rearrangement changed the balance.', {
        deltaBefore: before,
        deltaAfter: after,
        before: { left: leftPlate, right: rightPlate },
        after: { left: next.left, right: next.right },
      });
      unlockAudio();
      playWrong();
      setMoveFlash({ category: 'rejected', side: flashSide, nonce: ++moveNonceRef.current });
      return false;
    }

    setLeftPlate(next.left);
    setRightPlate(next.right);
    if (next.menu) setMenuItems(next.menu);
    setHasInteracted(true);
    unlockAudio();
    if (category === MOVE_PRESERVING) playSelect(); else playMerge();
    setMoveFlash({ category, side: flashSide, nonce: ++moveNonceRef.current });
    return true;
  };

  const handleTileTap = (side, termId) => {
    if (isSideLocked(side)) return;
    const terms = plateArrayForSide(side);
    const term = terms.find(t => t.id === termId);
    if (!term || term.variable === null || Math.abs(term.coeff) <= 1) return;
    const unitSign = term.coeff < 0 ? -1 : 1;
    const count = Math.abs(term.coeff);
    const units = Array.from({ length: count }, () => makeTerm(unitSign, term.variable));
    const idx = terms.findIndex(t => t.id === termId);
    if (idx === -1) return;
    const nextTerms = [...terms];
    nextTerms.splice(idx, 1, ...units);
    commitMove(withSide(side, nextTerms), MOVE_PRESERVING, side);
  };

  const handleTileDragStart = (e, info, source) => {
    if (source.origin !== 'menu' && isSideLocked(source.origin)) return;
    setIsDraggingItem(true);
    dragSourceRef.current = source;
    const overlay = source.origin === 'menu'
      ? makeTerm(source.unitCoeff, source.variable)
      : plateArrayForSide(source.origin).find(t => t.id === source.termId);
    setDragOverlayTerm(overlay || null);
    setDraggingKey(source.origin === 'menu' ? `menu-${source.key}` : source.termId);
    if (info?.point) setDragPos(info.point);
  };

  const handleTileDrag = (e, info) => {
    setDragPos(info.point);
  };

  const handleTileDragEnd = (e, info) => {
    const source = dragSourceRef.current;
    setIsDraggingItem(false);
    setDraggingKey(null);
    setDragOverlayTerm(null);
    dragSourceRef.current = null;
    if (!source) return;

    const zone = resolveDropZone(info.point.x, info.point.y);
    if (!zone) return;

    // If target zone is a locked plate, reject move (flies back to origin)
    if ((zone === 'left' || zone === 'right') && isSideLocked(zone)) {
      unlockAudio();
      playWrong();
      setMoveFlash({ category: 'rejected', side: zone, nonce: ++moveNonceRef.current });
      return;
    }

    // Supply menu -> plate. Deliberately CHANGES the balance.
    if (source.origin === 'menu') {
      if (zone === 'menu') return;
      const menuItem = menuItems.find(m => m.key === source.key);
      if (!menuItem || menuItem.available <= 0) return;
      const collisionId = findCollisionTermId(zone, info.point.x, info.point.y, null);
      const incoming = makeTerm(menuItem.unitCoeff, menuItem.variable);
      const nextPlate = mergeOrAddToPlate(plateArrayForSide(zone), incoming, collisionId);
      const nextMenu = menuItems.map(m => (m.key === source.key ? { ...m, available: m.available - 1 } : m));
      commitMove({ ...withSide(zone, nextPlate), menu: nextMenu }, MOVE_CHANGING, zone);
      return;
    }

    const sourceSide = source.origin;
    const term = plateArrayForSide(sourceSide).find(t => t.id === source.termId);
    if (!term) return;

    // Plate -> supply menu. Deliberately CHANGES the balance.
    if (zone === 'menu') {
      const menuIdx = findMenuRowIndexForTerm(term);
      if (menuIdx === -1) return;
      const nextPlate = applyZeroFilter(plateArrayForSide(sourceSide).filter(t => t.id !== term.id));
      const nextMenu = menuItems.map((m, i) => (
        i === menuIdx ? { ...m, available: m.available + Math.abs(term.coeff) } : m
      ));
      commitMove({ ...withSide(sourceSide, nextPlate), menu: nextMenu }, MOVE_CHANGING, sourceSide);
      return;
    }

    // Same-plate merge onto a matching tile. PRESERVING (coeffs just add).
    if (zone === sourceSide) {
      const collisionId = findCollisionTermId(zone, info.point.x, info.point.y, term.id);
      if (!collisionId) return;
      const terms = plateArrayForSide(sourceSide);
      const targetIdx = terms.findIndex(t => t.id === collisionId);
      if (targetIdx === -1 || !areLikeTerms(terms[targetIdx], term)) return;
      const merged = combineTerms(terms[targetIdx], term);
      const nextTerms = terms.filter(t => t.id !== term.id);
      const mergeIdx = nextTerms.findIndex(t => t.id === collisionId);
      nextTerms.splice(mergeIdx, 1, merged);
      commitMove(withSide(sourceSide, applyZeroFilter(nextTerms)), MOVE_PRESERVING, sourceSide);
      return;
    }

    // Cross-plate move: if freeMovement is enabled (default), coefficient is unchanged (MOVE_CHANGING).
    // If freeMovement is false, sign is inverted (-term.coeff) as algebraic transposition (MOVE_PRESERVING).
    const otherSide = zone;
    const targetCoeff = freeMovement ? term.coeff : -term.coeff;
    const targetTerm = makeTerm(targetCoeff, term.variable);
    const collisionId = findCollisionTermId(otherSide, info.point.x, info.point.y, null);
    const nextSource = applyZeroFilter(plateArrayForSide(sourceSide).filter(t => t.id !== term.id));
    const nextTarget = mergeOrAddToPlate(plateArrayForSide(otherSide), targetTerm, collisionId);
    const moveCategory = freeMovement ? MOVE_CHANGING : MOVE_PRESERVING;
    commitMove({
      left: sourceSide === 'left' ? nextSource : nextTarget,
      right: sourceSide === 'left' ? nextTarget : nextSource,
      menu: menuItems,
    }, moveCategory, otherSide);
  };

  return (
    <div ref={cartridgeRef} className="balanza-cartridge">
      <div className="balanza-header-area">
        <div className="balanza-top-row">
          <button className="balanza-restart-btn" onClick={handleRestart} title="Restart">↺</button>
        </div>
        {showEquation && (
          <div className={`balanza-equation-line ${moveFlash?.category === MOVE_PRESERVING ? 'is-rearranged' : ''}`}>
            {equationLineText}
          </div>
        )}
      </div>

      <Scale
        tiltAngle={tiltAngle}
        leftPlate={leftPlate}
        rightPlate={rightPlate}
        isLeftLocked={isLeftLocked}
        isRightLocked={isRightLocked}
        showZeroTiles={showZeroTiles}
        draggingKey={draggingKey}
        cartridgeRef={cartridgeRef}
        leftPlateRef={leftPlateRef}
        rightPlateRef={rightPlateRef}
        onDragStart={handleTileDragStart}
        onDrag={handleTileDrag}
        onDragEnd={handleTileDragEnd}
        onTileTap={handleTileTap}
        moveFlash={moveFlash}
      />

      <div ref={menuRef} className="balanza-menu">
        {menuItems.map(item => (
          <MenuTile
            key={item.key}
            item={item}
            cartridgeRef={cartridgeRef}
            isDragging={draggingKey}
            onDragStart={handleTileDragStart}
            onDrag={handleTileDrag}
            onDragEnd={handleTileDragEnd}
          />
        ))}
      </div>

      {isDraggingItem && dragOverlayTerm && createPortal(
        <div
          className="balanza-drag-overlay"
          style={{ position: 'fixed', left: dragPos.x, top: dragPos.y, transform: 'translate(-50%, -50%)', zIndex: 99999999, pointerEvents: 'none' }}
        >
          <TileGlyph term={dragOverlayTerm} />
        </div>,
        document.body
      )}
    </div>
  );
}

function Scale({ tiltAngle, leftPlate, rightPlate, isLeftLocked, isRightLocked, showZeroTiles, draggingKey, cartridgeRef, leftPlateRef, rightPlateRef, onDragStart, onDrag, onDragEnd, onTileTap, moveFlash }) {
  const noop = () => {};
  const flashClass = (side) => {
    if (!moveFlash || moveFlash.side !== side) return '';
    if (moveFlash.category === 'rejected') return 'is-rejected';
    if (moveFlash.category === MOVE_CHANGING) return 'is-weight-changed';
    return '';
  };

  return (
    <div className="balanza-scale-wrap">
      <div className="balanza-scale-assembly">
        <img
          className="balanza-base-img"
          src="/assets/balanza/base.png"
          alt="Scale Stand"
          draggable={false}
        />

        <div
          className="balanza-beam-wrap"
          style={{ transform: `translate(-49.5%, -61.5%) rotate(${tiltAngle}deg)` }}
        >
          <img
            className="balanza-beam-img"
            src="/assets/balanza/beam.png"
            alt="Scale Beam"
            draggable={false}
          />

          <div
            className={`balanza-plate-assembly balanza-plate-assembly-left ${isLeftLocked ? 'is-locked-plate' : ''}`}
            style={{ transform: `translate(-49.5%, -70%) rotate(${-tiltAngle}deg)` }}
          >
            {isLeftLocked && (
              <div className="balanza-plate-lock-badge" title="Plate is locked">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            )}
            <div ref={leftPlateRef} className={`balanza-plate-items ${flashClass('left')}`}>
              {leftPlate.map(term => (
                <PlateTile
                  key={term.id}
                  term={term}
                  side="left"
                  isLocked={isLeftLocked}
                  showZeroTiles={showZeroTiles}
                  isDragging={draggingKey}
                  cartridgeRef={cartridgeRef}
                  onDragStart={onDragStart || noop}
                  onDrag={onDrag || noop}
                  onDragEnd={onDragEnd || noop}
                  onTap={onTileTap || noop}
                />
              ))}
            </div>
            <img
              className="balanza-plate-img"
              src="/assets/balanza/plate.png"
              alt="Left Pan"
              draggable={false}
            />
          </div>

          <div
            className={`balanza-plate-assembly balanza-plate-assembly-right ${isRightLocked ? 'is-locked-plate' : ''}`}
            style={{ transform: `translate(-49.5%, -70%) rotate(${-tiltAngle}deg)` }}
          >
            {isRightLocked && (
              <div className="balanza-plate-lock-badge" title="Plate is locked">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            )}
            <div ref={rightPlateRef} className={`balanza-plate-items ${flashClass('right')}`}>
              {rightPlate.map(term => (
                <PlateTile
                  key={term.id}
                  term={term}
                  side="right"
                  isLocked={isRightLocked}
                  showZeroTiles={showZeroTiles}
                  isDragging={draggingKey}
                  cartridgeRef={cartridgeRef}
                  onDragStart={onDragStart || noop}
                  onDrag={onDrag || noop}
                  onDragEnd={onDragEnd || noop}
                  onTap={onTileTap || noop}
                />
              ))}
            </div>
            <img
              className="balanza-plate-img"
              src="/assets/balanza/plate.png"
              alt="Right Pan"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
