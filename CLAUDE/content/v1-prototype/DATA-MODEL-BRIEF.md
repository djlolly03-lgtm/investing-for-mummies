# IFM OS Content Library — data model, as it stands 20 Sep 2026

Written for an audit. Everything here is measured, not remembered.

## What the system is

An internal catalogue of IFM's content — photos, videos, carousels from workshops, shoots and
agency deliveries — with a search UI the team uses to find an asset and get the real file.
Two front ends read two different stores:

| Front end | Path | Reads |
|---|---|---|
| Content Hub (6 tabs, operational) | `CLAUDE/content/index.html` | `content/data.js` |
| V1 Library (search) | `CLAUDE/content/v1-prototype/index.html` | `v1-prototype/v1-catalogue.js` |

`v1-catalogue.js` is GENERATED from `data.js` by `backfill.py` and must never be hand-edited.
Hand corrections go in `enrichment.json`, applied last, overriding every generated rule.
Decision 17 Sep 2026: run both, converge on one later. Not yet converged.

## The pipeline

```
Google Drive (7,935 files)
   └─ ingestion (daily-content-processor + manual passes)
        └─ data.js          window.IFM_DATA.catalogue — 542 rows, hand/machine written
             └─ backfill.py  rules: type, format, topic, person, source, search_terms
                  └─ enrichment.json   human overrides, applied LAST
                       └─ v1-catalogue.js  502 in-library rows  ← the search index
                            └─ index.html  ASSETS filter → search engine → UI
   media-audit.py  probes the LIVE server → media-map.js (playable/dur/silent)
   transcribe-videos.py  Drive master → whisper → speech/<ID>.json → row.speech
```

## Row shape today (v1-catalogue.js)

| field | source | used by |
|---|---|---|
| `id` | data.js | everything |
| `title` | data.js | search (weight 5), UI |
| `type` | mapped from legacy type | filter, ASSETS gate, search (2) |
| `format` | `shot` field, else regex on title+description+keywords | filter, search (4) |
| `topic[]` | regex on title+description+keywords, capped at 5 | filter, search (5) |
| `person[]` | regex on title+description+keywords | filter, search (4) |
| `source` | Aakara / IFM / Unknown | filter, search (2) |
| `session` | data.js | search (3), UI context |
| `status` | mapped | ASSETS gate, UI |
| `description` | data.js, hand-written | search (2), UI |
| `search_terms` | synonyms + top 40 content words of title+description+keywords | search (3) |
| `slide_text` | OCR of slides where present | search (3) |
| `thumb` | data.js `thumbnail` | ASSETS gate, UI |
| `video` / `drive` | data.js | ASSETS gate, UI, media-audit |
| `speech` | transcribe-videos.py (NEW 20 Sep) | search (1) |
| `speech_dur`, `speech_at[]` | same | UI (transcript panel, unshipped) |
| `kit`, `kit_rank` | enrichment.json, by eye | Media Kit block |
| `hiral_named` | whether her name was TEXT or inferred | context only |
| `library` | false = hidden | ASSETS gate |

## Visibility rule (live)

A row appears only with: a thumbnail AND a fetchable link AND (if Video) `media-map.playable`.
479 of 502 qualify. One decision point: `window.IFM_V1` is referenced on exactly one line.

## THE PROBLEM THIS AUDIT IS ABOUT

`topic`, `format`, `person` and `search_terms` are ALL derived from
`title + description + keywords`. `description` is hand-written and, for videos, describes
**what the frame looks like**. So the entire taxonomy of a video is a function of its wardrobe
and furniture.

Measured:

- 219 videos in the library
- **104** have descriptions dominated by appearance words (wardrobe, room, colour, pose)
- **53** have ZERO topics
- 139 now have a full transcript; **34 of those still have zero topics**

Worked example, IFM-398 — a 4m21s participant testimonial:

