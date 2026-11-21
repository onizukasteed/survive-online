// ตรรกะเกม Survive (ฟังก์ชันล้วน ทำงานบนอ็อบเจกต์ g ที่เก็บเป็น JSON ได้)
import { CFG, IMMEDIATE, DEFENSE, UNDER_TH } from './config.js';
import { NB, TILE_CELLS, SAFE, DOCK_OF, SERPENT_START, CENTER } from './board.js';

function fx(g, k, c = null) {
  g.fxn = (g.fxn || 0) + 1;
  (g.fx = g.fx || []).push({ i: g.fxn, k, c });
  if (g.fx.length > 14) g.fx.shift();
}

const fail = (error) => ({ ok: false, error });
const OK = { ok: true };
const ORDER = ['B', 'F', 'M'];

export function shuffle(a, rnd = Math.random) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

// ---------- สร้างเกม ----------
// players: [{id,name}] ตามลำดับที่นั่ง (ตามเข็ม)
export function newGame(players, rnd = Math.random) {
  const n = players.length;
  const two = n === 2;
  const g = {
    rev: 1, phase: 'place', n, order: players.map((p) => p.id), names: {}, col: {},
    tiles: {}, ex: {}, ships: {}, cr: {}, hands: {}, spare: { shark: CFG.sharks, whale: CFG.whales },
    turn: null, pending: null, log: [], ev: 0, fx: [], fxn: 0, setup: { i: 0, s: 0, shipSeq: [] }, scores: null, winner: null,
  };
  // กระเบื้อง + ใต้กระเบื้อง
  const types = shuffle([].concat(...Object.entries(CFG.tiles).map(([t, k]) => Array(k).fill(t))), rnd);
  let unders = [].concat(...Object.entries(CFG.unders).map(([u, k]) => Array(k).fill(u)));
  while (unders.length < TILE_CELLS.length) unders.push('dolphin');
  unders = unders.slice(0, TILE_CELLS.length);
  // volcano ต้องอยู่ใต้ Mountain: สุ่มใต้ แล้วสลับถ้าไปตกที่ไม่ใช่ M
  unders = shuffle(unders, rnd);
  const cells = shuffle(TILE_CELLS, rnd);
  const vi = unders.indexOf('volcano');
  const mi = types.indexOf('M');
  if (types[vi] !== 'M') { [unders[vi], unders[mi]] = [unders[mi], unders[vi]]; }
  cells.forEach((c, i) => { g.tiles[c] = { ty: types[i], un: unders[i] }; });
  // งูทะเล
  SERPENT_START.forEach((c, i) => { g.cr['q' + i] = { id: 'q' + i, k: 'serpent', c }; });
  // ผู้เล่น + ตัวคน + เรือ
  const sets = two ? 2 : 1;
  players.forEach((p, pi) => {
    g.names[p.id] = p.name;
    g.hands[p.id] = [];
    g.col[p.id] = two ? [CFG.colors[pi * 2], CFG.colors[pi * 2 + 1]] : [CFG.colors[pi]];
    for (let s = 0; s < sets; s++) {
      let vals = CFG.values.slice();
      if (n === 5) { vals.splice(vals.indexOf(1), 1); vals.splice(vals.indexOf(3), 1); }
      if (n === 6) { for (const v of [1, 2, 3]) vals.splice(vals.indexOf(v), 1); }
      vals.forEach((v, i) => {
        const eid = `e${pi}_${s}_${i}`;
        g.ex[eid] = { id: eid, o: p.id, v, cs: s, loc: ['hand'] };
      });
    }
  });
  // ลำดับวางเรือ
  let per = two ? 4 : 2;
  const seq = [];
  for (let r = 0; r < per; r++) {
    players.forEach((p, pi) => {
      if (n === 5 && r === 1 && pi >= 2) return;
      if (n === 6 && r === 1 && pi >= 4) return;
      seq.push(p.id);
    });
  }
  g.setup.shipSeq = seq;
  g.setup.total = Object.keys(g.ex).length;
  // เลือกผู้เล่นแรกแบบสุ่ม โดยหมุนลำดับ
  const f = Math.floor(rnd() * n);
  g.order = g.order.slice(f).concat(g.order.slice(0, f));
  log(g, 'เริ่มเกม! ' + g.names[g.order[0]] + ' วางตัวคนก่อน', 'info');
  return g;
}

