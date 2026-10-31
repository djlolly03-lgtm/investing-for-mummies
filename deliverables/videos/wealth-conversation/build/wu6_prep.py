#!/usr/bin/python3
"""Warm-Up Round + 4 effects (v6) — step 1: the two new silent base clips + look-check stills.
S0 = Hiral's silent pre-roll before the hook take (uninstall bar); C6 = her silent smile after "...money blueprint."
(red-collage). Both silent, so no lip-sync to keep: music only."""
import subprocess, os, sys, json, shlex, time
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
RAW = S + '/../raw'; SEG = S + '/wu'; LOOK = S + '/v6look'; FX = '/Users/lollyg/.claude/skills/effects'; PY = FX + '/.venv/bin/python'
os.makedirs(LOOK, exist_ok=True); os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
COVER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1'
HIRAL = 'eq=contrast=1.05:brightness=0.012:saturation=1.05'
ONLY = set(sys.argv[1:])

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1200:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)

# camera seconds (silent stretches, checked on frame strips)
BASES = {'S0_pre': ('MVI_0272', 0.12, 3.40),     # smiling, hands clasped, before the take starts — 1.5 bars (slowed: user found 1 bar hard to follow)
         'C6_smile': ('MVI_0284', 36.45, 1.10)}  # smiling after "Start with your money blueprint." — three beats
if not ONLY or 'base' in ONLY:
    for name, (clip, ss, d) in BASES.items():
        run(name, ['-ss', f'{ss:.3f}', '-i', f'{RAW}/{clip}.MP4', '-t', f'{d:.3f}', '-vf', f'fps=30,{COVER},{HIRAL}'] + ENC + [f'{SEG}/{name}.mp4'])

# M6W: the music-drop shot rebuilt from bigger rooms (user: "show multiple women in a room") — 3 cuts on the beat
PH = '/Users/lollyg/Documents/investing for Mummies/highlight-reel-assets/mummies/photos'
if not ONLY or 'room' in ONLY:
    GR = 'eq=contrast=1.04:saturation=1.08:brightness=0.01'
    # user: not our classroom — the outside workshops from the deck: Stree Dhan, K-Phyto Extraction, Money Blueprint Goa
    O = S + '/../outside'
    run('W1', ['-ss', '0.600', '-i', f'{O}/IFM-356/81C49F2E-8406-433A-AF3A-68A92794FCFB.MP4', '-t', '1.800',          # Stree Dhan: the full hotel room
               '-vf', f"fps=30,crop=1215:2160:x='900+950*t/1.8':y=0,scale=1080:1920,setsar=1,{GR}"] + ENC + [f'{SEG}/W1.mp4'])  # pan across the room
    run('W2', ['-loop', '1', '-framerate', '30', '-i', '/Users/lollyg/Documents/investing for Mummies/highlight-reel-assets/gflow-final/13-full-batch-group-photo.jpg',
               '-vf', f"scale=-2:1920,crop=1080:1920:x='(iw-1080)*(0.08+0.84*t/1.8)':y=0,setsar=1,{GR}", '-frames:v', '54'] + ENC + [f'{SEG}/W2.mp4'])  # K-Phyto: pan the whole batch
    run('W3', ['-ss', '2.400', '-i', f'{O}/IFM-248_sdr.mov', '-t', '1.800',                                              # Goa: the cheer
               '-vf', f'fps=30,crop=608:1080:700:0,scale=1080:1920,setsar=1,{GR}'] + ENC + [f'{SEG}/W3.mp4'])
    open(f'{S}/wu_M6W.txt', 'w').write(''.join(f"file '{SEG}/{p}.mp4'\n" for p in ('W1', 'W2', 'W3')))
    run('M6W', ['-f', 'concat', '-safe', '0', '-i', f'{S}/wu_M6W.txt'] + ENC + [f'{S}/seg/M6W.mp4'])

JARGON ='SIP|NAV|EMI|XIRR|CAGR|ELSS|SWP|STP|NFO|AUM|TER|KYC'
STILLS = {
    'S0_pre': ([{'fx': 'uninstall', 'start': 0.0, 'end': 1.94, 'text': 'Uninstalling: money fear'}], '0.35,1.00,1.62,1.90'),
    'S6_stamp': ([{'fx': 'shortcut-rain', 'start': 0.0, 'end': 1.5, 'text': JARGON, 'count': 30},
                  {'fx': 'reject-stamp', 'start': 0.45, 'end': 1.5, 'text': 'NOT A LECTURE', 'color': '#D62828', 'angle': -12, 'y': 0.3}], '0.40,0.75,1.30'),
    'C6_smile': ([{'fx': 'red-collage', 'start': 0.0, 'end': 1.45, 'text': 'BORING?', 'lines': 'NO LECTURES.|NO JARGON.|JUST GAMES.', 'tag': 'THE WEALTH CONVERSATION'}], '0.20,0.70,1.30'),
    # S12 option i: push through "Join the wealth conversation." then the phone-fan on "Start with your money blueprint."
    'S12_join': ([{'fx': 'slow-push', 'start': 0.0, 'end': 1.75},
                  {'fx': 'phone-fan', 'start': 1.75, 'end': 3.7, 'images': f'{S}/wu_fx/class4', 'text': 'START WITH YOUR|MONEY BLUEPRINT'}], '0.90,1.70,2.60,3.50'),
}
# S12 option ii: the push keeps going under the phone-fan (no snap back)
STILLS_B = {'S12_join': ([{'fx': 'slow-push', 'start': 0.0, 'end': 3.75},
                          {'fx': 'phone-fan', 'start': 1.75, 'end': 3.7, 'images': f'{S}/wu_fx/class4', 'text': 'START WITH YOUR|MONEY BLUEPRINT'}], '2.60,3.50')}
if not ONLY or 'still' in ONLY:
    for tag, table in (('', STILLS), ('B', STILLS_B)):
        for name, (effects, stills) in table.items():
            plan = f'{LOOK}/{name}{tag}.json'; json.dump({'effects': effects}, open(plan, 'w'))
            r = subprocess.run([PY, FX + '/scripts/fx.py', '--plan', plan, f'{SEG}/{name}.mp4', f'{LOOK}/{name}{tag}.png', '--still', stills], capture_output=True, text=True)
            print(('ok ' if r.returncode == 0 else 'FAIL ') + f'still {name}{tag}' + ('' if r.returncode == 0 else '\n' + r.stderr[-800:]), flush=True)
print('V6 PREP DONE', flush=True)
