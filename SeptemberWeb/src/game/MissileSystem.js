/**
 * MissileSystem.js — Missile flight, explosion, and blast damage
 * Source: 2_11.ls (Bomb Behavior), 2_1.ls
 *
 * The original uses a Flash SWF for the missile animation.
 * Frame 16 = explosion moment (switch from missile sound to explosion sound)
 * Frame 23 = destruction applied (kill entities + damage buildings)
 * After animation completes, missile becomes invisible.
 *
 * We simulate this with a frame-based animation system.
 */

import {
    BLAST_X, BLAST_Y, SCREEN_W, FPS,
} from './constants.js';

const MISSILE_SPEED = 8;        // pixels per frame during flight
const EXPLOSION_FRAME = 16;     // frame where explosion sound plays
const DESTROY_FRAME = 23;       // frame where damage is applied
const TOTAL_FRAMES = 35;        // total animation frames
const EXPLOSION_RADIUS_PX = 80; // visual explosion radius

export class MissileSystem {
    constructor(engine) {
        this.engine = engine;
        this.activeMissile = null;
        this.explosions = [];         // active explosion effects
        this.craters = [];            // persistent ground marks
    }

    isLaunched() {
        return this.activeMissile !== null;
    }

    // ——— Launch (from 2_11.ls mLaunch) ———

    launch(screenX, screenY, tileX, tileY) {
        if (this.activeMissile) return; // only one at a time

        // Determine flip based on screen half
        const flipH = screenX > SCREEN_W / 2;

        this.activeMissile = {
            targetScreenX: screenX,
            targetScreenY: screenY,
            tileX,
            tileY,
            frame: 0,
            flipH,
            // Start position (top of screen, above target)
            startX: screenX + (flipH ? 100 : -100),
            startY: 0,
            // Current draw position
            x: screenX,
            y: 0,
            exploded: false,
            destroyed: false,
        };

        // Play missile sound
        if (this.engine.soundManager) {
            this.engine.soundManager.playMissile();
        }
    }

    // ——— Update (from 2_11.ls exitFrame) ———

    update(dt) {
        if (this.activeMissile) {
            const m = this.activeMissile;
            m.frame++;

            if (m.frame < EXPLOSION_FRAME) {
                // Flight phase: missile moves toward target
                const progress = m.frame / EXPLOSION_FRAME;
                m.x = m.startX + (m.targetScreenX - m.startX) * progress;
                m.y = m.startY + (m.targetScreenY - m.startY) * progress;
            } else if (m.frame === EXPLOSION_FRAME) {
                // Explosion moment
                m.x = m.targetScreenX;
                m.y = m.targetScreenY;
                m.exploded = true;

                // Switch sounds
                if (this.engine.soundManager) {
                    this.engine.soundManager.stopMissile();
                    this.engine.soundManager.playExplosion();
                }

                // Create visual explosion
                this.explosions.push({
                    x: m.targetScreenX,
                    y: m.targetScreenY,
                    frame: 0,
                    maxFrames: 30,
                    radius: 0,
                });
            } else if (m.frame === DESTROY_FRAME) {
                // Apply damage
                m.destroyed = true;
                this._applyDestruction(m.tileX, m.tileY);

                // Add crater
                this.craters.push({
                    x: m.targetScreenX,
                    y: m.targetScreenY,
                    opacity: 0.6,
                });
            } else if (m.frame >= TOTAL_FRAMES) {
                // Animation complete
                this.activeMissile = null;
            }
        }

        // Update explosion effects
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.frame++;
            exp.radius = (exp.frame / exp.maxFrames) * EXPLOSION_RADIUS_PX;
            if (exp.frame >= exp.maxFrames) {
                this.explosions.splice(i, 1);
            }
        }

