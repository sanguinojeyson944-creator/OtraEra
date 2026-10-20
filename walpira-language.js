const CONSONANTS = new Set(['m', 'n', 'p', 't', 'k', 's', 'l', 'r', 'w', 'h']);
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const ROOTS = {
  m: 'M8 31 V22 C8 10 20 10 20 22 C20 10 32 10 32 22 V31',
  n: 'M9 31 V10 L31 31 V10',
  p: 'M10 32 V8 H25 C34 8 34 18 25 18 H10',
  t: 'M20 7 V33 M9 14 H31',
  k: 'M11 8 V32 M11 20 L30 9 M11 20 L30 31',
  s: 'M9 12 C24 3 34 14 22 18 C10 22 12 33 31 28',
  l: 'M13 8 V31 H31',
  r: 'M9 31 V10 H23 C35 10 34 21 19 21 L31 32',
  w: 'M7 12 L13 29 L20 12 L27 29 L33 12',
  h: 'M9 9 V17 M9 25 V33 M31 9 V17 M31 25 V33'
};
const VOWEL_MARKS = {
  a: '<circle cx="20" cy="35" r="2.4"/>',
  e: '<path d="M35 17 H40"/>',
  i: '<circle cx="20" cy="4" r="2"/>',
  o: '<path d="M4 17 C0 20 1 26 5 26 C9 26 10 20 6 17"/>',
  u: '<path d="M12 35 C16 40 24 40 28 35"/>'
};

function splitSyllables(word) {
  const result = [];
  let index = 0;
  while (index < word.length) {
    let consonant = '';
    if (CONSONANTS.has(word[index]) && VOWELS.has(word[index + 1])) {
      consonant = word[index];
      index++;
    }
    if (!VOWELS.has(word[index])) {
      if (CONSONANTS.has(word[index])) { consonant = word[index]; index++; }
      else { index++; continue; }
    }
    const vowel = word[index++];
    let coda = '';
    if ((word[index] === 'n' || word[index] === 'r') && index === word.length - 1) coda = word[index++];
    result.push({ consonant, vowel, coda });
  }
  return result;
}

function renderSyllable({ consonant, vowel, coda }) {
  const root = consonant ? ROOTS[consonant] : 'M20 9 V31';
  const codaMark = coda === 'n' ? '<path d="M27 30 L34 35"/>' : coda === 'r' ? '<path d="M27 30 Q35 34 36 28"/>' : '';
  return '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + root + '"/><g fill="currentColor" stroke="none">' + VOWEL_MARKS[vowel] + '</g><path d="' + codaMark + '"/></g>';
}

export function walpiraScriptSvg(phrase) {
  const words = String(phrase || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter(Boolean);
  const glyphGroups = [];
  let x = 0;
  for (const word of words) {
    for (const syllable of splitSyllables(word)) {
      glyphGroups.push('<g transform="translate(' + x + ' 0)">' + renderSyllable(syllable) + '</g>');
      x += 48;
    }
    x += 18;
  }
  if (!glyphGroups.length) return '';
  return '<svg class="nairu-script" viewBox="0 0 ' + Math.max(1, x - 12) + ' 44" role="img" aria-label="' + String(phrase).replace(/[&<>"']/g, '') + '" xmlns="http://www.w3.org/2000/svg">' + glyphGroups.join('') + '</svg>';
}
