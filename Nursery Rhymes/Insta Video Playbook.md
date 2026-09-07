# IFM Lyric-Video Playbook
*Built from the "Twinkle Twinkle Little SIP" project, Aug 2026. Hand this file to Claude at the start of the next lyric video and say "follow the playbook."*

## The one rule that outranks everything else
**Lip sync is the highest-priority constraint in the entire video.** If a choice trades lip-sync accuracy against a nicer transition, a fancier animation, a smoother camera move, or a "shouldn't this card go here" instinct — lip sync wins, every time. Everything below exists in service of that rule.

---

## 0. Before touching any timeline: transcribe the song
**This is step zero, not a nice-to-have.** Every early failure in this project traced back to guessing where lyrics sit in the song from energy/gap charts, which is unreliable once there's a backing track.

```bash
pip3 install --user faster-whisper
```
```python
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, info = m.transcribe("song.wav", language="en", word_timestamps=True,
                           initial_prompt="<the lyrics text>",
                           condition_on_previous_text=False,
                           no_speech_threshold=0.9, temperature=0.0)
for s in segs:
    for w in s.words:
        print(w.start, w.end, w.word, w.probability)
```
This gives real word-level timestamps for the *song* — including where verses actually start/end and, critically, **where the vocals stop and the instrumental outro begins.** Do not assume the last line of lyrics = the end of the song. In this project the vocals ended 11.5s before the track did.

## 1. How this video starts
Cut hard to the first animated clip **on the vocal's first word**, not on a beat, not on a downbeat guess — the actual whisper-timestamped onset. No lead-in card, no instrumental intro card, unless the client explicitly asks for one (they did ask to remove it here). If there's an instrumental intro, trim the *song* by the same amount you trim the video, so nothing drifts — don't try to stretch across it.

## 1a. Cutting the song shorter (added Aug 2026)
When the client wants a tighter cut, prefer **dropping whole lyric sections at existing vocal boundaries** over trimming inside phrases. Two rules:
- **Crossfade region must be the instrumental lead-in on BOTH sides.** Take the first kept span as `[s1,e1]` and every later span extended BACKWARD by the crossfade length: `[s2-d, e2]`. `acrossfade` then blends lead-in against lead-in, the vocal at `s2` lands exactly on the section boundary, and the total equals the sum of the intended spans. Extending forward (`[s1, e1+d]`) drags the first syllable of the phrase you just deleted in as an audible ghost.
- **Verify the edit by re-transcribing the spliced audio** and comparing word onsets against the expected video times. Median should be ~0ms.

**Map the song's instrumental gaps before choosing splice points**, and size each crossfade to the smaller of the two gaps it joins — a global crossfade length will chop a vocal wherever the gap is short. In this song only 6 of 14 gaps exceeded 0.5s; the rest were 0.12s.

Shortening often *improves* lip sync rather than costing it — dropping a section frees the clip that was covering it, so a better-matching clip can take over elsewhere. Re-run the phrase assignment after every length change instead of keeping the old picks.

## 2. Diagnosing an AI-generated performance clip (do this BEFORE any timing math)
For every clip a client supplies as a "singing" source:
1. **Frame-strip the mouth at 1/8s or better**, across the WHOLE clip, before deciding where singing starts/ends. AI clips routinely have a tail of non-singing footage (smile, wink, thumbs-up, prop business) that looks similar enough to singing in a thumbnail that you'll misjudge it.
2. **Check for internal shot changes** — some generated clips silently cut to a different camera setup partway through:
   ```bash
   ffmpeg -i clip.mp4 -vf "scale=120:213,tblend=all_mode=difference" -f rawvideo -pix_fmt gray - | <python: flag any frame-diff spike >25>
   ```
   If found, never let a segment's stretch carry across that boundary — end the segment before it.
3. **Measure her own tempo against the song's**, per line, not just overall:
   ```
   her performance seconds / song's seconds for the same lyric = required stretch
   ```
   If every sub-section independently needs ~1.3–1.5×, that's a **structural mismatch** — the clip was generated at a different tempo than the song. No amount of clever redistribution removes this; it only spreads it. Say so plainly rather than promising a fix that isn't coming.
