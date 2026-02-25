#!/usr/bin/env node
/**
 * generate_direction_sprites.js
 * 
 * Generates direction-prefixed character sprite files.
 * For sprites that are currently flipped in software (East = flip of South, North = flip of West),
 * this script creates pre-flipped PNG copies.
 * 
 * Output goes to: public/sept12 for vibe/Sept12assets/sep12/characters/
 * 
 * Naming: {dir}_{type}_{anim}_{frame}.png
 *   e.g., s_man_walk_0.png, e_kid_mourn_cry_3.png, w_terror_flash.png
 */

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const SRC_DIR = resolve('public/sept12 for vibe/Sept12assets/sep12');
const OUT_DIR = join(SRC_DIR, 'characters');

// Ensure output directory exists
if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
}

async function copySprite(srcId, outName) {
    const src = join(SRC_DIR, `${srcId}.png`);
    const dst = join(OUT_DIR, `${outName}.png`);
    await sharp(src).toFile(dst);
    console.log(`  COPY  ${srcId} → ${outName}`);
}

async function flipSprite(srcId, outName) {
    const src = join(SRC_DIR, `${srcId}.png`);
    const dst = join(OUT_DIR, `${outName}.png`);
    await sharp(src).flop().toFile(dst); // flop = horizontal flip
    console.log(`  FLIP  ${srcId} → ${outName}`);
}

// ========== WALK SPRITES ==========
// Pattern: Set A = South unflipped, East = flip of A
//          Set B = West unflipped, North = flip of B

const WALK_SETS = {
    man: {
        setA: ['5_12', '5_13', '5_14', '5_15', '5_16', '5_17', '5_18', '5_19'],
        setB: ['5_20', '5_21', '5_22', '5_23', '5_24', '5_25', '5_26', '5_27'],
    },
    woman: {
        setA: ['6_41', '6_42', '6_43', '6_44', '6_45', '6_46', '6_47', '6_48'],
        setB: ['6_49', '6_50', '6_51', '6_52', '6_53', '6_54', '6_55', '6_56'],
    },
    kid: {
        setA: ['8_1', '8_2', '8_3', '8_4', '8_5', '8_6', '8_7', '8_8'],
        setB: ['8_9', '8_10', '8_11', '8_12', '8_13', '8_14', '8_15', '8_16'],
    },
    terror: {
        setA: ['4_17', '4_18', '4_19', '4_20', '4_21', '4_22', '4_23', '4_24'],
        setB: ['4_25', '4_26', '4_27', '4_28', '4_29', '4_30', '4_31', '4_32'],
    },
    dog: {
        setA: ['9_1', '9_2', '9_3', '9_4', '9_5', '9_6', '9_7', '9_8'],
        setB: ['9_9', '9_10', '9_11', '9_12', '9_13', '9_14', '9_15', '9_16'],
    },
};

// ========== DEAD SPRITES ==========
const DEAD_SETS = {
    man: ['5_47', '5_48'],
    woman: ['6_71', '6_72'],
    kid: ['8_17', '8_18'],
    terror: ['4_33', '4_34'],
    dog: ['9_17', '9_18'],
};

// ========== MOURN SPRITES ==========
// For each civilian type and direction, we have cryLoop, standUp, and flash frames.
// South/East share the same base sprites (Set A mourning), with East being flipped.
// West/North share the same base sprites (Set B mourning), with North being flipped.

