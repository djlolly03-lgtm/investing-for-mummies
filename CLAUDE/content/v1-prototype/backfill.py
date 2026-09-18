#!/usr/bin/env /usr/bin/python3
"""Backfill the 384-row catalogue into the V1 taxonomy.

Run:  /usr/bin/python3 backfill.py            # writes v1-catalogue.js + a report
      /usr/bin/python3 backfill.py --report   # report only, writes nothing

DESIGN RULE, applied everywhere below: evidence over inference. A field is filled only
when something in the row actually establishes it. Otherwise it is left blank, or set to
the controlled value 'Unknown' where one exists. Coverage is not a goal; correctness is.
The 20-asset test showed blank fields cost nothing in search — a wrong tag costs trust.

PHASE 1 (mechanical, deterministic)
    type    100% from the legacy `type` field
    status  100% — In Production and On Hold both fold to Raw
    format  from `shot` where it maps (55 rows)
    source  Aakara / In-house carry over; 'Event' becomes Unknown because it records
            WHERE a thing was shot, not who produced it
    session carried over as-is

PHASE 2 (evidence-based classification from title + description + keywords)
    format  where phase 1 left it blank and the text is unambiguous
    topic   matched against the controlled vocabulary only
    person  from explicit textual evidence; NEVER from "a presenter"/"a woman"
    search_terms  synonyms + the finance terms that deliberately have no Topic

NOT DONE HERE: vision. Rows whose description is boilerplate are flagged `needs_vision`
so they can be worked through with the thumbnail open. Six Goa rows share one 63-character
description and are indistinguishable without it.
"""
import json, re, sys, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data.js')
OUT  = os.path.join(HERE, 'v1-catalogue.js')

# Excluded from the V1 Library by decision 16 Sep 2026: brand furniture and playable
# games. They stay in the catalogue and on Drive — they are simply not things Aakara
# would ever search for as content, and forcing them into a Type or Format would distort
# the taxonomy. This is an internal flag, never a filter in the UI.
EXCLUDE = {'IFM-312', 'IFM-313', 'IFM-314',   # logo lockup / round mark / animated logo
           'IFM-038', 'IFM-039'}              # Crorepati Lane, KBC — playable web games

TYPE_MAP = {
    'Session Photo':'Image','Photo':'Image','Game Screen':'Image','Brand Asset':'Image','Static':'Image',
    'Session Video':'Video','Reel':'Video','AI Video':'Video','Story':'Video','Game Teaser':'Video',
    'Motion Graphic':'Video','Game':'Video','Carousel':'Carousel',
}
STATUS_MAP = {'Raw':'Raw','In Production':'Raw','On Hold':'Raw','Ready':'Ready',
              'Published':'Published','Do Not Use':'Do Not Use'}
SOURCE_MAP = {'Aakara':'Aakara','In-house':'IFM / In-house'}   # 'Event' deliberately absent
SHOT_MAP = {
    'Hiral — portrait':'Portrait','Hiral — teaching':'Hiral Speaking',
    'Certificate moment':'Certificate','Testimonial — video':'Testimonial',
    'Testimonial — text':'Testimonial','Students':'Classroom Moment',
    'Group with Hiral':'Classroom Moment','Room/venue wide':'B-roll','Detail':'B-roll',
}

# ---------------------------------------------------------------- topic matching ----
# Each topic maps to patterns that must appear as WHOLE WORDS. The negative lookarounds
# matter: `gold` matches marigold, teal/gold and black/gold across 37 real rows, almost
# none of which are about the asset class. Colour contexts are excluded explicitly.
# Gold is the hardest topic in this catalogue and the flagship query, so it gets an
# allow-list rather than a block-list. Financial illustration is FULL of gold as a visual
# motif — gold coins, a gold trophy, a gold globe, gold hoop earrings, a gold-coin tree,
# "teal/gold theme". A naive \bgold\b matched 37 rows; excluding colour compounds still
# left 24, of which about eight were real. So: tag Gold only where gold appears with
# investment language, or inside an explicit asset-class list.
GOLD_ORNAMENTAL = re.compile(
    r'gold[- ](?:coins?|medallion|trophy|globe|hoop|earrings?|tree|sherwani|saree|badge|'
    r'foil|type|accent|theme|ifm|end[- ]?card|logo|plinth)', re.I)
