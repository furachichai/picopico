/**
 * MissileSystem.js — Missile flight, explosion, and blast damage
 * Source: 2_11.ls (Bomb Behavior), 2_1.ls
 *
 * Uses a frame-by-frame sprite animation extracted from the original SWF.
 * 35 frames at 12 FPS (~2.9 seconds total).
 * Frame 16 = explosion moment (switch from missile sound to explosion sound)
 * Frame 18 = destruction applied (kill entities + damage buildings)
 * After all frames complete, missile is cleared.
 */

import {
    BLAST_X, BLAST_Y, SCREEN_W, FPS,
} from './constants.js';

// Animation constants
const MISSILE_FPS = 12;           // original SWF frame rate
const TOTAL_FRAMES = 35;
const EXPLOSION_FRAME = 17;       // frame where explosion cloud starts (synced with sound)
const DESTRUCTION_FRAME = 18;     // frame where damage is applied
const FRAME_INTERVAL = 1 / MISSILE_FPS; // seconds between frames

// The explosion center point in the raw 1440×1080 frame coordinates.
// Determined by visual inspection of the explosion frames.
const ANCHOR_X = 120;
const ANCHOR_Y = 260;

// Scale factor: the raw frames are 1440×1080, but the original SWF stage
// was 640×480 mapped to that resolution. We scale down to game resolution.
const RAW_W = 1440;
const RAW_H = 1080;
const FRAME_SCALE = 480 / RAW_H;  // 0.444... — scale to match game height

export class MissileSystem {
    constructor(engine) {
        this.engine = engine;
        this.activeMissile = null;
        this.craters = [];            // persistent ground marks
    }

    isLaunched() {
        return this.activeMissile !== null;
    }

    // ——— Launch ———

    launch(screenX, screenY, tileX, tileY) {
        if (this.activeMissile) return; // only one at a time

        // Calculate exact pixel offset from the tile's center at the moment of launch
        const worldMap = this.engine.worldMap;
        const launchPos = worldMap.tileToScreen(tileX, tileY);
        const tileCenterX = launchPos.x + 32;
        const tileCenterY = launchPos.y + 16;
        const offsetX = screenX - tileCenterX;
        const offsetY = screenY - tileCenterY;

        this.activeMissile = {
            targetScreenX: screenX,
            targetScreenY: screenY,
            offsetX,
            offsetY,
            tileX,
            tileY,
            frameIndex: 0,
            frameTimer: 0,
            exploded: false,
            destroyed: false,
        };

        // Play missile sound after a short delay (pause after click sound)
        if (this.engine.soundManager) {
            setTimeout(() => {
                if (this.activeMissile) { // still active
                    this.engine.soundManager.playMissile();
                }
            }, 300);
        }
    }

    // ——— Update ———

    update(dt) {
        if (this.activeMissile) {
            const m = this.activeMissile;
            m.frameTimer += dt;

            // Advance frames based on elapsed time
            while (m.frameTimer >= FRAME_INTERVAL) {
                m.frameTimer -= FRAME_INTERVAL;
                m.frameIndex++;

                // Check for explosion moment
                if (!m.exploded && m.frameIndex >= EXPLOSION_FRAME) {
                    m.exploded = true;
                    if (this.engine.soundManager) {
                        this.engine.soundManager.stopMissile();
                        this.engine.soundManager.playExplosion();
                    }
                }

                // Apply damage
                if (m.exploded && !m.destroyed && m.frameIndex >= DESTRUCTION_FRAME) {
                    m.destroyed = true;
                    this._applyDestruction(m.tileX, m.tileY);

                    // Add crater exactly where clicked
                    this.craters.push({
                        tileX: m.tileX,
                        tileY: m.tileY,
                        offsetX: m.offsetX,
                        offsetY: m.offsetY,
                        opacity: 0.6,
                    });
                }

                // Animation complete
                if (m.frameIndex >= TOTAL_FRAMES) {
                    this.activeMissile = null;
                    break;
                }
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
        const worldMap = this.engine.worldMap;
        if (worldMap) {
            for (const crater of this.craters) {
                const pos = worldMap.tileToScreen(crater.tileX, crater.tileY);
                const x = pos.x + 32 + (crater.offsetX || 0); // Exact clicked center
                const y = pos.y + 16 + (crater.offsetY || 0);

                ctx.save();
                ctx.globalAlpha = crater.opacity;
                ctx.fillStyle = '#3a2a1a';
                ctx.beginPath();
                ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Draw missile animation frame
        if (this.activeMissile && worldMap) {
            const m = this.activeMissile;
            const frameNum = Math.min(m.frameIndex + 1, TOTAL_FRAMES); // 1-indexed
            const frameId = `missile-frame-${String(frameNum).padStart(3, '0')}`;
            const frameImg = assetManager.getImage(frameId);

            if (frameImg) {
                // Convert tile coords to current screen position each frame
                // so the animation tracks with the world during panning
                const screenPos = worldMap.tileToScreen(m.tileX, m.tileY);
                const currentScreenX = screenPos.x + 32 + m.offsetX; // Exact sub-tile match
                const currentScreenY = screenPos.y + 16 + m.offsetY;

                // Scale and position so the explosion anchor aligns with the tile
                const drawW = RAW_W * FRAME_SCALE;
                const drawH = RAW_H * FRAME_SCALE;
                const anchorScreenX = ANCHOR_X * FRAME_SCALE;
                const anchorScreenY = ANCHOR_Y * FRAME_SCALE;

                const drawX = currentScreenX - anchorScreenX;
                const drawY = currentScreenY - anchorScreenY;

                ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
            }
        }
    }
}
