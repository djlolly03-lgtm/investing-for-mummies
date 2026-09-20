# How to author content moments

Read this before writing a single moment. The rules are not style preferences; most of them
exist because breaking them has already caused a real failure in this project.

## What you are doing

A four-minute testimonial is one catalogue row with one description. The useful part — *"I
did not know PPF was open to non-employees"*, *"I've told my husband we need to look at our
investments together"* — happens at 2:00 and is currently findable by nothing.

You are marking those spans so they can be found.

## The one rule

**A moment may not contain anything the transcript does not say.**

Every moment carries `evidence`: a **verbatim substring** of that video's transcript.
`moments.py --validate` re-reads the transcript and checks it. Evidence that is not found,
or that does not sit inside the span you claim, is a **hard failure**. Run the validator
yourself before you report finished.

Do not paraphrase into the evidence field. Do not clean up grammar. Do not merge two
sentences that are not adjacent. Copy the words.

The transcripts are machine-produced and contain errors — "Heral"/"Heeral" for Hiral,
"Providence Fund" for Provident Fund, "detailers" for what was probably "retailers". **Quote
the error as it stands in the evidence.** Write the correct word in the summary if you are
sure, and if you are not sure, leave it out. Never silently correct the evidence: the
validator compares it character by character and a helpful fix is indistinguishable from an
invention.

## Commands

```
/usr/bin/python3 moments.py --draft IFM-398    # the timed transcript, for reading
/usr/bin/python3 moments.py --validate         # the gate. Must print 0 HARD FAILURES.
/usr/bin/python3 moments.py --workset          # which videos qualify
```

## The schema

Write `moments/<ID>.json`:

```json
{ "id": "IFM-398",
  "authored": "2026-09-20",
  "by": "who or what wrote this",
  "moments": [
    { "title": "She did not know PPF was open to non-employees",
      "summary": "A specific misconception corrected: she had always believed the Provident Fund was only for salaried employees, and learned it is available to anyone.",
      "start": 111.0,
      "end": 130.9,
      "weight": "primary",
      "evidence": "Like the PPF, I did not know the Providence Fund was, I mean, I always thought it was only for employees, but turns out no, it is for any of us.",
      "search_terms": ["ppf", "provident fund", "ppf eligibility", "misconception corrected"] }
  ] }
```

| field | rule |
|---|---|
| `title` | A specific phrase, not a category. "She did not know PPF was open to non-employees", not "Insurance discussion". Someone scanning results should know what they will hear. |
| `summary` | One or two sentences, accurate, no adjectives the speaker did not earn. Say who is speaking if the transcript establishes it. |
| `start`, `end` | Real segment boundaries from `--draft`. Take them from the timed transcript; do not estimate. |
| `weight` | `primary` or `secondary` only. See below. |
| `evidence` | Verbatim. The strongest one or two sentences in the span. |
| `search_terms` | 2–5 phrases someone would actually type. Each must be licensed — see below. |

## primary vs secondary vs nothing

- **primary** — the video is substantially about this. A distinct question answered, an
  explanation delivered, an experience recounted.
- **secondary** — a real, self-contained passage worth finding, but not what the video is for.
- **nothing** — a passing mention. *This is the important category.*

`confidence` is said once in passing in a dozen videos. That is **not** a moment about
confidence. If someone names a topic and moves on in one clause, it gets no moment. The
distinction between a subject and a mention is the entire value here; without it this becomes
keyword spam with timestamps, which is worse than nothing because it poisons search.

## What licenses a search term

A term must either appear in the **span** (not just your quoted evidence — the whole claimed
span counts), or be listed in `SYNONYM_OK` in `moments.py`, or be one of the closed
`KIND_LABELS`. The validator reports anything else as a soft warning.

When it warns you, the default response is **delete the term**, not widen the licence. Two
terms were cut from the IFM-398 pilot for exactly this: "women and money" on a span that says
*"the men or working professionals talk about stuff"*, and "finance feels intimidating" on a
span that only says *"never quite understood"*. Both were reaches. Add to `SYNONYM_OK` only
when the substance is unmistakably present and only the word is missing — as with "ppf
eligibility" for *"only for employees … it is for any of us"*.

## How many moments

**As many as the content holds, and no more.** IFM-398 is 4m21s of structured Q&A and yields
10. A 45-second teaching clip may yield one. A 60-second reel with a single argument yields
one or two.

Do not pad to hit a number. Do not compress a genuine ten-moment interview into three.

## Things that are not moments

- Introductions and sign-offs ("Thank you Sakshi", "That's it") unless the content is in them
- The interviewer's question on its own — the answer is the moment; include the question in
  the span if it frames the answer
- Restating the video's title
- Anything you had to infer. If the transcript is unclear, omit it.

## Identity — read this, it has burned this project before

**A description asserting a name is not evidence of identity.** IFM-098 reached the live Media
Kit as a founder portrait because its description said "Founder Hiral Goel stands smiling…".
It is a participant's testimonial. The user caught it on the live page.

So: name a speaker in a summary **only** if the transcript itself establishes it — a
self-introduction, or someone addressing them by name. Across 145 transcripts exactly one
contains a self-introduction, so the honest answer is almost always "a participant" or
"the facilitator". Do not infer who is speaking from the row's title, its description, or its
`person` field.

## Before you report finished

1. `moments.py --validate` prints **0 HARD FAILURES**.
2. Soft warnings are 0, or each remaining one is explained in your report.
3. Re-read two of your own moments against `--draft` output and confirm the span really
   contains what you said it does.
4. Report the videos you wrote **nothing** for, and why. A video with no moments is a valid
   and expected outcome; hiding it is not.
