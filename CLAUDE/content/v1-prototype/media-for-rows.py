#!/usr/bin/env /usr/bin/python3
"""Build every derivative a new catalogue row needs -- thumbnail, preview clip, transcript --
from ONE download of the master.

    /usr/bin/python3 media-for-rows.py /tmp/rowmedia.json

WHY ALL THREE IN ONE PASS
    A row is invisible in the Library unless it has a thumbnail, a Video row also needs a
    playable preview or the visibility gate drops it, and a row described from its transcript
    needs the audio. All three are derived from the master, and the master is the expensive
    part -- one of these files is 1.19 GB. Fetching the same gigabyte three times for three
    derivatives is what turns a 30-minute pass into three hours, so this does the lot and
    then deletes the master.

    Masters never enter the repo (CLAUDE.md asset budget). The temp copy is removed even
    when ffmpeg fails, so a crashed run cannot leave gigabytes behind.

BUDGET, enforced not assumed
    thumb <=25KB, clip <=400KB. Both are re-encoded harder if the first attempt overshoots,
    and a file that still overshoots is reported rather than silently shipped.

HEIC
    ffmpeg cannot decode HEIC on this machine; macOS `sips` can. Images route through sips.
"""
import json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
THUMBS = os.path.join(HERE, '..', 'thumbs')
CLIPS = os.path.join(HERE, '..', 'clips')
TMP = '/tmp/_mediapass'
IMG_EXT = ('.png', '.jpg', '.jpeg', '.heic', '.heif', '.webp')


def sh(a, t=1800):
    try:
        return subprocess.run(a, capture_output=True, text=True, timeout=t)
    except subprocess.TimeoutExpired:
        return None


def fetch(fid, dst):
    sh(['rclone', 'backend', 'copyid', 'gdrive:', fid, dst,
        '--timeout', '120s', '--retries', '2'], 3600)
    return os.path.exists(dst) and os.path.getsize(dst) > 0


def thumb_from_image(src, out):
    if sh(['sips', '-Z', '400', '-s', 'format', 'jpeg', src, '--out', out], 300) is None:
        return False
    return os.path.exists(out) and os.path.getsize(out) > 0


def thumb_from_video(src, out):
    for ss in ('00:00:01', '00:00:00'):
        sh(['ffmpeg', '-nostdin', '-y', '-ss', ss, '-i', src, '-frames:v', '1',
            '-vf', "scale='min(400,iw)':-2", '-q:v', '5', out], 600)
        if os.path.exists(out) and os.path.getsize(out):
            return True
    return False


def shrink_jpeg(out, cap=25 * 1024):
    for q in (7, 9, 12, 16):
        if os.path.getsize(out) <= cap:
            return True
        sh(['ffmpeg', '-nostdin', '-y', '-i', out, '-q:v', str(q), '/tmp/_sh.jpg'], 120)
        if os.path.exists('/tmp/_sh.jpg') and os.path.getsize('/tmp/_sh.jpg'):
            os.replace('/tmp/_sh.jpg', out)
    return os.path.getsize(out) <= cap


def clip(src, out, cap=400 * 1024):
    for crf, scale in ((30, 480), (34, 400), (38, 360)):
        sh(['ffmpeg', '-nostdin', '-y', '-t', '12', '-i', src,
            '-vf', "scale='min(%d,iw)':-2" % scale, '-c:v', 'libx264', '-crf', str(crf),
            '-preset', 'veryfast', '-an', '-movflags', '+faststart', out], 900)
        if os.path.exists(out) and 0 < os.path.getsize(out) <= cap:
            return True
    return os.path.exists(out) and os.path.getsize(out) > 0


_MODEL = [None]


