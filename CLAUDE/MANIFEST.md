# CLAUDE/ — file manifest

Generated 2026-08-19. **This folder is the live Vercel deploy root** — every file here is a public URL at `ifm-deploy.vercel.app/<path>`, and WordPress iframes point at those URLs. **Do not move or rename anything without checking this manifest first.**

Contents: 57 pages · 90 loose assets · 22 folders


## Findings at a glance

- **One file is 96% of the dead weight.** `Investing 101- handbook-3, mar 31, 2026.pdf` is **778 MB**. It is excluded from deploys by `.vercelignore`, so it is not slowing the site — but it dominates this folder's size. Best home is Drive, not here.
- **7 pages are embedded on the homepage; 49 are deployed standalone.** Standalone pages still have live URLs and may be linked from WordPress or shared directly — the "Embedded" column below tells you which is which before you touch anything.
- **9 folders have no code references at all** — the safest archive candidates: `game-reels/` (395 MB), `LOGO testing/` (37 MB), `proposals/` (29 MB), `carousel_spacex_images/` (5 MB).
- **Excluding that one PDF, the loose orphan assets total under 30 MB** — not worth the risk of moving. Leave them; this manifest is the catalogue.

### Suggested order of work
1. Move the 778 MB handbook PDF to Drive (biggest win, lowest risk — it is already deploy-excluded).
2. Check the no-reference folders against the live site, then archive outside `CLAUDE/` if genuinely unused.
3. Leave everything else in place. The catalogue below is the organisation.

## Pages (games, tools, calculators)

`Embedded` = referenced by `index.html` (the homepage shell).

