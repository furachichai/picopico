/**
 * PlacementTool.js — Interactive WYSIWYG level editor
 *
 * Toggle with 'P' key (placement mode) or 'D' key (delete mode).
 *
 * PLACEMENT MODE (P):
 *   - Shows tile coordinates at mouse cursor
 *   - Q / Shift+Q to cycle through building types
 *   - Tab to jump to next category
 *   - Left-click to place building at snapped grid position
 *   - E to export placement array to console + clipboard
 *   - C to clear ALL buildings
 *
 * DELETE MODE (D):
 *   - Hover over buildings to highlight them (red tint)
 *   - Left-click to delete the highlighted building
 *
 * SHARED:
 *   - Ctrl+Z to undo last action
 *   - P / D to switch between modes
 *   - Esc to deactivate editor
 *
 * This is a development tool — remove before release.
 */

import { BUILDING_TYPES } from './BuildingManager.js';
import {
    SCREEN_W, SCREEN_H, GAME_STATE,
} from './constants.js';

const MODE = {
    INACTIVE: 'inactive',
    PLACE: 'place',
    DELETE: 'delete',
};

export class PlacementTool {
    constructor(engine) {
        this.engine = engine;
        this.active = false;
        this.mode = MODE.INACTIVE;
        this.selectedType = 0;  // index into BUILDING_TYPES

        // Current snapped tile position
        this.tileX = 0;
        this.tileY = 0;
        this.nudgeX = 0;
        this.nudgeY = 0;

        // Delete mode: building currently under cursor
        this.hoveredBuilding = null;

        // Undo stack
        this.undoStack = [];

        // Categories for easier navigation
        this.categories = [
            { name: 'Houses', start: 0, end: 5 },
            { name: 'Edificios', start: 6, end: 11 },
            { name: 'Fountains', start: 12, end: 13 },
            { name: 'Palms', start: 14, end: 25 },
            { name: 'Stalls', start: 26, end: 33 },
        ];
        this.categoryIndex = 0;

        // Bind handlers
        this._boundKeyDown = this._onKeyDown.bind(this);
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundContextMenu = (e) => { if (this.active) e.preventDefault(); };
    }

    attach(canvas) {
        this.canvas = canvas;
        window.addEventListener('keydown', this._boundKeyDown);
        canvas.addEventListener('mousedown', this._boundMouseDown);
        canvas.addEventListener('contextmenu', this._boundContextMenu);
    }

