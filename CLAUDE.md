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

### ⚠️ There are TWO front ends and TWO catalogues

`/content/` (the hub, six tabs) reads `content/data.js`.
`/content/v1-prototype/` (the searchable Library built 16–17 Sep 2026) reads
`content/v1-prototype/v1-catalogue.js`, which is **generated from data.js** by
`v1-prototype/backfill.py` and must never be hand-edited — hand corrections go in
`v1-prototype/enrichment.json`, which is applied last and overrides the rules.

Decision 17 Sep 2026: **run both for now, converge on one later.** So anything that writes
to `data.js` must finish by running `backfill.py`, or the Library silently freezes while the
hub grows. `daily-content-processor` now does this. Anyone else editing `data.js` must too.

The Library also hides any asset with **no thumbnail and no playable preview** — a row with
no file is not an asset. A staged row without a thumbnail never appears there at all.

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
  honest stand-in until a Graph token exists. `content/analytics/fetch_ig.py` is the real
  route; see "Instagram Graph token" under Credentials for the one-time setup.

## Scheduled tasks (`~/.claude/scheduled-tasks/<name>/SKILL.md`)

| Task | When | Deploys? |
|---|---|---|
| `daily-content-processor` | 07:38 daily | No — stages only |
| `ifm-daily-brief-email` | 08:07 daily | No |
| `ifm-followers-daily` | 20:08 daily | No |
| `weekly-competitor-refresh` | Mon 09:39 | **Yes** — the one standing exception |
| `weekly-aakara-refresh` | *disabled* | superseded by daily-content-processor |

## Credentials — machine-local, and how to rebuild them

None of these are in the repo, and none travel with it. On a new machine — or if this Mac
dies — the daily brief and both Instagram jobs stop until each is re-created by hand.
Nothing recovers them automatically; this is the runbook.

**Never commit any of these, and never paste them into a file inside the repo.**

### 1. Gmail app password → macOS Keychain
Breaks: the 08:07 daily brief email (`ifm-daily-brief-email`).
Symptom: task reports "could not read app password from Keychain".

```bash
# Generate a new 16-char app password at myaccount.google.com/apppasswords
# (Google account: djlolly03@gmail.com), then store it:
security add-generic-password -a djlolly03@gmail.com -s ifm-daily-brief-smtp -w '<APP PASSWORD>' -U
# verify:
security find-generic-password -s ifm-daily-brief-smtp -w >/dev/null && echo OK
```

### 2. GA4 service account → `~/.ifm/`
Breaks: website + games traffic reporting (`content/analytics/fetch_ga.py`).
Note this pipeline has never fully run — the service account still needs Viewer access
on the GA property, and the numeric property ID is separate from the `G-` measurement ID.

```bash
# Google Cloud Console → enable "Google Analytics Data API" → create a service account
# → download its JSON key. Then:
mkdir -p ~/.ifm && chmod 700 ~/.ifm
mv ~/Downloads/<downloaded-key>.json ~/.ifm/ga-service-account.json
chmod 600 ~/.ifm/ga-service-account.json
echo '<NUMERIC PROPERTY ID>' > ~/.ifm/ga-property-id
# then in GA: Admin → Property access management → add the key's client_email as Viewer
```

### 3. Instagram session → `~/.gstack/chromium-profile`
Breaks: `weekly-competitor-refresh` and `ifm-followers-daily`. Both have a login guard and
will stop and notify rather than write bad data, so an expired session is safe but blocking.

Recovery is manual and cannot be scripted: open the GStack browser and log into Instagram
as @investingformummies. The session then persists in that profile directory.

```bash
$HOME/.claude/skills/gstack/browse/dist/browse connect   # then log in by hand
```

### 4. Instagram Graph token → macOS Keychain (`ifm-ig-graph-token`)
Feeds: `content/analytics/fetch_ig.py` → `content/ig-insights.json`.
Breaks: reach / views / saves reporting. Nothing scheduled depends on it, so its absence
is a WARN not a FAIL — but it is the **only** route to reach. Scraping cannot get it at
any login level, which is why the hub otherwise shows engagement rate as the stand-in.

