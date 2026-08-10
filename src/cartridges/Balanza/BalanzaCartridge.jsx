import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  makeTerm,
  combineTerms,
  areLikeTerms,
  formatTerm,
  parseBalanzaExpression,
  parseWeights,
  parseMenuInventory,
  plateTotal,
  computeTiltAngle,
  buildEquationLineText,
} from './game/BalanzaEngine';
import './BalanzaCartridge.css';

const HIT_PADDING = 26;

function rectContainsPoint(rect, x, y, padding = 0) {
  if (!rect) return false;
  return x >= rect.left - padding && x <= rect.right + padding &&
         y >= rect.top - padding && y <= rect.bottom + padding;
}

function TileGlyph({ term }) {
  const { sign, value } = formatTerm(term, true);
  return (
    <span className="balanza-tile-inner" style={{ filter: term.coeff < 0 ? 'invert(1)' : 'none' }}>
      {sign === '-' && <span className="balanza-tile-sign">-</span>}
      <span className="balanza-tile-value">{value}</span>
    </span>
  );
}

function PlateTile({ term, side, showZeroTiles, onDragStart, onDrag, onDragEnd, onTap, isDragging, cartridgeRef }) {
  const isZero = term.coeff === 0;
  if (isZero && !showZeroTiles) return null;
  return (
    <motion.div
      className={`balanza-tile ${isZero ? 'is-zero' : ''}`}
      data-term-id={term.id}
      drag={!isZero}
      dragConstraints={cartridgeRef}
      dragElastic={0.15}
      dragSnapToOrigin
      whileDrag={{ scale: 1.08 }}
      onDragStart={(e, info) => onDragStart(e, info, { origin: side, termId: term.id })}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onTap={() => onTap(side, term.id)}
      style={{ opacity: isDragging === term.id ? 0 : 1, touchAction: 'none' }}
    >
      <TileGlyph term={term} />
    </motion.div>
  );
}

function MenuTile({ item, onDragStart, onDrag, onDragEnd, isDragging, cartridgeRef }) {
  const disabled = item.available <= 0;
  const previewTerm = useMemo(() => makeTerm(item.unitCoeff, item.variable), [item.unitCoeff, item.variable]);
  return (
    <motion.div
      className={`balanza-menu-tile ${disabled ? 'is-empty' : ''}`}
      drag={!disabled}
      dragConstraints={cartridgeRef}
      dragElastic={0.15}
      dragSnapToOrigin
      whileDrag={{ scale: 1.08 }}
      onDragStart={(e, info) => onDragStart(e, info, { origin: 'menu', key: item.key, variable: item.variable, unitCoeff: item.unitCoeff })}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      style={{ opacity: isDragging === `menu-${item.key}` ? 0 : 1, touchAction: 'none' }}
    >
      <span className="balanza-menu-tile-glyph">{previewTerm.variable ?? previewTerm.coeff}</span>
      <span className="balanza-menu-tile-count">×{item.available}</span>
    </motion.div>
  );
}

