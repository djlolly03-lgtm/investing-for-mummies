# V1 Library — UX audit

16 Sep 2026. Conducted by driving the actual prototype at 1280×860 and at 375×812, running
the ten tasks as a user would. Taxonomy and classifier are frozen; everything below is
interface and ranking.

**The question:** can Aakara find and retrieve the exact asset she wants, quickly, without
knowing a filename or asking Sakshi?

**Verdict:** the finding works, the *finishing* does not. Search returns the right asset in
the top three for eight of ten tasks. But she has to scroll past a wall of chrome to see
any result, broad queries return up to 172 hits with no sense of where the good ones stop,
and the flagship query — "gold" — puts four decorative gold-coloured animations above the
actual gold-investment video.

---

## The ten tasks

| # | Task | Result | Top hit | |
|---|---|---|---|---|
| 1 | Video of Hiral talking about gold | 36 hits | IFM-101 correct when phrased in full | ⚠️ |
| 1b | …but typing just **"gold"** | 36 hits | **4 decorative "gold globe" renders rank above it** | ❌ |
| 2 | Gold B-roll | 7 | all gold-*coloured* Vedanta renders | ⚠️ |
| 3 | Funny classroom moments | **172** | IFM-357 / IFM-066 correct | ⚠️ |
| 4 | Certificates from the August batch | 14 | IFM-288 correct | ✅ |
| 5 | Portrait of Hiral | 15 | IFM-067 correct | ✅ |
| 6 | Insurance | 3 | IFM-179 correct | ✅ |
| 7 | Video where Hiral explains SIP | **77** | IFM-286 correct | ⚠️ |
| 8 | XIRR | 6 | Risk & Returns clips — honest, term exists nowhere | ✅ |
| 9 | Financial independence | 2 | IFM-260 correct; IFM-024 is a weak match | ⚠️ |
| 10 | Get the actual Drive file | 2 clicks | real Drive URL, video plays in-panel | ✅ |

Task 10 in detail: search → click row → detail panel opens with a **working video player**,
nine metadata fields and an **Open in Drive ↗** button pointing at the real file. That
journey is genuinely good and needs no rework.

---

## A. What works — do not break these

- **Precise queries are excellent.** "insurance" → 3. "testimonial" → 1. "August
  certificates" → 14. "portrait of Hiral" → 15. No noise.
- **The detail panel is the strongest part of the product.** Video plays inline; she never
  has to open Drive just to check whether it is the right clip.
- **"Open in Drive" works** and resolves to the actual file.
- **Unknown single words return nothing** — "crypto", "bitcoin", "xyzzy" all correctly
  return 0 rather than guessing.
- **A "why it matched" line already exists** under each result (`matched on topic · person`).
- **It is instant.** 379 assets, no server, no perceptible delay.
- **No horizontal overflow on mobile**; the table drops Topics and Source below 700px.
- **Table over cards was the right call** — scannable, dense, comparable.

## B. What is confusing or broken

**1. ❌ Decorative matches outrank real ones.** Typing `gold` returns, in order: two
Swayamvar reels, then **four "Vedanta demerger — gold globe" renders**, and only then
IFM-099 / IFM-100 / IFM-101. The topic tagging is correct — those renders carry no Gold
topic — but the *ranking* treats a title word and a controlled Topic as equally important.
An asset actually tagged `Gold` must beat one that merely says "gold globe".

**2. ❌ Broad queries return unusable volumes.** "funny classroom" → 172 of 378.
"Hiral explains SIP" → 77. There is no relevance cutoff and no signal for where the good
results stop, so Aakara cannot tell whether result 40 is worth scrolling to.

**3. ❌ Nonsense multi-word queries return content.** "purple elephant" → 5 hits (matches
the *purple* Money Map tracker). "blue hat" → 31. One incidental word carries a query that
should return nothing. This is the "vaguely related content" the brief explicitly forbids.
Single unknown words behave correctly; only multi-word queries leak.

**4. ❌ Mobile buries the results.** At 375px the title, jargon subtitle, developer banner,
nine example chips and six filter dropdowns consume roughly **1,200px before the first
result**. The core journey starts below several screens of chrome.

**5. ❌ The detail panel stays open when you search again**, covering the new results. It
must close on a new query.

**6. ⚠️ The banner is written for a developer, not for Aakara.** "backfilled into the V1
taxonomy… blank fields mean the evidence did not establish a value" occupies the most
valuable space on the page and means nothing to her.

**7. ⚠️ The subtitle says "taxonomy-controlled tags".** She does not need the word taxonomy.

