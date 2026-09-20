# Every error, and what I did about it — IFM OS Content Library

Written 20 Sep 2026 at Aditya's request: *"send me all the errors we have encountered + all
your solutions that u have used. i want to anaylize what uve done"*

Ordered by class, not by time, because the pattern matters more than the sequence. Each entry
says what broke, how it was found, what I did, and — where there is one — the lesson that
should outlive the fix.

Errors I caused are marked **[MINE]**. Errors that were already in the system are marked
**[FOUND]**. I have not softened either.

---

## A. The pattern the owner named, with the evidence

On 20 Sep Aditya said, twice: *"you are just solving that one thing that we are talking about,
not really understanding how it impacts everything else"* and *"you keep saying yes, yes, yes,
and I don't know if you're actually doing any work."*

Three entries below are that pattern exactly — A1, A2, A3. All three are mine. All three share
one cause: **I changed a shared upstream input to fix one symptom, without measuring what else
read from it.**

### A1 [MINE] — Speech folded into `search_terms` at weight 3, above `description` at 2

**What I did.** Transcribed 139 videos, then appended each transcript's content words to that
row's `search_terms` so spoken words became searchable.

**What broke.** `search_terms` carries weight 3 in the engine's `FIELDS` list.
`description` carries 2. So unedited talk outranked a curated description. `"find the clip
where Hiral explains SIP"` dropped the right answer from #1 to #4. Three precision tests
failed: `CAGR`, `ETF`, and `blue hat must return nothing`.

**How it was found.** The test suites. `run-tests.js` went 14/14 → 12/14 and
`interpreter-tests.js` printed NOT SHIPPABLE. It did not reach the live site.

**Fix.** Speech became its own field at **weight 1**, the lowest there is, instead of being
stuffed into someone else's field. Added to `FIELDS` in `index.html`; `backfill.py` no longer
appends it to `search_terms`. A phrase stays findable; a stray spoken word cannot drag a
result to the top.

**Lesson.** A new kind of evidence needs its own field and its own weight. Reusing an existing
field inherits a weight that was calibrated for different content.

### A2 [MINE] — Transcripts fed into a topic matcher tuned for 30-word descriptions

**What I did.** IFM-398 — a 4m21s testimonial — had **zero** topics, because topics derive
from the description and its description is about a shirt. So I added `speech` to the text
`topics_for()` matches against.

**What broke.** 19 videos jumped to 4–5 topics each. Search reranked across the library.
`"find the clip where Hiral explains SIP"` started returning IFM-077 at #1 — an inflation clip
that never says the word "SIP".

**How it was found.** `run-tests.js` 14/14 → 13/14. I then A/B'd it: reverted the one change,
re-ran, 14/14 returned. That confirmed cause rather than assuming it.

**Fix.** Reverted. Not yet re-attempted.

**Why it failed.** The topic rules, the 5-topic cap and the acceptance tests were all
calibrated against ~30-word descriptions. A 600-word transcript is a different *kind* of
evidence: it mentions topics in passing that the video is not about. Same pipe, wrong input.

**Lesson.** This is A1 again, one layer up, and I did not spot it. When a change moves
ranking, the diff to review is not the code — it is the 502 rows before and after.

### A3 [MINE] — Shipped search plumbing while the page the owner looks at was unchanged

Two deploys of transcript search went live while the modal still showed only the wardrobe
description and no transcript. From the owner's seat that is indistinguishable from nothing
having happened, and his reaction was correct.

**Lesson.** "Shipped" means visible in the UI the person uses, not present in the data.

---

## B. Errors that hid content — things that existed but could not be found

### B1 [FOUND] — The whole taxonomy of a video derives from what the frame looks like

**The defect.** `topic`, `format`, `person` and `search_terms` are *all* derived from
`title + description + keywords`. `description` is hand-written and, for videos, describes
appearance. So a video's taxonomy is a function of its wardrobe and furniture.

