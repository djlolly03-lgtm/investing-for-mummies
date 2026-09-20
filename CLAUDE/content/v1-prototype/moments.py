#!/usr/bin/env /usr/bin/python3
"""Content moments: the useful parts of a long talking video, with timestamps.

    /usr/bin/python3 moments.py --workset     # which videos qualify, and why
    /usr/bin/python3 moments.py --draft <ID>  # print the timed transcript for authoring
    /usr/bin/python3 moments.py --validate    # PROVE every stored moment is real
    /usr/bin/python3 moments.py --stats       # coverage report

WHY THIS EXISTS
    A four-minute testimonial is one row with one description. The useful part -- "I did not
    know PPF was open to non-employees", "I've told my husband we need to look at our
    investments together" -- happens at 2:00 and is findable by nothing. A moment is a span
    of a transcript that is worth finding on its own.

THE ONE RULE: A MOMENT MAY NOT CONTAIN ANYTHING THE TRANSCRIPT DOES NOT SAY.
    Every moment carries `evidence`: a VERBATIM substring of that video's transcript.
    `--validate` re-reads the transcript and checks it character by character. A moment whose
    evidence is not found, or whose timestamps fall outside the segments it claims, is a hard
    failure. This is mechanical, not a matter of care: the only way to keep a summary honest
    at this scale is to make invention fail a check.

    `search_terms` are held to the same standard, softly: each term must either appear in the
    evidence, or be listed in SYNONYM_OK below with the transcript words that license it. A
    term licensed by nothing is reported.

WHAT A MOMENT IS NOT
    Not every keyword mention. `confidence` is said once in passing in a dozen videos; that
    is not a moment about confidence. A moment is a span where something is actually
    explained, claimed, corrected or recounted. The `weight` field records which:
      primary   -- the video is substantially about this
      secondary -- a real, self-contained passage, but not what the video is for
    A passing mention gets no moment at all. That distinction is the whole value; without it
    this becomes keyword spam with timestamps.

STORAGE
    moments/<ID>.json  -- {id, moments:[...], authored, model}
    Kept out of speech/ so transcripts stay a pure record of what was said.
"""
import json, os, re, sys, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
SPEECH = os.path.join(HERE, 'speech')
STORE = os.path.join(HERE, 'moments')
CAT = os.path.join(HERE, 'v1-catalogue.js')

# A search term not present in the evidence is allowed ONLY if the transcript licenses it.
# Left: the term. Right: words that, if present in the evidence, license it. This is how
# "fear of investing" can be a search term for evidence that says "I thought it was rocket
# science" -- without opening the door to inventing a topic that was never discussed.
SYNONYM_OK = {
    'fear of investing':      ['scared', 'afraid', 'fear', 'intimidat', 'rocket science', 'nervous'],
    'investing confidence':   ['confident', 'confidence', 'aware', 'in control'],
    'term insurance':         ['term insurance', 'term plan'],
    'life insurance':         ['life insurance'],
    'ppf':                    ['ppf', 'provident', 'providence'],
    # backfill.py already maps \bnav\b -> 'nav net asset value' for every row; keeping
    # the expansion licensed here is consistency, not a reach.
    'net asset value':        ['nav'],
    'provident fund':         ['ppf', 'provident', 'providence'],
    'talking to spouse about money': ['husband', 'wife', 'spouse', 'partner'],
    'family money conversation':     ['husband', 'wife', 'parents', 'in-laws', 'family'],
    'workshop games':         ['game', 'games'],
    'asking questions':       ['question', 'ask', 'embarrass', 'hesitat'],
    'jargon':                 ['terminology', 'jargon', 'terms'],
    'sip':                    ['sip', 'sips', 'every month', 'monthly'],
    'mutual funds':           ['mutual fund', 'nav', 'fund'],
    'compounding':            ['compound', 'chessboard', 'doubling'],
    'inflation':              ['inflation', 'purchasing power', 'prices'],
    'gold':                   ['gold', 'sgb', 'bullion'],
    'asset allocation':       ['allocation', 'allocate', 'thali', 'how much of each'],
    'diversification':        ['diversif', 'different kinds', 'spread'],
    'risk':                   ['risk', 'risky', 'volatil'],
    'stock market':           ['stock', 'equity', 'market', 'shares'],
    'real estate':            ['real estate', 'property'],
    'emergency fund':         ['emergency', 'rainy day'],
    'starting to invest':     ['start', 'started', 'begin', 'first step'],
    'women and money':        ['women', 'woman', 'mums', 'mummies', 'mothers'],
    # VERNACULAR. People type the word they feel, not the word that was said. "testimonial
    # where someone talks about being SCARED of investing" returned 0 on 20 Sep because
    # `scared` appears nowhere in the library -- the coverage gate vetoed the whole query --
    # even though IFM-398 says "the fear of investing ... thinking it's rocket science" at
    # 1:12. These entries let a moment carry the searched word, licensed by the said word.
    'scared of investing':    ['fear', 'scared', 'afraid', 'rocket science', 'intimidat'],
    'scared':                 ['fear', 'scared', 'afraid', 'nervous', 'intimidat'],
    'nervous':                ['fear', 'scared', 'afraid', 'nervous', 'worried'],
    'confused':               ['confus', 'never quite understood', "didn't understand", 'unclear'],
    'overwhelmed':            ['overwhelm', 'too much', 'intimidat'],
    'embarrassed':            ['embarrass', 'silly question', 'stupid question', 'hesitat'],
    'too late to start':      ['too late', 'never too late', 'my age', 'at this age'],
    'where do i start':       ['how do i', 'can you start', 'where to start', 'first step'],
    # licensed by the substance, not the word: "only for employees" -> "for any of us"
    'ppf eligibility':        ['only for employees', 'for any of us', 'anyone can'],
}


