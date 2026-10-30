/**
 * Dusklight Hollow - Game constants
 * All magic numbers live here so nothing is scattered across scenes.
 */

// ----- Resolution and scaling -----
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;
export const TILE_SIZE = 16;

// ----- Hollow-16 palette -----
export const PALETTE = {
  MIDNIGHT_INK:  0x14172B,
  DUSK_INDIGO:   0x232850,
  TWILIGHT_BLUE: 0x3B4A8C,
  MIST_BLUE:     0x8FC1E3,
  FOG:           0xCFE0DC,
  SNOW:          0xF5FAFA,
  PEBBLE:        0x9AA7B8,
  LAKE_TEAL:     0x286F76,
  REED:          0x5BB5A2,
  MOSS:          0x7BAA52,
  PINE:          0x3E6B3A,
  AMBER:         0xF4B942,
  CORAL:         0xF07F5A,
  BRICK:         0xA8452F,
  HEATHER:       0xB58AC4,
  DRIFTWOOD:     0x6B4A3A,
} as const;

// Same palette as CSS hex strings for text styling
export const PALETTE_CSS = {
  MIDNIGHT_INK:  '#14172B',
  DUSK_INDIGO:   '#232850',
  TWILIGHT_BLUE: '#3B4A8C',
  MIST_BLUE:     '#8FC1E3',
  FOG:           '#CFE0DC',
  SNOW:          '#F5FAFA',
  PEBBLE:        '#9AA7B8',
  LAKE_TEAL:     '#286F76',
  REED:          '#5BB5A2',
  MOSS:          '#7BAA52',
  PINE:          '#3E6B3A',
  AMBER:         '#F4B942',
  CORAL:         '#F07F5A',
  BRICK:         '#A8452F',
  HEATHER:       '#B58AC4',
  DRIFTWOOD:     '#6B4A3A',
} as const;

// ----- Tile indices (match the generated tileset) -----
export const TILES = {
  EMPTY:       -1,
  GRASS:        0,
  GRASS_ALT:    1,
  PATH:         2,
  STONE:        3,
  WATER:        4,
  WATER_DEEP:   5,
  SAND:         6,
  WALL:         7,
  WALL_TOP:     8,
  ROOF:         9,
  DOOR:        10,
  TREE_TRUNK:  11,
  TREE_CANOPY: 12,
  FLOWERS:     13,
  FENCE:       14,
  LAMP_POST:   15,
} as const;

// Tiles that block walking
export const COLLISION_TILES = [
  TILES.WATER,
  TILES.WATER_DEEP,
  TILES.WALL,
  TILES.WALL_TOP,
  TILES.ROOF,
  TILES.TREE_TRUNK,
  TILES.TREE_CANOPY,
  TILES.FENCE,
];

// ----- Player -----
export const PLAYER_SPEED = 64;         // pixels per second
export const PLAYER_SPRITE_W = 16;
export const PLAYER_SPRITE_H = 24;
export const PLAYER_BODY_W = 10;        // collision body width
export const PLAYER_BODY_H = 8;         // collision body height
export const PLAYER_BODY_OFFSET_X = 3;  // body offset from top-left
export const PLAYER_BODY_OFFSET_Y = 16; // feet area

// ----- Camera -----
export const CAMERA_DEADZONE_W = 32;
export const CAMERA_DEADZONE_H = 24;

// ----- Direction indices for spritesheet rows -----
export enum Direction {
  DOWN  = 0,
  LEFT  = 1,
  RIGHT = 2,
  UP    = 3,
}

