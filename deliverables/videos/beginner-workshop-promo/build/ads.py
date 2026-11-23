#!/usr/bin/env python3
"""Instagram ad cuts from the v8 promo (out8/final.mp4 + its voice stem). Cuts land only between sentences.
Picture: frame-exact trims of v8. Voice: v8's voice stem, same trims (sync preserved). Music: one continuous Suno bed
(no jumps at the cuts), rising into the logo. Outputs 9:16 (Reels/Stories) and 4:5 (Feed, blurred side fill).
  python3 ads.py          -> ads/IFM-ad-<n>-<name>-9x16.mp4 / -4x5.mp4 + contact sheets
"""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); V8 = f"{HERE}/out8/final.mp4"; VO = f"{HERE}/out8/stem_voice.wav"
MUS = f"{HERE}/music/suno.mp3"; OUT = f"{HERE}/ads"; os.makedirs(OUT, exist_ok=True)
PRE = 0.8; FPS = 30
END = [(43.38, 47.60)]                       # "this is your invitation. Click on the link below to register your interest."
LOGO = (51.93, 52.93)                         # v8's finished logo (output time)
ADS = {
    "1-the-question":   [(-0.80, 6.65), (36.30, 39.48)] + END,   # question + I've got you / 5 days, room full of women
    "2-jargon-wall":    [(3.60, 6.65), (18.30, 24.13)] + END,   # overwhelming + I've got you / fundamentals, stocks MF gold
    "3-games-not-lectures": [(28.00, 36.30), (37.95, 39.48)] + END,  # zero boring lectures, games... / room full of women
}
def run(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-1500:]); raise SystemExit(1)
def f(x): return int(round(x * FPS))

for name, segs in ADS.items():
    pieces = [(f(a + PRE), f(b + PRE)) for a, b in segs] + [(f(LOGO[0]), f(LOGO[1]))]
    n = sum(b - a for a, b in pieces); D = n / FPS
    vf = []; af = []
    for k, (a, b) in enumerate(pieces):
        vf.append(f"[0:v]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS[v{k}]")
    for k, (a, b) in enumerate(pieces[:-1]):       # voice only for the speech pieces; silence under the logo
        af.append(f"[1:a]atrim={a / FPS}:{b / FPS},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={(b - a) / FPS - 0.03}:d=0.03[a{k}]")
    L = len(pieces) - 1
    af.append(f"anullsrc=r=48000:cl=mono,atrim=0:{(pieces[-1][1] - pieces[-1][0]) / FPS}[a{L}]")
    speech_end = sum(b - a for a, b in pieces[:-1]) / FPS
    fc = ";".join(vf + af + [
        "".join(f"[v{k}]" for k in range(len(pieces))) + f"concat=n={len(pieces)}:v=1:a=0,setpts=N/30/TB[v]",
        "".join(f"[a{k}]" for k in range(len(pieces))) + f"concat=n={len(pieces)}:v=0:a=1,aresample=48000,pan=stereo|c0=c0|c1=c0[vo]",
        # bed starts in the groove (track 15.6 s), steady under speech, rises gently into the logo
        f"[2:a]aresample=48000,atrim=15.6:{15.6 + D},asetpts=PTS-STARTPTS,acompressor=threshold=-24dB:ratio=3:attack=20:release=250:makeup=4,"
        f"volume='if(lt(t,{speech_end}),0.12,min(0.26,0.12+(t-{speech_end})/0.8))':eval=frame,afade=t=in:d=0.15,afade=t=out:st={D - 0.35}:d=0.35[mu]",
        "[vo][mu]amix=inputs=2:normalize=0:duration=first[mx]"])
    tmp = f"{OUT}/_{name}.mp4"
    run("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", V8, "-i", VO, "-i", MUS, "-filter_complex", fc, "-map", "[v]", "-map", "[mx]",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-fps_mode", "passthrough", "-c:a", "pcm_s16le", tmp.replace(".mp4", ".mov"))
    src = tmp.replace(".mp4", ".mov")
    meas = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", src, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000")
    o916 = f"{OUT}/IFM-ad-{name}-9x16.mp4"; o45 = f"{OUT}/IFM-ad-{name}-4x5.mp4"
    run("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-c:v", "copy", "-af", ln, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", o916)
    # 4:5 feed: whole 9:16 frame centred, sides filled with a blurred, darkened copy (no text cropped off)
    run("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", o916, "-filter_complex",
        "[0:v]split[a][b];[a]scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,boxblur=30:2,eq=brightness=-0.08[bg];"
        "[b]scale=-2:1350[fg];[bg][fg]overlay=(W-w)/2:0,setsar=1[v]", "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-crf", "18",
        "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", o45)
    run("ffmpeg", "-nostdin", "-v", "error", "-y", "-i", o916, "-vf", "fps=1,scale=180:-1,tile=8x2", "-frames:v", "1", f"{OUT}/IFM-ad-{name}_sheet.jpg")
    os.remove(src)
    print(name, f"{D:.2f}s", n, "frames")