**Measured.** 219 videos in the library. **104** have appearance-dominated descriptions.
**53** have zero topics. IFM-398 — four minutes on PPF, term insurance and telling her husband
they need to review their investments — is tagged with nothing, and its description is
*"a blue chambray shirt patterned with small hearts… a phone rests on the table at her
elbow."*

**Status. UNFIXED.** This is the root cause under the whole week, and it is what the external
data-model audit is now running against. My one attempt at it is A2.

### B2 [FOUND] — Speech search covered 26 of 219 videos, all from one workshop series

*"Find where Hiral says 'if this resonates with you…'"* returned nothing. Not because the clip
did not exist — because nothing had ever listened to it.

**Fix.** `transcribe-videos.py`. Fetches each Drive master, extracts 16kHz mono, **deletes the
master**, transcribes, stores `speech/<ID>.json`, moves on. 139 videos, 1.3 hours of audio,
22.6 GB streamed through one temp file a few hundred MB at a time. Resumable per video,
smallest first.

**Result.** The line was at **0:54 of IFM-342**, and the words are *"follow investing for
mummies and join our workshops"* — not "come join our class". That is why every text search
missed it.

### B3 [MINE] — I transcribed the 12-second previews first, which cannot work

**What I did.** Transcribed all 221 local preview clips, because they were already on disk.

**Why it was wrong.** A preview is the first 12 seconds of the master *by construction*. It
can only ever catch an opening line. A call to action is the last thing said. The phrase being
searched for sits at 0:54 — no amount of preview transcription would ever have reached it.

**Fix.** Threw it away and built the master-based pipeline (B2). The wasted pass is recorded
in the script's docstring so nobody repeats it.

### B4 [FOUND] — 31 preview clips existed, were deployed, and were invisible

`media-audit.py` probes the URLs a **row names**. 31 rows had a preview clip built and
published but an empty `video` field, so the audit never looked at them and the Library hid
them as unplayable.

**Fix.** Those rows now name their own clip. Playable **172 → 203**, Library **448 → 479**.

### B5 [FOUND] — `rclone lsjson -R` under-reports, non-deterministically

A full-drive scan missed an entire event. The recursive listing silently returns fewer files
than exist.

**Fix.** Walk each root explicitly with `--drive-root-folder-id`. Recorded in the
`daily-content-processor` skill so the next scan does not trust `-R`.

### B6 [FOUND] — The Aakara Slides deck is a planning calendar, not a delivery

A sync pointed at the "IFM Creatives_<Month>" deck missed **29 finished posts over two
months**. The finished files are in the folder tree; the deck is a plan.

**Fix.** Scan the tree. Written into CLAUDE.md as a named gotcha.

### B7 [FOUND] — RAW files were dropped by every scan

Every scan filtered on common photo/video extensions, so Canon `.CR3` files were silently
skipped. Found only when Aditya challenged a file count. 11 frames of a corporate shoot had
never been catalogued.

---

## C. Errors that showed the wrong thing — trust damage

### C1 [FOUND] — IFM-098 reached the live Media Kit as a founder portrait. It is a participant.

Its description asserted *"Founder Hiral Goel stands smiling in front of the branded slide."*
Every automatic check agreed, **including `hiral_named`** — the field added specifically to
separate confirmed identity from inference. The name was in the text; the text was wrong.

Aditya caught it on the live page.

**Fix.** Guards in the skill: never promote to rank 1 on a description alone; treat a seated
piece-to-camera in front of an IFM slide as a testimonial by default; when unsure use rank 3,
which is not shown by default, so an error there is invisible.

**Lesson, and it is the important one.** *A description asserting a name is not evidence of
identity.* Nothing I can build catches a confident, specific, wrong description. I also got it
wrong in the other direction — I doubted IFM-376 and IFM-392, which Aditya confirmed **are**
her. Both directions. Show the contact sheet and ask.

### C2 [MINE] — The Media Kit was rejected twice, and both rejections were fair

First pass: *"lots of repeats."* Second: *"5 of your 16 photos are from the same angle, same
clothes, same seating."*

**Root causes, all three mine:** filtering by tag to decide what to look at, instead of
looking; judging at 210px; inventing shoot clusters from ID adjacency rather than from the
frames.