4. **Never assume her singing ends where you first think.** Re-check with mouth-motion measurement (see §4) — this project found an extra 0.26–0.7s of real singing on two separate occasions just by re-measuring, and that slack was enough to noticeably lower the worst stretch factor.
5. **Check the very start of the clip for a green-screen leak.** Some generated clips composite the background in via a dissolve, not a hard cut — the first ~0.5–0.7s can still show raw green (or another key colour) before the real backdrop resolves. A quick corner-pixel sample at t≈0.05s catches this instantly:
   ```bash
   ffmpeg -ss 0.05 -i clip.mp4 -frames:v 1 -vf "crop=40:40:5:5,scale=1:1" -f rawvideo -pix_fmt rgb24 - | xxd -p
   ```
   If it's not the right corner reveal a saturated colour, don't retime around it or hope it's brief enough to ignore — patch it: extract a clean background frame from later in the same clip (once it's resolved), chromakey out the leaking window using the sampled colour, composite it onto that background, then concat with the untouched remainder. This fixes the *source* file directly, so it's a one-time patch that the whole downstream build (word anchors, rates, everything) doesn't need to know happened.

## 2a. Cast by VISUAL FAMILY before you cast by lyric (added Aug 2026, after a rejected cut)
A set of AI clips is usually not one character — it is several. Before planning anything, pull one frame from each clip into a single strip and group them by **outfit + hair + set + render style**. In this project ten clips contained exactly one coherent family of three; the other seven were one-off looks.

Cut *within* a family and the edit disappears — a cut reads as a camera change on the same performer. Cut *across* families and every cut changes the person, which reads as chaos no matter how good the sync is. A 30s cut with six cross-family cuts was rejected outright while measuring 11ms word error; the rebuild used three same-family clips and was accepted.

So: **choose which song sections to keep based on which clips look like each other**, not on which lyrics you like best. It is worth losing a good verse to avoid a wardrobe jump. If the client flags "the cuts", strip-frame 0.12s either side of every cut and look — the answer is visible immediately, and it is almost never the timing.

## 2b. Check the beat across every splice, then search the cut point
A song edit can be word-perfect and still stumble. Peak-pick the percussive onset envelope, take the median inter-onset interval, and measure the gap spanning the join — it must be close to an integer multiple. Then **search the cut point in ~0.03s steps**: the ratio alternates wildly between good and bad, so a 60ms nudge is the difference between a clean join and an audible stutter. Pick a nudge that is still clear of the neighbouring vocal.

## 3. Word-anchoring the lip sync
1. Get the song's word timestamps from Whisper (§0).
2. Get her performance's word/syllable timestamps by watching her mouth, not by re-running audio alignment on her clip's own audio track — **her clip's audio and her mouth can be out of sync with each other by half a second**, independent of anything you do. Audio-to-audio alignment (DTW, cross-correlation) inherits that error; only reading the lips avoids it.
3. Pair clip-time → song-time anchors word by word. Use visually unambiguous landmarks first (a rounded "W" pucker, a wide-open vowel, a full mouth-closure) — these pin reliably; connective words ("and", "the") can drift a little without anyone noticing.
4. Turn the anchors into per-segment `setpts` stretch factors and concat:
   ```
   ffmpeg ... -filter_complex "[in]split=N[s0][s1]...;
     [s0]trim=a0:a1,setpts=(PTS-STARTPTS)*f0[p0];
     [s1]trim=a1:a2,setpts=(PTS-STARTPTS)*f1[p1]; ...
     [p0][p1]...concat=n=N:v=1:a=0[out]"
   ```

## 3a. Word-anchoring, properly (added after the "completely off" failure, Aug 2026)
Three things sank the first attempt at this. All three are cheap to avoid:

