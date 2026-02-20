/**
 * Civilian.js — Man, Woman, and Kid entities
 * Source: 2_5.ls (People Class Parent) + Member CSVs
 *
 * Each type has different animation frame counts for walk, cry, turn, and death.
 * Walk animations are film loops with 8 frames per direction × 4 directions.
 * Crying, turning (to terrorist), and death have their own frame ranges.
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
// Walk frames: 8 per direction (N, S, W, E), from the Member CSVs
// We use the sprite frame index to pick from the walk arrays

const WALK_SPRITES = {
    // User-confirmed mapping:
    // Set A (first 8, e.g. man0001-0008) = SOUTH unflipped, EAST when flipped
    // Set B (second 8, e.g. man0009-0016) = WEST unflipped, NORTH when flipped
    [PERSON_TYPE.MAN]: [
        '5_20', '5_21', '5_22', '5_23', '5_24', '5_25', '5_26', '5_27', // North (0-7)  — set B flipped
        '5_12', '5_13', '5_14', '5_15', '5_16', '5_17', '5_18', '5_19', // South (8-15) — set A unflipped
        '5_20', '5_21', '5_22', '5_23', '5_24', '5_25', '5_26', '5_27', // West (16-23) — set B unflipped
        '5_12', '5_13', '5_14', '5_15', '5_16', '5_17', '5_18', '5_19', // East (24-31) — set A flipped
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

// Cry sprites (mourning)
const CRY_SPRITES = {
    [PERSON_TYPE.MAN]: [
        // Man has 20 cry frames per direction (crystart=33, crylength=20)
        // We use south-facing crying frames from the man cast: 5_30 through 5_45 (16 frames)
        // Plus repeat some. Practically we'll loop the available ones.
        '5_30', '5_31', '5_32', '5_33', '5_34', '5_35', '5_36', '5_37',
        '5_38', '5_39', '5_40', '5_41', '5_42', '5_43', '5_44', '5_45',
        '5_30', '5_31', '5_32', '5_33',
    ],
    [PERSON_TYPE.WOMAN]: [
        // Woman has 10 cry frames: 6_59 through 6_63, and south versions
        '6_59', '6_60', '6_61', '6_62', '6_63', '6_64',
        '6_65', '6_66', '6_67', '6_68',
    ],
    [PERSON_TYPE.KID]: [
        // Kid has 3 cry frames per direction: 8_19, 8_20, 8_21 (then repeats for other dirs)
        '8_19', '8_20', '8_21',
    ],
};

// Death sprites
const DEAD_SPRITES = {
    [PERSON_TYPE.MAN]: ['5_47', '5_48', '5_47', '5_48'],
    [PERSON_TYPE.WOMAN]: ['6_71', '6_72', '6_71', '6_72'],
    [PERSON_TYPE.KID]: ['8_17', '8_18', '8_17', '8_18'],
};

// Civilian with raised gun sprites for flash transition
const CIVILIAN_RAISED_GUN = {
    [PERSON_TYPE.MAN]: ['5_34', '5_46'],
    [PERSON_TYPE.WOMAN]: ['6_64', '6_70'],
};

// Terrorist with raised gun sprites for flash transition
const TERRORIST_RAISED_GUN = ['5_28', '5_29'];

export class Civilian extends Entity {
    constructor(tileX, tileY, worldMap, personType) {
        super(tileX, tileY, worldMap);
        this.type = 'civilian';
        this.personType = personType || PERSON_TYPE.MAN;

        // Set animation info for this person type
        this.animInfo = ANIM_INFO[this.personType];

        // Start walking in a random direction
        this.setAnim(Math.floor(Math.random() * 4));

        // Turn animation: flashing civilian ↔ terrorist
        // 3 loops × 2 flashes per loop = 6 total frame changes
        this.turnFlashTimer = 0;
        this.turnFlashCount = 0;
        this.turnFlashMax = 6;     // 3 full loops (civilian→terrorist→civilian→...)
        this.turnFlashInterval = 12; // frames between flashes (~0.25s at 48 FPS)
        this.turnShowTerrorist = false;
    }

    getSpriteId() {
        const frame = this.currentFrame;

        if (this.state === STATE.DEAD) {
            const deadFrames = DEAD_SPRITES[this.personType];
            const idx = Math.min(frame - (this.animInfo?.deathstart || 0), deadFrames.length - 1);
            return deadFrames[Math.max(0, idx)] || deadFrames[0];
        }

        if (this.state === STATE.MOURN) {
            const cryFrames = CRY_SPRITES[this.personType];
            if (cryFrames && cryFrames.length > 0) {
                const base = this.animInfo?.crystart || 0;
                const idx = (frame - base) % cryFrames.length;
                return cryFrames[Math.max(0, idx)] || cryFrames[0];
            }
            // Fallback to standing
            const walkFrames = WALK_SPRITES[this.personType];
            return walkFrames ? walkFrames[0] : null;
        }

        if (this.state === STATE.TURN) {
            // Kids don't turn — getSpriteId won't be called in TURN for kids
            // but safety fallback
            if (this.personType === PERSON_TYPE.KID) {
                const walkFrames = WALK_SPRITES[this.personType];
                return walkFrames ? walkFrames[0] : null;
            }
            // Flash between civilian-raised-gun and terrorist-raised-gun
            const civFrames = CIVILIAN_RAISED_GUN[this.personType];
            if (this.turnShowTerrorist) {
                return TERRORIST_RAISED_GUN[this.turnFlashCount % TERRORIST_RAISED_GUN.length];
            } else {
                return civFrames ? civFrames[this.turnFlashCount % civFrames.length] : TERRORIST_RAISED_GUN[0];
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

        // Use locked flip state for dead/turn entities to prevent inconsistency
        const flip = this.state === STATE.DEAD ? !!this._deadFlip
            : this.state === STATE.TURN ? !!this._turnFlip
                : this._shouldFlip();

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
        // Kids don't turn into terrorists — skip straight back to walking
        if (this.personType === PERSON_TYPE.KID) {
            this.state = STATE.STOP;
            return;
        }
        // Reset flash state for the turn animation
        this.turnFlashTimer = 0;
        this.turnFlashCount = 0;
        this.turnShowTerrorist = false;
        // Lock flip to false so both raised-gun sprites face the same direction
        this._turnFlip = false;
        // Signal EntityManager to play the turn sound
        this._turnStartedCallback = true;
    }

    // Override _advanceFrame to handle the turn flashing
    _advanceFrame() {
        if (this.state === STATE.TURN) {
            // Custom flash animation for turning
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
            return; // Skip normal frame advancement during turn
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
