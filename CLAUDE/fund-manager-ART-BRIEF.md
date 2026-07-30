# Mutual Fund Manager LIVE — Art & Video Brief

Generation brief for the 13 numbered media slots. Drop finished files in later by
pasting their URLs into the `MEDIA` map in `fund-manager.html` (keys `ASSET-01`…`ASSET-13`).

---

## 0. Global style guide (read first — applies to ALL assets)

**Theme — "Fund Control Room":** a premium fintech command-centre. Think a calm, cinematic
trading desk crossed with a high-end fintech app — dark, glowing, glassy, expensive-feeling.

**Palette (match exactly so the set feels cohesive):**
- Background / base: midnight navy `#0a1422` → `#0f2036`
- Growth / positive: emerald green `#34d399`
- Electric accent: blue `#4ea8ff`
- Money / value: gold `#f5c451`
- Loss / risk: coral red `#ef5a4c`
- Soft text highlights: pale slate `#e7eef7`

**Mood & finish:** dark background, one glowing focal element, rim lighting, soft depth-of-field,
subtle bokeh/particles, glassmorphism (frosted translucent panels), gentle volumetric glow.
Modern, aspirational, warm-but-credible. Indian financial context where relevant (₹ motif,
Indian setting) — but **no real/branded company logos**.

**HARD RULES**
- **No baked-in text, words, numbers or UI** — the game renders all text on top; any text in the
  image will clash or duplicate. (The ₹ symbol as a decorative motif is fine.)
- Keep it **clean and uncluttered** — one clear idea per image, lots of negative space.
- **Consistent colour grade** across all 13 so they read as one set.
- Avoid: cliché stock handshakes, literal bronze bull/bear statues (unless stylised), busy
  infographics, lens-flare overload, watermarks.

**Technical specs**
- 16:9 → export **1920×1080** (or 2560×1440). 1:1 → **1080×1080**. 4:3 → **1600×1200**.
- Format: PNG or high-quality JPG. (Transparent PNG ideal for the crests, ASSET-02/03/04/11.)
- **Video option:** any slot can be a 4–8s **seamless loop**, muted, 1080p, MP4/H.264. Keep motion
  subtle (slow drift, particle float, gentle glow pulse). To enable video, change the `slot()`
  helper to emit a `<video autoplay muted loop playsinline>` when the URL ends in `.mp4` (one-line tweak).

> ⚠️ Do NOT generate the meters/charts — the AUM gauge, NAV line, unit/ownership bars and the
> liquid/equity/retirement tanks are all **coded and live** in the game. These 13 assets are the
> hero/character/backdrop art that sits *around* those live elements.

---

## The 13 assets

### ASSET-01 — Fund-launch hero banner · Screen 1 (host) · 16:9 · image or 6–8s loop
**Where:** big banner behind the fund name on the teacher's launch/lobby screen.
**Composition note:** the bottom third is covered by a dark gradient + the fund title, so keep the
hero subject in the **upper two-thirds**; a darker lower area is fine.
**Prompt:** *Cinematic wide banner of a premium fintech command centre at night — a sleek dark
trading desk overlooking a glowing abstract cityscape of light-trails and data, deep midnight-navy
tones with emerald-green and electric-blue glow, soft bokeh, volumetric light, glassmorphism panels
faintly floating, a subtle ₹ rupee symbol formed of light in the distance. Aspirational, calm,
expensive. No text, no logos, no people front-and-centre.*
**Video idea:** slow parallax drift across the city of light-trails, gentle particle float.

### ASSET-02 — Equity fund crest · Screen 1 (host + phone) · 1:1 · transparent PNG
**Where:** emblem on the 🔵 Equity fund-type card.
**Prompt:** *A modern emblem/crest representing an equity (stock) fund — a glowing upward growth
arrow or sprouting tree-of-stocks motif inside a rounded badge, electric-blue `#4ea8ff` and emerald
accents on a transparent background, glassy 3D, soft inner glow, minimalist and iconic. No text.*

### ASSET-03 — Debt fund crest · Screen 1 (host + phone) · 1:1 · transparent PNG
**Prompt:** *A modern emblem for a debt / bond fund — a calm shield or steady horizontal-bars motif
suggesting stability and fixed income, emerald-green `#34d399` on a transparent background, glassy
3D badge, soft glow, minimalist. Conveys "safe & steady". No text.*

### ASSET-04 — Hybrid fund crest · Screen 1 (host + phone) · 1:1 · transparent PNG
**Prompt:** *A modern emblem for a hybrid fund — a balanced yin-yang-like split of growth and
stability, or a 60/40 segmented disc, blending gold `#f5c451` and emerald/blue, glassy 3D badge on
transparent background, soft glow, minimalist. Conveys "balanced blend". No text.*

> Tip: generate ASSET-02/03/04 as a **matching trio** in one go so they share a style.

