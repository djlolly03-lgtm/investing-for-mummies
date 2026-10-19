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

**Check every supplied file for a higher-resolution copy of the same content.**
The four director portraits were 63-113px inside their individual cards — too soft
to enlarge. The same faces sat at **188px** in the storyboard collage, 1.8x to 3x
better. The collage looked like a working file and was nearly ignored. Extract from
whichever asset holds the biggest version, not the one that looks most finished.

**Matched cards must be matched in geometry.** Two cards that read as a pair (a
"for" and an "against") need identical portrait diameters, badge sizes and bar
positions, or the comparison wobbles. Measure, don't eyeball.

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
- **Wrap by measured pixel width, not character count.** A 24-char cap still let
  "important decisions have now been made" run off both frame edges. Measure with
  `d.textlength(...)`, cap the line at **860px**, and wrap to a second line.
- Verbatim. Her grammar, her filler. Hand-correct proper nouns — whisper produces
  "Tata Suns", "Palanjee"/"Pagajee", "DC" for TCS, "room change" for "rule change".

### ⚠️ NEVER retype the word timings — read them from the transcript file

Caption sync bug, board-meeting reel, 18 Sep 2026. The founder reported "a little
change in the audio versus her lip sync" at the end. It was not drift and not a
seek problem — both were checked and both were clean. **The timings had been
hand-copied out of the transcript into the build script, and one segment was
mistyped**: `so@46.60` when she actually says it at `45.18`. Every caption after
that ran ~1.4s ahead of her mouth.

Why this is dangerous: a mistyped timestamp passes every automated check. The
duration is right, the audio is right, the render succeeds, the frames look fine.
**The only way to catch it is to watch her mouth** — which is why it reached the
founder rather than being caught in the build.

So: write the word timings to JSON in the transcription pass and have the caption
builder READ that file. Never pass numbers through a human (or a model) retyping
them into a second script.

```python
# transcription pass — dump once, machine-readable
import json
words=[{"w":w.word.strip(),"t":round(w.start,2),"e":round(w.end,2)}
       for s in segs for w in s.words]
json.dump(words, open("words.json","w"), indent=1)

# caption builder — read, never retype
words=json.load(open("words.json"))
seg_words=[w for w in words if a <= w["t"] < b]
```

If numbers must be reviewed by eye, print them from the file rather than
transcribing them by hand, and spot-check one caption per segment against the
rendered frame before export.

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

**INSTAGRAM SAFE AREA — the one that hid a whole design element.** Reels chrome
(handle, caption, audio ticker) covers roughly the **bottom 250-320px**. The
"INVESTING FOR MUMMIES" footer sat 65px from the bottom and would have been
invisible on every single card in the feed. Nothing that must be seen goes below
**y = 1650**. Working layout for a 1080x1920 card:

| Element | y |
|---|---|
| Eyebrow | 96-212 |
| Headline | 286 |
| Subhead | 396 |
| Portrait / chart | 540-1320 |
| Status bar | 1380-1542 |
| Footer | 1596 |
| *(dead zone — assume covered)* | *1650+* |

Verify by drawing a line at y=1650 over a frame and looking at it.

**Hold time.** An element that pops in must stay long enough to register. The
"5 MORE YEARS" badge originally landed 0.6s before the wipe and did not read;
give any late-arriving element **at least 1.5s** before a transition.

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

## 11. Visual audit — REQUIRED before the founder sees it

Every small defect the founder has caught was visible in a still frame. The tick
inside the green badge was 24px inside a 100px circle. The repeated Chandrasekaran
photo. The garbled "Powsied by…" strip. Captions running ahead of her mouth. None
needed playback to spot — they needed somebody to *look*.

So the last step before delivery is a dedicated visual audit, run as a subagent
with fresh eyes (the builder is the worst auditor of their own frames).

**Extract a dense grid first** — every distinct beat, not a sample:

```bash
# one frame per second across the whole reel
ffmpeg -nostdin -y -i final.mp4 -vf "fps=1,scale=360:-1" audit/f_%03d.png
# plus a tight strip either side of every cut, where collisions hide
```

**What the auditor checks, in order of how often it has actually gone wrong:**

1. **Proportion inside a shape.** Is a glyph, tick, cross or number dwarfed by the
   badge/circle/box containing it? Target: a symbol fills ~50-60% of its container.
2. **Repeats.** Does a face, logo or card appear twice in ways that read as a
   mistake? Check what a clip shows BEFORE your in-point, not just at it.
