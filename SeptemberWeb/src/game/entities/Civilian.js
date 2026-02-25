/**
 * Civilian.js — Man, Woman, and Kid entities
 * Source: 2_5.ls (People Class Parent) + Member CSVs
 *
 * Each type has different animation frame counts for walk, cry, turn, and death.
 * Walk animations are film loops with 8 frames per direction × 4 directions.
 * Mourning sequence: cry loop → stand-up transition → flash transformation.
 */

import { Entity } from './Entity.js';
import { STATE, DIR, PERSON_TYPE } from '../constants.js';

// ——— Animation info per type (from 2_5.ls mCreateFrames) ———
const ANIM_INFO = {
    [PERSON_TYPE.WOMAN]: { crystart: 33, crylength: 10, turnstart: 73, turnlength: 31, deathstart: 197 },
    [PERSON_TYPE.KID]: { crystart: 33, crylength: 3, turnstart: 45, turnlength: 31, deathstart: 169 },
    [PERSON_TYPE.MAN]: { crystart: 33, crylength: 20, turnstart: 113, turnlength: 31, deathstart: 237 },
};

// ——— Direction-prefixed sprite ID mappings (no software flipping needed) ———
const WALK_SPRITES = {
    [PERSON_TYPE.MAN]: [
        'n_man_walk_0', 'n_man_walk_1', 'n_man_walk_2', 'n_man_walk_3', 'n_man_walk_4', 'n_man_walk_5', 'n_man_walk_6', 'n_man_walk_7', // North
        's_man_walk_0', 's_man_walk_1', 's_man_walk_2', 's_man_walk_3', 's_man_walk_4', 's_man_walk_5', 's_man_walk_6', 's_man_walk_7', // South
        'w_man_walk_0', 'w_man_walk_1', 'w_man_walk_2', 'w_man_walk_3', 'w_man_walk_4', 'w_man_walk_5', 'w_man_walk_6', 'w_man_walk_7', // West
        'e_man_walk_0', 'e_man_walk_1', 'e_man_walk_2', 'e_man_walk_3', 'e_man_walk_4', 'e_man_walk_5', 'e_man_walk_6', 'e_man_walk_7', // East
    ],
    [PERSON_TYPE.WOMAN]: [
        'n_woman_walk_0', 'n_woman_walk_1', 'n_woman_walk_2', 'n_woman_walk_3', 'n_woman_walk_4', 'n_woman_walk_5', 'n_woman_walk_6', 'n_woman_walk_7',
        's_woman_walk_0', 's_woman_walk_1', 's_woman_walk_2', 's_woman_walk_3', 's_woman_walk_4', 's_woman_walk_5', 's_woman_walk_6', 's_woman_walk_7',
        'w_woman_walk_0', 'w_woman_walk_1', 'w_woman_walk_2', 'w_woman_walk_3', 'w_woman_walk_4', 'w_woman_walk_5', 'w_woman_walk_6', 'w_woman_walk_7',
        'e_woman_walk_0', 'e_woman_walk_1', 'e_woman_walk_2', 'e_woman_walk_3', 'e_woman_walk_4', 'e_woman_walk_5', 'e_woman_walk_6', 'e_woman_walk_7',
    ],
    [PERSON_TYPE.KID]: [
        'n_kid_walk_0', 'n_kid_walk_1', 'n_kid_walk_2', 'n_kid_walk_3', 'n_kid_walk_4', 'n_kid_walk_5', 'n_kid_walk_6', 'n_kid_walk_7',
        's_kid_walk_0', 's_kid_walk_1', 's_kid_walk_2', 's_kid_walk_3', 's_kid_walk_4', 's_kid_walk_5', 's_kid_walk_6', 's_kid_walk_7',
        'w_kid_walk_0', 'w_kid_walk_1', 'w_kid_walk_2', 'w_kid_walk_3', 'w_kid_walk_4', 'w_kid_walk_5', 'w_kid_walk_6', 'w_kid_walk_7',
        'e_kid_walk_0', 'e_kid_walk_1', 'e_kid_walk_2', 'e_kid_walk_3', 'e_kid_walk_4', 'e_kid_walk_5', 'e_kid_walk_6', 'e_kid_walk_7',
    ],
};

