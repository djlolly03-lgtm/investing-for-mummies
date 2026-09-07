import os, json, wave, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SONG0=7.86; END=67.74
# --- measure where the VOCAL actually stops (centred-vocal mid/side ratio) ---
w=wave.open('song-st-16k.wav'); sr=w.getframerate()
a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32).reshape(-1,2)/32768.
mid=(a[:,0]+a[:,1])/2; side=(a[:,0]-a[:,1])/2
hop=int(sr*0.05); win=int(sr*0.15)
F=np.fft.rfftfreq(win,1/sr); band=(F>=350)&(F<=3500)
def e(x,i):
    s=x[i:i+win]
    if len(s)<win: s=np.pad(s,(0,win-len(s)))
    return np.abs(np.fft.rfft(s*np.hanning(win)))[band].mean()
T=np.arange(0,int(len(mid)-win),hop)/sr
R=np.array([e(mid,int(t*sr))/(e(side,int(t*sr))+1e-9) for t in T])
def vocal_end(t_last, limit):
    """first moment at/after t_last where the centred vocal is gone for >=0.25s"""
    i=int(np.searchsorted(T,t_last)); run=0
    for j in range(i,len(T)):
        if T[j]>limit: break
        if R[j]<1.45:
            run+=1
            if run*0.05>=0.25: return max(t_last+0.25, T[j-run+1])
        else: run=0
    return min(limit, t_last+0.9)
LINES=[(7.86,10.38,"Girls just wanna have fun"),(12.00,14.32,"Girls just wanna have fun"),
 (15.84,17.90,"Spend a little, save a little"),(18.90,19.88,"Have some fun"),
 (22.86,25.72,"But before you spend your pay"),(26.34,29.24,"Put a little bit away"),
 (30.02,34.32,"Save and invest and have your fun"),(35.04,39.08,"You can do both, you don't need just one"),
 (40.18,43.14,"Girls just wanna have fun"),(43.74,47.00,"Girls just wanna have fun"),
 (48.48,51.76,"Smart with money, still have fun"),(52.30,56.50,"That's Investing for Mummies"),
 (59.76,62.50,"Girls just wanna have fun"),(63.76,66.40,"Girls just wanna have fun")]
CAPS=[]
for i,(s,lastw,txt) in enumerate(LINES):
    nxt=LINES[i+1][0] if i+1<len(LINES) else END
    end=min(vocal_end(lastw,min(nxt-0.12,END)), nxt-0.12)
    CAPS.append((s,end,txt))
    print(f"{s:6.2f} -> {end:6.2f}  ({end-s:4.2f}s, gap to next {nxt-end:5.2f}s)  {txt}")
# --- render PNGs ---
FONT='/Users/lollyg/Library/Fonts/fixed-Nunito-Bold.ttf'; W=1080; MAXW=940; PAD=60
os.makedirs('caps2',exist_ok=True)
def fit(t):
    for s in range(78,40,-2):
        f=ImageFont.truetype(FONT,s)
        if f.getbbox(t)[2]<=MAXW: return [t],f,s
    ws=t.split(); best=min(((abs(len(' '.join(ws[:i]))-len(' '.join(ws[i:]))),i) for i in range(1,len(ws))))[1]
    L=[' '.join(ws[:best]),' '.join(ws[best:])]
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
    p=f'caps2/cap{i:02d}.png'; im.save(p)
    meta.append({'file':p,'start':round(s-SONG0,3),'end':round(e-SONG0,3),'h':H,'text':txt})
json.dump(meta,open('caps2/meta.json','w'),indent=1)
print(f"\n{len(meta)} captions written")
