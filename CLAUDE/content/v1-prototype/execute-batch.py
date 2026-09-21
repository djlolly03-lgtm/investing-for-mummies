#!/usr/bin/env /usr/bin/python3
"""Execute the approved Content Library batch. One pass, scope frozen.

    /usr/bin/python3 execute-batch.py --plan     # what it will do, writes nothing
    /usr/bin/python3 execute-batch.py --run      # fetch covers, build thumbs, write data.js

SCOPE, frozen:
  repair   IFM-028 -- a 5-PNG story set typed Video: no thumbnail, no playable preview,
           therefore invisible. Retype and give it a cover.
  create   7 rows, the only folders in the plan that no catalogue row links.
  relink   AI Videos rows (IFM-040..053) -> the Drive originals;  IFM-460 -> its own folder.
  flag     13 `Aakara - June 2026` re-exports, for deletion REVIEW. Nothing is deleted.
  hold     9 certificate images (minors, DPDP consent) and IFM-459 (byte-identical dupe).

WHY ONLY 7 AND NOT 64
    57 of the 64 rows in the earlier plan were for folders that ALREADY have a catalogue row.
    Bucket B means exactly that -- the parent folder is linked by a row -- and the plan read
    it as "these files have no row", which is true but is not the question. Under the approved
    policy of one row per topic folder, those 57 carousels and reels are already correct.
    Writing them again would have put two rows on the same carousel.

IDS
    Allocated from the catalogue's real maximum, computed here and used. A script once printed
    "next free id: IFM-500" and wrote from a hardcoded 484, overwriting 14 thumbnails.
"""
import json, os, re, subprocess, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data.js')
THUMBS = os.path.join(HERE, '..', 'thumbs')
SCAN = os.path.join(HERE, '.ingest-scan.json')
DRIVE_FILE = 'https://drive.google.com/file/d/%s/view'
DRIVE_FOLDER = 'https://drive.google.com/drive/folders/%s'

# folder path -> (title, keywords, description, shot, quality)
NEW = {
 'Pictures': (
   'IFM workshop photo library — full folder (123 files)',
   'workshop,session photos,group photo,participants,raw,catch-all,2026',
   'Catch-all for the shared "Pictures" folder: 123 workshop and session photographs from '
   'March to August 2026, including group shots of participants around the table with IFM '
   'workbooks. Opens the folder, not a single file. Individual moments have not been pulled '
   'out of this shoot yet.',
   'Students', 'Raw-backup'),
 'Sakshi uploads': (
   'Sakshi uploads — the files not yet catalogued (16 of 56)',
   'sakshi,uploads,june 2026,teens workshop,raw,catch-all',
   'Catch-all for the 16 files in Sakshi\'s upload folder that have no row of their own — '
   'iPhone video and HEIC stills from the 23-25 June 2026 teens sessions. The other 40 files '
   'in the folder are catalogued individually.',
   'Students', 'Raw-backup'),
 'Workshop Pictures': (
   'Workshop Pictures — the files not yet catalogued (11 of 31)',
   'workshop,photos,whatsapp,august 2026,raw,catch-all',
   'Catch-all for the 11 files in the shared "Workshop Pictures" folder with no row of their '
   'own, mostly HEIC stills and WhatsApp images from the August 2026 workshops. The other 20 '
   'are catalogued individually.',
   'Students', 'Raw-backup'),
 'Hiral Goel': (
   'Hiral Goel shoot folder — the files not yet catalogued (10 of 18)',
   'hiral,shoot,raw,catch-all,2026',
   'Catch-all for the 10 files in the shared "Hiral Goel" folder that have no row of their '
   'own. The inflation-session master and the teens-reel takes in the same folder are '
   'catalogued separately.',
   'Hiral — teaching', 'Raw-backup'),
 "IFM (Aakara delivery tree)/June/Workshops/Women's": (
   "June: Women's workshop — carousel",
   "women,workshop,june 2026,carousel,aakara,women and money",
   "Aakara's June 2026 carousel for the women's workshop: four finished artboards delivered "
   "as one Instagram post. One row for the set, which is the deliverable.",
   'Students', 'Hero'),
 'Content Library/IFM feedback videos': (
   'Feedback video — IMG_4248 (24 Jun 2026, not yet described)',
   'testimonial,feedback,participant,june 2026,to camera',
   'A participant feedback video from the 24 June 2026 session, the one file in the IFM '
   'feedback videos folder with no row of its own. Not yet transcribed or described — the '
   'speaker and the content of the piece are unverified.',
   'Testimonial — video', 'Raw-backup'),
 'Hiral Goel/Teens video/Teens reel': (
   'Teens reel — IMG_4254 (25 Jun 2026)',
   'teens,reel,june 2026,hiral,to camera',
   'The finished teens reel from 25 June 2026, held in its own "Teens reel" subfolder. The '
   'nine raw takes that produced it are catalogued separately as IFM-460.',
   'Hiral — teaching', 'Hero'),
}
SINGLE_FILE = {'Content Library/IFM feedback videos': 'IMG_4248.MOV',
               'Hiral Goel/Teens video/Teens reel': 'IMG_4254.MOV'}


