# New effect cards for "Which shot, which effect" (from the @johnbucog x Manychat reel)
Paste prompt for Claude: Add these 13 effect cards to the 'All effects' section of the effects page. 102-114 are new effects. Tag them 'New - 22 Nov'. None are rendered or scored yet, so show them as untested (no score) and put them under the setup filter given in best_shot.setup. These are not variants of existing cards: 105 is not 16 split-headline; 106 is not 18/33/70 orbit; 107 is not 09, 45 or 59; 112 is not 32 reject-stamp; 114 is not 31 red-collage.
Reference reel: https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)

## 102 floor-type-3d

**/command**
```
/reel-looks-fx floor-type-3d on <your video> · words="I HAVE OVER 10" font=condensed-anton hero=gold support=navy track=floor orbit=slow · best shot: tripod + empty plate (High angle, almost top-down, Hiral standing small on a clean pale floor, slow camera orbit; 2 seconds of empty floor first if you can.)
```

**JSON**
```json
{
  "id": "102",
  "effect": "floor-type-3d",
  "skill": "reel-looks-fx",
  "settings": "words=\"I HAVE OVER 10\" font=condensed-anton hero=gold support=navy track=floor orbit=slow",
  "best_shot": {
    "setup": "Tripod + empty plate",
    "framing": "High angle, almost top-down, Hiral standing small on a clean pale floor, slow camera orbit; 2 seconds of empty floor first if you can."
  },
  "why_this_shot": "Giant 3D words have to sit on a real floor and read as the camera orbits; a wall-facing mid-shot hides the floor and kills the hook.",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Warm, bright overhead of Hiral on a pale floor. Gold condensed heroes and navy support words track onto the floor and build as she speaks; keep the grade light and premium, no dark luxury look.",
  "changed_from_stock": "Stock heroes are solid red on a white studio floor. IFM swaps them to gold for a positive hook (SIP, 65%) with navy support words, and uses red only if the line is a warning.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 103 word-slam

**/command**
```
/reel-looks-fx word-slam on <your video> · hero="TIME" font=condensed-anton hero-color=gold support=white-sans lock=syllables scale=random rotate=random · best shot: wide with headroom (Standing mid-shot, face the camera, short spoken phrases, with headroom and side room for type that slams in at odd angles.)
```

**JSON**
```json
{
  "id": "103",
  "effect": "word-slam",
  "skill": "reel-looks-fx",
  "settings": "hero=\"TIME\" font=condensed-anton hero-color=gold support=white-sans lock=syllables scale=random rotate=random",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Standing mid-shot, face the camera, short spoken phrases, with headroom and side room for type that slams in at odd angles."
  },
  "why_this_shot": "Syllable-locked hero words slam in at random rotation and scale, with small white support words around them; a tight crop or a busy frame leaves them nowhere to land.",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Hiral narrates in short phrases; each keyword (SIP, 65%, RISK) slams on as a giant condensed word in gold or navy, small cream/white sans filling the rest of the line. Warm, bright, premium; one new shot every 1-2 seconds.",
  "changed_from_stock": "Stock uses all-red condensed heroes in a red-and-white palette. IFM uses gold or navy for teaching and positive words, and keeps red only for warnings (RISK, LOSS, DUE).",
  "timing_seconds": "1-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 104 script-accent

**/command**
```
/reel-looks-fx script-accent on <your video> · accent="exactly" style=italic-script accent-color=gold line=sans-white · best shot: plain wall, standing (Mid-shot on a plain wall, face the camera, so a single script or italic accent word stays readable.)
```

