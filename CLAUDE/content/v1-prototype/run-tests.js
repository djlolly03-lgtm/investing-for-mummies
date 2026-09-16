const fs=require('fs');
global.window={};
eval(fs.readFileSync('taxonomy.js','utf8'));
eval(fs.readFileSync('tagged20.js','utf8'));
// pull the search engine out of index.html so we test the SAME code the page runs
const html=fs.readFileSync('index.html','utf8');
const js=html.split('<script>').pop().split('</script>')[0];
const engine=js.slice(js.indexOf('const T=window.IFM_TAXONOMY'), js.indexOf('/* --------------------------------------------------------------- rendering'));
eval(engine);

const TESTS=[
 ['find me a video of Hiral talking about gold', ['IFM-101']],
 ['funny classroom moments',                     ['IFM-339']],
 ['show me student testimonials',                ['IFM-268']],
 ['find the clip where Hiral explains SIP',      ['IFM-286','IFM-018']],
 ['find gold b-roll',                            ['IFM-007','IFM-009']],
 ['find content about financial independence',   []],
 ['find the video where Hiral talks about XIRR', ['IFM-009']],
 ['certificates from the August batch',          ['IFM-288']],
 ['insurance',                                   ['IFM-179']],
 ['Hiral portrait for an agency',                ['IFM-319','IFM-067']],
 ['compounding',                                 ['IFM-009','IFM-018','IFM-286']],
 ['savings vs investing',                        ['IFM-020']],
];
let pass=0;
for(const [q,expect] of TESTS){
  const r=search(q).slice(0,5);
  const ids=r.map(x=>x.a.id);
  const ok = expect.length===0 ? ids.length===0 : expect.some(e=>ids.slice(0,3).includes(e));
  if(ok)pass++;
  console.log(`\n${ok?'PASS':'FAIL'}  "${q}"`);
  console.log(`   want top-3 to include: ${expect.length?expect.join(' / '):'(nothing)'}`);
  console.log(`   got: ${ids.length?r.map(x=>`${x.a.id}(${x.score})`).join('  '):'— no results —'}`);
  if(r.length) console.log(`   #1 = ${r[0].a.title}`);
}
console.log(`\n${'='.repeat(60)}\n${pass}/${TESTS.length} passed`);
