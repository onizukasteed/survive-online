'use client';
// เสียงสังเคราะห์ด้วย WebAudio (ไม่ใช้ไฟล์เสียง จึงไม่มีปัญหาลิขสิทธิ์)
let ctx = null, master = null, sfxG = null, ambG = null, enabled = false;
let ambNodes = null, padOsc = [], padFilt = null, pulseTimer = null, tension = 0;
const KEY = 'sv-sound';
export const soundPref = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const savePref = (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch {} };

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 1.5; master.connect(comp);
    sfxG = ctx.createGain(); sfxG.gain.value = 1.1; sfxG.connect(master);
    ambG = ctx.createGain(); ambG.gain.value = 0.5; ambG.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}
export const isEnabled = () => enabled;
export function enable() { if (!ensure()) return false; enabled = true; savePref(true); startAmbient(); return true; }
export function disable() { enabled = false; savePref(false); stopAmbient(); }

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function tone(t, midi, dur, { type = 'sine', vol = 0.25, attack = 0.01, slideTo, dest = sfxG } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(mtof(midi), t);
  if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(mtof(slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, { vol = 0.2, f0 = 800, f1 = 800, type = 'lowpass', q = 1, dest = sfxG } = {}) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.04, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t);
}

export function sfx(name) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + 0.02;
  switch (name) {
    case 'place': tone(t, 76, 0.08, { type: 'triangle', vol: 0.18 }); break;
    case 'sink': noise(t, 0.7, { vol: 0.3, f0: 1200, f1: 120 }); tone(t, 45, 0.5, { type: 'sine', vol: 0.35, slideTo: 33 }); break;
    case 'splash': noise(t, 0.35, { vol: 0.18, f0: 3000, f1: 700, type: 'bandpass' }); break;
    case 'bite': tone(t, 52, 0.18, { type: 'sawtooth', vol: 0.3, slideTo: 40 }); tone(t + 0.12, 48, 0.2, { type: 'sawtooth', vol: 0.3, slideTo: 36 }); noise(t, 0.3, { vol: 0.2, f0: 2200, f1: 300 }); break;
    case 'capsize': noise(t, 0.9, { vol: 0.3, f0: 600, f1: 150 }); tone(t, 60, 0.9, { type: 'sine', vol: 0.3, slideTo: 38 }); break;
    case 'serpentmove': tone(t, 70, 0.45, { type: 'sawtooth', vol: 0.18, slideTo: 58 }); noise(t, 0.4, { vol: 0.08, f0: 900, f1: 300, type: 'bandpass' }); break;
    case 'sharkmove': tone(t, 50, 0.3, { type: 'sawtooth', vol: 0.18 }); tone(t + 0.15, 55, 0.3, { type: 'sawtooth', vol: 0.18 }); break;
    case 'whalemove': tone(t, 52, 1.2, { type: 'sine', vol: 0.3, slideTo: 64 }); tone(t + 0.3, 59, 1.0, { type: 'sine', vol: 0.2, slideTo: 71 }); break;
    case 'shark': tone(t, 47, 0.25, { type: 'sawtooth', vol: 0.3 }); tone(t + 0.25, 46, 0.25, { type: 'sawtooth', vol: 0.3 }); tone(t + 0.5, 44, 0.5, { type: 'sawtooth', vol: 0.35 }); break;
    case 'whale': tone(t, 50, 1.6, { type: 'sine', vol: 0.4, slideTo: 62 }); tone(t + 0.4, 57, 1.4, { type: 'sine', vol: 0.25, slideTo: 69 }); break;
    case 'boat': tone(t, 62, 0.1, { type: 'square', vol: 0.18 }); tone(t + 0.14, 62, 0.1, { type: 'square', vol: 0.18 }); tone(t + 0.28, 69, 0.25, { type: 'triangle', vol: 0.22 }); break;
    case 'whirl': noise(t, 1.6, { vol: 0.32, f0: 300, f1: 2500, type: 'bandpass', q: 3 }); tone(t, 40, 1.6, { type: 'sine', vol: 0.3, slideTo: 80 }); break;
    case 'volcano': noise(t, 3.2, { vol: 0.5, f0: 400, f1: 60 }); tone(t, 34, 3.2, { type: 'sawtooth', vol: 0.4, slideTo: 24 }); tone(t + 0.3, 41, 2.8, { type: 'sine', vol: 0.4, slideTo: 28 }); break;
    case 'safe': [72, 76, 79, 84].forEach((m, i) => tone(t + i * 0.1, m, 0.35, { type: 'triangle', vol: 0.25 })); break;
    case 'defend': tone(t, 84, 0.12, { type: 'square', vol: 0.15 }); tone(t + 0.1, 91, 0.5, { type: 'triangle', vol: 0.25 }); break;
    case 'roll': for (let i = 0; i < 7; i++) noise(t + i * 0.07, 0.06, { vol: 0.12, f0: 2500 + Math.random() * 1500, f1: 1200, type: 'bandpass', q: 4 }); break;
    case 'turn': tone(t, 76, 0.18, { type: 'sine', vol: 0.15 }); tone(t + 0.12, 83, 0.25, { type: 'sine', vol: 0.15 }); break;
    case 'dolphin': [79, 84, 88].forEach((m, i) => tone(t + i * 0.08, m, 0.2, { type: 'sine', vol: 0.2, slideTo: m + 3 })); break;
    case 'win': [60, 64, 67, 72, 67, 72, 76, 79].forEach((m, i) => tone(t + i * 0.16, m, 0.4, { type: 'triangle', vol: 0.28 })); break;
    default: break;
  }
}

