# IFM OS Content Library — independent data-model audit

20 Sep 2026 · commissioned at Aditya's request · **read-only, nothing modified, nothing deployed**

Run by a separate reviewer against the live files, with every claim measured rather than
asserted. Gates at time of audit: `run-tests.js` 14/14 + Phase 2 14/14; `interpreter-tests.js`
structured 14/14, natural 20/22, acceptance 15/15 — **SHIPPABLE**. The system is green.

Working set: 542 rows in `data.js`, 502 with `library!==false`, **479 visible** through the
`ASSETS` filter — 233 Image, 203 Video, 43 Carousel.

I have independently re-verified the three most consequential findings (§3.1, §3.3, §3.4)
against the live search engine. Numbers confirmed. — Claude

---

## 1. VERDICT

**The decomposition is right and must be kept. The problem is not the pipeline — it is one
missing field and one field that lies about its weight.**

- `data.js → backfill.py → v1-catalogue.js` (generate, never hand-edit) is **correct**. It is
  the only reason the Library can be rebuilt at all.
- `enrichment.json` applied last is **correct in principle**, but is being applied to the wrong
  *kind* of field (§3.6).
- A **probe-generated** `media-map.js` is not just correct, it is the single best decision in
  this codebase. `media-audit.py` documents that 146 of 179 "videos" offered a play button that
  could not deliver. Asking the server instead of trusting a metadata field is the pattern the
  rest of the model should copy.
- A per-video transcript store is **correct**, and folding it onto the row in `backfill.py`
  rather than patching it in at page load was the right call.

What is actually broken is narrower and more fixable than "the architecture":

1. There is **no field that says what an asset is about**. `topic[]` is a closed 30-value
   vocabulary and 104 of 479 visible rows (22%) carry none of it; `description` is prose about
   the frame.
2. `search_terms` is **74% a copy of `title + description`** and sits at weight 3, one above
   `description` at weight 2. The description is therefore *already* effectively weight 3, and
   the code comment "description is support, not signal" is false in practice.

That second point changes the diagnosis. The brief blamed `topics_for()`. The measurement says
the wardrobe reaches ranking through **two** doors, and the bigger one is `search_terms_for()`,
not the topic matcher.

**Salvageable. Do not rewrite it.**

---

## 2. WHAT IS RIGHT — do not throw these away

**The probe-over-metadata principle.** `media-audit.py` and `check-types.py` both refuse to
answer from a field and go ask the artifact. `check-types.py` catching 20 rows typed Video
whose Drive folder holds nothing but PNG artboards is the class of bug no schema design
prevents. Keep both; extend the pattern.

**One visibility decision point.** `window.IFM_V1` is referenced on exactly one line, so Media
Kit, search, browse and counts cannot drift apart. This is why tightening "thumb OR playable"
to "thumb AND link AND playable" was a one-line change instead of a week.

**The comments.** Gold vs marigold; Women & Money at 216/379 carrying no information; `was` at
IDF 27.8 outscoring `gold` at 6.1; coverage measured in IDF mass not word count; constraints
read from what the user typed and never from synonym expansion. Every one encodes a real
failure. **These are the most valuable artifact in the repo.**

**Score each term once at its best field.** Why `hiral` cannot bank points from title + person
+ description + search_terms. It is also the exact mechanism that silently promotes the whole
description to weight 3 (§3.1).

**`speech` at weight 1 as its own field.** The fix that followed the weight-3 failure was
right and should not be revisited. `"herd mentality"` → 1 hit, IFM-398, correct.
`"apologizing"` → 1 hit, IFM-342, correct. Transcripts are findable without being loud.

**`hiral_named`.** A field that records *how confident the inference was* rather than
laundering it into the same shape as evidence. This is the one place the model already does
the thing recommended everywhere below.

**The rank-printing test output.** `run-tests.js` prints top-5 ids and scores, not just PASS.
A poor man's churn report, and why the SIP regression was noticed at all.

