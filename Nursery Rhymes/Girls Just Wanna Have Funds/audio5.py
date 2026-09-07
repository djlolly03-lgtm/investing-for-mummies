import subprocess
D=0.35
SEG=[(48.48,67.68,None),(86.72,97.00,D)]
fc=[]; want=0
for i,(a,b,d) in enumerate(SEG):
    want+=b-a
    fc.append(f"[0:a]atrim={a-(d or 0):.4f}:{b:.4f},asetpts=PTS-STARTPTS[a{i}]")
fc.append(f"[a0][a1]acrossfade=d={D}:c1=tri:c2=tri[y]")
subprocess.run(['ffmpeg','-v','error','-y','-i','song.mp3','-filter_complex',';'.join(fc),
    '-map','[y]','-ar','48000','song5.wav'],check=True)
print('song5.wav =',subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
  '-of','csv=p=0','song5.wav'],capture_output=True,text=True).stdout.strip(),f'(expected {want:.2f})')
