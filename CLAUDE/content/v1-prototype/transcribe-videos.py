#!/usr/bin/env /usr/bin/python3
"""Transcribe every video in the Library, END TO END, from its Drive master.

    /usr/bin/python3 transcribe-videos.py            # work the queue (resumable)
    /usr/bin/python3 transcribe-videos.py --plan     # show the queue, fetch nothing
    /usr/bin/python3 transcribe-videos.py --write    # rebuild transcripts.js from the store
    /usr/bin/python3 transcribe-videos.py --limit N  # stop after N videos

WHY THIS EXISTS
    Speech search covered 26 assets, all short snippets from one workshop series, and the
    reels had no transcript at all. So "find the video where Hiral says 'if this resonates
    with you, come join our class'" returned nothing -- not because the clip does not exist,
    but because nothing had ever listened to it.

    The 12-second preview clips are NOT a substitute. A preview is the first 12s of the
    master by construction, so it can only ever catch an opening line. A call to action is
    the last thing said in a reel. Transcribing previews finds hooks and misses every CTA.

HOW IT WORKS
    Per video, one at a time, smallest master first so the index gains coverage soonest:
      fetch master -> extract 16kHz mono wav -> DELETE the master -> whisper -> store -> next

    The master never survives the loop. 22.6 GB of footage passes through a single temp file
    a few hundred MB at a time, which is the only reason this can run on this machine at all.
    Masters must never enter the repo (see the asset size budget in CLAUDE.md).

    The store is `speech/<ID>.json` -- one file per video, so an interrupted run costs only
    the video it was working on. `--write` folds the store into `transcripts.js`, which the
    page already loads and the engine already weights as `search_terms`.

FETCHING
    Use `rclone copyto` against the file's PARENT folder id plus its path, never
    `rclone backend copyid`. copyid prints no stats and honours no idle timeout, so a stalled
    transfer hangs forever -- it sat 24 minutes on a 40MB file with zero bytes on disk on
    20 Sep 2026. copyto takes the ordinary transfer path where --timeout kills a dead
    connection and retries it. Measured 1.4-2.2 MB/s.

    Paths come from the cached rclone indexes. Build them first or most rows are unresolvable:
      rclone lsjson -R --files-only --drive-root-folder-id <ROOT> gdrive: > /tmp/ls_<ROOT>.json
"""
import glob, json, os, re, subprocess, sys, tempfile, time, warnings

warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(HERE, 'speech')
CAT = os.path.join(HERE, 'v1-catalogue.js')
OUT = os.path.join(HERE, 'transcripts.js')
MODEL = os.environ.get('IFM_WHISPER_MODEL', 'small')


def drive_paths():
    """{file id: (root folder id, path within that root, size)} from the cached indexes."""
    loc = {}
    for f in glob.glob('/tmp/ls_*.json'):
        root = os.path.basename(f)[3:-5]
        if len(root) < 25:          # ls_aakara.json etc are nickname copies of a real root
            continue
        try:
            d = json.load(open(f))
        except Exception:
            continue
        if not isinstance(d, list) or (d and not isinstance(d[0], dict)):
            continue
        for it in d:
            if it.get('ID') and it['ID'] not in loc:
                loc[it['ID']] = (root, it.get('Path', ''), it.get('Size') or 0)
    return loc


def queue():
    src = open(CAT, encoding='utf-8').read()
    rows = json.loads(src[src.index('['):src.rindex(']') + 1])
    loc = drive_paths()
    q, unreachable = [], []
    for r in rows:
        if r.get('type') != 'Video' or r.get('library') is False:
            continue
        u = (r.get('video') or '') + ' ' + (r.get('drive') or '')
        mf = re.search(r'/file/d/([A-Za-z0-9_-]{20,})', u)
        md = re.search(r'/drive/folders/([A-Za-z0-9_-]{20,})', u)
        if mf and loc.get(mf.group(1)):
            root, path, size = loc[mf.group(1)]
            q.append({'id': r['id'], 'kind': 'file', 'root': root, 'path': path,
                      'size': size, 'title': r.get('title', '')})
        elif md:
            q.append({'id': r['id'], 'kind': 'folder', 'fid': md.group(1), 'size': 0,
                      'title': r.get('title', '')})
        else:
            unreachable.append(r['id'])
    q.sort(key=lambda x: x['size'])          # cheapest first: coverage arrives soonest
    return q, unreachable