---

## 3. WHAT IS WRONG — ranked

### 3.1 `search_terms` is a laundered copy of the description, weighted above it — the headline defect, and not where the brief pointed

`backfill.py:430` takes the first 40 content words of `title + description + keywords` and
writes them into `search_terms`. `search_terms` is weight 3; `description` is weight 2.
Scoring takes each term once at its best field. Therefore **every description word is
effectively weight 3** — equal to `slide_text` and `session`, above `type` and `source`.

- Median **74%** of `search_terms` tokens already appear in that row's `title + description`.
- **141 of 479** rows carry pure-appearance tokens (chambray, maroon, panelling, lanyard,
  beige) inside `search_terms`, i.e. at weight 3.
- The genuinely novel payload is the synonym list — `workshop` (200 rows), `boardroom` (86),
  `candid` (73), warmth words (78–84 each). That part is real and valuable.

Measured on the live engine (re-verified independently):

| query | result |
|---|---|
| `chambray` | 1 hit, IFM-398, **score 139** |
| `term insurance` | 14 hits, IFM-398 #4, score 129 |
| `PPF` | 3 hits — IFM-398 is **#3 of 3, score 71**, behind a whiteboard diagram |
| `Sakshi` | 104 hits — IFM-398 is **#104 of 104, score 23** |

IFM-398 is four minutes of a participant explaining she did not know PPF was open to
non-employees. **Her shirt is worth 139 points. PPF is worth 71 and ranks her last.** That is
the owner's complaint, expressed as a number.

**Fix.** Reduce `search_terms` to the synonym payload only — drop `keep[:40]`. Keywords then
need their own home (§3.7). Cost: one backfill run, no deploy. **Risk: moves ranking on every
row. Must not share a pass with anything else, and needs the churn report from §6 first.**

### 3.2 There is no "about" field, so 22% of the library has no topical representation

- 104 of 479 visible rows carry zero topics; 44 of 203 videos.
- **141 of 203 videos have a description containing not one finance-content word.**
- 115 of those have a transcript, so the evidence exists; nothing consumes it for taxonomy.
- **112 of 203 videos** have appearance-dominated descriptions.

IFM-398's own `notes` in `data.js` state it outright: *"Spoken content is not transcribed —
this row describes who is on screen and the setting… Search will match the person and the
room, not the words."* That was an accurate description of the design. It is now a stale
statement of a bug.

### 3.3 `son\b` — the gold/marigold failure, recurring, in production

```python
('Family & Money', r'family|children|kids|teen(s|ager)?|school|parent|daughter|son\b'),
```

`son\b` has a right boundary and **no left boundary**, so it matches the tail of any word.
**15 rows** (independently re-verified) are tagged Family & Money for this reason:
"Bid-Ask **Lesson**", "NAV **Lesson**", "Hiral Mid-**Lesson** on Net Asset Value", "Emergency
Fund **Lesson**", "Fixed Deposits **Lesson**", "Jack**son** Hole", "ten-per**son** group shot",
"Buffett savings **lesson**".

The word-boundary discipline that stops `gold` matching `marigold` in the engine was **never
applied to the generator's own regexes**. The engine is careful; the thing writing the
engine's input is not.

Second problem, same rule: **Family & Money is on 127 of 502 rows (25%)**, and **73 matched on
`teen`/`teens`** — an *audience*, not a topic. The code three lines above already argues that
Women & Money at 216/379 "carries no information". The same reasoning was never applied here.

### 3.4 `source` conflates who produced it with who is in it

If "sakshi" appears anywhere in keywords/notes/description, `source = 'Sakshi'`. **103 of 479
rows** carry it — she is the photographer.

> `Sakshi` → 104 hits. IFM-398 — the video that opens *"Hi, I'm Sakshi Jivrajka"* — ranks
> **104 of 104**, score 23.