Two logins exist and they are not the same thing. **Use Instagram Login** — it needs no
Facebook Page. Business Login (via `graph.facebook.com` and a linked Page) is only worth
the extra setup if IFM ever runs Meta ads. `fetch_ig.py` auto-detects which one a token
came from and caches the answer in `~/.ifm/ig-user-id`.

```
1. Instagram app → Settings → Account type → switch to Professional (Business).
2. developers.facebook.com → Create App → "Business".
3. Add the "Instagram" product → "API setup with Instagram login".
4. Add @investingformummies, generate a token with scopes:
      instagram_business_basic, instagram_business_manage_insights
5. security add-generic-password -a ifm -s ifm-ig-graph-token -w '<TOKEN>' -U
6. IFM_IG_APP_SECRET='<app secret>' /usr/bin/python3 \
     "CLAUDE/content/analytics/fetch_ig.py" --exchange     # 1 hour → 60 days
7. /usr/bin/python3 "CLAUDE/content/analytics/fetch_ig.py" --check
```

**The failure mode to design against is the 60-day expiry.** A step-4 token lasts one
hour; `--exchange` makes it 60 days; `--refresh` extends it another 60 and can be run any
time after day 1. Nothing renews it automatically, so an unrefreshed token dies quietly.
`scripts/ifm-check-credentials.sh` section 4 reads the expiry recorded in
`~/.ifm/ig-token-meta.json` and warns under 14 days. Past expiry, refresh no longer works
and the token has to be generated again in the app dashboard.

Two API details that cost real time if unknown:
- **`impressions` no longer exists** — it was replaced by `views` in v22. Asking for it
  fails the *entire* call, not just that metric. `insights()` retries metric-by-metric on
  a batch failure for exactly this reason, so a version change degrades to one missing
  number instead of an empty file.
