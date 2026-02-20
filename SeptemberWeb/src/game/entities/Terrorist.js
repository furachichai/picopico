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

// Evil walk sprites: 8 frames per direction (from Cast 4)
const WALK_SPRITES = [
    '4_25', '4_26', '4_27', '4_28', '4_29', '4_30', '4_31', '4_32', // North — set B flipped
    '4_17', '4_18', '4_19', '4_20', '4_21', '4_22', '4_23', '4_24', // South — set A unflipped
    '4_25', '4_26', '4_27', '4_28', '4_29', '4_30', '4_31', '4_32', // West — set B unflipped
    '4_17', '4_18', '4_19', '4_20', '4_21', '4_22', '4_23', '4_24', // East — set A flipped
];

const DEAD_SPRITES = ['4_33', '4_34'];

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
        return this.stateGoto === DIR.NORTH || this.stateGoto === DIR.EAST;
    }

    _drawCharacter(ctx, assetManager) {
        if (!assetManager) return;

        const spriteId = this.getSpriteId();
        if (!spriteId) return;

        ctx.save();
        ctx.translate(this.screenX, this.screenY);

        // Use locked flip state for dead entities to prevent twerking
        const flip = this.state === STATE.DEAD ? !!this._deadFlip : this._shouldFlip();
        if (flip) {
            ctx.scale(-1, 1);
        }

        assetManager.drawSprite(ctx, spriteId, 0, 0);

        ctx.restore();
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
