/**
 * GAME ENGINE — one 4-player game, pure logic (no UI, no network).
 *
 * Flow:
 *   1. CHARLESTON: pass tiles right/across/left (mandatory), optional second
 *      round left/across/right. Jokers can never be passed.
 *   2. PLAY: draw a tile, discard a tile, turn passes.
 *   3. CALLING (step 5): after any discard, if another player can use it they
 *      may CLAIM it:
 *        - pung  (they hold 2 matching real tiles) -> expose 3 face-up
 *        - kong  (they hold 3 matching real tiles) -> expose 4 face-up
 *        - mahjong (the discard completes their hand) -> they win
 *      A claim jumps the turn to the caller, who then discards. If nobody can
 *      claim, play simply moves to the next seat.
 *
 * Win = concealed hand + exposed melds together form a hand on the card.
 *
 * Reducer style: applyAction(state, action) returns a new state, never mutates.
 *
 * MVP simplifications (refined later): no joker-in-exposure or joker redemption;
 * exposures aren't checked against a specific card hand; flowers/jokers can't be
 * claimed; with multiple eligible callers the UI lets players choose rather than
 * auto-enforcing seat priority.
 */

import { shuffle } from './wall';
import {
  buildTileSet,
  type Tile,
  type TileType,
  type HandLine,
} from './mahjong-data-model';
import { findWinningHand, type MatchResult } from './matcher';

export interface Player {
  id: number;
  name: string;
  hand: Tile[]; // concealed tiles
  exposures: Tile[][]; // face-up melds (each 3-4 tiles)
}

export type Direction = 'right' | 'across' | 'left';
const OFFSET: Record<Direction, number> = { right: 1, across: 2, left: 3 };

export interface CharlestonState {
  queue: Direction[];
  round: 1 | 2;
  selecting: number;
  selections: (string[] | null)[];
}

export type Phase =
  | 'charleston'
  | 'charlestonDecision'
  | 'playing'
  | 'callWindow' // a discard is on the table and at least one player can claim it
  | 'won'
  | 'exhausted';

