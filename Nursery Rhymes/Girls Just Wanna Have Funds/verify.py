import subprocess, numpy as np, sys, json, os
from plan import CAPS, SONG0, END
V=sys.argv[1] if len(sys.argv)>1 else 'girls-just-wanna-have-funds.mp4'
print(f"=== verifying {V}")
d=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',V],
                 capture_output=True,text=True).stdout.strip()
print(f"duration {d}s (expected {END-SONG0:.2f})")

# --- 1. STATIC CHECK (playbook 6) ---
W,H=160,284
p=subprocess.run(['ffmpeg','-v','error','-i',V,'-vf',
    f"scale={W}:{H},tblend=all_mode=difference",'-f','rawvideo','-pix_fmt','gray','-'],
    capture_output=True)
a=np.frombuffer(p.stdout,dtype=np.uint8).reshape(-1,H,W).astype(np.float32)
m=a.mean(axis=(1,2)); fps=30.0
THR=0.45; MIN=0.30
runs=[]; st=None
for i,v in enumerate(m):
    if v<THR:
        if st is None: st=i
    else:
        if st is not None and (i-st)/fps>=MIN: runs.append((st/fps,(i-st)/fps))
        st=None
if st is not None and (len(m)-st)/fps>=MIN: runs.append((st/fps,(len(m)-st)/fps))
print(f"STATIC: mean framediff {m.mean():.2f}, min {m.min():.2f}; "
      f"{len(runs)} run(s) below {THR} for >={MIN}s")
for t,dur in runs: print(f"   !! static {t:.2f}s for {dur:.2f}s")

# --- 2. VISEME SPOT-CHECK at each lyric's first word +0.10s ---
os.makedirs('diag',exist_ok=True)
times=[round(s-SONG0+0.10,2) for s,e,t in CAPS]
sel='+'.join(f"between(t,{t},{t+0.04})" for t in times)
subprocess.run(['ffmpeg','-v','error','-y','-i',V,'-vf',
    f"select='{sel}',scale=180:320,tile=7x3",'-frames:v','1','-vsync','0',
    'diag/viseme-check.png'],check=True)
print(f"VISEME: diag/viseme-check.png  ({len(times)} lyric onsets +0.10s)")
for i,(t,(s,e,txt)) in enumerate(zip(times,CAPS)): print(f"   {i:2d} v={t:6.2f}s  {txt}")
