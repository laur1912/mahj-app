import { useState } from 'react';
import {
  createGame,
  applyAction,
  winCheck,
  type GameState,
} from './game/game-engine';
import { exampleCard } from './game/mahjong-data-model';
import type { Tile, TileType } from './game/mahjong-data-model';

/* ---------- tile display (shared) ---------- */

const SUIT_RANK = { bam: 0, crak: 1, dot: 2 } as const;
const WIND_ORDER = { E: 0, S: 1, W: 2, N: 3 } as const;
const DRAGON_ORDER = { red: 0, green: 1, soap: 2 } as const;

function sortKey(t: TileType): number {
  switch (t.kind) {
    case 'suit':
      return SUIT_RANK[t.suit] * 10 + t.value;
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
  glyph: string;
  label: string;
  tone: string;
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
      return { glyph: '▢', label: 'Soap', tone: '#1d5fa8' };
    case 'flower':
      return { glyph: '✿', label: 'Flower', tone: '#9b297e' };
    case 'joker':
      return { glyph: '★', label: 'Joker', tone: '#6a3fb5' };
  }
}

function TileView({
  tile,
  onClick,
  drawn,
  small,
}: {
  tile: Tile;
  onClick?: () => void;
  drawn?: boolean;
  small?: boolean;
}) {
  const f = tileFace(tile.type);
  const cls = ['tile', small ? 'small' : '', onClick ? 'clickable' : '', drawn ? 'drawn' : '']
    .filter(Boolean)
    .join(' ');
  const inner = (
    <>
      <span className="tile-glyph" style={{ color: f.tone }}>
        {f.glyph}
      </span>
      <span className="tile-label">{f.label}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} title={`${f.glyph} ${f.label}`}>
        {inner}
      </button>
    );
  }
  return (
    <div className={cls} title={`${f.glyph} ${f.label}`}>
      {inner}
    </div>
  );
}

/* ---------- the board ---------- */

export default function App() {
  const [state, setState] = useState<GameState>(() => createGame(exampleCard));
  const [notice, setNotice] = useState<string | null>(null);

  const current = state.players[state.turn];
  const sortedHand = [...current.hand].sort((a, b) => sortKey(a.type) - sortKey(b.type));
  const canDraw = state.phase === 'playing' && !state.awaitingDiscard;
  const canDiscard = state.phase === 'playing' && state.awaitingDiscard;
  const winAvailable = winCheck(state) !== null;

  function draw() {
    setState(applyAction(state, { type: 'draw' }));
  }
  function discard(tileId: string) {
    if (!canDiscard) return;
    setState(applyAction(state, { type: 'discard', tileId }));
  }
  function declare() {
    if (winCheck(state)) {
      setState(applyAction(state, { type: 'declareWin' }));
    } else {
      setNotice('Not a complete hand from the card yet.');
      window.setTimeout(() => setNotice(null), 2500);
    }
  }
  function newGame() {
    setState(createGame(exampleCard));
    setNotice(null);
  }

  let status: string;
  if (state.phase === 'won') {
    status = `${state.players[state.winner!].name} wins!`;
  } else if (state.phase === 'exhausted') {
    status = 'The wall is empty — washout.';
  } else if (canDiscard) {
    status = `${current.name}'s turn — tap a tile to discard`;
  } else {
    status = `${current.name}'s turn — draw a tile`;
  }

  return (
    <div className="table">
      <style>{CSS}</style>

      <header className="head">
        <h1>mahj</h1>
        <p className="status">{status}</p>
      </header>

      {/* seats */}
      <div className="seats">
        {state.players.map((p, i) => (
          <div key={p.id} className={`seat ${i === state.turn ? 'active' : ''}`}>
            <span className="seat-name">{p.name}</span>
            <span className="seat-count">{p.hand.length} tiles</span>
          </div>
        ))}
      </div>

      {/* discard pile */}
      <section className="discard-area">
        <div className="discard-title">Discards</div>
        {state.discards.length === 0 ? (
          <div className="discard-empty">No discards yet</div>
        ) : (
          <div className="tiles">
            {state.discards.map((t, i) => (
              <TileView key={t.id} tile={t} small drawn={i === state.discards.length - 1} />
            ))}
          </div>
        )}
      </section>

      {/* current player's hand */}
      <section className="tray">
        <div className="tiles">
          {sortedHand.map((t) => (
            <TileView
              key={t.id}
              tile={t}
              drawn={t.id === state.lastDrawnId}
              onClick={canDiscard ? () => discard(t.id) : undefined}
            />
          ))}
        </div>
      </section>

      {/* banners */}
      {state.phase === 'won' && (
        <div className="banner win">
          🎉 {state.players[state.winner!].name} wins with{' '}
          <strong>{state.winningHand?.label}</strong>
        </div>
      )}
      {state.phase === 'exhausted' && (
        <div className="banner wash">No tiles left — nobody completed a hand.</div>
      )}

      {/* controls */}
      <footer className="controls">
        {state.phase === 'playing' && canDraw && (
          <button className="btn primary" onClick={draw}>
            Draw tile
          </button>
        )}
        {state.phase === 'playing' && canDiscard && (
          <>
            <span className="hint">Tap a tile above to discard it</span>
            <button className={`btn ${winAvailable ? 'glow' : ''}`} onClick={declare}>
              Declare mahjong
            </button>
          </>
        )}
        <button className="btn ghost" onClick={newGame}>
          New game
        </button>
      </footer>

      {notice && <div className="notice">{notice}</div>}

      <p className="hotseat-note">
        Single device for now — after you discard, pass it to the next player. (Playing across
        separate devices comes next.)
      </p>
    </div>
  );
}

