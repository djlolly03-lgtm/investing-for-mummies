#!/usr/bin/python3
"""Warm-Up Round cut — step 1: base clips (Hiral takes synced to the phone VO, POP-graded b-roll) + stills of the
uncertain effects for a look check.  camera = phone + SHIFT per take (from the cross-correlations)."""
import subprocess, os, sys, json, shlex, time
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
RAW = S + '/../raw'; SEG = S + '/wu'; FX = '/Users/lollyg/.claude/skills/effects'; PY = FX + '/.venv/bin/python'
R = '/Users/lollyg/Documents/investing for Mummies'
os.makedirs(SEG, exist_ok=True); os.makedirs(S + '/wu_fx', exist_ok=True)
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
COVER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1'
HIRAL = 'eq=contrast=1.05:brightness=0.012:saturation=1.05'
POP = 'eq=saturation=1.25:contrast=1.06:brightness=0.03'

def run(name, args):
    t = time.time(); cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print(f'FAIL {name}\n{" ".join(shlex.quote(a) for a in cmd)}\n{r.stderr[-1200:]}', flush=True); sys.exit(1)
    print(f'ok {name} ({time.time()-t:.0f}s)', flush=True)

# camera = phone + shift
SHIFT = {'MVI_0272': -1.42, 'MVI_0275': 2.336, 'MVI_0277': 3.80, 'MVI_0278': 2.30, 'MVI_0279': 2.60, 'MVI_0280': 2.30, 'MVI_0283': 4.00, 'MVI_0284': 3.76, 'MVI_0285': -1.69}
PHONE = {'MVI_0272': 'Hook', 'MVI_0275': '3 points', 'MVI_0277': 'Rungtha Lane 5 2', 'MVI_0278': 'Rungtha Lane 6', 'MVI_0279': 'After no boring lecture',
         'MVI_0280': 'Walsingham House School', 'MVI_0283': 'Rungtha Lane 9', 'MVI_0284': 'Rungtha Lane 10', 'MVI_0285': 'Rungtha Lane 11'}
# Hiral segments: name -> (clip, phone_start, phone_end)   [video = camera window; VO = the same phone window]
H = {
    'S2_q3': ('MVI_0272', 8.60, 10.90),    # "do you really know what your money is doing for you?"
    'S3_q2': ('MVI_0275', 2.88, 5.38),     # "Why does inflation make your money work less?"
    'S4_q1': ('MVI_0275', 10.22, 14.32),   # "How do you know that your investments are actually helping you reach your goals?"
    'S5_title': ('MVI_0277', 12.78, 17.18),  # "That's where the Wealth Conversation begins with the Money Blueprint,"
    'S6_stamp': ('MVI_0278', 2.92, 4.42),    # "No boring lectures."
    'S7_games': ('MVI_0279', 2.60, 5.07),    # "We learn through games, relatable analogies"
    'S9_swipe': ('MVI_0279', 6.49, 9.25),    # "that challenge the way you think about money and investing."
    'S10_bill': ('MVI_0280', 36.80, 46.25),  # "Walk away with a framework ... financial journey."
    'S11_ask': ('MVI_0283', 16.62, 27.85),   # "You don't have to manage every investment ... financial future."
    'S12_join': ('MVI_0284', 29.15, 32.90),  # "Join the wealth conversation. Start with your money blueprint."
    'S13_credit': ('MVI_0285', 11.42, 13.95),  # "Brought to you especially by EO New Mumbai."
}
for name, (clip, a, b) in H.items():
    run(name, ['-ss', f'{a + SHIFT[clip]:.3f}', '-i', f'{RAW}/{clip}.MP4', '-t', f'{b - a:.3f}', '-vf', f'fps=30,{COVER},{HIRAL}'] + ENC + [f'{SEG}/{name}.mp4'])
# S1 hook: a held frame of Hiral just before she speaks (lips closed), 2.30s
run('S1_still', ['-ss', f'{8.45 + SHIFT["MVI_0272"]:.3f}', '-i', f'{RAW}/MVI_0272.MP4', '-frames:v', '1', '-vf', f'{COVER},{HIRAL}', f'{SEG}/S1_frame.png'])
run('S1_hold', ['-loop', '1', '-t', '2.30', '-i', f'{SEG}/S1_frame.png', '-vf', 'fps=30,format=yuv420p'] + ENC + [f'{SEG}/S1_hold.mp4'])
# b-roll (POP grade): cut-aways and the one-bar class burst
B = {'CA1_laugh': (f'{S}/sdr/m04.mp4', 0.40, 0.65), 'CA2_talk': (f'{S}/sdr/m11.mp4', 6.40, 0.65),
     'B1_activity': (f'{R}/highlight-reel-assets/v8209.mov', 4.20, 0.65), 'B2_screens': (f'{R}/highlight-reel-assets/v8415.mov', 1.40, 0.65), 'B3_phones': (f'{S}/sdr/v0770.mp4', 5.40, 0.64),
     'N1_notes': (f'{S}/sdr/m15.mp4', 5.30, 1.30), 'N2_books': (f'{S}/sdr/m12.mp4', 0.70, 1.30)}
