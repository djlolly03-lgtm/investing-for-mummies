#!/usr/bin/env /usr/bin/python3
"""The September 2026 catalogue batch: 17 rows for the 172 files the 30 Sep scan found.

    /usr/bin/python3 new-rows-sept.py --plan     # print the rows and the media jobs
    /usr/bin/python3 new-rows-sept.py --media    # write /tmp/rowmedia.json for media-for-rows
    /usr/bin/python3 new-rows-sept.py --write    # write data.js + speech/ + enrichment.json

WHAT THE SCAN FOUND AND WHAT GETS A ROW

    102  Content Library/IFM Sept 2026        1 catch-all       nothing linked it at all
     32  Content Library/IFM Games            0 rows            IFM-477 ALREADY links it
     17  Content Library/HG reel              4 rows            3 finished cuts + 1 catch-all
      7  Content Library/IFM Sept feedback    7 rows            each is a different person
      7  Certificates                         0 rows            minors, DPDP consent hold
      2  Content Library/IFM (sharing exp.)   2 rows            same as feedback
      5  Aakara September/Reels/*             3 rows            one row per deliverable

WHY IFM GAMES GETS NOTHING
    Its folder is already the `drive link` of IFM-477, so its 32 new files are reachable
    today. Bucket B means "the parent folder has a row", and writing a second row on the
    same folder is the duplicate-write mistake that nearly shipped 57 times in the 21 Sep
    batch. IFM-477's note is updated instead.

WHY THESE DESCRIPTIONS READ DIFFERENTLY
    Every feedback row is described from its TRANSCRIPT, not its appearance. The standing
    complaint about this catalogue was that a testimonial's description talked about a blue
    shirt while the woman on screen was saying something quotable. So each row below leads
    with what is actually said, and the transcript is written to speech/IFM-NNN.json so the
    words are searchable rather than trapped in prose.

    These are NOT polished to-camera testimonials. They are one end-of-course feedback
    CONVERSATION, recorded in clips, with Hiral asking and several participants answering
    over each other. Whisper handles crosstalk badly, so where the transcript is unreliable
    the description says so instead of inventing a clean quote.

THREE CLIPS ARE HIDDEN FROM THE LIBRARY
    IMG_7793, IMG_7796 and IMG_7798 are 2-6 second fragments with no usable speech
    ("You guys? Yeah! Awesome!"). They get rows, so the hub can still reach them and nothing
    is silently lost, but `library:false` in enrichment.json keeps them out of the Library --
    the same mechanism used for IFM-459. Showing a 2-second fragment of crosstalk is the
    failure the visibility rule exists to prevent.

A CONSENT RESTRICTION THAT ONLY THE TRANSCRIPT REVEALS
    In IMG_7794 the speaker says "and don't put this on" and later "please don't put that
    on". IFM-557 records that. It cannot be published without going back to her, and no
    description written from the picture would ever have caught it.
"""
import json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data.js')
SPEECH = os.path.join(HERE, 'speech')
ENRICH = os.path.join(HERE, 'enrichment.json')
NEW = '/tmp/new172.json'
SCAN = '/tmp/scan-30sep.json'
DFILE = 'https://drive.google.com/file/d/%s/view'
DFOLDER = 'https://drive.google.com/drive/folders/%s'
CLIPURL = 'https://ifm-deploy.vercel.app/content/clips/%s.mp4'

# Mirrors TYPE_MAP in backfill.py. A row whose type maps to Video is dropped by the Library
# unless media-map.js says it is playable, so this decides which rows must get a preview clip.
VIDEO_TYPES = {'Session Video': 'Video', 'Reel': 'Video', 'AI Video': 'Video',
               'Story': 'Video', 'Game Teaser': 'Video', 'Motion Graphic': 'Video',
               'Game': 'Video', 'Carousel': 'Carousel', 'Photo': 'Image',
               'Session Photo': 'Image'}

NOTE = ('Catalogued 30 Sep 2026 from the twice-weekly ingestion scan, which found 172 files '
        'added to Drive between 21 and 29 Sep that no catalogue row reached. ')

