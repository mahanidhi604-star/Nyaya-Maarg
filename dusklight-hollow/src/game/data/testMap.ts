/**
 * Dusklight Hollow - Test village map data
 *
 * A small 40 x 25 tile map (640 x 400 px) with two layers:
 *   ground - walkable terrain (grass, paths, water, sand)
 *   detail - objects on top (walls, roofs, trees, doors, fences, lamps)
 *
 * Tile indices match constants.ts TILES enum.
 * -1 = empty (transparent on the detail layer).
 */

import { TILES } from '../constants';

const _ = TILES.EMPTY;
const G = TILES.GRASS;
const A = TILES.GRASS_ALT;
const P = TILES.PATH;
const S = TILES.STONE;
const W = TILES.WATER;
const D = TILES.WATER_DEEP;
const N = TILES.SAND;
const B = TILES.WALL;
const T = TILES.WALL_TOP;
const R = TILES.ROOF;
const O = TILES.DOOR;
const K = TILES.TREE_TRUNK;
const C = TILES.TREE_CANOPY;
const F = TILES.FLOWERS;
const E = TILES.FENCE;
const L = TILES.LAMP_POST;

// prettier-ignore
export const GROUND_LAYER: number[][] = [
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
  [ G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 0
  [ G, G, A, G, G, G, G, G, G, G, G, A, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, A, G, G, G, G], // 1
  [ G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 2
  [ G, G, G, G, S, S, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G, G, S, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G], // 3
  [ G, G, G, G, S, S, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G, G, S, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G], // 4
  [ G, G, G, G, S, S, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G, G, S, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G], // 5
  [ G, G, G, G, S, S, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G, G, S, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G], // 6
  [ G, A, G, G, G, G, P, G, G, G, G, G, G, G, G, G, A, G, G, G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, A, G, G], // 7
  [ P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P], // 8
  [ G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 9
  [ G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 10
  [ G, G, A, G, G, G, P, G, G, G, G, G, A, G, G, G, G, G, G, G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, A, G, G, G], // 11
  [ G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 12
  [ G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, G, G, N, N, N, N, N, N, N, N, N, G, G, G], // 13
  [ G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, G, N, N, W, W, W, W, W, W, N, N, G, G, G], // 14
  [ G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, P, N, W, W, D, D, D, W, W, N, G, G, G, G], // 15
  [ G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, N, W, D, D, D, D, D, W, N, G, G, G, G], // 16
  [ G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, N, W, W, D, D, D, W, W, N, G, G, G, G], // 17
  [ G, G, A, G, G, G, P, G, G, G, G, G, G, A, G, G, G, G, G, G, G, G, G, G, G, G, G, N, N, W, W, W, W, W, N, N, G, G, G, G], // 18
  [ G, G, G, G, G, G, P, P, P, P, P, P, P, P, P, P, P, P, P, G, G, G, G, G, G, G, G, G, N, N, N, N, N, N, N, G, G, G, G, G], // 19
  [ G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 20
  [ G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, G, G, G, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G, A, G], // 21
  [ G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, P, P, P, P, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 22
  [ G, G, G, A, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, S, S, S, S, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 23
  [ G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G], // 24
];

// Detail layer: objects placed on top of the ground.
// -1 means nothing on this tile.
// prettier-ignore
export const DETAIL_LAYER: number[][] = [
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
  [ C, C, C, C, _, _, _, _, _, _, _, _, C, C, _, _, _, _, _, C, C, _, _, _, _, _, _, _, _, _, _, _, _, _, C, C, C, _, C, C], // 0
  [ K, C, K, _, _, _, _, _, _, _, _, _, K, _, _, _, _, _, _, K, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, K, _, _, K, K], // 1
  [ _, K, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 2
  [ _, _, _, _, R, R, R, R, R, R, _, _, _, _, _, _, _, _, _, _, _, _, _, R, R, R, R, R, _, _, _, _, _, _, _, _, _, _, _, _], // 3
  [ _, _, _, _, B, B, B, B, B, B, _, _, _, _, _, _, _, _, _, _, _, _, _, B, B, B, B, B, _, _, _, _, _, _, _, _, _, _, _, _], // 4
  [ _, _, _, _, B, _, _, _, _, B, _, _, _, _, _, _, _, _, _, _, _, _, _, B, _, _, _, B, _, _, _, _, _, _, _, _, _, _, _, _], // 5
  [ _, _, _, _, B, _, _, O, _, B, _, _, _, _, _, _, _, _, _, _, _, _, _, B, _, O, _, B, _, _, _, _, _, _, _, _, _, _, _, _], // 6
  [ _, _, _, _, E, _, _, _, _, E, _, _, _, _, _, L, _, _, _, _, _, _, _, E, _, _, _, E, _, _, _, _, _, _, _, _, _, _, _, _], // 7
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 8
  [ _, _, _, _, _, _, _, _, _, _, F, _, F, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 9
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 10
  [ _, _, _, _, _, _, _, _, _, _, _, F, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 11
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 12
  [ C, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, C, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, C], // 13
  [ K, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, K, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, K], // 14
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 15
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 16
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 17
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 18
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, L, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 19
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 20
  [ _, _, C, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, R, R, R, R, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 21
  [ _, _, K, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, B, B, B, B, _, _, _, _, _, _, _, _, _, _, _, _, _, _], // 22
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, B, _, O, B, _, _, _, _, _, _, C, C, _, _, _, _, _, _], // 23
  [ _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, E, _, _, E, _, _, _, _, _, _, K, K, _, _, _, _, _, _], // 24
];

export const MAP_WIDTH = GROUND_LAYER[0].length;  // 40
export const MAP_HEIGHT = GROUND_LAYER.length;     // 25

/** Player start position (tile coords) */
export const PLAYER_START_X = 6;
export const PLAYER_START_Y = 10;

