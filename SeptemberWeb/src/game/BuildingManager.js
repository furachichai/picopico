/**
 * BuildingManager.js — Manages all buildings: placement, damage, destruction, reconstruction
 * Source: 2_8.ls (Building Class Parent)
 *
 * Building types from the original:
 * - 6 houses (casa01-06): small, 3 destruction stages, 25 HP, regentype 2
 * - 6 tall buildings (edificio01-06): tall, 4 destruction stages, 100 HP, regentype 1
 * - 2 fountains (fuente01-02): small, 3 stages, 25 HP, regentype 0
 * - 12 palms (palmera01-12): tall but w=1,h=1, 3 stages, 3 HP, regentype 0
 * - 8 market stalls (puesto01-08): small, 3 stages, 25 HP, regentype 3
 */

import {
    DESTRUCTION,
    BLAST_X, BLAST_Y, BLAST_DAMAGE, BLAST_DECREMENT,
    BUILDING_HEALTH_RECOVERY, BUILDING_HEALTH_RECOVERY_TIME, FPS,
} from './constants.js';
import { MAP_PLACEMENTS } from './mapData.js';

// ——— Building type definitions ———
// Each entry mirrors the original pBuildingArray from 2_8.ls
// Sprite IDs use the original Director cast numbering: 3_NNN
// For each building: intact (media), then damage stages (media1, media2, ...).
// Houses: intact, damaged, destroyed, (reconstructing variant for regentype 2)
// Edificios: intact, d1, d2, d3, then 5 reconstruction stages (r1..r5)