# Each entry: the file (or folder) it points at, and a description written from the transcript.
# 'tx' names the /tmp/tx_*.json the transcript came from, so --write can file it under the
# allocated id in speech/.
ROWS = [
 # ---------------------------------------------------------------- IFM Sept feedback ------
 dict(src='IMG_7791.MOV', tx='IMG_7791', folder='Content Library/IFM Sept feedback',
      title='End-of-course feedback — confidence, the aha moment, the conversation at home '
            '(3 min)',
      type='Session Video', shot='Testimonial — video', quality='Hero', status='Raw',
      keywords='testimonial,feedback,september 2026,compounding,sip,swp,benchmarking,index,'
               'confidence,family money,husband,diversifying,aha moment,women,alumni',
      desc='The fullest feedback recording of the September 2026 course — three minutes in '
           'which Hiral puts three questions to the group and the answers are quotable '
           'throughout. Asked how confident they feel, one participant says "I am literally '
           'thinking differently" and describes asking the person who manages her assets, '
           'that same morning, for the full trajectory since she began, because she now '
           'wants to understand it and diversify. Another says she was afraid of investing '
           'and never wanted to learn, and that the big shift was "I understand — it is not '
           'that tough". Asked for the biggest aha moment, the answer is the compounding of '
           'an SIP: she felt she had "missed the bus", then realised she can start for her '
           'children. SWP and judging a fund by benchmarking it against the index rather '
           'than in absolute terms also come up. The last question — what they have since '
           'said to a husband or father — produces the strongest line: when family money is '
           'already being managed "you feel like those are more able hands, so you don\'t '
           'really step in", and the change is wanting to be part of the conversation.',
      person='Hiral Goel', setting='Workshop — mums'),
 dict(src='IMG_7793.MOV', tx='IMG_7793', folder='Content Library/IFM Sept feedback',
      title='Feedback session — 6-second fragment, no usable speech',
      type='Session Video', shot='Testimonial — video', quality='Raw-backup', status='Raw',
      keywords='feedback,september 2026,fragment,offcut,unusable',
      desc='A six-second offcut from the September 2026 feedback recording. The transcript '
           'is three broken half-sentences of crosstalk with no recoverable meaning. Kept '
           'for completeness so the file is reachable, hidden from the Library because there '
           'is nothing here anyone could use.',
      hide='6-second fragment, no usable speech — nothing a search could usefully return',
      person='', setting='Workshop — mums'),
 dict(src='IMG_7794.MOV', tx='IMG_7794', folder='Content Library/IFM Sept feedback',
      title='Feedback — the workbook as the thing to go back to, and being able to ask '
            'anything (96s)',
      type='Session Video', shot='Testimonial — video', quality='Hero', status='Raw',
      keywords='testimonial,feedback,september 2026,workbook,handbook,reference,brain fog,'
               'questions,patience,awareness,monday class,women',
      desc='Ninety-six seconds on what the course left behind. The speaker says she can now '
           'ask sensible questions and understands the terms, and — more than once — that '
           'what matters is having the workbook to go back to, because with brain fog she '
           'expects to forget: "it is amazing that this is there to go back to". She repeats '
           '"I feel more aware". Asked what the most fun part was, she answers that it was '
           'being able to ask any question at all, and credits Hiral with being consistently '
           'patient about answering them. She mentions switching into the Monday class after '
           'seeing another participant there.',
      # Goes at the FRONT of the description, not in `consent`. The Library never displays
      # `consent`, so a restriction filed there would be invisible to the person choosing a
      # clip to publish -- which is the one moment it has to be seen.
      restricted='⚠️ DO NOT PUBLISH WITHOUT ASKING HER FIRST — at 1:04 and again at 1:24 the '
                 'speaker says "and don\'t put this on" and "please don\'t put that on". The '
                 'restriction is hers, not a policy, and it is only known because the clip '
                 'was transcribed. ',
      person='Hiral Goel', setting='Workshop — mums'),
 dict(src='IMG_7795.MOV', tx='IMG_7795', folder='Content Library/IFM Sept feedback',
      title='Feedback — attendance, and "you are one of the few" (26s)',
      type='Session Video', shot='Testimonial — video', quality='Usable', status='Raw',
      keywords='feedback,september 2026,attendance,every class,crosstalk,women',
      desc='Twenty-six seconds of overlapping conversation about turning up. A participant '
           'says she attended every class and normally would not have, and Hiral replies '
           '"that is awesome, you are one of the few". Several people speak at once and the '
           'automatic transcript garbles the middle of the exchange badly enough that no '
           'other line in it should be quoted without listening back.',
      person='Hiral Goel', setting='Workshop — mums'),
 dict(src='IMG_7796.MOV', tx='IMG_7796', folder='Content Library/IFM Sept feedback',
      title='Feedback session — 2-second fragment, no usable speech',
      type='Session Video', shot='Testimonial — video', quality='Raw-backup', status='Raw',
      keywords='feedback,september 2026,fragment,offcut,unusable',
      desc='Two seconds of the room agreeing with something said off-camera — the entire '
           'transcript is "You guys? Yeah! Awesome!". Reachable for completeness, hidden '
           'from the Library because it carries no content.',
      hide='2-second fragment, entire transcript is four words of agreement',
      person='', setting='Workshop — mums'),
 dict(src='IMG_7797.MOV', tx='IMG_7797', folder='Content Library/IFM Sept feedback',
      title='Feedback — the ask: a two-hour session on mutual funds alone (28s)',
      type='Session Video', shot='Testimonial — video', quality='Hero', status='Raw',
      keywords='feedback,september 2026,mutual funds,product request,two hour,short format,'
               'corporate,repeat attendance,what next,women',
      desc='Hiral asks what people would want next — other topics, a different format — and '
           'gets a specific answer worth acting on: a short standalone session, "just a '
           'two-hour thing, maybe just mutual funds", which the speaker says she would come '
           'back for. She raises it in the context of an organisation she has mentioned '
           'earlier, so it reads as both a personal and a corporate ask. Twenty-eight '
           'seconds, and the clearest product signal in the September feedback.',
      person='Hiral Goel', setting='Workshop — mums'),
 dict(src='IMG_7798.MOV', tx='IMG_7798', folder='Content Library/IFM Sept feedback',
      title='Feedback session — 2-second fragment, sign-off only',
      type='Session Video', shot='Testimonial — video', quality='Raw-backup', status='Raw',
      keywords='feedback,september 2026,fragment,offcut,unusable',
      desc='Two seconds of someone saying they are happy to catch up and will see the group '
           'at the end. Housekeeping, not content. Reachable, hidden from the Library.',
      hide='2-second fragment, housekeeping sign-off only',
      person='', setting='Workshop — mums'),
 # ------------------------------------------------------- IFM (sharing experience) --------
 dict(src='IMG_7807.MOV', tx='IMG_7807', folder='Content Library/IFM (sharing experience)',
      title='"It is very empowering" — and having nowhere to ask questions before (39s)',
      type='Session Video', shot='Testimonial — video', quality='Hero', status='Raw',
      keywords='testimonial,september 2026,empowering,i did it myself,confidence,'
               'nowhere to ask,questions,dependence,women,sharing experience',
      desc='Thirty-nine seconds of participants comparing notes on how the course felt. The '
           'line to use is "I think it is very empowering", followed immediately by "I feel '
           'like I did it by myself" — the shift from being taught to being able. The reason '
           'it lands is the admission just after it: before this, "I feel lost, and I don\'t '
           'have a place to ask questions", with the alternative being waiting for a man in '
           'the family to come round and explain basic things. One speaker also says she '
           'wishes there were something next. Several voices overlap, so quote the two '
           'clear lines and listen back before using the rest.',
      person='Hiral Goel', setting='Workshop — mums'),
 dict(src='IMG_7808.MOV', tx='IMG_7808', folder='Content Library/IFM (sharing experience)',
      title='On commitment, attention span, and Hiral committing to a refresher (23s)',
      type='Session Video', shot='Testimonial — video', quality='Usable', status='Raw',
      keywords='september 2026,attention span,commitment,short format,refresher,'
               'course design,teens,product signal,sharing experience',
      desc='Twenty-three seconds about why a long intense course is the wrong shape for some '
           'audiences: attention span is short and "they don\'t want more commitment, they '
           'don\'t want something so intense", so it has to be delivered one way rather than '
           'demanding much back. Hiral answers that she is "definitely doing one refresher, '
           'maybe a few months down the line". Read together with the two-hour mutual-funds '
           'ask in IFM-560, it is the same signal twice: shorter formats, and a way back in '
           'after the course ends.',
      person='Hiral Goel', setting='Workshop — mums'),
 # --------------------------------------------------------------------- HG reel -----------
 # The three numerically-named cuts turned out to be NEWS EXPLAINERS, which the filenames
 # gave no hint of. Each is described from its transcript. Two of them appear not to have
 # been published yet -- see the note on each -- which is the most useful thing this batch
 # found, so it is stated on the row rather than left for someone to notice.
 dict(src='1790143628609610.mp4', tx=None, folder='Content Library/HG reel ',
      title='Tata Sons listing — the consolidated cut: Trusts, philanthropy and the '
            'boardroom (2 min)',
      type='Reel', shot='Hiral — teaching', quality='Hero', status='Raw',
      keywords='tata sons,tata,rbi,listing,ipo,holding company,tata trusts,noel tata,'
               'philanthropy,tcs,tata motors,tata steel,air india,tata electronics,'
               'shareholders,news explainer,september 2026,hiral,to camera',
      desc='A two-minute news explainer, piece to camera, on why the RBI is pushing Tata '
           'Sons towards a listing. It opens on one number — roughly ₹2 lakh crore of assets '
           '— then explains that listing would force disclosure and make Tata Sons answerable '
           'to public shareholders. The heart of it is why this matters to an ordinary '
           'investor: today you can only buy a listed Tata company such as Tata Motors or '
           'Tata Steel, whereas Tata Sons sits at the top and also owns unlisted businesses '
           'including Air India and Tata Electronics, so a listing would let people buy into '
           'the holding company itself. It then covers the opposition — Tata Trusts, which '
           'holds about 66%, argues public shareholders would change how the group balances '
           'business against philanthropy — and Noel Tata\'s counter-proposal to split Tata '
           'Sons into smaller entities. It closes on a boardroom question about a chairman '
           'reappointment. Ends with the founder sign-off.',
      note_extra='Content matches no post in ifm-published.json, whose latest Tata reel is '
                 '24 Sep — but that file was captured on 28 Sep and this cut is dated 29 Sep, '
                 'so it is either unpublished or published after the last capture. Worth '
                 'checking before it is treated as a finished asset going spare. It is a '
                 'fuller cut than the 24 Sep reel: it adds the Trusts/philanthropy argument, '
                 'the split proposal and the boardroom item. Names are transcribed '
                 'phonetically and two are garbled, so verify any name before quoting. ',
      person='Hiral Goel', setting='Studio/Posed', speech=True),
 dict(src='1790249310609002.mp4', tx=None, folder='Content Library/HG reel ',
      title='Tata Sons listing — the NBFC cut: why the RBI rejected the plea to stay private '
            '(105s)',
      # 'Ready', not 'Published'. The content match is strong but it is a match, not proof,
      # and either wrong answer costs something: marked Published, a genuinely unposted reel
      # goes unused; marked Published wrongly the other way, someone re-posts a duplicate.
      # 'Ready' means finished and usable, which is the part that IS established.
      type='Reel', shot='Hiral — teaching', quality='Hero', status='Ready',
      keywords='tata sons,tata,rbi,nbfc,upper layer,regulation,listing,ipo,non-banking '
               'financial company,2 lakh crore,tcs,titan,tata motors,air india,'
               'tata electronics,noel tata,news explainer,september 2026,hiral,to camera',
      desc='The regulatory version of the Tata Sons story, and the clearer of the two cuts on '
           'the mechanism. It explains what Tata Sons actually is — an NBFC, which can '
           'provide financial services like a bank but cannot take deposits — and that the '
           'RBI sorts NBFCs into four layers, base, middle, upper and top, regulating the '
           'bigger ones harder. Tata Sons sits in the upper layer because it manages over '
           '₹2 lakh crore against a ₹1 lakh crore threshold, and for an upper-layer NBFC '
           'listing is a regulatory requirement rather than a choice. It notes that Tata Sons '
           'applied about two years ago to surrender its NBFC registration and the RBI '
           'rejected it, then covers why buying the holding company would matter and Noel '
           'Tata\'s proposal to split it. Ends with the founder sign-off.',
      note_extra='This is almost certainly the master of the reel published 24 Sep 2026 '
                 '("The RBI just forced the House of Tata into a final showdown"), whose '
                 'caption also says the RBI rejected the plea to stay private and cites the '
                 '₹2 lakh crore figure. That post did 1,171 views and 23 likes, against '
                 '13,700 views on the 16 Sep Tata reel — the same story, an order of '
                 'magnitude apart. Not linked by id: the numeric filename appears nowhere in '
                 'ifm-published.json, so the match is by content, not proof. ',
      person='Hiral Goel', setting='Studio/Posed', speech=True),
 dict(src='1790615574173140.mp4', tx=None, folder='Content Library/HG reel ',
      title='Where your insurance premium actually goes — the IRDAI commission proposals (79s)',
      type='Reel', shot='Hiral — teaching', quality='Hero', status='Raw',
      keywords='insurance,premium,irdai,commission,distributors,bundling,life insurance,'
               'general insurance,expenses,loan,mis-selling,regulation,news explainer,'
               'september 2026,hiral,to camera',
      desc='A 79-second explainer that breaks a ₹100 premium into where the money actually '
           'goes: paying claims, the insurer\'s own costs, and commissions to the '
           'distributors who sold the policy. It gives the numbers — about ₹22 of every ₹100 '
           'for private insurers, about ₹32 for general insurers — and then the statistic the '
           'piece turns on: between 2023 and 2025 new life insurance business grew 28% while '
           'distributor payouts grew 125%, so the cost of selling grew more than four times '
           'as fast as the business. That is why the IRDAI is proposing tighter limits on '
           'commissions and overall expenses. It closes on bundling — being told to buy '
           'insurance alongside a loan — which the proposals would stop. It is careful to say '
           'these are proposals, not final rules.',
      note_extra='No insurance or IRDAI post exists anywhere in ifm-published.json, so this '
                 'finished reel appears NOT to have been published. The file is dated 28 Sep '
                 'and the published file was captured 28 Sep, so confirm before acting. If it '
                 'is genuinely unposted it is a complete, topical asset sitting unused. ',
      person='Hiral Goel', setting='Studio/Posed', speech=True),
 dict(src=None, folder='Content Library/HG reel ', tx=None, cover='IMG_7724.MOV',
      title='HG reel — the 14 raw takes (24 Sep 2026)',
      type='Session Video', shot='Hiral — teaching', quality='Raw-backup', status='Raw',
      keywords='hiral,reel,takes,raw,september 2026,catch-all,to camera',
      desc='Catch-all for the fourteen raw takes shot on 24 September 2026 in the HG reel '
           'folder — IMG_7691 through IMG_7724, 1.5 GB in total. Opens the folder, not a '
           'single file. The three finished cuts that came out of this shoot are catalogued '
           'separately. Individual takes have not been pulled out, and would only be worth '
           'doing if a specific line is wanted.',
      person='Hiral Goel', setting='Studio/Posed'),
 # ------------------------------------------------------------- Aakara September ----------
 dict(src=None, folder='IFM (Aakara delivery tree)/September/Reels/Testimonials',
      tx=None, cover='testimonials 01.png',
      title='September: Testimonials — reel artboards',
      type='Carousel', shot='Testimonial — text', quality='Hero', status='Ready',
      source='Aakara',
      keywords='september,testimonials,reviews,social proof,aakara,reel,artboards,finished',
      desc='Two finished testimonial artboards delivered by Aakara in the September Reels '
           'tree on 28 September 2026. Delivered as artwork only — there is no video file in '
           'the folder, so this is the graphic set rather than a cut reel.',
      person='', setting='Not applicable'),
 dict(src='EFBFBA02-B38C-494D-930F-B1D21A7FA88C.MP4', tx=None,
      folder='IFM (Aakara delivery tree)/September/Reels/Asset vs liab',
      cover='asset liability.png',
      title='September: Asset or liability? — the rapid-fire game reel',
      type='Reel', shot='', quality='Hero', status='Ready', source='Aakara',
      keywords='september,assets,liabilities,asset or liability,game,quiz,rapid fire,'
               'credit card debt,home loan,car loan,gold,mutual funds,designer bag,'
               'luxury watch,reel,aakara,basics,net worth,humour',
      desc='A 37-second call-and-response game rather than an explainer: "I\'ll name something '
           'and you tell me asset or liability." It runs through stocks, credit card debt, '
           'gold, a home loan, mutual funds, a house, a car, a car loan, a designer bag and a '
           'luxury watch, and the teaching point lands on the two that surprise people — the '
           'bag and the watch are assets, followed by "an asset doesn\'t have to be a good '
           'investment". It ends on a joke: asked about "your husband", the answer is "good '
           'one". Delivered by Aakara as a finished MP4 with its own cover artboard; the row '
           'links the video and the thumbnail comes from the cover.',
      person='', setting='Not applicable', speech=True),
 dict(src=None, folder='IFM (Aakara delivery tree)/September/Reels/Gold Stocks',
      tx=None, cover='gold stocks 2.png',
      title='September: Gold stocks — cover artboard (reel not delivered)',
      type='Carousel', shot='', quality='Usable', status='Draft', source='Aakara',
      keywords='september,gold,gold stocks,reel,cover,artboard,aakara,incomplete,awaiting',
      desc='The cover artboard for a September reel on gold stocks, delivered 25 September '
           '2026. The reel itself is not in the folder — the artboard is the only file '
           'present, so this row is the cover and the video is still outstanding from '
           'Aakara. Typed as artwork rather than video on purpose: there is nothing to play.',
      person='', setting='Not applicable'),
 # ----------------------------------------------------------------- IFM Sept 2026 ---------
 dict(src=None, folder='Content Library/IFM Sept 2026', tx=None, cover='IMG_7616.MOV',
      title='September 2026 session shoot — full folder (102 files, 10.2 GB)',
      type='Session Video', shot='Students', quality='Raw-backup', status='Raw',
      keywords='september 2026,session,workshop,shoot,raw,catch-all,students,classroom,'
               'delhi,participants',
      desc='Catch-all for the September 2026 session shoot: 102 video files totalling '
           '10.2 GB, filmed between 21 and 29 September 2026. Nothing in the catalogue '
           'reached this folder before today, which is why 102 files showed as unreachable '
           'in the 30 September scan. Opens the folder, not a single file. The individual '
           'teaching moments have not been pulled out of this shoot yet — that is a '
           'transcription-and-moments pass, and it is the next piece of work on this folder.',
      person='', setting='Workshop — mums'),
]


