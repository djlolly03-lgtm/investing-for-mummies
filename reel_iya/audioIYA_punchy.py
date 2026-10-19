import numpy as np, wave, os
SR=44100; DUR=48.1; N=int(SR*DUR)
rng=np.random.RandomState(7)
music=np.zeros(N); voice=np.zeros(N)

def add(buf,s,t0):
    i=int(t0*SR)
    if i<0: s=s[-i:]; i=0
    n=min(len(s),len(buf)-i)
    if n>0: buf[i:i+n]+=s[:n]

def ev(n,tau): return np.exp(-np.arange(n)/(tau*SR))

# --- voices -----------------------------------------------------------------
# Phone speakers cannot reproduce sub-200Hz, so every element carries a
# mid-band component: the kick has a click, the bass a square-ish edge.
def kick(a=.52):
    n=int(.26*SR); t=np.arange(n)/SR
    f=150*np.exp(-t*16)+62
    body=np.sin(2*np.pi*np.cumsum(f)/SR)*ev(n,.085)
    click=np.sin(2*np.pi*1250*t)*ev(n,.0065)*.85
    return np.tanh((body+click)*1.75)*a

def snap(a=.27):
    n=int(.14*SR); t=np.arange(n)/SR
    nz=rng.randn(n)*ev(n,.030)
    nz=np.convolve(nz,[1,-0.92],mode='same')          # crude high-pass -> 2-6kHz
    tone=np.sin(2*np.pi*1900*t)*ev(n,.018)*.35
    return (nz*.92+tone)*a

def shaker(a=.055):
    n=int(.045*SR)
    s=np.diff(rng.randn(n+1))*ev(n,.011)
    return s*a

def hat(a=.075, d=.06):
    n=int(d*SR)
    s=np.diff(rng.randn(n+1))*ev(n,.013)
    return np.convolve(s,[1,-0.6],mode='same')*a

def pluck(f0,a=.085,d=.36):
    n=int(d*SR); t=np.arange(n)/SR
    s=(np.sin(2*np.pi*f0*t)*ev(n,d/3.0)
       +np.sin(2*np.pi*f0*2*t)*ev(n,d/6.0)*.42
       +np.sin(2*np.pi*f0*3*t)*ev(n,d/9.0)*.18)
    return s*np.minimum(1,t/.004)*a

def bassnote(f0,a=.10,d=.46):
    n=int(d*SR); t=np.arange(n)/SR
    s=np.sin(2*np.pi*f0*t)+np.sin(2*np.pi*f0*2*t)*.45+np.sin(2*np.pi*f0*3*t)*.16
    return np.tanh(s*.9)*ev(n,d/3.2)*np.minimum(1,t/.006)*a

def bell(f0,a=.13,d=1.7):
    n=int(d*SR); t=np.arange(n)/SR
    return (np.sin(2*np.pi*f0*t)*ev(n,d/3.2)+np.sin(2*np.pi*f0*2.01*t)*ev(n,d/5)*.4)*a

def pad(fr,d,a=.075):
    n=int(d*SR); t=np.arange(n)/SR; s=np.zeros(n)
    for f in fr: s+=np.sin(2*np.pi*f*t+rng.rand()*6)+np.sin(2*np.pi*f*1.005*t)*.5
    s/=len(fr)*1.5
    return s*np.minimum(1,t/1.1)*np.minimum(1,(d-t)/1.5)*a

C3,E3,G3,F3,A3,B3,D4=130.8,164.8,196.0,174.6,220.0,246.9,293.7
C4,E4,G4,F4,A4,B4,D5,C5=261.6,329.6,392.0,349.2,440.0,493.9,587.3,523.3
E5,F5,G5,A5=659.3,698.5,784.0,880.0

# --- harmony ----------------------------------------------------------------
# C - G - Am - F, one chord every 4 beats (2.0s) once the groove is running.
BEAT=0.4545                                # 132 BPM - punchier
CHORDS=[('C',[C4,E4,G4],C3,[C4,E4,G4,C5,G4,E4]),
        ('G',[G3,B3,D4],G3,[D4,G4,B4,D5,B4,G4]),
        ('Am',[A3,C4,E4],A3,[A4,C5,E5,A5,E5,C5]),
        ('F',[F3,A3,C4],F3,[C4,F4,A4,C5,A4,F4])]

GROOVE_IN=2.0                              # bed is established long before the first duck
GROOVE_OUT=45.1                            # ride under the end card, resolve on the chime

# pads follow the same 4-chord cycle so the bed never sits on one colour
t=0.0; ci=0
add(music,pad([C4,E4,G4],GROOVE_IN+0.4,.042),0.0)
t=GROOVE_IN
while t<GROOVE_OUT:
    name,notes,root,arp=CHORDS[ci%4]
    add(music,pad(notes,2.2,.044),t)
    t+=BEAT*4; ci+=1

# --- energy curve -----------------------------------------------------------
# Loud where the picture is graphic, pulled back under the live-class audio so
# the duck has something to swell back out of.
def energy(tt):
    if tt<GROOVE_IN: return 0.0
    if tt<4.03: return 0.7
    if tt<7.03: return 0.95
    if tt<18.03: return 0.55
    if tt<22.63: return 0.95
    if tt<33.73: return 0.55
    return 0.95