The one asset where she is the subject is the worst result for her name, behind 103 rows where
she held the camera.

**Critical constraint for any fix:** speaker identity **cannot be mined from transcripts**.
Across 145 transcripts, exactly **one** contains a self-introduction. Speaker is a
human/vision field, not a derived one.

### 3.5 `format` is one slot doing three incompatible jobs

It mixes **subject** (Portrait, Testimonial, Certificate, Hiral Speaking), **production role**
(B-roll) and **artifact kind** (Social Graphic). Single-valued, so a piece-to-camera reel must
choose. IFM-342 is `format: Portrait` while being 60 seconds of Hiral speaking.

- **65 of 479** rows have `format` hand-overridden in `enrichment.json` — 14% of the library
  needed a human to fix one field.
- **12 rows are `format: B-roll` and carry a transcript.** B-roll with a voice track is a
  contradiction the model permits and nothing checks.

Also, the IFM-098 failure class repeating: IFM-342's `notes` say *"the speaker's identity is
NOT confirmed (assumed Hiral from hair/wardrobe, not verified)"* — and the row ships
`person: ['Hiral']`. `backfill.py` never reads `notes` except for the Sakshi check, so the
warning is discarded.

### 3.6 `enrichment.json` overrides derived aggregates, not evidence

163 rows. Keys set: `format` 65 · `kit`/`kit_rank` 49 · `library` 35 · `person` 26 · `video` 26
· `type` 24 · **`search_terms` 17** · `slide_text` 9 · `description` 7 · `topic` 5. 101 carry a
written `_why` — that discipline is good.

The defect is the 17 `search_terms` overrides. `search_terms` is a *generated blob*. When the
synonym table changes, those 17 rows silently keep a frozen snapshot and stop receiving new
synonyms — a human correction that quietly becomes a regression. **Humans should correct
evidence and let the generator re-derive, not pin the output.**

`video` overridden on 26 rows also creates a loop: `media-audit.py` reads the catalogue *after*
enrichment patches the URL, so a URL fix needs backfill → audit → deploy → audit again.

### 3.7 `keywords` is used as evidence and then thrown away

All 542 rows have `keywords`. `backfill.py` reads it in four derivations — and the v1 row does
not carry it. So you cannot answer "why is this row tagged Family & Money" from the shipped
file, and keywords reach search only by being laundered through `search_terms` at weight 3.

### 3.8 The 12-second preview against a 4-minute transcript

- 139 visible rows have both a transcript and a playable preview.
- **1,268 transcript lines exist; 301 are clickable (24%).** Median row: 2 of 5 reachable.
- **50 of 139** previews cover less than 25% of the spoken audio.
- Worst: IFM-536 (290s audio / 8s preview, 81 lines), IFM-398 (261s / 8s, 38 lines).
- Scope: **36 videos have ≥45s of audio.** The owner's "~40 videos" is right.

### 3.9 No before/after diff in the generator

`backfill.py` prints aggregate coverage counts and writes the file. **No per-row diff**, so a
rule change that rewrites 502 rows reports as slightly different totals. Both shipped failures
were invisible in that report. This is the root cause of "every fix is a point solution that
breaks something else".

### 3.10 Smaller, real

- `silent` is computed in `backfill.py` **and** re-copied into `media-map.js`. Two writers, one
  truth. They agree today; nothing enforces it.
- `session` is present on only **232 of 479** — a weight-3 field, half populated.
- `source: Unknown` on **183 of 479 (38%)** — a weight-2 field whose commonest value is
  the absence of a value.
- 15 of 160 speech files are `{id, error}`. **Nothing reports the failed 15.**
- The hub references `speech`, `kit_rank`, `enrichment` and `v1-catalogue` **zero times**.
  Everything built in the last four days exists only in the Library. The "don't let the two
  front ends drift" constraint is already violated.

---

## 4. THE FIELD MODEL TO BUILD