| File | Title | Size | Updated | Embedded | Assets used |
|---|---|---|---|---|---|
| `3-buckets.html` | 3 Buckets — Investing for Mummies | 166 KB | 2026-08-04 | no | 5 |
| `asset-boss.html` | Asset Boss — Investing for Mummies | 140 KB | 2026-07-28 | no | 1 |
| `bbflive_wp_snippet.html` | — | 1 KB | 2026-06-22 | no | 0 |
| `broke-by-friday-live.html` | Broke by Friday — LIVE | 138 KB | 2026-07-28 | yes | 1 |
| `cap-climber.html` | Cap Climber — Investing for Mummies | 114 KB | 2026-08-18 | no | 1 |
| `carousel_spacex.html` | — | 5.8 MB | 2026-06-09 | no | 0 |
| `carousel_vedanta.html` | — | 6.8 MB | 2026-06-15 | no | 0 |
| `chess-compounding.html` | The Rice & The Chessboard — Power of Compounding | 20 KB | 2026-07-17 | no | 1 |
| `crorepati-lane.html` | Crorepati Lane — Investing for Mummies | 49 KB | 2026-07-17 | no | 1 |
| `debt-boss.html` | Debt Boss — Investing for Mummies | 178 KB | 2026-08-07 | no | 1 |
| `debt-detective.html` | Debt Detective — Investing for Mummies | 127 KB | 2026-08-18 | no | 1 |
| `double-or-nothing.html` | Double or Nothing — Rule of 72 / Investing for Mummies | 117 KB | 2026-07-28 | no | 1 |
| `fund-manager.html` | Mutual Fund Manager LIVE — Investing for Mummies | 196 KB | 2026-07-17 | no | 1 |
| `fundgoal.html` | Fund YOUR Goal — Investing for Mummies | 30 KB | 2026-06-29 | no | 0 |
| `fundgoal_wp_snippet.html` | — | 1 KB | 2026-05-22 | no | 0 |
| `g8_wp_snippet.html` | — | 1 KB | 2026-06-02 | no | 0 |
| `goal-tracker.html` | Financial Goal Tracker — Investing for Mummies | 26 KB | 2026-05-20 | no | 0 |
| `hidden-fortunes-2.html` | Hidden Fortunes 2.0 — Beta / Investing for Mummies | 56 KB | 2026-08-04 | yes | 2 |
| `hidden-fortunes-2_wp_snippet.html` | — | 1 KB | 2026-05-25 | no | 0 |
| `index.html` | Investing for Mummies Interactive | 3.1 MB | 2026-08-18 | — (home) | 10 |
| `inflation-2.html` | Inflation Calculator 2.0 — Investing for Mummies | 27 KB | 2026-05-02 | no | 1 |
| `inflation-calculator.html` | Inflation Calculator — Investing for Mummies | 335 KB | 2026-08-02 | no | 1 |
| `ipo-bonanza.html` | IPO Bonanza — Investing for Mummies | 235 KB | 2026-07-28 | no | 1 |
| `lifestyle-time-machine.html` | The Lifestyle Time Machine | 86 KB | 2026-07-27 | yes | 1 |
| `ltm_wp_snippet.html` | — | 0 KB | 2026-05-16 | no | 0 |
| `market-pulse.html` | Market Pulse — Investing for Mummies | 178 KB | 2026-07-28 | no | 1 |
| `marquee-preview.html` | Scroll. Meet everyone. — IFM marquee gallery | 3.5 MB | 2026-08-18 | no | 0 |
| `mm2_content.html` | Market Madness 2 | 60 KB | 2026-07-17 | no | 1 |
| `module1.html` | Module 1 — Before You Invest | 90 KB | 2026-07-28 | no | 3 |
| `module1_test.html` | Module 1 — Before You Invest | 87 KB | 2026-07-28 | no | 0 |
| `module2.html` | Module 2 — 3 Bucket Strategy | 63 KB | 2026-07-28 | no | 3 |
| `module3.html` | Module 3 — Asset Classes Decoded | 55 KB | 2026-07-28 | no | 3 |
| `module4.html` | Module 4 — Mutual Funds & SIPs | 58 KB | 2026-07-28 | no | 3 |
| `module5.html` | Module 5 — Stocks & The Market | 59 KB | 2026-07-28 | no | 3 |
| `module6.html` | Module 6 — Measuring Your Returns | 54 KB | 2026-07-28 | no | 3 |
| `moneymap_wp_snippet.html` | ${studentName} Budget Tracker - Investing for Mummies | 39 KB | 2026-05-15 | no | 0 |
| `moneymap_wp_snippet_safe.html` | ${studentName} Budget Tracker - Investing for Mummies | 39 KB | 2026-05-15 | no | 0 |
| `my-first-trade.html` | My First Trade — Investing for Mummies | 207 KB | 2026-07-28 | no | 1 |
| `nav-pizza.html` | NAV Pizza — The ₹20 vs ₹100 Paradox / Investing for Mummies | 135 KB | 2026-08-18 | no | 1 |
| `nwv.html` | Need · Want · Value | 24 KB | 2026-07-27 | yes | 1 |
| `nwv_wp_snippet.html` | — | 1 KB | 2026-05-15 | no | 0 |
| `one-crore-ladder.html` | The ₹1 Crore Ladder — Investing for Mummies | 110 KB | 2026-08-18 | no | 1 |
| `quiz.html` | Kaun Banega Crorepati — IFM Quiz | 148 KB | 2026-07-30 | no | 3 |
| `radhas-mission.html` | Radha's Money Mission — Investing for Mummies | 125 KB | 2026-07-28 | no | 1 |
| `reit-or-real.html` | REIT or Real? — Investing for Mummies | 116 KB | 2026-08-18 | no | 1 |
| `sapno-ka-ghar.html` | Sapno Ka Ghar — Investing for Mummies | 119 KB | 2026-07-16 | no | 0 |
| `short-squeeze-sim.html` | The Short Squeeze — IFM | 47 KB | 2026-07-17 | no | 2 |
| `stock-rush-pro_wp_snippet.html` | — | 2 KB | 2026-06-04 | no | 0 |
| `stock-rush_wp_snippet.html` | — | 2 KB | 2026-06-04 | no | 0 |
| `swayamvar_wp_snippet.html` | — | 2 KB | 2026-06-04 | no | 0 |
| `swipe-right-sip-live.html` | Swipe Right on SIP — Live Classroom | 62 KB | 2026-07-17 | yes | 1 |
| `swipe-right-sip.html` | Swipe Right on SIP — IFM Gen Next | 42 KB | 2026-07-17 | yes | 1 |
| `teen-budget.html` | Money Map 💸 | 39 KB | 2026-07-17 | yes | 1 |
| `three-investors.html` | The Three Investors — Investing for Mummies | 117 KB | 2026-08-18 | no | 1 |
| `wealth-conversation_wp_snippet.html` | — | 2 KB | 2026-06-13 | no | 0 |
| `wheel-of-gold.html` | Wheel of Gold — Investing for Mummies | 122 KB | 2026-08-18 | no | 2 |
| `wheel-of-silver.html` | Wheel of Silver — Investing for Mummies | 126 KB | 2026-08-18 | no | 2 |

## Folders

