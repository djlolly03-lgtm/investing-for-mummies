import os, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from plan import CAPS, SONG0
FONT='/Users/lollyg/Library/Fonts/fixed-Nunito-Bold.ttf'
W=1080; MAXW=940; PAD=60
WHITE=(255,255,255,255); NAVY=(26,58,92,255)
os.makedirs('caps',exist_ok=True)
def fit(text):
    for size in range(78,40,-2):
        f=ImageFont.truetype(FONT,size)
        if f.getbbox(text)[2]<=MAXW: return [text],f,size
    # wrap to 2 lines at the nearest space to the middle
    words=text.split(); best=None
    for i in range(1,len(words)):
        a=' '.join(words[:i]); b=' '.join(words[i:])
        d=abs(len(a)-len(b))
        if best is None or d<best[0]: best=(d,a,b)
    lines=[best[1],best[2]]
    for size in range(78,40,-2):
        f=ImageFont.truetype(FONT,size)
        if max(f.getbbox(l)[2] for l in lines)<=MAXW: return lines,f,size
    return lines,ImageFont.truetype(FONT,44),44
meta=[]
for i,(s,e,text) in enumerate(CAPS):
    lines,f,size=fit(text)
    lh=int(size*1.28); H=lh*len(lines)+PAD*2
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); ds=ImageDraw.Draw(sh)
    stroke=max(7,size//9)
    for j,l in enumerate(lines):
        y=PAD+j*lh; 
        ds.text((W//2,y+6),l,font=f,fill=(0,0,0,190),anchor='ma',stroke_width=stroke+3,stroke_fill=(0,0,0,190))
    sh=sh.filter(ImageFilter.GaussianBlur(9))
    im=Image.alpha_composite(im,sh); d=ImageDraw.Draw(im)
    for j,l in enumerate(lines):
        y=PAD+j*lh
        d.text((W//2,y),l,font=f,fill=WHITE,anchor='ma',stroke_width=stroke,stroke_fill=NAVY)
    p=f'caps/cap{i:02d}.png'; im.save(p)
    meta.append({'file':p,'start':round(s-SONG0,3),'end':round(e-SONG0,3),'h':H,'text':text})
json.dump(meta,open('caps/meta.json','w'),indent=1)
print(f"{len(meta)} captions; heights {sorted(set(m['h'] for m in meta))}")
