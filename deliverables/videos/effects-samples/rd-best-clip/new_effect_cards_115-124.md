# New effect cards for "Which shot, which effect" (from the @yourrealtorraelynn x @four.horsemen.media reel)
Paste prompt for Claude: Add these 10 effect cards to the 'All effects' section of the effects page. 115-124 are new effects. Tag them 'New - 22 Nov'. None are rendered or scored yet, so show them as untested (no score) and put them under the setup filter given in best_shot.setup. These are not variants of existing cards: 115 is not 01 backdrop-word, 102 floor-type-3d or 106 orbit-text; 116 is not 112 big-number-stamp or 39 stat-card; 117 is not 105 split-word-lockup, 103 word-slam or 16 split-headline; 118 is not 01, 86 glass-type or 103; 119 is not 10 led-sign; 120 is not 99 datamosh or 109 glitch-on-keyword; 121 is not 43 reel-frame or 95 cctv-motion; 122 is not 50 moody or 101 warm-beat-grade; 123 is not 113 comment-keyword-cta or 15/85 cover-star and cover-story; 124 is the first-frame hook, not 103 or 113.
Reference reel: https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)

## 115 walk-through-type

**/command**
```
/reel-looks-fx walk-through-type on <your video> · words="My buyer paid" hero=gold support=cream occlude=body depth=front|behind track=walk · best shot: wide with headroom (Full-body or three-quarter walk toward camera in a deep, bright room; leave side and head room so type can sit both behind and in front of her.)
```

**JSON**
```json
{
  "id": "115",
  "effect": "walk-through-type",
  "skill": "reel-looks-fx",
  "settings": "words=\"My buyer paid\" hero=gold support=cream occlude=body depth=front|behind track=walk",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Full-body or three-quarter walk toward camera in a deep, bright room; leave side and head room so type can sit both behind and in front of her."
  },
  "why_this_shot": "She walks toward camera through layered type, with a person matte so some words sit behind her body and others in front. A locked mid-shot or a flat wall hides the depth. Not 01 backdrop-word (one static word behind a standing head), 102 floor-type-3d (words tracked onto the floor) or 106 orbit-text (a path around the head).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "Hiral walks toward camera in a warm, bright room. Gold or navy hero words (SIP, 65%, GROW) and small cream support words layer in depth: some pass behind her, some sit in front, locked to the walk. Keep the grade light and premium, no dark teal lounge look.",
  "changed_from_stock": "Stock uses chartreuse heroes and white connectors in a teal-graded glass lounge, with the presenter walking through the type. IFM swaps heroes to gold or navy, support to cream, and keeps the room warm and bright. Red only if the line is a warning.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 116 outline-numeral

**/command**
```
/reel-looks-fx outline-numeral on <your video> · numeral="65" unit="%" style=outline color=gold connectors="with|grew" lock=speech · best shot: wide with headroom (Standing mid-shot or a walk toward camera, face and torso clear, with space across the chest and sides for a hollow numeral plus a small connector word.)
```

**JSON**
```json
{
  "id": "116",
  "effect": "outline-numeral",
  "skill": "reel-looks-fx",
  "settings": "numeral=\"65\" unit=\"%\" style=outline color=gold connectors=\"with|grew\" lock=speech",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Standing mid-shot or a walk toward camera, face and torso clear, with space across the chest and sides for a hollow numeral plus a small connector word."
  },
  "why_this_shot": "A hollow outline figure (45K, 75K) fills the frame with a tiny connector word (under, with, equity) sitting inside or beside it, over a talking body — not stamped onto a prop. A tight crop or a busy chest hides the holes. Not 112 big-number-stamp (a solid stamped numeral on a calendar or statement macro) or 39 stat-card (a card in the empty half of a desk frame).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "Hiral speaks a result and a hollow gold 65% or 10Y lands over her, with a small cream connector (grew, with, into). Use a red outline only for a warning figure. Warm, bright talking shot; keep the numeral large and empty, not filled.",
  "changed_from_stock": "Stock is a chartreuse or gold-outline 45K / 75 over a walk-and-talk, with small white words (paid under, equity k) inside the holes. IFM uses a gold outline for a teaching figure (65%, 10Y) and cream connectors, and reserves a red outline for a warning number.",
  "timing_seconds": "1.5-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 117 split-fill-word

