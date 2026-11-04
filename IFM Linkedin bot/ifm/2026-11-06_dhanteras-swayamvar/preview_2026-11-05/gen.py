# I17 Dhanteras / Miss Gold -> 6-slide storytelling carousel, IFM 'we' voice, real Swayamvar game screens, logo top only, no footer/URL.
from PIL import Image, ImageDraw, ImageFont, ImageOps
W,H=1080,1350
CREAM=(247,250,249); NAVY=(26,58,92); TEAL=(42,157,143); GOLD=(201,168,76); BODY=(38,48,60); LIGHT=(214,226,236); MINT=(224,243,240); MAROON=(122,22,32); BLUSH=(250,236,232)
LORA='/usr/share/fonts/truetype/sand-box/google/Lora/Lora-VariableFont_wght.ttf'
NUN='/usr/share/fonts/truetype/sand-box/google/Nunito/Nunito-VariableFont_wght.ttf'
LOGO=Image.open('/workspace/ifm_preview/2026-10-13/logo_264.png').convert('RGBA')
S='/workspace/ifm_preview/2026-11-05/shots/'
OUT='/workspace/ifm_preview/2026-11-05/final/'
NAME='dhanteras-miss-gold_carousel.pdf'
def F(p,s,v): f=ImageFont.truetype(p,s); f.set_variation_by_name(v); return f
def wrap(d,t,f,mw):
    out=[]
    for para in t.split('\n'):
        line=''
        for w in para.split(' '):
            x=(line+' '+w).strip()
            if d.textlength(x,font=f)<=mw: line=x
            else: out.append(line); line=w
        out.append(line)
    return out
def text(d,xy,s,f,fill,mw,lh,align='left'):
    x,y=xy
    for ln in wrap(d,s,f,mw):
        if align=='center': d.text((W/2,y),ln,font=f,fill=fill,anchor='ma')
        else: d.text((x,y),ln,font=f,fill=fill)
        y+=lh
    return y
def pill(d,x,y,s,col=TEAL,tc='white'):
    f=F(NUN,30,'Bold'); tw=d.textlength(s,font=f)
    d.rounded_rectangle((x,y,x+tw+48,y+62),radius=31,fill=col)
    d.text((x+24,y+31),s,font=f,fill=tc,anchor='lm'); return y+62
def base(navy=False):
    im=Image.new('RGB',(W,H),NAVY if navy else CREAM); d=ImageDraw.Draw(im)
    if navy: d.rounded_rectangle((44,48,356,192),radius=22,fill=CREAM)
    im.paste(LOGO,(68,67),LOGO); return im,ImageDraw.Draw(im)
def shot(name,box):  # box in 1024x640 screen coords -> crop of the 2880x1800 retina capture
    k=2880/1024; x0,y0,x1,y1=box
    return Image.open(S+name).convert('RGB').crop((int(x0*k),int(y0*k),int(x1*k),int(y1*k)))
def photo(im,p,box,centering=(0.5,0.5),border=None):
    x0,y0,x1,y1=box
    p=ImageOps.fit(p,(x1-x0,y1-y0),Image.LANCZOS,centering=centering)
    m=Image.new('L',p.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,p.size[0]-1,p.size[1]-1),28,fill=255)
    im.paste(p,(x0,y0),m)
    if border: ImageDraw.Draw(im).rounded_rectangle(box,28,outline=border,width=3)
def photo_w(im,p,x,y,w,border=None):  # contain by width, returns bottom y
    h=round(p.size[1]*w/p.size[0]); photo(im,p,(x,y,x+w,y+h),border=border); return y+h
X=68; MW=W-2*X
HEAD=F(LORA,76,'Bold'); SUB=F(NUN,40,'Regular'); SUBB=F(NUN,40,'Bold')

# 1 cover
im,d=base(); y=pill(d,X,240,'Dhanteras is tomorrow',GOLD,NAVY)
y=text(d,(X,y+50),'Before you buy gold, meet Miss Gold.',F(LORA,88,'Bold'),NAVY,MW,106)+14
y=text(d,(X,y),'She\u2019s one of six suitors in our Swayamvar game.',F(LORA,48,'SemiBold'),TEAL,MW,64)+34
d.rounded_rectangle((X,y,X+92,y+7),radius=3,fill=GOLD)
photo(im,shot('gallery_2.png',(252,75,846,572)),(X,y+44,W-X,1282),(0.5,0.0),border=GOLD)
im.save(OUT+'slide_01.png')

