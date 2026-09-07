#!/usr/bin/env bash
#
# ifm-check-exposure.sh — public-exposure regression guard for ifm-deploy.vercel.app
#
# WHY THIS EXISTS
# ---------------
# The repo's `CLAUDE/` folder IS the Vercel deploy root: every file in it becomes a
# public URL. On 7 Sep 2026 a DX audit found 93 internal files being served publicly —
# build briefs, sync scripts and Apps Script source complete with Google Sheet IDs.
# These all returned HTTP 200 to anyone with the URL:
#
#     /content/SAKSHI-HUB-BUILD-BRIEF.md
#     /content/source_sync.py
#     /content/source-registry-sync.gs
#
# `CLAUDE/.vercelignore` was then updated to block `*.md`, `*.py` and `*.gs`. But an
# ignore rule only takes effect on the NEXT deploy, and nothing stops a future edit
# (a `!exception` line, a new file type, a reorganised folder) from re-exposing them.
#
# This script is the regression test for that. It curls the LIVE site and fails if
# anything that should be private is readable — and, just as importantly, fails if the
# things that SHOULD be public have stopped working, so it can't be passed by a site
# that is simply 404ing everywhere.
#
# It is read-only: GET requests only. It never deploys, never POSTs, never writes.
#
# USAGE
#     scripts/ifm-check-exposure.sh                       # checks production
#     scripts/ifm-check-exposure.sh --base https://x.app  # checks a preview deploy
#
# EXIT CODES
#     0  every private path is non-200 AND every public path is 200
#     1  something is exposed, something public is broken, or a URL was unreachable
#     2  bad arguments
#
set -euo pipefail

BASE="https://ifm-deploy.vercel.app"
TIMEOUT=10        # seconds, total per request — the script must never hang
CONNECT_TIMEOUT=5
SAMPLE_CAP=12     # how many discovered .md/.py/.gs paths to probe, beyond the pinned ones

while [ $# -gt 0 ]; do
  case "$1" in
    --base)
      [ $# -ge 2 ] || { echo "error: --base needs a URL" >&2; exit 2; }
      BASE="$2"; shift 2 ;;
    --base=*)
      BASE="${1#--base=}"; shift ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    *)
      echo "error: unknown argument '$1' (try --help)" >&2; exit 2 ;;
  esac
done
BASE="${BASE%/}"   # no trailing slash

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DEPLOY_ROOT="$REPO_ROOT/CLAUDE"

# --- colours (only when attached to a terminal) ------------------------------------
if [ -t 1 ]; then
  RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; BOLD=$'\033[1m'; RST=$'\033[0m'
else
  RED=""; GRN=""; YEL=""; BOLD=""; RST=""
fi

