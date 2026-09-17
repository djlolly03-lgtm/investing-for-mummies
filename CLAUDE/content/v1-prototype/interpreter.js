/* AI INTERPRETER — a translator, not a second search engine.
 *
 *   natural sentence  ->  interpret()  ->  structured query  ->  EXISTING engine  ->  results
 *
 * It rewrites the request into something the approved scorer already handles well, and
 * hands over the few constraints the user actually stated. It never ranks, never scores,
 * never touches the taxonomy, and never sees an asset.
 *
 * WHY THIS EXISTS
 *   "I need something nice for an Instagram post about women and money" returned an
 *   Instagram story-composer screenshot. Those words do three different jobs:
 *       women, money      SUBJECT     — what the asset must be about
 *       Instagram post    PURPOSE     — what she will do with it afterwards
 *       nice              PREFERENCE  — quality, not subject
 *   A keyword scorer treats all three as evidence about the asset, so the one word that
 *   should never be content-matched decided the result. The interpreter separates the
 *   roles before the scorer ever sees the query.
 *
 * ON "AI"
 *   In production this layer is one LLM call. This implementation is deterministic and
 *   runs in the browser: the brief adds no service, and a static page has no backend to
 *   call. The OUTPUT SHAPE is deliberately what an LLM would emit, so replacing the body
 *   of interpret() with a model call is a drop-in with no downstream change.
 *
 * THE RULE MOST LIKELY TO BE GOT WRONG
 *   Purpose is READ, never ASSUMED. "something funny from the classroom" has no purpose;
 *   inventing `social` for it buries the raw clips that are the actual answer. Every
 *   constraint below comes from a word that is literally present in the query.
 */