def sh(args, timeout=900):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout)


def load():
    s = open(DATA, encoding='utf-8').read()
    a = s.index('window.IFM_DATA =') + len('window.IFM_DATA =')
    b = s.rindex(';')
    return s[:a], json.loads(s[a:b]), s[b:]


def scan_by_folder():
    scan = json.load(open(SCAN))
    f2p = {fid: f['path'] for fid, f in scan['folders'].items()}
    p2f = {}
    for fid, p in f2p.items():
        p2f.setdefault(p, fid)
    byfolder = collections.defaultdict(list)
    for i, x in scan['files'].items():
        byfolder[os.path.dirname(x['path'])].append(dict(x, id=i))
    return scan, p2f, byfolder


def resolve(path, p2f, byfolder):
    """Exact path first; else the unique scan path ending with the same tail."""
    if path in p2f:
        return p2f[path], byfolder.get(path, [])
    for n in (4, 3, 2):
        tail = '/'.join(path.split('/')[-n:])
        hits = [p for p in p2f if p.endswith(tail)]
        if len(hits) == 1:
            return p2f[hits[0]], byfolder.get(hits[0], [])
    return None, []


def cover_of(files, want=None):
    if want:
        m = [f for f in files if f['name'] == want]
        if m:
            return m[0]
    img = [f for f in files if os.path.splitext(f['name'])[1].lower()
           in ('.png', '.jpg', '.jpeg', '.heic', '.heif')]
    if img:
        return sorted(img, key=lambda f: f['name'])[0]
    return sorted(files, key=lambda f: f['name'])[0] if files else None


def make_thumb(fileid, out):
    """Fetch one file by Drive id via its parent, make a <=25KB JPEG. Video -> first frame."""
    tmp = '/tmp/_cov.bin'
    for p in (tmp, tmp + '.jpg'):
        if os.path.exists(p):
            os.remove(p)
    r = sh(['rclone', 'backend', 'copyid', 'gdrive:', fileid, tmp,
            '--timeout', '90s', '--retries', '2'], 1200)
    if not os.path.exists(tmp) or not os.path.getsize(tmp):
        return False
    sh(['ffmpeg', '-nostdin', '-y', '-i', tmp, '-frames:v', '1',
        '-vf', "scale='min(400,iw)':-2", '-q:v', '5', out], 300)
    if not os.path.exists(out) or not os.path.getsize(out):
        os.remove(tmp); return False
    if os.path.getsize(out) > 25 * 1024:
        sh(['ffmpeg', '-nostdin', '-y', '-i', out, '-q:v', '8', '/tmp/_t.jpg'], 120)
        if os.path.exists('/tmp/_t.jpg') and os.path.getsize('/tmp/_t.jpg'):
            os.replace('/tmp/_t.jpg', out)
    os.remove(tmp)
    return True


def main():
    run = '--run' in sys.argv
    scan, p2f, byfolder = scan_by_folder()
    head, d, tail = load()
    rows = d['catalogue']
    byid = {r['id']: r for r in rows}
    nums = [int(m.group(1)) for r in rows if (m := re.match(r'IFM-(\d+)$', r['id']))]
    nxt = max(nums) + 1
    print('catalogue: %d rows, max IFM-%03d, next free IFM-%03d' % (len(rows), max(nums), nxt))

    actions = []
    for path, (title, kw, desc, shot, qual) in NEW.items():
        fid, files = resolve(path, p2f, byfolder)
        if not fid:
            print('  !! cannot resolve folder: %s' % path); continue
        want = SINGLE_FILE.get(path)
        cov = cover_of(files, want)
        target = ('file', next((f['id'] for f in files if f['name'] == want), None)) if want \
                 else ('folder', fid)
        actions.append({'id': 'IFM-%03d' % nxt, 'path': path, 'title': title, 'kw': kw,
                        'desc': desc, 'shot': shot, 'qual': qual,
                        'target_kind': target[0], 'target': target[1],
                        'cover': cov['id'] if cov else None,
                        'cover_name': cov['name'] if cov else None,
                        'kind': 'video' if want and want.lower().endswith(('.mov', '.mp4'))
                                else ('image' if not want else 'video')})
        nxt += 1

    print('\n%d rows to create:' % len(actions))
    for a in actions:
        print('  %s  %-58s  %s -> %s  cover=%s'
              % (a['id'], a['title'][:58], a['target_kind'], (a['target'] or '?')[:12],
                 a['cover_name']))
    if not run:
        print('\n(--plan only, nothing written)')
        return
    json.dump(actions, open('/tmp/batch-actions.json', 'w'), ensure_ascii=False, indent=1)
    print('\nwrote /tmp/batch-actions.json')


if __name__ == '__main__':
    main()
