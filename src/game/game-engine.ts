/**
 * GAME ENGINE — one 4-player game, pure logic (no UI, no network).
 *
 * Flow:
 *   1. CHARLESTON (step 4): before play, players pass tiles in fixed directions.
 *        First Charleston:  pass 3 right, 3 across, 3 left  (mandatory)
 *        Second Charleston: pass 3 left, 3 across, 3 right  (optional)
 *      Jokers can never be passed. Each pass is simultaneous: all four players
 *      choose 3 tiles, then everyone swaps at once.
 *   2. PLAY (steps 1-3): draw a tile, discard a tile, turn passes. Declare
 *      mahjong while holding 14 tiles if they complete a card hand.
 *
 * Calling/exposing other players' discards (step 5) comes next.
 *
 * Built as a reducer: applyAction(state, action) returns a new state and never
 * mutates the input.
 */

import { shuffle } from './wall';
import { buildTileSet, type Tile, type HandLine } from './mahjong-data-model';
import { findWinningHand, type MatchResult } from './matcher';

export interface Player {
  id: number;
  name: string;
  hand: Tile[];
}

export type Direction = 'right' | 'across' | 'left';
const OFFSET: Record<Direction, number> = { right: 1, across: 2, left: 3 };

export interface CharlestonState {
  queue: Direction[]; // remaining passes this Charleston; current pass = queue[0]
  round: 1 | 2; // first or second Charleston
  selecting: number; // which player is choosing tiles right now (0-3)
  selections: (string[] | null)[]; // each player's chosen 3 tile ids for the current pass
}

export type Phase =
  | 'charleston'
  | 'charlestonDecision' // asking whether to run the optional second Charleston
  | 'playing'
  | 'won'
  | 'exhausted';

export interface GameState {
  players: Player[]; // always 4
  wall: Tile[];
  discards: Tile[];
  turn: number;
  awaitingDiscard: boolean;
  lastDrawnId: string | null;
  phase: Phase;
  charleston: CharlestonState | null;
  winner: number | null;
  winningHand: HandLine | null;
  card: HandLine[];
}

export type Action =
  | { type: 'charlestonSelect'; tileIds: string[] }
  | { type: 'charlestonSecond'; agree: boolean }
  | { type: 'skipCharleston' }
  | { type: 'draw' }
  | { type: 'discard'; tileId: string }
  | { type: 'declareWin' };

/** Deal a fresh game and open the Charleston. */
export function createGame(card: HandLine[]): GameState {
  let deck = shuffle(buildTileSet());
  const players: Player[] = [];
  for (let i = 0; i < 4; i += 1) {
    players.push({ id: i, name: `Player ${i + 1}`, hand: deck.slice(0, 13) });
    deck = deck.slice(13);
  }
  return {
    players,
    wall: deck,
    discards: [],
    turn: 0,
    awaitingDiscard: false,
    lastDrawnId: null,
    phase: 'charleston',
    charleston: { queue: ['right', 'across', 'left'], round: 1, selecting: 0, selections: [null, null, null, null] },
    winner: null,
    winningHand: null,
    card,
  };
}

export function isJoker(t: Tile): boolean {
  return t.type.kind === 'joker';
}

/** A legal Charleston selection: exactly 3 distinct tiles from the hand, no jokers. */
export function validCharlestonSelection(hand: Tile[], ids: string[]): boolean {
  if (ids.length !== 3 || new Set(ids).size !== 3) return false;
  const byId = new Map(hand.map((t) => [t.id, t]));
  return ids.every((id) => {
    const t = byId.get(id);
    return Boolean(t) && !isJoker(t!);
  });
}

function startPlay(s: GameState): GameState {
  return { ...s, phase: 'playing', charleston: null, turn: 0, awaitingDiscard: false, lastDrawnId: null };
}

/** Everyone has chosen 3 tiles for the current pass — swap them all at once. */
function resolveCharlestonPass(s: GameState): GameState {
  const c = s.charleston!;
  const offset = OFFSET[c.queue[0]];
  const sel = c.selections as string[][];
  const sent = s.players.map((p, i) => sel[i].map((id) => p.hand.find((t) => t.id === id)!));
  const players = s.players.map((p, j) => {
    const keep = p.hand.filter((t) => !sel[j].includes(t.id));
    const received = sent[(j - offset + 4) % 4]; // who passes to seat j
    return { ...p, hand: [...keep, ...received] };
  });

  const queue = c.queue.slice(1);
  if (queue.length > 0) {
    return { ...s, players, charleston: { ...c, queue, selecting: 0, selections: [null, null, null, null] } };
  }
  if (c.round === 1) {
    return { ...s, players, phase: 'charlestonDecision', charleston: null };
  }
  return startPlay({ ...s, players });
}

export function applyAction(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'charlestonSelect': {
      if (s.phase !== 'charleston' || !s.charleston) return s;
      const c = s.charleston;
      if (!validCharlestonSelection(s.players[c.selecting].hand, a.tileIds)) return s;
      const selections = c.selections.map((sel, i) => (i === c.selecting ? a.tileIds : sel));
      if (c.selecting < 3) {
        return { ...s, charleston: { ...c, selections, selecting: c.selecting + 1 } };
      }
      return resolveCharlestonPass({ ...s, charleston: { ...c, selections } });
    }

    case 'charlestonSecond': {
      if (s.phase !== 'charlestonDecision') return s;
      if (a.agree) {
        return {
          ...s,
          phase: 'charleston',
          charleston: { queue: ['left', 'across', 'right'], round: 2, selecting: 0, selections: [null, null, null, null] },
        };
      }
      return startPlay(s);
    }

    case 'skipCharleston': {
      if (s.phase !== 'charleston' && s.phase !== 'charlestonDecision') return s;
      return startPlay(s);
    }

    case 'draw': {
      if (s.phase !== 'playing' || s.awaitingDiscard) return s;
      if (s.wall.length === 0) return { ...s, phase: 'exhausted' };
      const [tile, ...rest] = s.wall;
      return {
        ...s,
        wall: rest,
        players: s.players.map((p, i) => (i === s.turn ? { ...p, hand: [...p.hand, tile] } : p)),
        awaitingDiscard: true,
        lastDrawnId: tile.id,
      };
    }

    case 'discard': {
      if (s.phase !== 'playing' || !s.awaitingDiscard) return s;
      const cur = s.players[s.turn];
      const idx = cur.hand.findIndex((t) => t.id === a.tileId);
      if (idx === -1) return s;
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
      if (s.phase !== 'playing') return s;
      const found = findWinningHand(s.players[s.turn].hand, s.card);
      if (s.awaitingDiscard && found) {
        return { ...s, phase: 'won', winner: s.turn, winningHand: found.hand };
      }
      return s;
    }
  }
}

/** Is the current player holding a winning 14-tile hand right now? */
export function winCheck(s: GameState): MatchResult | null {
  if (s.phase !== 'playing' || !s.awaitingDiscard) return null;
  const found = findWinningHand(s.players[s.turn].hand, s.card);
  return found ? found.result : null;
}