GOLD_POSITIVE = re.compile(
    r'\bsgb\b|sovereign gold|bullion|gold bar|gold funds?|gold mutual|gold etf|'
    r'invest(ing|ment|ments)? in gold|ways to invest in gold|gold[- ]invest|safe haven|'
    r'physical gold|digital gold|central banks? own|'
    # an asset-class list: gold named alongside at least one other class
    r'(?:cash|debt|equity|real estate|fixed income|mutual funds)[^.]{0,60}\bgold\b|'
    r'\bgold\b[^.]{0,60}(?:cash|debt|equity|real estate|fixed income|mutual funds)', re.I)
TOPIC_RULES = [
 ('Compounding',        r'compound(ing)?|compound interest|power of compounding'),
 ('Saving vs Investing',r'savings? vs\.? invest|saving vs invest|difference between sav'),
 ('Saving',             r'\bsaving(s)?\b|emergency fund|piggy bank|rainy day'),
 ('Managing Money',     r'budget(ing|s)?|money map|expense|spending|salary split|manage (your )?money|cash flow'),
 ('Financial Planning', r'financial plan|goal(s)? first|fund your goal|planning|safety net|emergency fund'),
 ('Wealth',             r'\bwealth\b|richer|crore|net worth|hidden fortune'),
 ('Money Mindset',      r'mindset|money is (not )?a tool|myth(s)?|perfect time|intimidat|apolog|guilt|fear of money|reframe'),
 ('Money Conversations',r'conversation(s)?|talk(ing)? about money|q ?and ?a|questions?\b|discuss'),
 ('Financial Independence', r'financial independence|financial freedom|independen'),
 # 'Women & Money' fired on 216 of 379 rows because every IFM asset has women in it.
 # A filter matching 57%% of the library carries no information. It must mean the
 # content is ABOUT women and money, not that a woman is in frame.
 ('Women & Money',      r"women (?:and|&) money|why women|women (?:feel|still|who|are|deserve)|"
                        r"for women|women.?s? (?:money|finance|wealth|financial)|stree dhan|left out|"
                        r"intimidat|financially confident|confident women|gender"),
 ('Family & Money',     r'family|children|kids|teen(s|ager)?|school|parent|daughter|son\b'),
 ('3-Bucket Investing', r'3 bucket|three bucket|bucket'),
 ('Asset Allocation',   r'asset allocation|allocat|portfolio (mix|split)|5-10%|5–10%'),
 ('Diversification',    r'diversif'),
 ('Risk & Returns',     r'\brisk\b|\breturns?\b|cagr|xirr|volatil'),
 ('Investing',          r'invest(ing|ment|or)?\b'),
 ('Insurance',          r'insurance|term plan|health cover|policy premium'),
 ('Stocks / Equity',    r'\bstock(s)?\b|equity|share(s|holding)?\b|nifty|sensex|demerger|vedanta'),
 ('Mutual Funds',       r'mutual fund|\bmf\b|\bnav\b|fund house'),
 ('ETFs',               r'\betfs?\b|exchange traded'),
 ('Fixed Income',       r'fixed income|fixed deposit|\bfd\b|\bdebt\b|bond(s)?\b|ppf|nsc'),
 ('Real Estate / REITs',r'real estate|reits?\b|property\b'),
 ('Gold',               r'\bgold\b|\bsgb\b|sovereign gold|bullion'),
 ('Silver',             r'\bsilver\b'),
 ('PMS / AIFs',         r'\bpms\b|\baifs?\b|alternate investment'),
 ('Stock Market',       r'stock market|market crash|trading|leaderboard|bull|bear'),
 ('IPOs',               r'\bipos?\b|initial public offering'),
 ('Markets & Economy',  r'econom|\bgdp\b|central bank|\brbi\b|budget 20|recession|jackson hole'),
 ('Inflation & Interest Rates', r'inflation|interest rate|repo rate|purchasing power|cost of living'),
]
TOPIC_RE = [(t, re.compile(p, re.I)) for t, p in TOPIC_RULES]

