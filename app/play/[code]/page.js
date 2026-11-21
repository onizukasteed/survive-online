'use client';
import { useEffect, useMemo, useState } from 'react';
import { post, usePoll } from '@/lib/client';
import Board, { COLORS } from '@/components/Board';
import { CELLS } from '@/lib/board';
import { Scoreboard, Log, statusText, CR_TH } from '@/components/ui';

const UN_TH = {
  shark: 'ฉลาม', whale: 'วาฬ', boat: 'เรือ', whirlpool: 'วังวน', volcano: 'ภูเขาไฟ',
  dolphin: '🐬 โลมาช่วย (ว่ายน้ำ 1-3 ช่อง)', winds: '💨 ลมเป็นใจ (เรือ 1-3 ช่อง)',
  mvSerpent: '🐉 ย้ายงูทะเล', mvShark: '🦈 ย้ายฉลาม', mvWhale: '🐋 ย้ายวาฬ',
  defShark: '🛡 ป้องกันฉลาม (ใช้ตอนถูกโจมตี)', defWhale: '🛡 ป้องกันวาฬ (ใช้ตอนเรือถูกโจมตี)',
};

export default function Play({ params }) {
  const code = params.code.toUpperCase();
  const [me, setMe] = useState(null); // {pid, token}
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem('sv-me-' + code) || 'null'); if (s) setMe(s); } catch {}
    setReady(true);
  }, [code]);
  const { data: v, error, refresh } = usePoll(me ? `/api/room/${code}?t=${me.token}` : null, 1500);

  async function doJoin(e) {
    e.preventDefault(); setErr('');
    try {
      const r = await post(`/api/room/${code}/join`, { name });
      const s = { pid: r.pid, token: r.token };
      localStorage.setItem('sv-me-' + code, JSON.stringify(s)); setMe(s);
    } catch (x) { setErr(x.message); }
  }
  if (!ready) return null;
  if (!me) {
    return (
      <main className="home">
        <h1 className="title">ห้อง {code}</h1>
        <form className="card-box" onSubmit={doJoin}>
          <h2>ใส่ชื่อของคุณ</h2>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ" maxLength={14} autoFocus />
          <button className="btn big" disabled={!name.trim()}>เข้าร่วม</button>
          {err && <p className="error">{err}</p>}
        </form>
      </main>
    );
  }
  if (error && !v) {
    if (/ไม่ได้อยู่ในห้อง/.test(error)) { localStorage.removeItem('sv-me-' + code); setMe(null); }
    return <main className="home"><p className="error">{error}</p></main>;
  }
  if (!v) return <main className="home"><p>กำลังโหลด…</p></main>;
  if (!v.game) {
    return (
      <main className="lobby">
        <h1 className="title">ห้อง {code}</h1>
        <p className="sub">รอเจ้าของห้องกดเริ่มเกม…</p>
        <div className="card-box"><h2>ผู้เล่น</h2>{v.lobby.map((p) => <div key={p.id} className="pl">🧑 {p.name}{p.id === me.pid ? ' (คุณ)' : ''}</div>)}</div>
      </main>
    );
  }
  return <Game g={v.game} code={code} me={me} refresh={refresh} />;
}

