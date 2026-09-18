#!/usr/bin/env bash
#
# ifm-previews-from-drive.sh — build playable previews for Library videos whose master
# lives in Sakshi's Drive Content Library rather than on this Mac.
#
#   scripts/ifm-previews-from-drive.sh --dry-run
#   scripts/ifm-previews-from-drive.sh
#
# WHY THIS EXISTS, SEPARATELY FROM ifm-make-previews.sh
#   That script only handles masters already on disk, and after the 18 Sep ingestion the
#   Library had 145 videos with no preview -- 80 of them Sakshi's phone uploads sitting in
#   Drive, 10.3GB in total, one of them 1.45GB. Whitelisting them into the deploy is not an
#   option (CLAUDE.md's size budget exists because deploys start failing), and they cannot
#   be transcoded without being fetched first.
#
# THE DISK RULE
#   Download one master, transcode it, DELETE it, move on. Never hold two. A naive
#   "download everything then encode" needs 10.3GB free and leaves 10.3GB behind on a
#   crash; this needs the size of the largest single file and self-cleans on every exit.
#
# RESUMABLE
#   An existing clips/<ID>.mp4 is left alone, so an interrupted run costs only the file it
#   was working on. Re-run it as many times as you like.
#
# AUDIO IS KEPT. These are people talking -- testimonials, feedback, a mum saying what the
# workshop did for her. The documented -an recipe is for silent b-roll and would make every
# one of these read as broken.
set -uo pipefail
export PATH="/opt/homebrew/bin:$PATH"

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
DEPLOY="$ROOT/CLAUDE"
OUT="$DEPLOY/content/clips"
TODO="${TODO_JSON:-/tmp/todo.json}"
LIB_ID="1gUtxbd4kLKWDAnkhGbijhsl_31fiOMrY"
BUDGET_KB=200
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT INT TERM

command -v ffmpeg >/dev/null || { echo "ffmpeg not found" >&2; exit 1; }
command -v rclone >/dev/null || { echo "rclone not found" >&2; exit 1; }
[ -f "$TODO" ] || { echo "missing $TODO — regenerate the id->path map first" >&2; exit 1; }

mkdir -p "$OUT"
N=$(/usr/bin/python3 -c "import json;print(len(json.load(open('$TODO'))))")
echo "IFM — previews from Drive: $N candidates, output content/clips/"

if [ "${1:-}" = "--dry-run" ]; then
  /usr/bin/python3 - "$TODO" "$OUT" <<'PY'
import json,os,sys
todo=json.load(open(sys.argv[1])); out=sys.argv[2]
have=sum(1 for t in todo if os.path.exists(os.path.join(out,t['id']+'.mp4')))
print(f"  {have} already built, {len(todo)-have} to do")
print("  %.1f GB to download" % (sum(t['size'] for t in todo if not os.path.exists(os.path.join(out,t['id']+'.mp4')))/1e9))
PY
  exit 0
fi

BUILT=0; SKIP=0; FAIL=0; OVER=0
while IFS=$'\t' read -r ID PATHNAME SIZE; do
  DEST="$OUT/$ID.mp4"
  if [ -f "$DEST" ]; then SKIP=$((SKIP+1)); continue; fi
  MB=$(( SIZE / 1000000 ))
  printf '  %-9s %5sMB  fetching… ' "$ID" "$MB"
  SRC="$TMP/$(basename "$PATHNAME")"
  if ! timeout 900 rclone copyto --drive-root-folder-id "$LIB_ID" \
        "gdrive:$PATHNAME" "$SRC" >/dev/null 2>&1; then
    echo "FETCH FAILED"; FAIL=$((FAIL+1)); rm -f "$SRC"; continue
  fi
  # 12s, <=480px wide, even height, audio kept at 64k mono.
  if ! ffmpeg -nostdin -y -t 12 -i "$SRC" \
        -vf "scale='min(480,iw)':-2" -c:v libx264 -crf 32 -preset veryfast \
        -c:a aac -b:a 64k -ac 1 -movflags +faststart "$DEST" >/dev/null 2>&1; then
    echo "TRANSCODE FAILED"; FAIL=$((FAIL+1)); rm -f "$DEST" "$SRC"; continue
  fi
  rm -f "$SRC"                      # the master never lingers
  KB=$(( $(stat -f%z "$DEST") / 1024 ))
  if [ "$KB" -gt "$BUDGET_KB" ]; then
    # Second pass at a harder setting rather than shipping over budget.
    # The temp MUST end in .mp4. Writing to "<name>.mp4.tmp" makes ffmpeg fail with
    # "Unable to find a suitable output format" -- it picks the muxer from the extension --
    # so the `&& mv` never fired and every clip silently shipped at first-pass size. Cost:
    # 36 clips built at 320-430KB against a 200KB budget before anyone looked. 18 Sep 2026.
    if ffmpeg -nostdin -y -t 8 -i "$DEST" -vf "scale='min(400,iw)':-2" \
        -c:v libx264 -crf 34 -preset veryfast -c:a aac -b:a 48k -ac 1 \
        -movflags +faststart "$TMP/shrink.mp4" >/dev/null 2>&1; then
      mv "$TMP/shrink.mp4" "$DEST"
    fi
    KB=$(( $(stat -f%z "$DEST") / 1024 ))
    [ "$KB" -gt "$BUDGET_KB" ] && OVER=$((OVER+1))
  fi
  AUD=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$DEST" | head -1)
  printf 'built %4sKB audio:%s\n' "$KB" "${AUD:-NONE}"
  BUILT=$((BUILT+1))
done < <(/usr/bin/python3 -c "
import json;[print('%s\t%s\t%s'%(t['id'],t['path'],t['size'])) for t in json.load(open('$TODO'))]")

echo
echo "  built $BUILT, skipped $SKIP already present, $FAIL failed, $OVER over ${BUDGET_KB}KB"
echo "  NOT done here (both change data / need a deploy):"
echo "    1. point each row's video field at content/clips/<ID>.mp4"
echo "    2. deploy, then re-run media-audit.py — it probes the live server"
