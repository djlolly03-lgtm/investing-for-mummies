#!/usr/bin/env python3
# Premium news lower-thirds + headline overlays (1080x1920 transparent PNG), one per scene.
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H=1080,1920
WORK=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(WORK,"work"); os.makedirs(OUT,exist_ok=True)
NUN="/tmp/ifm_teaser/nunito.ttf"
def F(s): return ImageFont.truetype(NUN,s)
GOLD=(201,168,76); GOLD_LT=(232,209,138); WHITE=(247,248,250)

def wrap(d,s,f,maxw):
    words=s.split(); lines=[]; cur=""
    for w in words:
        t=(cur+" "+w).strip()
        if d.textlength(t,font=f)<=maxw: cur=t
        else: lines.append(cur); cur=w
    if cur: lines.append(cur)
    return lines

def ctext(d,cx,y,s,f,fill,track=0):
    tot=sum(d.textlength(c,font=f)+track for c in s)-track
    x=cx-tot/2
    for c in s: d.text((x,y),c,font=f,fill=fill); x+=d.textlength(c,font=f)+track
    return tot

def lower_third(kicker, caption, fn, big=False):
    img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    fcap=F(58 if big else 46); fkick=F(30)
    lines=wrap(d,caption,fcap,940)
    lh=int(fcap.size*1.18)
    panel_h=len(lines)*lh + (70 if kicker else 36) + 50
    y0=H-220-panel_h
    # translucent dark panel
    pan=Image.new("RGBA",(W,H),(0,0,0,0)); pd=ImageDraw.Draw(pan)
    pd.rounded_rectangle([60,y0,W-60,y0+panel_h],28,fill=(10,11,15,205))
    img.alpha_composite(pan)
    d=ImageDraw.Draw(img)
    # gold top rule
    d.rounded_rectangle([60,y0,W-60,y0+5],3,fill=GOLD+(255,))
    yy=y0+30
    if kicker:
        # gold kicker pill-ish
        ctext(d,W//2,yy,kicker.upper(),fkick,GOLD_LT+(255,),4); yy+=64
    for ln in lines:
        ctext(d,W//2,yy,ln,fcap,WHITE+(255,),0); yy+=lh
    img.save(os.path.join(OUT,fn)); print("wrote",fn)

def headline_card(kicker, big_lines, fn, color=WHITE, accent=GOLD_LT, ypos=720):
    img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    fk=F(34); fb=F(96)
    y=ypos
    if kicker:
        # gold pill
        kw=d.textlength(kicker,font=fk)+56
        d.rounded_rectangle([W//2-kw/2,y,W//2+kw/2,y+58],29,fill=GOLD+(255,))
        ctext(d,W//2,y+12,kicker,fk,(18,16,10,255),2); y+=100
    for ln in big_lines:
        # soft glow
        lay=Image.new("RGBA",(W,H),(0,0,0,0)); ld=ImageDraw.Draw(lay)
        ctext(ld,W//2,y,ln,fb,accent+(255,),1)
        img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(16)))
        ctext(d,W//2,y,ln,fb,color+(255,),1); y+=int(fb.size*1.1)
    img.save(os.path.join(OUT,fn)); print("wrote",fn)

# Scene 1: strong news lower-third (kept off the face)
lower_third("Breaking", "VEDANTA SPLITS INTO 5 COMPANIES", "ov_s1.png", big=True)
# Scene 2: question lower-third (readable on dark panel, below the pizza)
lower_third("The big question", "5 COMPANIES = 5× RICHER?", "ov_s2.png", big=True)
# Scene 3: caption
lower_third(None, "Not quite. Think of it like a pizza, cut into slices.", "ov_s3.png")
# Scene 4: caption
lower_third("Same pizza", "The number of pieces changes. The size does not.", "ov_s4.png")
# Scene 5: caption
lower_third("Demerger", "That's the basic idea behind a demerger.", "ov_s5.png")
print("done")