Three principles, in order:

1. **Evidence and derivation are different kinds of field and must be visibly different.**
   `enrichment.json` may only override evidence.
2. **"About" and "looks like" are different fields, not different sentences in one field.**
   This needs no engine change — the frozen scorer takes fields and weights from a list.
3. **Confidence travels with the value.** `hiral_named` already proves the pattern works.

### Evidence — subject ("what it is ABOUT")

| field | source | consumes | authority |
|---|---|---|---|
| `about` — 1–3 sentences | **NEW.** Human/model, from transcript + slide + frame. Never wardrobe. | search **weight 4**, detail panel above `look` | enrichment > data.js |
| `claims[]` — 3–8 phrases, **extractive** | **NEW.** Lifted verbatim from `speech`/`slide_text`, capped, never paraphrased | search **3**, "What this covers" chips | generated; enrichment may replace |
| `slide_text` | unchanged | 3 | unchanged |
| `keywords` | **carried from `data.js`** (currently dropped) | **2**, provenance | data.js |
| `speech` | transcript store | **1 — frozen** | transcriber only |
| `speech_at[]`, `speech_dur` | same | transcript panel | transcriber only |
| `quote` `{t, text}` | **NEW**, one pull-quote | UI only, **weight 0** | human |
| `topic[]` | `topics_for()` — **untouched this pass** | filter, 5 | enrichment |

`claims[]` is the safe home for transcript-derived taxonomy, deliberately shaped to make the
earlier failure impossible: **extractive not inferential, capped at 8, and it never feeds
`topics_for()`.** A 600-word transcript cannot inflate it the way it inflated the topic matcher.

### Evidence — appearance ("what it LOOKS LIKE")

| field | source | consumes |
|---|---|---|
| `look` — **rename of today's `description`** | data.js / enrichment | search **weight 1** (down from an effective 3), detail panel below `about` |
| `shot_role` — Portrait · Testimonial · Classroom Moment · Hiral Speaking · Certificate · Student Question · B-roll | split from `format` | filter, 4 |
| `artifact_kind` — Photo · Reel · Carousel · Slide/Graphic · Game screen · Motion graphic | split from `format`; **file probe wins** | filter, 3 |

**Renaming `description` → `look` is the load-bearing move.** It is a statement of what the
field is for, addressed at whoever writes the next 5,000 rows. As long as it is called
"description", people will keep putting the room in it, because that is what it sounds like it
wants.

### Evidence — people

| field | source | note |
|---|---|---|
| `person[]` — who is **in frame** | unchanged | 4 |
| `hiral_named` | unchanged | confidence marker, never filters |
| `speaker[]` — who is **talking** | **NEW**, human/enrichment **only** | 4. Do not mine from transcripts: 1 of 145 self-identifies. |
| `audience` — Teens · Women · Corporate · Mixed | **NEW**, session + enrichment | 3. Takes 73 rows out of Family & Money. |
| `source` — **producer only** | unchanged | 2. Stop reading it as identity. |

### Derived / infrastructural

| field | note |
|---|---|
| `search_terms` | **synonyms only** — weight 3 becomes honest |
| `silent`, `playable`, `dur`, `preview_dur` | **media-map only, single writer** |
| `_src` | **NEW** per-field provenance (`shot` / `text` / `enrichment` / `probe`). Makes "why is this tagged Family & Money" answerable without rerunning the regex. `fmt_src` already computes this and throws it away. |

### Authority when sources disagree

```
file probe  >  enrichment  >  data.js  >  generated rule
```

with one carve-out: for **judgment** fields (`kit`, `kit_rank`, `speaker`, `shot_role`,
`about`) enrichment is top. A probe can tell you a file is a PNG; it cannot tell you whether
Hiral is the subject or a bystander.

### `FIELDS` after — additions only, scoring maths untouched

