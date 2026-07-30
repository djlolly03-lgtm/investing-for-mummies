# IFM News Agency

A small standalone site that finds Indian personal-finance news, rewrites it for
the IFM audience ("mummifies" it), and files everything to Google Drive.

Deliberately **separate from the games site**. The games project (`../CLAUDE`)
is a 1.7 GB static folder; Vercel bundles project files alongside a serverless
function, so putting a Python API in there blew the 225 MB function limit. This
project's whole root is ~50 KB.

```
ifm-news-agency/
  api/news.py              the scanner API (one function, routed by `action`)
  index.html               the newsroom — reading + admin console
  requirements.txt         requests, feedparser, beautifulsoup4 (~13 MB installed)
  vercel.json              maxDuration 60
  setup_google_oauth.py    run once, locally, to mint a Google refresh token
```

Claude is called over plain HTTP rather than the `anthropic` SDK — the SDK pulls
in pydantic and jiter for no benefit here, and keeping the bundle small keeps
this project comfortably inside Vercel's limits.

---

## Setup (once)

### 1. Create a Google OAuth client (~5 minutes)

1. <https://console.cloud.google.com> → create a project (any name).
2. **APIs & Services → Library** → enable **Google Drive API** and **Google Sheets API**.
3. **APIs & Services → OAuth consent screen** → **External** → fill in the app
   name and your email → under **Test users** add `djlolly03@gmail.com`.
   Leave it in "Testing" mode; it never needs verification for your own account.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   → Application type **Desktop app** → Create.
5. Copy the **Client ID** and **Client secret**.

### 2. Mint a refresh token

```bash
cd ~/Documents/"investing for Mummies"/ifm-news-agency && ../news-agent/venv/bin/python setup_google_oauth.py
```

Paste the Client ID and secret when asked; a browser opens and you approve
access to your own Drive. The script prints the values for the next step.

### 3. Create the Vercel project

```bash
cd ~/Documents/"investing for Mummies"/ifm-news-agency && vercel
```

Accept the defaults and **do not** link it to the existing `ifm-deploy` project —
this is a new one. Then add the environment variables in the Vercel dashboard
(**Settings → Environment Variables**, for Production):

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Claude API key (same one in `../news-agent/.env`) |
| `IFM_ADMIN_TOKEN` | any long random string you invent — the password the Scan button asks for |
| `GOOGLE_CLIENT_ID` | from step 2 |
| `GOOGLE_CLIENT_SECRET` | from step 2 |
| `GOOGLE_REFRESH_TOKEN` | from step 2 |
| `GOOGLE_DRIVE_FOLDER_ID` | `1D1zVyslxYlZCO4OeSxURSyzcunBXRGsl` |
| `SEED_URL` | `https://ifm-deploy.vercel.app/news-data.json` — imports the existing back catalogue on first publish |

Then deploy for real:

```bash
cd ~/Documents/"investing for Mummies"/ifm-news-agency && vercel --prod
```

### 4. Point the games site at it

If Vercel gives this project a URL other than `https://ifm-news-agency.vercel.app`,
update two places in `../CLAUDE/index.html`:

- `var NEWS_API = '…/api/news';` — where the games site reads articles from
- the **"Open the newsroom ↗"** link on the News Agency screen

Then redeploy the games site.

---

## Using it

1. Open the newsroom URL.
2. Tap **Enter admin key** and paste your `IFM_ADMIN_TOKEN`. It's stored in that
   browser, so you do this once per device.
3. **Scan for news** — reads seven RSS feeds, scores everything with Claude
   Haiku, shows the top 5 that scored 6/10 or better.
4. Untick anything you don't want, then **Mummify & publish selected**. Each
   article is fetched, rewritten by Claude Opus, saved to Drive and published.
   They run one at a time so you can watch progress.

Published articles appear on both this site and the games site immediately —
no redeploy needed.

## Where things land in Drive

`My Drive → IFM Content Hub → IFM News Agency`

- **One Google Doc per article** — headline, link to the original, the mummified
  version, and the full extracted original text underneath.
- **IFM News Agency — Article Index** — a spreadsheet, one row per article:
  date, headline, source, original URL, Doc link, relevance score and reason.
- **news-data.json** — the machine-readable file both sites read. Don't hand-edit
  it; editing the Docs won't change what's published.

## Costs

- A scan: one Claude Haiku call — fractions of a cent.
- Each published article: one Claude Opus call at low effort — a cent or two.
  Only the articles you tick are charged.

## When something breaks

The status line under "Get fresh articles" says what's wrong:

- **"missing in Vercel: …"** — an environment variable from step 3 isn't set.
- **"Google connection failed"** — the refresh token expired or was revoked.
  Re-run step 2 and update `GOOGLE_REFRESH_TOKEN`.
- **"That admin key was rejected"** — tap it and re-enter the key.
- A single article can fail with *"could not extract enough text"* — a paywall
  or a JavaScript-only page. The rest of the queue carries on.

## The old local scanner

`../news-agent/` holds the original Mac-only version (`server.py`, `scan.py`,
`simplify.py`, `start-news-server.command`). Nothing points at it any more.
Two differences if you ever go back to it:

- It enforces a 24-hour cooldown via `.last_scan`; this one has none.
- It skips anything in `.seen_urls.json`, which absorbed every URL from the
  28 July scan. This scanner ignores that file — it works out what's new by
  comparing against what's actually published in Drive — so nothing is lost.
