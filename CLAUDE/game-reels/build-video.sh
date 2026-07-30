#!/bin/bash
# Build a 15s branded reel from 4 frames with Ken Burns motion + crossfades
set -e
cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels"
S=shots
TMP=$(mktemp -d)
FPS=30

# helper: make a moving segment from a still
# args: infile outfile duration zexpr
seg() {
  local in=$1 out=$2 dur=$3 zexpr=$4 yexpr=$5
  local frames=$(echo "$dur*$FPS/1" | bc)
  ffmpeg -y -loop 1 -i "$in" -t "$dur" -r $FPS \
    -vf "scale=1620:2880,zoompan=z='$zexpr':d=${frames}:x='iw/2-(iw/zoom/2)':y='$yexpr':s=1080x1920:fps=$FPS,format=yuv420p" \
    -c:v libx264 -preset medium -crf 18 "$out" -loglevel error
}

YC="ih/2-(ih/zoom/2)"            # centered y
seg "$S/frame_f1.png" "$TMP/s1.mp4" 3.0 "min(zoom+0.0006,1.05)" "$YC"
seg "$S/frame_f2.png" "$TMP/s2.mp4" 5.4 "min(zoom+0.00060,1.10)" "ih/2-(ih/zoom/2)-on*0.20"
seg "$S/frame_f3.png" "$TMP/s3.mp4" 5.4 "min(zoom+0.00060,1.10)" "ih/2-(ih/zoom/2)+on*0.20"
seg "$S/frame_f4.png" "$TMP/s4.mp4" 3.0 "min(zoom+0.0006,1.05)" "$YC"

# crossfade chain -> 15.0s
ffmpeg -y -i "$TMP/s1.mp4" -i "$TMP/s2.mp4" -i "$TMP/s3.mp4" -i "$TMP/s4.mp4" -filter_complex \
"[0][1]xfade=transition=fade:duration=0.6:offset=2.4[a];\
[a][2]xfade=transition=fade:duration=0.6:offset=7.2[b];\
[b][3]xfade=transition=fade:duration=0.6:offset=12.0[v]" \
-map "[v]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r $FPS \
out/stock-rush-15s-silent.mp4 -loglevel error

rm -rf "$TMP"
echo "built:"; ffprobe -v error -show_entries format=duration -of csv=p=0 out/stock-rush-15s-silent.mp4
ls -la out/
