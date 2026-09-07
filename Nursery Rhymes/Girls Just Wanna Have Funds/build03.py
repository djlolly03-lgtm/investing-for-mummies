import json, subprocess
from plan import SONG0, END
meta=json.load(open('caps/meta.json'))
BODY=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','work/body.mp4'],capture_output=True,text=True).stdout.strip())
CARD=1.80; FADE=0.60
TOTAL=BODY+CARD-FADE
BOTTOM=190
AFADE=1.8

ins=['-i','work/body.mp4','-i','endcard-mint.mp4','-ss',f'{SONG0}','-t',f'{TOTAL}','-i','song.mp3']
for m in meta: ins += ['-loop','1','-i',m['file']]
fc=[]
fc.append(f"[0:v]fps=30,settb=AVTB[body]")
fc.append(f"[1:v]trim=0:{CARD},setpts=PTS-STARTPTS,scale=1080:1920,setsar=1,fps=30,settb=AVTB[card]")
# xfade at the END only -> no downstream anchors to shift (see playbook / memory note)
fc.append(f"[body][card]xfade=transition=fade:duration={FADE}:offset={BODY-FADE:.3f}[bodycard]")
cur='[bodycard]'
for k,m in enumerate(meta):
    y=1920-m['h']-BOTTOM; nxt=f'[v{k}]'
    fc.append(f"{cur}[{k+3}:v]overlay=x=0:y={y}:enable='between(t,{m['start']:.3f},{m['end']:.3f})'{nxt}")
    cur=nxt
fc.append(f"{cur}format=yuv420p[vout]")
fc.append(f"[2:a]afade=t=out:st={TOTAL-AFADE:.3f}:d={AFADE}[aout]")
cmd=['ffmpeg','-v','error','-y']+ins+['-filter_complex',';'.join(fc),
     '-map','[vout]','-map','[aout]','-t',f'{TOTAL}',
     '-c:v','libx264','-crf','23','-preset','slow','-maxrate','9M','-bufsize','16M','-pix_fmt','yuv420p',
     '-c:a','aac','-b:a','192k','-movflags','+faststart',
     'girls-just-wanna-have-funds.mp4']
print(f"body {BODY:.2f} + card {CARD} - fade {FADE} = {TOTAL:.2f}s")
subprocess.run(cmd,check=True)
d=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',
                  'girls-just-wanna-have-funds.mp4'],capture_output=True,text=True).stdout.strip()
print(f"OUTPUT {d}s (expected {TOTAL:.2f}) -- if short by exactly {FADE}s, the xfade-offset bug is back")
