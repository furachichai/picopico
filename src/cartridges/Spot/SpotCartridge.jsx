import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { resolveAssetUrl } from '../../utils/assetUrl';
import {
  unlockAudio,
  playTap,
  playWrong,
  playCircleSketch,
  playVictory
} from './game/SpotSoundManager';
import './SpotCartridge.css';

/**
 * Strip outer balanced parentheses from a string:
 * e.g. "(6x + 12)" -> "6x + 12"
 */
function stripOuterParens(str) {
  if (!str) return '';
  const trimmed = str.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    let depth = 0;
    for (let i = 0; i < trimmed.length - 1; i++) {
      if (trimmed[i] === '(') depth++;
      else if (trimmed[i] === ')') depth--;
      if (depth === 0) {
        return trimmed;
      }
    }
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Hand-drawn animated Red Circle SVG specifically sized for an error token
 */
function HandDrawnCircleToken() {
  return (
    <div className="spot-token-circle-overlay">
      <svg
        className="spot-circle-svg"
        viewBox="0 0 54 54"
        preserveAspectRatio="none"
      >
        <path
          className="spot-circle-path"
          d="M 12,27 C 10,13 25,8 35,9 C 47,10 52,20 51,33 C 50,46 36,52 24,51 C 12,50 6,40 7,27 C 8,16 19,10 30,8"
        />
      </svg>
    </div>
  );
}

/**
 * Render sub-expression math tokens.
 * Each token (number, variable, operator) is interactively selectable.
 * When selected, the red circle is drawn around it.
 */
function renderMathTokens({
  str,
  stepIdx,
  side,
  isMistakeStep,
  fallbackErrorToken,
  selectedTokenKey,
  onSelectToken,
  disabled
}) {
  if (!str) return null;

  let normalized = str
    .replace(/!=/g, '≠')
    .replace(/!\./g, '·');

  normalized = normalized.replace(/\s\*\s/g, ' · ');

  const tokenRegex = /(\*[^*]+\*|\d+(?:\.\d+)?|[a-zA-Z]|\^[\w\d]+|[+\-·≠±=()\/]|\s+)/g;
  const rawTokens = normalized.match(tokenRegex) || [normalized];

  let fallbackMatched = false;

  return rawTokens.map((rawToken, idx) => {
    let token = rawToken;
    let isErrorTarget = false;

    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      isErrorTarget = true;
      token = token.slice(1, -1);
    } else if (
      isMistakeStep &&
      !fallbackMatched &&
      fallbackErrorToken &&
      token.trim() === String(fallbackErrorToken).trim()
    ) {
      isErrorTarget = true;
      fallbackMatched = true;
    }

    const tokenKey = `${stepIdx}-${side}-${idx}`;
    const isSelected = selectedTokenKey === tokenKey;

    const isWhitespace = /^\s+$/.test(token);
    const isClickable = !isWhitespace && !disabled;

    let tokenNode = null;
    if (isWhitespace) {
      return <span key={idx}> </span>;
    } else if (/^\d+(?:\.\d+)?$/.test(token)) {
      tokenNode = <span className="spot-math-token spot-math-num">{token}</span>;
    } else if (/^[a-zA-Z]$/.test(token)) {
      tokenNode = <span className="spot-math-token spot-math-var">{token}</span>;
    } else if (token.startsWith('^')) {
      tokenNode = <sup className="spot-math-token spot-math-sup">{token.slice(1)}</sup>;
    } else if (token === '(' || token === ')') {
      tokenNode = <span className="spot-math-token spot-math-paren">{token}</span>;
    } else if (/[+\-·≠±=]/.test(token)) {
      tokenNode = <span className="spot-math-token spot-math-op">{token}</span>;
    } else {
      tokenNode = <span className="spot-math-token">{token}</span>;
    }

    if (isClickable) {
      return (
        <span
          key={idx}
          className={`spot-interactive-token ${isSelected ? 'is-selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectToken({
              stepIdx,
              tokenKey,
              token,
              isErrorTarget
            });
          }}
        >
          {tokenNode}
          {isSelected && <HandDrawnCircleToken />}
        </span>
      );
    }

    return <React.Fragment key={idx}>{tokenNode}</React.Fragment>;
  });
}

/**
 * Render a mathematical expression (left or right side of equation).
 * Supports fractions and token-level selection.
 */
function renderMathExpression({
  rawStr,
  stepIdx,
  side,
  isMistakeStep,
  fallbackErrorToken,
  selectedTokenKey,
  onSelectToken,
  disabled
}) {
  if (!rawStr) return null;
  const str = rawStr.trim();

  const fractionMatch = str.match(
    /^(.*?)(?:\(([^)]+)\)|([a-zA-Z0-9^.·*+\-]+))\s*\/\s*(?:\(([^)]+)\)|([a-zA-Z0-9^.·*+\-]+))(.*?)$/
  );

  if (fractionMatch) {
    const prefix = fractionMatch[1];
    const num = fractionMatch[2] || fractionMatch[3];
    const den = fractionMatch[4] || fractionMatch[5];
    const suffix = fractionMatch[6];

    return (
      <span className="spot-math-expr">
        {prefix
          ? renderMathTokens({
              str: prefix,
              stepIdx,
              side: `${side}-pre`,
              isMistakeStep,
              fallbackErrorToken,
              selectedTokenKey,
              onSelectToken,
              disabled
            })
          : null}
        <span className="spot-fraction">
          <span className="spot-fraction-num">
            {renderMathTokens({
              str: stripOuterParens(num),
              stepIdx,
              side: `${side}-num`,
              isMistakeStep,
              fallbackErrorToken,
              selectedTokenKey,
              onSelectToken,
              disabled
            })}
          </span>
          <span className="spot-fraction-bar" />
          <span className="spot-fraction-den">
            {renderMathTokens({
              str: stripOuterParens(den),
              stepIdx,
              side: `${side}-den`,
              isMistakeStep,
              fallbackErrorToken,
              selectedTokenKey,
              onSelectToken,
              disabled
            })}
          </span>
        </span>
        {suffix
          ? renderMathTokens({
              str: suffix,
              stepIdx,
              side: `${side}-suf`,
              isMistakeStep,
              fallbackErrorToken,
              selectedTokenKey,
              onSelectToken,
              disabled
            })
          : null}
      </span>
    );
  }

  return (
    <span className="spot-math-expr">
      {renderMathTokens({
        str,
        stepIdx,
        side,
        isMistakeStep,
        fallbackErrorToken,
        selectedTokenKey,
        onSelectToken,
        disabled
      })}
    </span>
  );
}

/**
 * Parse lines of equation steps from config.
 */
function parseStepsConfig(stepsText, explicitMistakeIndex, explicitErrorToken) {
  const defaultSteps = [
    '3(2x + 4) = 24',
    '6x + 12 = 24',
    '(6x + 12)/3 = 24/3',
    '2x + *3* = 8',
    '2x = 5',
    'x = 5/2'
  ];

  const rawLines = (stepsText ? stepsText.split('\n') : defaultSteps)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//') && !line.startsWith('#'));

  let detectedMistakeIdx = -1;
  let detectedToken = null;

  const parsedSteps = rawLines.map((line, idx) => {
    let cleanLine = line;
    let isMarked = false;

    const inlineMatch = cleanLine.match(/\*([^*]+)\*/);
    if (inlineMatch && !cleanLine.startsWith('* ') && !cleanLine.endsWith(' *')) {
      isMarked = true;
      detectedMistakeIdx = idx;
      detectedToken = inlineMatch[1];
    } else if (cleanLine.startsWith('*') || cleanLine.startsWith('!')) {
      isMarked = true;
      cleanLine = cleanLine.slice(1).trim();
      detectedMistakeIdx = idx;
    }

    const eqIdx = cleanLine.indexOf('=');
    let left = cleanLine;
    let right = '';
    let hasEquals = false;

    if (eqIdx !== -1) {
      left = cleanLine.slice(0, eqIdx).trim();
      right = cleanLine.slice(eqIdx + 1).trim();
      hasEquals = true;
    }

    return {
      id: idx,
      raw: cleanLine,
      left,
      right,
      hasEquals,
      isMarked
    };
  });

  let finalMistakeIndex = 0;
  if (detectedMistakeIdx !== -1) {
    finalMistakeIndex = detectedMistakeIdx;
  } else if (typeof explicitMistakeIndex === 'number') {
    if (explicitMistakeIndex >= parsedSteps.length && explicitMistakeIndex > 0) {
      finalMistakeIndex = explicitMistakeIndex - 1;
    } else {
      finalMistakeIndex = explicitMistakeIndex;
    }
  } else {
    finalMistakeIndex = Math.min(3, Math.max(0, parsedSteps.length - 2));
  }

  const finalErrorToken = detectedToken || explicitErrorToken || '3';

  return { steps: parsedSteps, mistakeIndex: finalMistakeIndex, errorToken: finalErrorToken };
}

export default function SpotCartridge({
  config = {},
  slideBackground = null,
  onComplete,
  preview = false
}) {
  const maxAttempts = config.maxAttempts || 2;

  // Background resolution: cartridge config.background or inherited slideBackground
  const bgImage = config.background || config.backgroundImage || config.globalBackground;
  const hasAnyBackground = Boolean(bgImage || slideBackground);

  const bgStyle = useMemo(() => {
    if (!bgImage) {
      if (slideBackground) {
        return { background: 'transparent' };
      }
      return null;
    }
    const resolved = resolveAssetUrl(bgImage);
    const isGradient = resolved.startsWith('linear-gradient(') || resolved.startsWith('radial-gradient(');
    const isUrl = resolved.startsWith('url(') || resolved.startsWith('data:') || resolved.startsWith('http://') || resolved.startsWith('https://') || resolved.startsWith('/') || resolved.startsWith('./') || resolved.startsWith('blob:');

    if (isGradient) {
      return { backgroundImage: resolved };
    }
    if (isUrl) {
      const formatted = resolved.startsWith('url(') ? resolved : `url("${resolved}")`;
      return {
        backgroundImage: formatted,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return { backgroundColor: resolved };
  }, [bgImage, slideBackground]);

  const { steps, mistakeIndex, errorToken } = useMemo(
    () => parseStepsConfig(config.stepsText, config.mistakeIndex, config.errorToken),
    [config.stepsText, config.mistakeIndex, config.errorToken]
  );

  const [attemptsLeft, setAttemptsLeft] = useState(maxAttempts);
  const [selectedToken, setSelectedToken] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const shakeTimerRef = useRef(null);

  // Reset state on config change
  useEffect(() => {
    setAttemptsLeft(maxAttempts);
    setSelectedToken(null);
    setIsShaking(false);
    setIsWon(false);
    setIsFailed(false);
  }, [config.stepsText, config.mistakeIndex, config.errorToken, maxAttempts]);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  const handleSelectToken = (tokenData) => {
    if (preview || isWon || isFailed) return;
    unlockAudio();
    playCircleSketch();
    setSelectedToken(tokenData);
  };

  const handleGotcha = () => {
    if (preview || isWon || isFailed || !selectedToken) return;
    unlockAudio();

    if (selectedToken.isErrorTarget) {
      // Correct! Error validated!
      setIsWon(true);
      playVictory();

      // Confetti burst!
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.55 },
        zIndex: 9999
      });

      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 1300);
      }
    } else {
      // Wrong selection!
      playWrong();

      setIsShaking(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        setIsShaking(false);
      }, 500);

      const nextAttempts = attemptsLeft - 1;
      setAttemptsLeft(nextAttempts);

      if (nextAttempts <= 0) {
        setIsFailed(true);
      }
    }
  };

  const handleRetry = () => {
    unlockAudio();
    playTap();
    setAttemptsLeft(maxAttempts);
    setSelectedToken(null);
    setIsShaking(false);
    setIsWon(false);
    setIsFailed(false);
  };

  return (
    <div
      className={`spot-cartridge ${hasAnyBackground ? 'has-bg' : 'no-bg'}`}
      style={bgStyle || undefined}
    >
      {/* Live hearts below progress bar, top right */}
      <div className="spot-hearts-container">
        {Array.from({ length: maxAttempts }).map((_, i) => (
          <span
            key={i}
            className={`spot-heart ${i >= attemptsLeft ? 'lost' : ''}`}
          >
            ❤️
          </span>
        ))}
      </div>

      {/* Scrollable equations strictly under the progress bar */}
      <div className="spot-scroll-container">
        {/* Single shared CSS grid for all steps — guarantees 100% collinear alignment of '=' */}
        <div className={`spot-steps-grid ${isShaking ? 'shake' : ''}`}>
          {steps.map((step, idx) => {
            const isTargetMistakeStep = idx === mistakeIndex;

            if (step.hasEquals) {
              return (
                <React.Fragment key={step.id}>
                  {/* Left expression: Column 1, right-aligned to '=' */}
                  <div className="spot-cell spot-cell-left">
                    {renderMathExpression({
                      rawStr: step.left,
                      stepIdx: idx,
                      side: 'left',
                      isMistakeStep: isTargetMistakeStep,
                      fallbackErrorToken: errorToken,
                      selectedTokenKey: selectedToken?.tokenKey,
                      onSelectToken: handleSelectToken,
                      disabled: preview || isWon || isFailed
                    })}
                  </div>

                  {/* '=' sign: Column 2, perfectly collinear across all rows */}
                  <div className="spot-cell spot-cell-equals">
                    <span
                      className={`spot-interactive-token ${selectedToken?.tokenKey === `${idx}-equals` ? 'is-selected' : ''}`}
                      onClick={(e) => {
                        if (preview || isWon || isFailed) return;
                        e.stopPropagation();
                        handleSelectToken({
                          stepIdx: idx,
                          tokenKey: `${idx}-equals`,
                          token: '=',
                          isErrorTarget: isTargetMistakeStep && (errorToken === '=' || step.raw.includes('*=*'))
                        });
                      }}
                    >
                      =
                      {selectedToken?.tokenKey === `${idx}-equals` && <HandDrawnCircleToken />}
                    </span>
                  </div>

                  {/* Right expression: Column 3, left-aligned starting after '=' */}
                  <div className="spot-cell spot-cell-right">
                    {renderMathExpression({
                      rawStr: step.right,
                      stepIdx: idx,
                      side: 'right',
                      isMistakeStep: isTargetMistakeStep,
                      fallbackErrorToken: errorToken,
                      selectedTokenKey: selectedToken?.tokenKey,
                      onSelectToken: handleSelectToken,
                      disabled: preview || isWon || isFailed
                    })}
                  </div>
                </React.Fragment>
              );
            }

            return (
              <div
                key={step.id}
                className="spot-cell spot-cell-full"
              >
                {renderMathExpression({
                  rawStr: step.raw,
                  stepIdx: idx,
                  side: 'center',
                  isMistakeStep: isTargetMistakeStep,
                  fallbackErrorToken: errorToken,
                  selectedTokenKey: selectedToken?.tokenKey,
                  onSelectToken: handleSelectToken,
                  disabled: preview || isWon || isFailed
                })}
              </div>
            );
          })}
        </div>

        {/* Retry button if player ran out of attempts */}
        {isFailed && (
          <div className="spot-retry-wrapper">
            <button
              type="button"
              className="spot-retry-btn"
              onClick={handleRetry}
            >
              <span>🔄</span>
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>

      {/* GOTCHA! Validation button at the bottom */}
      {!isFailed && !preview && (
        <div className="spot-bottom-bar">
          <button
            type="button"
            className={`spot-gotcha-btn ${!selectedToken ? 'disabled' : ''}`}
            disabled={!selectedToken || isWon}
            onClick={handleGotcha}
          >
            GOTCHA!
          </button>
        </div>
      )}
    </div>
  );
}
