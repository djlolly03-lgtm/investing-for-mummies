# IFM Content Hub — Version 1 (archived snapshot)

**Archived:** 3 Aug 2026
**Why:** Full record of the hub as it existed before the "insight-focused" V2 redesign — kept per Aditya's request so V1 and V2 can be compared side by side.

## What V1 was
- Library / Creator Tracker / Certificates / Competitors / Published tabs
- Competitors tab: 13-account roster, click-through detail modal (raw intel: pillars, formats, hook, cadence, top content, why-it-works, IFM action)
- Creator Tracker: status board (Delivered / Published / In production), grouped by status, published/not inferred from prose notes
- Published: growth chart (added 3 Aug), "What's Working" insight as a modest inline card
- Certificates: plain HTML table, real student names + full Instagram URLs (incl. tracking params) rendered unmasked
- "Total Reach" header stat: always empty (field never populated in the data pipeline)
- Password gate: cosmetic soft-lock only (full UI + all JSON data load unauthenticated)

## Known issues at time of archiving (full detail: see the 3 Aug 2026 QA audit)
1. Competitors tab: information-dense but no synthesized takeaway
2. Creator Tracker: no hard reconciliation between delivered / catalogued / actually live on IG
3. "What's Working" insight not visually prominent
4. Certificates tab breaks the app's design language + exposes student PII
5. "Total Reach" stat permanently shows "—"
6. ~11% of catalogue items have no thumbnail
7. Password field not wrapped in a <form> (breaks password-manager autofill)
8. Password gate is a UI courtesy, not real access control

These fed directly into the V2 redesign (see `content/index.html` at the repo root for the current live version).

## Files in this snapshot
- `index.html` — the full dashboard as of this date
- `data.js` — catalogue (278 items)
- `comp-posts.json` — competitor engagement snapshot
- `ifm-published.json` — IFM's own published-post engagement
- `ifm-followers.json` — daily follower log (4 days of history at time of archiving)