# --------------------------------------------------------------- format matching ----
# Ordered: the first confident match wins. Only unambiguous phrases are listed —
# anything vague is left blank for a human or a vision pass.
FORMAT_RULES = [
 ('Certificate',         r'certificate|graduat'),
 # Bare 'review' is too loose — it caught 'Reviewing an IFM Slide on Screen' and
 # 'Standing Talk Over Workbooks', neither of which is social proof. A testimonial has to
 # be someone saying something good about IFM, so the pattern requires that context.
 ('Testimonial',         r'testimonial|what people are saying|customer review|workshop review|'
                         r'\breviews\b|social proof|word of mouth'),
 ('Portrait',            r'\bportrait\b|headshot|founder photo|profile photo'),
 ('Student Question',    r'q ?and ?a|q&a|questions? slide|fielding quer|asking quer'),
 ('Social / Promotional',r'game reel|game teaser|teaser|gameplay|game screen|quiz|leaderboard|promo reel|'
                         r'screen \d+:|join screen|scan-to-join|scan to join|room code|voting board|'
                         r'suitor|closing recap|prize ladder|lobby'),
 # ORDER MATTERS — Hiral Speaking is tested BEFORE Classroom Moment. 'Hiral presents the
 # gold slide while two women listen' hit 'listening' first and became a Classroom Moment,
 # which broke the flagship gold query. When Hiral is named AND explaining, that is what
 # the asset IS; an audience listening is the backdrop, not the subject.
 # The last alternative covers Hiral to camera: a reel fronted by her is her speaking even
 # with no teaching verb — 'Reel: Hiral against a gold-bar backdrop' was falling to B-roll.
 ('Hiral Speaking',      r'hiral (—|-)? ?teaching|teaching|presents|presenting|explain|talk\b|speaks|'
                         r'addressing|mid-explanation|fronted by|anchor|'
                         r'reel:?\s*hiral|hiral (?:against|in a|in blue|in black|holding|stood|sits|seated)'),
 # Widened after looking at ~40 session photos: 'discussion', 'listening', 'collaborating',
 # 'leaning in', 'workbooks out' are all something-is-happening, which is the agreed test.
 ('Classroom Moment',    r'group photo|group shot|group with|applaud|clapping|laugh|candid|audience|'
                         r'students? (watch|listen|tak|work)|cohort|ceremony|participants|'
                         r'discussion|discussing|listening|listen intently|collaborat|lean in|'
                         r'working (on|together)|chat(ting)?|follow along|workbooks?|'
                         r'participating|answering|activity|gestures? (expressively|animatedly|while talking)'),
 # 'backdrop' and 'close-up' were removed: they describe what is BEHIND the subject and how
 # tight the framing is, not whether the shot is supporting footage.
 ('B-roll',              r'room[/ ]venue wide|wide (view|shot)|establishing|cutaway|b-?roll|detail shot'),
 ('Social Graphic',      r'carousel|static post|slide\b|infographic|cover|story\b|post\b'),
]
FORMAT_RE = [(f, re.compile(p, re.I)) for f, p in FORMAT_RULES]

