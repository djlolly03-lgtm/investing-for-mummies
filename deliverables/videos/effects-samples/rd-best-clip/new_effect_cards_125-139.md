# New effect cards for "Which shot, which effect" (from the @_k.elsie reel)
Paste prompt for Claude: Add these 15 effect cards to the 'All effects' section of the effects page. 125-139 are new effects. Tag them 'New - 22 Nov'. None are rendered or scored yet, so show them as untested (no score) and put them under the setup filter given in best_shot.setup. These are not variants of existing cards: 125 is not 111 product-hero-still or 114 screen-collage; 126 is not 01 backdrop-word, 86 glass-type, 103 word-slam or 16 split-headline; 127 is not 103, 101 warm-beat-grade or 110 corner-micro-copy; 128 is not 43 reel-frame or 121 viewfinder-crop; 129 is not 33/70 orbit or 106 orbit-text; 130 is not 39 stat-card, 114 or 112 big-number-stamp; 131 is not 33 orbit; 132 is not 129, 114 or 111; 133 is not 18 orbit-ring, 56/56B or 119 neon-line-icon; 134 is not 86, 39, 130 or 112; 135 is not 01, 86, 116 outline-numeral or 112; 136 is not 123 identity-end-card or 15/85 cover-star and cover-story; 137 is not 18, 33, 70, 106 or 133; 138 is not 108 colour-field-wipe or 120 motion-blur-wipe; 139 is a soft first-frame welcome, not 124 money-claim-hook or 103.
Reference reel: https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)

## 125 phone-profile-mock

**/command**
```
/reel-looks-fx phone-profile-mock on <your video> · screen="sip-statement" device=iphone style=3d-float side=left occlude=body · best shot: seated off-centre, deep room (Locked-off seated mid-to-full shot in a bright room, torso and one side of the frame clear so a 3D phone can float beside her without covering her face.)
```

**JSON**
```json
{
  "id": "125",
  "effect": "phone-profile-mock",
  "skill": "reel-looks-fx",
  "settings": "screen=\"sip-statement\" device=iphone style=3d-float side=left occlude=body",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-to-full shot in a bright room, torso and one side of the frame clear so a 3D phone can float beside her without covering her face."
  },
  "why_this_shot": "A rounded 3D iPhone mock floats in space beside her, showing a real profile or statement screen, slightly in front of the room with a soft shadow. A tight crop leaves no place for the phone, and a flat screenshot stamped on the wall has no depth. Not 111 product-hero-still (a single object on a table) or 114 screen-collage (UI layers screened over a desk).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Hiral sits in a warm, bright room. A gold-and-navy 3D iPhone floats at her side, showing a SIP statement, a fund app, or the IFM profile — not a realtor grid. Keep the phone readable, slightly occluded by her shoulder if it helps the depth, and leave her face clear.",
  "changed_from_stock": "Stock is a white iPhone mock of her Instagram profile (handle, follower counts, grid) floating to her left over a bright living-room interview. IFM keeps the 3D floating-phone treatment and swaps the screen to a SIP statement, a fund app, or the IFM profile, in a warm premium grade.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 126 stacked-translucent-title

**/command**
```
/reel-looks-fx stacked-translucent-title on <your video> · hero="SIP" support="the way your" hero-color=gold support-color=cream fill=translucent theme=growth · best shot: seated off-centre, deep room (Locked-off seated mid-shot, face the camera, with clear headroom above her hair for a huge translucent hero word and a tiny support line stacked on top of it.)
```

**JSON**
```json
{
  "id": "126",
  "effect": "stacked-translucent-title",
  "skill": "reel-looks-fx",
  "settings": "hero=\"SIP\" support=\"the way your\" hero-color=gold support-color=cream fill=translucent theme=growth",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot, face the camera, with clear headroom above her hair for a huge translucent hero word and a tiny support line stacked on top of it."
  },
  "why_this_shot": "A typography lockup: a tiny solid support line sits on a huge, semi-transparent coloured fill word (HOME in teal, AGENTS in coral, sellers in muted brown), with the colour changing by theme. The big word can sit behind or through her hair. Not 01 backdrop-word (one flat cut-out word on the wall), 86 glass-type (a single frosted-glass word rising behind the head), 103 word-slam (solid condensed words slamming at random angles) or 16 split-headline (a cream headline panel with a highlight box).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Hiral speaks a key line and a tiny cream support phrase stacks on a giant translucent hero (SIP, GROW, 65%) in gold or navy, colour by theme. Use a red translucent fill only for a warning word (RISK, LOSS). Warm, bright interview; keep one hero word at a time, large enough to sit behind her head.",
  "changed_from_stock": "Stock stacks a small white line (that most, the way your, all the) on a huge translucent fill word whose colour changes by theme (grey-brown sellers, teal HOME, coral AGENTS, grey DIFFERENCE). IFM keeps the dual-size translucent stack and swaps the palette to gold or navy heroes with cream support, reserving red for warnings.",
  "timing_seconds": "1.5-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 127 karaoke-captions

