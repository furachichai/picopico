/**
 * Entity.js — Base class for all game characters (Person behavior)
 * Source: 2_6.ls (Person Class Behavior)
 *
 * Grid-based movement with tile stepping, 4-directional facing,
 * obstacle avoidance, mourning, death, and terrorist conversion states.
 */

import {
    STATE, DIR, MOVE_PARTS, MAP_WIDTH, MAP_HEIGHT,
    WAIT_DEAD, WAIT_RANDOM_DEAD, WAIT_MOURN, FPS, ISO_TILE_W, ISO_TILE_H,
} from '../constants.js';

let _nextId = 0;

export class Entity {
    constructor(tileX, tileY, worldMap) {
        this.id = _nextId++;
        this.type = 'entity'; // overridden by subclasses

        // Logical tile position
        this.tileX = tileX;
        this.tileY = tileY;

        // Depth sorting position (updates later than logical position for N/W moves)
        this.depthX = tileX;
        this.depthY = tileY;

        // Isometric world coordinates (sub-tile precision for smooth movement)
        this.isoX = tileX * ISO_TILE_W;
        this.isoZ = -tileY * ISO_TILE_H;

        // Screen position (computed from iso coords)
        this.screenX = 0;
        this.screenY = 0;

        // Movement state
        this.state = STATE.STOP;
        this.stateGoto = DIR.NORTH; // current movement direction
        this.stateAnim = -1;        // current animation direction
        this.destX = tileX;
        this.destY = tileY;
        this.futDestX = tileX;
        this.futDestY = tileY;
        this.avoidDir = 1;          // +1 or -1 for obstacle avoidance

        // Movement timing
        this.parts = MOVE_PARTS;    // sub-steps per tile move
        this.wait = 0;              // frame countdown for current action
        this.depthNotYet = false;

        // Mourning
        this.goToMourn = false;
        this.mournFacing = 0;
        this.changeDest = false;

        // Undo evil
        this.undoEvil = false;
        this.prevMedia = null;     // remembered civilian media for undo-evil

        // Animation
        this.frameStart = 1;
        this.frameStop = 8;
        this.currentFrame = 0;
        this.animWait = 0;          // throttle animation speed
        this.animInfo = null;       // { crystart, crylength, turnstart, turnlength, deathstart }

        // Death
        this.deadWait = 0;
        this.shouldRemove = false;
        this.opacity = 1;

        // Flip tracking
        this.kludge = false;
        this.kludge2 = false;

        // Update screen position
        this._updateScreenPos(worldMap);
    }

    _updateScreenPos(worldMap) {
        if (worldMap) {
            const pos = worldMap.tileToSpritePos(this.tileX, this.tileY);
            // But for smooth movement we use isoX/isoZ interpolation
            const smoothPos = worldMap.mapToScreen(this.isoX, 0, this.isoZ);
            this.screenX = smoothPos.x + 10 + 1; // offset like PutFilmLoopOnScreen
            this.screenY = smoothPos.y + 10;
        }
    }

    // ——— Movement commands ———

    goTo(destX, destY) {
        this.state = STATE.GOTO;
        this.destX = destX;
        this.destY = destY;
        this.wait = this.parts;
        this.processGrid(null); // will be called with worldMap in update
    }

    goToMournPos(destX, destY, facing) {
        this.goToMourn = true;
        this.changeDest = true;
        this.futDestX = destX;
        this.futDestY = destY;
        this.mournFacing = facing;
    }

    startUndoEvil() {
        this.undoEvil = true;
        this.changeDest = true;
        this.futDestX = this.tileX;
        this.futDestY = this.tileY;
    }

    // ——— Grid-based movement (from 2_6.ls) ———

    moveHoriz(worldMap) {
        if (this.tileX > this.destX) {
            if (worldMap.posNotEmpty(this.tileX - 1, this.tileY)) return false;
            this.tileX--;
            // Moving WEST (backwards visually): Keep old depth until halfway
            // this.depthX remains old value
            this.stateGoto = DIR.WEST;
            this.setAnim(DIR.WEST);
            return true;
        }
        if (this.tileX < this.destX) {
            if (worldMap.posNotEmpty(this.tileX + 1, this.tileY)) return false;
            this.tileX++;
            // Moving EAST (forwards visually): Update depth immediately to pop in front
            this.depthX = this.tileX;
            this.stateGoto = DIR.EAST;
            this.setAnim(DIR.EAST);
            return true;
        }
        return true; // already there
    }

