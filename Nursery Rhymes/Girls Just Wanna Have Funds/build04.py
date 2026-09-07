import os, subprocess, hashlib, json, numpy as np
from plan import SEGS, SONG0, END, FPS, CROP
OUT='work'; os.makedirs(OUT,exist_ok=True)
PADF='work/pads.json'
pads=json.load(open(PADF)) if os.path.exists(PADF) else {}
BOOST=json.load(open('work/boost.json')) if os.path.exists('work/boost.json') else {}
MOT={n:np.load(f'clip-{n}_motion.npy') for n in ['01','02','03','04','05','06','07','08','09','10']}
SHOTS={n:[i/24.0 for i,v in enumerate(m) if v>25] for n,m in MOT.items()}
def motion(c,a,b):
    m=MOT[c][int(a*24):max(int(a*24)+1,int(b*24))]; return float(m.mean()) if len(m) else 5.0
def split(c,a,b,s,e):
    cuts=[t for t in SHOTS[c] if a+0.08<t<b-0.08]
    if not cuts: return [(c,a,b,s,e)]
    bounds=[a]+cuts+[b]; pieces=[(bounds[i],bounds[i+1]) for i in range(len(bounds)-1)]
    D=e-s; w=[(q-p)*(1.0/(1.0+0.045*motion(c,p,q))) for p,q in pieces]
    tot=sum(w); alloc=[D*x/tot for x in w]; R=D/(b-a)
    for i,(p,q) in enumerate(pieces):
        alloc[i]=min((q-p)*R*1.35,max((q-p)*R*0.65,alloc[i]))
    k=D/sum(alloc); alloc=[x*k for x in alloc]
    out=[];ps=s
    for (p,q),d in zip(pieces,alloc): out.append((c,p,q,ps,ps+d)); ps+=d
    out[-1]=(c,out[-1][1],b,out[-1][3],e); return out
segs=[]
for c,a,b,s,e,n in SEGS: segs+=split(c,a,b,s,e)

def headroom(c,b):
    """how far past b we may read before hitting the next shot change or the clip end"""
    nxt=[t for t in SHOTS[c] if t>b+0.001]
    lim=min(nxt) if nxt else 8.0
    return max(0.0, min(lim-b-0.001, 8.0-b))

def render(i,c,a,b,s,e,pad):
    dur=e-s; nf=int(round(dur*FPS))
    bo=BOOST.get(str(i),1.0); r=dur/(b-a)*bo
    key=hashlib.md5(f'{c}|{a:.4f}|{b:.4f}|{dur:.4f}|{FPS}|{CROP.get(c,"")}|pad{pad:.3f}|bo{bo:.4f}|v4'.encode()).hexdigest()[:10]
    out=f'{OUT}/s{i:03d}_{key}.mp4'
    if os.path.exists(out) and os.path.getsize(out)>1000: return out,nf,r
    vf=[f'trim=start={a:.4f}:end={b+pad:.4f}', f'setpts=(PTS-STARTPTS)*{r:.6f}']
    if c in CROP: vf.insert(0,CROP[c])
    vf.append(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'
              if r>1.25 else f'fps={FPS}')
    vf += ['scale=1080:1920:force_original_aspect_ratio=increase','crop=1080:1920','setsar=1']
    subprocess.run(['ffmpeg','-v','error','-y','-i',f'clip-{c}.mp4','-filter_complex',
        f"[0:v]{','.join(vf)}[v]",'-map','[v]','-frames:v',str(nf),'-an',
        '-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p',out],check=True)
    return out,nf,r
def nframes(f):
    n=subprocess.run(['ffprobe','-v','error','-count_frames','-select_streams','v',
        '-show_entries','stream=nb_read_frames','-of','csv=p=0',f],capture_output=True,text=True).stdout.strip()
    return int(n) if n.isdigit() else 0

files=[]
for i,(c,a,b,s,e) in enumerate(segs):
    sk=f'{i}'; pad=pads.get(sk,0.0); room=headroom(c,b)
    for attempt in range(6):
        f,nf,r=render(i,c,a,b,s,e,pad)
        got=nframes(f)
        if got>=nf: break
        newpad=min(room, pad+max(0.084,(nf-got)/FPS/max(r,1.0)+0.042))
        if newpad<=pad+1e-6:
            # no source headroom (segment ends at a cut or at the clip's last frame):
            # stretch a hair more so minterpolate emits the full frame count
            cur=BOOST.get(str(i),1.0); BOOST[str(i)]=round(cur*(nf+0.6)/max(got,1),4)
            print(f"  s{i:03d} clip-{c} short {got}/{nf}, no headroom -> rate boost x{BOOST[str(i)]:.4f}",flush=True)
            continue
        pad=newpad; pads[sk]=round(pad,3)
        print(f"  s{i:03d} clip-{c} short {got}/{nf} -> pad {pad:.3f}s (room {room:.3f})",flush=True)
    files.append((f,nf,got))
json.dump(pads,open(PADF,'w'),indent=1)
json.dump(BOOST,open('work/boost.json','w'),indent=1)
tot=sum(n for _,n,_ in files); act=sum(g for _,_,g in files)
print(f"frames: want {tot} ({tot/FPS:.2f}s)  got {act} ({act/FPS:.2f}s)")
with open(f'{OUT}/concat.txt','w') as fh:
    for f,_,_ in files: fh.write(f"file '{os.path.basename(f)}'\n")
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{OUT}/concat.txt',
                '-c','copy',f'{OUT}/body.mp4'],check=True)
d=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
                  f'{OUT}/body.mp4'],capture_output=True,text=True).stdout.strip()
print(f"body.mp4 = {d}s (expected {END-SONG0:.2f})")