# 2 her biodata
im,d=base(); y=pill(d,X,240,'Her biodata')
y=text(d,(X,y+50),'\u201cFamily favourite since 3000 BC.\u201d',F(LORA,72,'Bold'),NAVY,MW,90)+20
y=text(d,(X,y),'Grandma approves. Mom approves. Bua definitely approves.',SUBB,BODY,MW,56)+12
y=text(d,(X,y),'Universally trusted, survives crises, always invited. Sound like anyone in your family locker?',SUB,BODY,MW,56)+40
photo(im,shot('gallery_2.png',(30,72,848,575)),(X,y,W-X,1282),(0.5,0.3),border=GOLD)
im.save(OUT+'slide_02.png')

# 3 red flags
im,d=base(); y=pill(d,X,240,'Every biodata has red flags',MAROON)
y=text(d,(X,y+50),'\u201cSometimes just sits there looking pretty.\u201d',F(LORA,72,'Bold'),NAVY,MW,90)+36
y=photo_w(im,shot('gallery_2.png',(266,296,612,447)),(W-800)//2,y,800,border=GOLD)+40
d.rounded_rectangle((X,y,W-X,1282),radius=24,fill=MINT)
yy=text(d,(X+48,y+44),'The gold in your locker doesn\u2019t pay interest, rent or dividends.',F(LORA,50,'Bold'),NAVY,MW-96,66)+14
text(d,(X+48,yy),'That isn\u2019t her job. She\u2019s the one the family trusts when times get rough.',SUB,BODY,MW-96,56)
im.save(OUT+'slide_03.png')

# 4 how we teach it
im,d=base(); y=pill(d,X,240,'This is how we teach it')
y=text(d,(X,y+44),'Six suitors. Four rounds. Everyone votes on their phone.',F(LORA,60,'Bold'),NAVY,MW,74)+22
y=text(d,(X,y),'Marry? Date? Call at 2 AM? And the loudest round of all: who would your mother choose?',SUB,BODY,MW,54)+8
y=text(d,(X,y),'(Guess who Mum picks.)',F(LORA,44,'SemiBold'),TEAL,MW,58)+26
photo(im,shot('voting_mum.png',(0,0,1024,640)),(X,y,W-X,1282),(0.5,0.0),border=GOLD)
im.save(OUT+'slide_04.png')

# 5 the twist
im,d=base(); y=pill(d,X,240,'Then comes the twist')
y=text(d,(X,y+50),'Nobody gets just one suitor.',F(LORA,72,'Bold'),NAVY,MW,90)+20
y=text(d,(X,y),'In the finale, every suitor gets a role. Miss Gold goes into the Stability bucket, with Debt and Real Estate: the anchor when growth stumbles.',SUB,BODY,MW,56)+40
photo_w(im,shot('finale_2.png',(220,10,804,330)),X,y,MW,border=GOLD)
im.save(OUT+'slide_05.png')

# 6 closer
im,d=base(True)
photo_w(im,shot('finale_4.png',(172,28,852,385)),X,240,MW)
y=240+round(357*MW/680)+60
y=text(d,(0,y),'Buy your gold with joy tomorrow.',F(LORA,66,'Bold'),'white',W-140,82,'center')
y=text(d,(0,y+4),'Just know her role.',F(LORA,66,'Bold'),(232,200,110),W-140,82,'center')
d.rounded_rectangle((W/2-46,y+22,W/2+46,y+29),radius=3,fill=GOLD)
y=text(d,(0,y+64),'Shubh Dhanteras from all of us.',F(NUN,44,'Bold'),'white',W-200,60,'center')
text(d,(0,y+18),'Play Swayamvar with your family. Link in the comments.',F(NUN,38,'Regular'),LIGHT,W-220,54,'center')
im.save(OUT+'slide_06.png')

ims=[Image.open(OUT+f'slide_0{i}.png').convert('RGB') for i in range(1,7)]
ims[0].save(OUT+NAME,save_all=True,append_images=ims[1:],resolution=144)
th=[i.resize((324,405)) for i in ims]; ov=Image.new('RGB',(3*324+4*16,2*405+3*16),(222,229,239))
for k,t in enumerate(th): ov.paste(t,(16+(k%3)*340,16+(k//3)*421))
ov.save(OUT+'all-6-slides_overview.png')
ims[0].save(OUT+'cover_1080x1350.png'); print('done')
