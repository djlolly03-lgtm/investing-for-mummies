import subprocess
D=0.35
# (start, end) of each kept span; every span except the first is extended BACK by D so the
# crossfade region is the instrumental lead-in on both sides, never a chopped vocal.
SEG=[(7.86,22.86),(30.02-D,40.18),(48.48-D,67.74)]
fc=[]
for i,(a,b) in enumerate(SEG):
    fc.append(f"[0:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS[a{i}]")
fc.append(f"[a0][a1]acrossfade=d={D}:c1=tri:c2=tri[x]")
fc.append(f"[x][a2]acrossfade=d={D}:c1=tri:c2=tri[y]")
subprocess.run(['ffmpeg','-v','error','-y','-i','song.mp3','-filter_complex',';'.join(fc),
    '-map','[y]','-ar','48000','song45.wav'],check=True)
d=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
    'song45.wav'],capture_output=True,text=True).stdout.strip()
print(f"song45.wav = {d}s   (expected 44.42)")
