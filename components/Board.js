'use client';
import { CELLS, W, H, xy, SAFE, TILE_CELLS, CENTER } from '@/lib/board';

export const COLORS = { red: '#e74c3c', blue: '#3b8ff3', yellow: '#f4d03f', green: '#3fc76b', purple: '#a45bd6', orange: '#f08a2c' };
const R = 26;
const w = Math.sqrt(3) * R;
const pad = R * 3.3;
const VW = pad * 2 + 12.5 * w;
const VH = pad * 2 + 15 * R;
const ctr = (c) => { const [x, y] = xy(c); return [pad + (x + 0.5 * (y % 2)) * w + w / 2 - w / 2, pad + y * 1.5 * R]; };
const hexPts = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => `${(cx + r * Math.cos((Math.PI / 180) * (60 * i - 30))).toFixed(1)},${(cy + r * Math.sin((Math.PI / 180) * (60 * i - 30))).toFixed(1)}`).join(' ');
const TCOL = { B: '#f2dea6', F: '#7fb561', M: '#a8a39b' };
const TICO = { B: '', F: '🌲', M: '⛰' };
const CORNER = { NW: [0, 0, -1, -1], NE: [12, 0, 1, -1], SW: [0, 10, -1, 1], SE: [12, 10, 1, 1] };
const islandPos = (k) => { const [x, y, sx, sy] = CORNER[k]; const [cx, cy] = ctr(`${x},${y}`); return [cx + sx * R * 1.45, cy + sy * R * 1.35]; };
export { VW, VH };

function colOf(g, o, cs) { return COLORS[(g.col[o] || [])[cs] || (g.col[o] || [])[0]] || '#ccc'; }

