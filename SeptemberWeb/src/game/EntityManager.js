/**
 * EntityManager.js — Manages all game characters: spawning, killing, mourning, conversion, undo-evil
 * Source: 2_5.ls (People Class Parent)
 *
 * Core game loop for entities:
 * 1. Start with 100 people (mix of civilians, dogs, min 10 terrorists)
 * 2. People walk around, avoid buildings
 * 3. On explosion: kill people in blast radius
 * 4. Nearby civilians mourn dead → convert to terrorists after mourning
 * 5. If idle for 90s, passively convert some terrorists back to civilians
 * 6. Dead bodies fade and get removed; new people spawn to maintain ~100
 */

import { Civilian } from './entities/Civilian.js';
import { Dog } from './entities/Dog.js';
import { Terrorist } from './entities/Terrorist.js';
import {
    MAX_PEOPLE, START_PEOPLE, EVIL_MIN, EVIL_PER_DEATH,
    EVIL_REGENERATION, MOURN_DISTANCE, DISTANCE_FROM_DEAD,
    WAIT_UNDO_EVIL, UNDO_EVIL_PEOPLE, GENERATION_RATIO,
    RAND_GENERATION_RATIO, PROB_WOMAN, PROB_KID, PROB_DOG,
    PERSON_TYPE, STATE, SPAWN_MODE, FPS,
} from './constants.js';

export class EntityManager {
    constructor(engine) {
        this.engine = engine;
        this.entities = [];           // all active entities
        this.deadEntities = [];       // dead bodies waiting to fade
        this.spawnTimer = 0;          // countdown to next spawn

        // Undo evil tracker
        this.undoEvilTimer = WAIT_UNDO_EVIL * FPS;
        this.undoEvilCounter = 0;     // increases each cycle, converting more each time

        // Statistics
        this.civilianCount = 0;
        this.terroristCount = 0;
        this.totalKilled = 0;
    }

    init() {
        this.entities = [];
        this.deadEntities = [];
        this.spawnTimer = GENERATION_RATIO;

        const worldMap = this.engine.worldMap;

        // Spawn initial people
        // First, spawn EVIL_MIN terrorists
        for (let i = 0; i < EVIL_MIN; i++) {
            const tile = worldMap.randTileOnScreen();
            const terrorist = new Terrorist(tile.tileX, tile.tileY, worldMap);
            terrorist.state = STATE.STOP;
            this.entities.push(terrorist);
        }

        // Then fill the rest with civilians
        for (let i = EVIL_MIN; i < START_PEOPLE; i++) {
            const tile = worldMap.randTileOnScreen();
            const entity = this._createRandomCivilian(tile.tileX, tile.tileY, worldMap);
            entity.state = STATE.STOP;
            this.entities.push(entity);
        }

        this._updateCounts();
    }

    _createRandomCivilian(tileX, tileY, worldMap) {
        const roll = Math.floor(Math.random() * 100);
        if (roll < PROB_WOMAN) {
            return new Civilian(tileX, tileY, worldMap, PERSON_TYPE.WOMAN);
        } else if (roll < PROB_WOMAN + PROB_KID) {
            return new Civilian(tileX, tileY, worldMap, PERSON_TYPE.KID);
        } else if (roll < PROB_WOMAN + PROB_KID + PROB_DOG) {
            return new Dog(tileX, tileY, worldMap);
        } else {
            return new Civilian(tileX, tileY, worldMap, PERSON_TYPE.MAN);
        }
    }

    _updateCounts() {
        this.civilianCount = 0;
        this.terroristCount = 0;
        for (const e of this.entities) {
            if (e.state === STATE.DEAD) continue;
            if (e.type === 'terrorist') this.terroristCount++;
            else if (e.type === 'civilian') this.civilianCount++;
        }
    }

    // ——— Spawning ———