def rclone(args, timeout):
    return subprocess.run(['rclone'] + args + [
        '--timeout', '90s', '--contimeout', '30s',
        '--low-level-retries', '5', '--retries', '3'],
        capture_output=True, text=True, timeout=timeout)


def list_folder(fid):
    """Every video inside a Drive folder, or None if the LISTING ITSELF failed.

    None and [] are different answers and conflating them wrote a lie into the store. On the
    20 Sep run, IFM-274/334/340/374 were all recorded as "no video in folder" -- and a preview
    clip had already been built from each of those same four folders, so they demonstrably
    contain video. The listing had timed out and returned empty stdout, which the old code
    could not tell apart from an empty folder. An error must never be recorded as a fact.
    """
    for attempt in (1, 2):
        try:
            r = rclone(['lsf', '-R', '--drive-root-folder-id', fid, 'gdrive:'], 900)
        except subprocess.TimeoutExpired:
            continue
        if r.returncode != 0:
            continue
        return [n for n in r.stdout.splitlines() if n.lower().endswith(('.mp4', '.mov', '.m4v'))]
    return None


def fetch(job, dest):
    """Returns (error_or_None, provenance_dict)."""
    prov = {}
    if job['kind'] == 'folder':
        vids = list_folder(job['fid'])
        if vids is None:
            return 'folder listing failed', prov
        if not vids:
            return 'folder genuinely holds no video', prov
        # A catch-all row cannot be one transcript. Record how many videos are really in
        # there and which one this transcript is of, so the gap is visible in the data
        # instead of being implied by a comment.
        vids.sort()
        prov = {'folder_videos': len(vids), 'of_file': vids[0]}
        root, path = job['fid'], vids[0]
    else:
        root, path = job['root'], job['path']
        prov = {'of_file': os.path.basename(path)}
    try:
        rclone(['copyto', '--drive-root-folder-id', root, 'gdrive:' + path, dest], 3600)
    except subprocess.TimeoutExpired:
        return 'fetch timed out', prov
    if os.path.exists(dest) and os.path.getsize(dest):
        return None, prov
    return 'fetch failed', prov


