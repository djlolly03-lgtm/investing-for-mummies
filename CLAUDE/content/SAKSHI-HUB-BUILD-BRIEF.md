# BUILD BRIEF — Customise the IFM Content Hub for Sakshi's daily workflow

> **How to use this:** paste this whole file into the content-hub conversation. It is written to be self-contained — that session needs no other context. Everything below was verified against the live code on 17 Aug 2026.

---

## 1. Context — who and why

**IFM (Investing for Mummies)** teaches financial literacy to mums in India. Instagram `@investingformummies`, **344 followers**, growing 1.47/day. Revenue goal: **fill paid B2C classes.** (Corporate/school workshops are a separate business — out of scope everywhere in this brief.)

**Sakshi** is a newly hired junior EA who has just taken on ~3 hrs/day of social work. Her scope:

| She owns | She does NOT own |
|---|---|
| Instagram **Stories** (fully, no approval) | **Main feed posts** — a content agency owns these with their own calendar |
| **Outbound engagement** — 25–30 comments/day on other accounts + FB mum groups | The 38 ready assets / their rollout — agency has a plan |
| Comments, DMs, enquiry logging | Course positioning, pricing, funnel |
| **Filming every class** + uploading/cataloguing to the hub | LinkedIn (founder Hiral does this personally) |

Attendee contact capture is **not** needed — all workshops run on pre-registered users.

**The job of this rebuild:** the hub is currently a *browsing/intel tool* for the founder. Sakshi needs a *doing tool* that opens on "here is today's work" and lets her tick it off.

---

## 2. Three design rules — everything follows from these

1. **One-click logging or it won't happen.** If logging a comment takes 20 seconds in a spreadsheet, the log is empty by week three — and the outbound number is what decides whether this role worked. It must be a ✓ button next to the post she just commented on.
2. **Mobile first.** Outbound and Stories happen on her phone. Every new component must work at **375px**.
3. **The hub tells her; she doesn't tell the hub.** No blank-page decisions. It opens knowing the date, whether there's a class today, and how far through her targets she is.

---

## 3. Current architecture — verified, reuse it, don't replace it

**Main file:** `CLAUDE/content/index.html` — single self-contained file, ~92KB, all CSS and JS inline.

**Data flow:**
```
data.js  →  window.IFM_DATA = { catalogue[289], tracker[21], competitors[13] }
            (machine-maintained by Claude)
                    ↓  merged with, and overridden by
Google Sheets  →  fetched live as CSV via gviz
                    ↓
Rendered into  →  <section id="tab-*"> blocks
```

**Sheet IDs — `CONFIG` block, ~line 474:**
```js
const CONFIG = {
  catalogueSheetId:  "1VzLzQzTS_-2w7jxkufJUXMF3r0EeOy0le19ZRUy8e-0",
  trackerSheetId:    "117Ht7okUaGlF_XrbrOeTc2gha2WHa80Hz0DIeamihAM",
  certSheetId:       "12s0Vz5WmnfweUlA_vNsMMHE0oou9klXWWkSSs_pb4Bk",
  competitorSheetId: "1K1g47i9eyqFeXh9vOInhB0Dcjo_h_Jf2dAFZGLEYMeE",
};
const csvUrl = id => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&_=${Date.now()}`;
const ADMIN  = /[?&]admin=1/.test(location.search);
```

**Existing tabs:** Library · Creator Tracker · Certificates · Competitors · Published
**Tab switching (~line 1190):** `.tab[data-tab]` buttons toggle `#tab-<name>` sections via `classList.toggle('hidden', ...)`. Simple show/hide against a hardcoded array — extend that array.

**Human-editable catalogue fields (~line 1100):**
`['status','published date','ig link','reach','likes','comments','saves','shares','notes','venue']`

**Write-back pattern — already working, copy it:**
`competitors-webapp.gs` is an Apps Script web app doing `add` / `del` / `setorder` against the competitor sheet. Shared key `KEY = 'ifm-comp-7Q2x9m'` (matches `COMP_KEY` in index.html), called via `POST` with `mode:'no-cors'`, gated on `?admin=1`. **Sakshi's logging is the same shape — reuse this pattern exactly.**

