#!/usr/bin/python3
"""Flagship course promo — step 1: every base shot (1080x1920, 30fps, silent) + the effect passes.
Hiral = the EO shoot's camera takes, cut at camera = phone + SHIFT so her phone voice lines up (verified by
cross-correlation 1 Nov 2026, all within 5 ms). Students and class b-roll = Content Hub masters (iPhone HLG
converted to SDR with avconvert first, into W/sdr). Usage: prep.py [names...]  (empty = all)"""
import subprocess, os, sys, json, shlex, time
W = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
RAW, HUB, SDR, SEG = W + '/raw', W + '/hub', W + '/sdr', W + '/seg'
FX = '/Users/lollyg/.claude/skills/effects'; PY = FX + '/.venv/bin/python'; FX6 = os.path.dirname(os.path.abspath(__file__)) + '/fx6.py'
os.makedirs(SEG, exist_ok=True); os.makedirs(W + '/plans', exist_ok=True)
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
COVER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1'
HIRAL = 'eq=contrast=1.05:brightness=0.012:saturation=1.05'
ROOM = 'eq=contrast=1.04:saturation=1.08:brightness=0.01'
ONLY = set(sys.argv[1:])

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1200:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)

# name: (source, start s, frames, grade, zoom)   — frames, not seconds, so every shot is a whole number of frames
BASES = {
    'S0':  (f'{RAW}/MVI_0272.MP4', 0.120, 102, HIRAL, 1.0),   # silent pre-roll smile (mouth closed to cam 3.55) -> uninstall
    'H1':  (f'{RAW}/MVI_0272.MP4', 3.451, 182, HIRAL, 1.0),   # "You earn it ... doing for you?"  (phone Hook 4.97, shift -1.42, 0.10 lead)
    'H2':  (f'{RAW}/MVI_0278.MP4', 5.115, 39, HIRAL, 1.0),    # "No boring lectures."  (RL6 2.92, +2.30, 0.10 lead), cut right after the word
    'C1':  (f'{RAW}/MVI_0284.MP4', 36.450, 33, HIRAL, 1.0),   # silent smile -> red-collage
    # one continuous shot now (v5): the user wanted the orbit on screen ~2s longer, so the discussion cutaway went
    'H3':  (f'{RAW}/MVI_0279.MP4', 5.192, 212, HIRAL, 1.0),   # "We learn through games ... challenge the way you think about money and investing"  (+2.60, 0.05 lead)
    'K1':  (f'{SDR}/IFM-639.mov', 0.800, 58, ROOM, 1.0),      # music drop: the boardroom, IFM title slide on the screen
    'K2':  (f'{SDR}/IFM-700.mov', 0.000, 58, ROOM, 1.0),      # Stock Rush PRO: arm up as the round result lands
    'K3':  (f'{SDR}/IFM-723.mov', 4.500, 59, ROOM, 1.0),      # the whole table scanning into the KBC quiz
    'K4':  (f'{SDR}/IFM-725.mov', 0.500, 58, ROOM, 1.0),      # Hiral at a mutual-fund quiz card: what the course covers (from the WhatsApp video's copy)
    'T1a': (f'{SDR}/IFM-555.mov', 47.440, 87, ROOM, 1.0),     # "...something I was really afraid of, like investing"
    'T1b': (f'{SDR}/IFM-555.mov', 54.440, 41, ROOM, 1.12),    # "I feel like I can understand"  (punch-in hides the jump cut)
    'T1c': (f'{SDR}/IFM-555.mov', 59.280, 50, ROOM, 1.0),     # "It's not that tough."
    'T2':  (f'{SDR}/IFM-455.mov', 7.480, 119, ROOM, 1.0),     # "Okay, now even I know something ... a conversation with them."
    'T3':  (f'{HUB}/IFM-397/IMG_6785.MOV', 100.380, 147, ROOM, 1.0),  # "I would highly recommend doing this course with your friends..."
    # "Ask the question. Ask the stupid question. And if you don't understand it, ask again." — Hiral's IFM-342 brand reel
    # (no raw take exists; the reel shows AI stock footage on the first two sentences, so those go over real students)
    'Qa':  (f'{SDR}/IFM-666.mov', 0.000, 39, ROOM, 1.0),      # "Ask the question." -> student in pink, mid-question
    'Qb':  (f'{SDR}/IFM-699.mov', 0.000, 62, ROOM, 1.0),      # "Ask the stupid question." -> student laughing at her phone
    # Hiral on camera: "And if you don't understand it, ask again." then a 1s hold so she isn't cut off (user). The hold is
    # on 38.64, the instant "again" ends (brows up): every later frame has her lips pressed together, which read as a
    # grimace when frozen. She starts "Because…" at 38.80, so real footage can't run on.
    # v9 bridge: she keeps going on camera — "Because confidence doesn't come from knowing everything. It comes from knowing
    # that you can learn." (to 43.22; "And" starts 43.50) — so no freeze is needed any more
    'Qc':  (f'{HUB}/IFM-342/Brand Awareness .mp4', 36.280, 211, HIRAL, 1.0),
    # "Walk away with a framework…" is now a full-screen graphic (walk.py), not footage — user, 1 Nov
    'H5':  (f'{RAW}/MVI_0283.MP4', 20.567, 347, HIRAL, 1.0),  # "You don't have to manage every investment yourself ... future."  (+4.00, 0.05 lead)
    'ENDBG': (f'{SDR}/IFM-736.mov', 0.000, 137, ROOM, 1.0),   # end-card background (blurred later)
}
for name, (src, ss, n, grade, zoom, *extra) in BASES.items():
    if ONLY and name not in ONLY and 'base' not in ONLY: continue
    vf = f'fps=30,{COVER},{grade}' + ''.join(',' + e for e in extra)
    if zoom != 1.0: vf += f',scale=iw*{zoom}:-2,crop=1080:1920:(iw-1080)/2:(ih-1920)*0.35'
    run(name, ['-ss', f'{ss:.3f}', '-i', src, '-vf', vf, '-frames:v', str(n)] + ENC + [f'{SEG}/{name}.mp4'])

