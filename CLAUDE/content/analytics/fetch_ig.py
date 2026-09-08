#!/usr/bin/env python3
"""Pull Instagram reach / views / saves from the Graph API into content/ig-insights.json.

WHY THIS EXISTS
  Reach, impressions/views, saves and profile visits are NOT obtainable by scraping.
  The weekly refresh can only see likes and comments, so the hub has been using
  engagement rate as an honest stand-in. This is the only route to the real numbers.

Zero third-party dependencies (urllib only), same as fetch_ga.py — this Mac's python
is PEP-668 externally-managed and pip installs are a fight.

SETUP (one time, by the user — see the runbook in CLAUDE.md "Instagram Graph API"):
  1. Instagram app -> Settings -> Account type -> switch to Professional (Business).
  2. developers.facebook.com -> My Apps -> Create App -> "Business" type.
  3. Add the "Instagram" product -> API setup with Instagram login.
  4. Generate a token for @investingformummies with these scopes:
        instagram_business_basic, instagram_business_manage_insights
  5. Store it in the Keychain (NEVER in a file, NEVER in the repo):
        security add-generic-password -a ifm -s ifm-ig-graph-token -w '<TOKEN>' -U
  6. Run this script once. It resolves and caches the account id itself.

Tokens from step 4 are short-lived (1 hour). Run with --exchange once to swap it for a
60-day token; after that --refresh extends it another 60 days (works any time after day 1).
A 60-day token that is never refreshed WILL expire silently — that is the main failure
mode of this pipeline, so refresh_due in the output exists to make it visible.

Run:  /usr/bin/python3 fetch_ig.py [--days 30] [--exchange] [--refresh] [--check]
"""

import json, os, sys, time, datetime, subprocess
import urllib.request, urllib.error, urllib.parse

KEYCHAIN_SERVICE = "ifm-ig-graph-token"
STATE_DIR = os.path.expanduser("~/.ifm")
ID_PATH = os.path.join(STATE_DIR, "ig-user-id")
TOKEN_META = os.path.join(STATE_DIR, "ig-token-meta.json")
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "ig-insights.json")

# v26.0 was the newest version answering on 8 Sep 2026 (v27+ returned "Unknown path
# components"). Meta retires a version roughly two years after release, so newest = the
# longest runway. Bump it when a call starts failing with a version error, not sooner.
API_VERSION = "v26.0"
IG_HOST = "https://graph.instagram.com"    # Instagram Login — no Facebook Page needed
FB_HOST = "https://graph.facebook.com"     # Business Login — via a linked Facebook Page

# 'impressions' was retired in favour of 'views' in v22. Asking for it now fails the
# WHOLE call, which is exactly why fetch() falls back to one-metric-at-a-time below.
ACCOUNT_TOTAL = ["reach", "views", "accounts_engaged", "total_interactions",
                 "likes", "comments", "saves", "shares", "replies", "profile_views"]
ACCOUNT_DAILY = ["follower_count"]
MEDIA_METRICS = ["reach", "views", "saved", "shares", "total_interactions", "likes", "comments"]
REEL_EXTRA = ["ig_reels_avg_watch_time", "ig_reels_video_view_total_time"]


def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def token():
    """Read the access token from the macOS Keychain. Never printed, never written."""
    try:
        return subprocess.check_output(
            ["security", "find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"],
            stderr=subprocess.DEVNULL, text=True).strip()
    except subprocess.CalledProcessError:
        die("No Instagram token in the Keychain (service '%s').\n"
            "See the SETUP block at the top of this file. Nothing was written."
            % KEYCHAIN_SERVICE, 2)


def store_token(tok, expires_in):
    subprocess.run(["security", "add-generic-password", "-a", "ifm",
                    "-s", KEYCHAIN_SERVICE, "-w", tok, "-U"], check=True)
    os.makedirs(STATE_DIR, mode=0o700, exist_ok=True)
    meta = {"stored": datetime.date.today().isoformat(),
            "expires": (datetime.date.today() +
                        datetime.timedelta(seconds=int(expires_in))).isoformat()}
    with open(TOKEN_META, "w") as f:
        json.dump(meta, f, indent=2)
    os.chmod(TOKEN_META, 0o600)
    return meta