| Folder | Size | Referenced by code |
|---|---|---|
| `LOGO testing/` | 37 MB | no code refs |
| `Organization Chart/` | 0 MB | no code refs |
| `art/` | 2 MB | referenced |
| `assets/` | 6 MB | referenced |
| `carousel_spacex_higgsfield/` | 18 MB | referenced |
| `carousel_spacex_images/` | 5 MB | no code refs |
| `carousel_vedanta_slides/` | 10 MB | referenced |
| `content/` | 172 MB | referenced |
| `course-flyer/` | 2 MB | no code refs |
| `design-review-20260525/` | 3 MB | no code refs |
| `game-reels/` | 395 MB | no code refs |
| `hiring/` | 0 MB | referenced |
| `ltm-live/` | 0 MB | no code refs |
| `meetings/` | 0 MB | no code refs |
| `proposals/` | 29 MB | no code refs |
| `reel_vedanta/` | 63 MB | referenced |
| `sounds/` | 0 MB | referenced |
| `stock-rush/` | 1 MB | referenced |
| `stock-rush-pro/` | 1 MB | referenced |
| `swayamvar/` | 23 MB | referenced |
| `wealth-conversation/` | 51 MB | referenced |
| `wealth-conversation-videos/` | 85 MB | referenced |

## Loose assets — REFERENCED (do not move)

| File | Size | Updated |
|---|---|---|
| `3b-emergency.png` | 647 KB | 2026-08-04 |
| `3b-growth.png` | 677 KB | 2026-08-04 |
| `3b-hero-poster.jpg` | 59 KB | 2026-08-04 |
| `3b-hero.mp4` | 2.6 MB | 2026-08-04 |
| `3b-marble.png` | 147 KB | 2026-08-04 |
| `3b-stability.png` | 623 KB | 2026-08-04 |
| `IFM Add New Game Guide.docx` | 36 KB | 2026-08-10 |
| `IFM Brand Guidelines 2026.docx` | 543 KB | 2026-07-28 |
| `IFM logo black background.png` | 543 KB | 2026-04-12 |
| `IFM logo teal background.png` | 640 KB | 2026-04-12 |
| `IFM logo white background.png` | 530 KB | 2026-04-12 |
| `IFM round logo for watermark.png` | 1.0 MB | 2026-04-12 |
| `IFM_Published_Games.docx` | 15 KB | 2026-08-10 |
| `ifm-3d-pizza-nike-8s.mp4` | 6.5 MB | 2026-06-14 |
| `ifm-3d-pizza-nike-kling.mp4` | 4.6 MB | 2026-06-14 |
| `ifm-hero-lockup-9s.mp4` | 2.9 MB | 2026-06-13 |
| `ifm-hero-lockup-still.png` | 1.5 MB | 2026-06-13 |
| `ifm-hero-logo-9s.mp4` | 3.6 MB | 2026-06-13 |
| `ifm-hero-logo.mp4` | 2.4 MB | 2026-06-13 |
| `ifm-logo-pizza-slices-kling.mp4` | 2.3 MB | 2026-06-14 |
| `ifm-logo-pizza-slices-seedance.mp4` | 679 KB | 2026-06-14 |
| `ifm-logo.png` | 202 KB | 2026-04-27 |
| `ifm-round-t.png` | 772 KB | 2026-06-15 |
| `ifm-round.png` | 60 KB | 2026-05-15 |
| `inflation monsters new.png` | 839 KB | 2026-05-03 |
| `ltm-favicon.png` | 12 KB | 2026-05-15 |
| `ltm-hero.png` | 1.1 MB | 2026-05-15 |
| `pizza-5slices-clean-5s.mp4` | 5.9 MB | 2026-06-14 |
| `quiz-hotseat.jpg` | 580 KB | 2026-06-14 |
| `quiz-studio.jpg` | 656 KB | 2026-06-14 |
| `vedanta-demerger-reel-9x16-15s.mp4` | 10.8 MB | 2026-06-14 |
| `vedanta-demerger-reel-v2-ifm-15s.mp4` | 9.9 MB | 2026-06-14 |
| `vedanta-demerger-reel-v3-pro-15s.mp4` | 19.5 MB | 2026-06-14 |
| `vedanta-demerger-reel-v3-std-15s.mp4` | 7.7 MB | 2026-06-14 |
| `vedanta-pizza-5slices-pro-10s.mp4` | 12.0 MB | 2026-06-14 |
| `vedanta-pizza-explainer-5s.mp4` | 469 KB | 2026-06-14 |
| `vedanta-pizza-explainer-v2-8s.mp4` | 805 KB | 2026-06-14 |
| `vedanta-pizza-split-pro-10s.mp4` | 9.6 MB | 2026-06-14 |
| `vedanta-reel-anchor-18s.mp4` | 5.6 MB | 2026-06-15 |

## Loose assets — no code references (review candidates)

These are not referenced by any HTML/JS/JSON in this folder. They may still be linked externally (a WordPress page, a shared link, an Instagram bio), so **verify before moving or deleting**.