**JSON**
```json
{
  "id": "104",
  "effect": "script-accent",
  "skill": "reel-looks-fx",
  "settings": "accent=\"exactly\" style=italic-script accent-color=gold line=sans-white",
  "best_shot": {
    "setup": "Plain wall, standing",
    "framing": "Mid-shot on a plain wall, face the camera, so a single script or italic accent word stays readable."
  },
  "why_this_shot": "One italic or script accent sits inside a line of small sans words; a busy wall or patterned clothes swallows the accent. Not 02 sketch-words (hatched notebook pencil type).",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "In a line of cream or white sans, one spoken emphasis word (GROW, COMPOUND, exactly) lands in gold italic or a light script. Warm, bright talking shot, no dark grade.",
  "changed_from_stock": "Stock accents are red italic or script inside a red-and-white lockup. IFM uses gold italic for emphasis, and red italic only on a warning word.",
  "timing_seconds": "1-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 105 split-word-lockup

**/command**
```
/reel-looks-fx split-word-lockup on <your video> · word="DEADLINE" split="DEAD / LINE" hero-color=gold lock=syllable · best shot: table with props (Tight on a wall calendar or dated document on the table, with clear space on one side for the stacked split word.)
```

**JSON**
```json
{
  "id": "105",
  "effect": "split-word-lockup",
  "skill": "reel-looks-fx",
  "settings": "word=\"DEADLINE\" split=\"DEAD / LINE\" hero-color=gold lock=syllable",
  "best_shot": {
    "setup": "Table with props",
    "framing": "Tight on a wall calendar or dated document on the table, with clear space on one side for the stacked split word."
  },
  "why_this_shot": "One hero word breaks into two stacked pieces on the spoken beat (DEAD / LINE). Needs a tight prop macro with a quiet side of frame. Not 16 split-headline, which is a cream headline card with a highlight box.",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Hiral's line hits and the word splits. Use gold for a teaching split (SIXTY / FIVE, COM / POUND); use red only for a warning split (DEAD / LINE, RISK / ON). Keep the table bright and warm.",
  "changed_from_stock": "Stock splits DEAD / LINE in warm gold over a calendar macro. IFM can keep gold for stats, or switch the split to red when the word is a warning. Do not build this as 16's cream headline panel.",
  "timing_seconds": "1-1.5s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 106 orbit-text

**/command**
```
/reel-looks-fx orbit-text on <your video> · words="COMMENTS|answering" path=orbit-head behind=top front=chin lock=speech · best shot: close-up (Face camera, head and shoulders, leave space around the head for the word path; small natural head moves are fine.)
```

**JSON**
```json
{
  "id": "106",
  "effect": "orbit-text",
  "skill": "reel-looks-fx",
  "settings": "words=\"COMMENTS|answering\" path=orbit-head behind=top front=chin lock=speech",
  "best_shot": {
    "setup": "Close-up",
    "framing": "Face camera, head and shoulders, leave space around the head for the word path; small natural head moves are fine."
  },
  "why_this_shot": "Spoken words travel on a path around her head (behind at the top, in front at the chin), so a tight crop clips the orbit. Not 18 orbit-ring (a titled serif 'ORBIT RING' ellipse), 33 orbit (logo tiles) or 70 orbit (investment tiles).",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Words from Hiral's line (COMMENTS, SIP, 65%) orbit her head in gold or navy, locked to speech. Bright, warm close-up; no dark luxury lighting.",
  "changed_from_stock": "Stock orbits red condensed words around a talking head. IFM uses gold or navy spoken words, and red only for a warning. Keep this as kinetic speech type, not 18/33/70's ring of titles or tiles.",
  "timing_seconds": "1.5-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 107 comment-bubbles-3d

**/command**
```
/reel-looks-fx comment-bubbles-3d on <your video> · bubbles=comment|dm count=6 style=ig-chat drift=3d keyword="SIP" · best shot: sofa at home (Seated on the sofa, mid-shot, looking at a phone, with space above and beside the head for bubbles to drift in 3D.)
```

**JSON**
```json
{
  "id": "107",
  "effect": "comment-bubbles-3d",
  "skill": "reel-looks-fx",
  "settings": "bubbles=comment|dm count=6 style=ig-chat drift=3d keyword=\"SIP\"",
  "best_shot": {
    "setup": "Sofa at home",
    "framing": "Seated on the sofa, mid-shot, looking at a phone, with space above and beside the head for bubbles to drift in 3D."
  },
  "why_this_shot": "A cluster of Instagram comment and DM bubbles floats around her in 3D; she needs space on all sides and a phone in shot. Not 09 (a two-bubble comment sheet above the head), 45 (an iMessage stack) or 59 (one comment card dropping in).",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Light cream or white IG-style comment and DM bubbles (e.g. 'How do I start a SIP?', 'Send me the guide') drift around Hiral in a warm, bright living room. No blue night grade, no dark luxury look.",
  "changed_from_stock": "Stock uses dark IG bubbles in a blue night-time grade. IFM switches to light cream/white bubbles in a bright room, with IFM questions in the copy.",
  "timing_seconds": "2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 108 colour-field-wipe

**/command**
```
/reel-looks-fx colour-field-wipe on <your video> · fields=gold|navy duration=0.6s silhouette=on type=cream · best shot: plain wall, standing (Standing profile, mid-shot, clean wall, hold still so the silhouette cuts cleanly.)
```

**JSON**
```json
{
  "id": "108",
  "effect": "colour-field-wipe",
  "skill": "reel-looks-fx",
  "settings": "fields=gold|navy duration=0.6s silhouette=on type=cream",
  "best_shot": {
    "setup": "Plain wall, standing",
    "framing": "Standing profile, mid-shot, clean wall, hold still so the silhouette cuts cleanly."
  },
  "why_this_shot": "A hard cut replaces the room with a solid colour field and leaves her as a silhouette; a clean profile and a plain wall give a sharp edge, a busy background does not.",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Wipe to a solid warm gold field, then navy, with Hiral in clean silhouette and cream type. Keep it bright and premium; do not use a dark or blood-red look unless the line is a warning.",
  "changed_from_stock": "Stock cuts to solid yellow, then saturated red, with a black silhouette and a pixel hit. IFM uses warm gold then navy (or cream), and reserves a red field only for a risk beat.",
  "timing_seconds": "0.6s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 109 glitch-on-keyword

**/command**
```
/reel-looks-fx glitch-on-keyword on <your video> · word="RISK" fx=rgb-split|smear|block-corrupt length=0.5s · best shot: plain wall, standing (Plain wall, mid-shot, one clear hero word on screen to take the glitch; hold the word for half a second.)
```

**JSON**
```json
{
  "id": "109",
  "effect": "glitch-on-keyword",
  "skill": "reel-looks-fx",
  "settings": "word=\"RISK\" fx=rgb-split|smear|block-corrupt length=0.5s",
  "best_shot": {
    "setup": "Plain wall, standing",
    "framing": "Plain wall, mid-shot, one clear hero word on screen to take the glitch; hold the word for half a second."
  },
  "why_this_shot": "RGB split, motion smear and block corruption hit just one word, not the whole frame. A plain wall keeps the glitch readable. Not 04B mosaic-tiles (whole-frame tiles) or 99 datamosh (a transition smear).",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "The glitch lands on a single spoken keyword. Use it in gold or navy on a teaching word, or in red on RISK / DUE. Warm, bright shot; keep the rest of the frame clean.",
  "changed_from_stock": "Stock glitches red heroes with RGB split, smear and pixel/block corruption. IFM applies that only to one keyword, in gold or navy, and uses red only when the word is a warning.",
  "timing_seconds": "0.5s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 110 corner-micro-copy

**/command**
```
/reel-looks-fx corner-micro-copy on <your video> · corners=tl|tr|bl|br text="Past performance is not a guarantee of future results." size=tiny color=navy · best shot: wide with headroom (Wide standing or mid-shot with clean corners; keep hands, props and big type out of the four corners.)
```

**JSON**
```json
{
  "id": "110",
  "effect": "corner-micro-copy",
  "skill": "reel-looks-fx",
  "settings": "corners=tl|tr|bl|br text=\"Past performance is not a guarantee of future results.\" size=tiny color=navy",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Wide standing or mid-shot with clean corners; keep hands, props and big type out of the four corners."
  },
  "why_this_shot": "Tiny secondary lines live in the corners, so the shot needs spare edges; a close-up or a packed frame covers them.",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Tiny navy or cream disclaimer or tip copy in the corners (a SEBI-style line, or a short tip). Secondary, readable, never loud. Warm, bright frame.",
  "changed_from_stock": "Stock uses tiny white advice lines in the corners of a red-and-white film. IFM uses cream or navy micro-copy for disclaimers and tips, not decorative filler, and never hero red.",
  "timing_seconds": "held",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 111 product-hero-still

**/command**
```
/reel-looks-fx product-hero-still on <your video> · object=swap surface=linen-or-stone word="SIP" word-color=navy · best shot: table with props (Top-down on a table, one everyday object centred on a light textured surface, with space beside it for a single big word.)
```

**JSON**
```json
{
  "id": "111",
  "effect": "product-hero-still",
  "skill": "reel-looks-fx",
  "settings": "object=swap surface=linen-or-stone word=\"SIP\" word-color=navy",
  "best_shot": {
    "setup": "Table with props",
    "framing": "Top-down on a table, one everyday object centred on a light textured surface, with space beside it for a single big word."
  },
  "why_this_shot": "A single object sits on a textured surface with one hero word beside it; top-down and an uncluttered table make the swap read as a product still.",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Top-down still of a bank card, passbook, notebook or phone on warm linen or light stone, plus one navy or gold word (SIP, 65%). Bright, premium, everyday; no dark felt and no luxury watch or jewellery look.",
  "changed_from_stock": "Stock is a hard drive on dark red felt with white type. IFM swaps the object for a simple finance prop on a light, warm surface, and the word to gold or navy.",
  "timing_seconds": "1.5-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 112 big-number-stamp

**/command**
```
/reel-looks-fx big-number-stamp on <your video> · numeral="65" unit="%" word="GROWS" color=gold · best shot: table with props (Tight macro of a calendar, statement or notebook on the table, one large numeral filling the left of the frame, space on the right for the stamped word.)
```

**JSON**
```json
{
  "id": "112",
  "effect": "big-number-stamp",
  "skill": "reel-looks-fx",
  "settings": "numeral=\"65\" unit=\"%\" word=\"GROWS\" color=gold",
  "best_shot": {
    "setup": "Table with props",
    "framing": "Tight macro of a calendar, statement or notebook on the table, one large numeral filling the left of the frame, space on the right for the stamped word."
  },
  "why_this_shot": "A giant numeral (the calendar's 1, or a stamped 65) has to fill the frame like a stamp; a loose wide shot shrinks it to a caption. Not 32 reject-stamp (a NOPE rubber stamp across the torso).",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Macro of a calendar or statement: stamp a gold 65% or 10Y for a teaching beat, or a red 1 DUE for a warning. Keep the page bright and warm, not moody.",
  "changed_from_stock": "Stock is a tight calendar macro, a printed 1 plus gold 'DUE yesterday'. IFM can keep that treatment in red for a due-date warning, or stamp a gold 65% / 10Y figure instead.",
  "timing_seconds": "1-1.5s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 113 comment-keyword-cta

**/command**
```
/reel-looks-fx comment-keyword-cta on <your video> · prompt="Comment SIP and I will DM you the guide" keyword="SIP" keyword-color=gold end-card=on · best shot: wide with headroom (Wide mid-shot of Hiral, or clean bright b-roll with lots of sky or wall, held 2-3 seconds at the end for the CTA type.)
```

**JSON**
```json
{
  "id": "113",
  "effect": "comment-keyword-cta",
  "skill": "reel-looks-fx",
  "settings": "prompt=\"Comment SIP and I will DM you the guide\" keyword=\"SIP\" keyword-color=gold end-card=on",
  "best_shot": {
    "setup": "Wide with headroom",
    "framing": "Wide mid-shot of Hiral, or clean bright b-roll with lots of sky or wall, held 2-3 seconds at the end for the CTA type."
  },
  "why_this_shot": "The end card is a huge keyword plus a support line ('Comment SIP and I'll DM you the guide'); it needs a clear, uncluttered frame and a hold at the end, not a mid-reel cutaway.",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "End card in Manychat style: gold keyword SIP (or 65, GUIDE) and a cream or navy line, 'Comment SIP and I'll DM you the guide.' Bright sky or a warm Hiral mid-shot; no moody red lockup.",
  "changed_from_stock": "Stock CTA is giant red “TIME” / “EXACT SETUP” over clouds. IFM uses a gold or navy keyword and a clear cream support line, with red only if you want urgency.",
  "timing_seconds": "2-3s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```

## 114 screen-collage

**/command**
```
/reel-looks-fx screen-collage on <your video> · blend=multiply layers=3-5 word="SOCIAL" word-color=navy · best shot: seated at a desk (Seated at a desk, hands on a phone or laptop, mid-shot, so the screen is readable as a collage layer.)
```

**JSON**
```json
{
  "id": "114",
  "effect": "screen-collage",
  "skill": "reel-looks-fx",
  "settings": "blend=multiply layers=3-5 word=\"SOCIAL\" word-color=navy",
  "best_shot": {
    "setup": "Seated at a desk",
    "framing": "Seated at a desk, hands on a phone or laptop, mid-shot, so the screen is readable as a collage layer."
  },
  "why_this_shot": "Several clips or UI layers are multiplied or screened over the desk shot, with one keyword on top; you need a readable phone or monitor in frame. Not 31 red-collage (a B&W grade with one big red word).",
  "reference": "https://www.instagram.com/p/Dc3mgNJO73W/ (@johnbucog, Manychat)",
  "ifm_version": "Two or three bright layers (phone UI, a simple chart, Hiral talking) composited with multiply or screen, plus one gold or navy keyword. Keep it light and readable, not a dark stacked-poster look.",
  "changed_from_stock": "Stock piles dim phone-screen layers with a red 'social' over the top. IFM keeps the layers bright and uses gold or navy type, reserving red for a warning word.",
  "timing_seconds": "1-2s",
  "tested_on": null,
  "score": null,
  "status": "untested - not rendered yet"
}
```
