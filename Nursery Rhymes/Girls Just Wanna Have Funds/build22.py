import json, subprocess
SONG0=7.86; CARD=1.80; FADE=0.60; BOTTOM=190; AFADE=1.7
meta=json.load(open('caps2/meta.json'))
BODY=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
      'w2/body.mp4'],capture_output=True,text=True).stdout.strip())
TOTAL=BODY+CARD-FADE
ins=['-i','w2/body.mp4','-i','endcard-mint.mp4','-ss',f'{SONG0}','-t',f'{TOTAL}','-i','song.mp3']
for m in meta: ins+=['-loop','1','-i',m['file']]
fc=["[0:v]fps=30,settb=AVTB[body]",
    f"[1:v]trim=0:{CARD},setpts=PTS-STARTPTS,scale=1080:1920,setsar=1,fps=30,settb=AVTB[card]",
    f"[body][card]xfade=transition=fade:duration={FADE}:offset={BODY-FADE:.3f}[bc]"]
cur='[bc]'
for k,m in enumerate(meta):
    y=1920-m['h']-BOTTOM; nx=f'[v{k}]'
    fc.append(f"{cur}[{k+3}:v]overlay=x=0:y={y}:enable='between(t,{m['start']:.3f},{m['end']:.3f})'{nx}")
    cur=nx
fc.append(f"{cur}format=yuv420p[vout]")
fc.append(f"[2:a]afade=t=out:st={TOTAL-AFADE:.3f}:d={AFADE}[aout]")
subprocess.run(['ffmpeg','-v','error','-y']+ins+['-filter_complex',';'.join(fc),
  '-map','[vout]','-map','[aout]','-t',f'{TOTAL}',
  '-c:v','libx264','-crf','25','-preset','slow','-maxrate','4200k','-bufsize','8M','-pix_fmt','yuv420p',
  '-c:a','aac','-b:a','192k','-movflags','+faststart','girls-just-wanna-have-funds.mp4'],check=True)
print(f"body {BODY:.2f} + card {CARD} - fade {FADE} = {TOTAL:.2f}s")
print('OUTPUT',subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
      'girls-just-wanna-have-funds.mp4'],capture_output=True,text=True).stdout.strip())
