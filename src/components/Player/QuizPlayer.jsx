import React, { useState, useEffect, useCallback } from 'react';
import { formatExponents } from '../../utils/textFormatters';
import ReactDOM from 'react-dom';
import confetti from 'canvas-confetti';
import './QuizPlayer.css';
import { parseFraction, FractionComponent } from '../../utils/FractionUtils.jsx';
import { parseExpression, astToTokens, validateOperation, evaluateNode, replaceNodeWithResult, simplifyParens, isFullySimplified, getParenGroups, findNodeById, getNodeIdsInScope, getOperationTokenIds, resetIdCounter } from '../../cartridges/PEMDAS/game/ExpressionEngine';
import { getExpression, editorToEngine } from './PEMExpressionPool';

/**
 * QuizPlayer Component
 * ...
 */
const QuizPlayer = ({ data, onNext, onBanner, disabled = false, debugMode = false, isActive = true }) => {
    // -------------------------------------------------------------------------
    // 1. DATA EXTRACTION (Common + NL)
    // -------------------------------------------------------------------------
    const quizType = data.metadata?.quizType || 'classic';
    const visualMode = data.metadata?.visualMode || false;

    // Classic/TF/4SQ Data
    const options = data.metadata?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    const correctIndex = data.metadata?.correctIndex ?? 0;
    const correctIndices = data.metadata?.correctIndices || [correctIndex];
    const isMultiSelect = quizType === '4sq' && correctIndices.length > 1;
    const colors = ['#3A86FF', '#4ECDC4', '#9B72CF', '#FF8C00', '#00B4D8', '#8338EC'];
    const maxAttempts = Math.max(1, options.length - 1);

    // NL Data
    const nlConfig = data.metadata?.nlConfig || {};
    // Extract raw values first
    const { min: rawMin = 0, max: rawMax = 10, stepCount = 10, hideLabels = false, correctValue: rawCorrect = 5, useFractions = false } = nlConfig;

    // Parse values to floats
    const min = parseFraction(rawMin);
    const max = parseFraction(rawMax);
    const correctValue = parseFraction(rawCorrect);

    // -------------------------------------------------------------------------
    // 2. STATE DEFINITIONS
    // -------------------------------------------------------------------------
    // Common State
    const [selectedOption, setSelectedOption] = useState(null);
    const [wrongIndices, setWrongIndices] = useState(new Set());
    const [isSolved, setIsSolved] = useState(false);
    const [isFailed, setIsFailed] = useState(false);
    const [shakingIndex, setShakingIndex] = useState(null);
    const [pulse, setPulse] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    // NL State
    const [nlValue, setNlValue] = useState(min);
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = React.useRef(null);

    // ChatQuiz State (always declared to avoid hook order issues)
    const chatContainerRef = React.useRef(null);
    const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
    const [chatWrongSets, setChatWrongSets] = useState({});
    const [chatSolvedSet, setChatSolvedSet] = useState(new Set());
    const [chatShaking, setChatShaking] = useState(null);
    const [chatFinished, setChatFinished] = useState(false);
    const [chatOptionsVisible, setChatOptionsVisible] = useState(false);
    const [chatFadingOut, setChatFadingOut] = useState(false);
    const chatAdvanceTimer = React.useRef(null);

    // PEM State (always declared to avoid hook order issues)
    const [pemAst, setPemAst] = useState(null);
    const [pemScopeId, setPemScopeId] = useState(null);
    const [pemErrors, setPemErrors] = useState(0);
    const [pemFailed, setPemFailed] = useState(false);
    const [pemSolved, setPemSolved] = useState(false);
    const [pemFlash, setPemFlash] = useState(null); // { ids: [], color: 'red'|'green' }
    const [pemMerge, setPemMerge] = useState(null); // { leftIds, rightIds, opId, result, phase: 'slide'|'pop' }
    const [pemNoteIndex, setPemNoteIndex] = useState(0);
    const [pemExprStr, setPemExprStr] = useState(null);
    const [pemArrow, setPemArrow] = useState(false);
    const [pemGameLevel, setPemGameLevel] = useState(0);
    const [isPemPowerupActive, setIsPemPowerupActive] = useState(false);
    const pemAudioCtx = React.useRef(null);
    const globalAudioCtx = React.useRef(null);

    // Match Quiz State and Refs
    const [matchSquares, setMatchSquares] = useState([]);
    const [activeMatchDragId, setActiveMatchDragId] = useState(null);
    const matchContainerRef = React.useRef(null);
    const matchStateRef = React.useRef({ squares: [], draggedId: null, pointer: { x: 0, y: 0, startX: 0, startY: 0 }, dims: { w: 360, h: 540 } });

    // Generate a fixed set of subtle rising bubbles for the Match Drag background
    const matchBubbles = React.useMemo(() => {
        const list = [];
        for (let i = 0; i < 20; i++) {
            const size = Math.random() * 15 + 8; // 8px to 23px
            const left = Math.random() * 100; // 0% to 100%
            const duration = Math.random() * 4 + 6; // 6s to 10s (slow, subtle)
            const delay = Math.random() * 6; // 0s to 6s
            const sway = (Math.random() - 0.5) * 40; // -20px to 20px
            list.push({ id: i, size, left, duration, delay, sway });
        }
        return list;
    }, []);

    const attemptsUsed = wrongIndices.size;

    // -------------------------------------------------------------------------
    // 3. HELPERS & EFFECTS
    // -------------------------------------------------------------------------
    const ensureAudioAuthorized = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext && !globalAudioCtx.current) {
                globalAudioCtx.current = new AudioContext();
            }
            if (globalAudioCtx.current && globalAudioCtx.current.state === 'suspended') {
                globalAudioCtx.current.resume();
            }
        } catch (e) {
            console.warn('Failed to pre-authorize AudioContext:', e);
        }
    };

    const playSound = (type) => {
        try {
            if (!globalAudioCtx.current) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                globalAudioCtx.current = new AC();
            }
            const ctx = globalAudioCtx.current;

            const schedule = () => {
                try {
                    const now = ctx.currentTime;
                    if (type === 'correct') {
                        const osc1 = ctx.createOscillator();
                        const osc2 = ctx.createOscillator();
                        const gain1 = ctx.createGain();
                        const gain2 = ctx.createGain();
                        osc1.type = 'sine';
                        osc1.frequency.setValueAtTime(523.25, now);
                        osc1.frequency.setValueAtTime(659.25, now + 0.1);
                        gain1.gain.setValueAtTime(0.35, now);
                        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                        osc1.connect(gain1); gain1.connect(ctx.destination);
                        osc1.start(now); osc1.stop(now + 0.35);
                        osc2.type = 'sine';
                        osc2.frequency.setValueAtTime(783.99, now + 0.1);
                        osc2.frequency.setValueAtTime(1046.50, now + 0.2);
                        gain2.gain.setValueAtTime(0.35, now + 0.1);
                        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                        osc2.connect(gain2); gain2.connect(ctx.destination);
                        osc2.start(now + 0.1); osc2.stop(now + 0.45);
                    } else if (type === 'wrong') {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(180, now);
                        osc.frequency.linearRampToValueAtTime(120, now + 0.25);
                        gain.gain.setValueAtTime(0.4, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 0.35);
                    } else if (type === 'fail') {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(120, now);
                        osc.frequency.setValueAtTime(90, now + 0.15);
                        gain.gain.setValueAtTime(0.35, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 0.45);
                    } else if (type === 'attach') {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(600, now);
                        osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
                        gain.gain.setValueAtTime(0.3, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 0.1);
                    } else if (type === 'detach') {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(250, now);
                        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
                        gain.gain.setValueAtTime(0.25, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 0.12);
                    }
                } catch(e) {}
            };

            if (ctx.state === 'running') {
                schedule();
            } else {
                ctx.resume().then(schedule).catch(() => {});
            }
        } catch (err) {
            // silent
        }
    };

    // Global click/touch unlocker for AudioContext — ensures audio works on first interaction.
    // Safari requires await ctx.resume() to complete before audio can be scheduled.
    useEffect(() => {
        const unlockAudio = async () => {
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                if (!globalAudioCtx.current) globalAudioCtx.current = new AC();
                if (!pemAudioCtx.current) pemAudioCtx.current = new AC();
                const contexts = [globalAudioCtx.current, pemAudioCtx.current];
                for (const ctx of contexts) {
                    if (!ctx) continue;
                    if (ctx.state !== 'running') {
                        await ctx.resume();
                    }
                    // Safari trick: play a silent buffer to fully unlock the context
                    if (ctx.state === 'running') {
                        try {
                            const buf = ctx.createBuffer(1, 1, ctx.sampleRate || 22050);
                            const src = ctx.createBufferSource();
                            src.buffer = buf;
                            src.connect(ctx.destination);
                            src.start(0);
                        } catch(e) {}
                    }
                }
            } catch (e) {}
        };
        // Re-resume when user returns from background/tab switch (Safari suspends on blur)
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                [globalAudioCtx.current, pemAudioCtx.current].forEach(ctx => {
                    if (ctx && ctx.state === 'suspended') ctx.resume();
                });
            }
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);
        window.addEventListener('touchend', unlockAudio);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('touchend', unlockAudio);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    // ChatQuiz auto-scroll
    useEffect(() => {
        if (quizType === 'chatquiz' && chatContainerRef.current) {
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            }, 50);
        }
    }, [quizType, currentNodeIndex, chatSolvedSet.size, chatOptionsVisible]);

    // ChatQuiz auto-advance: message nodes auto-advance; quiz nodes show options after delay
    useEffect(() => {
        if (quizType !== 'chatquiz' || !isActive) return;
        const chatNodes = data.metadata?.chatNodes || [];
        const currentNode = chatNodes[currentNodeIndex];
        if (!currentNode || chatFinished) return;

        // Clear any previous timer
        if (chatAdvanceTimer.current) clearTimeout(chatAdvanceTimer.current);

        if (currentNode.type === 'message' || currentNode.type === 'reply' || currentNode.type === 'sticker') {
            // Auto-advance after pause
            setChatOptionsVisible(false);
            const isLast = currentNodeIndex >= chatNodes.length - 1;
            if (!isLast) {
                chatAdvanceTimer.current = setTimeout(() => {
                    setCurrentNodeIndex(prev => Math.min(prev + 1, chatNodes.length - 1));
                }, 1200);
            }
        } else if (currentNode.type === 'quiz') {
            // Show options after a brief pause
            setChatOptionsVisible(false);
            chatAdvanceTimer.current = setTimeout(() => {
                setChatOptionsVisible(true);
            }, 600);
        }

        return () => {
            if (chatAdvanceTimer.current) clearTimeout(chatAdvanceTimer.current);
        };
    }, [quizType, currentNodeIndex, chatFinished, isActive]);

    useEffect(() => {
        if (quizType === 'pem' && !pemAst && !pemSolved && !pemFailed) {
            try {
                resetIdCounter();
                let expr;
                const mode = data.metadata?.pemMode || 'P';
                const diff = data.metadata?.pemDifficulty || 5;
                if (mode === 'MANUAL' && data.metadata?.pemExpression) {
                    expr = editorToEngine(data.metadata.pemExpression);
                } else if (mode === 'GAME') {
                    const gameModes = ['AS', 'MD', 'MDAS', 'EAS', 'EMDAS', 'P', 'P2', 'PP', 'PPP'];
                    const currentMode = gameModes[Math.min(pemGameLevel, gameModes.length - 1)];
                    expr = getExpression(currentMode, 5); // always diff 5
                } else {
                    expr = getExpression(mode, diff);
                }
                setPemExprStr(expr);
                setPemAst(parseExpression(expr));
            } catch(e) {
                console.error('PEM parse error:', e);
                setPemExprStr('2 + (4 - 2 * 2) ^ 2 - 6 / 3');
                setPemAst(parseExpression('2 + (4 - 2 * 2) ^ 2 - 6 / 3'));
            }
        }
    }, [quizType, pemAst, pemSolved, pemFailed, data, pemGameLevel]);

    const getThumbImage = (index) => {
        return index === 0 ? '/assets/quiz/thumbs_up.png' : '/assets/quiz/thumbs_down.png';
    };

    // -------------------------------------------------------------------------
    // 4. HANDLERS
    // -------------------------------------------------------------------------
    const handleSuccess = () => {
        setIsSolved(true);
        setPulse(true);
        playSound('correct');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        if (onBanner) onBanner('correct', 'Topo!');
        // Mark slide solved but do NOT auto-advance — user taps to move forward
        if (onNext) onNext();
    };

    const handleWrong = (index) => {
        const newWrongIndices = new Set(wrongIndices).add(index);
        setWrongIndices(newWrongIndices);
        setShakingIndex(index);
        setTimeout(() => setShakingIndex(null), 500); // Clear so animation can re-trigger

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        if (newWrongIndices.size >= maxAttempts) {
            setIsFailed(true);
            playSound('fail');
            if (onBanner) onBanner('fail', 'Moco!');
            // Mark slide solved but do NOT auto-advance
            if (onNext) onNext();
        } else {
            playSound('wrong');
        }
    };

    const handleSelect = (index) => {
        ensureAudioAuthorized();
        if (isSolved || isFailed) return;
        if (isMultiSelect) {
            const newSelected = new Set(selectedIndices);
            newSelected.has(index) ? newSelected.delete(index) : newSelected.add(index);
            setSelectedIndices(newSelected);
            return;
        }
        if (wrongIndices.has(index)) return;
        setSelectedOption(index);
        // For 4sq with single correct answer, use correctIndices[0] since editor saves there
        const actualCorrect = (quizType === '4sq') ? correctIndices[0] : correctIndex;
        index === actualCorrect ? handleSuccess() : handleWrong(index);
    };

    const handleReadySubmit = () => {
        if (selectedIndices.size === 0) return;
        const selectionArray = Array.from(selectedIndices).sort();
        const correctArray = [...correctIndices].sort();
        const isCorrect = JSON.stringify(selectionArray) === JSON.stringify(correctArray);
        isCorrect ? handleSuccess() : handleWrong(`attempt-${attemptsUsed}`);
    };

    // NL Handlers
    const handleNlSubmit = () => {
        if (isSolved || isFailed) return;
        if (Math.abs(nlValue - correctValue) < 0.001) handleSuccess();
        else handleWrong(nlValue);
    };

    const handleDragStart = (e) => {
        ensureAudioAuthorized();
        if (isSolved || isFailed || disabled) return;
        setIsDragging(true);
    };

    const handleDragMove = useCallback((e) => {
        if (!isDragging || !trackRef.current) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        setNlValue(min + (percent * (max - min)));
    }, [isDragging, min, max]);

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);
        const stepSize = (max - min) / stepCount;
        const stepsTaken = Math.round((nlValue - min) / stepSize);
        const snapped = min + (stepsTaken * stepSize);
        setNlValue(Math.min(max, Math.max(min, snapped)));
    }, [isDragging, nlValue, max, min, stepCount]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        } else {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // -------------------------------------------------------------------------
    // MATCH QUIZ HANDLERS & PHYSICS
    // -------------------------------------------------------------------------
    const handleMatchDragMove = useCallback((e) => {
        const state = matchStateRef.current;
        if (!state.draggedId || !matchContainerRef.current) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const el = matchContainerRef.current;
        const containerRect = el.getBoundingClientRect();
        const scaleX = containerRect.width / el.clientWidth || 1;
        const scaleY = containerRect.height / el.clientHeight || 1;

        state.pointer.x = (clientX - containerRect.left) / scaleX;
        state.pointer.y = (clientY - containerRect.top) / scaleY;
    }, []);

    const handleMatchDragEnd = useCallback(() => {
        const state = matchStateRef.current;
        const draggedId = state.draggedId;
        if (!draggedId) return;

        // Clear hover scaling classes directly on DOM elements
        state.squares.forEach(sq => {
            const el = document.getElementById(`sq-el-${sq.id}`);
            if (el) el.classList.remove('drag-hover');
        });

        const sq1 = state.squares.find(s => s.id === draggedId);
        state.draggedId = null;
        state.hoveredId = null;
        setActiveMatchDragId(null);

        if (!sq1) return;

        const W_s = 100;
        const H_s = 100;
        const c1x = sq1.x + W_s / 2;
        const c1y = sq1.y + H_s / 2;

        let bestMatch = null;
        let maxOverlap = 0;

        state.squares.forEach(sq2 => {
            if (sq2.id === draggedId || sq2.matched) return;

            const c2x = sq2.x + W_s / 2;
            const c2y = sq2.y + H_s / 2;

            const dx = c2x - c1x;
            const dy = c2y - c1y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const activeRadius = 70;

            if (dist < activeRadius) {
                const overlap = activeRadius - dist;
                if (overlap > maxOverlap) {
                    maxOverlap = overlap;
                    bestMatch = sq2;
                }
            }
        });

        if (bestMatch) {
            if (sq1.pairIndex === bestMatch.pairIndex && sq1.type !== bestMatch.type) {
                // Correct match! Two-stage premium animation
                sq1.flashGreen = true;
                bestMatch.flashGreen = true;
                sq1.x = bestMatch.x;
                sq1.y = bestMatch.y;
                sq1.vx = 0;
                sq1.vy = 0;
                bestMatch.vx = 0;
                bestMatch.vy = 0;
                sq1.merging = false;
                bestMatch.merging = false;

                playSound('correct');
                
                // Immediately render snapped positions and green flash (cards stay at full scale)
                setMatchSquares(state.squares.map(s => {
                    if (s.id === sq1.id || s.id === bestMatch.id) {
                        return { ...s, isDragging: false, merging: false, flashGreen: true, x: s.id === sq1.id ? bestMatch.x : s.x, y: s.id === sq1.id ? bestMatch.y : s.y };
                    }
                    return { ...s, isDragging: false };
                }));

                // Phase 2: After 375ms (25% shorter), start the merging shrink-fade animation
                setTimeout(() => {
                    sq1.merging = true;
                    bestMatch.merging = true;

                    setMatchSquares(state.squares.map(s => {
                        if (s.id === sq1.id || s.id === bestMatch.id) {
                            return { ...s, isDragging: false, merging: true, flashGreen: true };
                        }
                        return { ...s, isDragging: false };
                    }));

                    // Phase 3: After another 500ms, finalize matched states and check if quiz is solved
                    setTimeout(() => {
                        sq1.flashGreen = false;
                        bestMatch.flashGreen = false;
                        sq1.matched = true;
                        bestMatch.matched = true;
                        sq1.merging = false;
                        bestMatch.merging = false;

                        const allMatched = state.squares.every(s => s.matched);
                        if (allMatched) {
                            handleSuccess();
                        } else {
                            setMatchSquares(state.squares.map(s => ({ ...s, isDragging: false })));
                        }
                    }, 500);
                }, 375);
            } else {
                // Wrong match! Snap together, turn solid red, freeze static for 500ms, then split.
                // Calculate separation direction BEFORE snapping positions
                const c2x = bestMatch.x + W_s / 2;
                const c2y = bestMatch.y + H_s / 2;
                const dx = c2x - c1x;
                const dy = c2y - c1y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;

                // Snap sq1 on top of bestMatch and freeze both
                sq1.x = bestMatch.x;
                sq1.y = bestMatch.y;
                sq1.vx = 0;
                sq1.vy = 0;
                bestMatch.vx = 0;
                bestMatch.vy = 0;
                sq1.flashRed = true;
                bestMatch.flashRed = true;

                playSound('wrong');

                // Immediately render the solid red stacked cards
                setMatchSquares(state.squares.map(s => {
                    if (s.id === sq1.id) {
                        return { ...s, isDragging: false, flashRed: true, x: bestMatch.x, y: bestMatch.y, vx: 0, vy: 0 };
                    }
                    if (s.id === bestMatch.id) {
                        return { ...s, isDragging: false, flashRed: true, vx: 0, vy: 0 };
                    }
                    return { ...s, isDragging: false };
                }));

                // After 250ms static red, clear red state and split apart
                setTimeout(() => {
                    sq1.flashRed = false;
                    bestMatch.flashRed = false;
                    sq1.vx = -nx * 2.5;
                    sq1.vy = -ny * 2.5;
                    bestMatch.vx = nx * 2.5;
                    bestMatch.vy = ny * 2.5;
                    setMatchSquares(state.squares.map(s => ({ ...s, isDragging: false, flashRed: false })));
                }, 250);
            }
        } else {
            // Drop in empty space, float away
            sq1.vx = (Math.random() - 0.5) * 0.4;
            sq1.vy = (Math.random() - 0.5) * 0.4;
            setMatchSquares(state.squares.map(s => ({ ...s, isDragging: false })));
        }
    }, [handleSuccess]);

    const handleMatchDragStart = (e, sqId) => {
        ensureAudioAuthorized();
        if (isSolved || isFailed || disabled) return;
        e.preventDefault();

        const sq = matchStateRef.current.squares.find(s => s.id === sqId);
        if (!sq || sq.matched) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        matchStateRef.current.draggedId = sqId;
        matchStateRef.current.hoveredId = null;
        matchStateRef.current.hoverCandidateId = null;
        matchStateRef.current.hoverCandidateStart = 0;
        matchStateRef.current.lastX = undefined;
        matchStateRef.current.lastY = undefined;
        setActiveMatchDragId(sqId);

        if (!matchContainerRef.current) return;
        const el = matchContainerRef.current;
        const containerRect = el.getBoundingClientRect();
        const scaleX = containerRect.width / el.clientWidth || 1;
        const scaleY = containerRect.height / el.clientHeight || 1;

        const pointerX = (clientX - containerRect.left) / scaleX;
        const pointerY = (clientY - containerRect.top) / scaleY;

        const W_s = 100;
        const H_s = 100;
        const margin = 12;
        const containerW = el.clientWidth || 360;
        const containerH = el.clientHeight || 540;

        // Auto-readjust card position so it centers exactly on the grab point
        sq.x = pointerX - W_s / 2;
        sq.y = pointerY - H_s / 2;

        // Bounding limits enforcement
        sq.x = Math.max(margin, Math.min(containerW - W_s - margin, sq.x));
        sq.y = Math.max(margin, Math.min(containerH - H_s - margin, sq.y));

        matchStateRef.current.pointer = {
            x: pointerX,
            y: pointerY,
            startX: W_s / 2,
            startY: H_s / 2
        };

        setMatchSquares(matchStateRef.current.squares.map(s => {
            if (s.id === sqId) return { ...s, x: sq.x, y: sq.y, isDragging: true };
            return s;
        }));
    };

    useEffect(() => {
        if (activeMatchDragId !== null) {
            window.addEventListener('mousemove', handleMatchDragMove);
            window.addEventListener('mouseup', handleMatchDragEnd);
            window.addEventListener('touchmove', handleMatchDragMove, { passive: false });
            window.addEventListener('touchend', handleMatchDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMatchDragMove);
            window.removeEventListener('mouseup', handleMatchDragEnd);
            window.removeEventListener('touchmove', handleMatchDragMove);
            window.removeEventListener('touchend', handleMatchDragEnd);
        };
    }, [activeMatchDragId, handleMatchDragMove, handleMatchDragEnd]);

    useEffect(() => {
        if (quizType !== 'match') return;

        const matchAnswers = data.metadata?.matchAnswers || ['5', '6', '9', '7', '8'];
        const matchContentType = data.metadata?.matchContentType || 'order_of_operations';
        const numPairs = options.length;
        const totalCards = numPairs * 2;

        let containerW = 360;
        let containerH = 540;
        if (matchContainerRef.current) {
            const el = matchContainerRef.current;
            if (el.clientWidth > 0) containerW = el.clientWidth;
            if (el.clientHeight > 0) containerH = el.clientHeight;
        }
        matchStateRef.current.dims = { w: containerW, h: containerH };

        const W_s = 100;
        const H_s = 100;
        const margin = 12;
        const gap = 10; // minimum gap between cards

        // Calculate grid dimensions to fit all cards without overlap
        // Try increasing cols until we find a layout where totalCards <= cols * rows
        let cols = 2;
        let rows = Math.ceil(totalCards / cols);
        // Prefer a layout that fits within the container with room for spacing
        while (cols < 6) {
            rows = Math.ceil(totalCards / cols);
            const cellW = (containerW - 2 * margin) / cols;
            const cellH = (containerH - 2 * margin) / rows;
            if (cellW >= W_s + gap && cellH >= H_s + gap) break;
            cols++;
        }
        rows = Math.ceil(totalCards / cols);

        const cellW = (containerW - 2 * margin) / cols;
        const cellH = (containerH - 2 * margin) / rows;

        // Generate one slot per grid cell, centered in the cell
        const slots = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (slots.length >= totalCards) break;
                const baseX = margin + c * cellW + (cellW - W_s) / 2;
                const baseY = margin + r * cellH + (cellH - H_s) / 2;
                // Add small random jitter to avoid rigid grid appearance
                const jitterX = (Math.random() - 0.5) * 16;
                const jitterY = (Math.random() - 0.5) * 16;
                const x = Math.max(margin, Math.min(containerW - W_s - margin, baseX + jitterX));
                const y = Math.max(margin, Math.min(containerH - H_s - margin, baseY + jitterY));
                slots.push({ x, y });
            }
        }

        // Shuffle the slots so questions and answers appear randomly distributed
        const shuffledSlots = [...slots].sort(() => Math.random() - 0.5);

        // Auto-generate math content if matchContentType is set
        let effectiveOptions = options;
        let effectiveAnswers = matchAnswers;

        if (matchContentType === 'basic_arithmetic') {
            const ops = ['+', '-', '×', '÷'];
            const pairs = [];
            const usedExpressions = new Set();
            for (let i = 0; i < numPairs; i++) {
                let expr, result, a, b, op;
                let attempts = 0;
                do {
                    op = ops[Math.floor(Math.random() * ops.length)];
                    if (op === '+') { a = Math.floor(Math.random() * 9) + 1; b = Math.floor(Math.random() * 9) + 1; result = a + b; }
                    else if (op === '-') { a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * a) + 1; result = a - b; }
                    else if (op === '×') { a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * 9) + 2; result = a * b; }
                    else { b = Math.floor(Math.random() * 8) + 2; result = Math.floor(Math.random() * 9) + 1; a = b * result; }
                    expr = `${a} ${op} ${b}`;
                    attempts++;
                } while (usedExpressions.has(expr) && attempts < 50);
                usedExpressions.add(expr);
                pairs.push({ expr, result: String(result) });
            }
            effectiveOptions = pairs.map(p => p.expr);
            effectiveAnswers = pairs.map(p => p.result);
        } else if (matchContentType === 'order_of_operations') {
            const addSubOps = ['+', '-'];
            const mulDivOps = ['×', '÷'];
            const pairs = [];
            const usedExpressions = new Set();
            for (let i = 0; i < numPairs; i++) {
                let expr, result, attempts = 0;
                do {
                    // Pick one from +-  and one from */
                    const asOp = addSubOps[Math.floor(Math.random() * 2)];
                    const mdOp = mulDivOps[Math.floor(Math.random() * 2)];
                    // Randomly decide order: [a asOp b mdOp c] or [a mdOp b asOp c]
                    if (Math.random() < 0.5) {
                        // Form: a +-  b */  c
                        let a = Math.floor(Math.random() * 8) + 1;
                        let b, c, mdResult;
                        if (mdOp === '×') {
                            b = Math.floor(Math.random() * 5) + 2;
                            c = Math.floor(Math.random() * 5) + 2;
                            mdResult = b * c;
                        } else {
                            c = Math.floor(Math.random() * 5) + 2;
                            mdResult = Math.floor(Math.random() * 5) + 1;
                            b = c * mdResult;
                        }
                        result = asOp === '+' ? a + mdResult : a - mdResult;
                        expr = `${a} ${asOp} ${b} ${mdOp} ${c}`;
                    } else {
                        // Form: a */  b +-  c
                        let c = Math.floor(Math.random() * 8) + 1;
                        let a, b, mdResult;
                        if (mdOp === '×') {
                            a = Math.floor(Math.random() * 5) + 2;
                            b = Math.floor(Math.random() * 5) + 2;
                            mdResult = a * b;
                        } else {
                            b = Math.floor(Math.random() * 5) + 2;
                            mdResult = Math.floor(Math.random() * 5) + 1;
                            a = b * mdResult;
                        }
                        result = asOp === '+' ? mdResult + c : mdResult - c;
                        expr = `${a} ${mdOp} ${b} ${asOp} ${c}`;
                    }
                    attempts++;
                } while ((usedExpressions.has(expr) || result < 0) && attempts < 50);
                usedExpressions.add(expr);
                pairs.push({ expr, result: String(result) });
            }
            effectiveOptions = pairs.map(p => p.expr);
            effectiveAnswers = pairs.map(p => p.result);
        }

        const list = [];
        for (let i = 0; i < numPairs; i++) {
            const slotQ = shuffledSlots[i * 2] || slots[0];
            list.push({
                id: `q-${i}`,
                type: 'question',
                text: effectiveOptions[i],
                pairIndex: i,
                x: slotQ.x,
                y: slotQ.y,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                matched: false,
                flashRed: false
            });

            const slotA = shuffledSlots[i * 2 + 1] || slots[slots.length - 1];
            list.push({
                id: `a-${i}`,
                type: 'answer',
                text: effectiveAnswers[i] || '',
                pairIndex: i,
                x: slotA.x,
                y: slotA.y,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                matched: false,
                flashRed: false
            });
        }

        matchStateRef.current.squares = list;
        setMatchSquares(list);
    }, [quizType, data, options]);

    useEffect(() => {
        if (quizType !== 'match' || !matchContainerRef.current) return;

        const measure = () => {
            if (!matchContainerRef.current) return;
            const el = matchContainerRef.current;
            if (el.clientWidth > 0 && el.clientHeight > 0) {
                const newW = el.clientWidth;
                const newH = el.clientHeight;
                matchStateRef.current.dims = { w: newW, h: newH };

                const W_s = 100;
                const H_s = 100;
                const margin = 12;
                let adjusted = false;
                matchStateRef.current.squares.forEach(sq => {
                    const newX = Math.max(margin, Math.min(newW - W_s - margin, sq.x));
                    const newY = Math.max(margin, Math.min(newH - H_s - margin, sq.y));
                    if (newX !== sq.x || newY !== sq.y) {
                        sq.x = newX;
                        sq.y = newY;
                        adjusted = true;
                    }
                });

                if (adjusted) {
                    setMatchSquares([...matchStateRef.current.squares]);
                }
            }
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(matchContainerRef.current);
        return () => observer.disconnect();
    }, [quizType, matchSquares.length]);

    useEffect(() => {
        if (quizType !== 'match' || !isActive || isSolved || isFailed || disabled) return;

        let animFrameId;
        const elasticity = 0.3;
        const W_s = 100;
        const H_s = 100;
        const margin = 12;

        const loop = () => {
            const state = matchStateRef.current;
            const { squares, draggedId, dims } = state;
            if (!squares || squares.length === 0) {
                animFrameId = requestAnimationFrame(loop);
                return;
            }

            // Calculate dragged card velocity for brisk movement detection (shaking off/cancelling hover)
            let dragSpeed = 0;
            if (draggedId) {
                const sq1 = squares.find(s => s.id === draggedId);
                if (sq1) {
                    const currentX = state.pointer.x - state.pointer.startX;
                    const currentY = state.pointer.y - state.pointer.startY;
                    
                    if (state.lastX !== undefined && state.lastY !== undefined) {
                        const dx = currentX - state.lastX;
                        const dy = currentY - state.lastY;
                        dragSpeed = Math.sqrt(dx * dx + dy * dy);
                    }
                    state.lastX = currentX;
                    state.lastY = currentY;
                }
            } else {
                state.lastX = undefined;
                state.lastY = undefined;
            }

            // Grow hovered drop targets directly on DOM for premium performance
            let currentHoveredId = null;
            const briskThreshold = 7.0; // speed in layout pixels per frame above which hover breaks
            if (draggedId && dragSpeed < briskThreshold) {
                const sq1 = squares.find(s => s.id === draggedId);
                if (sq1 && !sq1.merging) {
                    const c1x = sq1.x + W_s / 2;
                    const c1y = sq1.y + H_s / 2;                    // 1. If another card is already tagging along (state.hoveredId),
                    // and we drag the pair over a third card, switch places!
                    let switchTarget = null;
                    let minSwitchDist = Infinity;

                    if (state.hoveredId && dragSpeed < 1.5) {
                        // Dragged card is barely moving — keep the currently attached card, no replacement allowed.
                        currentHoveredId = state.hoveredId;
                        state.hoverCandidateId = null;
                        state.hoverCandidateStart = 0;
                    } else {
                        if (state.hoveredId && dragSpeed >= 1.5) {
                            squares.forEach(sq3 => {
                                if (sq3.id === draggedId || sq3.id === state.hoveredId || sq3.matched || sq3.merging) return;

                                const c3x = sq3.x + W_s / 2;
                                const c3y = sq3.y + H_s / 2;
                                const dx = c3x - c1x;
                                const dy = c3y - c1y;
                                const dist = Math.sqrt(dx * dx + dy * dy);

                                if (dist < 70 && dist < minSwitchDist) {
                                    minSwitchDist = dist;
                                    switchTarget = sq3;
                                }
                            });
                        }

                        if (switchTarget) {
                            // Switch places!
                            const sqB = squares.find(s => s.id === state.hoveredId);
                            if (sqB) {
                                // Teleport B to C's old position/velocity
                                const tempX = switchTarget.x;
                                const tempY = switchTarget.y;
                                const tempVx = switchTarget.vx;
                                const tempVy = switchTarget.vy;

                                sqB.x = tempX;
                                sqB.y = tempY;
                                sqB.vx = tempVx;
                                sqB.vy = tempVy;

                                // Teleport C to B's position (which is tagging along under A)
                                switchTarget.x = sq1.x;
                                switchTarget.y = sq1.y;
                                switchTarget.vx = 0;
                                switchTarget.vy = 0;

                                // Update hoveredId to the new card
                                state.hoveredId = switchTarget.id;
                                currentHoveredId = switchTarget.id;

                                // Reset capture candidate
                                state.hoverCandidateId = null;
                                state.hoverCandidateStart = 0;
                            }
                        } else {
                            // 2. Regular hover capture logic with Dwell Time constraint
                            let candidateId = null;
                            let maxOverlap = 0;

                            squares.forEach(sq2 => {
                                if (sq2.id === draggedId || sq2.matched || sq2.merging) return;

                                const c2x = sq2.x + W_s / 2;
                                const c2y = sq2.y + H_s / 2;

                                const dx = c2x - c1x;
                                const dy = c2y - c1y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                const activeRadius = 70;

                                if (dist < activeRadius) {
                                    const overlap = activeRadius - dist;
                                    if (overlap > maxOverlap) {
                                        maxOverlap = overlap;
                                        candidateId = sq2.id;
                                    }
                                }
                            });

                            // If a card is already hovered (active tag-along), keep it hovered
                            // until user shakes it off (briskThreshold) or switches places.
                            if (state.hoveredId && state.hoveredId === candidateId) {
                                currentHoveredId = state.hoveredId;
                            } else if (candidateId) {
                                // If we have a new candidate, or a candidate that is not yet fully captured/hovered
                                if (state.hoverCandidateId !== candidateId) {
                                    state.hoverCandidateId = candidateId;
                                    state.hoverCandidateStart = performance.now();
                                } else {
                                    // Already tracking this candidate, check stop constraint (dwell time + slow speed)
                                    const elapsed = performance.now() - state.hoverCandidateStart;
                                    const stopCaptureThreshold = 2.0; // speed threshold below which capture triggers
                                    if (elapsed >= 150 && dragSpeed < stopCaptureThreshold) {
                                        currentHoveredId = candidateId;
                                    }
                                }
                            } else {
                                // No candidate in range, reset tracking
                                state.hoverCandidateId = null;
                                state.hoverCandidateStart = 0;
                            }
                        }
                    }
                }
            } else {
                // Drag speed is too fast (briskThreshold), or no draggedId. Reset candidate.
                state.hoverCandidateId = null;
                state.hoverCandidateStart = 0;
            }

            // Save the active hovered target ID to state so it can be verified on drop
            state.hoveredId = currentHoveredId;

            // Track hover transitions for attach/detach sound events
            const previousHoveredId = state.previousHoveredId || null;
            if (currentHoveredId !== previousHoveredId) {
                if (currentHoveredId && !previousHoveredId) {
                    playSound('attach');
                } else if (!currentHoveredId && previousHoveredId) {
                    playSound('detach');
                } else if (currentHoveredId && previousHoveredId && currentHoveredId !== previousHoveredId) {
                    playSound('attach');
                }
            }
            state.previousHoveredId = currentHoveredId;

            squares.forEach(sq => {
                if (sq.matched || sq.merging || sq.flashGreen || sq.flashRed) return;

                if (sq.id === draggedId) {
                    sq.x = state.pointer.x - state.pointer.startX;
                    sq.y = state.pointer.y - state.pointer.startY;

                    sq.x = Math.max(margin, Math.min(dims.w - W_s - margin, sq.x));
                    sq.y = Math.max(margin, Math.min(dims.h - H_s - margin, sq.y));
                } else if (sq.id === currentHoveredId) {
                    // Hovered target card: stop moving / stop having physics, and smoothly lerp to be directly below the dragged card
                    const draggedCard = squares.find(s => s.id === draggedId);
                    if (draggedCard) {
                        sq.x += (draggedCard.x - sq.x) * 0.25;
                        sq.y += (draggedCard.y - sq.y) * 0.25;
                    }
                } else {
                    // Limit speeds for extremely gentle and peaceful floating
                    const targetMaxSpeed = 0.4;
                    const minSpeed = 0.15;
                    let speed = Math.sqrt(sq.vx * sq.vx + sq.vy * sq.vy);
                    if (speed > targetMaxSpeed) {
                        // Decelerate smoothly towards targetMaxSpeed (e.g. from mismatch bounce)
                        const decay = 0.92;
                        speed = speed * decay;
                        if (speed < targetMaxSpeed) speed = targetMaxSpeed;
                        sq.vx = (sq.vx / Math.max(0.001, speed)) * speed;
                        sq.vy = (sq.vy / Math.max(0.001, speed)) * speed;
                    } else if (speed < minSpeed) {
                        if (speed === 0) {
                            const angle = Math.random() * Math.PI * 2;
                            sq.vx = Math.cos(angle) * 0.4;
                            sq.vy = Math.sin(angle) * 0.4;
                        } else {
                            sq.vx = (sq.vx / speed) * minSpeed;
                            sq.vy = (sq.vy / speed) * minSpeed;
                        }
                    }

                    sq.x += sq.vx;
                    sq.y += sq.vy;

                    if (sq.x < margin) {
                        sq.x = margin;
                        sq.vx = Math.abs(sq.vx) * elasticity;
                    } else if (sq.x > dims.w - W_s - margin) {
                        sq.x = dims.w - W_s - margin;
                        sq.vx = -Math.abs(sq.vx) * elasticity;
                    }

                    if (sq.y < margin) {
                        sq.y = margin;
                        sq.vy = Math.abs(sq.vy) * elasticity;
                    } else if (sq.y > dims.h - H_s - margin) {
                        sq.y = dims.h - H_s - margin;
                        sq.vy = -Math.abs(sq.vy) * elasticity;
                    }
                }
            });

            // Box-to-Box AABB Collision — push apart gently, no velocity swap (eliminates vibration)
            const separationGap = 2; // extra pixels of clearance to prevent re-collision next frame
            for (let i = 0; i < squares.length; i++) {
                const sq1 = squares[i];
                if (sq1.matched || sq1.merging || sq1.flashGreen || sq1.flashRed) continue;

                for (let j = i + 1; j < squares.length; j++) {
                    const sq2 = squares[j];
                    if (sq2.matched || sq2.merging || sq2.flashGreen || sq2.flashRed) continue;
                    if (sq1.id === draggedId || sq2.id === draggedId) continue;
                    if (sq1.id === currentHoveredId || sq2.id === currentHoveredId) continue;

                    const overlapX = Math.min(sq1.x + W_s, sq2.x + W_s) - Math.max(sq1.x, sq2.x);
                    const overlapY = Math.min(sq1.y + H_s, sq2.y + H_s) - Math.max(sq1.y, sq2.y);

                    if (overlapX > 0 && overlapY > 0) {
                        // Push apart along the axis of minimum overlap, with extra gap
                        if (overlapX < overlapY) {
                            const sign = (sq1.x + W_s / 2) < (sq2.x + W_s / 2) ? -1 : 1;
                            const push = (overlapX + separationGap) * 0.5;
                            sq1.x += sign * push;
                            sq2.x -= sign * push;
                            // Deflect velocities away from each other (don't swap)
                            if (sign < 0) {
                                sq1.vx = -Math.abs(sq1.vx) * elasticity;
                                sq2.vx = Math.abs(sq2.vx) * elasticity;
                            } else {
                                sq1.vx = Math.abs(sq1.vx) * elasticity;
                                sq2.vx = -Math.abs(sq2.vx) * elasticity;
                            }
                        } else {
                            const sign = (sq1.y + H_s / 2) < (sq2.y + H_s / 2) ? -1 : 1;
                            const push = (overlapY + separationGap) * 0.5;
                            sq1.y += sign * push;
                            sq2.y -= sign * push;
                            if (sign < 0) {
                                sq1.vy = -Math.abs(sq1.vy) * elasticity;
                                sq2.vy = Math.abs(sq2.vy) * elasticity;
                            } else {
                                sq1.vy = Math.abs(sq1.vy) * elasticity;
                                sq2.vy = -Math.abs(sq2.vy) * elasticity;
                            }
                        }
                    }
                }
            }

            squares.forEach(sq => {
                const el = document.getElementById(`sq-el-${sq.id}`);
                if (el && !sq.matched) {
                    // Strict bounding-box clamping right before rendering (except for merging elements)
                    if (!sq.merging && !sq.flashGreen && !sq.flashRed) {
                        sq.x = Math.max(margin, Math.min(dims.w - W_s - margin, sq.x));
                        sq.y = Math.max(margin, Math.min(dims.h - H_s - margin, sq.y));
                    }

                    el.style.transform = `translate3d(${sq.x}px, ${sq.y}px, 0)`;

                    if (sq.id === currentHoveredId) {
                        el.classList.add('drag-hover');
                    } else {
                        el.classList.remove('drag-hover');
                    }
                }
            });

            animFrameId = requestAnimationFrame(loop);
        };

        animFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animFrameId);
    }, [quizType, isActive, isSolved, isFailed, disabled]);

    const getContainerClass = () => {
        if (quizType === 'tf') return 'quiz-options-container-tf';
        if (quizType === '4sq') return 'quiz-options-container-4sq';
        if (quizType === 'nl') return 'quiz-options-container-nl';
        if (quizType === 'reorder') return 'quiz-options-container-reorder';
        if (quizType === 'match') return 'quiz-options-container-match';
        return 'quiz-options-container-classic';
    };

    const getOptionClass = (index) => {
        let base = 'quiz-option-2-player';
        if (quizType === 'tf') base = 'quiz-option-tf';
        if (quizType === '4sq') base = 'quiz-option-4sq';
        if (isMultiSelect && selectedIndices.has(index)) base += ' selected';
        return base;
    };

    // -------------------------------------------------------------------------
    // REORDER STATE & LOGIC
    // -------------------------------------------------------------------------
    const [reorderItems, setReorderItems] = useState([]);
    const [isShuffling, setIsShuffling] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOffset, setDragOffset] = useState(0);
    const reorderContainerRef = React.useRef(null);
    const dragStartY = React.useRef(0);
    const measuredItemHeight = React.useRef(80); // Default, updated on drag start

    // Initialize shuffled items on mount
    useEffect(() => {
        if (quizType !== 'reorder') return;
        const items = options.map((text, i) => ({ text, originalIndex: i }));
        // Fisher-Yates shuffle (ensure different order)
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        // If shuffle produced same order, swap first two
        const isSame = shuffled.every((item, idx) => item.originalIndex === idx);
        if (isSame && shuffled.length > 1) {
            [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
        }
        setReorderItems(shuffled);
        // Brief shuffle animation
        setIsShuffling(true);
        const timer = setTimeout(() => setIsShuffling(false), 700);
        return () => clearTimeout(timer);
    }, [quizType]);

    const handleReorderDragStart = (e, index) => {
        ensureAudioAuthorized();
        if (isShuffling || isSolved || isFailed || disabled) return;
        
        // Measure actual height + gap (approx 8px)
        const target = e.currentTarget;
        if (target) {
            measuredItemHeight.current = target.offsetHeight + 8;
        }
        
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStartY.current = clientY;
        setDraggedIndex(index);
        setDragOffset(0);
    };

    const handleReorderDragMove = useCallback((e) => {
        if (draggedIndex === null) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        let offset = clientY - dragStartY.current;

        const h = measuredItemHeight.current;

        // Clamp: don't let bar go above first position or below last
        const maxUp = -draggedIndex * h;
        const maxDown = (reorderItems.length - 1 - draggedIndex) * h;
        offset = Math.max(maxUp, Math.min(maxDown, offset));
        setDragOffset(offset);

        // Calculate swap
        const currentItems = [...reorderItems];
        const direction = offset > 0 ? 1 : -1;
        const threshold = h * 0.55; // Slightly more than half to require intent and create "stickiness"
        if (Math.abs(offset) > threshold) {
            const targetIndex = draggedIndex + direction;
            if (targetIndex >= 0 && targetIndex < currentItems.length) {
                [currentItems[draggedIndex], currentItems[targetIndex]] = [currentItems[targetIndex], currentItems[draggedIndex]];
                setReorderItems(currentItems);
                setDraggedIndex(targetIndex);
                // Resetting to clientY zeros the visual offset, making it 'stick' 
                // in the new slot until they drag past the threshold again.
                dragStartY.current = clientY;
                setDragOffset(0);
            }
        }
    }, [draggedIndex, reorderItems]);

    const handleReorderDragEnd = useCallback(() => {
        setDraggedIndex(null);
        setDragOffset(0);
    }, []);

    useEffect(() => {
        if (draggedIndex !== null) {
            window.addEventListener('mousemove', handleReorderDragMove);
            window.addEventListener('mouseup', handleReorderDragEnd);
            window.addEventListener('touchmove', handleReorderDragMove, { passive: false });
            window.addEventListener('touchend', handleReorderDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleReorderDragMove);
            window.removeEventListener('mouseup', handleReorderDragEnd);
            window.removeEventListener('touchmove', handleReorderDragMove);
            window.removeEventListener('touchend', handleReorderDragEnd);
        };
    }, [draggedIndex, handleReorderDragMove, handleReorderDragEnd]);

    const handleReorderSubmit = () => {
        if (isShuffling || isSolved || isFailed) return;
        const isCorrect = reorderItems.every((item, idx) => item.originalIndex === idx);
        if (isCorrect) {
            handleSuccess();
        } else {
            handleWrong(`reorder-attempt-${attemptsUsed}`);
        }
    };

    // -------------------------------------------------------------------------
    // 5. RENDER
    // -------------------------------------------------------------------------

    // CHATQUIZ MODE
    if (quizType === 'chatquiz') {
        const chatNodes = data.metadata?.chatNodes || [];

        const currentNode = chatNodes[currentNodeIndex];
        const isLastNode = currentNodeIndex >= chatNodes.length - 1;
        // Determine if all nodes have been shown AND resolved
        const allRevealed = currentNodeIndex >= chatNodes.length - 1;
        const lastNodeResolved = (() => {
            const last = chatNodes[chatNodes.length - 1];
            if (!last) return true;
            if (last.type === 'message' || last.type === 'reply' || last.type === 'sticker') return true;
            if (last.type === 'quiz') return chatSolvedSet.has(chatNodes.length - 1);
            return true;
        })();
        const showDoneBtn = allRevealed && lastNodeResolved && !chatFinished;

        const handleChatDone = () => {
            if (chatFinished) return;
            setChatFinished(true);
            // Go directly to next slide — no banner
            if (onNext) onNext();
        };

        const handleChatOptionClick = (nodeIdx, optIdx) => {
            if (chatSolvedSet.has(nodeIdx) || disabled || chatFadingOut) return;
            const node = chatNodes[nodeIdx];
            const wrongSet = chatWrongSets[nodeIdx] || new Set();
            if (wrongSet.has(optIdx)) return;

            if (optIdx === node.correctIndex) {
                // Correct!
                const newSolved = new Set(chatSolvedSet);
                newSolved.add(nodeIdx);
                setChatSolvedSet(newSolved);
                playSound('correct');

                // Fade out distractors, then auto-advance after delay
                setChatFadingOut(true);
                const isLast = nodeIdx >= chatNodes.length - 1;
                setTimeout(() => {
                    setChatFadingOut(false);
                    if (!isLast) {
                        setCurrentNodeIndex(prev => Math.min(prev + 1, chatNodes.length - 1));
                    }
                }, 1000);
            } else {
                // Wrong
                const newWrongSets = { ...chatWrongSets };
                const newWrong = new Set(wrongSet);
                newWrong.add(optIdx);
                newWrongSets[nodeIdx] = newWrong;
                setChatWrongSets(newWrongSets);
                setChatShaking({ nodeIdx, optIdx });
                playSound('wrong');
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                setTimeout(() => setChatShaking(null), 600);
            }
        };

        return (
            <div className={`quiz-player-2 chatquiz-player-mode ${disabled ? 'disabled' : ''}`}>
                <div className="chat-container" ref={chatContainerRef}>
                    <div className="chat-spacer" />
                    {chatNodes.slice(0, currentNodeIndex + 1).map((node, idx) => {
                        if (node.type === 'message') {
                            if (node.style === 'narrator') {
                                return (
                                    <div key={idx} className="chat-narrator-row">
                                        <div className="chat-narrator-text"
                                            style={{
                                                ...(data.metadata?.fontFamily && { fontFamily: data.metadata.fontFamily }),
                                                ...(data.metadata?.fontSize && { fontSize: `${data.metadata.fontSize}px` }),
                                                ...(data.metadata?.color && { color: data.metadata.color }),
                                            }}
                                            dangerouslySetInnerHTML={{ __html: formatExponents(node.text) }} />
                                    </div>
                                );
                            }
                            return (
                                <div key={idx} className="chat-bubble-row chat-row-tutor">
                                    <div className="chat-avatar"><img src="/assets/characters/avatar_chef.png" alt="Chef" className="chat-avatar-img" /></div>
                                    <div className="chat-bubble chat-bubble-tutor"
                                        style={{
                                            ...(data.metadata?.fontFamily && { fontFamily: data.metadata.fontFamily }),
                                            ...(data.metadata?.fontSize && { fontSize: `${data.metadata.fontSize}px` }),
                                            ...(data.metadata?.color && { color: data.metadata.color }),
                                            ...(data.metadata?.leftBubbleColor && { 
                                                '--bubble-bg': data.metadata.leftBubbleColor,
                                                '--bubble-border': data.metadata.leftBubbleColor 
                                            }),
                                        }}
                                        dangerouslySetInnerHTML={{ __html: formatExponents(node.text) }} />
                                </div>
                            );
                        }
                        if (node.type === 'reply') {
                            return (
                                <div key={idx} className="chat-bubble-row chat-row-reply">
                                    <div className="chat-bubble chat-bubble-reply"
                                        style={{
                                            ...(data.metadata?.fontFamily && { fontFamily: data.metadata.fontFamily }),
                                            ...(data.metadata?.fontSize && { fontSize: `${data.metadata.fontSize}px` }),
                                            ...(data.metadata?.rightBubbleColor && { 
                                                '--bubble-bg': data.metadata.rightBubbleColor,
                                                '--bubble-border': data.metadata.rightBubbleColor,
                                                '--bubble-tail-bg': data.metadata.rightBubbleColor 
                                            }),
                                        }}
                                        dangerouslySetInnerHTML={{ __html: formatExponents(node.text) }} />
                                    <div className="chat-avatar chat-avatar-user"><img src="/assets/characters/avatar_pesto.png" alt="Pesto" className="chat-avatar-img" /></div>
                                </div>
                            );
                        }
                        if (node.type === 'sticker') {
                            const isLeft = node.side === 'left';
                            return (
                                <div key={idx} className={`chat-bubble-row ${isLeft ? 'chat-row-tutor' : 'chat-row-reply'}`}>
                                    <div className={`chat-sticker-bubble ${isLeft ? 'chat-sticker-left' : 'chat-sticker-right'}`}>
                                        <img src={node.src} alt="sticker" className="chat-sticker-img" />
                                    </div>
                                </div>
                            );
                        }
                        if (node.type === 'quiz') {
                            const nodeSolved = chatSolvedSet.has(idx);
                            const wrongSet = chatWrongSets[idx] || new Set();
                            // Only show options for the current quiz node when chatOptionsVisible is true,
                            // or for already-solved quiz nodes (always show them)
                            const isCurrentQuiz = idx === currentNodeIndex;
                            const showOpts = !isCurrentQuiz || chatOptionsVisible || nodeSolved;
                            return (
                                <div key={idx} className={`chat-bubble-row chat-row-options ${!showOpts ? 'chat-opts-hidden' : ''}`}>
                                    <div className="chat-options-group">
                                        {showOpts && node.options.map((opt, optIdx) => {
                                            const isCorrectOpt = optIdx === node.correctIndex;
                                            const isWrong = wrongSet.has(optIdx);
                                            const isShaking = chatShaking?.nodeIdx === idx && chatShaking?.optIdx === optIdx;
                                            const isChosen = nodeSolved && isCorrectOpt;
                                            const isDimmed = nodeSolved && !isCorrectOpt;

                                            return (
                                                <div key={optIdx} className={`chat-option-row ${isDimmed && chatFadingOut ? 'chat-fade-out' : ''} ${isDimmed && !chatFadingOut ? 'chat-faded' : ''}`}>
                                                    <button
                                                        className={`chat-bubble chat-bubble-option ${isChosen ? 'chat-correct' : ''} ${isWrong ? 'chat-wrong' : ''} ${isShaking ? 'chat-shake' : ''}`}
                                                        onClick={(e) => { e.stopPropagation(); handleChatOptionClick(idx, optIdx); }}
                                                        disabled={nodeSolved || isWrong || disabled || chatFadingOut}
                                                        dangerouslySetInnerHTML={{ __html: formatExponents(opt) }}
                                                    />
                                                    <div className="chat-avatar chat-avatar-user"><img src="/assets/characters/avatar_pesto.png" alt="Pesto" className="chat-avatar-img" /></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>

                {showDoneBtn && !disabled && (
                    <button
                        className="chat-continue-btn"
                        onClick={(e) => { e.stopPropagation(); handleChatDone(); }}
                    >
                        Done
                    </button>
                )}
            </div>
        );
    }

    // PEM MODE
    if (quizType === 'pem') {
        const C_MAJOR = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

        const playNote = (noteIdx) => {
            try {
                if (!pemAudioCtx.current) pemAudioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
                const ctx = pemAudioCtx.current;
                const schedule = () => {
                    try {
                        const now = ctx.currentTime;
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(C_MAJOR[noteIdx % C_MAJOR.length], now);
                        gain.gain.setValueAtTime(0.3, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 0.45);
                    } catch(e) {}
                };
                if (ctx.state === 'running') schedule();
                else ctx.resume().then(schedule).catch(() => {});
            } catch(e) {}
        };

        const playErrorSfx = () => {
            try {
                if (!pemAudioCtx.current) pemAudioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
                const ctx = pemAudioCtx.current;
                const schedule = () => {
                    try {
                        const now = ctx.currentTime;
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(180, now);
                        gain.gain.setValueAtTime(0.2, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 0.35);
                    } catch(e) {}
                };
                if (ctx.state === 'running') schedule();
                else ctx.resume().then(schedule).catch(() => {});
            } catch(e) {}
        };

        const tokens = pemAst ? astToTokens(pemAst) : [];
        const scopeNodeIds = pemScopeId && pemAst ? new Set(getNodeIdsInScope(findNodeById(pemAst, pemScopeId))) : null;
        const flashIds = pemFlash ? new Set(pemFlash.ids) : new Set();

        const handlePemOperatorClick = (token) => {
            if (pemSolved || pemFailed || disabled || pemMerge || isPemPowerupActive) return;
            const opMap = { '+': 'A', '-': 'S', '*': 'M', '/': 'D', '^': 'E' };
            const pemKey = opMap[token.value];
            if (!pemKey) return;

            const result = validateOperation(pemAst, pemScopeId, pemKey, token.nodeId);
            if (result.valid) {
                const opTokens = getOperationTokenIds(result.targetNode);
                // Compute the result value directly from the target node
                const resultValue = evaluateNode(result.targetNode);

                playNote(pemNoteIndex);
                setPemNoteIndex(prev => prev + 1);

                // Phase 1: slide animation (operands slide toward operator)
                setPemMerge({
                    leftIds: new Set(opTokens.leftIds),
                    rightIds: new Set(opTokens.rightIds),
                    opId: opTokens.opId,
                    allIds: new Set(opTokens.allIds),
                    result: resultValue,
                    phase: 'slide'
                });

                // Phase 2: pop-in result
                setTimeout(() => {
                    setPemMerge(prev => prev ? { ...prev, phase: 'pop' } : null);
                }, 350);

                // Phase 3: apply AST change
                setTimeout(() => {
                    let newAst = replaceNodeWithResult(pemAst, result.targetNodeId);
                    newAst = simplifyParens(newAst);

                    if (pemScopeId) {
                        const scopeNode = findNodeById(newAst, pemScopeId);
                        if (!scopeNode || scopeNode.type === 'NumberNode') {
                            setPemScopeId(null);
                        }
                    }

                    setPemMerge(null);
                    if (isFullySimplified(newAst)) {
                        setPemAst(newAst);
                        setPemSolved(true);
                        setPemFlash(null);
                        playSound('correct');
                        if (onBanner) onBanner('correct', 'Topo!');
                        
                        const currentMode = data.metadata?.pemMode || 'P';
                        if (currentMode === 'GAME') {
                            setTimeout(() => { if (onBanner) onBanner(null); }, 1500);
                            setTimeout(() => {
                                setPemGameLevel(prev => prev + 1);
                                setPemAst(null);
                                setPemSolved(false);
                                setPemErrors(0);
                            }, 2000);
                        } else {
                            if (onNext) onNext();
                        }
                    } else {
                        setPemAst(newAst);
                        setPemFlash(null);
                    }
                }, 700);
            } else {
                // Wrong
                if (result.errorType === 'left_to_right') {
                    setPemArrow(true);
                    setTimeout(() => setPemArrow(false), 1000);
                }
                
                setPemFlash({ ids: result.nodeIds || [token.nodeId], color: 'red' });
                playErrorSfx();
                setPemNoteIndex(0); // Reset scale
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                const newErrors = pemErrors + 1;
                setPemErrors(newErrors);
                if (newErrors >= 3) {
                    setTimeout(() => {
                        setPemFailed(true);
                        setPemFlash(null);
                    }, 600);
                } else {
                    setTimeout(() => setPemFlash(null), 600);
                }
            }
        };

        const playParenSound = () => {
            try {
                if (!pemAudioCtx.current) pemAudioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
                const ctx = pemAudioCtx.current;
                const schedule = () => {
                    try {
                        const now = ctx.currentTime;
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(880, now);
                        gain.gain.setValueAtTime(0.15, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                        osc.connect(gain); gain.connect(ctx.destination);
                        osc.start(now); osc.stop(now + 0.15);
                    } catch(e) {}
                };
                if (ctx.state === 'running') schedule();
                else ctx.resume().then(schedule).catch(() => {});
            } catch(e) {}
        };

        const handleParenClick = (token) => {
            if (pemSolved || pemFailed || disabled || isPemPowerupActive) return;
            // Find paren groups, set scope to the clicked one
            const groups = getParenGroups(pemAst);
            const match = groups.find(g => g.id === token.nodeId);
            if (match) {
                playParenSound();
                setPemScopeId(pemScopeId === match.id ? null : match.id);
            }
        };

        const handlePemOutsideClick = () => {
            if (pemScopeId) setPemScopeId(null);
        };

        const playHeavyDragSound = () => {
            try {
                if (!pemAudioCtx.current) pemAudioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
                const ctx = pemAudioCtx.current;
                const schedule = () => {
                    try {
                        const now = ctx.currentTime;
                        const osc = ctx.createOscillator();
                        const filter = ctx.createBiquadFilter();
                        const gain = ctx.createGain();
                        
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(40, now);
                        
                        filter.type = 'lowpass';
                        filter.frequency.setValueAtTime(200, now);
                        filter.frequency.linearRampToValueAtTime(100, now + 1.5);
                        
                        gain.gain.setValueAtTime(0, now);
                        gain.gain.linearRampToValueAtTime(0.5, now + 0.2);
                        gain.gain.linearRampToValueAtTime(0.3, now + 1.2);
                        gain.gain.linearRampToValueAtTime(0.01, now + 1.5);
                        
                        osc.connect(filter);
                        filter.connect(gain);
                        gain.connect(ctx.destination);
                        
                        osc.start(now);
                        osc.stop(now + 1.55);
                    } catch(e) {}
                };
                if (ctx.state === 'running') schedule();
                else ctx.resume().then(schedule).catch(() => {});
            } catch(e) {}
        };

        const handlePowerupClick = (e) => {
            e.stopPropagation();
            if (isPemPowerupActive || pemSolved || pemFailed || disabled) return;
            setIsPemPowerupActive(true);
            playHeavyDragSound();
            setTimeout(() => {
                setIsPemPowerupActive(false);
            }, 1500);
        };

        return (
            <div className={`quiz-player-2 pem-player-mode ${pemFailed ? 'pem-failed' : ''}`}
                 onClick={handlePemOutsideClick}>
                <div className={`pem-expression ${isPemPowerupActive ? 'pem-powerup-active' : ''}`} onClick={(e) => e.stopPropagation()}>
                    {tokens.map((token, i) => {
                        if (token.hidden) return null;
                        const isInScope = !scopeNodeIds || scopeNodeIds.has(token.nodeId);
                        const isFlashRed = flashIds.has(token.nodeId) && pemFlash?.color === 'red';

                        // For exponent tokens, their merge target is the parent node
                        const mergeTargetId = token.isExponentOp ? token.exponentParentId : token.nodeId;
                        
                        // Merge animation classes
                        const isMergeLeft = pemMerge?.phase === 'slide' && pemMerge.leftIds.has(mergeTargetId);
                        const isMergeRight = pemMerge?.phase === 'slide' && pemMerge.rightIds.has(mergeTargetId);
                        const isMergeOp = pemMerge?.phase === 'slide' && pemMerge.opId === mergeTargetId;
                        const isMerging = pemMerge && pemMerge.allIds.has(mergeTargetId);
                        const isMergePop = pemMerge?.phase === 'pop' && pemMerge.opId === mergeTargetId;
                        const isMergeFade = pemMerge?.phase === 'pop' && pemMerge.allIds.has(mergeTargetId) && pemMerge.opId !== mergeTargetId;

                        const isGreyed = !isInScope || (pemMerge && !isMerging);

                        if (token.type === 'paren') {
                            if (token.hidden) return null;
                            return (
                                <span key={`${token.nodeId}-${token.type}-${token.value}`}
                                    className={`pem-token pem-token-paren ${isGreyed ? 'pem-greyed' : ''} ${pemScopeId === token.nodeId ? 'pem-paren-active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); handleParenClick(token); }}
                                >{token.value}</span>
                            );
                        }
                        if (token.type === 'op' || token.isExponentOp) {
                            if (token.hidden) return null;
                            const isSeparator = token.value === '+' || token.value === '-';
                            let sepLeftClass = '';
                            let sepRightClass = '';
                            if (isSeparator) {
                                let leftHasComplex = false;
                                for (let j = i - 1; j >= 0; j--) {
                                    const t = tokens[j];
                                    if (t.type === 'op' && (t.value === '+' || t.value === '-')) break;
                                    if ((t.type === 'op' && (t.value === '*' || t.value === '/' || t.value === '^')) || t.isExponentOp) {
                                        leftHasComplex = true;
                                        break;
                                    }
                                }
                                let rightHasComplex = false;
                                for (let j = i + 1; j < tokens.length; j++) {
                                    const t = tokens[j];
                                    if (t.type === 'op' && (t.value === '+' || t.value === '-')) break;
                                    if ((t.type === 'op' && (t.value === '*' || t.value === '/' || t.value === '^')) || t.isExponentOp) {
                                        rightHasComplex = true;
                                        break;
                                    }
                                }
                                if (leftHasComplex) sepLeftClass = 'pem-token-separator-left';
                                if (rightHasComplex) sepRightClass = 'pem-token-separator-right';
                            }

                            return (
                                <span key={`${token.nodeId}-${token.type}-${token.value}`}
                                    className={`pem-token pem-token-op ${isGreyed ? 'pem-greyed' : ''} ${isFlashRed ? 'pem-flash-red' : ''} ${isMergeOp ? 'pem-merge-op' : ''} ${isMergePop ? 'pem-merge-pop' : ''} ${isMergeFade ? 'pem-merge-fade' : ''} ${token.superscript && !isMergePop ? 'pem-token-superscript' : ''} ${isSeparator ? 'pem-token-separator' : ''} ${sepLeftClass} ${sepRightClass}`}
                                    onClick={(e) => { e.stopPropagation(); handlePemOperatorClick(token.isExponentOp ? { value: '^', nodeId: mergeTargetId } : token); }}
                                    data-merge-result={isMergePop ? pemMerge.result : undefined}
                                >
                                    {isMergePop ? (
                                        <span className="pem-result-value">{pemMerge.result}</span>
                                    ) : (
                                        <span className="pem-op-circle">{token.value === '*' ? '×' : token.value === '/' ? '÷' : token.value}</span>
                                    )}
                                </span>
                            );
                        }
                        // number
                        return (
                            <span key={`${token.nodeId}-${token.type}-${token.value}`}
                                className={`pem-token pem-token-number ${isGreyed ? 'pem-greyed' : ''} ${isFlashRed ? 'pem-flash-red' : ''} ${isMergeLeft ? 'pem-merge-left' : ''} ${isMergeRight ? 'pem-merge-right' : ''} ${isMergeFade ? 'pem-merge-fade' : ''} ${isMerging ? 'pem-merging' : ''} ${token.superscript ? 'pem-token-superscript' : ''}`}
                            >{token.value}</span>
                        );
                    })}
                    {pemArrow && (
                        <div className="pem-arrow-container">
                            <svg className="pem-arrow-svg" viewBox="0 0 100 10" preserveAspectRatio="none" overflow="visible">
                                <path d="M0,5 L90,5 M85,0 L95,5 L85,10" stroke="#34D399" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    )}
                </div>
                {pemFailed && !disabled && (
                    <button className="pem-continue-btn" onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); }}>Continue</button>
                )}
                {!pemFailed && (
                    <button 
                        className={`pem-powerup-btn ${isPemPowerupActive ? 'disabled' : ''}`} 
                        onClick={handlePowerupClick}
                        title="Visualize terms"
                    >
                        ↔
                    </button>
                )}
            </div>
        );
    }

    // REORDER MODE
    if (quizType === 'reorder') {
        return (
            <div className={`quiz-player-2 reorder-mode`}>
                <div className="quiz-options-container-reorder" ref={reorderContainerRef}>
                    {reorderItems.map((item, index) => {
                        const isDragged = index === draggedIndex;
                        let transformY = 0;
                        if (isDragged) transformY = dragOffset;

                        return (
                            <div
                                key={`${item.originalIndex}`}
                                className={`quiz-option-reorder ${isDragged ? 'dragging' : ''} ${isShuffling ? 'shuffling' : ''} ${isSolved ? (item.originalIndex === index ? 'correct' : '') : ''} ${isFailed ? 'failed' : ''} ${String(shakingIndex).startsWith('reorder-attempt') ? 'shake reorder-flash-red' : ''}`}
                                style={{
                                    backgroundColor: colors[item.originalIndex % colors.length],
                                    transform: isDragged ? `translateY(${transformY}px) scale(1.05)` : 'none',
                                    transition: isDragged ? 'none' : 'transform 0.25s ease, opacity 0.3s',
                                    zIndex: isDragged ? 100 : 1,
                                    pointerEvents: (isShuffling || isSolved || isFailed || disabled) ? 'none' : 'auto',
                                    animationDelay: isShuffling ? `${index * 80}ms` : undefined,
                                }}
                                onMouseDown={(e) => handleReorderDragStart(e, index)}
                                onTouchStart={(e) => handleReorderDragStart(e, index)}
                            >
                                <span className="quiz-option-text" dangerouslySetInnerHTML={{ __html: formatExponents(item.text) }} />
                                <span className="reorder-grip">⋮⋮</span>
                            </div>
                        );
                    })}
                </div>
                <button
                    className="reorder-ok-btn"
                    style={{ visibility: (isSolved || isFailed) ? 'hidden' : 'visible' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleReorderSubmit();
                    }}
                    disabled={isShuffling}
                >
                    OK
                </button>
            </div>
        );
    }

    // MATCH RENDER LOGIC
    if (quizType === 'match') {
        const enableBubbles = data.metadata?.enableBubbles !== false;
        return (
            <div className="quiz-player-2 match-mode">
                <div className="quiz-options-container-match" ref={matchContainerRef}>
                    {enableBubbles && (
                        <div className="quiz-match-bubbles">
                            {matchBubbles.map(b => (
                                <div
                                    key={b.id}
                                    className="bubble"
                                    style={{
                                        width: `${b.size}px`,
                                        height: `${b.size}px`,
                                        left: `${b.left}%`,
                                        animationDuration: `${b.duration}s`,
                                        animationDelay: `${b.delay}s`,
                                        '--sway-x': `${b.sway}px`
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    {matchSquares.map((sq) => {
                        const isDragging = sq.isDragging;
                        const isFlashing = sq.flashRed;
                        const isMatched = sq.matched;

                        return (
                            <div
                                key={sq.id}
                                id={`sq-el-${sq.id}`}
                                className={`quiz-option-match ${sq.type} ${isDragging ? 'dragging' : ''} ${isFlashing ? 'flash-red' : ''} ${sq.flashGreen ? 'flash-green' : ''} ${isMatched ? 'matched' : ''} ${sq.merging ? 'merging' : ''}`}
                                style={{
                                    pointerEvents: (isSolved || isFailed || disabled || isMatched || sq.merging) ? 'none' : 'auto',
                                    transform: `translate3d(${sq.x}px, ${sq.y}px, 0)`,
                                }}
                                onMouseDown={(e) => handleMatchDragStart(e, sq.id)}
                                onTouchStart={(e) => handleMatchDragStart(e, sq.id)}
                            >
                                <span 
                                    className="quiz-option-text" 
                                    dangerouslySetInnerHTML={{ __html: formatExponents(sq.text) }} 
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (quizType === 'nl') {
        return (
            <div className={`quiz-player-2 nl-mode ${useFractions ? 'nl-fractions' : ''}`}>
                <div className="quiz-options-container-nl" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div
                        className="nl-container-player"
                        ref={trackRef}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        style={{ pointerEvents: (isSolved || isFailed || disabled) ? 'none' : 'auto' }}
                    >
                        <div className="nl-track-player"></div>
                        <div className="nl-ticks-player">
                            {Array.from({ length: stepCount + 1 }).map((_, i) => {
                                const value = min + (i * ((max - min) / stepCount));
                                const percent = (i / stepCount) * 100;
                                const isEndpoint = i === 0 || i === stepCount;

                                return (
                                    <div key={i} className="nl-tick-player" style={{ left: `${percent}%` }}>
                                        <div className="nl-tick-mark-player"></div>
                                        {(!hideLabels || isEndpoint) && (
                                            <div className="nl-tick-label-player">
                                                <FractionComponent value={value} useFractions={useFractions} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className={`nl-knob-player ${isDragging ? 'dragging' : ''} ${isSolved ? 'correct' : ''} ${isFailed ? 'failed' : ''} ${shakingIndex === nlValue ? 'wrong knob-shake' : ''}`}
                            style={{ left: `${((nlValue - min) / (max - min)) * 100}%` }}
                            onAnimationEnd={() => setShakingIndex(null)}
                        >
                            <div className="nl-knob-bubble-player">
                                <FractionComponent value={nlValue} useFractions={useFractions} />
                            </div>
                        </div>
                    </div>
                    <button
                        className="quiz-ready-btn"
                        onClick={handleNlSubmit}
                        disabled={isSolved || isFailed || disabled}
                        style={{ width: '200px' }}
                    >
                        READY
                    </button>
                </div>
            </div>
        );
    }

    // Classic / TF / 4SQ Render
    return (
        <div className={`quiz-player-2 ${quizType === 'tf' ? 'tf-mode' : ''} ${quizType === '4sq' ? 'four-sq-mode' : ''}`}>
            <div className={getContainerClass()}>
                {options.map((option, index) => {
                    let className = getOptionClass(index);
                    const isWrong = wrongIndices.has(index);
                    const actualCorrectIndices = quizType === '4sq' ? correctIndices : [correctIndex];
                    const isCorrect = actualCorrectIndices.includes(index);
                    const isShaking = index === shakingIndex;

                    if (isSolved) {
                        className += isCorrect ? ' correct' : ' wrong';
                    } else if (isFailed) {
                        className += isCorrect ? ' correct' : ' wrong';
                    } else {
                        if (isWrong && !isMultiSelect) className += ' wrong grayed-out';
                    }
                    if (isShaking) className += ' shake';

                    return (
                        <div key={index} className={quizType === 'tf' ? 'quiz-option-wrapper-tf' : 'quiz-option-wrapper'}>
                            <button
                                className={className}
                                style={{
                                    backgroundColor: colors[index % colors.length],
                                    pointerEvents: (isFailed || isSolved || disabled) ? 'none' : 'auto',
                                    fontFamily: data.metadata?.fontFamily || '"HVD Comic Serif Pro", sans-serif',
                                    fontSize: data.metadata?.fontSize ? `${data.metadata.fontSize}px` : undefined,
                                    fontWeight: data.metadata?.fontWeight || undefined,
                                    fontStyle: data.metadata?.fontStyle || undefined,
                                    textDecoration: data.metadata?.textDecoration || undefined
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
                                    handleSelect(index);
                                }}
                                onAnimationEnd={() => setShakingIndex(null)}
                                disabled={(isSolved || isFailed || (isWrong && !isMultiSelect) || disabled)}
                            >
                                {quizType === 'tf' && visualMode ? (
                                    <div className="visual-answer">
                                        <img src={getThumbImage(index)} alt={index === 0 ? 'True' : 'False'} className="tf-image" />
                                    </div>
                                ) : (
                                    <span className="quiz-option-text" dangerouslySetInnerHTML={{ __html: formatExponents(option) }} />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
            {isMultiSelect && !isSolved && !isFailed && (
                <button
                    className="quiz-ready-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleReadySubmit();
                    }}
                    disabled={selectedIndices.size === 0}
                >
                    READY
                </button>
            )}
        </div>
    );
};

export default QuizPlayer;
