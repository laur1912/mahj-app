import { useState, type ReactNode } from 'react';
import {
  createGame,
  applyAction,
  winCheck,
  callOptions,
  isJoker,
  type GameState,
  type Direction,
  type Player,
} from './game/game-engine';
import { mockCard as exampleCard } from './game/card';
import { suggestHands } from './game/matcher';
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
  selected,
  locked,
}: {
  tile: Tile;
  onClick?: () => void;
  drawn?: boolean;
  small?: boolean;
  selected?: boolean;
  locked?: boolean;
}) {
  const f = tileFace(tile.type);
  const handleClick = locked ? undefined : onClick;
  const cls = [
    'tile',
    small ? 'small' : '',
    handleClick ? 'clickable' : '',
    drawn ? 'drawn' : '',
    selected ? 'selected' : '',
    locked ? 'locked' : '',
  ]
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
  if (handleClick) {
    return (
      <button type="button" className={cls} onClick={handleClick} title={`${f.glyph} ${f.label}`}>
        {inner}
      </button>
    );
  }
  return (
    <div className={cls} title={locked ? 'Jokers cannot be passed' : `${f.glyph} ${f.label}`}>
      {inner}
    </div>
  );
}

function TileBack() {
  return (
    <div className="tile back small" aria-hidden="true">
      <span className="back-mark" />
    </div>
  );
}

/* ---------- table pieces ---------- */