**/command**
```
/reel-looks-fx split-fill-word on <your video> · word="GROW" fill=grey-to-gold direction=left-right lock=syllable · best shot: wide with headroom (Standing mid-shot or a walk toward camera, one large condensed word behind or across the head, held long enough for the fill to read.)
```

**JSON**
```json
{
  "id": "117",
  "effect": "split-fill-word",
  "skill": "reel-looks-fx",
  "settings": "word=\"GROW\" fill=grey-to-gold direction=left-right lock=syllable",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Standing mid-shot or a walk toward camera, one large condensed word behind or across the head, held long enough for the fill to read."
  },
  "why_this_shot": "One keyword starts grey (or empty) and fills gold as she says it, often mid-word (grey age / gold nt). This is a fill, not a break. Not 105 split-word-lockup (one word stacked as DEAD / LINE), 103 word-slam (words slam in at random angle and scale) or 16 split-headline (a cream headline panel with a highlight box).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "Hiral hits a keyword (GROW, COMPOUND, SIP) and the word fills left to right from navy or grey into gold. Use a red fill only on a warning word (RISK, LOSS). Warm, bright shot; keep only one hero word filling at a time.",
  "changed_from_stock": "Stock fills a giant condensed 'agent' from grey into gold while she talks, with smaller support words around it. IFM keeps the grey-to-gold (or navy-to-gold) fill on a teaching word, and uses a red fill only for a warning.",
  "timing_seconds": "1-1.5s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 118 gold-bevel-word

**/command**
```
/reel-looks-fx gold-bevel-word on <your video> · word="COMPOUND" style=3d-bevel color=gold lock=speech · best shot: seated off-centre, deep room (Seated mid-shot, or a walk toward camera, with clear space above or across the head for one short extruded word; a soft, bright background helps the bevel read.)
```

**JSON**
```json
{
  "id": "118",
  "effect": "gold-bevel-word",
  "skill": "reel-looks-fx",
  "settings": "word=\"COMPOUND\" style=3d-bevel color=gold lock=speech",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Seated mid-shot, or a walk toward camera, with clear space above or across the head for one short extruded word; a soft, bright background helps the bevel read."
  },
  "why_this_shot": "A short word is extruded with a gold bevel and a slight 3D turn, so it feels solid in the air in front of her. A busy wall or a long sentence flattens it. Not 01 backdrop-word (a flat cut-out word on the wall), 86 glass-type (a frosted-glass word rising behind the head) or 103 word-slam (flat condensed slams).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "One spoken word (COMPOUND, GROW, EVERY) lands as a gold 3D bevel over a warm, bright Hiral mid-shot. Navy bevel is fine for a calmer line; red bevel only for a warning word. Keep it to one or two short words, not a full sentence.",
  "changed_from_stock": "Stock sets words like every, my own and dollar in a gold 3D bevel over a teal-graded lounge. IFM keeps the gold bevel and the short-word timing, but sits them on a warm, bright shot, and uses red only if the word is a warning.",
  "timing_seconds": "1-1.5s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 119 neon-line-icon

**/command**
```
/reel-looks-fx neon-line-icon on <your video> · icons=chart|rupee|shield|calendar glow=gold-stroke lock=words · best shot: seated off-centre, deep room (Seated mid-shot, slightly off-centre in a deep bright room, leaving a clear side or the space above a shoulder for a stroke icon to pop.)
```

