# IFM Content Hub — Visual & Information-Design Audit
### Creator Tracker · Certificates · Competitors · Published

**Audited:** 7 Sep 2026
**Target:** https://ifm-deploy.vercel.app/content/ (live), source `CLAUDE/content/index.html` (1,714 lines)
**Method:** live DOM measurement at 1440×900 and 375×812, `getBoundingClientRect()`, computed styles, element counts, WCAG contrast computed in-page. No file was edited.

---

## Scores

| Tab | Score | One-line verdict |
|---|---|---|
| **Creator Tracker** | **3.5 / 10** | The board itself is good. The header above it is an unbounded list that already needs 4 rows and 320px for 7 items, and the tab's two halves are organised on two different, non-intersecting axes. |
| **Certificates** | **4 / 10** | Clean card, but 5/5 cards render an emoji placeholder instead of the photo the tab exists to show, everything is "To post", and there is no structure at all beyond a flat grid. |
| **Competitors** | **6 / 10** | Strongest information design of the four (real sorting, real synthesis). Undermined by burying the table 1,242px down on desktop / 2,361px on mobile behind a data-entry form, and by 13 of 23 rows having no metrics. |
| **Published** | **5.5 / 10** | Good chart, good "what's working" panel. But the page shows **five different counts of how many posts are published**, and the "Verdict" column is a mathematical artefact presented as a judgement. |

---

## THE CREATOR TRACKER SCALE PROBLEM
### (the owner's complaint, investigated)

> *"Creator Tracker, the first set of boxes is completely unstructured data — how will this look in 6 months?"*

**The complaint is correct, and it is worse than it looks.** Three separate things are wrong, and only one of them is CSS.

### What is actually there right now (measured)

`#tracker-summary` at 1440px viewport (container width 1148px):

| | Measured |
|---|---|
| Boxes rendered | **7** |
| Block height | **320px** |
| Rows it wraps onto | **4** (only 2 boxes fit per row) |
| Individual box widths | 445, 442, 466, 488, 439, 453, 483 px — **no two the same** |
| Same `.stat` class on the Competitors tab | 160, 123, 158, 116 px |

The seven buckets are:

```
June 2026        20/23   ·  7 published
July 2026         4/24   ·  4 published
August 2026       2/16   ·  2 published
September 2026    0/17   ·  0 published
RSS 2026          0/5    ·  0 published
Stree 2026        0/13   ·  0 published
BALSABHA 2026     0/1    ·  0 published
```

Board below: **99 cards** in 4 status groups (11 / 49 / 4 / 35), board height **9,112px**, document height **9,866px** desktop and **54,491px** on a 375px phone.

### Root cause 1 — the boxes are sized by their label, not by a grid

```css
/* line 96 */
.tracker-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
```

versus the header stat bar 70 lines earlier:

```css
/* line 27 */
.statbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
```

Two identical-looking components, two different layout systems. Because `.tracker-summary` is a bare `flex-wrap` with no `flex-basis` on `.stat`, each box grows to fit `"September 2026 — Aakara Design Studios delivered · 0 published"` — 55 characters. That is why boxes are 440–490px wide and only two fit per row. On the Competitors tab, where labels are `"Direct rivals"`, the same class produces 116px boxes. **The component has no intrinsic size; it inherits its size from a sheet cell.** That is the literal meaning of "unstructured".

### Root cause 2 — the bucket key is `month + " — " + creator`, and neither is bounded

```js
// line 916
const k = `${r.month} — ${r.creator}`;
byMonth[k] = byMonth[k] || {c:0,d:0,p:0};
```

Nothing filters, sorts, caps or archives. `byMonth` is rendered whole, in `Object.entries` insertion order — which is sheet row order, not chronological. June, July, August, September then RSS, Stree, BALSABHA. There is no date sort, so a back-filled May row would land at the end.

And `month` is not a month. Three of the seven values (`RSS 2026`, `Stree 2026`, `BALSABHA 2026`) are **workshop/event names**, not periods. The column is doing double duty as period *and* campaign, so the axis has no type. It can never be sorted correctly because half its values have no date.

