#!/bin/bash
set -e
cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels"
S=shots; C=clips; T=$(mktemp -d); FPS=30
COMMON="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an"

# --- video beat: people clip + overlay ---
vbeat(){ # in overlay dur out
  ffmpeg -y -i "$1" -loop 1 -framerate $FPS -t "$3" -i "$2" -filter_complex \
"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=$FPS,trim=0:$3,setpts=PTS-STARTPTS[v];\
[1:v]format=rgba,fade=in:st=0.15:d=0.35:alpha=1[o];\
[v][o]overlay=0:0,format=yuv420p[out]" -map "[out]" -t "$3" $COMMON "$4" -loglevel error
}
# --- still beat: UI screenshot punch-in + overlay ---
sbeat(){ # img overlay dur cropx cropy out
  local fr=$(echo "$3*$FPS/1"|bc)
  ffmpeg -y -loop 1 -t "$3" -i "$1" -loop 1 -framerate $FPS -t "$3" -i "$2" -filter_complex \
"[0:v]crop=1080:1920:$4:$5,scale=2160:3840,zoompan=z='min(zoom+0.0010,1.16)':d=${fr}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=0:$3,setpts=PTS-STARTPTS[v];\
[1:v]format=rgba,fade=in:st=0.15:d=0.35:alpha=1[o];\
[v][o]overlay=0:0,format=yuv420p[out]" -map "[out]" -t "$3" $COMMON "$6" -loglevel error
}
# --- end card: gentle zoom ---
ebeat(){ # img dur out
  local fr=$(echo "$2*$FPS/1"|bc)
  ffmpeg -y -loop 1 -t "$2" -i "$1" -vf \
"scale=1188:2112,zoompan=z='min(zoom+0.0006,1.06)':d=${fr}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,format=yuv420p" \
-t "$2" $COMMON "$3" -loglevel error
}

echo "A hook..."; vbeat "$C/sd_hook.mp4"  "$S/o_hook.png" 3.0 "$T/a.mp4"
echo "B dreams..."; sbeat "$S/ltm_dreams.png" "$S/o_b2.png" 2.8 300 80 "$T/b.mp4"
echo "C reveal..."; sbeat "$S/ltm_reveal.png" "$S/o_b3.png" 3.2 320 80 "$T/c.mp4"
echo "D react..."; vbeat "$C/sd_react.mp4" "$S/o_b4.png" 3.2 "$T/d.mp4"
echo "E end..."; ebeat "$S/o_end.png" 2.8 "$T/e.mp4"

printf "file '%s'\n" "$T/a.mp4" "$T/b.mp4" "$T/c.mp4" "$T/d.mp4" "$T/e.mp4" > "$T/list.txt"
ffmpeg -y -f concat -safe 0 -i "$T/list.txt" -c copy "$T/silent.mp4" -loglevel error

# audio bed from the hook clip's native sound, looped to 15s
ffmpeg -y -i "$T/silent.mp4" -stream_loop 4 -i "$C/sd_hook.mp4" -filter_complex \
"[1:a]atrim=0:15,asetpts=PTS-STARTPTS,afade=in:st=0:d=0.6,afade=out:st=14.2:d=0.8,volume=1.0[a]" \
-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest out/lifestyle-time-machine-15s.mp4 -loglevel error

rm -rf "$T"
echo "=== built ==="; ffprobe -v error -show_entries format=duration -of csv=p=0 out/lifestyle-time-machine-15s.mp4
ls -la out/