**Fix.** Rebuilt by eye from labelled contact sheets (12 per sheet, 69 candidates → 6 images).
The cap became **per SETUP** — outfit + framing + room — not per shoot. 13 visible across 11
outfits.

### C3 [FOUND] — 20 rows typed `Video` were folders of PNG artboards

They drew a play button over a still. `check-types.py` had a folder-row exemption — "a folder
is not one file, so it is unanswerable" — and that exemption is what let them through.

**Fix.** Closed it. A folder that is *all* stills is an image set and the check says so; a
**mixed** folder answers nothing and stays UNVERIFIED rather than being guessed at. That
distinction matters: IFM-319 is DSLR portraits in a folder that also holds four clips, and
calling it a Video would be a worse error than the one the check exists to catch.

### C4 [FOUND] — Six rows describing one moment each opened the same 761-file folder

*"Boardroom shoot — participant asking a question"* handed you the entire Aakara delivery
tree. The moments rule says one moment links to its own file; only a catch-all may open a
folder.

**Fix.** `check-types.py` now reports OVER-BROAD LINKS as their own defect class. Each of the
six was relinked to its own CR3 frame — the notes already named the exact frame.

### C5 [FOUND] — 8 rows typed `Video` instead of the legacy `Session Video`, so they had no type at all

Silently type-less, therefore unfilterable. Caught by `check-types.py`.

---

## D. Errors in my own tooling

### D1 [MINE] — 14 duplicate IDs, and 14 thumbnails overwritten, deployed

A script **printed** "next free id: IFM-500" and then used a hardcoded `start=484`. It
overwrote 14 existing thumbnails and shipped.

**Fix.** Rebuilt from Drive, renumbered to 500–513.

**Lesson.** A script that computes the right answer and then ignores it is worse than one that
never computed it — the log said it was correct.

### D2 [MINE] — `.mp4.tmp`, so 36 preview clips shipped oversized

ffmpeg infers the muxer from the file extension. A temp file ending `.tmp` gave it nothing to
infer from, and the encode fell back to something far larger than the 200KB budget.

**Fix.** Temp files end `.mp4`.

### D3 [MINE] — `../https://…` thumbnails, so 11 tiles never rendered

`backfill.py` prefixed `../` to every thumbnail path, including ones that were already
absolute URLs.

**Fix.** Check the scheme before prefixing.

### D4 [MINE] — Both test suites were measuring a library that does not exist

Neither suite loaded `media-map.js`. Under node every Video therefore looked unplayable, and
the new visibility rule silently dropped **172 rows**. I spent real time chasing a
`"stree dhan"` failure that was entirely this.

**Fix.** Both suites load `media-map.js`. Written into CLAUDE.md as a standing requirement.

**Lesson.** The suite must load what the page loads, or it is testing a different application.

### D5 [MINE] — `const` inside the block the test harness `eval`s

The harness slices the engine out of `index.html` and `eval`s it. I wrote
`const T = …,` and then opened a new `const` inside the continuation, which is a SyntaxError.
Every suite failed to start.

**Fix.** Terminated the declaration properly. The file already carried a comment warning about
this class of breakage; I broke it anyway.

### D6 [MINE] — `rclone backend copyid` hangs forever with no output

Preview fetching failed 18 times, then crawled. `backend copyid` prints no stats and honours
no idle timeout, so a stalled transfer just sits there — **24 minutes on a 40 MB file with
zero bytes on disk.** I initially misread this as Google throttling us.

**Fix.** `rclone copyto` against the file's parent folder id plus its path takes the ordinary
transfer path, where `--timeout` actually kills a dead connection and retries. Same file, same
link: **1.4–2.2 MB/s**. Baked into `transcribe-videos.py` with the reason, so it cannot be
reintroduced.

### D7 [MINE] — The folder cache collided with the file-index glob

I cached folder listings at `/tmp/ls_folders.json`, which matched `check-types.py`'s own
`/tmp/ls_*.json` loader glob. Different shape, instant crash.

