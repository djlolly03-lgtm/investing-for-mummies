# Hyperframes Composition Brief: Investing for Mummies

## Objective
Create a short launch-style brag video for Investing for Mummies — a Mumbai money-and-
investing course for women, taught entirely through games, whose new website just went live.

## Output
- Composition directory: `brag-output-2026-10-21-000339/composition/`
- Rendered video: `brag-output-2026-10-21-000339/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21s

## Source Material
- Project root: `/Users/lollyg/Documents/investing for Mummies`
- Primary files read: `ifm_website_oct26/index.html`, `ifm_website_oct26/home.css`
  (`:root` tokens), `ifm_website_oct26/home-data.js` (games, game library, feedback),
  live site `www.investingformummies.com`
- Product name: Investing for Mummies
- Tagline / strongest claim: **"Every lesson is a game first."**
- Key UI or visual moment to recreate: the real **Swayamvar** game screen
  (`assets/swayamvar-suitors.jpg`, "Meet the Suitors") — this is what the class is
  literally looking at, shown as the product doing its thing rather than describing itself.
- Copy that must appear verbatim (all from the project):
  - "Twenty years working at a bank." *(student feedback, anonymous on the site too)*
  - "I never understood what most departments did." *(same quote, second half)*
  - "Every lesson is a game first." *(site H2)*
  - "Should you marry this investment, keep it as a maybe, or run?" *(home-data.js,
    Swayamvar description)*
  - `NAV Pizza` · `Debt Detective` · `ChaiBoss Ltd` · `Wheel of Gold` · `Hidden Fortunes`
    *(home-data.js `gameLibrary`, verbatim names)*
  - "Forty of them. Free to play." *(site: "Forty small games… No sign-up, no jargon")*
  - `investingformummies.com`

## Creative Direction
- Tone preset: `polished`
- Creative direction: a warm launch film that lets the real game names do the joking
- Interpretation: few scenes, long holds, soft crossfades. Confidence through restraint.
  The only fast thing is the syllabus ticking in. No zooms, flashes or exclamation marks.
- Angle: A finance course whose proof is its own syllabus. The lessons are called NAV
  Pizza, Debt Detective, ChaiBoss Ltd and Wheel of Gold, and one asks whether you should
  marry an investment or run. The film earns that with a real student's line first —
  twenty years inside a bank, still not understanding most of it. The joke is not on her,
  it is on how finance is normally taught.
- Hook: cream paper, navy Lora italic — *"Twenty years working at a bank."* then
  *"I never understood what most departments did."*
- Outro / punchline: **"Forty of them. Free to play."** → logo → `investingformummies.com`
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Anything that reads as an ad: no urgency, no price, no "book now"

## Visual Identity
- Background: `#f7faf9` (cream); secondary surface `#e0f3f0` (mint-lt)
- Text: `#1a3a5c` (navy); muted `#5a7d8a` for eyebrows
- Accent: `#2a9d8f` (teal); `#c9a84c` (gold) for one emphasis moment only
- Display font: **Lora** (600; italic for the quote) — the site loads it from Google Fonts
- Body font: **Nunito** (700/800 for labels and game names)
- Visual references from the project:
  - `ifm_website_oct26/assets/room-inflation.jpg` (790x1400) — the classroom, Hiral at the
    "Invisible Enemy: Inflation" slide
  - `ifm_website_oct26/assets/swayamvar-suitors.jpg` (1440x900) — real game UI
  - `ifm_website_oct26/assets/logo-round-clear.png` (436x480) — round logo, transparent
  - The photographs are portrait because the site crops them vertically. Frame them as
    rounded editorial cards with a soft shadow on cream — do not crop to landscape.

## Storyboard
Use the storyboard in `brag-output-2026-10-21-000339/brag-plan.md` as the creative contract.

Scene summary:
1. **The admission** — 4.1s — eyebrow `FROM A STUDENT, IN HER OWN WORDS`; two quote lines
   arrive separately and hold. Nothing else on screen.
2. **The room** — 3.8s — `room-inflation.jpg` slides in as a portrait card on the right;
   left side reads `SO WE STOPPED EXPLAINING IT` then "Every lesson is a game first."
3. **The game** — 3.5s — `swayamvar-suitors.jpg` framed like a device; the line "Should you
   marry this investment, keep it as a maybe, or run?" holds ~1.8s (longest read).
4. **The syllabus** — 5.6s — `THE SYLLABUS` eyebrow, then five real game names tick in one
   per every-other-beat, all five holding together ~0.8s after the last.
5. **The offer** — 4.0s — "Forty of them. Free to play.", logo, then the URL; music fades.

## Audio
- Audio role: warm bed, sparse motion-matched accents
- Audio arc: quiet and confessional for four seconds, opening into warmth as the room
  appears, driving through the syllabus run, resolving to a soft stop on the URL.
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (110 BPM, 60s)
- Music treatment: in at 0.0 at moderate level; sit low under the two quote lines so they
  read as speech; lift from the photo card onward; fade out over the final 1.2s.
- Music cue guidance: bundled preset read from
  `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`.
  - Strong cues worth locking (pick 1–3): **0.27** hook line 1, **4.10** photo card in,
    **7.92** game card in, **18.01** URL.
  - Beat grid for the five sequential game names: **11.46 / 12.56 / 13.64 / 14.73 / 15.82**
    (every other beat, 1.09s apart — clears the ~0.8s readable floor for a short label).
    Do NOT use consecutive beats here; 0.545s would outrun reading.
- Audio-reactive treatment: **none**. This tone does not want anything pulsing. (Documented
  choice, not an extraction failure.)
- Audio-coupled moments:
  - Scene 1 quote lines — a soft mark under each arrival; no typing effect, it is a quote
  - Scene 2 photo card — one soft card-arrival sound
  - Scene 3 game card — one card arrival; no sound on the text
  - Scene 4 syllabus — a light tick per name, fired at the same timestamp as each reveal
  - Scene 5 logo — one quiet settle
- SFX selection guidance: sparse, five cues at most. Low, soft, warm. Nothing that reads
  as an ad: no whooshes, no risers, no impacts, no stingers.
- SFX analysis guidance: `<skill-dir>/assets/sfx/sfx-analysis.md` — prefer low
  high-frequency-risk files, especially for the five repeated syllabus ticks.
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density and volume once the
  animation exists.
- Audio files: copy the chosen music and any selected SFX into
  `brag-output-2026-10-21-000339/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`,
`hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`,
`hyperframes-cli`. /brag is its own workflow: do not enter the `hyperframes` entry-point
intent interview and do not route into its generic promo / launch-video workflow. Prefer
native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI element from the source project (the Swayamvar screen).
- Keep all text readable: short label ~0.8s settled; the 13-word Swayamvar line needs its
  full ~1.8s hold.
- Keep the video within 15–25 seconds (target 21s).
- Include the planned music/SFX layer.
- Treat the audio notes as guidance; choose SFX after the visual animation exists.
- Treat music cues as optional timing hints; ignore any that hurt readability.
- Lock 1–3 major reveals to strong cues within ±0.15s and mark them `// beat-locked`.
- Snap the five game names to the listed every-other-beat grid within ±0.10s and mark
  `// beat-grid`.
- Audio-reactive is deliberately off for this tone; do not add pulsing.
- Use local assets for audio and media.
- Run `hyperframes check` before render — brag's single gate.
- Keep creation and rendering local.
