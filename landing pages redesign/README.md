# Landing Pages Redesign

Work on the IFM registration page (`investingformummies.com/registernow`), August 2026.

---

## Start here

**`registernow-checklist.html`** — the working list. 34 tasks and 2 decisions, grouped
Today / This week / Next / Ongoing / Cleanup, each with an owner and a time estimate.
Tick items off as you go.

Use the **artifact link** for this one, not the local file — ticks there save for
everyone with the link, so the whole team sees the same progress:
https://claude.ai/code/artifact/ca835b01-367d-439f-972e-795844d428c5

The local copy works too, but ticks stay on your own device.

**Nobody needs to read the two documents below to work the list.** They're the
reasoning behind it, for whoever wants the background.

---

## Background (optional reading)

### `registernow-teardown.html` — the audit
What's broken, what works, and how the page compares to two competitors.

- 3 critical findings, 6 important, 7 polish, 11 verified working
- Benchmarked against `webinar.finkhoz.com` and `workshop.digitalscholar.in`
- Ten parts, with a contents nav at the top

**The headline finding:** September buyers are shown ₹19,000 on the landing page and
charged ₹21,000 at checkout. The September early-bird deadline (20 Aug) expired, but
the page still advertises it. October is still correctly discounted until 20 Sep.

### `rebuilding-registernow.html` — the rebuild
Positioning, then the page block by block with copy written to paste.

- The position, in one line, plus five supporting pillars
- 14 page blocks in order, with real copy and real asset filenames from this repo
- What to delete
- The traffic reality — why the page isn't the constraint
- Build order with owner and effort tags

**The position:** the only money school built for mums — taught by a business journalist
who was still shut out of her own money conversations.

---

## Also here

`steal-this-funnel.html` — **superseded.** This was the standalone competitor teardown,
published before the audit and competitor analysis were merged. Everything in it now
lives in Part 5 onward of `registernow-teardown.html`. Kept for reference only; use the
audit instead.

---

## Where the evidence came from

Nothing in either document is from memory — every claim was checked against a live
fetch or a file in this repo.

| Source | Used for |
|---|---|
| Live fetch of `/registernow` + `/ifm` checkout | Pricing bug, tracking census, page weight, batch routing |
| Live fetch of both competitor pages | Side-by-side comparison, pixel stacks, copy patterns |
| `CLAUDE/content/ifm-published.json` | Post engagement — founder/face content beats explainers |
| `CLAUDE/content/ifm-followers.json` | Follower count and growth rate |
| `CLAUDE/content/comp-synthesis.json` | 0/13 competitors target mums; 0/13 have games |
| `CLAUDE/hiring/social-audit-aug-2026.md` | Seat math, CTA gap, student/revenue numbers |
| `CLAUDE/proposals/assets/` | Photos specified in the rebuild blocks |

The raw page captures (IFM, Finkhoz, Digital Scholar) weren't copied here — the
Digital Scholar one alone is 6.4 MB. Ask if you want them archived alongside.

---

## Open questions

1. **September pricing** — revert to ₹21,000 as the code currently does, or extend the
   early bird? The page and the checkout disagree right now, and September batches start
   1 Sep.
2. **SEBI status** — the rebuild recommends stating plainly whether IFM is SEBI-registered
   or education-only. Finkhoz leads with that badge. Ambiguity costs more than either answer.

Resolved: the two date gaps (Mon 14 Sep, Tue 20 Oct) are confirmed deliberate holiday
skips — they just need labelling on the page.

---

## Momentum Board

The 36 items are staged as a Google Sheet in Drive, ready to move onto the board:

**IFM — Landing Page Rebuild (copy into Momentum Board)**
https://docs.google.com/spreadsheets/d/1qvXkUmsKvfoLCdFGZrmqizVqMf8IIaRYHF1FHTKPYSs/edit

To add it to the board: open that sheet → right-click the tab at the bottom →
**Copy to → Existing spreadsheet** → pick **IFM Momentum Board** → rename the new tab.
Nothing on the existing five tabs is touched.

Columns match Open Topics: `ID · Task · Phase · Owner · Added · Deadline · Status · Why it matters`

`momentum-landing-page.csv` / `.tsv` are the same 36 rows as flat files, if you'd rather
paste into a new tab directly.

**Two things to fix before a Monday review:**
- **Owners are incomplete.** HG (5), Asba (1) and Sakshi (2) are assigned. The other 28
  are marked `Dev ?` (17) and `Copy ?` (11) — they need real names, per the board's
  one-owner-per-item rule.
- **Deadlines are proposed, not agreed.** Decisions and Today = 27 Aug; This week =
  31 Aug (before September B1 starts on the 1st); Next = 12 Sep; Ongoing and
  Cleanup = 30 Sep.

⚠️ The Apps Script write bridge for the Momentum Board rejects the stored key
(`bad key`, checked 27 Aug 2026) — it was rotated or re-deployed after 12 Aug. Read
access via the xlsx export still works.
