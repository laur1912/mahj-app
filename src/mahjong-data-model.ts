/**
 * PHASE 1 — DATA MODEL: tiles + the "card" (hand) schema.
 *
 * This file is PURE DATA SHAPES. There is no rules/matching logic here —
 * that's Phase 2 (the matcher that, given a player's 14 tiles + a HandLine,
 * decides whether it's a win and under which suit/number assignment).
 *
 * Design goals baked in:
 *  - Tiles carry a stable `id` (for movement animation + React keys) separate
 *    from `type` (which drives rules AND appearance/skins).
 *  - Hands describe suits ABSTRACTLY (slots A/B/C). A hand never says "Bam";
 *    it says "these two groups are in two different suits." The matcher later
 *    tries concrete assignments. This mirrors how the real card's colors work:
 *    they say HOW MANY suits, not WHICH.
 *  - `constraints` is an open-ended list so the schema can grow (consecutive
 *    runs, distinct values, etc.) without changing the core shape.
 *
 * We author our OWN hands into this schema. The structure here is generic
 * game anatomy; only a specific published list of hands is anyone's IP.
 */

/* ============================================================ TILES */

export type Suit = 'bam' | 'crak' | 'dot';
export type Wind = 'N' | 'E' | 'S' | 'W';
// 'soap' is the White Dragon; it also stands in for 0 in Year hands.
export type Dragon = 'red' | 'green' | 'soap';

export type TileType =
  | { kind: 'suit'; suit: Suit; value: number } // value 1..9
  | { kind: 'wind'; wind: Wind }
  | { kind: 'dragon'; dragon: Dragon }
  | { kind: 'flower' }
  | { kind: 'joker' };

/**
 * A physical tile in a game.
 *  - `type`  -> rules + base appearance (all four 3-Craks share a type and look
 *               identical; a purchased skin reskins the type, not the instance).
 *  - `id`    -> which physical copy it is. Used to track a tile as it moves
 *               (wall -> hand -> discard -> exposed) and as a stable React key.
 */
export interface Tile {
  id: string; // e.g. "t-073"
  type: TileType;
}

/** Build the full 152-tile American set: 108 suited + 16 winds + 12 dragons + 8 flowers + 8 jokers. */
export function buildTileSet(): Tile[] {
  const tiles: Tile[] = [];
  let n = 0;
  const add = (type: TileType, copies: number) => {
    for (let i = 0; i < copies; i++) {
      tiles.push({ id: `t-${String(n++).padStart(3, '0')}`, type });
    }
  };

  for (const suit of ['bam', 'crak', 'dot'] as Suit[]) {
    for (let value = 1; value <= 9; value++) add({ kind: 'suit', suit, value }, 4); // 108
  }
  for (const wind of ['N', 'E', 'S', 'W'] as Wind[]) add({ kind: 'wind', wind }, 4); // 16
  for (const dragon of ['red', 'green', 'soap'] as Dragon[]) add({ kind: 'dragon', dragon }, 4); // 12
  add({ kind: 'flower' }, 8); // 8
  add({ kind: 'joker' }, 8); // 8

  return tiles; // 152
}

/* ====================================================== HANDS (the card) */

/** A hand declares which groups share a suit via slots, without fixing the real suit. */
export type SuitSlot = 'A' | 'B' | 'C';

/** What fills a single group. A group is `count` IDENTICAL tiles (count 1 = a single tile). */
export type GroupFill =
  | { fill: 'number'; value: number } // a literal 1..9, lives in a suit slot
  | { fill: 'numberVar'; var: string } // a number the player chooses; see HandLine.variables
  | { fill: 'wind'; wind: Wind }
  | { fill: 'dragon'; dragon: Dragon } // a real dragon tile (soap here = the white dragon itself)
  | { fill: 'zero' } // the Soap played AS 0 in Year hands (suitless)
  | { fill: 'flower' };

export interface Group {
  count: 1 | 2 | 3 | 4 | 5 | 6; // single, pair, pung, kong, quint, sextet
  fill: GroupFill;
  suitSlot?: SuitSlot; // only meaningful for 'number' / 'numberVar' fills
}

