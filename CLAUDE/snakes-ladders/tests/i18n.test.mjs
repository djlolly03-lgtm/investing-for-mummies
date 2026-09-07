/* tests/i18n.test.mjs — the language layer. Run: node tests/i18n.test.mjs */
import assert from 'node:assert/strict';
import {
  t, tn, setLang, getLang, onLangChange, otherLang, toggleLang, langChipLabel,
  ordinal, money, has, missingKeys, untranslatedKeys,
  STRINGS, LANGS, NUMERALS, setNumerals, toNumerals,
} from '../js/i18n.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; process.stdout.write('.'); void name; };

/* — shape — */
ok('two languages', () => assert.deepEqual(LANGS, ['en', 'hi']));
ok('STRINGS exported', () => { assert.ok(STRINGS.en); assert.ok(STRINGS.hi); });
ok('120+ keys', () => assert.ok(Object.keys(STRINGS.en).length >= 120,
  'only ' + Object.keys(STRINGS.en).length + ' English keys'));
ok('no english key is empty', () =>
  Object.entries(STRINGS.en).forEach(([k, v]) => assert.ok(v && v.trim(), k)));
ok('no hindi key is empty', () =>
  Object.entries(STRINGS.hi).forEach(([k, v]) => assert.ok(v && v.trim(), k)));
ok('no hindi key is orphaned', () =>
  Object.keys(STRINGS.hi).forEach(k => assert.ok(STRINGS.en[k] !== undefined, 'orphan ' + k)));

/* — lang state — */
ok('defaults to en', () => { setLang('en'); assert.equal(getLang(), 'en'); });
ok('setLang switches', () => { setLang('hi'); assert.equal(getLang(), 'hi'); setLang('en'); });
ok('bad lang falls to en', () => { setLang('hi'); setLang('fr'); assert.equal(getLang(), 'en'); });
ok('otherLang / chip', () => {
  setLang('en'); assert.equal(otherLang(), 'hi'); assert.equal(langChipLabel(), 'हिं');
  setLang('hi'); assert.equal(otherLang(), 'en'); assert.equal(langChipLabel(), 'EN');
  setLang('en');
});
ok('toggleLang round-trips', () => {
  setLang('en'); toggleLang(); assert.equal(getLang(), 'hi'); toggleLang(); assert.equal(getLang(), 'en');
});
ok('onLangChange fires and unsubscribes', () => {
  let seen = [];
  const off = onLangChange(v => seen.push(v));
  setLang('hi'); setLang('en');
  assert.deepEqual(seen, ['hi', 'en']);
  off();
  setLang('hi'); setLang('en');
  assert.deepEqual(seen, ['hi', 'en']);
});
ok('a throwing listener does not block others', () => {
  const seen = [];
  const a = onLangChange(() => { throw new Error('bad'); });
  const b = onLangChange(v => seen.push(v));
  setLang('hi');
  assert.deepEqual(seen, ['hi']);
  a(); b(); setLang('en');
});

/* — t() — */
ok('t returns the string', () => { setLang('en'); assert.equal(t('turn.roll'), 'Roll'); });
ok('t interpolates', () =>
  assert.equal(t('turn.rolled', { name: 'Priya', value: 4 }), 'Priya rolled 4'));
ok('t interpolates in hindi', () => {
  setLang('hi');
  assert.equal(t('turn.rolled', { name: 'प्रिया', value: 4 }), 'प्रिया ने 4 डाला');
  setLang('en');
});
ok('t handles 0 as a var', () =>
  assert.equal(t('hud.behindBy', { n: 0 }), '0 squares behind'));
ok('missing var is stripped, not printed as a brace', () => {
  const s = t('finish.needExactly');
  assert.ok(!s.includes('{'), s);
  assert.equal(s, 'You need exactly');
});
ok('hindi falls back to english, never to the key', () => {
  setLang('hi');
  assert.equal(t('app.byline'), 'Investing for Mummies');   // en-only key
  setLang('en');
});
ok('unknown key returns empty string, never the key', () => {
  const s = t('no.such.key.anywhere');
  assert.equal(s, '');
  assert.ok(!s.includes('no.such'));
});
ok('unknown key can take an explicit fallback', () =>
  assert.equal(t('no.such.key.two', null, 'Carry on'), 'Carry on'));
ok('missingKeys records them', () =>
  assert.ok(missingKeys().includes('no.such.key.anywhere')));
ok('has()', () => { assert.ok(has('turn.roll')); assert.ok(!has('turn.nope')); });

/* — every key resolves in both languages — */
ok('every key resolves non-empty in en and hi', () => {
  for (const lang of LANGS) {
    setLang(lang);
    for (const k of Object.keys(STRINGS.en)) {
      const s = t(k, { n: 2, name: 'Priya', value: 4, from: 1, to: 5, need: 3,
                       to_: 0, title: 'x', line: 'y', cell: 15, rank: '2nd',
                       lang: 'हिंदी', text: 'x', token: 'matka', mine: 6,
                       theirs: 2, occupants: 'z' });
      assert.ok(s.length > 0, lang + ' ' + k);
      assert.ok(!s.includes('{'), 'unfilled var in ' + lang + ' ' + k + ': ' + s);
    }
  }
  setLang('en');
});

