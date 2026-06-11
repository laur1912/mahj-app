/**
 * Wall + dealing — pure game logic, no UI.
 * Place this file in src/game/ alongside mahjong-data-model.ts.
 */

import { buildTileSet, type Tile } from './mahjong-data-model';

/** Fisher-Yates shuffle. Returns a NEW array; does not mutate the input. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Deal {
  hand: Tile[]; // the tiles dealt to you
  wall: Tile[]; // the remaining tiles, face-down, to draw from
}

/** Shuffle a fresh 152-tile set and deal `handSize` tiles; the rest is the wall. */
export function newDeal(handSize = 13): Deal {
  const shuffled = shuffle(buildTileSet());
  return {
    hand: shuffled.slice(0, handSize),
    wall: shuffled.slice(handSize),
  };
}