function OpponentRack({ player, tag }: { player: Player; tag?: string }) {
  const backs = Math.min(player.hand.length, 13);
  return (
    <div className="opp">
      <div className="opp-head">
        <span className="opp-name">{player.name}</span>
        {tag && <span className="opp-tag">{tag}</span>}
      </div>
      <div className="opp-backs">
        {Array.from({ length: backs }).map((_, k) => (
          <TileBack key={k} />
        ))}
      </div>
      <div className="opp-meta">
        {player.hand.length} tiles
        {player.exposures.length > 0 ? ` · ${player.exposures.length} exposed` : ''}
      </div>
      {player.exposures.length > 0 && (
        <div className="exposures">
          {player.exposures.map((meld, k) => (
            <div className="meld" key={k}>
              {meld.map((t) => (
                <TileView key={t.id} tile={t} small />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Suggestions({ tiles }: { tiles: Tile[] }) {
  const sugg = suggestHands(tiles, exampleCard, 3);
  return (
    <div className="suggestions">
      <div className="sugg-title">Hands you&apos;re closest to</div>
      {sugg.map(({ hand, away }) => (
        <div className="sugg-row" key={hand.id}>
          <div className="sugg-main">
            <span className="sugg-name">{hand.label}</span>
            <span className="sugg-desc">{hand.description ?? hand.section}</span>
          </div>
          <span className={`sugg-away ${away === 0 ? 'done' : ''}`}>
            {away === 0 ? 'complete' : `${away} away`}
          </span>
        </div>
      ))}
    </div>
  );
}

function CardModal({ onClose }: { onClose: () => void }) {
  const sections = [...new Set(exampleCard.map((h) => h.section))];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>The card</h2>
          <button className="btn tiny ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          {sections.map((sec) => (
            <div className="card-section" key={sec}>
              <div className="card-section-name">{sec}</div>
              {exampleCard
                .filter((h) => h.section === sec)
                .map((h) => (
                  <div className="card-row" key={h.id}>
                    <span className="card-label">{h.label}</span>
                    <span className="card-desc">{h.description ?? ''}</span>
                    <span className="card-pts">
                      {h.points}
                      {h.concealed ? ' · C' : ''}
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TableLayout({
  across,
  left,
  right,
  center,
  you,
}: {
  across: ReactNode;
  left: ReactNode;
  right: ReactNode;
  center: ReactNode;
  you: ReactNode;
}) {
  return (
    <div className="table-grid">
      <div className="cell across">{across}</div>
      <div className="cell left">{left}</div>
      <div className="cell center">{center}</div>
      <div className="cell right">{right}</div>
      <div className="cell you">{you}</div>
    </div>
  );
}

const DIR_WORD: Record<Direction, string> = {
  right: 'to the right',
  across: 'across the table',
  left: 'to the left',
};

function sortHand(hand: Tile[]): Tile[] {
  return [...hand].sort((a, b) => sortKey(a.type) - sortKey(b.type));
}

/** Seat positions around the table, with `bottom` always nearest the viewer. */
function seatLayout(bottom: number) {
  return {
    bottom,
    right: (bottom + 1) % 4,
    across: (bottom + 2) % 4,
    left: (bottom + 3) % 4,
  };
}

/* ---------- app ---------- */

export default function App() {
  const [state, setState] = useState<GameState>(() => createGame(exampleCard));
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);

  function newGame() {
    setState(createGame(exampleCard));
    setSelected([]);
    setNotice(null);
  }

  let content: ReactNode;

  /* ----- Charleston: tile-selection ----- */
  if (state.phase === 'charleston' && state.charleston) {
    const c = state.charleston;
    const player = state.players[c.selecting];
    const dir = c.queue[0];
    const roundLabel = c.round === 1 ? 'First Charleston' : 'Second Charleston';
    const passNo = 4 - c.queue.length;

    const toggle = (t: Tile) => {
      if (isJoker(t)) return;
      setSelected((cur) =>
        cur.includes(t.id) ? cur.filter((x) => x !== t.id) : cur.length < 3 ? [...cur, t.id] : cur,
      );
    };
    const confirmPass = () => {
      if (selected.length !== 3) return;
      setState(applyAction(state, { type: 'charlestonSelect', tileIds: selected }));
      setSelected([]);
    };

    content = (
      <>
        <header className="head">
          <p className="status">
            {roundLabel} · pass {passNo} of 3 — {player.name}, pick 3 tiles to pass {DIR_WORD[dir]}
          </p>
        </header>
        <section className="tray">
          <div className="tiles">
            {sortHand(player.hand).map((t) => (
              <TileView
                key={t.id}
                tile={t}
                locked={isJoker(t)}
                selected={selected.includes(t.id)}
                onClick={() => toggle(t)}
              />
            ))}
          </div>
        </section>
        <p className="select-info">Selected {selected.length} / 3 · jokers can&apos;t be passed</p>
        <Suggestions tiles={player.hand} />
        <footer className="controls">
          <button className="btn primary" disabled={selected.length !== 3} onClick={confirmPass}>
            Pass these 3 →
          </button>
          <button
            className="btn ghost"
            onClick={() => setState(applyAction(state, { type: 'skipCharleston' }))}
          >
            Skip Charleston
          </button>
        </footer>
        <p className="hotseat-note">
          Pass the device to {player.name} to choose, then on to the next player.
        </p>
      </>
    );
  } else if (state.phase === 'charlestonDecision') {
    /* ----- Charleston: second-round decision ----- */
    content = (
      <>
        <header className="head">
          <p className="status">First Charleston complete</p>
        </header>
        <div className="decision">
          <p>Run an optional second Charleston (3 more passes)?</p>
          <div className="controls">
            <button
              className="btn primary"
              onClick={() => setState(applyAction(state, { type: 'charlestonSecond', agree: true }))}
            >
              Yes, pass again
            </button>
            <button
              className="btn"
              onClick={() => setState(applyAction(state, { type: 'charlestonSecond', agree: false }))}
            >
              No — start playing
            </button>
          </div>
        </div>
      </>
    );
  } else if (state.phase === 'callWindow' && state.pendingDiscard) {
    /* ----- call window: a discard is claimable ----- */
    const seats = seatLayout(state.discarder!);
    const callers = [0, 1, 2, 3]
      .map((i) => ({ i, opts: callOptions(state, i) }))
      .filter((x) => x.opts.pung || x.opts.kong || x.opts.mahjong);

    const call = (i: number, kind: 'pung' | 'kong' | 'mahjong') =>
      setState(applyAction(state, { type: 'call', player: i, kind }));

    content = (
      <>
        <header className="head">
          <p className="status">
            {state.players[state.discarder!].name} discarded — anyone claim it?
          </p>
        </header>
        <TableLayout
          across={<OpponentRack player={state.players[seats.across]} />}
          left={<OpponentRack player={state.players[seats.left]} />}
          right={<OpponentRack player={state.players[seats.right]} />}
          center={
            <div className="center-discard">
              <div className="discard-title">Just discarded</div>
              <div className="tiles">
                <TileView tile={state.pendingDiscard} drawn />
              </div>
            </div>
          }
          you={<OpponentRack player={state.players[seats.bottom]} tag="discarded" />}
        />
        <div className="call-panel">
          {callers.map(({ i, opts }) => (
            <div className="caller-row" key={i}>
              <span className="caller-name">{state.players[i].name} can:</span>
              {opts.mahjong && (
                <button className="btn glow" onClick={() => call(i, 'mahjong')}>
                  Declare mahjong
                </button>
              )}
              {opts.pung && (
                <button className="btn" onClick={() => call(i, 'pung')}>
                  Pung
                </button>
              )}
              {opts.kong && (
                <button className="btn" onClick={() => call(i, 'kong')}>
                  Kong
                </button>
              )}
            </div>
          ))}
          <button
            className="btn primary"
            onClick={() => setState(applyAction(state, { type: 'passCall' }))}
          >
            Pass — let it go
          </button>
        </div>
        <p className="hotseat-note">
          Whoever wants the tile taps their call; otherwise tap Pass to continue.
        </p>
      </>
    );
  } else {
    /* ----- the play board (playing / won / exhausted) ----- */
    const seats = seatLayout(state.turn);
    const current = state.players[state.turn];
    const sortedHand = sortHand(current.hand);
    const canDraw = state.phase === 'playing' && !state.awaitingDiscard;
    const canDiscard = state.phase === 'playing' && state.awaitingDiscard;
    const winAvailable = winCheck(state) !== null;
    const playing = state.phase === 'playing';
    const youTiles = [...current.hand, ...current.exposures.flat()];
    const lastDiscardId =
      state.discards.length > 0 ? state.discards[state.discards.length - 1].id : null;

    const draw = () => setState(applyAction(state, { type: 'draw' }));
    const discard = (tileId: string) => {
      if (!canDiscard) return;
      setState(applyAction(state, { type: 'discard', tileId }));
    };
    const declare = () => {
      if (winCheck(state)) {
        setState(applyAction(state, { type: 'declareWin' }));
      } else {
        setNotice('Not a complete hand from the card yet.');
        window.setTimeout(() => setNotice(null), 2500);
      }
    };

    let status: string;
    if (state.phase === 'won') status = `${state.players[state.winner!].name} wins!`;
    else if (state.phase === 'exhausted') status = 'The wall is empty — washout.';
    else if (canDiscard) status = `${current.name}'s turn — tap a tile to discard`;
    else status = `${current.name}'s turn — draw a tile`;

    content = (
      <>
        <header className="head">
          <p className="status">{status}</p>
        </header>
        <TableLayout
          across={<OpponentRack player={state.players[seats.across]} />}
          left={<OpponentRack player={state.players[seats.left]} />}
          right={<OpponentRack player={state.players[seats.right]} />}
          center={
            <div className="center-discard">
              <div className="discard-title">Discards</div>
              {state.discards.length === 0 ? (
                <div className="discard-empty">none yet</div>
              ) : (
                <div className="tiles">
                  {state.discards.slice(-18).map((t) => (
                    <TileView key={t.id} tile={t} small drawn={t.id === lastDiscardId} />
                  ))}
                </div>
              )}
            </div>
          }
          you={
            <div className="you-area">
              <div className="you-head">
                <span className="you-name">
                  {current.name}
                  {playing ? ' — your turn' : ''}
                </span>
              </div>
              {current.exposures.length > 0 && (
                <div className="exposures">
                  {current.exposures.map((meld, k) => (
                    <div className="meld" key={k}>
                      {meld.map((t) => (
                        <TileView key={t.id} tile={t} small />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="tray you-tray">
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
              </div>
              <footer className="controls">
                {canDraw && (
                  <button className="btn primary" onClick={draw}>
                    Draw tile
                  </button>
                )}
                {canDiscard && (
                  <>
                    <span className="hint">Tap a tile to discard</span>
                    <button className={`btn ${winAvailable ? 'glow' : ''}`} onClick={declare}>
                      Declare mahjong
                    </button>
                  </>
                )}
              </footer>
              {playing && <Suggestions tiles={youTiles} />}
            </div>
          }
        />
        {state.phase === 'won' && (
          <div className="banner win">
            🎉 {state.players[state.winner!].name} wins with{' '}
            <strong>{state.winningHand?.label}</strong>
          </div>
        )}
        {state.phase === 'exhausted' && (
          <div className="banner wash">No tiles left — nobody completed a hand.</div>
        )}
        {notice && <div className="notice">{notice}</div>}
        <p className="hotseat-note">
          Single device for now — pass it to the next player after each turn. (Separate-device play
          comes next.)
        </p>
      </>
    );
  }

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="topbar">
        <span className="brand">mahj</span>
        <div className="topbar-actions">
          <button className="btn tiny" onClick={() => setShowCard(true)}>
            View card
          </button>
          <button className="btn tiny ghost" onClick={newGame}>
            New game
          </button>
        </div>
      </div>
      {showCard && <CardModal onClose={() => setShowCard(false)} />}
      <div className="table">{content}</div>
    </div>
  );
}

/* ---------- styles ---------- */

const CSS = `
body { margin: 0; background: #0e3b2e; }
#root { max-width: none; margin: 0; padding: 0; text-align: left; }

.app { min-height: 100vh; }

.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px; background: rgba(8,30,23,0.92);
  backdrop-filter: blur(6px); border-bottom: 1px solid rgba(255,255,255,0.08);
}
.brand { font-family: Georgia, 'Times New Roman', serif; font-size: 22px; letter-spacing: 2px; color: #f4ead2; font-weight: 600; }
.topbar-actions { display: flex; gap: 8px; }

.table {
  min-height: calc(100vh - 53px); box-sizing: border-box; padding: 24px 18px 56px;
  background: radial-gradient(120% 80% at 50% 0%, #1b5e46 0%, #0e3b2e 60%, #0a2c22 100%);
  color: #eaf2ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex; flex-direction: column; align-items: center; gap: 18px;
}

.head { text-align: center; }
.status { margin: 0; font-size: 14px; letter-spacing: 1px; color: #bcd8cb; max-width: 640px; }

/* table grid */
.table-grid {
  width: 100%; max-width: 1000px; margin: 0 auto; display: grid; gap: 14px;
  grid-template-columns: minmax(120px, 1fr) minmax(220px, 2fr) minmax(120px, 1fr);
  grid-template-areas:
    ".     across .    "
    "left  center right"
    "you   you    you  ";
}
.cell { display: flex; flex-direction: column; align-items: center; }
.cell.across { grid-area: across; }
.cell.left { grid-area: left; }
.cell.right { grid-area: right; }
.cell.center {
  grid-area: center; align-self: stretch; justify-content: center;
  background: radial-gradient(80% 80% at 50% 50%, rgba(0,0,0,0.18), rgba(0,0,0,0.34));
  border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 14px; min-height: 130px;
}
.cell.you { grid-area: you; align-self: stretch; }
.center-discard { text-align: center; width: 100%; }

/* opponents */
.opp {
  width: 100%; max-width: 240px;
  background: rgba(0,0,0,0.24); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.opp-head { display: flex; align-items: center; gap: 8px; }
.opp-name { font-size: 13px; font-weight: 600; color: #f4ead2; }
.opp-tag { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #0e3b2e; background: #f4c64a; padding: 2px 6px; border-radius: 6px; }
.opp-backs { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; max-width: 220px; }
.opp-meta { font-size: 11px; color: #9cc3b2; }

/* your area */
.you-area { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.you-head { display: flex; align-items: center; gap: 10px; }
.you-name { font-size: 15px; font-weight: 700; color: #f4ead2; letter-spacing: 1px; }
.you-tray { width: 100%; max-width: 860px; }

.exposures { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; justify-content: center; }
.meld { display: flex; gap: 2px; padding: 3px; border-radius: 6px; background: rgba(0,0,0,0.2); }

.discard-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #80a795; margin-bottom: 8px; }
.discard-empty { font-size: 13px; color: #6f9486; font-style: italic; }

.tray {
  max-width: 880px; padding: 16px 16px 20px; border-radius: 16px;
  background: linear-gradient(180deg, #8a5a33 0%, #6f4625 60%, #5d3a1e 100%);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -10px 18px rgba(0,0,0,0.35), 0 16px 30px rgba(0,0,0,0.4);
}
.tiles { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }

.tile {
  appearance: none; border: none; font: inherit; color: inherit;
  width: 50px; height: 68px; border-radius: 8px;
  background: linear-gradient(180deg, #fffdf6 0%, #f3ecd9 100%);
  box-shadow: inset 0 1px 0 #ffffff, 0 3px 0 #cdbf9e, 0 6px 10px rgba(0,0,0,0.35);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  user-select: none; cursor: default; transition: transform 120ms ease, box-shadow 120ms ease;
}
.tile.small { width: 38px; height: 52px; gap: 2px; }
.tile.clickable { cursor: pointer; }
.tile.clickable:hover { transform: translateY(-5px); }
.tile.clickable:focus-visible { outline: 3px solid #9cc3b2; outline-offset: 2px; }
.tile.drawn { box-shadow: inset 0 1px 0 #fff, 0 3px 0 #cdbf9e, 0 0 0 3px #f4c64a, 0 6px 12px rgba(0,0,0,0.4); }
.tile.selected { transform: translateY(-9px); box-shadow: inset 0 1px 0 #fff, 0 3px 0 #cdbf9e, 0 0 0 3px #5fb0e0, 0 8px 14px rgba(0,0,0,0.45); }
.tile.locked { opacity: 0.4; cursor: not-allowed; }

/* face-down tile */
.tile.back {
  background: linear-gradient(180deg, #1c6b50 0%, #145740 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 3px 0 #0c3527, 0 5px 8px rgba(0,0,0,0.35);
  align-items: center; justify-content: center;
}
.tile.back.small { width: 22px; height: 30px; border-radius: 5px; gap: 0; }
.back-mark { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid rgba(244,234,210,0.55); }

.tile-glyph { font-size: 26px; font-weight: 700; line-height: 1; font-family: 'Hiragino Sans', 'Segoe UI', system-ui, sans-serif; }
.tile.small .tile-glyph { font-size: 19px; }
.tile-label { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #8a7e63; font-weight: 600; }
.tile.small .tile-label { font-size: 7px; }

.select-info { font-size: 13px; color: #bcd8cb; margin: 0; }
.decision { text-align: center; display: flex; flex-direction: column; gap: 18px; align-items: center; }
.decision p { font-size: 16px; color: #eaf2ee; margin: 0; }

/* suggestions */
.suggestions { width: 100%; max-width: 520px; background: rgba(0,0,0,0.28); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 12px; }
.sugg-title { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #80a795; margin-bottom: 6px; text-align: center; }
.sugg-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.06); }
.sugg-row:first-of-type { border-top: none; }
.sugg-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sugg-name { font-weight: 700; color: #f4ead2; font-size: 13px; }
.sugg-desc { font-size: 11px; color: #9cc3b2; }
.sugg-away { font-size: 12px; color: #ffd9a8; font-weight: 600; white-space: nowrap; }
.sugg-away.done { color: #8be0a0; }

/* call panel */
.call-panel { display: flex; flex-direction: column; gap: 10px; align-items: center; }
.caller-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
.caller-name { font-size: 14px; color: #f4ead2; font-weight: 600; }

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
.btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: 0 4px 0 #b59b6a; }
.btn.primary { background: linear-gradient(180deg, #ffe9a8, #f4c64a); }
.btn.ghost { background: rgba(255,255,255,0.1); color: #eaf2ee; box-shadow: none; border: 1px solid rgba(255,255,255,0.2); }
.btn.ghost:active { transform: translateY(1px); }
.btn.glow { box-shadow: 0 0 0 2px #f4c64a, 0 4px 0 #b59b6a, 0 0 18px #f4c64a; }
.btn.tiny { padding: 7px 12px; font-size: 13px; box-shadow: 0 3px 0 #b59b6a, 0 6px 10px rgba(0,0,0,0.3); }
.btn.tiny.ghost { box-shadow: none; }

.notice { padding: 8px 16px; border-radius: 8px; background: rgba(0,0,0,0.45); color: #ffd9a8; font-size: 13px; }
.hotseat-note { font-size: 12px; color: #6f9486; max-width: 520px; text-align: center; margin: 0; }

/* card modal */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.55);
  display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; overflow-y: auto;
}
.modal {
  width: 100%; max-width: 560px; background-color: #103a2d;
  border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5); overflow: hidden;
}
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.modal-head h2 { margin: 0; font-family: Georgia, serif; font-size: 20px; color: #f4ead2; letter-spacing: 1px; }
.modal-body { padding: 8px 18px 20px; max-height: 70vh; overflow-y: auto; }
.card-section { margin-top: 14px; }
.card-section-name { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #80a795; margin-bottom: 4px; }
.card-row { display: flex; align-items: baseline; gap: 10px; padding: 7px 0; border-top: 1px solid rgba(255,255,255,0.06); }
.card-label { font-family: 'SFMono-Regular', Menlo, monospace; font-size: 13px; color: #f4ead2; font-weight: 700; flex: 0 0 auto; }
.card-desc { flex: 1 1 auto; font-size: 12px; color: #cdd9d2; }
.card-pts { font-size: 12px; color: #ffd9a8; font-weight: 600; white-space: nowrap; }

@media (prefers-reduced-motion: reduce) { .tile, .btn { transition: none; } }
@media (max-width: 640px) {
  .table-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "across across"
      "left   right"
      "center center"
      "you    you";
  }
}
@media (max-width: 480px) { .tile { width: 42px; height: 58px; } .tile-glyph { font-size: 22px; } }
`;