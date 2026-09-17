#!/usr/bin/env bash
#
# ifm-retire-assets.sh — retire IFM content that will never be used.
#
# It MOVES files to the IFM Content Drop _Trash folder. It never deletes anything.
#
# ---------------------------------------------------------------------------------------
# WHY THIS IS A SCRIPT AND NOT A BUTTON IN THE LIBRARY
#
#   1. The Library page is PUBLIC. https://ifm-deploy.vercel.app/content/v1-prototype/
#      returns 200 with no auth — the password gate on the hub is client-side only, and
#      this prototype has none at all. A delete control there would need a Drive write
#      credential sitting in a file anyone can fetch. There is no version of that which is
#      safe, so the destructive step lives here, on a machine, behind a human.
#
#   2. It has already happened once. From CLAUDE.md: "the Goa Workshop 18 Jul 2026 — raw
#      video masters Drive folder was emptied by mistake and no copy exists anywhere."
#      33 catalogue rows still point at those files. That is what a fast delete path costs,
#      and six people will be using this library.
#
# THE TWO-STAGE DESIGN
#
#   Stage 1, in the Catalogue sheet, by a person:   Status = "Do Not Use"
#   Stage 2, here, by a person, on a machine:       move those files to _Trash
#
#   Marking is reversible and needs no code — "Do Not Use" is already in the V1 taxonomy
#   (§6) and has never been used on a single asset. Setting it removes the asset from the
#   Library view immediately. Nothing on Drive moves until someone runs this.
#
# WHAT IT REFUSES TO DO
#   - delete. Files are MOVED to _Trash, which holds them for 30 days before Drive's own
#     trash takes over. Two buffers, not zero.
#   - touch a FOLDER. Every target is verified to be a single file first. Folder deletion
#     is precisely how the Goa masters were lost.
#   - touch anything not explicitly marked "Do Not Use" in the catalogue.
#   - run unattended. No terminal, no run.
#
# USAGE
#   scripts/ifm-retire-assets.sh --dry-run    # default. Lists, verifies, moves nothing.
#   scripts/ifm-retire-assets.sh --execute    # asks you to type RETIRE, then moves
#   scripts/ifm-retire-assets.sh --help
#
# Every run writes a manifest to scripts/retired/ BEFORE anything moves, so there is always
# a record of what went and where it came from.
# ---------------------------------------------------------------------------------------
set -euo pipefail

TRASH_ID="1tYW_y3F5Sl6AQJbKXD6JWTJn_023Ud7-"     # IFM Content Drop / _Trash
MODE="dry-run"

for a in "$@"; do
  case "$a" in
    --dry-run) MODE="dry-run" ;;
    --execute) MODE="execute" ;;
    --help|-h) sed -n '2,60p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $a  (try --help)" >&2; exit 2 ;;
  esac
done

ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
CAT="$ROOT/CLAUDE/content/v1-prototype/v1-catalogue.js"
OUTDIR="$ROOT/scripts/retired"
STAMP=$(date +%Y%m%d-%H%M%S)
MANIFEST="$OUTDIR/retire-$STAMP.tsv"
mkdir -p "$OUTDIR"

export PATH="/opt/homebrew/bin:$PATH"
command -v rclone >/dev/null || { echo "rclone not found on PATH" >&2; exit 1; }
rclone listremotes | grep -qx 'gdrive:' || { echo "no 'gdrive:' rclone remote configured" >&2; exit 1; }

echo
echo "IFM — retire assets marked \"Do Not Use\""
echo "======================================="
echo "  mode        $MODE"
echo "  catalogue   ${CAT#$ROOT/}"
echo "  destination Drive _Trash ($TRASH_ID) — MOVE, never delete"
echo

# ---- 1. who is marked? --------------------------------------------------------------
# Read the catalogue as JSON. Never regex it (CLAUDE.md: a regex edit corrupted it once).
/usr/bin/python3 - "$CAT" "$MANIFEST" <<'PY'
import json, re, sys
cat, manifest = sys.argv[1], sys.argv[2]
src = open(cat, encoding='utf-8').read()
rows = json.loads(src[src.index('['):src.rindex(']') + 1])

marked = [r for r in rows if (r.get('status') or '').strip().lower() == 'do not use']
FILE_ID = re.compile(r'/file/d/([A-Za-z0-9_-]{20,})|[?&]id=([A-Za-z0-9_-]{20,})')
FOLDER  = re.compile(r'/folders/([A-Za-z0-9_-]{20,})')

