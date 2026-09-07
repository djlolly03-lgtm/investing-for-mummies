#!/usr/bin/env bash
#
# ifm-deploy.sh — the only safe way to push Investing for Mummies to production.
#
# WHY THIS EXISTS — it prevents two real, previously-observed failure modes:
#
#   1. THE SITE-KILLER (fatal, silent).
#      `vercel deploy --prod` must run from INSIDE <repo>/CLAUDE, which is the
#      Vercel deploy root. Run it one level up, from the repo root, and Vercel
#      publishes the parent folder instead: every live URL 404s, including the
#      WordPress pages that iframe these files. There is no warning — the deploy
#      "succeeds". This script never trusts your current directory: it resolves
#      the repo root via git and cd's into CLAUDE/ itself, every time.
#
#   2. THE STOWAWAY (quiet collateral damage).
#      A deploy ships the working tree as it exists on disk — not HEAD, not your
#      staged files. Several Claude sessions edit this repo at once, so a deploy
#      you start can publish somebody else's half-finished edit. On 7 Sep 2026 it
#      did exactly that. This script cannot stop it, so it makes it VISIBLE:
#      it prints every uncommitted change before asking, and when the tree is
#      dirty it demands you type the word "deploy" rather than tap y.
#
# USAGE
#   scripts/ifm-deploy.sh              # checks, shows the diff, asks, deploys
#   scripts/ifm-deploy.sh --dry-run    # every check, prints the plan, deploys nothing
#   scripts/ifm-deploy.sh --help
#
# Run it from anywhere inside the repo. Deploying still needs the user's
# explicit approval — see CLAUDE.md.

set -euo pipefail

# ---------------------------------------------------------------- presentation
if [[ -t 1 ]]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

say()  { printf '%s\n' "$*"; }
head1() { printf '\n%s%s%s\n' "$BOLD" "$*" "$RESET"; }
ok()   { printf '%s  ok%s  %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s  !!%s  %s\n' "$YELLOW" "$RESET" "$*"; }
die()  { printf '\n%sABORTED%s  %s\n\n' "$RED" "$RESET" "$*" >&2; exit 1; }

PROD_URLS=(
  "https://ifm-deploy.vercel.app/"
  "https://ifm-deploy.vercel.app/content/"
)
MAX_LISTED=15

# --------------------------------------------------------------------- args
DRY_RUN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n) DRY_RUN=1 ;;
    --help|-h)
      sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) die "unknown argument: $1  (try --help)" ;;
  esac
  shift
done

printf '\n%s══ IFM safe deploy%s%s ══%s\n' "$BOLD" \
  "$( ((DRY_RUN)) && printf ' (DRY RUN)' )" "$BOLD" "$RESET"

# ------------------------------------------------------- 1. locate the repo
head1 "1. Locating the deploy root"

command -v git >/dev/null 2>&1 || die "git is not on PATH."

# Anchor on the script's own location, not the caller's cwd, so this works when
# invoked by absolute path from anywhere (scheduled tasks, other directories).
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
if ! REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)"; then
  # Fall back to the caller's cwd only if the script itself is not in a repo.
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" \
    || die "Not inside a git repository, and '$SCRIPT_DIR' is not in one either.
        Run this script from its checkout: <repo>/scripts/ifm-deploy.sh"
fi
DEPLOY_DIR="$REPO_ROOT/CLAUDE"

[[ -d "$DEPLOY_DIR" ]] \
  || die "No CLAUDE/ directory in '$REPO_ROOT'.
        This is either the wrong repo, or CLAUDE/ has been moved or renamed.
        Deploying without it would publish the parent folder and 404 the site."

[[ -f "$DEPLOY_DIR/index.html" ]] \
  || die "'$DEPLOY_DIR' exists but has no index.html.
        That is not the live site root. Refusing to deploy."

ok "repo root   $REPO_ROOT"
ok "deploy root $DEPLOY_DIR"
say "${DIM}      (your shell was in: $PWD — ignored on purpose)${RESET}"