**/command**
```
/reel-looks-fx karaoke-captions on <your video> · style=word-by-word color=cream position=chest ghost=motion-blur lock=speech · best shot: seated off-centre, deep room (Locked-off seated mid-shot, chest and shoulders clear, hands allowed to move so captions can sit centred on the sternum without fighting a busy necklace or a tight head crop.)
```

**JSON**
```json
{
  "id": "127",
  "effect": "karaoke-captions",
  "skill": "reel-looks-fx",
  "settings": "style=word-by-word color=cream position=chest ghost=motion-blur lock=speech",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot, chest and shoulders clear, hands allowed to move so captions can sit centred on the sternum without fighting a busy necklace or a tight head crop."
  },
  "why_this_shot": "White or cream captions appear word by word, centred on her chest and locked to the voice, with an occasional motion-blur or ghost trail as the next word replaces the last. This is a caption track, not a title. Not 103 word-slam (giant condensed heroes at random scale and angle), 101 warm-beat-grade (italic phrase captions cut on the beat) or 110 corner-micro-copy (tiny static advice in a corner).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Hiral's voiceover is captioned word by word in cream, centred on her chest, in a warm bright interview. A light motion-blur ghost can trail a stress word. Keep type small and readable, never a giant gold slam, and use red only if the spoken word is a warning.",
  "changed_from_stock": "Stock uses small white sans captions, one or two words at a time, locked to her syllables and centred on the chest, with a short motion-blur ghost on some changes (effort / Effort, attention). IFM keeps that karaoke-on-chest treatment and sets the type in cream on a warm grade, with red only for a warning word.",
  "timing_seconds": "0.3-0.6s per word",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 128 film-letterbox-still

**/command**
```
/reel-looks-fx film-letterbox-still on <your video> · look=film-gate bars=black vignette=on caption=cream hold=1.2s · best shot: wide with headroom (Prepared location or BTS stills, full-body or mid, shot on a real set or shoot day; they will be letterboxed on black with a rounded film-gate vignette and a thin warm edge.)
```

**JSON**
```json
{
  "id": "128",
  "effect": "film-letterbox-still",
  "skill": "reel-looks-fx",
  "settings": "look=film-gate bars=black vignette=on caption=cream hold=1.2s",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Prepared location or BTS stills, full-body or mid, shot on a real set or shoot day; they will be letterboxed on black with a rounded film-gate vignette and a thin warm edge."
  },
  "why_this_shot": "The interview cuts to a still (or a short run of stills) inside a letterboxed film frame: heavy black bars, a rounded gate, a slight vignette and a warm edge, with a short caption in the middle. It should feel like a photograph, not a live crop. Not 43 reel-frame (a 35mm strip with sprockets and edge print) or 121 viewfinder-crop (L-shaped corners on a live face close-up).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Cut from Hiral's interview to a warm letterboxed still — a client meeting, a shoot day, or a family at home — with cream karaoke or a short title in the frame. Keep the grade bright and premium, not a dark cine look, and hold each still just long enough to read.",
  "changed_from_stock": "Stock cuts from the locked interview to BTS stills (crew filming her, a doorway pose, a walk-through) letterboxed on black with a rounded film-gate and a faint orange edge, plus a centred white caption (partnered, top tier, team). IFM keeps the film-letterbox still treatment and uses IFM or client stills, with cream type on a warm grade.",
  "timing_seconds": "1-1.5s per still",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 129 photo-card-carousel

**/command**
```
/reel-looks-fx photo-card-carousel on <your video> · content=clients|work cards=5 shape=rounded-rect orbit=torso depth=3d · best shot: seated off-centre, deep room (Locked-off seated mid-to-full shot, lap and torso visible, hands free; leave space around her midsection so rounded photo cards can orbit in front of and beside her.)
```

