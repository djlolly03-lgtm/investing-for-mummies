#!/usr/bin/env /usr/bin/python3
"""Build preview clips for Library videos whose master lives on Google Drive.

    scripts/ifm-fetch-previews.py --dry-run        what it would build, no network
    scripts/ifm-fetch-previews.py --limit 15       build 15 (the default batch)
    scripts/ifm-fetch-previews.py --limit 0        build everything outstanding
    scripts/ifm-fetch-previews.py --id IFM-633     one row

THE OTHER HALF OF ifm-make-previews.sh
    That script solves the same problem for masters already on this Mac: it finds rows whose
    media URL points at ifm-deploy.vercel.app, resolves it to a file in the repo, and
    transcodes a preview into content/clips/ where .vercelignore's whitelist already applies.

    It selects on `u.startswith('https://ifm-deploy.vercel.app/')`, so a row whose only link
    is a Google Drive URL is invisible to it. Every one of the rows this script targets is
    exactly that, which is why running the shell script against them reports "Nothing to
    build" and why this item sat in the review queue for weeks being misdiagnosed as a slow
    transcode. It was never slow. The fetch step did not exist.

    The two are deliberately separate programs rather than one: they share an output
    directory and an encoding recipe, but nothing else. One walks the filesystem, the other
    talks to Drive, needs rclone, and has to care about bandwidth, partial downloads and
    deleting multi-gigabyte temporaries. Folding that into a working shell script would put
    its reliability at risk for no gain.

AUDIO IS KEPT, AND THAT IS NOT THE THUMBNAIL RECIPE
    CLAUDE.md's preview recipe uses -an. That is correct for a silent b-roll tile and wrong
    here. These are people talking; a preview that drops the voice is why 27 clips were once
    flagged "silent" when they were not. 64k mono costs a few KB and keeps the preview honest.
    Same choice ifm-make-previews.sh made, for the same reason.

WHY THIS DOES NOT WRITE media-map.js
    It would be easy, and it would be wrong. media-map.js records what the SERVER answered,
    never what a build believes it produced, and that distinction is load-bearing: 11 reels
    once existed locally, were marked fine, and never reached production because
    .vercelignore did not whitelist content/reels. A build-time map would have asserted all
    11 were playable. So this script only puts files on disk. Visibility is still granted by
    deploying and then running media-audit.py, which asks the live server.

    The deploy dance (deploy, audit, deploy) is the reason this work stalls, but the fix for
    that is one approved action, not a map that guesses.

SAFETY
    The master is deleted in a finally block. These average ~100 MB and some are over 1 GB;
    a crash between fetch and encode must not leave them behind. Runs are batched and
    resumable — a row with a clip already on disk is skipped, so this can be run nightly and
    simply does nothing once it has caught up. A fetch that fails is RECORDED as failed, in
    .preview-failures.json, so the same broken row is not re-fetched every night forever.
"""
import argparse, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CONTENT = os.path.join(ROOT, 'CLAUDE', 'content')
CAT = os.path.join(CONTENT, 'v1-prototype', 'v1-catalogue.js')
MAP = os.path.join(CONTENT, 'v1-prototype', 'media-map.js')
CLIPS = os.path.join(CONTENT, 'clips')
FAILS = os.path.join(CONTENT, 'v1-prototype', '.preview-failures.json')
TMP = '/tmp/_ifm_prev'
CAP = 400 * 1024
SECS = 12
FILE_RX = re.compile(r'/file/d/([A-Za-z0-9_-]+)')


def sh(args, timeout=3600):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None


def load_catalogue():
    s = open(CAT, encoding='utf-8').read()
    return json.loads(s[s.index('['):s.rindex(']') + 1])


def load_map():
    try:
        s = open(MAP, encoding='utf-8').read()
        return json.loads(s[s.index('{'):s.rindex('}') + 1])
    except Exception:
        return {}


def load_fails():
    try:
        return json.load(open(FAILS, encoding='utf-8'))
    except Exception:
        return {}