const BUILDING_TYPES = [
    // ——— Houses (casa) ———
    {
        name: 'casa01', tall: false, regentype: 2, destruction: DESTRUCTION.THREE, w: 9, h: 5, maxHealth: 25,
        media: ['3_206', '3_240', '3_241', '3_344']
    },
    {
        name: 'casa02', tall: false, regentype: 2, destruction: DESTRUCTION.THREE, w: 7, h: 4, maxHealth: 25,
        media: ['3_207', '3_242', '3_243', '3_345']
    },
    {
        name: 'casa03', tall: false, regentype: 2, destruction: DESTRUCTION.THREE, w: 4, h: 5, maxHealth: 25,
        media: ['3_208', '3_244', '3_245', '3_346']
    },
    {
        name: 'casa04', tall: true, regentype: 2, destruction: DESTRUCTION.THREE, w: 5, h: 6, maxHealth: 50,
        media: ['3_209', '3_246', '3_247', '3_347']
    },
    {
        name: 'casa05', tall: false, regentype: 2, destruction: DESTRUCTION.THREE, w: 5, h: 8, maxHealth: 25,
        media: ['3_210', '3_248', '3_249', '3_348']
    },
    {
        name: 'casa06', tall: false, regentype: 2, destruction: DESTRUCTION.THREE, w: 7, h: 8, maxHealth: 25,
        media: ['3_211', '3_250', '3_251', '3_349']
    },

    // ——— Tall buildings (edificio) ———
    {
        name: 'edificio01', tall: true, regentype: 1, destruction: DESTRUCTION.FOUR, w: 4, h: 7, maxHealth: 100,
        media: ['3_212', '3_252', '3_253', '3_254', '3_314', '3_315', '3_316', '3_317', '3_318']
    },
    {
        name: 'edificio02', tall: true, regentype: 1, destruction: DESTRUCTION.FOUR, w: 5, h: 5, maxHealth: 100,
        media: ['3_213', '3_255', '3_256', '3_257', '3_319', '3_320', '3_321', '3_322', '3_323']
    },
    {
        name: 'edificio03', tall: true, regentype: 1, destruction: DESTRUCTION.FOUR, w: 7, h: 6, maxHealth: 100,
        media: ['3_214', '3_258', '3_259', '3_260', '3_324', '3_325', '3_326', '3_327', '3_328']
    },
    {
        name: 'edificio04', tall: true, regentype: 1, destruction: DESTRUCTION.FOUR, w: 6, h: 7, maxHealth: 100,
        media: ['3_215', '3_261', '3_262', '3_263', '3_329', '3_330', '3_331', '3_332', '3_333']
    },
    {
        name: 'edificio05', tall: true, regentype: 1, destruction: DESTRUCTION.FOUR, w: 8, h: 6, maxHealth: 100,
        media: ['3_216', '3_264', '3_265', '3_266', '3_334', '3_335', '3_336', '3_337', '3_338']
    },
    {
        name: 'edificio06', tall: true, regentype: 1, destruction: DESTRUCTION.FOUR, w: 7, h: 7, maxHealth: 100,
        media: ['3_217', '3_267', '3_268', '3_269', '3_339', '3_340', '3_341', '3_342', '3_343']
    },

    // ——— Fountains (fuente) ———
    {
        name: 'fuente01', tall: false, regentype: 0, destruction: DESTRUCTION.THREE, w: 5, h: 5, maxHealth: 25,
        media: ['3_218', '3_310', '3_311']
    },
    {
        name: 'fuente02', tall: false, regentype: 0, destruction: DESTRUCTION.THREE, w: 5, h: 5, maxHealth: 25,
        media: ['3_219', '3_312', '3_313']
    },

    // ——— Palms (palmera) ———
    {
        name: 'palmera01', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_220', '3_270', '3_271']
    },
    {
        name: 'palmera02', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_221', '3_272', '3_273']
    },
    {
        name: 'palmera03', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_222', '3_274', '3_275']
    },
    {
        name: 'palmera04', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_223', '3_276', '3_277']
    },
    {
        name: 'palmera05', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_224', '3_278', '3_279']
    },
    {
        name: 'palmera06', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_225', '3_280', '3_281']
    },
    {
        name: 'palmera07', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_226', '3_282', '3_283']
    },
    {
        name: 'palmera08', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_227', '3_284', '3_285']
    },
    {
        name: 'palmera09', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_228', '3_286', '3_287']
    },
    {
        name: 'palmera10', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_229', '3_288', '3_289']
    },
    {
        name: 'palmera11', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_230', '3_290', '3_291']
    },
    {
        name: 'palmera12', tall: true, regentype: 0, destruction: DESTRUCTION.THREE, w: 1, h: 1, maxHealth: 3,
        media: ['3_231', '3_292', '3_293']
    },

    // ——— Market stalls (puesto) ———
    {
        name: 'puesto01', tall: false, regentype: 3, destruction: DESTRUCTION.THREE, w: 3, h: 3, maxHealth: 25,
        media: ['3_232', '3_294', '3_295']
    },
    {
        name: 'puesto02', tall: false, regentype: 3, destruction: DESTRUCTION.THREE, w: 3, h: 4, maxHealth: 25,
        media: ['3_233', '3_296', '3_297']
    },
    {
        name: 'puesto03', tall: false, regentype: 3, destruction: DESTRUCTION.THREE, w: 3, h: 6, maxHealth: 25,
        media: ['3_234', '3_298', '3_299']
    },
    {
        name: 'puesto04', tall: false, regentype: 3, destruction: DESTRUCTION.THREE, w: 3, h: 4, maxHealth: 25,
        media: ['3_235', '3_300', '3_301']
    },
    {
        name: 'puesto05', tall: false, regentype: 3, destruction: DESTRUCTION.THREE, w: 6, h: 6, maxHealth: 25,
        media: ['3_236', '3_302', '3_303']
    },
    {
        name: 'puesto06', tall: false, regentype: 3, destruction: DESTRUCTION.THREE, w: 5, h: 3, maxHealth: 25,
        media: ['3_237', '3_304', '3_305']
    },
    {
        name: 'puesto07', tall: false, regentype: 3, destruction: DESTRUCTION.THREE, w: 4, h: 4, maxHealth: 25,
        media: ['3_238', '3_306', '3_307']
    },
    {
        name: 'puesto08', tall: false, regentype: 3, destruction: DESTRUCTION.THREE, w: 6, h: 4, maxHealth: 25,
        media: ['3_239', '3_308', '3_309']
    },
];

export { BUILDING_TYPES };

export class BuildingManager {
    constructor(engine) {
        this.engine = engine;
        this.buildings = [];      // active building instances
        this.destroyed = [];      // buildings pending reconstruction
        this.recoveryTimer = 0;   // countdown for health recovery ticks

        // Pre-compute blast damage grid
        this.blastGrid = this._createBlastGrid();
    }

    // ——— Blast damage grid (from 2_11.ls mCreateBlastArray) ———

