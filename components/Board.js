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

const FXICO = { sink: '💧', bite: '💥', capsize: '🌊', whirl: '🌀', volcano: '🌋', shark: '🦈', whale: '🐋', boat: '⛵', safe: '🎉', defend: '🛡', splash: '💦', dolphin: '🐬', serpentmove: '', sharkmove: '', whalemove: '' };
const FXCOL = { sink: '#8fd3ff', bite: '#ff5a5a', capsize: '#8fd3ff', whirl: '#c58bff', volcano: '#ff8a1f', shark: '#ff5a5a', whale: '#8fd3ff', boat: '#ffd166', safe: '#5ee08a', defend: '#ffd166', splash: '#8fd3ff', dolphin: '#8fd3ff', serpentmove: '#ff5a5a', sharkmove: '#ff5a5a', whalemove: '#8fd3ff' };
function pawn(g, e, r, swim) {
  return (
    <g>
      <circle r={r} fill={colOf(g, e.o, e.cs)} stroke={swim ? '#bfe9ff' : '#fff'} strokeWidth={swim ? 2 : 1.2} strokeDasharray={swim ? '2 1.5' : ''} />
      {e.v !== undefined && <text y="2.8" textAnchor="middle" fontSize="8" fontWeight="700" fill="#111">{e.v}</text>}
    </g>
  );
}

export default function Board({ g, hi, sel, onCell, scale = 1, fx }) {
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

  // ชิ้นส่วนทั้งหมดพร้อมตำแหน่ง (เพื่อให้เลื่อนอย่างนุ่มนวล)
  const items = [];
  Object.entries(byCell).forEach(([c, o]) => {
    const [cx, cy] = ctr(c);
    if (o.ship) {
      const sp = o.ship;
      items.push({ key: sp.id, x: cx, y: cy, node: <path d="M-13,-3 L13,-3 L8,6 L-8,6 Z" fill="#8a5a2b" stroke="#3d2610" strokeWidth="1.5" /> });
      sp.pax.forEach((e, i) => items.push({ key: e.id, x: cx - (sp.pax.length - 1) * 5.5 + i * 11, y: cy - 8, node: pawn(g, e, 5.2, false) }));
    }
    o.cr.forEach((k, i) => items.push({ key: k.id, x: cx - 8 + i * 10, y: cy - 8 + i * 4, node: <text textAnchor="middle" y="7" fontSize="19">{k.k === 'serpent' ? '🐉' : k.k === 'shark' ? '🦈' : '🐋'}</text> }));
    const n = o.ex.length;
    o.ex.forEach((e, i) => {
      const row = n > 4 ? Math.floor(i / 4) : 0;
      const inRow = n > 4 ? Math.min(4, n - row * 4) : n;
      const col = n > 4 ? i % 4 : i;
      items.push({ key: e.id, x: cx + (col - (inRow - 1) / 2) * 11, y: cy + 12 - row * 10, node: pawn(g, e, 5.3, e.loc[0] === 'sea') });
    });
  });
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
        {items.map((it) => (
          <g key={it.key} style={{ transform: `translate(${it.x}px, ${it.y}px)`, transition: 'transform .75s cubic-bezier(.4,.1,.2,1)' }}>
            <g className="pop">{it.node}</g>
          </g>
        ))}
        {(fx || []).map((f) => {
          const pos = f.c ? (f.c.startsWith('safe:') ? islandPos(f.c.slice(5)) : ctr(f.c)) : null;
          if (!pos) return null;
          return (
            <g key={f.i} transform={`translate(${pos[0]},${pos[1]})`}>
              <circle r="10" fill="none" stroke={FXCOL[f.k] || '#fff'} strokeWidth="4" className="ring" />
              <text textAnchor="middle" y="8" fontSize="30" className="fxico">{FXICO[f.k] || ''}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