### ASSET-05 — "Your money at work" · Screen 2 (phone) · 4:3 · image
**Where:** top of the student's invest screen, above "How much will you invest?".
**Prompt:** *Warm, motivating illustration of money beginning to grow — a single gold coin or seed
transforming into a small glowing sprout with ₹ rupee leaves, soft emerald and gold light on a dark
navy background, optimistic and friendly, slightly softer/brighter than the host art (this is the
student's phone). Clean, hopeful, no text.*

### ASSET-06 — Equity Rally (+10%) · Screen 4 (host) · 16:9 · image or loop
**Where:** Market Day event card when "Equity Rally" fires.
**Prompt:** *Energetic scene of a market rally — sweeping upward green light-trails and rising
candlestick-like bars of emerald light surging up-right, confident and bullish, dark navy backdrop,
celebratory green glow and sparks, dynamic motion blur. Positive, exciting. No text.*
**Video idea:** bars/light-trails surging upward in a loop.

### ASSET-07 — Market Crash (−15%) · Screen 4 (host) · 16:9 · image or loop
**Prompt:** *A market downturn — coral-red `#ef5a4c` light-trails and falling bars sloping
down-right, a stormy but stylised mood, dark navy backdrop, red glow, sense of drop and caution
(not apocalyptic — this is an educational game). Dramatic yet tasteful. No text.*
**Video idea:** bars sliding downward, red pulse.

### ASSET-08 — IT Stocks Boom (+25%) · Screen 4 (host) · 16:9 · image or loop
**Prompt:** *A technology / IT sector boom — glowing circuit-board patterns and microchip motifs
exploding outward with electric-blue and emerald energy, futuristic and exuberant, dark navy
backdrop, bright tech sparks and data streams. High-energy, optimistic. No text.*

### ASSET-09 — Bonds Rise (+4%) · Screen 4 (host) · 16:9 · image or loop
**Prompt:** *A calm, steady gain — a gentle upward emerald gradient with serene horizontal bands /
ribbons of soft light, a government-bond / vault feeling of safety and slow reliable growth, dark
navy backdrop, muted gold and green, understated. Quiet confidence (contrast to the dramatic equity
events). No text.*

### ASSET-10 — NAV Discovery backdrop · Screen 5 (host) · 16:9 · image
**Where:** side-panel backdrop on the NAV-reveal screen (sits behind the live NAV sparkline).
**Prompt:** *A clean, contemplative abstract backdrop about "the price of one unit" — a single
glowing unit/coin/orb on the left with a subtle rising light-line, lots of dark navy negative space
on the right (the live NAV chart overlays there), emerald and gold glow, minimal and calm. Mostly
empty/dark on the right side. No text.*

### ASSET-11 — Feezilla the expense-ratio monster · Screen 7 (host) · 1:1 · transparent PNG or loop
**Where:** the character beside the fee-comparison chart. **This one has personality.**
**Prompt:** *A friendly-but-greedy cartoon monster named "Feezilla" — a rounded, slightly goofy
creature made of coral-red and dark scales, big eyes, taking a comic bite out of a glowing gold
coin / stack of ₹ rupees, playful and a little cheeky (not scary — it's for a classroom), clean
character art on a transparent or dark-navy background, soft rim light, mascot style. No text.*
**Video idea:** Feezilla chomping a coin on a loop (mouth opening/closing), coins shrinking.

### ASSET-12 — STP: liquid → equity flow · Screen 9 (host) · 16:9 · image or loop
**Where:** side panel beside the live liquid/equity tanks.
**Prompt:** *Two stylised glass tanks side by side connected by a glowing pipe — a blue "liquid
fund" tank on the left slowly streaming a ribbon of light into a green "equity" tank on the right, a
gentle controlled flow of luminous droplets, dark navy backdrop, emerald and electric-blue glow,
clean and diagrammatic-yet-beautiful. Conveys "money moving a little at a time". No text, no
numbers.*
**Video idea:** droplets/ribbon continuously flowing left→right in a seamless loop.

### ASSET-13 — SWP retirement tank · Screen 10 (host) · 16:9 · image or loop
**Where:** side panel beside the live retirement-corpus tank.
**Prompt:** *A serene retirement scene — a large glowing reservoir/tank of golden-green liquid light
that is gently draining from a spout at the bottom (an income stream) while being topped up by a
soft glowing inflow from above (growth), the level staying calm and full, warm and reassuring, dark
navy backdrop, gold and emerald glow, peaceful "your money keeps paying you" mood. No text.*
**Video idea:** slow drip out the bottom + gentle refill from the top, level steady — seamless loop.

---

## How to install finished assets
1. Open `fund-manager.html`, find `const MEDIA = { … }`.
2. Paste each file's URL against its key, e.g. `'ASSET-01':'https://ifm-deploy.vercel.app/art/launch-hero.jpg',`
   (host the files on Vercel in a `/art/` folder, or any public https URL).
3. For video files, apply the one-line `slot()` tweak noted in §0.
4. `vercel deploy --prod` from the CLAUDE folder. Empty keys keep showing the labelled placeholder.
