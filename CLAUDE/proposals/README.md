# IFM Proposal System

A reusable, designed proposal you can turn around in ten minutes when an enquiry comes in.
Edit one config block, run one command, send the PDF.

---

## Make a new proposal

```bash
cd "CLAUDE/proposals" && cp ifm-proposal-template.html "IFM Proposal - ACME.html"
```

Then open the new file, edit **only** the block between `▼ EDIT FROM HERE` and
`▲ EDIT TO HERE`, and render:

```bash
cd "CLAUDE/proposals" && node render.js "IFM Proposal - ACME.html"
```

That writes two files next to it:

- **`IFM Proposal - ACME.pdf`** — the deliverable. ~4.5 MB, eight pages, A4. This is what you send.
- **`IFM Proposal - ACME-preview.html`** — the same document with every image embedded, for
  checking on screen.

The renderer warns if an image is missing or the config has a typo, so read its output.

### If the photos look missing

**Don't judge the layout from the raw `.html` template — check the PDF.** Some viewers,
including the browser panel inside Claude, load an HTML file as a `data:` URL rather than from
disk. A `data:` document has no folder to look in, so relative paths like `assets/photo.jpg`
resolve to nothing and every photo renders as an empty outlined box. Nothing is actually wrong
with the file: the images are there, and the PDF has all 25 of them.

That's why `render.js` also writes the `-preview.html` copy with the images inlined as base64 —
it displays correctly anywhere, including when you email it to someone who doesn't have the
`assets/` folder. It's ~5.5 MB, so open it from Finder in a normal browser rather than a
lightweight preview pane.

---

## What's in the document

| Page | Section | Background | Controlled by |
|---|---|---|---|
| 1 | Full-bleed cover: title, who it's for, contents, three photos | teal→navy gradient | `title`, `lede`, `preparedFor`, `date`, `coverToc` |
| 2 | Pull statement, who IFM is, three pillars, stat band, why it matters | white | `statement`, `intro`, `pillars`, `stats`, `whyHeading`, `whyBullets` |
| 3 | **The games** — live screens from the actual classroom tech | navy (dark sheet) | `showTech`, `tech` |
| 4–5 | Summary table, workshop photo, one colour-coded card per workshop | white | `modules` |
| 6 | Minute-by-minute run of a three-hour session | mint | `showTimeline`, `timeline` |
| 7 | Founder, session photos, past clients, optional fees | white | `bio`, `pastClients` |
| 8 | Closing call to action | navy (dark sheet) | `close` |

Backgrounds alternate on purpose — Brand Guidelines §24 asks for "alternating section
backgrounds to separate rhythm" and "one visual hero moment every 1–2 scrolls".

Optional sections are booleans — `showTech`, `showTimeline`, `showTestimonials`,
`showPastClients`, `showLongerFormat`, `showCommercials`, `showLogistics`. Turning one off
removes it cleanly and the pages reflow.

---

## The workshop library

`MODULES` holds the reusable catalogue. Pick which ones appear, and in what order:

```js
modules: ["blueprint", "mutualfunds", "insurance"],
```

| Key | Workshop | Length | Status |
|---|---|---|---|
| `blueprint` | The Money Blueprint | 2 hrs | **Verified** — sent to ONGC |
| `mutualfunds` | Mutual Funds: From Confusion to Confidence | 3 hrs | **Verified** |
| `insurance` | Insurance: Protect Before You Invest | 3 hrs | **Verified** |
| `streedhan` | Stree Dhan: Savings to Financial Freedom | 2 hrs | Draft — read before sending |
| `budgeting` | Where Does The Money Go? | 2 hrs | Draft |
| `debt` | Good Debt, Bad Debt | 2 hrs | Draft |
| `stockmarket` | The Stock Market, Without The Jargon | 3 hrs | Draft |
| `retirement` | Planning Across Life Stages | 3 hrs | Draft |
| `teens` | Money Skills for Teenagers | 2 hrs | Draft |

**Verified** entries use copy that has already gone out to a client. **Draft** entries were
written for this template from the way IFM actually teaches these topics — read them once and
adjust before they go to a real prospect. When a draft has been sent and it landed, move it up
to Verified so the next proposal can reuse it without a second read.

Adding a workshop means adding one object to `MODULES` with `name`, `hours`, `hoursLong`,
`objective`, `intro`, `bullets` and `takeaway`. It's then available to every future proposal.