# Boilerplate descriptions carry no visual information. These rows are findable by title
# and session only, and are flagged for a vision pass rather than guessed at.
BOILERPLATE = re.compile(
    r'^photo from the ifm|^\(?not yet analysed|video in production|^photo \d+$|'
    # Raw dumps and placeholders describe WHERE footage came from, never what is in it.
    # 'Raw video from the IFM women's money workshop in Goa. Candidate footage for reels.'
    # was becoming a Classroom Moment on the strength of the word 'workshop' alone.
    r'^raw video from|candidate footage|^placeholder|presumably|not yet analysed or clipped|'
    r'^raw \d+ ?mb|raw session video dump', re.I)

STOPISH = set('the a an of for and or in on at to with is are this that it its'.split())


def load_rows():
    src = open(DATA, encoding='utf-8').read()
    i = src.index('window.IFM_DATA'); a = src.index('{', i); b = src.rindex('}') + 1
    return json.loads(src[a:b])


# Descriptions routinely quote what is written on a slide, a graphic or a game screen:
# "the question 'Waiting for the perfect time usually means...'". That IS slide text, read
# by whoever wrote the row. Harvesting it is not invention — it is promoting evidence that
# was already there into a field the search engine weights properly.
QUOTED = re.compile(r"[\u2018\u201c'\"]([^\u2019\u201d'\"]{12,160})[\u2019\u201d'\"]")
SCREENY = re.compile(r'slide|screen|projector|headline|titled|caption|cover|wordmark|reads?\b|'
                     r'board|display|artboard|poster|type alongside', re.I)

def slide_text_for(r):
    """Only harvest from rows that actually show a screen or a graphic with copy on it."""
    desc = str(r.get('description') or '')
    if not SCREENY.search(desc):
        return ''
    parts = [m.group(1).strip() for m in QUOTED.finditer(desc)]
    parts = [p for p in parts if not p.lower().startswith(('http', 'www'))]
    return ' '.join(dict.fromkeys(parts))[:600]


def blob(r, *fields):
    return ' '.join(str(r.get(f) or '') for f in fields)


SERIES_NOISE = re.compile(r'wealth conversation(s)?', re.I)

def topics_for(r):
    """Topics from the controlled vocabulary only. Never invents a value."""
    text = blob(r, 'title', 'description', 'keywords')
    # Strip series names before matching. 'Wealth Conversation Ch.4' is not about
    # wealth or about conversations; it is the name of the series it belongs to.
    text = SERIES_NOISE.sub(' ', text)
    found = []
    for t, rx in TOPIC_RE:
        if t == 'Gold':
            # Remove decorative uses first, then ask whether any investment-context
            # gold remains. 'gold coins' and 'the gold IFM medallion' are art direction.
            if GOLD_POSITIVE.search(GOLD_ORNAMENTAL.sub(' ', text)):
                found.append(t)
            continue
        if rx.search(text):
            found.append(t)
    # 'Investing' is so broad it fires on almost everything. Keep it only when nothing
    # more specific was found, so it does not dilute every result set.
    specific = [t for t in found if t != 'Investing']
    if 'Investing' in found and len(specific) >= 2:
        found = specific
    return found[:5]          # a row tagged with eight topics is tagged with none


