#!/usr/bin/env python3
"""v11 pacing pass: make the body cut like the cold open. Two moves, both pure re-framing of a finished shot — no frame
is added, dropped or retimed, so the voice placement (and lip-sync) is untouched.
  JUMP   — jump-cut punch-ins on her long lines: hard cut to a tighter, face-centred frame on a phrase, hard cut back.
  SETTLE — the cold open's punch on a hard cut: the shot lands at 112% and settles to 100% in 9 frames.
Runs after prep.py, before captions.py (stickers, name bars and captions go on top, so they never jump with the crop).
Reads seg/<name>.mp4, writes seg/<name>_p.mp4. Run with the effects venv (needs cv2 + its YuNet face model):
  ~/.claude/skills/effects/.venv/bin/python punch.py"""
import subprocess, os, sys
import numpy as np, cv2
W = '/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/flagship'
SEG = W + '/seg'; os.environ['PATH'] = '/opt/homebrew/bin:' + os.environ['PATH']
YUNET = os.path.expanduser('~/.claude/skills/effects/models/yunet.onnx')
FW, FH, FPS = 1080, 1920, 30
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-g', '30', '-pix_fmt', 'yuv420p', '-an']
SETTLE = (1.12, 9)
# v14: the profile wall's own counter card comes out (the stats card in hyperframes/stats.html replaces it): from the
# wall's first frame, everything below y=1000 is taken back from the un-effected shot. The wall itself ends ~y=800.
UNCARD = {}   # v17: was {'H5_fx': ('H5', 222, 1000)} — the wall is gone, so nothing to take back
CENTRE = {'Qb': (900, 900)}   # fixed punch centre where the biggest face is not the subject (Qb: the student in yellow, not the one behind)
# name: (jump windows as (start s, end s, zoom) in shot-local seconds, settle on frame 0?)
# Times come from her word timings in the cut (global − shot start).
JOBS = {
    'H1_fx':  ([(1.10, 1.78, 1.15),     # "You save it."
                (1.78, 3.44, 1.30)],    # "Maybe you even invest it." — back wide on "But do you really…" for the REALLY? sign
               False),
    'Qb':     ([(0.65, 9.99, 1.22)], False),   # punch on "STUPID question" — onto the laughing student (CENTRE below)
    'Qc_fx':  ([(5.23, 9.99, 1.12)], False),   # "It comes from knowing that you can learn." (on top of its slow push)
    'H5_fx':  ([(4.47, 6.17, 1.18)], False),   # "ask the right questions" — after the notifications clear (they sit low)
    'K1_fx': ([], True), 'K2': ([], True), 'K3': ([], True), 'K4': ([], True),
    'T1a_fx': ([], True), 'T2': ([], True),   # v14: T2, not T2_fx (GOT IT! scribble removed)
    'T3': ([], True), 'CERT': ([], True),
}

def frames(p):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', p, '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(-1, FH, FW, 3)

def face_track(fr):
    """Face centre per frame (YuNet on a 1/4 frame, every 3rd frame, held + smoothed). None where nothing is found."""
    fd = cv2.FaceDetectorYN.create(YUNET, '', (FW // 4, FH // 4), 0.6, 0.3, 20)
    pts = []
    for i in range(len(fr)):
        if i % 3 == 0:
            _, f = fd.detect(cv2.resize(fr[i], (FW // 4, FH // 4)))
            if f is not None and len(f):
                b = max(f, key=lambda r: r[2] * r[3]); pts.append((i, (b[0] + b[2] / 2) * 4, (b[1] + b[3] / 2) * 4))
    if not pts: return None
    idx = np.arange(len(fr)); xs = np.interp(idx, [p[0] for p in pts], [p[1] for p in pts]); ys = np.interp(idx, [p[0] for p in pts], [p[2] for p in pts])
    k = np.ones(15) / 15
    return np.convolve(np.pad(xs, 7, mode='edge'), k, 'valid'), np.convolve(np.pad(ys, 7, mode='edge'), k, 'valid')

def crop(img, z, cx, cy):
    """Scale by z about the face, keeping the face at ~40% height and the frame filled."""
    cw, ch = FW / z, FH / z
    x0 = min(max(cx - cw / 2, 0), FW - cw); y0 = min(max(cy - ch * 0.40, 0), FH - ch)
    M = np.float32([[z, 0, -x0 * z], [0, z, -y0 * z]])
    return cv2.warpAffine(img, M, (FW, FH), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)

only = set(sys.argv[1:])
for name, (jumps, settle) in JOBS.items():
    if only and name not in only: continue
    fr = frames(f'{SEG}/{name}.mp4'); n = len(fr)
    if name in UNCARD:
        src, f0, y0 = UNCARD[name]; fr = fr.copy(); base = frames(f'{SEG}/{src}.mp4'); fr[f0:, y0:] = base[f0:n, y0:]
    tr = face_track(fr) if jumps and name not in CENTRE else None
    out = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{FW}x{FH}', '-r', str(FPS), '-i', '-',
                            '-frames:v', str(n)] + ENC + [f'{SEG}/{name}_p.mp4'], stdin=subprocess.PIPE)
    for i in range(n):
        t = i / FPS; z = 1.0
        for a, b, zz in jumps:
            if a <= t < b: z = zz
        cx, cy = (tr[0][i], tr[1][i]) if tr else CENTRE.get(name, (FW / 2, FH * 0.40))
        if settle and i < SETTLE[1]:
            u = i / SETTLE[1]; z *= 1 + (SETTLE[0] - 1) * (1 - u) ** 2; cx, cy = FW / 2, FH / 2   # ease-out, from the centre
        out.stdin.write((crop(fr[i], z, cx, cy) if z != 1.0 else fr[i]).tobytes())
    out.stdin.close(); out.wait()
    m = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f'{SEG}/{name}_p.mp4']).decode().strip().strip(','))
    assert m == n, (name, m, n)
    print(f'ok {name}_p ({n} frames, face {"tracked" if tr else "centre"})', flush=True)
