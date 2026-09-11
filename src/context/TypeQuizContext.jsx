import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';

const TypeQuizContext = createContext(null);

export const useTypeQuiz = () => {
    return useContext(TypeQuizContext);
};

export const TypeQuizProvider = ({
    slide,
    isActive = true,
    onSolve,
    onNext,
    onBanner,
    children
}) => {
    // Collect and order all result_field elements in the current slide
    const resultFields = useMemo(() => {
        if (!slide || !Array.isArray(slide.elements)) return [];
        const fields = slide.elements
            .map((el, idx) => ({ el, originalIdx: idx }))
            .filter(item => item.el.type === 'result_field');

        fields.sort((a, b) => {
            const orderA = a.el.metadata?.order !== undefined ? Number(a.el.metadata.order) : (a.originalIdx + 1);
            const orderB = b.el.metadata?.order !== undefined ? Number(b.el.metadata.order) : (b.originalIdx + 1);
            return orderA - orderB;
        });

        return fields.map(item => item.el);
    }, [slide]);

    const [typedValues, setTypedValues] = useState({});
    const [fieldStates, setFieldStates] = useState({}); // { [id]: 'idle' | 'wrong' | 'solved' }
    const [activeFieldId, setActiveFieldId] = useState(null);
    const [isQuizSolved, setIsQuizSolved] = useState(false);
    const [keyboardSlidDown, setKeyboardSlidDown] = useState(false);

    // Audio Context for crisp tactile comic sounds
    const audioCtxRef = useRef(null);

    const playSound = useCallback((type) => {
        try {
            if ('vibrate' in navigator) {
                if (type === 'correct') navigator.vibrate([80, 40, 80]);
                else if (type === 'wrong') navigator.vibrate(120);
                else if (type === 'key') navigator.vibrate(10);
            }
        } catch (e) {}

        try {
            if (!audioCtxRef.current) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) audioCtxRef.current = new AC();
            }
            const ctx = audioCtxRef.current;
            if (!ctx) return;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;
            if (type === 'key') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'backspace') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.06);
            } else if (type === 'correct') {
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                const gain2 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(523.25, now); // C5
                osc1.frequency.setValueAtTime(659.25, now + 0.09); // E5
                gain1.gain.setValueAtTime(0.3, now);
                gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
                osc1.connect(gain1); gain1.connect(ctx.destination);
                osc1.start(now); osc1.stop(now + 0.3);

                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(783.99, now + 0.09); // G5
                osc2.frequency.setValueAtTime(1046.50, now + 0.18); // C6
                gain2.gain.setValueAtTime(0.3, now + 0.09);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
                osc2.connect(gain2); gain2.connect(ctx.destination);
                osc2.start(now + 0.09); osc2.stop(now + 0.4);
            } else if (type === 'wrong') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(160, now);
                osc.frequency.linearRampToValueAtTime(105, now + 0.22);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.28);
            }
        } catch (e) {
            console.warn('TypeQuizContext sound error:', e);
        }
    }, []);

    // Reset or initialize state when slide changes
    useEffect(() => {
        setTypedValues({});
        setFieldStates({});
        setIsQuizSolved(false);
        setKeyboardSlidDown(false);
        if (resultFields.length > 0) {
            setActiveFieldId(resultFields[0].id);
        } else {
            setActiveFieldId(null);
        }
    }, [slide?.id]);

    // Ensure activeFieldId points to the first unsolved field if unset
    useEffect(() => {
        if (!activeFieldId && resultFields.length > 0) {
            const firstUnsolved = resultFields.find(f => fieldStates[f.id] !== 'solved');
            if (firstUnsolved) {
                if (fieldStates[firstUnsolved.id] === 'wrong') {
                    setFieldStates(prev => ({ ...prev, [firstUnsolved.id]: 'idle' }));
                    setTypedValues(prev => ({ ...prev, [firstUnsolved.id]: '' }));
                }
                setActiveFieldId(firstUnsolved.id);
            }
        }
    }, [resultFields, activeFieldId, fieldStates]);

    const activeField = useMemo(() => {
        return resultFields.find(f => f.id === activeFieldId) || null;
    }, [resultFields, activeFieldId]);

    const activeTypedValue = activeFieldId ? (typedValues[activeFieldId] || '') : '';
    const activeFieldState = activeFieldId ? (fieldStates[activeFieldId] || 'idle') : 'idle';

    // Calculate Check Button state
    const checkButtonState = useMemo(() => {
        if (isQuizSolved) return 'solved';
        if (activeFieldState === 'wrong') return 'try_again';
        if (!activeTypedValue.trim()) return 'disabled';

        // Check if there are other unsolved fields after this one
        const unsolvedCount = resultFields.filter(f => fieldStates[f.id] !== 'solved').length;
        if (unsolvedCount > 1) {
            return 'next';
        }
        return 'check';
    }, [isQuizSolved, activeFieldState, activeTypedValue, resultFields, fieldStates]);

    // Handle tapping an unsolved Result Field
    // If a result is wrong, the next time that result field becomes active, it gets cleared out
    const handleSelectField = useCallback((fieldId) => {
        if (isQuizSolved || keyboardSlidDown) return;
        if (fieldStates[fieldId] === 'solved') return; // Cannot edit once solved
        
        if (fieldStates[fieldId] === 'wrong') {
            setFieldStates(prev => ({ ...prev, [fieldId]: 'idle' }));
            setTypedValues(prev => ({ ...prev, [fieldId]: '' }));
        }
        setActiveFieldId(fieldId);
    }, [isQuizSolved, keyboardSlidDown, fieldStates]);

    // Handle keypress from custom keyboard or physical keyboard
    const handleKeyPress = useCallback((key) => {
        if (isQuizSolved || keyboardSlidDown || !activeFieldId) return;
        const currentField = resultFields.find(f => f.id === activeFieldId);
        if (!currentField || fieldStates[activeFieldId] === 'solved') return;

        // If field was previously in wrong state, clear it out when user begins typing
        if (fieldStates[activeFieldId] === 'wrong') {
            setFieldStates(prev => ({ ...prev, [activeFieldId]: 'idle' }));
            if (/^[0-9]$/.test(key)) {
                playSound('key');
                setTypedValues(prev => ({
                    ...prev,
                    [activeFieldId]: key
                }));
                return;
            } else {
                setTypedValues(prev => ({
                    ...prev,
                    [activeFieldId]: ''
                }));
                return;
            }
        }

        if (key === 'backspace' || key === 'Backspace' || key === 'Delete') {
            playSound('backspace');
            setTypedValues(prev => {
                const cur = prev[activeFieldId] || '';
                return {
                    ...prev,
                    [activeFieldId]: cur.slice(0, -1)
                };
            });
            return;
        }

        // Numeric keys 0-9
        if (/^[0-9]$/.test(key)) {
            const expectedAnswer = String(currentField.metadata?.correctAnswer ?? '').trim();
            const maxLen = expectedAnswer ? expectedAnswer.length : 3;
            const cur = typedValues[activeFieldId] || '';

            if (cur.length < maxLen) {
                playSound('key');
                setTypedValues(prev => ({
                    ...prev,
                    [activeFieldId]: cur + key
                }));
            }
        }
    }, [isQuizSolved, keyboardSlidDown, activeFieldId, resultFields, fieldStates, typedValues, playSound]);

    // Handle check button click
    const handleCheck = useCallback(() => {
        if (isQuizSolved || keyboardSlidDown || !activeFieldId) return;

        // If currently in 'wrong' (Try Again) state, tapping it clears the wrong state and clears input
        if (activeFieldState === 'wrong') {
            setFieldStates(prev => ({ ...prev, [activeFieldId]: 'idle' }));
            setTypedValues(prev => ({ ...prev, [activeFieldId]: '' }));
            return;
        }

        if (!activeTypedValue.trim()) return;

        const currentField = resultFields.find(f => f.id === activeFieldId);
        if (!currentField) return;

        const expected = String(currentField.metadata?.correctAnswer ?? '').trim();
        const actual = activeTypedValue.trim();

        if (actual === expected) {
            // Correct answer!
            playSound('correct');
            const newStates = { ...fieldStates, [activeFieldId]: 'solved' };
            setFieldStates(newStates);

            // Check if all fields are now solved
            const remainingUnsolved = resultFields.filter(f => newStates[f.id] !== 'solved');

            if (remainingUnsolved.length === 0) {
                // Entire quiz is won!
                setIsQuizSolved(true);
                setKeyboardSlidDown(true);
                confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } });
                if (onBanner) onBanner('correct', 'Topo!');
                if (onSolve) onSolve(actual);
                if (onNext) onNext(true);
            } else {
                // Activate the first unsolved field in order
                const firstRemaining = remainingUnsolved[0];
                if (firstRemaining) {
                    if (newStates[firstRemaining.id] === 'wrong') {
                        setFieldStates(prev => ({ ...prev, [firstRemaining.id]: 'idle' }));
                        setTypedValues(prev => ({ ...prev, [firstRemaining.id]: '' }));
                    }
                    setActiveFieldId(firstRemaining.id);
                }
            }
        } else {
            // Wrong answer!
            playSound('wrong');
            setFieldStates(prev => ({ ...prev, [activeFieldId]: 'wrong' }));
        }
    }, [isQuizSolved, keyboardSlidDown, activeFieldId, activeFieldState, activeTypedValue, resultFields, fieldStates, playSound, onBanner, onSolve, onNext]);

    const contextValue = useMemo(() => ({
        isTypeQuiz: true,
        resultFields,
        activeFieldId,
        typedValues,
        fieldStates,
        checkButtonState,
        isQuizSolved,
        keyboardSlidDown,
        handleKeyPress,
        handleSelectField,
        handleCheck
    }), [
        resultFields,
        activeFieldId,
        typedValues,
        fieldStates,
        checkButtonState,
        isQuizSolved,
        keyboardSlidDown,
        handleKeyPress,
        handleSelectField,
        handleCheck
    ]);

    return (
        <TypeQuizContext.Provider value={contextValue}>
            {children}
        </TypeQuizContext.Provider>
    );
};
