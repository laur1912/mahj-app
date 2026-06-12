/**
 * MOCK CARD — our own original set of hands, in the spirit of an American
 * mahjong card but NOT copied from the NMJL list (their specific compilation is
 * what's protected; the structure and mechanics are not).
 *
 * Every hand here is verified: a real winning tile set exists and the matcher
 * accepts it. Labels use card-style notation so they can later be rendered as
 * tiles. Suit slots A/B/C are abstract — "any suit"; constraints say how many
 * distinct suits. The Soap (white dragon) doubles as 0 in Year hands.
 *
 * Goes in src/game/ alongside the other game files.
 */

import type { Card } from './mahjong-data-model';

export const mockCard: Card = [
  /* ---------- Year ---------- */
  {
    id: 'YR-1',
    section: 'Year',
    label: 'FF 2026 2026 2026',
    description: 'Year hand, any 3 suits — the 0 is a Soap (white dragon)',
    points: 30,
    concealed: false,
    jokersAllowed: false,
    suitCount: 3,
    constraints: [{ type: 'distinctSuits' }],
    groups: [
      { count: 2, fill: { fill: 'flower' } },
      { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'A' },
      { count: 1, fill: { fill: 'zero' } },
      { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'A' },
      { count: 1, fill: { fill: 'number', value: 6 }, suitSlot: 'A' },
      { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'B' },
      { count: 1, fill: { fill: 'zero' } },
      { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'B' },
      { count: 1, fill: { fill: 'number', value: 6 }, suitSlot: 'B' },
      { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'C' },
      { count: 1, fill: { fill: 'zero' } },
      { count: 1, fill: { fill: 'number', value: 2 }, suitSlot: 'C' },
      { count: 1, fill: { fill: 'number', value: 6 }, suitSlot: 'C' },
    ],
  },

  /* ---------- Like Numbers ---------- */
  {
    id: 'LN-1',
    section: 'Like Numbers',
    label: 'FFFF 1111 1111 11',
    description: 'Any like number (1-9), any 3 suits — digits shown are just an example',
    points: 25,
    concealed: false,
    jokersAllowed: true,
    suitCount: 3,
    variables: [{ name: 'x', domain: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
    constraints: [{ type: 'distinctSuits' }],
    groups: [
      { count: 4, fill: { fill: 'flower' } },
      { count: 4, fill: { fill: 'numberVar', var: 'x' }, suitSlot: 'A' },
      { count: 4, fill: { fill: 'numberVar', var: 'x' }, suitSlot: 'B' },
      { count: 2, fill: { fill: 'numberVar', var: 'x' }, suitSlot: 'C' },
    ],
  },

  /* ---------- 2468 (evens) ---------- */
  {
    id: 'EV-1',
    section: '2468',
    label: 'FF 222 444 666 888',
    description: 'Any 1 suit',
    points: 25,
    concealed: false,
    jokersAllowed: true,
    suitCount: 1,
    constraints: [{ type: 'sameSuit' }],
    groups: [
      { count: 2, fill: { fill: 'flower' } },
      { count: 3, fill: { fill: 'number', value: 2 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 4 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 6 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 8 }, suitSlot: 'A' },
    ],
  },
  {
    id: 'EV-2',
    section: '2468',
    label: 'FFFF 2222 2222 22',
    description: 'Any like even number (2/4/6/8), any 3 suits — example shown',
    points: 25,
    concealed: false,
    jokersAllowed: true,
    suitCount: 3,
    variables: [{ name: 'e', domain: [2, 4, 6, 8] }],
    constraints: [{ type: 'distinctSuits' }],
    groups: [
      { count: 4, fill: { fill: 'flower' } },
      { count: 4, fill: { fill: 'numberVar', var: 'e' }, suitSlot: 'A' },
      { count: 4, fill: { fill: 'numberVar', var: 'e' }, suitSlot: 'B' },
      { count: 2, fill: { fill: 'numberVar', var: 'e' }, suitSlot: 'C' },
    ],
  },

  /* ---------- 13579 (odds) ---------- */
  {
    id: 'OD-1',
    section: '13579',
    label: 'FF 111 333 555 777',
    description: 'Any 1 suit',
    points: 25,
    concealed: false,
    jokersAllowed: true,
    suitCount: 1,
    constraints: [{ type: 'sameSuit' }],
    groups: [
      { count: 2, fill: { fill: 'flower' } },
      { count: 3, fill: { fill: 'number', value: 1 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 3 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 5 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 7 }, suitSlot: 'A' },
    ],
  },

  /* ---------- 369 ---------- */
  {
    id: 'NN-1',
    section: '369',
    label: 'FF 333 666 999 Green Green Green',
    description: '369 plus a pung of Green Dragons, any 1 suit',
    points: 30,
    concealed: false,
    jokersAllowed: true,
    suitCount: 1,
    constraints: [{ type: 'sameSuit' }],
    groups: [
      { count: 2, fill: { fill: 'flower' } },
      { count: 3, fill: { fill: 'number', value: 3 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 6 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 9 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'dragon', dragon: 'green' } },
    ],
  },

  /* ---------- Consecutive Run ---------- */
  {
    id: 'CR-1',
    section: 'Consecutive Run',
    label: '11 222 333 444 555',
    description: 'Any five consecutive numbers, any 1 suit — example 1-5',
    points: 30,
    concealed: false,
    jokersAllowed: true,
    suitCount: 1,
    variables: [
      { name: 'a', domain: [1, 2, 3, 4, 5] },
      { name: 'b', domain: [2, 3, 4, 5, 6] },
      { name: 'c', domain: [3, 4, 5, 6, 7] },
      { name: 'd', domain: [4, 5, 6, 7, 8] },
      { name: 'e', domain: [5, 6, 7, 8, 9] },
    ],
    constraints: [{ type: 'sameSuit' }, { type: 'consecutive', vars: ['a', 'b', 'c', 'd', 'e'] }],
    groups: [
      { count: 2, fill: { fill: 'numberVar', var: 'a' }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'numberVar', var: 'b' }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'numberVar', var: 'c' }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'numberVar', var: 'd' }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'numberVar', var: 'e' }, suitSlot: 'A' },
    ],
  },

  /* ---------- Winds & Dragons ---------- */
  {
    id: 'WD-1',
    section: 'Winds & Dragons',
    label: 'N E W S Red Red Red Red Green Green Green Green Soap Soap',
    description: 'One of each wind, a kong of Red Dragons, a kong of Green Dragons, and a Soap (white) pair',
    points: 30,
    concealed: false,
    jokersAllowed: true,
    suitCount: 1,
    groups: [
      { count: 1, fill: { fill: 'wind', wind: 'N' } },
      { count: 1, fill: { fill: 'wind', wind: 'E' } },
      { count: 1, fill: { fill: 'wind', wind: 'W' } },
      { count: 1, fill: { fill: 'wind', wind: 'S' } },
      { count: 4, fill: { fill: 'dragon', dragon: 'red' } },
      { count: 4, fill: { fill: 'dragon', dragon: 'green' } },
      { count: 2, fill: { fill: 'dragon', dragon: 'soap' } },
    ],
  },

  /* ---------- Quints ---------- */
  {
    id: 'QN-1',
    section: 'Quints',
    label: 'FFFF 11111 11111',
    description: 'Two quints of any like number, any 2 suits — needs jokers; example shown',
    points: 40,
    concealed: false,
    jokersAllowed: true,
    suitCount: 2,
    variables: [{ name: 'x', domain: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
    constraints: [{ type: 'distinctSuits' }],
    groups: [
      { count: 4, fill: { fill: 'flower' } },
      { count: 5, fill: { fill: 'numberVar', var: 'x' }, suitSlot: 'A' },
      { count: 5, fill: { fill: 'numberVar', var: 'x' }, suitSlot: 'B' },
    ],
  },

  /* ---------- Singles & Pairs (concealed) ---------- */
  {
    id: 'SP-1',
    section: 'Singles & Pairs',
    label: '11 22 33 44 55 66 77',
    description: 'Seven consecutive pairs, any 1 suit — concealed (example 1-7)',
    points: 50,
    concealed: true,
    jokersAllowed: false,
    suitCount: 1,
    variables: [
      { name: 'a', domain: [1, 2, 3] },
      { name: 'b', domain: [2, 3, 4] },
      { name: 'c', domain: [3, 4, 5] },
      { name: 'd', domain: [4, 5, 6] },
      { name: 'e', domain: [5, 6, 7] },
      { name: 'f', domain: [6, 7, 8] },
      { name: 'g', domain: [7, 8, 9] },
    ],
    constraints: [{ type: 'sameSuit' }, { type: 'consecutive', vars: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }],
    groups: [
      { count: 2, fill: { fill: 'numberVar', var: 'a' }, suitSlot: 'A' },
      { count: 2, fill: { fill: 'numberVar', var: 'b' }, suitSlot: 'A' },
      { count: 2, fill: { fill: 'numberVar', var: 'c' }, suitSlot: 'A' },
      { count: 2, fill: { fill: 'numberVar', var: 'd' }, suitSlot: 'A' },
      { count: 2, fill: { fill: 'numberVar', var: 'e' }, suitSlot: 'A' },
      { count: 2, fill: { fill: 'numberVar', var: 'f' }, suitSlot: 'A' },
      { count: 2, fill: { fill: 'numberVar', var: 'g' }, suitSlot: 'A' },
    ],
  },

  /* ---------- 2 Suits ---------- */
  {
    id: 'TS-1',
    section: '2 Suits',
    label: 'FF 333 333 555 555',
    description: 'Pungs of 3 and 5 in two suits',
    points: 25,
    concealed: false,
    jokersAllowed: true,
    suitCount: 2,
    constraints: [{ type: 'distinctSuits' }],
    groups: [
      { count: 2, fill: { fill: 'flower' } },
      { count: 3, fill: { fill: 'number', value: 3 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 3 }, suitSlot: 'B' },
      { count: 3, fill: { fill: 'number', value: 5 }, suitSlot: 'A' },
      { count: 3, fill: { fill: 'number', value: 5 }, suitSlot: 'B' },
    ],
  },
];