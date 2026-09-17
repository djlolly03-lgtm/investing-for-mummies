#!/usr/bin/env bash
#
# ifm-make-previews.sh — give unplayable Library videos a preview that actually plays.
#
#   scripts/ifm-make-previews.sh --dry-run    list what it would build
#   scripts/ifm-make-previews.sh              build them
#
# THE PROBLEM IT SOLVES
#   112 of 146 videos in the Library have no playable preview. Ask for "students laughing
#   video" and you get things you cannot watch. 26 of those 112 have a source file sitting
#   on this Mac right now — they simply never reach production, because .vercelignore
#   blocks *.mp4 and whitelists only content/teasers, content/game-assets and content/clips.
#   content/reels and wealth-conversation-videos are not on that list, so the browser gets
#   a 404 and the UI correctly says "No preview".
#
# WHY NOT JUST WHITELIST THOSE FOLDERS
#   Because they are masters, not previews: content/reels is 72MB across 11 files and
#   wealth-conversation-videos is 81MB across 28. Whitelisting adds 153MB to every deploy,
#   which is the bloat CLAUDE.md warns ends in a deploy that will not build. The pattern
#   that already works is content/clips: 63 files, 17.9MB, averaging 291KB each.
#
#   So: transcode a short preview into content/clips, where the whitelist already applies.
#   The master stays where it is and never ships.
#
# AUDIO IS KEPT.
#   The documented thumbnail recipe uses -an. That is right for a silent b-roll loop and
#   wrong here: these are people talking, and a preview that drops the voice is the reason
#   27 clips ended up flagged "silent" when they are not. Audio is encoded at 64k mono,
#   which costs a few KB and keeps the preview honest.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"

MODE="${1:---build}"
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
DEPLOY="$ROOT/CLAUDE"
OUT="$DEPLOY/content/clips"
BUDGET_KB=200

command -v ffmpeg  >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe not found" >&2; exit 1; }

echo
echo "IFM — build previews for unplayable Library videos"
echo "=================================================="
echo "  output   content/clips/  (already whitelisted in .vercelignore)"
echo "  budget   <= ${BUDGET_KB}KB each, audio kept"
echo

# Which assets need one, and where is the source? Emits: id<TAB>absolute source path
/usr/bin/python3 - "$ROOT" <<'PY' > /tmp/ifm-preview-targets.tsv
import json, os, re, sys
ROOT = sys.argv[1]
DIR = os.path.join(ROOT, 'CLAUDE', 'content', 'v1-prototype')
DEPLOY = os.path.join(ROOT, 'CLAUDE')
src = open(os.path.join(DIR, 'v1-catalogue.js'), encoding='utf-8').read()
rows = json.loads(src[src.index('['):src.rindex(']') + 1])
mm = open(os.path.join(DIR, 'media-map.js'), encoding='utf-8').read()
media = json.loads(mm[mm.index('{'):mm.rindex('}') + 1])

for a in rows:
    if a.get('library') is False or (a.get('status') or '') == 'Do Not Use':
        continue
    if a.get('type') != 'Video' or (media.get(a['id']) or {}).get('playable'):
        continue
    for field in ('video', 'drive'):
        u = a.get(field) or ''
        if not u.startswith('https://ifm-deploy.vercel.app/'):
            continue
        rel = u.replace('https://ifm-deploy.vercel.app/', '').split('?')[0]
        p = os.path.realpath(os.path.join(DEPLOY, rel))
        # never follow a path out of the deploy root, and only real media
        if p.startswith(DEPLOY + os.sep) and os.path.isfile(p) and p.lower().endswith(('.mp4', '.mov', '.m4v')):
            print(f"{a['id']}\t{p}")
            break
PY

N=$(wc -l < /tmp/ifm-preview-targets.tsv | tr -d ' ')
if [ "$N" -eq 0 ]; then echo "  Nothing to build — no unplayable video has a local master."; exit 0; fi
echo "  $N unplayable video(s) have a master on this Mac:"
echo
while IFS=$'\t' read -r ID SRC; do
  MB=$(echo "scale=1; $(stat -f%z "$SRC")/1048576" | bc)
  printf '    %-9s %6sMB  %s\n' "$ID" "$MB" "${SRC#$DEPLOY/}"
done < /tmp/ifm-preview-targets.tsv

if [ "$MODE" = "--dry-run" ]; then
  echo
  echo "  DRY RUN — nothing built. Re-run without --dry-run."
  exit 0
fi

echo
mkdir -p "$OUT"
BUILT=0; SKIPPED=0; OVER=0
while IFS=$'\t' read -r ID SRC; do
  DEST="$OUT/$ID.mp4"
  if [ -f "$DEST" ]; then printf '    %-9s exists, left alone\n' "$ID"; SKIPPED=$((SKIPPED+1)); continue; fi
  # 12s, max 480px wide, even height (libx264 needs it), audio kept at 64k mono.
  if ! ffmpeg -nostdin -y -t 12 -i "$SRC" \
        -vf "scale='min(480,iw)':-2" -c:v libx264 -crf 32 -preset veryfast \
        -c:a aac -b:a 64k -ac 1 -movflags +faststart "$DEST" >/dev/null 2>&1; then
    printf '    %-9s FAILED to transcode\n' "$ID"; rm -f "$DEST"; continue
  fi
  KB=$(( $(stat -f%z "$DEST") / 1024 ))
  HAS_AUDIO=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$DEST" | head -1)
  FLAG=""
  if [ "$KB" -gt "$BUDGET_KB" ]; then FLAG="  OVER BUDGET"; OVER=$((OVER+1)); fi
  printf '    %-9s %4sKB  audio:%-5s%s\n' "$ID" "$KB" "${HAS_AUDIO:-none}" "$FLAG"
  BUILT=$((BUILT+1))
done < /tmp/ifm-preview-targets.tsv

echo
echo "  built $BUILT, skipped $SKIPPED already present, $OVER over the ${BUDGET_KB}KB budget."
echo
echo "  These do not become playable until two more things happen:"
echo "    1. each asset's \`video\` field must point at content/clips/<ID>.mp4"
echo "    2. media-audit.py must re-probe AFTER a deploy, since it asks the server"
echo "  Neither is done here — both change data, and that is a separate, reviewed step."