    _spawn(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = GENERATION_RATIO + Math.random() * RAND_GENERATION_RATIO;

            // Only spawn if below max
            const alive = this.entities.filter(e => e.state !== STATE.DEAD).length;
            if (alive < MAX_PEOPLE) {
                const worldMap = this.engine.worldMap;
                const tile = worldMap.randTileOffScreen();
                const entity = this._createRandomCivilian(tile.tileX, tile.tileY, worldMap);
                entity.state = STATE.STOP;
                this.entities.push(entity);
            }

            // Ensure minimum evil count
            if (this.terroristCount < EVIL_MIN) {
                const needed = EVIL_MIN - this.terroristCount;
                for (let i = 0; i < needed; i++) {
                    const worldMap = this.engine.worldMap;
                    const tile = worldMap.randTileOffScreen();
                    const t = new Terrorist(tile.tileX, tile.tileY, worldMap);
                    t.state = STATE.STOP;
                    this.entities.push(t);
                }
            }
        }
    }

    // ——— Kill (from 2_5.ls mKill) ———

    kill(centerX, centerY) {
        const worldMap = this.engine.worldMap;
        const killed = [];

        // Find all living entities in blast radius
        for (const entity of this.entities) {
            if (entity.state === STATE.DEAD) continue;
            const dist = entity.distanceToTile(centerX, centerY);
            if (dist <= 5) { // within blast grid radius
                entity.die(entity.tileX, entity.tileY, worldMap);
                killed.push(entity);
                this.totalKilled++;

                // If terrorist killed, chance to regenerate
                if (entity.type === 'terrorist') {
                    if (Math.random() * 100 < EVIL_REGENERATION) {
                        // Spawn a new terrorist off-screen
                        const tile = worldMap.randTileOffScreen();
                        const t = new Terrorist(tile.tileX, tile.tileY, worldMap);
                        t.state = STATE.STOP;
                        this.entities.push(t);
                    }
                }
            }
        }

        if (killed.length === 0) return;

        // Reset undo evil timer — violence resets the clock
        this.undoEvilTimer = WAIT_UNDO_EVIL * FPS;
        this.undoEvilCounter = 0;

        // Play cry sound
        if (this.engine.soundManager) {
            this.engine.soundManager.playCry();
        }

        // Find mourners for dead civilians (not dogs, not terrorists)
        const deadCivilians = killed.filter(e => e.type === 'civilian');
        if (deadCivilians.length === 0) return;

        const mournerCount = deadCivilians.length * EVIL_PER_DEATH;

        // Find nearby living non-evil, non-dog entities that can mourn
        const candidates = this.entities
            .filter(e => !e.cantMourn() && e.type === 'civilian')
            .map(e => ({
                entity: e,
                dist: Math.min(...deadCivilians.map(d => e.distanceTo(d))),
            }))
            .filter(c => c.dist <= MOURN_DISTANCE)
            .sort((a, b) => a.dist - b.dist);

        // Assign mourners
        const mourners = candidates.slice(0, mournerCount);
        let deadIdx = 0;
        for (const m of mourners) {
            const deadTarget = deadCivilians[deadIdx % deadCivilians.length];
            deadIdx++;

            // Calculate mourn spot: offset from dead body
            const facing = Math.floor(Math.random() * 4);
            let mx = deadTarget.tileX;
            let my = deadTarget.tileY;
            switch (facing) {
                case 0: my -= DISTANCE_FROM_DEAD; break; // mourn from north
                case 1: my += DISTANCE_FROM_DEAD; break; // south
                case 2: mx -= DISTANCE_FROM_DEAD; break; // west
                case 3: mx += DISTANCE_FROM_DEAD; break; // east
            }
            mx = Math.max(0, Math.min(MAP_WIDTH - 1, mx));
            my = Math.max(0, Math.min(MAP_HEIGHT - 1, my));

            m.entity.goToMournPos(mx, my, facing);
        }

        this._updateCounts();
    }

    // ——— Undo Evil (from 2_1.ls, 2_5.ls mUndoEvil) ———

    _updateUndoEvil() {
        this.undoEvilTimer--;
        if (this.undoEvilTimer <= 0) {
            this.undoEvilTimer = WAIT_UNDO_EVIL * FPS;
            this.undoEvilCounter++;

            const convertCount = UNDO_EVIL_PEOPLE + this.undoEvilCounter;

            // Find terrorists to convert back (only if above minimum evil count)
            const terrorists = this.entities.filter(
                e => e.type === 'terrorist' && e.state !== STATE.DEAD && !e.undoEvil
            );

            if (terrorists.length > EVIL_MIN) {
                const toConvert = Math.min(convertCount, terrorists.length - EVIL_MIN);
                for (let i = 0; i < toConvert; i++) {
                    // Pick a random terrorist
                    const idx = Math.floor(Math.random() * terrorists.length);
                    const t = terrorists.splice(idx, 1)[0];
                    t.startUndoEvil();
                }
            }
        }
    }

    // ——— Update ———

    update(dt) {
        const worldMap = this.engine.worldMap;

        // Spawn new people
        this._spawn(dt);

        // Undo evil timer
        this._updateUndoEvil();

        // Update all entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];

            entity.update(worldMap);

            // Check for turn completion (civilian → terrorist)
            if (entity._turnCompleteCallback) {
                entity._turnCompleteCallback = false;
                this._convertToTerrorist(entity, i);
            }

            // Check for undo evil callbacks (terrorist → civilian)
            if (entity._undoEvilCallback) {
                entity._undoEvilCallback = false;
            }
            if (entity._undoEvilCompleteCallback) {
                entity._undoEvilCompleteCallback = false;
                this._convertToCivilian(entity, i);
            }

            // Remove faded dead
            if (entity.shouldRemove) {
                this.entities.splice(i, 1);
            }
        }

        this._updateCounts();
    }

    _convertToTerrorist(civilian, index) {
        const worldMap = this.engine.worldMap;
        const t = new Terrorist(civilian.tileX, civilian.tileY, worldMap);
        t.prevPersonType = civilian.personType;
        t.wasConverted = true;
        t.state = STATE.STOP;
        this.entities[index] = t;
    }

    _convertToCivilian(terrorist, index) {
        const worldMap = this.engine.worldMap;
        const prevType = terrorist.prevPersonType || PERSON_TYPE.MAN;
        const c = new Civilian(terrorist.tileX, terrorist.tileY, worldMap, prevType);
        c.state = STATE.STOP;
        this.entities[index] = c;
    }

    // ——— Rendering ———

    render(ctx, assetManager) {
        // Sort entities by depth (screen Y position for isometric)
        const sorted = [...this.entities].sort((a, b) => a.screenY - b.screenY);

        for (const entity of sorted) {
            entity.render(ctx, assetManager);
        }
    }

    // ——— Get entities near a point for blast damage ———

    getEntitiesInRadius(centerX, centerY, radius) {
        return this.entities.filter(e =>
            e.state !== STATE.DEAD &&
            e.distanceToTile(centerX, centerY) <= radius
        );
    }
}

// Need MAP_WIDTH/HEIGHT for bounds clamping in kill
const MAP_WIDTH = 120;
const MAP_HEIGHT = 120;