// ---------- ตัวช่วย ----------
export function log(g, m, k = 'info') {
  g.ev += 1;
  g.log.push({ i: g.ev, m, k });
  if (g.log.length > 40) g.log.shift();
}
const nm = (g, pid) => g.names[pid] || '?';
export const isSea = (g, c) => !g.tiles[c];
const eqCell = (a, b) => a === b;

export function exOf(g, pid, locKind) {
  return Object.values(g.ex).filter((e) => (!pid || e.o === pid) && (!locKind || e.loc[0] === locKind));
}
const active = (e) => ['tile', 'ship', 'sea'].includes(e.loc[0]);
const paxOf = (g, sid) => Object.values(g.ex).filter((e) => e.loc[0] === 'ship' && e.loc[1] === sid);
const shipAt = (g, c) => Object.values(g.ships).find((s) => s.c === c);
const crAt = (g, c, k) => Object.values(g.cr).filter((x) => x.c === c && (!k || x.k === k));
const swimmersAt = (g, c) => Object.values(g.ex).filter((e) => e.loc[0] === 'sea' && e.loc[1] === c);

export function controls(g, sid, pid) {
  const pax = paxOf(g, sid);
  if (!pax.length) return true;
  const cnt = {};
  pax.forEach((e) => { cnt[e.o] = (cnt[e.o] || 0) + 1; });
  const mine = cnt[pid] || 0;
  return mine > 0 && mine >= Math.max(...Object.values(cnt));
}
function controllers(g, sid) {
  const pax = paxOf(g, sid);
  const cnt = {};
  pax.forEach((e) => { cnt[e.o] = (cnt[e.o] || 0) + 1; });
  const mx = Math.max(0, ...Object.values(cnt));
  return Object.keys(cnt).filter((p) => cnt[p] === mx);
}
function kill(g, e) { e.loc = ['dead']; }
const dangerAt = (g, c) => crAt(g, c, 'serpent').length > 0 || crAt(g, c, 'shark').length > 0;

// ---------- เริ่ม / จบเทิร์น ----------
function startTurn(g, pid) {
  g.turn = { pid, step: 'tile', left: CFG.moves, used: [], rolled: null, reveal: null };
  fx(g, 'turn');
  if (!g.hands[pid].length) toMove(g);
}
function toMove(g) {
  g.turn.step = 'move';
  g.turn.left = CFG.moves;
  if (!exOf(g, g.turn.pid).some(active)) g.turn.step = 'remove';
}
function toRoll(g) { g.turn.step = 'roll'; }
function endTurn(g) {
  if (g.phase === 'over') return;
  const i = g.order.indexOf(g.turn.pid);
  startTurn(g, g.order[(i + 1) % g.n]);
  log(g, `ตาของ ${nm(g, g.turn.pid)}`, 'turn');
}
function resume(g) {
  if (g.phase === 'over') return;
  g.pending = null;
  const s = g.turn.step;
  if (s === 'tile') toMove(g);
  else if (s === 'remove') toRoll(g);
  else if (s === 'creature') endTurn(g);
}

// ---------- กระเบื้องที่ถอนได้ ----------
export function removable(g) {
  const present = Object.keys(g.tiles);
  if (!present.length) return [];
  const low = ORDER.find((t) => present.some((c) => g.tiles[c].ty === t));
  const ofLow = present.filter((c) => g.tiles[c].ty === low);
  const ext = ofLow.filter((c) => NB[c].some((n) => !g.tiles[n]));
  return ext.length ? ext : ofLow;
}

// ---------- BFS ในทะเล ----------
function bfs(g, start, maxd, blocked) {
  const dist = { [start]: 0 };
  let fr = [start];
  for (let d = 1; d <= maxd; d++) {
    const nx = [];
    for (const c of fr) for (const n of NB[c]) {
      if (dist[n] !== undefined || g.tiles[n] || blocked(n)) continue;
      dist[n] = d; nx.push(n);
    }
    fr = nx;
  }
  delete dist[start];
  return dist;
}

