import os, subprocess, json, hashlib, numpy as np
A=json.load(open('anchors.json')); SONG0=7.86; END=67.74; FPS=30
CROP={'02':'crop=556:988:82:0'}
OUT='w2'; os.makedirs(OUT,exist_ok=True)
MOT={n:np.load(f'clip-{n}_motion.npy') for n in ['01','02','03','04','05','06','07','08','09','10']}
SHOTS={n:[i/24.0 for i,v in enumerate(m) if v>25] for n,m in MOT.items()}
parts=[]
for k in ['S1','S2','S3','S4','S5','S6','S7']:
    d=A[k]; clip=d['clip']; c=d['c']; t=d['t']
    raw=[[c[i],c[i+1],t[i],t[i+1]] for i in range(len(c)-1)]
    sp=[]
    for a,b,s,e in raw:
        cuts=[x for x in SHOTS[clip] if a+0.05<x<b-0.05]
        if not cuts: sp.append([a,b,s,e]); continue
        r=(e-s)/(b-a); pa,ps=a,s
        for x in cuts+[b]:
            pe=x; pse=ps+(pe-pa)*r; sp.append([pa,pe,ps,pse]); pa,ps=pe,pse
        sp[-1][1]=b; sp[-1][3]=e
    mg=[]
    for p in sp:
        if mg and (p[3]-p[2])<0.12: mg[-1][1]=p[1]; mg[-1][3]=p[3]
        else: mg.append(list(p))
    while len(mg)>1 and (mg[0][3]-mg[0][2])<0.12:
        mg[1][0]=mg[0][0]; mg[1][2]=mg[0][2]; mg.pop(0)
    for a,b,s,e in mg: parts.append((k,clip,a,b,s,e))
print(f"{len(parts)} parts")
def nfr(f):
    n=subprocess.run(['ffprobe','-v','error','-count_frames','-select_streams','v',
      '-show_entries','stream=nb_read_frames','-of','csv=p=0',f],capture_output=True,text=True).stdout.strip()
    return int(n) if n.isdigit() else 0
def headroom(clip,b):
    nx=[x for x in SHOTS[clip] if x>b+0.001]
    return max(0.0,min((min(nx) if nx else 8.0)-b-0.001, 8.0-b))
files=[]; want=0; got=0
for i,(k,clip,a,b,s,e) in enumerate(parts):
    dur=e-s
    # frame counts from ABSOLUTE video time -> no cumulative rounding drift
    nf=int(round((e-SONG0)*FPS))-int(round((s-SONG0)*FPS)); want+=nf
    base=dur/(b-a); pad=0.0; bo=1.0
    for attempt in range(7):
        r=base*bo
        key=hashlib.md5(f'{clip}|{a:.4f}|{b:.4f}|{dur:.4f}|{nf}|{pad:.3f}|{bo:.4f}|{CROP.get(clip,"")}'.encode()).hexdigest()[:10]
        out=f'{OUT}/p{i:03d}_{key}.mp4'
        if not (os.path.exists(out) and os.path.getsize(out)>1000):
            vf=[]
            if clip in CROP: vf.append(CROP[clip])
            vf+= [f'trim=start={a:.4f}:end={min(8.0,b+pad):.4f}',f'setpts=(PTS-STARTPTS)*{r:.6f}']
            vf.append(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'
                      if r>1.25 else f'fps={FPS}')
            vf+= ['scale=1080:1920:force_original_aspect_ratio=increase','crop=1080:1920','setsar=1']
            subprocess.run(['ffmpeg','-v','error','-y','-i',f'clip-{clip}.mp4','-filter_complex',
                f"[0:v]{','.join(vf)}[v]",'-map','[v]','-frames:v',str(nf),'-an',
                '-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p',out],check=True)
        n=nfr(out)
        if n>=nf: break
        room=headroom(clip,b)
        if pad<room-1e-6: pad=min(room,pad+max(0.084,(nf-n)/FPS/max(r,1.0)+0.042))
        else: bo=bo*(nf+0.6)/max(n,1)
    got+=n; files.append(out)
    if n<nf: print(f"  p{i:03d} {k} clip-{clip} SHORT {n}/{nf}")
print(f"frames want {want} ({want/FPS:.2f}s) got {got} ({got/FPS:.2f}s)")
with open(f'{OUT}/concat.txt','w') as f:
    for p in files: f.write(f"file '{os.path.basename(p)}'\n")
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{OUT}/concat.txt',
                '-c','copy',f'{OUT}/body.mp4'],check=True)
print('body =',subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
      f'{OUT}/body.mp4'],capture_output=True,text=True).stdout.strip(),'expected',END-SONG0)
