import json
song=json.load(open('song-words-v2.json'))
def sw(a,b): return [w for w in song if a-0.01<=w['s']<=b+0.01]
def cw(c): return json.load(open(f'clip-{c}-words.json'))
CH={'01':[(0,6),(6,12)], '05':[(0,6),(6,11),(11,16)], '07':[(0,5),(5,10),(10,15),(15,20)]}
def norm(w): return w.strip().lower().strip(',.!?')
def collapse(toks):
    """merge want+to -> wanna, keeping the onset of 'want'"""
    out=[];i=0
    while i<len(toks):
        t,s=toks[i]
        if t=='want' and i+1<len(toks) and toks[i+1][0]=='to': out.append(('wanna',s)); i+=2
        else: out.append((t,s)); i+=1
    return out
def align(A,B):
    """Needleman-Wunsch over token strings; returns matched index pairs"""
    n,m=len(A),len(B); GAP=-1.0
    D=[[0.0]*(m+1) for _ in range(n+1)]; P=[[0]*(m+1) for _ in range(n+1)]
    for i in range(1,n+1): D[i][0]=i*GAP; P[i][0]=1
    for j in range(1,m+1): D[0][j]=j*GAP; P[0][j]=2
    for i in range(1,n+1):
        for j in range(1,m+1):
            a,b=A[i-1],B[j-1]
            sc = 2.0 if a==b else (0.5 if a[:3]==b[:3] else -1.5)
            c=[D[i-1][j-1]+sc, D[i-1][j]+GAP, D[i][j-1]+GAP]
            k=max(range(3),key=lambda x:c[x]); D[i][j]=c[k]; P[i][j]=k
    i,j=n,m; pairs=[]
    while i>0 or j>0:
        k=P[i][j]
        if k==0 and i>0 and j>0:
            if A[i-1]==B[j-1] or A[i-1][:3]==B[j-1][:3]: pairs.append((i-1,j-1))
            i-=1;j-=1
        elif k==1: i-=1
        else: j-=1
    pairs.reverse(); return pairs
def pair_chorus(clip, phr, songwords):
    a,b=CH[clip][phr]
    ct=collapse([(norm(x['w']),x['s']) for x in cw(clip)[a:b]])
    st=[(norm(x['w']),x['s']) for x in songwords]
    P=align([t for t,_ in st],[t for t,_ in ct])
    return [(ct[j][1], st[i][1]) for i,j in P]
