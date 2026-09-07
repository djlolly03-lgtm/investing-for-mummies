import json
song=json.load(open('song-words-v2.json'))
def sw(a,b): return [w for w in song if a-0.001<=w['s']<=b+0.001]
# song span per clip (inclusive word-onset windows)
SEC={
 '01':(7.86,14.32), '02':(15.84,19.88), '03':(22.86,29.24), '04':(30.02,39.08),
 '05':(40.18,47.00), '06':(48.48,56.50), '07':(59.76,66.40), '08':(67.74,75.70),
 '09':(79.96,85.70), '10':(86.72,94.92),
}
for n,(a,b) in SEC.items():
    S=sw(a,b); C=json.load(open(f'clip-{n}-words.json'))
    print(f"===== clip-{n}  song[{a}-{b}] songwords={len(S)} clipwords={len(C)}")
    if len(S)==len(C):
        prev=None
        for s,c in zip(S,C):
            r=''
            if prev:
                ds=s['s']-prev[0]; dc=c['s']-prev[1]
                r=f"  d_song={ds:5.2f} d_clip={dc:5.2f} rate={ds/dc:5.2f}" if dc>0.02 else "  (tie)"
            print(f"  {c['w'].strip():12s}@{c['s']:5.2f} -> {s['w'].strip():12s}@{s['s']:6.2f}{r}")
            prev=(s['s'],c['s'])
    else:
        print("  SONG:", ' '.join(f"{w['w'].strip()}@{w['s']:.2f}" for w in S))
        print("  CLIP:", ' '.join(f"{w['w'].strip()}@{w['s']:.2f}" for w in C))
