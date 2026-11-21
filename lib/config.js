// ตัวเลขทั้งหมดของเกมอยู่ที่นี่ที่เดียว (ปรับให้ตรงกล่องจริงได้)
export const CFG = {
  tiles: { B: 16, F: 16, M: 8 },
  values: [1, 1, 2, 2, 3, 3, 4, 4, 5, 6], // เลขตัวคนต่อสี (ค่าประมาณตามเกมจริง)
  shipsTotal: 12,
  sharks: 6,
  whales: 5,
  serpents: 5,
  // ใต้กระเบื้อง 40 ใบ (ค่าประมาณ ปรับได้) volcano ซ่อนใต้ Mountain
  unders: {
    shark: 6, whale: 5, boat: 4, whirlpool: 2, volcano: 1,
    dolphin: 4, winds: 3, mvSerpent: 3, mvShark: 3, mvWhale: 3, defShark: 3, defWhale: 3,
  },
  die: ['serpent', 'shark', 'whale', 'serpent', 'shark', 'whale'],
  minPlayers: 2,
  maxPlayers: 6,
  colors: ['red', 'blue', 'yellow', 'green', 'purple', 'orange'],
  defendSeconds: 25,
  moves: 3,
};
export const IMMEDIATE = ['shark', 'whale', 'boat', 'whirlpool', 'volcano'];
export const DEFENSE = ['defShark', 'defWhale'];
export const UNDER_TH = {
  shark: 'ฉลาม', whale: 'วาฬ', boat: 'เรือ', whirlpool: 'วังวน', volcano: 'ภูเขาไฟระเบิด',
  dolphin: 'โลมาช่วย', winds: 'ลมเป็นใจ', mvSerpent: 'ย้ายงูทะเล', mvShark: 'ย้ายฉลาม', mvWhale: 'ย้ายวาฬ',
  defShark: 'ป้องกันฉลาม', defWhale: 'ป้องกันวาฬ',
};
