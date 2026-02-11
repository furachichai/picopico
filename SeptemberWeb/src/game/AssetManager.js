/**
 * AssetManager.js — Loads and manages game images and provides drawing helpers
 * Source: Generated from Member CSVs via scripts/generateAssetData.js
 *
 * All sprite images have white backgrounds that need to be made transparent.
 * Registration points (regX, regY) define the anchor/origin for each sprite,
 * matching the original Director member registration.
 */

import { ASSETS } from './assetData.js';

export class AssetManager {
    constructor() {
        this.images = {};     // loaded Image objects, keyed by asset ID
        this.data = {};       // asset metadata (regX, regY, name), keyed by asset ID
        this.processed = {};  // processed (transparent) canvases, keyed by asset ID
        this.loaded = false;
        this.progress = 0;
        this.total = 0;
    }

    async loadAll() {
        const entries = Object.entries(ASSETS);
        this.total = entries.length;
        this.progress = 0;

        // Load in batches to avoid overwhelming the browser
        const batchSize = 20;
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            await Promise.all(batch.map(([id, asset]) => this._loadOne(id, asset)));
        }

        this.loaded = true;
    }

    async _loadOne(id, asset) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.images[id] = img;
                this.data[id] = {
                    regX: asset.regX,
                    regY: asset.regY,
                    name: asset.name,
                    width: img.width,
                    height: img.height,
                };

                // Process transparency (remove white background)
                this._processTransparency(id, img);

                this.progress++;
                resolve();
            };
            img.onerror = () => {
                // Asset not found, skip
                this.progress++;
                resolve();
            };
            img.src = asset.src;
        });
    }

    _processTransparency(id, img) {
        // Skip the map bitmap — it doesn't need transparency
        if (id === '3_2') return;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Make white pixels transparent
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // White threshold
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0; // fully transparent
                }
                // Near-white (anti-aliased edges)
                else if (r > 220 && g > 220 && b > 220) {
                    data[i + 3] = Math.floor(255 * (1 - (r + g + b - 660) / (765 - 660)));
                }
            }

            ctx.putImageData(imageData, 0, 0);
            this.processed[id] = canvas;
        } catch (e) {
            // Canvas security error (cross-origin), just use original
        }
    }

    // ——— Getters ———

    getImage(id) {
        return this.processed[id] || this.images[id] || null;
    }

    getData(id) {
        return this.data[id] || null;
    }

    // ——— Drawing helper ———
    // Draws a sprite centered on its registration point at (x, y)

    drawSprite(ctx, id, x, y) {
        const img = this.getImage(id);
        const data = this.getData(id);
        if (!img || !data) return;

        ctx.drawImage(img, x - data.regX, y - data.regY);
    }
}
