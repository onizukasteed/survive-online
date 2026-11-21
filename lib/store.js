// ชั้นเก็บข้อมูล: ใช้ Upstash Redis เมื่อมีตัวแปรสภาพแวดล้อม
// ถ้าไม่มี และรันในเครื่อง (ไม่ใช่ production) จะใช้หน่วยความจำชั่วคราวแทน เพื่อทดสอบ
import { Redis } from '@upstash/redis';

const g = globalThis;
g.__svMem = g.__svMem || { h: new Map(), locks: new Map() };

function client() {
  if (g.__svRedis === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    g.__svRedis = url && token ? new Redis({ url, token }) : null;
  }
  if (!g.__svRedis) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MEMORY_STORE !== '1') {
      throw new Error('NO_REDIS');
    }
  }
  return g.__svRedis;
}

const clone = (x) => JSON.parse(JSON.stringify(x));

export async function hgetall(key) {
  const r = client();
  if (r) {
    const v = await r.hgetall(key);
    return v && Object.keys(v).length ? v : null;
  }
  const h = g.__svMem.h.get(key);
  return h ? clone(Object.fromEntries(h)) : null;
}

export async function hset(key, obj) {
  const r = client();
  if (r) {
    await r.hset(key, obj);
    return;
  }
  let h = g.__svMem.h.get(key);
  if (!h) g.__svMem.h.set(key, (h = new Map()));
  for (const [k, v] of Object.entries(obj)) h.set(k, clone(v));
}

export async function exists(key) {
  const r = client();
  if (r) return (await r.exists(key)) > 0;
  return g.__svMem.h.has(key);
}

export async function expire(key, seconds) {
  const r = client();
  if (r) await r.expire(key, seconds);
}

// ล็อกแบบใช้ครั้งเดียว (กันสองคนสั่งเฉลย/ไปต่อพร้อมกัน) คืน true ถ้าได้ล็อก
export async function lock(key, seconds = 10) {
  const r = client();
  if (r) {
    const ok = await r.set(key, 1, { nx: true, ex: seconds });
    return ok === 'OK';
  }
  const now = Date.now();
  const exp = g.__svMem.locks.get(key);
  if (exp && exp > now) return false;
  g.__svMem.locks.set(key, now + seconds * 1000);
  return true;
}

export async function unlock(key) {
  const r = client();
  if (r) { await r.del(key); return; }
  g.__svMem.locks.delete(key);
}
