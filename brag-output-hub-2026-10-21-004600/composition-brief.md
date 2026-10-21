# Hyperframes Composition Brief: IFM Content Hub

## Objective
A 21s landscape launch film about the Content Hub — what it is, the logic beneath it, and
how you discover things in it. NOT about the school, its classes or its founder.

## Output
- Composition: brag-output-hub-2026-10-21-004600/composition/
- Render: ../brag.mp4 · 1920x1080 · 21s

## Source material
Project root /Users/lollyg/Documents/investing for Mummies. Read: v1-prototype/index.html
(visibility rule, scoring, exportRows), interpreter.js (translation layer), media-audit.py
(the probe), backfill.py, ingest-scan.py. Screens captured live from
ifm-deploy.vercel.app/content/v1-prototype.

## Copy that must appear verbatim or verified
- "608 things. One search box."            — masthead reads 608 assets
- "enjoying" 1 · "candid" 103               — counted across all 657 rows today
- "comprehensive cover" / Found 1           — driven live; phrase in 0 titles, 1 transcript
- "179 rows said Video." / "33 could play." — media-audit.py:9,19
- "Now it asks the server, never the field."— media-audit.py:20-21, lightly trimmed
- "Tick three. Take the links."             — the pick/export feature

## Creative direction
Tone `polished`. Five scenes, long holds, soft crossfades. Numbers carry the film; the only
emphatic beat is the 179/33 pair. No zooms, flashes or stingers.

## Visual identity
cream #f7faf9 · navy #1a3a5c · teal #2a9d8f · gold-ink #9d8138 (brand gold fails WCAG on
cream at label size) · Lora 600 (italic for queries) · Nunito 700/800 for numbers.
Hub screenshots are framed as cards on cream, never full-bleed.

## Audio
happy-beats-business-moves-vol-10 (110 BPM), low under the opening, lifting from scene 2,
fading over the last 1.2s. Beat-locked: 0.27 / 8.73 / 12.56. Beat-grid for the two
vocabulary rows: 4.64 / 5.74 (every other beat). Sparse SFX; no whooshes or impacts.
Audio-reactive deliberately off.

## Gate
npx hyperframes check — 0 errors, 15/15 WCAG text checks.