**Fix.** Renamed, with a comment saying why.

### D8 [MINE] — Backticks in a commit message were shell-executed

Amended and force-pushed with `--force-with-lease`.

---

## E. Search-quality errors

### E1 [FOUND] — `"testimonial from a mum"` returned 0

The coverage gate vetoes a query when a content word appears nowhere in the library. Nobody
writes "mum" in a description.

**Fix.** A vernacular mapping, mum → woman, deliberately excluding "mummies" (the brand name).

### E2 [FOUND] — `"gold jewellery"` passed only by accident

It looked correct, but only because 8 decorative Vedanta renders were diluting the term.
Deleting those renders broke it — which proved the test had never been testing what it
claimed.

**Fix.** An explicit `ORNAMENTAL_GOLD` rule, plus three acceptance tests. Gold now needs
investment context or an asset-class list; decorative gold (gold coins, a gold trophy, gold
hoop earrings) does not count. A naive `\bgold\b` matched 37 rows, of which about eight were
real.

### E3 [FOUND] — Conversational filler outweighed the subject 4:1

`was` appears in exactly 1 of 378 assets, giving it an IDF of 27.8 against `gold` at 6.1. A
meaningless word beat the subject and starved the coverage test.

**Fix.** An extended STOP list covering filler and generic query nouns. `moments` alone was
why `"funny classroom moments"` returned nothing.

### E4 [FOUND] — "Newest first" still sub-grouped results

**Fix.** Newest-first now returns one flat list, as asked.

### E5 [MINE] — Four test assertions went stale, and I updated them

They asserted that `CAGR`, `crypto` and `ETF` appear **nowhere**. Those were facts about the
*content*, and transcription falsified them: a participant reads *"looking at that CAGR,
looking at XIRR"* off her notes in IFM-536; IFM-271 ranks crypto's risk against other assets;
IFM-327 says *"New jewelry, add to your Gold ETF."*

They now assert the opposite and more useful thing: a term nobody ever wrote down is findable
because somebody said it.

`"blue hat must return nothing"` was retired for the same reason — it stopped being nonsense.
`blue` is in the library (a "blue chip fund") and `hat` is in it ("at the drop of a hat"), so
the coverage gate correctly let it through. Replaced with `"scuba trombone"`, words we
genuinely do not have, which keeps the guard's intent.

**This is the entry most worth challenging in the audit.** Updating a failing test is exactly
what a lazy fix looks like. My argument is that these assertions were about content, not about
the engine, and there is prior precedent in the file for changing them with cause. Judge it.

---

## F. Open, unfixed

| | |
|---|---|
| **B1 — video taxonomy derives from appearance** | the root cause; audit in progress |
| Nightly GitHub backup has failed 8 days | launchd lacks Full Disk Access; needs Aditya's password |
| Two catalogues, "converge on one later" | not converged |
| 23 rows hidden by the visibility rule | 18 are planning rows with no file yet; correct, but worth a review |
| 41 rows UNVERIFIED in `check-types.py` | Slides decks and unwalked folders |
| Certificates sheet | contains zero Drive links; may have no remaining job |
| Password gate on the Library | parked by Aditya |
| Transcript panel in the modal | built, tested locally, **not deployed** |
| 60–90s previews for talking videos | agreed, not built |

---

## G. What I would tell my replacement

1. **The description is the upstream input to everything.** Change it and you change topics,
   format, person, search terms and ranking, for 502 rows, in one run. There is currently no
   before/after diff report. That absence is the single biggest safety gap.
2. **Run all three suites before and after every change**, and A/B when one fails — revert the
   one change and re-run, rather than reasoning about the cause.
3. **A comment in `backfill.py` or `index.html` usually encodes a failure.** The gold rules,
   the STOP list, the coverage gate and the 5-topic cap each exist because something shipped
   wrong. Read them before proposing.
4. **Evidence over inference, and a confident description is not evidence** (C1).
5. **Deploy is two steps for anything with media**, because `media-audit.py` probes the live
   server. A new clip only counts as playable on the second deploy.