def outstanding(rows, mmap, fails, retry_failed):
    """Video rows the Library is hiding, whose master is a fetchable Drive FILE.

    A row linking a FOLDER is excluded on purpose. A catch-all row has no single video to
    preview, and picking one by guesswork would put an arbitrary frame behind a row that
    claims to represent a whole shoot. Those need a representative chosen deliberately.
    """
    out, folders = [], []
    for r in rows:
        if r.get('type') != 'Video' or r.get('library') is False:
            continue
        if mmap.get(r['id'], {}).get('playable'):
            continue
        if os.path.exists(os.path.join(CLIPS, '%s.mp4' % r['id'])):
            continue          # built but not yet probed — waiting on a deploy, not on us
        link = str(r.get('drive') or '')
        m = FILE_RX.search(link)
        if not m:
            folders.append(r['id']); continue
        if not retry_failed and r['id'] in fails:
            continue
        out.append({'id': r['id'], 'fid': m.group(1), 'title': str(r.get('title') or '')[:58]})
    return out, folders


def first_audio_stream(src):
    """Index of the first audio stream ffmpeg can actually decode, or None.

    iPhone footage routinely carries more than one audio stream plus several data streams --
    IFM-615 is 4K HEVC with an AAC track, a second track of unknown codec, and six data
    streams. ffmpeg's default stream selection picks the "best" audio by channel count and
    can land on the undecodable one, at which point the whole encode fails and the row looks
    like a broken file. It is not broken; it just needs to be told which track to take.
    """
    p = sh(['ffprobe', '-v', 'error', '-select_streams', 'a',
            '-show_entries', 'stream=index,codec_name', '-of', 'csv=p=0', src], 300)
    if not p or not p.stdout.strip():
        return None
    for n, line in enumerate(p.stdout.strip().splitlines()):
        parts = line.split(',')
        if len(parts) >= 2 and parts[1].strip() and parts[1].strip() != 'unknown':
            return n          # index WITHIN the audio streams, for -map 0:a:<n>
    return None


def encode(src, dst):
    """12s preview, <=400KB, audio kept where there is a usable track.

    Quality steps down only as far as the cap requires, rather than starting harsh: the
    first version of this logic gave the BUSIEST clips the worst compression, which is
    exactly inverted, since a busy frame is the one that needs the bits.

    Streams are mapped EXPLICITLY. Relying on ffmpeg's defaults is what made IFM-615 look
    unencodable. If no audio stream is decodable the preview is built silent rather than
    abandoned -- a silent preview is worth far more than a hidden row, and the alternative
    was losing the clip entirely.
    """
    ai = first_audio_stream(src)
    for crf, w, ab in ((26, 640, '64k'), (28, 560, '64k'), (30, 480, '64k'), (33, 400, '48k')):
        cmd = ['ffmpeg', '-nostdin', '-y', '-t', str(SECS), '-i', src, '-map', '0:v:0']
        if ai is not None:
            cmd += ['-map', '0:a:%d' % ai, '-c:a', 'aac', '-b:a', ab, '-ac', '1']
        else:
            cmd += ['-an']
        cmd += ['-vf', "scale='min(%d,iw)':-2,format=yuv420p" % w,
                '-c:v', 'libx264', '-profile:v', 'main', '-crf', str(crf),
                '-preset', 'veryfast', '-movflags', '+faststart', dst]
        sh(cmd, 1800)
        if os.path.exists(dst) and 0 < os.path.getsize(dst) <= CAP:
            return True
    return os.path.exists(dst) and os.path.getsize(dst) > 0