**`comp-posts.json` shape:**
```json
{ "<handle>": [ {u, t, type, likes, likes_str, comments, date, foreign_owner?} ], "_meta": {...} }
```
`t` = local thumbnail path under `comp-thumbs/posts/`. **`foreign_owner` marks posts scraped from someone else's grid** — these have already polluted stats and must be filtered out.

**Responsive:** viewport meta present, 5 media queries (`560px`, `640px`, `760px`). Mobile work is achievable.

---

## 4. The changes

### Change 1 — "Today" tab (biggest change, becomes her landing screen)

New first tab, default view for her. Two stacked blocks:

**Block A — status**
```
┌────────────────────────────────────────────┐
│  Monday 25 August                          │
│  🎥 CLASS TODAY — Podar School, 2pm        │
│     Film it. Upload same day.              │
├────────────────────────────────────────────┤
│  Outbound      ▓▓▓▓▓▓░░░░   14 / 25        │
│  Stories       ▓▓▓▓░░░░░░    2 / 5         │
│  Unanswered    ● 3 comments  ● 1 DM        │
│  Enquiries     2 new, 1 needs follow-up    │
├────────────────────────────────────────────┤
│  🔥 6-day streak                            │
└────────────────────────────────────────────┘
```

**Block B — today's outbound queue**, immediately below on the same screen:
```
┌──────────────────────────────────────────┐
│ [thumb]  @nehanagar · reel · ♥ 404       │
│          "Tax saving myths"              │
│          [ Open ↗ ]      [ ✓ Commented ] │
└──────────────────────────────────────────┘
```

**✓ Commented** writes a row to the Outbound sheet and advances the counter. That is the entire interaction — no typing, no tab-switching. An optional collapsed "what I said" one-liner is fine, but it must never block the ✓.

**Class-day banner** reads from the sessions sheet; turns red on class days and stays until footage is logged. This is how "film every class" gets enforced by the tool rather than by memory.

> **Do not let this tab become a dashboard.** It's a to-do list — four counters and a queue. The moment it grows charts, it stops being something she opens every morning.

---

### Change 2 — outbound queue generation

Generate from `comp-posts.json`, with three filters:

1. **Exclude `foreign_owner` posts** — wrong targets, and they've already caused bad data.
2. **Exclude already-commented**, matched by post URL against the Outbound sheet.
3. **Rank by return** — accounts that have produced replies/follows float to the top (see Change 3).

#### 🆕 Change 2b — suggested comments on every queue card *(added 18 Aug — build with Phase 1)*

**`content/outbound-drafts.json` now exists** — Claude studies each fresh post's cover and writes a ready-to-use comment in IFM's voice. First batch is live: 21 rows for the current queue (18 active drafts, 6 HIGH priority, 3 deliberate SKIPs).

**Render on each queue card:**
- The **suggested comment** in a collapsible block, with a **📋 Copy button** (`navigator.clipboard.writeText`)
- The **priority chip** — HIGH / MED / LOW / SKIP — and sort the queue by it (HIGH first). SKIP rows show greyed with their reason (e.g. "one comment per series")
- The one-line **post_gist** so she knows what she's walking into before tapping Open
- The **why** line, small/muted — it's the ongoing training

**Match rows to queue cards by post URL (`u`)**; fall back to `thumb`. Cards with no draft render as today.

**The workflow becomes:** read gist → Open ↗ → check the post matches the gist → Copy → paste, tweak a few words → post → ✓ Commented.

**Refresh ritual:** the drafts file is regenerated by Claude in the *main* conversation each time comp-posts.json is rescraped (currently weekly, ideally per-scrape). The hub only reads the file — generation stays outside. Show the file's `generated` date near the queue header; if it's older than the scrape, show "drafts stale — ask Claude to refresh".

**Keep the `note` field's rules visible** as a collapsible ℹ️ near the queue header — it tells her to open the post first, tweak the words, and respect the SKIPs.

### ⚠️ Blocking gap — the roster is too small

**13 accounts × 6 posts = 78 targets. She needs 125/week.** The queue runs dry in three days.

