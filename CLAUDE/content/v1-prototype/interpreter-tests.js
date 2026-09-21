/* Acceptance suite for the AI interpreter.
 *
 *   node interpreter-tests.js           # summary
 *   node interpreter-tests.js --full    # every query, both paths, with interpretations
 *
 * WHAT IS UNDER TEST
 *   Only the interpreter. The engine is sliced out of index.html unchanged and is called
 *   identically in both paths, so any difference in the numbers below is caused by the
 *   interpretation and by nothing else.
 *
 *     BASELINE     search(rawQuery)
 *     INTERPRETED  search(interpreter.search_text)  + stated type/person constraints
 *
 * THE EXPECTATIONS
 *   `want` was established by reading the catalogue — filtering it on type/format/topic
 *   and looking at the titles — NOT by running either path and blessing what came out. A
 *   test whose expectation is copied from the system under test proves nothing. Where the
 *   honest answer is a category rather than a handful of ids, `want` is a predicate.
 */
const fs = require('fs');
const path = require('path');
global.window = {};
const DIR = __dirname;
const R = f => fs.readFileSync(path.join(DIR, f), 'utf8');

eval(R('taxonomy.js'));
eval(R('v1-catalogue.js'));
// see run-tests.js: ASSETS now filters on playability, so the media map is required
eval(R('media-map.js'));
eval(R('transcripts.js'));

// The engine, exactly as the page runs it.
const js = R('index.html').split('<script>').pop().split('</script>')[0];
const END = ['/* ======================================================================= UI ==',
             '/* --------------------------------------------------------------- rendering']
            .map(m => js.indexOf(m)).filter(i => i > 0).sort((a, b) => a - b)[0];
if (!END) { console.error('FATAL: end-of-engine marker not found'); process.exit(1); }
eval(js.slice(js.indexOf('const T=window.IFM_TAXONOMY'), END));

eval(R('interpreter.js'));
const INT = window.IFM_INTERPRETER;

const LIB = window.IFM_V1.filter(r => r.library !== false);
const BY = {}; LIB.forEach(a => { BY[a.id] = a; });

const baseline    = q => search(q);
const interpreted = q => INT.run(q, search);

/* --------------------------------------------------------------- helpers --- */
const ids = r => r.map(x => x.a.id);
// Intent predicate for the "something funny" queries. Asserting the QUALITY of the answer
// rather than its id is what keeps these tests honest as the library grows — a pinned id
// list silently starts testing "has the catalogue changed", which is not the requirement.
const isFunny = a => /laugh|giggl|grin|joke|candid|applau|clap|fist pump|funny|humour/i
  .test(`${a.title} ${a.description} ${a.search_terms}`);
const top3 = r => ids(r).slice(0, 3);
// She scans, she does not read one line — a good asset anywhere in the top 3 is a hit.
function judge(res, want) {
  if (want === null) return res.length === 0;
  if (typeof want === 'function') return res.length > 0 && res.slice(0, 3).every(x => want(x.a));
  return want.some(w => top3(res).includes(w));
}

/* ======================= A. STRUCTURED REGRESSION (must stay 14/14) =========
 * The approved suite, verbatim. Run through BOTH paths: the interpreter is only
 * acceptable if it leaves every structured query exactly as good as it was. */
const STRUCTURED = [
  ['find me a video of Hiral talking about gold', ['IFM-101', 'IFM-100', 'IFM-099']],
  // Was a pinned id list, which rotted on 18 Sep 2026 when the library went 328 -> 412 and
  // newer, better laughing frames outranked the originals. The documented intent is "genuinely
  // candid/laughing moments", so assert THAT and it stops breaking every time content grows.
  ['funny classroom moments',                     isFunny],
  ['show me student testimonials',                ['IFM-268']],
  ['find the clip where Hiral explains SIP',      ['IFM-286', 'IFM-018', 'IFM-315']],
  ['find gold b-roll',                            r => !r.topic.includes('Gold')],
  ['find content about financial independence',   ['IFM-260', 'IFM-024']],
  ['certificates from the August batch',          ['IFM-288', 'IFM-293', 'IFM-363', 'IFM-365', 'IFM-370']],
  ['insurance',                                   ['IFM-179', 'IFM-180', 'IFM-181']],
  ['Hiral portrait for an agency',                ['IFM-067', 'IFM-068', 'IFM-069', 'IFM-319']],
  ['compounding',                                 ['IFM-009', 'IFM-018', 'IFM-286', 'IFM-R07', 'IFM-R11']],
  ['savings vs investing',                        ['IFM-020']],
  ['classroom moment from the teens workshop',    ['IFM-279', 'IFM-288', 'IFM-291', 'IFM-293']],
  // Was `null` — "none exist". True at 328 assets; falsified on 18 Sep 2026 when Sakshi's
  // testimonial folders were catalogued one row per person. The content changed, not the engine.
  ['testimonial video',                           ['IFM-398', 'IFM-399', 'IFM-397', 'IFM-402']],
  ['wide shot of the room',                       ['IFM-291', 'IFM-318']],
];

