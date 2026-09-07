import os, subprocess, json, numpy as np
A=json.load(open('anchors.json'))
SONG0=7.86; END=67.74; FPS=30
CROP={'02':'crop=556:988:82:0'}
OUT='w2'; os.makedirs(OUT,exist_ok=True)
MOT={n:np.load(f'clip-{n}_motion.npy') for n in ['01','02','03','04','05','06','07','08','09','10']}
SHOTS={n:[i/24.0 for i,v in enumerate(m) if v>25] for n,m in MOT.items()}
order=['S1','S2','S3','S4','S5','S6','S7']
files=[]
for k in order:
    d=A[k]; clip=d['clip']; c=d['c']; t=d['t']
    # 1) intervals from the anchor solve
    parts=[[c[i],c[i+1],t[i],t[i+1]] for i in range(len(c)-1)]
    # 2) split at internal shot changes, preserving the local rate exactly
    sp=[]
    for a,b,s,e in parts:
        cuts=[x for x in SHOTS[clip] if a+0.05<x<b-0.05]
        if not cuts: sp.append([a,b,s,e]); continue
        r=(e-s)/(b-a); pa,ps=a,s
        for x in cuts+[b]:
            pe=x; pse=ps+(pe-pa)*r; sp.append([pa,pe,ps,pse]); pa,ps=pe,pse
        sp[-1][1]=b; sp[-1][3]=e
    # 3) merge parts shorter than 0.10s output into the previous one
    mg=[]
    for p in sp:
        if mg and (p[3]-p[2])<0.10: mg[-1][1]=p[1]; mg[-1][3]=p[3]
        else: mg.append(list(p))
    while len(mg)>1 and (mg[0][3]-mg[0][2])<0.10:
        mg[1][0]=mg[0][0]; mg[1][2]=mg[0][2]; mg.pop(0)
    nf=int(round((d['s1']-d['s0'])*FPS))
    fc=[]; labs=[]
    for j,(a,b,s,e) in enumerate(mg):
        r=(e-s)/(b-a)
        pad=min(0.125, max(0.0, 8.0-b))
        nxt=[x for x in SHOTS[clip] if x>b+0.001]
        if nxt: pad=min(pad, max(0.0,min(nxt)-b-0.001))
        pre=CROP[clip]+',' if clip in CROP else ''
        # minterpolate cannot emit past the last input PTS: work out how much
        # source we really have and pre-compensate the rate, then trim back exact.
        end=min(8.0,b+pad); usable=max(1/24.0,(end-a)-1.0/24.0)
        need=e-s; reff=r
        if usable*r < need*1.02: reff=r*(need*1.02)/(usable*r)
        mi=(f'minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'
            if reff>1.25 else f'fps={FPS}')
        fc.append(f"[0:v]{pre}trim=start={a:.4f}:end={end:.4f},"
                  f"setpts=(PTS-STARTPTS)*{reff:.6f},{mi},"
                  f"trim=duration={need:.4f},setpts=PTS-STARTPTS[p{j}]")
        labs.append(f"[p{j}]")
    fc.append(''.join(labs)+f"concat=n={len(mg)}:v=1:a=0,fps={FPS},"
              "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v]")
    out=f'{OUT}/{k}.mp4'; files.append(out)
    print(f"{k} clip-{clip}: {len(mg)} parts, {nf} frames, rates "
          f"{min((e-s)/(b-a) for a,b,s,e in mg):.2f}-{max((e-s)/(b-a) for a,b,s,e in mg):.2f}x",flush=True)
    subprocess.run(['ffmpeg','-v','error','-y','-i',f'clip-{clip}.mp4','-filter_complex',';'.join(fc),
        '-map','[v]','-frames:v',str(nf),'-an','-c:v','libx264','-crf','16','-preset','medium',
        '-pix_fmt','yuv420p',out],check=True)
    g=subprocess.run(['ffprobe','-v','error','-count_frames','-select_streams','v',
        '-show_entries','stream=nb_read_frames','-of','csv=p=0',out],capture_output=True,text=True).stdout.strip()
    print(f"   -> {g} frames (want {nf})",flush=True)
with open(f'{OUT}/concat.txt','w') as f:
    for p in files: f.write(f"file '{os.path.basename(p)}'\n")
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{OUT}/concat.txt',
                '-c','copy',f'{OUT}/body.mp4'],check=True)
print('body:',subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
      f'{OUT}/body.mp4'],capture_output=True,text=True).stdout.strip(),'expected',END-SONG0)