3. **Garbled or duplicated text** anywhere in frame, including edges and reflections.
4. **Collisions.** Captions over a graphic's own text; labels over artwork; anything
   touching the frame edge or inside Instagram's bottom ~220px.
5. **Caption sync.** Sample a frame at each caption's midpoint and confirm the words
   match what she is saying there. This is the one that needs the transcript open.
6. **Dead space / stillness.** Does a card read as "blank"? Empty middle, nothing
   moving, elements too small for the canvas.
7. **Contrast.** Light grey on cream, white on pale, a red that reads pink at
   phone size.
8. **Frozen frames** under live narration (§8 freezedetect).
9. **Crop artefacts.** Baked-in furniture from an extracted photo; a subject
   cut at an awkward point; upscaled softness.
10. **Brand consistency.** IFM footer present, palette respected, fonts correct.

### The audit checks whether it LOOKS right, not whether it is TRUE

Separate pass, and it is on you, not the auditor. **Any claim a graphic makes that
the narration does not make is yours — verify it independently.**

Board-meeting reel, 18 Sep 2026: the rebuilt ownership card read "That is
significant voting power" and "TWO-THIRDS OF THE VOTE". Hiral never said that —
she said only that Tata Trusts *owns* 66%. The claim had been carried over from the
supplied card and rebuilt without checking. **66% of equity is not 66% of the vote**:
Tata Sons has share classes and shareholder agreements. The founder caught it.

