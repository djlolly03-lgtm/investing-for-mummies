import itertools, numpy as np
SONGP=[('A1',7.86,8.90,10.38),('A2',12.00,12.66,14.32),
       ('B1',40.18,41.76,43.14),('B2',43.74,45.46,47.00),
       ('C1',59.76,61.08,62.50),('C2',63.76,64.80,66.40)]
CLIPP=[('01',0.00,0.90,1.76),('01',2.28,4.16,5.48),
       ('05',1.18,1.90,2.84),('05',3.30,4.00,4.88),('05',5.30,5.74,6.66),
       ('07',0.00,0.48,1.24),('07',1.74,2.42,3.24),('07',3.80,4.42,5.26),('07',5.92,6.42,7.18)]
def rates(sp,cp):
    _,sg,sj,sf=sp; _,cg,cj,cf=cp
    return [(sj-sg)/(cj-cg),(sf-sj)/(cf-cj)]
best=None
for pick in itertools.permutations(range(9),6):
    rs=[r for sp,ci in zip(SONGP,pick) for r in rates(sp,CLIPP[ci])]
    sc=max(abs(np.log(r)) for r in rs)
    mean=np.mean([abs(np.log(r)) for r in rs])
    key=(round(sc,4),round(mean,4))
    if best is None or key<best[0]: best=(key,pick,rs)
key,pick,rs=best
print(f"FREE-MIX best: worst={np.exp(key[0]):.2f}x  mean={np.exp(key[1]):.2f}x")
for sp,ci,r1,r2 in zip(SONGP,pick,rs[0::2],rs[1::2]):
    cp=CLIPP[ci]
    print(f"  song {sp[0]} ({sp[1]:.2f}) <- clip-{cp[0]} @{cp[1]:.2f}-{cp[3]:.2f}   hold={r1:.2f}x run={r2:.2f}x")
