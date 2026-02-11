/**
 * GameEngine.js — Central orchestrator
 * Source: 2_1.ls (PlayGame, BeginGame, ScrollScreen)
 *
 * Manages all subsystems, the main game loop, game states,
 * and rendering pipeline (ground → buildings → entities → missiles → UI).
 */

import { AssetManager } from './AssetManager.js';
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

    // Game state
    this.state = GAME_STATE.LOADING;
    this.ready = false;

    // Frame timing
    this.lastFrameTime = 0;
    this.frameDuration = 1000 / FPS; // target 16 FPS like original
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

    // Layer 1: Ground (pre-rendered bitmap)
    this.worldMap.render(ctx, am);

    // Layer 2: Buildings
    this.buildingManager.render(ctx, am);

    // Layer 3: Missile craters (below entities)
    // (Rendered as part of missile system)

    // Layer 4: Entities (sorted by depth)
    this.entityManager.render(ctx, am);

    // Layer 5: Missile & explosions (above entities)
    this.missileSystem.render(ctx, am);

    // Layer 6: Crosshair (topmost)
    this.inputHandler.render(ctx, am);
  }

  // ——— Cleanup ———

  destroy() {
    this.inputHandler.detach();
    this.soundManager.stopAmbient();
  }
}
