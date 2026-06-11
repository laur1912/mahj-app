/**
 * GAME ENGINE — one 4-player game, pure logic (no UI, no network).
 *
 * A turn is simple here: the current player DRAWS one tile from the wall, then
 * DISCARDS one. Play then passes to the next seat. A player may DECLARE MAHJONG
 * while holding 14 tiles (right after drawing) if those tiles complete a hand
 * on the card.
 *
 * The Charleston and calling/exposing other players' discards come in the next
 * step. This file is the basic draw -> discard -> win loop, built as a reducer:
 * applyAction(state, action) returns a brand-new state and never mutates input.
 *
 * Place this file in src/game/ alongside the other game files.
 */

import { shuffle } from './wall';
import { buildTileSet, type Tile, type HandLine } from './mahjong-data-model';
import { findWinningHand, type MatchResult } from './matcher';

export interface Player {
  id: number;
  name: string;
  hand: Tile[];
}

export type Phase = 'playing' | 'won' | 'exhausted';

export interface GameState {
  players: Player[]; // always 4
  wall: Tile[]; // face-down draw pile
  discards: Tile[]; // thrown-away tiles, most recent last
  turn: number; // whose turn it is (0-3)
  awaitingDiscard: boolean; // true after a draw: current player must now discard
  lastDrawnId: string | null; // id of the tile just drawn (for highlighting)
  phase: Phase;
  winner: number | null;
  winningHand: HandLine | null;
  card: HandLine[];
}

export type Action =
  | { type: 'draw' }
  | { type: 'discard'; tileId: string }
  | { type: 'declareWin' };

/** Deal a fresh game: 13 tiles to each of the 4 players; the rest is the wall. */
export function createGame(card: HandLine[]): GameState {
  let deck = shuffle(buildTileSet());
  const players: Player[] = [];
  for (let i = 0; i < 4; i += 1) {
    players.push({ id: i, name: `Player ${i + 1}`, hand: deck.slice(0, 13) });
    deck = deck.slice(13);
  }
  return {
    players,
    wall: deck, // 152 - 52 = 100 tiles
    discards: [],
    turn: 0,
    awaitingDiscard: false,
    lastDrawnId: null,
    phase: 'playing',
    winner: null,
    winningHand: null,
    card,
  };
}

/** Is the current player holding a winning 14-tile hand right now? */
export function winCheck(s: GameState): MatchResult | null {
  if (s.phase !== 'playing' || !s.awaitingDiscard) return null;
  const found = findWinningHand(s.players[s.turn].hand, s.card);
  return found ? found.result : null;
}

/** Apply an action and return the next state (never mutates the input). */
export function applyAction(s: GameState, a: Action): GameState {
  if (s.phase !== 'playing') return s;

  switch (a.type) {
    case 'draw': {
      if (s.awaitingDiscard) return s; // already drew this turn
      if (s.wall.length === 0) return { ...s, phase: 'exhausted' };
      const [tile, ...rest] = s.wall;
      return {
        ...s,
        wall: rest,
        players: s.players.map((p, i) =>
          i === s.turn ? { ...p, hand: [...p.hand, tile] } : p,
        ),
        awaitingDiscard: true,
        lastDrawnId: tile.id,
      };
    }

    case 'discard': {
      if (!s.awaitingDiscard) return s; // must draw before discarding
      const cur = s.players[s.turn];
      const idx = cur.hand.findIndex((t) => t.id === a.tileId);
      if (idx === -1) return s; // tile not in hand
      const tile = cur.hand[idx];
      const newHand = cur.hand.filter((_, i) => i !== idx);
      return {
        ...s,
        players: s.players.map((p, i) => (i === s.turn ? { ...p, hand: newHand } : p)),
        discards: [...s.discards, tile],
        turn: (s.turn + 1) % 4,
        awaitingDiscard: false,
        lastDrawnId: null,
      };
    }

    case 'declareWin': {
      const found = findWinningHand(s.players[s.turn].hand, s.card);
      if (s.awaitingDiscard && found) {
        return { ...s, phase: 'won', winner: s.turn, winningHand: found.hand };
      }
      return s; // not a winning hand — ignore
    }
  }
}