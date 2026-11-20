# IFM Beginner Workshop promo — 19 Nov 2026

`../IFM Beginner Workshop Promo.mp4` — 1080x1920, 30 fps, 52.9 s, -14.0 LUFS / -1 dBTP.

Source: Drive folder `1IKycqEWyX1zM760STEF9JcP59tYrXx9T` — one 48.6 s iPhone 4K HLG selfie take of Hiral.
Her voice is the take's own audio (one continuous take, no cuts), so lip-sync is exact; voice placed at
0.800 − 0.025 s (AAC delay); cross-correlation vs source = 0.0 ms. Every effect segment frame-matched in the final.

Music: Suno afro-house track (user's, `Untitled.mp3` from Dropbox Downloads), 123 BPM. Drop (31.35 s) lands on
"games"; bars 5–6 after the drop are cut so the track ends on the logo. Steady bed 0.095 under speech (no ducking pumps);
voice clears music by 15–20 dB on every line.

Work dir (outside iCloud): `~/Developer/ifm-promo-nov26` — src/, base.mp4 (30 fps SDR via avconvert), matte/ (subject-matting,
MediaPipe), assets/ (class photos from Drive: IFM-337/339/370/414/516/520, Goa IFM-248), music/, segs/, out/.
Re-run: `fx6.py --plan fxplan.json base.mp4 fxbase.mp4` (effects skill, IFM fx6 from ~/Developer/ifm-fxsamples) →
`python3 fxp2.py render all` → `python3 thumb.py` → `STEMS=1 python3 assemble.py` → `python3 qc.py`.

## Effects used (output time = source + 0.8 s)
| Out (s) | Line | Effect | Source |
|---|---|---|---|
| 0.0 | — | Thumbnail cover (logo, "Learn how investing works", NEW 5-day pill) | thumb.py |
| 0.8 | "What to understand…" | dot-reveal | effects skill |
| 1.7 | "…where to begin?" | glass-type search bar + Hiral Goel name bar | fxp2 |
| 4.2 | "overwhelming / I've got you" | headline-wall of jargon notes → blow-away | fxp |
| 7.7 | "signature course… packed" | timeline (red grade, edit tracks) | effects skill |
| 11.1 | "brand new beginner" | backdrop-word NEW + pill | fxp2 |
| 13.7 | "decode… never fully understand" | DECODE scramble + doodle-boil "?" | fxp2 |
| 19.1 | "master investing fundamentals" | headline-box | effects skill |
| 21.2 | "stocks, mutual funds and gold… portfolio" | ui-world tiles snap into one card (no numbers) | fxp2 |
| 25.6 | "economy impacts your returns" | chart-grow, shape only | fxp2 |
| 28.7 | "Zero boring lectures" | ZERO stamp + BORING / LECTURES on a torso band, red marker strike | fxp2 |
| 30.6 | "interactive games" (music drop) | orbit of game screens | effects skill |
| 32.7 | "simple analogies" | couch-wall of game screens | fxp2 |
| 34.0 | "simulations… fun discussions" | Stock Rush gameplay on a tablet; women laughing round the table (gflow 03) + stickers | fxp2 |
| 37.1 | "Five days, two hours a day" | glass-widgets | fxp2 |
| 38.8 | "a room full of curious women" | real classroom wide shot (gflow 11), slow push | fxp2 |
| 40.7 | "a whole new way to look at your money" | polaroid fan: IFM-337/516/370/520 | fxp2 |
| 42.5 | "this is your invitation" | paper-cut "You're invited" | fxp2 |
| 45.7 | "click the link below to register" | tap: Register interest → Interest registered | fxp |
| 49.4 | — | IFM tree-grow logo animation, 1 s hold | logo-animations/ |

## v2 (19 Nov 2026) — user notes on v1
Cover reframed as education; green screen, lecture-slide break and desk/seated photos replaced; Stocks / Mutual funds / Gold tiles redrawn (supersampled gradient tiles, candlesticks, donut, gold bars). v1 kept alongside.

## v3 (19 Nov 2026) — user notes on v2
Beats now come from `fxp3.py` (segs3/) over `fx7.py` (fx6 + led-sign-top, match-cut-top) → `fxbase3.mp4`; assemble/qc write `out3/`.
| Out (s) | Line | v3 effect |
|---|---|---|
| 7.7 | "signature course… packed" | timeline rebuilt in IFM green; tracks trim to "essentials only" |
| 11.4 | "brand new" | LED sign "BRAND NEW" (top-pinned) |
| 16.0 | "concepts you never understand" | bigger SIP? XIRR? NAV? + "Compounding?" (ELSS dropped) |
| 26.4 | "economy" | match-cut, IFM article copy, word pinned above her head |
| 28.6 | "Zero" | gold ring tracked onto her finger "O" (MediaPipe hands, hands_zero.json) → flies down and becomes the ring around BORING → strike |
| 37.1 | "Five days, two hours a day" | post-wall in IFM navy/gold; 5 DAY tiles light up, "2 hours a day" |
| 38.8 | "a room full of curious women" | place-in-grid: Hiral live in the centre, 8 class clips (IFM-145/358/380/382/389/383/369/356) |
| 40.7 | "a whole new way… money" | MONEY slams on the word with ₹ coins and a shake |
| 42.5 | "this is your invitation" | full-screen gold-foil "You're invited" card, her video in the window, confetti off her face |
Portfolio beat (21.2 s) is a placeholder until the Flow clip (`review/flow-prompt-portfolio.md`).

## v4/v5 (20 Nov 2026)
- v4 (not delivered separately): Flow clip `Objects_morphing_into_pie_chart` (user's, 360x640 download) replaces the tile beat, `fxp4.py`:
  retimed so stocks / mutual funds / gold land on their words and the pie completes on "portfolio"; labels are our overlay.
- v5 (`fxp5.py`): "signature course" = two falling stickers (green timeline dropped as too busy); invitation = a golden
  "YOU'RE INVITED · ADMIT ONE" ticket that slams over her torso on "invitation" with a flash, sparkles and a shine sweep.

## v6 (20 Nov 2026)
- End music: logo bed now rises only to 0.38 (was 0.85) over 1.2 s.
- ZERO: the gold ring locks onto her finger "O", then flies up and becomes the O of a big gold ZERO across the top as Z-E-R slam in; BORING / LECTURES band + red strike unchanged (`e_zero6` in fxp5.py).
- v7: ZERO = rabbit hole opening from the centre of her finger "O" (nested spinning frames, camera dives through, 28.0-28.45), then a flash into the gold ZERO + struck-out BORING LECTURES (`e_zero7`). End music lowered as in v6.
- v7 rabbit-hole ZERO rejected by the user; ZERO stays as v6 (`e_zero6`).
- v8 (20 Nov 2026): music rebalanced: bed under her voice 0.12 (was 0.095; voice still 13-18 dB clear), logo ending rises only to 0.26 over 1.6 s (v5 0.85, v6 0.38). Ending is now ~7 dB above the bed instead of ~13.