**8. ⚠️ Filters outrank search visually.** Six dropdowns in a full-width row directly under
the search box read as the primary interface. The brief says filters are secondary.

**9. ⚠️ Thumbnails are 56px.** Too small to recognise a workshop photo — and workshop photos
are the bulk of the library and the hardest to tell apart.

**10. ⚠️ The Match column shows a raw score** (237, 144). Internal implementation detail.

**11. ⚠️ On desktop the detail panel overlays the table**, hiding Source, Status and Match.

**12. ⚠️ No one-click "clear all"** once filters are set.

**13. ⚠️ The Format pill clips on mobile** ("Hiral Speakin…").

## C. What should change

Ranking (1–3) matters more than cosmetics, because it decides whether she trusts the first
screen. The mobile fix (4) is next because it decides whether she sees a first screen.

1. **Boost exact Topic/Format matches decisively** over incidental text matches.
2. **Cut the tail.** Stop at a relevance floor relative to the top hit, and say so:
   *"12 strong matches · 160 weaker ones — show them"*.
3. **Require multi-word queries to cover more of their own meaning** so "purple elephant"
   returns nothing.
4. **Mobile: collapse the chrome.** Banner gone, chips to three, filters behind a
   "Filters" toggle. Results within one screen.
5. **Close the detail panel on a new search.**
6. **Replace the banner** with one plain line, or delete it.
7. **Demote the filters** — one row, secondary styling, below a clear result count.
8. **Bigger thumbnails** (88–96px) so photos are recognisable.
9. **Drop the numeric score**; keep the "why it matched" line.
10. **Add "Clear all"** whenever any filter or query is active.

## D. What should NOT change

- The **search engine's core**: word-boundary matching, IDF weighting, constraint handling.
  These were hard-won and all 28 retrieval tests depend on them.
- The **taxonomy and classifier** — frozen, and nothing in this audit requires touching them.
  Every issue above is ranking or layout.
- The **table layout**. Cards would be worse here.
- The **detail panel's content**: preview, nine fields, Open in Drive.
- The **no-server architecture**. Everything above is achievable client-side.
- The **"why it matched" line** — keep it, it builds trust.
- **Blank fields shown as "not established"** — honest and correct.

## E. Priority order

| | Change | Why it is here |
|---|---|---|
| **P0** | Topic/Format matches outrank incidental text | The flagship query fails on the first screen |
| **P0** | Relevance cutoff + "show weaker matches" | 172 results is the same as no results |
| **P0** | Mobile chrome collapse | She cannot see a single result without scrolling |
| **P1** | Multi-word queries must not pass on one word | Directly contradicts the brief |
| **P1** | Close detail panel on new search | Obvious bug, one line |
| **P1** | Replace developer banner; fix subtitle | Prime space, wrong audience |
| **P2** | Demote filters, add Clear all | Search must read as primary |
| **P2** | Larger thumbnails | Recognition beats reading |
| **P2** | Remove numeric score | Internal detail |
| **P3** | Detail panel overlap; mobile pill clipping | Cosmetic |

---

## V1 Library acceptance checklist

Approve the final build only if every line is true.

**Finding**
- [ ] Typing `gold` puts genuine gold-investment assets in the top three.
- [ ] Every one of the ten tasks returns the right asset in the top three.
- [ ] `purple elephant`, `blue hat`, `crypto` all return **no results**.
- [ ] A query with no results says so plainly, shows the query, and offers one click to clear.
- [ ] No query returns a long undifferentiated list — weak matches are separated or hidden.

**Understanding a result**
- [ ] Each row shows what it is, what it looks like, its format, its topics and whether it is usable.
- [ ] Each row says **why** it matched.
- [ ] The thumbnail is large enough to tell two workshop photos apart.
- [ ] No internal scores, IDs or taxonomy jargon on the surface.

**Retrieving**
- [ ] Search → result → preview → open file is **at most three clicks**.
- [ ] Video previews play in the panel; she never opens Drive just to check.
- [ ] "Open in Drive" resolves to the real file.
- [ ] Closing the preview returns her to the same results, unchanged.
- [ ] Starting a new search closes the preview.

**Phone**
- [ ] The first result is visible without scrolling past the header.
- [ ] Search, result, preview and open all work at 375px.
- [ ] Nothing is clipped or scrolls sideways.

**Restraint**
- [ ] No dashboard, analytics, saved searches, recommendations or workflow.
- [ ] No server, database or API.
- [ ] The whole library still feels instant.

**The real test**
- [ ] Aakara completes all ten tasks unaided, without asking where anything is.