# certificate day: two photo cards, 3s. z_certs (the WhatsApp video's photo) for 1.4s, then a white flash into IFM-365,
# the actual Flagship graduation cohort (Aug 2026), for 1.6s (v12; the camera-flash sound sits on the cut)
if not ONLY or 'base' in ONLY or 'CERT' in ONLY:
    # EO photo-card style (prep2.py): the whole photo on a tilted cream-bordered card over its own blurred copy, slow drift
    # (a 9:16 crop cut the woman on the left in half)
    def card(src, n, tilt, out, vf_tail=''):
        fc = ('[0:v]split=2[p1][p2];[p1]' + COVER + ',boxblur=30:3,eq=brightness=-0.22:saturation=0.8[bg];'
              '[p2]scale=980:980:force_original_aspect_ratio=decrease,pad=iw+24:ih+24:12:12:color=0xF4F1E6,format=rgba,'
              f'rotate={tilt}*PI/180:c=0x00000000:ow=rotw(iw):oh=roth(ih)[card];'
              "[bg][card]overlay=x=(W-w)/2:y=(H-h)/2+40,format=yuv420p,zoompan=z='1+0.0008*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1" + vf_tail + '[v]')
        run(out, ['-loop', '1', '-framerate', '30', '-i', src, '-filter_complex', fc, '-map', '[v]', '-frames:v', str(n)] + ENC + [f'{SEG}/{out}.mp4'])
    card('/Users/lollyg/Documents/investing for Mummies/highlight-reel-assets/mummies/photos/z_certs.jpg', 42, -2, 'CERTa')
    card(f'{HUB}/IFM-365/IFM-365r.jpg', 48, 2, 'CERTb', ',fade=t=in:st=0:d=0.15:color=white')   # IFM-365, EXIF-rotated from the HEIC
    run('CERT', ['-i', f'{SEG}/CERTa.mp4', '-i', f'{SEG}/CERTb.mp4', '-filter_complex',
                 '[0:v]setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0,setpts=N/30/TB[v]', '-map', '[v]', '-frames:v', '90'] + ENC + [f'{SEG}/CERT.mp4'])

