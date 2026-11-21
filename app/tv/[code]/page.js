'use client';
import { useEffect, useRef, useState } from 'react';
import * as snd from '@/lib/sound';
import QRCode from 'qrcode';
import { post, usePoll } from '@/lib/client';
import Board from '@/components/Board';
import { Scoreboard, Log, statusText, Dot } from '@/components/ui';

export default function TV({ params }) {
  const code = params.code.toUpperCase();
  const [host, setHost] = useState(null);
  const [qr, setQr] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setHost(localStorage.getItem('sv-host-' + code) || '');
    QRCode.toDataURL(`${location.origin}/play/${code}`, { margin: 1, width: 360 }).then(setQr).catch(() => {});
  }, [code]);
  const { data: v, error, refresh } = usePoll(host === null ? null : `/api/room/${code}?t=${host}`, 1500);

  // ---------- เสียงและแอนิเมชันตามเหตุการณ์ ----------
  const [soundOn, setSoundOn] = useState(false);
  const [needTap, setNeedTap] = useState(false);
  const [active, setActive] = useState([]);
  const [flash, setFlash] = useState(0);
  const [banner, setBanner] = useState('');
  const lastFx = useRef(null);
  useEffect(() => {
    if (snd.soundPref()) {
      setNeedTap(true);
      const go = () => { if (snd.enable()) { setSoundOn(true); setNeedTap(false); } window.removeEventListener('pointerdown', go); };
      window.addEventListener('pointerdown', go);
      return () => window.removeEventListener('pointerdown', go);
    }
  }, []);
  const g0 = v && v.game;
  useEffect(() => {
    if (!g0) return;
    const list = g0.fx || [];
    if (lastFx.current === null) { lastFx.current = list.length ? list[list.length - 1].i : 0; }
    const fresh = list.filter((f) => f.i > lastFx.current);
    if (!fresh.length) return;
    lastFx.current = fresh[fresh.length - 1].i;
    fresh.forEach((f, idx) => {
      setTimeout(() => {
        snd.sfx(f.k);
        if (f.c) {
          setActive((a) => [...a, f]);
          setTimeout(() => setActive((a) => a.filter((x) => x.i !== f.i)), 1700);
        }
        if (f.k === 'volcano') { setFlash((n) => n + 1); setBanner('🌋 ภูเขาไฟระเบิด!'); setTimeout(() => setBanner(''), 3000); }
        if (f.k === 'whirl') { setBanner('🌀 วังวน!'); setTimeout(() => setBanner(''), 2200); }
        if (f.k === 'shark') { setBanner('🦈 ฉลามมาแล้ว!'); setTimeout(() => setBanner(''), 2200); }
        if (f.k === 'whale') { setBanner('🐋 วาฬโผล่!'); setTimeout(() => setBanner(''), 2200); }
      }, idx * 450);
    });
  }, [g0 && g0.fx && g0.fx.length ? g0.fx[g0.fx.length - 1].i : 0]);
  useEffect(() => {
    if (!g0) return;
    snd.setTension(g0.phase === 'play' ? 1 - Math.min(1, g0.tilesLeft / 40) : 0);
  }, [g0 && g0.tilesLeft]);
  function toggleSound() {
    if (soundOn) { snd.disable(); setSoundOn(false); } else if (snd.enable()) { setSoundOn(true); setNeedTap(false); }
  }

  async function act(a) {
    setMsg('');
    try { await post(`/api/room/${code}/act`, { t: host, a }); refresh(); } catch (e) { setMsg(e.message); }
  }
  if (error && !v) return <main className="home"><p className="error">{error}</p></main>;
  if (!v) return <main className="home"><p>กำลังโหลด…</p></main>;
  if (!v.host) return <main className="home"><p className="error">หน้านี้ใช้ได้เฉพาะเครื่องที่สร้างห้อง (เปิดจากหน้าแรกอีกครั้ง)</p></main>;

  if (!v.game) {
    return (
      <main className="lobby">
        <p className="sub">เข้าร่วมที่ หรือสแกน QR</p>
        <div className="big-code">{code}</div>
        {qr && <img src={qr} alt="QR" width="240" height="240" style={{ borderRadius: 12, background: '#fff' }} />}
        <div className="card-box">
          <h2>ผู้เล่น ({v.lobby.length}/6)</h2>
          {v.lobby.map((p) => <div key={p.id} className="pl">🧑 {p.name}</div>)}
          {!v.lobby.length && <p className="sub">รอเพื่อน ๆ เข้าร่วม…</p>}
        </div>
        <button className="btn big" disabled={v.lobby.length < 2} onClick={() => act({ type: 'start' })}>เริ่มเกม ({v.lobby.length < 2 ? 'ต้องมีอย่างน้อย 2 คน' : v.lobby.length + ' คน'})</button>
        {msg && <p className="error">{msg}</p>}
      </main>
    );
  }
  const g = v.game;
  return (
    <div className="tv">
      {flash > 0 && <div className="flash" key={'f' + flash} />}
      {banner && <div className="banner" key={banner}>{banner}</div>}
      <button className="btn alt tvmute" onClick={toggleSound}>{soundOn ? '🔊 เสียงเปิด' : needTap ? '🔈 แตะเพื่อเปิดเสียง' : '🔇 เปิดเสียง'}</button>
      <div className={"board" + (flash ? " shake" : "")} key={"b" + flash}><Board g={g} fx={active} /></div>
      <div className="side">
        <div className="panel">
          <div className="turnbox">{statusText(g, null)}</div>
          {g.phase === 'play' && g.turn.step === 'move' && <div className="step">แต้มเดินเหลือ {g.turn.left}</div>}
          {g.turn && g.turn.rolled && g.turn.step === 'creature' && <div className="step">เต๋า: {g.turn.rolled === 'serpent' ? '🐉 งูทะเล' : g.turn.rolled === 'shark' ? '🦈 ฉลาม' : '🐋 วาฬ'}</div>}
          <div className="hand">กระเบื้องบนเกาะเหลือ {g.tilesLeft} · เรือสำรอง {g.spare.ships} · ฉลามสำรอง {g.spare.shark} · วาฬสำรอง {g.spare.whale}</div>
        </div>
        {g.pending && g.pending.type === 'defend' && (
          <div className="panel"><b>⚠ {g.pending.kind === 'shark' ? 'ฉลาม' : 'วาฬ'}กำลังโจมตี</b> รอ {g.pending.defs.map((d) => g.names[d]).join(', ')} ตัดสินใจ
            <div className="row"><button className="btn alt" onClick={() => act({ type: 'skipDefend' })}>ข้าม (ไม่ป้องกัน)</button></div></div>
        )}
        <Scoreboard g={g} />
        <Log g={g} />
        {g.phase === 'over' && (
          <div className="panel">
            <h2>🏆 {g.winner.map((p) => g.names[p]).join(' และ ')} ชนะ!</h2>
            <p className="hand">ตัวคนที่รอดทั้งหมดเปิดเลขแล้ว</p>
            <button className="btn big" onClick={() => act({ type: 'reset' })}>เล่นอีกรอบ (กลับล็อบบี้)</button>
          </div>
        )}
        {msg && <p className="error">{msg}</p>}
      </div>
    </div>
  );
}
void Dot;
