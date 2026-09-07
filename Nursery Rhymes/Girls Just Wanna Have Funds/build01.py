import os, subprocess, json, numpy as np
from plan import SEGS, CAPS, SONG0, END, FPS, CROP
OUT='work'; os.makedirs(OUT, exist_ok=True)

# ---- shot changes per clip (from motion.py) ----
SHOTS={}
for n in ['01','02','03','04','05','06','07','08','09','10']:
    m=np.load(f'clip-{n}_motion.npy')
    SHOTS[n]=[i/24.0 for i,v in enumerate(m) if v>25]

def split_at_shots(c,a,b,s,e):
    """split a segment at any internal shot change, preserving rate"""
    cuts=[t for t in SHOTS[c] if a+0.06<t<b-0.06]
    if not cuts: return [(c,a,b,s,e)]
    r=(e-s)/(b-a); out=[]; pa,ps=a,s
    for t in cuts+[b]:
        pe=t; pse=ps+(pe-pa)*r
        out.append((c,pa,pe,ps,pse)); pa,ps=pe,pse
    out[-1]=(c,out[-1][1],b,out[-1][3],e)
    return out

segs=[]
for c,a,b,s,e,note in SEGS:
    segs += split_at_shots(c,a,b,s,e)
print(f"{len(SEGS)} planned -> {len(segs)} rendered segments")

# ---- render ----
files=[]
for i,(c,a,b,s,e) in enumerate(segs):
    out=f'{OUT}/seg{i:03d}.mp4'; files.append(out)
    dur=e-s; r=dur/(b-a); nf=int(round(dur*FPS))
    vf=[f'trim=start={a:.4f}:end={b:.4f}', f'setpts=(PTS-STARTPTS)*{r:.6f}']
    if c in CROP: vf.insert(0, CROP[c])
    if r>1.25: vf.append(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1')
    else:      vf.append(f'fps={FPS}')
    vf += ['scale=1080:1920:force_original_aspect_ratio=increase','crop=1080:1920','setsar=1']
    if os.path.exists(out) and os.path.getsize(out)>1000: continue
    cmd=['ffmpeg','-v','error','-y','-i',f'clip-{c}.mp4','-filter_complex',
         f"[0:v]{','.join(vf)}[v]",'-map','[v]','-frames:v',str(nf),'-an',
         '-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p',out]
    subprocess.run(cmd,check=True)
    print(f"  seg{i:03d} clip-{c} {a:.2f}-{b:.2f} -> {dur:.2f}s r={r:.2f} nf={nf}")

with open(f'{OUT}/concat.txt','w') as f:
    for p in files: f.write(f"file '{os.path.basename(p)}'\n")
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{OUT}/concat.txt',
                '-c','copy',f'{OUT}/body.mp4'],check=True)
d=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'{OUT}/body.mp4'],
                 capture_output=True,text=True).stdout.strip()
print(f"body.mp4 duration = {d}s  (expected {END-SONG0:.2f}s)")
