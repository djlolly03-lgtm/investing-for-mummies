# Brag Plan: The IFM Content Hub

## What is this app?
An internal searchable library of 657 catalogued photos, clips and carousels, of which 608
are shown — you type the sentence you would actually say, and it refuses to show you
anything it cannot prove you can open.

## The angle
Two ideas, and the film needs both because the brief names both.

**How you find things:** nobody searches the way a catalogue writes. You type "enjoying";
the catalogue has one of those and 103 "candid". So the hub translates your phrase into
the corpus's vocabulary before it searches, and it also indexes what people *said* on
camera — so a phrase that exists in no title, no keyword and no description still finds
its clip.

**The logic underneath:** a search result you cannot open is worse than no result. So a row
only appears if you can see it, open it, and — if it claims to be a video — actually play
it. That last one is not a metadata field. Something asked the server.

Deliberately NOT a film about the school, its classes or its founder. The first attempt
made that mistake and was rejected.

## Hook (first 2-3 seconds)
The hub's own empty state — *"What are you looking for?"* — under the line **608 things.
One search box.** It opens on the question the tool asks you, not on a claim about itself.

## Key moments (the middle)
- The vocabulary gap as two measured rows: `"enjoying" 1` against `"candid" 103`. Counted
  today across all 657 rows, not quoted from a stale comment.
- `comprehensive cover` → **Found 1 piece of content**, with the transcript panel showing
  that exact phrase spoken at 0:18. Words in no title; only in the audio.
- `179 rows said Video. 33 could play.` — then the line from `media-audit.py` that explains
  what changed.

## Outro / punchline
The take-away: tick three results, **Copy 3 links**. The hub's job ends when the links are
on your clipboard.

## User flow worth showing
Entry → key action → result, and all three are real screens:
1. **Entry** — the empty search field with the hub's own suggested queries.
2. **Key action** — a query typed; the count answers (`Found 1 piece of content`).
3. **Result** — three results ticked and the toolbar reading `Copy 3 links`.

## Tone
- Preset: `polished`
- Creative direction: a tool film in the tool's own voice — measured, unhurried, slightly
  contrarian about hiding things
- Interpretation: five scenes, long holds, soft crossfades. Numbers do the talking. No
  zooms, no flashes. The only emphatic beat is the pair `179 / 33`.

## Format: landscape — 1920x1080
## Duration: 21s

## Visual identity (from the project)
- Background: `#f7faf9` (cream); secondary surface `#e0f3f0`
- Text: `#1a3a5c` (navy); muted `#5a7d8a`
- Accent: `#2a9d8f` (teal); `#9d8138` (darkened gold — the brand `#c9a84c` fails WCAG on
  cream at label size, established on the previous render)
- Display font: Lora 600 (italic for quoted queries)
- Body font: Nunito 700/800 — and Nunito 800 for the numbers, which are the film's real type
- Strongest visual element: the hub's own UI, screenshotted live, framed as cards on cream

## Share copy (draft)
Our content hub has 657 photos and clips in it and shows 608. The 49 it hides are the ones
you could not actually have opened.

## Audio direction
- Role: warm bed, sparse motion-matched accents
- Music: `happy-beats-business-moves-vol-10` (110 BPM) — same bed as the previous film, so
  the two read as a pair
- Music treatment: in at 0.0 moderate; low under the opening line; lift from scene 2; fade
  over the final 1.2s
- Music cue guidance: bundled preset. Strong cues targeted: **0.27** (title in), **4.10**
  (scene 2), **8.73** (scene 3), **12.56** (the 179/33 pair), **18.55** (URL).
  Beat grid for the two vocabulary rows: **4.64 / 5.74** (every other beat at 110 BPM).
- Audio-reactive treatment: none — this tone does not want anything pulsing.
- SFX posture: sparse. Soft marks on the two number rows, a card arrival per screenshot,
  one quiet settle on the logo.
- Restraint rule: no whooshes, risers, impacts or stingers.

## Storyboard

### Scene 1 — What it is — 4.10s
Cream. `hero.jpg` (the hub's real empty state: "What are you looking for?", the search
field, its own suggested queries, and "608 assets" in the masthead) sits as a framed card.
Over it, eyebrow `THE CONTENT HUB` and the line **608 things. One search box.**
Sequential: eyebrow 0.1 → screenshot 0.27 (beat-locked) → line 1.90.
Audio: quiet, the bed low. One soft card arrival with the screenshot.
Transition: soft crossfade → Scene 2

### Scene 2 — It translates — 4.63s
Cream. Eyebrow `NOBODY SEARCHES THE WAY A CATALOGUE WRITES`. Two measured rows in Nunito
800, arriving one per every-other-beat:
`you type  “enjoying”  ·  1`   (4.64)
`it says   “candid”    ·  103` (5.74)
Then the line: **So it translates before it searches.**
Sequential: yes — two rows on the beat grid, then the line at 7.35.
Audio: a soft mark per row.
Transition: soft → Scene 3

### Scene 3 — It heard it — 3.83s
`speech.jpg` (the real result bar reading "Found 1 piece of content" above the one clip)
with `detail.jpg` behind/beside it showing the transcript line *"Unless you have a great
comprehensive cover"* at 0:18.
Eyebrow `SEARCH WHAT WAS SAID` · the query in Lora italic: *“comprehensive cover”*
Line: **In no title. Only in the audio.**
Sequential: screenshot in at 8.73 (beat-locked), query 9.29, line 10.38.
Audio: one card arrival.
Transition: clean → Scene 4

### Scene 4 — It refuses — 5.14s
Cream, type only — the one scene with no screenshot, because this is the idea rather than
the interface. Eyebrow `AND THE PART THAT HIDES THINGS`.
The pair, large, arriving together at 12.56 (beat-locked):
**179 rows said Video.**
**33 could play.**
Then at 14.73: **Now it asks the server, never the field.**
Sequential: the pair as one unit, then the line.
Audio: a soft mark under the pair. The music is at its fullest here.
Transition: soft → Scene 5

### Scene 5 — Take it — 3.30s
`pick.jpg` (three real results ticked, toolbar reading "Copy 3 links · CSV · 3 · Clear
picks") as a framed card. Line: **Tick three. Take the links.**
Logo settles, then `ifm-deploy.vercel.app/content/v1-prototype` at 18.55 (beat-locked).
Audio: quiet settle under the logo; music fades over the last 1.2s.

**Music mood:** warm business bed at 110 BPM, low under the opening, fullest at the 179/33.
**Audio summary:** quiet and curious, opening as the first screenshot lands, firmest under
the refusal, resolving to a soft stop on the URL.

## Every on-screen number, and how it was checked
Not one of these came from a code comment alone — each was measured against the live
catalogue or the live site today, because two agent-supplied facts turned out to be stale.

| On screen | Verified by |
|---|---|
| 608 assets / 608 things | live masthead + recomputing the visibility rule: 657 rows → 608 |
| `"enjoying" 1` · `"candid" 103` | counted across all 657 rows' text today |
| `comprehensive cover` → Found 1 | driven on the live site |
| transcript line at 0:18 | the detail screenshot shows it |
| `179 rows said Video. 33 could play.` | `media-audit.py:9` and `:19`, verbatim, historical |
| "asks the server, never the field" | `media-audit.py:20-21`, verbatim |
| Copy 3 links | driven on the live site |

**Rejected after checking:** *"students enjoying the session" → 0 results* (an agent
proposed it from a code comment; it returns 28 today, because the translation layer it
describes was then built) and *the video where she says "join our workshops"* (proposed as
a hook; returns nothing).
