# IFM Talking-Head Reel — Playbook

Written 16 Sep 2026, straight out of building the Tata Sons reel (v13, 73.8s).
Hand this file to Claude at the start of the next reel. It is the method, the
settings that were actually used, and the mistakes that cost real time.

Reference build: `reel_tata_sons/` — final at `final/IFM-tata-sons-reel-v13.mp4`.

---

## 1. The one rule that fixed this reel

**One channel at a time.**

The first cut had Hiral talking *over* an animating graphic that had its own text,
with burned captions on top. Three streams at once. Her verdict: *"way too many
things happening."* For a beginner-investor audience that is fatal.

The structure that worked:

| | Share of screen time |
|---|---|
| Hiral on camera, with captions | ~70% |
| Graphics, one idea each | ~30% |

- She establishes a thought **on camera** → cut to **one clean graphic** → back to her.
- **Captions only when she is on screen.** Over a graphic they fight the artwork.
- A graphic may carry her voice **only if it is simple** (a title card, a three-box
  hierarchy). The information-dense one — the ownership donut — runs with her voice
  but no captions, because the graphic already prints the same words.
- Never leave a graphic silent. See §6 — silence under a visual reads as a hole.

## 2. Pick takes properly — this is where the quality is

Founder footage arrives as one long file with many takes. **Never assume the first,
longest, or shortest is best.**

**Step 1 — transcribe the whole thing with timestamps.**

```bash
ffmpeg -nostdin -y -i takes.mov -ar 16000 -ac 1 takes.wav
```
```python
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe("takes.wav", language="en", beam_size=5, vad_filter=True,
                       vad_parameters=dict(min_silence_duration_ms=700))
```
Run with `/usr/bin/python3`. A 7-minute file takes a few minutes — background it.

**Step 2 — read the transcript for self-rejections.** The founder tells you which
takes are bad. In this shoot she literally said *"One sec, I don't think… I'll just
say it again"* right after fumbling Titan. That take is dead; use the retake.

**Step 3 — word-level timings on the shortlisted regions only** (model `"medium"`,
`word_timestamps=True`, on short sliced wavs). You need these for frame-accurate
in/out points AND for caption timing. Slice the region to its own wav first —
`clip_timestamps` is fiddly.

**Step 4 — watch for internal pauses.** Word timings expose them (e.g. a 1.14s gap
mid-sentence). Do not jump-cut them out on camera. **Hide the removal under a
picture change** — cut to the graphic exactly across the pause.

Things that decided real takes on this build:
- A 3.2s hesitation mid-sentence in what looked like the "clean" dedicated retake.
- "charitable work" vs "charity work" — the later take matched the script.
- One take completed the thought ("unlock value for their shares held in Tata Sons");
  the two before it stopped at "unlock wealth".

## 3. Never let an AI model render text or logos

Veo/Seedance/whatever **cannot set type**. Every clip with words in the prompt came
back with warped, duplicated or invented lettering: `SHAPOORJI PALLONJI PALLONJI`,
`THE COMFILIET TO`, `Tata Trusts Delaure`, `INVESTINQ FOR MUMMIE5`, clocks reading
`01:213`. See [[ai-video-text-repair]] in memory for the repair techniques.

**For new reels: prompt the footage TEXT-FREE.** Add to every video prompt —
*no text, no lettering, no signage, no labels, no numbers, no UI, no watermarks* —
and ask for clean negative space where type will go. Then composite type locally.

**And check AI graphics for factual errors, not just typos.** The supplied ownership
donut was *wrong*: it showed 66% + 18% = 84% with the remaining 16% simply missing,
and its arrows pointed **outward** (Tata Sons → companies) when the script says the
opposite. Nobody catches this except by reading the graphic against the narration.

## 4. Build the important graphics yourself

Anything carrying numbers or a relationship — build it in PIL. It is faster than
fixing a generated one and it is correct.

The ownership donut (`scratchpad/v6/donut3.py` pattern), what mattered:

- **Rotate the chart so the slice being pointed at sits where the arrows arrive.**
  The 16% slice was top-left while the company cards were bottom — the arrows read as
  pointing at the 66%. Rotating it so 16% sits at the bottom fixed the meaning.
- **Merge multiple sources into one arrow.** Three cards → a shared bar → a single
  arrow into the slice. That says "together they hold 16%", not "each owns a slice".
