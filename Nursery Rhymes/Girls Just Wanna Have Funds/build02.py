import os, subprocess, hashlib, numpy as np
from plan import SEGS, SONG0, END, FPS, CROP
OUT='work'; os.makedirs(OUT,exist_ok=True)
BREATHE={}   # {(clip, clip_start): True} - filled in only where the static check flags
MOT={n:np.load(f'clip-{n}_motion.npy') for n in
     ['01','02','03','04','05','06','07','08','09','10']}
SHOTS={n:[i/24.0 for i,v in enumerate(m) if v>25] for n,m in MOT.items()}
def motion(c,a,b):
    m=MOT[c][int(a*24):max(int(a*24)+1,int(b*24))]
    return float(m.mean()) if len(m) else 5.0

def split_at_shots(c,a,b,s,e):
    """split at internal shot changes; allocate output time MOTION-AWARE:
       high-motion pieces get pulled toward rate 1.0, stretch pushed into calm pieces."""
    cuts=[t for t in SHOTS[c] if a+0.08<t<b-0.08]
    if not cuts: return [(c,a,b,s,e)]
    bounds=[a]+cuts+[b]
    pieces=[(bounds[i],bounds[i+1]) for i in range(len(bounds)-1)]
    D=e-s
    # weight: calm pieces absorb more output time per input second
    w=[]
    for (p,q) in pieces:
        mo=motion(c,p,q)
        w.append((q-p) * (1.0/ (1.0 + 0.045*mo)))
    tot=sum(w); alloc=[D*x/tot for x in w]
    # keep every sub-rate within +/-35% of the segment's mean rate (no lurching)
    R=D/(b-a)
    for i,(p,q) in enumerate(pieces):
        lo,hi=(q-p)*R*0.65,(q-p)*R*1.35
        alloc[i]=min(hi,max(lo,alloc[i]))
    k=D/sum(alloc); alloc=[x*k for x in alloc]
    out=[]; ps=s
    for (p,q),d in zip(pieces,alloc):
        out.append((c,p,q,ps,ps+d)); ps+=d
    out[-1]=(c,out[-1][1],b,out[-1][3],e)
    return out

segs=[]
for c,a,b,s,e,note in SEGS: segs += split_at_shots(c,a,b,s,e)
print(f"{len(SEGS)} planned -> {len(segs)} rendered")

files=[]
for i,(c,a,b,s,e) in enumerate(segs):
    dur=e-s; r=dur/(b-a); nf=int(round(dur*FPS)); mo=motion(c,a,b)
    key=hashlib.md5((f'{c}|{a:.4f}|{b:.4f}|{dur:.4f}|{FPS}|{CROP.get(c,"")}|v2|'+str(BREATHE.get((c,round(a,2)),False))).encode()).hexdigest()[:10]
    out=f'{OUT}/s{i:03d}_{key}.mp4'; files.append(out)
    vf=[f'trim=start={a:.4f}:end={b:.4f}', f'setpts=(PTS-STARTPTS)*{r:.6f}']
    if c in CROP: vf.insert(0,CROP[c])
    if r>1.25: vf.append(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1')
    else:      vf.append(f'fps={FPS}')
    # anti-static: slow continuous "breathe" zoom on heavily stretched calm footage (playbook 6)
    breathe = BREATHE.get((c,round(a,2)), False)
    if breathe:
        # slow scale-based "breathe" (playbook 6) - crop expressions eval per frame,
        # the following scale makes the 1px quantisation sub-pixel
        vf.append("crop=w='iw/1.10*(1+0.018*sin(2*PI*t/7))':h='ih/1.10*(1+0.018*sin(2*PI*t/7))'"
                  ":x='(iw-ow)/2':y='(ih-oh)/2'")
    vf += ['scale=1080:1920:force_original_aspect_ratio=increase','crop=1080:1920','setsar=1']
    if os.path.exists(out) and os.path.getsize(out)>1000: continue
    subprocess.run(['ffmpeg','-v','error','-y','-i',f'clip-{c}.mp4','-filter_complex',
        f"[0:v]{','.join(vf)}[v]",'-map','[v]','-frames:v',str(nf),'-an',
        '-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p',out],check=True)
    print(f"  s{i:03d} clip-{c} {a:.2f}-{b:.2f} r={r:.2f} mo={mo:.1f} nf={nf}{' BREATHE' if breathe else ''}",flush=True)

with open(f'{OUT}/concat.txt','w') as f:
    for p in files: f.write(f"file '{os.path.basename(p)}'\n")
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{OUT}/concat.txt',
                '-c','copy',f'{OUT}/body.mp4'],check=True)
d=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
                  f'{OUT}/body.mp4'],capture_output=True,text=True).stdout.strip()
print(f"body.mp4 = {d}s (expected {END-SONG0:.2f})")