    moveVert(worldMap) {
        if (this.tileY > this.destY) {
            if (worldMap.posNotEmpty(this.tileX, this.tileY - 1)) return false;
            this.tileY--;
            // Moving NORTH (backwards visually): Keep old depth until halfway
            // this.depthY remains old value
            this.stateGoto = DIR.NORTH;
            this.setAnim(DIR.NORTH);
            return true;
        }
        if (this.tileY < this.destY) {
            if (worldMap.posNotEmpty(this.tileX, this.tileY + 1)) return false;
            this.tileY++;
            // Moving SOUTH (forwards visually): Update depth immediately
            this.depthY = this.tileY;
            this.stateGoto = DIR.SOUTH;
            this.setAnim(DIR.SOUTH);
            return true;
        }
        return true;
    }

    avoidHoriz(worldMap) {
        if (!this.moveVert(worldMap)) {
            // Can't move vertical (goal), try avoiding horizontally
            if (worldMap.posNotEmpty(this.tileX + this.avoidDir, this.tileY)) {
                // Horizontal path also blocked! Try opposite or stop
                this.tileX -= this.avoidDir; // reverse if we blindly added (but wait, we didn't add yet)
                // Actually, check before adding.
                // Wait, logic above was this.tileX += ...

                // If blocked, pick new destination
                this.state = STATE.STOP;
                this.processGrid(worldMap); // pick new target
            } else {
                this.tileX += this.avoidDir;
                this.tileX = Math.max(0, Math.min(MAP_WIDTH - 1, this.tileX));
                this.stateGoto = this.avoidDir === 1 ? DIR.EAST : DIR.WEST;
                this.setAnim(this.stateGoto);
            }
        } else {
            this.state = STATE.GOTO;
        }
    }

    avoidVert(worldMap) {
        if (!this.moveHoriz(worldMap)) {
            if (worldMap.posNotEmpty(this.tileX, this.tileY + this.avoidDir)) {
                // Vertical path also blocked! Pick new destination
                this.state = STATE.STOP;
                this.processGrid(worldMap);
            } else {
                this.tileY += this.avoidDir;
                this.tileY = Math.max(0, Math.min(MAP_HEIGHT - 1, this.tileY));
                this.stateGoto = this.avoidDir === 1 ? DIR.SOUTH : DIR.NORTH;
                this.setAnim(this.stateGoto);
            }
        } else {
            this.state = STATE.GOTO;
        }
    }

    processGrid(worldMap) {
        switch (this.state) {
            case STATE.STOP:
                if (worldMap) {
                    const tile = worldMap.randTileOnMap();
                    this.destX = tile.tileX;
                    this.destY = tile.tileY;
                    this.state = STATE.GOTO;
                    this.wait = this.parts;
                }
                break;
            case STATE.GOTO:
                if (worldMap) this.changeTile(worldMap);
                break;
            case STATE.AVOID_HORIZ:
                if (worldMap) this.avoidHoriz(worldMap);
                break;
            case STATE.AVOID_VERT:
                if (worldMap) this.avoidVert(worldMap);
                break;
        }
    }

