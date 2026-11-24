#!/usr/bin/env python3
"""EO Nagpur opening v2 (24 Nov 2026): split screen.
Top half: the EO Nagpur -> The Wealth Conversation logo morph (Logo_morphing_into_text_1d18f12b.mp4); after its 10s it
holds the wordmark with a slow push. Bottom half: Hiral's personal message to EO Nagpur (IMG_9167.MOV, Drive
1hM_JVoWkWJ8-zhr282v7azvZvnK0IAr_, iPhone HLG -> SDR with avconvert). Falling IFM stickers land on her key words.
Writes $TMP/split.mp4 and $TMP/msg_voice.wav (processed like the phone VO: highpass 90 + afftdn + loudnorm -18).
  python opening_split.py still T [T...]  (T = time in the split)  |  python opening_split.py"""
import os, sys, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eo_nagpur_v2 import frames, write, over, Matte, TMP, W, H, FPS, DL

MSG = os.environ.get('MSG_SDR', os.path.join(TMP, 'msg_sdr.mov'))       # avconvert --preset Preset1920x1080 of IMG_9167.MOV
LOGO = os.path.join(DL, 'Logo_morphing_into_text_1d18f12b.mp4')
M0, M1 = 3.35, 17.60                       # trim: just before "I'm" to just after "ask."
N = int(round((M1 - M0) * FPS))
HALF = H // 2
NAVY = (26, 58, 92, 255)


def local(t): return t - M0                # message time -> split time


def stickers():
    f = lora(66); fb = lora(92)
    return [
        (sticker('The Money Blueprint', f, GOLD, SLATE), 40, 610, local(4.78), -2.5, local(9.70)),
        (sticker('4 December', fb, NAVY, CREAM, pad=(30, 16)), 70, 700, local(6.06), 2.0, local(9.70)),
        (sticker('Hands-on workshop', f, CREAM, SLATE), 40, 830, local(7.42), -1.5, local(9.70)),
        (sticker('What you own', f, CREAM, SLATE), 60, 660, local(9.92), -2.0, local(14.10)),
        (sticker('Goals that matter to you', f, GOLD, SLATE), 40, 790, local(12.52), 1.5, local(14.10)),
    ]


SCALE, CY = 0.72, 0.135  # logo shrunk and centred near the top so EO Nagpur / the wordmark read above her head


def render(stills=None):
    """v9b (user, 24 Nov): no split, no text boxes - Hiral full frame, the logo morph replaces the wall behind her."""
    msg = frames(MSG, M0, N, (W, H))
    lg = frames(LOGO, 0, min(N, 300), (W, H))
    fill = lg[0][-40:, :].reshape(-1, 3).mean(0)          # the clip's own cream background, for the uncovered bottom
    mt = Matte(); out = []
    idx = [int(round(t * FPS)) for t in stills] if stills else range(N)
    for i in idx:
        t = i / FPS
        # hold the static EO Nagpur logo first, then roll the 10s morph so it lands on the wordmark as her message ends
        li = min(len(lg) - 1, max(0, i - (N - len(lg))))
        z = 1.0
        L = Image.fromarray(lg[li])
        if z > 1: L = L.resize((W, H), Image.LANCZOS, box=(W / 2 - W / z / 2, H * 0.48 - H / z * 0.48, W / 2 + W / z / 2, H * 0.48 + H / z * 0.52))
        # scale the clip so the logo fits above her head, centred at CY (content centre is 0.48 down the clip)
        sw, sh = int(W * SCALE), int(H * SCALE); Ls = L.resize((sw, sh), Image.LANCZOS)
        fr = lg[li]; fill = np.concatenate([fr[:40].reshape(-1, 3), fr[-40:].reshape(-1, 3), fr[:, :30].reshape(-1, 3), fr[:, -30:].reshape(-1, 3)]).mean(0)
        canvas = Image.new('RGB', (W, H), tuple(int(v) for v in fill))
        x0 = (W - sw) // 2; y0 = int(CY * H - 0.48 * sh)
        fm = Image.new('L', (sw, sh), 0); ImageDraw.Draw(fm).rectangle([30, 30, sw - 31, sh - 31], fill=255)
        canvas.paste(Ls, (x0, y0), fm.filter(ImageFilter.GaussianBlur(20)))
        bg = np.asarray(canvas).astype(np.float32)
        m = mt(msg[i]) if stills is None else Matte()(msg[i])
        f = bg * (1 - m) + msg[i].astype(np.float32) * m
        if stills is not None:
            Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(f'{TMP}/behind_still_{t:05.2f}.png')
        else:
            out.append(f)
    if stills is None:
        write('split', out)
        subprocess.run(['/opt/homebrew/bin/ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', str(M0), '-t', str(M1 - M0), '-i', MSG,
                        '-af', 'highpass=f=90,afftdn,loudnorm=I=-18:TP=-2:LRA=11', '-ar', '48000', '-ac', '2',
                        os.path.join(TMP, 'msg_voice.wav')], check=True)
        print('split frames', N)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'still': render([float(x) for x in sys.argv[2:]])
    else: render()