### Root cause 3 — the two halves of the tab share no axis

The summary groups by **month**. The board groups by **status**. They never intersect. You cannot answer "what is still outstanding for September?" from either one — the September box says `0/17` and the board says `49 delivered, not posted` across all months at once.

The team has already noticed and worked around it in the data: **59 of the 99 card titles (60%) begin with a redundant month prefix** — `"September: Ganesh Chaturthi related"`, `"September: Ranking Reel"` — because the board throws the month away, so humans hand-encode it into the free-text title. That is the strongest single piece of evidence that the information architecture is wrong: the users are repairing it manually, 59 times.

### What happens in 6 months

Growth rate: 7 buckets over 4 operating months = **1.75 buckets/month** (1 calendar month + ~0.75 event buckets).

| | Buckets | Desktop rows | Desktop height | Mobile height (375px, 1 box/row @ 96px) | Board pushed down to |
|---|---|---|---|---|---|
| **Today** | 7 | 4 | 320px | 676px | 1,284px = **1.6 phone screens** |
| **+6 months (Mar '27)** | ~18 | 9 | ~740px | ~1,730px | ~2,340px = **2.9 phone screens** |
| **6× today's data** | 42 | 21 | ~1,720px (1.9 desktop screens) | ~4,030px | ~4,600px = **5.7 phone screens** |
| **+ a second agency** | ×2 (key is month **×** creator) | 42 | ~3,440px | ~8,060px | — |

At the +6-month point a phone user scrolls **almost three full screens of identical white boxes** before reaching a single deliverable. At 6× — or the moment a second creator is added, which doubles the bucket count instantly because the key is `month × creator` — the summary alone is two desktop screens tall and the tab is unusable.

The card board scales badly too, but *linearly and legibly*: 99 cards → 9,112px desktop / 54,491px mobile. At 6× that is ~54,000px desktop and ~270,000px mobile (≈330 phone screens) with no pagination, no virtualisation, no period filter and lazy `<img>` on 594 Drive thumbnails.

**Answer to the owner's question: in 6 months the stat boxes will be a ~740px, 9-row wall on desktop and a 1,730px wall on mobile, sorted in sheet-row order rather than by date, mixing months with workshop names — and the board underneath will be a 54,000px unfilterable scroll. If a second agency is added at any point, both numbers double the same day.**

---

### Proposed redesign — a layout whose height is O(1) in months

The principle: **a growing dimension must become a scroll rail or a filter, never a growing stack.** Period is the growing dimension. Make it the filter, and make the summary fixed-cardinality.

**A. Fix the data model first (Creator Tracker sheet, `1N6…`/`117Ht…`).**
Split the `month` column into two:
- `period` — strict `YYYY-MM` only. Sortable, typed, never a workshop name.
- `campaign` — `RSS`, `Stree`, `Balsabha`, blank. This is a tag, not a period.

Then strip the `"September: "` prefix from the 59 titles that carry it — the period column now holds that fact.

**B. Replace `#tracker-summary` with a fixed-height period rail.** One horizontally-scrolling row, newest first, each chip a filter. Height stays 62px whether there are 7 periods or 70.

```html
<div class="trk-periods" role="tablist" aria-label="Delivery period">
  <button class="pchip active" data-period="2026-09">
    Sep '26<b>0 / 17</b><i class="pbar" style="--pct:0%"></i>
  </button>
  <button class="pchip" data-period="2026-08">
    Aug '26<b>2 / 16</b><i class="pbar" style="--pct:13%"></i>
  </button>
  <!-- … -->
  <button class="pchip archive" data-period="__archive">
    Archive<b>4 periods · 42 items</b>
  </button>
</div>
```

```css
.trk-periods{
  display:flex; gap:8px; overflow-x:auto; scroll-snap-type:x proximity;
  padding:2px 0 8px; margin-bottom:14px;
  -webkit-overflow-scrolling:touch; scrollbar-width:thin;
}
.trk-periods::after{ /* fade affordance so the rail reads as scrollable */
  content:''; position:sticky; right:0; flex:0 0 28px; align-self:stretch;
  background:linear-gradient(90deg,transparent,var(--cream)); pointer-events:none;
}
.pchip{
  flex:0 0 auto; scroll-snap-align:start; min-width:134px; min-height:44px;
  text-align:left; cursor:pointer;
  background:#fff; border:1px solid #e4edf0; border-radius:12px; padding:8px 12px;
  font:800 .70rem/1.2 'Nunito',sans-serif; color:#456773;      /* 5.1:1, was 3.94:1 */
  text-transform:uppercase; letter-spacing:.05em;
}
.pchip b{display:block; font:900 1.1rem/1.15 'Nunito',sans-serif;
  color:var(--navy); letter-spacing:0; margin-top:3px}
.pchip .pbar{display:block; height:4px; border-radius:999px;
  background:#eef2f6; margin-top:7px; overflow:hidden}
.pchip .pbar::before{content:''; display:block; height:100%;
  width:var(--pct); background:var(--teal)}
.pchip[aria-selected="true"],.pchip.active{
  border-color:var(--teal); box-shadow:inset 0 0 0 1px var(--teal)}
.pchip.archive{background:#eef2f6; border-style:dashed}
@media(max-width:560px){ .pchip{min-width:118px} }
```

Sort chips by `period` descending (`campaign` chips render in a second, collapsible group so they never interleave with months). Everything older than the previous 3 periods collapses into the single `Archive` chip — one element, forever.

**C. Above the rail, a fixed 4-KPI bar that never grows** — reuse `.statbar`, which is already a proper `auto-fit` grid, so this is the *only* summary that changes shape with viewport rather than with data:

```html
<div class="statbar" id="tracker-kpis">
  <div class="stat"><div class="num">11</div><div class="lbl">Needs attention</div></div>
  <div class="stat"><div class="num">49</div><div class="lbl">Delivered · not posted</div></div>
  <div class="stat"><div class="num">35</div><div class="lbl">In production</div></div>
  <div class="stat"><div class="num">0 / 17</div><div class="lbl">This period delivered</div></div>
</div>
```

Four boxes. Always four. That is the whole fix for the complaint.

**D. Scope the board to the selected period**, keeping the existing status grouping — now the two halves finally share an axis. `Needs attention` stays global and pinned above the rail, because a mismatch in July still matters in September.

**E. Cap each status group** at 24 cards with a `Show all 49 →` button (`content-visibility:auto` on `.trk-card` as a cheap second line of defence):

```css
.trk-card{content-visibility:auto; contain-intrinsic-size:0 430px}
```

At 594 cards this is the difference between a usable page and a 4-second layout.

**Result:** header height goes from 320px → **≈176px fixed** (KPI bar + rail), and stays there at 18 periods, at 42, and with three agencies. Board length becomes bounded by the period filter rather than by all history.

---

## NUMBERED ISSUES — ranked by impact

### 1. `.tracker-summary` grows without bound and is sized by label text
**What:** 7 boxes, 320px, 4 rows, widths 439–488px because each box hugs a 55-character sheet-derived label. Same `.stat` class is 116–160px on Competitors.
**Why it matters:** the tab's growing dimension is expressed as a growing stack. It is already 1.6 phone screens of chrome before any content; at +6 months, 2.9 screens.
**Evidence:** `#tracker-summary` rect 1148×320; `.stat` widths `[445,442,466,488,439,453,483]` vs `[160,123,158,116]` on `#comp-summary`; line 96 `display:flex;flex-wrap:wrap` vs line 27 `display:grid;auto-fit minmax(130px,1fr)`.
**Fix:** the period rail + fixed KPI bar above (§ Proposed redesign B/C). Minimum viable one-liner if nothing else is done — at least make it a grid so it stops being text-sized:
```css
.tracker-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}
```
…but this only delays the problem; it does not solve unbounded growth.

### 2. Five contradictory "how many are published" numbers on one screen
**What:** On the Published tab, simultaneously visible: header stat bar **20 Published**; summary box **55 Live on Instagram**; body copy **"Only 55 of your 378 catalogued pieces are published"**; summary box **12 Shown (recent)** and 12 table rows; and on Creator Tracker the group header **🟢 Published — live on Instagram · 4**.
**Why it matters:** this is the single most credibility-destroying thing in the four tabs. A dashboard that disagrees with itself in three places 400px apart stops being consulted.
**Evidence:** `#statbar` → `"20 Published"`; `#pub-summary` → `"55 Live on Instagram"`, `"12 Shown (recent)"`; `#pub-live-n`=55, `#pub-cat-n`=378; `#pub-tbody` 12 rows; tracker group count 4. Sources are respectively catalogue `status` field, `ifmPub.meta.total_posts`, `posts.length`, and the tracker sheet `status`.
**Fix:** pick one canonical number (`meta.total_posts` from the live IG scrape) and label every other one with its scope, in the label not the tooltip:
```html
<div class="stat"><div class="num">55</div><div class="lbl">Live on Instagram <span class="src">IG grid</span></div></div>
<div class="stat"><div class="num">20</div><div class="lbl">Catalogued as published <span class="src">sheet</span></div></div>
<div class="stat"><div class="num">12</div><div class="lbl">With engagement data <span class="src">scraped</span></div></div>
```
```css
.stat .lbl .src{display:block;font-weight:700;text-transform:none;letter-spacing:0;opacity:.7;font-size:.66rem}
```
And add a reconciliation line: *"35 live posts aren't in the catalogue · 20 catalogue rows say published"* — that gap is itself the useful number.

### 3. "Verdict" column is a forced tertile presented as a judgement — and calls it "reach"
**What:** `renderPublished()` sorts by engagement and stamps the top third `🔥 Worked`, bottom third `📉 Low reach`. With 12 rows this **always** produces exactly 4 / 4 / 4, regardless of whether the posts differ at all.
**Why it matters:** it is arithmetically guaranteed to condemn 4 posts every week even in a great week, and it says **"Low reach"** on a page whose own body copy states *"No 'reach' column — Instagram doesn't expose reach/impressions to anyone but the account owner, and it can't be scraped."* The footer compounds it: *"Performance badges compare engagement … **per reach** across all published posts: 🔥 top **quartile** · 👍 middle · 🌱 bottom **quartile**"* — reach isn't used, and the logic is tertiles, not quartiles.
**Evidence:** `const cut=Math.max(1,Math.ceil(nn/3))` (line ~1174); rendered verdicts `[Worked ×4, OK ×4, Low reach ×4]`; engagement values `[66,65,54,48,39,30,28,20,13,11,5,3]`; footer text quoted above.
**Fix:** rename to `Vs. median` and show the actual ratio, so a uniformly good week reads as uniformly good:
```js
const med = eng.slice().sort((a,b)=>a-b)[Math.floor(eng.length/2)];
const rel = p._eng/med;                       // 2.2×, 1.0×, 0.1×
p._tier = rel>=1.4?'hit' : rel<=0.6?'low' : 'ok';
```
Label the low tier **"Under-performed"**, never "Low reach". Correct the footer to "top third / bottom third of engagement per follower" and delete "per reach".

### 4. Competitors buries its own table 1,242px (desktop) / 2,361px (mobile) below the fold
**What:** above the 23-row table sit: header + global stat bar, 4 tab-level stat boxes, a **556px** dark synthesis card (**1,172px** on mobile), and a **287px** (**420px** mobile) "➕ Track a new competitor" form.
**Why it matters:** a data-entry form used a handful of times a month outranks the 23-row table that is the reason the tab exists. On a phone the table is 2.9 screens down.
**Evidence:** `#comp-table` top = 1,242px @1440×900; 2,361px @375×812. `.comp-synth` height 556 / 1,172px. `#comp-admin` height 287 / 420px.
**Fix:** collapse the add-form into a `<details>` and move it below the table; make the synthesis card collapsible after the first pattern.
```html
<details class="comp-add"><summary>➕ Track a new competitor</summary> … </details>
```
```css
.comp-add{background:#f6f8fb;border:1px solid #e2e8f0;border-radius:10px;padding:0 14px;margin:14px 0}
.comp-add>summary{cursor:pointer;font-weight:800;padding:12px 0;list-style:none;min-height:44px;display:flex;align-items:center}
.comp-add[open]{padding-bottom:14px}
```
Target: table top ≤ 560px on desktop, ≤ 900px on mobile.

### 5. Certificates renders zero of the photos it exists to display
**What:** all 5 cards show the `🏅` emoji placeholder. `document.querySelectorAll('img.cert-photo').length === 0`; `.cert-photo-ph` count = 5.
**Why it matters:** the tab is "student completion photos". It contains no photos. It also violates the project's own standing rule (memory: *Catalogue Quality Rules — real thumbnails mandatory, no emoji placeholders*). Combined with **0/5 Posted**, every row `June - Batch 1`, and today being 7 September, the tab reads as abandoned rather than as work outstanding.
**Evidence:** DOM counts above; `.cert-meta` values all `"June - Batch 1"`; all `.cert-status .pill` = `"To post"`.
**Fix:** two parts. (a) When a row has no `certificate photo` Drive link, say so instead of showing a medal — the placeholder currently looks like a design choice, not a gap:
```css
.cert-photo-ph::after{content:'no photo';position:absolute;bottom:2px;left:0;right:0;
  font-size:.52rem;font-weight:800;text-transform:uppercase;color:var(--navy);opacity:.55}
.cert-photo-ph{position:relative}
```
(b) Add a fourth stat box `5 · Missing photo` alongside `Certificates / Posted / Need a handle`, so the gap surfaces as a number the way `Need a handle` already does.

### 6. Four tabs invent four unrelated severity scales, and one colour means four things
**What:** Tracker uses `warn` / `catch`; Competitors uses `High` / `Medium` / `Watch`; Published uses `Worked` / `OK` / `Low reach`; Certificates uses `Posted` / `To post`. And the amber token `#fff4d6 / #8a6100` is used for **four semantically opposite things**: `.trk-flag.catch` (*good news — already live*), `.threat-medium` (*mildly bad*), `.pending-pill` (*no data yet*), `.td-review-badge` (*needs review*). Red `#fdecea / #c0392b` is both `.trk-flag.warn` (*data error*) and `.threat-high` (*a strong competitor* — that's intel, not an error).
**Why it matters:** the four tabs stop reading as one product. A user who has learned "amber = act on this" on the Tracker is taught the opposite on Competitors, where amber means "we haven't looked yet".
**Evidence:** lines 146–149, 260–262, 91–95, 219–225; `.trk-flag.catch` and `.pending-pill` share `background:#fff4d6;color:#8a6100` exactly.
**Fix:** define three semantic tokens in `:root` and use nothing else for state:
```css
:root{
  --sev-act:#fdecea;   --sev-act-ink:#a8321f;   /* you must do something */
  --sev-wait:#fff4d6;  --sev-wait-ink:#7a5500;  /* known unknown / pending */
  --sev-ok:#e7f4f1;    --sev-ok-ink:#0e6c5f;    /* healthy, no action */
}
```
Then: `.threat-high` → a **navy outline** pill (competitor strength is a fact, not an alert), `.trk-flag.warn` → `--sev-act`, `.pending-pill` → `--sev-wait`, `.trk-flag.catch` → `--sev-ok`, Published `low` → `--sev-act`.

### 7. Creator Tracker's board taxonomy is carried by emoji colour alone
**What:** the four group headers are `🟡 Delivered`, `🟢 Published`, `🔵 In production`, `⚪ Other` — the emoji is the only colour. `.trk-ghead` text is navy for three of the four (`.accent` gives one `#b9770e`), and the count badge `.cnt` is identical grey on all of them.
**Why it matters:** in greyscale, print, or for a colour-blind reader the whole board taxonomy collapses to four identical navy headings. The emoji also render differently across OS versions and are read aloud as "large yellow circle" by screen readers.
**Evidence:** lines 339–343, 875–878, 901–910. `.cnt` = `#5a7d8a` on `#eef2f6` on every group.
**Fix:** give each group a real left rule and tint the count badge, so shape and position carry the meaning too:
```css
.trk-group{border-left:4px solid var(--g,#dbe4e8);padding-left:14px;margin-bottom:24px}
.trk-group.attn{--g:var(--sev-act-ink)}
.trk-group.accent{--g:#d9a441}
.trk-group.live{--g:var(--teal)}
.trk-group.prod{--g:#4a86b8}
.trk-ghead .cnt{background:color-mix(in srgb,var(--g) 14%,#fff);color:var(--g)}
```
and drop the emoji from the label text.

### 8. No horizontal-scroll affordance on either table; 62% of Published is off-screen on mobile
**What:** at 375px, `#pub-table` scrolls 899px inside a 343px container (**556px hidden, 62%**) and `#comp-table` 743px inside 343px (**400px hidden, 54%**). `.tbl-scroll` is a bare `overflow-x:auto` with no fade, shadow or hint.
**Why it matters:** the columns hidden on Published are exactly the analytical payload — Engagement, ER%, Verdict. A phone user sees Date / Type / Post and has no signal that anything else exists.
**Evidence:** `scrollWidth − clientWidth` = 556 and 400 respectively; the Competitors hint text ("Click a column to sort… drag ⠿…") lives in `#comp-hint` which carries class `hidden`.
**Fix:** a scroll shadow, plus promote the two columns that matter to a mobile card layout.
```css
.tbl-scroll{
  background:
    linear-gradient(90deg,#fff 30%,rgba(255,255,255,0)) left/40px 100% no-repeat,
    linear-gradient(90deg,rgba(255,255,255,0),#fff 70%) right/40px 100% no-repeat,
    radial-gradient(farthest-side at 0 50%,rgba(26,58,92,.16),transparent) left/14px 100% no-repeat,
    radial-gradient(farthest-side at 100% 50%,rgba(26,58,92,.16),transparent) right/14px 100% no-repeat;
  background-attachment:local,local,scroll,scroll;
}
@media(max-width:640px){
  .pub-table th:nth-child(6),.pub-table td:nth-child(6){display:none}  /* Comments */
  .pub-table .pub-cap-cell{max-width:120px}
}
```

### 9. 13 of 23 competitor rows have no metrics, but the table still reserves four analytics columns for them
**What:** `Avg Likes` is `—` on 13/23 rows; 12/23 rows render zero `Recent` thumbnails. Threat mix is High 9 / Medium 4 / Watch 10, so `High` is the modal value — the loudest red pill is on 39% of rows.
**Why it matters:** more than half the table is empty cells under headings that promise analysis. Nine red "High" pills is not a signal, it is wallpaper. The `intel pending` pill was designed for exactly this and currently fires on **0** rows, so the emptiness is invisible.
**Evidence:** DOM scan of `#comp-list`: `noLikes`=13, rows with 0 `.crow-thumbs img`=12, `.pending-pill` count = 0, threat `{High:9, Medium:4, Watch:10}`.
**Fix:** widen the `audited` test in `renderCompTable()` so it also fails when `avgLikesStr` and the thumbnail set are both empty, and add a summary box `13 · No metrics yet` next to `23 Tracked accounts`. Restrict `threat-high` red to the top 3–5 by a stated rule rather than a free-text sheet field.

### 10. Small pills fail contrast at 10px
**What:** measured in-page:

| Element | Colours | Ratio | Size |
|---|---|---|---|
| `.kind-pill` | `#5a7d8a` on `#f7faf9` | **4.22** | 10.2px / 800 |
| `.threat-watch`, `.trk-ghead .cnt` | `#5a7d8a` on `#eef2f6` | **3.94** | 10.2 / 11.2px |
| `.stat .lbl` | `#5a7d8a` on `#fff` | **4.43** | 11.5px |
| `.pending-pill` | `#8a6100` on `#fff4d6` | 5.06 | **9.3px** |
| `.trk-thumb .tt` | `#fff` on `rgba(26,58,92,.82)` | ~7 | **9.6px** |

**Why it matters:** three of these are below the 4.5:1 floor and none is above 11.5px. `.kind-pill` is additionally a near-white pill (`--cream` #f7faf9) on a white row — it has no pill shape visible at all, so the *Kind* column reads as plain text while the less actionable *Threat* column shouts.
**Fix:** darken the muted token used on tinted grounds and lift the floor to 11px.
```css
:root{--muted-ink:#456773}                     /* 5.1:1 on #eef2f6, 5.5:1 on #fff */
.comp-table .kind-pill{background:#eef2f6;color:var(--muted-ink);font-size:.70rem;border:1px solid #dde6ea}
.comp-table .threat-watch,.trk-ghead .cnt{color:var(--muted-ink);font-size:.70rem}
.comp-table .pending-pill{font-size:.66rem}
.trk-thumb .tt{font-size:.66rem}
.stat .lbl{color:var(--muted-ink)}
```

### 11. Drag-to-rank handle is a 12×24px tap target
**What:** `.chandle` (`⠿`) measures **12 × 24px**. It is the only way to set the strategic ranking, and it is `draggable` only while sorted by Rank — a mode explained in `#comp-hint`, which ships with class `hidden`.
**Why it matters:** 12×24 is roughly a quarter of the 44×44 minimum; on touch it is unhittable, and drag-to-reorder does not work on touch at all with the HTML5 drag API used here. The feature is effectively desktop-mouse-only and undiscoverable.
**Evidence:** `getBoundingClientRect()` on `.chandle` = 12×24; `#comp-hint` classList contains `hidden`.
**Fix:** pad the handle to a 44px hit area and un-hide the hint; add ▲▼ buttons as the touch path.
```css
.comp-table .chandle{display:inline-flex;align-items:center;justify-content:center;
  min-width:36px;min-height:44px;margin:-10px -8px;cursor:grab;color:var(--muted-ink)}
```

### 12. The follower card reports only the good half of the trend
**What:** the growth card reads `378 followers today · ▲ +59 since 30/07`, with axis labels 387 (max) → 310 (min) → 378 (current). The series peaked at **387** and is now **378** — down 9 from peak — and the card never says so. It also says "34 days tracked" while claiming "since 30/07", which is 39 days ago.
**Why it matters:** an internal dashboard that only reports upside trains the reader to distrust it. The peak-to-now delta is the number that would actually change behaviour.
**Evidence:** `#pub-growth` innerText: `"378 followers today ▲ +59 since 30/07 · 387 · 310 · 378 · 30/07 · 06/09 · Daily follower log · 34 days tracked"`. 30/07 → 07/09 = 39 days.
**Fix:** show both deltas and reconcile the date range with the sample count:
```html
<span class="pg-delta up">▲ +59 in 39 days</span>
<span class="pg-delta down">▼ 9 off peak (387, 28/08)</span>
<span class="pg-note">34 of 39 days logged</span>
```

### 13. `?who=sakshi` hides Certificates but exposes Competitors, threat levels and revenue strategy
**What:** the simplified view removes only the Certificates tab (`document.querySelector('.tab[data-tab="certs"]')?.remove()`). Creator Tracker, Competitors — including the synthesis card's commentary on where revenue competition really is — and Published all remain.
**Why it matters:** the code comment says *"Certificates + admin stay founder-only"*, but the tab that is actually the most founder-sensitive (competitive strategy) is left in. The stated intent and the behaviour disagree.
**Evidence:** lines 1534–1536; observed live at `?who=sakshi` — tabs present were `[today, library, tracker, competitors, published]`, `#statbar` still in the DOM at y=1733.
**Fix:** drive tab visibility off an explicit allow-list rather than one `remove()` call:
```js
const VIEWS={sakshi:['today','library','tracker'], default:null};
const allow=VIEWS[WHO]; if(allow) document.querySelectorAll('.tab[data-tab]')
  .forEach(b=>{ if(!allow.includes(b.dataset.tab)) b.remove(); });
```
(Note this is a UI affordance only — the underlying sheets are publicly fetchable, as CLAUDE.md already states.)

### 14. Tracker card titles carry a redundant month prefix that eats the visible line
**What:** 59/99 titles start with `June:` / `July:` / `August:` / `September:`. `.trk-name` is `.84rem/800` in a **190px-min** grid cell with no line clamp; longest title is 63 characters (`"RSS workshop — group photo at the Balsabha banner (close group)"`).
**Why it matters:** on a 190px card the first line is spent on a word that is identical across the whole group. Card heights vary 393–469px within one board as a result.
**Evidence:** `namePrefixDup` = 59; `nameLenMax` = 63; sampled `.trk-card` heights `[438,436,452,428,469,409,393]`.
**Fix:** strip the prefix at render and show the period as a small pill beside the type badge (once the sheet has a real `period` column, per § Redesign A):
```js
const title = String(r.item||'').replace(/^\s*(Jan|Feb|...|Sep|Oct|Nov|Dec)[a-z]*\s*[:\-–]\s*/i,'');
```
```css
.trk-name{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.2em}
```

### 15. Numeric cells are teal on Competitors and navy on Published
**What:** `.comp-table td.num{color:var(--teal)}` (line 134) vs `.pub-table td.num{color:var(--navy)}` (line 214). Same role, same visual treatment otherwise, two colours.
**Why it matters:** small, but it is the reason the two tables feel like they came from different apps despite sharing structure, sticky navy headers and sort behaviour.
**Fix:** one rule for both. Teal reads as "a metric" everywhere else in the app (`.stat .num`, `.pub-ins-stat b`, `.ccard-stats .s b`), so standardise on teal:
```css
.comp-table td.num,.pub-table td.num{color:var(--teal);font-weight:900;font-variant-numeric:tabular-nums}
```

### 16. No mobile rules exist for any of the four tabs' primary grids
**What:** the file has 8 `@media` blocks. None touches `.tracker-summary`, `.trk-grid`, `.cert-grid` or `#tracker-board`. `.trk-grid` is `auto-fill minmax(190px,1fr)` at every width; on a 375px phone that yields one 309px column and a 54,491px page.
**Why it matters:** the Today tab has a documented, deliberate mobile pass (lines 308–318, "devex audit, 7 Sep 2026"). These four tabs got none, so on a phone they degrade to one very long column with nothing dropped, collapsed or prioritised.
**Evidence:** `grep -n "@media"` → lines 157, 163, 175, 226, 244, 308, 333, 375; none names the four grids above.
**Fix:** at minimum a two-up card grid and a capped board on phones:
```css
@media(max-width:560px){
  .trk-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .trk-card .trk-note{display:none}
  .cert-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .cert-card{flex-direction:column;gap:8px}
}
```
Two-up alone halves the Tracker page from 54,491px to ~27,000px.

---

## Cross-tab consistency — do these feel like one product?

**Partly.** Shared: the `.stat` box, the navy sticky table header, the 14px card radius with `0 1px 5px rgba(26,58,92,.1)`, Nunito/Lora, teal links.

**Where it breaks:**

| Concern | Creator Tracker | Certificates | Competitors | Published |
|---|---|---|---|---|
| Summary layout | flex, text-sized, unbounded (7 boxes / 320px) | flex, 2–3 boxes | flex, 4 boxes | flex, 4 boxes |
| Status vocabulary | emoji circles in a heading | filled pill (`Posted`) | coloured word pill (`High`) | emoji + word (`🔥 Worked`) |
| Severity scale | warn / catch | — | High / Medium / Watch | Worked / OK / Low reach |
| Numeric cells | — | — | teal | navy |
| Empty-state honesty | ✅ real flags | ❌ emoji reads as decoration | ✅ `intel pending` (but fires 0×) | ✅ explicit no-reach note |
| Filter / search | none | none | sort + drag | sort |
| Grows how | stack (unbounded) | flat grid (unbounded) | table rows (fine) | table rows (fine) |

Two of the four tabs (Certificates, Creator Tracker) have **no filter, no search and no sort at all** — they are pure dumps. The two that scale well are the two built as tables.

**The single highest-leverage consistency fix** is to make `.tracker-summary` share `.statbar`'s grid and cap its cardinality at four boxes on every tab. Every tab then opens with the same fixed 4-KPI shape, and the growing dimension moves into a rail or a filter where it belongs.