export default function Board({ g, hi, sel, onCell, scale = 1 }) {
  const hiSet = new Set((hi && hi.cells) || []);
  const hiIsl = new Set((hi && hi.islands) || []);
  const byCell = {};
  const at = (c) => (byCell[c] = byCell[c] || { ex: [], ship: null, cr: [] });
  g.ex.forEach((e) => {
    if (e.loc[0] === 'tile' || e.loc[0] === 'sea') at(e.loc[1]).ex.push(e);
  });
  const shipById = {};
  g.ships.forEach((s) => { s.pax = []; shipById[s.id] = s; at(s.c).ship = s; });
  g.ex.forEach((e) => { if (e.loc[0] === 'ship' && shipById[e.loc[1]]) { const s = shipById[e.loc[1]]; s.pax.push(e); } });
  g.cr.forEach((c) => at(c.c).cr.push(c));

  const sea = CELLS.filter((c) => !g.tiles[c]);
  const docks = new Set(Object.values(SAFE).flat());
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: `${100 * scale}%`, display: 'block', touchAction: 'manipulation' }} fontFamily="sans-serif">
      <defs>
        <radialGradient id="seag" cx="50%" cy="50%" r="75%"><stop offset="0" stopColor="#2f86c6" /><stop offset="1" stopColor="#154a73" /></radialGradient>
      </defs>
      <rect width={VW} height={VH} rx="18" fill="url(#seag)" />
      {sea.map((c) => {
        const [cx, cy] = ctr(c);
        const hl = hiSet.has(c);
        return (
          <g key={c} onClick={() => onCell && onCell(c)} style={{ cursor: hl ? 'pointer' : 'default' }}>
            <polygon points={hexPts(cx, cy, R - 1)} fill={docks.has(c) ? '#3a9bd8' : '#2b78b0'} fillOpacity={c === CENTER ? 0.85 : 1} stroke="#0f3a5c" strokeWidth="1.2" />
            {docks.has(c) && <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" opacity="0.6">⚓</text>}
            {hl && <polygon points={hexPts(cx, cy, R - 2)} fill="#ffe066" fillOpacity="0.32" stroke="#ffe066" strokeWidth="3" className="pulse" />}
            {sel === c && <polygon points={hexPts(cx, cy, R - 2)} fill="none" stroke="#fff" strokeWidth="3.5" />}
          </g>
        );
      })}
      {Object.keys(SAFE).map((k) => {
        const [ix, iy] = islandPos(k);
        const hl = hiIsl.has(k);
        const saved = g.ex.filter((e) => e.loc[0] === 'safe' && e.loc[1] === k);
        return (
          <g key={k} onClick={() => onCell && onCell('safe:' + k)} style={{ cursor: hl ? 'pointer' : 'default' }}>
            {SAFE[k].map((d) => { const [dx, dy] = ctr(d); return <line key={d} x1={ix} y1={iy} x2={dx} y2={dy} stroke="#4c9a52" strokeWidth="7" strokeLinecap="round" />; })}
            <ellipse cx={ix} cy={iy} rx={R * 1.5} ry={R * 1.2} fill="#58a95e" stroke={hl ? '#ffe066' : '#2d6a31'} strokeWidth={hl ? 5 : 3} className={hl ? 'pulse' : ''} />
            <text x={ix} y={iy - 3} textAnchor="middle" fontSize="20">🌴</text>
            {saved.map((e, i) => (
              <circle key={e.id} cx={ix - ((saved.length - 1) * 6) + i * 12} cy={iy + 14} r="5" fill={colOf(g, e.o, e.cs)} stroke="#fff" strokeWidth="1.2" />
            ))}
          </g>
        );
      })}
      {TILE_CELLS.filter((c) => g.tiles[c]).map((c) => {
        const [cx, cy] = ctr(c);
        const t = g.tiles[c];
        const hl = hiSet.has(c);
        return (
          <g key={c} onClick={() => onCell && onCell(c)} style={{ cursor: hl ? 'pointer' : 'default' }}>
            <polygon points={hexPts(cx, cy, R - 1)} fill={TCOL[t]} stroke="#1a1a1a" strokeWidth="2" />
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" opacity="0.85">{TICO[t]}</text>
            {hl && <polygon points={hexPts(cx, cy, R - 2)} fill="#ffe066" fillOpacity="0.38" stroke="#ff9f1a" strokeWidth="3.5" className="pulse" />}
            {sel === c && <polygon points={hexPts(cx, cy, R - 2)} fill="none" stroke="#fff" strokeWidth="3.5" />}
          </g>
        );
      })}
      <g style={{ pointerEvents: 'none' }}>
        {Object.entries(byCell).map(([c, o]) => {
          const [cx, cy] = ctr(c);
          const els = [];
          if (o.ship) {
            const s = o.ship;
            els.push(
              <g key="ship">
                <path d={`M${cx - 13},${cy - 3} L${cx + 13},${cy - 3} L${cx + 8},${cy + 6} L${cx - 8},${cy + 6} Z`} fill="#8a5a2b" stroke="#3d2610" strokeWidth="1.5" />
                {s.pax.map((e, i) => (
                  <g key={e.id}>
                    <circle cx={cx - (s.pax.length - 1) * 5.5 + i * 11} cy={cy - 8} r="5.2" fill={colOf(g, e.o, e.cs)} stroke="#fff" strokeWidth="1.2" />
                    {e.v !== undefined && <text x={cx - (s.pax.length - 1) * 5.5 + i * 11} y={cy - 5.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#111">{e.v}</text>}
                  </g>
                ))}
              </g>,
            );
          }
          o.cr.forEach((k, i) => {
            const ico = k.k === 'serpent' ? '🐉' : k.k === 'shark' ? '🦈' : '🐋';
            els.push(<text key={k.id} x={cx - 8 + i * 10} y={cy - 8 + i * 4} textAnchor="middle" fontSize="19">{ico}</text>);
          });
          const n = o.ex.length;
          o.ex.forEach((e, i) => {
            const row = n > 4 ? Math.floor(i / 4) : 0;
            const inRow = n > 4 ? Math.min(4, n - row * 4) : n;
            const col = n > 4 ? i % 4 : i;
            const x = cx + (col - (inRow - 1) / 2) * 11;
            const y = cy + 12 - row * 10;
            els.push(
              <g key={e.id}>
                <circle cx={x} cy={y} r="5.3" fill={colOf(g, e.o, e.cs)} stroke={e.loc[0] === 'sea' ? '#bfe9ff' : '#fff'} strokeWidth={e.loc[0] === 'sea' ? 2 : 1.2} strokeDasharray={e.loc[0] === 'sea' ? '2 1.5' : ''} />
                {e.v !== undefined && <text x={x} y={y + 2.8} textAnchor="middle" fontSize="8" fontWeight="700" fill="#111">{e.v}</text>}
              </g>,
            );
          });
          return <g key={c}>{els}</g>;
        })}
      </g>
    </svg>
  );
}