JARGON = 'SIP|NAV|EMI|XIRR|CAGR|ELSS|SWP|STP|NFO|AUM|TER|KYC'
JOBS = {   # the EO video's effects, same settings unless noted
    'S0_fx':  ('S0',  [{'fx': 'uninstall-clear', 'start': 0.0, 'end': 3.40, 'hold': 0.9, 'finish': 'top', 'text': 'Uninstalling: fear of investing', 'drain': 1, 'dark': 1}]),   # v14: drains 100 -> 0 · v21: dark -> light
    # REALLY? as the LED sign in bright red (user picked it over a bigger backdrop word / headline box: "it should pop")
    'H1_fx':  ('H1',  [{'fx': 'led-sign', 'start': 3.65, 'end': 6.067, 'text': 'REALLY?', 'color': '#FF1F2D'}]),   # "really" at 3.84
    'H2_fx':  ('H2',  [{'fx': 'shortcut-rain', 'start': 0.10, 'end': 1.30, 'text': JARGON, 'count': 30},
                       {'fx': 'reject-stamp', 'start': 0.50, 'end': 1.30, 'text': 'NOT A LECTURE', 'color': '#D62828', 'angle': -12, 'y': 0.3}]),  # "lectures" at 0.66
    'C1_fx':  ('C1',  [{'fx': 'red-collage', 'start': 0.0, 'end': 1.10, 'text': 'BORING?', 'lines': 'NO LECTURES.|NO JARGON.|JUST GAMES.', 'tag': 'THE FLAGSHIP COURSE'}]),
    # orbit held ~2s longer (user): runs to just before "challenge" (4.07), then CHALLENGE takes over; EO's slow speed again
    'H3_fx':  ('H3',  [{'fx': 'orbit', 'start': 0.15, 'end': 4.30, 'images': W + '/games', 'count': 6, 'speed': 0.9, 'size': 0.3},
                       {'fx': 'backdrop-word', 'start': 4.00, 'end': 7.067, 'text': 'CHALLENGE', 'font': 'anton', 'color': '#FCC536'},
                       # into the music drop: the frame tunnels into itself (nested frames behind her) — user's pick; ends on the cut
                       {'fx': 'rabbit-hole', 'start': 6.00, 'end': 7.067}]),
    # first student: brackets lock onto her face and the camera follows; the window ends on the jump cut, so no snap-back shows
    'T1a_fx': ('T1a', [{'fx': 'locked-on', 'start': 0.15, 'end': 2.90, 'zoom': 1.25, 'text': 'FLAGSHIP STUDENT'}]),
    # "Now even I know something": marker doodles draw themselves around her
    'T2_fx':  ('T2',  [{'fx': 'scribble', 'start': 0.45, 'end': 3.967, 'text': 'GOT IT!', 'color': '#FCC536'}]),
    'K1_fx':  ('K1',  [{'fx': 'dot-reveal', 'start': 0.0, 'end': 0.9}]),                         # the drop builds the room out of dots
    # intensity shot (user): the camera pushes in through the whole line, and ASK AGAIN lands ON the words ("ask" at 1.76),
    # as the gold glitter spotlight — room goes dark, rays behind her head, big gold word — held on her last frame
    # the push keeps going through the hold and the sparkles keep moving, so the held frame doesn't feel frozen
    'Qc_fx':  ('Qc',  [{'fx': 'slow-push', 'start': 0.0, 'end': 7.033, 'zoom': 1.30, 'blur': 0.002},
                       {'fx': 'spotlight', 'look': 'sparkle', 'start': 1.16, 'end': 3.25, 'text': 'ASK AGAIN', 'color': '#FCC536'}]),   # v12: in 0.5s earlier, held 0.55s longer (user); then the kinetic line
    'H5_fx':  ('H5',  [   # v17: her closing line clean again — the notifications, Stock Rush cutaway, profile wall and stats all
                          # came out (user: "from 1:04 till the end the graphics don't add up"); the stats moved to the certificate
                       # v19 (user: 1:02-1:05 "gets a bit boring"): money questions pile up behind her, then "Too much to track?",
                       # and she answers it — "You don't have to manage every investment yourself". Questions, not news claims.
                       {'fx': 'headline-wall-ifm', 'start': 0.15, 'end': 3.0, 'total': 'Too much to track?', 'label': '',
                        'text': 'Should you break your FD?::Fixed deposits|Which SIP is right for you?::Mutual funds|Is your insurance enough?::Insurance|'
                                'IPO: should you apply?::Stocks|Gold or equity?::Your portfolio|Old tax regime or new?::Tax'},
                       {'fx': 'slow-push', 'start': 7.40, 'end': 11.567, 'zoom': 1.2, 'blur': 0.002}]),
}
for name, (base, effects) in JOBS.items():
    if ONLY and name not in ONLY and 'fx' not in ONLY: continue
    plan = f'{W}/plans/{name}.json'; json.dump({'effects': effects}, open(plan, 'w')); t = time.time()
    r = subprocess.run([PY, FX6, '--plan', plan, f'{SEG}/{base}.mp4', f'{SEG}/{name}.mp4'], capture_output=True, text=True)
    ok = r.returncode == 0 and os.path.exists(f'{SEG}/{name}.mp4')
    print(f'{"ok" if ok else "FAIL"} {name} <- {base} ({time.time()-t:.0f}s)', flush=True)
    if not ok: print(r.stderr[-1200:], flush=True); sys.exit(1)
print('PREP DONE', flush=True)
