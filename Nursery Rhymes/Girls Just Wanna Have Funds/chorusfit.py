import json, itertools, numpy as np
song=json.load(open('song-words-v2.json'))
def at(t): 
    for w in song:
        if abs(w['s']-t)<0.01: return w
# song chorus phrases: (girls_t, just_t, fun_t, phrase_end_gap_to)
SONG={'A':[(7.86,8.90,10.38),(12.00,12.66,14.32)],
      'B':[(40.18,41.76,43.14),(43.74,45.46,47.00)],
      'C':[(59.76,61.08,62.50),(63.76,64.80,66.40)]}
# clip chorus phrases: (girls_t, second_word_t, fun_t)
CLIP={'01':[(0.00,0.90,1.76),(2.28,4.16,5.48)],
      '05':[(1.18,1.90,2.84),(3.30,4.00,4.88),(5.30,5.74,6.66)],
      '07':[(0.00,0.48,1.24),(1.74,2.42,3.24),(3.80,4.42,5.26),(5.92,6.42,7.18)]}
def cost(clip,sec,phr):
    rs=[]
    for (sg,sj,sf),(cg,cj,cf) in zip(SONG[sec],[CLIP[clip][i] for i in phr]):
        rs += [(sj-sg)/(cj-cg), (sf-sj)/(cf-cj)]
    return rs
best={}
for clip in CLIP:
    for sec in SONG:
        b=None
        for phr in itertools.combinations(range(len(CLIP[clip])),2):
            rs=cost(clip,sec,phr)
            # penalty: how far each rate is from 1.0 (log scale), worst-case dominates
            sc=max(abs(np.log(r)) for r in rs)
            if b is None or sc<b[0]: b=(sc,phr,rs)
        best[(clip,sec)]=b
print("per-clip best phrase pick and resulting rates:")
for k,v in sorted(best.items()):
    print(f"  clip-{k[0]} -> chorus {k[1]}: phrases {v[1]} rates {[round(r,2) for r in v[2]]}  worst={np.exp(v[0]):.2f}x")
print()
print("assignment permutations (lower worst = better):")
res=[]
for p in itertools.permutations(['A','B','C']):
    a=dict(zip(['01','05','07'],p))
    worst=max(np.exp(best[(c,s)][0]) for c,s in a.items())
    mean=np.mean([np.exp(abs(np.log(r))) for c,s in a.items() for r in best[(c,s)][2]])
    res.append((worst,mean,a))
for worst,mean,a in sorted(res):
    print(f"  worst={worst:.2f}x mean={mean:.2f}x  " + "  ".join(f"clip-{c}->{s}" for c,s in a.items()))