def load_data():
    s = open(DATA, encoding='utf-8').read()
    a = s.index('window.IFM_DATA =') + len('window.IFM_DATA =')
    b = s.rindex(';')
    return s[:a], json.loads(s[a:b]), s[b:]


def resolve():
    new = json.load(open(NEW))
    scan = json.load(open(SCAN))
    p2f = {}
    for fid, f in scan['folders'].items():
        p2f.setdefault(f['path'], fid)
    byname = collections.defaultdict(dict)
    for fid, x in new.items():
        byname[os.path.dirname(x['path'])][x['name']] = dict(x, fid=fid)
    return p2f, byname


def build():
    p2f, byname = resolve()
    _, d, _ = load_data()
    nums = [int(m.group(1)) for r in d['catalogue'] if (m := re.match(r'IFM-(\d+)$', r['id']))]
    nxt = max(nums) + 1
    existing = {r['id'] for r in d['catalogue']}
    out = []
    for spec in ROWS:
        folder = spec['folder']
        files = byname.get(folder, {})
        fid = p2f.get(folder)
        if not fid:
            raise SystemExit('cannot resolve folder in scan: %r' % folder)
        covname = spec.get('cover') or spec['src']
        cov = files.get(covname)
        if not cov:
            raise SystemExit('cover %r not found in %s (have %d files)'
                             % (covname, folder, len(files)))
        if spec['src']:
            tgt = files.get(spec['src'])
            if not tgt:
                raise SystemExit('link target %r not in %s' % (spec['src'], folder))
            link = DFILE % tgt['fid']
        else:
            link = DFOLDER % fid
        rid = 'IFM-%03d' % nxt
        if rid in existing:
            raise SystemExit('id collision on %s' % rid)
        nxt += 1
        # The clip source is NOT always the cover. IFM-569 is a reel whose cover is a PNG
        # artboard and whose playable file is the MP4, and a Video row with no clip fails the
        # visibility gate -- so the clip source is named separately rather than inferred.
        needs_clip = VIDEO_TYPES.get(spec['type']) == 'Video'
        clipsrc = spec['src'] if (spec['src'] and
                                  spec['src'].lower().endswith(('.mov', '.mp4'))) \
            else (cov['name'] if cov['name'].lower().endswith(('.mov', '.mp4')) else None)
        if needs_clip and not clipsrc:
            raise SystemExit('%s is typed %s (a Video) but has no video file to clip from'
                             % (rid, spec['type']))
        cl = files.get(clipsrc) if clipsrc else None
        out.append(dict(spec, id=rid, link=link, cover_id=cov['fid'],
                        cover_name=cov['name'], folder_id=fid, date=cov['mod'],
                        needs_clip=needs_clip,
                        clip_id=(cl['fid'] if cl else None),
                        clip_name=(cl['name'] if cl else None)))
    return out


