import json, subprocess, numpy as np
A=json.load(open('anchors5.json')); song=json.load(open('song-words-v2.json'))
def norm(w): return w.strip().lower().strip(',.!?')
print("=== 1. WORD SYNC (clip word -> video time  vs  song word -> video time)")
allerr=[]
for k in ['X1','X2','X3']:
    d=A[k]; c=np.array(d['c']); t=np.array(d['t']); clip=d['clip']; off=d['s0']-d['v0']

    cws=json.load(open(f'clip-{clip}-words.json'))
    sws=[w for w in song if d['s0']-0.01<=w['s']<=d['s1']+0.01]
    errs=[]
    for w in cws:
        if w['s']<c[0]-1e-6 or w['s']>c[-1]+1e-6: continue
        land=float(np.interp(w['s'],c,t))
        cand=[x for x in sws if norm(x['w'])[:3]==norm(w['w'])[:3]]
        if not cand: continue
        b=min(cand,key=lambda x:abs((x['s']-off)-land))
        errs.append(land-(b['s']-off)); allerr.append(errs[-1])
    print(f"  {k} clip-{clip}: n={len(errs)} median {np.median(errs)*1000:+5.0f}ms  "
          f"max|e| {max(abs(x) for x in errs)*1000:5.0f}ms")
print(f"  GLOBAL n={len(allerr)} median {np.median(allerr)*1000:+.0f}ms "
      f"90th pct {np.percentile(np.abs(allerr),90)*1000:.0f}ms  max {max(abs(x) for x in allerr)*1000:.0f}ms")
print("\n=== 2. STATIC CHECK")
subprocess.run(['ffmpeg','-v','error','-y','-i','girls-just-wanna-have-funds.mp4','-vf',
  'scale=160:284,tblend=all_mode=difference','-pix_fmt','gray','-f','rawvideo','diag/fd5.raw'],check=True)
a=np.fromfile('diag/fd5.raw',dtype=np.uint8); H,W=284,160
a=a[:len(a)//(H*W)*H*W].reshape(-1,H,W).astype(np.float32).mean(axis=(1,2))
runs=[];st=None
for i,v in enumerate(a):
    if v<0.45:
        if st is None: st=i
    else:
        if st is not None and (i-st)/30>=0.30: runs.append((st/30,(i-st)/30))
        st=None
print(f"  frames {len(a)} mean framediff {a.mean():.2f}; static runs: {len(runs)}")
for t0,dd in runs: print(f"   !! {t0:.2f}s for {dd:.2f}s")
print("\n=== 3. CAPTIONS")
m=json.load(open('caps5/meta.json'))
print(f"  {len(m)} captions; min gap {min(m[i+1]['start']-m[i]['end'] for i in range(len(m)-1)):.2f}s; "
      f"last ends {m[-1]['end']:.2f}s (body 29.47s)")