    changeTile(worldMap) {
        if (this.changeDest) {
            this.changeDest = false;
            this.destX = this.futDestX;
            this.destY = this.futDestY;
            if (!this.undoEvil) {
                this.parts = Math.max(3, Math.floor(this.parts / 2)); // move faster to mourn
            }
        }

        if (this.tileX === this.destX && this.tileY === this.destY) {
            // Arrived at destination
            if (this.goToMourn) {
                this.state = STATE.MOURN;
                this.parts = Math.min(MOVE_PARTS, this.parts * 2);
                this.setAnim(DIR.CRY_NORTH + this.mournFacing);
                this.deadWait = WAIT_MOURN * FPS;
            } else if (this.undoEvil) {
                this.state = STATE.TURN;
                this.kludge = true;
            } else {
                this.state = STATE.STOP;
                this.processGrid(worldMap);
            }
        } else {
            // Navigate toward destination
            if (this.tileX === this.destX) {
                if (!this.moveVert(worldMap)) {
                    this.state = STATE.AVOID_HORIZ;
                    this.avoidDir = Math.random() < 0.5 ? 1 : -1;
                    this.avoidHoriz(worldMap);
                }
            } else if (this.tileY === this.destY) {
                if (!this.moveHoriz(worldMap)) {
                    this.state = STATE.AVOID_VERT;
                    this.avoidDir = this.tileY < this.destY ? 1 : -1;
                    this.avoidVert(worldMap);
                }
            } else {
                if (Math.random() < 0.5) {
                    if (!this.moveVert(worldMap)) {
                        this.state = STATE.AVOID_HORIZ;
                        this.avoidDir = this.tileX < this.destX ? 1 : -1;
                        this.avoidHoriz(worldMap);
                    }
                } else {
                    if (!this.moveHoriz(worldMap)) {
                        this.state = STATE.AVOID_VERT;
                        this.avoidDir = Math.random() < 0.5 ? 1 : -1;
                        this.avoidVert(worldMap);
                    }
                }
            }
        }
    }

    // ——— Smooth sub-tile movement (from 2_6.ls mMove) ———

    move(worldMap) {
        if (!this.depthNotYet && this.wait <= this.parts / 2) {
            this.depthNotYet = true;
            // Mid-move depth update for N/W movement
            this.depthX = this.tileX;
            this.depthY = this.tileY;
        }

        if (this.wait - 1 === 0) {
            // Snap to tile
            this.isoX = this.tileX * ISO_TILE_W;
            this.isoZ = -this.tileY * ISO_TILE_H;
            this.depthNotYet = false;
        } else {
            // Interpolate
            const step = 1; // per frame
            switch (this.stateGoto) {
                case DIR.NORTH:
                    this.isoZ += ISO_TILE_H / this.parts;
                    break;
                case DIR.SOUTH:
                    this.isoZ -= ISO_TILE_H / this.parts;
                    break;
                case DIR.WEST:
                    this.isoX -= ISO_TILE_W / this.parts;
                    break;
                case DIR.EAST:
                    this.isoX += ISO_TILE_W / this.parts;
                    break;
            }
        }

        this._updateScreenPos(worldMap);
        this.wait--;
    }

    // ——— Animation (from 2_6.ls mSetAnim) ———
    // Calculates frame range based on direction and animation info

    setAnim(dir) {
        if (this.stateAnim === dir) return;
        this.stateAnim = dir;

        if (!this.animInfo) return;

        if (dir < DIR.CRY_NORTH) {
            // Walking: 8 frames per direction
            this.frameStart = dir * 8;
            this.frameStop = this.frameStart + 7;
            this.currentFrame = this.frameStart + Math.floor(Math.random() * 8);
        } else if (dir < DIR.TURN_NORTH) {
            // Crying
            if (this.animInfo.crystart !== undefined) {
                this.frameStart = this.animInfo.crystart + (dir - DIR.CRY_NORTH) * this.animInfo.crylength;
                this.frameStop = this.frameStart + this.animInfo.crylength - 1;
                this.currentFrame = this.frameStart;
            }
        } else if (dir < DIR.DEAD) {
            // Turning (converting to terrorist)
            if (this.animInfo.turnstart !== undefined) {
                this.frameStart = this.animInfo.turnstart + (dir - DIR.TURN_NORTH) * this.animInfo.turnlength;
                this.frameStop = this.frameStart + this.animInfo.turnlength - 1;
                this.currentFrame = this.frameStart;
            }
        } else if (dir === DIR.DEAD) {
            // Death
            if (this.animInfo.deathstart !== undefined) {
                this.frameStart = this.animInfo.deathstart + Math.floor(Math.random() * 4);
                this.frameStop = this.frameStart;
                this.currentFrame = this.frameStart;
            }
        }
    }

    // ——— State checks ———

    isAlive() {
        return this.state !== STATE.DEAD;
    }

    cantMourn() {
        return this.state === STATE.DEAD || this.goToMourn ||
            this.state === STATE.MOURN || this.state === STATE.TURN || this.undoEvil;
    }

    // ——— Kill ———

