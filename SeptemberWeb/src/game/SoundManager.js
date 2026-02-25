/**
 * SoundManager.js — Game audio management
 * Source: 2_10.ls (Sound Class Parent)
 *
 * 6 sound channels:
 * 1. Ambient (looping background noise) — uses Web Audio API for gapless Safari looping
 * 2. Turn (terrorist conversion)
 * 3. Click (firing UI)
 * 4. Missile (whoosh during flight)
 * 5. Explosion (impact)
 * 6. Cry (mourning)
 */

const BASE = '/sept12%20for%20vibe/Sept12assets/sep12';

export class SoundManager {
    constructor() {
        this.sounds = {};
        this.cryCount = 0;
        this.loaded = false;
        this.muted = false;

        // Web Audio API context for gapless ambient loop
        this._audioCtx = null;
        this._ambientBuffer = null;
        this._ambientSource = null;
        this._ambientGain = null;
        this._ambientPlaying = false;
    }

    async init() {
        // Create Web Audio API context for ambient loop
        try {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this._ambientGain = this._audioCtx.createGain();
            this._ambientGain.gain.value = 0.3;
            this._ambientGain.connect(this._audioCtx.destination);

            // Fetch and decode ambient audio
            const response = await fetch(`${BASE}/7_2.mp3`);
            const arrayBuffer = await response.arrayBuffer();
            this._ambientBuffer = await this._audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn('Web Audio API failed for ambient, falling back to HTML5 Audio:', e);
            this._audioCtx = null;
        }

        // Non-looping sounds use HTML5 Audio
        const soundDefs = [
            { name: 'turn', src: `${BASE}/7_3.mp3`, volume: 0.5 },
            { name: 'click', src: `${BASE}/7_7.mp3`, volume: 0.5 },
            { name: 'missile', src: `${BASE}/7_4.mp3`, volume: 0.8 },
            { name: 'explosion', src: `${BASE}/7_5.mp3`, volume: 0.9 },
            { name: 'cry', src: `${BASE}/7_6.mp3`, volume: 0.3 },
        ];

        const loadPromises = soundDefs.map(def => {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.volume = def.volume;

                audio.addEventListener('canplaythrough', () => {
                    this.sounds[def.name] = {
                        audio,
                        volume: def.volume,
                    };
                    resolve();
                }, { once: true });

                audio.addEventListener('error', (e) => {
                    console.warn(`Failed to load sound ${def.name}:`, e);
                    resolve();
                }, { once: true });

                audio.src = def.src;
                audio.load();
            });
        });

        await Promise.all(loadPromises);
        this.loaded = true;
    }

    _play(name) {
        if (!this.loaded || this.muted) return;
        const sound = this.sounds[name];
        if (!sound) return;

        sound.audio.currentTime = 0;
        sound.audio.play().catch(() => { });
    }

    _stop(name) {
        const sound = this.sounds[name];
        if (!sound) return;

        sound.audio.pause();
        sound.audio.currentTime = 0;
    }

    // ——— Public API ———

    playAmbient() {
        if (this._ambientPlaying) return;

        if (this._audioCtx && this._ambientBuffer) {
            // Resume context if suspended (Safari requires user gesture)
            if (this._audioCtx.state === 'suspended') {
                this._audioCtx.resume();
            }

            // Create a new BufferSource (they are one-shot, must recreate each time)
            this._ambientSource = this._audioCtx.createBufferSource();
            this._ambientSource.buffer = this._ambientBuffer;
            this._ambientSource.loop = true; // Web Audio API loop is truly gapless
            this._ambientSource.connect(this._ambientGain);
            this._ambientSource.start(0);
            this._ambientPlaying = true;
        }
    }

    stopAmbient() {
        if (this._ambientSource && this._ambientPlaying) {
            try {
                this._ambientSource.stop();
            } catch (e) { /* ignore if already stopped */ }
            this._ambientSource = null;
            this._ambientPlaying = false;
        }
    }

    playClick() { this._play('click'); }
    playMissile() { this._play('missile'); }
    stopMissile() { this._stop('missile'); }
    playExplosion() { this._play('explosion'); }
    playTurn() { this._play('turn'); }

    // Cry plays once per mourning event (not looped)
    playCry() {
        this._play('cry');
    }

    stopCry() {
        this._stop('cry');
    }

    // Resume audio (called after user gesture)
    resume() {
        if (this._audioCtx && this._audioCtx.state === 'suspended') {
            this._audioCtx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;

        // Mute/unmute ambient (Web Audio API)
        if (this._ambientGain) {
            this._ambientGain.gain.value = this.muted ? 0 : 0.3;
        }

        // Mute/unmute HTML5 Audio sounds
        for (const sound of Object.values(this.sounds)) {
            sound.audio.volume = this.muted ? 0 : sound.volume;
        }
    }
}