// ---------- การเดินของตัวคน / เรือ ----------
export function exMoves(g, e) {
  const out = [];
  const [k, a] = e.loc;
  const open = (s) => paxOf(g, s.id).length < 3;
  if (k === 'tile') {
    for (const n of NB[a]) {
      if (g.tiles[n]) out.push({ t: 'tile', c: n });
      else {
        out.push({ t: 'sea', c: n });
        const s = shipAt(g, n);
        if (s && open(s)) out.push({ t: 'ship', s: s.id, c: n });
      }
    }
  } else if (k === 'ship') {
    const s = g.ships[a];
    for (const n of NB[s.c]) {
      const o = shipAt(g, n);
      if (o && open(o)) out.push({ t: 'ship', s: o.id, c: n });
    }
    out.push({ t: 'sea', c: s.c });
    if (DOCK_OF[s.c]) out.push({ t: 'safe', i: DOCK_OF[s.c] });
  } else if (k === 'sea' && !g.turn.used.includes(e.id)) {
    for (const n of NB[a]) if (!g.tiles[n]) out.push({ t: 'sea', c: n });
    const s = shipAt(g, a);
    if (s && open(s)) out.push({ t: 'ship', s: s.id, c: a });
    if (DOCK_OF[a]) out.push({ t: 'safe', i: DOCK_OF[a] });
  }
  return out;
}

export function shipMoves(g, s, pid) {
  if (s.c === null || !controls(g, s.id, pid)) return [];
  return NB[s.c].filter((n) => !g.tiles[n] && !shipAt(g, n)).map((c) => ({ t: 'sea', c }));
}

// ผู้เล่นที่ถึงตา: ตัวเลือกเดินทั้งหมด
export function moveOptions(g, pid) {
  const ex = {}, ship = {};
  if (g.turn.left < 1) return { ex, ship };
  for (const e of exOf(g, pid)) {
    if (!active(e)) continue;
    const m = exMoves(g, e);
    if (m.length) ex[e.id] = m;
  }
  for (const s of Object.values(g.ships)) {
    const m = shipMoves(g, s, pid);
    if (m.length) ship[s.id] = m;
  }
  return { ex, ship };
}

function moveExplorer(g, pid, eid, to) {
  const e = g.ex[eid];
  if (!e || e.o !== pid || !active(e)) return fail('ย้ายตัวนี้ไม่ได้');
  if (g.turn.left < 1) return fail('แต้มเดินหมดแล้ว');
  const ok = exMoves(g, e).find((m) => m.t === to.t && (m.c || null) === (to.c || null) && (m.s || null) === (to.s || null) && (m.i || null) === (to.i || null));
  if (!ok) return fail('เดินไปตรงนั้นไม่ได้');
  const wasSea = e.loc[0] === 'sea';
  g.turn.left -= 1;
  if (to.t === 'tile') e.loc = ['tile', to.c];
  else if (to.t === 'ship') { e.loc = ['ship', to.s]; if (wasSea) g.turn.used.push(e.id); }
  else if (to.t === 'safe') {
    e.loc = ['safe', to.i];
    log(g, `${nm(g, pid)} พาคนขึ้นเกาะปลอดภัย`, 'safe');
    fx(g, 'safe', 'safe:' + to.i);
  } else if (to.t === 'sea') {
    e.loc = ['sea', to.c];
    g.turn.used.push(e.id);
    fx(g, 'splash', to.c);
    if (dangerAt(g, to.c)) {
      fx(g, 'bite', to.c);
      kill(g, e);
      log(g, `คนของ ${nm(g, pid)} ว่ายเข้าสัตว์ร้ายและถูกกำจัด`, 'bite');
    }
  }
  return OK;
}

function moveShip(g, pid, sid, to) {
  const s = g.ships[sid];
  if (!s || s.c === null) return fail('ไม่พบเรือ');
  if (g.turn.left < 1) return fail('แต้มเดินหมดแล้ว');
  if (!shipMoves(g, s, pid).find((m) => m.c === to.c)) return fail('เดินเรือไปตรงนั้นไม่ได้');
  g.turn.left -= 1;
  s.c = to.c;
  shipEnter(g, s);
  return OK;
}

