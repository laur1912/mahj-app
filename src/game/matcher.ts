/**
 * PHASE 2 — THE MATCHER
 *
 * One job: given a player's 14 tiles and one HandLine from the card, decide
 * whether those tiles EXACTLY form that hand — trying every legal way to
 *   (a) assign real suits (bam/crak/dot) to the hand's abstract A/B/C slots,
 *   (b) choose values for the hand's number variables, and
 *   (c) let jokers fill eligible groups (pung+ only — never singles or pairs).
 *
 * Read it top to bottom; it's built in three layers:
 *   1. Tile keys       — turn a tile into a comparable string.
 *   2. Exact-fit check — given ONE fully-concrete version of the hand, do the
 *                        player's tiles form it exactly (jokers and all)?
 *   3. Assignment search — enumerate every legal suit/number assignment and run
 *                        the exact-fit check on each.
 *
 * No database, no UI — pure logic you can test on its own.
 *
 * NOTE: place this file in the SAME folder as mahjong-data-model.ts.
 */

import type {
  Tile,
  TileType,
  HandLine,
  Group,
  Suit,
  SuitSlot,
} from './mahjong-data-model';

const SUITS: Suit[] = ['bam', 'crak', 'dot'];

/* ---------- Layer 1: tile keys ---------- */

/** A comparable string for a real tile's identity (jokers are handled separately). */
function tileKeyFromType(type: TileType): string {
  switch (type.kind) {
    case 'suit':
      return `suit:${type.suit}:${type.value}`;
    case 'wind':
      return `wind:${type.wind}`;
    case 'dragon':
      return `dragon:${type.dragon}`;
    case 'flower':
      return 'flower';
    case 'joker':
      return 'joker';
  }
}

/** What concrete tile a group needs, GIVEN a chosen suit + number assignment. */
function groupTileKey(
  group: Group,
  suitMap: Partial<Record<SuitSlot, Suit>>,
  varMap: Record<string, number>,
): string {
  const f = group.fill;
  switch (f.fill) {
    case 'number':
      return `suit:${suitMap[group.suitSlot!]}:${f.value}`;
    case 'numberVar':
      return `suit:${suitMap[group.suitSlot!]}:${varMap[f.var]}`;
    case 'wind':
      return `wind:${f.wind}`;
    case 'dragon':
      return `dragon:${f.dragon}`;
    case 'zero':
      return 'dragon:soap'; // the Soap (white dragon) played as 0 in Year hands
    case 'flower':
      return 'flower';
  }
}

/* ---------- Layer 2: exact-fit check for ONE concrete hand ---------- */

interface SlotNeed {
  strict: number; // single/pair slots — MUST be real tiles
  jokerable: number; // pung+ slots when the hand allows jokers — a joker may fill these
}

function exactFit(
  tiles: Tile[],
  hand: HandLine,
  suitMap: Partial<Record<SuitSlot, Suit>>,
  varMap: Record<string, number>,
): boolean {
  // Tally the player's tiles: real tiles by key, plus a joker count.
  const reals = new Map<string, number>();
  let jokers = 0;
  for (const tile of tiles) {
    if (tile.type.kind === 'joker') {
      jokers++;
      continue;
    }
    const k = tileKeyFromType(tile.type);
    reals.set(k, (reals.get(k) ?? 0) + 1);
  }

  // Tally what the hand needs, splitting each tile-key into strict slots
  // (singles/pairs) and jokerable slots (pung+ when the hand allows jokers).
  const need = new Map<string, SlotNeed>();
  for (const g of hand.groups) {
    const key = groupTileKey(g, suitMap, varMap);
    const jokerable = g.count >= 3 && hand.jokersAllowed;
    const cur = need.get(key) ?? { strict: 0, jokerable: 0 };
    if (jokerable) cur.jokerable += g.count;
    else cur.strict += g.count;
    need.set(key, cur);
  }

  // Every real tile the player holds must have a home in this hand.
  for (const [key, have] of reals) {
    if (have > 0 && !need.has(key)) return false;
  }

  // For each needed tile, place real tiles (strict slots first), then count
  // how many jokers the remaining slots require.
  let jokersNeeded = 0;
  for (const [key, { strict, jokerable }] of need) {
    const have = reals.get(key) ?? 0;
    const total = strict + jokerable;
    if (have < strict) return false; // not enough real tiles for single/pair slots
    if (have > total) return false; // too many of this tile to fit exactly
    jokersNeeded += total - have; // leftover slots are all jokerable
  }

  // Jokers must fill exactly the remaining slots — no more, no fewer.
  return jokersNeeded === jokers;
}

/* ---------- Layer 3: search every legal assignment ---------- */

export interface MatchResult {
  matches: boolean;
  suitMap?: Partial<Record<SuitSlot, Suit>>;
  varMap?: Record<string, number>;
}

/** Cartesian product: [[a,b],[1,2]] -> [[a,1],[a,2],[b,1],[b,2]] */
function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((x) => [...combo, x])),
    [[]],
  );
}

function suitAssignmentLegal(hand: HandLine, suits: Suit[]): boolean {
  for (const c of hand.constraints ?? []) {
    if (c.type === 'distinctSuits' && new Set(suits).size !== suits.length) return false;
    if (c.type === 'sameSuit' && new Set(suits).size > 1) return false;
  }
  return true;
}

function varAssignmentLegal(hand: HandLine, varMap: Record<string, number>): boolean {
  for (const c of hand.constraints ?? []) {
    if (c.type === 'distinctValues') {
      const vals = c.vars.map((v) => varMap[v]);
      if (new Set(vals).size !== vals.length) return false;
    }
    if (c.type === 'consecutive') {
      for (let i = 1; i < c.vars.length; i++) {
        if (varMap[c.vars[i]] !== varMap[c.vars[i - 1]] + 1) return false;
      }
    }
  }
  return true;
}

