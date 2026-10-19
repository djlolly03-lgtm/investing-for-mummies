---
name: ifm-tile-mosaic-reel
description: Build or iterate the "Hiral tile mosaic" testimonial reel (Instagram Reel 1080×1920, ~100 s, 12 participant testimonials popping from a 3×4 grid to fullscreen, ending with a Hiral CTA). Use whenever the user says "build the tile reel", "hiral tile v39/v40/…", "swap this tile", "the mosaic reel", or references `~/Desktop/IFM Hiral Tile/`. Iterations 1–38 are settled; §15 of `IFM Talking-Head Reel Playbook.md` is the canonical writeup — read it first.
---

# Tile Mosaic Testimonial Reel

## 0. Before touching anything, read

- `~/Documents/investing for Mummies/IFM Talking-Head Reel Playbook.md` §15
  ("Testimonial-tile mosaic reel") — the canonical recipe.
- The latest `build_vN.py` in
  `/private/tmp/claude-501/.../scratchpad/hiral-tile/`.
  As of writing: **v38** is live. Copy from the highest-numbered existing
  script; do not re-derive.

## 1. What the reel is

Instagram Reel, 1080×1920, 30 fps, ~100 s.
Grid = 3 cols × 4 rows, 12 tiles at 360×480. Tiles pop from their grid slot to
fullscreen in scattered order, one at a time, while their participant speaks;
then shrink back to the grid slot. Reel ends with Hiral (founder) fullscreen
on her IFM-367 CTA ("That's why I created Investing for Mummies…"), silent
grid loops behind her.

## 2. The two invariants — never regress on these

1. **Every tile is a different person, alone in frame.**
   Watch specifically for green-shirted or lilac-clad women shot in the same
   room but on different days — they read as the same person. `IFM-533` and
   `IFM-453` are one known trap (both green). `IFM-535` and `IFM-454` are
   another (both older lilac). Ship a side-by-side comparison strip to the
   user before extracting cache for any replacement.
2. **Lip sync is locked.** Two ways to break this, both seen in the wild:
   - **Cache offset drift** (v31–v37): extracting frames at `ss = aud - pre_off`
     while audio was at `ss = aud`. Fix: extract cache at `ss = aud`, keep
     `pre_off = 0.0`. If a tile needs a pre-roll of silence, freeze on video
     frame 0 in the render loop — never shift the cache.
   - **Frame-rate drift** (v40, IFM-398): the render loop treats every cached
     JPEG as 30 fps. If the source is 24 fps and ffmpeg outputs at native fps
     (no `fps=30` filter), the video plays 25% too fast against the audio and
     drifts up to ~1.8 s by the end of a 7 s tile. **Always add `fps=30`**
     to the `-vf` chain when extracting `_full/` and `_grid_loop/`, and
     **`ffprobe -select_streams v -show_entries stream=r_frame_rate` any new
     source before extracting** — the extract commands in §5 include this.
     Sanity check afterwards: `ls _full | wc -l` should be roughly
     `(hold + 0.5) * 30`, not `(hold + 0.5) * native_fps`.

## 3. File map

| Path | Role |
|---|---|
| `/private/tmp/claude-501/.../scratchpad/hiral-tile/build_vN.py` | Render script (copy the highest N) |
| `/private/tmp/claude-501/.../scratchpad/cache25/` | JPEG frame cache — one subdir per tile: `_full/`, `_grid_loop/`, `_still.jpg` |
| `/private/tmp/claude-501/.../scratchpad/hiral-cta/IFM-367-full.mov` | Hiral CTA source |
| `~/Documents/investing for Mummies/CLAUDE/content/clips/IFM-NNN.mp4` | 8 s participant preview clips (400×712), used for CLIPS_LOCAL tiles |
| `/private/tmp/claude-501/.../scratchpad/new-testimonials/IMG_*.mov` | Longer session recordings — use with a start-time offset |
| `~/Desktop/IFM Hiral Tile/hiral-tile-vNN.mp4` | Delivery folder; keep every version |

## 4. Standard flow for a new iteration

1. Confirm the change. Almost every iteration is **swap one tile** or
   **retime one moment**. Do not rebuild from scratch.
2. `cp build_v<prev>.py build_v<new>.py`. Edit:
   - `FRAMES = "frames<new>"`
   - `segs_dir = "audio<new>_segs"`
   - `audio_out = "audio<new>.aac"`
   - `video_only = "hiral_tile_v<new>_video.mp4"`
   - `final = "hiral_tile_v<new>_final.mp4"`
   - `TILES_SPEC` — swap the tile that's changing.
3. If the swap needs a new tile in the cache, run the extract commands in §5.
4. `/usr/bin/python3 build_v<new>.py`. Runs in ~2–3 min on this Mac.
5. `cp` the final .mp4 into `~/Desktop/IFM Hiral Tile/hiral-tile-vNN.mp4`.
6. Deliver via `SendUserFile` with a short bullet changelog against the
   previous version. **Do not** narrate the whole file map — the user is
   watching the reel, not reading the release notes.

## 5. Extracting a new tile into the cache

Given `label` (e.g. `t09_ifm380`), `SRC` (path to the clip), `AUD` (seconds
into the clip where the speech starts), `HOLD` (how long the tile speaks
for on screen — typically 3.5–7 s):