1. **Anchor at every WORD, not at line boundaries.** Smoothing to line level and letting words drift inside felt safer and produced up to **0.6s of within-line drift** — which reads as completely out of sync. Use the least-squares solve (§4) with a *small* smoothing weight: sweep λ and pick the largest value that still keeps mean word error under ~60ms. On this project λ≈0.001 gave median 0ms / 90th-percentile 15ms; λ=0.05 gave 333ms.
2. **Align the token SEQUENCES, don't zip them in order.** AI clips drop words — one chorus phrase sang "girls wanna have fun" (no "just"), another sang "just wanna have fun" (no "girls"). Zipping song-word-i to clip-word-i put her mouth a whole word behind for the entire phrase. Use Needleman-Wunsch over the normalised tokens (collapse "want"+"to" → "wanna" first) and only emit anchors for MATCHED pairs. Then rank candidate phrases by how many song words the clip has no mouth for, and prefer the ones missing none.
3. **Never let an unused sung phrase sit inside the span you use.** If the clip sings the chorus 4× and the song sings it 2×, picking phrases 0 and 2 means phrase 1 plays — at speed — under the song's rest, and her mouth sings words that aren't there. Constrain phrase picks to be **adjacent**, and clamp the head/tail boundary anchors so they cannot reach into the neighbouring phrase.

**Verify numerically, every round.** Map every clip word through the finished time-map and compare to where the song sings it: report mean / median / 90th-percentile / max error per section. Median 0ms with a large max is normal and fine — it means the outliers are a deliberate rest-alignment or a repeated-word mismatch in the checker. A large *median* is a real bug. Do not ship without this table.

**What does NOT work for finding sync (all three tried and discarded here):**
- *Mouth-openness CV vs audio envelope* — peak correlations of 0.08–0.31, two of ten peaking at the search boundary. Confirms the earlier note: don't use it.
- *Audio-to-audio DTW between clip and song* — the clip is a different rendition with a different backing mix, so mean cosine cost sat at 0.57–0.70 and it could not even tell three candidate clips apart.
- *Whisper on the clip's own audio, trusted blindly* — its word times are a good starting point but its rests are not the mouth's rests (see §2).

## 4a. When the clip's rest is in the wrong place, align the RESTS not the words
One clip rested after "that's" while the song rested after "investing". Word-pairing demanded 4.2x and left 1.3s of error. Pairing the *gaps* instead — her last word before the rest onto the song's last word before its rest — gave 1.08x and 1.57x, at the cost of her mouth forming "investing" while the song sings "for". **Take that trade every time.** A viewer notices a mouth that isn't moving during singing far more than a slightly wrong syllable.

