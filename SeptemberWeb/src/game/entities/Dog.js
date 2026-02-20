/**
 * Dog.js — Dog entity
 * Source: Cast 9 (9_Members.csv)
 *
 * Dogs walk around but cannot mourn or become terrorists. They can die.
 * 5% spawn probability.
 */

import { Entity } from './Entity.js';
import { STATE, DIR, PERSON_TYPE } from '../constants.js';

// Dog walk sprites: 8 frames per direction (N, S, W, E)
const WALK_SPRITES = [
    '9_9', '9_10', '9_11', '9_12', '9_13', '9_14', '9_15', '9_16', // North — set B flipped
    '9_1', '9_2', '9_3', '9_4', '9_5', '9_6', '9_7', '9_8',       // South — set A unflipped
    '9_9', '9_10', '9_11', '9_12', '9_13', '9_14', '9_15', '9_16', // West — set B unflipped
    '9_1', '9_2', '9_3', '9_4', '9_5', '9_6', '9_7', '9_8',       // East — set A flipped
];

const DEAD_SPRITES = ['9_17', '9_18'];

export class Dog extends Entity {
    constructor(tileX, tileY, worldMap) {
        super(tileX, tileY, worldMap);
        this.type = 'dog';
        this.personType = PERSON_TYPE.DOG;
        this.animInfo = { deathstart: 33 }; // only death animation
        // Pre-select death sprite to avoid flickering
        this._deadSpriteId = DEAD_SPRITES[Math.floor(Math.random() * DEAD_SPRITES.length)];
        this.setAnim(Math.floor(Math.random() * 4));
    }

    // Dogs can never mourn
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
}