// เรือเข้าช่อง: ตรวจงู/วาฬ (เรือที่มีคนเท่านั้นที่ถูกทำร้าย)
function shipEnter(g, s) {
  const pax = paxOf(g, s.id);
  if (!pax.length) return;
  if (crAt(g, s.c, 'serpent').length) {
    pax.forEach((e) => kill(g, e));
    fx(g, 'bite', s.c);
    s.c = null;
    log(g, 'เรือชนงูทะเล! เรือและคนบนเรือถูกกำจัด', 'bite');
    return;
  }
  if (crAt(g, s.c, 'whale').length) {
    capsize(g, s);
  }
}
function capsize(g, s) {
  const c = s.c;
  const pax = paxOf(g, s.id);
  s.c = null;
  const lethal = dangerAt(g, c);
  fx(g, 'capsize', c);
  pax.forEach((e) => { e.loc = lethal ? ['dead'] : ['sea', c]; });
  log(g, lethal ? 'วาฬคว่ำเรือ คนที่ตกน้ำถูกสัตว์ร้ายกำจัด' : 'วาฬคว่ำเรือ! คนบนเรือตกน้ำ', 'bite');
}

// ---------- ถอนกระเบื้อง ----------
function doRemove(g, pid, cell) {
  if (!removable(g).includes(cell)) return fail('ถอนกระเบื้องนี้ไม่ได้ (ต้องเป็นหาดก่อน แล้วป่า แล้วภูเขา และติดทะเล)');
  const t = g.tiles[cell];
  delete g.tiles[cell];
  exOf(g).filter((e) => e.loc[0] === 'tile' && e.loc[1] === cell).forEach((e) => { e.loc = ['sea', cell]; });
  g.turn.reveal = { cell, un: t.un, th: UNDER_TH[t.un] };
  fx(g, 'sink', cell);
  const un = t.un;
  if (IMMEDIATE.includes(un)) {
    log(g, `${nm(g, pid)} เปิดใต้กระเบื้อง: ${UNDER_TH[un]}!`, un);
    applyImmediate(g, pid, cell, un);
  } else {
    g.hands[pid].push(un);
    log(g, `${nm(g, pid)} ได้ไพ่ลับ 1 ใบ`, 'info');
    resume(g);
  }
  return OK;
}

function applyImmediate(g, pid, cell, un) {
  fx(g, un === 'volcano' ? 'volcano' : un, un === 'volcano' ? CENTER : cell);
  if (un === 'volcano') { finish(g); return; }
  if (un === 'shark') {
    if (g.spare.shark > 0) {
      g.spare.shark--;
      const id = 'h' + g.ev;
      g.cr[id] = { id, k: 'shark', c: cell };
      const sw = swimmersAt(g, cell);
      sw.forEach((e) => kill(g, e));
      if (sw.length) log(g, `ฉลามโผล่และกำจัดคนที่ว่ายน้ำ ${sw.length} คน`, 'bite');
    }
  } else if (un === 'whale') {
    if (g.spare.whale > 0) { g.spare.whale--; const id = 'w' + g.ev; g.cr[id] = { id, k: 'whale', c: cell }; }
  } else if (un === 'boat') {
    const used = Object.keys(g.ships).length;
    if (used < CFG.shipsTotal) {
      const id = 's' + g.ev;
      g.ships[id] = { id, c: cell };
      const sw = swimmersAt(g, cell);
      if (sw.length <= 3) sw.forEach((e) => { e.loc = ['ship', id]; });
      else { g.pending = { type: 'boat', pid, sid: id, cell, sw: sw.map((e) => e.id) }; return; }
    }
  } else if (un === 'whirlpool') {
    const cs = [cell, ...NB[cell].filter((n) => !g.tiles[n])];
    for (const c of cs) {
      swimmersAt(g, c).forEach((e) => kill(g, e));
      const s = shipAt(g, c);
      if (s) { paxOf(g, s.id).forEach((e) => kill(g, e)); s.c = null; }
      Object.values(g.cr).filter((x) => x.c === c).forEach((x) => { x.c = null; });
    }
    log(g, 'วังวนกลืนทุกอย่างในบริเวณนั้น!', 'whirl');
  }
  resume(g);
}

