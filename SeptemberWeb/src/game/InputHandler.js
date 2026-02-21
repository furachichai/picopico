/**
 * InputHandler.js — Mouse/touch input for crosshair and missile firing
 * Source: 2_1.ls (target behavior), observation from gameplay
 *
 * Uses the original target sprite assets.
 * Triggers horizontal scrolling when crosshair is near screen edges.
 */

import {
    SCREEN_W, SCREEN_H, SCROLL_HORIZ, SCROLL_STEP, GAME_STATE,
} from './constants.js';

export class InputHandler {
    constructor(engine) {
        this.engine = engine;
        this.mouseX = SCREEN_W / 2;
        this.mouseY = SCREEN_H / 2;
        this.isOverCanvas = false;

        // Firing cooldown animation
        this.canFire = true;
        this.cooldownFrames = 108; // Total frames in our animation
        this.cooldownDuration = 9000; // 9 seconds (108 frames at 12fps)
        this.lastFireTime = 0;

        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseEnter = this._onMouseEnter.bind(this);
        this._boundMouseLeave = this._onMouseLeave.bind(this);
        this._boundTouchStart = this._onTouchStart.bind(this);
        this._boundTouchMove = this._onTouchMove.bind(this);
        this._boundKeyDown = this._onKeyDown.bind(this);
    }

    attach(canvas) {
        this.canvas = canvas;
        canvas.addEventListener('mousemove', this._boundMouseMove);
        canvas.addEventListener('mousedown', this._boundMouseDown);
        canvas.addEventListener('mouseenter', this._boundMouseEnter);
        canvas.addEventListener('mouseleave', this._boundMouseLeave);
        canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        document.addEventListener('keydown', this._boundKeyDown);

        // Hide system cursor over canvas
        canvas.style.cursor = 'none';
    }

