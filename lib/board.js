// กระดาน: ตารางหกเหลี่ยม 13x11 (pointy-top, odd-r) เกาะกลาง 41 ช่อง (ช่องกลางเป็นทะเล = 40 กระเบื้อง)
export const W = 13;
export const H = 11;
export const id = (x, y) => `${x},${y}`;
export const xy = (c) => c.split(',').map(Number);

function nbOf(x, y) {
  const d = y % 2 ? [[0, -1], [1, -1], [0, 1], [1, 1]] : [[-1, -1], [0, -1], [-1, 1], [0, 1]];
  const all = [[1, 0], [-1, 0], ...d];
  return all.map(([a, b]) => [x + a, y + b]).filter(([a, b]) => a >= 0 && a < W && b >= 0 && b < H).map(([a, b]) => id(a, b));
}
const px = (x, y) => [(x + 0.5 * (y % 2)) * Math.sqrt(3), y * 1.5];

export const CELLS = [];
export const NB = {};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { CELLS.push(id(x, y)); NB[id(x, y)] = nbOf(x, y); }

export const CENTER = id(6, 5);
const [cx0, cy0] = px(6, 5);
const sorted = [...CELLS].sort((a, b) => {
  const [ax, ay] = xy(a), [bx, by] = xy(b);
  const [pax, pay] = px(ax, ay), [pbx, pby] = px(bx, by);
  const ka = (pax - cx0) ** 2 * 0.85 + (pay - cy0) ** 2 * 1.15;
  const kb = (pbx - cx0) ** 2 * 0.85 + (pby - cy0) ** 2 * 1.15;
  return ka - kb || ay - by || ax - bx;
});
export const ISLAND = sorted.slice(0, 41);
export const TILE_CELLS = ISLAND.filter((c) => c !== CENTER);

// เกาะปลอดภัย 4 มุม: แต่ละเกาะมี 2 ช่องทะเลที่ติดเกาะ (ท่าเทียบ)
export const SAFE = {
  NW: [id(0, 0), id(0, 1)],
  NE: [id(11, 0), id(12, 0)],
  SW: [id(0, 9), id(0, 10)],
  SE: [id(11, 9), id(12, 10)],
};
export const DOCK_OF = {};
for (const [k, v] of Object.entries(SAFE)) for (const c of v) DOCK_OF[c] = k;
export const SERPENT_START = [CENTER, id(6, 1), id(6, 9), id(1, 5), id(11, 5)];
