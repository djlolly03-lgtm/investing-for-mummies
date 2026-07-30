#!/usr/bin/env python3
# Premium dark-graphite + gold motion graphics for the Vedanta reel (9:16, 1080x1920).
import os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
WORK = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(WORK, "work", "frames")
os.makedirs(FRAMES, exist_ok=True)
NUN = "/tmp/ifm_teaser/nunito.ttf"
def font(sz): return ImageFont.truetype(NUN, sz)

GOLD=(201,168,76); GOLD_LT=(232,209,138); INK=(14,15,20); GRAPH=(26,28,34); WHITE=(245,246,248)

def bg():
    """dark graphite vertical gradient + soft gold glow top + vignette."""
    from PIL import ImageChops
    top=(34,37,46); bot=(10,11,15)
    g=Image.new("RGB",(1,H))
    for y in range(H):
        t=y/H
        g.putpixel((0,y),tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3)))
    im=g.resize((W,H))
    # soft gold glow near top center
    glow=Image.new("RGB",(W,H),(0,0,0)); gd=ImageDraw.Draw(glow)
    gd.ellipse([W//2-440,-280,W//2+440,380],fill=(64,50,18))
    glow=glow.filter(ImageFilter.GaussianBlur(170))
    im=ImageChops.add(im,glow)
    # vignette
    vig=Image.new("L",(W,H),0); vd=ImageDraw.Draw(vig)
    vd.ellipse([-220,-220,W+220,H+220],fill=95)
    vig=vig.filter(ImageFilter.GaussianBlur(230))
    dark=Image.new("RGB",(W,H),(6,7,11))
    im=Image.composite(im,dark,vig)
    return im.convert("RGBA")

def rrect(d,box,r,fill=None,outline=None,width=2):
    d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=width)

def text_center(d,cx,y,s,f,fill,track=0):
    tot=sum(d.textlength(c,font=f)+track for c in s)-track
    x=cx-tot/2
    for c in s:
        d.text((x,y),c,font=f,fill=fill); x+=d.textlength(c,font=f)+track
    return tot

def glow_text(img,cx,y,s,f,fill,track=2,blur=14,glow=GOLD):
    lay=Image.new("RGBA",img.size,(0,0,0,0)); d=ImageDraw.Draw(lay)
    text_center(d,cx,y,s,f,glow+(255,),track)
    g=lay.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(g)
    d2=ImageDraw.Draw(img); text_center(d2,cx,y,s,f,fill+(255,),track)

SECTORS=["BASE METALS","ALUMINIUM","OIL & GAS","POWER","IRON & STEEL"]

def ease(t): return 1-(1-t)**3

def block(size=(330,96)):
    bw,bh=size
    b=Image.new("RGBA",(bw,bh),(0,0,0,0)); d=ImageDraw.Draw(b)
    rrect(d,[2,2,bw-3,bh-3],18,fill=(28,30,38,235),outline=GOLD+(255,),width=2)
    rrect(d,[14,bh//2-20,20,bh//2+20],3,fill=GOLD_LT+(255,))  # gold accent bar
    return b

# ---------- SCENE 4: blocks fan out around a center ----------
def scene4(dur=4.2, fps=30):
    n=int(dur*fps)
    cx,cy=W//2, 880
    R=430
    angles=[-90+ i*72 for i in range(5)]  # pentagon
    bw,bh=330,96
    blk=block((bw,bh))
    paths=[]
    out=os.path.join(WORK,"work","s4")
    os.makedirs(out,exist_ok=True)
    base=bg()
    fl=font(30); fk=font(26)
    for fi in range(n):
        t=fi/fps
        img=base.copy(); d=ImageDraw.Draw(img)
        # central node
        pulse=0.5+0.5*math.sin(t*3)
        for rr,al in [(70,40),(48,90),(30,200)]:
            node=Image.new("RGBA",img.size,(0,0,0,0)); nd=ImageDraw.Draw(node)
            nd.ellipse([cx-rr,cy-rr,cx+rr,cy+rr],fill=GOLD+(int(al*(0.6+0.4*pulse)),))
            img.alpha_composite(node.filter(ImageFilter.GaussianBlur(8)))
        d=ImageDraw.Draw(img)
        text_center(d,cx,cy-22,"VEDANTA",font(34),GOLD_LT+(255,),2)
        # blocks
        appear=ease(min(1,t/1.6))
        for i,a in enumerate(angles):
            ar=math.radians(a)
            tx=cx+math.cos(ar)*R - bw/2
            ty=cy+math.sin(ar)*R - bh/2
            # from center to position
            sx=cx-bw/2; sy=cy-bh/2
            x=sx+(tx-sx)*appear; y=sy+(ty-sy)*appear
            sc=0.4+0.6*appear
            bb=blk.resize((int(bw*sc),int(bh*sc)))
            img.alpha_composite(bb,(int(x+ (bw-bw*sc)/2),int(y+(bh-bh*sc)/2)))
            if appear>0.8:
                la=int(255*min(1,(appear-0.8)/0.2))
                dd=ImageDraw.Draw(img)
                text_center(dd, x+bw*sc/2 + 6, y+bh*sc/2-16, SECTORS[i], fl, WHITE+(la,),0)
        # connecting lines center->block (subtle)
        img.save(os.path.join(out,f"f{fi:04d}.png"))
    return out,fps,n

# ---------- SCENE 6: hero end-card ----------
def scene6(dur=3.6, fps=30):
    n=int(dur*fps)
    cx,cy=W//2, 760
    R=360; bw,bh=300,80
    blk=block((bw,bh))
    out=os.path.join(WORK,"work","s6"); os.makedirs(out,exist_ok=True)
    base=bg()
    angles=[-90+i*72 for i in range(5)]
    fl=font(26)
    for fi in range(n):
        t=fi/fps
        img=base.copy()
        # central emblem: gold hexagon with V
        pulse=0.5+0.5*math.sin(t*2.2)
        emb=Image.new("RGBA",img.size,(0,0,0,0)); ed=ImageDraw.Draw(emb)
        rr=96
        pts=[(cx+rr*math.cos(math.radians(60*k-90)),cy+rr*math.sin(math.radians(60*k-90))) for k in range(6)]
        ed.polygon(pts,outline=GOLD+(255,),width=4)
        ed.polygon(pts,fill=(30,32,40,180))
        img.alpha_composite(emb.filter(ImageFilter.GaussianBlur(0)))
        glow_text(img,cx,cy-44,"V",font(96),GOLD_LT,0,18,GOLD)
        # blocks (static, gentle pulse on borders)
        for i,a in enumerate(angles):
            ar=math.radians(a)
            x=cx+math.cos(ar)*R - bw/2; y=cy+math.sin(ar)*R - bh/2
            img.alpha_composite(blk,(int(x),int(y)))
            dd=ImageDraw.Draw(img)
            text_center(dd,x+bw/2+6,y+bh/2-13,SECTORS[i],fl,WHITE+(255,),0)
        # headline slide-up
        prog=ease(min(1,t/0.8)); off=int(40*(1-prog)); al=int(255*prog)
        d=ImageDraw.Draw(img)
        glow_text(img,W//2,1320+off,"VEDANTA DEMERGER",font(72),WHITE,1,16,GOLD)
        sub="WHAT IT MEANS FOR SHAREHOLDERS"
        wsub=text_center(d,W//2,1420+off,sub,font(34),GOLD_LT+(al,),3)
        ax=W//2+wsub/2+26; ay=1420+off+22
        d.polygon([(ax,ay-13),(ax+18,ay),(ax,ay+13)],fill=GOLD_LT+(al,))
        img.save(os.path.join(out,f"f{fi:04d}.png"))
    return out,fps,n

if __name__=="__main__":
    for fn in (scene4, scene6):
        out,fps,n=fn()
        print("rendered",out,n,"frames")
