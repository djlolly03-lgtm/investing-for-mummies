#!/usr/bin/env /usr/bin/python3
"""Fill the missing Format values in v1-catalogue.js — evidence-led, not guessed.

  /usr/bin/python3 backfill-format.py --dry-run   # show what would change
  /usr/bin/python3 backfill-format.py             # write it

WHY THIS FILE EXISTS RATHER THAN A HAND-EDIT
  51 of 378 library assets carried no Format. Format is the highest-value retrieval field
  in the catalogue by a distance — the ablation showed removing it costs five queries,
  more than every free-text field combined, while removing Person, Source, Status or
  Session costs none. Those 51 were therefore the least findable content we own, and the
  browse view put them in a visible "Unsorted" bucket.

  Spec §28: AI may SUGGEST metadata but must choose only from controlled vocabulary and
  must never invent values. So every assignment below cites the evidence that supports it,
  and anything the evidence does not support is left blank on purpose.

  The catalogue is parsed as JSON and re-serialised — never regex-substituted in place
  (CLAUDE.md, and the reason is that a regex edit of this file has corrupted it before).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(HERE, 'v1-catalogue.js')

# --- the assignments, each with the evidence that justifies it ----------------
#
# Goa Workshop raw clips 1-33. All 33 share one generic description — "Raw video from the
# IFM women's money workshop in Goa (18 Jul 2026). Candidate footage for reels." — and
# carry person=Other Person, which rules out Hiral Speaking. They are footage of a
# workshop in session, so Classroom Moment is the honest reading.
# CAVEAT, recorded deliberately: not one of these 33 has been viewed individually. This is
# a session-level assignment from a session-level description, and it should be revisited
# when the clips are actually reviewed.
GOA = {f'IFM-{n}': 'Classroom Moment' for n in range(218, 251)}

# IFM-004 is deliberately NOT here. enrichment.json already carries an explicit prior
# decision on it — "Raw unclipped 365MB session video. Format left blank — nothing
# establishes what it shows." That is a reasoned human call and §28 says human correction
# wins. A first pass of this script overrode it; that was wrong and is reverted.
ASSIGN = dict(GOA, **{
    # Wealth Conversation Ch.2. Its seven siblings (Ch.1, 3, 4, 5, 6, 7, 8) are unanimously
    # B-roll, and the description is an animated coin-tree test render — supporting footage.
    'IFM-007': 'B-roll',
    # Animated brand render on a white background. Eight siblings (pizza splitters, 3D
    # medallions, Vedanta gold globes) are unanimously B-roll.
    'IFM-050': 'B-roll',
    # A presenter at a TV showing a curriculum slide, person = Student. A room in session.
    'IFM-163': 'Classroom Moment',
    # "A teen points at the screen during a walkthrough." Its Teens-workshop siblings are
    # predominantly Classroom Moment.
    'IFM-287': 'Classroom Moment',
    # Finished monthly social reel, person = Other Person (a woman counting notes, not
    # Hiral). The "August:" reels are Social Graphic unless Hiral presents them.
    'IFM-328': 'Social Graphic',
})

# --- left blank ON PURPOSE ----------------------------------------------------
# Twelve rows whose own descriptions say the content does not exist yet: "placeholder in
# the July deck", "video in production by Aakara", "no frames have been designed yet",
# "only a .psd source file delivered". Every one of them also has no thumbnail, which is
# the same finding from the other direction. Giving a plan a Format would assert that a
# thing exists. Whether they belong in the Library at all is a membership decision, not a
# metadata one, so it is left to the user.
PLACEHOLDERS = ['IFM-004', 'IFM-028', 'IFM-200', 'IFM-201', 'IFM-209', 'IFM-217', 'IFM-270',
                'IFM-272', 'IFM-273', 'IFM-275', 'IFM-276', 'IFM-277', 'IFM-278']

VALID = {'Hiral Speaking', 'Testimonial', 'Classroom Moment', 'Student Question',
         'B-roll', 'Portrait', 'Certificate', 'Social Graphic', 'Social / Promotional'}


def main():
    dry = '--dry-run' in sys.argv
    src = open(CAT, encoding='utf-8').read()
    head = src[:src.index('[')]
    rows = json.loads(src[src.index('['):src.rindex(']') + 1])

    # Never invent a value: every assignment must already be in the controlled vocabulary.
    bad = {v for v in ASSIGN.values() if v not in VALID}
    if bad:
        sys.exit('FATAL: not in the controlled vocabulary: %s' % bad)

    by_id = {r['id']: r for r in rows}
    missing = [i for i in ASSIGN if i not in by_id]
    if missing:
        sys.exit('FATAL: unknown asset ids: %s' % missing[:5])

    changed, skipped = [], []
    for aid, fmt in sorted(ASSIGN.items()):
        r = by_id[aid]
        if r.get('format'):
            skipped.append((aid, r['format']))     # never overwrite an existing human value
            continue
        if not dry:
            r['format'] = fmt
        changed.append((aid, fmt))

    for aid, fmt in changed:
        print('  %-9s -> %s' % (aid, fmt))
    if skipped:
        print('\n  already had a Format, left alone: %s' % ', '.join(a for a, _ in skipped))

    # In --dry-run nothing was mutated, so account for the pending assignments here or
    # the check below compares against the pre-edit state and always fails.
    done = {a for a, _ in changed}
    lib = [r for r in rows if r.get('library') is not False]
    still = [r['id'] for r in lib if not r.get('format') and r['id'] not in done]
    print('\n  assigned              : %d' % len(changed))
    print('  still without a Format: %d  %s' % (len(still), ' '.join(still)))
    assert sorted(still) == sorted(PLACEHOLDERS), 'unexpected leftovers: %s' % still

    if dry:
        print('\n  --dry-run, nothing written')
        return
    with open(CAT, 'w', encoding='utf-8') as f:
        f.write(head)
        json.dump(rows, f, ensure_ascii=False, indent=1)
        f.write(';\n')
    print('\n  wrote %s' % CAT)

    # v1-catalogue.js is GENERATED. Writing only there would mean the next backfill.py run
    # silently reverts all of this, so the same assignments are also recorded in
    # enrichment.json — the override layer backfill.py merges AFTER its rules, where human
    # and vision-pass corrections already live and win.
    ep = os.path.join(HERE, 'enrichment.json')
    enr = json.load(open(ep, encoding='utf-8'))
    added = 0
    for aid, fmt in sorted(ASSIGN.items()):
        if aid in enr:                      # never clobber a vision-verified entry
            continue
        enr[aid] = {'format': fmt}
        added += 1
    with open(ep, 'w', encoding='utf-8') as f:
        json.dump(enr, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('  recorded %d assignments in enrichment.json (now %d entries)' % (added, len(enr) - 1))


if __name__ == '__main__':
    main()
