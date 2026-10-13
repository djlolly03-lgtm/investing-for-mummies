#!/usr/bin/env /usr/bin/python3
"""Give every row an `audience` — Mummies, Young Adults or Teens — from when it was SHOT.

    /usr/bin/python3 assign-audience.py --times    # read capture times from Drive (cheap)
    /usr/bin/python3 assign-audience.py --plan     # show the assignment, write nothing
    /usr/bin/python3 assign-audience.py --write    # write audience + captured_at to data.js

THE PROBLEM
    Searching the Library for IYA returns the teens programme, because nothing in the data
    says which batch a row belongs to. Segment exists only as free text inside `session` and
    `title`, so to the engine "IYA / IFT teens programme" is one string and the two audiences
    are indistinguishable. 19 rows sit under the self-contradictory label "IYA teens
    programme" — IYA is young adults.

    The same gap is a safety problem. Minors are currently protected by regex-matching the
    word "teen" in prose. Write one clean description that happens not to use the word and a
    14-year-old becomes eligible for the public website. Legal protection should not depend
    on a word surviving an edit.

WHY CAPTURE TIME IS THE RIGHT KEY
    Every iPhone master carries com.apple.quicktime.creationdate — real date, time of day and
    timezone. It cannot be mislabelled by a human and it does not drift. Measured against the
    batch schedule it says exactly which class a clip came from.

    The catalogue's own `date` is NOT that. It is mostly the upload date: "IFT teens workshop
    — 19 Aug 2026" carries 2026-09-18, and the IYA folder carries 2026-10-01 for footage shot
    in July. So `date` cannot be used and a new field, `captured_at`, is recorded instead.

    Reading it is cheap. The creationdate lives in the moov atom, which iPhone writes at the
    END of the file, so the last 300KB is enough — about 80MB to timestamp every video in the
    library instead of roughly 30GB of masters.

DATE FIRST, TIME ONLY AS A TIEBREAK
    Strict time windows fail: the IYA B3 clips were captured 16:05-17:44 against a scheduled
    14:30-16:30, so matching strictly discarded 70 of 113 real clips as "outside every class".
    Sessions overrun and the dashboard times are nominal. Date decides; time is used only on
    the two date ranges when both audiences ran.

WHAT IT REFUSES TO DECIDE
    27-30 Jul ran IYA 14:30-16:30 and IFT 14:00-15:30, which overlap. A clip captured between
    14:30 and 15:45 on those dates is genuinely undecidable, and one of the two answers is
    "minors". Those are left unassigned for a human rather than guessed.
"""
import argparse, json, os, re, subprocess, sys, collections
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(HERE, '..')
DATA = os.path.join(CONTENT, 'data.js')
CAT = os.path.join(HERE, 'v1-catalogue.js')
SCAN = os.path.join(HERE, '.ingest-scan.json')
SCHED = os.path.join(HERE, 'batch-schedule.json')
TIMES = os.path.join(HERE, '.capture-times.json')
FILE_RX = re.compile(r'/file/d/([A-Za-z0-9_-]+)')
ISO_RX = re.compile(rb'20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}')
TAIL = 300000
SPLIT = 15 * 60 + 45          # 15:45, the gap between the two audiences on shared days


def load_js(path, marker):
    s = open(path, encoding='utf-8').read()
    a = s.index(marker) + len(marker) if marker else s.index('[')
    return json.loads(s[a:s.rindex(';')] if marker else s[s.index('['):s.rindex(']') + 1])


def catalogue():
    s = open(CAT, encoding='utf-8').read()
    return json.loads(s[s.index('['):s.rindex(']') + 1])


def video_rows():
    out = {}
    for r in catalogue():
        m = FILE_RX.search(str(r.get('drive') or ''))
        if m and r.get('type') in ('Video', 'Image'):
            out[r['id']] = m.group(1)
    return out


EXIF_RX = re.compile(rb'20\d{2}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}')
VIDEO_EXT = ('.mov', '.mp4', '.m4v')
HEAD = 131072


def read_times():
    """Read each master's capture time from whichever END of the file holds it.

    VIDEO and IMAGE keep it in opposite places, and getting this wrong silently loses half
    the library:

      .mov / .mp4   the time is in the moov atom, which iPhone writes LAST, so the final
                    300KB has it. Carries a real timezone offset.
      .jpg / .heic  EXIF sits in the first few KB, so a tail read finds nothing at all. The
                    first attempt at this tail-read everything and returned 5 timestamps from
                    the first 40 files — 224 of the 490 rows are photographs and every one of
                    them was unreadable that way. EXIF has NO timezone, so it is local wall
                    time; these were all shot in India and are read as +0530.

    Either way the fetch is small: 300KB or 128KB per file rather than a whole master.
    """
    scan = json.load(open(SCAN))
    byid = scan['files']
    rows = video_rows()
    have = json.load(open(TIMES)) if os.path.exists(TIMES) else {}
    roots = {f['path']: fid for fid, f in scan['folders'].items()}
    todo = [(rid, fid) for rid, fid in rows.items() if rid not in have and fid in byid]
    missing = [rid for rid, fid in rows.items() if fid not in byid]
    print('%d already timed, %d to read, %d not in the scan' % (len(have), len(todo), len(missing)))
    vids = sum(1 for _, f in todo if byid[f]['name'].lower().endswith(VIDEO_EXT))
    print('  %d video (tail read), %d image (head read)\n' % (vids, len(todo) - vids))
    ok = 0
    for n, (rid, fid) in enumerate(todo):
        rec = byid[fid]
        pid = roots.get(os.path.dirname(rec['path']))
        if not pid:
            continue
        isvid = rec['name'].lower().endswith(VIDEO_EXT)
        args = ['rclone', 'cat', '--drive-root-folder-id', pid, 'gdrive:' + rec['name'],
                '--timeout', '60s']
        args += (['--offset', str(max(0, rec['size'] - TAIL))] if isvid
                 else ['--count', str(HEAD)])
        try:
            p = subprocess.run(args, capture_output=True, timeout=240)
            m = ISO_RX.search(p.stdout)
            if m:
                have[rid] = m.group(0).decode(); ok += 1
            else:
                m = EXIF_RX.search(p.stdout)
                if m:
                    s = m.group(0).decode()
                    have[rid] = s[:4] + '-' + s[5:7] + '-' + s[8:10] + 'T' + s[11:] + '+0530'
                    ok += 1
        except Exception:
            pass
        if n and n % 40 == 0:
            json.dump(have, open(TIMES, 'w'), indent=1)
            print('  …%d/%d read, %d found' % (n, len(todo), ok), flush=True)
    json.dump(have, open(TIMES, 'w'), indent=1)
    print('\ncapture times on file: %d' % len(have))