- **`v26.0` was the newest version answering on 8 Sep 2026** (v27+ returned "Unknown path
  components"). Meta retires a version ~2 years after release. Bump `API_VERSION` when a
  call fails with a version error, not on a schedule.

Rate limit is ~200 calls/hour/user and each post costs one insights call, so a 30-day
window with daily posting is close to the ceiling. The script sleeps 0.4s between posts.

⚠️ `ig-insights.json` lands in `CLAUDE/content/` and is therefore **publicly fetchable**,
like `data.js` and `ifm-published.json` — the hub's password gate is client-side only.
That is the existing accepted tradeoff, but it now covers reach and follower numbers.
Block it in `.vercelignore` if that stops being acceptable.

### If you are setting up a second machine
Copy nothing. Re-run all three procedures above. The repo plus this file is everything
else you need — the sheets and Drive folders are shared by account, not by machine.

## Working-tree discipline

`CLAUDE/content/data.js` and `index.html` are edited constantly and were left uncommitted
for six weeks. More than one Claude session can be open on this repo at once, and **any
deploy publishes the whole shared working tree** — including another session's in-flight
edits. Commit after a meaningful change rather than letting the tree drift.

## Offsite backup — GitHub

Set up 7 Sep 2026. Until then this repo had **no remote at all**: 19 commits and six
weeks of uncommitted work existed on exactly one Mac, with no second copy anywhere.

**Remote:** `origin` → private repo under the `djlolly03-lgtm` GitHub account.
The same account already holds `third-eye-dashboard` and `CC-Tracker`.

### Why pushes were failing everywhere

Not a per-repo problem. macOS git is configured (in
`/Library/Developer/CommandLineTools/usr/share/git-core/gitconfig`) to use the
`osxkeychain` credential helper, and **the github.com keychain entry was gone** —
expired or deleted. The helper returned nothing, git fell back to prompting for a
username, and a non-interactive session cannot answer a prompt. Hence
`could not read Username for 'https://github.com'`.

**Auth is now an SSH key, not HTTPS.** `~/.ssh/id_ed25519_github`, registered on the
account as "IFM Mac auto-backup", wired up in `~/.ssh/config` with `AddKeysToAgent` +
`UseKeychain` so the unattended nightly push never prompts. All three remotes use
`git@github.com:` URLs. SSH keys do not expire, which is the point — the whole outage
was caused by a credential that silently lapsed.

Test it with `ssh -T git@github.com` — it should greet you as `djlolly03-lgtm`.

Two things that do **not** work here, so don't burn time on them:
  - `gh auth login` cannot be driven programmatically. Its prompt ignores piped stdin
    and `expect`, even with a pty and TERM/LINES/COLUMNS set. It works fine when a
    human types into it; it just can't be automated.
  - The Chrome extension cannot script github.com — GitHub's CSP blocks injection on
    `/settings/*` and `/new` alike. Creating a repo or adding a key is a manual step.

### The nightly job

| | |
|---|---|
| Script | `~/.local/bin/git-autobackup.sh` |
| launchd | `~/Library/LaunchAgents/com.lollyg.gitautobackup.plist` — daily 21:30 |
| Log | `~/.local/state/git-autobackup.log` (and `~/Library/Logs/git-autobackup.log`) |
| Run by hand | `~/.local/bin/git-autobackup.sh` |

It commits anything outstanding and pushes, for three repos: this one, `agency-os`, and
`THIRD EYE CHECK INs`. It skips a repo mid-merge/rebase or on a detached HEAD, never
force-pushes, and raises a macOS notification if any repo fails — a backup job that
fails silently is not a backup.

**It does not deploy.** Committing and pushing are not deploying; the Vercel deploy rule
at the top of this file is untouched and still needs explicit approval.

Auto-commits are labelled `Auto-backup <date>` and are explicitly unreviewed. They are a
safety net, not a substitute for the working-tree discipline above — a tree that is
already committed produces no auto-commit at all.

### Secrets

A live `ANTHROPIC_API_KEY` was found committed in the 30 Jul baseline commit and had
been sitting in plaintext at `projects/news-agent/.env` since 4 May. History was
rewritten to purge it before the first push. `.env`/`*.env` are now gitignored.

Before adding a repo to the backup list, grep it for secrets — pushing is the moment a
mistake becomes permanent. `.gitignore` also excludes `*.raw`/`*.npy` (216 MB of
regenerable render buffers) and `*.bak`/`*.orig`; without those the baseline commit
would have been 265 MB instead of 45 MB.

## The media that GitHub does *not* cover

Audited 7 Sep 2026. GitHub holds ~45 MB of a 7.7 GB folder. The other 98.6% is excluded
by `.gitignore` — correctly; GitHub caps files at 100 MB and is not a media store. Split:

| | |
|---|---|
| ~2.9 GB | regenerable scratch — `_shots/`, `diag/`, `out/`, `seq/`. Safe to lose. |
| ~3.6 GB | finished work + source media. **Not** safe to lose. |

The 3.6 GB is `deliverables/`, `Nursery Rhymes/`, `highlight-reel-assets/`,
`ai-generations-aug2026/`, `course-docs-aug2026/`, `brand/`, `documents/`.

**On 7 Sep 2026 that 3.6 GB had no backup anywhere on this machine.** All four
possibilities were checked and all four were empty: Time Machine had no destination
configured and had never run, `~/Documents` is not a usable backup (see the iCloud note below),
Dropbox was installed but held 0 B, and no external drive was mounted.

### The fix — done 7 Sep 2026

`~/.local/bin/media-backup.sh` — copies to `gdrive:IFM Machine Backup` using the
`rclone` remote that already existed (20 TiB, ~7.7 GiB used).

    ~/.local/bin/media-backup.sh --dry-run   # shows what would go, sends nothing
    ~/.local/bin/media-backup.sh             # later runs send only what changed

**First run completed 7 Sep 2026, 23:02** — 1,767 files, verified folder-by-folder with
`rclone check --one-way`: deliverables 50, ai-generations 74, course-docs 11,
highlight-reel-assets 1147, brand 72, Nursery Rhymes 396, documents 17. Zero missing.
Log: `~/.local/state/media-backup.log`.

The set was trimmed from 3.56 GB to **2.55 GB** by three exclusions, all verified before
being applied — don't undo them without re-checking:

  - **`work/ w2/ w5/ w30/ w45/`** (269 MB) — lyric-video build dirs, each holding only
    `body.mp4` + `concat.txt`. Different byte sizes, so separate render attempts at the
    xfade timing, not copies. Regenerable from `build*.py` plus the source clips.
  - **`deliverables/videos/nursery-rhymes/`** (258 MB) — md5-identical to the finals
    already inside `Nursery Rhymes/`. Nine files that were being counted twice.
  - **`highlight-reel-assets/mummies/`** (504 MB) — curated re-cuts of shoots whose
    originals already sit in Drive's Content Library (~22.9 GB: Photo gallery 7.6 GB,
    Session photos & clips 4.9 GB). Re-derivable if the curation is redone.

