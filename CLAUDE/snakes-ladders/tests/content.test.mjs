/* node tests/content.test.mjs — the curriculum gate.
   Structure, arithmetic hygiene, reading level, and the house rules from
   docs/CONTENT.md and DESIGN.md §5.6. Exits non-zero on any failure. */

import { SQUARES, SNAKES, LADDERS, GLOSSARY, BOARD, squareAt, snakeAt, ladderAt } from '../js/content.js';
import { indianFormat } from '../js/util.js';
import { EVENT_SQUARES } from '../js/rules.js';

let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { console.log('  ✗ ' + m); fails++; } };
const section = (t) => console.log('\n' + t);

/* ── helpers ─────────────────────────────────────────────────────────── */
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
// split on . ! ? followed by space+capital or end. Protects decimals and ₹1,00,000.
const sentences = (s) => String(s)
  .replace(/(\d)\.(\d)/g, '$1\u0000$2')                    // protect 3.5 / 8.2
  .split(/(?<=[.!?])\s+(?=[A-Z"'\u20b9\u201c\u2018(])|(?<=[.!?])$/)
  .map(x => x.replace(/\u0000/g, '.').trim())
  .filter(Boolean);

/** Every text field the player can ever read, as [path, string]. */
function allText() {
  const out = [];
  const push = (p, v) => { if (typeof v === 'string' && v) out.push([p, v]); };
  for (const s of SQUARES) {
    push(`sq${s.n}.title`, s.title); push(`sq${s.n}.lesson`, s.lesson);
    push(`sq${s.n}.why`, s.why); push(`sq${s.n}.action`, s.action);
    push(`sq${s.n}.deep`, s.deep); push(`sq${s.n}.heritage`, s.heritage);
    (s.bullets || []).forEach((b, i) => push(`sq${s.n}.bullets[${i}]`, b));
    if (s.quiz) {
      push(`sq${s.n}.quiz.question`, s.quiz.question);
      (s.quiz.chips || []).forEach((c, i) => push(`sq${s.n}.quiz.chips[${i}]`, c));
      push(`sq${s.n}.quiz.reveal`, s.quiz.reveal);
    }
    if (s.event) for (const k of ['name', 'line', 'shielded', 'setback']) push(`sq${s.n}.event.${k}`, s.event[k]);
  }
  for (const x of SNAKES) for (const k of ['name', 'why', 'escape', 'counterparty', 'deep', 'costNote'])
    push(`snake${x.from}.${k}`, x[k]);
  for (const x of LADDERS) for (const k of ['name', 'why', 'how', 'deep', 'heritage', 'amountNote'])
    push(`ladder${x.from}.${k}`, x[k]);
  for (const g of GLOSSARY) { push(`gl:${g.term}.hinglish`, g.hinglish); push(`gl:${g.term}.plain`, g.plain); }
  return out;
}
const TEXT = allText();

/* ── 1. the 100 squares ──────────────────────────────────────────────── */
section('1 · the board is 100 squares, 1..100, no gaps');
ok(SQUARES.length === 100, `exactly 100 squares (got ${SQUARES.length})`);
for (let n = 1; n <= 100; n++) {
  ok(SQUARES[n - 1] && SQUARES[n - 1].n === n, `SQUARES[${n - 1}].n === ${n}`);
  ok(squareAt(n) && squareAt(n).n === n, `squareAt(${n}) resolves`);
}
const KINDS = ['plain', 'lesson', 'quiz', 'event', 'milestone', 'finish'];
for (const s of SQUARES) ok(KINDS.includes(s.kind), `sq${s.n} kind "${s.kind}" is legal`);
ok(squareAt(100).kind === 'finish', 'square 100 is the finish');
ok(squareAt(0) === null && squareAt(101) === null, 'squareAt is null outside 1..100');

/* ── 2. titles and ribbon lines ──────────────────────────────────────── */
section('2 · titles < 24 chars, lessons < 95 chars');
for (const s of SQUARES) {
  ok(typeof s.title === 'string' && s.title.trim().length > 0, `sq${s.n} has a title`);
  ok(s.title.length < 24, `sq${s.n} title < 24 chars ("${s.title}" = ${s.title.length})`);
  ok(typeof s.lesson === 'string' && s.lesson.trim().length > 0, `sq${s.n} has a lesson`);
  ok(s.lesson.length < 95, `sq${s.n} lesson < 95 chars (${s.lesson.length})`);
  // DESIGN §5.2 ribbon hard cap
  ok(s.lesson.length <= 90, `sq${s.n} lesson <= 90 chars, the ribbon cap (${s.lesson.length})`);
}

/* ── 3. snakes go down, ladders go up ────────────────────────────────── */
section('3 · snakes descend, ladders ascend, nothing collides');
ok(SNAKES.length === 8, `8 snakes (got ${SNAKES.length})`);
ok(LADDERS.length === 8, `8 ladders (got ${LADDERS.length})`);
for (const s of SNAKES) {
  ok(s.to < s.from, `snake ${s.from}→${s.to} goes strictly down`);
  ok(s.from >= 2 && s.from <= 99, `snake head ${s.from} is on the board and not 100`);
  ok(s.to >= 1, `snake tail ${s.to} >= 1`);
  ok(snakeAt(s.from) === s, `snakeAt(${s.from}) resolves`);
  ok(squareAt(s.from).kind === 'lesson', `snake head ${s.from} carries kind:'lesson'`);
}
for (const l of LADDERS) {
  ok(l.to > l.from, `ladder ${l.from}→${l.to} goes strictly up`);
  ok(l.from >= 1 && l.from <= 99, `ladder foot ${l.from} is on the board and not 100`);
  ok(l.to <= 100, `ladder top ${l.to} <= 100`);
  ok(ladderAt(l.from) === l, `ladderAt(${l.from}) resolves`);
  ok(squareAt(l.from).kind === 'lesson', `ladder foot ${l.from} carries kind:'lesson'`);
}
const heads = SNAKES.map(s => s.from), feet = LADDERS.map(l => l.from);
const tails = SNAKES.map(s => s.to), tops = LADDERS.map(l => l.to);
ok(new Set(heads).size === heads.length, 'no two snakes share a head');
ok(new Set(feet).size === feet.length, 'no two ladders share a foot');
ok(new Set(tails).size === tails.length, 'no two snakes share a tail');
ok(new Set(tops).size === tops.length, 'no two ladders share a top');
ok(!heads.includes(100) && !feet.includes(100), 'nothing starts on square 100');
for (const n of heads) ok(!feet.includes(n), `square ${n} is not both a snake head and a ladder foot`);
for (const n of tops) ok(!heads.includes(n), `ladder top ${n} is not a snake head (no chaining)`);
for (const n of tails) ok(!feet.includes(n), `snake tail ${n} is not a ladder foot (no chaining)`);
// exhaustive: follow every jump; a loop would never terminate
for (const start of [...heads, ...feet]) {
  let at = start, hops = 0, seen = new Set();
  while (hops++ < 20) {
    if (seen.has(at)) break;
    seen.add(at);
    const j = snakeAt(at) || ladderAt(at);
    if (!j) break;
    at = j.to;
  }
  ok(hops < 20, `jump chain from ${start} terminates (no loop)`);
}
ok(BOARD.snakes === SNAKES && BOARD.ladders === LADDERS, 'BOARD wires SNAKES/LADDERS for rules.js');
// the exact board tests/board.sim.mjs measured (DESIGN §10.1). Changing it re-opens that gate.
const SIMULATED = { ladders: '3-22,12-30,17-36,25-49,41-62,54-71,68-85,78-94',
                    snakes:  '27-9,38-20,46-28,57-40,66-47,74-55,89-79,96-88' };
ok(LADDERS.map(l => `${l.from}-${l.to}`).join(',') === SIMULATED.ladders, 'ladders match the simulated board');
ok(SNAKES.map(s => `${s.from}-${s.to}`).join(',') === SIMULATED.snakes, 'snakes match the simulated board');

/* ── 4. the card fields exist and are the right length ───────────────── */
section('4 · every snake and ladder is a complete card');
for (const s of SNAKES) {
  for (const k of ['name', 'why', 'escape', 'deep', 'counterparty'])
    ok(typeof s[k] === 'string' && s[k].trim(), `snake ${s.from} has ${k}`);
  ok(s.why.length <= 140, `snake ${s.from} why <= 140 chars (${s.why.length})`);
  ok(s.escape.length <= 110, `snake ${s.from} escape <= 110 chars (${s.escape.length})`);
  ok(s.why.includes('₹'), `snake ${s.from} why carries a ₹ figure`);
  ok(Number.isFinite(s.cost) && s.cost > 0, `snake ${s.from} has a rupee cost for the spine`);
  const w = words(s.deep);
  ok(w >= 40 && w <= 90, `snake ${s.from} deep is 40-90 words (${w})`);
}
for (const l of LADDERS) {
  for (const k of ['name', 'why', 'how', 'deep'])
    ok(typeof l[k] === 'string' && l[k].trim(), `ladder ${l.from} has ${k}`);
  ok(l.why.length <= 140, `ladder ${l.from} why <= 140 chars (${l.why.length})`);
  ok(l.how.length <= 110, `ladder ${l.from} how <= 110 chars (${l.how.length})`);
  ok(l.why.includes('₹'), `ladder ${l.from} why carries a ₹ figure`);
  const w = words(l.deep);
  ok(w >= 40 && w <= 90, `ladder ${l.from} deep is 40-90 words (${w})`);
}
for (const s of SQUARES) if (s.deep) {
  const w = words(s.deep);
  ok(w >= 40 && w <= 90, `sq${s.n} deep is 40-90 words (${w})`);
}

/* ── 5. the shape DESIGN.md §3.2 counted ─────────────────────────────── */
section('5 · the six landing cases add up to 100');
const count = (k) => SQUARES.filter(s => s.kind === k).length;
ok(count('lesson') === 22, `22 lesson squares (got ${count('lesson')})`);
ok(count('quiz') === 5, `5 quiz squares (got ${count('quiz')})`);
ok(count('event') === 6, `6 event squares (got ${count('event')})`);
ok(count('milestone') === 4, `4 milestones (got ${count('milestone')})`);
ok(count('finish') === 1, `1 finish (got ${count('finish')})`);
ok(count('plain') === 62, `62 plain squares (got ${count('plain')})`);
const eventNums = SQUARES.filter(s => s.kind === 'event').map(s => s.n);
ok(String(eventNums) === String(EVENT_SQUARES), `event squares match rules.js EVENT_SQUARES (${eventNums})`);
for (const s of SQUARES.filter(x => x.kind === 'event'))
  for (const k of ['name', 'line', 'shielded', 'setback'])
    ok(typeof s.event?.[k] === 'string' && s.event[k].trim(), `sq${s.n} event has ${k}`);
for (const s of SQUARES.filter(x => x.kind === 'quiz')) {
  ok(s.quiz && s.quiz.chips?.length === 2, `sq${s.n} quiz has exactly two chips`);
  ok(words(s.quiz.question) <= 12, `sq${s.n} quiz question <= 12 words (${words(s.quiz.question)})`);
  for (const c of s.quiz.chips) ok(words(c) <= 6, `sq${s.n} chip "${c}" <= 6 words`);
  ok(s.quiz.reveal && s.quiz.reveal.trim(), `sq${s.n} quiz has a reveal`);
}
for (const s of SQUARES.filter(x => x.kind === 'milestone')) {
  ok(s.bullets?.length === 3, `sq${s.n} milestone has 3 bullets`);
  ok(!!s.deep, `sq${s.n} milestone has an Aur padho`);
}
// standalone lesson squares must carry their own card, snake/ladder ones must not duplicate it
for (const s of SQUARES.filter(x => x.kind === 'lesson')) {
  const linked = !!(snakeAt(s.n) || ladderAt(s.n));
  if (!linked) for (const k of ['why', 'action', 'deep'])
    ok(typeof s[k] === 'string' && s[k].trim(), `standalone lesson sq${s.n} has ${k}`);
}
// DESIGN §4: the inherited-coordinate whispers
for (const n of [12, 51, 69, 76, 78, 99]) ok(!!squareAt(n).heritage, `sq${n} carries its heritage line`);

/* ── 6. Indian digit grouping on every rupee figure ──────────────────── */
section('6 · every ₹ figure uses Indian grouping');
const MONEY = /₹\s?\d(?:[\d,]*\d)?(?:\.\d+)?/g;
for (const [path, text] of TEXT) {
  for (const m of text.match(MONEY) || []) {
    const raw = m.replace(/^₹\s?/, '');
    if (raw.includes('.')) { ok(!raw.includes(','), `${path}: "${m}" decimal needs no grouping`); continue; }
    const n = Number(raw.replace(/,/g, ''));
    ok(indianFormat(n) === raw, `${path}: "${m}" should be "₹${indianFormat(n)}"`);
  }
}

/* ── 7. honesty rules (CONTENT.md preamble, DESIGN §5.6, §14) ────────── */
section('7 · honesty: no promised returns, no naked percentages, no blame');
const BANNED = ['lazy', 'careless', 'foolish', 'greedy', 'should have', 'stupid',
                'guaranteed returns', 'will grow', 'you will get'];
for (const [path, text] of TEXT) {
  const low = text.toLowerCase();
  for (const b of BANNED) ok(!low.includes(b), `${path}: banned phrase "${b}" absent`);
}
// a percentage never appears without a rupee amount in the same field
for (const [path, text] of TEXT) {
  if (/\d\s?%/.test(text)) ok(text.includes('₹'), `${path}: has a % so it must carry a ₹ amount`);
}
// any growth claim states its rate and says "not guaranteed"
const GROWTH = /\b(grew|grow|growing at|compounded)\b/i;
for (const [path, text] of TEXT) {
  if (GROWTH.test(text) && /\d\s?%/.test(text))
    ok(/not guaranteed/i.test(text), `${path}: growth figure must say "not guaranteed"`);
}
// weddings, medical care, education and parents are never a snake
const NEVER_A_SNAKE = ['shaadi', 'wedding', 'hospital', 'beemari', 'school', 'fees', 'maa-baap', 'parent'];
for (const s of SNAKES) {
  const low = (s.name + ' ' + s.why).toLowerCase();
  for (const w of NEVER_A_SNAKE) ok(!low.includes(w), `snake ${s.from} does not blame "${w}"`);
}
// every snake names who got paid
for (const s of SNAKES) ok(s.counterparty.length > 10, `snake ${s.from} names the counterparty`);
// the escape is an instruction, not an opinion — it must start with a verb-ish word
for (const s of SNAKES) ok(/^[A-Z][a-z]/.test(s.escape) || s.escape.startsWith('That'),
  `snake ${s.from} escape opens with an action`);

/* ── 8. reading level ────────────────────────────────────────────────── */
section('8 · reading level: no sentence over 22 words');
for (const [path, text] of TEXT) {
  for (const s of sentences(text)) {
    const w = words(s);
    ok(w <= 22, `${path}: sentence of ${w} words — "${s.slice(0, 60)}…"`);
  }
}

/* ── 9. the glossary covers every term the game says ─────────────────── */
section('9 · glossary covers every capitalised financial term used');
for (const g of GLOSSARY) {
  for (const k of ['term', 'hinglish', 'plain'])
    ok(typeof g[k] === 'string' && g[k].trim(), `glossary "${g.term}" has ${k}`);
  ok(words(g.plain) <= 15, `glossary "${g.term}" plain <= 15 words (${words(g.plain)})`);
}
ok(new Set(GLOSSARY.map(g => g.term)).size === GLOSSARY.length, 'no duplicate glossary terms');

// regulators, agencies, statutes and schemes — named, not defined. Everything
// else in ALL CAPS must be in the glossary.
const PROPER = new Set(['SEBI', 'RBI', 'IRDAI', 'CBI', 'AMFI', 'SCSS', 'PACL', 'LIC', 'OTP', 'FY25', 'FY26']);
const GLOSSARY_BLOB = GLOSSARY.map(g => `${g.term} ${g.hinglish} ${g.plain}`).join(' ');
const seen = new Map();
for (const [path, text] of TEXT) {
  for (const a of text.match(/\b[A-Z][A-Z&0-9]+\b/g) || []) if (!seen.has(a)) seen.set(a, path);
}
for (const [a, path] of seen) {
  ok(PROPER.has(a) || GLOSSARY_BLOB.includes(a),
    `"${a}" (first used in ${path}) is in the glossary or is a named body`);
}
// and every square that declares a term must point at a real glossary entry
const TERMS = new Set(GLOSSARY.map(g => g.term));
for (const s of SQUARES) if (s.term) ok(TERMS.has(s.term), `sq${s.n} term "${s.term}" exists in the glossary`);
for (const x of [...SNAKES, ...LADDERS]) if (x.term) ok(TERMS.has(x.term), `${x.from} term "${x.term}" exists`);

/* ── summary ─────────────────────────────────────────────────────────── */
console.log(`\n${checks - fails}/${checks} assertions passed`);
if (fails) { console.log(`${fails} FAILED`); process.exit(1); }
console.log('content.js — clean.');