def classify(ts, sched):
    """Which audience a capture timestamp belongs to. Returns (audience, batch, why)."""
    d = datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S%z')
    day, mins = d.strftime('%Y-%m-%d'), d.hour * 60 + d.minute
    same_day = [b for b in sched['batches'] if b['from'] <= day <= b['to']]
    if not same_day:
        return 'Mummies', '', 'outside every IYA/IFT window'
    if len(same_day) == 1:
        b = same_day[0]
        return b['audience'], b['id'], 'only batch running that day'
    # two audiences ran these dates — the clock decides
    u = sched.get('_undecidable_window', {})
    if u and u['from'] <= day <= u['to']:
        s = int(u['start'][:2]) * 60 + int(u['start'][3:])
        e = SPLIT
        if s <= mins < e:
            return '', '', 'UNDECIDABLE — both batches were in the room'
    pick = [b for b in same_day if b['audience'] == ('Young Adults' if mins >= SPLIT else 'Teens')]
    if pick:
        return pick[0]['audience'], pick[0]['id'], 'split at 15:45 on a shared day'
    return '', '', 'shared day, no batch matched the time'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--times', action='store_true')
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    if a.times:
        return read_times()

    sched = json.load(open(SCHED))
    times = json.load(open(TIMES)) if os.path.exists(TIMES) else {}
    rows = {r['id']: r for r in catalogue()}
    ovp = os.path.join(HERE, 'audience-overrides.json')
    over = json.load(open(ovp))['rows'] if os.path.exists(ovp) else {}
    out, why = {}, collections.Counter()
    for rid, ts in times.items():
        aud, batch, reason = classify(ts, sched)
        why[reason] += 1
        if aud:
            out[rid] = {'audience': aud, 'batch': batch, 'captured_at': ts}
    # Human rulings go on LAST and beat the clock. Two reasons they have to exist: the two
    # batches overlapped on 27-30 Jul so no timestamp can separate them, and 26 rows have no
    # capture time at all because a re-export stripped it. Without this they would default to
    # Mummies, which on footage of children removes the protection rather than adding it.
    for rid, rec in over.items():
        out.setdefault(rid, {})
        out[rid]['audience'] = rec['audience']
        out[rid]['batch'] = rec.get('batch', '')
        if rid in times:
            out[rid]['captured_at'] = times[rid]
        why['decided by a human, overriding the clock'] += 1
    # Every row we could not time is Mummies by default, which the user confirmed is the
    # complete non-mummies set. Stated rather than silent: an untimed row is a default, not
    # a measurement, so it is counted separately.
    untimed = [r for r in rows if r not in times]
    print('rows with a capture time : %d' % len(times))
    print('assigned from capture time: %d' % len(out))
    print('untimed, default Mummies  : %d' % len(untimed))
    print()
    for k, v in why.most_common():
        print('  %-44s %d' % (k, v))
    print()
    byaud = collections.Counter(v['audience'] for v in out.values())
    for k, v in byaud.most_common():
        print('  %-14s %d rows' % (k, v))
    bybatch = collections.Counter(v['batch'] for v in out.values())
    print()
    for k, v in sorted(bybatch.items()):
        print('  %-10s %d' % (k or '(none)', v))

    if not a.write:
        print('\n(--plan only, nothing written)')
        return 0

    s = open(DATA, encoding='utf-8').read()
    i = s.index('window.IFM_DATA =') + len('window.IFM_DATA =')
    j = s.rindex(';')
    head, d, tail = s[:i], json.loads(s[i:j]), s[j:]
    n = 0
    for r in d['catalogue']:
        rec = out.get(r['id'])
        if rec:
            r['audience'] = rec['audience']
            r['batch'] = rec.get('batch', '')
            # A human-decided row often has NO capture time -- that is usually why a human
            # had to decide it. Only write the field when there is one, rather than
            # inventing a timestamp or crashing on its absence.
            if rec.get('captured_at'):
                r['captured_at'] = rec['captured_at']
            n += 1
        elif not r.get('audience'):
            r['audience'] = 'Mummies'
    open(DATA, 'w', encoding='utf-8').write(
        head + json.dumps(d, ensure_ascii=False, indent=1) + tail)
    print('\nwrote data.js — %d rows measured, the rest defaulted to Mummies' % n)
    print('now run backfill.py so the Library sees it')
    return 0


if __name__ == '__main__':
    sys.exit(main())
