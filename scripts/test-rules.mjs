import assert from 'node:assert/strict';
import { newGame, act, viewOf, exMoves, controls, removable, tick } from '../lib/engine.js';
const mk = () => { const g = newGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]); g.phase = 'play'; g.order = ['a', 'b', 'c']; g.turn = { pid: 'a', step: 'move', left: 3, used: [], rolled: null, reveal: null }; Object.values(g.ex).forEach((e) => { e.loc = ['dead']; }); g.ships = {}; return g; };
// 1) ลงเกาะปลอดภัยจากเรือที่ท่าเทียบ
{ const g = mk(); g.ships.s0 = { id: 's0', c: '0,9' }; const e = g.ex['e0_0_9']; e.loc = ['ship', 's0'];
  assert.ok(act(g, 'a', { type: 'moveEx', id: e.id, to: { t: 'safe', i: 'SW' } }).ok); assert.equal(e.loc[0], 'safe');
  assert.equal(g.turn.left, 2); }
// 2) เรือมีคนชนงู: ตาย
{ const g = mk(); g.cr = { q: { id: 'q', k: 'serpent', c: '1,5' } }; g.ships.s0 = { id: 's0', c: '2,5' };
  g.ex['e0_0_0'].loc = ['ship', 's0']; assert.ok(act(g, 'a', { type: 'moveShip', id: 's0', to: { t: 'sea', c: '1,5' } }).ok);
  assert.equal(g.ex['e0_0_0'].loc[0], 'dead'); assert.equal(g.ships.s0.c, null); }
// 3) การควบคุมเรือ: คนมากกว่าคุม, เท่ากันคุมร่วม
{ const g = mk(); g.ships.s0 = { id: 's0', c: '2,5' }; g.ex['e0_0_0'].loc = ['ship', 's0']; g.ex['e1_0_0'].loc = ['ship', 's0']; g.ex['e1_0_1'].loc = ['ship', 's0'];
  assert.equal(controls(g, 's0', 'a'), false); assert.equal(controls(g, 's0', 'b'), true); g.ex['e1_0_1'].loc = ['dead']; assert.equal(controls(g, 's0', 'a'), true); }
// 4) swimmer เดินได้ 1 ช่อง/เทิร์น
{ const g = mk(); const e = g.ex['e0_0_0']; e.loc = ['sea', '2,5']; assert.ok(act(g, 'a', { type: 'moveEx', id: e.id, to: { t: 'sea', c: '1,5' } }).ok);
  assert.equal(act(g, 'a', { type: 'moveEx', id: e.id, to: { t: 'sea', c: '0,5' } }).ok, false); }
// 5) ลำดับถอนกระเบื้อง: หาดก่อน
{ const g = mk(); const r = removable(g); assert.ok(r.every((c) => g.tiles[c].ty === 'B')); }
// 6) วาฬคว่ำเรือ + ป้องกัน
{ const g = mk(); g.cr = { w: { id: 'w', k: 'whale', c: '1,5' } }; g.ships.s0 = { id: 's0', c: '2,5' }; g.ex['e1_0_0'].loc = ['ship', 's0']; g.hands.b = ['defWhale'];
  g.turn = { pid: 'a', step: 'creature', left: 0, used: [], rolled: 'whale' };
  assert.ok(act(g, 'a', { type: 'cmove', cid: 'w', to: '2,5' }).ok); assert.equal(g.pending.type, 'defend');
  assert.ok(act(g, 'b', { type: 'defend' }).ok); assert.equal(g.ex['e1_0_0'].loc[0], 'ship'); assert.equal(g.cr.w.c, null); assert.equal(g.turn.pid, 'b'); }
// 7) หมดเวลาป้องกัน -> วาฬจู่โจม
{ const g = mk(); g.cr = { w: { id: 'w', k: 'whale', c: '1,5' } }; g.ships.s0 = { id: 's0', c: '2,5' }; g.ex['e1_0_0'].loc = ['ship', 's0']; g.hands.b = ['defWhale'];
  g.turn = { pid: 'a', step: 'creature', left: 0, used: [], rolled: 'whale' }; act(g, 'a', { type: 'cmove', cid: 'w', to: '2,5' });
  assert.ok(tick(g, Date.now() + 99999)); assert.equal(g.ex['e1_0_0'].loc[0], 'sea'); assert.equal(g.ships.s0.c, null); }
// 8) ภูเขาไฟจบเกม + คะแนน
{ const g = mk(); g.ex['e0_0_9'].loc = ['safe', 'NW']; g.ex['e1_0_9'].loc = ['safe', 'NE']; g.ex['e1_0_8'].loc = ['safe', 'NE'];
  const vc = Object.keys(g.tiles).find((c) => g.tiles[c].un === 'volcano'); assert.equal(g.tiles[vc].ty, 'M');
  Object.keys(g.tiles).forEach((c) => { if (c !== vc) delete g.tiles[c]; }); g.turn.step = 'remove';
  assert.ok(act(g, 'a', { type: 'remove', cell: vc }).ok); assert.equal(g.phase, 'over'); console.log(g.scores, g.winner); }
// 9) มุมมองไม่รั่วเลขของคนอื่น
{ const g = mk(); g.ex['e1_0_9'].loc = ['tile', '5,4']; const v = viewOf(g, 'a'); assert.ok(v.ex.filter((e) => e.o === 'b').every((e) => e.v === undefined)); }
console.log('rules ok');
