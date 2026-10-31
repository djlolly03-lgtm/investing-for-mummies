#!/usr/bin/python3
"""B + four effects (v6B): effect passes. New output names only — B's approved intermediates are left alone.
  S0_fx    uninstall bar on Hiral's silent pre-roll (new opening, one bar)
  H2_fxB6  B's H2 with the NO BORING LECTURES spotlight swapped for jargon rain + NOT A LECTURE stamp on "lectures"
  C6_fx    red-collage on her silent smile (new beat between H2 and the games orbit)
  H4_fxB6  B's H4 plus a slow push-in on "Join the wealth conversation" (MVI_0284 part, 10.98 -> cut at 14.567)"""
import subprocess, json, os, sys, time, shutil
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
SEG = S + '/seg'; FX = '/Users/lollyg/.claude/skills/effects'; PY = FX + '/.venv/bin/python'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
for b in ('S0_pre', 'C6_smile'): shutil.copy(f'{S}/wu/{b}.mp4', f'{SEG}/{b}.mp4')   # built by wu6_prep.py
JARGON = 'SIP|NAV|EMI|XIRR|CAGR|ELSS|SWP|STP|NFO|AUM|TER|KYC'
JOBS = {
    'S0_fx':   ('S0_pre',   [{'fx': 'uninstall-clear', 'start': 0.0, 'end': 3.40, 'hold': 0.9, 'finish': 'top', 'text': 'Uninstalling: fear of investing', 'done': 'Done ✓'}]),
    # H2 local: "No"@4.80  "lectures"@5.34 (RL6 at C_f+8.86); the stamp's slam takes 0.16s
    'H2_fxB6': ('H2',       [{'fx': 'match-cut', 'start': 2.3, 'end': 3.5, 'text': 'economy'},
                             {'fx': 'shortcut-rain', 'start': 4.6, 'end': 6.1, 'text': JARGON, 'count': 30},
                             {'fx': 'reject-stamp', 'start': 5.18, 'end': 6.1, 'text': 'NOT A LECTURE', 'color': '#D62828', 'angle': -12, 'y': 0.3}]),
    'C6_fx':   ('C6_smile', [{'fx': 'red-collage', 'start': 0.0, 'end': 1.10, 'text': 'BORING?', 'lines': 'NO LECTURES.|NO JARGON.|JUST GAMES.', 'tag': 'THE WEALTH CONVERSATION'}]),
    # push first, LED sign after it, so the sign stays sharp instead of being blurred with the room
    'H4_fxB6': ('H4',       [{'fx': 'messages', 'start': 0.2, 'end': 3.95, 'y': 0.92, 'title': 'Your money', 'text': 'Your FD matures tomorrow|SIP of ₹10,000 debited|Markets down 1.8% today|Policy renewal due in 7 days'},
                             # (apple-toggles removed 31 Oct: the user wants the three outcomes as falling stickers, see captions6B)
                             {'fx': 'slow-push', 'start': 10.98, 'end': 14.567, 'zoom': 1.5},
                             {'fx': 'led-sign', 'start': 11.0, 'end': 14.4, 'text': 'JOIN THE|CONVERSATION'}]),
    # CHALLENGE bigger and bolder: Anton (heavy, condensed) fills the width ~1.7x taller than Archivo; gold
    'HG3_fxB6': ('HG3',     [{'fx': 'orbit', 'start': 0.4, 'end': 4.7, 'images': S + '/fxtest2/games', 'count': 6, 'speed': 0.9, 'size': 0.3},
                             {'fx': 'backdrop-word', 'start': 4.7, 'end': 6.85, 'text': 'CHALLENGE', 'font': 'anton', 'color': '#FCC536'}]),
    # "Walk away": B's 0.7s lean-in snapped back like a glitch -> one gentle push across the whole shot, ending on the cut
    'H5_fx6':   ('H5',      [{'fx': 'slow-push', 'start': 0.0, 'end': 9.367, 'zoom': 1.15, 'blur': 0.002}]),
}
only = set(sys.argv[1:])
for name, (base, effects) in JOBS.items():
    if only and name not in only: continue
    plan = f'{S}/fxtest/{name}.json'; json.dump({'effects': effects}, open(plan, 'w')); t = time.time()
    r = subprocess.run([PY, S + '/fx6.py', '--plan', plan, f'{SEG}/{base}.mp4', f'{SEG}/{name}.mp4'], capture_output=True, text=True)
    ok = r.returncode == 0 and os.path.exists(f'{SEG}/{name}.mp4')
    print(f'{"ok" if ok else "FAIL"} {name} <- {base} ({time.time()-t:.0f}s)', flush=True)
    if not ok: print(r.stderr[-800:], flush=True); sys.exit(1)
print('FX6B DONE', flush=True)