function finish(g) {
  g.phase = 'over';
  exOf(g).forEach((e) => { if (e.loc[0] !== 'safe') e.loc = ['dead']; });
  const sc = {};
  g.order.forEach((p) => { sc[p] = { pts: 0, n: 0 }; });
  exOf(g).filter((e) => e.loc[0] === 'safe').forEach((e) => { sc[e.o].pts += e.v; sc[e.o].n += 1; });
  g.scores = sc;
  const best = Math.max(...Object.values(sc).map((x) => x.pts));
  g.winner = g.order.filter((p) => sc[p].pts === best);
  log(g, 'ภูเขาไฟระเบิด! เกมจบ', 'volcano');
  fx(g, 'win');
}

// ---------- สัตว์ประหลาด ----------
export function crMoves(g, cr) {
  if (cr.c === null) return [];
  const k = cr.k;
  const max = k === 'serpent' ? 1 : k === 'shark' ? 2 : 3;
  const dist = {}; // cell -> ได้ไหม
  let fr = [cr.c];
  const seen = new Set([cr.c]);
  for (let d = 1; d <= max; d++) {
    const nx = [];
    for (const c of fr) for (const n of NB[c]) {
      if (g.tiles[n] || seen.has(n)) continue;
      seen.add(n);
      dist[n] = true;
      const stop = (k === 'shark' && swimmersAt(g, n).length > 0) || (k === 'whale' && shipAt(g, n) && paxOf(g, shipAt(g, n).id).length > 0);
      if (!stop) nx.push(n);
    }
    fr = nx;
  }
  return Object.keys(dist);
}

function arrive(g, mover, cr, cell) {
  cr.c = cell;
  fx(g, cr.k + 'move', cell);
  if (cr.k === 'serpent') {
    const sw = swimmersAt(g, cell);
    sw.forEach((e) => kill(g, e));
    if (sw.length) fx(g, 'bite', cell);
    const s = shipAt(g, cell);
    if (s && paxOf(g, s.id).length) { paxOf(g, s.id).forEach((e) => kill(g, e)); s.c = null; log(g, 'งูทะเลจมเรือ!', 'bite'); }
    else if (sw.length) log(g, `งูทะเลกำจัดคนที่ว่ายน้ำ ${sw.length} คน`, 'bite');
  } else if (cr.k === 'shark') {
    const sw = swimmersAt(g, cell);
    sw.forEach((e) => kill(g, e));
    if (sw.length) fx(g, 'bite', cell);
    if (sw.length) log(g, `ฉลามกำจัดคนที่ว่ายน้ำ ${sw.length} คน`, 'bite');
  } else {
    const s = shipAt(g, cell);
    if (s && paxOf(g, s.id).length) capsize(g, s);
  }
}

function defenders(g, mover, cr, cell) {
  const set = new Set();
  if (cr.k === 'shark') swimmersAt(g, cell).forEach((e) => set.add(e.o));
  if (cr.k === 'whale') { const s = shipAt(g, cell); if (s && paxOf(g, s.id).length) controllers(g, s.id).forEach((p) => set.add(p)); }
  const tile = cr.k === 'shark' ? 'defShark' : 'defWhale';
  return g.order.filter((p) => set.has(p) && p !== mover && g.hands[p].includes(tile));
}

function startCreatureMove(g, mover, cr, cell) {
  if (cr.k !== 'serpent') {
    const defs = defenders(g, mover, cr, cell);
    if (defs.length) {
      g.pending = { type: 'defend', kind: cr.k, defs, cid: cr.id, cell, mover, until: Date.now() + CFG.defendSeconds * 1000 };
      log(g, `${cr.k === 'shark' ? 'ฉลาม' : 'วาฬ'}กำลังเข้าโจมตี! ผู้ถูกโจมตีที่มีไพ่ป้องกันตัดสินใจ…`, 'warn');
      return;
    }
  }
  arrive(g, mover, cr, cell);
  resume(g);
}

function doDefend(g, pid, use) {
  const p = g.pending;
  if (!p || p.type !== 'defend' || !p.defs.includes(pid)) return fail('ไม่มีอะไรให้ป้องกัน');
  const cr = g.cr[p.cid];
  if (use) {
    const tile = p.kind === 'shark' ? 'defShark' : 'defWhale';
    g.hands[pid].splice(g.hands[pid].indexOf(tile), 1);
    fx(g, 'defend', p.cell);
    cr.c = null;
    log(g, `${nm(g, pid)} ใช้ไพ่ป้องกัน! ${p.kind === 'shark' ? 'ฉลาม' : 'วาฬ'}ถูกกำจัด`, 'defend');
    resume(g);
  } else {
    p.defs = p.defs.filter((x) => x !== pid);
    if (!p.defs.length) { arrive(g, p.mover, cr, p.cell); resume(g); }
  }
  return OK;
}