**JSON**
```json
{
  "id": "119",
  "effect": "neon-line-icon",
  "skill": "reel-looks-fx",
  "settings": "icons=chart|rupee|shield|calendar glow=gold-stroke lock=words",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Seated mid-shot, slightly off-centre in a deep bright room, leaving a clear side or the space above a shoulder for a stroke icon to pop."
  },
  "why_this_shot": "A glowing stroke icon (phone and cart, door-knock, mortarboard, wrench) pops beside her on the spoken word, with a soft neon glow — motion-graphics line art, not an Instagram sticker. A centred close-up leaves it nowhere to sit. Not 10 led-sign (a worded light-box behind the head).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "On each spoken beat, a gold stroke icon pops beside Hiral: a rising chart, a rupee, a shield, a calendar or a phone. Warm, bright room; soft gold glow, never harsh green neon or a dark night-club look. Time each icon to the word it stands for.",
  "changed_from_stock": "Stock uses chartreuse neon line icons (phone plus cart, door-to-door knock, graduation cap, repair wrench) over a teal lounge. IFM swaps the set for finance icons and the glow to gold, on a bright room, with red stroke only for a warning icon.",
  "timing_seconds": "1-1.5s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 120 motion-blur-wipe

**/command**
```
/reel-looks-fx motion-blur-wipe on <your video> · direction=horizontal length=0.3s from=walk to=seated · best shot: wide with headroom (A full-body or mid walk toward camera that can cut to a seated mid-shot; a clear gesture (a wave or a turn) at the cut helps the smear read.)
```

**JSON**
```json
{
  "id": "120",
  "effect": "motion-blur-wipe",
  "skill": "reel-looks-fx",
  "settings": "direction=horizontal length=0.3s from=walk to=seated",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "A full-body or mid walk toward camera that can cut to a seated mid-shot; a clear gesture (a wave or a turn) at the cut helps the smear read."
  },
  "why_this_shot": "A short directional motion-blur smear (~0.3s) wipes the walk into the sit-down shot. It should feel like a camera smear, not a hold. Not 99 datamosh (a compression smear across a cut) or 109 glitch-on-keyword (RGB split and block corruption on one word).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "Hiral finishes a walk-and-talk line, the frame smears for a third of a second, and she is seated, still talking. Keep the grade warm and bright through the wipe; do not drop into a dark teal or add glitch artefacts.",
  "changed_from_stock": "Stock is a directional motion-blur smear as she waves, landing on a seated MCU in a teal lounge. IFM keeps the same short optical wipe, from a bright walk into a bright seated shot, with no datamosh or keyword glitch on top.",
  "timing_seconds": "0.3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 121 viewfinder-crop

**/command**
```
/reel-looks-fx viewfinder-crop on <your video> · frame=white-corners crop=tighter type=cream word="FOCUS" · best shot: close-up (Seated or standing MCU, face to camera, background a little softer; leave the face clear inside a tighter inner crop so the corner brackets can sit around it.)
```

**JSON**
```json
{
  "id": "121",
  "effect": "viewfinder-crop",
  "skill": "reel-looks-fx",
  "settings": "frame=white-corners crop=tighter type=cream word=\"FOCUS\"",
  "best_shot": {
    "setup": "Close-up",
    "framing": "Seated or standing MCU, face to camera, background a little softer; leave the face clear inside a tighter inner crop so the corner brackets can sit around it."
  },
  "why_this_shot": "White L-shaped viewfinder corners frame a tighter crop of her face, with small type inside the brackets. It should read as a camera viewfinder, not a film strip or a security cam. Not 43 reel-frame (a 35mm strip with sprockets and edge print) or 95 cctv-motion (a timestamp, REC dot and a red motion box).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "White or cream viewfinder corners close in on Hiral, with a short cream or navy word (FOCUS, CHECK, SIP) inside the frame. Warm, bright, slightly soft background; no teal night look, and no red brackets unless the line is a warning.",
  "changed_from_stock": "Stock uses thin white corner brackets around a tighter seated crop, with small white words (Your, the, agent) inside, on a slightly softer teal background. IFM keeps the white or cream corners and swaps the inner word to gold or navy on a warm, bright close-up.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 122 wardrobe-pop-grade

**/command**
```
/reel-looks-fx wardrobe-pop-grade on <your video> · grade=warm-bright pop=wardrobe shadows=soft-rich · best shot: wide with headroom (Full-body or mid-shot in a real room with some depth and a solid, warm outfit (cream, gold or a clear mid-tone); even daylight or soft indoor light, not a black wall.)
```

**JSON**
```json
{
  "id": "122",
  "effect": "wardrobe-pop-grade",
  "skill": "reel-looks-fx",
  "settings": "grade=warm-bright pop=wardrobe shadows=soft-rich",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Full-body or mid-shot in a real room with some depth and a solid, warm outfit (cream, gold or a clear mid-tone); even daylight or soft indoor light, not a black wall."
  },
  "why_this_shot": "A cinematic grade that lets her wardrobe pop against the room. Stock does this with teal-cyan shadows and a pale-yellow dress. A flat white wall or a matching outfit kills the pop. Not 50 moody (dark edges, lit face, a mood shift) or 101 warm-beat-grade (orange-red grade with italic captions and cuts on the beat).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "Grade Hiral warm and bright: lifted shadows, clean skin, a cream or gold outfit that pops against slightly richer (never dark teal) surroundings. Premium financial-education look, not a moody luxury lounge. Hold it across the walk and the seated shots.",
  "changed_from_stock": "Stock is a teal-cyan cinematic grade with lowered mids, glossy floor reflections and a pale-yellow dress pop. IFM drops the teal and the dark mids, keeps the wardrobe pop, and grades warm, bright and premium instead.",
  "timing_seconds": "held",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 123 identity-end-card

