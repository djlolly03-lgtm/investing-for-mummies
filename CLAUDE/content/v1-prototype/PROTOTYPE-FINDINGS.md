# V1 prototype — 20-asset acceptance test

Run 16 Sep 2026. Nothing in the live hub was touched.

**Result: 12 of 12 retrieval tests pass.** Four search bugs were found and fixed getting
there. Two taxonomy questions are open. One pipeline change is strongly recommended
before backfill.

```
CLAUDE/content/v1-prototype/
  taxonomy.js   the controlled vocabulary + legacy migration map
  tagged20.js   20 real assets tagged through the pipeline
  index.html    Library: search, filter, results, detail panel
```

---

## The 12 tests

| Query | Top result | |
|---|---|---|
| find me a video of Hiral talking about gold | IFM-101 Explaining Gold Investments (SGB & Gold Funds) | ✅ |
| funny classroom moments | IFM-339 RSS workshop — audience applauding | ✅ |
| show me student testimonials | IFM-268 September: Reviews | ✅ |
| find the clip where Hiral explains SIP | IFM-286 Teens — teaching compounding | ✅ |
| find gold b-roll | IFM-007 Ch.2 Inflation (coin→gold-coin tree) | ✅ |
| find content about financial independence | *no results* — correct, we have none | ✅ |
| find the video where Hiral talks about XIRR | IFM-009 returned; XIRR is in no Topic | ✅ |
| certificates from the August batch | IFM-288 Teens certificates, Aug 2026 | ✅ |
| insurance | IFM-179 Types of Insurance | ✅ |
| Hiral portrait for an agency | IFM-319 DSLR portraits | ✅ |
| compounding | IFM-286 / IFM-009 / IFM-018 | ✅ |
| savings vs investing | IFM-020 Savings vs Investing | ✅ |

The "no results" case matters as much as the hits. Nothing in the library is tagged
Financial Independence, and the honest answer is to say so rather than return the
Financial Planning assets because they share a word.

---

## Four search bugs, all now fixed

These were found by running the tests, not by reading code. Each one would have shipped.

**1. Substring matching returned nonsense.** The live hub does `haystack.includes(query)`.
A search for `gold` matches **marigold**, **teal/gold**, **black/gold**, **premium gold** —
37 rows in the real catalogue, almost none about the asset class. Fixed by matching on
word boundaries.

**2. No rarity weighting.** `the video where Hiral talks about XIRR` ranked three generic
Hiral videos above the one asset that mentions XIRR, because `hiral`, `video` and `talks`
each scored as much as the single word that identified it. Fixed with squared IDF: a term
in 1 of 20 assets now outweighs one in 12 by roughly 5×.

**3. Synonyms were treated as commands.** `talks` expands to the format `Hiral Speaking`.
That expansion was being applied as a hard filter, so *"Hiral talks about XIRR"* silently
excluded every B-roll asset — including the only correct answer. Constraints are now read
from what the user actually typed; a synonym only influences ranking.

**4. Coverage counted words instead of meaning.** Requiring "half the words must match"
let `financial independence` through on `financial` alone. Requiring *all* words then
broke `student testimonials`, because the testimonial carousel has no student in it.
Fixed by measuring coverage in IDF mass: most of a query's **rarity** must be accounted
for. A word absent from the corpus is weighted by the synonym it reaches instead of
scoring near-infinite rarity, which was separately breaking the maths.

Field weights: title 5 · topic 5 · format 4 · person 4 · search_terms 3 · slide_text 3 ·
session 3 · source 2 · type 2 · description 2. Each term scores **once**, at its best
field — summing across fields let a common word bank points from five places at once.

---

## What the 20 assets revealed about the taxonomy

### 🔴 Recommended change: capture what is on screen

The single biggest finding, and it is not a taxonomy problem.

IFM-099's catalogue row described *"a ways-to-invest-in-gold pie chart"*. Pulling a 1200px
frame and reading the projector showed the slide actually said:

> Gold: Your Portfolio's Safe Haven · **SGBs** (backed by RBI, for low-risk long-term
> investors) · **Gold Mutual Funds** · **ETFs** · **Digital Gold** · **Physical Gold** ·
> **5–10% of portfolio**

That is four Topics (Gold, Asset Allocation, Mutual Funds, ETFs) and a dozen search terms,
from one frame. The row's own text yielded one. **Workshop content is full of slides, and
the slide is where the topic actually lives.** Adding a `slide_text` field to the processor
is the highest-value change available and needs no taxonomy change at all.

### 🔴 The AI step must verify identity, not assume it

Four of the 20 rows described the presenter only as *"a presenter in a white top and red
trousers"*. Tagging `person: Hiral` from that would be a guess. It took pulling a frame and
comparing against a known founder reference to confirm it — which it did.

This matters because `person` is load-bearing for the main success query. Assuming would
have been right here and wrong elsewhere. The processor instruction should be: confirm
against a reference, or leave it blank.

### 🟠 Open question 1 — B-roll vs Classroom Moment

IFM-291 (*"wide view of the boardroom mid-session"*) fits both. I called it **B-roll** on
the grounds that it is establishing context rather than a human moment. The rule I applied,
which needs your ruling:

> **Classroom Moment** = something is happening — applause, laughter, interaction.
> **B-roll** = supporting/establishing footage with no specific moment.

This is the only genuinely fuzzy boundary in the nine formats. Everything else sorted
cleanly.

### 🟠 Open question 2 — hybrid AI + real assets

IFM-R01 (Money Map reel) is AI-generated footage cut together with real game screens,
assembled in-house. `Source` is single-valued, so it is either `AI Generated` or
`IFM / In-house`, not both.

I recorded **who produced it** (IFM / In-house), on the logic that Source answers "where did
this come from". If you would rather Source flag AI involvement for disclosure reasons, the
rule needs to invert. Affects roughly 15 game reels.

### ✅ Things that worked, and are worth confirming

- **TYPE maps 100% mechanically.** Video 182 / Image 167 / Carousel 35 across the full 384,
  zero unmapped. No AI needed for this field at all.
- **`Unknown` was the right call.** 7 of 20 (35%) have Source = Unknown, tracking the 52%
  in the full catalogue. Blank fields cost nothing in search and beat invented ones.
- **Topics legitimately do not apply to everything.** Portraits, certificates and
  testimonials carry none. That is correct, not missing data.
- **`Social / Promotional` works.** The game reels sort cleanly and stop polluting other
  formats.
- **Specific terms stay findable without becoming Topics.** SIP, XIRR, SGB, CAGR and RBI
  all retrieve correctly from `search_terms`, exactly as intended.

### Two observations, no action needed

- **`External` was never used** — nothing in the 20 establishes an outside producer. The
  value may still be right; this set just does not prove it.
- **`Silver` has zero assets** in the entire 384-row catalogue.

---

## What this means for the backfill

The pipeline works. The constraint is evidence, not taxonomy.

| Field | Backfill confidence |
|---|---|
| Type | **100%** — mechanical from existing `type` |
| Status | **100%** — mechanical (In Production + On Hold → Raw) |
| Format | 14% mechanical from `shot`; the other 329 rows need AI analysis |
| Topic | 0% mechanical — needs AI on every row, and is where slide text pays off |
| Person | needs verification per row, not inference |
| Source | ~48% mechanical; 199 rows go to Unknown unless file evidence says otherwise |
| Session | 26% already populated; rest from file dates + folders |

Recommended order: mechanical fields first (Type, Status, the 55 `shot` rows) so the
Library is immediately filterable, then AI passes for Format, Topic and Person in batches,
newest sessions first — that is what Aakara will search for.

---

## V2 parking lot

Raised while building, deliberately not built: distribution format (Reel/Story) as an
attribute · quality/hero ranking · consent as a first-class field rather than a note ·
workflow statuses · duplicate clustering in the UI · saved searches · "more like this" ·
embeddings-based semantic search.

None of them are needed to answer *"Can Aakara find the exact asset she wants without
talking to Sakshi?"*