// ---------- ไพ่ในมือ (เล่นต้นเทิร์น) ----------
export function playOptions(g, pid) {
  const out = {};
  const hand = g.hands[pid];
  const sw = exOf(g, pid, 'sea');
  const free = (c) => !g.tiles[c] && !shipAt(g, c);
  for (const u of new Set(hand)) {
    if (u === 'dolphin') {
      const o = {};
      sw.forEach((e) => { const d = bfs(g, e.loc[1], 3, (c) => dangerAt(g, c)); const l = Object.keys(d); if (l.length) o[e.id] = l; });
      out[u] = o;
    } else if (u === 'winds') {
      const o = {};
      Object.values(g.ships).forEach((s) => {
        if (s.c === null || !controls(g, s.id, pid)) return;
        const has = paxOf(g, s.id).length > 0;
        const d = bfs(g, s.c, 3, (c) => !!shipAt(g, c) || (has && (crAt(g, c, 'serpent').length || crAt(g, c, 'whale').length)));
        const l = Object.keys(d); if (l.length) o[s.id] = l;
      });
      out[u] = o;
    } else if (u.startsWith('mv')) {
      const k = u === 'mvSerpent' ? 'serpent' : u === 'mvShark' ? 'shark' : 'whale';
      const o = {};
      Object.values(g.cr).filter((c) => c.k === k && c.c !== null).forEach((c) => { o[c.id] = 'any'; });
      out[u] = o;
    }
  }
  return out;
}

function doPlay(g, pid, a) {
  const u = a.tile;
  const hi = g.hands[pid].indexOf(u);
  if (hi < 0 || DEFENSE.includes(u)) return fail('เล่นไพ่นี้ตอนนี้ไม่ได้');
  const opt = playOptions(g, pid)[u];
  const consume = () => g.hands[pid].splice(g.hands[pid].indexOf(u), 1);
  if (u === 'dolphin') {
    if (!opt[a.eid] || !opt[a.eid].includes(a.to)) return fail('โลมาพาไปตรงนั้นไม่ได้');
    consume(); g.ex[a.eid].loc = ['sea', a.to]; fx(g, 'dolphin', a.to);
    log(g, `${nm(g, pid)} ใช้โลมาช่วยคนว่ายน้ำ`, 'dolphin');
    resume(g);
  } else if (u === 'winds') {
    if (!opt[a.sid] || !opt[a.sid].includes(a.to)) return fail('ลมพาเรือไปตรงนั้นไม่ได้');
    consume(); g.ships[a.sid].c = a.to; fx(g, 'dolphin', a.to);
    log(g, `${nm(g, pid)} ใช้ลมเป็นใจพาเรือ`, 'dolphin');
    resume(g);
  } else if (u.startsWith('mv')) {
    const cr = g.cr[a.cid];
    if (!opt || !opt[a.cid] || !cr) return fail('ไม่มีสัตว์ตัวนั้นบนกระดาน');
    if (g.tiles[a.to] || shipAt(g, a.to) || a.to === undefined || !NB[a.to]) return fail('ต้องย้ายไปช่องทะเลที่ว่าง');
    consume();
    log(g, `${nm(g, pid)} ย้าย${cr.k === 'serpent' ? 'งูทะเล' : cr.k === 'shark' ? 'ฉลาม' : 'วาฬ'}ด้วยไพ่`, 'info');
    startCreatureMove(g, pid, cr, a.to);
  } else return fail('ไพ่ไม่ถูกต้อง');
  return OK;
}

// ---------- วาง (setup) ----------
function placeCandidates(g) {
  const occ = new Set(exOf(g, null, 'tile').map((e) => e.loc[1]));
  const empty = TILE_CELLS.filter((c) => !occ.has(c));
  return empty.length ? empty : TILE_CELLS;
}
export function shipCandidates(g) {
  return Object.keys(g.tiles).length
    ? [...new Set(TILE_CELLS.flatMap((c) => NB[c]))].filter((c) => !g.tiles[c] && !shipAt(g, c) && !crAt(g, c, 'serpent').length)
    : [];
}
export function setupPid(g) {
  if (g.phase === 'place') return g.order[g.setup.i % g.n];
  if (g.phase === 'ships') return g.setup.shipSeq[g.setup.s];
  return null;
}

