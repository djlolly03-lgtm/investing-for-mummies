import cv2, numpy as np, wave, json
casc=cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_default.xml')
def openness(clip):
    cap=cv2.VideoCapture(f'clip-{clip}.mp4'); vals=[]; last=None
    while True:
        ok,im=cap.read()
        if not ok: break
        g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
        fs=casc.detectMultiScale(g,1.15,5,minSize=(90,90))
        box=max(fs,key=lambda f:f[2]*f[3]) if len(fs) else last
        if box is None: vals.append(np.nan); continue
        last=box; x,y,w,h=box
        y0=y+int(h*0.60); y1=y+int(h*0.98); x0=x+int(w*0.24); x1=x+int(w*0.76)
        roi=g[max(0,y0):y1, max(0,x0):x1]
        if roi.size<50: vals.append(np.nan); continue
        roi=cv2.resize(roi,(60,40)).astype(np.float32)
        # mouth interior = dark pixels relative to the surrounding skin
        thr=np.percentile(roi,25)
        vals.append(float((roi<thr*0.92).mean()))
    a=np.array(vals,dtype=np.float32)
    idx=np.arange(len(a)); m=~np.isnan(a)
    return np.interp(idx,idx[m],a[m]) if m.any() else np.zeros(len(a))

def vocenv(clip,n,fps=24.0):
    w=wave.open(f'clip-{clip}-16k.wav'); sr=w.getframerate()
    a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.
    win=int(sr*0.06); out=[]
    F=np.fft.rfftfreq(win,1/sr); band=(F>=300)&(F<=3400)
    for i in range(n):
        c=int(i/fps*sr); s=a[max(0,c-win//2):max(0,c-win//2)+win]
        if len(s)<win: s=np.pad(s,(0,win-len(s)))
        out.append(np.abs(np.fft.rfft(s*np.hanning(win)))[band].mean())
    return np.array(out,dtype=np.float32)

def z(x):
    x=x-x.mean(); s=x.std(); return x/s if s>1e-9 else x
print(f"{'clip':8}{'lag(s)':>9}{'peak r':>9}{'r@0':>8}   sharpness")
res={}
for c in ['01','02','03','04','05','06','07','08','09','10']:
    mo=openness(c); n=len(mo); au=vocenv(c,n)
    m,a=z(mo),z(au)
    lags=np.arange(-24,25)   # +/- 1.0s at 24fps
    cc=[np.corrcoef(m[max(0,l):n+min(0,l)], a[max(0,-l):n+min(0,-l)])[0,1] for l in lags]
    cc=np.array(cc); k=int(np.argmax(cc))
    lag=lags[k]/24.0
    res[c]=dict(lag=round(float(lag),3),r=round(float(cc[k]),3))
    print(f"clip-{c} {lag:+9.3f}{cc[k]:9.3f}{cc[24]:8.3f}   {'SHARP' if cc[k]-np.median(cc)>0.15 else 'weak'}")
json.dump(res,open('lipoffsets.json','w'),indent=1)