def format_for(r, mechanical):
    if mechanical:
        return mechanical, 'shot'
    text = blob(r, 'title', 'description', 'keywords', 'shot')
    if BOILERPLATE.search(str(r.get('description') or '')):
        return '', 'needs_vision'
    has_hiral = bool(re.search(r"\bhiral\b|\bthe founder\b|\bfounder.?s\b", text, re.I))
    for f, rx in FORMAT_RE:
        if rx.search(text):
            # 'Hiral Speaking' is named for her, so it REQUIRES her. Without this guard the
            # keyword 'explainer' matched `explain` and tagged carousels as Hiral speaking:
            # 60 of 114 had no Hiral in them at all. An unidentified presenter teaching is
            # a Classroom Moment — honest, and it keeps this format meaning one thing.
            if f == 'Hiral Speaking' and not has_hiral:
                continue
            return f, 'text'
    # Nothing matched. A moving asset with no people in it and no promo signal is, by the
    # agreed definition, supporting footage: the AI concept renders (coin jars, medallions,
    # the Vedanta pizza) are exactly this. Stills are NOT included — a photo of nobody is
    # more likely a detail shot we cannot classify than deliberate B-roll.
    no_people = (str(r.get('shot') or '') == 'No people'
                 or re.search(r'no identifiable people', str(r.get('consent') or ''), re.I)
                 # or simply: nothing in the description mentions a person at all. The AI
                 # concept renders (coin jars, medallions, the Vedanta pizza) carry no
                 # consent field, so the explicit checks above never fired on them.
                 or not re.search(r'\bhiral\b|founder|women|woman|student|teen|people|person|'
                                  r'presenter|speaker|host|participant|attendee|audience|'
                                  r'girl|lady|colleague|mums?\b|her\b|she\b', text, re.I))
    if no_people and TYPE_MAP.get((r.get('type') or '').strip()) == 'Video':
        return 'B-roll', 'no_people_video'
    return '', 'no_evidence'


# WHOEVER IS PRESENTING IS HIRAL. User's rule, 18 Sep 2026: "the photos and videos that we
# take are hero-presenting because this is part of content for IFM. Even if you are 60% sure
# there's someone on the screen, or someone is standing while other people are sitting and it
# seems like she's teaching, it will be hiral."
#
# This deliberately overrides evidence-over-inference for the person field in SESSION imagery.
# The old rule demanded her name in the text, and the people writing descriptions just wrote
# "the presenter" — so 72 rows said Other Person and "Hiral teaching NAV" matched none of them.
# In a founder-led brand the shoot exists to film her; an unnamed presenter is not a stranger.
#
# TWO GUARDS, both load-bearing:
#   1. Requires a FRONT-OF-ROOM signal (standing, presenting, at a screen/whiteboard, pointing
#      at a slide). Someone SEATED talking to camera is a participant giving a testimonial, and
#      turning 50 of those into Hiral would be far worse than the problem being fixed.
#   2. Excluded on designed graphics. An earlier over-broad 'explain' match tagged 60 of 114
#      carousels as Hiral Speaking when she was in none of them.
PRESENTER_AT_FRONT = re.compile(
    r'\bpresenter\b|\bfacilitator\b|presenting|presents\b|standing (?:talk|presenter|at|beside|by)|'
    r'stands? (?:at|beside|by|against) the (?:screen|whiteboard|board)|at the whiteboard|'
    r'mid-?(?:talk|explanation|gesture|sentence)|pointing (?:to|at) the|explaining|walkthrough|'
    r'leads? (?:the )?(?:table|q ?and ?a|discussion)|fielding|addressing|teaching', re.I)
SEATED_TO_CAMERA = re.compile(
    r'testimonial|to camera|talking directly to camera|gives her feedback|sharing her|'
    r'sits? (?:on|at|with|alone)|seated to camera|hands clasped', re.I)

def person_for(r):
    """Explicit evidence, PLUS the presenter-is-Hiral rule for session imagery."""
    text = blob(r, 'title', 'description', 'keywords', 'shot')
    people = []
    # 'the founder' names Hiral as unambiguously as her name does — IFM has one founder.
    if re.search(r"\bhiral\b|\bthe founder\b|\bfounder.?s\b", text, re.I):
        people.append('Hiral')
    elif (PRESENTER_AT_FRONT.search(text)
          and not SEATED_TO_CAMERA.search(text)
          and TYPE_MAP.get((r.get('type') or '').strip()) in ('Image', 'Video')
          and (r.get('shot') or '').strip() != 'No people'
          and not re.search(r'carousel|artboard|static post|infographic', text, re.I)):
        people.append('Hiral')
    if re.search(r'student|teen|participant|attendee|audience|women (listen|watch|seated|apply)|'
                 r'graduate|cohort|class\b', text, re.I):
        people.append('Student')
    shot = str(r.get('shot') or '')
    if shot == 'No people' or re.search(r'no identifiable people', str(r.get('consent') or ''), re.I):
        return ['No Person'] if not people else people
    if not people and re.search(r'\bwomen\b|\bwoman\b|presenter|speaker|host\b', text, re.I):
        return ['Other Person']          # someone is present, but who is not established
    return people