def main():
    os.makedirs(STORE, exist_ok=True)
    q, unreachable = queue()
    prior = {}
    for f in glob.glob(os.path.join(STORE, '*.json')):
        try:
            r = json.load(open(f, encoding='utf-8'))
            prior[r['id']] = r
        except Exception:
            pass
    def outstanding(j):
        r = prior.get(j['id'])
        if r is None:
            return True
        return bool(r.get('retryable')) and r.get('attempts', 0) < 3
    todo = [j for j in q if outstanding(j)]
    gb = sum(j['size'] for j in todo) / 2 ** 30
    print('%d videos in the Library queue | %d already transcribed | %d to do (%.1f GB) | '
          '%d have no fetchable link' % (len(q), len(q) - len(todo), len(todo), gb,
                                         len(unreachable)))
    if '--write' in sys.argv:
        return write_js()
    if '--plan' in sys.argv:
        for j in todo[:40]:
            print('  %-9s %6d MB  %s' % (j['id'], j['size'] // 2 ** 20, j['title'][:58]))
        return

    from faster_whisper import WhisperModel
    model = WhisperModel(MODEL, device='cpu', compute_type='int8')
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else len(todo)
    tmp = tempfile.mkdtemp(prefix='ifm-tx-')
    done = 0
    for j in todo[:limit]:
        src, wav = os.path.join(tmp, 'm.bin'), os.path.join(tmp, 'a.wav')
        for p in (src, wav):
            if os.path.exists(p):
                os.remove(p)
        t0 = time.time()
        err, prov = fetch(j, src)
        if err:
            # A transient failure is not a fact about the asset. Recording "fetch failed" as
            # a permanent store entry made the next run skip it forever, which is how 6 rows
            # stayed untranscribed across three runs. Retryable errors are marked so `todo`
            # picks them up again; only a settled answer ("holds no video", "no audio track")
            # is final.
            retryable = err in ('fetch failed', 'fetch timed out', 'folder listing failed')
            rec = {'id': j['id'], 'error': err, 'retryable': retryable,
                   'attempts': (prior.get(j['id'], {}).get('attempts', 0) + 1), **prov}
            json.dump(rec, open(os.path.join(STORE, j['id'] + '.json'), 'w'))
            print('  %-9s %s%s' % (j['id'], err, ' (will retry)' if retryable else ''), flush=True)
            continue
        # Audio only, and the master goes immediately. Whisper wants 16kHz mono anyway, and
        # a wav of it is ~2MB a minute against hundreds of MB of video.
        subprocess.run(['ffmpeg', '-nostdin', '-y', '-i', src, '-vn', '-ac', '1',
                        '-ar', '16000', wav], capture_output=True)
        os.remove(src)
        if not os.path.exists(wav) or not os.path.getsize(wav):
            json.dump({'id': j['id'], 'error': 'no audio track'},
                      open(os.path.join(STORE, j['id'] + '.json'), 'w'))
            print('  %-9s no audio track' % j['id'], flush=True)
            continue
        segs, info = model.transcribe(wav, language='en', vad_filter=True)
        # `e` (end) is stored as well as `t` (start). Moments need a span, and deriving the
        # end from the next segment's start is wrong wherever there is a pause -- which in a
        # Q&A testimonial is exactly at the interesting boundaries.
        segs = [{'t': round(s.start, 1), 'e': round(s.end, 1), 'x': s.text.strip()}
                for s in segs]
        os.remove(wav)
        # info.duration is the TRUE audio duration, verified 20 Sep against ffprobe on three
        # files: 8.00/8.00, 8.00/8.00, 1.49/1.49, including one where VAD stripped 93% of it.
        # `duration_after_vad` is the separate post-VAD figure. So `dur` proves completeness.
        rec = {'id': j['id'], 'dur': round(info.duration, 1),
               'speech_dur': round(getattr(info, 'duration_after_vad', 0) or 0, 1),
               'model': MODEL, 'source': 'master', **prov,
               'segments': segs, 'text': ' '.join(s['x'] for s in segs)}
        json.dump(rec, open(os.path.join(STORE, j['id'] + '.json'), 'w'), ensure_ascii=False)
        done += 1
        print('  %-9s %5.0fs audio, %4d words, %3.0fs elapsed | %s' %
              (j['id'], rec['dur'], len(rec['text'].split()), time.time() - t0,
               rec['text'][:70]), flush=True)
    print('transcribed %d this run' % done)
    write_js()


def write_js():
    """Fold the per-video store into transcripts.js, preserving hand-made entries."""
    src = open(OUT, encoding='utf-8').read()
    existing = json.loads(src[src.index('{'):src.rindex('}') + 1])
    out, n = dict(existing), 0
    for f in sorted(glob.glob(os.path.join(STORE, '*.json'))):
        rec = json.load(open(f))
        if rec.get('text'):
            out[rec['id']] = rec['text']
            n += 1
    open(OUT, 'w', encoding='utf-8').write(
        '/* GENERATED by transcribe-videos.py from the full Drive master of each video --\n'
        ' * never from the 12s preview, which can only hold an opening line.\n'
        ' * Per-video records with timings live in speech/<ID>.json. Do not hand-edit. */\n'
        'window.IFM_TRANSCRIPTS =\n' +
        json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
    print('wrote %s — %d transcripts (%d from full masters), %d KB'
          % (os.path.basename(OUT), len(out), n, os.path.getsize(OUT) // 1024))


if __name__ == '__main__':
    main()
