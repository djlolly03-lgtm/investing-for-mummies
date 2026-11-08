#!/usr/bin/python3
"""Nasdaq reel build: EDL -> voice (continuous PCM, cleaned) -> per-segment slice transcription -> captions ->
graphics (node render_gfx.js) -> per-segment video (exact frame counts) -> concat filter -> mux -> checks.
usage: build.py [--skip-gfx] [--skip-trans] v1"""
import os, sys, json, subprocess, math, shlex, re
from PIL import Image, ImageDraw, ImageFont
os.environ["PATH"] = "/opt/homebrew/bin:" + os.environ["PATH"]
B = os.path.expanduser("~/Developer/ifm-nasdaq"); W = B + "/build"; SDR = B + "/sdr"; BR = B + "/broll"
os.chdir(W); os.makedirs("seg", exist_ok=True); os.makedirs("cap", exist_ok=True); os.makedirs("aud", exist_ok=True)
TAG = [a for a in sys.argv[1:] if not a.startswith("--")][0] if [a for a in sys.argv[1:] if not a.startswith("--")] else "v1"
FPS = 30; SR = 48000
def sh(cmd, name=None):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: print("FAIL", name or cmd[0], "\n", " ".join(shlex.quote(c) for c in cmd), "\n", r.stderr[-2000:]); sys.exit(1)
    return r
def q(d): return round(d * FPS) / FPS           # quantise to frames
def nframes(p): return int(subprocess.check_output(["ffprobe","-v","error","-select_streams","v:0","-count_frames","-show_entries","stream=nb_read_frames","-of","csv=p=0",p]).decode().strip().strip(","))
T = lambda n: f"{SDR}/{n}.mov"