## 6a. Exact frame counts, or everything drifts
`-frames:v N` silently under-delivers after `minterpolate`, which cannot emit past the last input PTS. Symptoms: the body comes out seconds shorter than the plan.
- Pad the trim end by a few source frames, **clamped to the next shot change** so the next shot cannot bleed in.
- Where there is no headroom (the part ends at a cut or at the clip's last frame — note PTS 7.958, not 8.0, for a 24fps 8s clip), fall back to a small rate boost of `(N+0.6)/got`.
- Derive each part's frame count from **absolute video time** (`round(end*fps) - round(start*fps)`), never from its own duration, or per-part rounding accumulates into tens of milliseconds by the end.
- Cache renders on a content hash that includes the frame count, the pad and the boost — otherwise a re-plan silently reuses stale parts.
- `xfade` refuses mismatched timebases: `fps=30,settb=AVTB` on both inputs.

## 7b. Captions come off during instrumental
Do not run a caption to the next line's start. Measure where the vocal actually stops — centred-vocal energy via the mid/side ratio in the 350-3500Hz band, and call it ended after it stays below threshold for 0.25s — and end the caption there. Instrumental breaks carry no caption at all.

## 4. Making the stretch invisible (the part that took the most iteration)
Raw per-word anchoring produces a rate that jumps between segments (e.g. 1.00× → 2.34× → 0.94×). **A jumping rate is far more noticeable than a uniformly slow one** — it reads as stalling-then-lurching. Fixes, in the order to reach for them:

- **Rate-smoothing solve.** Least-squares: minimise word-timing error + a penalty on rate-to-rate change, with your two hard anchors (entry point, any beat-locked gesture) pinned exactly. This alone took peak stretch from 2.55× to 1.9× and killed the visible downshift.
- **Motion-aware weighting.** Measure whole-frame motion in the source clip (`tblend=all_mode=difference`, frame-averaged). Feed that into the solve so *high-motion moments get pulled toward 1.0×* and the stretch gets pushed into her low-motion moments instead. **A held mouth at 1.9× is invisible. A sweeping arm gesture at 1.9× is unmistakably slow-motion.** This was the single highest-value technique in the whole project — check it before anything else if a specific moment "looks slow."
- **Align her rests to the song's rests.** If she has a genuine mouth-closed pause and the song has a genuine instrumental gap, put one on the other. Don't stretch *singing* across a gap meant for silence — that was the single worst bug found here (a 2.5× stretch on a sustained note, caused by not noticing her real pause was elsewhere).
- **Per-line hard caps**, tightened line by line if the client flags a specific spot. A global ceiling can still leave one line sitting uncomfortably at that ceiling while a neighbouring line has slack — give the flagged line, and only that line, a tighter individual cap.
- **Recover discarded footage.** Before accepting a stretch number as final, re-check the very edges of your defined "singing span" with mouth-motion data — extra usable seconds lower every rate in the segment.

## 5. When retiming has run out of road: cut away
After redistributing everything possible, if one phrase still reads as slow-motion, **stop retiming it and cut to B-roll for that phrase instead.** This is normal music-video grammar, not a failure. Cut on the word boundary going out, cut back on the word boundary coming in. Use existing supporting animation/cards already built for the video — don't build new assets for this if something on-theme already exists. In this project: "Watch it grow" (verse 1) and "patience too" (verse 3) were both handled this way, and both were unambiguous improvements over any amount of further retiming.

**Rule of thumb going in:** AI-generated singing clips tend to run noticeably faster than AI-generated songs of the same lyrics. Budget for 1–2 cutaways per verse from the start rather than treating them as a last resort.

## 6. No static, ever
Any two adjacent frames identical (or near-identical) for more than ~0.3s reads as a freeze/glitch, even inside a stretch that's "supposed" to be slow. Verify with frame-differencing after every timing change:
```bash
ffmpeg -i out.mp4 -vf "select='not(mod(n,5))',scale=160:284,tblend=all_mode=difference,setpts=N/FRAME_RATE/TB" -an -f rawvideo -pix_fmt gray - \
  | python3 -c "<read WxH raw frames, mean abs diff, flag any run <0.45 for >=0.3s>"
```
Two things caused static in this project, both worth checking every time:
- **Explicit frame-cloning** (`tpad=stop_mode=clone`) used to pad a clip to length — never do this; retime or cut instead.
- **Slow-motion stretch on footage that has its own internal micro-pauses** (e.g. a reveal animation that pauses between beats) — dips under the threshold even though nothing was cloned. Fix with a continuous, independent camera move layered on top (a slow scale-based "breathe," NOT a `zoompan` position-crop move — that steps by whole pixels at slow speeds and reads as a wobble/shake).

## 7. How this video ends
End card = the client's real Instagram-standard closer: their round logo centred on their flat brand-mint background, no tagline unless asked for. Source it from a clean, high-res brand asset (crop the round mark out of the horizontal lockup PNG, don't extract from a compressed reel export — you'll inherit compression artifacts and any lower-thirds text baked into that specific post). If uncertain what the current standard closer looks like, ask for a link to a recent post and look at it directly rather than guessing from an older asset in the drive.

## 7a. What to deliver: ONE captioned file
**Deliver a single video, with captions burned in. Do not produce a clean/uncaptioned twin.** Earlier projects shipped both a `<name>.mp4` and a `<name>-CAPTIONED.mp4`; the client does not want that — it doubles render time and creates ambiguity about which file is the real one. Name the single export after the rhyme, with no `-CAPTIONED` suffix. Intermediate/uncaptioned renders stay inside `work/` as build artifacts, never handed over.

## 8. General build mechanics
- Every card/section duration is solved algebraically from its neighbours (`offset = prev_duration - crossfade_length`, chained) so a change to one segment never silently shifts something downstream you didn't touch. When you touch one number, recompute the whole chain — don't hand-patch a single offset.
- 0.5–0.6s crossfades between cards; hard cuts (no crossfade) when the whole point is a clean word-boundary cut (§5).
- Keep a running `buildNN.sh` per iteration rather than overwriting — makes it trivial to diff what actually changed between "still not right" rounds, and to recover if a "fix" makes something else worse.
- Rebuild the caption overlay (`caps/meta.json` → composited PNGs) every time verse timing changes. Editing the JSON does nothing until the ffmpeg command is regenerated from it.

## 9. Where everything lives — the archive convention
This file lives one level up, at `Nursery Rhymes/Insta Video Playbook.md` — that's the master copy, kept here so it's the first thing found at the start of the next video, not buried inside a completed one.

Every rhyme gets its own subfolder directly under `Nursery Rhymes/`, named after the rhyme (e.g. `Nursery Rhymes/Twinkle Twinkle Little SIP/`). **Everything for that video goes in its subfolder — every source clip, every intermediate build, every wav used for analysis, the final exports, the captions folder — with nothing left behind in a shared or temp location.** This makes each rhyme fully self-contained and revisitable months later without hunting across the drive. Two rules that follow from this:
- When starting a new rhyme, create its subfolder first, before generating anything.
- Any file made *for* that video — including ones made mid-project to fix a single note — is saved directly into that subfolder as it's created, not staged elsewhere and moved later.

**Shared assets are COPIED into every project that uses them — never referenced, never symlinked, never left in one rhyme's folder and pulled in from another.** If the same logo reveal, end card or brand PNG is used in two videos, each video's folder gets its own real copy. The point of §9 is that a folder can be opened months later and still build; a cross-folder reference breaks the moment the other rhyme is renamed, archived or cleaned up, and it is invisible until the rebuild fails. Disk is far cheaper than a broken archive.

Currently shared across rhymes, and correctly duplicated in each (verified by md5, Aug 2026):

| asset | lives in |
|---|---|
| sunset-cloud logo reveal | `Baa baa black sheep/10-logo-sunset-reveal.mp4` · `Twinkle Twinkle Little SIP/v2-avatar/src/LOGO2-sunset-clouds.mp4` |
| brand end card | `Baa baa black sheep/endcard.mp4` · `Twinkle Twinkle Little SIP/21-ifm-endcard-no-tm.mp4` |
| hi-res logo source PNG | `Baa baa black sheep/logo-source-hires.png` · `Twinkle Twinkle Little SIP/13-ifm-logo-source-hires.png` |

When a new rhyme reuses one of these, copy it in and add the row here. To find shared assets, hash every file over ~200KB in each rhyme folder and look for a digest appearing under more than one rhyme — that is also how you catch an accidental reference.

**Nothing project-related stays in Downloads.** Source clips arrive there from the generator; copy them into the rhyme's `src/` immediately, then remove the Downloads original once an md5 check confirms the copy. Trash rather than hard-delete, so a mistaken match is recoverable. Keep unused alternate takes in `src-alternates/` — they cost a few MB and save a re-generation.

## 10. Where we still don't fully nail the tone
Being honest about this so the next video starts from a clearer place, not a repeat of the same friction:
- **Amplitude/rate-driven "singing" is a puppet, not a performance.** It can be made *inoffensive* — smooth, on-beat, no visible slow-motion — but it is not the same as a clip actually generated to this song's tempo. If the brief is "make it look effortless," the honest fix is regenerating the source clip against the real track (once a proper lip-sync model is available), not another retiming pass. Say this early next time, before six rounds of adjustment, if the mismatch is already >30%.
- **We under-used cutaways early on and over-relied on retiming.** The retiming math is satisfying to tune but has a hard ceiling; a cutaway has none. Next time, identify likely-difficult phrases (fast lyrics over a slow-sung note, or lyrics landing on a big physical gesture) at the *planning* stage and pre-select B-roll for them, rather than reaching for a cutaway only after several rounds of "still too slow."
- **Verification before delivery, every round** — a frame-difference static check and a word-anchor visual spot-check are cheap and catch real bugs (a duplicated mouth layer, a wobbling crop, a shot-change bleeding through). Do them before sending, not after the client flags it.