def source_for(r):
    legacy = str(r.get('source') or '').strip()
    if legacy in SOURCE_MAP:
        # An 'AI Video' produced in-house is still produced by IFM. Source records the
        # producer, not AI involvement — that is a V2 attribute if it is ever needed.
        return SOURCE_MAP[legacy]
    text = blob(r, 'keywords', 'notes', 'description')
    if re.search(r'\bsakshi\b', text, re.I):
        return 'Sakshi'                  # named in the row itself, not inferred from the event
    return 'Unknown'


def search_terms_for(r, topics):
    """Synonyms + the specific finance terms that deliberately have no Topic of their own."""
    text = blob(r, 'title', 'description', 'keywords')
    extra = []
    for term, adds in (
        (r'\bsip\b|systematic investment', 'sip systematic investment plan monthly investing'),
        (r'\bxirr\b|\bcagr\b', 'xirr cagr annualised returns'),
        (r'\bsgb\b|sovereign gold', 'sgb sovereign gold bond'),
        (r'\bnav\b', 'nav net asset value'),
        (r'\brbi\b|repo', 'rbi repo rate central bank'),
        # Split deliberately. A posed group photo where everyone smiles at the camera is
        # NOT funny, and lumping 'smil' in here injected 'funny' into ~40 assets — so
        # searching "funny classroom" surfaced graduation portraits. Genuine humour has
        # its own signals; warmth is a different, weaker thing.
        # 'celebrat' moved out: a certificate ceremony is a celebration, not a joke, and
        # it was dragging six graduation portraits into 'funny'. Anything genuinely light
        # in those frames still matches through laugh/grin.
        (r'laugh|giggl|\bgrin|joke|fist pump', 'funny fun laughing humour lively'),
        (r'candid|applaud|smil|relaxed|celebrat|beams?\b', 'candid warm natural unposed relaxed friendly celebration'),
        (r'certificate|graduat', 'certificate completion graduation proud achievement social proof'),
        (r'\bportrait\b|headshot', 'portrait headshot founder press media kit agency bio'),
        (r'testimonial|review', 'testimonial review feedback social proof word of mouth'),
        (r'wide (view|shot)|establishing|backdrop', 'b-roll cutaway establishing supporting footage context'),
    ):
        if re.search(term, text, re.I):
            extra.append(adds)
    words = [w for w in re.split(r'[^a-z0-9₹]+', text.lower())
             if len(w) > 2 and w not in STOPISH]
    seen, keep = set(), []
    for w in words:
        if w not in seen:
            seen.add(w); keep.append(w)
    return ' '.join(extra + keep[:40])


