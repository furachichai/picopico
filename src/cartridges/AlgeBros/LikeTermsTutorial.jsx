import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { unlockAudio, playMerge } from './game/AlgeBrosSoundManager';
import './AlgeBrosCartridge.css';

/**
 * Animated tutorial hand pointer.
 * The index fingertip is geometrically located at (16, 3) inside the 44x44 container.
 */
function TutorialHand({ x, y, isPressed, isDragging, visible }) {
  return (
    <motion.div
      className="tutorial-hand-pointer"
      initial={false}
      animate={{
        x: x - 16,
        y: y - 3,
        opacity: visible ? 1 : 0,
        scale: isPressed ? 0.84 : (isDragging ? 1.05 : 1),
        rotate: isDragging ? -8 : -3,
      }}
      transition={{
        x: isDragging ? { duration: 0.75, ease: [0.25, 1, 0.5, 1] } : { type: 'spring', stiffness: 220, damping: 25 },
        y: isDragging ? { duration: 0.75, ease: [0.25, 1, 0.5, 1] } : { type: 'spring', stiffness: 220, damping: 25 },
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

export default function LikeTermsTutorial({ onPlay }) {
  // Stages: 'initial' | 'reordered' | 'merged_x' | 'merged_all'
  const [stage, setStage] = useState('initial');
  const [isHandVisible, setIsHandVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCardLifted, setIsCardLifted] = useState(false);
  const [dragDelta, setDragDelta] = useState({ card4x: 0, middle: 0 });
  const [isPlusPressed, setIsPlusPressed] = useState(false);
  const [isMinusPressed, setIsMinusPressed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [handCoords, setHandCoords] = useState({ x: 180, y: 46 });

  const listRef = useRef(null);
  const card3Ref = useRef(null);
  const card4xRef = useRef(null);
  const firstPlusRef = useRef(null);
  const minusBtnRef = useRef(null);
  const timeoutsRef = useRef([]);

  const addTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  /**
   * Computes the unscaled local offset of an element relative to listRef.
   * Completely immune to parent CSS transforms, window scaling, or scroll.
   */
  const getElementOffset = (el) => {
    if (!el || !listRef.current) return null;
    let x = 0;
    let y = 0;
    let cur = el;
    while (cur && cur !== listRef.current) {
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

  const getButtonCenter = (el, fallbackX = 60, fallbackY = 27) => {
    const rect = getElementOffset(el);
    if (!rect) return { x: fallbackX, y: fallbackY };
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
  };

  const getCardBottomRight = (el, fallbackX = 180, fallbackY = 46) => {
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
      setIsCardLifted(false);
      setDragDelta({ card4x: 0, middle: 0 });
      setIsPlusPressed(false);
      setIsMinusPressed(false);

      // Requirement: Wait 1.5 seconds before starting tutorial animation when entering the slide.
      const startDelay = isInitial ? 1500 : 400;

      // 1. Hand appears at 4x card's bottom right corner
      addTimeout(() => {
        if (isCancelled) return;
        const pos = getCardBottomRight(card4xRef.current);
        setHandCoords(pos);
        setIsHandVisible(true);
      }, startDelay);

      // 2. Hand presses down on 4x by its bottom right corner (lifts card up)
      addTimeout(() => {
        if (isCancelled) return;
        setIsPressed(true);
        setIsCardLifted(true);
      }, startDelay + 600);

      // 3. Hand drags 4x to its place next to 2x - moving together along with the card
      addTimeout(() => {
        if (isCancelled) return;
        setIsDragging(true);

        const card4xPos = getElementOffset(card4xRef.current);
        const card3Pos = getElementOffset(card3Ref.current);

        // Horizontal distance 4x needs to travel to the left
        const dx = (card4xPos && card3Pos) ? (card4xPos.x - card3Pos.x) : 78;
        // Shift amount for middle group (3 and +) to open space for 4x
        const middleShift = (card4xPos?.width ? card4xPos.width + 4 : 52);

        setDragDelta({ card4x: -dx, middle: middleShift });
        setHandCoords(prev => ({ x: prev.x - dx, y: prev.y }));
      }, startDelay + 1100);

      // 4. Release 4x and drop into place
      addTimeout(() => {
        if (isCancelled) return;
        setIsPressed(false);
        setIsDragging(false);
        setIsCardLifted(false);
        setDragDelta({ card4x: 0, middle: 0 });
        setStage('reordered');
      }, startDelay + 1950);

      // 5. Hand moves directly ON TOP of the '+' round button between 2x and 4x
      addTimeout(() => {
        if (isCancelled) return;
        const pos = getButtonCenter(firstPlusRef.current);
        setHandCoords(pos);
      }, startDelay + 2450);

      // 6. Hand taps '+' button
      addTimeout(() => {
        if (isCancelled) return;
        setIsPressed(true);
        setIsPlusPressed(true);
      }, startDelay + 3150);

      // 7. '+' combines 2x + 4x into 6x
      addTimeout(() => {
        if (isCancelled) return;
        playMerge();
        setIsPressed(false);
        setIsPlusPressed(false);
        setStage('merged_x');
      }, startDelay + 3550);

      // 8. Hand moves directly ON TOP of the '-' round button between 3 and 2
      addTimeout(() => {
        if (isCancelled) return;
        const pos = getButtonCenter(minusBtnRef.current);
        setHandCoords(pos);
      }, startDelay + 4150);

      // 9. Hand taps '-' button
      addTimeout(() => {
        if (isCancelled) return;
        setIsPressed(true);
        setIsMinusPressed(true);
      }, startDelay + 4850);

      // 10. '-' combines 3 - 2 into 1
      addTimeout(() => {
        if (isCancelled) return;
        playMerge();
        setIsPressed(false);
        setIsMinusPressed(false);
        setStage('merged_all');
      }, startDelay + 5250);

      // 11. Hand fades away, solved expression rests
      addTimeout(() => {
        if (isCancelled) return;
        setIsHandVisible(false);
      }, startDelay + 5900);

      // 12. Fade out equation
      addTimeout(() => {
        if (isCancelled) return;
        setIsFadingOut(true);
      }, startDelay + 7800);

      // 13. Reset and loop
      addTimeout(() => {
        if (isCancelled) return;
        runLoop(false);
      }, startDelay + 8250);
    };

    // Initial run waits for slide transition + 0.5s
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
            className="algebros-equation-banner tutorial-banner"
            style={{
              position: 'relative',
              overflow: 'visible',
              background: '#ffffff',
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
                width: '100%'
              }}
            >
              {stage === 'initial' && (
                <div
                  className="expression-list tutorial-expression-list"
                  ref={listRef}
                  style={{ position: 'relative' }}
                >
                  {/* Term 2x */}
                  <div className="term-card variable-term">
                    <span className="term-value">2<span className="math-variable">x</span></span>
                  </div>

                  {/* Operator + */}
                  <button className="operator-btn">+</button>

                  {/* Middle group: '3' and '+' that shift right as 4x slides in */}
                  <motion.div
                    animate={{ x: dragDelta.middle }}
                    transition={{ duration: 0.75, ease: [0.25, 1, 0.5, 1] }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <div className="term-card constant-term" ref={card3Ref}>
                      <span className="term-value">3</span>
                    </div>
                    <button className="operator-btn">+</button>
                  </motion.div>

                  {/* Term 4x: lifts up and drags left */}
                  <motion.div
                    animate={{
                      x: dragDelta.card4x,
                      y: isCardLifted ? -8 : 0,
                      scale: isCardLifted ? 1.08 : 1,
                    }}
                    transition={{
                      x: { duration: 0.75, ease: [0.25, 1, 0.5, 1] },
                      y: { duration: 0.2 },
                      scale: { duration: 0.2 },
                    }}
                    style={{ display: 'inline-flex', position: 'relative', zIndex: isCardLifted ? 30 : 1 }}
                  >
                    <div
                      className={`term-card variable-term ${isCardLifted ? 'is-lifted-drag' : ''}`}
                      ref={card4xRef}
                    >
                      <span className="term-value">4<span className="math-variable">x</span></span>
                    </div>
                  </motion.div>

                  {/* Operator - */}
                  <button className="operator-btn">-</button>

                  {/* Term 2 */}
                  <div className="term-card constant-term">
                    <span className="term-value">2</span>
                  </div>

                  {/* Hand Pointer rendered directly inside the expression list */}
                  <TutorialHand
                    x={handCoords.x}
                    y={handCoords.y}
                    isPressed={isPressed}
                    isDragging={isDragging}
                    visible={isHandVisible}
                  />
                </div>
              )}

              {stage === 'reordered' && (
                <div
                  className="expression-list tutorial-expression-list"
                  ref={listRef}
                  style={{ position: 'relative' }}
                >
                  <div className="term-card variable-term">
                    <span className="term-value">2<span className="math-variable">x</span></span>
                  </div>

                  <button
                    className={`operator-btn ${isPlusPressed ? 'is-tutorial-pressed' : ''}`}
                    ref={firstPlusRef}
                  >
                    +
                  </button>

                  <div className="term-card variable-term">
                    <span className="term-value">4<span className="math-variable">x</span></span>
                  </div>

                  <button className="operator-btn">+</button>

                  <div className="term-card constant-term">
                    <span className="term-value">3</span>
                  </div>

                  <button
                    className={`operator-btn ${isMinusPressed ? 'is-tutorial-pressed' : ''}`}
                    ref={minusBtnRef}
                  >
                    -
                  </button>

                  <div className="term-card constant-term">
                    <span className="term-value">2</span>
                  </div>

                  {/* Hand Pointer */}
                  <TutorialHand
                    x={handCoords.x}
                    y={handCoords.y}
                    isPressed={isPressed}
                    isDragging={isDragging}
                    visible={isHandVisible}
                  />
                </div>
              )}

              {stage === 'merged_x' && (
                <div
                  className="expression-list tutorial-expression-list"
                  ref={listRef}
                  style={{ position: 'relative' }}
                >
                  <div className="term-card variable-term is-merge-pop">
                    <span className="term-value">6<span className="math-variable">x</span></span>
                  </div>

                  <button className="operator-btn">+</button>

                  <div className="term-card constant-term">
                    <span className="term-value">3</span>
                  </div>

                  <button
                    className={`operator-btn ${isMinusPressed ? 'is-tutorial-pressed' : ''}`}
                    ref={minusBtnRef}
                  >
                    -
                  </button>

                  <div className="term-card constant-term">
                    <span className="term-value">2</span>
                  </div>

                  {/* Hand Pointer */}
                  <TutorialHand
                    x={handCoords.x}
                    y={handCoords.y}
                    isPressed={isPressed}
                    isDragging={isDragging}
                    visible={isHandVisible}
                  />
                </div>
              )}

              {stage === 'merged_all' && (
                <div
                  className="expression-list tutorial-expression-list"
                  ref={listRef}
                  style={{ position: 'relative' }}
                >
                  <div className="term-card variable-term">
                    <span className="term-value">6<span className="math-variable">x</span></span>
                  </div>

                  <button className="operator-btn">+</button>

                  <div className="term-card constant-term is-merge-pop">
                    <span className="term-value">1</span>
                  </div>

                  {/* Hand Pointer */}
                  <TutorialHand
                    x={handCoords.x}
                    y={handCoords.y}
                    isPressed={isPressed}
                    isDragging={isDragging}
                    visible={isHandVisible}
                  />
                </div>
              )}
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
