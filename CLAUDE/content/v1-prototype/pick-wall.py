#!/usr/bin/env /usr/bin/python3
"""Pick photographs for the public website's photo wall.

    /usr/bin/python3 pick-wall.py            # the shortlist, with reasons
    /usr/bin/python3 pick-wall.py --html     # also write /tmp/wall.html to eyeball it

WHAT THE CURRENT WALL GETS WRONG
    It is mostly the same boardroom shot from the back of the room: backs of heads, a lit
    ceiling, a screen in the distance, and the audience small. Those frames tell a visitor
    that a session happened; they do not show a single face deciding something. A wall of
    them also repeats — same room, same angle, same light — so twelve photographs do the
    work of about three.

WHAT THIS SELECTS FOR
    faces        a frame described as backs-of-heads or seen-from-behind scores negative
    warmth       laughing, candid, celebrating, engaged — the thing a prospective student buys
    variety      no two frames of the same moment, and a cap per session so one shoot
                 cannot take over the wall
    scale mix    deliberately mixes close portraits, mid groups and a few room wides, because
                 a wall of all close-ups is as monotonous as a wall of all wides

HARD EXCLUSIONS, NOT PREFERENCES
    minors       TEENS frames are excluded outright — IYA/IFT cohorts and teens certificate
                 days are under-18s, and the DPDP position on this project is that they need
                 written parental consent. A public marketing page is exactly the use that
                 consent has to cover. This is a filter, not a score.
                 ADULT certificate photos ARE included (confirmed 5 Oct 2026): the Flagship
                 graduates and women's-workshop cohorts are grown women holding their own
                 certificates, which is some of the best proof-of-outcome imagery there is.
    not a photo  screenshots, slides, graphics, carousels, AI renders — a wall of real rooms
                 and real people should not contain a screenshot of Instagram's composer.
    unusable     no thumbnail, or the asset is hidden from the Library.

DEDUPE
    Uses the same perceptual hash the Library groups bursts with. The wall gets ONE frame per
    moment — on a website the second-best frame of a moment is not variety, it is a mistake
    a visitor notices immediately.
"""
import json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(HERE, 'v1-catalogue.js')
WANT = 50
PER_SESSION = 6
DUP_BITS = 12

# Faces and feeling. Weighted by how strongly each reads on a wall at thumbnail size.
GOOD = [
    (r'laugh|giggl|grin\b|beams?\b|delight', 9, 'laughing'),
    (r'applaud|clap|cheer|celebrat|fist', 7, 'celebration'),
    (r'candid|unposed|mid-|caught', 5, 'candid'),
    (r'smil|warm\b|relaxed|friendly', 4, 'warm'),
    (r'\bhands?\b.*(up|raise)|raises? (?:her|their) hand|show of hands', 7, 'hand up'),
    (r'leaning in|listening intently|engaged|absorbed|focused on', 5, 'engaged'),
    (r'group (?:photo|portrait|shot)|cohort|together|whole (?:room|group)', 6, 'group'),
    (r'portrait|close|headshot', 5, 'portrait'),
    (r'workbook|worksheet|notes|writing|pen|book', 4, 'materials in hand'),
    (r'certificate|graduat', 8, 'certificate moment'),
    (r'whiteboard|marker|diagram|drawing', 4, 'teaching'),
    (r'hiral', 3, 'founder'),
]
# What a wall should not be made of.
BAD = [
    (r'from behind|backs? of (?:heads|the room)|rear view|seen in profile from behind', -14, 'backs of heads'),
    (r'\bempty\b|before the session|nobody|unoccupied', -10, 'empty room'),
    (r'screenshot|composer|story editor|phone screen|app ui', -20, 'screenshot'),
    (r'\bslide\b|projector|screen show|deck', -3, 'slide-dominated'),
    (r'wide (?:room|shot|view)|room wide|panorama|far end|from the back', -7, 'room wide'),
    (r'blurry|dark|poorly lit|out of focus|grainy', -9, 'poor quality'),
]
BLOCK_FORMAT = {'Social Graphic', 'Social / Promotional', 'Game Screen', 'Static'}
BLOCK_TYPE = {'Carousel', 'Video', 'Reel', 'Session Video', 'AI Video', 'Story',
              'Game Teaser', 'Motion Graphic', 'Game'}
# MINORS — adults only on the public site, confirmed 5 Oct 2026. 'certificate' is NOT in
# here (adult graduates are wanted); 'youth' IS, because it caught "Office youth workshop",
# which this filter had been letting straight through to a public marketing page.
MINOR_RX = re.compile(r'\bteen|\bteens\b|\bminor|\bchild|\bkid\b|\byouth\b|school student|'
                      r'\bschool\b|\bstudents?\b(?!\s+of\s+life)|\biya\b|\bift\b|under.?18|'
                      r'\bgen ?z\b|\bcollege\b', re.I)
# Not photographs of real rooms: delivered artwork, reel covers and slide captures. A wall of
# people should not contain a reel cover, however well it scores on its description.
NOT_A_PHOTO_RX = re.compile(r'\baakara\b|reel cover|artboard|carousel|title slide|'
                            r'\bqr\b|game screen|screenshot|composer', re.I)


def rows():
    s = open(CAT, encoding='utf-8').read()
    a = s.index('window.IFM_V1 =') + len('window.IFM_V1 =')
    return json.loads(s[a:s.rindex(';')])


def dist(a, b):
    try:
        return bin(int(a, 16) ^ int(b, 16)).count('1')
    except Exception:
        return 64