    _createBlastGrid() {
        const w = BLAST_X * 2 + 1;
        const h = BLAST_Y * 2 + 1;
        const grid = new Array(w * h).fill(0);

        let xStart = 0, xEnd = w - 1;
        let yStart = 0, yEnd = h - 1;
        let val = BLAST_DAMAGE - BLAST_X * BLAST_DECREMENT;
        if (val < 1) val = 1;

        for (let ring = 0; ring <= BLAST_X; ring++) {
            for (let y = yStart; y <= yEnd; y++) {
                for (let x = xStart; x <= xEnd; x++) {
                    grid[x + y * w] = val;
                }
            }
            xStart++; yStart++;
            xEnd--; yEnd--;
            val += BLAST_DECREMENT;
            if (val < 1) val = 1;
        }

        return { grid, w };
    }

    getBlastDamage(localX, localY) {
        const idx = localX + localY * this.blastGrid.w;
        if (idx < 0 || idx >= this.blastGrid.grid.length) return 0;
        return this.blastGrid.grid[idx];
    }

    // ——— Building placement ———
    // In the original, buildings are pre-placed in the Director score.
    // We need to place them procedurally based on the original map layout.
    // For now, we'll place a representative set of buildings.

    init() {
        this.buildings = [];
        this.destroyed = [];
        this.recoveryTimer = BUILDING_HEALTH_RECOVERY_TIME;

        // Place buildings. In the original, positions come from the Director stage.
        // We approximate by distributing buildings across the map.
        this._placeBuildings();
    }

