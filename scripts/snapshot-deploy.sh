#!/bin/bash
# Deploy ONLY this session's content/ work, leaving another session's in-flight game
# edits exactly as they are on the live site.
#
# A Vercel deploy publishes the whole working tree. At 22:01 tonight another session
# had 23 game files modified and was still saving -- one of them 18 seconds before my
# previous deploy went out. Shipping that tree again risks publishing a half-written
# file, and a half-written game is a broken game in a classroom.
#
# So: rsync the tree to a snapshot, then overwrite every file that session has touched
# with the copy currently LIVE. My content/ changes go out; their work-in-progress
# stays at whatever the site already serves.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"

ROOT="/Users/lollyg/Documents/investing for Mummies"
SRC="$ROOT/CLAUDE"
SNAP="/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/b76a4ce8-96d2-4b94-bf24-3cbf06b0f33c/scratchpad/snap"
BASE="https://ifm-deploy.vercel.app"

rm -rf "$SNAP"; mkdir -p "$SNAP"
# Skip what .vercelignore drops at deploy time anyway. Without these the rsync
# spends ten minutes copying 1.9 GB of scam-slingshot build scratch that is then
# excluded from the payload (see the 16 Oct deploy-size note in CLAUDE.md).
# rsync applies filters IN ORDER and the first match wins, so every --include has to
# come before the --exclude it is rescuing from. With these the other way round the
# '*.mp4' exclude swallows content/clips/ and the deploy ships a library of dead play
# buttons -- which is the exact failure the two-deploy rule exists to prevent.
rsync -a \
      --include 'content/clips/***' --include 'content/teasers/***' \
      --include 'content/game-assets/***' \
      --include '3b-hero.mp4' --include 'wealth-hack-loop.mp4' \
      --include 'ifm-logo-gold-coins-spin.mp4' \
      --exclude '.git' --exclude 'scam-slingshot/' --exclude 'game-reels/out/' \
      --exclude '*.mp4' --exclude '*.mov' --exclude '*.pdf' \
      "$SRC/" "$SNAP/"

# Every CLAUDE/ file this session did NOT write, that is currently modified.
cd "$ROOT"
PINNED=0; FAILED=0
while IFS= read -r f; do
  rel="${f#CLAUDE/}"
  case "$rel" in content/*) continue ;; esac          # content/ IS my work
  tmp="$SNAP/$rel.pin"
  if curl -fsS --max-time 30 "$BASE/$rel" -o "$tmp" && [ -s "$tmp" ]; then
    mv "$tmp" "$SNAP/$rel"; PINNED=$((PINNED+1))
    echo "  pinned to live: $rel"
  else
    rm -f "$tmp"; FAILED=$((FAILED+1))
    echo "  !! COULD NOT PIN (shipping the working copy): $rel"
  fi
done < <(git status --porcelain -- CLAUDE | awk '{print $2}' | grep -v '\.bak$')

echo "pinned $PINNED file(s) to the live copy; $FAILED could not be pinned"
[ "$FAILED" -gt 0 ] && echo "   ^ check these before trusting the deploy"

# Every `!name` exception in .vercelignore MUST survive the rsync. Getting this wrong
# on 10 Nov dropped 3b-hero.mp4, wealth-hack-loop.mp4 and ifm-logo-gold-coins-spin.mp4
# from the site for 13 minutes -- wealth-hack-loop.mp4 is used by The Wealth Hack, a
# game Hiral runs live in class. The rsync filter list above is a SECOND copy of
# .vercelignore's intent, so it will drift again; this checks instead of trusting.
MISSING=0
while IFS= read -r ex; do
  case "$ex" in */\**) continue ;; esac            # glob rules are covered by the --include dirs
  if [ -f "$SRC/$ex" ] && [ ! -f "$SNAP/$ex" ]; then
    echo "  !! .vercelignore keeps '$ex' but the snapshot does not have it"
    cp "$SRC/$ex" "$SNAP/$ex" && echo "     copied it in"
    MISSING=$((MISSING+1))
  fi
done < <(grep '^!' "$SRC/.vercelignore" | sed 's/^!//')
[ "$MISSING" -gt 0 ] && echo "recovered $MISSING whitelisted file(s) the rsync filter had dropped"

cd "$SNAP"
vercel deploy --prod --yes 2>&1 | grep -Ei '^Aliased|^Production|error' | head -4