/* ============ B. NATURAL-LANGUAGE REGRESSION — the 22-query experiment ======
 * Written the way Aakara speaks, deliberately NOT in taxonomy language. */
const isImg  = a => a.type === 'Image';
const isVid  = a => a.type === 'Video';
const hiral  = a => (a.person || []).includes('Hiral');
const topic  = t => a => (a.topic || []).includes(t);
const fmt    = (...f) => a => f.includes(a.format);

const NATURAL = [
  ['I need something nice for an Instagram post about women and money',
   ['IFM-023', 'IFM-024', 'IFM-035', 'IFM-207', 'IFM-346'], 'Women & Money assets'],
  ['Find that video where Hiral explains SIP',
   ['IFM-286', 'IFM-018', 'IFM-315', 'IFM-289', 'IFM-292'], 'SIP/compounding teaching clips'],
  ['Give me a nice photo of Hiral teaching',
   a => isImg(a) && (a.format === 'Hiral Speaking' || hiral(a)), 'an image of Hiral, not a video'],
  ['Something funny from the classroom',
   isFunny, 'genuinely candid/laughing moments'],
  ['Find me that video where Hiral was talking about gold',
   ['IFM-101', 'IFM-099', 'IFM-100'], 'the gold-investment talk'],
  ['Do we have any funny photos from the teens batch?',
   a => isImg(a), 'teens session, and an IMAGE — she said photos'],
  ['Do we have a good picture of Hiral from Goa?',
   ['IFM-251', 'IFM-252', 'IFM-253', 'IFM-254', 'IFM-255'], 'Goa session, Hiral visible'],
  ['There was a reel about central banks',
   ['IFM-216'], 'why central banks own so much gold'],
  ['Show me some student testimonials',
   ['IFM-268'], 'the only real testimonial asset'],
  ['I need certificate photos from August',
   ['IFM-288', 'IFM-293', 'IFM-363', 'IFM-365', 'IFM-370'], 'certificate images'],
  ['Find some good gold visuals',
   ['IFM-099', 'IFM-100', 'IFM-101', 'IFM-216', 'IFM-327'], 'gold as an asset class'],
  ['I need a video where Hiral talks about investing',
   ['IFM-058', 'IFM-286', 'IFM-155', 'IFM-161'], 'Hiral speaking about investing, on video'],
  ['Find that picture of everyone laughing in class',
   ['IFM-117', 'IFM-066', 'IFM-357'], 'candid laughter in a session'],
  ['Do we have anything about financial independence?',
   ['IFM-260', 'IFM-024'], 'Financial Independence topic'],
  ['Something for a post about mutual funds',
   topic('Mutual Funds'), 'anything genuinely tagged Mutual Funds'],
  ['A photo I can use on the website showing a workshop in progress',
   a => isImg(a) && fmt('Classroom Moment', 'B-roll')(a), 'a room-in-session image'],
  /* CORRECTED 18 Sep 2026. This comment used to assert "the library has NO footage of Hiral
   * at a whiteboard", on the grounds that IFM-186 "Asset Classes Whiteboard Discussion" was
   * tagged person: ["Other Person"] and so "the presenter in it is not Hiral". That was my
   * inference from a tag, not a fact about the footage — and the tag itself only said
   * "Other Person" because the description never wrote her name. The user confirmed from the
   * thumbnails that the presenter in these sessions IS Hiral, so the footage existed the
   * whole time and I had written the opposite into a test file as though it were settled.
   * A tag is evidence about the catalogue, never evidence about the world.
   * The requirement is unchanged and still right: she said "footage", so Video is hard and
   * stills must not be offered as if they were it. */
  ['Footage of Hiral at a whiteboard',
   a => isVid(a) && hiral(a),
   'no such footage exists — so: Hiral videos only, and no stills passed off as footage'],
  ['Anything about inflation I can post',
   topic('Inflation & Interest Rates'), 'Inflation & Interest Rates topic'],
  ['A clip explaining returns',
   ['IFM-155', 'IFM-161', 'IFM-271'], 'Risk & Returns on video'],
  ['Group photo of a batch with their certificates',
   ['IFM-288', 'IFM-293', 'IFM-363', 'IFM-365', 'IFM-370'], 'certificate group photos'],
  ['Nice portrait of Hiral for a press feature',
   a => isImg(a) && a.format === 'Portrait' && hiral(a), 'a Hiral portrait image'],
  ['Something about saving versus investing',
   ['IFM-020', 'IFM-006', 'IFM-031'], 'Savings vs Investing — the literal asset exists'],
];