- **Reveal in sync with her words** — 18% appears as she says "18%", the third slice
  and the company cards as she says "and the rest is owned by…".
- **Lift the slice being named** outward ~20px while she names it.
- Labels **outside** the ring, beside their own slice. Inside the ring they collide
  with the centre; at the frame edge they clip.
- Type had to go up twice before it was legible on a phone: percentages **88px**,
  labels **40px**, and the sub-labels darkened from light grey to solid slate.
  *Grey was the real culprit, not the size.*
- Draw arcs at **2× supersample** then downscale — PIL's `pieslice` edges are rough.
- Soft drop shadow under the ring and cards; separators drawn in the background colour.

Palette: teal `#2a9d8f`, gold `#ba9838`, navy `#1a3a5c`, bg `#fafaf8`, sub-text `#404a56`.

## 5. Captions

Rendered as transparent PNGs with Pillow, composited with `overlay` + `enable`.

> **This machine's ffmpeg has NO `drawtext` (no libfreetype) and NO `subtitles`/`ass`
> (no libass).** Verified. Do not waste time on them.

- Font `~/Library/Fonts/fixed-Nunito-Bold.ttf`, **58px**, white, numbers in teal.
- Dark pill behind: `rgba(13,14,22,224)`, radius 20, padding 30×20.
- **Over Hiral:** pill centre **y=1185**.
- **Over a simple graphic:** pill centre **y=1620** — low, in the decorative band,
  clear of the graphic's own headline.
- Chunk to **max 4 words / 24 chars**; merge anything under **0.55s** into its neighbour.
- Verbatim. Her grammar, her filler. Hand-correct proper nouns — whisper produces
  "Tata Suns", "Palanjee"/"Pagajee", "DC" for TCS, "room change" for "rule change".

## 6. Music and sound

No licensed track was available, so the bed is **hand-synthesised** (numpy + wave,
`scratchpad/fix3/music.py` pattern). What the founder rejected and why:

1. Ambient drone lifted from an AI clip — *"not working with style of the video"*.
2. A busier arpeggio, 40 note events per loop — still too much.
3. **What worked:** 72 BPM, **C–G–Am–F**, soft felt-piano, **8 notes in a 12.1s loop**
   plus a quiet pad. Two notes per bar. Same figure throughout — *that repetition is
   what makes it feel continuous.*

**Why the first bed was inaudible:** it was not a level problem. Its energy was all
below 800Hz and phone speakers cannot reproduce that band. Always check the spectrum:

```bash
for b in "200 800" "800 3000" "3000 8000"; do set -- $b
  ffmpeg -nostdin -i bed.wav -af "highpass=f=$1,lowpass=f=$2,volumedetect" -f null - 2>&1 | grep mean_volume
done
```
High-pass at ~95Hz, roll off above ~6.5kHz, keep the energy in 200Hz–3kHz.

**Mix (final values):**
```
music -9dB pre-mix
[bed][voice]sidechaincompress=threshold=0.02:ratio=9:attack=8:release=420:makeup=1
amix=inputs=2:duration=first:normalize=0
loudnorm=I=-16:TP=-1.5:LRA=11, alimiter=limit=0.95
```
Deep ducking with a slow release is what makes the music **swell into the gaps** and
drop back under her voice. A constant quiet bed sounds like nothing at all; her note
was *"the silence during the visuals are too stark"* and this is the fix.

**Accents:** a single soft piano note (same palette) at each graphic that arrives
**into silence**. Not a whoosh. Graphics that already carry her voice get none.

## 7. Transitions — and how not to break sync

Fades were the founder's opening suggestion, not the destination. Final scheme:

| Where | Transition |
|---|---|
| Hiral → graphic | `smoothup` (the graphic rises in) |
| Graphic → Hiral | `smoothdown` (settle back to her) |
| Hiral → Hiral | `smoothright` (soft sweep between takes) |
| → end card | `circleclose` |
| end card → logo | `circleopen` |

Up to present, down to return, sideways to continue. Three treatments, not eleven.

**Rejected:** `hblur` — at 0.5s it smears the entire frame into unreadable mud.

### The sync trap (important)

`xfade` **consumes** time: each 0.5s dissolve shortens the timeline by 0.5s. Across
11 cuts that is 5.5s of drift and her voice slides off her mouth.

**The fix:** give every segment a cloned handle, dissolve, then trim it back off.

