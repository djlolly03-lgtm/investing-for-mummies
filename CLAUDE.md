# Investing for Mummies — operating notes

Read this before touching anything. Written 7 Sep 2026 after a DX audit found that every
operating fact about this project lived only in one machine's local memory directory.

---

## ⛔ The one rule that can destroy the site

**Always deploy from *inside* `CLAUDE/`. Never from the parent directory.**

```bash
cd "/Users/lollyg/Documents/investing for Mummies/CLAUDE" && vercel deploy --prod --yes
```

`CLAUDE/` is the Vercel deploy root. Deploying the parent folder wipes the entire site
and 404s every live URL — including the WordPress iframes that point at these files.
Never reorganise `CLAUDE/` either: moving a file there changes its public URL.

**Do not deploy without the user's explicit approval.** The single standing exception is
the `weekly-competitor-refresh` scheduled task (see below), and note that its
auto-deploy ships *the whole working tree*, not just its own files.

---

## What this repo is

| Path | What it is |
|---|---|
| `CLAUDE/` | The live site + all games. Deploy root. See `CLAUDE/MANIFEST.md`. |
| `CLAUDE/content/` | The **Content Hub** — the internal catalogue app at `/content/`. |
| `deck-build/` | Rebuilds the team operating-guide deck. Self-contained; `node build_guide.js`. |
| everything else | Assets, deliverables, docs. See `README.md` for the folder map. |

---

## The Content Hub

Live: **https://ifm-deploy.vercel.app/content/** · password `IFMcontent123`
(soft lock only — client-side SHA-256 gate; the data files underneath are publicly fetchable).

Single-file app: `CLAUDE/content/index.html` (~1900 lines, no build step). Six tabs:
Today · Library · Creator Tracker · Certificates · Competitors · Published.
`?who=sakshi` gives the simplified daily view; `?admin=1` reveals delete/catalogue buttons.

### Where the data comes from

| Store | ID / location | Feeds |
|---|---|---|
| Catalogue (machine) | `CLAUDE/content/data.js` — `window.IFM_DATA = {...};` | Library, stats |
| Catalogue v2 (human) | Sheet `1N6Gmox-OMxYTYzej8f59jFSlIwVxQ5HSeUzt4U04Rjc` | Overrides data.js on tag/status fields |
| Competitors | Sheet `1K1g47i9eyqFeXh9vOInhB0Dcjo_h_Jf2dAFZGLEYMeE` | Competitors tab |
| Creator tracker | Sheet `117Ht7okUaGlF_XrbrOeTc2gha2WHa80Hz0DIeamihAM` | Creator Tracker |
| Certificates | Sheet `12s0Vz5WmnfweUlA_vNsMMHE0oou9klXWWkSSs_pb4Bk` | Certificates |
| Outbound log | Sheet `1MvyewFjHW3aZNDo5en-mntKbPxwYejQpMsjQLdxTmEQ` | Today counter + streak |
| Write endpoint | Apps Script `/exec`, keys in `index.html` | Add competitor, log outbound |

Sheets are read as CSV via `gviz/tq?tqx=out:csv` and **must be shared "anyone with the
link → Viewer"** or the tab shows setup instructions instead of data.

### Drive folders

| Folder | ID |
|---|---|
| **IFM Content Drop** (everyone dumps here) | `1mwN-stIOLrCabOP8Vjhp6ZG_6ARzWiiL` |
| `_Trash` (30-day buffer inside it) | `1tYW_y3F5Sl6AQJbKXD6JWTJn_023Ud7-` |
| **Hiral — Media Kit** (agency link) | `1OPOAbJ_MsKxrz7Ijq6tLaxdA6eMr6Vw4` |
| Sakshi uploads | `11MncEXMdZy3sP2pTt0zfibLbEn30ldOO` |
| Certificates | `1CasigFU-SKr_X__0d7ywpjTE9-jmDcgA` |
| Aakara delivery tree | `1G-T-sRyu57CaISGa2Et0_FyKzeSqclCl` |

**Aakara gotcha:** they deliver *finished files* in `Month → Carousels|Reels|Stories → Topic`.
The "IFM Creatives_<Month>" Slides deck is a **planning calendar only**. A sync pointed at
the deck missed 29 finished posts for two months. Scan the folder tree, not the deck.

---

## ⚠️ Asset size budget — exceed it and deploys bloat until they break

- Thumbnails **≤25KB** — `ffmpeg -nostdin -y -i <src> -vf "scale='min(400,iw)':-1" -q:v 5`
- Preview clips **≤200KB** — `ffmpeg -nostdin -y -t 12 -i <src> -vf "scale='min(480,iw)':-2" -c:v libx264 -crf 30 -preset veryfast -an -movflags +faststart`
- **Masters never enter the repo.** Full-res photos, finished reels and raw footage live on
  Drive and are linked via the row's `drive link`.
- `.vercelignore` blocks all `*.mp4/mov/pdf/md/py/gs`; only `content/{thumbs,clips,teasers,game-assets,comp-thumbs,ifm-posts}` are whitelisted back in.

## Tooling gotchas

- Use `/usr/bin/python3` for anything touching images or JSON — it has Pillow. Homebrew's
  python3 does **not**. Add `export PATH="/opt/homebrew/bin:$PATH"` for ffmpeg/pdftoppm.
- Edit `data.js` by parsing the JSON between `window.IFM_DATA = ` and the trailing `;`
  with `/usr/bin/python3` — never with a regex-in-place substitution.
- Instagram cannot be scraped logged-out for post grids. The weekly refresh drives a
  logged-in browser profile at `~/.gstack/chromium-profile`.
- Reach and impressions are **not** obtainable by scraping — engagement rate is the
  honest stand-in. Only the Instagram Graph API (Business account + token) would give reach.

## Scheduled tasks (`~/.claude/scheduled-tasks/<name>/SKILL.md`)

| Task | When | Deploys? |
|---|---|---|
| `daily-content-processor` | 07:38 daily | No — stages only |
| `ifm-daily-brief-email` | 08:07 daily | No |
| `ifm-followers-daily` | 20:08 daily | No |
| `weekly-competitor-refresh` | Mon 09:39 | **Yes** — the one standing exception |
| `weekly-aakara-refresh` | *disabled* | superseded by daily-content-processor |

## Credentials — machine-local, not in this repo

- Gmail app password → macOS Keychain, service `ifm-daily-brief-smtp`
- GA4 service account → `~/.ifm/ga-service-account.json` (chmod 600)
- Instagram session → `~/.gstack/chromium-profile`

None of these travel with the repo. On a new machine the daily brief and the
Instagram scrapes will fail until they are re-created.

## Working-tree discipline

`CLAUDE/content/data.js` and `index.html` are edited constantly and were left uncommitted
for six weeks. More than one Claude session can be open on this repo at once, and **any
deploy publishes the whole shared working tree** — including another session's in-flight
edits. Commit after a meaningful change rather than letting the tree drift.
