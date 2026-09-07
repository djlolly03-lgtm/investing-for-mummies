#!/usr/bin/env python3
"""Pull website + games traffic from GA4 into content/ga-stats.json.

Zero third-party dependencies: signs the service-account JWT with `cryptography`
(already on /usr/bin/python3) and calls the REST API with urllib, so there is no
pip install to fight with (this Mac's python is PEP-668 externally-managed).

SETUP (one time, by the user):
  1. Google Cloud Console -> enable "Google Analytics Data API" -> create a
     service account -> download its JSON key.
  2. Move the key to  ~/.ifm/ga-service-account.json   (OUTSIDE the repo — it is
     a private key and must never be committed or deployed).
  3. Google Analytics -> Admin -> Property access management -> add the service
     account's email as a Viewer.
  4. Put the NUMERIC property id (Admin -> Property Settings, e.g. 486203719 —
     NOT the G-XXXX measurement id) in  ~/.ifm/ga-property-id

Run:  /usr/bin/python3 fetch_ga.py [--days 30]
"""

import base64, json, os, sys, time, datetime
import urllib.request, urllib.error, urllib.parse

KEY_PATH = os.path.expanduser("~/.ifm/ga-service-account.json")
PROP_PATH = os.path.expanduser("~/.ifm/ga-property-id")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ga-stats.json")
SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
GAMES_HOST = "ifm-deploy.vercel.app"


def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def preflight():
    missing = []
    if not os.path.exists(KEY_PATH):
        missing.append("  - service-account key not found at %s" % KEY_PATH)
    if not os.path.exists(PROP_PATH):
        missing.append("  - numeric property id not found at %s" % PROP_PATH)
    if missing:
        die("GA4 not configured yet:\n" + "\n".join(missing) +
            "\n\nSee the SETUP block at the top of this file. Nothing was written.", 2)


def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=")


def access_token(key):
    """Sign a JWT with the service account key and swap it for an access token."""
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    now = int(time.time())
    header = {"alg": "RS256", "typ": "JWT"}
    claims = {
        "iss": key["client_email"],
        "scope": SCOPE,
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = b".".join([
        b64(json.dumps(header).encode()),
        b64(json.dumps(claims).encode()),
    ])
    private_key = serialization.load_pem_private_key(
        key["private_key"].encode(), password=None
    )
    signature = private_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    assertion = (signing_input + b"." + b64(signature)).decode()

    body = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": assertion,
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=body)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["access_token"]


def run_report(token, prop, body):
    url = "https://analyticsdata.googleapis.com/v1beta/properties/%s:runReport" % prop
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + token,
                 "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:600]
        if e.code == 403:
            die("403 from GA4. The service account is authenticated but has NOT been "
                "granted access to the property.\nAdd its client_email as a Viewer in "
                "GA Admin -> Property access management.\n\n" + detail)
        die("GA4 API error %s:\n%s" % (e.code, detail))


def main():
    days = 30
    if "--days" in sys.argv:
        days = int(sys.argv[sys.argv.index("--days") + 1])

    preflight()
    key = json.load(open(KEY_PATH))
    prop = open(PROP_PATH).read().strip()
    token = access_token(key)

    rng = [{"startDate": "%ddaysAgo" % days, "endDate": "today"}]

    # Per-day, split by hostname -> separates the WordPress site from the games site.
    by_host = run_report(token, prop, {
        "dateRanges": rng,
        "dimensions": [{"name": "date"}, {"name": "hostName"}],
        "metrics": [{"name": "sessions"}, {"name": "activeUsers"},
                    {"name": "screenPageViews"}],
        "limit": 10000,
    })

    # Per-day games traffic via the content_group we set on every game page.
    by_group = run_report(token, prop, {
        "dateRanges": rng,
        "dimensions": [{"name": "date"}, {"name": "contentGroup"}],
        "metrics": [{"name": "screenPageViews"}, {"name": "activeUsers"}],
        "limit": 10000,
    })

    # Which individual games actually get played (whole range, not per-day).
    top_games = run_report(token, prop, {
        "dateRanges": rng,
        "dimensions": [{"name": "pagePath"}],
        "metrics": [{"name": "screenPageViews"}],
        "dimensionFilter": {"filter": {
            "fieldName": "hostName",
            "stringFilter": {"matchType": "EXACT", "value": GAMES_HOST},
        }},
        "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
        "limit": 25,
    })

    def rows(rep):
        return rep.get("rows", []) or []

    days_map = {}
    for r in rows(by_host):
        d, host = r["dimensionValues"][0]["value"], r["dimensionValues"][1]["value"]
        sess, users, views = (int(m["value"]) for m in r["metricValues"])
        day = days_map.setdefault(d, {"date": "%s-%s-%s" % (d[:4], d[4:6], d[6:]),
                                      "site_sessions": 0, "site_users": 0, "site_views": 0,
                                      "games_sessions": 0, "games_users": 0, "games_views": 0})
        if host == GAMES_HOST:
            day["games_sessions"] += sess; day["games_users"] += users; day["games_views"] += views
        else:
            day["site_sessions"] += sess; day["site_users"] += users; day["site_views"] += views

    for r in rows(by_group):
        d, grp = r["dimensionValues"][0]["value"], r["dimensionValues"][1]["value"]
        if grp != "Games":
            continue
        views, users = (int(m["value"]) for m in r["metricValues"])
        day = days_map.get(d)
        if day:
            day["games_group_views"] = views
            day["games_group_users"] = users

    history = [days_map[k] for k in sorted(days_map)]
    payload = {
        "property_id": prop,
        "measurement_id": "G-PCN0R6L3B9",
        "games_host": GAMES_HOST,
        "note": ("Website + games traffic from GA4. site_* = investingformummies.com, "
                 "games_* = ifm-deploy.vercel.app (all game pages, tagged content_group=Games "
                 "on 19 Aug 2026 — no games data exists before that date). Refreshed daily; "
                 "GA revises the last ~48h, so recent rows can move."),
        "updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "history": history,
        "top_games": [{"path": r["dimensionValues"][0]["value"],
                       "views": int(r["metricValues"][0]["value"])}
                      for r in rows(top_games)],
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")

    tot_site = sum(d["site_views"] for d in history)
    tot_games = sum(d["games_views"] for d in history)
    print("Wrote %s" % os.path.normpath(OUT))
    print("  %d days | website %d views / %d sessions | games %d views" % (
        len(history), tot_site, sum(d["site_sessions"] for d in history), tot_games))
    if payload["top_games"]:
        print("  top game: %s (%d views)" % (payload["top_games"][0]["path"],
                                             payload["top_games"][0]["views"]))


if __name__ == "__main__":
    main()
