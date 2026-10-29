# After-class quiz — how it runs

Built 29 Oct 2026. One file, `index.html`, no build step. Session 1 only so far.

## The loop, day by day

| When | Who | What |
|---|---|---|
| End of class | Hiral / Wendy | Open the **teacher view** for the batch, press *Copy message*, paste into the batch WhatsApp group. Send by 5–6 pm while it's fresh. |
| Evening | Students | Tap the link, type first name, 5 questions, ~2 min. Instant right/wrong with one line of "why" and the handbook page. Result screen lists the pages to re-read tonight. |
| 8–9 am next day | Hiral / Wendy | Open the teacher view again. The **"Morning message for Hiral"** block is the whole update: who answered, average, which concepts need a recap, who to check in with. Copy, paste to Hiral. |
| Start of next class | Hiral | Recap whatever the message says, 5 minutes max. |

### Links

| | |
|---|---|
| Student | `https://games.investingformummies.com/after-class/?s=1&b=<batch>` |
| Teacher | same link + `&teacher=1` |

`s` = session number · `b` = batch code (letters/numbers, e.g. `nov26`). Every batch gets its own
link so results never mix. A link without `b` files under `guest` — that is what the student
"share with a friend" button sends, so friends can try it without polluting a batch.

## How results are read ("calibration")

The decision is **per question, not per student**, because the question is "do I recap this
concept tomorrow?" — not "who failed?". Thresholds live in one place at the top of `index.html`
(`CAL`, `RETEACH`, `STRUGGLING`); change them there and the teacher view and the morning message
follow.

| % of batch that got a question right | Verdict | Next class |
|---|---|---|
| 80% or more | Fine | nothing |
| 60–79% | One-line reminder | say it once |
| 40–59% | Recap | 5 minutes at the start |
| under 40% | Re-teach | the concept did not land |

Per student: anyone at **2/5 or less** is listed for a personal check-in. That is the early
warning the retention SOP wants.

Only the **first attempt** counts. A student can re-take to practise; later attempts are stored
as `latest` and raise the "tries" count, but do not move the batch numbers.

The first real batch sets the baseline. Expect the trap question (Q5, time beats amount) to score
lowest — it is designed to. If a question scores under 40% in *every* batch, the question is
probably the problem, not the class; rewrite it and bump `v` in the bank so old results are not
compared with new ones.

## Where the data lives

The Stock Rush / KBC Supabase project, `games` table — the same one every classroom game uses, so
there was nothing new to set up. One row per student per session:

```
room_code  = AQ-s<session>-<batch>-<first-name-slug>     e.g. AQ-s1-nov26-priya
state      = {kind:'after-class', v, session, batch, name, picks:[…], score, secs, ts, attempts, latest?}
```

The teacher view is just `select … where room_code like 'AQ-s1-nov26-%'`. Nothing is deleted by
the page. Test rows exist under batch `test` (29 Oct build) and are harmless.

The anon key is public (it already is in `quiz.html`), so anyone with a link can submit a
response. For a class quiz that is acceptable; it is not a grading system.

## Adding Session 2 onwards

Add a `2:{…}` block to `BANK` in `index.html` following the Session 1 shape — 5 questions,
mix 2 recall · 2 apply · 1 trap, each with a concept label `c`, handbook page `pg`, one-line
`why`. Nothing else changes; the link becomes `?s=2&b=<batch>`.

## Deploying

Code change → ask first, then from inside `CLAUDE/`, never 11:00–14:00 IST Sat–Thu. See the
root `CLAUDE.md`.