| File | Size | Updated |
|---|---|---|
| `Hidden Fortunes banner Image.png` | 4.6 MB | 2026-04-12 |
| `IFM Accountability Tracker.xlsx` | 17 KB | 2026-08-11 |
| `IFM Momentum Board.xlsx` | 31 KB | 2026-08-11 |
| `IFM Website Feedback - Designer Brief June 2026.docx` | 18 KB | 2026-06-29 |
| `IFM logo (TM) round.png` | 60 KB | 2026-04-08 |
| `Investing 101- handbook-3, mar 31, 2026.pdf` | 778.5 MB | 2026-04-03 |
| `ifm-base-D.png` | 403 KB | 2026-07-20 |
| `ifm-kpatel-morph.mp4` | 907 KB | 2026-07-03 |
| `ifm-logo-blank-B-FULL.png` | 395 KB | 2026-07-20 |
| `ifm-logo-blank-B.png` | 401 KB | 2026-07-20 |
| `ifm-logo-coinM.png` | 417 KB | 2026-07-21 |
| `ifm-logo-color-t.png` | 416 KB | 2026-06-15 |
| `ifm-logo-overlap-C.png` | 408 KB | 2026-07-20 |
| `ifm-logo-tealM-B2.png` | 401 KB | 2026-07-20 |
| `ifm-logo-white-t.png` | 57 KB | 2026-06-15 |
| `ifm-mono-coinM-mint.png` | 96 KB | 2026-07-21 |
| `ifm-mono-coinM-transparent.png` | 93 KB | 2026-07-21 |
| `ifm-mono-coinM-white.png` | 96 KB | 2026-07-21 |
| `ifm-mono-figureM-mint.png` | 48 KB | 2026-07-21 |
| `ifm-mono-figureM-transparent.png` | 41 KB | 2026-07-21 |
| `ifm-mono-figureM-white.png` | 48 KB | 2026-07-21 |
| `ifm-new-caret.png` | 399 KB | 2026-07-20 |
| `ifm-new-choose.png` | 402 KB | 2026-07-20 |
| `ifm-new-paren.png` | 411 KB | 2026-07-20 |
| `ifm-new-question.png` | 404 KB | 2026-07-20 |
| `ifm-paren-A-allteal.png` | 410 KB | 2026-07-20 |
| `ifm-paren-B-tealM-navyparen.png` | 410 KB | 2026-07-20 |
| `ifm-paren-C-handdrawn.png` | 404 KB | 2026-07-20 |
| `ifm-radical-X.png` | 405 KB | 2026-07-20 |
| `ifm-radical-brush.png` | 405 KB | 2026-07-20 |
| `ifm-radical-marker-coral.png` | 406 KB | 2026-07-20 |
| `ifm-radical-marker-teal.png` | 408 KB | 2026-07-20 |
| `ifm-radical-noentry.png` | 411 KB | 2026-07-20 |
| `ifm-radical-scribble.png` | 406 KB | 2026-07-20 |
| `ifm-var-D.png` | 406 KB | 2026-07-20 |
| `ifm-var-cancelD-coral.png` | 405 KB | 2026-07-20 |
| `ifm-var-cancelD-subtle.png` | 405 KB | 2026-07-20 |
| `ifm-var-cancelD-teal.png` | 405 KB | 2026-07-20 |
| `ifm-var-cancelD-xsubtle.png` | 406 KB | 2026-07-20 |
| `ifm-var-cancelM.png` | 404 KB | 2026-07-20 |
| `ifm-var-noM.png` | 402 KB | 2026-07-20 |
| `inflation monster.PNG` | 1.1 MB | 2026-05-03 |
| `inflation monsters new.jpg` | 152 KB | 2026-05-03 |
| `vedanta-gold-hero-frame.png` | 1.3 MB | 2026-06-14 |
| `vedanta-pizza-5slices-end.png` | 1.3 MB | 2026-06-14 |
| `vedanta-pizza-5slices-start.png` | 1.5 MB | 2026-06-14 |
| `vedanta-pizza-end-frame.jpg` | 568 KB | 2026-06-14 |
| `vedanta-pizza-start-frame.png` | 1.7 MB | 2026-06-14 |
| `vedanta-v3-end-frame.png` | 1.5 MB | 2026-06-14 |
| `vedanta-v3-start-frame.png` | 1.4 MB | 2026-06-14 |
| `verify-checkmark.png` | 148 KB | 2026-06-22 |

## Rules

1. Moving a file changes its live URL — check WordPress embeds first.
2. Deploy weight is controlled by `.vercelignore` (blanket `*.mp4`/`*.pdf` with `!` exceptions for content-hub derivatives), never by moving files.
3. Always deploy from **inside** this folder: `cd CLAUDE && vercel deploy --prod`. Deploying from the parent 404s the whole site.
4. Regenerate this manifest after adding games: re-run the script in `scripts/` at the project root.