import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { unlockAudio, playMerge, playPopFX } from './game/AlgeBrosSoundManager';
import './AlgeBrosCartridge.css';

/**
 * Animated tutorial hand pointer.
 * The index fingertip is geometrically located at (16, 3) inside the 44x44 container.
 */
function TutorialHand({ x, y, isPressed, isDragging, isSlicing = false, visible }) {
  return (
    <motion.div
      className="tutorial-hand-pointer"
      initial={false}
      animate={{
        x: x - 16,
        y: y - 3,
        opacity: visible ? 1 : 0,
        scale: isPressed ? 0.84 : (isDragging ? 1.06 : 1),
        rotate: isDragging ? -8 : (isSlicing ? -22 : -3),
      }}
      transition={{
        x: isDragging ? { duration: 0.85, ease: [0.25, 1, 0.5, 1] } : (isSlicing ? { duration: 0.35, ease: 'easeOut' } : { type: 'spring', stiffness: 220, damping: 25 }),
        y: isDragging ? { duration: 0.85, ease: [0.25, 1, 0.5, 1] } : (isSlicing ? { duration: 0.35, ease: 'easeOut' } : { type: 'spring', stiffness: 220, damping: 25 }),
        scale: { duration: 0.15 },
        opacity: { duration: 0.25 },
        rotate: { duration: 0.2 },
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        transformOrigin: '16px 3px',
        filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.38))',
      }}
    >
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        {/* Tap Ripple directly radiating from the fingertip */}
        {isPressed && (
          <div
            style={{
              position: 'absolute',
              top: 3,
              left: 16,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.45)',
              transform: 'translate(-50%, -50%)',
              animation: 'tapRipple 0.5s ease-out forwards',
            }}
          />
        )}
        <svg
          width="44"
          height="44"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hand pointing up - solid white glove with clean dark outline, no internal lines */}
          <path
            d="M9 2 C8 2 7.2 2.8 7.2 3.8 L7.2 13.5 C6.5 12.8 5.5 12.5 4.5 12.8 C3.4 13.2 2.7 14.2 2.7 15.3 C2.7 16 3 16.6 3.5 17.1 L7.7 22.2 C9.2 24 11.5 25 13.8 25 L16.3 25 C20.2 25 23.5 21.8 23.5 17.8 L23.5 13.3 C23.5 12.3 22.7 11.5 21.7 11.5 C21.4 11.5 21.1 11.6 20.8 11.8 C20.4 11.1 19.7 10.6 18.9 10.6 C18.6 10.6 18.3 10.7 18 10.9 C17.6 10.2 16.9 9.7 16.1 9.7 C15.8 9.7 15.6 9.8 15.3 9.9 C14.9 9.3 14.2 8.8 13.3 8.8 L13.3 3.8 C13.3 2.8 12.5 2 11.5 2 L9 2 Z"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </motion.div>
  );
}

