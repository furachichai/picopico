/**
 * AlgeBrosSoundManager.js
 * 
 * Synthesized sound effects using the Web Audio API.
 * No external files required.
 */

let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

function playTone(freq, duration, type = 'sine', volume = 0.3, rampDown = true) {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    if (rampDown) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

export function playSelect() {
  // A clean, high-pitched click
  playTone(1200, 0.04, 'sine', 0.1);
}

export function playMerge() {
  // Satisfying upward sweep
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.warn(e);
  }
}

export function playWrong() {
  // Buzzy negative feedback tones
  playTone(150, 0.12, 'sawtooth', 0.18);
  setTimeout(() => playTone(120, 0.18, 'sawtooth', 0.18), 80);
}

export function playLevelUp() {
  // Upward major arpeggio
  const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.22, 'sine', 0.15), i * 90);
  });
}

export function playGameOver() {
  // Ominous downward chord
  const notes = [311, 261, 220, 165];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.45, 'triangle', 0.2), i * 150);
  });
}

export function playVictory() {
  // Triumphant rising arpeggios
  const notes = [523, 659, 784, 1047, 1318, 1568]; // C major scale extended
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.3, 'sine', 0.15);
      playTone(freq * 1.005, 0.3, 'triangle', 0.05); // slight detune chorus
    }, i * 80);
  });
}

export function playPopFX() {
  try {
    const ctx = getContext();
    const playPop = (delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const startTime = ctx.currentTime + delay;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, startTime);
      osc.frequency.exponentialRampToValueAtTime(150, startTime + 0.12);
      
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      
      osc.start(startTime);
      osc.stop(startTime + 0.12);
    };
    
    playPop(0);
    playPop(0.08);
  } catch (e) {
    console.warn(e);
  }
}

export function playVanish() {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    // 1. Soft airy poof tone
    const oscPoof = ctx.createOscillator();
    const gainPoof = ctx.createGain();
    oscPoof.type = 'sine';
    oscPoof.frequency.setValueAtTime(440, t);
    oscPoof.frequency.exponentialRampToValueAtTime(100, t + 0.18);
    gainPoof.gain.setValueAtTime(0.25, t);
    gainPoof.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    oscPoof.connect(gainPoof);
    gainPoof.connect(ctx.destination);
    oscPoof.start(t);
    oscPoof.stop(t + 0.18);

    // 2. High magical sparkle bells
    const sparkleNotes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
    sparkleNotes.forEach((freq, idx) => {
      const noteTime = t + 0.04 + idx * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.12, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.22);
    });
  } catch (e) {
    console.warn('Vanish sound failed:', e);
  }
}

