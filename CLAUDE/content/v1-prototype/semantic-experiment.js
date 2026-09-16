/* SEMANTIC RETRIEVAL EXPERIMENT — scratch only.
 *
 *   node semantic-experiment.js          # side-by-side comparison
 *   node semantic-experiment.js --why    # + why each semantic result was chosen
 *
 * NOT wired to the app. NOT deployed. The shipped engine is imported read-only so the two
 * can be compared on identical data.
 *
 * ---------------------------------------------------------------------------------
 * WHY THE CURRENT ENGINE CANNOT BE TUNED INTO THIS
 *
 * "I need something nice for an Instagram post about women and money" returns
 * "Instagram story composer screenshot — certificate photos". Every keyword engine will
 * do that, because it treats all query words as evidence ABOUT THE ASSET. But those
 * words are doing three different jobs:
 *
 *     women, money          <- SUBJECT. What the asset must be about.
 *     Instagram post        <- PURPOSE. What she will DO with it. Says nothing about
 *                              content; says a lot about whether the asset is usable.
 *     something nice        <- PREFERENCE. Quality, not subject.
 *
 * Matching "Instagram" against asset text is a category error: it is the one word in
 * that sentence that should never be matched against content at all. A screenshot of the
 * Instagram composer is the single worst answer, and keyword scoring ranks it first.
 *
 * So this experiment separates the roles before scoring, and lets PURPOSE act on
 * usability (is it finished? is it publishable? does it have a usable still?) rather than
 * on text.
 *
 * ---------------------------------------------------------------------------------
 * ARCHITECTURE BEING TESTED — the three layers from the brief
 *
 *   LAYER 1  the human sentence
 *   LAYER 2  interpretation into {subject, purpose, person, type, mood, constraints}
 *            In production this is one LLM call. Here the interpretations are written
 *            out longhand so the retrieval maths can be judged on its own merits.
 *   LAYER 3  retrieval + ranking over ALL evidence
 *
 * Interpretations were written from the SENTENCES ALONE, before running anything. No
 * expected asset ids were used to shape them — that would test nothing.
 */