export default function BalanzaCartridge({ config = {}, onComplete, preview = false }) {
  const weights = useMemo(() => parseWeights(config.weightsText), [config.weightsText]);
  const showZeroTiles = !!config.showZeroTiles;

  const [leftPlate, setLeftPlate] = useState(() => parseBalanzaExpression(config.leftPlateText));
  const [rightPlate, setRightPlate] = useState(() => parseBalanzaExpression(config.rightPlateText));
  const [menuItems, setMenuItems] = useState(() => parseMenuInventory(config.menuText));

  const [hasInteracted, setHasInteracted] = useState(false);
  const hasCompletedRef = useRef(false);

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
    if (leftTotal !== rightTotal) return;
    hasCompletedRef.current = true;
    onComplete?.();
  }, [preview, hasInteracted, leftTotal, rightTotal, leftPlate.length, rightPlate.length, onComplete]);

  if (preview) {
    return (
      <div className="balanza-cartridge" style={{ pointerEvents: 'none' }}>
        <div className="balanza-equation-line">{equationLineText}</div>
        <Scale
          tiltAngle={tiltAngle}
          leftPlate={leftPlate}
          rightPlate={rightPlate}
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
  const setPlateForSide = (side) => (side === 'left' ? setLeftPlate : setRightPlate);
  const plateRefForSide = (side) => (side === 'left' ? leftPlateRef : rightPlateRef);

  const applyZeroFilter = (terms) => (showZeroTiles ? terms : terms.filter(t => t.coeff !== 0));

  function mergeOrAddToPlate(terms, incoming, collisionTermId) {
    if (collisionTermId) {
      const idx = terms.findIndex(t => t.id === collisionTermId);
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
    hasCompletedRef.current = false;
  };

  const handleTileTap = (side, termId) => {
    const term = plateArrayForSide(side).find(t => t.id === termId);
    if (!term || term.variable === null || Math.abs(term.coeff) <= 1) return;
    const unitSign = term.coeff < 0 ? -1 : 1;
    const count = Math.abs(term.coeff);
    const units = Array.from({ length: count }, () => makeTerm(unitSign, term.variable));
    setPlateForSide(side)(prev => {
      const idx = prev.findIndex(t => t.id === termId);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1, ...units);
      return next;
    });
    setHasInteracted(true);
  };

  const handleTileDragStart = (e, info, source) => {
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

    if (source.origin === 'menu') {
      if (zone === 'menu') return;
      const menuItem = menuItems.find(m => m.key === source.key);
      if (!menuItem || menuItem.available <= 0) return;
      const collisionId = findCollisionTermId(zone, info.point.x, info.point.y, null);
      const incoming = makeTerm(menuItem.unitCoeff, menuItem.variable);
      setPlateForSide(zone)(prev => mergeOrAddToPlate(prev, incoming, collisionId));
      setMenuItems(prev => prev.map(m => (m.key === source.key ? { ...m, available: m.available - 1 } : m)));
      setHasInteracted(true);
      return;
    }

    const sourceSide = source.origin;
    const term = plateArrayForSide(sourceSide).find(t => t.id === source.termId);
    if (!term) return;

    if (zone === 'menu') {
      const menuIdx = findMenuRowIndexForTerm(term);
      if (menuIdx === -1) return;
      setPlateForSide(sourceSide)(prev => applyZeroFilter(prev.filter(t => t.id !== term.id)));
      setMenuItems(prev => prev.map((m, i) => (i === menuIdx ? { ...m, available: m.available + Math.abs(term.coeff) } : m)));
      setHasInteracted(true);
      return;
    }

    if (zone === sourceSide) {
      const collisionId = findCollisionTermId(zone, info.point.x, info.point.y, term.id);
      if (!collisionId) return;
      setPlateForSide(sourceSide)(prev => {
        const targetIdx = prev.findIndex(t => t.id === collisionId);
        if (targetIdx === -1 || !areLikeTerms(prev[targetIdx], term)) return prev;
        const merged = combineTerms(prev[targetIdx], term);
        const next = prev.filter(t => t.id !== term.id);
        const mergeIdx = next.findIndex(t => t.id === collisionId);
        next.splice(mergeIdx, 1, merged);
        return applyZeroFilter(next);
      });
      setHasInteracted(true);
      return;
    }

    // Cross-plate transpose: negate coeff, remove from source, merge-or-add into target.
    const otherSide = zone;
    const flipped = makeTerm(-term.coeff, term.variable);
    const collisionId = findCollisionTermId(otherSide, info.point.x, info.point.y, null);
    setPlateForSide(sourceSide)(prev => applyZeroFilter(prev.filter(t => t.id !== term.id)));
    setPlateForSide(otherSide)(prev => mergeOrAddToPlate(prev, flipped, collisionId));
    setHasInteracted(true);
  };

  return (
    <div ref={cartridgeRef} className="balanza-cartridge">
      <div className="balanza-top-bar">
        <button className="balanza-restart-btn" onClick={handleRestart} title="Restart">↺</button>
      </div>
      <div className="balanza-equation-line">{equationLineText}</div>

      <Scale
        tiltAngle={tiltAngle}
        leftPlate={leftPlate}
        rightPlate={rightPlate}
        showZeroTiles={showZeroTiles}
        draggingKey={draggingKey}
        cartridgeRef={cartridgeRef}
        leftPlateRef={leftPlateRef}
        rightPlateRef={rightPlateRef}
        onDragStart={handleTileDragStart}
        onDrag={handleTileDrag}
        onDragEnd={handleTileDragEnd}
        onTileTap={handleTileTap}
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

function Scale({ tiltAngle, leftPlate, rightPlate, showZeroTiles, draggingKey, cartridgeRef, leftPlateRef, rightPlateRef, onDragStart, onDrag, onDragEnd, onTileTap }) {
  const noop = () => {};
  return (
    <div className="balanza-scale-wrap">
      <div className="balanza-scale-assembly">
      <div className="balanza-beam" style={{ transform: `rotate(${tiltAngle}deg)` }}>
        <div className="balanza-plate-assembly balanza-plate-assembly-left">
          <div ref={leftPlateRef} className="balanza-plate-items">
            {leftPlate.map(term => (
              <PlateTile
                key={term.id}
                term={term}
                side="left"
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
          <div className="balanza-dish" />
          <div className="balanza-strut" />
        </div>
        <div className="balanza-pivot-dot" />
        <div className="balanza-plate-assembly balanza-plate-assembly-right">
          <div ref={rightPlateRef} className="balanza-plate-items">
            {rightPlate.map(term => (
              <PlateTile
                key={term.id}
                term={term}
                side="right"
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
          <div className="balanza-dish" />
          <div className="balanza-strut" />
        </div>
      </div>
      <div className="balanza-post" />
      <div className="balanza-base" />
      </div>
    </div>
  );
}