# ---------------- EDL: every segment = picture + a list of voice ranges (take, start, end) ----------------
# kind: cam (her, with zoom), gfx (rendered scene), broll (clip + overlay). ov = alpha overlay scenes on cam/broll.
EDL = [
 dict(id="s1",  kind="cam", take="IMG_4567", a=1.45, b=4.95, zoom=1.0,
      ov=[dict(type="stick", lines=[["The Nasdaq fell 5.5%","coral"],["in a single day.","cream"]], x=60, y=1000, t0=0.15)],
      fx=[dict(fx="backdrop-word", start=0.3, end=1.15, text="NASDAQ", font="anton", color="#D6B45C"), dict(fx="match-cut", start=1.15, end=2.6, text="STOCK EXCHANGE")]),
 dict(id="s2",  kind="gfx", scene=dict(type="index", paper=True, k=dict(basket=2.3, number=4.0, chart=5.6, final=8.1)),
      aud=[("IMG_4569", 9.60, 17.45)], pad=0.25, caps=True, capy=1560),
 dict(id="s3a", kind="gfx", scene=dict(type="indexhold", paper=True), aud=[("IMG_4571", 3.36, 5.45)], caps=True, capy=1560),
 dict(id="s3c", kind="gfx", scene=dict(type="three", k=dict(logos=99), logos=[]), aud=[("IMG_4571", 5.45, 10.30)], caps=True, capy=1560),
 dict(id="s3d", kind="cam", take="IMG_4571", a=10.30, b=14.15, zoom=1.0,
      padv=0.2, fx=[dict(fx="orbit", start=0.15, end=4.05, images=os.path.expanduser("~/Developer/ifm-nasdaq/tiles"), count=7, speed=0.8, size=0.21)]),
 dict(id="s4a", kind="gfx", scene=dict(type="weight", k=dict(cap=99)), aud=[("IMG_4574", 6.60, 11.10)], caps=True, capy=1560),
 dict(id="s4b", kind="cam", take="IMG_4574", a=11.10, b=15.90, zoom=1.0,
      ov=[dict(type="stick", lines=[["Technology has a","cream"],["big influence","gold"],["on the Nasdaq.","cream"]], x=60, y=960, t0=0.9)],
      fx=[dict(fx="lean-in", start=3.4, end=4.75, zoom=1.22), dict(fx="backdrop-word", start=1.8, end=4.7, text="BAROMETER", font="anton", color="#D6B45C")]),
 dict(id="s5a", kind="cam", take="IMG_4575", a=0.95, b=4.30, zoom=1.12, fx=[dict(fx="spotlight", start=0.2, end=3.3, text="WHY?", color="#D6B45C", push=1.12)]),
 dict(id="s5b", kind="broll", clip="flowai", aud=[("IMG_4575", 4.30, 6.40), ("IMG_4576", 1.30, 6.00)],
      ov=[dict(type="reason", n=1, h="THE AI SPENDING FRENZY", k=dict(sub=99, flow=99))], caps=True, capy=1560),
 dict(id="s6b", kind="cam", take="IMG_4576", a=6.00, b=9.95, zoom=1.0,
      ov=[dict(type="stick", lines=[["Big spending.","cream"],["Big question.","navy"],["Will it pay off?","gold"]], x=60, y=960, t0=0.5)],
      fx=[dict(fx="lean-in", start=2.5, end=3.9, zoom=1.3)]),
 dict(id="s7a", kind="cam", take="IMG_4580", a=5.85, b=7.25, zoom=1.0, fx=[dict(fx="lean-in", start=0.0, end=1.4, zoom=1.28)]),
 dict(id="s7b", kind="broll", clip="capitol", aud=[("IMG_4580", 7.25, 10.62)],
      ov=[dict(type="reason", n=2, h="POLITICAL UNCERTAINTY", k=dict(sub=99, flow=99))], caps=True, capy=1560),
 dict(id="s7c", kind="cam", take="IMG_4580", a=10.62, b=14.05, zoom=1.0,
      ov=[dict(type="stick", lines=[["Could new rules","cream"],["slow AI?","gold"]], x=60, y=1000, t0=0.5)],
      fx=[dict(fx="keycap-rain-land", start=0.1, end=3.4, text="RULES|PERMITS|REGULATION|ANTITRUST|LICENCES|DATA CENTRES|ZONING|TAX", count=8, floor=0.42, fall=1.2)]),
 dict(id="s8a", kind="cam", take="IMG_4581", a=1.35, b=4.30, zoom=1.12, fx=[dict(fx="reject-stamp", start=1.5, end=2.95, text="EXPENSIVE", color="#E17B70", angle=-10, y=0.08)]),
 dict(id="s8b", kind="gfx", scene=dict(type="chart", k=dict(h=0.0, sub=99)), aud=[("IMG_4581", 7.72, 11.70)], caps=True, capy=1560),
 dict(id="s8c", kind="cam", take="IMG_4581", a=11.70, b=15.90, zoom=1.0,
      ov=[dict(type="stick", lines=[["Are they worth","cream"],["the price?","gold"]], x=60, y=1000, t0=0.5)],
      fx=[dict(fx="slow-push", start=0.0, end=4.15, zoom=1.1), dict(fx="led-sign", start=1.2, end=4.0, text="WORTH IT?")]),
 dict(id="s9a", kind="cam", take="IMG_4585", a=14.20, b=18.08, zoom=1.0,
      ov=[dict(type="stick", lines=[["Is the AI boom","cream"],["losing steam?","gold"]], x=60, y=1000, t0=0.3)]),
 dict(id="s9b", kind="cam", take="IMG_4585", a=18.08, b=23.00, zoom=1.12,
      ov=[dict(type="stick", lines=[["That's the","cream"],["big question.","gold"]], x=60, y=1000, t0=1.85)],
      fx=[dict(fx="backdrop-word", start=2.9, end=4.85, text="WALL STREET", font="anton", color="#D6B45C")]),
 dict(id="s9c", kind="cam", take="IMG_4585", a=23.00, b=28.65, zoom=1.0,
      ov=[dict(type="name", t0=0.1, t1=9.0, handle=2.6)],
      fx=[dict(fx="slow-push", start=0.0, end=5.65, zoom=1.08), dict(fx="tap", start=2.7, end=5.65)]),
]
NOCAP = {}   # subtitles run under the name super too (sign-off must be readable sound-off)
EDL += [
 dict(id="end", kind="clip", clip="endcard", aud=[], pad=2.8),
]
# ---------------- quantise: every segment duration = whole frames; voice ranges follow ----------------
for s in EDL:
    if s["kind"] == "cam": s["aud"] = [(s["take"], s["a"], s["b"])]
    if s["kind"] == "clip": s["n"] = round(s["pad"] * FPS); s["dur"] = s["n"] / FPS; continue
    tot = sum(e - a for _, a, e in s["aud"]) + s.get("pad", 0)
    s["n"] = round(tot * FPS); s["dur"] = s["n"] / FPS
    if s["kind"] == "cam":
        if s.get("padv"): s["n"] += round(s["padv"] * FPS); s["dur"] = s["n"] / FPS
        s["b"] = s["a"] + s["dur"] - s.get("padv", 0); s["aud"] = [(s["take"], s["a"], s["b"])]; s["pad"] = s.get("padv", 0)
    elif s["aud"]:
        # stretch the last voice range by the rounding remainder so audio == picture
        tk, a, e = s["aud"][-1]; s["aud"][-1] = (tk, a, a + (e - a) + (s["dur"] - tot))
