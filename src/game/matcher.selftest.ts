/**
 * Manual self-test for the matcher. Not a real test framework — it just builds
 * a few tile sets, runs matchesHand, and logs PASS/FAIL to the console.
 *
 * To run it once:
 *   In src/App.tsx, add these two lines at the very top (module scope, above
 *   the component):
 *
 *     import { runMatcherSelfTest } from './game/matcher.selftest';
 *     runMatcherSelfTest();
 *
 *   Then open the page and check the browser DevTools Console. Delete the two
 *   lines when you're done. (If your data-model/matcher files live directly in
 *   src/ instead of src/game/, drop the "game/" from the import path.)
 *
 * Place this file in the SAME folder as mahjong-data-model.ts and matcher.ts.
 */

import type { Tile, TileType, HandLine } from './mahjong-data-model';
import { exampleLikeNumber, exampleYear } from './mahjong-data-model';
import { matchesHand } from './matcher';

let _id = 0;
const mk = (type: TileType, n = 1): Tile[] =>
  Array.from({ length: n }, () => ({ id: `test-${_id++}`, type }));

const bam = (v: number, n = 1) => mk({ kind: 'suit', suit: 'bam', value: v }, n);
const crak = (v: number, n = 1) => mk({ kind: 'suit', suit: 'crak', value: v }, n);
const dot = (v: number, n = 1) => mk({ kind: 'suit', suit: 'dot', value: v }, n);
const flower = (n = 1) => mk({ kind: 'flower' }, n);
const soap = (n = 1) => mk({ kind: 'dragon', dragon: 'soap' }, n);
const joker = (n = 1) => mk({ kind: 'joker' }, n);

interface Case {
  name: string;
  tiles: Tile[];
  hand: HandLine;
  expect: boolean;
}

const cases: Case[] = [
  {
    name: 'Like Numbers — FFFF + 5/5/5 across three suits (clean win)',
    tiles: [...flower(4), ...bam(5, 4), ...crak(5, 4), ...dot(5, 2)],
    hand: exampleLikeNumber,
    expect: true,
  },
  {
    name: 'Like Numbers — one kong tile is a Joker (still a win)',
    tiles: [...flower(4), ...bam(5, 3), ...joker(1), ...crak(5, 4), ...dot(5, 2)],
    hand: exampleLikeNumber,
    expect: true,
  },
  {
    name: 'Like Numbers — Joker used in the PAIR (illegal -> no win)',
    tiles: [...flower(4), ...bam(5, 4), ...crak(5, 4), ...dot(5, 1), ...joker(1)],
    hand: exampleLikeNumber,
    expect: false,
  },
  {
    name: 'Year — FF + 2026 across three suits (clean win)',
    tiles: [
      ...flower(2),
      ...bam(2, 2), ...soap(1), ...bam(6, 1),
      ...crak(2, 2), ...soap(1), ...crak(6, 1),
      ...dot(2, 2), ...soap(1), ...dot(6, 1),
    ],
    hand: exampleYear,
    expect: true,
  },
  {
    name: 'Year — a Joker swapped in (hand forbids jokers -> no win)',
    tiles: [
      ...flower(1), ...joker(1),
      ...bam(2, 2), ...soap(1), ...bam(6, 1),
      ...crak(2, 2), ...soap(1), ...crak(6, 1),
      ...dot(2, 2), ...soap(1), ...dot(6, 1),
    ],
    hand: exampleYear,
    expect: false,
  },
  {
    name: 'Like Numbers — random junk hand (no win)',
    tiles: [...bam(1, 3), ...crak(2, 2), ...dot(3, 4), ...flower(2), ...bam(9, 3)],
    hand: exampleLikeNumber,
    expect: false,
  },
];

export function runMatcherSelfTest(): void {
  console.log('%c=== Matcher self-test ===', 'font-weight:bold');
  let pass = 0;
  for (const c of cases) {
    const got = matchesHand(c.tiles, c.hand).matches;
    const ok = got === c.expect;
    if (ok) pass += 1;
    console.log(
      `${ok ? '✅ PASS' : '❌ FAIL'} — ${c.name} (expected ${c.expect}, got ${got})`,
    );
  }
  console.log(`%c${pass}/${cases.length} passed`, 'font-weight:bold');
}