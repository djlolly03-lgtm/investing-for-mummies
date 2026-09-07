import subprocess, numpy as np, sys
W,H=120,213
for n in ['01','02','03','04','05','06','07','08','09','10']:
    f=f"clip-{n}.mp4"
    p=subprocess.run(["ffmpeg","-v","error","-i",f,"-vf",f"scale={W}:{H},tblend=all_mode=difference","-f","rawvideo","-pix_fmt","gray","-"],capture_output=True)
    a=np.frombuffer(p.stdout,dtype=np.uint8).reshape(-1,H,W).astype(np.float32)
    m=a.mean(axis=(1,2))
    np.save(f"clip-{n}_motion.npy",m)
    spikes=[(i/24.0,round(float(v),1)) for i,v in enumerate(m) if v>25]
    print(f"clip-{n}: frames={len(m)} mean={m.mean():.1f} max={m.max():.1f} SHOTCHANGES={spikes}")