def main():
    data = load_rows()
    rows = data['catalogue']
    out, stats = [], collections.Counter()
    fmt_src = collections.Counter()
    needs_vision = []

    for r in rows:
        v1 = {
            'id': r['id'],
            'title': r.get('title') or '',
            'date': str(r.get('date created') or '')[:10],
            # '../' makes a hub-relative path work from inside v1-prototype/. But 11 rows
            # (the SpaceX carousel and all 10 Wealth Conversation chapters) store an ABSOLUTE
            # URL, and prefixing those produced '../https://ifm-deploy…', which the server
            # answers with a 308 instead of the image — eleven permanently broken tiles that
            # nobody noticed because a broken thumb renders as empty space, not an error.
            # Verified 18 Sep 2026: the bare URL is a 200, the prefixed one is a 308.
            'thumb': (r['thumbnail'] if str(r.get('thumbnail','')).startswith(('http://', 'https://', '/'))
                      else '../' + r['thumbnail']) if r.get('thumbnail') else '',
            'video': r.get('video') or '',
            'drive': r.get('drive link') or r.get('video') or '',
            'description': r.get('description') or '',
            'session': (r.get('session') or '').strip(),
            'slide_text': slide_text_for(r),
            # Preview clips are built with ffmpeg -an to hit the <=200KB asset budget, so
            # they carry no audio at all; the AI chapter renders are silent too. Only the
            # game reels have a music bed. Flagged so the player can say so — a video that
            # plays with no sound and no explanation just reads as broken.
            'silent': ('/clips/' in (r.get('video') or r.get('drive link') or '')
                       or 'wealth-conversation-videos' in (r.get('drive link') or '')),
        }
        if r['id'] in EXCLUDE:
            v1['library'] = False                 # internal flag; never a UI filter
            v1['type'] = ''; v1['format'] = ''; v1['topic'] = []
            v1['person'] = []; v1['source'] = source_for(r)
            v1['status'] = STATUS_MAP.get((r.get('status') or '').strip(), 'Raw')
            v1['search_terms'] = ''
            out.append(v1); stats['excluded'] += 1
            continue

        legacy_type = (r.get('type') or '').strip()
        v1['type'] = TYPE_MAP.get(legacy_type, '')
        v1['status'] = STATUS_MAP.get((r.get('status') or '').strip(), 'Raw')
        mech = SHOT_MAP.get((r.get('shot') or '').strip())
        v1['format'], how = format_for(r, mech)
        fmt_src[how] += 1
        if how == 'needs_vision':
            needs_vision.append(r['id'])
        v1['topic'] = topics_for(r)
        v1['person'] = person_for(r)
        v1['source'] = source_for(r)
        v1['search_terms'] = search_terms_for(r, v1['topic'])

        for k in ('type', 'format', 'source', 'session'):
            if v1.get(k): stats['has_' + k] += 1
        if v1['topic']: stats['has_topic'] += 1
        if v1['person']: stats['has_person'] += 1
        out.append(v1); stats['library'] += 1

    # Vision findings win over anything the rules produced — a human (or a model) actually
    # looked at these. Applied last, and only to keys the file names.
    epath = os.path.join(HERE, 'enrichment.json')
    enrich = {}
    if os.path.exists(epath):
        enrich = {k: v for k, v in json.load(open(epath, encoding='utf-8')).items()
                  if not k.startswith('_')}
    applied = 0
    by_id = {o['id']: o for o in out}
    for aid, patch in enrich.items():
        o = by_id.get(aid)
        if not o:
            print('enrichment for unknown id:', aid); continue
        for k, v in patch.items():
            if k.startswith('_'):
                continue
            o[k] = v
        applied += 1
    out = [o for o in out]
    stats['enriched'] = applied

    report = {
        'rows': len(out), 'in_library': sum(1 for o in out if o.get('library') is not False),
        'excluded': sum(1 for o in out if o.get('library') is False),
        'enriched_by_vision': stats['enriched'],
        'with_slide_text': sum(1 for o in out if o.get('slide_text')),
        'coverage': {k: stats[k] for k in sorted(stats) if k.startswith('has_')},
        'format_source': dict(fmt_src), 'needs_vision': needs_vision,
    }
    if '--report' in sys.argv:
        print(json.dumps(report, indent=1)); return

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* GENERATED by backfill.py — do not hand-edit.\n'
                ' * Human corrections belong in the Catalogue sheet, which overrides this file.\n'
                ' * Regenerate: /usr/bin/python3 backfill.py\n */\n')
        f.write('window.IFM_V1 =\n')
        json.dump(out, f, ensure_ascii=False, indent=0)
        f.write(';\n')
    print(json.dumps(report, indent=1))
    print('\nwrote', OUT)


if __name__ == '__main__':
    main()
