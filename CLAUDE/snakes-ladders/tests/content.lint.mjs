/* content.lint.mjs — the ethics + clarity GATE (DESIGN.md §5.6).
   Written independently of whoever wrote the content, on purpose.
   node tests/content.lint.mjs                                            */
import { SQUARES, SNAKES, LADDERS, GLOSSARY } from '../js/content.js';

let fail = 0, warn = 0;
const bad  = (m) => { console.log('  ✗ ' + m); fail++; };
const soft = (m) => { console.log('  ⚠ ' + m); warn++; };
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const chars = (s) => String(s || '').length;
/** Indian and Western grouping agree below ₹1,00,000. They diverge from six digits up:
 *  ₹1,00,000 is right, ₹100,000 and ₹1,000,000 are not. Only flag the real divergence. */
function westernGrouping(v) {
  const m = String(v || '').match(/₹\s?\d{1,3}(?:,\d{3}){1,}/g) || [];
  for (const hit of m) {
    const groups = hit.replace(/₹\s?/, '').split(',');
    if (groups.length === 2 && groups[0].length <= 2) continue;   // ₹50,000 · ₹5,000 — fine
    return hit;                                                   // ₹100,000 · ₹12,50,000 written 1,250,000
  }
  return null;
}

/* Banned outright. §5.6 */
const BANNED = ['lazy','careless','foolish','greedy','should have','stupid','waste',
                'guaranteed return','will grow','you will get','shouldn\'t have',
                'your fault','bad with money','irresponsible'];
/* These four are never, ever a snake. Hard assert. §5.6 */
const NEVER_A_SNAKE = ['wedding','shaadi','marriage','medical','hospital','illness','ilaaj',
                       'education','school fee','college','parent','maa','papa','mother','father'];

const ALL_TEXT_FIELDS = (o) => Object.entries(o)
  .filter(([k, v]) => typeof v === 'string' && !['kind','id','name','term','hinglish'].includes(k));

console.log('CONTENT LINT — DESIGN.md §5.6\n');

/* ── 1. shape ─────────────────────────────────────────────── */
console.log('shape');
if (SQUARES.length !== 100) bad(`SQUARES has ${SQUARES.length}, expected exactly 100`);
else console.log('  ✓ exactly 100 squares');
const nums = SQUARES.map(s => s.n);
if (nums.join() !== Array.from({length:100},(_,i)=>i+1).join()) bad('squares are not numbered 1..100 in order');
else console.log('  ✓ numbered 1..100 in order');
const KINDS = ['plain','lesson','quiz','event','milestone','finish'];
const badKinds = SQUARES.filter(s => !KINDS.includes(s.kind));
if (badKinds.length) bad(`bad kind on squares ${badKinds.map(s=>s.n).join(',')} (allowed: ${KINDS.join('|')})`);
else console.log('  ✓ every kind is in the allowed set');
if (SNAKES.length !== 8) soft(`${SNAKES.length} snakes — the simulated board has 8; re-run board.sim.mjs`);
if (LADDERS.length !== 8) soft(`${LADDERS.length} ladders — the simulated board has 8; re-run board.sim.mjs`);

/* ── 2. lengths §5.6 ──────────────────────────────────────── */
console.log('\nlengths');
let lenFail = 0;
for (const s of SQUARES) {
  if (chars(s.title) > 26) { bad(`square ${s.n} title ${chars(s.title)} chars > 26: "${s.title}"`); lenFail++; }
  if (chars(s.lesson) > 90) { bad(`square ${s.n} ribbon line ${chars(s.lesson)} chars > 90`); lenFail++; }
  const sentences = String(s.lesson||'').split(/[.!?]+\s/).filter(x=>x.trim().length>3);
  if (sentences.length > 3) soft(`square ${s.n} ribbon line is ${sentences.length} sentences — the ribbon is one thought`);
}
for (const x of [...SNAKES, ...LADDERS]) {
  const tag = (x.to < x.from ? 'snake ' : 'ladder ') + x.from + '→' + x.to;
  if (chars(x.name) > 26) { bad(`${tag} name ${chars(x.name)} > 26`); lenFail++; }
  if (chars(x.why) > 140) { bad(`${tag} why ${chars(x.why)} > 140`); lenFail++; }
  const act = x.escape || x.how;
  if (chars(act) > 110) { bad(`${tag} escape/how ${chars(act)} > 110`); lenFail++; }
  const w = words(x.deep);
  if (w < 40 || w > 80) { bad(`${tag} deep explainer is ${w} words, must be 40–80`); lenFail++; }
}
if (!lenFail) console.log('  ✓ every title, ribbon, why, escape and deep explainer is within budget');

/* ── 3. money discipline §5.6 ─────────────────────────────── */
console.log('\nmoney');
let moneyFail = 0;
for (const x of [...SNAKES, ...LADDERS]) {
  const tag = (x.to < x.from ? 'snake ' : 'ladder ') + x.from + '→' + x.to;
  if (!/₹/.test(x.why)) { bad(`${tag} why has no ₹ figure — §5.6 requires one`); moneyFail++; }
  for (const [k, v] of ALL_TEXT_FIELDS(x)) {
    if (/\d+(\.\d+)?\s*%/.test(v) && !/₹/.test(v)) {
      bad(`${tag}.${k} states a percentage with no rupee amount beside it: "${v.slice(0,70)}…"`); moneyFail++;
    }
    const m = westernGrouping(v);
    if (m) { bad(`${tag}.${k} uses Western digit grouping ${m} — must be Indian (₹1,00,000)`); moneyFail++; }
  }
}
for (const s of SQUARES) {
  const m = westernGrouping([s.title, s.lesson, s.deep].join(' '));
  if (m) { bad(`square ${s.n} uses Western digit grouping ${m}`); moneyFail++; }
}
if (!moneyFail) console.log('  ✓ every claim carries a rupee amount, in Indian grouping, and no bare percentages');