**JSON**
```json
{
  "id": "129",
  "effect": "photo-card-carousel",
  "skill": "reel-looks-fx",
  "settings": "content=clients|work cards=5 shape=rounded-rect orbit=torso depth=3d",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-to-full shot, lap and torso visible, hands free; leave space around her midsection so rounded photo cards can orbit in front of and beside her."
  },
  "why_this_shot": "A ring of rounded rectangular photo cards orbits her torso in 3D, some passing in front of her body, with a soft shadow and a slight tilt. Use work/listing stills or client photos — the mechanic is the same. A tight headshot or a flat wall collage kills the orbit. Not 33 orbit (logo tiles around the frame), 70 orbit (investment tiles), 106 orbit-text (words on a path around the head) or 114 screen-collage (screened UI over a desk).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Hiral sits in a warm, bright room while rounded cards orbit her torso: client photos for a testimonial beat, or fund/portfolio stills and app screens for a process beat. Keep faces and figures readable, gold-and-navy frames if you add a border, and don't let a card cover her eyes.",
  "changed_from_stock": "Stock runs two carousels on the same locked interview: first, rounded work and listing stills orbiting her midsection; later, client and family photos in the same 3D ring. IFM keeps the torso-orbiting photo cards and swaps the content to IFM clients or to fund, SIP and portfolio stills.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 130 insights-present-card

**/command**
```
/reel-looks-fx insights-present-card on <your video> · metric="65% in 10Y" chart=ring theme=dark present=palm · best shot: seated off-centre, deep room (Locked-off seated mid-shot with one hand open, palm up, and clear space above that hand for a floating dark card; keep her face and the empty side of the frame readable.)
```

**JSON**
```json
{
  "id": "130",
  "effect": "insights-present-card",
  "skill": "reel-looks-fx",
  "settings": "metric=\"65% in 10Y\" chart=ring theme=dark present=palm",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot with one hand open, palm up, and clear space above that hand for a floating dark card; keep her face and the empty side of the frame readable."
  },
  "why_this_shot": "A dark Insights-style card (ring chart, a big figure, a short breakdown) floats just above her open palm as if she is presenting it. She should glance or gesture at it. Not 39 stat-card (a card parked in the empty half of a desk frame), 114 screen-collage (layers over a desk) or 112 big-number-stamp (a numeral stamped onto a prop).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Hiral opens her palm and a dark gold-and-navy portfolio or performance card floats above it — a ring chart for allocation or a result such as 65% in 10 years. Keep the card small enough to read, and use red in the chart only for a risk or loss slice.",
  "changed_from_stock": "Stock is a dark Instagram Insights card with a blue-to-pink ring chart and a large view count (millions), floating above her open left hand as she looks at it. IFM keeps the presented floating-card treatment and replaces the Insights UI with a portfolio, SIP or allocation card in gold and navy.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 131 hand-tracked-logo

**/command**
```
/reel-looks-fx hand-tracked-logo on <your video> · logo="IFM" follow=hand-fingers scale=medium wordmark=on · best shot: seated off-centre, deep room (Locked-off seated mid-shot, one or both hands raised in front of the chest and moving a little, so a logo can lock to the fingers without covering her face.)
```

