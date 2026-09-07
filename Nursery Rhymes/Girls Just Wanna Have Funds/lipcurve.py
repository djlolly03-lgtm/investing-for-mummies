import cv2, numpy as np, sys
casc=cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_default.xml')
def curve(clip):
    cap=cv2.VideoCapture(f'clip-{clip}.mp4'); vals=[]; last=None
    while True:
        ok,im=cap.read()
        if not ok: break
        g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
        fs=casc.detectMultiScale(g,1.12,5,minSize=(80,80))
        box=max(fs,key=lambda f:f[2]*f[3]) if len(fs) else last
        if box is None: vals.append(0.0); continue
        last=box; x,y,w,h=box
        roi=g[y+int(h*0.62):y+int(h*0.99), x+int(w*0.26):x+int(w*0.74)]
        if roi.size<50: vals.append(0.0); continue
        roi=cv2.resize(roi,(48,32)).astype(np.float32)
        dark=(roi < np.percentile(roi,20)*0.95)
        # vertical extent of the dark (mouth-interior) region = aperture
        rows=np.where(dark.sum(axis=1) > 2)[0]
        vals.append(float(rows[-1]-rows[0])/32.0 if len(rows)>1 else 0.0)
    return np.array(vals)
c=sys.argv[1]; a=float(sys.argv[2]); b=float(sys.argv[3])
v=curve(c); v=(v-v.min())/(v.max()-v.min()+1e-9)
print(f"clip-{c} mouth aperture, 1/24s   [{a}-{b}]")
for i in range(int(a*24),min(len(v),int(b*24))):
    t=i/24.0
    bar='#'*int(v[i]*34)
    mark=' <CLOSED' if v[i]<0.18 else ''
    print(f"{t:6.3f} {v[i]:4.2f} {bar}{mark}")