/* ── 4. growth claims must say "not guaranteed" ───────────── */
console.log('\nhonesty');
let honFail = 0;
// Only a forward-looking projection of the player's OWN money needs the disclaimer.
// Describing how a Ponzi's maths works, or how a fee compounds against you, does not.
const GROWTH = /(would be worth|becomes ₹|grows to|turns into ₹|after \d+ years? (it|you)|at 1[0-5]\s*%)/i;
const AGAINST_YOU = /(against you|fee|commission|expense|charge|interest on|you pay|costs you)/i;
for (const x of [...SNAKES, ...LADDERS]) {
  const tag = (x.to < x.from ? 'snake ' : 'ladder ') + x.from + '→' + x.to;
  const blob = ALL_TEXT_FIELDS(x).map(([,v])=>v).join(' ');
  if (GROWTH.test(blob) && /₹/.test(blob) && !AGAINST_YOU.test(blob) && !/not guaranteed/i.test(blob)) {
    bad(`${tag} projects growth without the words "not guaranteed"`); honFail++;
  }
}
for (const [where, blob] of [
  ...SQUARES.map(s => [`square ${s.n}`, [s.title,s.lesson,s.deep].join(' ')]),
  ...[...SNAKES,...LADDERS].map(x => [(x.to<x.from?'snake ':'ladder ')+x.from, ALL_TEXT_FIELDS(x).map(([,v])=>v).join(' ')]),
]) {
  for (const b of BANNED) {
    const re = new RegExp('(\\S+\\s+\\S+\\s+)?\\b'+b.replace(/'/g,"['’]")+'\\b','ig');
    for (const hit of blob.match(re) || []) {
      // "Not your fault" / "this is not a mistake" is the point of the game, not a violation.
      if (/\b(not|never|nahi|no)\b[^.]{0,12}$|\b(not|never|nahi)\s+\S*\s*$/i.test(hit.slice(0, hit.length - b.length))) continue;
      bad(`${where} uses the banned phrase "${b}" in: "…${hit.trim()}…"`); honFail++;
    }
  }
}
if (!honFail) console.log('  ✓ no blame language anywhere; every growth figure says "not guaranteed"');

/* ── 5. the four things that are never a snake ────────────── */
console.log('\nethics');
let ethFail = 0;
for (const s of SNAKES) {
  const blob = [s.name, s.why, s.escape].join(' ').toLowerCase();
  for (const t of NEVER_A_SNAKE) {
    // a snake may MENTION these; it may not BE them. Flag when it is the named trap.
    if (s.name.toLowerCase().includes(t)) { bad(`snake ${s.from}→${s.to} is named for "${t}" — weddings, medical care, education and parents are never a snake`); ethFail++; }
  }
  if (!s.counterparty || words(s.counterparty) < 3)
    { bad(`snake ${s.from}→${s.to} has no counterparty line — §5.3 requires every snake to name who got paid`); ethFail++; }
}
for (const s of SNAKES) if (s.to >= s.from) { bad(`snake ${s.from}→${s.to} does not go down`); ethFail++; }
for (const l of LADDERS) if (l.to <= l.from) { bad(`ladder ${l.from}→${l.to} does not go up`); ethFail++; }
if (!ethFail) console.log('  ✓ every snake is a trap the system set, not a life a person led');

/* ── 6. reading level ─────────────────────────────────────── */
console.log('\nreading level');
let rlFail = 0;
const allLines = [...SQUARES.map(s=>({w:`square ${s.n}`,t:s.lesson})),
                  ...[...SNAKES,...LADDERS].flatMap(x=>['why','escape','how','deep']
                    .filter(k=>x[k]).map(k=>({w:`${x.from}→${x.to}.${k}`,t:x[k]})))];
for (const {w,t} of allLines) {
  for (const sen of String(t).split(/(?<=[.!?])\s+/)) {
    if (words(sen) > 22) { bad(`${w}: a ${words(sen)}-word sentence — the cap is 22. "${sen.slice(0,60)}…"`); rlFail++; }
  }
}
if (!rlFail) console.log('  ✓ no sentence anywhere is longer than 22 words');

/* ── 7. glossary covers the jargon ────────────────────────── */
console.log('\nglossary');
const TERMS = ['SIP','NAV','ULIP','endowment','term insurance','mutual fund','KYC','demat',
               'nominee','EMI','F&O','LTCG','expense ratio','direct plan','index fund',
               'compounding','inflation','PPF','EPF','NPS','SCSS','FD','equity','debt'];
const glossedBlob = GLOSSARY.map(g => String(g.term)).join(' | ').toLowerCase();
const glossed = { has: (t) => glossedBlob.includes(t) };
const corpus = [...SQUARES.map(s=>[s.title,s.lesson,s.deep].join(' ')),
                ...[...SNAKES,...LADDERS].map(x=>ALL_TEXT_FIELDS(x).map(([,v])=>v).join(' '))].join(' ').toLowerCase();
const missing = TERMS.filter(t => corpus.includes(t.toLowerCase()) && !glossed.has(t.toLowerCase().split(' ')[0]));
if (missing.length) soft(`used but not in the glossary: ${missing.join(', ')}`);
else console.log('  ✓ every financial term used is defined in the glossary');
const noHinglish = GLOSSARY.filter(g => !g.hinglish);
if (noHinglish.length) soft(`${noHinglish.length} glossary entries have no Hinglish word people actually say`);

console.log('\n' + (fail ? `${fail} LINT FAILURE(S), ${warn} warning(s)` : `content lint passes — ${warn} warning(s)`));
process.exit(fail ? 1 : 0);