// ---------- เสียงพื้นหลัง: คลื่น + pad ที่ตึงเครียดขึ้นเมื่อเกาะเหลือน้อย ----------
function startAmbient() {
  if (!ctx || ambNodes) return;
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let b = 0; for (let i = 0; i < len; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const g = ctx.createGain(); g.gain.value = 0.35;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
  const lg = ctx.createGain(); lg.gain.value = 0.22;
  lfo.connect(lg); lg.connect(g.gain);
  src.connect(f); f.connect(g); g.connect(ambG); src.start(); lfo.start();
  ambNodes = { src, lfo };
  padFilt = ctx.createBiquadFilter(); padFilt.type = 'lowpass'; padFilt.frequency.value = 500;
  const pg = ctx.createGain(); pg.gain.value = 0.07;
  padFilt.connect(pg); pg.connect(ambG);
  padOsc = [50, 57, 62].map((m, i) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m) * (1 + i * 0.002); o.connect(padFilt); o.start(); return o; });
  pulseTimer = setInterval(pulse, 1100);
  applyTension();
}
function stopAmbient() {
  try { if (ambNodes) { ambNodes.src.stop(); ambNodes.lfo.stop(); } padOsc.forEach((o) => o.stop()); } catch {}
  ambNodes = null; padOsc = []; clearInterval(pulseTimer); pulseTimer = null;
}
function applyTension() {
  if (!ctx || !padFilt) return;
  padFilt.frequency.setTargetAtTime(400 + tension * 1800, ctx.currentTime, 0.5);
  const base = 50 - tension * 2;
  padOsc.forEach((o, i) => o.frequency.setTargetAtTime(mtof(base + [0, 7, 12][i]), ctx.currentTime, 1));
}
// หัวใจเต้นเมื่อเกาะเหลือน้อย
function pulse() {
  if (!enabled || !ctx || tension < 0.55) return;
  const t = ctx.currentTime + 0.01;
  tone(t, 38, 0.18, { type: 'sine', vol: 0.18 + tension * 0.2, dest: ambG });
  tone(t + 0.2, 36, 0.2, { type: 'sine', vol: 0.12 + tension * 0.15, dest: ambG });
}
export function setTension(x) { tension = Math.max(0, Math.min(1, x)); applyTension(); }