def main():
    rows = build()
    if '--plan' in sys.argv:
        print('%d rows, %s .. %s\n' % (len(rows), rows[0]['id'], rows[-1]['id']))
        for r in rows:
            print('%s  %-68s' % (r['id'], r['title'][:68]))
            print('          %-11s %-11s %s  link=%-6s cover=%-24s clip=%-24s%s'
                  % (r['type'], r['quality'], r['date'],
                     'file' if r['src'] else 'FOLDER', r['cover_name'],
                     r['clip_name'] if r['needs_clip'] else '(not a video row)',
                     '  HIDDEN' if r.get('hide') else ''))
        print('\nhidden from Library: %s'
              % ', '.join(r['id'] for r in rows if r.get('hide')))
        print('publication-restricted: %s'
              % ', '.join(r['id'] for r in rows if r.get('restricted')))
        return
    if '--media' in sys.argv:
        # One job per DOWNLOAD, not per row. Where the cover and the clip are the same file
        # (which is most rows) that is one job doing both; IFM-569's PNG cover and MP4 body
        # are two. Keeps the 1.19 GB file from being fetched twice.
        jobs = []
        for r in rows:
            same = r['needs_clip'] and r['clip_id'] == r['cover_id']
            jobs.append({'id': r['id'], 'cover_id': r['cover_id'],
                         'cover_name': r['cover_name'],
                         'want_clip': same,
                         'want_speech': bool(r.get('speech')) and same})
            if r['needs_clip'] and not same:
                jobs.append({'id': r['id'], 'cover_id': r['clip_id'],
                             'cover_name': r['clip_name'], 'thumb': False,
                             'want_clip': True, 'want_speech': bool(r.get('speech'))})
        json.dump(jobs, open('/tmp/rowmedia.json', 'w'), indent=1)
        print('wrote /tmp/rowmedia.json — %d downloads for %d rows; %d clips, %d transcripts'
              % (len(jobs), len(rows), sum(j['want_clip'] for j in jobs),
                 sum(j['want_speech'] for j in jobs)))
        missing = [r['id'] for r in rows if r['needs_clip'] and not r['clip_id']]
        if missing:
            print('!! video rows with no clip source: %s' % missing)
        return
    if '--write' in sys.argv:
        write(rows)
        return
    print(__doc__.strip().splitlines()[0])
    print('pass --plan, --media or --write')


