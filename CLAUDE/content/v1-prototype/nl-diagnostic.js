/* Natural-language retrieval diagnostic.
 *
 *   node nl-diagnostic.js          # summary
 *   node nl-diagnostic.js --full   # every query with its top results and signals
 *
 * WHAT THIS IS FOR
 *   run-tests.js proves the engine still does what it did yesterday. It does NOT prove the
 *   engine understands a person. These twelve queries are written the way Aakara actually
 *   speaks — "that video where Hiral was talking about gold" — and are deliberately NOT
 *   rewritten into taxonomy language. That rewriting is the thing under test.
 *
 *   This is a DIAGNOSTIC, not a regression suite. It does not replace run-tests.js and it
 *   does not gate anything. Its job is to tell us where retrieval breaks and, crucially,
 *   WHICH KIND of break it is, so we fix a cause rather than sprinkle tags.
 *
 * `want` is the honest answer, established by reading the catalogue by hand — not by
 * running the engine and blessing whatever came out. A test whose expectation is copied
 * from the system under test proves nothing.
 */
const fs = require('fs');
const path = require('path');
global.window = {};
const DIR = __dirname;
eval(fs.readFileSync(path.join(DIR, 'taxonomy.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'v1-catalogue.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'media-map.js'), 'utf8'));

// Pull the frozen engine straight out of the page so this can never drift from shipped code.
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const js = html.split('<script>').pop().split('</script>')[0];
const END = ['/* ======================================================================= UI ==',
             '/* --------------------------------------------------------------- rendering']
            .map(m => js.indexOf(m)).filter(i => i > 0).sort((a, b) => a - b)[0];
eval(js.slice(js.indexOf('const T=window.IFM_TAXONOMY'), END));

const CAT = {};
window.IFM_V1.forEach(r => { CAT[r.id] = r; });
const MEDIA = window.IFM_MEDIA;

/* Failure taxonomy, per the brief. Naming the KIND of failure is the whole point —
   "it didn't work" leads to random tagging; "the asset is understood but ranked 14th"
   leads to a one-line ranking fix. */
const KIND = {
  A: 'query understanding — the system misread what she meant',
  B: 'taxonomy coverage — no concept exists for this',
  C: 'content understanding — the asset itself is not described well enough',
  D: 'ranking — the right asset is understood but sits too low',
  E: 'media availability — record exists, the actual file does not',
  F: 'genuine no-result — we do not own this content',
};

/* Twelve queries in Aakara's words. `want` lists ids that would genuinely satisfy her;
   a hit anywhere in the top 3 counts, because she scans, she does not read one line. */
const QUERIES = [
  { q: 'Find me that video where Hiral was talking about gold',
    want: ['IFM-101'], note: 'the SGB/gold-funds clip is the only real answer' },
  { q: 'Do we have any funny photos from the teens batch?',
    want: ['IFM-279'], note: 'teens session + something actually funny; 279 is the fist-pump celebration' },
  { q: 'I need something for an Instagram post about women and money',
    want: ['IFM-023', 'IFM-024', 'IFM-207', 'IFM-346'], note: 'Women & Money, ideally Ready to post' },
  { q: 'Find the classroom video where Hiral explains SIP',
    want: ['IFM-286', 'IFM-289', 'IFM-292'], note: 'teens compounding/SIP teaching clips' },
  { q: 'Do we have a good picture of Hiral from Goa?',
    want: ['IFM-251', 'IFM-252', 'IFM-253', 'IFM-254', 'IFM-255'], note: 'Goa session, Hiral visible' },
  { q: 'There was a reel about central banks',
    want: ['IFM-216'], note: '"why central banks own so much gold"' },
  { q: 'Show me some student testimonials',
    want: ['IFM-268'], note: 'the only real testimonial asset in the library' },
  { q: 'I need certificate photos from August',
    want: ['IFM-288', 'IFM-293', 'IFM-363', 'IFM-365'], note: 'certificate format, Aug 2026 sessions' },
  { q: 'Find some good gold visuals',
    want: ['IFM-099', 'IFM-100', 'IFM-101', 'IFM-216', 'IFM-327'], note: 'gold as an asset class' },
  { q: 'I need a video where Hiral talks about investing',
    want: ['IFM-058', 'IFM-286', 'IFM-155', 'IFM-161'], note: 'Hiral speaking, investing, playable' },
  { q: 'Find that picture of everyone laughing in class',
    want: ['IFM-117', 'IFM-066', 'IFM-357'], note: 'candid laughter in a session' },
  { q: 'Do we have anything about financial independence?',
    want: ['IFM-260'], note: 'Independence Day / build your freedom reel' },
];

function signals(a) {
  const m = MEDIA[a.id] || {};
  return [a.type, a.format, (a.topic || []).join('+') || '-', (a.person || []).join('+') || '-',
          a.session || '-', m.kind + (m.kind === 'video' ? (m.playable ? '/playable' : '/NO FILE') : '')]
         .join(' | ');
}

const full = process.argv.includes('--full');
let hit = 0;
const report = [];

QUERIES.forEach((t, i) => {
  const res = search(t.q);
  const top = res.slice(0, 3).map(x => x.a.id);
  const ids = res.map(x => x.a.id);
  const ok = t.want.some(w => top.includes(w));
  if (ok) hit++;

  // Where did the wanted assets actually land? That single number separates a ranking
  // problem (found, but 14th) from an understanding problem (not returned at all).
  const places = t.want.map(w => ({ id: w, rank: ids.indexOf(w) + 0 }));
  const best = places.filter(p => p.rank >= 0).sort((a, b) => a.rank - b.rank)[0];

  let kind = null;
  if (!ok) {
    if (!best) kind = 'A/C';                 // never returned at all
    else if (best.rank < 12) kind = 'D';     // returned, just not high enough
    else kind = 'A';                         // returned far down: query was misread
    const wantedMedia = t.want.map(w => MEDIA[w]).filter(Boolean);
    if (wantedMedia.length && wantedMedia.every(m => m.kind === 'video' && !m.playable)) kind = 'E';
  }

  report.push({ n: i + 1, q: t.q, ok, count: res.length, top, best, kind, note: t.note });

  if (full) {
    console.log(`\n${'='.repeat(78)}\n${i + 1}. "${t.q}"`);
    console.log(`   hoped for: ${t.want.join(', ')}   (${t.note})`);
    console.log(`   returned : ${res.length}`);
    res.slice(0, 5).forEach((x, n) => {
      const star = t.want.includes(x.a.id) ? ' <<<' : '';
      console.log(`   ${n + 1}. ${x.a.id}  ${x.a.title.slice(0, 44).padEnd(44)} ${signals(x.a)}${star}`);
    });
    if (!ok) console.log(`   MISS — best wanted asset ${best ? `${best.id} at rank ${best.rank + 1}` : 'NOT RETURNED'}`);
  }
});

console.log(`\n${'='.repeat(78)}`);
console.log(`NATURAL-LANGUAGE RETRIEVAL: ${hit}/${QUERIES.length} found a good asset in the top 3\n`);
report.filter(r => !r.ok).forEach(r => {
  console.log(`  MISS ${r.n}. "${r.q}"`);
  console.log(`       ${r.best ? `wanted asset ranked #${r.best.rank + 1} of ${r.count}` : `wanted asset not returned at all (${r.count} results)`}`);
  console.log(`       got: ${r.top.join(', ')}`);
  console.log(`       kind ${r.kind}: ${KIND[r.kind] || KIND[(r.kind || '').split('/')[0]] || 'needs a human call'}\n`);
});