**JSON**
```json
{
  "id": "131",
  "effect": "hand-tracked-logo",
  "skill": "reel-looks-fx",
  "settings": "logo=\"IFM\" follow=hand-fingers scale=medium wordmark=on",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot, one or both hands raised in front of the chest and moving a little, so a logo can lock to the fingers without covering her face."
  },
  "why_this_shot": "A brand mark (and a short wordmark) is tracked to her hand or fingertips and travels with the gesture, as if she is holding the logo. A locked logo in the corner, or a logo that ignores the hand, misses the point. Not 33 orbit (logo tiles circling the frame) or 111 product-hero-still (a physical product on a table).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Hiral raises a hand and the IFM mark, or a real partner AMC logo, locks to her fingers with a small gold or navy wordmark. Keep it one logo, modest in scale, and don't invent a badge she doesn't have.",
  "changed_from_stock": "Stock tracks the orange Homes.com pinwheel (and the Homes.com wordmark) to her right-hand fingers as she pinches and presents it. IFM keeps the hand-tracked logo treatment and swaps the mark for IFM or a real partner logo, in gold or navy.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 132 floating-post-mockups

**/command**
```
/reel-looks-fx floating-post-mockups on <your video> · posts=4 source="sip-reels" tilt=15 depth=3d around=torso · best shot: seated off-centre, deep room (Locked-off seated mid-to-full shot, face and upper body clear, with space on all four sides of her torso so four tilted post mockups can float around her.)
```

**JSON**
```json
{
  "id": "132",
  "effect": "floating-post-mockups",
  "skill": "reel-looks-fx",
  "settings": "posts=4 source=\"sip-reels\" tilt=15 depth=3d around=torso",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-to-full shot, face and upper body clear, with space on all four sides of her torso so four tilted post mockups can float around her."
  },
  "why_this_shot": "Four rounded social-post or listing mockups (grid, caption, handle) hang in 3D around her — two high, two low — each slightly tilted, as if pinned in the air. They are UI cards, not a photo carousel and not a desk collage. Not 129 photo-card-carousel (photos orbiting her torso), 114 screen-collage (screened layers over a desk) or 111 product-hero-still.",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Four tilted mockups of IFM posts, SIP explainers or fund cards float around Hiral in a warm, bright interview. Keep her face in the gap, use gold or navy chrome on the cards, and avoid a cluttered eight-card wall.",
  "changed_from_stock": "Stock floats four slightly tilted social listing posts (photo grids, captions, her handle) around her torso, two above the shoulders and two across her lap. IFM keeps the four-card 3D surround and swaps the posts for IFM reels, SIP explainers or fund cards.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 133 targeting-rings

**/command**
```
/reel-looks-fx targeting-rings on <your video> · style=crosshair|ring color=gold glow=soft count=4 around=head-shoulders · best shot: seated off-centre, deep room (Locked-off seated mid-shot with headroom and side room around her head and shoulders, so glowing rings and crosshairs can float in the air without clipping the frame.)
```

**JSON**
```json
{
  "id": "133",
  "effect": "targeting-rings",
  "skill": "reel-looks-fx",
  "settings": "style=crosshair|ring color=gold glow=soft count=4 around=head-shoulders",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot with headroom and side room around her head and shoulders, so glowing rings and crosshairs can float in the air without clipping the frame."
  },
  "why_this_shot": "Several glowing rings or crosshair targets drift around her head and shoulders, like a targeting or retargeting graphic, with a soft bloom. They should feel like UI in the room, not a face tracker or a neon icon. Not 18 orbit-ring (a titled serif 'ORBIT RING' ellipse), 56 / 56B locked-on and track-network (tracking boxes and links) or 119 neon-line-icon (a single stroke icon on a spoken word).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Soft gold (or navy) targeting rings and crosshairs float around Hiral on a line about choosing the right fund, a risk profile, or who a SIP is for. Use red rings only for a warning or a risk beat. Keep the glow gentle on a warm, bright grade.",
  "changed_from_stock": "Stock uses soft white glowing rings and crosshair targets around her head and shoulders on the word 'retargeting'. IFM keeps the floating targeting-ring graphic and recasts it as fund, SIP or risk-profile targeting, in gold or navy, with red only for a warning.",
  "timing_seconds": "1.5-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 134 frosted-stat-sheet

**/command**
```
/reel-looks-fx frosted-stat-sheet on <your video> · layout=grid metrics="SIP|10Y|65%" style=frosted-glass present=hands · best shot: seated off-centre, deep room (Locked-off seated mid-shot, both hands in front of the torso as if holding a sheet, with a clear rectangle of space over her midsection for a frosted glass table of figures.)
```

**JSON**
```json
{
  "id": "134",
  "effect": "frosted-stat-sheet",
  "skill": "reel-looks-fx",
  "settings": "layout=grid metrics=\"SIP|10Y|65%\" style=frosted-glass present=hands",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot, both hands in front of the torso as if holding a sheet, with a clear rectangle of space over her midsection for a frosted glass table of figures."
  },
  "why_this_shot": "A semi-transparent, frosted-glass sheet of metrics (rows of labelled figures) floats over her midsection, as if she is holding a glass report. It is a sheet, not a word and not a dark Insights tile. Not 86 glass-type (a frosted-glass word behind the head), 39 stat-card (a card in the empty half of a desk), 130 insights-present-card (a dark ring-chart card on the palm) or 112 big-number-stamp.",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Hiral presents a frosted gold-and-navy sheet — a SIP returns table, a portfolio snapshot, or a Nifty comparison — held over her torso in a warm, bright room. Keep the type large enough to read, and use red only for a loss or a warning row.",
  "changed_from_stock": "Stock is a light, lined, frosted Insights sheet (views, follows, watch time) floating over her hands as she presents it. IFM keeps the frosted-glass stat sheet and fills it with SIP, portfolio or index figures in a premium gold and navy type set.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 135 then-now-year