/** A number the player gets to pick, e.g. "any like number 1-9" or "any even number". */
export interface NumberVar {
  name: string;
  domain: number[]; // e.g. [1,2,3,4,5,6,7,8,9] or [2,4,6,8]
}

/**
 * Cross-group / cross-variable rules. THIS is the growth point: add new `type`s
 * here as you author fancier hands; the rest of the schema stays put.
 */
export type Constraint =
  | { type: 'distinctSuits' } // the suit slots in use must map to different real suits
  | { type: 'sameSuit' } // every suited group is one real suit
  | { type: 'consecutive'; vars: string[] } // these numberVars must be consecutive
  | { type: 'distinctValues'; vars: string[] }; // these numberVars must differ

export interface HandLine {
  id: string;
  section: string; // your own labels: "Year" | "2468" | "Like Numbers" | ...
  label: string; // human-readable, e.g. "FF + 2026 in three suits"
  points: number;
  concealed: boolean; // must be played fully concealed?
  jokersAllowed: boolean; // hand-level switch. NOTE: even when true, jokers may only fill
  //                         groups of count >= 3 — never singles (1) or pairs (2).
  suitCount: 1 | 2 | 3; // how many distinct suits the hand spans (the card's "color" rule)
  variables?: NumberVar[];
  constraints?: Constraint[];
  groups: Group[]; // tile counts across all groups must total 14
}

/* ============================================ EXAMPLE HANDS (made up, illustrative) */

/**
 * "Like Numbers" style: FFFF + kong + kong + pair, where the three number groups
 * are the SAME (player-chosen) number, each in a different suit.
 * Counts: 4 + 4 + 4 + 2 = 14.
 */
export const exampleLikeNumber: HandLine = {
  id: 'LN-1',
  section: 'Like Numbers',
  label: 'FFFF + kong/kong/pair of one number, three suits',
  points: 25,
  concealed: false,
  jokersAllowed: true, // jokers OK in the kongs (count 4); never in the pair (count 2)
  suitCount: 3,
  variables: [{ name: 'x', domain: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
  constraints: [{ type: 'distinctSuits' }],
  groups: [
    { count: 4, fill: { fill: 'flower' } },
    { count: 4, fill: { fill: 'numberVar', var: 'x' }, suitSlot: 'A' },
    { count: 4, fill: { fill: 'numberVar', var: 'x' }, suitSlot: 'B' },
    { count: 2, fill: { fill: 'numberVar', var: 'x' }, suitSlot: 'C' },
  ],
};

/**
 * "Year" style: FF + the year 2026 spelled out in three different suits,
 * using the Soap as the 0. Soap is suitless, so the 0 groups carry no slot.
 * Counts: 2 + 4 + 4 + 4 = 14. All groups are singles/pairs -> no jokers.
 */
export const exampleYear: HandLine = {
  id: 'YR-1',
  section: 'Year',
  label: 'FF + 2026 in three suits',
  points: 30,
  concealed: false,
  jokersAllowed: false,
  suitCount: 3,
  constraints: [{ type: 'distinctSuits' }],
  groups: [
    { count: 2, fill: { fill: 'flower' } },
    // 2026 in suit A
    { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'A' },
    { count: 1, fill: { fill: 'zero' } },
    { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'A' },
    { count: 1, fill: { fill: 'number', value: 6 }, suitSlot: 'A' },
    // 2026 in suit B
    { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'B' },
    { count: 1, fill: { fill: 'zero' } },
    { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'B' },
    { count: 1, fill: { fill: 'number', value: 6 }, suitSlot: 'B' },
    // 2026 in suit C
    { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'C' },
    { count: 1, fill: { fill: 'zero' } },
    { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'C' },
    { count: 1, fill: { fill: 'number', value: 6 }, suitSlot: 'C' },
  ],
};

/** Your card is just an array of HandLines. */
export type Card = HandLine[];
export const exampleCard: Card = [exampleLikeNumber, exampleYear];