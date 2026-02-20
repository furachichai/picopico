/**
 * constants.js — All game constants extracted from original Lingo CreateGlobalVar()
 * Source: 2_1.ls
 */

// Screen / viewport
export const SCREEN_W = 640;
export const SCREEN_H = 480;
export const FPS = 48; // increased for smooth movement (was 16)

// Logical map grid
export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 120;
export const MAP_PIXEL_W = 1280;
export const MAP_PIXEL_H = 640;

// Tile sizes
export const TILE_W = 20;
export const TILE_H = 10;
export const ISO_TILE_W = 14;
export const ISO_TILE_H = 14;

// Iso origin (where tile 0,0 maps to in screen space)
export const ISO_START_X = (SCREEN_W / 2) - (ISO_TILE_W / 2); // 313
export const ISO_START_Y = -325;

// People
export const MAX_PEOPLE = 100;
export const START_PEOPLE = 100;
export const EVIL_MIN = 10;
export const EVIL_PER_DEATH = 4;           // mourners per dead civilian
export const EVIL_REGENERATION = 40;       // % chance killed terrorist respawns as terrorist
export const GENERATION_RATIO = 1;         // seconds between new people spawns
export const RAND_GENERATION_RATIO = 1;    // random extra seconds
export const PEOPLE_ANIM_LENGTH = 7;       // 8 frames (0-7), 8 per direction

// People spawn probabilities (out of 100)
export const PROB_WOMAN = 40;
export const PROB_KID = 25;
export const PROB_DOG = 5;
// Man is the fallback

// Mourning / death
export const MOURN_DISTANCE = 25;          // tiles
export const DISTANCE_FROM_DEAD = 2;       // tiles offset for mourn spot
export const WAIT_DEAD = 30;               // seconds before dead body removed
export const WAIT_RANDOM_DEAD = 2;         // random extra seconds
export const WAIT_MOURN = 3;               // seconds of mourning

// Undo evil (passive terrorist reduction when idle)
export const WAIT_UNDO_EVIL = 90;          // seconds
export const UNDO_EVIL_PEOPLE = 3;         // base amount to convert back

// Blast / explosion
export const BLAST_X = 2;                  // half-width of blast grid
export const BLAST_Y = 2;
export const BLAST_DAMAGE = 5;             // center damage
export const BLAST_DECREMENT = 1;          // damage decrease per ring

// Building health
export const BUILDING_HEALTH_RECOVERY = 10;
export const BUILDING_HEALTH_RECOVERY_TIME = 30; // seconds

// Scrolling
export const SCROLL_HORIZ = 100;           // px from edge to trigger scroll
export const SCROLL_STEP = 10;             // px per frame scroll

// Movement sub-steps per tile
export const MOVE_PARTS = 18; // scaled for 48 FPS (was 6)

// Entity states
export const STATE = {
    STOP: 0,
    GOTO: 1,
    AVOID_HORIZ: 2,
    AVOID_VERT: 3,
    MOURN: 4,
    DEAD: 5,
    TURN: 6,
};

// Facing directions
export const DIR = {
    NORTH: 0,
    SOUTH: 1,
    WEST: 2,
    EAST: 3,
    CRY_NORTH: 4,
    CRY_SOUTH: 5,
    CRY_WEST: 6,
    CRY_EAST: 7,
    TURN_NORTH: 8,
    TURN_SOUTH: 9,
    TURN_WEST: 10,
    TURN_EAST: 11,
    DEAD: 12,
};

// People type enum
export const PERSON_TYPE = {
    WOMAN: 1,
    KID: 2,
    DOG: 3,
    MAN: 4,
    EVIL: 5,
};

// Building destruction stage types
export const DESTRUCTION = {
    THREE: 1,   // 3 stages (intact → damaged → destroyed)
    FOUR: 2,    // 4 stages (tall buildings: intact → light damage → heavy damage → destroyed)
};

// Spawn modes
export const SPAWN_MODE = {
    ON_SCREEN: 0,
    OFF_SCREEN: 1,
    ON_OR_OFF: 2,
};

// Game states
export const GAME_STATE = {
    LOADING: 'loading',
    TITLE: 'title',
    PLAYING: 'playing',
};