/* ---------- styles ---------- */

const CSS = `
body { margin: 0; background: #0e3b2e; }
#root { max-width: none; margin: 0; padding: 0; text-align: left; }

.table {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 32px 20px 56px;
  background: radial-gradient(120% 80% at 50% 0%, #1b5e46 0%, #0e3b2e 60%, #0a2c22 100%);
  color: #eaf2ee;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.head { text-align: center; }
.head h1 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 40px;
  letter-spacing: 2px;
  font-weight: 600;
  color: #f4ead2;
}
.status {
  margin: 6px 0 0;
  font-size: 14px;
  letter-spacing: 1px;
  color: #bcd8cb;
}

.seats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.seat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 84px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.08);
}
.seat.active {
  background: rgba(244,234,210,0.16);
  border-color: #f4ead2;
  box-shadow: 0 0 0 1px #f4ead2 inset;
}
.seat-name { font-size: 13px; font-weight: 600; color: #f4ead2; }
.seat-count { font-size: 11px; color: #9cc3b2; margin-top: 2px; }

.discard-area { width: 100%; max-width: 880px; text-align: center; }
.discard-title {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #80a795;
  margin-bottom: 8px;
}
.discard-empty { font-size: 13px; color: #6f9486; font-style: italic; }

.tray {
  max-width: 880px;
  padding: 18px 18px 22px;
  border-radius: 16px;
  background: linear-gradient(180deg, #8a5a33 0%, #6f4625 60%, #5d3a1e 100%);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,0.18),
    inset 0 -10px 18px rgba(0,0,0,0.35),
    0 16px 30px rgba(0,0,0,0.4);
}

.tiles { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }

.tile {
  appearance: none;
  border: none;
  font: inherit;
  color: inherit;
  width: 50px;
  height: 68px;
  border-radius: 8px;
  background: linear-gradient(180deg, #fffdf6 0%, #f3ecd9 100%);
  box-shadow: inset 0 1px 0 #ffffff, 0 3px 0 #cdbf9e, 0 6px 10px rgba(0,0,0,0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  user-select: none;
  cursor: default;
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.tile.small { width: 38px; height: 52px; gap: 2px; }
.tile.clickable { cursor: pointer; }
.tile.clickable:hover { transform: translateY(-5px); }
.tile.clickable:focus-visible { outline: 3px solid #9cc3b2; outline-offset: 2px; }
.tile.drawn { box-shadow: inset 0 1px 0 #fff, 0 3px 0 #cdbf9e, 0 0 0 3px #f4c64a, 0 6px 12px rgba(0,0,0,0.4); }

.tile-glyph {
  font-size: 26px; font-weight: 700; line-height: 1;
  font-family: 'Hiragino Sans', 'Segoe UI', system-ui, sans-serif;
}
.tile.small .tile-glyph { font-size: 19px; }
.tile-label { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #8a7e63; font-weight: 600; }
.tile.small .tile-label { font-size: 7px; }

.banner { padding: 12px 20px; border-radius: 12px; font-size: 16px; font-weight: 600; text-align: center; }
.banner.win { background: linear-gradient(180deg, #f6e7b8, #ecd28f); color: #5d3a1e; }
.banner.wash { background: rgba(0,0,0,0.3); color: #cdd9d2; }

.controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: center; }
.hint { font-size: 13px; color: #cdd9d2; }
.btn {
  appearance: none; border: none; cursor: pointer;
  padding: 11px 22px; border-radius: 10px; font-size: 15px; font-weight: 600;
  color: #0e3b2e; background: linear-gradient(180deg, #f4ead2 0%, #e3d3ad 100%);
  box-shadow: 0 4px 0 #b59b6a, 0 8px 14px rgba(0,0,0,0.3);
  transition: transform 80ms ease, box-shadow 80ms ease;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #b59b6a, 0 3px 8px rgba(0,0,0,0.3); }
.btn:focus-visible { outline: 3px solid #9cc3b2; outline-offset: 2px; }
.btn.primary { background: linear-gradient(180deg, #ffe9a8, #f4c64a); }
.btn.ghost { background: rgba(255,255,255,0.1); color: #eaf2ee; box-shadow: none; border: 1px solid rgba(255,255,255,0.2); }
.btn.ghost:active { transform: translateY(1px); }
.btn.glow { box-shadow: 0 0 0 2px #f4c64a, 0 4px 0 #b59b6a, 0 0 18px #f4c64a; }

.notice { padding: 8px 16px; border-radius: 8px; background: rgba(0,0,0,0.45); color: #ffd9a8; font-size: 13px; }

.hotseat-note { font-size: 12px; color: #6f9486; max-width: 520px; text-align: center; margin: 0; }

@media (prefers-reduced-motion: reduce) {
  .tile, .btn { transition: none; }
}
@media (max-width: 480px) {
  .tile { width: 42px; height: 58px; }
  .tile-glyph { font-size: 22px; }
}
`;