> description: "A woman in a blue chambray shirt patterned with small hearts sits at a
> polished wooden table against wood panelling, hands loosely clasped, looking straight down
> the lens. A phone rests on the table at her elbow. Steady, well-exposed to-camera
> testimonial."
> topic: []

What she actually says: she is Sakshi Jivrajka; she did not know PPF was open to
non-employees; what term insurance really means and whether it is needed "not just because of
herd mentality"; that she has told her husband they need to look at their investments
together; that the fear of investing is "not rocket science, it's pretty decoded"; that the
games were the best part.

The user, 20 Sep 2026: *"Instead of talking about the woman and what she has said, you're
speaking about the blue shirt... This gives no real context of what we're trying to pull here.
How can I find anything contextual that I can pull out from the metadata?"*

## A FAILED FIX, AND WHY IT FAILED — the thing to learn from

I fed `speech` into `topics_for()` alongside the description. Result: 19 videos jumped to 4–5
topics each, search reranked, and `"find the clip where Hiral explains SIP"` started returning
IFM-077 (an inflation clip that never says "SIP") at #1. Reverted.

Cause: the topic rules, the 5-topic cap and the acceptance tests were all calibrated against
~30-word descriptions. A 600-word transcript is a different KIND of evidence — it mentions
topics in passing that the video is not about — and pouring it into the same pipe changes
relevance everywhere at once.

Same class of error, earlier in the week: `speech` was first folded into `search_terms`
(weight 3, above `description` at 2), which ranked a spoken aside above a curated description
and pushed the right SIP clip from #1 to #4. Fixed by making `speech` its own field at
weight 1.

## Constraints the design must respect

1. **The search engine is frozen.** Scoring maths in `index.html` is not to be rewritten.
   Fields and weights can be added to the `FIELDS` list.
2. **Three test suites gate every change** — `run-tests.js` (14), a Phase 2 suite (14),
   `interpreter-tests.js` (structured 14 / natural 22 / acceptance 15). "NOT SHIPPABLE" blocks
   a deploy. Several assertions are about CONTENT, not the engine, and legitimately go stale.
3. **`backfill.py` regenerates all 502 rows at once.** A bad rule rewrites everything in one
   run. There is currently NO before/after diff report.
4. **`enrichment.json` overrides everything** and holds human judgment (Media Kit `kit`/
   `kit_rank`, identity corrections). It must keep winning.
5. Two front ends read two stores; anything added must not silently apply to only one.
6. Masters never enter the repo. Thumbs ≤25KB, preview clips ≤200KB (budget in CLAUDE.md).
7. Deploys need explicit user approval, and a new preview clip only counts as playable after
   a deploy, because media-audit probes the live server. Two deploys per media change.

## Decisions the user has already made (20 Sep 2026)

1. **New fields; leave `topic` alone for now.** Add content-derived fields and rewrite video
   descriptions content-first. Do NOT re-derive topics in the same pass — that is its own
   reviewed change with its own tests, because it moves ranking.
2. **Longer previews for talking videos.** 12s stays for b-roll; testimonials and
   piece-to-camera get 60–90s so the transcript is navigable. Capped to the ~40 videos where
   someone is actually talking. (Today: an 8s preview against a 4m21s transcript — 1 of 38
   lines is clickable.)

## The questions the audit must answer

1. Is the field model right? What is missing, what is redundant, what is doing two jobs?
2. How should "what it is about" and "what it looks like" be separated so a video's taxonomy
   stops being a function of its wardrobe — without a rewrite of the frozen engine?
3. What is the correct migration order so the OS keeps working at every step?
4. What safety is missing? (diff reports, invariants, tests that would have caught both of the
   failures above BEFORE they shipped)
5. Two catalogues, one generated from the other, plus an override file, plus a probe-generated
   media map, plus a transcript store. Is that the right decomposition, or is it the problem?
6. What in here will not survive the catalogue growing 5–10x?