```js
['title',5],['topic',5],['about',4],['format',4],['person',4],['speaker',4],
['claims',3],['search_terms',3],['slide_text',3],['session',3],['audience',3],
['source',2],['type',2],['keywords',2],['look',1],['speech',1],
```

`look` at 1 puts wardrobe on the same footing as an unedited spoken aside — which is what it
is worth.

---

## 5. MIGRATION ORDER

Every step leaves the system green. Media steps need two deploys because `media-audit.py`
probes the live server.

| # | Change | Deploy? | How to prove it |
|---|---|---|---|
| **0** | `backfill.py --diff` (per-row churn) + `run-tests.js --ranks` (top-5 + scores, diffed) | No | Run `--diff` with no rule change; assert **zero** rows changed |
| **1** | Carry `keywords` and `_src` onto the row; not in `FIELDS` yet | No | `--diff` shows only added keys; suites unchanged |
| **2** | Add `about` + `claims` **empty**, wire into `FIELDS` at 4 and 3 | No | `--ranks` diff must be **byte-identical** — proves adding a field is free |
| **3** | Populate `about` + `claims` for the **36 videos with ≥45s of audio** | **Yes (1)** | `--ranks` reviewed row by row; expect IFM-398 → #1 for `PPF` |
| **4** | 60–90s previews for those same 36 | **Yes (2 + 3)** | Reachable transcript lines jump 301 → >1,000 |
| **5** | Rename `description` → `look`, weight 1; keep alias one release | Yes | `--ranks`; movement wherever a query hit only the description |
| **6** | `search_terms` → synonyms only | Yes | **Largest ranking move in the plan.** Retire the 17 `search_terms` overrides FIRST or they pin rows to the old blob |
| **7** | `speaker[]`, `audience`, split `format` → `shot_role` + `artifact_kind` | Yes | "photo of Hiral must not return a video" still passes; the 65 format overrides should **fall** |
| **8** | Re-derive `topic[]`. Fix `\bson\b`, move `teens` → `audience`, feed `about`+`claims`+`slide_text` — **never** `speech` or `look` | Yes | Own change, own review, own tests. Do not start before Step 0 exists. |

⚠️ **Step 4 needs a budget decision first.** The ≤200KB clip budget in CLAUDE.md **cannot hold
90s** at 480px/CRF30. Budget roughly 600KB–1MB each, ~30MB total, and check `.vercelignore`.

---

## 6. THE SAFETY THAT IS MISSING

Both shipped failures share one property: **they were invisible in every report the system
produces**, and only became visible when a human typed a query and looked.

### (a) Per-run field-churn report — catches the 19-videos-gained-4-topics failure

`backfill.py --diff` compares the existing catalogue to the one about to be written:

```
topic     changed  19 rows  (+71 tags, -0)   mean/row 0.94 -> 1.10   ▲ +17%
   IFM-077  [Inflation & Interest Rates] -> [Inflation…, SIP, Mutual Funds, Risk & Returns, Saving]
```

With a **hard gate**: if any field changes on more than 5% of rows, or a controlled-vocabulary
field's mean cardinality moves more than 0.15, the run **refuses to write** without
`--accept-churn "<reason>"`, and the reason is appended to a changelog. Feeding transcripts
into `topics_for()` would have hit that wall instantly. ~80 lines. No deploy.

### (b) Rank-churn report — catches the weight-3 speech failure

The suites assert *membership*, not *position*. `"find the clip where Hiral explains SIP"`
moving #1 → #4 kept passing. So: write the top 5 ids **and scores** for all 36 test queries and
diff against the committed previous run:

```
"find the clip where Hiral explains SIP"   IFM-286  #1 -> #4   (IFM-077 now #1, via speech)
```

Any top-1 change is reported loudly. Commit `ranks.json` so the diff is in the PR. ~40 lines.

### (c) Structural invariants — a fourth suite that never goes stale

The existing assertions are about *content* and legitimately rot. Invariants are about *shape*
and never should:

1. **Weight monotonicity.** No field derived from another may outweigh its source. Asserts
   `search_terms ≤ description` and `speech ≤ description`. **This alone fails the weight-3
   failure at commit time**, before a single query runs.
2. **Transcript containment.** `speech` appears in `FIELDS` only at weight ≤1, and no verbatim
   transcript token may appear in any other field.
3. **Vocabulary spread.** No topic on more than 20% of the library. **Family & Money at 25%
   fails this today.**
4. **Word boundaries.** Every bare-word alternative in the rule tables must be anchored both
   sides. **`son\b` fails this today**; so would the next one.
5. **Contradictions.** `shot_role == 'B-roll' ∧ speech_dur > 10` must be empty. **12 rows fail
   today.**
6. **Single writer.** `silent` written by exactly one script.
7. **Override hygiene.** `enrichment.json` may not set a derived field. **17 rows fail today.**
8. **Coverage floor.** `Video ∧ playable ∧ ¬speech` must not grow — it means transcription is
   falling behind ingestion. **64 rows today**; the 15 errored transcripts should be named.

~150 lines. The difference between "we noticed" and "we caught it".

---

## 7. WHAT BREAKS AT 5–10×

542 rows against **7,935 Drive files — 6.8% coverage.** Ten times is not hypothetical, it is
the backlog.

**Ships the whole corpus to the browser.** `v1-catalogue.js` is 676KB at 542 rows *with* 81
minutes of transcript inline. At 5,000 rows fully transcribed that is **8–12MB of JS**. `DF` is
built at load over every field of every row — at 10× a visible freeze. **The first thing that
must change at scale is that `speech` stops living in the catalogue file** — a lazy-loaded
`speech.js`, or a server-side index. This is the one place the architecture genuinely stops
working.

**Tuned constants are corpus-size functions with no owner.** `COVER_CAP=8`, the `0.45` coverage
floor (retuned from 0.55 when the set went 20 → 379), the squared IDF, the 5-topic cap, the
40-word cap. Every one was tuned at a specific N, and **nothing reports that it has drifted**.

**Serial network probing.** One HEAD per URL, sequentially. ~400 today; at 4,000 that is 30–60
minutes per run, twice per media change.

**Regex taxonomy.** 30 topics of hand-written patterns, each carrying scar tissue. The gold
rule alone is 10 lines to distinguish an asset class from a colour. At 5,000 rows this becomes
unmaintainable, and the honest answer is a classifier seeded from `enrichment.json`'s 163 human
decisions. A V3 conversation.

**The real bottleneck is description-writing.** 542 of 7,935 files are catalogued because each
row needs prose. Splitting `about` from `look` helps here too: `look` can be machine-generated
from the frame cheaply and is now worth weight 1, while scarce human attention goes to `about`,
worth 4.

---

## 8. WHAT TO DO FIRST

**Step 0 — the two reports.**

The owner wants a change that shows up in the product, and `about` on 36 videos is that change.
The recommendation is still the instrument, for one reason: **the stated frustration is that
fixes have been point-solutions that broke other things, and both failures were shipped by
someone who ran the tests, saw green, and had no way to see that 19 rows had been rewritten or
that the flagship query had moved from #1 to #4.** Every step in §5 moves ranking. Without the
diff, each one is another coin flip and the pattern repeats — just with better fields.

~120 lines across two existing scripts. **No deploy, no catalogue change, no risk.** It pays
out the hour it lands: run it against the `\bson\b` fix and it tells you *exactly* which 15
rows lose Family & Money and which queries move. That is the first time this project will be
able to answer that question **before** shipping rather than after.

It is not either/or within a week. Step 0 is a morning; Steps 1–3 are the rest of it. If only
one item is approved and it must be visible to the team, take Steps 1–3 — but the **very next**
approval must be Step 0, before Step 6 touches `search_terms`, because Step 6 moves everything
at once.