    _placeBuildings() {
        const worldMap = this.engine.worldMap;

        // Try loading from localStorage first (editor persistence)
        let placements = MAP_PLACEMENTS;
        try {
            const saved = localStorage.getItem('picopico_map');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    placements = parsed;
                    console.log(`[BuildingManager] Loaded ${parsed.length} buildings from localStorage`);
                }
            }
        } catch (e) {
            console.warn('[BuildingManager] Failed to load from localStorage:', e);
        }

        for (const p of placements) {
            if (p.type < BUILDING_TYPES.length) {
                this._createBuilding(p.type, p.x, p.y);
            }
        }

        // Calculate depths after all buildings are placed
        worldMap.calculateDepths();
    }

    _createBuilding(typeIndex, tileX, tileY) {
        const type = BUILDING_TYPES[typeIndex];
        const worldMap = this.engine.worldMap;

        const building = {
            type,
            typeIndex,
            tileX,
            tileY,
            health: type.maxHealth,
            destroyed: false,
            currentSpriteId: type.media[0], // intact sprite
        };

        // Register tiles occupied by this building on the grid
        for (let x = tileX - type.w + 1; x <= tileX; x++) {
            for (let y = tileY - type.h + 1; y <= tileY; y++) {
                worldMap.setTileBuilding(building, x, y);
            }
        }

        this.buildings.push(building);
    }

    // ——— Damage ———

    decrementHealth(building, damage) {
        building.health -= damage;
        const type = building.type;

        if (building.health <= 0) {
            building.health = -50; // prevent re-destruction
            if (type.destruction === DESTRUCTION.THREE) {
                building.currentSpriteId = type.media[2]; // fully destroyed
            } else {
                building.currentSpriteId = type.media[3]; // fully destroyed
            }
            if (type.regentype > 0 && !building.destroyed) {
                this.destroyed.push(building);
                building.destroyed = true;
            }
        } else {
            // Intermediate damage sprite
            if (type.destruction === DESTRUCTION.THREE) {
                if (building.currentSpriteId !== type.media[1]) {
                    building.currentSpriteId = type.media[1]; // damaged
                }
            } else {
                // 4-stage destruction
                if (building.health < type.maxHealth / 2) {
                    building.currentSpriteId = type.media[2]; // heavy damage
                } else {
                    building.currentSpriteId = type.media[1]; // light damage
                }
            }
        }
    }

    // ——— Explosion (from 2_8.ls mExplode) ———

    explode(centerX, centerY) {
        const worldMap = this.engine.worldMap;
        const xStart = centerX - BLAST_X;
        const yStart = centerY - BLAST_Y;
        const xEnd = centerX + BLAST_X;
        const yEnd = centerY + BLAST_Y;

        for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
                const building = worldMap.getTileBuilding(x, y);
                if (building) {
                    const damage = this.getBlastDamage(x - xStart, y - yStart);
                    this.decrementHealth(building, damage);
                }
            }
        }
    }

    explodeTall(centerX, centerY) {
        const worldMap = this.engine.worldMap;
        const xStart = centerX - BLAST_X;
        const yStart = centerY - BLAST_Y;
        const xEnd = centerX + BLAST_X;
        const yEnd = centerY + BLAST_Y;

        for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
                const building = worldMap.getTileBuilding(x, y);
                if (building && building.type.tall) {
                    const damage = this.getBlastDamage(x - xStart, y - yStart);
                    this.decrementHealth(building, damage);
                }
            }
        }
    }

    // ——— Reconstruction (from 2_8.ls mUpdate) ———

    update(dt) {
        this.recoveryTimer -= dt;
        if (this.recoveryTimer <= 0) {
            this.recoveryTimer = BUILDING_HEALTH_RECOVERY_TIME;

            for (let i = this.destroyed.length - 1; i >= 0; i--) {
                const building = this.destroyed[i];
                building.health += BUILDING_HEALTH_RECOVERY;

                if (building.health >= building.type.maxHealth) {
                    // Fully reconstructed
                    building.health = building.type.maxHealth;
                    building.destroyed = false;
                    building.currentSpriteId = building.type.media[0]; // intact
                    this.destroyed.splice(i, 1);
                } else {
                    // Update reconstruction sprite
                    this._setReconstructionMedia(building);
                }
            }
        }
    }

    _setReconstructionMedia(building) {
        const type = building.type;
        const ratio = building.health / type.maxHealth;

        if (type.regentype === 2) {
            // Houses: show reconstruction variant (media[3]) when health > 15%
            if (ratio > 0.15 && type.media.length > 3) {
                building.currentSpriteId = type.media[3];
            }
        } else if (type.regentype === 1) {
            // Tall buildings: 5 reconstruction stages (media[4] through media[8])
            if (ratio > 0.15) {
                if (ratio < 0.25 && type.media.length > 4) {
                    building.currentSpriteId = type.media[4];
                } else if (ratio < 0.45 && type.media.length > 5) {
                    building.currentSpriteId = type.media[5];
                } else if (ratio < 0.60 && type.media.length > 6) {
                    building.currentSpriteId = type.media[6];
                } else if (ratio < 0.75 && type.media.length > 7) {
                    building.currentSpriteId = type.media[7];
                } else if (ratio < 0.90 && type.media.length > 8) {
                    building.currentSpriteId = type.media[8];
                }
            }
        }
        // regentype 0 and 3: no reconstruction (fountains, palms, markets just heal but sprite stays)
    }

    // ——— Hit test (from 2_8.ls mHit) ———
    // Tests if a screen point hits a building

    hitTest(screenX, screenY, assetManager) {
        // Check buildings from front to back (sorted by depth, reverse)
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const building = this.buildings[i];
            const worldMap = this.engine.worldMap;
            const pos = worldMap.tileToSpritePos(building.tileX, building.tileY);

            const img = assetManager.getImage(building.currentSpriteId);
            const data = assetManager.getData(building.currentSpriteId);
            if (!img || !data) continue;

            const drawX = pos.x - data.regX;
            const drawY = pos.y - data.regY;
            const right = drawX + img.width;
            const bottom = drawY + img.height;

            if (screenX >= drawX && screenX < right && screenY >= drawY && screenY < bottom) {
                // Hit! Determine if it's the top or bottom half (for tall buildings)
                const relY = screenY - drawY;
                let hitBottom = true;
                if (building.type.tall && building.health >= building.type.maxHealth / 2 && relY < img.height / 2) {
                    hitBottom = false;
                }

                return { hit: true, hitBottom, building };
            }
        }

        return { hit: false, hitBottom: true, building: null };
    }

    // ——— Rendering ———

    render(ctx, assetManager) {
        // Sort buildings by depth for proper rendering order
        const worldMap = this.engine.worldMap;
        const sorted = [...this.buildings].sort((a, b) => {
            const depthA = worldMap.getTileDepth(a.tileX, a.tileY);
            const depthB = worldMap.getTileDepth(b.tileX, b.tileY);
            return depthA - depthB;
        });

        for (const building of sorted) {
            const pos = worldMap.tileToSpritePos(building.tileX, building.tileY);
            assetManager.drawSprite(ctx, building.currentSpriteId, pos.x, pos.y);
        }
    }
}