export default function DivisionsTutorial({ onPlay }) {
  // Stages:
  // 'initial'          -> 2x = 6
  // 'decomposed_left'  -> 2 · x = 6
  // 'dragging_to_den'  -> 2 dragging to denominator under 6
  // 'dropped_to_den'   -> x = 6 / 2
  // 'decomposed_right' -> x = (2 · 3) / 2
  // 'slicing'          -> slicing across 2 on top and 2 on bottom
  // 'crossed_out'      -> 2s struck through with green line
  // 'solved'           -> x = 3
  const [stage, setStage] = useState('initial');
  const [isHandVisible, setIsHandVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSlicing, setIsSlicing] = useState(false);
  const [isCardLifted, setIsCardLifted] = useState(false);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const [originPos2, setOriginPos2] = useState({ x: 0, y: 0 });
  const [sliceLine, setSliceLine] = useState({ x1: 0, y1: 0, x2: 0, y2: 0, active: false });
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [handCoords, setHandCoords] = useState({ x: 120, y: 70 });

  const containerRef = useRef(null);
  const bannerRef = useRef(null);
  const card2xRef = useRef(null);
  const card2Ref = useRef(null);
  const card6Ref = useRef(null);
  const cardNum6Ref = useRef(null);
  const cardNum2Ref = useRef(null);
  const cardDen2Ref = useRef(null);
  const denDropSlotRef = useRef(null);
  const timeoutsRef = useRef([]);

  const addTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  /**
   * Computes unscaled local offset of an element relative to containerRef.
   */
  const getElementOffset = (el) => {
    if (!el || !containerRef.current) return null;
    let x = 0;
    let y = 0;
    let cur = el;
    while (cur && cur !== containerRef.current) {
      x += cur.offsetLeft;
      y += cur.offsetTop;
      cur = cur.offsetParent;
    }
    return {
      x,
      y,
      width: el.offsetWidth,
      height: el.offsetHeight,
    };
  };

  const getCardCenter = (el, fallbackX = 120, fallbackY = 70) => {
    const rect = getElementOffset(el);
    if (!rect) return { x: fallbackX, y: fallbackY };
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
  };

  const getCardBottomRight = (el, fallbackX = 140, fallbackY = 90) => {
    const rect = getElementOffset(el);
    if (!rect) return { x: fallbackX, y: fallbackY };
    return {
      x: rect.x + rect.width - 4,
      y: rect.y + rect.height - 4,
    };
  };

  useEffect(() => {
    let isCancelled = false;

    const runLoop = (isInitial = false) => {
      if (isCancelled) return;

      // Reset state for loop iteration
      setStage('initial');
      setIsFadingOut(false);
      setIsHandVisible(false);
      setIsPressed(false);
      setIsDragging(false);
      setIsSlicing(false);
      setIsCardLifted(false);
      setDragDelta({ x: 0, y: 0 });
      setSliceLine({ x1: 0, y1: 0, x2: 0, y2: 0, active: false });

      // Requirement: Wait 1.5 seconds before starting tutorial animation upon slide entry
      const startDelay = isInitial ? 1500 : 400;

      // 1. Hand appears at card 2x center
      addTimeout(() => {
        if (isCancelled) return;
        const pos = getCardCenter(card2xRef.current, 105, 85);
        setHandCoords(pos);
        setIsHandVisible(true);
      }, startDelay);

      // 2. Hand presses down on 2x to decompose it into 2 · x
      addTimeout(() => {
        if (isCancelled) return;
        setIsPressed(true);
      }, startDelay + 650);

      // 3. 2x splits into 2 · x
      addTimeout(() => {
        if (isCancelled) return;
        playPopFX();
        setIsPressed(false);
        setStage('decomposed_left');
      }, startDelay + 1050);

      // 4. Hand moves to bottom-right corner of card '2'
      addTimeout(() => {
        if (isCancelled) return;
        const pos = getCardBottomRight(card2Ref.current, 85, 95);
        setHandCoords(pos);
      }, startDelay + 1600);

      // 5. Hand presses down on card '2' (lifts it up)
      addTimeout(() => {
        if (isCancelled) return;
        setIsPressed(true);
        setIsCardLifted(true);

        const pos2 = getElementOffset(card2Ref.current);
        if (pos2) {
          setOriginPos2({ x: pos2.x, y: pos2.y });
        }
      }, startDelay + 2100);

      // 6. Hand begins dragging card '2' down into denominator under 6
      addTimeout(() => {
        if (isCancelled) return;
        setIsDragging(true);

        const pos2 = getElementOffset(card2Ref.current);
        const pos6 = getElementOffset(card6Ref.current);

        const currentOriginX = pos2 ? pos2.x : 60;
        const currentOriginY = pos2 ? pos2.y : 65;
        const targetX = pos6 ? pos6.x : 210;
        const targetY = pos6 ? pos6.y + 55 : 120;

        const dx = targetX - currentOriginX;
        const dy = targetY - currentOriginY;

        setOriginPos2({ x: currentOriginX, y: currentOriginY });
        setStage('dragging_to_den');
        setDragDelta({ x: dx, y: dy });
        setHandCoords(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }, startDelay + 2500);

      // 7. Release '2' and drop into denominator under 6 (x = 6 / 2)
      addTimeout(() => {
        if (isCancelled) return;
        playMerge();
        setIsPressed(false);
        setIsDragging(false);
        setIsCardLifted(false);
        setDragDelta({ x: 0, y: 0 });
        setStage('dropped_to_den');
      }, startDelay + 3450);

      // 8. Hand moves to numerator card '6'
      addTimeout(() => {
        if (isCancelled) return;
        const pos = getCardCenter(cardNum6Ref.current, 210, 60);
        setHandCoords(pos);
      }, startDelay + 4000);

      // 9. Hand taps card '6' to decompose into 2 · 3
      addTimeout(() => {
        if (isCancelled) return;
        setIsPressed(true);
      }, startDelay + 4600);

      // 10. '6' splits into 2 · 3
      addTimeout(() => {
        if (isCancelled) return;
        playPopFX();
        setIsPressed(false);
        setStage('decomposed_right');
      }, startDelay + 5000);

      // 11. Hand moves to slice start position above numerator '2'
      addTimeout(() => {
        if (isCancelled) return;
        const posNum2 = getElementOffset(cardNum2Ref.current);
        const startX = posNum2 ? posNum2.x + posNum2.width + 10 : 205;
        const startY = posNum2 ? posNum2.y - 12 : 36;
        setHandCoords({ x: startX, y: startY });
      }, startDelay + 5600);

      // 12. Hand slices downward across numerator '2' and denominator '2'
      addTimeout(() => {
        if (isCancelled) return;
        setIsSlicing(true);

        const posNum2 = getElementOffset(cardNum2Ref.current);
        const posDen2 = getElementOffset(cardDen2Ref.current);

        const x1 = posNum2 ? posNum2.x + posNum2.width + 10 : 205;
        const y1 = posNum2 ? posNum2.y - 12 : 36;
        const x2 = posDen2 ? posDen2.x - 12 : 160;
        const y2 = posDen2 ? posDen2.y + posDen2.height + 16 : 155;

        setSliceLine({ x1, y1, x2, y2, active: true });
        setHandCoords({ x: x2, y: y2 });
        setStage('slicing');
      }, startDelay + 6100);

      // 13. Slicing strikes through both '2' cards!
      addTimeout(() => {
        if (isCancelled) return;
        playPopFX();
        setIsSlicing(false);
        setSliceLine(prev => ({ ...prev, active: false }));
        setStage('crossed_out');
      }, startDelay + 6550);

      // 14. Crossed-out '2's dissolve, leaving solved equation x = 3
      addTimeout(() => {
        if (isCancelled) return;
        playMerge();
        setIsHandVisible(false); // Hide hand completely for solved state
        setStage('solved');
      }, startDelay + 7400);

      // 15. Fade out equation
      addTimeout(() => {
        if (isCancelled) return;
        setIsFadingOut(true);
      }, startDelay + 9400);

      // 16. Reset and loop
      addTimeout(() => {
        if (isCancelled) return;
        runLoop(false);
      }, startDelay + 9850);
    };

    // Initial run waits 1.5s
    runLoop(true);

    return () => {
      isCancelled = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const handlePlayClick = () => {
    unlockAudio();
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (onPlay) onPlay();
  };

  return (
    <div
      className="algebros-game-area algebros-tutorial-area"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        padding: '24px 0 32px 0'
      }}
    >
      {/* Top spacer (no text) */}
      <div style={{ height: '36px' }} />

      {/* Central Equation Banner */}
      <div className="expression-wrapper topic-divisions" style={{ pointerEvents: 'none' }}>
        <div className="algebros-banner-container">
          <div
            className="algebros-equation-banner tutorial-banner reserves-fraction"
            ref={bannerRef}
            style={{
              position: 'relative',
              overflow: 'visible',
              background: '#ffffff',
              minHeight: '185px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Equation Elements with Fade transition */}
            <motion.div
              animate={{ opacity: isFadingOut ? 0 : 1 }}
              transition={{ duration: 0.35 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                position: 'relative'
              }}
            >
              <div
                className={`equation-layout ${stage === 'solved' ? 'is-success-transition' : ''}`}
                ref={containerRef}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '130px'
                }}
              >
                {/* STAGE: INITIAL (2x = 6) */}
                {stage === 'initial' && (
                  <>
                    <div className="equation-side left-side">
                      <div className="expression-list">
                        <div className="term-card variable-term" ref={card2xRef}>
                          <span className="term-value">2<span className="math-variable">x</span></span>
                        </div>
                      </div>
                    </div>

                    <span className="equals-sign">=</span>

                    <div className="equation-side right-side">
                      <div className="expression-list">
                        <div className="term-card constant-term" ref={card6Ref}>
                          <span className="term-value">6</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* STAGE: DECOMPOSED LEFT (2 · x = 6) */}
                {stage === 'decomposed_left' && (
                  <>
                    <div className="equation-side left-side">
                      <div className="expression-list">
                        <div className="term-card constant-term is-merge-pop" ref={card2Ref}>
                          <span className="term-value">2</span>
                        </div>
                        <span className="dot-separator" style={{ margin: '0 4px', fontSize: '1.2rem', fontWeight: 900 }}>·</span>
                        <div className="term-card variable-term is-merge-pop">
                          <span className="term-value"><span className="math-variable">x</span></span>
                        </div>
                      </div>
                    </div>

                    <span className="equals-sign">=</span>

                    <div className="equation-side right-side">
                      <div className="expression-list">
                        <div className="term-card constant-term" ref={card6Ref}>
                          <span className="term-value">6</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* STAGE: DRAGGING TO DENOMINATOR */}
                {stage === 'dragging_to_den' && (
                  <>
                    <div className="equation-side left-side">
                      <div className="expression-list">
                        <div className="term-card variable-term">
                          <span className="term-value"><span className="math-variable">x</span></span>
                        </div>
                      </div>
                    </div>

                    <span className="equals-sign">=</span>

                    <div className="equation-side right-side">
                      <div className="division-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="expression-list">
                          <div className="term-card constant-term" ref={card6Ref}>
                            <span className="term-value">6</span>
                          </div>
                        </div>
                        <div className="division-line" style={{ width: '100%', minWidth: '48px', height: '3px', background: '#0f172a', margin: '6px 0', borderRadius: '2px' }} />
                        <div className="expression-list" ref={denDropSlotRef} style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div className="term-card drop-slot-placeholder" style={{ opacity: 0.35, border: '2px dashed #94a3b8', width: '40px', height: '44px', borderRadius: '10px' }} />
                        </div>
                      </div>
                    </div>

                    {/* Dragged Card 2: moves smoothly along with the hand */}
                    <motion.div
                      animate={{
                        x: dragDelta.x,
                        y: dragDelta.y,
                        scale: isCardLifted ? 1.08 : 1,
                      }}
                      transition={{
                        x: { duration: 0.85, ease: [0.25, 1, 0.5, 1] },
                        y: { duration: 0.85, ease: [0.25, 1, 0.5, 1] },
                        scale: { duration: 0.2 },
                      }}
                      style={{
                        position: 'absolute',
                        left: originPos2.x,
                        top: originPos2.y,
                        zIndex: 50,
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))',
                      }}
                    >
                      <div className="term-card constant-term is-lifted-drag">
                        <span className="term-value">2</span>
                      </div>
                    </motion.div>
                  </>
                )}

                {/* STAGE: DROPPED TO DENOMINATOR (x = 6 / 2) */}
                {stage === 'dropped_to_den' && (
                  <>
                    <div className="equation-side left-side">
                      <div className="expression-list">
                        <div className="term-card variable-term">
                          <span className="term-value"><span className="math-variable">x</span></span>
                        </div>
                      </div>
                    </div>

                    <span className="equals-sign">=</span>

                    <div className="equation-side right-side">
                      <div className="division-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="expression-list">
                          <div className="term-card constant-term" ref={cardNum6Ref}>
                            <span className="term-value">6</span>
                          </div>
                        </div>
                        <div className="division-line" style={{ width: '100%', minWidth: '48px', height: '3px', background: '#0f172a', margin: '6px 0', borderRadius: '2px' }} />
                        <div className="expression-list">
                          <div className="term-card constant-term is-merge-pop" ref={cardDen2Ref}>
                            <span className="term-value">2</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* STAGES: DECOMPOSED RIGHT, SLICING, CROSSED OUT (x = (2 · 3) / 2) */}
                {(stage === 'decomposed_right' || stage === 'slicing' || stage === 'crossed_out') && (
                  <>
                    <div className="equation-side left-side">
                      <div className="expression-list">
                        <div className="term-card variable-term">
                          <span className="term-value"><span className="math-variable">x</span></span>
                        </div>
                      </div>
                    </div>

                    <span className="equals-sign">=</span>

                    <div className="equation-side right-side">
                      <div className="division-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="expression-list" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <motion.div
                            animate={stage === 'crossed_out' ? { opacity: [1, 1, 0], scale: [1, 1.12, 0.8] } : {}}
                            transition={{ duration: 0.8, times: [0, 0.5, 1] }}
                            className={`term-card constant-term ${stage === 'slicing' ? 'is-sliced' : ''} ${stage === 'crossed_out' ? 'is-crossed-out' : 'is-merge-pop'}`}
                            ref={cardNum2Ref}
                            style={{ position: 'relative' }}
                          >
                            <span className="term-value">2</span>
                            {stage === 'crossed_out' && (
                              <div
                                className="strike-line"
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '-15%',
                                  width: '130%',
                                  height: '3.5px',
                                  backgroundColor: '#10b981',
                                  borderRadius: '2px',
                                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                                  zIndex: 20,
                                  transform: 'rotate(-32deg)',
                                  transformOrigin: 'center'
                                }}
                              />
                            )}
                          </motion.div>

                          <span className="dot-separator" style={{ margin: '0 4px', fontSize: '1.2rem', fontWeight: 900 }}>·</span>

                          <div className="term-card constant-term is-merge-pop">
                            <span className="term-value">3</span>
                          </div>
                        </div>

                        <div className="division-line" style={{ width: '100%', minWidth: '96px', height: '3px', background: '#0f172a', margin: '6px 0', borderRadius: '2px' }} />

                        <div className="expression-list" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <motion.div
                            animate={stage === 'crossed_out' ? { opacity: [1, 1, 0], scale: [1, 1.12, 0.8] } : {}}
                            transition={{ duration: 0.8, times: [0, 0.5, 1] }}
                            className={`term-card constant-term ${stage === 'slicing' ? 'is-sliced' : ''} ${stage === 'crossed_out' ? 'is-crossed-out' : ''}`}
                            ref={cardDen2Ref}
                            style={{ position: 'relative' }}
                          >
                            <span className="term-value">2</span>
                            {stage === 'crossed_out' && (
                              <div
                                className="strike-line"
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '-15%',
                                  width: '130%',
                                  height: '3.5px',
                                  backgroundColor: '#10b981',
                                  borderRadius: '2px',
                                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                                  zIndex: 20,
                                  transform: 'rotate(-32deg)',
                                  transformOrigin: 'center'
                                }}
                              />
                            )}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* STAGE: SOLVED (x = 3) */}
                {stage === 'solved' && (
                  <>
                    <div className="equation-side left-side">
                      <div className="expression-list">
                        <div className="term-card variable-term">
                          <span className="term-value"><span className="math-variable">x</span></span>
                        </div>
                      </div>
                    </div>

                    <span className="equals-sign">=</span>

                    <div className="equation-side right-side">
                      <div className="expression-list">
                        <div className="term-card constant-term is-merge-pop">
                          <span className="term-value">3</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Slicing Line Gesture Effect */}
                {sliceLine.active && (
                  <svg
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 9998,
                      overflow: 'visible'
                    }}
                  >
                    <motion.line
                      x1={sliceLine.x1}
                      y1={sliceLine.y1}
                      x2={sliceLine.x2}
                      y2={sliceLine.y2}
                      stroke="#10b981"
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0.95 }}
                      animate={{ pathLength: 1, opacity: [0.95, 1, 0.2] }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    />
                  </svg>
                )}

                {/* Hand Pointer rendered directly inside the equation container */}
                <TutorialHand
                  x={handCoords.x}
                  y={handCoords.y}
                  isPressed={isPressed}
                  isDragging={isDragging}
                  isSlicing={isSlicing}
                  visible={isHandVisible}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Controls: Centered compact PLAY button (no text above it) */}
      <div className="bottom-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button
          className="tutorial-play-btn"
          onClick={handlePlayClick}
          title="Play"
        >
          ▶ PLAY
        </button>
      </div>
    </div>
  );
}
