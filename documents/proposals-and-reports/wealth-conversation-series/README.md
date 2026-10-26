# The Wealth Conversation — series proposal deck

Client proposal for Hiral's five-module **Wealth Conversation** series (copy from her email of
23 Oct 2026). Built 24–25 Oct 2026. **No pricing in this deck, on purpose.**

Deliverables (one folder up, in `documents/proposals-and-reports/`):

- `IFM Wealth Conversation Series — Proposal.pptx` — editable, for Asba
- `IFM Wealth Conversation Series — Proposal.pdf` — what goes to the client (fonts embedded)

Both sit outside `CLAUDE/` on purpose. `CLAUDE/.vercelignore` does **not** block `.pptx`, so a
copy under `CLAUDE/proposals/` would go public on the next deploy (the weekly refresh deploys
the whole tree).

## The 15 slides

1 Cover · 2 Why The Wealth Conversation? · 3 Who it’s for (added 26 Oct from the user's note) ·
4 The Questions That Matter · 5 The Learning Experience · 6 Workshops for corporates, communities
and entrepreneurs’ forums (past sessions) · 7 The Workshop Series (staircase, durations) ·
8 The Value of the Full Series (goals → risk → asset allocation → investment choices → portfolio) ·
9–13 one page per module, identical layout · 14 Our Mission · 15 Franklin quote + Hiral's sign-off.

Slide 3's body text is the user's own note (26 Oct), lightly tidied; its title "Built for beginners.
Deep enough for everyone." and the two card labels are new. `audience.include` in content.js turns it off.

Slide 6 (past sessions) was added on 25 Oct at the user's request. It is **not** in Hiral's email: its words are
the website's own "Wealth Conversations" section (investingformummies.com/#corporate), verbatim,
including the four past-session captions and the "Also hosted by" line. Delete it if Hiral prefers.

## Photos — all real IFM sessions, mostly corporate

Full-size originals pulled from Drive on 25 Oct via the Content Hub rows (`assets/src/corp/`):

| Where | Row | What |
|---|---|---|
| Cover | IFM-317 · IFM-393 | 4 Jul corporate room · market vs limit order |
| Learning Experience | IFM-384 · IFM-395 | live game on a phone · notes in the workbook |
| Past sessions | IFM-338 · IFM-316 · IFM-253 | Stree Dhan · K-Phyto Extraction · Money Blueprint, Goa |
| Past sessions | — | **EO Forum: not in the Content Hub.** Uses the website's 480 px copy (`ifm_website_oct26/assets/site/corp-eo-forum.jpg`). Swap in the original if it turns up. |
| Module panels 01–05 | IFM-609 · 624 · 062 · 392 · 130 | Power of Compounding · Types of Insurance · bond diagram · How to Buy/Sell a Share · NAV |
| Mission | IFM-073 | Hiral at the table under the IFM title screen (Media Kit rank 1) |
| Closing | `hiral-goel.jpg` | the headshot used in earlier proposals |

To fetch another original: look up its `drive link` in `CLAUDE/content/data.js`, then
`rclone backend copyid gdrive: <file-id> <folder>/` (HEICs convert with `sips -s format jpeg`).

## Editing

- **Words:** edit `content.js`, then rebuild. Every string there is verbatim from Hiral's email;
  the header comment lists the only changes made to her copy.
- **Fonts:** the deck uses **Lora** (headings) and **Nunito** (body). Anyone editing the .pptx needs
  both installed (free from Google Fonts), or PowerPoint will substitute and lines will re-wrap.
  The PDF has them embedded, so the client needs nothing.
- **Small edits in PowerPoint are fine**, but they are lost if someone rebuilds from `content.js`.
  Make lasting changes in `content.js`.

## Rebuild

```bash
cd "documents/proposals-and-reports/wealth-conversation-series"
/usr/bin/python3 prep_assets.py                  # only if a photo changed
node icons/render-icons.js                       # only if an icon SVG changed
NODE_PATH="../../../deck-build/node_modules" node build.js
```

For the PDF, convert with LibreOffice (fonts must be installed) or with PowerPoint's
File → Save As → PDF:

```bash
soffice --headless --convert-to pdf "../IFM Wealth Conversation Series — Proposal.pptx" --outdir ..
```

## What's in this folder

| | |
|---|---|
| `content.js` | All copy. Module order = numbered pages 01–05 (Insurance is 02). |
| `build.js` | pptxgenjs layout: theme, six slide layouts, every slide. |
| `prep_assets.py` | Crops, rounds and duotones the photos into `assets/`. |
| `assets/src/` | Local copies of the source photos and logos (`corp/` = Drive originals). Several files in `workshop-photos-aug2026/` carry a Dropbox `com.apple.macl` lock and become unreadable mid-session, so the build never reads originals in place. |
| `icons/svg/` | 44 rounded-outline icons (Brand Guidelines §24) drawn for this deck. They use `STROKE`/`ACCENT` tokens; `render-icons.js` writes navy/teal, white/mint and gold variants to `icons/png/`. |
| `apply_theme.js` | Writes the IFM palette into the .pptx theme so new text Asba adds picks up brand colours. |

## Open points for Hiral (as of 25 Oct 2026)

1. **Module order — confirmed 26 Oct 2026: the numbered pages.** 01 Money Blueprint, 02 Insurance
   Decoded, 03 Asset Classes, 04 Stock Market, 05 Mutual Fund Map. The email's "Workshop Series"
   paragraph lists them differently; the deck does not follow that paragraph.
2. **Module 01 item titles** were ALL CAPS in the email; the deck sets them in sentence case
   ("Why should my money work?"), matching the other modules' headings.
3. **Contact line** on the last slide (hiral@investingformummies.com · +91 98670 26583 ·
   investingformummies.com) comes from the 31 July 2026 Wealth Conversation proposal, not this email.
4. **"18 hours in total"** on slide 7 is the sum of the suggested durations (3+3+4+4+4).
5. No game names anywhere, per Hiral's note.
6. **Slide 6 names past clients** (Stree Dhan, K-Phyto Extraction, EO Forum, Ascent Group, Pixel Mint Media) exactly as the public website does. Confirm she is happy to show them to a prospect.