```bash
CACHE=/private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/d3136d82-1c65-44a3-b819-b1c8909c0e0c/scratchpad/cache25
LBL=t09_ifm380
SRC="/Users/lollyg/Documents/investing for Mummies/CLAUDE/content/clips/IFM-380.mp4"
AUD=0.60
HOLD=4.5

rm -rf $CACHE/${LBL}_full $CACHE/${LBL}_grid_loop $CACHE/${LBL}_still.jpg
mkdir -p $CACHE/${LBL}_full $CACHE/${LBL}_grid_loop

ffmpeg -nostdin -y -ss $AUD -i "$SRC" -frames:v 1 \
  -vf "crop='min(iw\,ih*9/16)':'min(ih\,iw*16/9)',scale=360:480" \
  $CACHE/${LBL}_still.jpg

ffmpeg -nostdin -y -ss $AUD -t $(echo "$HOLD+0.5" | bc) -i "$SRC" \
  -vf "crop='min(iw\,ih*9/16)':'min(ih\,iw*16/9)',scale=1080:1920,fps=30" \
  -q:v 3 -start_number 1 $CACHE/${LBL}_full/f_%04d.jpg

ffmpeg -nostdin -y -ss $AUD -t 4.0 -i "$SRC" \
  -vf "crop='min(iw\,ih*9/16)':'min(ih\,iw*16/9)',scale=360:480,fps=30" \
  -q:v 4 -start_number 1 $CACHE/${LBL}_grid_loop/f_%04d.jpg
```

**Never** pass a `pre_off` offset to the extract — see §2 rule 2.
**Always** include `fps=30` in the `-vf` chain — see §2 rule 2. Skipping it
was the v40 lip-sync bug on the 24 fps IFM-398 master. Sanity-check:
`ls ${LBL}_full | wc -l` should be `~(HOLD + 0.5) * 30`.

## 6. Founder CTA — the settled numbers

```python
HIRAL_LABEL = "hiral_cta"
HIRAL_AUD   = 21.20                 # source seconds, catches full "Th" of "That's"
HIRAL_HOLD  = 20.80                 # 21.20 → 42.00 s of source
HIRAL_FRAME_OFFSET = int(1.20 * FPS)   # cache dumped from source 20.00
CTA_IN      = 0.10                  # v38: near-instant fade — kills the
                                    # "tiles-moving" flash before her first word
PHASE_C_START = PHASE_B_END         # v38: no gap
```

If the user asks to move where Hiral starts, all of the above shift
together — verify against her word timings, don't just change `HIRAL_AUD`.

## 7. Current 12-tile pool (as of v38)

Reproduce exactly unless the user asks for a swap:

```python
TILES_SPEC = [
    ("t01_img4245", f"{NEW_BASE}/IMG_4245.mov",   1.75, 6.65, 0.0),
    ("t02_ifm399",  f"{CLIPS_LOCAL}/IFM-399.mp4",  0.98, 6.50, 0.0),
    ("t03_4248s1",  f"{NEW_BASE}/IMG_4248.mov",  10.26, 4.06, 0.0),
    ("t04_img6785", f"{NEW_BASE}/IMG_6785.mov",  23.44, 6.06, 0.0),
    ("t05_ifm403",  f"{CLIPS_LOCAL}/IFM-403.mp4",  0.00, 6.16, 0.0),
    ("t06_ifm411",  f"{CLIPS_LOCAL}/IFM-411.mp4",  0.00, 6.08, 0.0),
    ("t07_4248m",   f"{NEW_BASE}/IMG_4248.mov",  59.86, 3.44, 0.0),
    ("t08_ifm455",  f"{CLIPS_LOCAL}/IFM-455.mp4",  0.00, 7.86, 0.0),
    ("t09_ifm380",  f"{CLIPS_LOCAL}/IFM-380.mp4",  0.60, 4.50, 0.0),
    ("t11_ifm453",  f"{CLIPS_LOCAL}/IFM-453.mp4",  0.00, 6.50, 0.0),
    ("t12_ifm454",  f"{CLIPS_LOCAL}/IFM-454.mp4",  0.00, 3.50, 0.0),
    ("t10_4248s3",  f"{NEW_BASE}/IMG_4248.mov",  89.66, 4.84, 0.0),
]
SCATTERED = [(1,3),(0,0),(2,2),(2,0),(0,3),(2,3),(0,1),(1,0),(2,1),(0,2),(1,1),(1,2)]
```

Order of appearance = TILES_SPEC order. Play order is deliberate — do not
sort by ID or shuffle without asking.

## 8. Things that come up

- **"Lip sync is off on tile N"** — check the cache extraction for that tile
  first, not the render code. The bug is almost always in cache extract.
- **"Two women in tile N look like the same person"** — extract stills for
  both, ship the side-by-side to the user, do not decide alone.
- **"Her first word is half-cut"** — the audio fade-in ate it. Drop
  `HIRAL_AUD` by 0.2–0.3 s and cut the audio fade-in to 0.10.
- **"There's a flash of tiles moving before Hiral"** — `CTA_IN` and the
  Phase B→C gap. Fixed in v38: both should stay tight.
- **User asks for a fresh testimonial** — exclude every source in §7 and
  every known-duplicate person. Rank by (unique face) × (clean lip sync)
  × (understandable audio). Photorealistic laughter with the mouth covered
  is worse than a plainer take that you can lip-sync to.
- **Cache dir is `cache25` even in v38+** — historical. Don't renumber it;
  the cache is shared across builds and re-extracting all 12 tiles is a
  significant time cost.

## 9. Deliverable

Always land at `~/Desktop/IFM Hiral Tile/hiral-tile-vNN.mp4` and send it
back to the user with a short changelog. Do not upload to Vercel, do not
publish anywhere on the hub — this reel is for the founder to review and
post from her own phone.