export interface GameState {
  players: Player[];
  wall: Tile[];
  discards: Tile[];
  turn: number;
  awaitingDiscard: boolean;
  lastDrawnId: string | null;
  phase: Phase;
  charleston: CharlestonState | null;
  pendingDiscard: Tile | null; // the claimable tile during a call window
  discarder: number | null; // who threw it
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
  | { type: 'declareWin' }
  | { type: 'call'; player: number; kind: 'pung' | 'kong' | 'mahjong' }
  | { type: 'passCall' };

/* ---------- helpers ---------- */

export function isJoker(t: Tile): boolean {
  return t.type.kind === 'joker';
}

/** Identity key for matching tiles of the same kind/value. */
function typeKey(t: TileType): string {
  switch (t.kind) {
    case 'suit':
      return `s${t.suit}${t.value}`;
    case 'wind':
      return `w${t.wind}`;
    case 'dragon':
      return `d${t.dragon}`;
    case 'flower':
      return 'f';
    case 'joker':
      return 'j';
  }
}

/** All tiles that count toward a win: concealed hand + every exposed meld. */
function handForWin(p: Player): Tile[] {
  return [...p.hand, ...p.exposures.flat()];
}

/** A player with any exposure can no longer win a concealed-only hand. */
function cardFor(p: Player, card: HandLine[]): HandLine[] {
  return p.exposures.length > 0 ? card.filter((h) => !h.concealed) : card;
}

export interface CallOptions {
  pung: boolean;
  kong: boolean;
  mahjong: HandLine | null;
}

/** What, if anything, this player could claim the current discard for. */
export function callOptions(s: GameState, player: number): CallOptions {
  const none: CallOptions = { pung: false, kong: false, mahjong: null };
  if (s.phase !== 'callWindow' || !s.pendingDiscard || player === s.discarder) return none;

  const key = typeKey(s.pendingDiscard.type);
  if (key === 'j') return none; // jokers can't be claimed

  const p = s.players[player];
  const matches = p.hand.filter((t) => !isJoker(t) && typeKey(t.type) === key).length;
  const allowPungKong = key !== 'f'; // flowers aren't punged
  const full = [...p.hand, ...p.exposures.flat(), s.pendingDiscard];
  const found = full.length === 14 ? findWinningHand(full, cardFor(p, s.card)) : null;

  return {
    pung: allowPungKong && matches >= 2,
    kong: allowPungKong && matches >= 3,
    mahjong: found ? found.hand : null,
  };
}

function anyoneCanCall(s: GameState): boolean {
  return s.players.some((_, i) => {
    const o = callOptions(s, i);
    return o.pung || o.kong || o.mahjong !== null;
  });
}

/* ---------- setup ---------- */

export function createGame(card: HandLine[]): GameState {
  let deck = shuffle(buildTileSet());
  const players: Player[] = [];
  for (let i = 0; i < 4; i += 1) {
    players.push({ id: i, name: `Player ${i + 1}`, hand: deck.slice(0, 13), exposures: [] });
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
    pendingDiscard: null,
    discarder: null,
    winner: null,
    winningHand: null,
    card,
  };
}

export function validCharlestonSelection(hand: Tile[], ids: string[]): boolean {
  if (ids.length !== 3 || new Set(ids).size !== 3) return false;
  const byId = new Map(hand.map((t) => [t.id, t]));
  return ids.every((id) => {
    const t = byId.get(id);
    return Boolean(t) && !isJoker(t!);
  });
}

function startPlay(s: GameState): GameState {
  return {
    ...s,
    phase: 'playing',
    charleston: null,
    turn: 0,
    awaitingDiscard: false,
    lastDrawnId: null,
    pendingDiscard: null,
    discarder: null,
  };
}

function resolveCharlestonPass(s: GameState): GameState {
  const c = s.charleston!;
  const offset = OFFSET[c.queue[0]];
  const sel = c.selections as string[][];
  const sent = s.players.map((p, i) => sel[i].map((id) => p.hand.find((t) => t.id === id)!));
  const players = s.players.map((p, j) => {
    const keep = p.hand.filter((t) => !sel[j].includes(t.id));
    const received = sent[(j - offset + 4) % 4];
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

/* ---------- reducer ---------- */

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
      const players = s.players.map((p, i) =>
        i === s.turn ? { ...p, hand: p.hand.filter((_, k) => k !== idx) } : p,
      );
      const offered: GameState = {
        ...s,
        players,
        discards: [...s.discards, tile],
        phase: 'callWindow',
        pendingDiscard: tile,
        discarder: s.turn,
        awaitingDiscard: false,
        lastDrawnId: null,
      };
      // Only stop for a call window if someone can actually claim it.
      if (anyoneCanCall(offered)) return offered;
      return {
        ...offered,
        phase: 'playing',
        turn: (s.turn + 1) % 4,
        pendingDiscard: null,
        discarder: null,
      };
    }

    case 'passCall': {
      if (s.phase !== 'callWindow' || s.discarder === null) return s;
      return {
        ...s,
        phase: 'playing',
        turn: (s.discarder + 1) % 4,
        pendingDiscard: null,
        discarder: null,
        awaitingDiscard: false,
      };
    }

    case 'call': {
      if (s.phase !== 'callWindow' || !s.pendingDiscard) return s;
      const opts = callOptions(s, a.player);

      if (a.kind === 'mahjong') {
        if (!opts.mahjong) return s;
        return { ...s, phase: 'won', winner: a.player, winningHand: opts.mahjong, pendingDiscard: null, discarder: null };
      }
      if (a.kind === 'pung' && !opts.pung) return s;
      if (a.kind === 'kong' && !opts.kong) return s;

      const need = a.kind === 'pung' ? 2 : 3;
      const key = typeKey(s.pendingDiscard.type);
      const caller = s.players[a.player];
      const matching: Tile[] = [];
      const rest: Tile[] = [];
      for (const t of caller.hand) {
        if (matching.length < need && !isJoker(t) && typeKey(t.type) === key) matching.push(t);
        else rest.push(t);
      }
      const exposure = [...matching, s.pendingDiscard];
      const discardId = s.pendingDiscard.id;
      return {
        ...s,
        players: s.players.map((p, i) =>
          i === a.player ? { ...p, hand: rest, exposures: [...p.exposures, exposure] } : p,
        ),
        discards: s.discards.filter((t) => t.id !== discardId),
        phase: 'playing',
        turn: a.player,
        awaitingDiscard: true,
        pendingDiscard: null,
        discarder: null,
        lastDrawnId: null,
      };
    }

    case 'declareWin': {
      if (s.phase !== 'playing' || !s.awaitingDiscard) return s;
      const p = s.players[s.turn];
      const found = findWinningHand(handForWin(p), cardFor(p, s.card));
      if (found) return { ...s, phase: 'won', winner: s.turn, winningHand: found.hand };
      return s;
    }
  }
}

/** Is the current player holding a winning hand right now (for the glow hint)? */
export function winCheck(s: GameState): MatchResult | null {
  if (s.phase !== 'playing' || !s.awaitingDiscard) return null;
  const p = s.players[s.turn];
  const found = findWinningHand(handForWin(p), cardFor(p, s.card));
  return found ? found.result : null;
}