// Death sprites (direction-independent)
const DEAD_SPRITES = {
    [PERSON_TYPE.MAN]: ['dead_man_0', 'dead_man_1', 'dead_man_0', 'dead_man_1'],
    [PERSON_TYPE.WOMAN]: ['dead_woman_0', 'dead_woman_1', 'dead_woman_0', 'dead_woman_1'],
    [PERSON_TYPE.KID]: ['dead_kid_0', 'dead_kid_1', 'dead_kid_0', 'dead_kid_1'],
};

// ——— Multi-phase mourn/transform animation data ———
// All sprites are direction-prefixed — NO software flipping needed
const MOURN_SEQUENCE = {
    [PERSON_TYPE.MAN]: {
        [DIR.SOUTH]: {
            cryLoop: ['s_man_cry_0', 's_man_cry_1'], standUp: ['s_man_standup_0', 's_man_standup_1', 's_man_standup_2'],
            flash: { civ: 's_man_flash_civ', terror: 's_man_flash_terror' }
        },
        [DIR.EAST]: {
            cryLoop: ['e_man_cry_0', 'e_man_cry_1'], standUp: ['e_man_standup_0', 'e_man_standup_1', 'e_man_standup_2'],
            flash: { civ: 'e_man_flash_civ', terror: 'e_man_flash_terror' }
        },
        [DIR.WEST]: {
            cryLoop: ['w_man_cry_0', 'w_man_cry_1', 'w_man_cry_2', 'w_man_cry_3', 'w_man_cry_4', 'w_man_cry_5', 'w_man_cry_6', 'w_man_cry_7', 'w_man_cry_8', 'w_man_cry_9'],
            standUp: ['w_man_standup_0', 'w_man_standup_1'],
            flash: { civ: 'w_man_flash_civ', terror: 'w_man_flash_terror' }
        },
        [DIR.NORTH]: {
            cryLoop: ['n_man_cry_0', 'n_man_cry_1', 'n_man_cry_2', 'n_man_cry_3', 'n_man_cry_4', 'n_man_cry_5', 'n_man_cry_6', 'n_man_cry_7', 'n_man_cry_8', 'n_man_cry_9'],
            standUp: ['n_man_standup_0', 'n_man_standup_1'],
            flash: { civ: 'n_man_flash_civ', terror: 'n_man_flash_terror' }
        }
    },
    [PERSON_TYPE.WOMAN]: {
        [DIR.SOUTH]: {
            cryLoop: ['s_woman_cry_0', 's_woman_cry_1'], standUp: ['s_woman_standup_0', 's_woman_standup_1', 's_woman_standup_2', 's_woman_standup_3'],
            flash: { civ: 's_woman_flash_civ', terror: 's_woman_flash_terror' }
        },
        [DIR.EAST]: {
            cryLoop: ['e_woman_cry_0', 'e_woman_cry_1'], standUp: ['e_woman_standup_0', 'e_woman_standup_1', 'e_woman_standup_2', 'e_woman_standup_3'],
            flash: { civ: 'e_woman_flash_civ', terror: 'e_woman_flash_terror' }
        },
        [DIR.WEST]: {
            cryLoop: ['w_woman_cry_0', 'w_woman_cry_1', 'w_woman_cry_2'],
            standUp: ['w_woman_standup_0', 'w_woman_standup_1', 'w_woman_standup_2'],
            flash: { civ: 'w_woman_flash_civ', terror: 'w_woman_flash_terror' }
        },
        [DIR.NORTH]: {
            cryLoop: ['n_woman_cry_0', 'n_woman_cry_1', 'n_woman_cry_2'],
            standUp: ['n_woman_standup_0', 'n_woman_standup_1', 'n_woman_standup_2'],
            flash: { civ: 'n_woman_flash_civ', terror: 'n_woman_flash_terror' }
        }
    },
    [PERSON_TYPE.KID]: {
        [DIR.SOUTH]: {
            cryLoop: ['s_kid_cry_0', 's_kid_cry_1', 's_kid_cry_2', 's_kid_cry_3', 's_kid_cry_4', 's_kid_cry_5', 's_kid_cry_6', 's_kid_cry_7', 's_kid_cry_8', 's_kid_cry_9'],
            standUp: ['s_kid_standup_0', 's_kid_standup_1'],
            flash: { civ: 's_kid_flash_civ', terror: 's_kid_flash_terror' }
        },
        [DIR.EAST]: {
            cryLoop: ['e_kid_cry_0', 'e_kid_cry_1', 'e_kid_cry_2', 'e_kid_cry_3', 'e_kid_cry_4', 'e_kid_cry_5', 'e_kid_cry_6', 'e_kid_cry_7', 'e_kid_cry_8', 'e_kid_cry_9'],
            standUp: ['e_kid_standup_0', 'e_kid_standup_1'],
            flash: { civ: 'e_kid_flash_civ', terror: 'e_kid_flash_terror' }
        },
        [DIR.WEST]: {
            cryLoop: ['w_kid_cry_0', 'w_kid_cry_1', 'w_kid_cry_2', 'w_kid_cry_3', 'w_kid_cry_4', 'w_kid_cry_5', 'w_kid_cry_6', 'w_kid_cry_7', 'w_kid_cry_8'],
            standUp: ['w_kid_standup_0', 'w_kid_standup_1'],
            flash: { civ: 'w_kid_flash_civ', terror: 'w_kid_flash_terror' }
        },
        [DIR.NORTH]: {
            cryLoop: ['n_kid_cry_0', 'n_kid_cry_1', 'n_kid_cry_2', 'n_kid_cry_3', 'n_kid_cry_4', 'n_kid_cry_5', 'n_kid_cry_6', 'n_kid_cry_7', 'n_kid_cry_8'],
            standUp: ['n_kid_standup_0', 'n_kid_standup_1'],
            flash: { civ: 'n_kid_flash_civ', terror: 'n_kid_flash_terror' }
        }
    }
};

