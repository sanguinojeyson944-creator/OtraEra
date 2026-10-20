const GLYPHS = {
  a: ['M4 24 L14 4 L24 24', 'M8 16 H20'],
  e: ['M23 5 H6 V24 H24', 'M6 14 H19'],
  i: ['M6 5 H22', 'M14 5 V24', 'M6 24 H22'],
  o: ['M8 5 H20 L24 9 V20 L20 24 H8 L4 20 V9 Z'],
  u: ['M4 5 V18 L8 24 H20 L24 18 V5'],
  p: ['M5 24 V5 H18 L23 9 V13 L19 16 H5'],
  t: ['M4 7 H24', 'M14 7 V24'],
  k: ['M5 5 V24', 'M5 16 L22 6', 'M11 13 L24 24'],
  m: ['M4 24 V5 L14 15 L24 5 V24'],
  n: ['M5 24 V5 L24 24 V5'],
  s: ['M23 6 H8 L4 10 V13 L8 15 H20 L24 18 V21 L20 24 H5'],
  l: ['M5 5 V24 H24'],
  r: ['M5 24 V5 H18 L23 9 V13 L18 16 H5', 'M14 16 L24 24'],
  w: ['M4 5 L8 24 L14 14 L20 24 L24 5'],
  h: ['M5 5 V24', 'M5 14 H23', 'M23 5 V24'],
  g: ['M5 24 V5 H23 V14 H14', 'M14 14 L24 24'],
  d: ['M5 5 V24 H16 L23 18 V11 L16 5 Z'],
  b: ['M5 24 V5', 'M5 6 H17 L22 10 V13 L17 15 H5', 'M5 15 H18 L23 19 V21 L19 24 H5'],
  y: ['M4 5 L14 15 L24 5', 'M14 15 V24'],
  f: ['M6 24 V5 H24', 'M6 14 H20'],
  c: ['M23 6 H9 L4 11 V19 L9 24 H23'],
  x: ['M5 5 L23 24', 'M23 5 L5 24']
};
const CELL_WIDTH = 32;
const CELL_HEIGHT = 30;

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

export function renderAruwaiLine(text) {
  const source = String(text || '').toLowerCase();
  let offset = 3;
  const marks = [];
  for (const character of source) {
    if (character === ' ') { offset += 11; continue; }
    const strokes = GLYPHS[character];
    if (!strokes) continue;
    for (const stroke of strokes) marks.push(`<path d="${stroke}" transform="translate(${offset} 2)"/>`);
    offset += CELL_WIDTH;
  }
  const width = Math.max(12, offset + 2);
  return `<svg class="aruwai-script" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${CELL_HEIGHT}" role="img" aria-label="Aruwai: ${escapeAttribute(text)}" preserveAspectRatio="xMinYMid meet"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${marks.join('')}</g></svg>`;
}

export const ARUWAI_PHRASES = {
  motherAsk: 'Nari, keli sali toma ka',
  heroSince: 'Keli sali toma, mara',
  motherKeep: 'Keli sali na lata',
  motherSignal: 'Sena aru, mara hena',
  heroGo: 'Kora, mara; aru hena',
  glemierSignal: 'Sena aru tali; glemier hena',
  glemierTask: 'Kora kana, nari; aru pali',
  barrickStone: 'Keli sali wira; na mali',
  barrickWork: 'Kora, keli sali; toma wira',
  exteriorFirst: 'Mara sena na; aru nari hena',
  soldierHide: 'Tala dori; nari na rima'
};
