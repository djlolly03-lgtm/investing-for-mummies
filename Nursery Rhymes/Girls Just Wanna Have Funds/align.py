import numpy as np, dtw, json, sys
song,sr=dtw.load('song-16k.wav')
SECS={'S1':(7.86,15.84,'chorus x2'),'S2':(15.84,22.86,'Spend a little / have some fun'),
      'S3':(22.86,30.02,'But before you spend your pay / put a little bit away'),
      'S4':(30.02,40.18,'Save and invest / You can do both'),
      'S5':(40.18,48.48,'chorus x2'),'S6':(48.48,59.76,'Smart with money / Investing for Mummies'),
      'S7':(59.76,67.74,'chorus x2')}
CAND={'S1':['07','01','05'],'S5':['07','01','05'],'S7':['07','01','05'],
      'S2':['02'],'S3':['03'],'S4':['04'],'S6':['06']}
clips={c:dtw.load(f'clip-{c}-16k.wav') for c in ['01','02','03','04','05','06','07','08','09','10']}
res={}
for k,(s0,s1,lab) in SECS.items():
    R=dtw.logmel(song[int(s0*sr):int(s1*sr)],sr)
    print(f"\n=== {k} {s0}-{s1} ({s1-s0:.2f}s)  {lab}")
    best=None
    for c in CAND[k]:
        a,csr=clips[c]; Q=dtw.logmel(a,csr)
        qs,qe,path,cost=dtw.subseq_dtw(R,Q)
        span=(qe-qs)/100.0; rate=(s1-s0)/max(span,1e-6)
        print(f"   clip-{c}: uses {qs/100:.2f}-{qe/100:.2f}s ({span:.2f}s) rate {rate:.2f}x  cost {cost:.4f}")
        if best is None or cost<best[0]: best=(cost,c,qs,qe,path)
    cost,c,qs,qe,path=best
    res[k]=dict(clip=c,qs=qs/100.0,qe=qe/100.0,cost=round(cost,4),s0=s0,s1=s1,
                path=[(i,j) for i,j in path[::5]])
    print(f"   -> PICK clip-{c}  cost {cost:.4f}")
json.dump(res,open('align.json','w'))
