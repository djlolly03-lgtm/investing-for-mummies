---
name: ifm-promo-video
description: Build or re-cut an IFM promo / workshop video (vertical 1080x1920, ~60s) from raw talking-head takes, phone voice recordings, class footage and the effects skill — the pipeline, house rules and every effect setting behind the Wealth Conversation corporate promo (FINAL_v6B, 31 Oct 2026). Use when the user asks to make, edit, re-cut or add effects to a promo, workshop video, corporate video, reel with Hiral talking, or says "like the Wealth Conversation video".
---

# IFM promo video — how the Wealth Conversation promo was built

Reference build: `deliverables/videos/wealth-conversation/` — finals `TWC Money Blueprint - Corporate EO New Mumbai.mp4` (EO only, 66s)
and `TWC Money Blueprint.mp4` (no EO, 63s, for everyone else), every script in `build/`, history in `build/README.md`. Read that README first.

## The user's rules (each one was a correction — do not relearn them)
- **Beginners & corporates: lead with games, class energy, people.** Never RBI/macro/"the economy" as a hook.
- **Never state a game count** ("11 games" was wrong — the number played varies). Say "Money games".
- **No invented numbers** anywhere (stats, view counts, returns).
- **Build our own graphics.** When the user says "start from scratch", reuse nothing from the agency edit.
- **"Size of what we do" = OUTSIDE workshops, not our office classroom.** Use the deck's three: Stree Dhan
  (BALSABHA hotel room), K-Phyto Extraction (~30-women group photo), Money Blueprint Goa (cheering group).
- **Never cover Hiral's face** with a graphic. Grow cards above her head instead.
- **Uninstall card = real app behaviour**: label never changes, % counts to 100, then a bold tick + "Done".
  No extra "fear gone" message, no green state.
- Name caption when she first talks: **"Hiral Goel" / "Founder, Investing for Mummies"**.
- Credit **"Brought to you by EO New Mumbai"** and end on the user's logo animation (BEOND → The Wealth
  Conversation wordmark, `Logo_transforming_into_text_graphic_a92d50fd.mp4`) + IFM logo.
- **Her voice is the hero.** Level each line on its own (per-chunk loudnorm — takes differ by ~10 dB at source), duck
  music to ~0.08 under every line (0.9 in gaps), and measure with stems: voice must clear music by ≥15 dB on every line.
- A no-EO version exists (`TWC Money Blueprint.mp4`, `assemble6Bn.py`): credit take cut, ending = IFM emblem animation.
- Avoid snap-zooms (`lean-in` snapping back read as a glitch); prefer one slow push across a whole shot.
- Short silent beats feel like dead air — keep pauses between lines ≤ ~1.2s.
- Answer short, tables over essays; the user reviews on a phone.
- When the user names a cut to change ("B"), change THAT cut; keep approved finals as separate files.

## Sources
| What | Where |
|---|---|
| Raw shoot (Canon MVI_0270–0285, 1920x1080 rotated −90 → vertical, 25fps) + phone VO zip | Drive folder `19iiLlv_Jd39-CoaAGwsyPewYC89gA_Bq` (download with `rclone`; the session scratchpad copy is gone) |
| Clean voice | phone recordings `VO's/Vo.zip` ("Hook.m4a", "Rungtha Lane N.m4a" = voice-memo names by location). Cleaner than the agency's "Final audio" |
| Music | `~/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/Sunset Rooft Lounge.mp3` — 124 BPM half-time, bar 1.94s, **drop at 31.06s**, loop bars 54.34–58.22 |
| Outside workshops | IFM-356 (Stree Dhan wide room, Drive `1K0mQKPpZlPB9OOYp8MjvkGlzoiH-HiWU`, 4K), IFM-248 (Goa cheer, `1nEsIgZIBgh0VbPBfbwfYHHnUJ69_EkmB`, iPhone HLG), K-Phyto `highlight-reel-assets/gflow-final/13-full-batch-group-photo.jpg` (IFM-316/317/318 are 404 on Drive) |
| Class b-roll | `highlight-reel-assets/` (iPhone HLG — convert first) |
| Game screens | `highlight-reel-assets/games/*-teaser.mp4`, `deliverables/videos/game-teasers/` |