/** Does this set of 14 tiles exactly form this hand under SOME legal assignment? */
export function matchesHand(tiles: Tile[], hand: HandLine): MatchResult {
  if (tiles.length !== 14) return { matches: false };

  // Which abstract suit slots does this hand actually use?
  const usedSlots = [
    ...new Set(
      hand.groups
        .map((g) => g.suitSlot)
        .filter((s): s is SuitSlot => Boolean(s)),
    ),
  ];

  // Every way to map used slots -> real suits, and every way to assign vars.
  const suitCombos: Suit[][] = usedSlots.length
    ? cartesian(usedSlots.map(() => SUITS))
    : [[]];
  const vars = hand.variables ?? [];
  const varCombos: number[][] = vars.length
    ? cartesian(vars.map((v) => v.domain))
    : [[]];

  for (const suits of suitCombos) {
    if (!suitAssignmentLegal(hand, suits)) continue;
    const suitMap: Partial<Record<SuitSlot, Suit>> = {};
    usedSlots.forEach((slot, i) => {
      suitMap[slot] = suits[i];
    });

    for (const values of varCombos) {
      const varMap: Record<string, number> = {};
      vars.forEach((v, i) => {
        varMap[v.name] = values[i];
      });
      if (!varAssignmentLegal(hand, varMap)) continue;

      if (exactFit(tiles, hand, suitMap, varMap)) {
        return { matches: true, suitMap, varMap };
      }
    }
  }

  return { matches: false };
}

/** Check a full card: returns the first hand the tiles win with, or null. */
export function findWinningHand(
  tiles: Tile[],
  card: HandLine[],
): { hand: HandLine; result: MatchResult } | null {
  for (const hand of card) {
    const result = matchesHand(tiles, hand);
    if (result.matches) return { hand, result };
  }
  return null;
}

/* ---------- Suggestions: how close are your tiles to each hand? ---------- */

export interface HandSuggestion {
  hand: HandLine;
  away: number; // how many tiles you'd need to swap to complete it (0 = done)
}

export interface HandPlan {
  away: number; // how many tiles you'd need to draw/swap to complete it (0 = done)
  keepIds: string[]; // ids of YOUR tiles that fit this hand's best assignment
}

/**
 * The best way to build this hand from your tiles: which of your tiles fit
 * (keepIds) and how far off you are (away), over every legal assignment.
 * Counts real tiles that fit, plus jokers filling joker-eligible (pung+) slots.
 * The tiles you hold that are NOT in keepIds are the discard candidates.
 */
export function planHand(tiles: Tile[], hand: HandLine): HandPlan {
  const realsByKey = new Map<string, Tile[]>();
  const jokerTiles: Tile[] = [];
  for (const t of tiles) {
    if (t.type.kind === 'joker') {
      jokerTiles.push(t);
      continue;
    }
    const k = tileKeyFromType(t.type);
    const arr = realsByKey.get(k);
    if (arr) arr.push(t);
    else realsByKey.set(k, [t]);
  }

  const usedSlots = [
    ...new Set(hand.groups.map((g) => g.suitSlot).filter((s): s is SuitSlot => Boolean(s))),
  ];
  const suitCombos: Suit[][] = usedSlots.length ? cartesian(usedSlots.map(() => SUITS)) : [[]];
  const vars = hand.variables ?? [];
  const varCombos: number[][] = vars.length ? cartesian(vars.map((v) => v.domain)) : [[]];

  let best: HandPlan = { away: 14, keepIds: [] };
  for (const suits of suitCombos) {
    if (!suitAssignmentLegal(hand, suits)) continue;
    const suitMap: Partial<Record<SuitSlot, Suit>> = {};
    usedSlots.forEach((slot, i) => {
      suitMap[slot] = suits[i];
    });
    for (const values of varCombos) {
      const varMap: Record<string, number> = {};
      vars.forEach((v, i) => {
        varMap[v.name] = values[i];
      });
      if (!varAssignmentLegal(hand, varMap)) continue;

      const need = new Map<string, { strict: number; jokerable: number }>();
      for (const g of hand.groups) {
        const key = groupTileKey(g, suitMap, varMap);
        const jokerable = g.count >= 3 && hand.jokersAllowed;
        const cur = need.get(key) ?? { strict: 0, jokerable: 0 };
        if (jokerable) cur.jokerable += g.count;
        else cur.strict += g.count;
        need.set(key, cur);
      }

      const keepIds: string[] = [];
      let jokerableLeft = 0;
      for (const [key, { strict, jokerable }] of need) {
        const have = realsByKey.get(key) ?? [];
        const used = Math.min(have.length, strict + jokerable);
        for (let n = 0; n < used; n++) keepIds.push(have[n].id);
        jokerableLeft += jokerable - Math.max(0, used - strict);
      }
      const jokerUse = Math.min(jokerTiles.length, jokerableLeft);
      for (let n = 0; n < jokerUse; n++) keepIds.push(jokerTiles[n].id);

      const away = 14 - keepIds.length;
      if (away < best.away) best = { away, keepIds };
      if (best.away === 0) return best;
    }
  }
  return best;
}

/**
 * Fewest tiles you are from completing this hand, over every legal assignment.
 */
export function handCloseness(tiles: Tile[], hand: HandLine): number {
  return planHand(tiles, hand).away;
}

/** The hands your tiles are closest to, nearest first. */
export function suggestHands(tiles: Tile[], card: HandLine[], top = 4): HandSuggestion[] {
  return card
    .map((hand) => ({ hand, away: handCloseness(tiles, hand) }))
    .sort((a, b) => a.away - b.away)
    .slice(0, top);
}