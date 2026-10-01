#!/usr/bin/env /usr/bin/python3
"""Transcribe the 33 recovered Goa masters, so their rows can be described from content.

    /usr/bin/python3 goa-transcribe.py            # transcribe whatever is still missing
    /usr/bin/python3 goa-transcribe.py --force    # redo everything

WHY
    All 33 rows currently carry the SAME description, word for word:

        "Raw video from the IFM women's money workshop in Goa (18 Jul 2026).
         Candidate footage for reels."

    That is 33 rows that cannot be told apart, which is the exact complaint this catalogue
    has already had levelled at it. It is not a writing problem -- when the rows were made
    the masters were believed destroyed, so there was nothing to look at. Now there is.

    No preview clip can substitute: a preview is 12 seconds cut from the top, and whatever
    makes a given clip worth finding is usually not in its first 12 seconds.

READS FROM DROPBOX, WRITES NOTHING THERE
    The masters stay in Dropbox and are opened read-only. The only new files are
    speech/IFM-NNN.json. Nothing is moved and nothing is deleted.

    Dropbox placeholders: a file with 0 blocks has to be pulled from the network when read,
    which takes minutes for a 450 MB master. That is reported rather than silently waited on,
    so a stalled run looks different from a slow one.
"""
import json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
SPEECH = os.path.join(HERE, 'speech')
GOA = ('/Users/lollyg/Library/CloudStorage/Dropbox/'
       'IFM - Goa Workshop 18 Jul 2026')
MAP = '/tmp/goa-map.json'
TMP = '/tmp/_goatx'
_M = [None]


def sh(a, t=3600):
    try:
        return subprocess.run(a, capture_output=True, timeout=t)
    except subprocess.TimeoutExpired:
        return None


def find_master(name):
    for sub in ('Videos', 'Photos', 'REELS (Claude)'):
        p = os.path.join(GOA, sub, name)
        if os.path.exists(p):
            return p
    return None


def local(p):
    """False when Dropbox holds the bytes remotely (0 allocated blocks, non-zero size)."""
    st = os.stat(p)
    return not (st.st_blocks == 0 and st.st_size > 0)


def model():
    if _M[0] is None:
        import warnings
        warnings.filterwarnings('ignore')
        from faster_whisper import WhisperModel
        _M[0] = WhisperModel('small', device='cpu', compute_type='int8')
    return _M[0]


def main():
    force = '--force' in sys.argv
    m = json.load(open(MAP))
    os.makedirs(SPEECH, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    todo = [(r, f) for r, f in sorted(m.items())
            if f.lower().endswith(('.mov', '.mp4'))
            and (force or not os.path.exists(os.path.join(SPEECH, '%s.json' % r)))]
    print('%d masters to transcribe\n' % len(todo))
    done = fail = 0
    for rid, name in todo:
        p = find_master(name)
        if not p:
            print('%-9s %-16s MASTER NOT FOUND' % (rid, name), flush=True)
            fail += 1; continue
        mb = os.path.getsize(p) / 2 ** 20
        if not local(p):
            print('%-9s %-16s %6.0f MB  online-only, Dropbox must fetch it first…'
                  % (rid, name, mb), flush=True)
        t0 = time.time()
        wav = os.path.join(TMP, 'a.wav')
        if os.path.exists(wav):
            os.remove(wav)
        sh(['ffmpeg', '-nostdin', '-y', '-i', p, '-vn', '-ac', '1', '-ar', '16000', wav])
        if not os.path.exists(wav) or not os.path.getsize(wav):
            print('%-9s %-16s NO AUDIO TRACK' % (rid, name), flush=True)
            json.dump({'id': rid, 'error': 'no audio track', 'source_file': name,
                       'retryable': False},
                      open(os.path.join(SPEECH, '%s.json' % rid), 'w'))
            fail += 1; continue
        segs, info = model().transcribe(wav, language='en', vad_filter=True)
        segs = [{'t': round(s.start, 1), 'e': round(s.end, 1), 'x': s.text.strip()}
                for s in segs]
        os.remove(wav)
        text = ' '.join(s['x'] for s in segs)
        json.dump({'id': rid, 'dur': round(info.duration, 1), 'segments': segs,
                   'text': text, 'source_file': name},
                  open(os.path.join(SPEECH, '%s.json' % rid), 'w', encoding='utf-8'),
                  ensure_ascii=False)
        done += 1
        print('%-9s %-16s %6.0f MB %5.0fs %4dw %4.0fs | %s'
              % (rid, name, mb, info.duration, len(text.split()), time.time() - t0,
                 (text[:62] or '(silence)')), flush=True)
    print('\n%d transcribed, %d failed' % (done, fail))


if __name__ == '__main__':
    main()