        // Fade craters
        for (let i = this.craters.length - 1; i >= 0; i--) {
            this.craters[i].opacity -= 0.0005;
            if (this.craters[i].opacity <= 0) {
                this.craters.splice(i, 1);
            }
        }
    }

    _applyDestruction(tileX, tileY) {
        // Kill entities in blast radius
        this.engine.entityManager.kill(tileX, tileY);

        // Damage buildings
        this.engine.buildingManager.explode(tileX, tileY);
        this.engine.buildingManager.explodeTall(tileX, tileY);
    }

    // ——— Rendering ———

    render(ctx, assetManager) {
        // Draw craters (behind everything)
        for (const crater of this.craters) {
            ctx.save();
            ctx.globalAlpha = crater.opacity;
            ctx.fillStyle = '#3a2a1a';
            ctx.beginPath();
            ctx.ellipse(crater.x, crater.y, 20, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw missile in flight
        if (this.activeMissile && !this.activeMissile.exploded) {
            const m = this.activeMissile;

            // Try to use original missile sprite
            const missileImg = assetManager.getImage('missile');
            if (missileImg) {
                ctx.save();
                ctx.translate(m.x, m.y);
                if (m.flipH) ctx.scale(-1, 1);
                ctx.drawImage(missileImg, -missileImg.width / 2, -missileImg.height / 2);
                ctx.restore();
            } else {
                // Fallback: draw a simple missile shape
                ctx.save();
                ctx.fillStyle = '#666';
                ctx.translate(m.x, m.y);

                // Missile body
                ctx.fillRect(-3, -15, 6, 20);

                // Nose cone
                ctx.beginPath();
                ctx.moveTo(-3, -15);
                ctx.lineTo(0, -22);
                ctx.lineTo(3, -15);
                ctx.fillStyle = '#888';
                ctx.fill();

                // Flame trail
                ctx.fillStyle = '#ff6600';
                ctx.beginPath();
                ctx.moveTo(-4, 5);
                ctx.lineTo(0, 15 + Math.random() * 8);
                ctx.lineTo(4, 5);
                ctx.fill();

                ctx.restore();
            }
        }

        // Draw explosions
        for (const exp of this.explosions) {
            const progress = exp.frame / exp.maxFrames;
            ctx.save();

            // Try explosion sprite
            const expImg = assetManager.getImage('explosion1');
            if (expImg && progress < 0.5) {
                ctx.globalAlpha = 1 - progress * 2;
                ctx.drawImage(expImg, exp.x - expImg.width / 2, exp.y - expImg.height / 2);
            }

            // Animated circle explosion
            ctx.globalAlpha = Math.max(0, 1 - progress);

            // Fireball
            const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
            gradient.addColorStop(0, `rgba(255, 255, 200, ${1 - progress})`);
            gradient.addColorStop(0.3, `rgba(255, 150, 50, ${0.8 * (1 - progress)})`);
            gradient.addColorStop(0.6, `rgba(200, 50, 0, ${0.5 * (1 - progress)})`);
            gradient.addColorStop(1, 'rgba(100, 20, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fill();

            // Debris particles
            if (progress < 0.6) {
                const particleCount = 12;
                for (let i = 0; i < particleCount; i++) {
                    const angle = (i / particleCount) * Math.PI * 2;
                    const dist = exp.radius * (0.7 + Math.random() * 0.6);
                    const px = exp.x + Math.cos(angle) * dist;
                    const py = exp.y + Math.sin(angle) * dist - progress * 30;
                    const size = 2 + Math.random() * 3;
                    ctx.fillStyle = `rgba(${150 + Math.random() * 100}, ${80 + Math.random() * 60}, ${30}, ${1 - progress * 1.5})`;
                    ctx.fillRect(px - size / 2, py - size / 2, size, size);
                }
            }

            // Smoke ring
            if (progress > 0.3) {
                const smokeAlpha = Math.max(0, 0.4 * (1 - (progress - 0.3) / 0.7));
                ctx.beginPath();
                ctx.arc(exp.x, exp.y - progress * 20, exp.radius * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100, 80, 60, ${smokeAlpha})`;
                ctx.fill();
            }

            ctx.restore();
        }
    }
}