**/command**
```
/reel-looks-fx then-now-year on <your video> · year_a="2014" year_b="2026" label_a="Nifty then" label_b="Nifty now" color_a=navy color_b=gold place=behind-head · best shot: seated off-centre, deep room (Locked-off seated mid-shot with generous headroom, face and hair clear, so a giant four-digit year can sit behind her head and then swap to the later year.)
```

**JSON**
```json
{
  "id": "135",
  "effect": "then-now-year",
  "skill": "reel-looks-fx",
  "settings": "year_a=\"2014\" year_b=\"2026\" label_a=\"Nifty then\" label_b=\"Nifty now\" color_a=navy color_b=gold place=behind-head",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot with generous headroom, face and hair clear, so a giant four-digit year can sit behind her head and then swap to the later year."
  },
  "why_this_shot": "A huge, semi-transparent year (2014) sits behind her head, then eases or cuts to a later year (2026), as a then-versus-now beat, with a small label above or on the chest. This is a year swap, not a single backdrop word and not a hollow money figure. Not 01 backdrop-word (one flat word on the wall), 86 glass-type (a frosted word, not a year pair), 116 outline-numeral (a hollow 65% / 45K over the body) or 112 big-number-stamp.",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Behind Hiral, a giant translucent navy 2014 (or the start year) sits as 'Nifty then' or '₹10,000 then', then swaps to a gold 2026 'now' figure. Keep the grade warm and bright; use red only if the then-year is a warning (a crash or a loss).",
  "changed_from_stock": "Stock places a giant translucent 2014 (magenta-to-orange, split across the digits) behind her head with a small 'because' and a chest label ('MARKETING'), then swaps to a gold-olive 2026 with 'BUYERS' on the chest. IFM keeps the behind-the-head then/now year swap and writes it as 2014 vs 2026 Nifty, or a rupee amount then versus now, in navy then gold.",
  "timing_seconds": "2s per year, 3-4s pair",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 136 credential-card

**/command**
```
/reel-looks-fx credential-card on <your video> · name="Hiral" title="true title only" photo=headshot gesture=optional · best shot: seated off-centre, deep room (Locked-off seated mid-shot with space on one side of her torso for a floating headshot card; if she holds up fingers for a rank or a number, keep that hand in frame.)
```

**JSON**
```json
{
  "id": "136",
  "effect": "credential-card",
  "skill": "reel-looks-fx",
  "settings": "name=\"Hiral\" title=\"true title only\" photo=headshot gesture=optional",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot with space on one side of her torso for a floating headshot card; if she holds up fingers for a rank or a number, keep that hand in frame."
  },
  "why_this_shot": "A mid-reel credential card — a rounded dark (or navy) tile with her headshot, name and a true title or rank — floats beside her. She can hold up two fingers if the line is a real '#2' or a two-part claim. This is not an end card. Not 123 identity-end-card (blurred portrait, sharp inset and a name lockup, then fade to black) or 15 / 85 cover-star and cover-story (magazine mastheads).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "A navy-and-gold card with Hiral's headshot, her name and only a title or credential that is actually true (years teaching, IFM, a real registration) floats at her side. Do not invent a rank. Warm, bright interview; keep the card off her face.",
  "changed_from_stock": "Stock floats a dark rounded card with her headshot, 'Kelsie Blevins' and 'Ranked #2 CVAR' on screen left, beside her right hand, while she holds up two fingers, plus a small association badge on her chest. IFM keeps the mid-reel headshot credential card and fills it only with a real Hiral or IFM title, in gold and navy.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 137 silver-sphere-orbit

**/command**
```
/reel-looks-fx silver-sphere-orbit on <your video> · count=6 material=chrome-gold path=ellipse around=head-shoulders · best shot: seated off-centre, deep room (Locked-off seated mid-shot with headroom and side room around her head and shoulders, so a ring of spheres can travel on an ellipse without clipping.)
```