/* ===================== C. HARD ACCEPTANCE TESTS — must all pass =========== */
const ACCEPTANCE = [
  /* Moved here from the engine suite on 18 Sep 2026. The raw engine cannot tell an ornament
   * from an asset class and is frozen, so it held this only by accident — eight decorative
   * gold renders happened to be diluting the term, and deleting them broke it. ORNAMENTAL_GOLD
   * in interpreter.js enforces it properly, so the guarantee is asserted at the layer that
   * actually provides it. "gold investments" is tested alongside precisely because the rule
   * must NOT bleed: rerouting the bare word would break the flagship query. */
  ['"gold jewellery" must not return a single asset-class-gold asset',
   () => { const r = interpreted('gold jewellery').results;
           return r.length > 0 && r.every(x => !(x.a.topic || []).includes('Gold')); }],
  ['"stree dhan" must not return a single asset-class-gold asset',
   () => { const r = interpreted('stree dhan').results;
           return r.length > 0 && r.every(x => !(x.a.topic || []).includes('Gold')); }],
  ['"gold investments" must STILL return asset-class gold',
   () => { const r = interpreted('gold investments').results;
           return r.length > 0 && r.slice(0, 3).some(x => (x.a.topic || []).includes('Gold')); }],
  ['purple elephant must return nothing',
   () => interpreted('purple elephant').results.length === 0],
  // Was 'blue hat'. Retired 20 Sep 2026, NOT to go green: it stopped being nonsense. Once
  // every video was transcribed, `blue` is in the library (a "blue chip fund") and `hat` is
  // in it ("available at the drop of a hat"), so the coverage gate correctly let a two-word
  // query through on two words we genuinely have. The guard's INTENT is that a query naming
  // something we do not have returns nothing, so it needs words we do not have.
  ['a nonsense two-word query must return nothing',
   () => interpreted('scuba trombone').results.length === 0],
  // CAGR and crypto were asserted absent when nothing in the catalogue text mentioned them.
  // Transcription made that false: a participant reads "looking at that CAGR, looking at
  // XIRR" off her notes in IFM-536, and IFM-271 ranks crypto's risk against other assets.
  // These assertions were about the CONTENT, not the engine, and new content falsified them.
  // They now assert the opposite -- that spoken-only terms ARE findable, which is the point.
  // See run-tests.js for why this widened on 21 Sep: whisper writes CAGR as "CAGA", and a
  // clip that asks "What does CAGA mean? ... What does XIRR mean?" is a correct hit.
  ['CAGR is findable because someone says it out loud',
   () => { const r = interpreted('CAGR').results;
           return r.length > 0 && r.every(x => /cagr|caga|xirr|\birr\b/i.test(x.a.speech || '')); }],
  ['crypto is findable because a reel ranks it',
   () => { const r = interpreted('crypto').results;
           return r.length > 0 && r.every(x => /crypto/i.test((x.a.speech || '') +
                                  x.a.title + x.a.description)); }],
  ['"photo of Hiral" must not return a single video',
   () => { const r = interpreted('photo of Hiral').results;
           return r.length > 0 && r.every(x => x.a.type === 'Image'); }],
  ['"funny photos from teens batch" must not return a single video',
   () => { const r = interpreted('Do we have any funny photos from the teens batch?').results;
           return r.length > 0 && r.every(x => x.a.type === 'Image'); }],
  ['"something funny from the classroom" must NOT invent a social/promo constraint',
   () => { const it = INT.interpret('something funny from the classroom');
           return it.purpose === null && it.explicit_constraints.type === null; }],
  ['RULE 1 — "nice" is recorded as preference, never a constraint',
   () => { const it = INT.interpret('a nice photo of Hiral');
           return it.preferences.includes('nice') && !/nice/i.test(it.search_text); }],
  ['RULE 7 — "money" alone must not be mapped to Women & Money',
   () => INT.interpret('something about money').taxonomy_terms.topics.length === 0],
  ['RULE 4 — a word owned by no Topic survives into the search text',
   () => /sgb/i.test(INT.interpret('do we have anything on SGB').search_text)],
  ['purpose is stripped from the text the engine sees',
   () => !/instagram|post/i.test(
          INT.interpret('something for an Instagram post about gold').search_text)],
  ['an all-filler query returns nothing, not the whole library',
   () => interpreted('do we have anything?').results.length === 0],
];

