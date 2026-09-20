#!/usr/bin/env /usr/bin/python3
"""Before/after diff for the generated catalogue. Run it around every backfill.

    /usr/bin/python3 catdiff.py --save <label>       # snapshot the current catalogue
    /usr/bin/python3 catdiff.py <label>              # diff current against that snapshot
    /usr/bin/python3 catdiff.py <label> --field topic --full

WHY THIS EXISTS
    `backfill.py` rewrites all 502 rows in one run and reports aggregate coverage totals. Two
    real regressions were invisible in that report:

      - Feeding transcripts into `topics_for()` gave 19 videos 4-5 topics each and reranked
        search across the library. The totals moved by a percent or two.
      - Folding speech into `search_terms` put unedited talk above curated descriptions. No
        count changed at all.

    Both were found only because a human typed a query afterwards and noticed. A field-level
    diff makes the blast radius of a rule change visible BEFORE it is accepted.

WHAT IT GUARANTEES
    Nothing on its own -- it is a report, not a gate. But it answers, in one command, the
    question that matters after any rule edit: WHICH rows changed, in WHICH fields, and is
    that the set I intended to touch?
"""
import json, os, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(HERE, 'v1-catalogue.js')
SNAP = os.path.join(HERE, '.catsnap')


def load(path):
    s = open(path, encoding='utf-8').read()
    return {r['id']: r for r in json.loads(s[s.index('['):s.rindex(']') + 1])}


def norm(v):
    if isinstance(v, list):
        return tuple(v)
    return v


def main():
    os.makedirs(SNAP, exist_ok=True)
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    label = args[0] if args else 'last'
    path = os.path.join(SNAP, label + '.json')

    if '--save' in sys.argv:
        json.dump(load(CAT), open(path, 'w'), ensure_ascii=False)
        print('snapshot "%s" saved (%d rows)' % (label, len(load(CAT))))
        return
    if not os.path.exists(path):
        print('no snapshot "%s". Run:  catdiff.py --save %s  BEFORE changing anything.'
              % (label, label))
        sys.exit(2)

    before, after = json.load(open(path, encoding='utf-8')), load(CAT)
    only_field = sys.argv[sys.argv.index('--field') + 1] if '--field' in sys.argv else None
    full = '--full' in sys.argv

    added = sorted(set(after) - set(before))
    removed = sorted(set(before) - set(after))
    fields = collections.Counter()
    examples = collections.defaultdict(list)
    card = collections.defaultdict(lambda: [0, 0])      # field -> [before total, after total]
    changed_rows = set()

    for i in sorted(set(before) & set(after)):
        b, a = before[i], after[i]
        for k in sorted(set(b) | set(a)):
            if only_field and k != only_field:
                continue
            bv, av = norm(b.get(k)), norm(a.get(k))
            if isinstance(b.get(k), list) or isinstance(a.get(k), list):
                card[k][0] += len(b.get(k) or [])
                card[k][1] += len(a.get(k) or [])
            if bv != av:
                fields[k] += 1
                changed_rows.add(i)
                if len(examples[k]) < (200 if full else 6):
                    examples[k].append((i, b.get(k), a.get(k)))

    n = len(set(before) & set(after))
    print('=' * 74)
    print('CATALOGUE DIFF vs snapshot "%s"' % label)
    print('rows: %d before, %d after | added %d | removed %d | CHANGED %d (%.1f%%)'
          % (len(before), len(after), len(added), len(removed), len(changed_rows),
             100.0 * len(changed_rows) / max(1, n)))
    if added:
        print('  added  :', ' '.join(added[:20]), '…' if len(added) > 20 else '')
    if removed:
        print('  removed:', ' '.join(removed[:20]), '…' if len(removed) > 20 else '')
    if not fields:
        print('\nNo field changed. (This is the assertion to make when you have edited only\n'
              'tooling and expect the generated output to be byte-identical.)')
        return
    print()
    for k, c in fields.most_common():
        pct = 100.0 * c / max(1, n)
        line = '  %-16s %4d rows  %5.1f%%' % (k, c, pct)
        if card[k][0] or card[k][1]:
            line += '   values/row %.2f -> %.2f' % (card[k][0] / n, card[k][1] / n)
        if pct > 5:
            line += '   <-- OVER 5%, say why'
        print(line)
    print()
    for k, c in fields.most_common():
        print('--- %s (%d rows) ---' % (k, c))
        for i, bv, av in examples[k]:
            sb, sa = str(bv), str(av)
            if len(sb) > 90:
                sb = sb[:90] + '…'
            if len(sa) > 90:
                sa = sa[:90] + '…'
            print('   %-9s %s' % (i, sb))
            print('   %-9s %s  %s' % ('', '->', sa))
        if c > len(examples[k]):
            print('   … %d more (use --field %s --full)' % (c - len(examples[k]), k))
        print()


if __name__ == '__main__':
    main()