const fs = require('fs');
const path = require('path');
global.window = {};
const DIR = __dirname;
eval(fs.readFileSync(path.join(DIR, 'taxonomy.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'v1-catalogue.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'media-map.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'transcripts.js'), 'utf8'));

// the shipped engine, untouched, for the control column
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const js = html.split('<script>').pop().split('</script>')[0];
eval(js.slice(js.indexOf('const T=window.IFM_TAXONOMY'),
               js.indexOf('/* ======================================================================= UI ==')));

const LIB = window.IFM_V1.filter(r => r.library !== false);
const TX = window.IFM_TRANSCRIPTS || {};
const MEDIA = window.IFM_MEDIA || {};

/* ============================ LAYER 2 — interpretation ============================
 * subject       : controlled Topics the request is about (may be empty)
 * subjectWords  : free text that should be looked for in ANY evidence
 * purpose       : what she'll do with it — drives usability, never text matching
 * person/type/format/session/mood : constraints and preferences
 * Anything absent is simply not a signal. Nothing here names an asset id.
 */
const Q = [
 { q:'I need something nice for an Instagram post about women and money',
   subject:['Women & Money'], subjectWords:['women','money'], purpose:'social', mood:['polished'] },
 { q:'Find that video where Hiral explains SIP',
   subjectWords:['sip','systematic','monthly','compounding'], person:'Hiral', type:'Video', purpose:'clip' },
 { q:'Give me a nice photo of Hiral teaching',
   person:'Hiral', type:'Image', format:['Hiral Speaking'], purpose:'social', mood:['polished'] },
 { q:'Something funny from the classroom',
   format:['Classroom Moment'], mood:['funny'] },            // no purpose stated
 { q:'Find me that video where Hiral was talking about gold',
   subject:['Gold'], subjectWords:['gold'], person:'Hiral', type:'Video', purpose:'clip' },
 { q:'Do we have any funny photos from the teens batch?',
   type:'Image', mood:['funny'], sessionWords:['teens'] },
 { q:'Do we have a good picture of Hiral from Goa?',
   person:'Hiral', type:'Image', sessionWords:['goa'], mood:['polished'] },
 { q:'There was a reel about central banks',
   subjectWords:['central bank','rbi','reserve'], type:'Video', purpose:'clip' },
 { q:'Show me some student testimonials',
   format:['Testimonial'], subjectWords:['testimonial','review'], purpose:'social' },
 { q:'I need certificate photos from August',
   format:['Certificate'], type:'Image', sessionWords:['aug'], purpose:'social' },
 { q:'Find some good gold visuals',
   subject:['Gold'], subjectWords:['gold'], type:'Image', mood:['polished'] },
 { q:'I need a video where Hiral talks about investing',
   subject:['Investing'], subjectWords:['investing','investment'], person:'Hiral', type:'Video', purpose:'clip' },
 { q:'Find that picture of everyone laughing in class',
   type:'Image', mood:['funny'], format:['Classroom Moment'] },
 { q:'Do we have anything about financial independence?',
   subject:['Financial Independence'], subjectWords:['independence','freedom'] },
 { q:'Something for a post about mutual funds',
   subject:['Mutual Funds'], subjectWords:['mutual fund'], purpose:'social' },
 { q:'A photo I can use on the website showing a workshop in progress',
   type:'Image', format:['Classroom Moment','B-roll'], purpose:'web', mood:['polished'] },
 { q:'Footage of Hiral at a whiteboard',
   person:'Hiral', subjectWords:['whiteboard','diagram','mind-map'], purpose:'clip' },
 { q:'Anything about inflation I can post',
   subject:['Inflation & Interest Rates'], subjectWords:['inflation','prices'], purpose:'social' },
 { q:'A clip explaining returns',
   subject:['Risk & Returns'], subjectWords:['return','returns','rate of return'], type:'Video', purpose:'clip' },
 { q:'Group photo of a batch with their certificates',
   format:['Certificate'], subjectWords:['group','certificate'], type:'Image', purpose:'social' },
 { q:'Nice portrait of Hiral for a press feature',
   person:'Hiral', format:['Portrait'], type:'Image', purpose:'press', mood:['polished'] },
 { q:'Something about saving versus investing',
   subject:['Saving vs Investing','Saving'], subjectWords:['saving','savings','invest'], purpose:'social' },
];

/* ============================ LAYER 3 — retrieval ============================ */
const norm = s => (s || '').toLowerCase();
const evidence = a => [a.title, a.description, a.search_terms, a.slide_text, TX[a.id] || '',
                       (a.topic || []).join(' '), a.format, a.session].map(norm).join(' ');
const hasWord = (hay, w) => w.includes(' ')
  ? hay.includes(w)
  : new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|es|ing)?([^a-z0-9]|$)').test(hay);

const FUNNY   = /laugh|giggl|\bgrin\b|joke|fist pump/i;  // NOT celebrate/candid/smile
const POLISH  = /hero|portrait|dslr|professional|clean|posed|studio|crisp/i;

/* Purpose never matches text. It asks: is this asset USABLE for that job?
 * That is the whole fix for the Instagram case. */
function purposeFit(a, purpose) {
  const m = MEDIA[a.id] || {};
  const finished = a.status === 'Ready' || a.status === 'Published';
  const hasStill = !!a.thumb;
  switch (purpose) {
    case 'social':                       // going out on a feed: must be finished and look like something
      return (finished ? 1.0 : 0.62) * (hasStill ? 1 : 0.3);
    case 'web':
      return (hasStill ? 1 : 0.2) * (finished ? 1 : 0.6);
    case 'press':                        // an agency needs the best we own
      return (hasStill ? 1 : 0.1) * (finished ? 1 : 0.7);
    case 'clip':                         // she wants to watch it, so it must actually play
      return m.playable ? 1 : 0.35;
    default:
      return 1;
  }
}

function score(a, intent) {
  const ev = evidence(a);
  let s = 0, why = [];

  // GATE: when a subject is named, it is mandatory. Person, type and "it plays" are
  // qualifiers on the right asset — they can never substitute for being about the thing.
  // Without this gate the scorer answered "Hiral explains SIP" with any playable Hiral
  // clip, which is precisely the failure mode we are trying to leave behind.
  const wantsSubject = !!(intent.subject || intent.subjectWords);
  if (wantsSubject) {
    const topicHit = intent.subject && (a.topic || []).some(t => intent.subject.includes(t));
    const wordHit  = intent.subjectWords && intent.subjectWords.some(w => hasWord(ev, w));
    if (!topicHit && !wordHit) return { s: 0, why: [] };
  }

  // SUBJECT — the controlled topic is the strongest single signal we own.
  if (intent.subject) {
    const hit = (a.topic || []).filter(t => intent.subject.includes(t));
    if (hit.length) { s += 55 * hit.length; why.push(`topic ${hit.join('/')}`); }
  }
  // SUBJECT in any evidence, transcript included. Partial credit — she does not need
  // every word, which is exactly where the keyword engine over-constrains.
  if (intent.subjectWords) {
    const found = intent.subjectWords.filter(w => hasWord(ev, w));
    if (found.length) {
      s += 26 * Math.min(found.length, 2);   // two good hits, not a pile of weak ones
      if (TX[a.id] && intent.subjectWords.some(w => hasWord(norm(TX[a.id]), w))) {
        s += 22; why.push('said aloud in the clip');
      }
      why.push(`mentions ${found.join('/')}`);
    }
  }
  if (intent.person) {
    if ((a.person || []).includes(intent.person)) { s += 44; why.push(`${intent.person} is in it`); }
    else s -= 34;                                   // asked for her and she is not there
  }
  if (intent.type) {
    if (a.type === intent.type) { s += 18; why.push(a.type.toLowerCase()); }
    else s -= 40;                                   // asked for a photo, this is a video
  }
  if (intent.format) {
    if (intent.format.includes(a.format)) { s += 24; why.push(a.format.toLowerCase()); }
  }
  if (intent.sessionWords) {
    const sess = norm(a.session);
    if (sess && intent.sessionWords.some(w => sess.includes(w))) { s += 34; why.push(`from ${a.session}`); }
    else if (intent.sessionWords.some(w => ev.includes(w))) s += 8;
  }
  if (intent.mood) {
    if (intent.mood.includes('funny')) {
      if (FUNNY.test(ev)) { s += 34; why.push('genuinely a light moment'); } else s -= 20;
    }
    if (intent.mood.includes('polished')) {
      if (POLISH.test(ev)) { s += 14; why.push('shot well'); }
      if (a.status === 'Raw') s -= 6;
    }
  }
  const pf = purposeFit(a, intent.purpose);
  s *= pf;
  if (intent.purpose === 'clip' && (MEDIA[a.id] || {}).playable) why.push('plays');
  if (intent.purpose && ['social','web','press'].includes(intent.purpose)
      && (a.status === 'Ready' || a.status === 'Published')) why.push('ready to use');
  return { s, why };
}

function semantic(intent) {
  return LIB.map(a => ({ a, ...score(a, intent) }))
            .filter(x => x.s > 18)
            .sort((x, y) => y.s - x.s)
            .slice(0, 5);
}

/* ================================== report ================================== */
const why = process.argv.includes('--why');
let n = 0;
Q.forEach(intent => {
  n++;
  console.log(`\n${'='.repeat(92)}\n${n}. "${intent.q}"`);
  const cur = search(intent.q).slice(0, 5);
  console.log('   CURRENT SEARCH:');
  if (!cur.length) console.log('      (nothing)');
  cur.forEach((x, i) => console.log(`      ${i + 1}. ${x.a.id}  ${x.a.title.slice(0, 62)}`));
  const sem = semantic(intent);
  console.log('   SEMANTIC RETRIEVAL:');
  if (!sem.length) console.log('      (nothing)');
  sem.forEach((x, i) => {
    console.log(`      ${i + 1}. ${x.a.id}  ${x.a.title.slice(0, 62)}`);
    if (why) console.log(`           ${x.why.slice(0, 4).join(' · ')}`);
  });
});
console.log(`\n${'='.repeat(92)}\n${Q.length} queries compared.`);