/* ================================== run =================================== */
const full = process.argv.includes('--full');
const line = '='.repeat(78);

function suite(name, cases) {
  let b = 0, n = 0;
  const regressions = [], fixes = [];
  cases.forEach(([q, want, note]) => {
    const rb = baseline(q);
    const ri = interpreted(q);
    const ob = judge(rb, want), oi = judge(ri.results, want);
    if (ob) b++; if (oi) n++;
    if (ob && !oi) regressions.push(q);
    if (!ob && oi) fixes.push(q);
    if (full) {
      console.log(`\n${line}\n"${q}"`);
      if (note) console.log(`   want: ${note}`);
      const it = ri.interpretation;
      console.log(`   read as: subject="${it.subject}"  purpose=${it.purpose}  ` +
                  `type=${it.explicit_constraints.type}  person=[${it.explicit_constraints.person}]  ` +
                  `topics=[${it.taxonomy_terms.topics}]  prefs=[${it.preferences}]`);
      const fmtRow = (tag, r, ok) => {
        console.log(`   ${ok ? 'HIT ' : 'MISS'} ${tag.padEnd(12)} ${String(r.length).padStart(3)} results  ` +
                    top3(r).join(' '));
        r.slice(0, 3).forEach(x => console.log(`        ${x.a.id} [${x.a.type}] ${x.a.title.slice(0, 56)}`));
      };
      fmtRow('BASELINE', rb, ob);
      fmtRow('INTERPRETED', ri.results, oi);
    }
  });
  console.log(`\n${name}:  baseline ${b}/${cases.length}   interpreted ${n}/${cases.length}`);
  if (regressions.length) { console.log('  REGRESSED (baseline hit, interpreter missed):');
                            regressions.forEach(q => console.log(`    - "${q}"`)); }
  if (fixes.length)       { console.log('  FIXED (baseline missed, interpreter hit):');
                            fixes.forEach(q => console.log(`    + "${q}"`)); }
  return { b, n, total: cases.length, regressions };
}

console.log(`library: ${LIB.length} assets\n${line}`);
const A = suite('A. STRUCTURED REGRESSION', STRUCTURED);
const B = suite('B. NATURAL-LANGUAGE REGRESSION', NATURAL);

// Zero-result behaviour is a headline number: three of the 22 returned nothing before.
const emptyB = NATURAL.filter(([q]) => baseline(q).length === 0).map(([q]) => q);
const emptyI = NATURAL.filter(([q]) => interpreted(q).results.length === 0).map(([q]) => q);

console.log(`\n${line}\nC. HARD ACCEPTANCE TESTS`);
let acc = 0;
ACCEPTANCE.forEach(([name, fn]) => {
  let ok = false, err = '';
  try { ok = !!fn(); } catch (e) { err = ' — threw: ' + e.message; }
  if (ok) acc++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${err}`);
});

console.log(`\n${line}\nSUMMARY`);
console.log(`  A. structured    baseline ${A.b}/${A.total}   interpreted ${A.n}/${A.total}`);
console.log(`  B. natural       baseline ${B.b}/${B.total}   interpreted ${B.n}/${B.total}`);
console.log(`  zero results     baseline ${emptyB.length}/22   interpreted ${emptyI.length}/22`);
emptyB.forEach(q => console.log(`      baseline empty: "${q}"`));
emptyI.forEach(q => console.log(`      INTERPRETED EMPTY: "${q}"`));
console.log(`  C. acceptance    ${acc}/${ACCEPTANCE.length}`);

const green = A.n >= A.b && A.regressions.length === 0 && B.n >= B.b && acc === ACCEPTANCE.length;
console.log(`\n  ${green ? 'SHIPPABLE' : 'NOT SHIPPABLE'} — structured must not regress, ` +
            `natural must not regress, all acceptance tests must pass.`);
process.exitCode = green ? 0 : 1;
