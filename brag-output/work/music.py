import numpy as np, wave
SR=44100; DUR=21.0; N=int(SR*DUR); BEAT=0.5
L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def hz(m): return 440*2**((m-69)/12)
def add(sig,t0,gain=1.0,pan=0.0):
    i=int(t0*SR); j=min(N,i+len(sig))
    if i>=N: return
    s=sig[:j-i]*gain
    L[i:j]+=s*np.sqrt((1-pan)/2); R[i:j]+=s*np.sqrt((1+pan)/2)
def env(n,a,d):
    t=np.arange(n)/SR; e=np.exp(-t/d); k=int(a*SR)
    if k>0: e[:k]*=np.linspace(0,1,k)
    return e
def lp(x,c):  # one-pole lowpass
    a=np.exp(-2*np.pi*c/SR); y=np.zeros_like(x); p=0.0
    for i in range(len(x)): p=(1-a)*x[i]+a*p; y[i]=p
    return y
def pluck(m,dur=0.9,bright=1.0):
    n=int(dur*SR); t=np.arange(n)/SR; f=hz(m)
    s=np.sin(2*np.pi*f*t)+.35*bright*np.sin(4*np.pi*f*t)*np.exp(-t/.08)+.12*np.sin(6*np.pi*f*t)*np.exp(-t/.04)
    return s*env(n,.004,dur/4.5)
def bell(m,dur=3.0):
    n=int(dur*SR); t=np.arange(n)/SR; f=hz(m)
    s=np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.6)+.25*np.sin(2*np.pi*f*5.4*t)*np.exp(-t/.25)
    return s*env(n,.003,dur/3)
def pad(notes,dur):
    n=int(dur*SR); t=np.arange(n)/SR; s=np.zeros(n)
    for m in notes:
        for d in (-.12,.12): 
            ph=2*np.pi*hz(m)*(1+d/100)*t; s+=np.sin(ph)+.3*np.sin(2*ph)+.12*np.sin(3*ph)
    a=np.minimum(1,t/.35)*np.minimum(1,(dur-t)/.3).clip(0)
    return s*a/len(notes)
def kick():
    n=int(.35*SR); t=np.arange(n)/SR; f=48+90*np.exp(-t/.035)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.12)
def hat():
    n=int(.06*SR); x=rng.standard_normal(n); x=x-lp(x,6000); return x*np.exp(-np.arange(n)/SR/.018)
def clap():
    n=int(.18*SR); x=rng.standard_normal(n); x=lp(x,3500)-lp(x,900); e=np.exp(-np.arange(n)/SR/.05)
    for k in (0,.011,.022): e[int(k*SR):]+=.0
    return x*e
def whoosh(dur=.5,rise=True):
    n=int(dur*SR); x=rng.standard_normal(n); x=lp(x,1800)-lp(x,300)
    t=np.arange(n)/n; e=np.sin(np.pi*t)**2
    return x*e
# D major: I vi IV V -> D Bm G A  (midi roots)
prog=[(50,[62,66,69]),(47,[59,62,66]),(43,[59,62,67]),(45,[61,64,69])]
arp_off=[0,4,7,12,7,4,7,12]  # relative semis from chord tone list instead:
for bar in range(9):              # 2s bars, bar 8 starts at 16s
    t0=bar*2.0
    root,ch=prog[bar%4]
    if bar<8:
        add(pad([m-12 for m in ch],2.05),t0,.09)
        tones=[ch[0],ch[1],ch[2],ch[0]+12,ch[2],ch[1],ch[2],ch[0]+12]
        for k,m in enumerate(tones):
            add(pluck(m+12,.7,1.0 if bar>=2 else .6),t0+k*.25,.10 if k%2==0 else .07,pan=(-.35 if k%2 else .35))
        if bar>=2:   # drums + bass enter on the reveal (bar 2 starts 4.0; fill hits at 3.5)
            for b in range(4):
                if b in (0,2) or (bar>=4 and b==3 and bar%2): add(kick(),t0+b*BEAT,.5)
                if b in (1,3): add(clap(),t0+b*BEAT,.16,pan=.1)
            for k in range(8): add(hat(),t0+k*.25+(.0 if k%2==0 else .01),.05 if k%2 else .03,pan=-.2)
            for k in range(4):
                n=int(.45*SR); tt=np.arange(n)/SR; f=hz(root-12)
                b=(np.sin(2*np.pi*f*tt)+.25*np.sin(4*np.pi*f*tt))*env(n,.01,.22)
                add(b,t0+k*BEAT+.25*(k%2==1),.22)
# ending (17.0): resolving D chord + bell flourish, drums out
for i,m in enumerate([62,66,69,74,78]): add(pluck(m+12,1.6),17.0+i*.07,.07,pan=(i-2)*.2)
add(pad([50,57,62,66,69],4.0),17.0,.16)
n=int(.6*SR); tt=np.arange(n)/SR
add(np.sin(2*np.pi*hz(38)*tt)*env(n,.01,.4),17.0,.35); add(kick(),17.0,.55)
add(bell(86,3.5),17.0,.07,pan=.2); add(bell(81,3.5),18.1,.05,pan=-.25)
# --- sfx, tuned into D major and tucked under ---
for tp in (8.5,11.0):
    add(pluck(81,.4,1.4),tp,.13,pan=.3)          # tap: A5
    add(bell(93,.6),tp+.02,.025,pan=.3)          # tiny sparkle
for i in range(5): add(pluck([74,76,78,81,83][i],.3,.6),7.6+i*.08,.05,pan=-.4+i*.2)   # chips pop up the scale
for i in range(4):
    add(pluck([78,81,83,86][i],.3,.6),8.7+i*.1,.04,pan=-.3+i*.2)
    add(pluck([74,78,81,86][i],.3,.6),11.35+i*.1,.04,pan=-.3+i*.2)
for tw in (3.25,7.2,12.75,16.75): add(whoosh(.55),tw,.05)
add(pluck(69,.5),3.5,.1); add(kick(),3.5,.35)   # reveal hit
# --- mix ---
mix=np.stack([L,R]); mix/=np.max(np.abs(mix))+1e-9
mix=np.tanh(mix*1.4)/np.tanh(1.4)*.89
fi=int(.02*SR); fo=int(1.2*SR)
mix[:,:fi]*=np.linspace(0,1,fi); mix[:,-fo:]*=np.linspace(1,0,fo)
pcm=(mix.T*32767).astype(np.int16)
with wave.open('music.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok')