// ---------- ตัวรับคำสั่งหลัก ----------
export function act(g, pid, a) {
  if (g.phase === 'over') return fail('เกมจบแล้ว');
  if (g.pending) {
    const p = g.pending;
    if (p.type === 'defend') {
      if (a.type === 'defend') return bump(g, doDefend(g, pid, true));
      if (a.type === 'pass') return bump(g, doDefend(g, pid, false));
      return fail('รอผู้ป้องกันตัดสินใจก่อน');
    }
    if (p.type === 'boat') {
      if (pid !== p.pid || a.type !== 'pickBoat') return fail('รอผู้เปิดกระเบื้องเลือกคนขึ้นเรือ');
      const ids = (a.ids || []).filter((x) => p.sw.includes(x));
      if (ids.length !== 3) return fail('เลือกให้ครบ 3 คน');
      ids.forEach((x) => { g.ex[x].loc = ['ship', p.sid]; });
      resume(g);
      return bump(g, OK);
    }
  }
  if (g.phase === 'place') {
    if (pid !== setupPid(g) || a.type !== 'place') return fail('ยังไม่ถึงตาคุณวางตัวคน');
    const e = g.ex[a.eid];
    if (!e || e.o !== pid || e.loc[0] !== 'hand') return fail('เลือกตัวคนที่ยังไม่ได้วาง');
    if (!placeCandidates(g).includes(a.cell)) return fail('วางตรงนั้นไม่ได้');
    e.loc = ['tile', a.cell];
    fx(g, 'place', a.cell);
    g.setup.i += 1;
    if (g.setup.i >= g.setup.total) { g.phase = 'ships'; log(g, 'ต่อไปวางเรือ', 'info'); }
    return bump(g, OK);
  }
  if (g.phase === 'ships') {
    if (pid !== setupPid(g) || a.type !== 'ship') return fail('ยังไม่ถึงตาคุณวางเรือ');
    if (!shipCandidates(g).includes(a.cell)) return fail('วางเรือตรงนั้นไม่ได้ (ต้องเป็นทะเลติดเกาะ)');
    const sid = 's' + Object.keys(g.ships).length;
    g.ships[sid] = { id: sid, c: a.cell };
    fx(g, 'place', a.cell);
    g.setup.s += 1;
    if (g.setup.s >= g.setup.shipSeq.length) {
      g.phase = 'play';
      startTurn(g, g.order[0]);
      log(g, `เกมเริ่ม! ตาของ ${nm(g, g.order[0])}`, 'turn');
    }
    return bump(g, OK);
  }
  // phase play
  const t = g.turn;
  if (pid !== t.pid) return fail('ยังไม่ถึงตาคุณ');
  let r = fail('คำสั่งไม่ถูกต้อง');
  switch (a.type) {
    case 'play':
      if (t.step === 'tile') r = doPlay(g, pid, a); else r = fail('เล่นไพ่ได้เฉพาะต้นเทิร์น');
      break;
    case 'skipTile':
      if (t.step === 'tile') { toMove(g); r = OK; }
      break;
    case 'moveEx':
      if (t.step === 'move') r = moveExplorer(g, pid, a.id, a.to);
      break;
    case 'moveShip':
      if (t.step === 'move') r = moveShip(g, pid, a.id, a.to);
      break;
    case 'endMove':
      if (t.step === 'move') { t.step = 'remove'; r = OK; }
      break;
    case 'remove':
      if (t.step === 'remove') r = doRemove(g, pid, a.cell);
      break;
    case 'roll':
      if (t.step === 'roll') {
        const face = CFG.die[Math.floor(Math.random() * CFG.die.length)];
        t.rolled = face;
        fx(g, 'roll');
        const th = face === 'serpent' ? 'งูทะเล' : face === 'shark' ? 'ฉลาม' : 'วาฬ';
        log(g, `${nm(g, pid)} ทอยเต๋าได้ ${th}`, 'roll');
        const have = Object.values(g.cr).some((c) => c.k === face && c.c !== null);
        if (have) t.step = 'creature'; else { log(g, `ไม่มี${th}บนกระดาน`, 'info'); endTurn(g); }
        r = OK;
      }
      break;
    case 'cmove':
      if (t.step === 'creature') {
        const cr = g.cr[a.cid];
        if (!cr || cr.k !== t.rolled || cr.c === null) { r = fail('เลือกสัตว์ตามผลเต๋า'); break; }
        if (!crMoves(g, cr).includes(a.to)) { r = fail('เดินไปตรงนั้นไม่ได้'); break; }
        startCreatureMove(g, pid, cr, a.to);
        r = OK;
      }
      break;
    case 'cskip':
      if (t.step === 'creature') { endTurn(g); r = OK; }
      break;
    default: break;
  }
  return bump(g, r);
}
function bump(g, r) { if (r.ok) g.rev += 1; return r; }