    die(tileX, tileY, worldMap) {
        this.tileX = tileX;
        this.tileY = tileY;
        this.state = STATE.DEAD;
        this.deadWait = (WAIT_DEAD * FPS) + Math.floor(Math.random() * WAIT_RANDOM_DEAD * FPS);
        this.isoX = tileX * ISO_TILE_W;
        this.isoZ = -tileY * ISO_TILE_H;
        this.setAnim(DIR.DEAD);
        if (worldMap) {
            const pos = worldMap.tileToDeadPos(tileX, tileY);
            this.screenX = pos.x;
            this.screenY = pos.y;
        }
    }

    // ——— Per-frame update (from 2_6.ls exitFrame) ———

    update(worldMap) {
        if (this.state === STATE.DEAD) {
            // Ensure screen position updates with scroll
            if (worldMap) {
                const pos = worldMap.tileToDeadPos(this.tileX, this.tileY);
                this.screenX = pos.x;
                this.screenY = pos.y;
            }

            if (this.deadWait <= 0) {
                this.shouldRemove = true;
            } else {
                this.deadWait--;
                // Fade out near the end
                if (this.deadWait < FPS * 3) {
                    this.opacity = this.deadWait / (FPS * 3);
                }
            }
        } else if (this.state === STATE.MOURN) {
            // Position update for scrolling
            if (worldMap) this._updateScreenPos(worldMap);

            if (this.deadWait <= 0) {
                this.goToMourn = false;
                this.state = STATE.TURN;
                // Start turn animation
                if (this.stateAnim >= DIR.CRY_NORTH && this.stateAnim <= DIR.CRY_EAST) {
                    this.setAnim(this.stateAnim + 4); // CRY_X → TURN_X
                }
                // Initialize turn flash state if subclass supports it
                if (typeof this._startTurn === 'function') {
                    this._startTurn();
                }
            } else {
                this.deadWait--;
            }
        } else if (this.state === STATE.TURN) {
            // Position update for scrolling
            if (worldMap) this._updateScreenPos(worldMap);
        } else if (this.state !== STATE.TURN) {
            // Walking / avoiding
            if (this.state !== STATE.STOP) {
                this.move(worldMap);
            } else {
                // Even if stopped, update pos for scroll
                if (worldMap) this._updateScreenPos(worldMap);
            }
            if (this.wait <= 0) {
                this.wait = this.parts;
                this.processGrid(worldMap);
            }
        }

        // Animation frame advancement
        this._advanceFrame();
    }

    _advanceFrame() {
        // Throttle animation to match original speed (48 FPS / 3 = 16 FPS)
        this.animWait++;
        if (this.animWait < 3) return;
        this.animWait = 0;

        if (this.kludge2) {
            this.kludge2 = false;
            if (this.stateAnim >= DIR.CRY_NORTH) {
                this.setAnim(this.stateAnim + 8);
            }
            return;
        }

        if (this.kludge) {
            this.kludge = false;
            this.kludge2 = true;
            // Frame loop check
            if (this.currentFrame >= this.frameStop) {
                this.currentFrame = this.frameStart;
            }
            // This is where UndoEvil callback would happen
            this._onUndoEvil();
            return;
        }

        if (this.state !== STATE.TURN) {
            // Normal frame loop
            if (this.currentFrame >= this.frameStop) {
                this.currentFrame = this.frameStart;
            } else {
                this.currentFrame++;
            }
        } else {
            // Turn animation: play once then transition
            if (this.currentFrame >= this.frameStop) {
                this.state = STATE.STOP;
                if (this.undoEvil) {
                    this.wait = 0;
                    this.undoEvil = false;
                    this._onUndoEvilComplete();
                } else {
                    this._onTurnComplete();
                }
            } else {
                this.currentFrame++;
            }
        }
    }

    // Override in subclasses
    _onUndoEvil() { }
    _onUndoEvilComplete() { }
    _onTurnComplete() { }

    // ——— Rendering ———

    render(ctx, assetManager) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        this._drawCharacter(ctx, assetManager);

        ctx.restore();
    }

    _drawCharacter(ctx, assetManager) {
        // Override in subclasses
    }

    // ——— Utility ———

    distanceTo(other) {
        return Math.abs(this.tileX - other.tileX) + Math.abs(this.tileY - other.tileY);
    }

    distanceToTile(tx, ty) {
        return Math.abs(this.tileX - tx) + Math.abs(this.tileY - ty);
    }
}
