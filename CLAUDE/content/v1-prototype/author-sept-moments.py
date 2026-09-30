#!/usr/bin/env /usr/bin/python3
"""Author the content moments for the five substantive September feedback rows.

    /usr/bin/python3 author-sept-moments.py --check    # verify against the transcripts only
    /usr/bin/python3 author-sept-moments.py --write    # write moments/IFM-NNN.json

WHY THESE FIVE AND NOT ALL SEVENTEEN
    A moment is a span worth finding on its own. Nine of the new rows are video; three of
    those are 2-6 second fragments with nothing in them, the three HG reel cuts and two
    catch-alls are not talk-and-explain material, and the Aakara reels are 40 seconds of
    finished graphics. That leaves IFM-555, 557, 560, 562 and 563 -- the feedback
    conversation -- which is exactly where a three-minute recording hides its useful parts.

ONE MOMENT IS NOT ABOUT CONTENT AT ALL
    IFM-557 gets a moment marking the span the speaker asked not to be published. It is the
    only way an editor scrubbing that clip for a usable cut can see where the restriction
    starts and stops. Its evidence is her own words, so it validates like any other.

EVERY `evidence` BELOW WAS COPIED OUT OF THE TRANSCRIPT, NOT RECALLED
    --check re-reads speech/ and proves each string is present and inside its span before
    anything is written. Whisper's word choices are kept exactly, including the places where
    it mis-hears ("bounding of the SIP" for compounding), because the rule is that a moment
    may not contain anything the transcript does not say -- tidying the quote would break the
    only mechanical guard there is.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEECH = os.path.join(HERE, 'speech')
STORE = os.path.join(HERE, 'moments')
TX = '/tmp/tx_%s_MOV.json'

# row id -> (transcript file stem, [moments])
M = {
 'IFM-555': ('IMG_7791', [
  dict(title='She asked the man who manages her assets for the full history, the same morning',
       summary='Asked how confident she feels after the course, a participant says she has '
               'already acted on it: that morning she asked the person who manages her assets '
               'for the whole trajectory since she began, because she now wants to see what '
               'has been done, understand it, make changes, and diversify. She says she never '
               'thought about it in all this time.',
       start=26.0, end=43.0, weight='primary',
       evidence='I asked my guy who manages my assets and we are full trajectory from the day '
                'I began. Actually I want to see what I have been doing. I want to understand '
                'also and then make changes and I am actually thinking of diversifying and '
                'investing differently.',
       search_terms=['diversification', 'assets', 'personal experience']),
  dict(title='She was afraid of investing; the shift was realising it is not that tough',
       summary='A second participant says she was really afraid of investing and never wanted '
               'to learn anything about it, and that the big change is simply understanding — '
               'she repeats "I understand" three times and lands on "it is not that tough".',
       start=48.0, end=62.0, weight='primary',
       evidence='I was really afraid of, like investing never wanted to learn anything but '
                'yeah this is really made it. I mean I feel like I can understand. I think '
                'big learning for me has been like oh I understand, I understand, I '
                'understand. It is not that tough.',
       search_terms=['fear of investing', 'scared of investing', 'overcoming fear',
                     'transformation']),
  dict(title='The aha moment: how an SIP compounds, and that she can still start for her kids',
       summary='Asked for the biggest aha moment, the answer is compounding — she felt she '
               'had missed the bus, then realised she can start for her children instead, and '
               'says it is crazy how it compounds and that she never realised it was like '
               'that. The transcript renders compounding as "bounding of the SIP".',
       start=77.4, end=95.4, weight='primary',
       evidence='bounding of the SIP. Yeah. And you know it was just wow. Like the longer you '
                'called it I just felt like I missed the bus. But no for our kids we can '
                'start, it\'s just crazy how it compounds.',
       search_terms=['sip', 'compounding', 'starting to invest', 'memorable statement']),
  dict(title='Judging a fund against the index instead of in absolute terms',
       summary='A participant says the useful shift was in how to evaluate: people look at '
               'returns in quite absolute terms, and benchmarking properly against the index '
               'gives a deeper view of what is working and what is not.',
       start=103.4, end=120.4, weight='secondary',
       evidence='we look at it in quite absolute terms but I think when you\'re benchmarking '
                'in the right way against the index it gives you a slightly deeper '
                'perspective',
       search_terms=['benchmarking', 'index', 'misconception corrected']),
  dict(title='Family money felt like it was in "more able hands", so she never stepped in',
       summary='Asked what she has since said to her husband or father, a participant '
               'describes the default she is leaving behind: when family money is already '
               'being managed you assume those are more able hands and so you do not get '
               'involved at all. What has changed is wanting to treat it as a unit, be aware, '
               'and be part of the conversation.',
       start=150.4, end=175.4, weight='primary',
       evidence='when typically money you have as a family is being managed. You feel like '
                'those are more able hands so then you don\'t really step in or get involved '
                'at all. But I think it is important to look at it still as a unit and be '
                'aware and part of the conversation',
       search_terms=['family money conversation', 'investing confidence',
                     'memorable statement']),
 ]),
 'IFM-557': ('IMG_7794', [
  dict(title='She can ask sensible questions now, and understands the terms',
       summary='The speaker opens by saying she understands more, can actually ask sensible '
               'questions, and now recognises the terminology — and repeats that she feels '
               'more aware.',
       start=1.0, end=17.0, weight='primary',
       evidence='I can actually ask sensible questions and before when I understand some '
                'terms, I almost importantly have something that I can go back to. I feel '
                'more aware, I just feel more aware.',
       search_terms=['asking questions', 'jargon', 'investing confidence']),
  dict(title='The book is what she can go back to when the brain fog takes the rest',
       summary='She says the workbook is the part that lasts: with brain fog she expects to '
               'forget everything, and what matters is that the book is there to go back to.',
       start=23.0, end=33.0, weight='primary',
       evidence='I think the book is really good because at the end of the day, I know with '
                'my brain fog, I\'m going to forget everything. But the point is it\'s '
                'amazing that this is there to give, I mean to go back.',
       search_terms=['book', 'brain fog', 'personal experience']),
  dict(title='The most fun part was being able to ask anything at all',
       summary='Asked what the most fun part of the workshop was, she answers that it was '
               'being able to ask any question, and credits the facilitator with being '
               'consistently patient about answering them.',
       start=46.0, end=64.1, weight='primary',
       evidence='What was the most fun part of this workshop? I think being able to ask any '
                'question and the fact that you\'ve always been extremely patient about '
                'answering all.',
       search_terms=['asking questions', 'teaching style', 'safe space']),
  dict(title='RESTRICTED — the speaker asks twice that this passage not be published',
       summary='From about 1:04 to 1:24 the speaker twice asks for what she is saying not to '
               'be used: "and don\'t put this on", then "please don\'t put that on". The '
               'passage covers her having had a lot of questions and switching into the '
               'Monday class after seeing another participant there. Recorded as a moment so '
               'that anyone cutting this clip can see exactly where the restriction begins '
               'and ends. Do not publish this span without going back to her.',
       start=64.1, end=84.1, weight='secondary',
       evidence='And don\'t put this on, I actually came on a Monday class.',
       search_terms=['monday class']),
 ]),
 'IFM-560': ('IMG_7797', [
  dict(title='The ask: a standalone two-hour session on mutual funds alone',
       summary='Asked what people would want next, a participant asks for a short standalone '
               'session — a two-hour thing on just mutual funds — and says she would really '
               'come back for that. She raises it in the context of an organisation discussed '
               'earlier, so it reads as a corporate ask as well as a personal one.',
       start=14.8, end=25.7, weight='primary',
       evidence='I would love if you know you had something like a just a two-hour thing '
                'maybe just mutual funds yeah I would really come back for that for the '
                'mutual funds',
       search_terms=['mutual funds', 'two-hour']),
 ]),
 'IFM-562': ('IMG_7807', [
  dict(title='"It is very empowering" — and "I feel like I did it by myself"',
       summary='The clearest line in the clip: a participant calls the programme very '
               'empowering, and the reason lands in the sentence just after — she feels like '
               'she did it by herself, rather than having been carried through it.',
       start=14.0, end=22.0, weight='primary',
       evidence='So I think it\'s very empowering. That\'s why you feel like, oh, my god, you '
                'know. I know. I feel like I did it by myself.',
       search_terms=['empowering', 'did it by myself', 'transformation']),
  dict(title='Before this she felt lost, with nowhere to ask questions',
       summary='The admission that gives the empowerment line its weight: she says she feels '
               'lost and has no place to ask questions, and the alternative described just '
               'after is waiting for a man in the family to come round and explain basic '
               'things.',
       start=26.0, end=29.5, weight='primary',
       evidence='I feel lost. And I don\'t have a place to ask questions.',
       search_terms=['asking questions', 'lost', 'personal experience']),
 ]),
 # The three news explainers and the Aakara game reel. Their transcripts were written
 # straight to speech/ by media-for-rows.py, so the stem is None and the source is speech/.
 'IFM-564': (None, [
  dict(title='Why the RBI is pushing Tata Sons to list: it starts with ₹2 lakh crore',
       summary='The opening frames the whole story on one number — roughly ₹2 lakh crore of '
               'assets. Tata Sons has been private all these years, and it is the size of the '
               'balance sheet plus its stakes across the group that brings the RBI in.',
       start=0.0, end=21.0, weight='primary',
       evidence='Why is the RBI pushing TataSans towards the listing? The answer starts with '
                'one number, rupees 2 lakh crore. That\'s roughly the size of TataSans '
                'assets.',
       search_terms=['tata sons', 'rbi', '2 lakh crore', 'stock market listing']),
  dict(title='What listing would change: disclosure, and answering to public shareholders',
       summary='The mechanism, in one line: once it lists, more about what the company does '
               'and earns becomes public, and it acquires public shareholders it has to '
               'answer to.',
       start=21.0, end=32.9, weight='primary',
       evidence='Once TataSans list, more information about what TataSans does, earns will be '
                'made available to the public. And TataSans will have the public shareholders '
                'to answer to.',
       search_terms=['tata sons', 'public shareholders', 'stock market listing']),
  dict(title='Why an investor should care: today you cannot buy the parent, only the pieces',
       summary='The part aimed at the viewer. Tata Sons sits at the top and owns pieces of '
               'TCS, Tata Motors and Tata Steel, plus unlisted businesses including Air India '
               'and Tata Electronics. Today you can only buy a listed Tata company; a listing '
               'would let people buy into the parent itself.',
       start=48.2, end=69.2, weight='primary',
       evidence='TataSans sits at the top of the Tata Group and it owns pieces of many listed '
                'companies like TCS, Tata Motors or Tata Steel. If TataSans list, investors '
                'could get a chance to buy a piece of the mothership which not only owns '
                'these listed companies but some unlisted ones like Air India and Tata '
                'Electron.',
       search_terms=['tata sons', 'holding company', 'air india', 'tcs']),
  dict(title='Tata Trusts opposes it — public shareholders versus philanthropy',
       summary='The objection, and it is the most quotable part: Tata Trusts, which owns about '
               '66%, argues that bringing in public shareholders could change how the group '
               'balances business against philanthropy. Noel Tata has proposed splitting Tata '
               'Sons into smaller entities instead.',
       start=69.2, end=91.3, weight='primary',
       evidence='The Tata Trust which own about 66% of TataSans is against listing for this '
                'very reason. Their argument is bringing public shareholders into TataSans '
                'could change the way TataSans balances business with philanthropy. So Noel '
                'Tata, the chairman of the Tata Trust has proposed splitting TataSans into '
                'smaller entities.',
       search_terms=['tata trust', 'philanthropy', 'noel tata', 'tata sons']),
  dict(title='A boardroom question over a chairman reappointment — names unverified',
       summary='The closing item raises a question about someone\'s role in the reappointment '
               'of the Tata Sons chairman, and about business links to his family. The '
               'automatic transcript garbles both surnames here, so the substance is recorded '
               'but no name from this passage should be quoted or published without listening '
               'back to the audio first.',
       start=91.3, end=107.6, weight='secondary',
       evidence='And there\'s another development inside the TataSans boardroom.',
       search_terms=['boardroom', 'tata sons']),
 ]),
 'IFM-565': (None, [
  dict(title='What an NBFC actually is, and the four layers the RBI sorts them into',
       summary='The clearest explanation across both Tata cuts: an NBFC can provide financial '
               'services like a bank but cannot take savings or fixed deposits, and the RBI '
               'sorts NBFCs into four layers — base, middle, upper and top — regulating the '
               'bigger ones harder.',
       start=3.9, end=30.6, weight='primary',
       evidence='TataSans is an NBFC or a non-banking financial. In simple terms, an NBFC can '
                'provide financial services like a bank, but it cannot take savings or fixed '
                'deposit. Now, the RBI doesn\'t treat every NBFC the same. It puts them into '
                'four layers, base, middle, upper and top.',
       search_terms=['nbfc', 'non-banking financial company', 'rbi']),
  dict(title='In the upper layer, listing is a regulatory requirement rather than a choice',
       summary='Why the obligation exists at all: Tata Sons manages over ₹2 lakh crore against '
               'a ₹1 lakh crore threshold, which puts it in the upper layer, and for an '
               'upper-layer NBFC listing becomes part of the regulatory requirement.',
       start=30.6, end=52.9, weight='primary',
       evidence='Because TataSans manages assets over 2 lakh crore, well about the 1 lakh '
                'crore threshold for this category. And once an NBFC enters the upper layer, '
                'listing becomes part of its regulatory requirement.',
       search_terms=['nbfc', 'stock market listing', '2 lakh crore', 'tata sons']),
  dict(title='It asked to give up its NBFC registration two years ago and the RBI refused',
       summary='The fact that makes the story current: about two years ago Tata Sons applied '
               'to surrender its NBFC registration and the RBI rejected the application. Noel '
               'Tata\'s proposal to split the company is the response, and is only a proposal.',
       start=77.7, end=92.9, weight='primary',
       evidence='About 2 years ago, TataSans made an application to the RBI to give up its '
                'NBFC registration. But the RBI just rejected it. Now Noel Tata has proposed '
                'splitting TataSans into smaller entities. It\'s only a proposal at this '
                'stage.',
       search_terms=['nbfc', 'rbi', 'noel tata', 'tata sons']),
 ]),
 'IFM-566': (None, [
  dict(title='Where ₹100 of your insurance premium actually goes',
       summary='The premise, broken into three parts: some of every ₹100 pays claims, some '
               'covers the insurer\'s own costs, and some pays commission to the distributor '
               'who sold the policy. The cost of doing business is about ₹22 per ₹100 for '
               'private insurers and about ₹32 for general insurers.',
       start=0.0, end=25.8, weight='primary',
       evidence='You pay a premium for your insurance but how much of your money actually '
                'goes towards your insurance? Let\'s break down 100 rupees to understand '
                'where it goes. Some goes towards paying claims, some goes towards the '
                'insurance company\'s costs and some goes towards paying commissions to '
                'distributors who actually sell you the policy.',
       search_terms=['insurance premium', 'insurance commission', 'claims']),
  dict(title='Business grew 28%, distributor payouts grew 125% — so IRDAI wants limits',
       summary='The statistic the whole piece turns on: between 2023 and 2025 new life '
               'insurance business grew 28% while distributor payouts grew 125%, meaning the '
               'cost of selling grew more than four times as fast as the business. That is '
               'why the IRDAI is proposing tighter limits on commissions and overall '
               'expenses.',
       start=25.8, end=51.7, weight='primary',
       evidence='between 2023 and 2025 new life insurance business grew by 28% but '
                'distributor payouts grew 125%. So the business grew but the cost of selling '
                'it grew more than four times as fast. So the IRDAI is proposing tighter '
                'limits on commissions as well as overall expenses.',
       search_terms=['irdai', 'insurance commission', 'life insurance']),
  dict(title='Bundling — being told to buy insurance along with your loan',
       summary='Defines bundling in plain terms: you take a loan and are told here is the '
               'insurance you have to buy with it. The proposals would stop loans being '
               'bundled with insurance. The piece is explicit that these are proposals and '
               'not final rules.',
       start=51.7, end=68.0, weight='primary',
       evidence='Then there\'s the concept of bundling. When you take a loan and you\'re told '
                'that here\'s your loan and here\'s the insurance you need to buy with it '
                'that\'s called bundling. The proposal aims to make sure that loans are no '
                'longer bundled with insurance.',
       search_terms=['bundling', 'mis-selling', 'loan']),
 ]),
 'IFM-569': (None, [
  dict(title='The twist: a designer bag is an asset, and an asset need not be a good buy',
       summary='The rapid-fire round runs through stocks, credit card debt, gold, a home '
               'loan, mutual funds, a house, a car and a car loan, then lands on the two that '
               'catch people out — a designer bag and a luxury watch are both assets — and '
               'makes the actual teaching point: an asset does not have to be a good '
               'investment.',
       start=7.4, end=31.4, weight='primary',
       evidence='Designer bag. Asset. Okay then. Luxury watch. Asset. An asset doesn\'t have '
                'to be a good investment.',
       search_terms=['designer bag', 'luxury watch', 'asset', 'misconception corrected']),
 ]),
 'IFM-563': ('IMG_7808', [
  dict(title='They will not commit to something intense — and a refresher is coming',
       summary='On why a long intense course is the wrong shape for some audiences: they do '
               'not want more commitment or anything so intense, so it has to be delivered '
               'one way rather than demanding much back. The facilitator answers that she is '
               'definitely doing one refresher, maybe a few months down the line.',
       start=7.0, end=22.0, weight='primary',
       evidence='They don\'t want more commitment, they don\'t want something so intense or '
               'something Exactly, so I\'m doing it for them and what I was saying is I\'m '
               'definitely doing one refresher Maybe like a few months down the line',
       search_terms=['refresher', 'commitment', 'teaching style']),
 ]),
}


def norm(s):
    return ' '.join((s or '').split()).lower()


def main():
    ok = True
    for rid, (stem, moments) in M.items():
        # A stem means the transcript is still in /tmp from the standalone pass; None means
        # media-for-rows.py already filed it under the row id in speech/.
        p = (TX % stem) if stem else os.path.join(SPEECH, '%s.json' % rid)
        if not os.path.exists(p):
            print('%s: transcript %s missing' % (rid, p)); ok = False; continue
        t = json.load(open(p, encoding='utf-8'))
        full = norm(t['text'])
        for m in moments:
            ev = norm(m['evidence'])
            if ev not in full:
                print('%s  EVIDENCE NOT IN TRANSCRIPT: %r' % (rid, m['evidence'][:70]))
                ok = False
                continue
            # and it must sit inside the claimed span
            inside = norm(' '.join(s['x'] for s in t['segments']
                                   if s['e'] > m['start'] - 0.01 and s['t'] < m['end'] + 0.01))
            if ev not in inside:
                print('%s  evidence is in the video but OUTSIDE %s-%ss: %r'
                      % (rid, m['start'], m['end'], m['title'][:50]))
                ok = False
        print('%s  %d moments  %s' % (rid, len(moments), 'ok' if ok else 'PROBLEM'))
    if not ok:
        print('\nnot writing — fix the above first')
        return 1
    if '--write' not in sys.argv:
        print('\nall evidence verified against the transcripts. pass --write to store.')
        return 0
    os.makedirs(STORE, exist_ok=True)
    for rid, (stem, moments) in M.items():
        json.dump({'id': rid, 'authored': '2026-09-30',
                   'by': 'claude, from the full transcript',
                   'moments': moments},
                  open(os.path.join(STORE, '%s.json' % rid), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
    print('\nwrote %d moment files (%d moments) to moments/'
          % (len(M), sum(len(v[1]) for v in M.values())))
    return 0


if __name__ == '__main__':
    sys.exit(main())