# ------------------------------------------------------------ 2. the toolchain
head1 "2. Checking the toolchain"

VERCEL_BIN="$(command -v vercel 2>/dev/null || true)"
if [[ -z "$VERCEL_BIN" ]]; then
  if ((DRY_RUN)); then
    warn "vercel not found on PATH — a real run would stop here."
    warn "install with:  npm i -g vercel   (then: vercel login)"
    VERCEL_BIN="(not installed)"
  else
    die "'vercel' is not on PATH.
        Install it with:  npm i -g vercel
        Then authenticate:  vercel login"
  fi
else
  ok "vercel      $VERCEL_BIN"
fi

CURL_BIN="$(command -v curl 2>/dev/null || true)"
if [[ -n "$CURL_BIN" ]]; then
  ok "curl        $CURL_BIN"
else
  warn "curl not found — post-deploy verification will be skipped."
fi

# ----------------------------------------------- 3. what is about to go public
head1 "3. What this deploy will publish"

BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(detached)')"
HEAD_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo '(no commits)')"
say "  branch      $BRANCH @ $HEAD_SHA"

PORCELAIN="$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null || true)"

if [[ -z "$PORCELAIN" ]]; then
  DIRTY=0; DIRTY_COUNT=0; DIRTY_IN_DEPLOY=0
  ok "working tree clean — deploying exactly commit $HEAD_SHA"
else
  DIRTY=1
  DIRTY_COUNT="$(printf '%s\n' "$PORCELAIN" | grep -c '' || true)"
  # Porcelain is 2 status chars + a space + the path; paths containing spaces
  # arrive quoted, so strip the status columns before matching rather than
  # grepping for ' CLAUDE/' (which silently misses every quoted path).
  DIRTY_IN_DEPLOY="$(printf '%s\n' "$PORCELAIN" | cut -c4- | grep -c '^"\{0,1\}CLAUDE/' || true)"

  printf '%s  %s uncommitted change(s) in the working tree.%s\n' \
    "$YELLOW" "$DIRTY_COUNT" "$RESET"
  say "  ${BOLD}A deploy ships the tree as it is on disk — including anything below${RESET}"
  say "  ${BOLD}that another Claude session left half-finished.${RESET}"
  say ""
  say "  ${DIM}status  path${RESET}"
  printf '%s\n' "$PORCELAIN" | head -n "$MAX_LISTED" | while IFS= read -r line; do
    printf '  %s\n' "$line"
  done
  if (( DIRTY_COUNT > MAX_LISTED )); then
    say "  ${DIM}... and $((DIRTY_COUNT - MAX_LISTED)) more — see: git -C \"$REPO_ROOT\" status${RESET}"
  fi
  say ""
  say "  Of those, ${BOLD}${DIRTY_IN_DEPLOY}${RESET} are under CLAUDE/ and will be served live."
fi

# ----------------------------------------------------------------- 4. confirm
head1 "4. Confirmation"

PLANNED_CMD="cd \"$DEPLOY_DIR\" && vercel deploy --prod --yes"

if ((DRY_RUN)); then
  say "  ${CYAN}DRY RUN — nothing will be deployed.${RESET}"
  say "  A real run would now:"
  if ((DIRTY)); then
    say "    - require you to type the literal word 'deploy' (tree is dirty)"
  else
    say "    - ask for a y/N confirmation (tree is clean)"
  fi
  say "    - run:  $PLANNED_CMD"
  say "    - then verify: ${PROD_URLS[*]}"
else
  # -r /dev/tty is not enough: the node exists but is "not configured" when
  # there is no controlling terminal. Actually try to open it.
  if ! { exec 3</dev/tty; } 2>/dev/null; then
    die "No terminal available to confirm on. This script will not deploy unattended.
        (Use --dry-run in scripts and CI.)"
  fi
  exec 3<&-
  if ((DIRTY)); then
    say "  $DIRTY_COUNT uncommitted file(s) will go public with this deploy."
    printf '  Type %sdeploy%s to proceed, anything else to abort: ' "$BOLD" "$RESET"
    IFS= read -r reply </dev/tty || reply=""
    [[ "$reply" == "deploy" ]] || die "Not confirmed (you typed: '${reply}')."
  else
    printf '  Deploy commit %s to production? [y/N]: ' "$HEAD_SHA"
    IFS= read -r reply </dev/tty || reply=""
    [[ "$reply" == [yY] || "$reply" == [yY][eE][sS] ]] || die "Not confirmed."
  fi
  ok "confirmed"