# Labels for the KIND of moment, not its content. These are the only terms allowed to be
# absent from the transcript, they are a closed list, and they exist because the searches
# people actually type are partly about kind: "strong student comments about the games",
# "a memorable statement about investing". Anything not on this list must be grounded in the
# transcript or it is reported.
# Trimmed 20 Sep after measurement. Labels that merely restate the ROW's type are banned:
# the catalogue already carries `format: Testimonial` at weight 4, and repeating
# "testimonial" on nine moments put the word in one row's moment_text four times. The query
# "testimonial where someone talks about being scared of investing" then ranked IFM-397 --
# which never mentions fear and says "much more confident" -- above IFM-398, which says "the
# fear of investing ... thinking it's rocket science". Quantity beat correctness. A moment's
# terms must describe THAT MOMENT's content, never the kind of row it sits in.
BANNED_LABELS = {'testimonial', 'honest testimonial', 'student comment', 'explanation',
                 'question and answer', 'video', 'clip', 'reel', 'workshop'}
KIND_LABELS = {
    'beginner question', 'misconception corrected', 'memorable statement',
    'personal experience', 'teaching style', 'safe space', 'transformation',
    'social media excerpt', 'overcoming fear', 'student comment on games',
}


def load_speech():
    out = {}
    for f in glob.glob(os.path.join(SPEECH, '*.json')):
        r = json.load(open(f, encoding='utf-8'))
        if r.get('text'):
            out[r['id']] = r
    return out


def load_rows():
    s = open(CAT, encoding='utf-8').read()
    return {r['id']: r for r in json.loads(s[s.index('['):s.rindex(']') + 1])}


def norm(s):
    """Compare on words only. Whisper's punctuation is not stable enough to match on."""
    return re.sub(r'[^a-z0-9 ]+', ' ', (s or '').lower())


def workset(sp, rows):
    """Videos with enough speech to hold a moment. Thresholds are stated, not implied.

    >=30s of audio AND >=60 words. Below that a video is a fragment: the whole thing is
    already one moment and the row's own title serves. Measured 20 Sep: 49 of 139 qualify,
    60 minutes of audio, and they are where every long testimonial and teaching clip lives.
    """
    return sorted([i for i, r in sp.items()
                   if r['dur'] >= 30 and len(r['text'].split()) >= 60])