export class Civilian extends Entity {
    constructor(tileX, tileY, worldMap, personType) {
        super(tileX, tileY, worldMap);
        this.type = 'civilian';
        this.personType = personType || PERSON_TYPE.MAN;

        // Set animation info for this person type
        this.animInfo = ANIM_INFO[this.personType];

        // Start walking in a random direction
        this.setAnim(Math.floor(Math.random() * 4));

        // Mourn animation state
        this._cryLoopSprites = null;
        this._cryFrameIdx = 0;
        this._cryFrameTimer = 0;

        // Turn animation state
        this._turnPhase = null;       // 'standup' or 'flash'
        this._standUpSprites = null;
        this._standUpIndex = 0;
        this._standUpTimer = 0;
        this._turnCivSprite = null;
        this._turnTerrorSprite = null;
        this.turnFlashTimer = 0;
        this.turnFlashCount = 0;
        this.turnFlashMax = 6;        // 3 full loops
        this.turnFlashInterval = 12;  // frames between flashes (~0.25s at 48 FPS)
        this.turnShowTerrorist = false;
    }

    // Called when civilian arrives at mourn position and enters MOURN state
    _onMournStart() {
        const seq = MOURN_SEQUENCE[this.personType];
        if (!seq) return;
        const dir = seq[this.mournFacing];
        if (!dir) return;

        this._cryLoopSprites = dir.cryLoop;
        this._standUpSprites = dir.standUp;
        this._cryFrameIdx = 0;
        this._cryFrameTimer = 0;
    }

