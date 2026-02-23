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

// ——— Sprite ID mappings ———
const WALK_SPRITES = {
    // Set A = SOUTH unflipped / EAST flipped
    // Set B = WEST unflipped / NORTH flipped
    [PERSON_TYPE.MAN]: [
        '5_20', '5_21', '5_22', '5_23', '5_24', '5_25', '5_26', '5_27', // North — set B flipped
        '5_12', '5_13', '5_14', '5_15', '5_16', '5_17', '5_18', '5_19', // South — set A unflipped
        '5_20', '5_21', '5_22', '5_23', '5_24', '5_25', '5_26', '5_27', // West — set B unflipped
        '5_12', '5_13', '5_14', '5_15', '5_16', '5_17', '5_18', '5_19', // East — set A flipped
    ],
    [PERSON_TYPE.WOMAN]: [
        '6_49', '6_50', '6_51', '6_52', '6_53', '6_54', '6_55', '6_56', // North — set B flipped
        '6_41', '6_42', '6_43', '6_44', '6_45', '6_46', '6_47', '6_48', // South — set A unflipped
        '6_49', '6_50', '6_51', '6_52', '6_53', '6_54', '6_55', '6_56', // West — set B unflipped
        '6_41', '6_42', '6_43', '6_44', '6_45', '6_46', '6_47', '6_48', // East — set A flipped
    ],
    [PERSON_TYPE.KID]: [
        '8_9', '8_10', '8_11', '8_12', '8_13', '8_14', '8_15', '8_16', // North — set B flipped
        '8_1', '8_2', '8_3', '8_4', '8_5', '8_6', '8_7', '8_8',       // South — set A unflipped
        '8_9', '8_10', '8_11', '8_12', '8_13', '8_14', '8_15', '8_16', // West — set B unflipped
        '8_1', '8_2', '8_3', '8_4', '8_5', '8_6', '8_7', '8_8',       // East — set A flipped
    ],
};

// Death sprites
const DEAD_SPRITES = {
    [PERSON_TYPE.MAN]: ['5_47', '5_48', '5_47', '5_48'],
    [PERSON_TYPE.WOMAN]: ['6_71', '6_72', '6_71', '6_72'],
    [PERSON_TYPE.KID]: ['8_17', '8_18', '8_17', '8_18'],
};

// ——— Multi-phase mourn/transform animation data ———
// setA = SOUTH/EAST facing (canvas flip for EAST)
// setB = WEST/NORTH facing (canvas flip for NORTH)
const MOURN_SEQUENCE = {
    [PERSON_TYPE.MAN]: {
        setA: {
            cryLoop: ['5_30', '5_31'],
            standUp: ['5_32', '5_33', '5_34'],
            flash: { civ: '5_34', terror: '5_29', terrorFlip: false },
        },
        setB: {
            cryLoop: ['5_35', '5_36', '5_37', '5_38', '5_39', '5_40', '5_41', '5_42', '5_43', '5_44'],
            standUp: ['5_45', '5_46'],
            flash: { civ: '5_46', terror: '5_28', terrorFlip: true },
        },
    },
    [PERSON_TYPE.WOMAN]: {
        setA: {
            cryLoop: ['6_59', '6_60'],
            standUp: ['6_61', '6_62', '6_63', '6_64'],
            flash: { civ: '6_64', terror: '6_58', terrorFlip: true },
        },
        setB: {
            cryLoop: ['6_65', '6_66', '6_67'],
            standUp: ['6_68', '6_69', '6_70'],
            flash: { civ: '6_70', terror: '6_57', terrorFlip: true },
        },
    },
    [PERSON_TYPE.KID]: {
        setA: {
            cryLoop: ['8_30', '8_31', '8_32', '8_33', '8_34', '8_35', '8_36', '8_37', '8_38', '8_39'],
            standUp: ['8_40', '8_41'],
            flash: { civ: '8_29', terror: '6_57', terrorFlip: false },
        },
        setB: {
            cryLoop: ['8_42', '8_43', '8_44', '8_45', '8_46', '8_47', '8_48', '8_49', '8_50'],
            standUp: ['8_51', '8_52'],
            flash: { civ: '8_64', terror: '8_67', terrorFlip: true },
        },
    },
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
        this._turnTerrorFlip = false;
        this.turnFlashTimer = 0;
        this.turnFlashCount = 0;
        this.turnFlashMax = 6;        // 3 full loops
        this.turnFlashInterval = 12;  // frames between flashes (~0.25s at 48 FPS)
        this.turnShowTerrorist = false;
    }

    // Called when civilian arrives at mourn position and enters MOURN state
    _onMournStart() {
        const useSetA = (this.mournFacing === DIR.SOUTH || this.mournFacing === DIR.EAST);
        const seq = MOURN_SEQUENCE[this.personType];
        if (!seq) return;
        const dir = useSetA ? seq.setA : seq.setB;
        this._cryLoopSprites = dir.cryLoop;
        this._standUpSprites = dir.standUp;
        this._cryFrameIdx = 0;
        this._cryFrameTimer = 0;

        // Canvas flip during mourn: NORTH and EAST get flipped
        this._mournFlip = (this.mournFacing === DIR.NORTH || this.mournFacing === DIR.EAST);
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
        // North = West sprite flipped, East = South sprite flipped
        return this.stateGoto === DIR.NORTH || this.stateGoto === DIR.EAST;
    }

    _drawCharacter(ctx, assetManager) {
        if (!assetManager) return;

        const spriteId = this.getSpriteId();
        if (!spriteId) return;

        let flip;
        if (this.state === STATE.DEAD) {
            flip = !!this._deadFlip;
        } else if (this.state === STATE.MOURN) {
            flip = !!this._mournFlip;
        } else if (this.state === STATE.TURN) {
            if (this._turnPhase === 'standup') {
                flip = !!this._mournFlip; // Same flip as mourning
            } else {
                // Flash phase: maintain same direction as mourn/standup
                if (this.turnShowTerrorist) {
                    // XOR: if mourner is flipped AND terror is flipped, they cancel out
                    flip = this._mournFlip ? !this._turnTerrorFlip : !!this._turnTerrorFlip;
                } else {
                    flip = !!this._mournFlip;
                }
            }
        } else {
            flip = this._shouldFlip();
        }

        ctx.save();
        ctx.translate(this.screenX, this.screenY);

        if (flip) {
            ctx.scale(-1, 1);
        }

        assetManager.drawSprite(ctx, spriteId, 0, 0);

        ctx.restore();
    }

    _onTurnComplete() {
        // Civilian finished turning → they become a terrorist
        // This is handled by EntityManager
        this._turnCompleteCallback = true;
    }

    _startTurn() {
        // Select direction data
        const useSetA = (this.mournFacing === DIR.SOUTH || this.mournFacing === DIR.EAST);
        const seq = MOURN_SEQUENCE[this.personType];
        if (!seq) {
            this.state = STATE.STOP;
            return;
        }
        const dir = useSetA ? seq.setA : seq.setB;

        // Set flash pair sprites
        this._turnCivSprite = dir.flash.civ;
        this._turnTerrorSprite = dir.flash.terror;
        this._turnTerrorFlip = dir.flash.terrorFlip;

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
