# Design audit — IFM Content Hub: **Library** and **On Deck**

Audited 7 Sep 2026 against the live build at `https://ifm-deploy.vercel.app/content/`
(byte-identical to the working tree's `CLAUDE/content/index.html`, 1714 lines).

Viewports tested: **1440×900** desktop and **375×812** mobile, plus **`?who=sakshi`** on mobile
(the junior EA's daily view). All numbers below were measured in the live DOM with
`getBoundingClientRect` / `getComputedStyle`, not estimated.

Dataset at audit time: **378 catalogue items**, of which **147 shown by default** and **231 hidden**;
**23** live outbound targets in the On Deck queue.

---

## Scores by dimension

| Dimension | Score | Evidence |
|---|---|---|
| **Visual hierarchy** | **4** / 10 | The stat bar (five identical white cards, all numbers 24px/900/teal) occupies the first 90px desktop / **528px mobile** and outranks everything. Inside the table, the emphasis ramp is *inverted*: the Asset column (title + description — the only content a human scans) gets **222px of 1148px (19%)**, while `Session` alone gets **223px** and is empty in **133 of 147 rows**. On On Deck, the filled teal primary button on every card is `✓ Commented` (the *second* step); the actual first action, `Open ↗`, is the pale outline secondary. |
| **Density & scannability at scale** | **3** / 10 | 147 rows = **10,751px of table / 11,243px of document** ≈ 12.5 desktop screens. The sticky `<thead>` **does not stick** (measured `thTop = −2639px` at scrollY 3000; `−4747px` at scrollY 5000 on mobile) so ~11 of those 12 screens are unlabelled columns. **143 of 147** descriptions are clipped by `-webkit-line-clamp:2` with no expand — a native `title=` tooltip is the only recovery. No row detail view; the title is not a link. |
| **Typography** | **5** / 10 | Ramp is sane but compressed and bottom-heavy: 24px stat number → 13.44px title → 12.16px link → 11.52px description → 11.2px session/source/date → **10.56px status chip → 10.08px tag pill**. Four distinct sizes live inside 10–11.5px, which reads as one indistinct grey mass. `.lib-sess` and every pill have `line-height: normal`. On mobile the description box measures **84 × 31px** — about 12 characters per line, two lines. |
| **Colour** | **3** / 10 | Colour is decorative, not systematic — three separate dimensions (Type, Quality, Tag) are painted from one palette and **collide exactly**. And 9 of the 12 measured pill/link styles fail WCAG AA at their rendered size. Full table in Issue 3. |
| **Empty / edge states** | **4** / 10 | The zero-result state renders the "Nothing matches" card **underneath a fully-rendered navy table header with zero rows** (measured: `rows = 0`, `table.offsetHeight > 0`). Three columns are `—`/blank in ~90% of rows. Two dropdown options (`Session Photo`, `Session Video`) return **0 rows** in the default view. |
| **Mobile** | **3** / 10 (Library) · **7** / 10 (On Deck) | Library on 375px: the table is **1088px wide inside a 343px scroller — 745px (68.5%) off-screen**, hinted only by a 28px gradient. First data row sits at **y = 837px on an 812px viewport** — nothing but chrome above the fold. Download link tap target **5 × 17px**; "Show raw/archived" checkbox **13 × 13px**. On Deck, by contrast, has real 44px buttons and a wrapping action row — the 7 Sep devex fix landed there and nowhere else. |
| **Cross-tab consistency** | **4** / 10 | Same app, two unrelated languages: On Deck states its scope ("23 live targets · all ≤7 days old"), Library states none; On Deck's controls are ≥44px, Library's are 13–31px; On Deck uses cards, Library a table with no row affordance; On Deck labels its date "Monday 7 September", Library shows `2026-09-05`. |
| **Not misleading** | **4** / 10 | `20 Published` and `382 Total engagement` sit adjacent in the same bar with **different denominators** (382 is summed over **12** live IG posts, not 20). The default Library silently withholds **231 of 378 items (61%)**. The `Asset` header shows `cursor:pointer` and does nothing. |

---

## Issues, ranked by impact

### Would genuinely improve the work

---

#### 1. The sticky column header is not sticky — 11 of 12 screens of table are unlabelled

**What.** `.pub-table th` declares `position:sticky; top:0`, but two ancestors kill it:
`.pub-table { overflow:hidden }` (line 207, there for the 12px border-radius) and the wrapper's
inline `style="overflow-x:auto"` (line 446). Each creates a scroll container that never scrolls
vertically, so the header sticks to a viewport that isn't moving.

**Why it matters.** With 3 columns that are ~90% `—`, the *only* way to know whether the pill you
are looking at is a Shot, a Quality or a Status is the header. Nine columns, 147 rows, and after
one screen you are reading anonymous columns for the remaining 9,850px.

**Evidence.**

| viewport | scrollY | `thead th` `top` | header on screen? |
|---|---|---|---|
| 1440×900 | 3000 | **−2639px** | no |
| 375×812 | 5000 | **−4747px** | no |

Table height 10,751px (desktop) / 12,481px (mobile); document 11,243px / 13,474px.

**Fix.** Move the radius clipping off the table and drop the horizontal scroller on wide viewports.

```css
/* was: .pub-table{ … overflow:hidden … } */
.pub-table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;
  border-radius:12px;box-shadow:0 1px 5px rgba(26,58,92,.1);font-size:.82rem}
/* clip the corners on the cells instead, so no ancestor needs overflow */
.pub-table thead th:first-child{border-top-left-radius:12px}
.pub-table thead th:last-child {border-top-right-radius:12px}
.pub-table tbody tr:last-child td:first-child{border-bottom-left-radius:12px}
.pub-table tbody tr:last-child td:last-child {border-bottom-right-radius:12px}
.pub-table th{position:sticky;top:0;z-index:2;box-shadow:inset 0 -1px 0 rgba(255,255,255,.14)}
```

and in the markup (line 446) make the scroller conditional rather than always-on:

```html
<div class="tbl-scroll">           <!-- drop the inline overflow-x -->
```
```css
@media(max-width:900px){ .tbl-scroll{overflow-x:auto} }  /* sticky is sacrificed only where the table truly can't fit */
```

---

#### 2. The column budget is inverted — 37% of the table is spent on three near-empty columns

**What.** Measured header widths at 1440px (table 1148px):

| column | width | share | empty (`—` / blank) |
|---|---|---|---|
| thumb | 60px | 5% | 17 / 147 |
| **Asset** (title + desc) | **222px** | **19%** | 0 |
| Type | 137px | 12% | 0 |
| **Shot** | 128px | 11% | **130 / 147 (88%)** |
| **Quality** | 71px | 6% | **133 / 147 (90%)** |
| **Session** | 223px | 19% | **133 / 147 (90%)** |
| Status | 108px | 9% | 0 |
| Source | 66px | 6% | 0 |
| Date | 83px | 7% | 0 |
| actions | 50px | 4% | 11 rows have none |

Shot + Quality + Session = **422px (36.8%)** of the table, ~89% blank. The Asset column, which
carries the only prose in the row, gets **222px** — one pixel less than the empty Session column.

**Why it matters.** This is a catalogue of 378 assets whose entire purpose is "find the thing I
half-remember." The half-remembered thing lives in the title and description. Everything else is a
filter facet, and facets belong in the filter bar (where four of them already are) — not in
permanent whitespace.

**Fix.** Collapse the three sparse facets into one "Tags" column that renders only what exists, and
give the recovered ~250px to Asset.

```html
<th>Asset</th> <th>Type</th> <th>Tags</th> <th>Status</th> <th>Source</th> <th>Date</th> <th></th>
```
```js
// replace the three <td>s for shot / quality / session with one
const tags=[shotPill,qp,it.session?`<span class="tagpill sess">${esc(it.session)}</span>`:'']
  .filter(x=>x&&x!=='—').join(' ');
`<td class="lib-tags">${tags||'<span class="lib-none">—</span>'}</td>`
```
```css
.lib-title,.lib-desc{max-width:none}
#lib-table col.asset{width:46%}
.lib-tags{max-width:200px}
```

---

#### 3. Nine of twelve pill / link styles fail WCAG AA; the most-tapped button in the app measures 1.73:1

**What.** Measured foreground-on-actual-background ratios at rendered size. All of these are under
18.66px, so AA small-text (4.5:1) applies — none qualify for the large-text 3:1 exemption.

| element | fg / bg | size / weight | ratio | AA |
|---|---|---|---|---|
| `.oq-done[disabled]` (On Deck, post-tap) | `#fff` / `#a8ccc6` | 12.5px / 800 | **1.73** | ✗✗ |
| `.chip.st-onhold` | `#e76f51` / `#f3e8e5` | 10.6px / 800 | **2.57** | ✗ |
| `.tagpill.testi` | `#2a9d8f` / `#e0f3f0` | 10.1px / 800 | **2.89** | ✗ |
| `.chip.st-published` | `#fff` / `#2a9d8f` | 10.6px / 800 | **3.32** | ✗ |
| `.pub-open` (IG ↗ / ⤓) | `#2a9d8f` / `#fff` | 12.2px / 800 | **3.32** | ✗ |
| `.oq-done` / `.oq-open` | teal pair | 12.5 / 11.8px | **3.32** | ✗ |
| `.chip.st-inproduction` | `#5a7d8a` / `#eef2f6` | 10.6px / 800 | **3.94** | ✗ |
| `.tagpill` (default) / `.pub-type-pill` | `#5a7d8a` / `#f7faf9` | 10.1px / 800 | **4.22** | ✗ |
| `.pub-type-pill.carousel` | `#96650f` / `#fbecd2` | 10.6px / 900 | **4.33** | ✗ |
| `.pub-type-pill.reel`, `.tagpill.hero` | `#0e7a6e` / `#d9f0ec` | 10.1–10.6px | **4.38** | ✗ |
| `.lib-desc`, `.lib-sess` | `#5a7d8a` / `#fff` | 11.2–11.5px | **4.43** | ✗ (marginal) |
| `.tagpill.social` | `#0e7a6e` / `#e3f2ee` | 10.1px / 800 | 4.52 | ✓ |
| `.chip.st-ready` | `#1a3a5c` / `#e9c46a` | 10.6px / 800 | 6.97 | ✓ |
| `.tagpill.hiral` | `#fff` / `#1a3a5c` | 10.1px / 800 | 11.64 | ✓ |

**Why it matters.** The 1.73:1 one is the worst: it is the *confirmation state* of the button
Sakshi taps ~15 times a day on a phone, often outdoors. After she taps, the label she needs to read
to confirm the action registered is white on pale mint — effectively invisible. `On Hold` at 2.57
is the status a founder most needs to spot while scanning.

**Fix.** Darken the two teals used as text and rebuild the disabled state as an *outline* rather
than a washed fill.

```css
:root{ --teal-txt:#1e7268; }          /* 5.2:1 on #fff, 4.9:1 on #e0f3f0 */
.pub-open, .oq-open, .details-toggle, .clinks a{ color:var(--teal-txt) }
.chip.st-published{ background:#1e7268; color:#fff }        /* 5.2:1  */
.chip.st-onhold,.chip.st-retired{ background:#fdecea; color:#a5341f }  /* 6.1:1 */
.chip.st-inproduction,.chip.st-idea{ background:#eef2f6; color:#3f5c68 } /* 6.4:1 */
.tagpill.testi{ background:#e0f3f0; color:#1e7268 }         /* 4.9:1 */
.tagpill,.pub-type-pill{ color:#40616e }                    /* 5.4:1 on #f7faf9 */
.oq-done[disabled]{ background:#fff; color:#3f5c68; border:1.5px solid #cfe0dc; }
.oq-done[disabled]::before{ content:'✓ ' }
```

---

#### 4. The same three hex pairs mean three different things — colour encodes nothing

**What.** Three independent dimensions are painted from one palette and land on identical values:

| pill | class | background / colour |
|---|---|---|
| **Type = Reel** | `.pub-type-pill.reel` | `#d9f0ec` / `#0e7a6e` |
| **Quality = Hero** | `.tagpill.hero` | `#d9f0ec` / `#0e7a6e` — **identical** |
| **Type = Carousel** | `.pub-type-pill.carousel` | `#fbecd2` / `#96650f` |
| **Tag = Certificate** | `.tagpill.cert` | `#fbecd2` / `#96650f` — **identical** |
| Social-ready | `.tagpill.social` | `#e3f2ee` / `#0e7a6e` — 6% off the Reel/Hero green |
| Testimonial | `.tagpill.testi` | `#e0f3f0` / `#2a9d8f` — 9% off it again |

Meanwhile *five* neutral-grey `.pub-type-pill` variants (Story, Static, Game, Game Screen, Game
Teaser, AI Video, Brand Asset, Motion Graphic, Photo) are all `#f7faf9`/`#5a7d8a`, so 9 of 13 types
are chromatically identical to each other **and** to the default tag pill.

**Why it matters.** Once the sticky header is gone (Issue 1) colour is the only positional cue left,
and a mint pill in column 3 vs column 5 is telling you two unrelated things in the same ink. The
eye learns "mint = good/green" and then meets it as a neutral type label.

**Fix.** Assign hue to *dimension*, not to value.
- **Type** → one shape/ink for all types (neutral slate `#eef2f6` / `#3f5c68`), differentiated by the
  existing `TYPE_ICON` glyph, not by colour.
- **Status** → the only column allowed a chromatic ramp (grey → amber → teal → coral).
- **Tags** → outline pills, `background:#fff; border:1px solid #cfdde2; color:#40616e`, with a single
  accent reserved for the two flags that are genuinely warnings (`🚫 do not use`, `minors`).

---

#### 5. Mobile Library: 68% of the table is off-screen and the first row is below the fold

**What.** At 375×812 with the Library tab active:

| measure | value |
|---|---|
| table width / visible scroller | **1088px / 343px** |
| horizontally hidden | **745px (68.5%)** |
| Asset column on mobile | 167px |
| `.lib-desc` render box | **84 × 31px** (`max-width:150px` at ≤760px, clamped to 2 lines) |
| top of first data row | **y = 837px** (viewport 812) |
| stat bar height | 528px (5 cards in a 2-col grid, orphan 5th) |
| tab row | 3 wrapped rows |
| controls block | 179px |
| document height | 13,474px |

The only affordance for the missing 745px is the 28px `.tbl-scroll::after` gradient.

**Why it matters.** On a phone the Library is: scroll past 837px of chrome, then read a 167px column
of titles with 84px-wide two-line descriptions, then discover by accident that Status, Date and the
links are 745px to the right. Type/Shot/Quality/Session/Status/Source/Date/actions are all invisible
without a horizontal swipe that nothing advertises.

**Fix.** Below 760px, stop pretending it is a table — reflow each row to a card, which also removes
the horizontal scroller that breaks sticky (Issue 1).

```css
@media(max-width:760px){
  #lib-table thead{position:absolute;left:-9999px}       /* headers become labels */
  #lib-table, #lib-table tbody, #lib-table tr, #lib-table td{display:block;width:auto}
  #lib-table tr{background:#fff;border:1px solid #e4edf0;border-radius:12px;
    margin-bottom:9px;padding:10px 12px;display:grid;
    grid-template-columns:48px 1fr;grid-template-areas:
      "thumb title" "thumb meta" "tags tags" "act act";gap:2px 11px}
  #lib-table td{border:none;padding:0}
  #lib-table td:nth-child(1){grid-area:thumb} #lib-table td:nth-child(2){grid-area:title}
  #lib-table td:nth-child(3),#lib-table td:nth-child(7){grid-area:meta;display:inline-block;margin-right:6px}
  #lib-table td:nth-child(4),td:nth-child(5),td:nth-child(6){grid-area:tags;display:inline-block}
  #lib-table td:nth-child(10){grid-area:act;display:flex;gap:8px;margin-top:6px}
  .lib-desc{max-width:none;-webkit-line-clamp:3}
}
```

---

#### 6. Library tap targets are 5–31px; the identical problem was already fixed on On Deck

**What.** Measured at 375px wide.

| control | size | vs 44×44 |
|---|---|---|
| `⤓` download link (Library) | **5 × 17px** | 4% of the required area |
| `IG ↗` link (Library) | 28 × 17px | ✗ |
| `#f-showhidden` checkbox | **13 × 13px** | ✗ |
| `.fchip` filter chips | 90–115 × **31px** | ✗ |
| thumbnail link | 40 × 40px | ✗ (just under) |
| `.controls select` | 118–169 × **44px** | ✓ |
| `.oq-open` / `.oq-done` (On Deck) | 154 × **44px** | ✓ |

**Why it matters.** The comment at line 302 of `index.html` says exactly this — *"44px min height on
both: Sakshi taps these ~15x/day on a phone, and 38px was under the 44px iOS / 48px Android
minimum (devex audit, 7 Sep 2026)"* — but the fix was applied only to the On Deck queue. The Library
still ships a 5px-wide download link and a 13px checkbox that is the sole gate on 61% of the catalogue.

**Fix.**

```css
@media(pointer:coarse){
  .pub-table td a.pub-open{display:inline-flex;align-items:center;justify-content:center;
    min-width:44px;min-height:44px;margin:-6px 0}
  .fchip{min-height:44px;padding:0 15px;display:inline-flex;align-items:center}
  .pub-thumb-sm{width:44px;height:44px}
  .controls label{min-height:44px}
  #f-showhidden{width:22px;height:22px}
}
```

---

#### 7. On Deck shows 23 targets against a goal of 15, from only 8 accounts, with no subject line

**What.** Measured in the live queue:

- **23 cards**, all 137px tall on mobile = **3,151px** of queue.
- **8 unique handles.** `@monikahalan` ×5, `@hermoneytalks` ×4, `@ca_rachanaranade` ×3,
  `@herfirst100k` ×3, `@lxmeofficial` ×3, `@ellevest` ×2, `@anushkarathod98` ×2.
- **8 of 22 adjacencies (36%)** are the same handle twice in a row.
- Header reads `23 live targets · all ≤7 days old`; the progress row above reads `1 / 15`
  (`OUTBOUND_TARGET = 15`, line 590).
- Each card carries only `@handle` + `reel · ♥ 259 · September 4, 2026`. No caption, no topic.

**Why it matters.** `buildOutboundQueue()` does real work — it ranks by closeness to a 300-like sweet
spot so her comment lands near the top rather than at #400. **None of that reasoning surfaces.** The
UI presents 23 equal-looking rows against a target of 15, so the sensible reading is "do all 23",
and there is nothing marking where 15 ends. Then, having no subject line, she must open every single
post to know what to say — and five of them are the same author, so a naive top-down pass leaves
five comments on one account and zero on three others.

**Fix.** Cap the visible list at the target, expose the rank rationale, and interleave handles.

```js
// after queue.sort(...) — round-robin so no author repeats back-to-back
const byHandle={}; queue.forEach(p=>(byHandle[p.handle] ||= []).push(p));
const woven=[]; let any=true;
while(any){ any=false;
  Object.values(byHandle).forEach(a=>{ if(a.length){woven.push(a.shift()); any=true;} }); }
const remaining = OUTBOUND_TARGET - doneN;
const shown = woven.slice(0, Math.max(remaining,0));
const extra = woven.length - shown.length;
```
```html
<!-- per card: why it is here -->
<div class="oq-meta">reel · ♥ 259 · 3 days ago
  <span class="oq-why" title="closest to the ~300-like sweet spot">🎯 best odds</span></div>
<!-- after the 15th -->
<button class="oq-more">Show 8 more targets</button>
```

---

#### 8. `✓ Commented` is a filled primary button that reads as a state, not an action

**What.** `.oq-done` is `background:var(--teal); color:#fff` and sits *below* `.oq-open`, which is a
pale outline. Its label is past-tense. Both are 154×44px on mobile. The card only changes after the
tap (`.oq-card.done{opacity:.45}`).

**Why it matters.** Two adjacent cards look identical whether or not you've acted on them, and the
loudest element on each card is labelled as though the work is already done. The genuine first
action — open the post — is visually demoted. The post-tap confirmation is then illegible (Issue 3,
1.73:1).

**Fix.** Promote the real first step, demote the log step to a checkbox-style toggle, and make the
done state read as done.

```css
.oq-open{background:var(--teal-txt);color:#fff;border:none}      /* primary: go do it */
.oq-done{background:#fff;color:#3f5c68;border:1.5px solid #cfdde2} /* secondary: log it */
.oq-card.done{opacity:1;background:#f4f9f7;border-color:#bde9e4}
.oq-card.done .oq-done{background:#e0f3f0;color:#1e7268;border-color:#bde9e4}
```
```html
<a class="oq-open">Open post ↗</a>
<button class="oq-done">Mark done</button>   <!-- → "✓ Done" after tap -->
```

---

#### 9. `20 Published` and `382 Total engagement` have different denominators and sit side by side

**What.** Measured from live state:

| stat card | source | denominator |
|---|---|---|
| `20 PUBLISHED` | `items.filter(status==='published')` — the catalogue | **20** |
| `382 TOTAL ENGAGEMENT (♥+💬, LIVE)` | `ifmPub.posts.filter(likes!=null)` — the IG scrape | **12** |

`ifmPub.posts.length === 12`. The Library itself only carries an `ig link` on **12 of 147** rows.

**Why it matters.** Placed adjacent, unlabelled, in identically-styled cards, these invite exactly
one arithmetic: 382 ÷ 20 = 19.1 engagement per post. The real figure is 382 ÷ 12 = **31.8** — the
adjacency understates performance by 40%. Nothing on the card discloses the denominator.

**Fix.** State the base on the card, or merge the two.

```js
`<div class="stat"><div class="num">${totalEng.toLocaleString('en-IN')}</div>
  <div class="lbl">Engagement <span style="font-weight:600">(♥+💬, live)</span></div>
  <div class="sub">across ${engPosts.length} posts · avg ${Math.round(totalEng/engPosts.length)}</div></div>`
```
```css
.stat .sub{font-size:.66rem;font-weight:700;color:var(--muted);margin-top:3px}
```

---

#### 10. The Library never says how many of the 378 it is showing, and hides 61% behind a 13px checkbox

**What.** `items.length === 378`; the default view renders **147** rows; **231** are suppressed by
`isHidden()` (status `Raw` or a locally-archived id). The only disclosure is a label reading
`Show raw/archived (231)` beside a **13×13px** checkbox. There is no result count anywhere — after a
search or a chip, the row count is silent (measured: no `#lib-count`-style element exists).

Also: `archived` is not a status in the data. The five real statuses are `Ready`, `Published`, `Raw`,
`In Production`, `On Hold`. So the label names a state the catalogue does not have.

**Why it matters.** The header says "147 USABLE ASSETS" and the table shows 147 rows, so the app
reads as a complete catalogue of 147 things. A user searching for a raw shot they know exists gets
"Nothing matches" and has no reason to suspect 231 rows are being withheld.

**Fix.**

```html
<div class="lib-count" id="lib-count"></div>
```
```js
document.getElementById('lib-count').innerHTML =
  `<b>${list.length}</b> of ${items.length} assets` +
  (!showHidden && hiddenN ? ` · <button class="lnk" id="reveal">${hiddenN} raw / on-hold hidden</button>` : '');
```
```css
.lib-count{font-size:.78rem;font-weight:700;color:var(--muted);margin:0 0 8px}
.lib-count b{color:var(--navy);font-size:.9rem}
```
and rename the checkbox to `Include raw & on-hold` so it matches the data.

---

#### 11. The `Asset` header is a false affordance — pointer cursor, no sort

**What.** `.pub-table th{cursor:pointer}` applies to all headers; `:first-child` and `:last-child`
are reset to `default`. `Asset` is the **second** child, so it renders `cursor:pointer` — but it
carries no `data-k`, so the click handler ignores it.

Measured `data-k` per header: `[—, —, type, shot, quality, session, status, source, date, —]`.

**Why it matters.** Alphabetical-by-title is the single most obvious sort for a 378-item catalogue,
and the header advertises it and silently declines. Meanwhile the four sorts that *do* work
(`shot`, `quality`, `session` and `type`) sort by columns that are ~90% empty, so they mostly just
shuffle the blanks.

**Fix.** One attribute plus one `val()` branch.

```html
<th data-k="title">Asset</th>
```
```js
const val=(it,k)=>{
  if(k==='date')return String(it['date created']||it['published date']||'');
  if(k==='title')return String(it.title||'').toLowerCase();
  if(k==='quality')return {hero:3,usable:2,'raw/backup':1}[String(it.quality||'').toLowerCase()]||0;
  return String(it[k]||'');
};
```
```css
.pub-table th:not([data-k]){cursor:default}   /* stop advertising what doesn't work */
```

---

#### 12. Descriptions are the reason the table exists and 143 of 147 are clipped with no way to open them

**What.** `.lib-desc` is `-webkit-line-clamp:2` at `max-width:300px` (desktop) / `150px` (≤760px).
Measured: **143 of 147 rows** overflow their clamp. Recovery is the native `title=` attribute only —
no expand control, no row detail, and the title itself is not a link (only the 40px thumbnail is).

**Why it matters.** Per the project's own catalogue-quality rule, descriptions are written as direct
visual content ("*4-frame mint-green carousel opening on a woman hiding behind a thick...*"). That
sentence is how you identify an asset you half-remember, and it is cut at the exact point where it
stops being generic. A `title` tooltip needs a mouse (absent on the phone), a ~1s hover delay, and
cannot be scanned across rows.

**Fix.** Recover the width from Issue 2, then make the row expandable.

```css
.lib-desc{max-width:none;-webkit-line-clamp:2}
tr.open .lib-desc{-webkit-line-clamp:unset;display:block}
.lib-title{cursor:pointer}
.lib-title::after{content:'▾';font-size:.6rem;color:var(--muted);margin-left:5px;opacity:.55}
tr.open .lib-title::after{content:'▴'}
```
```js
document.getElementById('lib-tbody').addEventListener('click',e=>{
  const td=e.target.closest('td'); if(!td||td.cellIndex!==1||e.target.closest('a'))return;
  td.closest('tr').classList.toggle('open');
});
```

---

#### 13. The zero-result state renders an empty navy table header above the "Nothing matches" card

**What.** With `q = 'zzzqqq'`, measured: `#lib-empty` visible **and** `#lib-table` still
`offsetHeight > 0` with `tbody.rows.length === 0`. So the user sees a full-width navy bar of nine
column labels sitting on nothing, then a white card below it.

**Why it matters.** Small, but it makes a "no results" moment look like a rendering failure — and
this state is reachable in one keystroke from a catalogue that is already hiding 231 rows (Issue 10),
so it will be hit often and misread as "the app broke" rather than "widen your search."

**Fix.**

```js
const e=document.getElementById('lib-empty');
document.querySelector('#tab-library .tbl-scroll').classList.toggle('hidden',!list.length);
if(!list.length){
  e.classList.remove('hidden');
  e.innerHTML='<h2>Nothing matches</h2><p>No asset matches that search and these filters.</p>'
    + (!showHidden ? `<p><button class="lnk" id="try-hidden">Search the ${hiddenN} raw / on-hold assets too</button></p>` : '');
} else e.classList.add('hidden');
```

---

#### 14. Two filter options are permanently dead, and no filter shows its yield

**What.** Measured row counts per `f-type` option in the default view:

`AI Video 23 · Brand Asset 3 · Carousel 33 · Game 2 · Game Screen 14 · Game Teaser 3 ·
Motion Graphic 1 · Photo 5 · Reel 42 · Session Photo 0 · Session Video 0 · Static 2 · Story 19`

`Session Photo` and `Session Video` return **zero** — every asset of those types is `Raw`, so
`isHidden()` removes them before the type filter is applied. The dropdown is built from the whole
dataset; the table is filtered from a subset.

Chip yields (also unlabelled): `Social-ready 10 · Hiral shots 22 · Hero quality 14 ·
Testimonials 1 · Certificates 5 · Do not use 9`.

**Why it matters.** Picking "Session Photo" and getting "Nothing matches" reads as data loss when it
is really a hidden-row interaction. And "Testimonials" — a chip promoted to the top bar — yields
exactly one row; a count on the chip would have saved the click.

**Fix.** Compute counts against the currently-visible base and render them into both controls.

```js
const base = items.filter(it => showHidden || !isHidden(it));
const n = (k,v) => base.filter(it => String(it[k]||'') === v).length;
[...sel.options].slice(1).forEach(o => {
  const c = n('type', o.value);
  o.textContent = `${o.value} (${c})`;
  o.disabled = c === 0;
});
document.querySelectorAll('#lib-chips .fchip').forEach(c => {
  c.dataset.n = base.filter(it => chipMatch(it, c.dataset.f)).length;
});
```
```css
.fchip::after{content:' ' attr(data-n);opacity:.6;font-weight:700}
```

---

#### 15. Two of the three On Deck status rows are not statuses

**What.** `#today-status` renders a three-row metric table:

```
OUTBOUND      [▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱]  1 / 15
STORIES       5 a day · post as usual, not logged
NEEDS REVIEW  ⟨16 new from Drive — not catalogued yet⟩
```

Only row 1 is a measurement. Row 2 is a standing instruction with no data behind it (there is no
story logging). Row 3 is an amber `<span class="td-review-badge">` — **not a link, not a button** —
so the single most actionable fact on the screen ("16 assets are sitting uncatalogued") is a dead end.

**Why it matters.** The block occupies **211px** of an 812px phone screen — a quarter of Sakshi's
first view — and two thirds of it cannot be acted on or completed. Row 2 in particular trains the
eye to skip the block, which is where the real 1/15 progress lives.

**Fix.** Demote the instruction to the card footer beside the streak, and make the review count a
target.

```html
<div class="td-row"><span class="lbl">Needs review</span>
  <a class="td-review-badge" href="https://drive.google.com/drive/folders/1mwN-stIOLrCabOP8Vjhp6ZG_6ARzWiiL"
     target="_blank" rel="noopener">16 new from Drive — open the Content Drop ↗</a></div>
<div class="td-streak">🔥 1-day streak <span class="td-muted">· stories: 5 a day, post as usual</span></div>
```

---

#### 16. On the founder view, the daily queue starts at the bottom edge of the phone

**What.** At 375×812 with no `?who` param, On Deck active: `#today-queue` top = **802px**, viewport
812px. Above it: header 150px, stat bar **528px** (five cards, 2-col grid, orphan fifth), tab row
(3 wrapped rows), status card 211px.

`?who=sakshi` already fixes this — the stat bar is relocated to `top: 3926px` under a
"Whole-library totals" heading, and the queue lands at **513px**, comfortably above the fold.

**Why it matters.** The fix exists and is well-reasoned (the comment at line 1539 explains it), but
it is gated on a query parameter. Anyone on the shared link — the founder, the other three people —
gets a phone screen where the day's task list begins one pixel from the bottom.

**Fix.** Make the reorder a property of *the tab*, not of the user.

```js
// run on every tab switch, not only for WHO==='sakshi'
function placeStatbar(tab){
  const sb=document.getElementById('statbar'), tabs=document.querySelector('.tabs');
  if(tab==='today') document.querySelector('.wrap').appendChild(sb);
  else tabs.parentNode.insertBefore(sb, tabs);
}
```

---

### Nitpicks

17. **`Date▼` has no space before the arrow** — `.arrow{margin-left:2px}` is not enough at
    10.6px/800/uppercase; it renders as one token. `margin-left:5px` fixes it.
18. **Row heights alternate 62 / 63 / 80px** because `.lib-title` has no clamp while `.lib-desc` has
    one. The longest title measured is 72 characters over 3 lines. `-webkit-line-clamp:2` on
    `.lib-title` gives a uniform 72px rhythm.
19. **Dates are raw ISO** (`2026-09-05`) in a column headed `Date`, while On Deck shows
    `Monday 7 September` and `September 4, 2026`. Three date formats in one app. Relative
    (`3 days ago`) with the ISO in `title=` would suit both tabs.
20. **The stat bar's fifth card is an orphan** on mobile (`repeat(auto-fit,minmax(130px,1fr))` gives
    2 columns at 375px → 2 / 2 / 1). `minmax(150px,1fr)` with a 5th card spanning both columns, or
    simply four cards, resolves it.
21. **`TOTAL ENGAGEMENT (♥+💬, LIVE)`** is the only two-line stat label and the only one containing
    punctuation, parentheses and emoji; it makes its card 60px taller than its neighbours.
22. **17 of 147 rows fall back to a bare emoji glyph** where a thumbnail should be — rendered at
    `font-size:1.3rem` with no 40×40 frame, so the column loses its grid. Wrap the fallback in the
    same `.pub-thumb-sm` box.
23. **Three status classes are dead code** — `.chip.st-scheduled`, `.st-idea`, `.st-retired` have no
    matching value; the live statuses are only `Ready`, `Published`, `Raw`, `In Production`, `On Hold`.
24. **`Ready to post = 99`** is computed as `['ready','scheduled']`, but `Scheduled` does not exist in
    the data — the second term is inert.
25. **11 of 147 rows have no action link at all** (no IG link, no download) — a visibly empty last
    column with no explanation of why that asset can't be opened.

---

## Summary

The Library is a well-structured *data model* rendered with the wrong *spatial and chromatic budget*:
37% of its width goes to columns that are ~90% empty, its prose is clipped in 97% of rows, its
column headers scroll away after one screen of twelve, and on a phone two thirds of it is off-screen
behind a 28px gradient. On Deck is the better-designed of the two — it has had a real usability pass
(44px targets, a reflowing action row, honest copy about what is and isn't tracked) — but it shows a
23-item list against a 15-item goal, drawn from 8 accounts, with the ranking logic invisible and the
primary button labelled as though the work is finished.

The single highest-leverage change is **Issue 2** (rebalance the columns), because it also resolves
the horizontal scroller that causes Issue 1 (dead sticky header) and Issue 5 (mobile clipping). The
single cheapest change with real safety value is **Issue 3**, and within it the
`.oq-done[disabled]` state at 1.73:1 — one CSS rule on the button Sakshi taps fifteen times a day.