def validate(verbose=True):
    sp, rows = load_speech(), load_rows()
    hard, soft, n = [], [], 0
    for f in sorted(glob.glob(os.path.join(STORE, '*.json'))):
        doc = json.load(open(f, encoding='utf-8'))
        i = doc['id']
        t = sp.get(i)
        if not t:
            hard.append((i, '-', 'moments exist for a video with no transcript'))
            continue
        hay = norm(t['text'])
        segs = t.get('segments') or []
        last = max([s.get('e') or s['t'] for s in segs] or [t['dur']])
        for m in doc.get('moments', []):
            n += 1
            ttl = m.get('title', '?')
            ev = norm(m.get('evidence', ''))
            if not ev:
                hard.append((i, ttl, 'no evidence quoted')); continue
            if ev not in hay:
                hard.append((i, ttl, 'EVIDENCE NOT IN TRANSCRIPT: "%s"' % m['evidence'][:60]))
                continue
            st, en = m.get('start'), m.get('end')
            if st is None or en is None or en <= st:
                hard.append((i, ttl, 'bad span %s->%s' % (st, en))); continue
            if st < 0 or en > last + 2.5:
                hard.append((i, ttl, 'span %s-%s outside the %.0fs transcript' % (st, en, last)))
                continue
            # the quoted evidence must actually sit inside the claimed span
            inside = norm(' '.join(s['x'] for s in segs
                                   if s['t'] >= st - 1.5 and (s.get('e') or s['t']) <= en + 1.5))
            if ev not in inside:
                hard.append((i, ttl, 'evidence is in the video but NOT inside %s-%ss' % (st, en)))
                continue
            if m.get('weight') not in ('primary', 'secondary'):
                hard.append((i, ttl, 'weight must be primary or secondary'))
            # A search term is licensed by the whole CLAIMED SPAN, not only by the sentence
            # quoted as evidence. Evidence proves the moment is real; the span is what the
            # moment covers. "husband" sits in the interviewer's question at 151.5s, inside
            # the span, and excluding it made the check report a false alarm on a term the
            # transcript plainly supports.
            for term in m.get('search_terms', []):
                tn = norm(term).strip()
                if tn in inside:
                    continue
                lic = SYNONYM_OK.get(term.lower())
                if lic and any(w in inside for w in lic):
                    continue
                # Stem-tolerant word check. "comparing investments" was reported unlicensed
                # on a span that says "you want to compare two investments that you have
                # made" -- same word, different ending. Matching on a 5-character prefix
                # accepts compare/comparing and invest/investments without accepting two
                # unrelated words, which a 3-character prefix would.
                def present(w):
                    if w in inside:
                        return True
                    stem = w[:5]
                    return len(w) > 4 and re.search(r'(^| )' + re.escape(stem), inside) is not None
                if all(present(w) for w in tn.split() if len(w) > 3):
                    continue
                if term.lower() in BANNED_LABELS:
                    hard.append((i, ttl, 'term "%s" restates the row type -- `format` already '
                                         'carries it at weight 4; repeating it per moment is '
                                         'keyword spam' % term))
                    continue
                if term.lower() in KIND_LABELS:
                    continue
                soft.append((i, ttl, 'term "%s" is licensed by nothing in the span' % term))
    if verbose:
        print('%d moments checked across %d videos' % (n, len(glob.glob(os.path.join(STORE, '*.json')))))
        print('HARD FAILURES (invention / bad spans): %d' % len(hard))
        for x in hard:
            print('   %-9s %-34s %s' % (x[0], x[1][:34], x[2]))
        print('SOFT WARNINGS (unlicensed search term): %d' % len(soft))
        for x in soft[:25]:
            print('   %-9s %-34s %s' % (x[0], x[1][:34], x[2]))
    return hard, soft, n


def draft(i):
    """The timed transcript, for authoring moments against. Read this, do not guess."""
    sp, rows = load_speech(), load_rows()
    t = sp.get(i)
    if not t:
        print('no transcript for', i); return
    r = rows.get(i, {})
    print('%s  %s' % (i, r.get('title', '')))
    print('%.0fs audio | %d words | format=%s | topic=%s'
          % (t['dur'], len(t['text'].split()), r.get('format'), r.get('topic')))
    print('-' * 78)
    for s in t['segments']:
        print('[%6.1f - %6.1f] %s' % (s['t'], s.get('e') or s['t'], s['x']))


def stats():
    sp, rows = load_speech(), load_rows()
    ws = workset(sp, rows)
    done = {os.path.basename(f)[:-5] for f in glob.glob(os.path.join(STORE, '*.json'))}
    cnt = collections.Counter()
    tot = 0
    for f in glob.glob(os.path.join(STORE, '*.json')):
        ms = json.load(open(f, encoding='utf-8')).get('moments', [])
        tot += len(ms)
        for m in ms:
            cnt[m.get('weight')] += 1
    print('working set          : %d videos' % len(ws))
    print('with moments authored: %d' % len(done & set(ws)))
    print('still to author      : %d' % len(set(ws) - done))
    print('moments total        : %d  (%s)' % (tot, dict(cnt)))
    miss = sorted(set(ws) - done)
    if miss:
        print('\noutstanding:')
        for i in miss:
            print('   %-9s %5.0fs %4dw  %s' % (i, sp[i]['dur'], len(sp[i]['text'].split()),
                                               (rows.get(i, {}).get('title') or '')[:52]))


if __name__ == '__main__':
    os.makedirs(STORE, exist_ok=True)
    if '--draft' in sys.argv:
        draft(sys.argv[sys.argv.index('--draft') + 1])
    elif '--validate' in sys.argv:
        hard, soft, n = validate()
        sys.exit(1 if hard else 0)
    elif '--workset' in sys.argv:
        sp, rows = load_speech(), load_rows()
        ws = workset(sp, rows)
        print('%d videos qualify (>=30s audio AND >=60 words)' % len(ws))
        for i in ws:
            print('   %-9s %5.0fs %4dw  %-16s %s' % (i, sp[i]['dur'], len(sp[i]['text'].split()),
                  (rows.get(i, {}).get('format') or '—')[:16], (rows.get(i, {}).get('title') or '')[:46]))
    else:
        stats()