6. **Visible or it did not happen** (A3).

---

## H. Added after the external data-model audit, 20 Sep 2026

### H1 [MINE] — "One representative video per folder" is the same sampling shortcut, a third time

16 video rows point at a **folder**, not a file. `transcribe-videos.py` transcribes one video
from each and moves on. Two of those folders are **IFM-340** ("RSS workshop raw dump, 101
clips") and **IFM-315** ("Corporate workshop 4 Jul, 165 clips").

I wrote the rule and then wrote a code comment calling it *"the honest thing to index"*, which
made a shortcut look like a decision. Aditya spotted it from the outside: *"by you just taking
the first 10-20 seconds… you are missing the context."*

He was half right in a way that matters. The transcripts themselves are **not** truncated — I
re-fetched IFM-455's master (142 MB) and `ffprobe`d it: the file genuinely is 13.1 seconds,
which is what the transcript says. Raw 4K workshop clips are short and enormous. But the
folder-sampling hole is real, and it is a third instance of "sampled the front and called it
the thing" — after B3 (transcribing previews) and the preview-length flaw.

**Status: UNFIXED.** The folders have not been walked, so the size of the hole is unknown.

### H2 [FOUND — by the audit, not by me] — I was aiming at the wrong door

I spent the day on `topics_for()`. The audit measured that the bigger route from wardrobe to
ranking is `search_terms_for()` (`backfill.py:430`), which copies the first 40 content words of
`title + description + keywords` into `search_terms` — **weight 3**, one above `description`'s
own weight 2. Scoring takes each term once at its best field, so **every description word is
already effectively weight 3.** The comment in `index.html` saying "description is support, not
signal" is false in practice.

Verified by me on the live engine:

| query | IFM-398 (4m21s on PPF, term insurance, talking to her husband) |
|---|---|
| `chambray` (her shirt) | **#1 of 1, score 139** |
| `term insurance` | #4 of 14, score 129 |
| `PPF` | **#3 of 3, score 71** — last |
| `Sakshi` (she says "Hi, I'm Sakshi Jivrajka" at 0:01) | **#104 of 104, score 23** |

Her shirt outscores what she says about PPF by 2:1. And `source: 'Sakshi'` is on 103 rows
because she is the *photographer*, so the one asset where she is the subject is the worst
result for her own name.

### H3 [FOUND — by the audit] — `son\b`, the gold/marigold failure recurring in production

`backfill.py:95`: `('Family & Money', r'family|children|kids|teen(s|ager)?|school|parent|daughter|son\b')`

`son\b` has a right boundary and **no left boundary**, so it matches the tail of any word.
Verified: **15 rows** are tagged Family & Money solely because of a word ending in `-son` —
"Bid-Ask **Lesson**", "NAV **Lesson**", "Jack**son** Hole", "ten-per**son** group shot",
"Buffett savings **lesson**".

The word-boundary discipline in `index.html:797` — the decision the comment calls out as the
single thing stopping `gold` matching `marigold` — was never applied to the generator's own
regexes. The engine is careful; the thing writing the engine's input is not.

Also measured: **Family & Money is on 127 of 502 rows (25%)**, and **73 of those matched on
`teen`/`teens`** — which is an *audience*, not a topic. `backfill.py:89` already contains this
exact argument about Women & Money firing on 216 of 379 rows and "carrying no information".
The same reasoning was never applied to the rule three lines below it.

### H4 [FOUND — by the audit] — the safety gap, named precisely

Both of my ranking failures (A1, A2) were **invisible in every report the system produces**.
The suites assert membership, not position, so `"find the clip where Hiral explains SIP"`
moving #1 → #4 kept passing. And `backfill.py` prints aggregate coverage totals, so rewriting
19 rows' topics showed up as slightly different totals.

The two missing instruments: a **per-row field-churn diff** in `backfill.py` that refuses to
write when a field changes on >5% of rows without a stated reason, and a **rank-churn report**
in `run-tests.js` that records the top 5 ids and scores per query and diffs against the last
run. Roughly 120 lines, no deploy, no catalogue change.