**/command**
```
/reel-looks-fx identity-end-card on <your video> · layout=blur-bg+pip lines="Hiral|Investing for Mummies" fade=black · best shot: close-up (A locked mid or close headshot of Hiral (a still is fine), face clear, held 2-3 seconds at the end so it can be used as both the blurred full-frame background and the sharp inset.)
```

**JSON**
```json
{
  "id": "123",
  "effect": "identity-end-card",
  "skill": "reel-looks-fx",
  "settings": "layout=blur-bg+pip lines=\"Hiral|Investing for Mummies\" fade=black",
  "best_shot": {
    "setup": "Close-up",
    "framing": "A locked mid or close headshot of Hiral (a still is fine), face clear, held 2-3 seconds at the end so it can be used as both the blurred full-frame background and the sharp inset."
  },
  "why_this_shot": "The end card is a blurred full-frame portrait, a sharp centred picture-in-picture of the same (or a matching) shot, and a two-line name lockup, then a fade to black. It needs a clean headshot, not a mid-reel cutaway. Not 113 comment-keyword-cta (a Comment X / I'll DM you the guide end card) or 15 / 85 cover-star and cover-story (magazine masthead treatments).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "End on a warm, bright Hiral headshot: blur the full frame, drop a sharp inset of her in the centre, and set two cream or navy lines underneath (Hiral / Investing for Mummies). Optional gold accent on the name. Fade to black. No red lockup, no Manychat prompt on this card.",
  "changed_from_stock": "Stock is a blurred outdoor headshot, a sharp centred inset (white shirt, arms crossed) and a two-line white sans lockup (name / Utah - Real Estate Agent), then a fade to black. IFM keeps that blur-plus-PiP structure and swaps the lines for Hiral and Investing for Mummies, on a warm, bright portrait.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 124 money-claim-hook

**/command**
```
/reel-looks-fx money-claim-hook on <your video> · claim="My SIP grew 65%" hero=gold numeral=outline first-frame=on · best shot: wide with headroom (Full-body walk toward camera, first frame already dressed with the claim: a tiny connector, a giant keyword and a hollow money figure, before any later title card.)
```

**JSON**
```json
{
  "id": "124",
  "effect": "money-claim-hook",
  "skill": "reel-looks-fx",
  "settings": "claim=\"My SIP grew 65%\" hero=gold numeral=outline first-frame=on",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Full-body walk toward camera, first frame already dressed with the claim: a tiny connector, a giant keyword and a hollow money figure, before any later title card."
  },
  "why_this_shot": "The hook is the first frame: a money claim is already on screen as she walks in (My / SIP / grew / 65%), so the viewer feels the tension immediately. A delayed title or a mid-shot talking head wastes it. Pairs with 115 and 116, but this card is the open, not the walk-through or the numeral on their own. Not 103 word-slam (syllable slams after the line starts) or 113 (an end-card CTA).",
  "reference": "https://www.instagram.com/reel/DZWLhE3uEhO/ (@yourrealtorraelynn x @four.horsemen.media)",
  "ifm_version": "Open on Hiral walking toward camera in a warm, bright room, with the claim already up: small cream My / grew, a giant gold SIP (or 65%), and a hollow gold 65% if the figure is the hook. Use red only if the hook is a warning (RISK, 0 saved). Hold 1-2 seconds, then continue the line.",
  "changed_from_stock": "Stock opens on a full-body walk in a teal lounge with chartreuse 'buyer', small white 'My' / 'paid', then a hollow 45K — a first-frame money claim. IFM keeps that first-frame structure and hierarchy, swaps the palette to gold, navy and cream, and writes an IFM claim (SIP, 65%, 10Y) instead of a property figure.",
  "timing_seconds": "1.5-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```
