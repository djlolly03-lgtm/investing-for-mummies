# Nasdaq news reel — build notes (6 Nov 2026)

Deliverable: `IFM-nasdaq-reel-v6.mp4` (89.4 s, 1080x1920, 30 fps, voice only, no music).
Source: 9 phone takes (4K60 HLG, Drive folder 18DH8IQZo7DziLRxce4CMwuv0aToQ1co7) → `avconvert --preset Preset1920x1080` to SDR, then this build.
Working tree: `~/Developer/ifm-nasdaq/` (src/ sdr/ broll/ logos/ build/). Masters never enter the repo.

## Pipeline (build/build.py)
1. EDL at the top of build.py: each segment = picture (cam | gfx | broll) + voice ranges (take, start, end). Durations quantised to frames; voice ranges follow.
2. Voice: ranges extracted as one continuous 48 kHz PCM with 4 ms crossfades, then highpass 85, afftdn, 3-band EQ, 2.5:1 compression, measured two-pass loudnorm (−16 LUFS, TP −1.5), limiter. Every trimmed stumble sits under a picture change (never a jump cut on camera).
3. Per-segment slice transcription (faster-whisper medium, beam 5) → `words_segments.json`. Subtitles READ this file, never retyped. Hallucinated tails are cut by hand in the json (s7b).
4. Subtitles: Pillow, Montserrat ExtraBold 54, navy pill, gold key words, one line preferred (break before overflow), balanced two lines otherwise, never ending on a function word, no overlapping windows, hidden under the name super.
5. Graphics: `gfx.html` + `render_gfx.js` (puppeteer, frame by frame). Solid scenes → JPEG; overlays (hook, editorial, reason titles, name super) → alpha PNG over the footage. Palette/type from the brief.
6. Segments encoded with `-frames:v` exact; joined with the concat FILTER; frame total asserted; video and audio stream durations identical.

## What the audits taught (3 passes, 6 → 7 → final)
- Nothing on her face: hook and editorial plates live above her head (plate bottom < hairline ≈ 400 px).
- Subtitles everywhere her voice is, including over b-roll and graphics (y 1600 on cards, 1480 over her).
- A card must never sit still: dot shimmer, breathing hold, bar glint.
- Illustrative numbers are labelled as such on screen, legibly. Nvidia's pre-split price was caught by the auditor.
- The IFM mark sits top-centre on every card; nothing in the bottom 220 px.
- "Crash" was not her word; the hook says "THE NASDAQ IS FALLING".

## b-roll
Text-free stills from fal (Nano Banana Pro) animated with Kling 3 Pro (5 s, silent): data centre, chip, Capitol. Prompts in gen_stills.py / gen_clips.py. Slow push added in ffmpeg (zoompan).

## v8–v14 (6 Nov 2026, afternoon) — the EO toolkit brought in
- Effects skill passes on her shots (fx6.py, plan JSON per segment, cached by plan+in/out): slow-push, backdrop-word
  (NASDAQ / BAROMETER / WHY?), shortcut-rain (rules keycaps, paced across the whole shot), reject-stamp (EXPENSIVE, y 0.15 so it
  sits ABOVE her head — at 0.3 it hid behind her), led-sign (WORTH / IT?), orbit (seven company icons circling her head).
- Orbit cards: fx6.py monkeypatches `fx.card` to a SQUARE app-icon card; the skill's own card is 9:16 and left the logos floating
  on white. Tiles = brand-colour squares with white marks (tiles2.js); Amazon needed its viewBox restored and its wordmark whitened.
- Falling stickers (R.stick in gfx.html, Lora, cream/navy/gold) replaced every plate; the hook is two stickers above her head.
- Pauses: s1 tail and s2 lead tightened; her restart "The Nasdaq… The Nasdaq Composite Index" in IMG_4571 was being kept
  because the slice transcriber de-duplicated it — now only the retake (3.36→) is used.
- Subtitles: one baseline (1560), contiguous windows (half-open enable, no blank frame at swaps), sign-off captioned under the
  name super, "Wall Street" kept on one card, number tokens merged ("3" ",000").
- Chart card redesigned: gradient rise, gold "AI rally peak" sticker, coral fall to a "Now" sticker; title block raised clear of the subtitle.
- Ending: IFM emblem end card (reel_board_meeting G6) appended after her last line; end clip tpad-cloned so the frame count lands.
- Never run two builds in the same folder: v7's final concat read segments v8 was rewriting and came out 1294 frames.
- Open: the user wants the index animation (10–18 s) redesigned to a reference image that has not arrived yet.