    detach() {
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this._boundMouseMove);
            this.canvas.removeEventListener('mousedown', this._boundMouseDown);
            this.canvas.removeEventListener('mouseenter', this._boundMouseEnter);
            this.canvas.removeEventListener('mouseleave', this._boundMouseLeave);
            this.canvas.removeEventListener('touchstart', this._boundTouchStart);
            this.canvas.removeEventListener('touchmove', this._boundTouchMove);
            this.canvas.style.cursor = '';
        }
        document.removeEventListener('keydown', this._boundKeyDown);
    }

    _getCanvasCoords(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = SCREEN_W / rect.width;
        const scaleY = SCREEN_H / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    _onMouseMove(e) {
        const pos = this._getCanvasCoords(e.clientX, e.clientY);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
    }

    _onMouseDown(e) {
        e.preventDefault();
        // Don't fire when placement tool is active
        if (this.engine.placementTool && this.engine.placementTool.active) return;
        this._fire();
    }

    _onMouseEnter() {
        this.isOverCanvas = true;
    }

    _onMouseLeave() {
        this.isOverCanvas = false;
    }

    _onKeyDown(e) {
        if (this.engine.state !== GAME_STATE.PLAYING) return;
        if (e.key === 's' || e.key === 'S') {
            if (!e.ctrlKey && !e.metaKey) {
                if (this.engine.soundManager) {
                    this.engine.soundManager.toggleMute();
                }
                return;
            }
        }
        if (e.key === 't' || e.key === 'T') {
            this.engine.showTileDebug = !this.engine.showTileDebug;
            if (this.engine.showTileDebug) {
                // Center cursor on whatever tile is at the middle of the screen
                const center = this.engine.worldMap.screenToTile(320, 240);
                this.engine.tileEditorX = Math.max(0, Math.min(119, center.tileX));
                this.engine.tileEditorY = Math.max(0, Math.min(119, center.tileY));
            }
            return;
        }

        // ——— Tile editor controls (only when overlay is visible) ———
        if (!this.engine.showTileDebug) return;

        const worldMap = this.engine.worldMap;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.engine.tileEditorY = Math.max(0, this.engine.tileEditorY - 1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.engine.tileEditorY = Math.min(119, this.engine.tileEditorY + 1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.engine.tileEditorX = Math.max(0, this.engine.tileEditorX - 1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.engine.tileEditorX = Math.min(119, this.engine.tileEditorX + 1);
        } else if (e.key === 'r' || e.key === 'R') {
            // Flip tile walkability
            worldMap.toggleTileOverride(this.engine.tileEditorX, this.engine.tileEditorY);
            worldMap.saveGridOverridesToLocalStorage();
        } else if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
            // Ctrl+S / Cmd+S: save overrides to file
            e.preventDefault();
            this._saveTileOverrides();
        } else if (e.key === 'Escape') {
            // Esc: save and close
            this._saveTileOverrides();
            this.engine.showTileDebug = false;
        }
    }

    _saveTileOverrides() {
        const worldMap = this.engine.worldMap;
        worldMap.saveGridOverridesToLocalStorage();

        // Save directly to local file via Vite dev server API
        const data = worldMap.exportGridOverrides();
        fetch('/api/save-grid-overrides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    console.log(`[TileEditor] Saved ${data.length} grid overrides to file`);
                } else {
                    console.error('[TileEditor] Save failed:', result.error);
                }
            })
            .catch(err => console.error('[TileEditor] Save request failed:', err));
    }

    _onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const pos = this._getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
            this.isOverCanvas = true;
            this._fire();
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const pos = this._getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
        }
    }

    _fire() {
        if (this.engine.state !== GAME_STATE.PLAYING) return;
        if (!this.canFire) return;
        if (this.engine.missileSystem.isLaunched()) return;

        const worldMap = this.engine.worldMap;
        const tile = worldMap.screenToTile(this.mouseX, this.mouseY);

        this.engine.missileSystem.launch(
            this.mouseX, this.mouseY,
            tile.tileX, tile.tileY
        );

        // Play click sound
        if (this.engine.soundManager) {
            this.engine.soundManager.playClick();
        }

        // Start cooldown animation (9 seconds)
        this.canFire = false;
        this.lastFireTime = Date.now();
        setTimeout(() => { this.canFire = true; }, this.cooldownDuration);
    }

    // ——— Scrolling (from 2_1.ls ScrollScreen) ———

    updateScroll() {
        const worldMap = this.engine.worldMap;

        if (this.mouseX < SCROLL_HORIZ) {
            worldMap.scroll(SCROLL_STEP);
        } else if (this.mouseX > SCREEN_W - SCROLL_HORIZ) {
            worldMap.scroll(-SCROLL_STEP);
        }
    }

    // ——— Rendering the crosshair ———

    getCurrentTargetFrameId() {
        if (this.canFire) return 'target_frame_001';

        const elapsed = Date.now() - this.lastFireTime;
        let frameIdx = Math.floor((elapsed / this.cooldownDuration) * this.cooldownFrames) + 1;

        if (frameIdx < 1) frameIdx = 1;
        if (frameIdx > this.cooldownFrames) frameIdx = this.cooldownFrames;

        return 'target_frame_' + frameIdx.toString().padStart(3, '0');
    }

    render(ctx, assetManager) {
        if (!this.canvas) return;

        // Don't show crosshair when placement tool is active or not playing
        if (this.engine.state !== GAME_STATE.PLAYING) return;
        if (this.engine.placementTool && this.engine.placementTool.active) return;

        ctx.save();

        let targetImg = null;

        if (!this.canFire) {
            targetImg = assetManager.getImage(this.getCurrentTargetFrameId());
        } else {
            // Player can fire, show the empty target (first frame of the animation)
            targetImg = assetManager.getImage('target_frame_001');
        }

        if (!targetImg) {
            // Fallback to original asset if frames aren't loaded yet
            targetImg = assetManager.getImage('target-empty') || assetManager.getImage('target-full');
        }

        if (targetImg) {
            const size = 90; // scale the 1080x1080 frames down to crosshair size (50% bigger)

            if (!this.canFire) {
                // Dual-layer draw for cooldown:
                // 1. Draw the red cooldown animation frame at 50% transparency
                ctx.globalAlpha = 0.5;
                ctx.drawImage(
                    targetImg,
                    this.mouseX - size / 2,
                    this.mouseY - size / 2,
                    size, size
                );

                // 2. Draw the empty target frame (black outline) exactly on top at 100% opacity
                ctx.globalAlpha = 1.0;
                const emptyFrame = assetManager.getImage('target_frame_001');
                if (emptyFrame) {
                    ctx.drawImage(
                        emptyFrame,
                        this.mouseX - size / 2,
                        this.mouseY - size / 2,
                        size, size
                    );
                }
            } else {
                // Normal draw (just the empty frame)
                ctx.drawImage(
                    targetImg,
                    this.mouseX - size / 2,
                    this.mouseY - size / 2,
                    size, size
                );
            }
        } else {
            // Fallback: draw a crosshair
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;

            // Outer circle
            ctx.beginPath();
            ctx.arc(this.mouseX, this.mouseY, 20, 0, Math.PI * 2);
            ctx.stroke();

            // Inner dot
            ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
            ctx.beginPath();
            ctx.arc(this.mouseX, this.mouseY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Cross lines
            ctx.beginPath();
            ctx.moveTo(this.mouseX - 25, this.mouseY);
            ctx.lineTo(this.mouseX - 10, this.mouseY);
            ctx.moveTo(this.mouseX + 10, this.mouseY);
            ctx.lineTo(this.mouseX + 25, this.mouseY);
            ctx.moveTo(this.mouseX, this.mouseY - 25);
            ctx.lineTo(this.mouseX, this.mouseY - 10);
            ctx.moveTo(this.mouseX, this.mouseY + 10);
            ctx.lineTo(this.mouseX, this.mouseY + 25);
            ctx.stroke();
        }

        ctx.restore();
    }
}