// หมดเวลาตัดสินใจป้องกัน -> ถือว่าไม่ใช้
export function tick(g, now = Date.now()) {
  const p = g.pending;
  if (p && p.type === 'defend' && now > p.until) {
    g.pending = { ...p };
    p.defs.slice().forEach((d) => { if (g.pending && g.pending.type === 'defend') doDefend(g, d, false); });
    g.rev += 1;
    return true;
  }
  return false;
}

// ---------- มุมมองสำหรับผู้เล่น ----------
export function viewOf(g, pid) {
  const pub = {
    rev: g.rev, phase: g.phase, sp: setupPid(g), order: g.order, names: g.names, col: g.col,
    tiles: Object.fromEntries(Object.entries(g.tiles).map(([c, t]) => [c, t.ty])),
    ships: Object.values(g.ships).filter((s) => s.c !== null).map((s) => ({ id: s.id, c: s.c })),
    cr: Object.values(g.cr).filter((c) => c.c !== null).map((c) => ({ id: c.id, k: c.k, c: c.c })),
    ex: Object.values(g.ex).filter((e) => e.loc[0] !== 'hand' || e.o === pid).map((e) => ({
      id: e.id, o: e.o, cs: e.cs, loc: e.loc, ...(e.o === pid || g.phase === 'over' ? { v: e.v } : {}),
    })),
    handN: Object.fromEntries(Object.entries(g.hands).map(([p, h]) => [p, h.length])),
    turn: g.turn ? { pid: g.turn.pid, step: g.turn.step, left: g.turn.left, rolled: g.turn.rolled } : null,
    pending: g.pending ? { type: g.pending.type, kind: g.pending.kind, pid: g.pending.pid, defs: g.pending.defs, until: g.pending.until, cell: g.pending.cell, sw: g.pending.pid === pid ? g.pending.sw : undefined } : null,
    log: g.log.slice(-14), ev: g.ev, fx: (g.fx || []).slice(-12),
    spare: { ships: CFG.shipsTotal - Object.keys(g.ships).length, shark: g.spare.shark, whale: g.spare.whale },
    tilesLeft: Object.keys(g.tiles).length,
    scores: g.scores, winner: g.winner,
  };
  if (!pid) return pub;
  const my = { hand: g.hands[pid] || [], opts: null };
  if (g.phase === 'place' && setupPid(g) === pid) my.opts = { place: placeCandidates(g) };
  if (g.phase === 'ships' && setupPid(g) === pid) my.opts = { ship: shipCandidates(g) };
  if (g.phase === 'play' && g.turn.pid === pid && !g.pending) {
    const t = g.turn;
    if (t.step === 'tile') my.opts = { play: playOptions(g, pid) };
    else if (t.step === 'move') my.opts = moveOptions(g, pid);
    else if (t.step === 'remove') my.opts = { remove: removable(g) };
    else if (t.step === 'creature') {
      const o = {};
      Object.values(g.cr).filter((c) => c.k === t.rolled && c.c !== null).forEach((c) => { o[c.id] = crMoves(g, c); });
      my.opts = { creature: o };
    }
    my.reveal = t.reveal;
  }
  if (g.turn && g.turn.pid === pid && g.turn.reveal) my.reveal = g.turn.reveal;
  return { ...pub, my };
}
void eqCell; void CENTER; void SAFE;