```bash
# 1. handles on each segment (video only)
ffmpeg -i sNN.mp4 -vf "tpad=start_duration=0.25:start_mode=clone:\
stop_duration=0.25:stop_mode=clone,fps=30,setsar=1" -an e_sNN.mp4
# 2. xfade chain, duration 0.5, offset_k = offset_{k-1} + (d_k + 0.5) - 0.5
# 3. trim the spare handles
ffmpeg -ss 0.25 -i vx_full.mp4 -t <ORIGINAL_TOTAL> vx.mp4
# 4. mux the ORIGINAL audio back, untouched
```
Handles are frozen frames but are only ever visible *inside* a dissolve at partial
opacity — invisible in practice. Verify: trimmed duration must equal the original.

## 8. Technical specs

**Source footage:** iPhone 3840×2160 @60fps with `rotation=-90` (ffmpeg auto-rotates
to 2160×3840 portrait). Two audio streams — always `-map 0:a:0`.

**Talking-head crop** (wide boardroom shot → phone framing):
```
crop=1300:2311:620:191,scale=1080:1920:flags=lanczos,setsar=1,fps=30
```
Check the crop against every selected take before building; she shifts in the chair.

**Export:**
```
-c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -profile:v high -level 4.1
-c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart
```
1080×1920 · 30fps · −16 LUFS / −1.5 dBTP.

**Freeze check.** AI clips often go completely static partway through — a 2s frozen
picture under live narration reads as a stutter. Find them and fix with a 3–5% slow
push (`zoompan`), never leave a dead frame:
```bash
ffmpeg -i clip.mp4 -vf freezedetect=n=0.003:d=0.5 -f null - 2>&1 | grep freeze
```

## 9. Tooling gotchas

- `/usr/bin/python3` has **Pillow, numpy 2.0.2 and faster-whisper**. Homebrew python3
  does not. `export PATH="/opt/homebrew/bin:$PATH"` for ffmpeg.
- ffmpeg here has **no drawtext, no libass** — all text is PIL PNG overlays.
- Fonts: `~/Library/Fonts/fixed-Nunito-Bold.ttf`, `fixed-Nunito-Regular.ttf`, `Lora.ttf`.
- Logo kit: `reel_tata_sons/logos/` — transparent PNGs for Tata, SP Group, TCS,
  Tata Capital, Tata Power, Tata Motors, IFM round. **No Tata Trusts or Taj** exists
  publicly; use the Tata mark and let the label carry the name.
- Watch for ffmpeg filter **label collisions** (`[v]` used twice) — the error is a
  useless "moov atom not found" on the output. Name labels uniquely.
- Don't rebind loop variables named `f` in a frame loop — it breaks `f"{f:04d}"`.

## 10. Order of work

1. Transcribe all takes → map takes to script sections.
2. Word-level timings on the shortlist → decide in/out points.
3. Build/trim graphics. Check every AI graphic for wrong facts and warped text.
4. Build segments: Hiral with captions, graphics clean.
5. Concat → confirm every sentence intact (transcribe the cut).
6. Music bed + accents → mix and duck.
7. Transitions with handles → trim → remux original audio.
8. Export, then extract 10–20 frames across the timeline and actually look at them.

## 11. Review checklist

- [ ] Is any moment asking the viewer to read, listen and watch motion at once?
- [ ] Does every graphic hold one idea, long enough to read?
- [ ] Do arrows and relationships point the way the narration says?
- [ ] Do the percentages add to 100?
- [ ] Any frozen picture under live narration?
- [ ] Bed audible on a phone — check the 800Hz–3kHz band, not just the level?
- [ ] Does the music lift in the gaps rather than sit flat?
- [ ] Captions verbatim, proper nouns hand-checked?
- [ ] Sync: does the trimmed transition build match the original duration exactly?
- [ ] Caption file for the post matches the sentences actually in the cut.

## 12. Two things to fix at the source next time

- **Record the closing lines.** The scripted *"So this isn't really just an IPO story.
  It's a power story."* and the comments prompt were never recorded, so the reel ends
  on a weaker line and the engagement ask exists only as on-screen text.
- **Leave a beat between sentences.** She asked whether her speech had been sped up —
  it had not, to within one frame. The cut simply removed the silences, which makes
  delivery *feel* faster. Either record with more air, or put 200–300ms back.
