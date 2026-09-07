# Twinkle Twinkle Little SIP — v2 (AI avatar clips), Aug 2026

Rebuild of the v1 Ken-Burns card version using 9 AI-generated singing clips.
Built to `Nursery Rhymes/Insta Video Playbook.md`.

## Deliverables
| file | what |
|---|---|
| `twinkle-twinkle-little-sip-v2-CAPTIONED.mp4` | **the deliverable** — 1080×1920, 30fps, 45.83s |
| `twinkle-twinkle-little-sip-v2.mp4` | same cut, no captions |
| `*-CAPTIONED-preview.mp4` | lighter encode for phone/web review |

## Source clips (`src/`)
Renamed working copies; originals came from Downloads and were trashed after an
md5 match. Unused alternate takes are in `src-alternates/`.

| file | lyric | song slot |
|---|---|---|
| `A-twinklesip01` | Twinkle twinkle little SIP / small small coins on every trip | 2.25–9.94 |
| `B-singing-saving` | Save one rupee, then save more / watch it grow like never before | 9.94–14.86 |
| `C-coins-jar` | Put it in the money jar / don't touch it, let it go far | 14.86–19.76 |
| `D-meadow` | Wait and wait, don't take it out / that's what saving is about | 19.76–24.68 |
| `E-sings-stands` | Twinkle twinkle little SIP / slow and steady wins the trip | 24.68–29.60 |
| `F-holding-jar` | Time is magic / patience too / that's the trick / that money knew | 29.60–34.60 |
| `G-jar-waving` | *no vocals* — instrumental outro, ends on the IFM logo reveal | 34.60–45.84 |
| `LOGO2-sunset-clouds` | intro logo reveal (bookends G) | 0.00–2.25 |
| `LOGO-golden-light` | superseded intro (gold dash across the logo) | — |

## Scripts (run in this order)
| script | does |
|---|---|
| `mouthsig.py` | per-frame face track, mouth openness, whole-frame + mouth motion → `work/mouthsig.json` |
| `mouthstrip.py` | mouth contact sheets for reading visemes by eye (`STEP=1/8` or `1/24`) |
| `solve.py` | the motion-aware rate-smoothing solve (playbook §4) |
| `blocks.py` | **the timeline** — every anchor, rest and cap, with the reasoning |
| `tune.py` | dry-run the solve for all blocks (no render) — use this to tune weights |
| `build07.py` | renders + assembles the video (~3 min) |
| `captions.py` | overlays captions onto the finished video (~20 s) |

`build01–06.py` are the superseded iterations, kept per playbook §8 so rounds can
be diffed. `work/` and `out/` hold intermediates and are regenerable.

## The things that cost the most time — read before editing timings
1. **Whisper cannot time this song's verse 1.** Its word starts land on the
   *second* syllable of each word (~0.45s late). Song-side anchors here come
   from pitch tracking, not whisper and not energy.
2. **Energy misses a quiet vocal entry.** The first two sung notes are much
   quieter than the rest, so every amplitude threshold skipped them and the
   avatar sat silent while the song had already started at 4.16s. Autocorrelation
   F0 on the centre channel finds them; "Twinkle Twinkle" is three *pairs* of
   equal notes then a held one, which both locates and validates the line.
3. **Anchor per syllable, not per word,** on any line with >4 syllables in ~2s.
4. **Assign syllables by viseme type.** /tw/ is a rounded pucker that *starts*
   "twinkle"; /kl/ is a closure. Getting these swapped puts the whole line one
   slot out while every duration still looks correct.
5. **A clip's own audio can disagree with its own lips** — clip D by 0.49s.
   Clip A's agreed to ~0.03s. Check per clip; where they disagree, trust the lips.
6. **`xfade` shifts everything downstream.** A block renders *its slot + the next
   block's crossfade*. Always assert total output duration == song duration.
7. **`setpts` lands 1–3 frames short** of the requested `-frames:v`, and frames
   cannot be cloned (playbook §6). Run the last segment ~0.3s long and let the
   frame count trim it.

## Verification (run every round)
- per-block `-count_frames` == expected
- no-static: no run of frame-diff < 0.45 lasting ≥ 0.3s
- viseme spot-check on the **rendered output**, sampled at word onset +0.10s
  (sampling exactly *on* a cut returns the previous block's last frame)