Catalogue search: parse `CLAUDE/content/data.js` (`window.IFM_DATA = {...}`), filter on `session`/`venue`/`description`;
masters via `rclone backend copyid gdrive: <fileId> <dir>/`.

## Pipeline (scripts in `build/`)
1. **Bases** (`prep2.py`, `wu6_prep.py`): every shot → `fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1`,
   light grade `eq=contrast=1.05:brightness=0.012:saturation=1.05`. Hiral shots are cut from the camera take at
   **camera = phone + SHIFT** so the phone voice lines up.
2. **Effects** (`fxrender6B.py`): one plan JSON per shot → `~/.claude/skills/effects/.venv/bin/python fx6.py --plan p.json in.mp4 out.mp4`.
   `fx6.py` (in this skill folder) = the effects skill's fx.py + the custom `uninstall-clear` effect; the skill itself is never edited.
3. **Captions** (`captions6B.py`): Pillow PNG-sequence stickers (Lora / Nunito, cream·slate·gold) overlaid per shot. ffmpeg here has NO drawtext.
4. **Assemble** (`assemble6B.py`): concat, place each phone-VO chunk at the MEASURED start of its shot (+offset),
   voice chain `highpass=90,afftdn,loudnorm I=-16`, music map + ducking, final `loudnorm I=-14 TP=-1`, then a
   gain trim if one-pass loudnorm lands >0.3 dB off, crf 19, contact sheet (1 frame/s).
5. **Verify** every build: frames at each changed moment; cross-correlate the final audio with each phone chunk —
   every chunk must read **+24/25 ms** (the AAC encoder delay); loudness −14 LUFS.

### Lip-sync method
Find each take's offset by FFT cross-correlation of camera audio vs phone audio (two passes must agree within 20 ms).
Shifts used (camera = phone + s): MVI_0272 −1.42 · 0275 +2.336 · 0277 +3.80 · 0278 +2.30 · 0279 +2.60 · 0280 +2.30 ·
0283 +4.00 · 0284 +3.76 · 0285 −1.69. Word timings: faster-whisper (`/usr/bin/python3`, user-site; not with `-I`).
Silent moments for graphics: check mouth-closed frames — MVI_0272 cam 0.00–3.55 (pre-roll smile), MVI_0284 cam 36.45+
(smile after "blueprint").

### Music
Drop (31.06) lands on the big class/workshop shot; when the drop must land later than the track allows, repeat two
build bars (3.90–7.78) rather than delaying the start. Duck to ~0.35 under voice; never leave the intro loud over her first line.

## Effects used (claude-video-effects skill, 45 effects; `python fx.py --list`)
| Effect | Where / settings that worked |
|---|---|
| `uninstall-clear` (custom, fx6.py) | opening, 3.4s, `hold 0.9`, `finish: top`, text "Uninstalling: fear of investing": glitchy→clear while the bar fills, then tick + "Done"; card above her head, room dims 30% |
| `shortcut-rain` | jargon keys `SIP\|NAV\|EMI\|XIRR\|CAGR\|ELSS\|SWP\|STP\|NFO\|AUM\|TER\|KYC`, count 30, behind her on "No boring lectures" |
| `reject-stamp` | "NOT A LECTURE", #D62828, angle −12, y 0.3; start 0.16s before the word so the slam lands on it |
| `red-collage` | BORING? / `NO LECTURES.\|NO JARGON.\|JUST GAMES.`, 1.1s on a silent smile; ALWAYS set `tag` (default says "REC · RED COLLAGE") |
| `slow-push` | "Join the wealth conversation" zoom 1.5 ending exactly on the cut; "Walk away" zoom 1.15 blur 0.002 across the whole shot. Snaps back at window end — end it on a cut |
| `led-sign` | "JOIN THE\|CONVERSATION"; put it AFTER slow-push in the plan or the blur softens the sign |
| `backdrop-word` | "REALLY?" (serif), "CHALLENGE" with `font: anton`, gold #FCC536 (~1.7x taller than default) |
| `orbit` | game screens around her head: `speed 0.9, size 0.3, count 6` (default 1.9 is too fast) |
| `match-cut` | newspaper flash on "economy" (body text is filler, blurred) |
| `messages` | notification cascade, `y 0.92` (default 0.61 covers her face) |
| `apple-toggles` | REPLACED in the final by three falling stickers (user preferred them); rows ≤ ~19 chars, `ticks` relative to effect start |
| `spotlight`, `moody`, `locked-on`, `lean-in`, `todo` | earlier versions; `todo` ticks are true video seconds; `lean-in`/`locked-on` snap back |
| `dot-reveal`, `pause-point`, `countdown-flip`, `scribble`, `lineup`, `cover-star`, `phone-fan`, `swipe`, `the-bill`, `headline-box` | v5 "Warm-Up Round" cut (`wu_build.py`). `cover-star`: lines ≤ ~19 chars and always set `right` (default filler text otherwise). `phone-fan` draws exactly 4 images |