fi

# ------------------------------------------------------------------ 5. deploy
head1 "5. Deploy"

DEPLOY_STATUS="skipped (dry run)"
if ((DRY_RUN)); then
  say "  ${CYAN}would run:${RESET} $PLANNED_CMD"
else
  say "  ${DIM}$PLANNED_CMD${RESET}"
  say ""
  # cd into the deploy root explicitly — never inherit the caller's cwd.
  if ( cd "$DEPLOY_DIR" && vercel deploy --prod --yes ); then
    DEPLOY_STATUS="succeeded"
    ok "vercel reported success"
  else
    DEPLOY_STATUS="FAILED"
    die "vercel deploy failed. The live site is unchanged unless vercel says otherwise."
  fi
fi

# ------------------------------------------------------------------ 6. verify
head1 "6. Verify the live site"

VERIFY_FAILED=0
VERIFY_LINES=()

if ((DRY_RUN)); then
  for url in "${PROD_URLS[@]}"; do
    VERIFY_LINES+=("  ${CYAN}would check${RESET}  $url  (expect 200)")
  done
elif [[ -z "$CURL_BIN" ]]; then
  VERIFY_LINES+=("  ${YELLOW}skipped${RESET} — curl unavailable; check the URLs by hand.")
  VERIFY_FAILED=1
else
  say "  ${DIM}giving the CDN a few seconds...${RESET}"
  sleep 5
  for url in "${PROD_URLS[@]}"; do
    code="000"
    for attempt in 1 2 3; do
      code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -L "$url" || echo 000)"
      [[ "$code" == "200" ]] && break
      sleep 4
    done
    if [[ "$code" == "200" ]]; then
      VERIFY_LINES+=("  ${GREEN}200${RESET}  $url")
    else
      VERIFY_LINES+=("  ${RED}${code}${RESET}  $url  ${RED}<-- NOT 200${RESET}")
      VERIFY_FAILED=1
    fi
  done
fi
for l in "${VERIFY_LINES[@]}"; do say "$l"; done

# ----------------------------------------------------------------- 7. summary
head1 "7. Summary"
say "  deploy root     $DEPLOY_DIR"
say "  commit          $BRANCH @ $HEAD_SHA"
if ((DIRTY)); then
  say "  working tree    ${YELLOW}dirty${RESET} — $DIRTY_COUNT uncommitted, $DIRTY_IN_DEPLOY under CLAUDE/"
else
  say "  working tree    clean"
fi
say "  vercel          $DEPLOY_STATUS"

if ((DRY_RUN)); then
  printf '\n%sDRY RUN COMPLETE%s — nothing was deployed.\n' "$CYAN" "$RESET"
  say "Re-run without --dry-run to deploy for real."
  if ((DIRTY)); then
    say "${YELLOW}Before you do: commit or stash, so you only publish what you mean to.${RESET}"
  fi
  printf '\n'
  exit 0
fi

if ((VERIFY_FAILED)); then
  printf '\n%sDEPLOYED, BUT VERIFICATION FAILED%s\n' "$RED" "$RESET"
  say "The site may be broken. Check https://vercel.com dashboard and roll back if needed."
  printf '\n'
  exit 1
fi

printf '\n%sDEPLOYED AND VERIFIED%s — both URLs returned 200.\n' "$GREEN" "$RESET"
if ((DIRTY)); then
  say "${YELLOW}Reminder: $DIRTY_COUNT file(s) are still uncommitted. Commit them so the${RESET}"
  say "${YELLOW}next session knows what is live.${RESET}"
fi
printf '\n'
