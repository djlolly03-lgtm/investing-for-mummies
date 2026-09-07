import subprocess
# (span_start, span_end, crossfade INTO this span)  -- every span after the first is
# extended BACK by d so the fade blends instrumental lead-in against instrumental lead-in
SEG=[(7.86,12.00,None),(15.84,21.60,0.35),(30.02,35.04,0.12),(48.48,57.80,0.12),(59.76,63.76,0.35)]
fc=[]; want=0
for i,(a,b,d) in enumerate(SEG):
    a2=a-(d or 0.0); want+=b-a
    fc.append(f"[0:a]atrim={a2:.4f}:{b:.4f},asetpts=PTS-STARTPTS[a{i}]")
cur='a0'
for i in range(1,len(SEG)):
    d=SEG[i][2]; nxt=f'x{i}'
    fc.append(f"[{cur}][a{i}]acrossfade=d={d}:c1=tri:c2=tri[{nxt}]"); cur=nxt
subprocess.run(['ffmpeg','-v','error','-y','-i','song.mp3','-filter_complex',';'.join(fc),
    '-map',f'[{cur}]','-ar','48000','song30.wav'],check=True)
got=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
    'song30.wav'],capture_output=True,text=True).stdout.strip()
print(f"song30.wav = {got}s  (expected {want:.2f})")
