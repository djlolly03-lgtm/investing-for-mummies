import os, json, wave, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
END=28.24
w=wave.open('song30-st.wav'); sr=w.getframerate()
a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32).reshape(-1,2)/32768.
mid=(a[:,0]+a[:,1])/2; side=(a[:,0]-a[:,1])/2
win=int(sr*0.15); hop=int(sr*0.05)
F=np.fft.rfftfreq(win,1/sr); band=(F>=350)&(F<=3500)
def en(x,i):
    s=x[i:i+win]
    if len(s)<win: s=np.pad(s,(0,win-len(s)))
    return np.abs(np.fft.rfft(s*np.hanning(win)))[band].mean()
T=np.arange(0,max(1,len(mid)-win),hop)/sr
R=np.array([en(mid,int(t*sr))/(en(side,int(t*sr))+1e-9) for t in T])
def vend(t_last,limit):
    i=int(np.searchsorted(T,t_last)); run=0
    for j in range(i,len(T)):
        if T[j]>limit: break
        if R[j]<1.45:
            run+=1
            if run*0.05>=0.25: return max(t_last+0.25,T[j-run+1])
        else: run=0
    return min(limit,t_last+0.9)
# (video_start, video_time_of_last_word, text)
LINES=[(0.00,2.52,"Girls just wanna have fun"),
 (4.14,6.20,"Spend a little, save a little"),(7.20,8.18,"Have some fun"),
 (9.90,14.20,"Save and invest and have your fun"),
 (14.92,18.20,"Smart with money, still have fun"),
 (18.74,22.94,"That's Investing for Mummies"),
 (24.24,26.98,"Girls just wanna have fun")]
CAPS=[]
for i,(s,lw,txt) in enumerate(LINES):
    nxt=LINES[i+1][0] if i+1<len(LINES) else END
    CAPS.append((s,min(vend(lw,min(nxt-0.12,END)),nxt-0.12),txt))
for s,e,t in CAPS: print(f"{s:6.2f} -> {e:6.2f} ({e-s:4.2f}s)  {t}")
FONT='/Users/lollyg/Library/Fonts/fixed-Nunito-Bold.ttf'; W=1080; MAXW=940; PAD=60
os.makedirs('caps30',exist_ok=True)
def fit(t):
    for s in range(78,40,-2):
        f=ImageFont.truetype(FONT,s)
        if f.getbbox(t)[2]<=MAXW: return [t],f,s
    ws=t.split(); k=min(((abs(len(' '.join(ws[:i]))-len(' '.join(ws[i:]))),i) for i in range(1,len(ws))))[1]
    L=[' '.join(ws[:k]),' '.join(ws[k:])]
    for s in range(78,40,-2):
        f=ImageFont.truetype(FONT,s)
        if max(f.getbbox(x)[2] for x in L)<=MAXW: return L,f,s
    return L,ImageFont.truetype(FONT,44),44
meta=[]
for i,(s,e,txt) in enumerate(CAPS):
    L,f,size=fit(txt); lh=int(size*1.28); H=lh*len(L)+PAD*2
    im=Image.new('RGBA',(W,H),(0,0,0,0)); sh=Image.new('RGBA',(W,H),(0,0,0,0))
    ds=ImageDraw.Draw(sh); st=max(7,size//9)
    for j,l in enumerate(L):
        ds.text((W//2,PAD+j*lh+6),l,font=f,fill=(0,0,0,190),anchor='ma',stroke_width=st+3,stroke_fill=(0,0,0,190))
    im=Image.alpha_composite(im,sh.filter(ImageFilter.GaussianBlur(9))); d=ImageDraw.Draw(im)
    for j,l in enumerate(L):
        d.text((W//2,PAD+j*lh),l,font=f,fill=(255,255,255,255),anchor='ma',stroke_width=st,stroke_fill=(26,58,92,255))
    p=f'caps30/cap{i:02d}.png'; im.save(p)
    meta.append({'file':p,'start':round(s,3),'end':round(e,3),'h':H,'text':txt})
json.dump(meta,open('caps30/meta.json','w'),indent=1)
print(f"{len(meta)} captions")
