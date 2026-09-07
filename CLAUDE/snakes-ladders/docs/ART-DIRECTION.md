# Saanp Seedhi — Art Direction v2: MAKE IT AN OBJECT

## The verdict on v1

It reads as a **diagram**, not a board. Specifically, from the shipped render:

- Tiles are flat white. No material, no grain, no edge, no ornament.
- The palette is all pale cream/beige at low saturation. Nothing anchors the eye.
- The table is a flat beige gradient. It looks like a background, not a surface.
- Snakes are thin salmon tubes. No scales, no gloss, no markings, no character.
- Ladders are pale yellow sticks. No grain, no thickness, no shadow under the rungs.
- Everything is roughness ≈ 0.85 / metalness 0 — so nothing catches light anywhere.
- No contact shadows worth the name, so the board floats and the pieces do not sit.
- The board is ~25% of a phone screen, surrounded by empty table.

## The target

**A beautiful, slightly worn, hand-made Indian board game, photographed on a table in
warm afternoon light.** Not a screen. Not a diagram. An object you would want to touch.

Reference feeling: a lacquered wooden Moksha Patam board · Channapatna toy finish ·
brass inlay · Rajasthani block-print borders · marigold and terracotta against teal.
Saturated but warm. Aged but cared for. Never neon, never plastic, never corporate.

## Non-negotiables (every one of these is currently failing)

### 1. Material — nothing may be a flat colour
| Surface | Was | Must become |
|---|---|---|
| Tile face | flat white, rough .9 | warm ivory with a **paper/linen grain**, roughness .55–.65, a faint sheen so light rakes across it |
| Tile edge | none | every tile is **inset** with a 1–1.5px darker bevel line so the grid reads as carved, not printed |
| Board frame | flat `C.wood` | **dark walnut with real grain**, roughness .45, plus a **brass inlay line** (metalness .85, roughness .25) between frame and playfield |
| Table | flat beige gradient | **wood plank grain** with visible seams, darker and more saturated, roughness .6, and a **vignette** so the corners fall off |
| Snake body | matte salmon | **lacquered**: clearcoat gloss, roughness .3, with a painted **scale/diamond pattern** down the spine and a paler belly |
| Ladder | pale yellow | **honey wood grain** with rounded rails, roughness .5, and **brass caps** on the rail ends |
| Tokens | flat blobs | **glazed ceramic**: roughness .25, a bright specular highlight, a coloured rim light |
| Dice | plain white | **aged ivory**, roughness .35, pips inset with a soft shadow |

### 2. Colour — raise the saturation and the contrast
The IFM palette stays, but it must be **used at full strength as accent**, not diluted
into everything. Concretely:
- Tiles: warm ivory `#f4ece0` and a second tint `#e8f1ee`, alternating in **2×2 blocks**,
  not per-square — a per-square checker reads as noise at phone size.
- Frame: deep walnut `#5b3a24`. Table: `#8a6242` with grain, vignetted to `#4e3524`.
- Snakes: terracotta `#c05a3e` body, deep maroon `#7d2f1e` markings, cream belly.
- Ladders: honey `#d9a441` with `#a8762a` shadow, brass `#c8900a` caps.
- Milestones (10/25/50/75/100): **gold leaf** — real metalness, and they should visibly
  glint when the key light moves.
- Square 100: a raised gold plaque that catches a specular highlight.

### 3. Light — this is where "rich" actually comes from
- Key: warm `#fff0d8`, **45° elevation from the front-left**, intensity up, casting
  **soft shadows** (radius ≥ 6 on high tier, 2048 map tight to the board bounds).
- Fill: cool `#cfe6ff` from the opposite side at ~25% of key, no shadow.
- Rim: warm gold from behind, low, to separate the board from the table.
- **Every raised object must cast a contact shadow onto the tile beneath it** — snakes,
  ladders, tokens, dice. This single change is most of the "richness".
- Exposure up, and a gentle **contrast/saturation lift** in tone mapping.

### 4. Ornament — the thing that is completely missing
- A **block-print border motif** running inside the frame, drawn procedurally into the
  board texture. Subtle, low contrast, but present.
- A faint **paisley or diamond watermark** in the empty centre of the playfield, at ~6%
  opacity, so the middle of the board is not dead white.
- A thin **brass keyline** around the playfield.
- The IFM mark **embossed, not pasted**, into the board's frame at one corner.

### 5. Legibility beats all of the above
Ornament must never cost a numeral. The current build buries ~24 numerals under snakes
and ladders and several read as the wrong number. Fixing that is part of this job:
- Numerals move **above** the furniture — draw them last, or lift snakes/ladders further
  off the plane and give them a soft drop shadow that darkens rather than hides.
- Any snake or ladder crossing a numeral gets a **subtle cream halo** behind that numeral.
- No snake or ladder mesh may stray outside the corridor between its own head and tail.

### 6. Framing
The board must occupy **at least 45% of a phone screen's height** (currently ~25%).
Pull the camera in, reduce the dead table above and below, and let the board bleed
towards the edges. A board game photographed on a table fills the frame.

## The test
Put the v1 screenshot and the v2 screenshot side by side. If a stranger cannot tell
within one second which one someone was paid to make, v2 has failed.
