/* V1 acceptance suite. Run: node run-tests.js
 *
 * Tests the SAME search code index.html runs — the engine is sliced out of the page, so
 * the suite cannot drift from what users actually get.
 *
 * Expectations were rewritten on 16 Sep after the full backfill. Several were originally
 * written against the 20-asset set and were simply wrong at 379: "funny classroom moments"
 * should return "Hiral laughing at table", not the applause photo that happened to be the
 * only candidate in a set of 20.
 */
const fs=require('fs'); global.window={};
eval(fs.readFileSync('taxonomy.js','utf8'));
eval(fs.readFileSync('v1-catalogue.js','utf8'));
const html=fs.readFileSync('index.html','utf8');
const js=html.split('<script>').pop().split('</script>')[0];
eval(js.slice(js.indexOf('const T=window.IFM_TAXONOMY'),
                js.indexOf('/* --------------------------------------------------------------- rendering')));

const lib=window.IFM_V1.filter(r=>r.library!==false);
console.log(`library: ${lib.length} assets (${window.IFM_V1.length} catalogued, ${window.IFM_V1.length-lib.length} excluded)\n`);

// null = expect no results; that is a real requirement, not an absence of one.
const TESTS=[
 ['find me a video of Hiral talking about gold', ['IFM-101','IFM-100','IFM-099']],
 ['funny classroom moments',                     ['IFM-066','IFM-117','IFM-339','IFM-357']],
 ['show me student testimonials',                ['IFM-268']],
 ['find the clip where Hiral explains SIP',      ['IFM-286','IFM-018','IFM-315']],
 ['find gold b-roll',                            null],   // no B-roll is tagged Gold
 ['find content about financial independence',   ['IFM-260','IFM-024']],
 ['certificates from the August batch',          ['IFM-288','IFM-293','IFM-363','IFM-365','IFM-370']],
 ['insurance',                                   ['IFM-179','IFM-180','IFM-181']],
 ['Hiral portrait for an agency',                ['IFM-067','IFM-068','IFM-069','IFM-319']],
 ['compounding',                                 ['IFM-009','IFM-018','IFM-286','IFM-R07','IFM-R11']],
 ['savings vs investing',                        ['IFM-020']],
 ['classroom moment from the teens workshop',    ['IFM-279','IFM-288','IFM-291','IFM-293']],
 ['testimonial video',                           null],   // none exist: every testimonial is an image or carousel
 ['wide shot of the room',                       ['IFM-291','IFM-318']],
];
let pass=0;
for(const [q,exp] of TESTS){
  const r=search(q), ids=r.slice(0,5).map(x=>x.a.id);
  const ok = exp===null ? r.length===0 : exp.some(e=>ids.slice(0,3).includes(e));
  if(ok)pass++;
  console.log(`${ok?'PASS':'FAIL'}  "${q}"`);
  console.log(`      ${r.length} hits${r.length?`  |  ${ids.join(' ')}`:''}`);
  if(r.length) console.log(`      #1 ${r[0].a.title.slice(0,66)}`);
}
console.log(`\n${'='.repeat(62)}\n${pass}/${TESTS.length} passed`);

/* KNOWN GAP, not a bug in the search:
 * "the video where Hiral talks about XIRR" cannot work yet. NO asset's text contains
 * 'xirr' or 'cagr' — zero of 379. In the 20-asset set it worked only because the terms
 * were written by hand. The rules-based backfill cannot invent finance vocabulary that
 * is spoken aloud but never written down; that needs the AI/transcript pass. Concept
 * queries do work today: "absolute rate of return" returns IFM-161. */
