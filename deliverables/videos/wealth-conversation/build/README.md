# Wealth Conversation corp promo — from-scratch rebuild (30 Oct 2026)

Promo for The Wealth Conversation / The Money Blueprint (corporate, brought to you by EO New Mumbai).
Built entirely from the raw shoot and our own assets — nothing from the agency's MAIN_Comp.mp4 edit is reused.

## Final
**`WealthConversation_corp_FINAL_v6B_64s.mp4`** = v6B (B + effects, all revisions), signed off by the user on 31 Oct 2026.
Last change: music ducks as her first line starts and that line is +2 dB (it sounded muted under the intro).
`WealthConversation_corp_FINAL_60s.mp4` (plain B, approved 30 Oct) is kept as the earlier final.

## v5 — a completely different cut: "Warm-Up Round" (60s)
`WealthConversation_corp_v5_warmup-round.mp4` — quiz-host concept chosen by a 3-concept judge panel. Music groove from
frame one (track started at its drop, re-hit on the receipt, a quiet-build dip under the closing line, re-hit on "Join").
Hiral counts down three money questions (giant numerals + colour bands; dot-reveal → pause-point → countdown-flip hook),
magazine-cover title (cover-star editorial), NOT A LECTURE stamp, phone-fan of game screens, one-bar class burst, swipe,
the-bill receipt of outcomes, headline-box "ASK THE RIGHT QUESTIONS", phone-fan of group photos, credit bands, logo end.
Scripts: `wu_prep.py` (bases + effect stills), `wu_build.py` (effects, band/numeral overlays, music map, VO, final).

## Versions (v4)
| File | Look | Length |
|---|---|---|
| `WealthConversation_corp_v4A_sticker.mp4` | Falling-sticker captions + group photos + effects accents (locked-on, spotlight, lean-in, word-timed todo card, JOIN) | ~67s |
| `WealthConversation_corp_v4B_cinematic.mp4` **(master)** | Darker look: graded hook, REALLY? backdrop, connect-the-dots graphic (your money → the economy → your future) with a newspaper match-cut flash on "economy", game screens **orbiting** Hiral (slow, large) on her games line, CHALLENGE backdrop, then Hiral's "Walk away with a framework…" take (MVI_0280) with the three outcomes as stickers, music drop on the two-bar "Money games / Zero jargon / One workshop" shot, notification cascade on "you don't have to manage every investment yourself", iPhone toggles, LED sign. No separate game cards and no "Let's find out / By playing" build | 60s |
| `WealthConversation_corp_v4C_hypecut.mp4` | Shorter: hook → "No boring lectures" → straight into the games montage → closing | ~55s |
Each has a `_contact-sheet.jpg` (one frame per second).

## Sources
- **Hiral**: raw Canon takes (`MVI_0272/0277/0278/0279/0283/0284/0285`, 1920x1080 rotated −90 → vertical, 25 fps) from the
  Drive folder `19iiLlv_Jd39-CoaAGwsyPewYC89gA_Bq`. orig(MAIN_Comp)→camera shifts, found by cross-correlation:
  hook +3.55 · wealth +0.07 · no-boring −19.83 · games/challenge −21.31 · closing −21.74 · join −20.67 · credit −47.44.
- **Voice**: the on-set phone recordings (`VO's/Vo.zip`: Hook.m4a, "Rungtha Lane N.m4a", "After no boring lecture.m4a").
  Cleanest audio in the folder; highpass 90 Hz + afftdn + loudnorm. Lip-sync vs camera audio within ±31 ms.
- **Music**: `Sunset Rooft Lounge.mp3` — 124 BPM half-time, bar 1.94s, drop at 31.06s. Trimmed so the drop lands on the
  first game card; bars 54.34–58.22 looped to cover the ending; ducked under voice.
- **Class footage**: `highlight-reel-assets/` (iPhone HLG clips → SDR via `avconvert --preset Preset1920x1080`).
- **Games**: `highlight-reel-assets/games/*-teaser.mp4`, `deliverables/videos/game-teasers/swayamvar-teaser.mp4`, screenshots.
- **Group photos**: K-Phyto boardroom batch (`highlight-reel-assets/gflow-final/13-full-batch-group-photo.jpg`) and the
  Stree Dhan cohort (catalogue IFM-338) — the originals of the deck's "past engagements" images.