def main():
    R = rows()
    cands, rejected = [], collections.Counter()
    for r in R:
        txt = ' '.join(str(r.get(k) or '') for k in
                       ('title', 'description', 'search_terms', 'session', 'slide_text'))
        if r.get('library') is False:
            rejected['hidden']; continue
        if not r.get('thumb'):
            rejected['no thumbnail'] += 1; continue
        if (r.get('type') or '') in BLOCK_TYPE:
            rejected['not a photograph'] += 1; continue
        if (r.get('format') or '') in BLOCK_FORMAT:
            rejected['format excluded'] += 1; continue
        # MINORS — hard stop, before anything is scored.
        if MINOR_RX.search(txt) or 'Minors' in str(r.get('consent') or ''):
            rejected['under-18s — adults only on the public site'] += 1; continue
        if NOT_A_PHOTO_RX.search(txt) or (r.get('source') or '') == 'Aakara':
            rejected['artwork / slide / screen capture, not a photograph'] += 1; continue
        score, why = 0, []
        for rx, w, label in GOOD:
            if re.search(rx, txt, re.I):
                score += w; why.append(label)
        for rx, w, label in BAD:
            if re.search(rx, txt, re.I):
                score += w; why.append('!' + label)
        score += {'Hero': 10, 'Usable': 4, 'Raw-backup': -6}.get(r.get('quality') or '', 0)
        if score <= 0:
            rejected['scored too low'] += 1; continue
        cands.append({'id': r['id'], 'score': score, 'why': why, 'r': r})

    cands.sort(key=lambda c: -c['score'])

    # A DELIBERATE MIX, not whatever the scores happen to hand back. Ranked purely by score
    # the wall fills with founder portraits and one graduation, because those frames describe
    # well. A visitor should see corporate rooms, a Goa cafe, a Mumbai boardroom, women
    # holding certificates and Hiral teaching — the range of the business, not its best-lit
    # afternoon. Quotas are filled by score within each bucket, so the mix is chosen and the
    # individual pictures are still earned.
    BUCKETS = [
        ('Founder / brand portraits', 7, r'founder|brand shoot|portrait|to camera'),
        ('Corporate gigs',           10, r'corporate|boardroom shoot|deck video'),
        ('Goa',                       5, r'\bgoa\b'),
        ('Graduation & certificates', 8, r'graduat|certificate|flagship'),
        ("Women's workshops",        10, r"balsabha|rss|women.s workshop|wealth conversation|mums"),
        ('Classroom & candid',       10, r'.'),
    ]
    picked, seen_ph, per_sess = [], [], collections.Counter()
    bucket_of = {}

    def fits(c):
        """Not already on the wall as the same picture, and not a seventh frame of one shoot."""
        r = c['r']; ph = r.get('phash')
        if ph and any(dist(ph, p) <= DUP_BITS for p in seen_ph):
            return False
        if per_sess[(r.get('session') or 'none')[:28]] >= PER_SESSION:
            return False
        return True

    def take(c, label):
        r = c['r']
        picked.append(c); bucket_of[c['id']] = label
        per_sess[(r.get('session') or 'none')[:28]] += 1
        if r.get('phash'):
            seen_ph.append(r['phash'])

    used = set()
    for label, quota, rx in BUCKETS:
        n = 0
        for c in cands:
            if n >= quota or len(picked) >= WANT:
                break
            if c['id'] in used:
                continue
            hay = ' '.join(str(c['r'].get(k) or '') for k in ('session', 'title', 'search_terms'))
            if not re.search(rx, hay, re.I):
                continue
            if not fits(c):
                continue
            take(c, label); used.add(c['id']); n += 1
    # Top up from anything left, so a thin bucket never costs the wall its full count.
    for c in cands:
        if len(picked) >= WANT:
            break
        if c['id'] in used or not fits(c):
            continue
        take(c, 'Classroom & candid'); used.add(c['id'])

    print('%d photographs shortlisted from %d catalogue rows\n' % (len(picked), len(R)))
    print('excluded:')
    for k, v in rejected.most_common():
        print('   %4d  %s' % (v, k))
    print()
    bysec = collections.OrderedDict()
    for c in picked:
        bysec.setdefault(bucket_of[c['id']], []).append(c)
    for label, group in bysec.items():
        print('%s  (%d)' % (label.upper(), len(group)))
        for c in group:
            r = c['r']
            print('   %-9s %-3d %-58s' % (r['id'], c['score'], str(r.get('title'))[:58]))
            print('             %s' % (r.get('session') or '-')[:60])
        print()

    json.dump([{'id': c['id'], 'score': c['score'], 'title': c['r'].get('title'),
                'bucket': bucket_of[c['id']],
                'drive': c['r'].get('drive'), 'thumb': c['r'].get('thumb'),
                'session': c['r'].get('session')} for c in picked],
              open('/tmp/wall.json', 'w'), ensure_ascii=False, indent=1)
    if '--html' in sys.argv:
        cells = ''.join(
            '<figure><img src="https://ifm-deploy.vercel.app/content/thumbs/%s.jpg">'
            '<figcaption>%d &middot; %s &middot; %s<br><small>%s</small></figcaption></figure>'
            % (c['id'], i, c['id'], bucket_of[c['id']], str(c['r'].get('title'))[:64])
            for i, c in enumerate(picked, 1))
        open('/tmp/wall.html', 'w').write(
            '<meta charset="utf-8"><style>body{background:#12314f;color:#fff;'
            'font:13px/1.4 system-ui;margin:0;padding:18px}'
            'div{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}'
            'figure{margin:0}img{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:8px}'
            'figcaption{padding-top:5px;opacity:.85}small{opacity:.6}</style><div>'
            + cells + '</div>')
        print('\nwrote /tmp/wall.html')


if __name__ == '__main__':
    main()
