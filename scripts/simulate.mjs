// จำลองเกมสุ่มจนจบ เพื่อตรวจว่ากติกาไม่พัง
import { newGame, act, viewOf, setupPid } from '../lib/engine.js';
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
function step(g) {
  const pend = g.pending;
  if (pend) {
    if (pend.type === 'defend') return act(g, pend.defs[0], { type: Math.random() < 0.7 ? 'defend' : 'pass' });
    if (pend.type === 'boat') return act(g, pend.pid, { type: 'pickBoat', ids: pend.sw.slice(0, 3) });
  }
  if (g.phase === 'place' || g.phase === 'ships') {
    const pid = setupPid(g); const v = viewOf(g, pid);
    if (g.phase === 'place') {
      const e = Object.values(g.ex).find((x) => x.o === pid && x.loc[0] === 'hand');
      return act(g, pid, { type: 'place', eid: e.id, cell: rnd(v.my.opts.place) });
    }
    return act(g, pid, { type: 'ship', cell: rnd(v.my.opts.ship) });
  }
  const pid = g.turn.pid; const v = viewOf(g, pid); const o = v.my.opts; const t = g.turn;
  if (t.step === 'tile') {
    const pl = o.play; const kinds = Object.keys(pl);
    if (kinds.length && Math.random() < 0.6) {
      const u = rnd(kinds); const x = pl[u]; const ks = Object.keys(x);
      if (ks.length) {
        const id = rnd(ks);
        if (u === 'dolphin') return act(g, pid, { type: 'play', tile: u, eid: id, to: rnd(x[id]) });
        if (u === 'winds') return act(g, pid, { type: 'play', tile: u, sid: id, to: rnd(x[id]) });
        const free = Object.keys(g.cr).length && Object.keys({}).length === 0 ? null : null; void free;
        const cells = [...new Set(Object.values(g.ships).map((s) => s.c))];
        void cells;
        const sea = []; for (let x2 = 0; x2 < 13; x2++) for (let y = 0; y < 11; y++) { const c = `${x2},${y}`; if (!g.tiles[c] && !Object.values(g.ships).some((s) => s.c === c)) sea.push(c); }
        return act(g, pid, { type: 'play', tile: u, cid: id, to: rnd(sea) });
      }
    }
    return act(g, pid, { type: 'skipTile' });
  }
  if (t.step === 'move') {
    const mv = [];
    for (const [id, l] of Object.entries(o.ex || {})) l.forEach((d) => mv.push({ type: 'moveEx', id, to: d }));
    for (const [id, l] of Object.entries(o.ship || {})) l.forEach((d) => mv.push({ type: 'moveShip', id, to: d }));
    if (!mv.length || Math.random() < 0.08) return act(g, pid, { type: 'endMove' });
    const dist = (a, b) => { const f = (c) => { const [x, y] = c.split(',').map(Number); const q = x - (y - (y & 1)) / 2; return [q, y, -q - y]; }; const A = f(a), B = f(b); return Math.max(...A.map((v, i) => Math.abs(v - B[i]))); };
    const docks = ['0,0', '0,1', '11,0', '12,0', '0,9', '0,10', '11,9', '12,10'];
    const dd = (c) => Math.min(...docks.map((d) => dist(c, d)));
    const score = (m) => {
      if (m.to.t === 'safe') return 100;
      if (m.type === 'moveShip') return 50 - dd(m.to.c);
      if (m.to.t === 'ship') return 40;
      if (m.to.t === 'sea') return Math.random() < 0.3 ? 10 : -50;
      return 5 - Math.random();
    };
    mv.sort((a, b) => score(b) - score(a));
    if (Math.random() < 0.7) return act(g, pid, mv[0]);
    return act(g, pid, rnd(mv));
  }
  if (t.step === 'remove') return act(g, pid, { type: 'remove', cell: rnd(o.remove) });
  if (t.step === 'roll') return act(g, pid, { type: 'roll' });
  if (t.step === 'creature') {
    const ids = Object.keys(o.creature);
    const id = rnd(ids); const l = o.creature[id];
    if (!l.length || Math.random() < 0.2) return act(g, pid, { type: 'cskip' });
    return act(g, pid, { type: 'cmove', cid: id, to: rnd(l) });
  }
  throw new Error('stuck ' + t.step);
}
let games = 0, safeTotal = 0; globalThis.DBG = process.env.DBG;
for (let n of [2, 3, 4, 5, 6, 4, 3, 4]) {
  const players = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i }));
  const g = newGame(players);
  let steps = 0;
  while (g.phase !== 'over') {
    const r = step(g);
    if (!r.ok) throw new Error(`rejected: ${r.error} phase=${g.phase} step=${g.turn && g.turn.step} pend=${g.pending && g.pending.type}`);
    if (++steps > 20000) throw new Error('too long');
    if (globalThis.DBG && steps % 15 === 0 && g.phase === 'play') { const c = {}; Object.values(g.ex).forEach((e) => { c[e.loc[0]] = (c[e.loc[0]] || 0) + 1; }); console.log(steps, g.turn.step, JSON.stringify(c), 'tiles', Object.keys(g.tiles).length, 'ships', Object.values(g.ships).map((s) => s.c).join('|')); }
    const left = Object.values(g.ex).filter((e) => e.loc[0] === 'hand').length; void left;
  }
  // ตรวจความสอดคล้อง
  const cnt = {}; Object.values(g.ex).forEach((e) => { cnt[e.loc[0]] = (cnt[e.loc[0]] || 0) + 1; });
  games++; safeTotal += cnt.safe || 0;
  console.log(`n=${n} steps=${steps} winner=${g.winner} ex=${JSON.stringify(cnt)} scores=${JSON.stringify(g.scores)}`);
}
console.log('ok games', games);
