import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import confetti from 'canvas-confetti';
import './QuizPlayer.css';
import { parseFraction, FractionComponent } from '../../utils/FractionUtils.jsx';
import { parseExpression, astToTokens, validateOperation, replaceNodeWithResult, simplifyParens, isFullySimplified, getParenGroups, findNodeById, getNodeIdsInScope, getOperationTokenIds, resetIdCounter } from '../../cartridges/PEMDAS/game/ExpressionEngine';
import { getExpression, editorToEngine } from './PEMExpressionPool';

/**
 * QuizPlayer Component
 * ...
 */
const QuizPlayer = ({ data, onNext, onBanner, disabled = false, debugMode = false }) => {
    // -------------------------------------------------------------------------
    // 1. DATA EXTRACTION (Common + NL)
    // -------------------------------------------------------------------------
    const quizType = data.metadata?.quizType || 'classic';
    const visualMode = data.metadata?.visualMode || false;

    // Classic/TF/4SQ Data
    const options = data.metadata?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    const correctIndex = data.metadata?.correctIndex || 0;
    const correctIndices = data.metadata?.correctIndices || [correctIndex];
    const isMultiSelect = quizType === '4sq' && correctIndices.length > 1;
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C00', '#95E1D3', '#F38181'];
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
    const [pemNoteIndex, setPemNoteIndex] = useState(0);
    const [pemExprStr, setPemExprStr] = useState(null);
    const pemAudioCtx = React.useRef(null);

    const attemptsUsed = wrongIndices.size;

    // -------------------------------------------------------------------------
    // 3. HELPERS & EFFECTS
    // -------------------------------------------------------------------------
    const playSound = (type) => {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.play().catch(e => console.log('Audio play failed:', e));
    };

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
        if (quizType !== 'chatquiz') return;
        const chatNodes = data.metadata?.chatNodes || [];
        const currentNode = chatNodes[currentNodeIndex];
        if (!currentNode || chatFinished) return;

        // Clear any previous timer
        if (chatAdvanceTimer.current) clearTimeout(chatAdvanceTimer.current);

        if (currentNode.type === 'message') {
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
    }, [quizType, currentNodeIndex, chatFinished]);

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
        setTimeout(() => { if (onNext) onNext(); }, 2000);
    };

    const handleWrong = (index) => {
        const newWrongIndices = new Set(wrongIndices).add(index);
        setWrongIndices(newWrongIndices);
        setShakingIndex(index);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        if (newWrongIndices.size >= maxAttempts) {
            setIsFailed(true);
            playSound('fail');
            if (onBanner) onBanner('fail', 'Moco!');
            setTimeout(() => { if (onNext) onNext(); }, 3000);
        } else {
            playSound('wrong');
        }
    };

    const handleSelect = (index) => {
        if (isSolved || isFailed) return;
        if (isMultiSelect) {
            const newSelected = new Set(selectedIndices);
            newSelected.has(index) ? newSelected.delete(index) : newSelected.add(index);
            setSelectedIndices(newSelected);
            return;
        }
        if (wrongIndices.has(index)) return;
        setSelectedOption(index);
        index === correctIndex ? handleSuccess() : handleWrong(index);
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

    const getContainerClass = () => {
        if (quizType === 'tf') return 'quiz-options-container-tf';
        if (quizType === '4sq') return 'quiz-options-container-4sq';
        if (quizType === 'nl') return 'quiz-options-container-nl';
        if (quizType === 'reorder') return 'quiz-options-container-reorder';
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
    const itemHeight = 56; // Height of each bar + gap

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
        if (isShuffling || isSolved || isFailed || disabled) return;
        e.preventDefault();
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStartY.current = clientY;
        setDraggedIndex(index);
        setDragOffset(0);
    };

    const handleReorderDragMove = useCallback((e) => {
        if (draggedIndex === null) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        let offset = clientY - dragStartY.current;

        // Clamp: don't let bar go above first position or below last
        const maxUp = -draggedIndex * itemHeight;
        const maxDown = (reorderItems.length - 1 - draggedIndex) * itemHeight;
        offset = Math.max(maxUp, Math.min(maxDown, offset));
        setDragOffset(offset);

        // Calculate swap
        const currentItems = [...reorderItems];
        const direction = offset > 0 ? 1 : -1;
        const threshold = itemHeight * 0.5;
        if (Math.abs(offset) > threshold) {
            const targetIndex = draggedIndex + direction;
            if (targetIndex >= 0 && targetIndex < currentItems.length) {
                [currentItems[draggedIndex], currentItems[targetIndex]] = [currentItems[targetIndex], currentItems[draggedIndex]];
                setReorderItems(currentItems);
                setDraggedIndex(targetIndex);
                dragStartY.current = clientY;
                setDragOffset(0);
            }
        }
    }, [draggedIndex, reorderItems, itemHeight]);

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
            if (last.type === 'message') return true;
            if (last.type === 'quiz') return chatSolvedSet.has(chatNodes.length - 1);
            return true;
        })();
        const showDoneBtn = allRevealed && lastNodeResolved && !chatFinished;

        const handleChatDone = () => {
            if (chatFinished) return;
            setChatFinished(true);
            playSound('correct');
            if (onBanner) onBanner('correct', 'Topo!');
            setTimeout(() => { if (onNext) onNext(); }, 2000);
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
                                        <div className="chat-narrator-text">
                                            {node.text}
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div key={idx} className="chat-bubble-row chat-row-tutor">
                                    <div className="chat-avatar">🤖</div>
                                    <div className="chat-bubble chat-bubble-tutor">
                                        {node.text}
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
                                                        dangerouslySetInnerHTML={{ __html: opt }}
                                                    />
                                                    <div className="chat-avatar chat-avatar-user">🧑</div>
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
                if (ctx.state === 'suspended') ctx.resume();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(C_MAJOR[noteIdx % C_MAJOR.length], ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
            } catch(e) {}
        };

        const playErrorSfx = () => {
            try {
                if (!pemAudioCtx.current) pemAudioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
                const ctx = pemAudioCtx.current;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
            } catch(e) {}
        };

        // Initialize PEM AST on first render
        if (!pemAst && !pemSolved && !pemFailed) {
            try {
                resetIdCounter();
                let expr;
                const mode = data.metadata?.pemMode || 'A';
                const diff = data.metadata?.pemDifficulty || 1;
                if (mode === 'MANUAL' && data.metadata?.pemExpression) {
                    expr = editorToEngine(data.metadata.pemExpression);
                } else {
                    expr = getExpression(mode, diff);
                }
                setPemExprStr(expr);
                setPemAst(parseExpression(expr));
            } catch(e) {
                console.error('PEM parse error:', e);
                setPemExprStr('3 + 2');
                setPemAst(parseExpression('3 + 2'));
            }
        }

        const tokens = pemAst ? astToTokens(pemAst) : [];
        const scopeNodeIds = pemScopeId && pemAst ? new Set(getNodeIdsInScope(findNodeById(pemAst, pemScopeId))) : null;
        const flashIds = pemFlash ? new Set(pemFlash.ids) : new Set();

        const handlePemOperatorClick = (token) => {
            if (pemSolved || pemFailed || disabled) return;
            const opMap = { '+': 'A', '-': 'S', '*': 'M', '/': 'D', '^': 'E' };
            const pemKey = opMap[token.value];
            if (!pemKey) return;

            const result = validateOperation(pemAst, pemScopeId, pemKey);
            if (result.valid) {
                // Flash green on the operation tokens
                const opTokens = getOperationTokenIds(result.targetNode);
                setPemFlash({ ids: opTokens.allIds, color: 'green' });
                playNote(pemNoteIndex);
                setPemNoteIndex(prev => prev + 1);

                setTimeout(() => {
                    let newAst = replaceNodeWithResult(pemAst, result.targetNodeId);
                    newAst = simplifyParens(newAst);

                    // If scope was resolved, auto-exit scope
                    if (pemScopeId) {
                        const scopeNode = findNodeById(newAst, pemScopeId);
                        if (!scopeNode || scopeNode.type === 'NumberNode') {
                            setPemScopeId(null);
                        }
                    }

                    if (isFullySimplified(newAst)) {
                        setPemAst(newAst);
                        setPemSolved(true);
                        setPemFlash(null);
                        playSound('correct');
                        if (onBanner) onBanner('correct', 'Topo!');
                        setTimeout(() => { if (onNext) onNext(); }, 2000);
                    } else {
                        setPemAst(newAst);
                        setPemFlash(null);
                    }
                }, 400);
            } else {
                // Wrong
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
                if (ctx.state === 'suspended') ctx.resume();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
            } catch(e) {}
        };

        const handleParenClick = (token) => {
            if (pemSolved || pemFailed || disabled) return;
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

        return (
            <div className={`quiz-player-2 pem-player-mode ${pemFailed ? 'pem-failed' : ''}`}
                 onClick={handlePemOutsideClick}>
                <div className="pem-expression" onClick={(e) => e.stopPropagation()}>
                    {tokens.map((token, i) => {
                        if (token.hidden) return null;
                        const isInScope = !scopeNodeIds || scopeNodeIds.has(token.nodeId);
                        const isFlashGreen = flashIds.has(token.nodeId) && pemFlash?.color === 'green';
                        const isFlashRed = flashIds.has(token.nodeId) && pemFlash?.color === 'red';

                        if (token.type === 'paren') {
                            return (
                                <span key={i}
                                    className={`pem-token pem-token-paren ${!isInScope ? 'pem-greyed' : ''} ${pemScopeId === token.nodeId ? 'pem-paren-active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); handleParenClick(token); }}
                                >{token.value}</span>
                            );
                        }
                        if (token.type === 'op') {
                            return (
                                <span key={i}
                                    className={`pem-token pem-token-op ${!isInScope ? 'pem-greyed' : ''} ${isFlashGreen ? 'pem-flash-green' : ''} ${isFlashRed ? 'pem-flash-red' : ''} ${token.superscript ? 'pem-token-superscript' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); handlePemOperatorClick(token); }}
                                >
                                    <span className="pem-op-circle">{token.value === '*' ? '×' : token.value === '/' ? '÷' : token.value}</span>
                                </span>
                            );
                        }
                        // number
                        return (
                            <span key={i}
                                className={`pem-token pem-token-number ${!isInScope ? 'pem-greyed' : ''} ${isFlashGreen ? 'pem-flash-green' : ''} ${isFlashRed ? 'pem-flash-red' : ''} ${token.superscript ? 'pem-token-superscript' : ''}`}
                            >{token.value}</span>
                        );
                    })}
                </div>
                {pemFailed && !disabled && (
                    <button className="pem-continue-btn" onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); }}>Continue</button>
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
                                className={`quiz-option-reorder ${isDragged ? 'dragging' : ''} ${isShuffling ? 'shuffling' : ''} ${isSolved ? (item.originalIndex === index ? 'correct' : '') : ''} ${isFailed ? (item.originalIndex === index ? 'correct' : 'wrong') : ''}`}
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
                                <span className="quiz-option-text" dangerouslySetInnerHTML={{ __html: item.text }} />
                                <span className="reorder-grip">⋮⋮</span>
                            </div>
                        );
                    })}
                </div>
                {!isSolved && !isFailed && (
                    <button
                        className="quiz-ready-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReorderSubmit();
                        }}
                        disabled={isShuffling}
                    >
                        READY
                    </button>
                )}
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
                    const isCorrect = correctIndices.includes(index);
                    const isShaking = index === shakingIndex;

                    if (isSolved) {
                        className += isCorrect ? ' correct pulse' : ' grayed-out';
                    } else if (isFailed) {
                        className += isCorrect ? ' correct pulse' : ' grayed-out';
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
                                    pointerEvents: (isFailed || isSolved || disabled) ? 'none' : 'auto'
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
                                    <span className="quiz-option-text" dangerouslySetInnerHTML={{ __html: option }} />
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