The competitor roster was built for **intel** (13 accounts to understand). Outbound needs **volume** (30+ accounts whose audiences overlap). Different jobs, shouldn't share a list.

**Build a second roster, "Engagement Targets"** — same sheet structure, separate sheet, not shown in the Competitors intel view:
- 25–30 mum / parenting / personal-finance accounts, **mid-size (5k–50k followers)** where a thoughtful comment is actually visible
- Facebook mum groups (the scrape doesn't touch these at all today)
- **Deliberately not the big creators** — a comment under a 68k-like Rachana Ranade post is invisible
- Scrape **10–12 posts each** rather than 6 (a scrape parameter, not a rebuild)

*Populating this roster is a content task, not a code task — but Phase 1 is only as good as the list feeding it.*

---

### Change 3 — competitor cards show outbound return

Add a strip to each card:
```
34 comments left · 6 replies · 3 follows gained  →  8.8% return
```
Turns a static intel board into a **performance-ranked queue**, answering the one question nothing else in the stack can: *which accounts are worth her 75 minutes?* After a month the roster sorts itself.

---

### Change 4 — Enquiries tab

**The tab that fills cohorts.** Everything else is upstream of it.

Pipeline view: **New → Replied → Nurturing → Converted / Lost**, plus a mobile **"+ Add enquiry"** form completable in under 15 seconds (name, contact, source, what they asked, status).

Header stats: total · this month · converted · awaiting reply · **follow-up date passed** (highlighted). That last one matters most — enquiries die from being forgotten, not refused.

---

### Change 5 — Sessions tab (filming compliance)

One row per class: date · venue · filmed ✓ · uploaded ✓ · catalogued ✓.

**Any class with no footage shows red.** That's the whole point — "film every class" decays unless something visibly tracks it.

From a session row, jump straight to adding catalogue entries **pre-filled with venue and date**, so she types a title and nothing else.

---

### Change 6 — Stories tracking

The hub tracks feed posts and **not Stories at all** — now her main surface. Without this the largest part of her day is invisible at review, and she's judged on numbers she doesn't control.

Minimum viable: one row/day — **stories posted · poll/question responses · replies received · link taps · students tagged · re-shares earned.** Logged via a **+1 button on the Today tab** as she posts, not reconstructed at day's end.

### Change 6b — student tagging queue *(added 17 Aug — build this alongside 6)*

**IFM has 116 past students** (72 mums, 27 teens, 17 young adults) in the students dashboard. Tagging them in Stories is high-leverage: tagged alumnae often **re-share to their own Story**, putting IFM in front of a warm mums audience for free. At 344 followers, one alumna with 800 followers re-sharing beats a week of posting.

**Target: 8–10 *distinct* students tagged per week** — with 116 students that cycles the full base roughly every 3 months.

**Build a tagging queue, same pattern as the outbound queue:** a list of students **sorted by least-recently-tagged first**, so rotation is automatic and she never re-tags the same handful. Each row needs:

| Field | Why |
|---|---|
| `consent_to_tag` (Y / N / not asked) | **Required — see below** |
| `last_tagged` date | Drives the sort order |
| `times_tagged` | Spots over-use |
| `reshared` count | The metric that actually matters — it's the free reach |

A one-tap **"Tagged ✓"** button stamps `last_tagged` and increments the count, plus a separate **"They re-shared ✓"**.

> **⚠️ Consent is not optional here.** Being publicly tagged as attending a finance class is sensitive — it can read as admitting financial naivety, and it touches family privacy. **Nobody gets tagged without an explicit yes**, captured in `consent_to_tag`. The queue must exclude anyone not marked `Y`, and never surface a student who hasn't been asked as if they were available. This is a data-protection matter as much as a courtesy (DPDP applies).

---

### Change 7 — Hiral's summary strip *(the other side of this build)*

Everything above is Sakshi's *doing* surface. Hiral needs a **verifying** surface — and it must be small enough to read in ten seconds, or it won't get read.

A single strip at the top of the **default (non-Sakshi) view**, showing *this week*:

```
OUTBOUND 118/125  ●   CLASSES FILMED 2/2  ●   ENQUIRIES 7 ↑   ·   followers +19
```

**Only three metrics carry a status colour** — they're the ones that predict everything else:

| Metric | 🟢 | 🟡 | 🔴 |
|---|---|---|---|
| Outbound comments this week | 125+ | 75–124 | under 75 |
| Classes filmed ÷ classes held | 100% | — | any class unfilmed |
| Enquiries logged this month | rising | flat | zero |

**Follower growth is shown without a colour.** It's the outcome, it's noisy at 344 followers, and colouring it would invite week-to-week reactions to statistical noise.

**Design constraints:**
- **One line. No charts.** This is a smoke alarm, not a dashboard. If it grows graphs, it stops being glanceable and starts being ignored.
- Clicking a metric drills into the underlying log — but the strip itself never expands inline.
- **Read-only.** Hiral's view never writes to Sakshi's logs.

---

## 5. What stays untouched

- **Library** — structure is right; she adds session rows
- **Creator Tracker** — becomes the agency's board; she reads it so Stories complement the feed rather than duplicate it
- **Published** — already computes ER vs live follower count and tiers posts 🔥 Worked / OK / Low reach. It's the agency's scoreboard now; her Friday note reads off it
- **Certificates** — untouched, hidden from her view

---

## 6. Plumbing

### New sheets (3)
| Sheet | Columns |
|---|---|
| **Outbound Log** | date · platform · account · post URL · gist · replied (Y/N) · followed (Y/N) |
| **Enquiries** | date · name · contact · source · asked · interested in · replied · follow-up date · status · notes |
| **Daily** | date · stories posted · responses · replies · link taps — plus session rows: date · venue · filmed · uploaded · catalogued |

**These columns already exist** in `CLAUDE/hiring/IFM Social Trackers.xlsx` (tabs: Outbound Log, Enquiry Log). Upload those two tabs to Drive as Google Sheets and add the IDs to `CONFIG` — nothing needs re-keying.

### New webapp actions
`log_outbound` · `log_story` · `add_enquiry` · `update_enquiry` · `log_session`

One new Apps Script file, same key-check structure as `competitors-webapp.gs`.

### View gating
`?who=sakshi` → lands on **Today**; shows Today / Outbound / Enquiries / Sessions / Library; hides Certificates and admin. Default view keeps everything and gains a read-only summary of her numbers.

Cheap: one `const WHO` plus a filter on the existing tab array.

---

## 7. Build order

| Phase | Scope |
|---|---|
| **1** | **Today tab + outbound queue + one-click ✓ logging + Outbound sheet & webapp action.** Without this nothing else gets used; with only this, the role is trackable. |
| **2** | Enquiries tab + sheet — the cohort-filling one · **Hiral's summary strip (Change 7)** — cheap once the logs exist |
| **3** | Sessions tab + class-day banner — makes "film every class" self-enforcing |
| **4** | Stories logging · **student tagging queue (6b)** · competitor return-rate strip · `?who=` gating |

**Parallel, non-code:** populate the Engagement Targets roster (25–30 accounts).

---

## 8. Gotchas

- **gviz CSV is cached.** Existing code waits ~4.5s after a write before refetching — reuse that, don't fight it.
- **`no-cors` POSTs return nothing.** You cannot read success/failure. Write optimistically, update UI immediately, reconcile on next load — the existing competitor add/delete already does this.
- **The write key sits in client JS.** Anyone with the URL and a look at source can write. Fine for an unlisted internal dashboard of competitor data — but **the Enquiries sheet will hold real names and phone numbers**, a different risk class. **Make an access decision before Phase 2, not after.** (India's DPDP Act applies to this data.)
- **375px or it doesn't ship.** A queue card that only works on desktop is a queue that doesn't get worked.
- **⚠️ DEPLOY RULE: always deploy from *inside* `CLAUDE/`, never the parent directory.** Deploying from the parent wipes the entire site and 404s everything.

---

## 9. Definition of done for Phase 1

- [ ] Sakshi opens the hub on her phone and sees today's number without tapping anything
- [ ] She can work a queue of ≥25 fresh posts without hunting for targets
- [ ] Logging one comment = one tap
- [ ] The outbound count is visible to Hiral without asking Sakshi
- [ ] Nothing in the flow requires opening a spreadsheet
