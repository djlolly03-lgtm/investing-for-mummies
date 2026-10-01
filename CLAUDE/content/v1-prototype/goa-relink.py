#!/usr/bin/env /usr/bin/python3
"""Relink the 39 Goa rows to the recovered masters, and describe the 33 videos from content.

    /usr/bin/python3 goa-relink.py --plan     # print every change, write nothing
    /usr/bin/python3 goa-relink.py --write    # apply to data.js + enrichment.json

WHAT WAS WRONG
    IFM-218..250 (33 videos) and IFM-251..256 (6 photos) were catalogued in Jul 2026 from a
    Dropbox copy, then the Drive folder they were meant to point at was emptied and the
    footage was recorded as lost. So:

      - all 39 `drive link` values point at a LOCAL path (`clips/IFM-218.mp4`) or at a
        vercel-hosted copy, neither of which is a Drive file;
      - the 33 videos were hidden with `library:false`, because a row with no fetchable
        file is exactly what the visibility rule exists to suppress;
      - all 33 share ONE description, word for word: "Raw video from the IFM women's money
        workshop in Goa (18 Jul 2026). Candidate footage for reels."

    The masters were never lost. They were in Dropbox the whole time, and each row's own
    `notes` recorded which file was its master. Restored to Drive 1 Oct 2026.

WHAT THIS DOES
    Relinks all 39 to the Drive masters, un-hides the 33, and replaces the one shared
    sentence with a description of what is actually SAID in each clip, taken from the
    transcript in speech/. It also fills `shot`, `quality` and `consent`, which were empty on
    all 39, and corrects `session` from "Goa — 17 Jul 2026" to 18 Jul: every master's
    timestamp is 18 Jul 2026, between 16:25 and 18:16 IST, and the titles already said 18th.

    The 6 PHOTOS keep their descriptions. They were already enriched by the vision pass and
    are specific and good ("women seated at cafe tables listening while Hiral presents from
    the far side in a blue dress. A dog sleeps on the floor"). Rewriting them would be work
    that makes nothing better. They get the Drive link and nothing else.

WHAT THIS IS NOT
    Not a delete, anywhere, of anything. The Dropbox originals stay. The rows that were
    hidden are un-hidden rather than replaced. No row is removed and no new id reuses an old
    one.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data.js')
ENRICH = os.path.join(HERE, 'enrichment.json')
IDS = '/tmp/goa-drive-ids.json'
MAP = '/tmp/goa-map.json'
DFILE = 'https://drive.google.com/file/d/%s/view'
DFOLDER = 'https://drive.google.com/drive/folders/%s'
CLIPURL = 'https://ifm-deploy.vercel.app/content/clips/%s.mp4'
REELS_FOLDER_NAME = 'REELS (Claude)'

NOTE = ('Relinked 1 Oct 2026. The master was never lost — it was in Dropbox throughout, and '
        'this row\'s own notes recorded which file it was. Restored to the original Drive '
        'folder and the row now points at it. Described from the transcript of the full '
        'master (filed in speech/), replacing the one boilerplate sentence that all 33 Goa '
        'video rows shared. ')

# id -> (title, keywords, description, shot, quality)
V = {
 'IFM-218': ('Goa — Hiral\'s own story: a business journalist who could not manage her money',
   'hiral,founder story,business journalist,business india,origin,why ifm,credibility,'
   'goa,july 2026,women and money',
   'Hiral\'s origin story, told to the room: ten years as a business journalist at Business '
   'India, and "despite being a business journalist, I didn\'t know how to manage my money". '
   'She draws the distinction the whole business rests on — she was exposed to markets and '
   'P/E ratios, and "managing money is a very different skill than writing about '
   'businesses". 24 seconds, and the clearest statement of why IFM exists in any Goa clip.',
   'Hiral — teaching', 'Hero'),
 'IFM-219': ('Goa — a participant on being low-risk and leaving it to the family planner',
   'participant,low risk,risk appetite,financial planner,sip,family money,goa,july 2026',
   'A participant answers what she actually does with her money: "I\'m a low-risk person, I '
   'don\'t like it", so she tells her financial planner where her limit is and has not gone '
   'beyond it. She adds that the SIPs sit with the family\'s financial planning people '
   'rather than with her. A plain example of the delegation pattern the course is trying to '
   'change.',
   'Students', 'Usable'),
 'IFM-220': ('Goa — what the money is actually for: peace of mind, choices, freedom',
   'why invest,peace of mind,freedom,financial security,choices,sabbatical,travel,goals,'
   'goa,july 2026,women and money',
   'Twenty-two seconds that answer "why bother". Not returns — "it\'s about peace of mind, '
   'it\'s about having enough choices to do whatever you want, it\'s about financial '
   'security, it\'s about freedom", and then the concrete version: money to take a '
   'sabbatical, to do a course abroad, to travel. Short, quotable, and the best standalone '
   'piece of the Goa footage for social.',
   'Hiral — teaching', 'Hero'),
 'IFM-221': ('Goa — the worksheet exercise: what life do you want the money to buy?',
   'worksheet,exercise,goals,my why,vision,what is money for,workshop activity,'
   'goa,july 2026',
   'Setting up the worksheet exercise. She asks the room to look at the top of the sheet and '
   'think about the kind of life they want the money to pay for — what goal would you want '
   'that money to achieve, what would you like to do with it — and says they can think it '
   'through more extensively later. The transcript garbles a phrase mid-way; the instruction '
   'itself is clear.',
   'Hiral — teaching', 'Usable'),
 'IFM-222': ('Goa — "no pressure, you can think through it" (9s)',
   'workshop,aside,pacing,goa,july 2026',
   'Nine seconds of the room being told there is no pressure and they can think it through. '
   'An aside between exercises, not a teaching point. Kept because it is part of the shoot, '
   'but there is nothing here to use on its own.',
   'Hiral — teaching', 'Raw-backup'),
 'IFM-223': ('Goa — inflation is different for every industry, and medical runs about 15%',
   'inflation,medical inflation,healthcare costs,prices rising,15 percent,goa,july 2026',
   'The point most people miss about inflation: it is not one number. "Inflation is different '
   'for different industries", and medical inflation is running at about 15% a year, meaning '
   'medical care becomes 15% more expensive year on year. Thirty seconds and a specific, '
   'usable figure.',
   'Hiral — teaching', 'Hero'),
 'IFM-224': ('Goa — why prices rise: population up, resources finite',
   'inflation,supply and demand,population,resources,prices,economics,goa,july 2026',
   'The room works through why prices rise over time. More people means more demand, supply '
   'has to rise to match, and it generally does not: "as a planet we have limited resources, '
   'our population is growing". Conversational and overlapping in places.',
   'Hiral — teaching', 'Usable'),
 'IFM-225': ('Goa — resource inequality: the money is held by a small share of the world',
   'inequality,resource inequality,wealth distribution,prices,purchasing power,'
   'economics,goa,july 2026',
   'A minute on distribution rather than scarcity. "We have a resource inequality, an unequal '
   'distribution of financial resources — much of the money is owned by a small percentage '
   'of the population of the world", and the follow-through: those holding it can pay more, '
   'which pulls prices up for everyone else. The most political passage in the Goa set.',
   'Hiral — teaching', 'Usable'),
 'IFM-226': ('Goa — "anybody understands what compounding is?" and a participant explains it',
   'compounding,principal,interest,participant answer,beginner question,school,'
   'goa,july 2026',
   'The compounding segment opens with the question put to the room, and a participant '
   'answers it herself: you take a percentage and add it to the principal, so the principal '
   'grows for the next year. She is right, and the reply — "in school we don\'t..." — sets '
   'up the point that nobody was taught this. Good footage of a learner getting there '
   'unaided.',
   'Hiral — teaching', 'Hero'),
 'IFM-227': ('Goa — savings versus investing, and what "capital" means',
   'savings vs investing,capital,principal,sip,bank account,basics,jargon,goa,july 2026',
   'The cleanest definition in the whole shoot. Saving protects your money — "if you put in '
   '100 rupees, it will remain 100 rupees". Investing is making it grow. And capital is '
   'simply the money you start with, so ₹100 into an SIP is your capital. Thirty-three '
   'seconds, no jargon left unexplained.',
   'Hiral — teaching', 'Hero'),
 'IFM-228': ('Goa — the choice: one lakh today, or one rupee doubled every day for 30 days',
   'compounding,one rupee doubled,thought experiment,show of hands,workshop activity,'
   'goa,july 2026',
   'The set-up for the demonstration. A show of hands on whether the room would take the '
   'lump sum today or one rupee doubled daily for thirty days, with people pushing back and '
   'asking her to repeat the terms before they commit. The payoff is in the next clip. The '
   'automatic transcript renders the lump sum as "one cloth"; the context is unambiguous.',
   'Hiral — teaching', 'Hero'),
 'IFM-229': ('Goa — the doubling table: day 15 is ₹16,000, day 20 is over ₹5 lakh',
   'compounding,one rupee doubled,doubling,exponential,numbers,demonstration,'
   'goa,july 2026,aha moment',
   'The payoff, and the best single teaching moment in the Goa footage. She walks the table '
   'out loud, day by day: by day ten it is over 500, by day fifteen over 16,000, by day '
   'twenty over 5 lakh. The room\'s reaction is audible. This is the clip to cut for social '
   'if only one is cut.',
   'Hiral — teaching', 'Hero'),
 'IFM-230': ('Goa — "you are technically lending your money to the bank"',
   'bank,fixed deposit,fd,savings account,interest,how banks work,lending,goa,july 2026',
   'A participant asks the question underneath the whole topic — why does the bank pay me '
   'interest at all, what does the system get out of it, "I can\'t wrap my head around it". '
   'The answer reframes it: the bank is using your money, so putting it into an FD or a '
   'savings account is lending it to them.',
   'Students', 'Hero'),
 'IFM-231': ('Goa — the money in your account is a number, not notes in a drawer',
   'money,digital money,bank balance,abstraction,mindset,goa,july 2026',
   'A short, strange, effective reframe: your statement says ten thousand rupees, but there '
   'is no physical money sitting in an account anywhere — "it\'s just digital, you could '
   'just add another zero technically". Twenty-six seconds, and it visibly lands.',
   'Hiral — teaching', 'Usable'),
 'IFM-232': ('Goa — the spending game: totting up salon, Swiggy and Zomato for the month (4 min)',
   'spending,budgeting,expenses,salon,swiggy,zomato,lifestyle costs,workshop game,'
   'activity,goa,july 2026',
   'Four minutes of the room playing the spending game together — calling out what they '
   'actually spend a month on salon visits, on Swiggy and Zomato, and adding it up as a '
   'group. She mentions the game is on the IFM website so they can play it themselves. The '
   'longest participation sequence in the shoot and the best footage of the room doing '
   'something rather than listening.',
   'Students', 'Usable'),
 'IFM-233': ('Goa — income minus expenses, and the Warren Buffett flip',
   'savings formula,income minus expenses,warren buffett,pay yourself first,budgeting,'
   'goa,july 2026',
   'She asks the room for the formula for savings, gets "income minus expenses", confirms it '
   '— and then flips it, as Warren Buffett said you should. Twenty-three seconds covering '
   'the single most repeated idea in personal finance, with the room supplying the first '
   'half.',
   'Hiral — teaching', 'Hero'),
 'IFM-234': ('Goa — what counts as an emergency: job loss, medical bills, repairs',
   'emergency fund,emergencies,job loss,medical bill,repairs,property damage,'
   'risk,goa,july 2026',
   'Defining the thing an emergency fund is for, with examples: losing a job, a medical bill, '
   'unforeseen repairs, property damage, a downturn. The framing is the useful part — these '
   'have a low probability of happening but they cost a lot when they do.',
   'Hiral — teaching', 'Hero'),
 'IFM-235': ('Goa — an emergency fund is not supposed to earn you a great rate',
   'emergency fund,savings account,liquidity,returns,misconception,goa,july 2026',
   'The correction people need: an emergency fund is money you must put away in a savings '
   'account, and its goal is not to get a great rate. Eighteen seconds, and it pre-empts the '
   'most common objection to holding cash.',
   'Hiral — teaching', 'Hero'),
 'IFM-236': ('Goa — three to six months of salary, and why that rule is only a starting point',
   'emergency fund,three to six months,liquid fund,rule of thumb,savings account,'
   'goa,july 2026',
   'The number, and immediately the caveat: three to six months of salary is a common rule, '
   '"but every person is different". It ends by introducing liquid funds as the next step up '
   'from a savings account.',
   'Hiral — teaching', 'Hero'),
 'IFM-237': ('Goa — the "R" test: is this relevant to the life you actually want?',
   'framework,relevance,values,priorities,goal setting,decision making,goa,july 2026',
   'Part of a named framework she walks through on screen. The letter covered here is '
   'relevance: decide an amount that will not hurt you or take from your life, then ask '
   'whether this will genuinely improve your life and align with your values and priorities '
   '— "or am I doing this just because somebody else is".',
   'Hiral — teaching', 'Usable'),
 'IFM-238': ('Goa — goal examples, starting with "I want to travel business class" (31s)',
   'goals,examples,business class,aspiration,goal setting,goa,july 2026',
   'The start of a round of goal examples, opening on wanting to travel business class. The '
   'automatic transcript sticks and repeats that one phrase for most of the clip, so what '
   'the rest of the examples were is not recoverable from the text — the audio would need a '
   'listen before this is used.',
   'Hiral — teaching', 'Raw-backup'),
 'IFM-239': ('Goa — the bucket that outpaces inflation, and the 7-year SIP horizon',
   'buckets,three buckets,inflation,compounding,sip,time horizon,seven years,'
   'goa,july 2026',
   'Short and dense: this is the bucket meant to outpace inflation because it compounds over '
   'time, and in answer to a question from the room, the horizon for an SIP is anywhere over '
   'seven years. The transcript writes SIP as "SIT" once.',
   'Hiral — teaching', 'Hero'),
 'IFM-240': ('Goa — setting up the three-buckets game: match the product to its bucket',
   'three buckets,game,investment options,products,workshop activity,asset allocation,'
   'goa,july 2026',
   'She sets up the exercise that closes the teaching: each investment option comes up with a '
   'short description, and the description itself hints which of the three buckets it belongs '
   'in. The stated purpose is to reinforce the buckets so nobody gets overwhelmed or confused '
   'by the product names.',
   'Hiral — teaching', 'Hero'),
 'IFM-241': ('Goa — playing the buckets game: car down payment, small-cap fund, post office',
   'three buckets,game,small cap,equity fund,car down payment,post office,risk,'
   'commodity linked,asset allocation,goa,july 2026',
   'The game in play, and the most concrete minute and a half in the shoot. The room is given '
   'a product and places it: money saved for a car down payment in three to four years; a '
   'small-cap equity fund investing in smaller newer Indian companies with high growth and '
   'higher risk; a post office product; and an instrument priced against coal, where the risk '
   'is what coal costs eight years from now.',
   'Hiral — teaching', 'Hero'),
 'IFM-242': ('Goa — the close: you do not have to become a financial expert overnight',
   'closing,reassurance,beginner,next steps,confidence,goa,july 2026',
   'Nearly two minutes closing the session. She returns to the goal people named at the start '
   'and says she hopes they now see a clear path to it, then takes the pressure off: starting '
   'to invest, or even just starting to learn, does not require becoming a financial expert '
   'overnight.',
   'Hiral — teaching', 'Hero'),
 'IFM-243': ('Goa — "all those abbreviations make my brain go nope"',
   'jargon,abbreviations,intimidation,beginner,mutual fund,plain english,'
   'goa,july 2026,women and money',
   'A participant describes exactly how jargon shuts people out — the abbreviations make her '
   'brain "go nope", she gets shut down, "I can\'t process these English things". It is the '
   'clearest statement in the footage of the problem the whole course is built to solve, and '
   'it comes from a participant rather than from the front of the room.',
   'Students', 'Hero'),
 'IFM-244': ('Goa — why inflation and compounding come first, and "a step ladder" (4 min)',
   'teaching method,curriculum,inflation,compounding,foundations,course design,'
   'step ladder,goa,july 2026',
   'Four minutes on how the course is built, useful for anyone explaining or selling it. '
   'Inflation and compounding come first because once you understand how inflation hits '
   'future goals and what compounding does, everything else can be built on top. A '
   'participant reflects it back — "for the first time I\'ve seen like a step ladder".',
   'Hiral — teaching', 'Hero'),
 'IFM-245': ('Goa — how often to review your investments: every six months to a year',
   'reviewing investments,portfolio review,six months,performance,financial planner,'
   'goa,july 2026',
   'A practical answer to a practical question: she reviews her own investments about every '
   'six months to a year, and the point of the review is to check they are performing and to '
   'act with a planner if they are not.',
   'Hiral — teaching', 'Usable'),
 'IFM-246': ('Goa — a financial planner is not a CA, and smaller independent ones exist',
   'financial planner,chartered accountant,ca,difference,advice,independent,'
   'who to hire,goa,july 2026',
   'A distinction people get wrong constantly, asked and answered in the room. A financial '
   'planner is not a chartered accountant: a CA is largely mapping your current expenses and '
   'handling tax. She also makes the access point — advisers do not have to be the big firms, '
   'there are smaller independent ones.',
   'Hiral — teaching', 'Hero'),
 'IFM-247': ('Goa — commission-led advice, and checking for an RIA licence',
   'conflict of interest,commission,advice,ria,licence,regulation,mis-selling,'
   'goa,july 2026',
   'The conflict-of-interest answer: some advisers only recommend the products they are paid '
   'to recommend, and the room asks how you check — whether someone holds a licence. The '
   'transcript renders the licence as "IA"; it is almost certainly RIA, and the audio should '
   'be checked before this is quoted.',
   'Hiral — teaching', 'Usable'),
 'IFM-248': ('Goa — "we learned some money, now let\'s go make some money" (10s)',
   'closing,celebration,energy,sign off,group,goa,july 2026',
   'Ten seconds of the room cheering at the end — "we learned some money, now let\'s go make '
   'some money". Pure energy with no teaching content, which makes it the natural closing '
   'shot of any edit of this day.',
   'Students', 'Hero'),
 'IFM-249': ('Goa — inflation and compounding are the foundation everything else sits on',
   'teaching method,foundations,inflation,compounding,three buckets,curriculum,'
   'mutual funds,stocks,goa,july 2026',
   'The same argument as the longer clip, in eighteen seconds: you need inflation, '
   'compounding, the three buckets and a plan first, and after that it is easy to build on '
   'mutual funds, stocks or other assets. The compact version, and the more quotable one.',
   'Hiral — teaching', 'Hero'),
 'IFM-250': ('Goa — real estate, gold and silver, and "two hours doesn\'t even cut it"',
   'real estate,commodities,gold,silver,asset classes,property,home,scope,'
   'goa,july 2026',
   'Running through the asset classes that were not covered: real estate, and commodities '
   'meaning largely gold or silver. She flags gold as needing a session of its own — "that in '
   'itself is a two-hour market, and two hours doesn\'t even cut it" — and raises the '
   'question of a home as a place of residence versus an investment.',
   'Hiral — teaching', 'Usable'),
}


# The six photos, keyed to what the vision pass already recorded each frame as.
PHOTOS = {
 'IFM-251': ('Hiral — teaching', 'Hero'),    # room listening, Hiral presenting, dog asleep
 'IFM-252': ('Hiral — teaching', 'Hero'),    # presenting beside the emergency-fund diagram
 'IFM-253': ('Students', 'Hero'),            # group on the steps with workbooks
 'IFM-254': ('Students', 'Hero'),            # cohort holding up course material
 'IFM-255': ('Students', 'Usable'),          # tighter group shot, same set-up
 'IFM-256': ('Room/venue wide', 'Usable'),   # wide panorama of the venue
}


def load():
    s = open(DATA, encoding='utf-8').read()
    a = s.index('window.IFM_DATA =') + len('window.IFM_DATA =')
    b = s.rindex(';')
    return s[:a], json.loads(s[a:b]), s[b:]


def main():
    write = '--write' in sys.argv
    ids = json.load(open(IDS))
    m = json.load(open(MAP))
    head, d, tail = load()
    rows = {r['id']: r for r in d['catalogue']}

    missing = [r for r in m if r not in rows]
    if missing:
        raise SystemExit('rows not in catalogue: %s' % missing)
    nofile = {r: f for r, f in m.items() if f not in ids}
    if nofile:
        raise SystemExit('masters not found in Drive: %s' % nofile)

    changes = []
    for rid, fname in sorted(m.items()):
        r = rows[rid]
        new = {'drive link': DFILE % ids[fname]['id'],
               'session': 'Goa — 18 Jul 2026',
               'consent': 'Adults only'}
        if rid in V:
            t, kw, desc, shot, qual = V[rid]
            new.update({'title': t, 'keywords': kw, 'description': desc,
                        'shot': shot, 'quality': qual,
                        'video': CLIPURL % rid})
        else:
            # A photo. Its description is already specific and good from the vision pass, so
            # it is left alone -- but `shot` and `quality` were empty on all six, and `shot`
            # is what SHOT_MAP reads, so it is set to match what the frame actually is.
            shot, qual = PHOTOS[rid]
            new.update({'shot': shot, 'quality': qual})
        diff = {k: (r.get(k), v) for k, v in new.items() if r.get(k) != v}
        if diff:
            changes.append((rid, fname, diff))
        if write:
            r.update(new)
            r['notes'] = NOTE + ('Master: %s. ' % fname) + (r.get('notes') or '')

    print('%d of %d rows change\n' % (len(changes), len(m)))
    for rid, fname, diff in changes:
        print('%s  <- %s' % (rid, fname))
        for k, (old, newv) in diff.items():
            o = str(old)[:52].replace('\n', ' ')
            n = str(newv)[:52].replace('\n', ' ')
            print('    %-12s %-54s -> %s' % (k, o, n))
        print()

    e = json.load(open(ENRICH, encoding='utf-8'))
    unhide = [k for k in V if isinstance(e.get(k), dict) and e[k].get('library') is False]
    print('un-hiding %d rows in enrichment.json: %s' % (len(unhide), ', '.join(unhide)))
    if write:
        for k in unhide:
            e[k].pop('library', None)
            e[k]['_why'] = ('Un-hidden 1 Oct 2026. It was hidden only because its master was '
                            'believed destroyed, so the row had no fetchable file. The master '
                            'was in Dropbox the whole time and is now restored to Drive.')
        json.dump(e, open(ENRICH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        open(DATA, 'w', encoding='utf-8').write(
            head + json.dumps(d, ensure_ascii=False, indent=1) + tail)
        print('\nwrote data.js and enrichment.json')
    else:
        print('\n(--plan only, nothing written)')


if __name__ == '__main__':
    main()
