#!/usr/bin/python3
"""Render the effect passes on Hiral's base shots with the installed effects skill (one output per variant)."""
import subprocess, json, os, sys, time
S = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp'
SEG = S + '/seg'; FX = '/Users/lollyg/.claude/skills/effects'; PY = FX + '/.venv/bin/python'
os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
JOBS = {
    # name: (base segment, effects)
    'Q_fx':   ('Q',     [{'fx': 'locked-on', 'start': 0.0, 'end': 1.6, 'zoom': 1.3}]),
    'Q_fxB':  ('Q',     [{'fx': 'backdrop-word', 'start': 0.0, 'end': 1.6, 'text': 'REALLY?', 'font': 'serif'}]),
    'H2_fx':  ('H2',    [{'fx': 'spotlight', 'start': 4.8, 'end': 6.1, 'text': 'NO BORING LECTURES'}]),
    'H2n_fx': ('H2_p1', [{'fx': 'spotlight', 'start': 0.0, 'end': 1.5, 'text': 'NO BORING LECTURES'}]),
    'H3_fx':  ('H3',    [{'fx': 'lean-in', 'start': 0.0, 'end': 0.8, 'zoom': 1.3}]),
    'H3_fxB': ('H3',    [{'fx': 'backdrop-word', 'start': 0.0, 'end': 2.15, 'text': 'CHALLENGE', 'font': 'bold'}]),
    'H4_fx':  ('H4',    [{'fx': 'todo', 'start': 4.2, 'end': 10.9, 'text': 'Ask the right questions|Make your voice heard|Take an active role', 'ticks': '4.7|6.4|7.8', 'title': 'You walk away able to'},
                         {'fx': 'spotlight', 'start': 11.0, 'end': 14.4, 'text': 'JOIN'}]),
    'H4_fxB': ('H4',    [{'fx': 'messages', 'start': 0.2, 'end': 3.95, 'y': 0.92, 'title': 'Your money', 'text': 'Your FD matures tomorrow|SIP of ₹10,000 debited|Markets down 1.8% today|Policy renewal due in 7 days'},
                         {'fx': 'apple-toggles', 'start': 4.2, 'end': 10.9, 'text': 'Ask the right Qs|Make yourself heard|Take an active role', 'ticks': '0.5|2.2|3.6'},
                         {'fx': 'led-sign', 'start': 11.0, 'end': 14.4, 'text': 'JOIN THE|CONVERSATION'}]),
    'AB_moody': ('AB',  [{'fx': 'moody', 'start': 0.0, 'end': 3.83, 'grade': 'moody'}]),
    'H5_fx':   ('H5',   [{'fx': 'lean-in', 'start': 0.0, 'end': 0.7, 'zoom': 1.25}]),   # punch on "Walk away"
    # B v2: newspaper match-cut on "the economy" + the spotlight; orbit of game screens on the games line, then CHALLENGE
    'H2_fxB':  ('H2',   [{'fx': 'match-cut', 'start': 2.3, 'end': 3.5, 'text': 'economy'},
                         {'fx': 'spotlight', 'start': 4.8, 'end': 6.1, 'text': 'NO BORING LECTURES'}]),
    'HG3_fxB': ('HG3',  [{'fx': 'orbit', 'start': 0.4, 'end': 4.7, 'images': S + '/fxtest2/games', 'count': 6, 'speed': 0.9, 'size': 0.3},
                         {'fx': 'backdrop-word', 'start': 4.7, 'end': 6.85, 'text': 'CHALLENGE', 'font': 'bold'}]),
}
only = set(sys.argv[1:])
for name, (base, effects) in JOBS.items():
    if only and name not in only: continue
    plan = f'{S}/fxtest/{name}.json'; json.dump({'effects': effects}, open(plan, 'w'))
    t = time.time()
    r = subprocess.run([PY, FX + '/scripts/fx.py', '--plan', plan, f'{SEG}/{base}.mp4', f'{SEG}/{name}.mp4'], capture_output=True, text=True)
    ok = r.returncode == 0 and os.path.exists(f'{SEG}/{name}.mp4')
    n = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames,width,height,r_frame_rate', '-of', 'csv=p=0', f'{SEG}/{name}.mp4'], capture_output=True, text=True).stdout.strip() if ok else ''
    print(f'{"ok" if ok else "FAIL"} {name} <- {base} ({time.time()-t:.0f}s) {n}', flush=True)
    if not ok: print(r.stderr[-800:], flush=True)
print('FX DONE', flush=True)