def link_clips():
    """Point every row that now has a clip on disk at that clip, in data.js.

    WITHOUT THIS THE WHOLE RUN IS WASTED, and silently. media-audit.py probes the URL in a
    row's `video` or `drive` field and deliberately refuses a Drive viewer link, because that
    is a web page and can never play inline. These rows have an empty `video` and a Drive
    viewer `drive`, so candidate_url() returns None, the clip is never probed, media-map
    never learns it plays, and the row stays hidden no matter how many times it is deployed.

    Caught by checking rather than assuming: 52 clips were built, shipped and would have
    changed nothing. The two-deploy ritual would have run and the rows would still have been
    invisible, which looks exactly like the tool not working.

    data.js is edited by parsing the JSON between `window.IFM_DATA = ` and the trailing `;`,
    per CLAUDE.md — never by substituting text in place.
    """
    data = os.path.join(CONTENT, 'data.js')
    s = open(data, encoding='utf-8').read()
    a = s.index('window.IFM_DATA =') + len('window.IFM_DATA =')
    b = s.rindex(';')
    head, d, tail = s[:a], json.loads(s[a:b]), s[b:]
    n = 0
    for r in d['catalogue']:
        if str(r.get('video') or '').strip():
            continue
        if not os.path.exists(os.path.join(CLIPS, '%s.mp4' % r['id'])):
            continue
        r['video'] = 'https://ifm-deploy.vercel.app/content/clips/%s.mp4' % r['id']
        n += 1
    if n:
        open(data, 'w', encoding='utf-8').write(
            head + json.dumps(d, ensure_ascii=False, indent=1) + tail)
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--limit', type=int, default=15, help='0 means no limit')
    ap.add_argument('--id', action='append', default=[])
    ap.add_argument('--retry-failed', action='store_true')
    a = ap.parse_args()

    rows, mmap, fails = load_catalogue(), load_map(), load_fails()
    todo, folders = outstanding(rows, mmap, fails, a.retry_failed)
    if a.id:
        todo = [t for t in todo if t['id'] in a.id]

    print('%d rows need a preview and link a Drive file' % len(todo))
    print('%d more are hidden but link a FOLDER — they need a representative chosen, '
          'not a guess: %s' % (len(folders), ', '.join(folders[:8]) + (' …' if len(folders) > 8 else '')))
    if fails:
        print('%d previously failed and are skipped (--retry-failed to include): %s'
              % (len(fails), ', '.join(sorted(fails)[:6])))
    built_waiting = [r['id'] for r in rows if r.get('type') == 'Video'
                     and not mmap.get(r['id'], {}).get('playable')
                     and os.path.exists(os.path.join(CLIPS, '%s.mp4' % r['id']))]
    if built_waiting:
        print('%d already have a clip on disk and are only waiting for a deploy + '
              'media-audit.py: %s' % (len(built_waiting), ', '.join(built_waiting[:6])))
    print()

    if a.limit:
        todo = todo[:a.limit]
    if a.dry_run:
        for t in todo:
            print('  would build %-9s %s' % (t['id'], t['title']))
        print('\n(--dry-run, nothing fetched)')
        return 0

    os.makedirs(TMP, exist_ok=True)
    os.makedirs(CLIPS, exist_ok=True)
    ok = bad = 0
    for t in todo:
        src = os.path.join(TMP, 'm.bin')
        dst = os.path.join(CLIPS, '%s.mp4' % t['id'])
        if os.path.exists(src):
            os.remove(src)
        t0 = time.time()
        try:
            sh(['rclone', 'backend', 'copyid', 'gdrive:', t['fid'], src,
                '--timeout', '120s', '--retries', '2'], 3600)
            if not os.path.exists(src) or not os.path.getsize(src):
                fails[t['id']] = {'why': 'fetch returned nothing', 'at': time.strftime('%Y-%m-%d')}
                print('%-9s FETCH FAILED' % t['id'], flush=True); bad += 1; continue
            mb = os.path.getsize(src) / 2 ** 20
            if not encode(src, dst):
                fails[t['id']] = {'why': 'ffmpeg produced nothing', 'at': time.strftime('%Y-%m-%d')}
                print('%-9s ENCODE FAILED (%.0f MB master)' % (t['id'], mb), flush=True)
                bad += 1; continue
            kb = os.path.getsize(dst) / 1024
            fails.pop(t['id'], None)
            ok += 1
            print('%-9s %6.0f MB -> %5.0f KB  %3.0fs  %s'
                  % (t['id'], mb, kb, time.time() - t0, t['title']), flush=True)
        finally:
            # A master is never left behind. Some of these are over a gigabyte.
            if os.path.exists(src):
                os.remove(src)

    json.dump(fails, open(FAILS, 'w'), indent=1)
    linked = link_clips()
    print('\n%d built, %d failed, %d rows pointed at their new clip.' % (ok, bad, linked))
    if ok:
        print('These are on disk but still INVISIBLE in the Library. media-map.js only '
              'believes the live server, so finish with:\n'
              '  cd CLAUDE && vercel deploy --prod --yes      # ships the clips\n'
              '  /usr/bin/python3 content/v1-prototype/media-audit.py\n'
              '  cd CLAUDE && vercel deploy --prod --yes      # ships the updated map\n'
              'Deploys need explicit approval and must run from inside CLAUDE/.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
