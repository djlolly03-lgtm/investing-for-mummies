import cv2, numpy as np, sys, os
os.makedirs('strips',exist_ok=True)
casc=cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_default.xml')
STEP=1/8.0
for n in ['01','02','03','04','05','06','07','08','09','10']:
    cap=cv2.VideoCapture(f'clip-{n}.mp4'); fps=cap.get(cv2.CAP_PROP_FPS)
    frames=[]; hits=0; t=0.0
    while True:
        cap.set(cv2.CAP_PROP_POS_MSEC, t*1000)
        ok,im=cap.read()
        if not ok or t>7.99: break
        g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
        fs=casc.detectMultiScale(g,1.15,5,minSize=(90,90))
        if len(fs):
            x,y,w,h=max(fs,key=lambda f:f[2]*f[3]); hits+=1
            cy=y+int(h*0.72); ch=int(h*0.52); cx=x+w//2; cw=int(w*0.78)
        else:
            cx,cy,cw,ch=im.shape[1]//2,int(im.shape[0]*0.42),260,180
        x0=max(0,cx-cw//2); y0=max(0,cy-ch//2)
        crop=im[y0:y0+ch, x0:x0+cw]
        if crop.size==0: crop=np.zeros((ch,cw,3),np.uint8)
        frames.append(cv2.resize(crop,(130,90)))
        t+=STEP
    cols=16; rows=(len(frames)+cols-1)//cols
    sheet=np.zeros((rows*90,cols*130,3),np.uint8)
    for i,f in enumerate(frames):
        r,c=divmod(i,cols); sheet[r*90:(r+1)*90, c*130:(c+1)*130]=f
    cv2.imwrite(f'strips/mouth-{n}.png',sheet)
    print(f'clip-{n}: {len(frames)} frames @1/8s, face-detected {hits} ({100*hits//max(1,len(frames))}%), {rows} rows x {cols} (2.0s per row)')
