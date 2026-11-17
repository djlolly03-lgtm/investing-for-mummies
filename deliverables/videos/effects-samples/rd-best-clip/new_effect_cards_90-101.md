# New effect cards for "Which shot, which effect" (from 2 reference reels)
Paste prompt for Claude: Add these 15 effect cards to the 'All effects' section of the effects page. 90-101 are new effects; 56B, 19B and 04B are variants of existing cards and should sit next to them. Tag them 'New - 17 Nov'. None are rendered or scored yet, so show them as untested (no score) and put them under the setup filter given in best_shot.setup.
Reference reel 1: https://www.instagram.com/reel/Dc4ICGzO8kd/ (@seren.sarac)
Reference reel 2: https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)

## 90 head-scribble

**/command**
```
/reel-looks-fx head-scribble on <your video> · color=warm-white glow=soft follow=head · best shot: close-up (Face camera, head and shoulders, small natural head moves, plain or dark wall.)
```

**JSON**
```json
{
  "id": "90",
  "effect": "head-scribble",
  "skill": "reel-looks-fx",
  "settings": "color=warm-white glow=soft follow=head",
  "best_shot": {
    "setup": "Close-up",
    "framing": "Face camera, head and shoulders, small natural head moves, plain or dark wall."
  },
  "why_this_shot": "A glowing hand-drawn scribble locks to her head and moves with it; needs face tracking, and a clean background so the line reads.",
  "reference": "https://www.instagram.com/reel/Dc4ICGzO8kd/ (@seren.sarac)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 91 depth-map

**/command**
```
/reel-looks-fx depth-map on <your video> · title="DEPTH" palette=greyscale · best shot: seated off-centre, deep room (Deep room with clear foreground, mid and background layers; hold still for the first second.)
```

**JSON**
```json
{
  "id": "91",
  "effect": "depth-map",
  "skill": "reel-looks-fx",
  "settings": "title=\"DEPTH\" palette=greyscale",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Deep room with clear foreground, mid and background layers; hold still for the first second."
  },
  "why_this_shot": "Free depth model turns the shot into a near-white/far-black map; a flat wall gives no gradient, so it needs real room depth.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 92 x-ray

**/command**
```
/reel-looks-fx x-ray on <your video> · title="X-RAY" tint=cool-blue · best shot: seated off-centre, deep room (Same deep-room shot as depth-map, Hiral mid-shot, hands visible.)
```

