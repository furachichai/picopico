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

    // Show loading state
    this.state = GAME_STATE.LOADING;
    this._renderLoading();

    // Load assets
    await this.assetManager.loadAll();

    // Load sounds (non-blocking, failures are OK)
    await this.soundManager.init().catch(e => console.warn('Sound init failed:', e));

    // Attach input
    this.inputHandler.attach(canvas);
    this.placementTool.attach(canvas);

    // Show title screen
    this.state = GAME_STATE.TITLE;
    this.ready = true;
  }

  startGame() {
    if (this.state !== GAME_STATE.TITLE) return;
    this.state = GAME_STATE.PLAYING;

    // Initialize world
    this.buildingManager.init();
    this.entityManager.init();

    // Resume audio context (required after user gesture)
    this.soundManager.resume();
    this.soundManager.playAmbient();
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
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', SCREEN_W / 2, SCREEN_H / 2);
  }

  _renderTitle() {
    const ctx = this.ctx;
    const am = this.assetManager;

    // White background (matching original game)
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Draw original title card (game logo + hand-drawn character)
    const titleImg = am.getImage('titlecard');
    const instrImg = am.getImage('titlecard2');

    if (titleImg && instrImg) {
      // Draw the title card (logo side) — positioned at left/top area
      // The original titlecard.png is ~550x400 and positioned at top-left
      ctx.drawImage(titleImg, 0, 0);

      // Draw the instructions panel (orange box) next to/below the title
      // The original titlecard2.png is ~450x420, shown to the right
      const instrX = titleImg.width * 0.42;
      const instrY = titleImg.height * 0.55;
      ctx.drawImage(instrImg, instrX, instrY);

      // "Click anywhere to start" prompt
      ctx.fillStyle = '#666';
      ctx.font = '13px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Click anywhere to start.', SCREEN_W / 2, SCREEN_H - 15);
    } else {
      // Fallback title screen (no original assets loaded)
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

      ctx.fillStyle = '#e0d4c0';
      ctx.font = 'bold 36px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('SEPTEMBER 12th', SCREEN_W / 2, 120);

      ctx.font = '16px Georgia, serif';
      ctx.fillStyle = '#b8a88a';
      ctx.fillText('A Toy World', SCREEN_W / 2, 150);

      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#d4c4a8';
      const lines = [
        'This is not a game.',
        'You can\'t win and you can\'t lose.',
        'This is a simulation.',
        'It has no ending. It has already begun.',
        '',
        'The rules are deadly simple.',
        'You can shoot. Or not.',
        '',
        'Click anywhere to start.',
      ];
      let y = 200;
      for (const line of lines) {
        ctx.fillText(line, SCREEN_W / 2, y);
        y += 22;
      }
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
          screenY: entity.screenY,
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

    ctx.restore();
  }

  // ——— Cleanup ———

  destroy() {
    this.inputHandler.detach();
    this.placementTool.detach();
    this.soundManager.stopAmbient();
  }
}
