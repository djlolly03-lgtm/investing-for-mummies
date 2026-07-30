#!/usr/bin/env python3
import os, subprocess, math
from PIL import Image, ImageDraw
R=os.path.dirname(os.path.abspath(__file__))
CL=os.path.join(R,"clips"); WK=os.path.join(R,"work"); VO=os.path.join(R,"vo")
CLAUDE=os.path.dirname(R)
PIZZA=os.path.join(CLAUDE,"vedanta-pizza-split-pro-10s.mp4")
SEG=os.path.join(WK,"seg"); os.makedirs(SEG,exist_ok=True)

def dur(p):
    o=subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nokey=1:noprint_wrappers=1",p])
    return float(o)
def run(args):
    r=subprocess.run(args,capture_output=True,text=True)
    if r.returncode!=0:
        print("FFMPEG ERR:"," ".join(args[:6]),"\n",r.stderr[-1400:]); raise SystemExit(1)

D={s:dur(os.path.join(VO,f"{s}.wav")) for s in ["s1","s2","s3","s4","s5","s6"]}
print("VO durations",D)

def ov_fade(idx,d):  # overlay stream label with alpha fade in/out
    return (f"[{idx}:v]format=rgba,fade=t=in:st=0:d=0.35:alpha=1,"
            f"fade=t=out:st={d-0.3:.2f}:d=0.3:alpha=1[ov]")

def talking(seg,clip,ov,d):
    # lip-synced clip already carries the synced VO as its own audio (map 0:a)
    out=os.path.join(SEG,seg)
    fc=(f"[0:v]trim=0:{d:.3f},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,"
        f"crop=1080:1920,fps=30,format=yuv420p[v0];{ov_fade(1,d)};[v0][ov]overlay=0:0[v]")
    run(["ffmpeg","-y","-i",clip,"-loop","1","-i",ov,"-filter_complex",fc,
         "-map","[v]","-map","0:a","-t",f"{d:.3f}","-r","30","-c:v","libx264","-pix_fmt","yuv420p",
         "-c:a","aac","-ar","48000","-ac","2",out])
    print("built",seg)

# S1 talking (lip-synced)
talking("seg1.mp4",os.path.join(CL,"lip_s1.mp4"),os.path.join(WK,"ov_s1.png"),D["s1"])
# S3 talking (lip-synced)
talking("seg3.mp4",os.path.join(CL,"lip_s3.mp4"),os.path.join(WK,"ov_s3.png"),D["s3"])

# S2 pizza (use a portion showing the split) + overlay + vo
d=D["s2"]; out=os.path.join(SEG,"seg2.mp4")
fc=(f"[0:v]trim=1.2:{1.2+d:.3f},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,"
    f"crop=1080:1920,fps=30,format=yuv420p[v0];{ov_fade(1,d)};[v0][ov]overlay=0:0[v]")
run(["ffmpeg","-y","-i",PIZZA,"-loop","1","-i",os.path.join(WK,"ov_s2.png"),"-i",os.path.join(VO,"s2.wav"),
     "-filter_complex",fc,"-map","[v]","-map","2:a","-t",f"{d:.3f}","-r","30","-c:v","libx264","-pix_fmt","yuv420p",
     "-c:a","aac","-ar","48000","-ac","2","-shortest",out]); print("built seg2")

# S4 blocks (extend last frame to cover VO) + overlay + vo
d=D["s4"]; out=os.path.join(SEG,"seg4.mp4")
fc=(f"[0:v]tpad=stop_mode=clone:stop_duration=0.6,trim=0:{d:.3f},setpts=PTS-STARTPTS,"
    f"scale=1080:1920,fps=30,format=yuv420p[v0];{ov_fade(1,d)};[v0][ov]overlay=0:0[v]")
run(["ffmpeg","-y","-i",os.path.join(WK,"scene_s4.mp4"),"-loop","1","-i",os.path.join(WK,"ov_s4.png"),
     "-i",os.path.join(VO,"s4.wav"),"-filter_complex",fc,"-map","[v]","-map","2:a","-t",f"{d:.3f}","-r","30",
     "-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac","-ar","48000","-ac","2","-shortest",out]); print("built seg4")

# S5 split-screen: anchor left 540 + right panel 540, + overlay caption; audio from lip clip
d=D["s5"]; out=os.path.join(SEG,"seg5.mp4")
fc=(f"[0:v]trim=0:{d:.3f},setpts=PTS-STARTPTS,scale=540:1920:force_original_aspect_ratio=increase,crop=540:1920,fps=30[L];"
    f"[1:v]scale=540:1920,fps=30[Rp];[L][Rp]hstack=2,format=yuv420p[base];"
    f"[base][2:v]overlay=0:0[v]")
run(["ffmpeg","-y","-i",os.path.join(CL,"lip_s5.mp4"),"-loop","1","-i",os.path.join(WK,"s5_rightpanel.png"),
     "-loop","1","-i",os.path.join(WK,"ov_s5.png"),
     "-filter_complex",fc,"-map","[v]","-map","0:a","-t",f"{d:.3f}","-r","30","-c:v","libx264","-pix_fmt","yuv420p",
     "-c:a","aac","-ar","48000","-ac","2",out]); print("built seg5")

# S6 hero + PiP anchor (rounded, top-right) + vo
d=D["s6"]; out=os.path.join(SEG,"seg6.mp4")
pw,ph=300,380
mask=Image.new("L",(pw,ph),0); ImageDraw.Draw(mask).rounded_rectangle([0,0,pw-1,ph-1],radius=26,fill=255)
mask.save(os.path.join(WK,"pip_mask.png"))
px,py=740,110
fc=(f"[0:v]trim=0:{d:.3f},setpts=PTS-STARTPTS,scale=1080:1920,fps=30,format=yuv420p[bg];"
    f"[1:v]trim=0:{d:.3f},setpts=PTS-STARTPTS,scale={pw}:{ph}:force_original_aspect_ratio=increase,crop={pw}:{ph},fps=30[p0];"
    f"[2:v]format=gray[m];[p0][m]alphamerge[pip];[bg][pip]overlay={px}:{py}[v]")
run(["ffmpeg","-y","-i",os.path.join(WK,"scene_s6.mp4"),"-i",os.path.join(CL,"lip_s6.mp4"),
     "-loop","1","-i",os.path.join(WK,"pip_mask.png"),
     "-filter_complex",fc,"-map","[v]","-map","1:a","-t",f"{d:.3f}","-r","30","-c:v","libx264","-pix_fmt","yuv420p",
     "-c:a","aac","-ar","48000","-ac","2",out]); print("built seg6")

# concat all 6 (re-encode via concat filter) then global speed 1.25x
SPEED=1.25
segs=[os.path.join(SEG,f"seg{i}.mp4") for i in [1,2,3,4,5,6]]
inputs=[];
for s in segs: inputs+=["-i",s]
n=len(segs)
parts="".join(f"[{i}:v][{i}:a]" for i in range(n))
fc=(f"{parts}concat=n={n}:v=1:a=1[vc][ac];"
    f"[vc]setpts=PTS/{SPEED},format=yuv420p[v];[ac]atempo={SPEED}[a]")
final=os.path.join(R,"vedanta_reel.mp4")
run(["ffmpeg","-y",*inputs,"-filter_complex",fc,"-map","[v]","-map","[a]",
     "-r","30","-c:v","libx264","-pix_fmt","yuv420p","-crf","19","-c:a","aac","-b:a","160k",
     "-movflags","+faststart",final])
print("FINAL:",final, "dur=",round(dur(final),2),"s")