**HyperFrames graphics beat the effects skill for titles/lists/transitions** (flagship v8, user's verdict "these are not
looking great… we'll do better"): build them in a HyperFrames project, render transparent (`--format mov`) and overlay
in ffmpeg so the footage and lip-sync are untouched — see `deliverables/videos/flagship-course/build/hf_overlays.py`.
User-approved: lt-stack-bars name bars, mk-specs-list checklist, organic-light-leak-overlay on section cuts.
User-rejected effects-skill picks: the-bill, comment-box, countdown-flip, split-headline, cover-star editorial.
Always show stills of 2–3 options before implementing.

Not used yet, with verdicts: good fits `tier-list`, `check-pills`, `carousel-spin`, `noise`, `split-headline`,
`broll-split`, `rabbit-hole`; Instagram-only `comment-box`, `tap`, `reel-frame`, `pastel-word`, `place-in-grid`;
need real numbers `liquid-glass-graph`, `over-the-shoulder-zoom`, `profile-wall`, `headline-wall`; skip
`glass-widgets` ("Edited by Claude" pill), `timeline`, `checklist` (ticks evenly spaced, ignore `ticks`).

## Gotchas
- Effects skill scripts may be blocked in Auto mode ("code from external"); the user switches Auto off.
- iPhone clips are HLG 10-bit: `avconvert --preset Preset1920x1080 --source in.mov --output out.mov` first.
- Shot lengths round to whole frames — measure starts with `nb_read_frames` before placing voice (ffprobe may print "115,").
- `xfade` once dropped the end segment silently — use concat; re-encode deliverables (copy-concat mis-samples sheets).
- **Never join segments with the concat demuxer + `-c copy`.** Parts cut with `-ss` can start at 0.033s; the copy-concat
  then makes the final encoder drop frames, and every later shot runs behind its voice (flagship v2: 4 frames = 133 ms,
  user saw "lip sync is off"). Join with the concat *filter*: `setpts=PTS-STARTPTS,setsar=1` per input,
  `concat=n=N:v=1:a=0,setpts=N/30/TB`, `-fps_mode passthrough`, and assert the frame total. The audio cross-correlation
  check (+24/25 ms) cannot catch this — it only proves the voice landed where it was placed. Also frame-match each shot
  in the final against its segment (see `deliverables/videos/flagship-course/build/`).
- Lora is a variable font (`set_variation_by_name('Bold')`); fonts live in `~/Library/Fonts/`.
- Use `/usr/bin/python3` (has Pillow); `export PATH=/opt/homebrew/bin:$PATH` for ffmpeg.
- Effect options can't reuse the window keys `start`/`end` (that's why the custom option is `finish`).
- **Lip-sync must be checked by eye, not just by audio.** The +24/25 ms audio check only proves a voice landed where it
  was placed. The AAC encoder adds 25 ms and 25->30 fps conversion shifts a shot by up to ±20 ms, so a Hiral line can run
  ~45 ms late and the user sees it. Measure each cut against its source (`flagship-course/build/measure_sync.py`), place
  each voice at −offset −0.025, then look at mouth strips at the exact waveform onset of an m/b word after a pause.
- Masters never go in the repo; working files live in the session scratchpad and vanish with it — re-download raw takes from Drive.