def transcribe(src, rid, out_dir):
    """Whisper the audio. Loaded lazily so an all-images run never pays for the model."""
    wav = os.path.join(TMP, 'a.wav')
    if os.path.exists(wav):
        os.remove(wav)
    sh(['ffmpeg', '-nostdin', '-y', '-i', src, '-vn', '-ac', '1', '-ar', '16000', wav], 1800)
    if not os.path.exists(wav) or not os.path.getsize(wav):
        return None
    if _MODEL[0] is None:
        import warnings
        warnings.filterwarnings('ignore')
        from faster_whisper import WhisperModel
        _MODEL[0] = WhisperModel('small', device='cpu', compute_type='int8')
    segs, info = _MODEL[0].transcribe(wav, language='en', vad_filter=True)
    segs = [{'t': round(s.start, 1), 'e': round(s.end, 1), 'x': s.text.strip()} for s in segs]
    os.remove(wav)
    rec = {'id': rid, 'dur': round(info.duration, 1), 'segments': segs,
           'text': ' '.join(s['x'] for s in segs)}
    json.dump(rec, open(os.path.join(out_dir, '%s.json' % rid), 'w'), ensure_ascii=False)
    return rec


def main():
    jobs = json.load(open(sys.argv[1]))
    speech_dir = os.path.join(HERE, 'speech')
    os.makedirs(speech_dir, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    os.makedirs(THUMBS, exist_ok=True)
    os.makedirs(CLIPS, exist_ok=True)
    out = []
    for j in jobs:
        rid, fid, name = j['id'], j['cover_id'], j['cover_name']
        ext = os.path.splitext(name)[1].lower()
        src = os.path.join(TMP, 'm' + ext)
        tj = os.path.join(THUMBS, '%s.jpg' % rid)
        cj = os.path.join(CLIPS, '%s.mp4' % rid)
        rec = {'id': rid, 'cover': name, 'thumb': None, 'clip': None}
        t0 = time.time()
        if os.path.exists(src):
            os.remove(src)
        if not fetch(fid, src):
            rec['error'] = 'fetch failed'
            out.append(rec); print('%-9s FETCH FAILED  %s' % (rid, name), flush=True); continue
        try:
            # A job may exist only to produce the clip -- a reel whose cover artboard is a
            # separate file already gave the row its thumbnail, and overwriting it with a
            # frame of the video would throw away the designed cover.
            if j.get('thumb', True):
                ok = thumb_from_image(src, tj) if ext in IMG_EXT \
                    else thumb_from_video(src, tj)
                if ok:
                    shrink_jpeg(tj)
                    rec['thumb'] = os.path.getsize(tj)
            else:
                rec['thumb'] = 'kept'
            # a preview clip only makes sense for a row whose link is a video
            if j.get('want_clip') and ext not in IMG_EXT:
                if clip(src, cj):
                    rec['clip'] = os.path.getsize(cj)
            if j.get('want_speech') and ext not in IMG_EXT:
                tr = transcribe(src, rid, speech_dir)
                if tr:
                    rec['words'] = len(tr['text'].split())
                    rec['dur'] = tr['dur']
        finally:
            if os.path.exists(src):
                os.remove(src)
        out.append(rec)
        print('%-9s %-26s thumb=%s clip=%s speech=%s  %.0fs'
              % (rid, name[:26],
                 rec['thumb'] if rec['thumb'] == 'kept' else
                 ('%.0fKB' % (rec['thumb'] / 1024)) if rec['thumb'] else 'FAIL',
                 ('%.0fKB' % (rec['clip'] / 1024)) if rec['clip'] else '-',
                 ('%dw/%.0fs' % (rec['words'], rec['dur'])) if rec.get('words') is not None
                 else '-',
                 time.time() - t0), flush=True)
    json.dump(out, open('/tmp/rowmedia-result.json', 'w'), indent=1)
    bad = [r for r in out if not r['thumb']]
    over = [r for r in out if isinstance(r['thumb'], int) and r['thumb'] > 25 * 1024] + \
           [r for r in out if r['clip'] and r['clip'] > 400 * 1024]
    print('\n%d jobs, %d without a thumbnail, %d over budget' % (len(out), len(bad), len(over)))
    for r in bad:
        print('  no thumb: %s (%s)' % (r['id'], r['cover']))
    for r in over:
        print('  over budget: %s' % r['id'])


if __name__ == '__main__':
    main()