for name, (src, ss, d) in B.items():
    run(name, ['-ss', f'{ss:.3f}', '-i', src, '-t', f'{d:.3f}', '-vf', f'fps=30,{COVER},{POP}'] + ENC + [f'{SEG}/{name}.mp4'])

# image folders: 4 game screens / 4 class photos (phone-fan draws exactly four)
import shutil
for d, files in {'games4': ['1-kbc.png', '2-stockrush.png', '3-swayamvar.png', '4-moneymap.png'], 'class4': ['1-kphyto.jpg', '2-banner.jpg', '3-stairs.jpg', '5-laugh.jpg']}.items():
    os.makedirs(f'{S}/wu_fx/{d}', exist_ok=True)
    for f in files: shutil.copy(f'{S}/fxtest2/{"games" if d == "games4" else "class"}/{f}', f'{S}/wu_fx/{d}/{f}')

# stills of the effects whose look I have not seen yet
STILLS = {
    'S1_hold': ([{'fx': 'dot-reveal', 'start': 0.0, 'end': 0.45, 'color': '#FF6B57', 'cell': 0.02},
                 {'fx': 'pause-point', 'start': 0.45, 'end': 1.1, 'text': 'warm-up round', 'color': '#FF6B57', 'label_x': 0.72},
                 {'fx': 'countdown-flip', 'start': 1.1, 'end': 2.3, 'from': 3}], '0.2,0.8,1.5'),
    'S3_q2': ([{'fx': 'scribble', 'start': 0.4, 'end': 2.4, 'text': 'buys less?', 'color': '#F2B544'}], '1.6'),
    'S4_q1': ([{'fx': 'lineup', 'start': 0.6, 'end': 4.0, 'text': 'Your goals|Inflation|Your money'}], '2.6'),
    'S5_title': ([{'fx': 'cover-star', 'start': 0.1, 'end': 4.3, 'look': 'editorial', 'text': 'THE WEALTH CONVERSATION', 'issue': 'THE MONEY BLUEPRINT  ·  A WORKSHOP FOR BEGINNERS',
                   'lines': 'Money games, not lectures|Ask the right questions|A framework you keep', 'right': 'For beginners|Corporate edition'}], '2.5'),
    'S6_stamp': ([{'fx': 'reject-stamp', 'start': 0.3, 'end': 1.5, 'text': 'NOT A LECTURE', 'color': '#D62828', 'angle': -12, 'y': 0.3}], '0.9'),
    'S7_games': ([{'fx': 'phone-fan', 'start': 0.0, 'end': 2.47, 'images': f'{S}/wu_fx/games4', 'text': 'MONEY GAMES|NOT HOMEWORK'}], '1.6'),
    'S9_swipe': ([{'fx': 'swipe', 'start': 0.1, 'end': 2.6, 'grade': 'pop'}], '1.3'),
    'S10_bill': ([{'fx': 'the-bill', 'start': 0.4, 'end': 9.2, 'text': 'THE MONEY BLUEPRINT|a goals framework|an investing framework|strategies for the road|TOTAL: one blueprint'}], '4.0,8.0'),
    'S11_ask': ([{'fx': 'headline-box', 'start': 4.3, 'end': 6.1, 'text': 'ASK THE|RIGHT QUESTIONS', 'zoom': 1.2}], '5.2'),
    'S12_join': ([{'fx': 'phone-fan', 'start': 0.0, 'end': 3.7, 'images': f'{S}/wu_fx/class4', 'text': 'START WITH YOUR|MONEY BLUEPRINT'}], '2.0'),
}
for name, (effects, stills) in STILLS.items():
    plan = f'{S}/wu_fx/{name}.json'; json.dump({'effects': effects}, open(plan, 'w'))
    r = subprocess.run([PY, FX + '/scripts/fx.py', '--plan', plan, f'{SEG}/{name}.mp4', f'{S}/wu_fx/{name}.png', '--still', stills], capture_output=True, text=True)
    print(('ok ' if r.returncode == 0 else 'FAIL ') + f'still {name}' + ('' if r.returncode == 0 else '\n' + r.stderr[-600:]), flush=True)
print('WU PREP DONE', flush=True)