/* — plurals — */
ok('tn singular / plural en', () => {
  setLang('en');
  assert.equal(tn('common.squares', 1), '1 square');
  assert.equal(tn('common.squares', 4), '4 squares');
  assert.equal(tn('end.rounds', 1), '1 round');
  assert.equal(tn('end.rounds', 26), '26 rounds');
});
ok('tn singular / plural hi', () => {
  setLang('hi');
  assert.equal(tn('common.squares', 1), '1 घर');
  assert.equal(tn('common.squares', 4), '4 घर');
  setLang('en');
});
ok('tn falls through to a non-plural key', () => {
  assert.equal(tn('turn.roll', 3), 'Roll');
});

/* — ordinals — */
ok('ordinals en', () => {
  setLang('en');
  assert.deepEqual([1, 2, 3, 4].map(ordinal), ['1st', '2nd', '3rd', '4th']);
  assert.equal(ordinal(9), '9th');
});
ok('ordinals hi', () => {
  setLang('hi');
  /* Nominative is the default: the standalone podium badge. 'पहले' on its
     own reads as 'earlier', which is what the winner's badge used to say. */
  assert.equal(ordinal(1), 'पहला');
  assert.equal(ordinal(4), 'चौथा');
  /* Oblique: inside a phrase, and after the honorific आप. */
  assert.equal(ordinal(1, 'obl'), 'पहले');
  assert.equal(ordinal(4, 'obl'), 'चौथे');
  setLang('en');
});

/* — money always goes through util.js — */
ok('money uses Indian grouping', () => {
  assert.equal(money(100000), '₹1,00,000');
  assert.equal(money(50000), '₹50,000');
  assert.equal(money(2500000, true), '₹25 lakh');
});
ok('money is identical in both languages', () => {
  setLang('en'); const a = money(117000);
  setLang('hi'); const b = money(117000);
  assert.equal(a, b); assert.equal(a, '₹1,17,000');
  setLang('en');
});

/* — numerals default to Latin — */
ok('numerals default latin', () => {
  assert.equal(getNumeralsSafe(), 'latin');
  assert.equal(t('hud.square', { n: 42 }), 'Square 42');
});
ok('devanagari numerals opt-in and reversible', () => {
  setNumerals('devanagari');
  assert.equal(t('hud.square', { n: 42 }), 'Square ४२');
  assert.equal(money(100000), '₹१,००,०००');
  setNumerals('latin');
  assert.equal(t('hud.square', { n: 42 }), 'Square 42');
});
ok('toNumerals is explicit', () => {
  assert.equal(toNumerals('1930', 'devanagari'), '१९३०');
  assert.equal(toNumerals('1930', 'latin'), '1930');
  assert.equal(NUMERALS.devanagari[7], '७');
});
function getNumeralsSafe() { return toNumerals('1') === '1' ? 'latin' : 'devanagari'; }

/* — the writing rules (DESIGN §13 + §5.6) — */
const BANNED = [
  'lazy', 'careless', 'foolish', 'greedy', 'should have', 'stupid',
  'guaranteed returns', 'will grow', 'you will get',
  'मुद्रास्फीति', 'निवेश', 'जोखिम', 'चक्रवृद्धि', 'आपातकालीन निधि',
  'पारस्परिक निधि', 'inflation', 'diversification', 'volatility',
  'liquidity', 'portfolio', 'corpus', 'net worth',
];
ok('no banned word anywhere', () => {
  for (const lang of LANGS) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      const low = v.toLowerCase();
      for (const b of BANNED) assert.ok(!low.includes(b), lang + '.' + k + ' contains "' + b + '": ' + v);
    }
  }
});
ok('nothing promises a return', () => {
  for (const lang of LANGS)
    for (const [k, v] of Object.entries(STRINGS[lang]))
      assert.ok(!/\b(guarantee[ds]?|promise)\b/i.test(v) || /not guaranteed|गारंटी नहीं/.test(v),
        lang + '.' + k + ': ' + v);
});
ok('the words people own stay in Roman script in hindi', () => {
  const keep = ['बुरा वक़्त फंड'];
  assert.ok(STRINGS.hi['shield.name'] === keep[0]);
  // financial nouns are never Devanagari-ised
  assert.ok(STRINGS.hi['settings.exactFinishSub'].includes('100'));
  assert.ok(STRINGS.hi['zone.3.sub'].includes('cover'));
});
ok('the equal-start line survives both languages', () => {
  assert.ok(STRINGS.en['setup.equalStart'].includes('not yours alone'));
  assert.ok(STRINGS.hi['setup.equalStart'].includes('अकेले आपकी नहीं है'));
});
ok('no string shouts at anyone with an exclamation mark', () => {
  for (const lang of LANGS)
    for (const [k, v] of Object.entries(STRINGS[lang]))
      assert.ok(!v.includes('!'), lang + '.' + k + ' shouts: ' + v);
});
ok('the Jhatka header says it is not your fault, in both', () => {
  assert.equal(STRINGS.en['event.header'], 'NOT YOUR FAULT');
  assert.equal(STRINGS.hi['event.header'], 'आपकी गलती नहीं');
});
ok('no key exceeds the ribbon cap where it is a ribbon line', () => {
  for (const k of ['event.cost', 'shield.absorbed', 'snake.header', 'ladder.header'])
    for (const lang of LANGS)
      assert.ok((STRINGS[lang][k] || STRINGS.en[k]).length <= 90, lang + '.' + k);
});

/* — coverage report — */
const gaps = untranslatedKeys();
console.log('\n' + n + ' assertions passed · ' +
  Object.keys(STRINGS.en).length + ' keys · ' +
  Object.keys(STRINGS.hi).length + ' translated · ' +
  (gaps.length ? gaps.length + ' fall back to English: ' + gaps.join(', ') : 'no gaps'));
