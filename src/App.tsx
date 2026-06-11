import { useState } from 'react';
import { newDeal, type Deal } from './game/wall';
import type { Tile, TileType } from './game/mahjong-data-model';

/* ---------- display helpers ---------- */

const SUIT_RANK = { bam: 0, crak: 1, dot: 2 } as const;
const WIND_ORDER = { E: 0, S: 1, W: 2, N: 3 } as const;
const DRAGON_ORDER = { red: 0, green: 1, soap: 2 } as const;

/** A number used only to sort a hand into a readable order (like a player's rack). */
function sortKey(t: TileType): number {
  switch (t.kind) {
    case 'suit':
      return SUIT_RANK[t.suit] * 10 + t.value; // 0..29
    case 'wind':
      return 100 + WIND_ORDER[t.wind];
    case 'dragon':
      return 200 + DRAGON_ORDER[t.dragon];
    case 'flower':
      return 300;
    case 'joker':
      return 400;
  }
}

interface Face {
  glyph: string; // the big mark on the tile
  label: string; // small caption underneath
  tone: string; // color of the glyph
}

function tileFace(t: TileType): Face {
  switch (t.kind) {
    case 'suit':
      if (t.suit === 'bam') return { glyph: String(t.value), label: 'Bam', tone: '#1f7a3d' };
      if (t.suit === 'crak') return { glyph: String(t.value), label: 'Crak', tone: '#b3262a' };
      return { glyph: String(t.value), label: 'Dot', tone: '#1d5fa8' };
    case 'wind':
      return { glyph: t.wind, label: 'Wind', tone: '#2b2b2b' };
    case 'dragon':
      if (t.dragon === 'red') return { glyph: '中', label: 'Dragon', tone: '#b3262a' };
      if (t.dragon === 'green') return { glyph: '發', label: 'Dragon', tone: '#1f7a3d' };
      return { glyph: '▢', label: 'Soap', tone: '#1d5fa8' }; // white dragon ("soap")
    case 'flower':
      return { glyph: '✿', label: 'Flower', tone: '#9b297e' };
    case 'joker':
      return { glyph: '★', label: 'Joker', tone: '#6a3fb5' };
  }
}

function TileView({ tile }: { tile: Tile }) {
  const f = tileFace(tile.type);
  return (
    <div className="tile" title={`${f.glyph} ${f.label}`}>
      <span className="tile-glyph" style={{ color: f.tone }}>
        {f.glyph}
      </span>
      <span className="tile-label">{f.label}</span>
    </div>
  );
}

/* ---------- screen ---------- */

export default function App() {
  const [deal, setDeal] = useState<Deal>(() => newDeal(13));
  const sorted = [...deal.hand].sort((a, b) => sortKey(a.type) - sortKey(b.type));

  return (
    <div className="table">
      <style>{CSS}</style>

      <header className="head">
        <h1>mahj</h1>
        <p>your dealt hand</p>
      </header>

      <section className="tray">
        <div className="tiles">
          {sorted.map((t) => (
            <TileView key={t.id} tile={t} />
          ))}
        </div>
      </section>

      <footer className="controls">
        <button className="btn" onClick={() => setDeal(newDeal(13))}>
          New deal
        </button>
        <span className="count">
          {deal.hand.length} tiles in hand · {deal.wall.length} left in the wall
        </span>
      </footer>
    </div>
  );
}

/* ---------- styles (self-contained; overrides the Vite template defaults) ---------- */

const CSS = `
body { margin: 0; background: #0e3b2e; }
#root { max-width: none; margin: 0; padding: 0; text-align: left; }

.table {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 40px 20px 64px;
  background: radial-gradient(120% 80% at 50% 0%, #1b5e46 0%, #0e3b2e 60%, #0a2c22 100%);
  color: #eaf2ee;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.head { text-align: center; }
.head h1 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 44px;
  letter-spacing: 2px;
  font-weight: 600;
  color: #f4ead2;
}
.head p {
  margin: 6px 0 0;
  font-size: 13px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #9cc3b2;
}

.tray {
  max-width: 880px;
  padding: 20px 20px 26px;
  border-radius: 16px;
  background: linear-gradient(180deg, #8a5a33 0%, #6f4625 60%, #5d3a1e 100%);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,0.18),
    inset 0 -10px 18px rgba(0,0,0,0.35),
    0 16px 30px rgba(0,0,0,0.4);
}

.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.tile {
  width: 50px;
  height: 68px;
  border-radius: 8px;
  background: linear-gradient(180deg, #fffdf6 0%, #f3ecd9 100%);
  box-shadow:
    inset 0 1px 0 #ffffff,
    0 3px 0 #cdbf9e,
    0 6px 10px rgba(0,0,0,0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  user-select: none;
  transition: transform 120ms ease;
}
.tile:hover { transform: translateY(-4px); }

.tile-glyph {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  font-family: 'Hiragino Sans', 'Segoe UI', system-ui, sans-serif;
}
.tile-label {
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #8a7e63;
  font-weight: 600;
}

.controls {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
}
.btn {
  appearance: none;
  border: none;
  cursor: pointer;
  padding: 11px 22px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #0e3b2e;
  background: linear-gradient(180deg, #f4ead2 0%, #e3d3ad 100%);
  box-shadow: 0 4px 0 #b59b6a, 0 8px 14px rgba(0,0,0,0.3);
  transition: transform 80ms ease, box-shadow 80ms ease;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #b59b6a, 0 3px 8px rgba(0,0,0,0.3); }
.btn:focus-visible { outline: 3px solid #9cc3b2; outline-offset: 2px; }

.count { font-size: 13px; color: #bcd8cb; }

@media (prefers-reduced-motion: reduce) {
  .tile, .btn { transition: none; }
}
@media (max-width: 480px) {
  .tile { width: 42px; height: 58px; }
  .tile-glyph { font-size: 22px; }
}
`;