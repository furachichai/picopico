/**
 * SoundManager.js
 * 
 * Web Audio API synthesizer for game sound effects.
 * No external audio files required.
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
}

function playNoise(duration, volume = 0.15) {
  const ctx = getContext();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1000, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + duration);
}

// ─── Sound Effects ───────────────────────────────────────────

export function playCorrect() {
  // Rising two-note chime
  playTone(523, 0.12, 'sine', 0.25);  // C5
  setTimeout(() => playTone(659, 0.2, 'sine', 0.25), 80); // E5
}

export function playWrong() {
  // Buzzy low tone
  playTone(180, 0.15, 'sawtooth', 0.2);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.2), 100);
}

export function playSelect() {
  // Soft click
  playTone(880, 0.05, 'sine', 0.15);
}

export function playMerge() {
  // Satisfying merge: rising sweep
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}

export function playLevelUp() {
  // Celebratory ascending arpeggio
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.2), i * 100);
  });
}

export function playGameOver() {
  // Descending ominous tones
  const notes = [440, 370, 311, 261]; // A4 F#4 D#4 C4
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.4, 'sawtooth', 0.15), i * 200);
  });
}

export function playNotPresent() {
  // Very subtle soft buzz — operation not present, no life lost
  playNoise(0.08, 0.08);
}

export function playHeartLost() {
  // Quick descending whistle
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}
