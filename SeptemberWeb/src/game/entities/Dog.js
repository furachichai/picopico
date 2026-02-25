/**
 * Dog.js — Dog entity
 * Source: Cast 9 (9_Members.csv)
 *
 * Dogs walk around but cannot mourn or become terrorists. They can die.
 * 5% spawn probability.
 */

import { Entity } from './Entity.js';
import { STATE, DIR, PERSON_TYPE } from '../constants.js';

// Dog walk sprites: direction-prefixed, 8 frames per direction (N, S, W, E)
const WALK_SPRITES = [
    'n_dog_walk_0', 'n_dog_walk_1', 'n_dog_walk_2', 'n_dog_walk_3', 'n_dog_walk_4', 'n_dog_walk_5', 'n_dog_walk_6', 'n_dog_walk_7', // North
    's_dog_walk_0', 's_dog_walk_1', 's_dog_walk_2', 's_dog_walk_3', 's_dog_walk_4', 's_dog_walk_5', 's_dog_walk_6', 's_dog_walk_7', // South
    'w_dog_walk_0', 'w_dog_walk_1', 'w_dog_walk_2', 'w_dog_walk_3', 'w_dog_walk_4', 'w_dog_walk_5', 'w_dog_walk_6', 'w_dog_walk_7', // West
    'e_dog_walk_0', 'e_dog_walk_1', 'e_dog_walk_2', 'e_dog_walk_3', 'e_dog_walk_4', 'e_dog_walk_5', 'e_dog_walk_6', 'e_dog_walk_7', // East
];

const DEAD_SPRITES = ['dead_dog_0', 'dead_dog_1'];

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
}