# --- url_encode <path> -> percent-encodes the characters curl will not accept raw ---
# Filenames in CLAUDE/ contain spaces ("IFM Role Architecture.md"), and curl treats an
# unencoded space as a malformed URL — which would silently look like "unreachable".
url_encode() {
  local s="$1" out="" c
  local i
  for (( i = 0; i < ${#s}; i++ )); do
    c="${s:i:1}"
    case "$c" in
      [a-zA-Z0-9._~/:@!\$\&\'\(\)\*\+,\;=-]) out+="$c" ;;
      *) out+="$(printf '%%%02X' "'$c")" ;;
    esac
  done
  printf '%s' "$out"
}

# --- http_status <url> [follow] -> prints status code, or 000 if unreachable --------
http_status() {
  local url="$1" follow="${2:-no}" code
  local -a args=(-s -o /dev/null -w '%{http_code}'
                 --connect-timeout "$CONNECT_TIMEOUT" --max-time "$TIMEOUT"
                 -A 'ifm-check-exposure/1.0')
  [ "$follow" = "follow" ] && args+=(-L)
  # curl's own failure (DNS, TLS, timeout) must not kill the run under `set -e`.
  code="$(curl "${args[@]}" "$url" 2>/dev/null || true)"
  [ -n "$code" ] || code="000"
  printf '%s' "$code"
}

# --- the private list: pinned incident URLs first, then a discovered sample ---------
PINNED=(
  "/content/SAKSHI-HUB-BUILD-BRIEF.md"
  "/content/source_sync.py"
  "/content/source-registry-sync.gs"
)

DISCOVERED=()
if [ -d "$DEPLOY_ROOT" ]; then
  while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    DISCOVERED+=("/$rel")
  done < <(
    cd "$DEPLOY_ROOT" && find . -type f \
        \( -name '*.md' -o -name '*.py' -o -name '*.gs' \) \
        -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null \
      | sed 's|^\./||' | LC_ALL=C sort
  )
fi

PRIVATE_PATHS=("${PINNED[@]}")
added=0
for p in ${DISCOVERED[@]+"${DISCOVERED[@]}"}; do
  [ "$added" -ge "$SAMPLE_CAP" ] && break
  skip=no
  for seen in "${PRIVATE_PATHS[@]}"; do
    [ "$seen" = "$p" ] && { skip=yes; break; }
  done
  [ "$skip" = yes ] && continue
  PRIVATE_PATHS+=("$p")
  added=$((added + 1))
done

# --- the public list: if these break, the site is down, not secure ------------------
PUBLIC_PATHS=(
  "/"
  "/content/"
  "/content/data.js"
)

# --- run ---------------------------------------------------------------------------
echo "${BOLD}IFM public-exposure check${RST}"
echo "base:      $BASE"
echo "deploy src: $DEPLOY_ROOT"
echo "scanned ${#DISCOVERED[@]} internal file(s) in CLAUDE/; probing ${#PRIVATE_PATHS[@]} of them"
echo

exposed=()
unreachable=()
broken=()

echo "${BOLD}Should be PRIVATE (any 200 is a leak)${RST}"
for path in "${PRIVATE_PATHS[@]}"; do
  code="$(http_status "$BASE$(url_encode "$path")")"
  if [ "$code" = "000" ]; then
    printf '  %sERROR%s  %s  %s (unreachable)\n' "$YEL" "$RST" "$code" "$path"
    unreachable+=("$path")
  elif [ "$code" = "200" ]; then
    printf '  %sFAIL%s   %s  %s\n' "$RED" "$RST" "$code" "$path"
    exposed+=("$path")
  else
    printf '  %sPASS%s   %s  %s\n' "$GRN" "$RST" "$code" "$path"
  fi
done

echo
echo "${BOLD}Should be PUBLIC (anything but 200 means the site is broken)${RST}"
for path in "${PUBLIC_PATHS[@]}"; do
  code="$(http_status "$BASE$(url_encode "$path")" follow)"
  if [ "$code" = "000" ]; then
    printf '  %sERROR%s  %s  %s (unreachable)\n' "$YEL" "$RST" "$code" "$path"
    unreachable+=("$path")
  elif [ "$code" = "200" ]; then
    printf '  %sPASS%s   %s  %s\n' "$GRN" "$RST" "$code" "$path"
  else
    printf '  %sFAIL%s   %s  %s\n' "$RED" "$RST" "$code" "$path"
    broken+=("$path")
  fi
done

echo
total_bad=$(( ${#exposed[@]} + ${#broken[@]} + ${#unreachable[@]} ))
if [ "$total_bad" -eq 0 ]; then
  echo "${GRN}${BOLD}PASS${RST} — ${#PRIVATE_PATHS[@]} private path(s) are not readable; ${#PUBLIC_PATHS[@]} public path(s) are live."
  exit 0
fi

echo "${RED}${BOLD}FAIL${RST}"
if [ ${#exposed[@]} -gt 0 ]; then
  echo
  echo "  ${#exposed[@]} internal file(s) returned HTTP 200. These are readable by anyone"
  echo "  with the URL — no login, no password, no guessing beyond the filename:"
  for p in "${exposed[@]}"; do echo "    $BASE$p"; done
  echo
  echo "  These files can contain Google Sheet IDs, Drive folder IDs, Apps Script"
  echo "  endpoints and internal build/hiring notes. Fix: confirm CLAUDE/.vercelignore"
  echo "  blocks them, then redeploy from INSIDE CLAUDE/ (never the parent folder)."
  echo "  An .vercelignore edit changes nothing until the next production deploy."
fi
if [ ${#broken[@]} -gt 0 ]; then
  echo
  echo "  ${#broken[@]} path(s) that should be public are NOT returning 200. The live site"
  echo "  is degraded or the last deploy dropped files:"
  for p in "${broken[@]}"; do echo "    $BASE$p"; done
fi
if [ ${#unreachable[@]} -gt 0 ]; then
  echo
  echo "  ${#unreachable[@]} path(s) could not be reached at all (DNS/TLS/timeout). This run"
  echo "  proved nothing about them — re-run before trusting the result:"
  for p in "${unreachable[@]}"; do echo "    $BASE$p"; done
fi
exit 1
