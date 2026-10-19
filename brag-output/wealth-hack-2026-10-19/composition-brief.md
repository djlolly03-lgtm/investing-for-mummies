# Hyperframes Composition Brief: The Wealth Hack

## Objective
Create a short, polished launch-style brag video for The Wealth Hack (Investing for Mummies' live classroom game for young adults).

## Output
- Composition directory: `composition/`
- Rendered video: `brag.mp4`
- Format: landscape, 1920x1080
- Duration: 23.0s

## Source Material
- Project root: /Users/lollyg/Documents/investing for Mummies/CLAUDE
- Primary files read: the-wealth-hack.html (all templates, CSS), wealth-hack-hero.jpg, wealth-hack-loop.mp4, session screenshots of the host projector
- Product name: The Wealth Hack
- Tagline / strongest claim: "One started early. One started “soon”. Only one of them is rich."
- Key UI moments to recreate: the host question card + "N / 5 locked in" pill wall; the real-numbers table with life-bar timelines; the cost-of-waiting what-if
- Copy that must appear verbatim:
  - One started early. / One started “soon”. / Only one of them is rich.
  - To have ₹10 Cr by the time you turn 40, how much would you need to invest every month?
  - ₹10 Cr by 40 · what each of you needs every month
  - Round 2 · the cost of waiting — Same target. But you do nothing for 5 years
  - The best month to start is this one.
- Numbers (computed by the game's own maths, 12%, end-of-month SIP): Aanya 21 guessed ₹25k real ₹1.15 L (₹90.4k short) → late ₹2.31 L; Zoya 22 ₹10k → ₹1.32 L (₹1.22 L short) → ₹2.69 L; Rohan 24 ₹50k → ₹1.74 L (₹1.24 L short) → ₹3.68 L; Meera 27 ₹1.50 L → ₹2.69 L (₹1.19 L short) → ₹6.25 L. Names are fictional demo names.

## Creative Direction
- Tone preset: polished
- Creative direction: restrained midnight-and-gold, money-documentary title sequence
- Interpretation: 4 scenes, soft crossfades, long holds, big serif type, sparse soft SFX.
- Angle: the number depends on your age, and "soon" is expensive. The game does that trick live; the video shows the trick.
- Hook: two jars + the tagline arriving one line at a time
- Outro / punchline: "The best month to start is this one." + lockup
- Avoid: generic SaaS language, abstract filler, any redesign (this game deliberately breaks the IFM brand guide with midnight/gold), real people's names

## Visual Identity
- Background: #050c15; rooftop-night video / jars still with shade rgba(6,16,28,.30→.82)
- Text: #eaf6f3, sub #9fc2bb, ivory #f6f1e7
- Accent: gold #f7dea0→#d79f34, coral #ff8a76, teal #2dd4bf
- Display font: Fraunces (local woff2 in assets/fonts)
- Body font: Manrope (local woff2 in assets/fonts)
- Visual references: host projector glass panels, life-bar timelines (gold = years to grow, coral hatched = years lost), pill player wall, gold gradient buttons

## Storyboard
See `brag-plan.md`.
1. The two jars — 4.9s — tagline in three lines
2. The question — 6.0s — question card, five phones lock in, Reveal pressed
3. Real numbers → cost of waiting — 6.54s — table, numbers roll, 5 yrs lost, doubled numbers
4. The best month — 5.53s — jars, closing line, lockup

## Audio
- Audio role: warm bed with sparse soft accents
- Audio arc: bed fades up → soft clicks → one impact on reveal → bell on lockup → fade out
- Music: assets/music/bed.mp3 (vol-12, trimmed to 23s with fades baked in), volume ~0.32
- Music cue guidance: strong cues 10.93, 13.11, 17.47 (lock ±0.15s); beat grid at 0.56, 1.09, 1.64, 2.19, 2.73 … ~110 BPM; preset at skills/brag/assets/music/cues/…vol-12….music-cues.json
- Audio-reactive treatment: subtle — gold glow on headline numbers and the jar spotlight breathes with bass; no waveform visuals
- Audio-coupled moments: pill lock-ins (clicks), Reveal press, numbers roll-up (impact at 13.11), lockup (bell)
- SFX selection guidance: soft/low-HF-risk files from sfx-analysis.md (click_002/003/005, impactSoft_medium, bong_001, impactBell_heavy_000)
- Exact SFX choice: Hyperframes decides, copied into composition/assets/sfx/

## Hyperframes Instructions
Use hyperframes-core, hyperframes-animation, hyperframes-creative, hyperframes-cli. Run `npx hyperframes check` before render. Keep creation local. Requirements: show real game UI/copy; text legible; 15–25s; planned music + SFX; beats locked per the brief; render only after check passes.