(function (root) {
'use strict';

/* Purpose: what she'll DO with it. Recognised so it can be REMOVED from the text the
 * scorer sees. Purpose is query context — never an asset field, never a match term. */
const PURPOSE = [
  [/\b(instagram|insta|ig|social media|post|posting|story|stories|reel|reels|feed)\b/i, 'social'],
  [/\b(website|site|web ?page|landing page)\b/i, 'website'],
  // `feature` earns its place here: "a portrait of Hiral for a press feature" returned
  // ZERO, because `feature` appears in no asset and the engine vetoes a query containing
  // a word the corpus has never seen. It is publication context, not subject.
  [/\b(press|journalist|publication|media ?kit|feature|featured|coverage|interview|pr)\b/i, 'press'],
  [/\b(presentation|deck|slide deck|pitch|keynote)\b/i, 'presentation'],
  [/\b(newsletter|mailer|email blast)\b/i, 'newsletter'],
];
/* Preference: soft quality language. RULE 1 — "nice" must never become status=Published
 * or quality=Hero. It is recorded and then discarded. */
const PREFERENCE = /\b(nice|good|great|best|strong|usable|decent|lovely|beautiful|proper|quality)\b/ig;

/* Conversational scaffolding. Carries no content and, worse, is rare enough in a
 * 378-asset library to dominate a rarity-weighted scorer if left in. `versus`/`vs` are
 * here for a specific reason: the engine vetoes a multi-word query containing a word that
 * appears nowhere in the corpus, and "saving versus investing" was returning ZERO because
 * of `versus` alone — while IFM-020 "Savings vs Investing" sat right there. */
const FILLER = new RegExp('\\b(' + [
  'i','we','you','do','does','did','can','could','would','should','have','has','had','get','got',
  'need','needed','want','wanted','looking','look','find','show','give','me','my','our','us',
  'there','here','that','this','these','those','is','are','was','were','be','been','am','it','its',
  'the','a','an','of','for','to','on','in','at','with','and','or','from','about','around','where',
  'which','some','any','please','anything','something','somewhere','really','just','actually',
  'maybe','still','like','use','using','make','made','put','thing','things','stuff','piece',
  'pieces','bit','item','items','one','kind','sort','type of','versus','vs','if','so','then',
  'when','while','what','who','how','all','also','again','more','most','much','bunch','few',
  'everyone','everybody','everything','someone','somebody','their','her','his','them','they'
].join('|') + ')\\b', 'ig');

/* RULE 5 — an explicitly named type is HARD. Never widened, never substituted.
 * "photo of Hiral" must not return video, however well a video scores. */
const TYPE = [
  [/\b(videos?|clips?|footage|films?|reels?|recordings?)\b/i, 'Video'],
  [/\b(photos?|pictures?|pics?|images?|stills?|shots?|snaps?|portraits?|headshots?)\b/i, 'Image'],
  [/\b(carousels?)\b/i, 'Carousel'],
];
/* RULE 6 — an explicitly NAMED person is HARD. Only Hiral qualifies: she is the one
 * individual the catalogue names. "students" and "teens" are an audience, not a person,
 * and the Person field is not populated consistently enough to filter on them — so those
 * words stay in the search text as ordinary evidence and constrain nothing. */
const PERSON = [[/\b(hiral|founder)\b/i, 'Hiral']];

/* Session is a HINT only — these words also appear in ordinary description prose. */
const SESSION_HINTS = /\b(goa|teens?|corporate|flagship|balsabha|stree ?dhan|mums?|youth|august|july|june|september)\b/ig;

/* Subject -> controlled Topic. Only mappings the words genuinely support.
 * EVERY pattern here must end on a word boundary. These are used for SUBSTITUTION, so a
 * pattern that stops mid-word (`\binvest`) strands the tail: "savings vs investing" became
 * "Saving Investing ing", and `ing` — a word in no asset — made the engine veto the whole
 * query and return nothing.
 * RULE 7 — "money" on its own must NOT become Women & Money, Wealth or Financial
 * Planning. Every entry here requires the words that actually name the concept. */
const TOPIC_MAP = [
  [/\bwomen (and|&|n) money\b|\bwomen'?s? (money|finance|finances)\b/i, 'Women & Money'],
  [/\bsavings?\b[\s\S]{0,12}\binvest(ing|ments?|ed)?\b/i, 'Saving vs Investing'],
  [/\bcompound(ing|s)?\b/i, 'Compounding'],
  [/\bgold\b/i, 'Gold'],
  [/\bsilver\b/i, 'Silver'],
  [/\bmutual funds?\b/i, 'Mutual Funds'],
  [/\betfs?\b/i, 'ETFs'],
  [/\breits?\b|\breal estate\b/i, 'Real Estate / REITs'],
  [/\binsurance\b/i, 'Insurance'],
  [/\binflation\b|\binterest rates?\b/i, 'Inflation & Interest Rates'],
  [/\bipos?\b/i, 'IPOs'],
  [/\bstock market\b/i, 'Stock Market'],
  [/\bstocks?\b|\bequity\b|\bshares?\b/i, 'Stocks / Equity'],
  [/\bfixed (income|deposits?)\b|\bbonds?\b/i, 'Fixed Income'],
  [/\bfinancial (independence|freedom)\b/i, 'Financial Independence'],
  [/\basset allocation\b/i, 'Asset Allocation'],
  [/\bdiversif\w*\b/i, 'Diversification'],
  [/\brisk\b|\breturns?\b/i, 'Risk & Returns'],
  [/\bbudget(ing|s)?\b|\bexpenses?\b|\bspending\b/i, 'Managing Money'],
  [/\bmoney mindset\b|\bmoney myths?\b/i, 'Money Mindset'],
];
/* VERNACULAR -> CORPUS VOCABULARY.
 *
 * Six people will ask for the same asset six ways, and the catalogue only speaks one. This
 * is measured, not guessed — word-boundary counts across all 378 assets:
 *
 *     people TYPE          corpus HAS
 *     enjoying   0         candid      98
 *     happy      0         warm       103
 *     excited    0         relaxed     98
 *     kids       1         student    140
 *     girls      0         women      195
 *     students   3         student    140
 *
 * The failure this fixes is not ranking, it is a veto. The engine refuses a multi-word
 * query containing a word that appears NOWHERE in the corpus — correctly, because that is
 * usually evidence we do not own the thing. But "students enjoying the session" tripped it
 * on `enjoying` alone and returned zero, while "candid classroom" returned 66 of the very
 * same assets.
 *
 * SUBSTITUTION, not addition. Adding synonyms alongside her words would inflate the
 * query's rarity mass and starve the coverage test — the same trap the canonical Topic
 * append fell into. One word in, one word out, so the token count never moves.
 *
 * Only words the corpus genuinely lacks are rewritten. `laughing` (5 assets) and
 * `smiling` (36) are left alone: they work, and they are more precise than the pool. */
const VERNACULAR = [
  [/\b(enjoy(ing|ed|s)?|happy|happiness|excited|exciting|joy(ful)?|cheerful|delighted|having fun|good vibes?)\b/ig, 'candid'],
  [/\b(giggl\w*|chuckl\w*|grinning|beaming|chuffed)\b/ig, 'laughing'],
  [/\b(kids?|children|child|girls?|boys?|learners?|pupils?)\b/ig, 'student'],
  [/\b(informal|unposed|natural|spontaneous|off.guard)\b/ig, 'candid'],
  [/\b(lively|energetic|animated|buzzing)\b/ig, 'warm'],
  [/\b(calm|quiet|focused|attentive|concentrating)\b/ig, 'relaxed'],
];

/* Format words a person would actually say. */
const FORMAT_MAP = [
  [/\btestimonials?\b|\breviews?\b/i, 'Testimonial'],
  [/\bcertificates?\b|\bgraduation\b/i, 'Certificate'],
  [/\bportraits?\b|\bheadshots?\b/i, 'Portrait'],
  [/\bb-?roll\b|\bcutaways?\b/i, 'B-roll'],
  [/\bclassrooms?\b|\bin class\b|\bworkshops?\b/i, 'Classroom Moment'],
];

function interpret(query) {
  const raw = String(query || '');
  const low = ' ' + raw.toLowerCase() + ' ';

  const purpose = (PURPOSE.find(([re]) => re.test(low)) || [])[1] || null;
  const preferences = [...new Set((raw.match(PREFERENCE) || []).map(s => s.toLowerCase()))];

  // Constraints — only where a word explicitly says so.
  const type   = (TYPE.find(([re]) => re.test(low)) || [])[1] || null;
  const person = PERSON.filter(([re]) => re.test(low)).map(([, v]) => v);
  const session_hints = [...new Set((raw.match(SESSION_HINTS) || []).map(s => s.toLowerCase()))];

  const topics  = TOPIC_MAP .filter(([re]) => re.test(low)).map(([, v]) => v);
  const formats = FORMAT_MAP.filter(([re]) => re.test(low)).map(([, v]) => v);
  const taxonomy_terms = { topics: [...new Set(topics)], formats: [...new Set(formats)] };

  /* The text the existing scorer will see.
   * Removed: purpose words, preference words, conversational filler.
   * Kept:    everything else — RULE 4. A word like "percentage" or "SGB" belongs to no
   *          Topic, and it is exactly the word the transcript index can answer. */
  let text = raw;
  PURPOSE.forEach(([re]) => { text = text.replace(new RegExp(re.source, 'ig'), ' '); });
  // Speak the catalogue's language before the engine ever sees the query.
  const translated = [];
  VERNACULAR.forEach(([re, to]) => {
    const m = text.match(new RegExp(re.source, 'ig'));
    if (m) { translated.push(m[0].toLowerCase() + ' -> ' + to); text = text.replace(new RegExp(re.source, 'ig'), to); }
  });

  /* CANONICALISE — the actual translation step, and the only use of taxonomy_terms.
   * When her words name a controlled value the engine cannot reach on its own, the
   * canonical value is ADDED so the controlled-vocabulary boost can see it: "in class"
   * gains "Classroom Moment".
   *
   * ADDED, never substituted, and only when the value contributes a word the text does
   * not already have. Substituting looked tidier and was wrong: "savings vs investing"
   * became "Saving vs Investing", which threw away her plural `savings` — the exact word
   * that matches the title of IFM-020 "Savings vs Investing". It dropped that asset from
   * #1 to #4 and broke an approved structured test. Her words are evidence; the canonical
   * value is a supplement to them, not a replacement for them. */
  const canonical = [];
  TOPIC_MAP.concat(FORMAT_MAP).forEach(([re, v]) => {
    if (!new RegExp(re.source, 'i').test(text)) return;
    const words = v.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const already = words.every(w => new RegExp('\\b' + w + '\\b', 'i').test(text));
    if (already) return;                       // the engine can already see this concept
    text += ' ' + v;
    canonical.push(v);
  });

  text = text.replace(PREFERENCE, ' ')
             .replace(FILLER, ' ')
             .replace(/[?!.,;:"'’]/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();

  const controlledWords = new Set();
  taxonomy_terms.topics.concat(taxonomy_terms.formats).forEach(v =>
    v.toLowerCase().split(/[^a-z0-9]+/).forEach(w => w && controlledWords.add(w)));
  const free_search_terms = text.toLowerCase().split(/\s+/)
    .filter(w => w.length > 2 && !controlledWords.has(w));

  // Specific = she has one particular asset in mind. General = she wants a category.
  const specificity = /\bthat\b|\bthe (video|photo|picture|clip|one|reel)\b|\bwhere (hiral|she)\b/i.test(raw)
    ? 'specific' : 'general';

  return {
    query: raw,
    subject: text || null,          // what she is asking ABOUT, scaffolding removed
    taxonomy_terms,                 // controlled values her words genuinely name
    explicit_constraints: { type, person, session_hints },
    purpose,                        // context only — never matched against an asset
    preferences,                    // soft; never a filter
    free_search_terms,              // words that belong to no controlled value
    translated,                     // vernacular rewritten into corpus vocabulary
    specificity,
    search_text: text,              // what the EXISTING engine receives, verbatim
  };
}

/* Run an interpretation through the untouched engine.
 * `engine` is the approved search(); it is called once, with a cleaner query. */
function run(query, engine) {
  const it = interpret(query);

  /* Nothing contentful survived. Two very different cases reach here and they must not
   * share an answer.
   *
   * "reel" is the one that caught me. It is a purpose word, so it is stripped — but it is
   * ALSO a type word, so the interpretation still carries type=Video. Searching for "reel"
   * returned NOTHING while meaning "show me the videos", which is about as wrong as a
   * library gets. When a constraint survives, honour it: the request was understood, it
   * just had no free text in it.
   *
   * "do we have anything?" or a bare "instagram" leaves no constraint either. There the
   * honest answer really is nothing — she has described a destination, not content, and
   * handing the engine an empty string makes it return all 345 assets, which is the worst
   * possible response and breaks the must-return-nothing guarantees. */
  if (!it.search_text) {
    const c0 = it.explicit_constraints;
    if (!c0.type && !c0.person.length) return { interpretation: it, results: [] };
    let all = engine('');                       // every asset, unranked
    if (c0.type) all = all.filter(r => r.a.type === c0.type);
    if (c0.person.length) all = all.filter(r => c0.person.every(p => (r.a.person || []).includes(p)));
    return { interpretation: it, results: all };
  }

  let results = engine(it.search_text);

  /* RULES 5 & 6 — stated type and named person are hard. Applied AFTER scoring so the
   * approved ranking is preserved exactly; this only drops rows she ruled out herself. */
  const c = it.explicit_constraints;
  if (c.type) results = results.filter(r => r.a.type === c.type);
  if (c.person.length) results = results.filter(r => c.person.every(p => (r.a.person || []).includes(p)));

  return { interpretation: it, results };
}

root.IFM_INTERPRETER = { interpret, run };
})(typeof window !== 'undefined' ? window : globalThis);