Two deliberate choices: it uses `rclone copy`, **never `sync`** — a file deleted locally
is kept on Drive, because a backup that deletes what the source lost is not a backup.
And an interrupted run costs nothing: rclone skips what is already uploaded, so just
re-run it. That was exercised for real — the first attempt died with the session at 49
files and resumed with zero rework.

Not scheduled. Run it by hand after a batch of new media, or add a launchd job alongside
`com.lollyg.gitautobackup` if it proves worth automating.

### What is still NOT backed up

- **Everything outside that list** — `CLAUDE/` media, `projects/`, `teaching-assets/`,
  `game-screens-aug2026/`, `workshop-photos-aug2026/`, and every other folder in
  `~/Documents`. Neither GitHub nor this script touches them.
- **Time Machine has never run on this Mac.** It remains the only thing that would cover
  the whole machine, and it is still unconfigured. A folder-level Drive sync is not a
  substitute. A real loss already happened once: the "Goa Workshop 18 Jul 2026 — raw
  video masters" Drive folder was emptied by mistake and no copy exists anywhere.

## ⚠️ `~/Documents` IS iCloud-synced — and it corrupts git

Corrected 9 Sep 2026. An earlier note in this file claimed `~/Documents` was "a real local folder
(not iCloud-synced)". That is **wrong**, and the mistake matters because it was used as evidence that
the folder was safe.

**Verified:** macOS "Desktop & Documents Folders" sync is ON —
`defaults read com.apple.finder FXICloudDriveDocuments` returns `1`, and
`~/Library/Mobile Documents/com~apple~CloudDocs/Documents` is a symlink to `/Users/lollyg/Documents`
dated **October 2018**. Everything in `~/Documents`, including this repo, has been syncing for years.

**What it did.** During a heavy multi-agent build, iCloud created **1,115 " 2" conflict copies**
across the repo — **949 of them inside `.git`**, including `.git/index 2` and, worst,
`refs/heads/main 2` holding a **null SHA** (`0000...`). `git fsck` reports errors for those.

Nothing was lost: every copy was byte-identical to a surviving original, `git show-ref` lists only
the real `refs/heads/main`, and history is intact. But it was a near miss — iCloud copied the branch
pointer at the instant it was empty mid-write. If a future conflict resolves the other way (iCloud
overwriting the original rather than copying it), `refs/heads/main` becomes a null pointer and the
branch appears to vanish. `.git` is a database written in small rapid bursts, which is exactly the
access pattern iCloud handles worst.

**Identifying a conflict copy:** mode `-rw-------` with no extended attributes, versus a normal
file's `-rw-r--r--@`. They are junk — git ignores `main 2` because it is an invalid refname.

**What to do:**
- Heavy build work should happen OUTSIDE `~/Documents`. The Scam Slingshot build runs from
  `~/Developer/scam-slingshot` for this reason and syncs back before publishing.
- The real fix is System Settings → Apple ID → iCloud → iCloud Drive → Options → turn off
  "Desktop & Documents Folders" (or move the repo). **Be careful in that dialog** — macOS moves
  files when you disable it, and the wrong choice is how people think their Documents folder emptied.
- The `.git` conflict copies are still present and safe to remove (all verified to have surviving
  originals), but removing files inside `.git` should be a deliberate, confirmed action.
- **iCloud is not a backup.** It syncs, which means it faithfully replicates a deletion. The rclone
  media backup and the GitHub remote are the actual backups.