function Game({ g, code, me, refresh }) {
  const my = g.my;
  const opts = my.opts || {};
  const you = me.pid;
  const myTurn = g.phase === 'play' && g.turn.pid === you;
  const [pickE, setPickE] = useState(null); // setup: ตัวคนที่เลือกจะวาง
  const [unit, setUnit] = useState(null); // {k:'ex'|'ship'|'cr', id}
  const [sheet, setSheet] = useState(null); // รายการเลือก
  const [tp, setTp] = useState(null); // เล่นไพ่: {tile, id}
  const [msg, setMsg] = useState('');
  const [zoom, setZoom] = useState(1);
  const [boatPick, setBoatPick] = useState([]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const stepKey = g.phase + ':' + (g.turn ? g.turn.pid + g.turn.step : '') + ':' + g.rev;
  useEffect(() => { setUnit(null); setSheet(null); setTp(null); setMsg(''); }, [stepKey]);

  async function act(a) {
    setMsg('');
    try { await post(`/api/room/${code}/act`, { t: me.token, a }); setUnit(null); setSheet(null); setTp(null); setPickE(null); refresh(); } catch (e) { setMsg(e.message); }
  }

  const exById = useMemo(() => Object.fromEntries(g.ex.map((e) => [e.id, e])), [g]);
  const shipById = useMemo(() => Object.fromEntries(g.ships.map((s) => [s.id, s])), [g]);
  const cellOf = (e) => (e.loc[0] === 'ship' ? (shipById[e.loc[1]] || {}).c : e.loc[1]);
  const myHand = g.ex.filter((e) => e.o === you && e.loc[0] === 'hand');
  const vacantSea = CELLS.filter((c) => !g.tiles[c] && !g.ships.some((s) => s.c === c));
  const defMe = g.pending && g.pending.type === 'defend' && g.pending.defs.includes(you);

  // ---------- ไฮไลต์ ----------
  let hi = { cells: [], islands: [] };
  const destCells = (list) => ({ cells: list.filter((d) => d.c).map((d) => d.c), islands: list.filter((d) => d.t === 'safe').map((d) => d.i) });
  if (g.phase === 'place' && opts.place && pickE) hi = { cells: opts.place, islands: [] };
  else if (g.phase === 'ships' && opts.ship) hi = { cells: opts.ship, islands: [] };
  else if (myTurn && !g.pending) {
    const s = g.turn.step;
    if (s === 'move') {
      if (unit) hi = destCells(unit.k === 'ex' ? opts.ex[unit.id] || [] : opts.ship[unit.id] || []);
      else {
        const cs = new Set();
        Object.keys(opts.ex || {}).forEach((id) => cs.add(cellOf(exById[id])));
        Object.keys(opts.ship || {}).forEach((id) => cs.add(shipById[id].c));
        hi = { cells: [...cs], islands: [] };
      }
    } else if (s === 'remove') hi = { cells: opts.remove || [], islands: [] };
    else if (s === 'creature') {
      if (unit) hi = { cells: opts.creature[unit.id] || [], islands: [] };
      else hi = { cells: Object.keys(opts.creature || {}).map((id) => g.cr.find((c) => c.id === id).c), islands: [] };
    } else if (s === 'tile' && tp) {
      if (tp.tile === 'dolphin' && tp.id) hi = { cells: opts.play.dolphin[tp.id] || [], islands: [] };
      else if (tp.tile === 'winds' && tp.id) hi = { cells: opts.play.winds[tp.id] || [], islands: [] };
      else if (tp.tile.startsWith('mv') && tp.id) hi = { cells: vacantSea, islands: [] };
    }
  }

  // ---------- แตะกระดาน ----------
  function onCell(c) {
    setMsg('');
    if (g.phase === 'place' && opts.place) {
      if (!pickE) { setMsg('เลือกตัวคนที่จะวางก่อน (ด้านล่าง)'); return; }
      if (opts.place.includes(c)) act({ type: 'place', eid: pickE, cell: c });
      return;
    }
    if (g.phase === 'ships' && opts.ship) { if (opts.ship.includes(c)) act({ type: 'ship', cell: c }); return; }
    if (!myTurn || g.pending) return;
    const s = g.turn.step;
    if (s === 'remove' && opts.remove && opts.remove.includes(c)) { setSheet({ kind: 'confirmRemove', cell: c }); return; }
    if (s === 'move') {
      if (!unit) {
        const list = [];
        Object.keys(opts.ex || {}).forEach((id) => { if (cellOf(exById[id]) === c) list.push({ k: 'ex', id }); });
        Object.keys(opts.ship || {}).forEach((id) => { if (shipById[id].c === c) list.push({ k: 'ship', id }); });
        if (list.length === 1) setUnit(list[0]);
        else if (list.length > 1) setSheet({ kind: 'units', list });
        return;
      }
      const dl = (unit.k === 'ex' ? opts.ex[unit.id] : opts.ship[unit.id]) || [];
      const ch = dl.filter((d) => (d.t === 'safe' ? 'safe:' + d.i === c : d.c === c));
      const mk = (d) => ({ type: unit.k === 'ex' ? 'moveEx' : 'moveShip', id: unit.id, to: d });
      if (ch.length === 1) act(mk(ch[0]));
      else if (ch.length > 1) setSheet({ kind: 'dest', list: ch.map(mk) });
      else { setUnit(null); onCellFresh(c); }
      return;
    }
    if (s === 'creature') {
      if (!unit) {
        const cr = g.cr.find((x) => x.c === c && opts.creature && opts.creature[x.id]);
        if (cr) setUnit({ k: 'cr', id: cr.id });
        return;
      }
      if ((opts.creature[unit.id] || []).includes(c)) act({ type: 'cmove', cid: unit.id, to: c });
      return;
    }
    if (s === 'tile' && tp && tp.id && hi.cells.includes(c)) {
      if (tp.tile === 'dolphin') act({ type: 'play', tile: 'dolphin', eid: tp.id, to: c });
      else if (tp.tile === 'winds') act({ type: 'play', tile: 'winds', sid: tp.id, to: c });
      else act({ type: 'play', tile: tp.tile, cid: tp.id, to: c });
    }
  }
  function onCellFresh(c) {
    const list = [];
    Object.keys(opts.ex || {}).forEach((id) => { if (cellOf(exById[id]) === c) list.push({ k: 'ex', id }); });
    Object.keys(opts.ship || {}).forEach((id) => { if (shipById[id].c === c) list.push({ k: 'ship', id }); });
    if (list.length === 1) setUnit(list[0]); else if (list.length > 1) setSheet({ kind: 'units', list });
  }

  const unitLabel = (u) => {
    if (u.k === 'ship') { const pax = g.ex.filter((e) => e.loc[0] === 'ship' && e.loc[1] === u.id); return `⛵ เรือ (${pax.length} คน)`; }
    const e = exById[u.id];
    return `🧍 ตัวคนเลข ${e.v}${e.loc[0] === 'ship' ? ' (บนเรือ)' : e.loc[0] === 'sea' ? ' (ว่ายน้ำ)' : ''}`;
  };
  const destLabel = (m) => {
    const t = m.to;
    if (t.t === 'tile') return 'เดินไปกระเบื้อง';
    if (t.t === 'ship') return 'ขึ้นเรือ';
    if (t.t === 'safe') return '🏝 ขึ้นเกาะปลอดภัย';
    return unit && unit.k === 'ship' ? 'เดินเรือ' : 'ลงทะเล (ว่ายน้ำ)';
  };

  // ---------- แผงด้านล่าง ----------
  let dock = null;
  if (g.phase === 'over') {
    dock = <div><h3>🏆 {g.winner.map((p) => g.names[p]).join(' และ ')} ชนะ!</h3>
      <div className="hand">คุณได้ {g.scores[you].pts} แต้ม ({g.scores[you].n} คน)</div></div>;
  } else if (g.pending && g.pending.type === 'defend') {
    const left = Math.max(0, Math.ceil((g.pending.until - now) / 1000));
    dock = defMe ? (
      <div><b>⚠ {g.pending.kind === 'shark' ? 'ฉลามกำลังโจมตีคนของคุณ' : 'วาฬกำลังคว่ำเรือของคุณ'}!</b> ใช้ไพ่ป้องกันไหม? ({left} วิ)
        <div className="row"><button className="btn" onClick={() => act({ type: 'defend' })}>🛡 ใช้ไพ่ป้องกัน</button><button className="btn alt" onClick={() => act({ type: 'pass' })}>ไม่ใช้</button></div></div>
    ) : <div className="hand">รอผู้ถูกโจมตีตัดสินใจ… ({left} วิ)</div>;
  } else if (g.pending && g.pending.type === 'boat') {
    if (g.pending.pid === you) {
      dock = (
        <div><b>มีคนว่ายน้ำเกิน 3 คน เลือก 3 คนที่จะขึ้นเรือ</b>
          <div className="row">{(g.pending.sw || []).map((id) => (
            <button key={id} className={'chip' + (boatPick.includes(id) ? ' on' : '')} onClick={() => setBoatPick((b) => (b.includes(id) ? b.filter((x) => x !== id) : b.length < 3 ? [...b, id] : b))}>
              <span className="dot" style={{ background: COLORS[(g.col[exById[id].o] || [])[exById[id].cs]] }} /> {g.names[exById[id].o]}{exById[id].v !== undefined ? ' เลข ' + exById[id].v : ''}
            </button>))}</div>
          <button className="btn" disabled={boatPick.length !== 3} onClick={() => { act({ type: 'pickBoat', ids: boatPick }); setBoatPick([]); }}>ยืนยัน</button></div>
      );
    } else dock = <div className="hand">รอ {g.names[g.pending.pid]} เลือกคนขึ้นเรือ…</div>;
  } else if (g.phase === 'place') {
    dock = opts.place ? (
      <div><b>เลือกตัวคนที่จะวาง แล้วแตะกระเบื้องบนเกาะ</b> <span className="hand">(ไม่ให้คนอื่นเห็นเลขนะ)</span>
        <div className="row">{myHand.map((e) => (
          <button key={e.id} className={'chip' + (pickE === e.id ? ' on' : '')} onClick={() => setPickE(e.id)}>
            <span className="dot" style={{ background: COLORS[(g.col[you] || [])[e.cs]] }} /> เลข {e.v}</button>))}</div></div>
    ) : <div className="hand">รอ {g.names[g.sp]} วางตัวคน… (คุณเหลือ {myHand.length} ตัว)</div>;
  } else if (g.phase === 'ships') {
    dock = opts.ship ? <b>แตะช่องทะเลติดเกาะเพื่อวางเรือ</b> : <div className="hand">รอ {g.names[g.sp]} วางเรือ…</div>;
  } else if (!myTurn) {
    dock = <div className="hand">รอ {g.names[g.turn.pid]} เล่น… </div>;
  } else {
    const s = g.turn.step;
    if (s === 'tile') {
      const kinds = Object.keys(opts.play || {}).filter((u) => Object.keys(opts.play[u]).length);
      dock = (
        <div><b>เล่นไพ่ในมือก่อนเดิน? (ไม่บังคับ)</b>
          <div className="row">{kinds.map((u) => <button key={u} className={'chip' + (tp && tp.tile === u ? ' on' : '')} onClick={() => setTp({ tile: u })}>{UN_TH[u]}</button>)}</div>
          {tp && tp.tile && (
            <div className="row">{Object.keys(opts.play[tp.tile] || {}).map((id) => (
              <button key={id} className={'chip' + (tp.id === id ? ' on' : '')} onClick={() => setTp({ ...tp, id })}>
                {tp.tile === 'dolphin' ? '🧍 เลข ' + exById[id].v : tp.tile === 'winds' ? '⛵ เรือ' : CR_TH[g.cr.find((c) => c.id === id).k] + ' ' + g.cr.find((c) => c.id === id).c}</button>))}
              {tp.id && <span className="hand">แตะช่องที่ไฮไลต์บนแผนที่</span>}</div>)}
          <div className="row"><button className="btn alt" onClick={() => act({ type: 'skipTile' })}>ไม่เล่นไพ่ → ไปเดิน</button></div></div>
      );
    } else if (s === 'move') {
      dock = (
        <div><b>เดิน ({g.turn.left} แต้มเหลือ)</b> <span className="hand">แตะช่องที่มีตัวคน/เรือของคุณ แล้วแตะปลายทาง</span>
          {unit && <div className="row"><span className="chip on">{unitLabel(unit)}</span><button className="chip" onClick={() => setUnit(null)}>ยกเลิก</button></div>}
          <div className="row"><button className="btn" onClick={() => act({ type: 'endMove' })}>จบการเดิน → ถอนกระเบื้อง</button></div></div>
      );
    } else if (s === 'remove') {
      dock = <div><b>แตะกระเบื้องที่จะถอน (ที่ไฮไลต์)</b><div className="hand">ต้องถอนหาดก่อน แล้วป่า แล้วภูเขา และต้องติดทะเล</div></div>;
    } else if (s === 'roll') {
      dock = <div>{my.reveal && <div className="reveal">ใต้กระเบื้องที่เปิด: <b>{my.reveal.th}</b></div>}<button className="btn big" onClick={() => act({ type: 'roll' })}>🎲 ทอยเต๋าสัตว์ทะเล</button></div>;
    } else if (s === 'creature') {
      dock = (
        <div>{my.reveal && <div className="reveal">ใต้กระเบื้องที่เปิด: <b>{my.reveal.th}</b></div>}
          <b>เต๋าออก {CR_TH[g.turn.rolled]}</b> แตะตัวที่จะย้าย แล้วแตะปลายทาง
          {unit && <div className="hand">เลือก{CR_TH[g.turn.rolled]}แล้ว แตะช่องที่ไฮไลต์</div>}
          <div className="row"><button className="btn alt" onClick={() => act({ type: 'cskip' })}>ไม่ย้าย</button>{unit && <button className="chip" onClick={() => setUnit(null)}>เลือกตัวอื่น</button>}</div></div>
      );
    }
  }

  return (
    <div className="ph">
      <div className="bar">
        <div className="turnbox">{statusText(g, you)}</div>
        <div className="hand">
          ไพ่ลับของคุณ: {my.hand.length ? my.hand.map((u) => UN_TH[u]).join(' · ') : 'ไม่มี'}
        </div>
        {msg && <div className="error">{msg}</div>}
      </div>
      <div className="boardwrap">
        <Board g={g} hi={hi} sel={unit ? (unit.k === 'cr' ? g.cr.find((c) => c.id === unit.id).c : unit.k === 'ex' ? cellOf(exById[unit.id]) : shipById[unit.id].c) : null} onCell={onCell} scale={zoom} />
      </div>
      <div className="row"><button className="chip" onClick={() => setZoom(zoom === 1 ? 1.9 : 1)}>{zoom === 1 ? '🔍 ขยายกระดาน' : '↩ ย่อกระดาน'}</button></div>
      <Scoreboard g={g} />
      <Log g={g} />
      {sheet && (
        <div className="dock" style={{ bottom: 0, zIndex: 9, borderTopColor: '#ffd166' }}>
          {sheet.kind === 'units' && (<><b>เลือกตัวที่จะเดิน</b><div className="row">{sheet.list.map((u) => <button key={u.k + u.id} className="chip" onClick={() => { setUnit(u); setSheet(null); }}>{unitLabel(u)}</button>)}</div></>)}
          {sheet.kind === 'dest' && (<><b>ไปทำอะไร</b><div className="row">{sheet.list.map((m, i) => <button key={i} className="chip" onClick={() => act(m)}>{destLabel(m)}</button>)}</div></>)}
          {sheet.kind === 'confirmRemove' && (<><b>ถอนกระเบื้องนี้?</b> <span className="hand">คนบนกระเบื้องจะตกน้ำ</span><div className="row"><button className="btn" onClick={() => act({ type: 'remove', cell: sheet.cell })}>ถอนเลย</button><button className="btn alt" onClick={() => setSheet(null)}>ยกเลิก</button></div></>)}
          {sheet.kind !== 'confirmRemove' && <div className="row"><button className="chip" onClick={() => setSheet(null)}>ปิด</button></div>}
        </div>
      )}
      {!sheet && <div className="dock">{dock}</div>}
    </div>
  );
}
