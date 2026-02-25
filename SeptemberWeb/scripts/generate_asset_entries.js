#!/usr/bin/env node
/**
 * generate_asset_entries.js
 * 
 * Generates assetData.js entries for all direction-prefixed character sprites.
 * For flipped sprites, adjusts regX = (width - originalRegX).
 * Outputs a JS snippet to append to assetData.js.
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const SRC_DIR = resolve('public/sept12 for vibe/Sept12assets/sep12');
const CHAR_DIR = join(SRC_DIR, 'characters');

// Read original assetData to get regX, regY for source sprites
const assetDataRaw = readFileSync('src/game/assetData.js', 'utf-8');

function getOrigReg(spriteId) {
    // Parse regX, regY from assetData for original sprite
    const idStr = `"${spriteId}"`;
    const idx = assetDataRaw.indexOf(idStr);
    if (idx === -1) return { regX: 0, regY: 0 };
    const chunk = assetDataRaw.substring(idx, idx + 300);
    const rxMatch = chunk.match(/"regX":\s*(\d+)/);
    const ryMatch = chunk.match(/"regY":\s*(\d+)/);
    return {
        regX: rxMatch ? parseInt(rxMatch[1]) : 0,
        regY: ryMatch ? parseInt(ryMatch[1]) : 0,
    };
}

// Map of: newName -> { srcId, flipped }
const entries = [];

function addEntry(newName, srcId, flipped) {
    entries.push({ newName, srcId, flipped });
}

// Walk sprites
const WALK_SETS = {
    man: { setA: ['5_12', '5_13', '5_14', '5_15', '5_16', '5_17', '5_18', '5_19'], setB: ['5_20', '5_21', '5_22', '5_23', '5_24', '5_25', '5_26', '5_27'] },
    woman: { setA: ['6_41', '6_42', '6_43', '6_44', '6_45', '6_46', '6_47', '6_48'], setB: ['6_49', '6_50', '6_51', '6_52', '6_53', '6_54', '6_55', '6_56'] },
    kid: { setA: ['8_1', '8_2', '8_3', '8_4', '8_5', '8_6', '8_7', '8_8'], setB: ['8_9', '8_10', '8_11', '8_12', '8_13', '8_14', '8_15', '8_16'] },
    terror: { setA: ['4_17', '4_18', '4_19', '4_20', '4_21', '4_22', '4_23', '4_24'], setB: ['4_25', '4_26', '4_27', '4_28', '4_29', '4_30', '4_31', '4_32'] },
    dog: { setA: ['9_1', '9_2', '9_3', '9_4', '9_5', '9_6', '9_7', '9_8'], setB: ['9_9', '9_10', '9_11', '9_12', '9_13', '9_14', '9_15', '9_16'] },
};

for (const [type, sets] of Object.entries(WALK_SETS)) {
    for (let i = 0; i < sets.setA.length; i++) {
        addEntry(`s_${type}_walk_${i}`, sets.setA[i], false);
        addEntry(`e_${type}_walk_${i}`, sets.setA[i], true);
    }
    for (let i = 0; i < sets.setB.length; i++) {
        addEntry(`w_${type}_walk_${i}`, sets.setB[i], false);
        addEntry(`n_${type}_walk_${i}`, sets.setB[i], true);
    }
}

// Dead sprites
const DEAD = { man: ['5_47', '5_48'], woman: ['6_71', '6_72'], kid: ['8_17', '8_18'], terror: ['4_33', '4_34'], dog: ['9_17', '9_18'] };
for (const [type, sprites] of Object.entries(DEAD)) {
    for (let i = 0; i < sprites.length; i++) {
        addEntry(`dead_${type}_${i}`, sprites[i], false);
    }
}

// Mourn sprites — we need each unique source+flip combination
const MOURN_ENTRIES = [
    // Man South
    ...['5_30', '5_31'].map((s, i) => ({ n: `s_man_cry_${i}`, s, f: false })),
    ...['5_32', '5_33', '5_34'].map((s, i) => ({ n: `s_man_standup_${i}`, s, f: false })),
    { n: 's_man_flash_civ', s: '5_34', f: false }, { n: 's_man_flash_terror', s: '5_29', f: false },
    // Man East
    ...['5_30', '5_31'].map((s, i) => ({ n: `e_man_cry_${i}`, s, f: true })),
    ...['5_32', '5_33', '5_34'].map((s, i) => ({ n: `e_man_standup_${i}`, s, f: true })),
    { n: 'e_man_flash_civ', s: '5_34', f: true }, { n: 'e_man_flash_terror', s: '5_29', f: false },
    // Man West
    ...['5_35', '5_36', '5_37', '5_38', '5_39', '5_40', '5_41', '5_42', '5_43', '5_44'].map((s, i) => ({ n: `w_man_cry_${i}`, s, f: false })),
    ...['5_45', '5_46'].map((s, i) => ({ n: `w_man_standup_${i}`, s, f: false })),
    { n: 'w_man_flash_civ', s: '5_46', f: false }, { n: 'w_man_flash_terror', s: '5_28', f: true },
    // Man North
    ...['5_35', '5_36', '5_37', '5_38', '5_39', '5_40', '5_41', '5_42', '5_43', '5_44'].map((s, i) => ({ n: `n_man_cry_${i}`, s, f: true })),
    ...['5_45', '5_46'].map((s, i) => ({ n: `n_man_standup_${i}`, s, f: true })),
    { n: 'n_man_flash_civ', s: '5_46', f: true }, { n: 'n_man_flash_terror', s: '5_28', f: false },
    // Woman South
    ...['6_59', '6_60'].map((s, i) => ({ n: `s_woman_cry_${i}`, s, f: false })),
    ...['6_61', '6_62', '6_63', '6_64'].map((s, i) => ({ n: `s_woman_standup_${i}`, s, f: false })),
    { n: 's_woman_flash_civ', s: '6_64', f: false }, { n: 's_woman_flash_terror', s: '6_58', f: true },
    // Woman East
    ...['6_59', '6_60'].map((s, i) => ({ n: `e_woman_cry_${i}`, s, f: true })),
    ...['6_61', '6_62', '6_63', '6_64'].map((s, i) => ({ n: `e_woman_standup_${i}`, s, f: true })),
    { n: 'e_woman_flash_civ', s: '6_64', f: true }, { n: 'e_woman_flash_terror', s: '6_58', f: false },
    // Woman West
    ...['6_65', '6_66', '6_67'].map((s, i) => ({ n: `w_woman_cry_${i}`, s, f: false })),
    ...['6_68', '6_69', '6_70'].map((s, i) => ({ n: `w_woman_standup_${i}`, s, f: false })),
    { n: 'w_woman_flash_civ', s: '6_70', f: false }, { n: 'w_woman_flash_terror', s: '6_57', f: true },
    // Woman North
    ...['6_65', '6_66', '6_67'].map((s, i) => ({ n: `n_woman_cry_${i}`, s, f: true })),
    ...['6_68', '6_69', '6_70'].map((s, i) => ({ n: `n_woman_standup_${i}`, s, f: true })),
    { n: 'n_woman_flash_civ', s: '6_70', f: true }, { n: 'n_woman_flash_terror', s: '6_57', f: false },
    // Kid South
    ...['8_30', '8_31', '8_32', '8_33', '8_34', '8_35', '8_36', '8_37', '8_38', '8_39'].map((s, i) => ({ n: `s_kid_cry_${i}`, s, f: false })),
    ...['8_40', '8_41'].map((s, i) => ({ n: `s_kid_standup_${i}`, s, f: false })),
    { n: 's_kid_flash_civ', s: '8_29', f: false }, { n: 's_kid_flash_terror', s: '8_28', f: false },
    // Kid East
    ...['8_30', '8_31', '8_32', '8_33', '8_34', '8_35', '8_36', '8_37', '8_38', '8_39'].map((s, i) => ({ n: `e_kid_cry_${i}`, s, f: true })),
    ...['8_40', '8_41'].map((s, i) => ({ n: `e_kid_standup_${i}`, s, f: true })),
    { n: 'e_kid_flash_civ', s: '8_29', f: true }, { n: 'e_kid_flash_terror', s: '8_28', f: false },
    // Kid West
    ...['8_42', '8_43', '8_44', '8_45', '8_46', '8_47', '8_48', '8_49', '8_50'].map((s, i) => ({ n: `w_kid_cry_${i}`, s, f: false })),
    ...['8_51', '8_52'].map((s, i) => ({ n: `w_kid_standup_${i}`, s, f: false })),
    { n: 'w_kid_flash_civ', s: '8_64', f: false }, { n: 'w_kid_flash_terror', s: '8_67', f: false },
    // Kid North
    ...['8_42', '8_43', '8_44', '8_45', '8_46', '8_47', '8_48', '8_49', '8_50'].map((s, i) => ({ n: `n_kid_cry_${i}`, s, f: true })),
    ...['8_51', '8_52'].map((s, i) => ({ n: `n_kid_standup_${i}`, s, f: true })),
    { n: 'n_kid_flash_civ', s: '8_64', f: true }, { n: 'n_kid_flash_terror', s: '8_67', f: false },
];

for (const e of MOURN_ENTRIES) {
    addEntry(e.n, e.s, e.f);
}

async function main() {
    const lines = [];
    lines.push('  // ========== Direction-prefixed character sprites ==========');

    for (const entry of entries) {
        const orig = getOrigReg(entry.srcId);
        let regX = orig.regX;

        if (entry.flipped) {
            // For flipped sprites, adjust regX: regX = width - originalRegX
            const meta = await sharp(join(SRC_DIR, `${entry.srcId}.png`)).metadata();
            regX = meta.width - orig.regX;
        }

        const src = `/sept12%20for%20vibe/Sept12assets/sep12/characters/${entry.newName}.png`;
        lines.push(`  "${entry.newName}": { "id": "${entry.newName}", "name": "${entry.newName}", "src": "${src}", "regX": ${regX}, "regY": ${orig.regY} },`);
    }

    console.log(lines.join('\n'));
}

main().catch(err => { console.error(err); process.exit(1); });