Before export, list every word of text a graphic puts on screen that is not in the
transcript, and check each one. Most will be labels ("REAPPOINTED", "ALL FOUR IN
FAVOUR") that simply restate her. The ones that add a fact are the risk.

**The rule that makes it useful:** the auditor reports findings with a timecode and
a one-line fix, ranked by severity, and reports "nothing found" only after looking
at every frame in the grid. A clean report with no timecodes means it did not look.

Fix what it finds, re-render, **then audit again**. Fixes create new frames, and
new frames carry new defects — the second pass on the board-meeting reel found the
hidden footer, a label 6px from the frame edge and a badge that flashed past in
0.6s, none of which existed before the first round of fixes. Structure the second
pass as: verify each earlier fix by naming the frame checked, then hunt fresh.

## 11a. How a reel ENDS — the standard close

Settled 24 Sep 2026 by the founder, after trying all three options in one session:
a full end card, a card for the last line only, and no card at all.

**The close is HER, on camera, in one unbroken shot. No card.**

She delivers the closing thought, names herself, and gives the follow line —
*"…the structure of the Tata group could look very different. I'm Hiral Goel,
founder of Investing for Mummies. Follow me for more such insights."* — with
nothing cutting across any of it. Roughly the last 10-11 seconds of the reel.

The IFM mark is not needed at the end: her name and the brand are in the words,
and the footer sits on every card earlier in the reel.

*(Tried and rejected on the way: a full "Hiral Goel / Founder / Follow for more"
card, which cut away from her at the one moment she is addressing the viewer
directly; and a card carrying only the final line, which still broke the shot.)*

Two rules that survive regardless of the card decision:

- **Never put a graphic over the closing thought.** An earlier cut ran the
  "two possible directions" card across it; the founder cut it — she wants the
  conclusion delivered to camera, not narrated over artwork.
- **When the close runs on a different speed master, the final Hiral segment
  must take PICTURE AND SOUND from that same master.** Ending on a card hides a
  mismatch; ending on her face does not. See §11b.

### 11b. The four machine checks — RUN EVERY BUILD, no exceptions

Added 24 Sep 2026 after two bugs shipped that every "looks fine" check passed.
Eyes cannot see these. Run them on the EXPORTED file, not the segments.

**1. Lip sync — transcribe the finished render and look for GROWTH.**

A constant offset is the edit. A *growing* offset is desync.

```bash
ffmpeg -i final.mp4 -map 0:a:0 -ar 16000 -ac 1 final.wav
# transcribe final.wav, then compare each word against where it should be,
# in six chunks across the reel. Report the MEDIAN per chunk.
```
Flat medians = locked. Climbing medians = broken. On the Tata part-3 build the
medians ran +0.037 → +0.139s across 72s: real drift, invisible in every frame.
MAD inside each chunk is ~0.01s, so the measurement is precise enough to trust.

**Two causes, both silent, both fixed at source:**
- ffmpeg rounds a segment's video UP by one frame (33ms). Across 18 segments
  that is 0.43s. **Fix: pass `-frames:v <exact count>` on every segment.**
- Per-segment AAC encoding pads each boundary. **Fix: build the body audio as a
  few CONTINUOUS PCM runs — one per master — sized from the MEASURED picture
  length, then encode once.** Never concatenate 20 AAC segments.

```bash
# the one-line version of the whole problem
ffprobe -select_streams v:0 -show_entries stream=duration final.mp4
ffprobe -select_streams a:0 -show_entries stream=duration final.mp4
# these must be IDENTICAL. Not close. Identical.
```

**2. Duration against arithmetic — before you look at anything.**

Sum the intended segment durations and compare to the render. Three separate
bugs were caught only here: a duplicated rescale line that halved every timing
(97s came out 75s), a crashed transition pass that silently re-exported the
PREVIOUS video, and the frame-rounding above. **A successful render proves
nothing.** If the number is not what you predicted, stop.

**3. Transition smoothness — check the MIDPOINT frame of every transition.**

Sample 0.1s either side of each join. Two failure modes:
- **Dissolves superimpose type.** Two text cards cross-fading are both
  unreadable for 0.7s. Graphic→graphic wants a HARD-edged wipe (`wipeleft`),
  never `fade`. `smoothleft` was tried first and does the same thing more
  subtly — its blend zone still shows both cards' type. Only a hard edge
  guarantees one card on screen at a time.
- **Soft wipes ghost over her face.** Card→Hiral wants a hard edge
  (`slideup`/`slidedown`), never a dissolve.

**4. Caption placement — two captions must never share the screen.**

A transition shows BOTH frames at once, so the outgoing and incoming captions
appear together, at different heights. Clamp every caption clear of the
transition window at both ends:

```python
TG = T/2 + 0.03                      # half the transition, plus a frame
caps = [c for c in caps if min(c["out"], b-TG) - max(c["s"], a+TG) > 0.18]
for c in caps:
    c["s"] = max(c["s"], a+TG); c["out"] = min(c["out"], b-TG)
```
Also clamp each caption's out-point to `next.start - 0.03`. Without it every
caption overlaps its successor by the 0.12s tail — 39 instances in one reel,
seen as a flicker of doubled text at every caption change.

And check captions never sit on a graphic: over full-frame Hiral the pill is at
y=1185; over a split-screen panel it moves UP into her half (y≈1040), never onto
the panel.

### 11c. Five more that shipped bugs — insurance reel, 29 Sep 2026

**1. A card must not arrive before its first element can.** Cutting to a card on
the sentence that *introduces* the idea left 4.4s of an empty grey bar on screen
while she finished the sentence. Cut on the sentence the FIRST ELEMENT
illustrates instead, so the card is populated within ~1s of arriving. Check it:
sample the frame 0.25s after every card's entry and ask whether it has anything
on it yet.

**2. A caption must never end on a function word.** The length-only chunker
produced "about 32 rupees. The", "value for customers. I'm", "the concept
of" — each reads as a typo. Break after `.?!` first; then on length, but never
on the/of/and/to/is/I'm/if/that/as/with…; push the function word to the next
line instead. 39 captions became 32, and every one ends on a real word.

**3. The transcript drops words, and the caption then says something she did
not say.** "commissions as well expenses" was actually "commissions as well as
overall expenses". Re-transcribe any passage whose caption reads ungrammatically
— on its own, a 3-second clip, beam_size=5 — and carry a small `CAPTEXT`
override map. Cheap check: diff the render's own transcription against
`words.json`; every disagreement is either a caption to fix or a name in `FIX`.

**4. Substring tests silently misclassify a two-letter segment kind.**
`if a in "HS"` is True for "H" and False for "HP" — so every continuous-shot-
with-panel segment was classed as a GRAPHIC and got the wrong transition. Use
sets: `FACE={"H","S","HP"}`, `GRAPHIC={"C","G"}`. The same class of bug put the
output filename `n` into an `enumerate(...)` loop variable.

**5. Assert the ffmpeg input count structurally, every segment.** The caption
PNGs must start at input index `n_in`. A missing branch once fed her own VIDEO
into the first caption slot and shifted every caption to the previous one's
image — visible, but only to the person watching, not to any machine check:

```python
assert sum(1 for x in cmd if x=="-i") == n_in + len(caps)
```

Also worth running once per build, cheap and each has caught something:
`ebur128` (target −16 LUFS, true peak ≤ −1), and `freezedetect` — frozen
stretches are expected inside a card and must be ZERO inside a talking segment.

### 11d. Putting a GENERATED element inside a brand card — Higgsfield

Insurance reel, 29 Sep 2026. The bundling card was correct but sat still for
3.5s. The fix was a generated chain link, and it worked — but only because of
how it was scoped.

**Generate the ELEMENT, never the card.** The clip carries one text-free object
on a plain ground. Every word stays a local Nunito layer, so nothing can be
garbled (see the AI-text rule). Three 4s clips at `kling3_0`, 6 credits each.

**Both keyframes are your own renders.** `start_image` and `end_image` are PNGs
drawn in the brand palette, so the model only interpolates the middle and the
output cannot drift off-style. This is why a cinematic model produced flat
vector motion: it was pinned at both ends. Decline the preset it suggests —
it offered "IN THE DARK" for a flat explainer card.

**One clip will not cover a long beat.** A single A→B clip put 2s of dead frames
first and all the motion in the last second (measure it: mean frame-to-frame
delta per 1/12s — dead was 0.10, live was 0.84). Three clips, one per state
change, is the shape that works: **strain → break → settle.**

**Key it, don't colour-match.** The clip's ground came back (255,253,249)
against our (250,250,248) — a visible seam. `lumakey=threshold=0.97:
tolerance=0.14:softness=0.04` drops the ground entirely, so the match stops
mattering and the element can be scaled past its band without covering anything.

**Pin the layout the clip has to live in.** The card originally moved its two
pills apart at the break, which changed the size of the gap the clip occupied.
Fix the pills; let the element and the headline carry the change.

**A repaint layer must be a HARD cut.** The 0.22s alpha fade used for arriving
elements showed "Tied together" and "Pulled apart" superimposed for 7 frames.
Any layer that replaces text underneath it gets `d=0.05`. Verify by counting
brand-colour pixels in the headline band frame by frame across the change —
both counts must never be non-zero on the same frame.

Sources kept in `reel_insurance/hf-source/`; compositing in `linkfx.py`.

## 12. Review checklist

- [ ] Is any moment asking the viewer to read, listen and watch motion at once?
- [ ] Does every graphic hold one idea, long enough to read?
- [ ] Do arrows and relationships point the way the narration says?
- [ ] Do the percentages add to 100?
- [ ] Any frozen picture under live narration?
- [ ] Bed audible on a phone — check the 800Hz–3kHz band, not just the level?
- [ ] Does the music lift in the gaps rather than sit flat?
- [ ] Captions verbatim, proper nouns hand-checked?
- [ ] Caption timings READ from the transcript file, not retyped? (§5)
- [ ] One caption per segment spot-checked against the rendered frame?
- [ ] Sync: does the trimmed transition build match the original duration exactly?
- [ ] Caption file for the post matches the sentences actually in the cut.
- [ ] **Lip sync: transcribed the render and confirmed drift is FLAT, not growing? (§11b)**
- [ ] **Video stream duration == audio stream duration, exactly? (§11b)**
- [ ] **Render length matches the arithmetic you predicted? (§11b)**
- [ ] **Every transition midpoint checked — no type superimposed, no ghost over her face?**
- [ ] **No frame anywhere shows two captions at once?**
- [ ] **Every card populated within ~1s of arriving — no empty card on screen? (§11c)**
- [ ] **No caption ends on a function word? (§11c)**
- [ ] **Render's own transcription diffed against `words.json`? (§11c)**
- [ ] **Input-count assert passing on every segment? (§11c)**
- [ ] **`freezedetect` clean inside every talking segment? (§11c)**
- [ ] **Generated elements text-free, keyed, both keyframes our own? (§11d)**
- [ ] **No frame shows a repaint's old and new text together? (§11d)**

## 13. Reel 2 — what the second build added

Board-meeting reel, 18 Sep 2026. Same system, and these lessons are new:

- **One clean take needs no selection.** Her whole 50s ran without a stumble, so
  §2 collapsed to finding her natural sentence breaks and cutting there.
- **Check a supplied clip for what it shows BEFORE the point you enter it.** The
  animated listing clip opens on the previous card and only reaches the listing
  card at ~10.3s. Entering at 8s repeated a face the viewer had just seen — the
  founder spotted it immediately. Frame-step the clip, then choose the in-point.
- **AI clips hide garbled text at the frame edge.** That same clip carried
  "Powsied by: The Chandrasekaran Insousionsty of Manstrinatives" along the
  bottom. Cropped off and the frame padded back to 9:16 in the card's own colour.
- **A static card in a reel reads as "blank".** Two founder notes ("seems blank
  all over", "very blank") were both about stillness plus empty space, not size
  alone. Fix is to choreograph: elements arrive in sequence, and each arrival
  lands on the word that describes it — the "5 MORE YEARS" badge pops on her
  word "5", the REAPPOINTED bar on "reappointed", each director's tick as they
  appear.
- **Extracted photos can carry baked-in furniture.** The Chandrasekaran crop
  included the original card's own "5 MORE YEARS" badge, which then collided
  with the new one. Crop to the face alone and check the crop before building.
- **Emphasis is contrast, not size.** "VOTED AGAINST" only landed once it became
  a solid red bar with white text, following four green ticks. A white box with
  red type read as timid.
- **Music is not one dial.** Rejected: an AI-clip drone, a 72 BPM sparse figure
  ("very spa-like"), a 104 BPM plucky one, an 88 BPM electric piano. The founder
  then cut music entirely. Do not assume tempo is the variable — and be ready
  for "none" to be the right answer when the voice runs continuously.
- **15ms fades on every segment's audio.** Hard audio cuts at segment joins
  produced an audible click-click. Fade head and tail of each segment:
  `afade=t=in:st=0:d=0.015,afade=t=out:st=<dur-0.015>:d=0.015`.
- **0.9s transitions need 0.45s handles.** A dissolve can only be as long as the
  material it consumes; enlarge the `tpad` handles to match (§7).
- **The footer was hidden on every card** until the second audit — see the safe-area
  table in §8. This is the single most expensive kind of miss: invisible in every
  preview, obvious the moment it is posted.
- **A graphic can make a claim the founder never made.** The rebuilt ownership card
  said "significant voting power" and "TWO-THIRDS OF THE VOTE", carried over from
  the supplied card. Hiral only ever said Tata Trusts *owns* 66%. **66% of equity is
  not 66% of the vote** — Tata Sons has share classes and shareholder agreements.
  See the rule in §11.
- **The portraits are an AI-generated set, not press photographs.** They read as
  professional headshots at phone size, but a factual explainer naming real
  executives is carrying synthesised faces. Worth a decision at the asset stage
  rather than the edit stage.
- **Nine rounds.** v1 to v9, driven almost entirely by founder notes on small
  visual details. The visual audit (§11) exists to move that work upstream.

## 14. Two things to fix at the source next time

- **Record the closing lines.** The scripted *"So this isn't really just an IPO story.
  It's a power story."* and the comments prompt were never recorded, so the reel ends
  on a weaker line and the engagement ask exists only as on-screen text.
- **Leave a beat between sentences.** She asked whether her speech had been sped up —
  it had not, to within one frame. The cut simply removed the silences, which makes
  delivery *feel* faster. Either record with more air, or put 200–300ms back.

---

## 15. Testimonial-tile mosaic reel (v38, 20 Sep 2026)

A **different reel shape from §1–14**: 12 participant testimonials pop from a
3×4 grid to fullscreen one at a time, then the founder finishes it with a
fullscreen CTA. Style borrowed from the Inochhi tile reel. Playbook below is
the settled recipe after 38 builds — read it before starting v39 or any other
mosaic reel.

### 15.1 The two rules that fixed this reel

1. **Alone in frame + different person per tile.** Repeated people, or two
   women talking in the same tile, was the single most-flagged mistake across
   iterations. Before touching audio, print the tile list and confirm each
   ID is a different human being — *including* comparing green-shirt-in-same-
   room speakers who were on different days but read as the same person on
   screen. Ship a comparison strip (side-by-side stills) to the user for
   every replacement.
2. **The cache extract offset is the lip-sync bug.** Every "lip sync is off"
   complaint traced to `cache_vN.py` extracting frames at
   `ss = aud - pre_off` while the audio was extracted at `ss = aud`. Any
   non-zero `pre_off` becomes a systematic offset across every tile. Fix
   forever: extract cache at `ss = aud` and keep `pre_off = 0.0` in
   `TILES_SPEC`. If you need a pre-roll of silence, freeze on video frame 0
   during that window in the render loop, don't shift the cache.

### 15.2 Structure

- 1080×1920 vertical, 30 fps, ~100–105 s.
- 3 cols × 4 rows = 12 tiles, each 360×480.
- **Phase A** — grid reveal, tiles fade in with `REVEAL_STAGGER = 0.20`.
- **Phase B** — each tile in a scattered order pops to fullscreen for its
  hold, then shrinks back to its grid slot. `POP_IN = POP_OUT = 0.35`,
  `PAUSE_BETWEEN = 0.20`.
- **Phase C** — founder fullscreen with captions; silent grid loops behind
  her fade only. **Set `CTA_IN = 0.10` and `PHASE_C_START = PHASE_B_END`
  (no gap)**, or the ~0.9 s window of tiles-still-moving before her first
  word reads as a stutter (user called this out explicitly on v37).

### 15.3 Frame-by-frame render + JPEG cache

Don't try to seek raw 4K clips per frame with OpenCV — it times out on this
material. The pipeline:

1. `extract_cache.py` — for each tile: dump `_full/f_NNNN.jpg` at 1080×1920,
   `_grid_loop/f_NNNN.jpg` at 360×480 for the first 4 s, and one `_still.jpg`
   at 360×480. `ss` for all three is exactly `aud`. Founder's `_full` dump
   starts ~1.2 s before her actual first word so the frame offset in the
   render loop can land on it (`HIRAL_FRAME_OFFSET = int(1.20 * FPS)`).
2. `build_vN.py` — pure Python + PIL/numpy render loop, no OpenCV. Every
   frame composites from the JPEG cache. Rounded corners (`CORNER_R = 14`)
   applied last so tiles don't get square-cut when they pop.

### 15.4 Audio wiring

Per-tile audio segments are extracted with `-ss aud -t hold`, given a
0.2 s in-fade and 0.3 s out-fade, and mixed at `pop_in_end + pre_off`.
Music bed is "One Small Step.mp3" at **volume 0.10**, ducked to zero over
the last 1 s. All voice tracks at `volume=2.0` — participant clips are
recorded quiet.

Founder's audio starts at `PHASE_C_START + CTA_IN`. With v38's 0.10 s
`CTA_IN`, her first word lands 100 ms after the last tile settles — no
perceptible flash of moving grid.

### 15.5 Delivery folder

Every build goes to `~/Desktop/IFM Hiral Tile/hiral-tile-vNN.mp4`. Keep
all past versions there — user compares across.

### 15.6 The testimonial pool as of v38

Currently used (12 tiles). If asked for a "fresh" replacement, exclude
all of these AND anyone who reads as the same person on screen:

| Slot | Source | Person |
|---|---|---|
| t01 | IMG_4245 @ 1.75 | soft-voiced first speaker |
| t02 | IFM-399 @ 0.98 | — |
| t03 | IMG_4248 @ 10.26 | speaker 1 |
| t04 | IMG_6785 @ 23.44 | Malika |
| t05 | IFM-403 | leopard print |
| t06 | IFM-411 | black sleeveless |
| t07 | IMG_4248 @ 59.86 | speaker 2 |
| t08 | IFM-455 | pink floral |
| t09 | **IFM-380 @ 0.60** | laughing "I was never taught that much" (v38) |
| t10 | IMG_4248 @ 89.66 | speaker 3, "confident today" |
| t11 | IFM-453 | green checked over white |
| t12 | IFM-454 @ hold=3.50 | older lilac, ends on "mutual funds" |

**Known false-positive traps:** `IFM-533` reads as the same person as
`IFM-453` (both green, same room). `IFM-535` reads as the same person as
`IFM-454` (both older lilac, same phone/notebook). Both were caught only
by side-by-side stills.

### 15.7 Founder CTA — IFM-367 anchor

Source clip: `hiral-cta/IFM-367-full.mov` (Aakara "Why IFM" brand video).
Audio anchor: `HIRAL_AUD = 21.20` catches the full "Th" of *"That's why
I created…"*. Hold 20.80 s takes her through the full CTA line. Captions
follow the word-timing table in the build script — do not paraphrase, the
timings assume exact phrasing.

### 15.8 Order of work

1. Pick / verify the 12 tiles. **Ship comparison strips before extracting
   anything.**
2. `extract_cache.py` — one shot, `ss = aud`, no `pre_off`.
3. `build_vN.py` — copy from previous version, edit `TILES_SPEC` and the
   frames/audio output names.
4. Watch the reel end-to-end at least once in QuickTime before delivering.
   Watch specifically for: repeated faces, lip-sync drift on any tile, the
   founder's first word, and the transition into her.
5. Copy to `~/Desktop/IFM Hiral Tile/hiral-tile-vNN.mp4` and send with a
   short changelog of what moved from `vN-1`.