**JSON**
```json
{
  "id": "92",
  "effect": "x-ray",
  "skill": "reel-looks-fx",
  "settings": "title=\"X-RAY\" tint=cool-blue",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Same deep-room shot as depth-map, Hiral mid-shot, hands visible."
  },
  "why_this_shot": "Inverted, cool-tinted depth plus edges reads as an X-ray; works best on the 'look inside your portfolio' type lines.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 93 night-vision

**/command**
```
/reel-looks-fx night-vision on <your video> · title="NIGHT VISION" grain=medium vignette=on · best shot: dark wall, standing (Standing mid-shot against a dark wall, low-key light.)
```

**JSON**
```json
{
  "id": "93",
  "effect": "night-vision",
  "skill": "reel-looks-fx",
  "settings": "title=\"NIGHT VISION\" grain=medium vignette=on",
  "best_shot": {
    "setup": "Dark wall, standing",
    "framing": "Standing mid-shot against a dark wall, low-key light."
  },
  "why_this_shot": "Green phosphor grade, grain and vignette; dark footage sells it, bright walls just look green.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 94 edge-detect

**/command**
```
/reel-looks-fx edge-detect on <your video> · title="EDGES" line=white bg=black · best shot: plain wall, standing (Plain wall, standing mid-shot, strong side light for clean outlines.)
```

**JSON**
```json
{
  "id": "94",
  "effect": "edge-detect",
  "skill": "reel-looks-fx",
  "settings": "title=\"EDGES\" line=white bg=black",
  "best_shot": {
    "setup": "Plain wall, standing",
    "framing": "Plain wall, standing mid-shot, strong side light for clean outlines."
  },
  "why_this_shot": "Outline-only look; a plain wall keeps the lines clean instead of turning the background into noise.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 95 cctv-motion

**/command**
```
/reel-looks-fx cctv-motion on <your video> · title="CCTV" label="CAM 01" rec=on box=red · best shot: tripod + empty plate (Locked-off tripod, high angle if possible, 2 seconds of empty set before she walks in.)
```

**JSON**
```json
{
  "id": "95",
  "effect": "cctv-motion",
  "skill": "reel-looks-fx",
  "settings": "title=\"CCTV\" label=\"CAM 01\" rec=on box=red",
  "best_shot": {
    "setup": "Tripod + empty plate",
    "framing": "Locked-off tripod, high angle if possible, 2 seconds of empty set before she walks in."
  },
  "why_this_shot": "Desaturated CCTV frame with timestamp, REC dot and a red motion box that follows her; the walk-in gives the box something to catch.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 96 posterize

**/command**
```
/reel-looks-fx posterize on <your video> · title="POSTERIZE" levels=4 palette="IFM navy|gold|cream" · best shot: plain wall, standing (Plain wall, standing mid-shot, even light.)
```

**JSON**
```json
{
  "id": "96",
  "effect": "posterize",
  "skill": "reel-looks-fx",
  "settings": "title=\"POSTERIZE\" levels=4 palette=\"IFM navy|gold|cream\"",
  "best_shot": {
    "setup": "Plain wall, standing",
    "framing": "Plain wall, standing mid-shot, even light."
  },
  "why_this_shot": "Flattens the frame into 4 IFM-colour bands; even light keeps her face from breaking into blotches.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 97 halftone

**/command**
```
/reel-looks-fx halftone on <your video> · title="HALFTONE" dot=navy paper=cream · best shot: wide with headroom (Wide standing shot with headroom.)
```

**JSON**
```json
{
  "id": "97",
  "effect": "halftone",
  "skill": "reel-looks-fx",
  "settings": "title=\"HALFTONE\" dot=navy paper=cream",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Wide standing shot with headroom."
  },
  "why_this_shot": "Newsprint dot pattern; pairs naturally with headline beats (e.g. after 16 split-headline).",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 98 dither

**/command**
```
/reel-looks-fx dither on <your video> · title="DITHER" mode=1-bit · best shot: plain wall, standing (Plain wall, standing mid-shot, strong contrast.)
```

**JSON**
```json
{
  "id": "98",
  "effect": "dither",
  "skill": "reel-looks-fx",
  "settings": "title=\"DITHER\" mode=1-bit",
  "best_shot": {
    "setup": "Plain wall, standing",
    "framing": "Plain wall, standing mid-shot, strong contrast."
  },
  "why_this_shot": "1-bit retro dither; needs contrast between her and the wall or she disappears.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 99 datamosh

**/command**
```
/reel-looks-fx datamosh on <your video> · title="DATAMOSH" length=0.6s · best shot: classroom (Any shot with clear movement into a hard cut (e.g. classroom gesture).)
```

**JSON**
```json
{
  "id": "99",
  "effect": "datamosh",
  "skill": "reel-looks-fx",
  "settings": "title=\"DATAMOSH\" length=0.6s",
  "best_shot": {
    "setup": "Classroom",
    "framing": "Any shot with clear movement into a hard cut (e.g. classroom gesture)."
  },
  "why_this_shot": "Smears motion from one shot into the next across a cut; use as a transition, not held.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 100 thermal

**/command**
```
/reel-looks-fx thermal on <your video> · title="THERMAL" palette=ironbow · best shot: close-up (Close-up face to camera.)
```

**JSON**
```json
{
  "id": "100",
  "effect": "thermal",
  "skill": "reel-looks-fx",
  "settings": "title=\"THERMAL\" palette=ironbow",
  "best_shot": {
    "setup": "Close-up",
    "framing": "Close-up face to camera."
  },
  "why_this_shot": "Heat-camera palette from luminance; on a face it reads instantly as 'scanning' her.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 101 warm-beat-grade

**/command**
```
/reel-looks-fx warm-beat-grade on <your video> · grade=warm-orange-red captions="one phrase at a time, white italic" cuts=on-beat · best shot: sofa at home (Sofa or warm room, talking to camera, several takes to cut between on the beat.)
```

**JSON**
```json
{
  "id": "101",
  "effect": "warm-beat-grade",
  "skill": "reel-looks-fx",
  "settings": "grade=warm-orange-red captions=\"one phrase at a time, white italic\" cuts=on-beat",
  "best_shot": {
    "setup": "Sofa at home",
    "framing": "Sofa or warm room, talking to camera, several takes to cut between on the beat."
  },
  "why_this_shot": "Warm orange-red grade with white italic phrase captions and hard cuts on the music; a full-reel style rather than a one-off beat.",
  "reference": "https://www.instagram.com/reel/Dc4ICGzO8kd/ (@seren.sarac)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 56B track-network

**/command**
```
/reel-looks-fx track-network on <your video> · labels=numeric box=cyan link=red points=face|hands · best shot: face camera, small side moves (Front-facing talking shot with hand gestures and small side-to-side leans.)
```

**JSON**
```json
{
  "id": "56B",
  "effect": "track-network",
  "skill": "reel-looks-fx",
  "settings": "labels=numeric box=cyan link=red points=face|hands",
  "best_shot": {
    "setup": "Face camera, small side moves",
    "framing": "Front-facing talking shot with hand gestures and small side-to-side leans."
  },
  "why_this_shot": "Variant of 56 locked-on: several cyan tracking boxes with number labels joined by red lines, following face and hands; side-on footage breaks it, same as 56.",
  "reference": "https://www.instagram.com/reel/Dc4ICGzO8kd/ (@seren.sarac)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 19B ascii-body

**/command**
```
/reel-looks-fx ascii-body on <your video> · title="ASCII" chars=dense bg=black · best shot: dark wall, standing (Dark wall, standing mid-shot, strong key light.)
```

**JSON**
```json
{
  "id": "19B",
  "effect": "ascii-body",
  "skill": "reel-looks-fx",
  "settings": "title=\"ASCII\" chars=dense bg=black",
  "best_shot": {
    "setup": "Dark wall, standing",
    "framing": "Dark wall, standing mid-shot, strong key light."
  },
  "why_this_shot": "Variant of 19 code-body: the whole frame as live ASCII text art; the dark wall keeps the characters readable.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 04B mosaic-tiles

**/command**
```
/reel-looks-fx mosaic-tiles on <your video> · title="MOSAIC" tile=large · best shot: plain wall, standing (Plain wall, standing mid-shot.)
```

**JSON**
```json
{
  "id": "04B",
  "effect": "mosaic-tiles",
  "skill": "reel-looks-fx",
  "settings": "title=\"MOSAIC\" tile=large",
  "best_shot": {
    "setup": "Plain wall, standing",
    "framing": "Plain wall, standing mid-shot."
  },
  "why_this_shot": "Variant of 04 dot-reveal: chunky square tiles instead of gold dots; quick punctuation beat.",
  "reference": "https://www.instagram.com/reel/DfzheUtT7i7/ (@zadonsky00, Higgsfield ad)",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```
