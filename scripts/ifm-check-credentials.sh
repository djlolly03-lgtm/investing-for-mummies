#!/bin/bash
#
# ifm-check-credentials.sh — preflight health check for the three machine-local
# credentials that IFM's scheduled jobs depend on.
#
# WHY THIS EXISTS
# ---------------
# CLAUDE.md documents how to REBUILD each credential, but nothing tells you one is
# broken until a scheduled job fails silently, hours later and unattended:
#
#   ifm-daily-brief-email     08:07 daily   needs the Gmail app password (Keychain)
#   ifm-followers-daily       20:08 daily   needs the Instagram session profile
#   weekly-competitor-refresh Mon 09:39     needs the Instagram session profile
#   content/analytics/fetch_ga.py  ad hoc   needs the GA4 service account
#
# Each one fails on a different day, in a different way, with no advance warning.
# This script closes that gap: run it any time (or before a trip / after a machine
# change) and it tells you which credential needs attention and the exact recovery
# command from CLAUDE.md.
#
# It is deliberately READ-ONLY and non-networked:
#   - it never prints or logs a secret value (Keychain existence only, never -w output)
#   - it never attempts an SMTP login (that would put the app password in flight and
#     can trip Google's abuse heuristics)
#   - it never drives a browser to test the Instagram session (that is the very thing
#     the weekly job does, and doing it here would double the login-risk surface)
#
# Exit code: 0 = everything healthy, 1 = at least one WARN or FAIL.
#
# Usage:  ./scripts/ifm-check-credentials.sh
#
set -u

# ---------------------------------------------------------------- presentation
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
  GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'
else
  BOLD=''; DIM=''; RESET=''; GREEN=''; YELLOW=''; RED=''
fi

FAIL_COUNT=0
WARN_COUNT=0

