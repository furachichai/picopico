/**
 * GameEngine.js — Central orchestrator
 * Source: 2_1.ls (PlayGame, BeginGame, ScrollScreen)
 *
 * Manages all subsystems, the main game loop, game states,
 * and rendering pipeline (ground → buildings → entities → missiles → UI).
 */

import { AssetManager } from './AssetManager.js';
import { PlacementTool } from './PlacementTool.js';
import { WorldMap } from './WorldMap.js';
import { BuildingManager } from './BuildingManager.js';
import { EntityManager } from './EntityManager.js';
import { MissileSystem } from './MissileSystem.js';
import { InputHandler } from './InputHandler.js';
import { SoundManager } from './SoundManager.js';
import {
  SCREEN_W, SCREEN_H, FPS, GAME_STATE,
} from './constants.js';

export class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;

    // Subsystems
    this.assetManager = new AssetManager();
    this.worldMap = new WorldMap(this);
    this.buildingManager = new BuildingManager(this);
    this.entityManager = new EntityManager(this);
    this.missileSystem = new MissileSystem(this);
    this.inputHandler = new InputHandler(this);
    this.soundManager = new SoundManager();
    this.placementTool = new PlacementTool(this);

    // Game state
    this.state = GAME_STATE.LOADING;
    this.ready = false;
    this.showTileDebug = false; // T key toggle for tile walkability overlay
    this.titleMode = 0; // 0 = titlecard_01, 1 = instructions_01
    this.titleStartTime = 0;

    // Tile editor cursor (visible when showTileDebug is true)
    this.tileEditorX = 60;
    this.tileEditorY = 60;

    // Frame timing
    this.lastFrameTime = 0;
    this.frameDuration = 1000 / FPS; // target 48 FPS
    this.accumulator = 0;
  }

  async init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Set canvas to fixed game resolution
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;

    // Disable image smoothing for pixel-art crispness
    this.ctx.imageSmoothingEnabled = false;

    // Show loading state with animated render loop
    this.state = GAME_STATE.LOADING;
    this._loadingAnimId = null;
    const animateLoading = () => {
      if (this.state === GAME_STATE.LOADING) {
        this._renderLoading();
        this._loadingAnimId = requestAnimationFrame(animateLoading);
      }
    };
    animateLoading();

    // Load assets
    await this.assetManager.loadAll();

    // Stop loading animation loop
    if (this._loadingAnimId) {
      cancelAnimationFrame(this._loadingAnimId);
      this._loadingAnimId = null;
    }

    // Load sounds (non-blocking, failures are OK)
    await this.soundManager.init().catch(e => console.warn('Sound init failed:', e));

    // Attach input
    this.inputHandler.attach(canvas);
    this.placementTool.attach(canvas);

    // Show title screen
    this.state = GAME_STATE.TITLE;
    this.titleMode = 0;
    this.titleStartTime = 0; // Will be set on first render frame
    this.ready = true;

    // Load tile walkability overrides from file (non-blocking)
    this.worldMap.loadGridOverridesFromFile().catch(() => { });
  }

  handleTitleClick(x, y) {
    if (this.state !== GAME_STATE.TITLE) return;

    // Instruction Screen
    if (this.titleMode === 1) {
      // Fullscreen button bounds (top right)
      if (x >= 590 && x <= 630 && y >= 10 && y <= 50) {
        if (this.soundManager) this.soundManager.playClick();
        this.toggleFullscreen();
        return; // Don't trigger other clicks
      }

      // "CONTINUE" button bounds (gray box, measured from canvas screenshots)
      if (x >= 423 && x <= 524 && y >= 384 && y <= 422) {
        if (this.soundManager) this.soundManager.playClick();
        this.startGame();
      }
      // "CREDITS" button bounds - generously expanded hotspot
      else if (x >= 350 && x <= 500 && y >= 430 && y <= 480) {
        if (this.soundManager) this.soundManager.playClick();
        this.titleMode = 2; // Move to Credits screen
      }
    }
    // Credits Screen
    else if (this.titleMode === 2) {
      // "BACK" button bounds (bottom left) - generously expanded hotspot
      if (x >= 0 && x <= 120 && y >= 430 && y <= 480) {
        if (this.soundManager) this.soundManager.playClick();
        this.titleMode = 1; // Return to Instruction screen
      }
    }
  }

  startGame() {
    if (this.state !== GAME_STATE.TITLE) return;
    this.state = GAME_STATE.PLAYING;

    // Initialize world
    this.buildingManager.init();
    this.entityManager.init();

    // Force an immediate update with 0 dt to initialize exact pixel coordinates 
    // and animation frames for all entities before the first _render() call!
    // This prevents the "flash" of characters at default positions.
    this._update(0);

    // Resume audio context (required after user gesture)
    this.soundManager.resume();
    this.soundManager.playAmbient();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // ——— Main loop step ———

  step(timestamp) {
    if (!this.ready) return;

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
      return;
    }

    const elapsed = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.accumulator += elapsed;

    // Fixed timestep at original FPS
    while (this.accumulator >= this.frameDuration) {
      this.accumulator -= this.frameDuration;
      this._update(this.frameDuration / 1000);
    }

    this._render();
  }

  _update(dt) {
    if (this.state !== GAME_STATE.PLAYING) return;

    // Scroll based on mouse position
    this.inputHandler.updateScroll();

    // Update all subsystems
    this.buildingManager.update(dt);
    this.entityManager.update(dt);
    this.missileSystem.update(dt);
    this.placementTool.update();
  }

  // ——— Rendering ———

  _render() {
    const ctx = this.ctx;
    const am = this.assetManager;

    // Clear
    ctx.fillStyle = '#87CEEB'; // sky blue background
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Update cursor visibility here so it is responsive to state changes
    // Only update if it has changed to prevent browser flickering/hiding
    const targetCursor = (this.state === GAME_STATE.PLAYING && (!this.placementTool || !this.placementTool.active)) ? 'none' : 'default';
    if (this.canvas.style.cursor !== targetCursor) {
      this.canvas.style.cursor = targetCursor;
    }

    switch (this.state) {
      case GAME_STATE.LOADING:
        this._renderLoading();
        break;
      case GAME_STATE.TITLE:
        this._renderTitle();
        break;
      case GAME_STATE.PLAYING:
        this._renderGame();
        break;
    }
  }

  _renderLoading() {
    const ctx = this.ctx;
    // White background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Fetch the loading screen graphic
    if (!this._loadingImg) {
      this._loadingImg = new Image();
      this._loadingImg.src = '/sept12 for vibe/Sept12assets/sep12/loading_01.png';
    }

    // Draw the loading image if ready
    if (this._loadingImg.complete && this._loadingImg.naturalWidth > 0) {
      ctx.drawImage(this._loadingImg, 0, 0, SCREEN_W, SCREEN_H);
    }

    // Animated "LOADING..." text below the logo
    const dotCount = Math.floor((performance.now() / 400) % 4); // 0, 1, 2, 3 dots cycling
    const dots = '.'.repeat(dotCount);

    ctx.fillStyle = '#999';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'left';
    const loadingWidth = ctx.measureText('LOADING').width;
    const startX = (SCREEN_W - loadingWidth) / 2;
    ctx.fillText('LOADING' + dots, startX, SCREEN_H / 2 + 80);
  }

  _renderTitle() {
    const ctx = this.ctx;
    const am = this.assetManager;

    // White background to fix alpha-blending "solarized" effect on edges
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    if (this.titleMode === 0) {
      const titleImg = am.getImage('titlecard_01');
      if (titleImg) {
        // Draw the title card scaled to fit screen.
        ctx.drawImage(titleImg, 0, 0, SCREEN_W, SCREEN_H);
      } else {
        // Fallback text
        ctx.fillStyle = '#000';
        ctx.font = '24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SEPTEMBER 12th', SCREEN_W / 2, SCREEN_H / 2);
      }

      // Initialize start time on the very first frame of title screen render
      if (this.titleStartTime === 0) {
        this.titleStartTime = performance.now();
      }

      // Check time to transition
      if (performance.now() - this.titleStartTime > 3000) {
        this.titleMode = 1;
      }
    } else if (this.titleMode === 1) {
      const instrImg = am.getImage('instruction_01');
      if (instrImg) {
        ctx.drawImage(instrImg, 0, 0, SCREEN_W, SCREEN_H);

        // Render Continue button rollover if mouse is over it
        const mx = this.inputHandler.mouseX;
        const my = this.inputHandler.mouseY;
        // Bounding box based on measured canvas position of the grey Continue box
        if (mx >= 423 && mx <= 524 && my >= 384 && my <= 422) {
          const hoverImg = am.getImage('Continue_button_over');
          if (hoverImg) {
            // Fill an orange rectangle to "erase" the original grey button underneath
            // so it doesn't bleed through the transparent parts of the rollover graphic
            ctx.fillStyle = '#cf5111'; // Precise match for the surrounding instruction background 
            ctx.fillRect(414, 384, 114, 40);

            // Draw at measured position, native aspect ratio (359x126)
            // Scale to match button height (~40px): width = 40 * 359/126 ≈ 114
            ctx.drawImage(hoverImg, 414, 384, 114, 40);
          }
        }

      }
    } else if (this.titleMode === 2) {
      const creditsImg = am.getImage('credits_01');
      if (creditsImg) {
        ctx.drawImage(creditsImg, 0, 0, SCREEN_W, SCREEN_H);
      } else {
        // Fallback text
        ctx.fillStyle = '#000';
        ctx.font = '24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Credits: Click BACK to return', SCREEN_W / 2, SCREEN_H / 2);
      }
    }

    // Always render the fullscreen icon over the Instruction screen
    if (this.titleMode === 1) {
      this._renderFullscreenIcon(ctx);
    }
  }

  _renderGame() {
    const ctx = this.ctx;
    const am = this.assetManager;
    const worldMap = this.worldMap;

    // Layer 1: Ground (pre-rendered bitmap)
    worldMap.render(ctx, am);

    // Layer 2: Unified depth-sorted buildings + entities
    // Collect all renderables with their depth key (tileX + tileY)
    const renderables = [];

    // Add buildings — compute screen Y for depth sorting
    for (const building of this.buildingManager.buildings) {
      const pos = worldMap.tileToSpritePos(building.tileX, building.tileY);
      renderables.push({
        kind: 'building',
        building,
        screenY: pos.y,
        renderPos: pos,
      });
    }

    // Add living entities (hidden in editor mode for clarity)
    if (!this.placementTool.active) {
      for (const entity of this.entityManager.entities) {
        renderables.push({
          kind: 'entity',
          entity,
          screenY: entity.sortY, // use sortY for depth ordering, not visual screenY
        });
      }
    }

    // Sort by screen Y position (lower Y renders first = further from camera)
    renderables.sort((a, b) => a.screenY - b.screenY);

    // Render in sorted order
    for (const item of renderables) {
      if (item.kind === 'building') {
        am.drawSprite(ctx, item.building.currentSpriteId, item.renderPos.x, item.renderPos.y);
      } else {
        item.entity.render(ctx, am);
      }
    }

    // Layer 3: Missile & explosions (above everything)
    this.missileSystem.render(ctx, am);

    // Layer 4: Crosshair (topmost)
    this.inputHandler.render(ctx, am);

    // Layer 5: Placement tool overlay (debug)
    this.placementTool.render(ctx);

    // Layer 6: Mute/unmute icon (bottom-left corner)
    this._renderMuteIcon(ctx);

    // Layer 7: Tile debug overlay (T key toggle)
    if (this.showTileDebug) {
      this._renderTileDebug(ctx, worldMap);
    }
  }

  _renderMuteIcon(ctx) {
    const isMuted = this.soundManager && this.soundManager.muted;
    const x = 12;
    const y = SCREEN_H - 18;

    ctx.save();
    ctx.globalAlpha = 0.6;

    // Speaker body
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;

    // Speaker cone
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.lineTo(x + 4, y + 3);
    ctx.lineTo(x + 8, y + 6);
    ctx.lineTo(x + 8, y - 6);
    ctx.lineTo(x + 4, y - 3);
    ctx.closePath();
    ctx.fill();

    if (isMuted) {
      // Draw X
      ctx.strokeStyle = '#f44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 11, y - 4);
      ctx.lineTo(x + 17, y + 4);
      ctx.moveTo(x + 17, y - 4);
      ctx.lineTo(x + 11, y + 4);
      ctx.stroke();
    } else {
      // Draw sound waves
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x + 9, y, 3, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 9, y, 6, -0.6, 0.6);
      ctx.stroke();
    }

    ctx.restore();
  }

  _renderFullscreenIcon(ctx) {
    const isFS = !!document.fullscreenElement;
    const x = SCREEN_W - 30;
    const y = 30;
    const s = 7; // icon size

    ctx.save();

    // Hover effect
    const mx = this.inputHandler.mouseX;
    const my = this.inputHandler.mouseY;
    if (mx >= x - 20 && mx <= x + 20 && my >= y - 20 && my <= y + 20) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'miter';
    ctx.beginPath();

    if (!isFS) {
      // Expand icon: Corners pointing outward
      ctx.moveTo(x - s, y - 3); ctx.lineTo(x - s, y - s); ctx.lineTo(x - 3, y - s);
      ctx.moveTo(x + 3, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y - 3);
      ctx.moveTo(x - s, y + 3); ctx.lineTo(x - s, y + s); ctx.lineTo(x - 3, y + s);
      ctx.moveTo(x + 3, y + s); ctx.lineTo(x + s, y + s); ctx.lineTo(x + s, y + 3);
    } else {
      // Shrink icon: Corners pointing inward
      ctx.moveTo(x - s, y - 3); ctx.lineTo(x - 3, y - 3); ctx.lineTo(x - 3, y - s);
      ctx.moveTo(x + s, y - 3); ctx.lineTo(x + 3, y - 3); ctx.lineTo(x + 3, y - s);
      ctx.moveTo(x - s, y + 3); ctx.lineTo(x - 3, y + 3); ctx.lineTo(x - 3, y + s);
      ctx.moveTo(x + s, y + 3); ctx.lineTo(x + 3, y + 3); ctx.lineTo(x + 3, y + s);
    }

    ctx.stroke();
    ctx.restore();
  }

  // ——— Tile debug overlay ———

  _renderTileDebug(ctx, worldMap) {
    ctx.save();
    ctx.globalAlpha = 0.35;

    // Only render tiles whose screen position is visible
    for (let ty = 0; ty < 120; ty++) {
      for (let tx = 0; tx < 120; tx++) {
        const pos = worldMap.tileToScreen(tx, ty);
        const sx = pos.x + 10; // center of tile diamond
        const sy = pos.y + 5;

        // Cull tiles outside screen
        if (sx < -20 || sx > SCREEN_W + 20 || sy < -10 || sy > SCREEN_H + 10) continue;

        const empty = worldMap.posEmpty(tx, ty);
        ctx.fillStyle = empty ? '#006600' : '#880000';

        // Draw isometric diamond
        ctx.beginPath();
        ctx.moveTo(sx, sy - 5);      // top
        ctx.lineTo(sx + 10, sy);     // right
        ctx.lineTo(sx, sy + 5);      // bottom
        ctx.lineTo(sx - 10, sy);     // left
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw cursor (highly visible crosshair + diamond)
    ctx.globalAlpha = 1.0;
    const cursorPos = worldMap.tileToScreen(this.tileEditorX, this.tileEditorY);
    const cx = cursorPos.x + 10;
    const cy = cursorPos.y + 5;

    // Optional crosshair extending outward
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20);
    ctx.moveTo(cx - 40, cy); ctx.lineTo(cx + 40, cy);
    ctx.stroke();

    // Draw cursor diamond path
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 11, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 11, cy);
    ctx.closePath();

    // Thick black outer outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Bright white inner outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw coordinate HUD
    ctx.globalAlpha = 0.85;
    const isEmpty = worldMap.posEmpty(this.tileEditorX, this.tileEditorY);
    const statusText = isEmpty ? 'WALKABLE' : 'BLOCKED';
    const hudText = `Tile (${this.tileEditorX}, ${this.tileEditorY}) ${statusText}  |  Overrides: ${worldMap.gridOverrides.size}  |  ←↑→↓ Move  R Flip  Ctrl+S Save  Esc Save+Close`;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, SCREEN_H - 18, SCREEN_W, 18);
    ctx.fillStyle = isEmpty ? '#44ff44' : '#ff4444';
    ctx.font = '11px monospace';
    ctx.fillText(hudText, 6, SCREEN_H - 5);

    ctx.restore();
  }

  // ——— Cleanup ———

  destroy() {
    this.inputHandler.detach();
    this.placementTool.detach();
    this.soundManager.stopAmbient();
  }
}
