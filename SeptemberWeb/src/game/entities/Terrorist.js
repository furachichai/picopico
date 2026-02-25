/**
 * Terrorist.js — Terrorist (Evil) entity
 * Source: Cast 4 (4_Members.csv), FullEvil film loop
 *
 * Terrorists walk like civilians but use the Evil cast sprites.
 * They can die but cannot mourn. When killed, there's a 40% chance
 * they regenerate as a new terrorist.
 *
 * The "undo evil" mechanic converts terrorists back to civilians
 * when the player hasn't fired for a while.
 */

import { Entity } from './Entity.js';
import { STATE, DIR, PERSON_TYPE } from '../constants.js';

// Evil walk sprites: direction-prefixed, 8 frames per direction (from Cast 4)
const WALK_SPRITES = [
    'n_terror_walk_0', 'n_terror_walk_1', 'n_terror_walk_2', 'n_terror_walk_3', 'n_terror_walk_4', 'n_terror_walk_5', 'n_terror_walk_6', 'n_terror_walk_7', // North
    's_terror_walk_0', 's_terror_walk_1', 's_terror_walk_2', 's_terror_walk_3', 's_terror_walk_4', 's_terror_walk_5', 's_terror_walk_6', 's_terror_walk_7', // South
    'w_terror_walk_0', 'w_terror_walk_1', 'w_terror_walk_2', 'w_terror_walk_3', 'w_terror_walk_4', 'w_terror_walk_5', 'w_terror_walk_6', 'w_terror_walk_7', // West
    'e_terror_walk_0', 'e_terror_walk_1', 'e_terror_walk_2', 'e_terror_walk_3', 'e_terror_walk_4', 'e_terror_walk_5', 'e_terror_walk_6', 'e_terror_walk_7', // East
];

const DEAD_SPRITES = ['dead_terror_0', 'dead_terror_1'];

export class Terrorist extends Entity {
    constructor(tileX, tileY, worldMap) {
        super(tileX, tileY, worldMap);
        this.type = 'terrorist';
        this.personType = PERSON_TYPE.EVIL;
        this.animInfo = { deathstart: 33 };
        this.wasConverted = false;
        this.prevPersonType = null; // what civilian type they were before conversion
        // Pre-select death sprite to avoid flickering (random per-frame was causing glitch)
        this._deadSpriteId = DEAD_SPRITES[Math.floor(Math.random() * DEAD_SPRITES.length)];

        this.setAnim(Math.floor(Math.random() * 4));
    }

    // Terrorists can never mourn
    cantMourn() {
        return true;
    }

    getSpriteId() {
        if (this.state === STATE.DEAD) {
            return this._deadSpriteId;
        }

        const idx = this.currentFrame % WALK_SPRITES.length;
        return WALK_SPRITES[idx];
    }

    _shouldFlip() {
        // All sprites are pre-flipped — no software flipping needed
        return false;
    }

    _drawCharacter(ctx, assetManager) {
        if (!assetManager) return;

        const spriteId = this.getSpriteId();
        if (!spriteId) return;

        // No flip logic needed — all sprites are direction-prefixed and pre-flipped
        assetManager.drawSprite(ctx, spriteId, this.screenX, this.screenY);
    }

    _onUndoEvil() {
        // Callback when being converted back to civilian
        // Handled by EntityManager
        this._undoEvilCallback = true;
    }

    _onUndoEvilComplete() {
        this._undoEvilCompleteCallback = true;
    }
}
