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

const CRATE_MAP = {
  '📦x': '/assets/balanza/crate_x.png',
  'x📦': '/assets/balanza/crate_x.png',
  'crate_x': '/assets/balanza/crate_x.png',
  '[x]': '/assets/balanza/crate_x.png',
  'x': '/assets/balanza/crate_x.png',
  '📦?': '/assets/balanza/crate_q.png',
  '?📦': '/assets/balanza/crate_q.png',
  'crate_q': '/assets/balanza/crate_q.png',
  '[?]': '/assets/balanza/crate_q.png',
  '?': '/assets/balanza/crate_q.png',
  '📦': '/assets/balanza/crate.png',
  'crate': '/assets/balanza/crate.png',
  'box': '/assets/balanza/crate.png'
};

function TileGlyph({ term, isOverlay = false }) {
  const isNeg = term.coeff < 0;
  const isZero = term.coeff === 0;
  const crateSrc = term.variable ? CRATE_MAP[term.variable] : null;
  const absCoeff = Math.abs(term.coeff);

  if (crateSrc) {
    return (
      <div className={`balanza-tile-glyph-container ${isOverlay ? 'is-overlay' : ''}`}>
        <span className="balanza-glyph-wrapper">
          {isNeg && <span className="balanza-tile-sign">-</span>}
          {absCoeff !== 1 && <span className="balanza-glyph-coeff">{absCoeff}</span>}
          <img src={crateSrc} alt={term.variable} className="balanza-crate-img" draggable={false} />
        </span>
      </div>
    );
  }

  const formatted = formatTerm(term, true);
  const text = (formatted.sign === '-' ? '-' : '') + formatted.value;
  return (
    <div className={`balanza-tile-card ${isNeg ? 'is-negative' : ''} ${isZero ? 'is-zero' : ''} ${isOverlay ? 'is-overlay' : ''}`}>
      <span className="balanza-tile-text">{text}</span>
    </div>
  );
}