    getSpriteId() {
        const frame = this.currentFrame;

        if (this.state === STATE.DEAD) {
            const deadFrames = DEAD_SPRITES[this.personType];
            const idx = Math.min(frame - (this.animInfo?.deathstart || 0), deadFrames.length - 1);
            return deadFrames[Math.max(0, idx)] || deadFrames[0];
        }

        if (this.state === STATE.MOURN) {
            if (this._cryLoopSprites && this._cryLoopSprites.length > 0) {
                return this._cryLoopSprites[this._cryFrameIdx % this._cryLoopSprites.length];
            }
            // Fallback
            const walkFrames = WALK_SPRITES[this.personType];
            return walkFrames ? walkFrames[0] : null;
        }

        if (this.state === STATE.TURN) {
            if (this._turnPhase === 'standup') {
                const idx = Math.min(this._standUpIndex, this._standUpSprites.length - 1);
                return this._standUpSprites[idx];
            }
            // Flash phase
            if (this.turnShowTerrorist) {
                return this._turnTerrorSprite;
            } else {
                return this._turnCivSprite;
            }
        }

        // Walking
        const walkFrames = WALK_SPRITES[this.personType];
        if (walkFrames) {
            const idx = frame % walkFrames.length;
            return walkFrames[idx];
        }

        return null;
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

    _onTurnComplete() {
        // Civilian finished turning → they become a terrorist
        // This is handled by EntityManager
        this._turnCompleteCallback = true;
    }

    _startTurn() {
        // Select direction data
        const seq = MOURN_SEQUENCE[this.personType];
        if (!seq) {
            this.state = STATE.STOP;
            return;
        }
        const dir = seq[this.mournFacing];

        // Set flash pair sprites (no flips needed — pre-baked)
        this._turnCivSprite = dir.flash.civ;
        this._turnTerrorSprite = dir.flash.terror;

        // Start with stand-up phase
        this._turnPhase = 'standup';
        this._standUpIndex = 0;
        this._standUpTimer = 0;

        // Flash state (for after stand-up)
        this.turnFlashTimer = 0;
        this.turnFlashCount = 0;
        this.turnShowTerrorist = false;

        // Signal EntityManager to play the turn sound
        this._turnStartedCallback = true;
    }

    // Override _advanceFrame to handle all custom animation phases
    _advanceFrame() {
        if (this.state === STATE.MOURN) {
            // Cycle through cry loop sprites
            this._cryFrameTimer++;
            if (this._cryFrameTimer >= 4) { // ~12fps at 48fps engine
                this._cryFrameTimer = 0;
                this._cryFrameIdx++;
                if (this._cryLoopSprites && this._cryFrameIdx >= this._cryLoopSprites.length) {
                    this._cryFrameIdx = 0;
                }
            }
            return; // Skip base class frame advancement
        }

        if (this.state === STATE.TURN) {
            if (this._turnPhase === 'standup') {
                // Play stand-up frames once
                this._standUpTimer++;
                if (this._standUpTimer >= 4) { // ~12fps
                    this._standUpTimer = 0;
                    this._standUpIndex++;
                    if (this._standUpSprites && this._standUpIndex >= this._standUpSprites.length) {
                        // Stand-up complete → switch to flash phase
                        this._turnPhase = 'flash';
                    }
                }
            } else {
                // Flash phase
                this.turnFlashTimer++;
                if (this.turnFlashTimer >= this.turnFlashInterval) {
                    this.turnFlashTimer = 0;
                    this.turnShowTerrorist = !this.turnShowTerrorist;
                    this.turnFlashCount++;

                    if (this.turnFlashCount >= this.turnFlashMax) {
                        // Turn complete — become terrorist
                        this.state = STATE.STOP;
                        this._onTurnComplete();
                        return;
                    }
                }
            }
            return; // Skip base class frame advancement
        }

        // Normal animation for all other states
        super._advanceFrame();
    }

    _onUndoEvil() {
        // Being un-eviled (shouldn't happen for civilians, but safety)
    }

    _onUndoEvilComplete() {
        // Finished un-eviling
    }
}
