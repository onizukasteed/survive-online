'use client';
import { COLORS } from './Board';

export const STEP_TH = { tile: 'เล่นไพ่ในมือ (หรือข้าม)', move: 'เดินตัวคน/เรือ', remove: 'ถอนกระเบื้องเกาะ', roll: 'ทอยเต๋าสัตว์ทะเล', creature: 'ขยับสัตว์ทะเล' };
export const CR_TH = { serpent: 'งูทะเล', shark: 'ฉลาม', whale: 'วาฬ' };

export function Dot({ g, pid, cs = 0 }) {
  const c = COLORS[(g.col[pid] || [])[cs]] || '#ccc';
  return <span className="dot" style={{ background: c }} />;
}

export function Scoreboard({ g }) {
  const alive = {}, saved = {};
  g.ex.forEach((e) => {
    if (['tile', 'ship', 'sea'].includes(e.loc[0])) alive[e.o] = (alive[e.o] || 0) + 1;
    if (e.loc[0] === 'safe') saved[e.o] = (saved[e.o] || 0) + 1;
  });
  return (
    <div className="panel">
      {g.order.map((p) => (
        <div key={p} className={'sc' + (g.turn && g.turn.pid === p && g.phase === 'play' ? ' cur' : '')}>
          {(g.col[p] || []).map((_, i) => <Dot key={i} g={g} pid={p} cs={i} />)}
          <b style={{ flex: 1 }}>{g.names[p]}</b>
          <span title="ยังอยู่ในเกม">🧍{alive[p] || 0}</span>
          <span title="ถึงเกาะปลอดภัย">🏝{saved[p] || 0}</span>
          <span title="ไพ่ลับในมือ">🃏{g.handN[p] || 0}</span>
          {g.scores && <b style={{ color: '#ffd166' }}>{g.scores[p].pts} แต้ม</b>}
        </div>
      ))}
    </div>
  );
}

export function Log({ g }) {
  return <div className="panel log">{g.log.slice().reverse().map((l) => <div key={l.i} className={l.k}>{l.m}</div>)}</div>;
}

export function statusText(g, youPid) {
  if (g.phase === 'over') return 'จบเกม!';
  if (g.phase === 'place') { return `${g.names[g.sp]} วางตัวคนบนเกาะ`; }
  if (g.phase === 'ships') return `${g.names[g.sp]} วางเรือในทะเลติดเกาะ`;
  if (g.pending) {
    if (g.pending.type === 'defend') return 'รอการป้องกัน…';
    if (g.pending.type === 'boat') return `${g.names[g.pending.pid]} เลือกคนขึ้นเรือ`;
  }
  return `ตาของ ${g.names[g.turn.pid]}${youPid === g.turn.pid ? ' (คุณ)' : ''}: ${STEP_TH[g.turn.step]}`;
}