    detach() {
        window.removeEventListener('keydown', this._boundKeyDown);
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this._boundMouseDown);
            this.canvas.removeEventListener('contextmenu', this._boundContextMenu);
        }
    }

    _activate(mode) {
        this.active = true;
        this.mode = mode;
        this.active = true;
        this.mode = mode;
        this.hoveredBuilding = null;
        this.nudgeX = 0;
        this.nudgeY = 0;
        console.log(`[PlacementTool] ${mode.toUpperCase()} MODE`);
        if (mode === MODE.PLACE) {
            console.log('[PlacementTool] Q=cycle  Click=place  D=delete mode  Ctrl+Z=undo  E=export  Esc=off');
        } else {
            console.log('[PlacementTool] Hover=highlight  Click=delete  P=place mode  Ctrl+Z=undo  Esc=off');
        }
    }

    _deactivate() {
        this.active = false;
        this.mode = MODE.INACTIVE;
        this.hoveredBuilding = null;
        console.log('[PlacementTool] DISABLED');
    }

    _onKeyDown(e) {
        if (this.engine.state !== GAME_STATE.PLAYING) return;

        // P = activate/switch to placement mode
        if (e.key === 'p' || e.key === 'P') {
            if (this.mode === MODE.PLACE) {
                this._deactivate();
            } else {
                this._activate(MODE.PLACE);
            }
            e.preventDefault();
            return;
        }

        // D = activate/switch to delete mode
        if (e.key === 'd' || e.key === 'D') {
            if (this.mode === MODE.DELETE) {
                this._deactivate();
            } else {
                this._activate(MODE.DELETE);
            }
            e.preventDefault();
            return;
        }

        if (!this.active) return;

        // Escape = deactivate
        if (e.key === 'Escape') {
            this._deactivate();
            e.preventDefault();
            return;
        }

        // Ctrl+Z = undo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            this._undo();
            e.preventDefault();
            return;
        }

        // Shared nudge keys (arrows)
        // Arrows move the "virtual cursor" (nudge) relative to the mouse tile
        switch (e.key) {
            case 'ArrowUp':
                this.nudgeY--;
                e.preventDefault();
                break;
            case 'ArrowDown':
                this.nudgeY++;
                e.preventDefault();
                break;
            case 'ArrowLeft':
                this.nudgeX--;
                e.preventDefault();
                break;
            case 'ArrowRight':
                this.nudgeX++;
                e.preventDefault();
                break;
        }

        // Placement mode keys
        if (this.mode === MODE.PLACE) {
            switch (e.key) {
                case 'q':
                    this.selectedType = (this.selectedType + 1) % BUILDING_TYPES.length;
                    this._updateCategory();
                    e.preventDefault();
                    break;
                case 'Q':
                    this.selectedType = (this.selectedType - 1 + BUILDING_TYPES.length) % BUILDING_TYPES.length;
                    this._updateCategory();
                    e.preventDefault();
                    break;
                case 'Tab':
                    this.categoryIndex = (this.categoryIndex + 1) % this.categories.length;
                    this.selectedType = this.categories[this.categoryIndex].start;
                    e.preventDefault();
                    break;
                case 'e':
                case 'E':
                    this._exportPlacements();
                    e.preventDefault();
                    break;
                case 'k': // Keep / Save
                case 'K':
                    this._saveToFile();
                    e.preventDefault();
                    break;
                case 'l': // Load
                case 'L':
                    this._loadFromFile();
                    e.preventDefault();
                    break;
                case 'h': // History
                case 'H':
                    this._showHistoryModal();
                    e.preventDefault();
                    break;
                case 'c':
                case 'C':
                    this._clearAll();
                    e.preventDefault();
                    break;
            }
        }
    }

    // ——— File I/O ———

    _saveToFile() {
        const bm = this.engine.buildingManager;
        const data = bm.buildings.map(b => ({
            type: b.typeIndex,
            x: b.tileX,
            y: b.tileY,
        }));

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'september_map.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`[PlacementTool] Saved ${data.length} buildings to september_map.json`);
    }

    _loadFromFile() {
        // Create a hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (Array.isArray(data)) {
                        this._restoreFromData(data);
                        console.log(`[PlacementTool] Loaded ${data.length} buildings from file`);
                    } else {
                        console.error('[PlacementTool] Invalid map file format');
                        alert('Invalid map file format');
                    }
                } catch (err) {
                    console.error('[PlacementTool] Failed to parse map file:', err);
                    alert('Failed to parse map file');
                }
            };
            reader.readAsText(file);
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    _restoreFromData(data) {
        // Clear existing first
        this._clearAll();

        const bm = this.engine.buildingManager;
        const worldMap = this.engine.worldMap;

        // Re-create buildings
        // Note: _clearAll empties the array, so we can just push new ones
        // But _clearAll pushes to undo stack, which is fine

        // We need to temporarily disable undo logging for individual placements 
        // to avoid spamming the undo stack with 100 items
        // OR we can just treat this as a bulk operation.
        // For simplicity, let's just use the BuildingManager directly 
        // and then save to localStorage.

        // Actually, _clearAll clears the data. Let's just use the same logic 
        // as _placeBuildings in BuildingManager but we are in PlacementTool.

        for (const p of data) {
            if (p.type < BUILDING_TYPES.length) {
                bm._createBuilding(p.type, p.x, p.y);
            }
        }
        worldMap.calculateDepths();
        this._saveToLocalStorage();

        // Clear undo stack because we just reset the world state
        this.undoStack = [];
    }

    _onMouseDown(e) {
        if (!this.active) return;
        if (this.engine.state !== GAME_STATE.PLAYING) return;

        if (e.button === 0) {
            e.preventDefault();
            e.stopPropagation();

            if (this.mode === MODE.PLACE) {
                this._placeAtCursor();
            } else if (this.mode === MODE.DELETE) {
                this._deleteHovered();
            }
        }
    }

    _updateCategory() {
        for (let i = 0; i < this.categories.length; i++) {
            const cat = this.categories[i];
            if (this.selectedType >= cat.start && this.selectedType <= cat.end) {
                this.categoryIndex = i;
                break;
            }
        }
    }

    // ——— Placement ———

    _placeAtCursor() {
        const bm = this.engine.buildingManager;
        const worldMap = this.engine.worldMap;
        const type = BUILDING_TYPES[this.selectedType];

        // Place building (overlap is allowed — red grid is just a visual warning)
        bm._createBuilding(this.selectedType, this.tileX, this.tileY);
        worldMap.calculateDepths();

        // Push undo action
        this.undoStack.push({
            action: 'place',
            typeIndex: this.selectedType,
            tileX: this.tileX,
            tileY: this.tileY,
        });

        console.log(`[PlacementTool] Placed ${type.name} at (${this.tileX}, ${this.tileY})  [Ctrl+Z to undo]`);
        this._saveToLocalStorage();
    }

    // ——— Persistence ———

    // ——— Persistence ———

    _saveToLocalStorage() {
        const bm = this.engine.buildingManager;
        const data = bm.buildings.map(b => ({
            type: b.typeIndex,
            x: b.tileX,
            y: b.tileY,
        }));

        const json = JSON.stringify(data);

        try {
            // 1. Save current state
            localStorage.setItem('picopico_map', json);

            // 2. Sync to purely local filesystem via our Vite dev server plugin
            fetch('/api/save-map', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: json
            }).catch(e => console.warn('[PlacementTool] Failed to sync map to filesystem:', e));

            // 3. Save to history
            let history = [];
            const historyJson = localStorage.getItem('picopico_history');
            if (historyJson) {
                try {
                    history = JSON.parse(historyJson);
                    if (!Array.isArray(history)) history = [];
                } catch (e) { console.warn('History parse error', e); }
            }

            // Check if different from last save to avoid duplicates
            if (history.length > 0) {
                const last = history[history.length - 1];
                if (last.buildings && JSON.stringify(last.buildings) === json) {
                    return; // No change
                }
            }

            // Add new entry
            const entry = {
                timestamp: Date.now(),
                dateStr: new Date().toLocaleString(),
                buildings: data,
                count: data.length
            };

            history.push(entry);

            // Limit to 10 entries
            if (history.length > 10) {
                history = history.slice(history.length - 10);
            }

            localStorage.setItem('picopico_history', JSON.stringify(history));
            console.log(`[PlacementTool] Auto-saved to history (${history.length}/10) and synced to mapData.js`);

        } catch (e) {
            console.warn('[PlacementTool] Failed to save to localStorage:', e);
        }
    }

    _showHistoryModal() {
        // Load history
        let history = [];
        try {
            const h = localStorage.getItem('picopico_history');
            if (h) history = JSON.parse(h);
        } catch (e) {
            console.error(e);
        }

        if (!Array.isArray(history) || history.length === 0) {
            alert('No history found.');
            return;
        }

        // Remove existing modal
        const existing = document.getElementById('history-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'history-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = '#222';
        modal.style.padding = '20px';
        modal.style.border = '2px solid #fff';
        modal.style.zIndex = '1000';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';
        modal.style.fontFamily = 'monospace';
        modal.style.color = '#fff';
        modal.style.width = '400px';

        const title = document.createElement('h3');
        title.innerText = 'Autosave History (Last 10)';
        title.style.borderBottom = '1px solid #555';
        title.style.paddingBottom = '10px';
        modal.appendChild(title);

        // Reverse to show newest first
        [...history].reverse().forEach((entry, index) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '8px 0';
            row.style.borderBottom = '1px solid #333';

            const info = document.createElement('div');
            info.innerHTML = `<strong>${entry.dateStr}</strong><br><span style="color:#aaa">${entry.count} buildings</span>`;

            const btn = document.createElement('button');
            btn.innerText = 'Restore';
            btn.style.padding = '4px 8px';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = '#444';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.onclick = () => {
                if (confirm(`Restore version from ${entry.dateStr}? Current unsaved changes will be lost.`)) {
                    this._restoreFromData(entry.buildings);
                    modal.remove();
                }
            };

            row.appendChild(info);
            row.appendChild(btn);
            modal.appendChild(row);
        });

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Close';
        closeBtn.style.marginTop = '15px';
        closeBtn.style.padding = '8px 16px';
        closeBtn.style.width = '100%';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => modal.remove();
        modal.appendChild(closeBtn);

        document.body.appendChild(modal);
    }

    // ——— Delete ———

    _deleteHovered() {
        if (!this.hoveredBuilding) return;

        const bm = this.engine.buildingManager;
        const worldMap = this.engine.worldMap;
        const building = this.hoveredBuilding;
        const type = building.type;

        // Unregister from grid
        for (let x = building.tileX - type.w + 1; x <= building.tileX; x++) {
            for (let y = building.tileY - type.h + 1; y <= building.tileY; y++) {
                if (worldMap.getTileBuilding(x, y) === building) {
                    worldMap.setTileBuilding(null, x, y);
                }
            }
        }

        // Remove from array
        const idx = bm.buildings.indexOf(building);
        if (idx !== -1) bm.buildings.splice(idx, 1);

        worldMap.calculateDepths();

        // Push undo action
        this.undoStack.push({
            action: 'delete',
            typeIndex: building.typeIndex,
            tileX: building.tileX,
            tileY: building.tileY,
        });

        this.hoveredBuilding = null;
        console.log(`[PlacementTool] Deleted ${type.name} at (${building.tileX}, ${building.tileY})  [Ctrl+Z to undo]`);
        this._saveToLocalStorage();
    }

    // ——— Undo ———

    _undo() {
        if (this.undoStack.length === 0) {
            console.log('[PlacementTool] Nothing to undo');
            return;
        }

        const entry = this.undoStack.pop();
        const bm = this.engine.buildingManager;
        const worldMap = this.engine.worldMap;

        if (entry.action === 'place') {
            // Undo a placement → remove the building at that position
            const building = bm.buildings.find(b =>
                b.typeIndex === entry.typeIndex &&
                b.tileX === entry.tileX &&
                b.tileY === entry.tileY
            );
            if (building) {
                const type = building.type;
                for (let x = building.tileX - type.w + 1; x <= building.tileX; x++) {
                    for (let y = building.tileY - type.h + 1; y <= building.tileY; y++) {
                        if (worldMap.getTileBuilding(x, y) === building) {
                            worldMap.setTileBuilding(null, x, y);
                        }
                    }
                }
                const idx = bm.buildings.indexOf(building);
                if (idx !== -1) bm.buildings.splice(idx, 1);
                worldMap.calculateDepths();
                console.log(`[PlacementTool] Undo: removed ${type.name} from (${entry.tileX}, ${entry.tileY})`);
            }
            this._saveToLocalStorage();
        } else if (entry.action === 'delete') {
            // Undo a deletion → re-place the building
            bm._createBuilding(entry.typeIndex, entry.tileX, entry.tileY);
            worldMap.calculateDepths();
            const type = BUILDING_TYPES[entry.typeIndex];
            console.log(`[PlacementTool] Undo: restored ${type.name} at (${entry.tileX}, ${entry.tileY})`);
            this._saveToLocalStorage();
        }
    }

    // ——— Clear All ———

    _clearAll() {
        const bm = this.engine.buildingManager;
        const worldMap = this.engine.worldMap;

        // Push undo entries for every building (so Ctrl+Z restores them one by one)
        for (const b of bm.buildings) {
            this.undoStack.push({
                action: 'delete',
                typeIndex: b.typeIndex,
                tileX: b.tileX,
                tileY: b.tileY,
            });
        }

        for (const b of bm.buildings) {
            const type = b.type;
            for (let dy = 0; dy < type.h; dy++) {
                for (let dx = 0; dx < type.w; dx++) {
                    const tx = b.tileX - dx;
                    const ty = b.tileY - dy;
                    if (worldMap.getTileBuilding(tx, ty) === b) {
                        worldMap.setTileBuilding(null, tx, ty);
                    }
                }
            }
        }
        bm.buildings.length = 0;
        bm.destroyed.length = 0;
        worldMap.calculateDepths();
        console.log('[PlacementTool] Cleared all buildings (Ctrl+Z to undo one by one)');
        this._saveToLocalStorage();
    }

    // ——— Export ———

    _exportPlacements() {
        const bm = this.engine.buildingManager;
        const lines = [];
        lines.push('export const MAP_PLACEMENTS = [');

        for (const cat of this.categories) {
            const catBuildings = bm.buildings.filter(b =>
                b.typeIndex >= cat.start && b.typeIndex <= cat.end
            );
            if (catBuildings.length === 0) continue;

            catBuildings.sort((a, b) => (a.tileX + a.tileY) - (b.tileX + b.tileY));

            lines.push(`    // ——— ${cat.name} ———`);
            for (const b of catBuildings) {
                const type = BUILDING_TYPES[b.typeIndex];
                const xPad = b.tileX < 10 ? ' ' : '';
                const yPad = b.tileY < 10 ? ' ' : '';
                lines.push(`    { type: ${String(b.typeIndex).padStart(2)}, x: ${xPad}${b.tileX}, y: ${yPad}${b.tileY} },   // ${type.name}`);
            }
        }

        lines.push('];');

        const output = lines.join('\n');
        console.log('\n' + output + '\n');

        // Also copy to clipboard if possible
        if (navigator.clipboard) {
            navigator.clipboard.writeText(output).then(() => {
                console.log('[PlacementTool] ✓ Copied to clipboard! Paste into src/game/mapData.js');
            }).catch(() => {
                console.log('[PlacementTool] (clipboard copy failed, use console output)');
            });
        }

        // Show on screen for easier copying
        this._showExportModal(output);
    }

    _showExportModal(text) {
        // Remove existing modal if any
        const existing = document.getElementById('export-modal');
        if (existing) existing.remove();

        // Create container
        const modal = document.createElement('div');
        modal.id = 'export-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = '#222';
        modal.style.padding = '20px';
        modal.style.border = '2px solid #fff';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.gap = '10px';
        modal.style.boxShadow = '0 0 20px rgba(0,0,0,0.8)';

        // Title
        const title = document.createElement('h3');
        title.innerText = 'Map Export Data';
        title.style.color = '#fff';
        title.style.margin = '0';
        title.style.fontFamily = 'monospace';
        modal.appendChild(title);

        // Instruction
        const instr = document.createElement('p');
        instr.innerText = 'Copy the text below and paste it into the chat:';
        instr.style.color = '#aaa';
        instr.style.margin = '0';
        instr.style.fontSize = '14px';
        modal.appendChild(instr);

        // Textarea
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.width = '500px';
        textarea.style.height = '300px';
        textarea.style.backgroundColor = '#111';
        textarea.style.color = '#0f0';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '12px';
        textarea.style.border = '1px solid #444';
        textarea.style.whiteSpace = 'pre';
        modal.appendChild(textarea);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Close';
        closeBtn.style.padding = '8px 16px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.backgroundColor = '#444';
        closeBtn.style.color = '#fff';
        closeBtn.style.border = 'none';
        closeBtn.onclick = () => modal.remove();
        modal.appendChild(closeBtn);

        document.body.appendChild(modal);

        // Auto-select text
        textarea.select();
    }

    // ——— Update ———

    update() {
        if (!this.active) return;

        // Convert mouse position to tile coordinates (snapped to grid)
        const input = this.engine.inputHandler;
        const worldMap = this.engine.worldMap;
        const tile = worldMap.screenToTile(input.mouseX, input.mouseY);
        // Apply nudge (offset from mouse tile)
        this.tileX = tile.tileX + this.nudgeX;
        this.tileY = tile.tileY + this.nudgeY;

        // In delete mode, find building under cursor
        if (this.mode === MODE.DELETE) {
            this.hoveredBuilding = null;
            // 1. Try exact grid lookup
            let building = worldMap.getTileBuilding(this.tileX, this.tileY);

            // 2. If not on grid (e.g. off-map), scan all buildings
            if (!building) {
                const bm = this.engine.buildingManager;
                building = bm.buildings.find(b =>
                    this.tileX >= b.tileX - b.type.w + 1 && this.tileX <= b.tileX &&
                    this.tileY >= b.tileY - b.type.h + 1 && this.tileY <= b.tileY
                );
            }

            if (building) {
                this.hoveredBuilding = building;
            }
        }
    }

    // ——— Rendering ———

    render(ctx) {
        if (!this.active) return;

        if (this.mode === MODE.PLACE) {
            this._renderPlaceMode(ctx);
        } else if (this.mode === MODE.DELETE) {
            this._renderDeleteMode(ctx);
        }

        // Draw HUD
        this._renderHUD(ctx);
    }

    _renderPlaceMode(ctx) {
        const am = this.engine.assetManager;
        const worldMap = this.engine.worldMap;
        const input = this.engine.inputHandler;
        const type = BUILDING_TYPES[this.selectedType];

        // 1. Draw semi-transparent preview of selected building at snapped grid position
        const pos = worldMap.tileToSpritePos(this.tileX, this.tileY);
        const spriteId = type.media[0]; // intact sprite

        ctx.save();

        // Check for overlap — tint red if overlapping
        let hasOverlap = false;
        for (let dx = 0; dx < type.w; dx++) {
            for (let dy = 0; dy < type.h; dy++) {
                const tx = this.tileX - dx;
                const ty = this.tileY - dy;
                if (worldMap.getTileBuilding(tx, ty)) {
                    hasOverlap = true;
                    break;
                }
            }
            if (hasOverlap) break;
        }

        // Draw the building preview
        ctx.globalAlpha = 0.6;
        am.drawSprite(ctx, spriteId, pos.x, pos.y);

        // Red tint overlay if overlapping
        if (hasOverlap) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = 'red';
            const data = am.getData(spriteId);
            const img = am.getImage(spriteId);
            if (data && img) {
                ctx.fillRect(pos.x - data.regX, pos.y - data.regY, img.width, img.height);
            } else {
                ctx.fillRect(pos.x - 20, pos.y - 60, 60, 60);
            }
        }

        ctx.restore();

        // 2. Draw footprint outline on the isometric grid
        ctx.save();
        ctx.strokeStyle = hasOverlap ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 1.5;

        this._drawFootprint(ctx, worldMap, this.tileX, this.tileY, type.w, type.h);
        ctx.restore();

        // 3. Draw target crosshair at mouse position
        this._drawCrosshair(ctx, am, input);
    }

    _renderDeleteMode(ctx) {
        const am = this.engine.assetManager;
        const worldMap = this.engine.worldMap;
        const input = this.engine.inputHandler;

        // Highlight the hovered building
        if (this.hoveredBuilding) {
            const building = this.hoveredBuilding;
            const type = building.type;
            const pos = worldMap.tileToSpritePos(building.tileX, building.tileY);
            const spriteId = building.currentSpriteId;

            // Draw red tint over the building
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'rgba(255, 0, 0, 1)';
            const data = am.getData(spriteId);
            const img = am.getImage(spriteId);
            if (data && img) {
                ctx.fillRect(pos.x - data.regX, pos.y - data.regY, img.width, img.height);
            }
            ctx.restore();

            // Draw red footprint outline
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
            ctx.lineWidth = 2;
            this._drawFootprint(ctx, worldMap, building.tileX, building.tileY, type.w, type.h);
            ctx.restore();
        }

        // Draw delete cursor (X shape)
        ctx.save();
        const mx = input.mouseX;
        const my = input.mouseY;
        ctx.strokeStyle = this.hoveredBuilding ? 'rgba(255, 50, 50, 0.9)' : 'rgba(200, 200, 200, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(mx - 8, my - 8);
        ctx.lineTo(mx + 8, my + 8);
        ctx.moveTo(mx + 8, my - 8);
        ctx.lineTo(mx - 8, my + 8);
        ctx.stroke();
        // Circle around the X
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    _drawFootprint(ctx, worldMap, tileX, tileY, w, h) {
        for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
                const tx = tileX - dx;
                const ty = tileY - dy;
                const tpos = worldMap.tileToScreen(tx, ty);
                // tileToScreen already includes scrollX, don't add it again
                const sx = tpos.x;
                const sy = tpos.y;

                // Draw isometric diamond
                ctx.beginPath();
                ctx.moveTo(sx + 14, sy);       // top
                ctx.lineTo(sx + 28, sy + 7);   // right
                ctx.lineTo(sx + 14, sy + 14);  // bottom
                ctx.lineTo(sx, sy + 7);         // left
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    _drawCrosshair(ctx, am, input) {
        ctx.save();
        // In Placement tool, we just want to show the current crosshair state.
        // We can just query InputHandler to see if we are in cooldown.
        const canFire = input.canFire;
        const targetImg = am.getImage(canFire ? 'target_frame_001' : input.getCurrentTargetFrameId?.() || 'target_frame_001') || am.getImage('target-empty') || am.getImage('target-full');
        if (targetImg) {
            const size = 90; // Scale 1080x1080 frame down to crosshair size

            if (!canFire && targetImg.src && !targetImg.src.includes('001')) {
                // Dual-layer draw for cooldown:
                // 1. Draw the red cooldown animation frame at 50% transparency
                ctx.globalAlpha = 0.5;
                ctx.drawImage(
                    targetImg,
                    input.mouseX - size / 2,
                    input.mouseY - size / 2,
                    size, size
                );

                // 2. Draw the empty target frame (black outline) exactly on top at 100% opacity
                ctx.globalAlpha = 1.0;
                const emptyFrame = am.getImage('target_frame_001');
                if (emptyFrame) {
                    ctx.drawImage(
                        emptyFrame,
                        input.mouseX - size / 2,
                        input.mouseY - size / 2,
                        size, size
                    );
                }
            } else {
                ctx.drawImage(
                    targetImg,
                    input.mouseX - size / 2,
                    input.mouseY - size / 2,
                    size, size
                );
            }
        } else {
            // Fallback crosshair
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(input.mouseX, input.mouseY, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(input.mouseX - 16, input.mouseY);
            ctx.lineTo(input.mouseX - 6, input.mouseY);
            ctx.moveTo(input.mouseX + 6, input.mouseY);
            ctx.lineTo(input.mouseX + 16, input.mouseY);
            ctx.moveTo(input.mouseX, input.mouseY - 16);
            ctx.lineTo(input.mouseX, input.mouseY - 6);
            ctx.moveTo(input.mouseX, input.mouseY + 6);
            ctx.lineTo(input.mouseX, input.mouseY + 16);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderHUD(ctx) {
        ctx.save();

        const isDelete = this.mode === MODE.DELETE;
        const modeLabel = isDelete ? 'DELETE MODE' : 'PLACEMENT MODE';
        const modeColor = isDelete ? '#f44' : '#0f0';

        const hudW = 300;
        // Increase height to fit Nudge instructions
        const hudH = isDelete ? 82 : 100;
        const margin = 4;
        const input = this.engine.inputHandler;

        // Dynamic positioning: move HUD away from cursor
        // If cursor is in the top-left quadrant, draw HUD at top-right; otherwise top-left
        const cursorInHudArea = input.mouseX < hudW + margin * 2 + 30 && input.mouseY < hudH + margin * 2 + 30;
        const hudX = cursorInHudArea ? (SCREEN_W - hudW - margin) : margin;
        const hudY = margin;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(hudX, hudY, hudW, hudH);

        const textX = hudX + 6;

        // Line 1: Mode + tile coords
        ctx.fillStyle = modeColor;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${modeLabel}  Tile: (${this.tileX}, ${this.tileY})`, textX, hudY + 16);

        if (isDelete) {
            // Line 2: What's hovered
            ctx.fillStyle = '#ff0';
            if (this.hoveredBuilding) {
                const b = this.hoveredBuilding;
                ctx.fillText(`▶ ${b.type.name} at (${b.tileX}, ${b.tileY}) — click to delete`, textX, hudY + 34);
            } else {
                ctx.fillStyle = '#888';
                ctx.fillText('Hover over a building to highlight it', textX, hudY + 34);
            }

            // Line 3: Nudge info
            ctx.fillStyle = '#0ff'; // Cyan for nudge
            const nudgeText = (this.nudgeX || this.nudgeY) ? ` (Nudge: ${this.nudgeX},${this.nudgeY})` : '';
            ctx.fillText(`Arrows=nudge offset${nudgeText}`, textX, hudY + 48);

            // Line 4: Controls + undo
            ctx.fillStyle = '#888';
            ctx.font = '10px monospace';
            ctx.fillText(`P=place  Ctrl+Z=undo(${this.undoStack.length})  Esc=off`, textX, hudY + 62);

            // Line 5: Building count
            const count = this.engine.buildingManager.buildings.length;
            ctx.fillStyle = '#0f0';
            ctx.fillText(`Buildings: ${count}`, textX, hudY + 76);
        } else {
            // Line 2: Category and type
            const type = BUILDING_TYPES[this.selectedType];
            const cat = this.categories[this.categoryIndex];
            ctx.fillStyle = '#ff0';
            ctx.fillText(`[Tab] ${cat.name}  [${this.selectedType}] ${type.name}`, textX, hudY + 34);

            // Line 3: Size info
            ctx.fillStyle = '#aaa';
            ctx.fillText(`Size: ${type.w}×${type.h}  ${type.tall ? 'TALL' : 'short'}`, textX, hudY + 50);

            // Line 4: Nudge info
            ctx.fillStyle = '#0ff'; // Cyan for nudge
            const nudgeText = (this.nudgeX || this.nudgeY) ? ` (Nudge: ${this.nudgeX},${this.nudgeY})` : '';
            ctx.fillText(`Arrows=nudge offset${nudgeText}`, textX, hudY + 64);

            // Line 5: Controls
            ctx.fillText(`Q=cycle  Click=place  D=del mode  Ctrl+Z=undo(${this.undoStack.length})  E=export`, textX, hudY + 78);

            // Line 6: File I/O & History
            ctx.fillStyle = '#0ff';
            ctx.fillText(`K=save (file)  L=load (file)  H=history (autosave)`, textX, hudY + 92);

            // Line 7: Building count
            const count = this.engine.buildingManager.buildings.length;
            ctx.fillStyle = '#0f0';
            ctx.fillText(`Buildings: ${count}`, textX, hudY + 106);
        }

        ctx.restore();
    }
}