function PlateTile({ term, side, isLocked, isLevelComplete, showZeroTiles, onDragStart, onDrag, onDragEnd, onTap, isDragging, cartridgeRef }) {
  const isZero = term.coeff === 0;
  const disabled = isZero || isLocked || isLevelComplete;
  if (isZero && !showZeroTiles) return null;
  return (
    <motion.div
      className={`balanza-tile ${isZero ? 'is-zero' : ''} ${isLocked ? 'is-locked' : ''}`}
      data-term-id={term.id}
      drag={!disabled}
      dragConstraints={cartridgeRef}
      dragElastic={0.15}
      dragSnapToOrigin
      whileDrag={disabled ? {} : { scale: 1.45, zIndex: 9999 }}
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

function MenuTile({ item, isLevelComplete, isDragging, onDragStart }) {
  const isCurrentlyDragging = isDragging === `menu-${item.key}`;
  const effectiveAvailable = isCurrentlyDragging ? item.available - 1 : item.available;
  const isEmpty = effectiveAvailable <= 0;
  const disabled = item.available <= 0 || isLevelComplete;
  const previewTerm = makeTerm(item.unitCoeff, item.variable);
  const crateSrc = item.variable ? CRATE_MAP[item.variable] : null;

  const glyphContent = (
    <span className="balanza-menu-tile-glyph">
      {crateSrc ? (
        <img src={crateSrc} alt={item.variable} className="balanza-menu-crate-img" draggable={false} />
      ) : (
        previewTerm.variable ?? previewTerm.coeff
      )}
    </span>
  );

  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onDragStart(e, { point: { x: e.clientX, y: e.clientY } }, {
      origin: 'menu',
      key: item.key,
      variable: item.variable,
      unitCoeff: item.unitCoeff
    });
  };

  return (
    <div className={`balanza-menu-tile ${isEmpty ? 'is-empty' : ''}`}>
      {/* If dragging and there are items remaining, show static glyph in the white card space */}
      {isCurrentlyDragging && effectiveAvailable > 0 && (
        <div className="balanza-menu-tile-static-slot">
          {glyphContent}
        </div>
      )}

      {/* Draggable handle - only the object is dragged, the card space stays in the menu */}
      {!isEmpty && (
        <div
          className="balanza-menu-tile-draggable-glyph"
          onPointerDown={handlePointerDown}
          style={{
            opacity: isCurrentlyDragging ? 0 : 1,
            cursor: disabled ? 'default' : 'grab',
            touchAction: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {glyphContent}
        </div>
      )}

      {effectiveAvailable >= 2 && <span className="balanza-menu-tile-count">×{effectiveAvailable}</span>}
    </div>
  );
}

function EquationLine({ text }) {
  if (!text) return null;
  const parts = text.split(/\s+([=><])\s+/);
  if (parts.length === 3) {
    const [left, comp, right] = parts;
    const isEq = comp === '=';
    const isComp = comp === '>' || comp === '<';
    return (
      <div className="balanza-equation-line">
        <span className="balanza-eq-side">{left}</span>
        <span className={`balanza-eq-comp ${isEq ? 'is-equal' : ''} ${isComp ? 'is-unequal' : ''}`}>
          {comp}
        </span>
        <span className="balanza-eq-side">{right}</span>
      </div>
    );
  }
  return <div className="balanza-equation-line">{text}</div>;
}

export default function BalanzaCartridge({
  config = {},
  onComplete,
  preview = false,
  isSelected = false,
  onSelect,
  onConfigChange
}) {
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

  // Draggable photo mode in editor
  const [localPhotoPos, setLocalPhotoPos] = useState({
    x: config.photoX ?? 50,
    y: config.photoY ?? 50,
  });
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  useEffect(() => {
    if (!isDraggingPhoto) {
      setLocalPhotoPos({
        x: config.photoX ?? 50,
        y: config.photoY ?? 50,
      });
    }
  }, [config.photoX, config.photoY, isDraggingPhoto]);

  const handlePhotoPointerDown = (e) => {
    if (!preview) return;
    e.stopPropagation();
    e.preventDefault();

    onSelect?.();

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = localPhotoPos.x;
    const startPosY = localPhotoPos.y;

    const parent = cartridgeRef.current?.closest('.slide-canvas') || cartridgeRef.current;
    const parentRect = parent ? parent.getBoundingClientRect() : { width: 360, height: 640 };

    setIsDraggingPhoto(true);

    let currentPosX = startPosX;
    let currentPosY = startPosY;

    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const dxPct = (dx / parentRect.width) * 100;
      const dyPct = (dy / parentRect.height) * 100;

      currentPosX = Math.max(5, Math.min(95, Math.round((startPosX + dxPct) * 10) / 10));
      currentPosY = Math.max(5, Math.min(95, Math.round((startPosY + dyPct) * 10) / 10));

      setLocalPhotoPos({ x: currentPosX, y: currentPosY });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setIsDraggingPhoto(false);

      if (currentPosX !== startPosX || currentPosY !== startPosY) {
        onConfigChange?.({
          photoX: currentPosX,
          photoY: currentPosY,
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const leftTotal = useMemo(() => plateTotal(leftPlate, weights), [leftPlate, weights]);
  const rightTotal = useMemo(() => plateTotal(rightPlate, weights), [rightPlate, weights]);
  const tiltAngle = useMemo(() => computeTiltAngle(leftTotal, rightTotal), [leftTotal, rightTotal]);
  const equationLineText = useMemo(() => buildEquationLineText(leftPlate, rightPlate, leftTotal, rightTotal), [leftPlate, rightPlate, leftTotal, rightTotal]);

  const isLevelComplete = hasInteracted && leftPlate.length > 0 && rightPlate.length > 0 && nearlyEqual(leftTotal, rightTotal);

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
    const isBalanced = leftPlate.length > 0 && rightPlate.length > 0 && nearlyEqual(leftTotal, rightTotal);
    if (isBalanced && !hasFiredConfettiRef.current) {
      hasFiredConfettiRef.current = true;
      if (config.confetti !== false) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } else if (!isBalanced) {
      hasFiredConfettiRef.current = false;
    }
  }, [preview, hasInteracted, leftTotal, rightTotal, leftPlate.length, rightPlate.length, config.confetti]);

  useEffect(() => {
    if (!moveFlash) return;
    const timer = setTimeout(() => setMoveFlash(null), 450);
    return () => clearTimeout(timer);
  }, [moveFlash]);

  useEffect(() => {
    setLeftPlate(parseBalanzaExpression(config.leftPlateText));
  }, [config.leftPlateText]);

  useEffect(() => {
    setRightPlate(parseBalanzaExpression(config.rightPlateText));
  }, [config.rightPlateText]);

  useEffect(() => {
    setMenuItems(parseMenuInventory(config.menuText));
  }, [config.menuText]);

  const bgImage = config.background || config.backgroundImage || config.globalBackground;
  const bgStyle = useMemo(() => {
    if (!bgImage) return null;
    const formatted = bgImage.startsWith('url(') || bgImage.startsWith('linear-gradient(') || bgImage.startsWith('radial-gradient(')
      ? bgImage.replaceAll('/src/assets/', '/assets/')
      : `url(${bgImage.replaceAll('/src/assets/', '/assets/')})`;
    return {
      backgroundImage: formatted,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }, [bgImage]);

  const isPhotoMode = !!(config.photoMode || config.isPhoto || config.photo);
  const equationPos = config.equationPosition || (config.showEquation === false ? 'off' : 'up');
  const showEquationUp = equationPos === 'up';
  const showEquationDown = equationPos === 'down';

  if (preview) {
    if (isPhotoMode) {
      return (
        <div ref={cartridgeRef} className="balanza-cartridge is-photo-mode" style={{ pointerEvents: 'none' }}>
          {bgStyle && <div className="balanza-bg-layer" style={bgStyle} />}
          {showEquationUp && equationLineText && (
            <div className="balanza-header-area" style={{ marginTop: '2vh' }}>
              <div className="balanza-equation-frame">
                <EquationLine text={equationLineText} />
              </div>
            </div>
          )}
          <div
            className={`balanza-photo-card ${isSelected ? 'is-selected' : ''} ${isDraggingPhoto ? 'is-dragging' : ''}`}
            style={{
              left: `${localPhotoPos.x}%`,
              top: `${localPhotoPos.y}%`,
              transform: `translate(-50%, -50%) rotate(${config.photoRotation ?? -1.5}deg) scale(${config.photoScale ?? 1})`,
              pointerEvents: 'auto',
              cursor: isDraggingPhoto ? 'grabbing' : 'grab',
              touchAction: 'none',
              zIndex: isDraggingPhoto ? 100 : 10,
            }}
            onPointerDown={handlePhotoPointerDown}
          >
            <div className="balanza-photo-inner">
              <Scale
                tiltAngle={tiltAngle}
                leftPlate={leftPlate}
                rightPlate={rightPlate}
                isLeftLocked={false}
                isRightLocked={false}
                showZeroTiles={showZeroTiles}
                draggingKey={null}
                cartridgeRef={cartridgeRef}
                leftPlateRef={leftPlateRef}
                rightPlateRef={rightPlateRef}
              />
            </div>
          </div>
          {showEquationDown && equationLineText && (
            <div className="balanza-footer-equation-area">
              <div className="balanza-equation-frame">
                <EquationLine text={equationLineText} />
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="balanza-cartridge" style={{ pointerEvents: 'none' }}>
        {bgStyle && <div className="balanza-bg-layer" style={bgStyle} />}
        <div className="balanza-header-area">
          <div className="balanza-top-row"></div>
          {showEquationUp && equationLineText && (
            <div className="balanza-equation-frame">
              <EquationLine text={equationLineText} />
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
          draggingKey={null}
          cartridgeRef={cartridgeRef}
          leftPlateRef={leftPlateRef}
          rightPlateRef={rightPlateRef}
        />
        {showEquationDown && equationLineText && (
          <div className="balanza-footer-equation-area">
            <div className="balanza-equation-frame">
              <EquationLine text={equationLineText} />
            </div>
          </div>
        )}
        <div className="balanza-menu">
          {menuItems.map(item => (
            <MenuTile key={item.key} item={item} cartridgeRef={cartridgeRef} />
          ))}
        </div>
      </div>
    );
  }

  const plateArrayForSide = (side) => (side === 'left' ? leftPlate : rightPlate);
  const plateRefForSide = (side) => (side === 'left' ? leftPlateRef : rightPlateRef);

  const applyZeroFilter = (terms) => (showZeroTiles ? terms : terms.filter(t => t.coeff !== 0));

  function mergeOrAddToPlate(terms, incoming, collisionId, dropX = null, side = null) {
    if (collisionId) {
      const idx = terms.findIndex(t => t.id === collisionId);
      if (idx !== -1 && areLikeTerms(terms[idx], incoming)) {
        const merged = combineTerms(terms[idx], incoming);
        const next = [...terms];
        next.splice(idx, 1, merged);
        return applyZeroFilter(next);
      }
    }
    if (dropX !== null && side) {
      const container = plateRefForSide(side).current;
      if (container) {
        const cardEls = Array.from(container.querySelectorAll('[data-term-id]'));
        for (let i = 0; i < cardEls.length; i++) {
          const rect = cardEls[i].getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          if (dropX < centerX) {
            const next = [...terms];
            next.splice(i, 0, incoming);
            return applyZeroFilter(next);
          }
        }
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
    if (isLevelComplete || isSideLocked(side)) return;
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
    if (isLevelComplete) return;
    if (source.origin !== 'menu' && isSideLocked(source.origin)) return;
    setIsDraggingItem(true);
    dragSourceRef.current = source;
    const overlay = source.origin === 'menu'
      ? makeTerm(source.unitCoeff, source.variable)
      : plateArrayForSide(source.origin).find(t => t.id === source.termId);
    setDragOverlayTerm(overlay || null);
    setDraggingKey(source.origin === 'menu' ? `menu-${source.key}` : source.termId);
    const pt = info?.point || (e ? { x: e.clientX, y: e.clientY } : { x: 0, y: 0 });
    setDragPos(pt);

    if (source.origin === 'menu') {
      const handleMove = (moveEvt) => {
        setDragPos({ x: moveEvt.clientX, y: moveEvt.clientY });
      };
      const handleUp = (upEvt) => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
        handleTileDragEnd(upEvt, { point: { x: upEvt.clientX, y: upEvt.clientY } });
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
    }
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
      const nextPlate = mergeOrAddToPlate(plateArrayForSide(zone), incoming, collisionId, info.point.x, zone);
      const nextMenu = menuItems.map(m => (m.key === source.key ? { ...m, available: m.available - 1 } : m));
      commitMove({ ...withSide(zone, nextPlate), menu: nextMenu }, MOVE_CHANGING, zone);
      return;
    }

    const sourceSide = source.origin;
    const term = plateArrayForSide(sourceSide).find(t => t.id === source.termId);
    if (!term) return;

    // Plate -> supply menu or dragged outside plates. Deliberately CHANGES the balance.
    if (zone === 'menu' || !zone) {
      const menuIdx = findMenuRowIndexForTerm(term);
      const nextPlate = applyZeroFilter(plateArrayForSide(sourceSide).filter(t => t.id !== term.id));
      let nextMenu;
      if (menuIdx !== -1) {
        nextMenu = menuItems.map((m, i) => (
          i === menuIdx ? { ...m, available: m.available + Math.abs(term.coeff) } : m
        ));
      } else {
        const newKey = `menu-${Date.now()}-${term.variable ?? 'num'}`;
        nextMenu = [
          ...menuItems,
          {
            key: newKey,
            variable: term.variable,
            unitCoeff: term.variable ? 1 : Math.abs(term.coeff),
            available: term.variable ? Math.abs(term.coeff) : 1,
          }
        ];
      }
      commitMove({ ...withSide(sourceSide, nextPlate), menu: nextMenu }, MOVE_CHANGING, sourceSide);
      return;
    }

    // Same-plate move: merge if dropped on like term, or reorder horizontally. PRESERVING.
    if (zone === sourceSide) {
      const collisionId = findCollisionTermId(zone, info.point.x, info.point.y, term.id);
      const terms = plateArrayForSide(sourceSide);
      if (collisionId) {
        const targetIdx = terms.findIndex(t => t.id === collisionId);
        if (targetIdx !== -1 && areLikeTerms(terms[targetIdx], term)) {
          const merged = combineTerms(terms[targetIdx], term);
          const nextTerms = terms.filter(t => t.id !== term.id);
          const mergeIdx = nextTerms.findIndex(t => t.id === collisionId);
          nextTerms.splice(mergeIdx, 1, merged);
          commitMove(withSide(sourceSide, applyZeroFilter(nextTerms)), MOVE_PRESERVING, sourceSide);
          return;
        }
      }

      // Reorder items horizontally on the same plate
      const container = plateRefForSide(sourceSide).current;
      const otherItems = terms.filter(t => t.id !== term.id);
      if (container && otherItems.length > 0) {
        let insertIdx = otherItems.length;
        const cardEls = Array.from(container.querySelectorAll('[data-term-id]'))
          .filter(el => el.getAttribute('data-term-id') !== term.id);

        for (let i = 0; i < cardEls.length; i++) {
          const rect = cardEls[i].getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          if (info.point.x < centerX) {
            insertIdx = i;
            break;
          }
        }

        const nextTerms = [...otherItems];
        nextTerms.splice(insertIdx, 0, term);
        const orderChanged = nextTerms.some((t, i) => t.id !== terms[i]?.id);
        if (orderChanged) {
          commitMove(withSide(sourceSide, nextTerms), MOVE_PRESERVING, sourceSide);
          return;
        }
      }
      return;
    }

    // Cross-plate move: if freeMovement is enabled (default), coefficient is unchanged (MOVE_CHANGING).
    // If freeMovement is false, sign is inverted (-term.coeff) as algebraic transposition (MOVE_PRESERVING).
    const otherSide = zone;
    const targetCoeff = freeMovement ? term.coeff : -term.coeff;
    const targetTerm = makeTerm(targetCoeff, term.variable);
    const collisionId = findCollisionTermId(otherSide, info.point.x, info.point.y, null);
    const nextSource = applyZeroFilter(plateArrayForSide(sourceSide).filter(t => t.id !== term.id));
    const nextTarget = mergeOrAddToPlate(plateArrayForSide(otherSide), targetTerm, collisionId, info.point.x, otherSide);
    const moveCategory = freeMovement ? MOVE_CHANGING : MOVE_PRESERVING;
    commitMove({
      left: sourceSide === 'left' ? nextSource : nextTarget,
      right: sourceSide === 'left' ? nextTarget : nextSource,
      menu: menuItems,
    }, moveCategory, otherSide);
  };

  if (isPhotoMode) {
    const px = config.photoX ?? 50;
    const py = config.photoY ?? 50;
    return (
      <div ref={cartridgeRef} className="balanza-cartridge is-photo-mode">
        {bgStyle && <div className="balanza-bg-layer" style={bgStyle} />}
        {showEquationUp && equationLineText && (
          <div className="balanza-header-area" style={{ marginTop: '2vh' }}>
            <div className="balanza-equation-frame">
              <EquationLine text={equationLineText} />
            </div>
          </div>
        )}

        <div
          className="balanza-photo-card"
          style={{
            left: `${px}%`,
            top: `${py}%`,
            transform: `translate(-50%, -50%) rotate(${config.photoRotation ?? -1.5}deg) scale(${config.photoScale ?? 1})`,
          }}
        >
          <div className="balanza-photo-inner">
            <Scale
              tiltAngle={tiltAngle}
              leftPlate={leftPlate}
              rightPlate={rightPlate}
              isLeftLocked={false}
              isRightLocked={false}
              showZeroTiles={showZeroTiles}
              draggingKey={null}
              cartridgeRef={cartridgeRef}
              leftPlateRef={leftPlateRef}
              rightPlateRef={rightPlateRef}
              onDragStart={null}
              onDrag={null}
              onDragEnd={null}
              onTileTap={null}
              moveFlash={null}
            />
          </div>
        </div>

        {showEquationDown && equationLineText && (
          <div className="balanza-footer-equation-area">
            <div className="balanza-equation-frame">
              <EquationLine text={equationLineText} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={cartridgeRef} className="balanza-cartridge">
      {bgStyle && <div className="balanza-bg-layer" style={bgStyle} />}
      <div className="balanza-header-area">
        <div className="balanza-top-row">
          <button className="balanza-restart-btn" onClick={handleRestart} title="Restart">↺</button>
        </div>
        {showEquationUp && equationLineText && (
          <div className={`balanza-equation-frame ${moveFlash?.category === MOVE_PRESERVING ? 'is-rearranged' : ''}`}>
            <EquationLine text={equationLineText} />
          </div>
        )}
      </div>

      <Scale
        tiltAngle={tiltAngle}
        leftPlate={leftPlate}
        rightPlate={rightPlate}
        isLeftLocked={isLeftLocked}
        isRightLocked={isRightLocked}
        isLevelComplete={isLevelComplete}
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

      {showEquationDown && equationLineText && (
        <div className="balanza-footer-equation-area">
          <div className={`balanza-equation-frame ${moveFlash?.category === MOVE_PRESERVING ? 'is-rearranged' : ''}`}>
            <EquationLine text={equationLineText} />
          </div>
        </div>
      )}

      <div ref={menuRef} className="balanza-menu">
        {menuItems.map(item => (
          <MenuTile
            key={item.key}
            item={item}
            isLevelComplete={isLevelComplete}
            isDragging={draggingKey}
            onDragStart={handleTileDragStart}
          />
        ))}
      </div>

      {isDraggingItem && dragOverlayTerm && createPortal(
        <div
          className="balanza-drag-overlay"
          style={{ position: 'fixed', left: dragPos.x, top: dragPos.y, transform: 'translate(-50%, -50%)', zIndex: 99999999, pointerEvents: 'none' }}
        >
          <TileGlyph term={dragOverlayTerm} isOverlay={true} />
        </div>,
        document.body
      )}
    </div>
  );
}

function Scale({ tiltAngle, leftPlate, rightPlate, isLeftLocked, isRightLocked, isLevelComplete, showZeroTiles, draggingKey, cartridgeRef, leftPlateRef, rightPlateRef, onDragStart, onDrag, onDragEnd, onTileTap, moveFlash }) {
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
            <div ref={leftPlateRef} className={`balanza-plate-items ${flashClass('left')}`}>
              {leftPlate.map(term => (
                <PlateTile
                  key={term.id}
                  term={term}
                  side="left"
                  isLocked={isLeftLocked}
                  isLevelComplete={isLevelComplete}
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
            <div ref={rightPlateRef} className={`balanza-plate-items ${flashClass('right')}`}>
              {rightPlate.map(term => (
                <PlateTile
                  key={term.id}
                  term={term}
                  side="right"
                  isLocked={isRightLocked}
                  isLevelComplete={isLevelComplete}
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