def call(host, path, params, tok, timeout=30):
    """One Graph call. Returns (data, error_message). Never raises on an API error."""
    q = dict(params)
    q["access_token"] = tok
    url = "%s/%s/%s?%s" % (host, API_VERSION, path.lstrip("/"), urllib.parse.urlencode(q))
    req = urllib.request.Request(url, headers={"User-Agent": "ifm-content-hub/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode()), None
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
            return None, body.get("error", {}).get("message", str(e))
        except Exception:
            return None, "HTTP %s" % e.code
    except Exception as e:
        return None, str(e)


def resolve_host_and_id(tok):
    """Work out which login path this token came from, and the account id it belongs to.

    Cached in ~/.ifm/ig-user-id as "<host>|<id>|<username>" so later runs skip the probe.
    """
    if os.path.exists(ID_PATH):
        parts = open(ID_PATH).read().strip().split("|")
        if len(parts) == 3:
            return parts[0], parts[1], parts[2]

    # Instagram Login: the token IS the account.
    data, err = call(IG_HOST, "me", {"fields": "id,username"}, tok)
    if data and data.get("id"):
        host, uid, uname = IG_HOST, data["id"], data.get("username", "")
    else:
        # Business Login: walk Facebook Pages to find the linked IG account.
        pages, perr = call(FB_HOST, "me/accounts",
                           {"fields": "name,instagram_business_account{id,username}"}, tok)
        if not pages:
            die("Token works for neither login path.\n"
                "  instagram: %s\n  facebook:  %s\n"
                "Regenerate it with instagram_business_basic + "
                "instagram_business_manage_insights." % (err, perr), 3)
        acct = next((p["instagram_business_account"] for p in pages.get("data", [])
                     if p.get("instagram_business_account")), None)
        if not acct:
            die("Facebook token is valid but no Page has an Instagram Business account "
                "linked. Link @investingformummies to a Page, or use the Instagram Login "
                "path instead (simpler — no Page required).", 3)
        host, uid, uname = FB_HOST, acct["id"], acct.get("username", "")

    os.makedirs(STATE_DIR, mode=0o700, exist_ok=True)
    with open(ID_PATH, "w") as f:
        f.write("%s|%s|%s" % (host, uid, uname))
    return host, uid, uname


def insights(host, node, metrics, tok, **extra):
    """Fetch insight metrics, degrading to one-at-a-time if the batch is rejected.

    Meta fails the ENTIRE call when a single metric is invalid for this account type or
    API version, and which metrics are valid changes between versions. Retrying
    individually turns 'the whole pull broke' into 'one metric is missing', and names it.
    """
    out, missing = {}, {}
    params = {"metric": ",".join(metrics)}
    params.update(extra)
    data, err = call(host, "%s/insights" % node, params, tok)
    if data:
        for m in data.get("data", []):
            vals = m.get("total_value", {}).get("value")
            if vals is None:
                series = m.get("values") or []
                vals = series[-1].get("value") if series else None
            out[m.get("name")] = vals
        return out, missing

    for m in metrics:
        p = {"metric": m}
        p.update(extra)
        d, e = call(host, "%s/insights" % node, p, tok)
        if not d:
            missing[m] = e
            continue
        for item in d.get("data", []):
            vals = item.get("total_value", {}).get("value")
            if vals is None:
                series = item.get("values") or []
                vals = series[-1].get("value") if series else None
            out[item.get("name")] = vals
    return out, missing


def main():
    args = sys.argv[1:]
    days = 30
    if "--days" in args:
        days = int(args[args.index("--days") + 1])
    tok = token()

    if "--exchange" in args or "--refresh" in args:
        if "--exchange" in args:
            # Short-lived (1h) -> long-lived (60d). Needs the app secret, which is NOT
            # stored: pass it once on the command line and it never touches disk.
            secret = os.environ.get("IFM_IG_APP_SECRET")
            if not secret:
                die("Set IFM_IG_APP_SECRET for the exchange:\n"
                    "  IFM_IG_APP_SECRET='<app secret>' /usr/bin/python3 fetch_ig.py --exchange", 2)
            d, e = call(IG_HOST, "access_token",
                        {"grant_type": "ig_exchange_token", "client_secret": secret}, tok)
        else:
            d, e = call(IG_HOST, "refresh_access_token", {"grant_type": "ig_refresh_token"}, tok)
        if not d or not d.get("access_token"):
            die("Token exchange failed: %s" % e, 3)
        meta = store_token(d["access_token"], d.get("expires_in", 5184000))
        print("Token stored. Valid until %s. Re-run --refresh before then." % meta["expires"])
        return

    host, uid, uname = resolve_host_and_id(tok)

    if "--check" in args:
        d, e = call(host, uid, {"fields": "username,followers_count,media_count"}, tok)
        print("OK  @%s  %s followers, %s posts" %
              (d.get("username"), d.get("followers_count"), d.get("media_count"))
              if d else "FAIL  %s" % e)
        return

    until = datetime.date.today()
    since = until - datetime.timedelta(days=days)
    rng = {"since": since.isoformat(), "until": until.isoformat()}

    profile, perr = call(host, uid,
                         {"fields": "username,followers_count,follows_count,media_count"}, tok)
    if not profile:
        die("Could not read the profile: %s\n"
            "If this says the token is invalid, it expired — run with --refresh, or "
            "regenerate and re-store it." % perr, 3)

    acct, acct_missing = insights(host, uid, ACCOUNT_TOTAL, tok, metric_type="total", **rng)
    daily, daily_missing = insights(host, uid, ACCOUNT_DAILY, tok, period="day", **rng)
    acct.update(daily)
    acct_missing.update(daily_missing)

    media, merr = call(host, "%s/media" % uid,
                       {"fields": "id,caption,media_type,media_product_type,permalink,"
                                  "thumbnail_url,media_url,timestamp,like_count,comments_count",
                        "limit": 100}, tok)
    posts = []
    for m in (media or {}).get("data", []):
        ts = m.get("timestamp", "")
        if ts and ts[:10] < since.isoformat():
            continue
        wanted = list(MEDIA_METRICS)
        if m.get("media_product_type") == "REELS":
            wanted += REEL_EXTRA
        mi, _ = insights(host, m["id"], wanted, tok)
        cap = (m.get("caption") or "").replace("\n", " ").strip()
        posts.append({
            "id": m["id"],
            "permalink": m.get("permalink"),
            "type": m.get("media_product_type") or m.get("media_type"),
            "date": ts[:10],
            "caption": cap[:180],
            "thumb": m.get("thumbnail_url") or m.get("media_url"),
            "likes": m.get("like_count"),
            "comments": m.get("comments_count"),
            "reach": mi.get("reach"),
            "views": mi.get("views"),
            "saves": mi.get("saved"),
            "shares": mi.get("shares"),
            "interactions": mi.get("total_interactions"),
            "avg_watch_ms": mi.get("ig_reels_avg_watch_time"),
        })
        time.sleep(0.4)   # Meta throttles hard; 200 calls/hour/user is the practical ceiling

    posts.sort(key=lambda p: p["date"] or "", reverse=True)
    reached = [p["reach"] for p in posts if isinstance(p["reach"], int)]

    meta = {}
    if os.path.exists(TOKEN_META):
        meta = json.load(open(TOKEN_META))
    refresh_due = None
    if meta.get("expires"):
        left = (datetime.date.fromisoformat(meta["expires"]) - datetime.date.today()).days
        refresh_due = {"expires": meta["expires"], "days_left": left, "urgent": left < 14}

    payload = {
        "generated": datetime.datetime.now().isoformat(timespec="seconds"),
        "window_days": days,
        "handle": "@" + (profile.get("username") or uname),
        "followers": profile.get("followers_count"),
        "media_count": profile.get("media_count"),
        "account": acct,
        "unavailable": acct_missing,
        "avg_reach": round(sum(reached) / len(reached)) if reached else None,
        "posts": posts,
        "refresh_due": refresh_due,
    }
    with open(OUT, "w") as f:
        json.dump(payload, f, indent=2)

    print("Wrote %s" % os.path.normpath(OUT))
    print("  @%s · %s followers · %d posts in the last %d days"
          % (payload["handle"].lstrip("@"), payload["followers"], len(posts), days))
    print("  reach %s · views %s · saves %s · avg reach/post %s"
          % (acct.get("reach"), acct.get("views"), acct.get("saves"), payload["avg_reach"]))
    if acct_missing:
        print("  metrics this account/version would not return: %s"
              % ", ".join(sorted(acct_missing)))
    if refresh_due and refresh_due["urgent"]:
        print("  TOKEN EXPIRES IN %d DAYS — run: /usr/bin/python3 fetch_ig.py --refresh"
              % refresh_due["days_left"])


if __name__ == "__main__":
    main()
