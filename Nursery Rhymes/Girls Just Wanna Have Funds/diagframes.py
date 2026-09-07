import subprocess
tot=0; rows=[]
for ln in open('work/concat.txt'):
    f='work/'+ln.strip().split("'")[1]
    n=subprocess.run(['ffprobe','-v','error','-count_frames','-select_streams','v',
        '-show_entries','stream=nb_read_frames','-of','csv=p=0',f],capture_output=True,text=True).stdout.strip()
    n=int(n) if n.isdigit() else 0
    rows.append((f,n)); tot+=n
print('total frames',tot,'=',tot/30.0,'s')
import re
from plan import SEGS
print('--- shortest segments:')
for f,n in sorted(rows,key=lambda r:r[1])[:12]: print(f'  {f} {n}f')