- **Ending**: the user's `Logo_transforming_into_text_graphic_a92d50fd.mp4` (BEOND → The Wealth Conversation wordmark),
  held 1.4s with the IFM logo fading in underneath.
- **Effects**: `~/.claude/skills/effects` (claude-video-effects, MIT) — plans in `fxrender.py`.

## Pipeline
1. `prep.py` / `prep2.py` — base segments (1080x1920/30fps): b-roll, Hiral from raw takes, photo cards, montage cards.
2. `fxrender.py` — effect passes on Hiral's base shots (needs the effects skill's venv).
3. `captions.py` — falling-sticker captions (Pillow PNG sequences), composited per segment. Pass segment names to rebuild some.
4. `assemble3.py A|B|C` — concat, phone-VO placement keyed off measured shot starts, music, loudnorm −14 LUFS, contact sheet.
Scratch paths inside the scripts point at the session scratchpad (`S = ...`); adjust when re-running elsewhere.

## v6B — B plus four effects (31 Oct 2026)
`WealthConversation_corp_v6B_cinematic-plus-fx.mp4` (63.6s) = approved B with: a one-bar **uninstall** opening
("Uninstalling: money fear", Hiral's silent pre-roll from MVI_0272) that breaks into pixels before the hook;
**shortcut-rain** of jargon keys + a **NOT A LECTURE** stamp on "lectures" (replaces B's NO BORING LECTURES spotlight);
a 1.45s **red-collage** beat (BORING? / NO LECTURES. NO JARGON. JUST GAMES., her silent smile after "blueprint" in
MVI_0284) before the games orbit; a **slow-push** on "Join the wealth conversation" under the LED sign.
B's FINAL file and intermediates are untouched (new names: S0_fx, H2_fB6_f, C6_fx, H4_fB6_f).
Music: two build bars repeated so the drop still lands on the class shot. Voice +25 ms (AAC delay) on every chunk.
Scripts: `wu6_prep.py` (new bases), `fxrender6B.py`, `captions6B.py H2_fB6 H4_fB6`, `assemble6B.py`.
Revised 31 Oct 2026 (64.6s): uninstall slowed to 2.9s; lower-third "Hiral Goel / Founder, Investing for Mummies" on
the H2 shot; the music-drop shot (was one woman in our classroom) is now three outside workshops from the deck —
Stree Dhan hotel room (IFM-356, pan), K-Phyto full batch (group photo, pan), Money Blueprint Goa cheer (IFM-248, HLG→SDR).
Masters were fetched from Drive into the scratchpad; IFM-316/317/318 (K-Phyto) are 404 on Drive.
Revised again 31 Oct 2026 (63.9s): uninstall now goes glitchy -> clear as the bar fills (custom `uninstall-clear` in
`fx6.py`, a wrapper that adds it to the skill's fx.py without editing the skill), ending on "Money fear uninstalled ✓";
pause after "No boring lectures" cut from ~1.9s to ~1.2s (H2 tail trimmed, collage 1.1s, 4 silent frames off the games
shot); CHALLENGE in Anton, gold, ~1.7x taller; "Walk away" lean-in (snapped back) replaced by a gentle push across the shot.
Final tweak 31 Oct 2026: uninstall card enlarged (0.86 x 0.27 of width, bold label, auto-fit) and reworded to
"Uninstalling: fear of investing" -> "Fear of investing: gone ✓" (user picked this over "money fear").
Later 31 Oct 2026 (66.0s): the green done card now holds 0.9s and grows toward the centre as the room dims
(opening 3.4s); the three outside-workshop clips are 1.8s each (were 1.3s), one sticker per clip.
File name kept as FINAL_v6B_64s.mp4 although it now runs 66s.
Opening, final form (31 Oct 2026, user picked option B): card grows but stays above her head (finish=top), room dims 30%;
label stays "Uninstalling: fear of investing"; at 100% a blue tick pops in with "Done" (app-style, no green message).
Opening clip now starts at cam 0.12s so her mouth stays closed for all 3.4s. Option previews: opening-option-black.mp4 / -top.mp4.