const MOURN_SETS = {
    man: {
        south: {
            cry: ['5_30', '5_31'],
            standup: ['5_32', '5_33', '5_34'],
            flash_civ: '5_34',
            flash_terror: '5_29',
        },
        // East = same sprites as South, but flipped
        east: {
            cry: ['5_30', '5_31'],
            standup: ['5_32', '5_33', '5_34'],
            flash_civ: '5_34',
            flash_terror: '5_29',
            flip: true,
        },
        west: {
            cry: ['5_35', '5_36', '5_37', '5_38', '5_39', '5_40', '5_41', '5_42', '5_43', '5_44'],
            standup: ['5_45', '5_46'],
            flash_civ: '5_46',
            flash_terror: '5_28',
            flash_terror_flip: true, // Man WEST: terror flash is flipped separately
        },
        // North = same sprites as West, but flipped
        north: {
            cry: ['5_35', '5_36', '5_37', '5_38', '5_39', '5_40', '5_41', '5_42', '5_43', '5_44'],
            standup: ['5_45', '5_46'],
            flash_civ: '5_46',
            flash_terror: '5_28',
            flip: true,
            // North: civ flipped, terror NOT flipped (terrorFlip: false in MOURN_SEQUENCE)
            flash_terror_flip: false,
            flash_civ_flip: true,
        },
    },
    woman: {
        south: {
            cry: ['6_59', '6_60'],
            standup: ['6_61', '6_62', '6_63', '6_64'],
            flash_civ: '6_64',
            flash_terror: '6_58',
            flash_terror_flip: true, // Woman SOUTH: terrorFlip: true
        },
        east: {
            cry: ['6_59', '6_60'],
            standup: ['6_61', '6_62', '6_63', '6_64'],
            flash_civ: '6_64',
            flash_terror: '6_58',
            flip: true,
            // East: civ flipped, terror NOT flipped (terrorFlip: false)
            flash_civ_flip: true,
            flash_terror_flip: false,
        },
        west: {
            cry: ['6_65', '6_66', '6_67'],
            standup: ['6_68', '6_69', '6_70'],
            flash_civ: '6_70',
            flash_terror: '6_57',
            flash_terror_flip: true, // Woman WEST: terrorFlip: true
        },
        north: {
            cry: ['6_65', '6_66', '6_67'],
            standup: ['6_68', '6_69', '6_70'],
            flash_civ: '6_70',
            flash_terror: '6_57',
            flip: true,
            flash_civ_flip: true,
            flash_terror_flip: false, // Woman NORTH: terrorFlip: false
        },
    },
    kid: {
        south: {
            cry: ['8_30', '8_31', '8_32', '8_33', '8_34', '8_35', '8_36', '8_37', '8_38', '8_39'],
            standup: ['8_40', '8_41'],
            flash_civ: '8_29',
            flash_terror: '8_28',
        },
        east: {
            cry: ['8_30', '8_31', '8_32', '8_33', '8_34', '8_35', '8_36', '8_37', '8_38', '8_39'],
            standup: ['8_40', '8_41'],
            flash_civ: '8_29',
            flash_terror: '8_28',
            flip: true,
        },
        west: {
            cry: ['8_42', '8_43', '8_44', '8_45', '8_46', '8_47', '8_48', '8_49', '8_50'],
            standup: ['8_51', '8_52'],
            flash_civ: '8_64',
            flash_terror: '8_67',
        },
        north: {
            cry: ['8_42', '8_43', '8_44', '8_45', '8_46', '8_47', '8_48', '8_49', '8_50'],
            standup: ['8_51', '8_52'],
            flash_civ: '8_64',
            flash_terror: '8_67',
            flip: true,
        },
    },
};

async function generateWalkSprites() {
    console.log('\n=== WALK SPRITES ===');
    for (const [type, sets] of Object.entries(WALK_SETS)) {
        console.log(`\n  ${type.toUpperCase()}:`);
        for (let i = 0; i < sets.setA.length; i++) {
            // South = Set A unflipped
            await copySprite(sets.setA[i], `s_${type}_walk_${i}`);
            // East = Set A flipped
            await flipSprite(sets.setA[i], `e_${type}_walk_${i}`);
        }
        for (let i = 0; i < sets.setB.length; i++) {
            // West = Set B unflipped
            await copySprite(sets.setB[i], `w_${type}_walk_${i}`);
            // North = Set B flipped
            await flipSprite(sets.setB[i], `n_${type}_walk_${i}`);
        }
    }
}

async function generateDeadSprites() {
    console.log('\n=== DEAD SPRITES ===');
    for (const [type, sprites] of Object.entries(DEAD_SETS)) {
        console.log(`\n  ${type.toUpperCase()}:`);
        for (let i = 0; i < sprites.length; i++) {
            await copySprite(sprites[i], `dead_${type}_${i}`);
        }
    }
}

async function generateMournSprites() {
    console.log('\n=== MOURN SPRITES ===');
    for (const [type, dirs] of Object.entries(MOURN_SETS)) {
        for (const [dir, data] of Object.entries(dirs)) {
            console.log(`\n  ${type.toUpperCase()} ${dir.toUpperCase()}:`);
            const prefix = `${dir[0]}_${type}`;  // e.g., "s_man", "e_kid"

            // Cry frames
            for (let i = 0; i < data.cry.length; i++) {
                if (data.flip) {
                    await flipSprite(data.cry[i], `${prefix}_cry_${i}`);
                } else {
                    await copySprite(data.cry[i], `${prefix}_cry_${i}`);
                }
            }

            // Standup frames
            for (let i = 0; i < data.standup.length; i++) {
                if (data.flip) {
                    await flipSprite(data.standup[i], `${prefix}_standup_${i}`);
                } else {
                    await copySprite(data.standup[i], `${prefix}_standup_${i}`);
                }
            }

            // Flash civ frame
            const civFlip = data.flash_civ_flip ?? data.flip ?? false;
            if (civFlip) {
                await flipSprite(data.flash_civ, `${prefix}_flash_civ`);
            } else {
                await copySprite(data.flash_civ, `${prefix}_flash_civ`);
            }

            // Flash terror frame
            const terrorFlip = data.flash_terror_flip ?? false;
            if (terrorFlip) {
                await flipSprite(data.flash_terror, `${prefix}_flash_terror`);
            } else {
                await copySprite(data.flash_terror, `${prefix}_flash_terror`);
            }
        }
    }
}

async function main() {
    console.log('Generating direction-prefixed character sprites...');
    console.log(`Source: ${SRC_DIR}`);
    console.log(`Output: ${OUT_DIR}`);

    await generateWalkSprites();
    await generateDeadSprites();
    await generateMournSprites();

    console.log('\n✅ Done! All sprites generated.');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
