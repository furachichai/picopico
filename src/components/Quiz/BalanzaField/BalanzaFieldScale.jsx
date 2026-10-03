import React from 'react';
import './BalanzaFieldScale.css';
import { parseWeightSymbol, WeightRingGlyph } from '../../../cartridges/Balanza/game/WeightGlyph';
import { CrateWithLetter, parseCrateLetter, renderCrateOrText } from '../../../utils/crateUtils.jsx';
import { SackWithNumber, parseSackNumber, renderScaleTokenOrText } from '../../../utils/sackUtils.jsx';

function LeftPlateGlyph({ item }) {
  const { raw, coeff, variable } = item;
  const crateLetter = parseCrateLetter(raw) ?? (variable ? parseCrateLetter(variable) : null);
  const sackVal = parseSackNumber(raw) !== null ? parseSackNumber(raw) : (variable ? parseSackNumber(variable) : null);
  const weightVal = parseWeightSymbol(raw) !== null ? parseWeightSymbol(raw) : parseWeightSymbol(variable);

  if (crateLetter !== null) {
    return (
      <div className="balanza-field-object-item" title={raw}>
        {coeff > 1 && (
          <span className="balanza-field-letter-card" style={{ padding: '2px 5px', fontSize: '0.85rem', marginRight: 3 }}>
            {coeff}
          </span>
        )}
        <CrateWithLetter letter={crateLetter} size={34} />
      </div>
    );
  }

  if (sackVal !== null) {
    return (
      <div className="balanza-field-object-item" title={raw}>
        {coeff > 1 && <span style={{ fontWeight: 900, marginRight: 2 }}>{coeff}</span>}
        <SackWithNumber value={sackVal} size={34} />
      </div>
    );
  }

  if (weightVal !== null) {
    return (
      <div className="balanza-field-object-item" title={raw}>
        {coeff > 1 && <span style={{ fontWeight: 900, marginRight: 2 }}>{coeff}</span>}
        <WeightRingGlyph value={weightVal} size={30} />
      </div>
    );
  }

  // Check if it's emoji (non-ascii or unicode emoji)
  const isEmoji = /\p{Extended_Pictographic}/u.test(raw);
  if (isEmoji) {
    return (
      <div className="balanza-field-object-item" title={raw}>
        {coeff > 1 && (
          <span className="balanza-field-letter-card" style={{ padding: '2px 5px', fontSize: '0.85rem', marginRight: 2 }}>
            {coeff}
          </span>
        )}
        <span className="balanza-field-emoji-badge">{variable || raw}</span>
      </div>
    );
  }

  // Letter card (e.g. "c", "t", "2c", "x")
  return (
    <div className="balanza-field-object-item" title={raw}>
      <span className="balanza-field-letter-card">
        {raw}
      </span>
    </div>
  );
}

const BalanzaFieldScale = ({
  leftObjects = [],
  leftItems = null,
  leftTotalWeight = 0,
  leftTotal = null,
  rightTotalWeight = 0,
  rightTotal = null,
  segments = [],
  fieldSelections = {},
  activeSlotIndex = null,
  fieldShakeSlots = new Set(),
  tiltAngle = 0,
  isSolved = false,
  onSlotTap = null,
  onDragStart = null,
  statusMessage = null,
  slotRefs = null,
  isEditor = false,
  showStatus = false
}) => {
  const itemsToRender = (leftObjects && leftObjects.length > 0) ? leftObjects : (leftItems || []);
  const lTotal = leftTotal !== null ? leftTotal : leftTotalWeight;
  const rTotal = rightTotal !== null ? rightTotal : rightTotalWeight;
  const isEquilibrated = Math.abs(lTotal - rTotal) < 0.001 && lTotal > 0;

  return (
    <div className="balanza-field-scale-container">
      <div className="balanza-field-scale-assembly">
        {/* Scale Base */}
        <img
          className="balanza-field-base-img"
          src="/assets/balanza/base.png"
          alt="Scale Stand"
          draggable={false}
        />

        {/* Rotating Beam */}
        <div
          className="balanza-field-beam-wrap"
          style={{ transform: `translate(-49.5%, -61.5%) rotate(${tiltAngle}deg)` }}
        >
          <img
            className="balanza-field-beam-img"
            src="/assets/balanza/beam.png"
            alt="Scale Beam"
            draggable={false}
          />

          {/* Left Plate (Counter-rotates to stay upright) */}
          <div
            className="balanza-field-plate-assembly balanza-field-plate-assembly-left"
            style={{ transform: `translate(-49.5%, -70%) rotate(${-tiltAngle}deg)` }}
          >
            <div className="balanza-field-left-plate-content" title="Left plate objects">
              {itemsToRender.length > 0 ? (
                itemsToRender.map((item, idx) => (
                  <LeftPlateGlyph key={item.id || idx} item={item} />
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Empty</span>
              )}
            </div>
            <img
              className="balanza-field-plate-img"
              src="/assets/balanza/plate.png"
              alt="Left Plate"
              draggable={false}
            />
          </div>

          {/* Right Plate (Counter-rotates to stay upright) */}
          <div
            className="balanza-field-plate-assembly balanza-field-plate-assembly-right"
            style={{ transform: `translate(-49.5%, -70%) rotate(${-tiltAngle}deg)` }}
          >
            <div
              className={`balanza-field-right-plate-content ${isEquilibrated ? 'is-balanced' : ''}`}
              title="Expression plate with answer blanks"
            >
              {segments.map((seg, idx) => {
                if (seg.type === 'text') {
                  return (
                    <span key={idx} className="balanza-field-operator">
                      {seg.content}
                    </span>
                  );
                }

                // Field Slot
                const placed = fieldSelections[idx];
                const isSlotActive = activeSlotIndex === idx;
                const isSlotWrong = fieldShakeSlots.has(idx);

                return (
                  <div
                    key={idx}
                    ref={el => {
                      if (slotRefs && slotRefs.current) {
                        slotRefs.current[idx] = el;
                      }
                    }}
                    className={`balanza-field-slot ${placed ? 'has-placed' : 'is-empty'} ${isSlotActive && !placed ? 'is-active' : ''} ${isSlotWrong ? 'shake' : ''}`}
                    onClick={(e) => {
                      if (onSlotTap) {
                        e.stopPropagation();
                        onSlotTap(idx);
                      }
                    }}
                    title={placed ? `Tap to return ${placed.value}` : 'Blank slot'}
                  >
                    {placed ? (
                      <span
                        className="balanza-field-placed-pill"
                        onMouseDown={(e) => {
                          if (onDragStart) {
                            e.stopPropagation();
                            onDragStart(placed, e, idx);
                          }
                        }}
                        onTouchStart={(e) => {
                          if (onDragStart) {
                            e.stopPropagation();
                            onDragStart(placed, e, idx);
                          }
                        }}
                      >
                        {renderScaleTokenOrText(placed.value, 20)}
                      </span>
                    ) : (
                      <span className="balanza-field-blank-indicator">_</span>
                    )}
                  </div>
                );
              })}
            </div>
            <img
              className="balanza-field-plate-img"
              src="/assets/balanza/plate.png"
              alt="Right Plate"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* Feedback status badge if provided */}
      {statusMessage ? (
        <div className={`balanza-field-status-banner ${statusMessage.type === 'success' ? 'is-equilibrated' : (statusMessage.type === 'warning' ? 'is-warning' : 'is-imbalanced')}`}>
          {statusMessage.text}
        </div>
      ) : null}
    </div>
  );
};

export default BalanzaFieldScale;
