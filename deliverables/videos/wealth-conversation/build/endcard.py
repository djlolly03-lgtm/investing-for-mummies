from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, os, math, subprocess, glob
S="/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/scratchpad/maincomp"; R="/Users/lollyg/Documents/investing for Mummies"; B="/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/3aa00bba-4ee2-4992-adfd-27934d926b77/images/1.jpg"
W,H=1080,1920; FPS=30; DUR=3.45
orig=Image.open(S+'/endcard_orig.png').convert('RGB')
c_mid=np.array(orig.getpixel((540,1500)),float); c_edge=np.array(orig.getpixel((30,30)),float); c_edge2=np.array(orig.getpixel((1050,1890)),float)
print('bg centre',c_mid,'corner',c_edge,c_edge2)
# radial gradient background like the original
yy,xx=np.mgrid[0:H,0:W]; r=np.sqrt(((xx-540)/540.0)**2+((yy-960)/960.0)**2); r=np.clip(r/1.15,0,1)[...,None]
bg=(c_mid*(1-r)+((c_edge+c_edge2)/2)*r).astype(np.uint8); bg=Image.fromarray(bg,'RGB').convert('RGBA')
# IFM logo on a white panel
ifm=Image.open(R+'/highlight-reel-assets/games/logo-full.png').convert('RGBA'); ifm=ifm.resize((840,int(840*ifm.height/ifm.width)),Image.LANCZOS)
panel=Image.new('RGBA',(ifm.width+48,ifm.height+40),(255,255,255,255)); panel.alpha_composite(ifm,(24,20))
def shadowed(im,blur=18,alpha=70,dy=10):
    out=Image.new('RGBA',(im.width+2*blur*2,im.height+2*blur*2+dy),(0,0,0,0))
    sh=Image.new('RGBA',out.size,(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((blur*2,blur*2+dy,blur*2+im.width,blur*2+dy+im.height),18,fill=(0,0,0,alpha)); sh=sh.filter(ImageFilter.GaussianBlur(blur))
    out.alpha_composite(sh); out.alpha_composite(im,(blur*2,blur*2)); return out
def rounded(im,rad=22):
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,im.width-1,im.height-1),rad,fill=255); im=im.copy(); im.putalpha(m); return im
panel=shadowed(rounded(panel))
# BEOND logo: crop the lockup from the supplied image, keep its black background inside a black rounded box
src=Image.open(B).convert('RGB'); g=np.asarray(src.convert('L')); ys,xs=np.where(g>40); x0,y0,x1,y1=xs.min(),ys.min(),xs.max(),ys.max()
logo=src.crop((x0-30,y0-30,x1+30,y1+30)); logo=logo.resize((700,int(700*logo.height/logo.width)),Image.LANCZOS)
box=Image.new('RGBA',(888,logo.height+120),(0,0,0,255)); box.alpha_composite(logo.convert('RGBA'),((888-logo.width)//2,60))
box=shadowed(rounded(box))
# the x
f=ImageFont.truetype(os.path.expanduser('~/Library/Fonts/Lora.ttf'),110); f.set_variation_by_name('Medium')
xim=Image.new('RGBA',(200,200),(0,0,0,0)); d=ImageDraw.Draw(xim); bb=d.textbbox((0,0),'×',font=f); d.text(((200-(bb[2]-bb[0]))/2-bb[0],(200-(bb[3]-bb[1]))/2-bb[1]),'×',font=f,fill=(41,67,84,255))
# layout: vertical centre
gap=70
total=panel.height+gap+200+gap+box.height - 2*36
y=(H-total)//2
els=[(panel,(W-panel.width)//2,y-36,0.00),(xim,(W-200)//2,y-36+panel.height-36+gap,0.35),(box,(W-box.width)//2,y-36+panel.height-36+gap+200+gap-36,0.55)]
os.makedirs(S+'/ov/END',exist_ok=True)
for fp in glob.glob(S+'/ov/END/*.png'): os.remove(fp)
n=int(round(DUR*FPS))
for i in range(n):
    t=i/FPS; fr=bg.copy()
    for im,x,y0,t0 in els:
        p=min(max((t-t0)/0.45,0),1); e=1-(1-p)**3
        if p<=0: continue
        a=im if p>=1 else (lambda im2: (im2.putalpha(im2.split()[3].point(lambda v:int(v*e))) or im2))(im.copy())
        fr.alpha_composite(a,(x,int(y0+28*(1-e))))
    fr.convert('RGB').save(f'{S}/ov/END/f{i:04d}.png',compress_level=1)
print('frames',n)
subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-framerate','30','-i',S+'/ov/END/f%04d.png','-vf','fade=t=in:st=0:d=0.3,fade=t=out:st=2.85:d=0.6,format=yuv420p','-c:v','libx264','-preset','medium','-crf','16','-g','30','-an',S+'/seg/END.mp4'],check=True)
Image.open(f'{S}/ov/END/f{n-20:04d}.png').save(S+'/endcard_new.png')
print('END.mp4 written')