hdr() { printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; }
pass() { printf '  %s[ PASS ]%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '  %s[ WARN ]%s %s\n' "$YELLOW" "$RESET" "$1"; WARN_COUNT=$((WARN_COUNT + 1)); }
fail() { printf '  %s[ FAIL ]%s %s\n' "$RED" "$RESET" "$1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
note() { printf '         %s%s%s\n' "$DIM" "$1" "$RESET"; }
fix()  { printf '         %sfix:%s %s\n' "$BOLD" "$RESET" "$1"; }

PY=/usr/bin/python3

printf '%sIFM credential health check%s  %s(%s)%s\n' \
  "$BOLD" "$RESET" "$DIM" "$(date '+%Y-%m-%d %H:%M')" "$RESET"
printf '%sRead-only. No secrets are printed, no logins are attempted.%s\n' "$DIM" "$RESET"

# ============================================================ 1. Gmail app password
hdr "1. Gmail app password  —  Keychain service 'ifm-daily-brief-smtp'"
note "Feeds: ifm-daily-brief-email (08:07 daily)"

GMAIL_ACCOUNT="djlolly03@gmail.com"
KC_OUT=""
if KC_OUT="$(security find-generic-password -a "$GMAIL_ACCOUNT" -s ifm-daily-brief-smtp -w 2>/dev/null)"; then
  :
elif KC_OUT="$(security find-generic-password -s ifm-daily-brief-smtp -w 2>/dev/null)"; then
  warn "Entry found, but not under account '$GMAIL_ACCOUNT'."
  note "The brief looks it up by service name, so this usually still works."
  fix  "security add-generic-password -a $GMAIL_ACCOUNT -s ifm-daily-brief-smtp -w '<APP PASSWORD>' -U"
  KC_FOUND=1
else
  KC_OUT=""
  KC_FOUND=0
fi

if [ -n "$KC_OUT" ]; then
  # Length only — the value itself is never printed.
  KC_LEN=${#KC_OUT}
  if [ "$KC_LEN" -lt 8 ]; then
    fail "Keychain entry exists but the stored value is only $KC_LEN characters — too short to be a Google app password (expect 16)."
    fix  "security add-generic-password -a $GMAIL_ACCOUNT -s ifm-daily-brief-smtp -w '<APP PASSWORD>' -U"
  else
    pass "App password present in the login Keychain (${KC_LEN} chars, value not shown)."
    note "Existence only — an actual SMTP login is deliberately not attempted."
  fi
  unset KC_OUT
else
  if [ "${KC_FOUND:-0}" -eq 0 ]; then
    fail "No Keychain entry for service 'ifm-daily-brief-smtp'. The 08:07 daily brief will fail with 'could not read app password from Keychain'."
    note "Generate a 16-char app password at myaccount.google.com/apppasswords ($GMAIL_ACCOUNT), then:"
    fix  "security add-generic-password -a $GMAIL_ACCOUNT -s ifm-daily-brief-smtp -w '<APP PASSWORD>' -U"
  fi
fi

# ============================================================ 2. GA4 service account
hdr "2. GA4 service account  —  ~/.ifm/"
note "Feeds: content/analytics/fetch_ga.py (website + games traffic reporting)"

GA_JSON="$HOME/.ifm/ga-service-account.json"
GA_PROP="$HOME/.ifm/ga-property-id"

if [ ! -f "$GA_JSON" ]; then
  fail "Missing $GA_JSON — GA reporting cannot authenticate."
  note "Google Cloud Console -> enable 'Google Analytics Data API' -> create a service account -> download its JSON key, then:"
  fix  "mkdir -p ~/.ifm && chmod 700 ~/.ifm && mv ~/Downloads/<downloaded-key>.json ~/.ifm/ga-service-account.json && chmod 600 ~/.ifm/ga-service-account.json"
else
  GA_EMAIL=""
  if [ -x "$PY" ]; then
    # NB: no '|| true' here — we need python's real exit code to tell
    # "file is not JSON" (rc 1) apart from "JSON but no client_email" (rc 0, empty).
    GA_EMAIL="$("$PY" - "$GA_JSON" <<'PYEOF' 2>/dev/null
import json, sys
try:
    with open(sys.argv[1]) as fh:
        d = json.load(fh)
except Exception:
    sys.exit(1)
if not isinstance(d, dict):
    sys.exit(1)
print(d.get("client_email", ""))
PYEOF
)"
    PY_RC=$?
  else
    PY_RC=127
  fi

  if [ "$PY_RC" -eq 127 ]; then
    warn "$PY not found — cannot validate the key file's JSON."
    note "File exists at $GA_JSON but its contents were not parsed."
  elif [ "$PY_RC" -ne 0 ]; then
    fail "$GA_JSON is not valid JSON (or is not a JSON object). The key file is corrupt."
    fix  "Re-download the service-account key from Google Cloud Console and replace ~/.ifm/ga-service-account.json (chmod 600)."
  elif [ -z "$GA_EMAIL" ]; then
    fail "$GA_JSON parses as JSON but has no 'client_email' — that is not a service-account key."
    fix  "Re-download the service-account key from Google Cloud Console and replace ~/.ifm/ga-service-account.json (chmod 600)."
  else
    pass "Key file present and valid JSON."
    note "client_email: $GA_EMAIL"
    note "This address must be added as Viewer in GA: Admin -> Property access management."
  fi

  # permissions — must be 600, the key is a live credential
  GA_MODE="$(stat -f '%Lp' "$GA_JSON" 2>/dev/null || echo '')"
  if [ -z "$GA_MODE" ]; then
    warn "Could not read the permissions of $GA_JSON."
  elif [ "$GA_MODE" = "600" ]; then
    pass "Permissions are 600 (owner read/write only)."
  else
    warn "Permissions are $GA_MODE, expected 600 — this private key is readable by others."
    fix  "chmod 600 ~/.ifm/ga-service-account.json"
  fi
fi

# property id
if [ ! -f "$GA_PROP" ]; then
  fail "Missing $GA_PROP — the numeric GA4 property ID is separate from the 'G-' measurement ID and the fetch has nothing to query."
  fix  "echo '<NUMERIC PROPERTY ID>' > ~/.ifm/ga-property-id"
else
  GA_PROP_VAL="$(tr -d ' \t\r\n' < "$GA_PROP" 2>/dev/null || echo '')"
  if [ -z "$GA_PROP_VAL" ]; then
    fail "$GA_PROP is empty."
    fix  "echo '<NUMERIC PROPERTY ID>' > ~/.ifm/ga-property-id"
  elif printf '%s' "$GA_PROP_VAL" | grep -Eq '^[0-9]+$'; then
    pass "Property ID present and numeric ($GA_PROP_VAL)."
  else
    fail "Property ID '$GA_PROP_VAL' is not numeric — looks like a 'G-' measurement ID, not the GA4 property ID."
    note "Find the numeric ID in GA: Admin -> Property Settings -> Property ID."
    fix  "echo '<NUMERIC PROPERTY ID>' > ~/.ifm/ga-property-id"
  fi
fi

# ============================================================ 3. Instagram session
hdr "3. Instagram session  —  ~/.gstack/chromium-profile"
note "Feeds: weekly-competitor-refresh (Mon 09:39) and ifm-followers-daily (20:08)"

IG_PROFILE="$HOME/.gstack/chromium-profile"
IG_RECOVERY="Open the GStack browser and log into Instagram as @investingformummies — the session then persists in $IG_PROFILE. (Manual; cannot be scripted.)"

if [ ! -e "$IG_PROFILE" ]; then
  fail "Missing $IG_PROFILE — both Instagram jobs will stop at their login guard."
  fix  "$IG_RECOVERY"
elif [ ! -d "$IG_PROFILE" ]; then
  fail "$IG_PROFILE exists but is not a directory — a Chromium profile must be a directory."
  fix  "Remove the stray file, then: $IG_RECOVERY"
else
  # Age of the most recently touched thing in the profile = last time the browser ran.
  # Cookies is the canonical session store; fall back to the directory itself.
  IG_STAMP_FILE="$IG_PROFILE"
  for candidate in "$IG_PROFILE/Default/Cookies" "$IG_PROFILE/Default/Network/Cookies"; do
    if [ -f "$candidate" ]; then IG_STAMP_FILE="$candidate"; break; fi
  done

  IG_MTIME="$(stat -f '%m' "$IG_STAMP_FILE" 2>/dev/null || echo '')"
  if [ -z "$IG_MTIME" ]; then
    warn "Profile directory present, but its modification time could not be read."
    note "Login state cannot be verified without driving a browser — deliberately not attempted."
  else
    NOW="$(date '+%s')"
    AGE_DAYS=$(( (NOW - IG_MTIME) / 86400 ))
    WHICH="$(basename "$IG_STAMP_FILE")"
    if [ "$AGE_DAYS" -gt 30 ]; then
      warn "Profile present, but last touched ${AGE_DAYS} days ago (${WHICH}). Instagram sessions drift and expire — this one is likely stale."
      fix  "$IG_RECOVERY"
    else
      pass "Profile present, last touched ${AGE_DAYS} day(s) ago (${WHICH})."
    fi
    note "Presence and age only — whether the session is still logged in cannot be checked without driving a browser."
  fi
fi

# ==================================================================== summary
printf '\n%s%s%s\n' "$DIM" "------------------------------------------------------------" "$RESET"
if [ "$FAIL_COUNT" -eq 0 ] && [ "$WARN_COUNT" -eq 0 ]; then
  printf '%sAll credentials healthy.%s Scheduled jobs have what they need.\n' "$GREEN" "$RESET"
  exit 0
fi

printf '%s%d failing, %d warning.%s\n' "$BOLD" "$FAIL_COUNT" "$WARN_COUNT" "$RESET"
printf 'Recovery runbook: CLAUDE.md, "Credentials — machine-local, and how to rebuild them".\n'
exit 1