def write(rows):
    head, d, tail = load_data()
    cat = d['catalogue']
    have = {r['id'] for r in cat}
    thumbs = os.path.join(HERE, '..', 'thumbs')
    clips = os.path.join(HERE, '..', 'clips')

    # Refuse to write a row the Library would hide anyway. A row with no thumbnail is
    # invisible, and a Video row with no clip is invisible -- writing either produces
    # plumbing with nothing on the page, which is the failure this batch is meant to avoid.
    problems = []
    for r in rows:
        if r['id'] in have:
            problems.append('%s already exists' % r['id'])
        if not os.path.exists(os.path.join(thumbs, '%s.jpg' % r['id'])):
            problems.append('%s has no thumbnail' % r['id'])
        if r['needs_clip'] and not os.path.exists(os.path.join(clips, '%s.mp4' % r['id'])):
            problems.append('%s is a Video row with no preview clip' % r['id'])
    if problems:
        print('refusing to write — %d problems:' % len(problems))
        for p in problems:
            print('   ' + p)
        print('\nrun media-for-rows.py first, or fix the above. data.js untouched.')
        return 1

    for r in rows:
        row = {
            'id': r['id'], 'title': r['title'], 'type': r['type'],
            'source': r.get('source', 'In-house'), 'status': r['status'],
            'keywords': r['keywords'],
            'description': r.get('restricted', '') + r['desc'],
            'drive link': r['link'], 'date created': r['date'],
            'notes': NOTE + r.get('note_extra', '') + (
                'Described from the transcript of the clip, not from its appearance, and the '
                'transcript is filed in speech/%s.json so the words themselves are '
                'searchable. ' % r['id'] if r.get('tx') or r.get('speech') else '') + (
                'Preview clip built 30 Sep 2026 and named in `video` so media-audit.py can '
                'probe it. ' if r['needs_clip'] else ''),
            'thumbnail': 'thumbs/%s.jpg' % r['id'],
            'shot': r['shot'], 'setting': r['setting'], 'quality': r['quality'],
            'consent': 'Adults only',
            'session': '', 'social': '',
            'video': CLIPURL % r['id'] if r['needs_clip'] else '',
        }
        # No `person` key is written. It is not a data.js field -- backfill.py derives it from
        # the description with person_for(), and 557 existing rows have none. Writing one
        # would add a field nothing reads, which is worse than useless because the next person
        # to look would reasonably assume it is authoritative.
        cat.append(row)

    # The three unusable fragments are hidden here rather than left out of data.js, so the
    # hub can still reach the files. Same mechanism as IFM-459.
    enrich = json.load(open(ENRICH, encoding='utf-8'))
    for r in rows:
        if r.get('hide'):
            enrich[r['id']] = {'library': False, '_why': r['hide'] +
                               '. Row kept so the file stays reachable from the hub; hidden '
                               'from the Library because a result nobody can use is the '
                               'thing the visibility rule exists to prevent.'}
    json.dump(enrich, open(ENRICH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # File the transcripts already made by the standalone pass under their row ids.
    os.makedirs(SPEECH, exist_ok=True)
    filed = 0
    for r in rows:
        if not r.get('tx'):
            continue
        p = '/tmp/tx_%s_MOV.json' % r['tx']
        if not os.path.exists(p):
            print('   !! transcript missing for %s (%s)' % (r['id'], r['tx']))
            continue
        t = json.load(open(p, encoding='utf-8'))
        json.dump({'id': r['id'], 'dur': t['dur'], 'segments': t['segments'],
                   'text': t['text'], 'source_file': t['name']},
                  open(os.path.join(SPEECH, '%s.json' % r['id']), 'w', encoding='utf-8'),
                  ensure_ascii=False)
        filed += 1

    # IFM Games gained 32 files and keeps its single row. Say so on the row, so the next
    # person does not read the old note and conclude the folder is only the 12 files it lists.
    games = next((x for x in cat if x['id'] == 'IFM-477'), None)
    if games:
        add = (' Re-checked 30 Sep 2026: the folder has since grown to 32 files (through '
               'IMG_2384, to 29 Sep 2026). It keeps ONE row — the folder is the deliverable '
               'and a second row on the same folder would be a duplicate.')
        if 'grown to 32 files' not in (games.get('notes') or ''):
            games['notes'] = (games.get('notes') or '') + add

    open(DATA, 'w', encoding='utf-8').write(head + json.dumps(
        d, ensure_ascii=False, indent=1) + tail)
    print('wrote %d rows (%s..%s) to data.js' % (len(rows), rows[0]['id'], rows[-1]['id']))
    print('  %d transcripts filed under speech/' % filed)
    print('  %d rows hidden via enrichment.json' % sum(1 for r in rows if r.get('hide')))
    print('  IFM-477 note updated' if games else '  !! IFM-477 not found')
    print('\nnext: backfill.py, then deploy the clips, then media-audit.py, then deploy again')
    return 0


if __name__ == '__main__':
    main()
