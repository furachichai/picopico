/**
 * WorldMap.js — Isometric world using the original pre-rendered bitmap
 * Manages the 120×120 logical tile grid for pathfinding/collision
 * and the bitmap ground layer rendering.
 * Source: 2_4.ls (Map Class Parent)
 */

import {
    MAP_WIDTH, MAP_HEIGHT, ISO_TILE_W, ISO_TILE_H,
    ISO_START_X, ISO_START_Y, TILE_W, TILE_H,
    MAP_PIXEL_W, SCREEN_W, SCREEN_H,
} from './constants.js';

export class WorldMap {
    constructor(engine) {
        this.engine = engine;

        // 120×120 logical grid: each cell stores { depth, building }
        this.grid = [];
        this._createEmptyGrid();

        // Camera / scroll offset (horizontal only, like original)
        this.scrollX = 0;

        // Map sprite position (the bitmap's locH)
        // In the original, the map sprite regPoint is (640, 240) and it's placed at (320, 240)
        // This means the map image's left edge starts at 320-640 = -320
        this.mapLeft = 0;  // will be calculated on init
    }

    _createEmptyGrid() {
        this.grid = new Array(MAP_WIDTH * MAP_HEIGHT);
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = { depth: -1, building: null };
        }
    }

    _getIndex(x, y) {
        return x + y * MAP_WIDTH;
    }

    // ——— Tile accessors ———

    getTileBuilding(x, y) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return null;
        return this.grid[this._getIndex(x, y)].building;
    }

    setTileBuilding(building, x, y) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
        this.grid[this._getIndex(x, y)].building = building;
    }

    getTileDepth(x, y) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return 0;
        return this.grid[this._getIndex(x, y)].depth;
    }

    setTileDepth(val, x, y) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
        this.grid[this._getIndex(x, y)].depth = val;
    }

    posEmpty(x, y) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
        return this.getTileBuilding(x, y) === null;
    }

    posNotEmpty(x, y) {
        return !this.posEmpty(x, y);
    }

    // ——— Isometric conversion ———
    // Original uses an isometric projection class. We replicate the math.
    // MapToScreen: converts 3D iso coords (isoX, isoY, isoZ) to 2D screen coords
    // In the original: isoX = tileX * ISO_TILE_W, isoZ = -tileY * ISO_TILE_H

    mapToScreen(isoX, isoY, isoZ) {
        // Standard isometric 2:1 projection
        // The original game's Isometric Class uses a specific matrix.
        // From observation: screenX = isoStartX + isoX - isoZ
        //                   screenY = isoStartY + (isoX + isoZ) / 2 - isoY
        // But let's derive from the standard Director isometric transform:
        const screenX = ISO_START_X + isoX + isoZ;
        const screenY = ISO_START_Y + (isoX - isoZ) / 2 - isoY;
        return { x: screenX + this.scrollX, y: screenY };
    }

    // ScreenToIso (for converting mouse clicks to tile coords)
    // Inverse of mapToScreen
    screenToTile(screenX, screenY) {
        const sx = screenX - this.scrollX - ISO_START_X;
        const sy = screenY - ISO_START_Y;
        // Inverse of mapToScreen (with isoY=0):
        //   sx = isoX + isoZ  →  isoX = (sx + 2*sy) / 2 = sx/2 + sy
        //   sy = (isoX - isoZ) / 2  →  isoZ = (sx - 2*sy) / 2 = sx/2 - sy
        const isoX = sx / 2 + sy;
        const isoZ = sx / 2 - sy;
        const tileX = Math.floor(isoX / ISO_TILE_W);
        const tileY = Math.floor(-isoZ / ISO_TILE_H);
        return { tileX, tileY };
    }

    // Get screen position for a tile
    tileToScreen(tileX, tileY) {
        const isoX = tileX * ISO_TILE_W;
        const isoZ = -tileY * ISO_TILE_H;
        return this.mapToScreen(isoX, 0, isoZ);
    }

    // Position a "film loop" sprite on screen (original PutFilmLoopOnScreen)
    tileToSpritePos(tileX, tileY) {
        const pos = this.tileToScreen(tileX, tileY);
        return {
            x: pos.x + (TILE_W / 2) + 1,
            y: pos.y + TILE_H,
        };
    }

    // Position for dead bodies (original PutDeadOnScreen)
    tileToDeadPos(tileX, tileY) {
        const pos = this.tileToScreen(tileX, tileY);
        return {
            x: pos.x + (TILE_W / 2) + 1,
            y: pos.y + (TILE_H / 2),
        };
    }

    // ——— Visibility checks ———

    tileOnScreen(tileX, tileY) {
        const pos = this.tileToScreen(tileX, tileY);
        return !(pos.x < -20 || pos.x >= SCREEN_W || pos.y < -10 || pos.y >= SCREEN_H);
    }

    tileOnMap(tileX, tileY) {
        const pos = this.tileToScreen(tileX, tileY);
        const mapRight = this.mapLeft + MAP_PIXEL_W;
        const mapBottom = SCREEN_H; // map fills vertical space
        return pos.x > this.mapLeft && pos.x < mapRight &&
            pos.y > 0 && pos.y < mapBottom;
    }

    // ——— Random tile finders ———

    randTileOnMap() {
        for (let attempts = 0; attempts < 500; attempts++) {
            const x = Math.floor(Math.random() * MAP_WIDTH);
            const y = Math.floor(Math.random() * MAP_HEIGHT);
            if (this.tileOnMap(x, y) && this.posEmpty(x, y)) {
                return { tileX: x, tileY: y };
            }
        }
        return { tileX: 60, tileY: 60 }; // fallback center
    }

    randTileOnScreen() {
        for (let attempts = 0; attempts < 500; attempts++) {
            const x = Math.floor(Math.random() * MAP_WIDTH);
            const y = Math.floor(Math.random() * MAP_HEIGHT);
            if (this.tileOnScreen(x, y) && this.posEmpty(x, y)) {
                return { tileX: x, tileY: y };
            }
        }
        return this.randTileOnMap();
    }

    randTileOffScreen() {
        for (let attempts = 0; attempts < 500; attempts++) {
            const x = Math.floor(Math.random() * MAP_WIDTH);
            const y = Math.floor(Math.random() * MAP_HEIGHT);
            if (this.tileOnMap(x, y) && !this.tileOnScreen(x, y) && this.posEmpty(x, y)) {
                return { tileX: x, tileY: y };
            }
        }
        return this.randTileOnMap();
    }

    randTileAnywhere() {
        for (let attempts = 0; attempts < 500; attempts++) {
            const x = Math.floor(Math.random() * MAP_WIDTH);
            const y = Math.floor(Math.random() * MAP_HEIGHT);
            if (this.tileOnMap(x, y) && this.posEmpty(x, y)) {
                return { tileX: x, tileY: y };
            }
        }
        return { tileX: 60, tileY: 60 };
    }

    // ——— Depth calculation ———
    // From 2_4.ls mSetDepth — complex depth-sorting algorithm
    // Simplified: assign depth based on tile row + column for proper painter's order

    calculateDepths() {
        let depthCounter = 0;

        // Simple row-by-row depth assignment
        // The original has a fancy wall-detection algorithm, but for rendering
        // purposes a simple (tileX + tileY) based depth works for isometric
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const idx = this._getIndex(x, y);
                if (this.grid[idx].building !== null) {
                    // Buildings get depth from their position
                    this.grid[idx].depth = depthCounter;
                } else {
                    this.grid[idx].depth = depthCounter;
                }
                depthCounter++;
            }
        }
    }

    // ——— Scrolling ———

    scroll(amount) {
        this.scrollX += amount;
        // Clamp so map doesn't go past edges
        const maxScroll = (MAP_PIXEL_W - SCREEN_W) / 2;
        this.scrollX = Math.max(-maxScroll, Math.min(maxScroll, this.scrollX));
    }

    // ——— Rendering ———

    render(ctx, assetManager) {
        // Draw the pre-rendered map bitmap as the ground layer
        const mapImg = assetManager.getImage('3_2');
        if (mapImg) {
            const data = assetManager.getData('3_2');
            // The map's regPoint is (640, 240), meaning the anchor is at center-right
            // Original: sprite placed at (SCREENX/2, SCREENY/2) = (320, 240)
            // So draw at: 320 - 640 = -320 for x, 240 - 240 = 0 for y
            const drawX = (SCREEN_W / 2) - data.regX + this.scrollX;
            const drawY = (SCREEN_H / 2) - data.regY;
            ctx.drawImage(mapImg, drawX, drawY);
            this.mapLeft = drawX;
        }
    }
}