# Cutaways (v12, v14): while a line runs on, the picture cuts to the class or a game for a beat and back, landing with
# the cold-open settle. The voice and word captions are untouched (they go on later), so sync cannot move.
ROOMG = 'eq=contrast=1.04:saturation=1.08:brightness=0.01'
SETTLE_VF = "zoompan=z='if(lt(on,9),1.10-0.0111*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1"
def phone(src, ss, zoom=1.0, cx=0.5, cy=0.5):
    """a vertical class clip, optionally pushed in toward (cx, cy)"""
    return ['-ss', f'{ss:.3f}', '-i', src], (f"{ROOMG},scale=iw*{zoom}:-2,crop=1080:1920:(iw-1080)*{cx}:(ih-1920)*{cy}," + SETTLE_VF)
def screen_card(src, ss, bg):
    """a landscape game screen on a cream-bordered tilted card over a blurred, darkened class clip (the certificate look)"""
    return (['-ss', f'{ss:.3f}', '-i', src, '-i', bg],
            "split=1[g];[g]scale=980:-2,pad=iw+24:ih+24:12:12:color=0xF4F1E6,format=rgba,rotate=-2*PI/180:c=0x00000000:ow=rotw(iw):oh=roth(ih)[card];"
            f"[BG]{ROOMG},scale=1080:1920,boxblur=30:3,eq=brightness=-0.25:saturation=0.8[bgb];"
            "[bgb][card]overlay=x=(W-w)/2:y=(H-h)/2-80:shortest=1," + SETTLE_VF)
CUTS = {   # out: (base, [(first frame, frames, kind, args)])
    'T3_x':  ('T3_p', [(94, 34, 'phone', (f'{W}/sdr/IFM-614.mov', 0.0))]),                  # "…laugh in the middle of it": the room laughing
    'Qc_x':  ('Qc_fx_p', [(112, 42, 'card', ('/Users/lollyg/Documents/investing for Mummies/CLAUDE/content/teasers/kbc-teaser.mp4', 3.2, f'{W}/sdr/IFM-723.mov'))]),
                                                                                           # "doesn't come from knowing everything": a live quiz question
    'H5_x':  ('H5_fx_p', [(186, 36, 'phone', (f'{W}/sdr/IFM-701.mov', 0.6, 1.35, 0.28, 0.30))]),   # "make your voice heard": a student speaking up
}
for out, (base, ins) in CUTS.items():
    if only and out not in only: continue
    n = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f'{SEG}/{base}.mp4']).decode().strip().strip(','))
    args, fc, prev = ['-i', f'{SEG}/{base}.mp4'], ['[0:v]setpts=PTS-STARTPTS,setsar=1[b0]'], 'b0'
    for k, (f0, m, kind, a) in enumerate(ins):
        i0 = args.count('-i')   # next input index (inputs carry -ss, so not len(args) // 2)
        if kind == 'phone':
            ia, vf = phone(*a); args += ia; fc.append(f'[{i0}:v]fps=30,trim=end_frame={m},setpts=PTS-STARTPTS,{vf},setpts=PTS+{f0}/30/TB[c{k}]')
        else:
            ia, vf = screen_card(*a); args += ia
            fc.append(f'[{i0}:v]fps=30,trim=end_frame={m},setpts=PTS-STARTPTS,' + vf.replace('[BG]', f'[{i0 + 1}:v]fps=30,trim=end_frame={m},setpts=PTS-STARTPTS,', 1)
                      .replace('split=1[g];[g]', '', 1) + f',setpts=PTS+{f0}/30/TB[c{k}]')
        fc.append(f'[{prev}][c{k}]overlay=0:0:eof_action=pass[b{k + 1}]'); prev = f'b{k + 1}'
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y'] + args + ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-frames:v', str(n)] + ENC + [f'{SEG}/{out}.mp4'],
                       capture_output=True, text=True)
    if r.returncode: print(out, r.stderr[-1500:]); sys.exit(1)
    print(f'ok {out} ({n} frames, {len(ins)} cutaway)', flush=True)
print('PUNCH DONE', flush=True)
