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
    PERSON_TYPE, STATE, DIR, SPAWN_MODE, FPS, WAIT_MOURN,
} from './constants.js';

export class EntityManager {
    constructor(engine) {
        this.engine = engine;
        this.entities = [];           // all active entities
        this.deadEntities = [];       // dead bodies waiting to fade
        this.spawnTimer = 0;          // countdown to next spawn

        // Dead body obstacle tiles
        this.deadBodyTiles = new Set();

        // Undo evil tracker
        this.undoEvilTimer = WAIT_UNDO_EVIL * FPS;
        this.undoEvilCounter = 0;     // increases each cycle, converting more each time

        // Turn sound cooldown — prevent overlapping sounds from multiple mourners
        this.turnSoundCooldown = 0;

        // Frame counter for synchronized mourn deadlines
        this.frameCounter = 0;

        // Statistics
        this.civilianCount = 0;
        this.terroristCount = 0;
        this.totalKilled = 0;
    }

    init() {
        this.entities = [];
        this.deadEntities = [];
        this.deadBodyTiles = new Set();
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
            if (dist <= 4) { // within blast grid radius (reduced 20% from original 5)
                entity.die(entity.tileX, entity.tileY, worldMap);
                killed.push(entity);

                // Mark the dead body's tile as a temporary obstacle
                this.deadBodyTiles.add(`${entity.tileX},${entity.tileY}`);
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

        // Find mournable dead — civilians and dogs (not terrorists)
        const mournableDead = killed.filter(e => e.type === 'civilian' || e.type === 'dog');
        if (mournableDead.length === 0) return;

        // Synchronized mourn deadline: all mourners from this blast transform together
        // Deadline = now + estimated rush time (~3s) + mourn duration
        const mournDeadline = this.frameCounter + (3 * FPS) + (WAIT_MOURN * FPS);

        // Find nearby living civilians that can mourn (dogs can't mourn)
        const allCivs = this.entities.filter(e => e.type === 'civilian');
        const canMournCivs = allCivs.filter(e => !e.cantMourn());

        // All civilians within MOURN_DISTANCE of the bomb blast rush to mourn
        const mourners = canMournCivs
            .map(e => ({
                entity: e,
                dist: e.distanceToTile(centerX, centerY),
            }))
            .filter(c => c.dist <= MOURN_DISTANCE)
            .sort((a, b) => a.dist - b.dist);

        for (const m of mourners) {
            // Assign each mourner to the CLOSEST dead body
            let closestDead = mournableDead[0];
            let closestDist = m.entity.distanceTo(mournableDead[0]);
            for (let i = 1; i < mournableDead.length; i++) {
                const d = m.entity.distanceTo(mournableDead[i]);
                if (d < closestDist) {
                    closestDist = d;
                    closestDead = mournableDead[i];
                }
            }

            // Calculate mourn spot: 0-1 tiles from dead body (matches original)
            const offsetDir = Math.floor(Math.random() * 4);
            const dist = Math.floor(Math.random() * 2); // 0 or 1
            let mx = closestDead.tileX;
            let my = closestDead.tileY;
            if (dist === 1) {
                switch (offsetDir) {
                    case 0: my -= 1; break; // north
                    case 1: my += 1; break; // south
                    case 2: mx -= 1; break; // west
                    case 3: mx += 1; break; // east
                }
            }
            mx = Math.max(0, Math.min(MAP_WIDTH - 1, mx));
            my = Math.max(0, Math.min(MAP_HEIGHT - 1, my));

            // Calculate facing from mourner position TOWARD the dead body
            const dx = closestDead.tileX - mx;
            const dy = closestDead.tileY - my;
            let lookFacing;
            if (dist === 0) {
                // On the same tile — pick a random facing
                lookFacing = Math.floor(Math.random() * 4);
            } else if (Math.abs(dx) >= Math.abs(dy)) {
                lookFacing = dx > 0 ? DIR.EAST : DIR.WEST;
            } else {
                lookFacing = dy > 0 ? DIR.SOUTH : DIR.NORTH;
            }
            m.entity.goToMournPos(mx, my, lookFacing, closestDead, mournDeadline);
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

        // Increment frame counter for mourn deadline synchronization
        this.frameCounter++;

        // Undo evil timer
        this._updateUndoEvil();

        // Decrement turn sound cooldown
        if (this.turnSoundCooldown > 0) this.turnSoundCooldown--;

        // Track whether turn sound already played this frame
        let turnSoundPlayed = false;

        // Update all entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];

            entity.update(worldMap, this.frameCounter);

            // Check for turn started (play turn sound once per group)
            if (entity._turnStartedCallback) {
                entity._turnStartedCallback = false;
                if (!turnSoundPlayed && this.turnSoundCooldown <= 0 && this.engine.soundManager) {
                    this.engine.soundManager.playTurn();
                    turnSoundPlayed = true;
                    this.turnSoundCooldown = 2 * FPS; // 2 second cooldown
                }
            }

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
                // Clear the dead body obstacle tile
                this.deadBodyTiles.delete(`${entity.tileX},${entity.tileY}`);
                entity.removed = true; // Signal mourners to abort
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
        t.stateGoto = civilian.mournFacing !== undefined ? civilian.mournFacing : civilian.stateGoto;
        t.setAnim(t.stateGoto);
        this.entities[index] = t;
    }

    _convertToCivilian(terrorist, index) {
        const worldMap = this.engine.worldMap;
        const prevType = terrorist.prevPersonType || PERSON_TYPE.MAN;
        const c = new Civilian(terrorist.tileX, terrorist.tileY, worldMap, prevType);
        c.state = STATE.STOP;
        c.stateGoto = terrorist.stateGoto;
        c.setAnim(c.stateGoto);
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
