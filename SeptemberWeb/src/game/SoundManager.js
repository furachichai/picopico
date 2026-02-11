/**
 * SoundManager.js — Game audio management using HTML5 Audio
 * Source: 2_10.ls (Sound Class Parent)
 *
 * 6 sound channels:
 * 1. Ambient (looping background noise)
 * 2. Turn (terrorist conversion)
 * 3. Click (firing UI)
 * 4. Missile (whoosh during flight)
 * 5. Explosion (impact)
 * 6. Cry (mourning — reference counted for multiple mourners)
 */

const BASE = '/sept12%20for%20vibe/Sept12assets/sep12';

export class SoundManager {
    constructor() {
        this.sounds = {};
        this.cryCount = 0;
        this.loaded = false;
        this.muted = false;
    }

    async init() {
        // Sound definitions from 2_10.ls
        const soundDefs = [
            { name: 'ambient', src: `${BASE}/7_2.mp3`, volume: 0.3, loop: true },
            { name: 'turn', src: `${BASE}/7_3.mp3`, volume: 0.5, loop: false },
            { name: 'click', src: `${BASE}/7_7.mp3`, volume: 0.5, loop: false },
            { name: 'missile', src: `${BASE}/7_4.mp3`, volume: 0.8, loop: false },
            { name: 'explosion', src: `${BASE}/7_5.mp3`, volume: 0.9, loop: false },
            { name: 'cry', src: `${BASE}/7_6.mp3`, volume: 0.3, loop: true },
        ];

        const loadPromises = soundDefs.map(def => {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.loop = def.loop;
                audio.volume = def.volume;

                audio.addEventListener('canplaythrough', () => {
                    this.sounds[def.name] = {
                        audio,
                        volume: def.volume,
                        loop: def.loop,
                    };
                    resolve();
                }, { once: true });

                audio.addEventListener('error', (e) => {
                    console.warn(`Failed to load sound ${def.name}:`, e);
                    resolve(); // Don't block on failed sounds
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

        const { audio } = sound;

        // For non-looping sounds, restart from beginning
        if (!sound.loop) {
            audio.currentTime = 0;
        }

        audio.play().catch(e => {
            // Browser may block autoplay — ignore silently
        });
    }

    _stop(name) {
        const sound = this.sounds[name];
        if (!sound) return;

        const { audio } = sound;
        audio.pause();
        audio.currentTime = 0;
    }

    // ——— Public API ———

    playAmbient() { this._play('ambient'); }
    stopAmbient() { this._stop('ambient'); }

    playClick() { this._play('click'); }
    playMissile() { this._play('missile'); }
    stopMissile() { this._stop('missile'); }
    playExplosion() { this._play('explosion'); }
    playTurn() { this._play('turn'); }

    // Cry with reference counting (from 2_10.ls mPlayCry / mStopCry)
    playCry() {
        if (this.cryCount === 0) {
            this._play('cry');
        }
        this.cryCount++;
    }

    stopCry() {
        this.cryCount--;
        if (this.cryCount <= 0) {
            this.cryCount = 0;
            this._stop('cry');
        }
    }

    // Resume audio (called after user gesture)
    resume() {
        // HTML5 Audio doesn't need explicit resume like Web Audio API
        // But we can try to play ambient here after user interaction
    }

    toggleMute() {
        this.muted = !this.muted;
        for (const sound of Object.values(this.sounds)) {
            if (this.muted) {
                sound.audio.volume = 0;
            } else {
                sound.audio.volume = sound.volume;
            }
        }
    }
}