ready, skipped = [], []
for r in marked:
    link = r.get('drive') or ''
    if FOLDER.search(link):
        skipped.append((r['id'], 'FOLDER link — refusing, this is how the Goa masters were lost'))
        continue
    m = FILE_ID.search(link)
    if not m:
        skipped.append((r['id'], 'no resolvable Drive FILE id' if link else 'no Drive link at all'))
        continue
    ready.append((r['id'], m.group(1) or m.group(2), (r.get('title') or '').replace('\t', ' ')))

with open(manifest, 'w', encoding='utf-8') as f:
    f.write('asset_id\tdrive_file_id\ttitle\n')
    for a, d, t in ready:
        f.write(f'{a}\t{d}\t{t}\n')

print(f'  marked "Do Not Use" : {len(marked)}')
print(f'  ready to retire     : {len(ready)}')
print(f'  skipped             : {len(skipped)}')
for a, why in skipped[:10]:
    print(f'      {a}  {why}')
if len(skipped) > 10:
    print(f'      ... and {len(skipped)-10} more')
PY

READY=$(( $(wc -l < "$MANIFEST") - 1 ))
echo
echo "  manifest    ${MANIFEST#$ROOT/}"

if [ "$READY" -eq 0 ]; then
  echo
  echo "Nothing marked \"Do Not Use\" with a resolvable Drive file. Nothing to do."
  echo "Mark assets in the Catalogue sheet first — that also removes them from the Library."
  exit 0
fi

# ---- 2. verify every target is a FILE, and show what it is ---------------------------
echo
echo "  verifying each target is a single file, not a folder:"
BAD=0
while IFS=$'\t' read -r AID DID TITLE; do
  [ "$AID" = "asset_id" ] && continue
  INFO=$(rclone lsjson --drive-root-folder-id "$DID" gdrive: 2>/dev/null || true)
  if echo "$INFO" | grep -q '"IsDir":true'; then
    echo "    REFUSE  $AID  $DID resolves to a FOLDER"
    BAD=$((BAD+1)); continue
  fi
  NAME=$(rclone backend get gdrive: 2>/dev/null >/dev/null; rclone lsf --drive-root-folder-id "$DID" gdrive: 2>/dev/null | head -1)
  echo "    ok      $AID  ${NAME:-<name unavailable>}  — $TITLE"
done < "$MANIFEST"

if [ "$BAD" -gt 0 ]; then
  echo
  echo "ABORTED  $BAD target(s) resolve to folders. Fix the catalogue links first."
  exit 1
fi

# ---- 3. confirm ----------------------------------------------------------------------
if [ "$MODE" = "dry-run" ]; then
  echo
  echo "DRY RUN — nothing was moved."
  echo "Re-run with --execute to move these $READY file(s) to _Trash."
  exit 0
fi

if [ ! -t 0 ]; then
  echo
  echo "ABORTED  No terminal to confirm on. This script will not retire files unattended."
  exit 1
fi

echo
echo "  This MOVES $READY file(s) to _Trash. They stay recoverable there for 30 days."
printf '  Type RETIRE to proceed: '
read -r CONFIRM
[ "$CONFIRM" = "RETIRE" ] || { echo "  Not confirmed. Nothing moved."; exit 1; }

# ---- 4. move --------------------------------------------------------------------------
echo
MOVED=0
while IFS=$'\t' read -r AID DID TITLE; do
  [ "$AID" = "asset_id" ] && continue
  if rclone backend move-id gdrive: "$DID" "$TRASH_ID" >/dev/null 2>&1 \
     || rclone moveto --drive-root-folder-id "$DID" gdrive: "gdrive:_retired-$AID" >/dev/null 2>&1; then
    echo "    moved   $AID"
    MOVED=$((MOVED+1))
  else
    echo "    FAILED  $AID ($DID) — left in place"
  fi
done < "$MANIFEST"

echo
echo "  moved $MOVED of $READY to _Trash."
echo "  manifest kept at ${MANIFEST#$ROOT/} — it is the only record of where these came from."
echo
echo "  Next: the catalogue rows still exist and still say \"Do Not Use\". That is correct."
echo "  The Library already hides them. Do not remove the rows: they are how you find out"
echo "  what happened to an asset someone asks for in six months."