**JSON**
```json
{
  "id": "137",
  "effect": "silver-sphere-orbit",
  "skill": "reel-looks-fx",
  "settings": "count=6 material=chrome-gold path=ellipse around=head-shoulders",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated mid-shot with headroom and side room around her head and shoulders, so a ring of spheres can travel on an ellipse without clipping."
  },
  "why_this_shot": "Six (or so) reflective spheres travel on a thin elliptical path around her head and shoulders, like a 3D mobile. They are objects, not words, tiles or a targeting graphic. Not 18 orbit-ring (a titled serif ellipse), 33 orbit (logo tiles), 70 orbit (investment tiles), 106 orbit-text (words around the head) or 133 targeting-rings (glowing crosshairs).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Chrome-gold spheres orbit Hiral on a thin gold path — a diversification or asset-class beat, each sphere a fund or a slice of the portfolio. Keep them few, small enough not to hide her face, on a warm bright grade.",
  "changed_from_stock": "Stock orbits six silver chrome spheres on a thin white ellipse around her head and shoulders. IFM keeps the sphere orbit and tints the spheres chrome-gold (or navy), reading them as funds or asset classes, not as decoration alone.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 138 flash-wipe

**/command**
```
/reel-looks-fx flash-wipe on <your video> · look=white-gold duration=0.4s direction=through · best shot: seated off-centre, deep room (Two locked-off seated interview takes in the same bright room; the flash is a short transition between them and may land on a slightly tighter crop of the same plate.)
```

**JSON**
```json
{
  "id": "138",
  "effect": "flash-wipe",
  "skill": "reel-looks-fx",
  "settings": "look=white-gold duration=0.4s direction=through",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Two locked-off seated interview takes in the same bright room; the flash is a short transition between them and may land on a slightly tighter crop of the same plate."
  },
  "why_this_shot": "A brief blown-out white flash with a warm gold edge wipes one beat into the next (about a third of a second). It should feel like a light hit, not a colour field or a motion smear. Not 108 colour-field-wipe (the room becomes a solid colour and she is a silhouette) or 120 motion-blur-wipe (a directional smear from a walk into a sit).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Use a short white-gold flash to punch from a 'then' beat into a result, or into a new teaching line, on Hiral's locked interview. Keep it under half a second, warm and premium, not a harsh strobe and not a red flash unless the cut is a warning.",
  "changed_from_stock": "Stock blows the frame out to white with a soft gold-orange fringe as a wipe between two moments of the same interview, often landing on a slightly tighter crop. IFM keeps that white-gold flash wipe and uses it as a then-to-now or setup-to-result cut, staying warm rather than cold white.",
  "timing_seconds": "0.3-0.5s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 139 welcome-arms-hook

**/command**
```
/reel-looks-fx welcome-arms-hook on <your video> · word="Welcome" style=soft-sans color=gold-cream gesture=open-arms first-frame=on · best shot: seated off-centre, deep room (Locked-off seated full or three-quarter shot, first frame already dressed: she sits with both arms open, and a single soft title sits in the headroom above her.)
```

**JSON**
```json
{
  "id": "139",
  "effect": "welcome-arms-hook",
  "skill": "reel-looks-fx",
  "settings": "word=\"Welcome\" style=soft-sans color=gold-cream gesture=open-arms first-frame=on",
  "best_shot": {
    "setup": "Seated off-centre, deep room",
    "framing": "Locked-off seated full or three-quarter shot, first frame already dressed: she sits with both arms open, and a single soft title sits in the headroom above her."
  },
  "why_this_shot": "The open is a soft, slightly translucent welcome title over an open-arm seated gesture, already on the first frame. It is an invitation, not a money claim and not a word slam. A mid-shot with folded hands, or a title that arrives late, wastes it. Not 124 money-claim-hook (a first-frame money figure on a walk-in) or 103 word-slam (hard condensed slams at odd angles).",
  "reference": "https://www.instagram.com/reel/DZUoSk6xbJ2/ (@_k.elsie)",
  "ifm_version": "Open on Hiral seated in a warm, bright room, arms open, with a soft gold or cream 'Welcome' (or 'Let's start') already in the headroom. Hold a beat, then continue the line. No giant outline numeral, and no red unless the open is genuinely a warning.",
  "changed_from_stock": "Stock opens on her seated with both arms open and a soft, slightly translucent 'Welcome' above her head, before the phone mock and the first teaching line. IFM keeps that soft first-frame welcome-and-open-arms hook and sets the word in gold or cream on a warm grade.",
  "timing_seconds": "1.5-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```