TOTAL_N = sum(s["n"] for s in EDL); TOTAL = TOTAL_N / FPS
print(f"segments {len(EDL)}  total {TOTAL:.2f}s  ({TOTAL_N} frames)")
cam_n = sum(s["n"] for s in EDL if s["kind"] == "cam"); print(f"her on camera {cam_n/TOTAL_N*100:.0f}%")

# ---------------- voice: extract ranges, join with 4 ms crossfades, clean, two-pass loudnorm ----------------
import numpy as np, wave
def rd(path, a, e):
    r = subprocess.run(["ffmpeg","-nostdin","-v","error","-ss",f"{a:.4f}","-t",f"{e-a:.4f}","-i",path,"-vn","-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True)
    return np.frombuffer(r.stdout, np.float32).copy()
voice = []; XF = int(0.004 * SR); seg_t0 = {}; t = 0.0
for s in EDL:
    seg_t0[s["id"]] = t; chunks = []
    for tk, a, e in s["aud"]: chunks.append(rd(T(tk), a, e))
    if s.get("pad"): chunks.append(np.zeros(int(s["pad"] * SR), np.float32))
    x = np.concatenate(chunks); need = int(round(s["dur"] * SR)); x = np.pad(x, (0, max(0, need - len(x))))[:need]
    voice.append(x); t += s["dur"]
    # the slice for this segment's transcription
    wave_path = f"aud/{s['id']}.wav"; w = wave.open(wave_path, "w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x,-1,1)*32767).astype(np.int16).tobytes()); w.close()
# crossfade joins to kill clicks
out = voice[0].copy()
for x in voice[1:]:
    ramp = np.linspace(0,1,XF,dtype=np.float32); out[-XF:] = out[-XF:]*(1-ramp) + x[:XF]*ramp; out = np.concatenate([out, x[XF:]])
out = np.pad(out, (0, max(0, int(TOTAL*SR) - len(out))))[:int(TOTAL*SR)]
w = wave.open("aud/voice_raw.wav","w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out,-1,1)*32767).astype(np.int16).tobytes()); w.close()
# clean: high-pass, denoise, de-ess-ish, gentle EQ, compression, then measured loudnorm
CHAIN = "highpass=f=85,afftdn=nf=-28:nt=w,equalizer=f=250:t=q:w=1.2:g=-2,equalizer=f=3200:t=q:w=1.0:g=2,equalizer=f=9000:t=q:w=1.0:g=1.5,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150:makeup=2"
sh(["ffmpeg","-nostdin","-y","-v","error","-i","aud/voice_raw.wav","-af",CHAIN,"aud/voice_c.wav"],"voice clean")
m = subprocess.run(["ffmpeg","-nostdin","-v","info","-i","aud/voice_c.wav","-af","loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
j = json.loads(m[m.rfind("{"):m.rfind("}")+1])
sh(["ffmpeg","-nostdin","-y","-v","error","-i","aud/voice_c.wav","-af",f"loudnorm=I=-16:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:linear=true,alimiter=limit=0.89","-ar",str(SR),"aud/voice.wav"],"loudnorm")
print("voice ready")

# ---------------- slice transcription per segment -> words relative to the timeline ----------------
WORDS = {}
TONLY = [a.split("=")[1].split(",") for a in sys.argv if a.startswith("--trans-only=")]
if "--skip-trans" not in sys.argv or TONLY:
    from faster_whisper import WhisperModel
    mdl = WhisperModel("medium", device="cpu", compute_type="int8")
    if TONLY: WORDS = json.load(open("words_segments.json"))
    for s in EDL:
        if TONLY and s["id"] not in TONLY[0]: continue
        segs, _ = mdl.transcribe(f"aud/{s['id']}.wav", language="en", beam_size=5, word_timestamps=True, vad_filter=False)
        ws = [dict(w=w.word.strip(), s=round(w.start,2), e=round(w.end,2)) for sg_ in segs for w in sg_.words]
        WORDS[s["id"]] = ws; print(s["id"], " ".join(w["w"] for w in ws))
    json.dump(WORDS, open("words_segments.json","w"), indent=1)
else: WORDS = json.load(open("words_segments.json"))
FIX = {"nervous?":"nervous","Mommies.":"Mummies.","Mommies":"Mummies","Mommies,":"Mummies,","NVIDIA,":"Nvidia,","NVIDIA":"Nvidia","Hiraar":"Hiral","Goyal":"Goel","Mami's":"Mummies","Mamis":"Mummies","indexes":"index's","indexes'":"index's","Nvidia":"Nvidia","NASDAQ":"Nasdaq","centers":"centres","centers.":"centres."}
GOLD = {"nasdaq","index","index.","index,","composite","3,000","65%","ai","ai,","technology","expensive","spending","spending.","politics","politics.","basket","stocks","stocks,","stocks.","stocks?","crash","falling","falling?","steam"}
FUNC = {"the","of","and","to","is","a","an","in","on","for","as","are","or","that","this","but","if","with","at","by","from","i'm","i","it","be","has","have","how","their","they","will","about","like","usually","very","some"}

# ---------------- captions: Montserrat ExtraBold 54px, pill, gold key words, max 2 lines ----------------
FONT = ImageFont.truetype(os.path.expanduser("~/Library/Fonts/claude-deck-fonts/Montserrat[wght].ttf"), 54); FONT.set_variation_by_name("ExtraBold")
MAXW = 880
def chunk(words):
    words = [dict(w) for w in words if w["w"]]
    for w in words: w["w"] = FIX.get(w["w"], w["w"])
    merged = []
    for w in words:  # "3" ",000" -> "3,000"; "65" "%" -> "65%"
        if merged and (w["w"].startswith(",") or w["w"].startswith("%")) and merged[-1]["w"][-1].isdigit():
            merged[-1] = dict(w=merged[-1]["w"] + w["w"], s=merged[-1]["s"], e=w["e"])
        else: merged.append(w)
    words = merged
    for w in words: w["w"] = w["w"].replace("...", "").replace("…", "")
    words = [w for w in words if w["w"]]
    joined = []
    for i, w in enumerate(words):
        if w["w"] == "For" and i + 1 < len(words) and words[i+1]["w"].startswith("Mummies"): w["w"] = "for"
    for w in words:  # multi-word proper nouns stay on one card
        if joined and joined[-1]["w"] == "Wall" and w["w"].startswith("Street"): joined[-1] = dict(w="Wall " + w["w"], s=joined[-1]["s"], e=w["e"])
        else: joined.append(w)
    words = joined
    caps = []; cur = []
    def width(ws): return FONT.getlength(" ".join(w["w"] for w in ws))
    for i, w in enumerate(words):
        # close the chunk BEFORE a word that would push it past one line, unless the chunk would end on a function word
        if cur and width(cur + [w]) > MAXW and (cur[-1]["w"].lower().strip(",") not in FUNC or width(cur + [w]) > MAXW * 1.3):
            caps.append(cur); cur = []
        cur.append(w)
        end_sent = w["w"][-1] in ".?!"; last = i == len(words)-1
        nxt_gap = (words[i+1]["s"] - w["e"]) if not last else 9
        if end_sent or last or nxt_gap > 0.7 or (len(cur) >= 5 and w["w"].lower().strip(",") not in FUNC):
            caps.append(cur); cur = []
    if cur: caps.append(cur)
    # merge very short caps into the previous
    out = []
    for c in caps:
        d = c[-1]["e"] - c[0]["s"]
        if out and d < 0.55 and (out[-1][-1]["e"] - out[-1][0]["s"]) < 3.0: out[-1] += c
        else: out.append(c)
    return out
def wrap(ws):
    if FONT.getlength(" ".join(x["w"] for x in ws)) <= MAXW: return [ws]
    best = None
    for k in range(1, len(ws)):
        a, b = ws[:k], ws[k:]; wa = FONT.getlength(" ".join(x["w"] for x in a)); wb = FONT.getlength(" ".join(x["w"] for x in b))
        if wa <= MAXW and wb <= MAXW and (best is None or abs(wa - wb) < best[0]): best = (abs(wa - wb), [a, b])
    if best: return best[1]
    lines = [[]]
    for w in ws:
        if lines[-1] and FONT.getlength(" ".join(x["w"] for x in lines[-1] + [w])) > MAXW: lines.append([])
        lines[-1].append(w)
    return lines
def draw_cap(ws, path, cy):
    lines = wrap(ws); LH = 70; PX, PY = 34, 22
    tw = max(FONT.getlength(" ".join(x["w"] for x in l)) for l in lines); th = LH * len(lines)
    im = Image.new("RGBA", (1080, 1920), (0,0,0,0)); d = ImageDraw.Draw(im)
    x0 = 540 - tw/2 - PX; y0 = cy - th/2 - PY
    d.rounded_rectangle([x0, y0, x0 + tw + 2*PX, y0 + th + 2*PY], radius=22, fill=(14,36,68,222))
    for li, l in enumerate(lines):
        lw = FONT.getlength(" ".join(x["w"] for x in l)); x = 540 - lw/2; y = y0 + PY + li*LH + 6
        for w in l:
            col = (214,180,92,255) if w["w"].lower().strip(",.?!") in {g.strip(",.?!") for g in GOLD} else (255,255,255,255)
            d.text((x, y), w["w"], font=FONT, fill=col); x += FONT.getlength(w["w"] + " ")
    im.save(path)
CAPS = {}
for s in EDL:
    if (s["kind"] == "cam" or s.get("caps")) and s["kind"] != "clip":
        cy = s.get("capy", 1560); cs = chunk([w for w in WORDS.get(s["id"], []) if w["s"] < s["dur"] - 0.05]); lst = []
        for i, c in enumerate(cs):
            st = max(0.0, c[0]["s"] - 0.08); en = min(s["dur"], c[-1]["e"] + (0.30 if i + 1 == len(cs) else 0.12))
            if i + 1 < len(cs): en = max(en, cs[i+1][0]["s"] - 0.08) if (cs[i+1][0]["s"] - c[-1]["e"]) < 0.6 else en   # bridge small gaps
            if i + 1 < len(cs): en = min(en, cs[i+1][0]["s"] - 0.08)
            if lst: st = max(st, lst[-1][2])
            if en - st < 0.25: continue
            if any(a <= (st+en)/2 <= b for a, b in NOCAP.get(s["id"], [])): continue
            p = f"cap/{s['id']}_{i:02d}.png"; draw_cap(c, p, cy); lst.append((p, st, en))
        CAPS[s["id"]] = lst
print("captions:", sum(len(v) for v in CAPS.values()))

# ---------------- graphics: scenes json -> render ----------------
scenes = []
for s in EDL:
    if s["kind"] == "gfx": sc = dict(s["scene"]); sc.update(id=s["id"], dur=s["dur"]); scenes.append(sc)
    for i, o in enumerate(s.get("ov", [])):
        sc = dict(o); sc.update(id=f"{s['id']}_ov{i}", dur=s["dur"], alpha=True); sc.setdefault("t0", 0); sc.setdefault("t1", s["dur"]); sc["t1"] = min(sc["t1"], s["dur"]); scenes.append(sc)
json.dump(scenes, open("scenes.json","w"), indent=1)
GONLY = [a.split("=")[1] for a in sys.argv if a.startswith("--gfx-only=")]
def stale(sc):
    d = f"gfx/{sc['id']}"
    return (not os.path.isdir(d)) or len([f for f in os.listdir(d) if f.startswith("f")]) != round(sc["dur"] * FPS)
need = set(GONLY[0].split(",")) if GONLY else set()
need |= {sc["id"] for sc in scenes if stale(sc)}          # any scene whose frame count no longer matches its segment
if "--skip-gfx" not in sys.argv and not GONLY: need = {sc["id"] for sc in scenes}
if need: print("rendering gfx:", ",".join(sorted(need))); sh(["node","render_gfx.js","scenes.json",",".join(sorted(need))],"render gfx")
for sc in scenes:
    got = len([f for f in os.listdir(f"gfx/{sc['id']}") if f.startswith("f")]); assert got == round(sc["dur"]*FPS), (sc["id"], got, round(sc["dur"]*FPS))

# ---------------- per-segment video ----------------
ENC = ["-c:v","libx264","-preset","medium","-crf","17","-pix_fmt","yuv420p","-an"]
def zoomf(z):
    if z == 1.0: return "scale=1080:1920:flags=lanczos"
    cw, ch = int(1080/z)//2*2, int(1920/z)//2*2; return f"crop={cw}:{ch}:{(1080-cw)//2}:{int((1920-ch)*0.42)//2*2},scale=1080:1920:flags=lanczos"
for s in EDL:
    inputs = []; fc = []; n = s["n"]
    if s["kind"] == "cam":
        inputs += ["-ss", f"{s['a']:.4f}", "-t", f"{s['dur']+0.2:.4f}", "-i", T(s["take"])]
        punch = "" if s["id"] == EDL[0]["id"] else f",zoompan=z='if(lt(on,6),1.09-0.09*on/6,1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps={FPS}"
        fc.append(f"[0:v]fps={FPS},{zoomf(s['zoom'])},eq=contrast=1.04:saturation=1.04,tpad=stop_mode=clone:stop_duration={s.get('padv',0)+0.2:.2f}{punch},setsar=1[v0]")
    elif s["kind"] == "gfx":
        inputs += ["-framerate", str(FPS), "-i", f"gfx/{s['id']}/f%05d.jpg"]; fc.append("[0:v]fade=t=in:st=0:d=0.14:color=white,setsar=1[v0]")
    elif s["kind"] == "clip":
        inputs += ["-i", f"{BR}/{s['clip']}.mp4"]; fc.append(f"[0:v]fps={FPS},scale=1080:1920:flags=lanczos,tpad=stop_mode=clone:stop_duration=1,setsar=1[v0]")
    else:  # broll: 5.04s clip @24fps -> stretch to the segment length at 30 fps
        src = f"{BR}/{s['clip']}.mp4"; sd = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",src]).decode())
        k = max(1.0, s["dur"] / sd * 1.02)
        if s["clip"] == "flowai": fc.append(f"[0:v]setpts={k:.4f}*PTS,minterpolate=fps={FPS}:mi_mode=blend,scale=1080:1920:flags=lanczos,fade=t=in:st=0:d=0.14:color=white,setsar=1[v0]")
        else: fc.append(f"[0:v]setpts={k:.4f}*PTS,minterpolate=fps={FPS}:mi_mode=blend,scale=1080:1920:flags=lanczos,zoompan=z='1+0.07*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps={FPS},eq=contrast=1.03:saturation=0.95,fade=t=in:st=0:d=0.14:color=white,setsar=1[v0]")
        inputs += ["-i", src]
    if s["kind"] == "cam" and s.get("fx"):
        # render the plain base first, run the effects skill on it, then overlay stickers/captions on the result
        base = f"seg/{s['id']}_base.mp4"
        sh(["ffmpeg","-nostdin","-y","-v","error"] + inputs + ["-filter_complex", fc[0], "-map", "[v0]", "-frames:v", str(n), "-r", str(FPS)] + ENC + [base], s["id"] + " base")
        plan = f"seg/{s['id']}_fx.json"; want = json.dumps({"effects": s["fx"], "a": s["a"], "b": s["b"], "zoom": s["zoom"]}, sort_keys=True)
        fxo = f"seg/{s['id']}_fx.mp4"
        if not (os.path.exists(fxo) and os.path.exists(plan) and open(plan).read() == want):
            open(plan, "w").write(want)
            sh([os.path.expanduser("~/.claude/skills/effects/.venv/bin/python"), "fx6.py", "--plan", plan, base, fxo], s["id"] + " fx")
        else: print("fx cached", s["id"])
        got = nframes(fxo); assert got == n, (s["id"], "fx frames", got, n)
        inputs = ["-i", fxo]; fc = ["[0:v]setsar=1[v0]"]
    cur = "v0"; ni = 1
    for i, o in enumerate(s.get("ov", [])):
        inputs += ["-framerate", str(FPS), "-i", f"gfx/{s['id']}_ov{i}/f%05d.png"]
        fc.append(f"[{cur}][{ni}:v]overlay=0:0:format=auto:eof_action=pass[v{ni}]"); cur = f"v{ni}"; ni += 1
    for (p, st, en) in CAPS.get(s["id"], []):
        inputs += ["-loop", "1", "-i", p]
        fc.append(f"[{cur}][{ni}:v]overlay=0:0:format=auto:eof_action=pass:enable='gte(t,{st:.3f})*lt(t,{en:.3f})'[v{ni}]"); cur = f"v{ni}"; ni += 1
    assert sum(1 for x in inputs if x == "-i") == ni, (s["id"], ni)
    cmd = ["ffmpeg","-nostdin","-y","-v","error"] + inputs + ["-filter_complex", ";".join(fc), "-map", f"[{cur}]", "-frames:v", str(n), "-r", str(FPS)] + ENC + [f"seg/{s['id']}.mp4"]
    sh(cmd, s["id"]); got = nframes(f"seg/{s['id']}.mp4"); assert got == n, (s["id"], got, n); print("seg", s["id"], n)

# ---------------- concat (filter, never demuxer+copy) + mux voice ----------------
inputs = []; fc = []
for i, s in enumerate(EDL): inputs += ["-i", f"seg/{s['id']}.mp4"]; fc.append(f"[{i}:v]setpts=PTS-STARTPTS,setsar=1[c{i}]")
fc.append("".join(f"[c{i}]" for i in range(len(EDL))) + f"concat=n={len(EDL)}:v=1:a=0,setpts=N/{FPS}/TB[v]")
OUT = f"IFM-nasdaq-reel-{TAG}.mp4"
sh(["ffmpeg","-nostdin","-y","-v","error"] + inputs + ["-i","aud/voice.wav","-filter_complex",";".join(fc),"-map","[v]","-map",f"{len(EDL)}:a","-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p","-fps_mode","passthrough","-c:a","aac","-b:a","192k","-ar","48000","-ac","2","-shortest","-movflags","+faststart",OUT],"final")
vn = nframes(OUT); pf = lambda st: float(subprocess.check_output(["ffprobe","-v","error","-select_streams",st,"-show_entries","stream=duration","-of","csv=p=0",OUT]).decode().strip().strip(","))
vd = pf("v:0"); ad = pf("a:0")
print(f"FINAL {OUT}: {vn} frames (expected {TOTAL_N}), video {vd:.3f}s audio {ad:.3f}s"); assert vn == TOTAL_N
sh(["ffmpeg","-nostdin","-y","-v","error","-i",OUT,"-vf","fps=1,scale=160:-1,tile=12x8","-frames:v","1",f"sheet-{TAG}.jpg"],"sheet")
json.dump(dict(edl=EDL, seg_t0=seg_t0, total=TOTAL), open(f"edl-{TAG}.json","w"), indent=1, default=str)
print("DONE")