---

## Assets

Everything lives in `assets/` and is already sized and compressed for print.

**Workshop photography** — pulled from the content hub (`CLAUDE/content/thumbs/`):

| File | What it shows | Used on |
|---|---|---|
| `photo-group.jpg` | Participants group photo | cover strip |
| `photo-room.jpg` | Full room, women around the table | cover strip |
| `photo-table.jpg` | Three participants laughing | cover strip |
| `photo-room2.jpg` | Small groups working | page 2 |
| `photo-teaching.jpg` | Hiral presenting to the room | page 6 |
| `photo-engaged.jpg` | Participant with a question | page 6 |
| `photo-band-workshop.jpg` | Participants working through their numbers | page 4 band |
| `photo-s1/s2/s3.jpg` | Three-up session strip | page 7 |
| `photo-founder-live.jpg` | Hiral beside the IFM screen | spare |
| `hiral-goel.jpg` | Founder headshot | page 7 |

**Game screens** — captured live from the Vercel deploy, so they're always the current build:

`game-quiz.jpg` (KBC host screen) · `game-fundmgr.jpg` · `game-buckets.jpg` ·
`game-inflation.jpg` · `game-sapno.jpg` · `game-hidden.jpg` · `game-swayamvar.jpg` ·
`phone-bbf.jpg` (player's phone view)

Swap any of them by changing the path in the config — `tech.hero.img` and `tech.tiles`.

### Refreshing the images

New workshop photos land in the content hub first. To pull one in:

```bash
cd "/Users/lollyg/Documents/investing for Mummies" && cp "CLAUDE/content/thumbs/IFM-###.jpg" "CLAUDE/proposals/assets/photo-newname.jpg"
```

Hub thumbnails are 800 px wide, which is right for a print panel but soft if you blow one up
full-page — keep photos at half-width or smaller.

To recapture the game screens after a game changes, re-run the capture script (it hits the live
site, eight screens, about a minute).

---

## Brand compliance

Built against **IFM Brand Guidelines 2026**, not approximations:

- **§3 palette** — every colour is a CSS variable taken straight from the palette table:
  `--navy #1a3a5c`, `--teal #2a9d8f`, `--muted #5a7d8a`, `--cream #f7faf9`, `--mint #bde9e4`,
  `--mint-lt #e0f3f0`, `--gold #c9a84c`, `--gold-lt #f5f0e0`, `--navy-lt #264d78`. No pure
  black anywhere. No hardcoded hex in the layout.
- **§3 gradient rule** — all gradients run `135deg`, lighter → darker (cover and stat band).
- **§4 typography** — Lora for headings and serif moments, Nunito for body, labels and UI.
- **§6 radius hierarchy** — `--r-sec 16px` for sections and panels, `--r-card 14px` for cards,
  `--r-input 12px` for image frames, `--r-pill 10px` for duration pills.
- **§24 art direction** — real Indian women in real classrooms, natural light, no corporate
  stock; alternating section backgrounds; a hero moment every page or two.

Workshop cards cycle through teal → gold → navy-light automatically, so a proposal with two
workshops or six stays on-palette without you picking colours.

## Things worth knowing

- **The three tinted pages are full-bleed sheets** (pages 3, 6 and 8). They use `@page` rules
  with zero margin, which is the only way Chrome will print colour to the paper edge — but it
  also means they don't reflow. If you add a lot of copy to one of those sections it will spill
  onto a following page without its background. Check the render.

- **Fonts.** The document asks for Poppins first (what the original ONGC proposal used) and
  falls back to **Nunito**, the installed IFM brand font, with **Lora** for display headings.
  Nothing needs installing — but if Poppins ever gets installed system-wide, every proposal
  picks it up automatically on the next render.
- **Testimonials are off by default and are placeholders.** Set `showTestimonials: true` only
  after pasting in real quotes. Never send invented ones.
- **The stat band on page 2 makes factual claims** ("30+ games", "zero products sold"). Check
  they're still true before each send.
- **Fees are off by default** (`showCommercials: false`). The ONGC proposal deliberately left
  fees for the conversation. Turn it on and fill `commercials.rows` when a client asks up front.
- **Three video links in `close.links` say `REPLACE_WITH_VIDEO_LINK`.** Fill them or drop the
  rows — a dead link in a proposal is worse than no link.