beat=0; t=GROOVE_IN
while t<GROOVE_OUT:
    e=energy(t)
    bar=beat//4; pos=beat%4
    name,notes,root,arp=CHORDS[bar%4]
    if pos==0: add(music,kick(.78*e),t)
    if pos==2: add(music,kick(.62*e),t)
    if pos in (1,3): add(music,snap(.38*e),t)
    if pos==0 and beat%8==0: add(music,kick(.42*e),t+BEAT*1.5)   # syncopated push
    for hk in range(2): add(music,hat(.085*e),t+BEAT*(hk+0.5)/2)  # offbeat drive
    add(music,bassnote(root,.152*e),t)
    if pos==2: add(music,bassnote(root*1.5,.090*e),t)
    # eighth-note shakers, sixteenths through the games lift
    sub = 4          # sixteenths all the way - keeps the pulse up
    for k in range(sub):
        add(music,shaker(.058*e if k==0 else .040*e),t+BEAT*k/sub)
    # eighth-note arpeggio in 260-880Hz - the band a phone speaker actually has
    for k in range(2):
        add(music,pluck(arp[(beat*2+k)%len(arp)],.072*e),t+BEAT*k/2)
    t+=BEAT; beat+=1

# accent chime on every hard cut
CUES=[4.5, 7.2, 9.87, 12.47, 15.13, 17.8, 20.33, 22.83, 25.53, 28.53, 30.83, 33.5, 36.0, 39.0, 42.4, 44.9]
PALETTE=[C5,E5,A5,G5]
for i,ts in enumerate(CUES): add(music,bell(PALETTE[i%4],.13),ts+.03)

def riser(d=1.6,a=.11):
    n=int(d*SR); t=np.arange(n)/SR
    nz=rng.randn(n)
    for k in range(1,len(nz)): nz[k]=0.55*nz[k]+0.45*nz[k-1]   # tame the hiss
    swp=np.sin(2*np.pi*np.cumsum(420*np.exp(t/d*1.5))/SR)*.5
    return (nz*.6+swp)*(t/d)**2.2*a

def impact(a=.34):
    n=int(1.1*SR); t=np.arange(n)/SR
    boom=np.sin(2*np.pi*(190*np.exp(-t*9)+78)*t)*ev(n,.16)
    tail=rng.randn(n)*ev(n,.22)*.30
    tail=np.convolve(tail,[1,-0.88],mode='same')
    return np.tanh((boom+tail)*1.2)*a

add(music,riser(1.6,.115),21.43)      # lift into the games block
add(music,impact(.34),22.83)
add(music,riser(1.2,.085),38.1)      # lift into the certificates
add(music,bell(C5,.22,2.8),44.9); add(music,bell(G5,.14,2.6),45.02)

# --- live class audio -------------------------------------------------------
LIVE=[("Y1",7.2,2.67),("Y2",9.867,2.6),("Y3",12.467,2.67),("H1",15.133,2.67),("G1",22.833,2.7),("G2",25.533,3.0),("G3",28.533,2.3),("Y5",30.833,2.67)]
for name,t0,dur in LIVE:
    p=f"aud/{name}.wav"
    if not os.path.exists(p): print("missing",p); continue
    w=wave.open(p); sr=w.getframerate(); ch=w.getnchannels()
    a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
    if ch==2: a=a.reshape(-1,2).mean(axis=1)
    if sr!=SR: a=np.interp(np.linspace(0,len(a),int(len(a)*SR/sr)),np.arange(len(a)),a)
    y=np.zeros_like(a); px=py=0.0
    for j in range(len(a)): y[j]=0.985*(py+a[j]-px); px=a[j]; py=y[j]
    a=y
    pk=np.percentile(np.abs(a),99.5)+1e-6
    a=np.tanh(a/pk*(0.95 if name in ("W1","PA") else 0.88)*1.05)
    if name=="M1":
        n=len(a); r=min(int(0.9*SR),n)
        env=np.ones(n); env[:r]=np.linspace(0.62,1.0,r)**0.7
        a=a*env
    f=int(0.34*SR); a[:f]*=np.linspace(0,1,f); a[-f:]*=np.linspace(1,0,f)
    add(voice,a,t0); print(name,"@",t0,f"{len(a)/SR:.2f}s")

# --- duck -------------------------------------------------------------------
# Fast attack, slow release: the music has to visibly swell back into every gap.
duck=np.ones(N)
for name,t0,dur in LIVE:
    lvl={"W1":0.30,"PA":0.34}.get(name,0.44)
    a=int((t0-0.75)*SR); b=int((t0+dur+0.20)*SR)
    atk=int(0.95*SR); rel=int(1.25*SR)
    duck[a:b]=np.minimum(duck[a:b],lvl)
    duck[a:a+atk]=np.minimum(duck[a:a+atk],np.linspace(1,lvl,atk))
    r=min(rel,N-b)
    duck[b:b+r]=np.minimum(duck[b:b+r],np.linspace(lvl,1,r))

mix=music*duck+voice*0.95
fo=np.ones(N); f0=int((DUR-2.0)*SR); fo[f0:]=np.linspace(1,0,N-f0)
mix*=fo*np.minimum(1,np.arange(N)/(1.2*SR))

# high-pass ~95Hz: sub energy only eats headroom on a phone speaker
b0=np.exp(-2*np.pi*95/SR)
lo=np.zeros_like(mix); acc=0.0
for j in range(len(mix)):
    acc=b0*acc+(1-b0)*mix[j]; lo[j]=acc
mix=mix-lo*0.85

mix=np.tanh(mix*1.34); mix=mix/np.max(np.abs(mix))*.90
w=wave.open("trackIYA_punchy.wav","w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(np.repeat((mix*32767).astype(np.int16),2).tobytes()); w.close()
print("trackIYA_punchy.wav ok",DUR,"s")
