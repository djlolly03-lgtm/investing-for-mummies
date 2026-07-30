You are updating two Word documents for Investing for Mummies (IFM) with the current state of all games and resources, and testing that all games are functioning properly.

## STEP 1 — Read the source of truth: index.html

Read the file: /Users/lollyg/Documents/investing for Mummies/CLAUDE/index.html

Extract every showGame() and showResource() call and their associated game names (from the gp-name divs nearby). Identify which are:
- Public (in the main portal grid, not inside an .admin-section div)
- Admin-only (inside an .admin-section div — Resources & Tools, IFM News Agency, Beta Testing)
- Teen Zone (inside #teen-zone div)

## STEP 2 — Check WP snippet files

List all files in: /Users/lollyg/Documents/investing for Mummies/CLAUDE/
that match *_wp_snippet.html — each one means a WordPress page exists for that game.

Read the first line of each snippet file (it's a comment like <!-- GAME NAME — Investing for Mummies -->) and the iframe src URL inside it to determine what slug/URL it maps to.

Also check for standalone HTML files that are Vercel-deployed but NOT referenced in index.html showGame() calls — these are standalone tools not in the portal:
- quiz.html (Money Masters Quiz)
- crorepati-lane.html (Crorepati Lane)
- chess-compounding.html (Rice & Chessboard)
- short-squeeze-sim.html (The Short Squeeze)
- wealth-conversation/ folder (The Wealth Conversation)

## STEP 3 — Build the complete inventory

From Steps 1 and 2, build:

**List A — Items WITH a WordPress page** (for IFM_Published_Games.docx):
These are items where a matching *_wp_snippet.html file exists in the CLAUDE folder.

**List B — Public portal games WITHOUT a WP page**

**List C — Admin-only Resources & Tools**

**List D — Standalone Vercel items not in the portal**

**List E — Beta / unreleased**

## STEP 4 — Update IFM_Published_Games.docx

File: /Users/lollyg/Documents/investing for Mummies/CLAUDE/IFM_Published_Games.docx

Use the docx skill at:
/Users/lollyg/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/941c9117-e996-4d56-a16d-bdd9cd0257df/7a838fb9-29c5-4d02-b6d2-95111b0c5056/skills/docx

Steps:
1. Unpack: `python3 "[skill_dir]/scripts/office/unpack.py" "[doc_path]" /tmp/pg_unpacked/`
2. Edit /tmp/pg_unpacked/word/document.xml — update the table rows to match List A exactly. Add/remove rows as needed. Columns: # | Game | Audience | Description | Direct URL
3. Update the subtitle line (e.g. "9 games live" → "N items live") and footer "Last updated:" to today's date
4. Repack: `python3 "[skill_dir]/scripts/office/pack.py" /tmp/pg_unpacked/ "[doc_path]" --original "[doc_path]"`

## STEP 5 — Update Master Game Inventory in IFM Add New Game Guide.docx

File: /Users/lollyg/Documents/investing for Mummies/CLAUDE/IFM Add New Game Guide.docx

Find the section "📋 Master Game Inventory & Cross-Reference Audit" near the end of document.xml.

Update:
- **Last audited:** date → today's date (format: D Month YYYY)
- **Table A (public games):** Replace rows with current List B + List A public games. Columns: Game | showGame() id | Runs as | Standalone WP page
  - "Runs as" = "Inline" if no standalone file, or "Vercel file filename.html" / "Vercel folder /foldername/" if a standalone file/folder exists in CLAUDE
  - WP page = ✅ /slug/ if snippet exists, ❌ if not
- **Table B (admin-only):** Update Resources & Tools, News Agency, Standalone items, Beta sections
- **One-line summary:** Update counts (total items, public in portal, WP pages, standalone Vercel files)
- **Findings:** Update resolved findings, add new findings for any new mismatches discovered

Repack the doc.

## STEP 6 — Functional Game Testing

For every public game (List A + List B), visit its live URL and test it end-to-end. Use browser tools to actually interact with each game — don't just check if the page loads. Take your time on each game and go deep.

For each game, test:
1. **Page loads** — no blank screen, no JS console errors, no broken assets
2. **Core mechanic works** — click through the main game flow (spin a wheel, answer a question, make a move, play a round, etc.)
3. **Win/loss/end states** — verify the game can be completed or reaches a clear endpoint
4. **Mobile layout** — resize to 390px wide and check nothing is clipped, overlapping, or broken
5. **Reset / Play Again** — confirm replay works without needing a page refresh
6. **Edge cases** — try unexpected inputs, fast clicking, skipping steps — note anything that breaks or behaves oddly

Flag anything that is:
- 🔴 Broken — game is unplayable
- 🟡 Degraded — partially broken or seriously confusing
- 🟠 Slightly Off — visual glitch, wrong text, minor UX issue, edge case failure
- ✅ Pass — fully working

## STEP 7 — Report

Output a full summary:

**Document Updates**
- How many public games in portal
- How many items have WP pages
- Any new games/resources detected since last known state
- Both files saved confirmation
- Today's date used for "Last updated" / "Last audited"

**Game Health Report**
| Game | URL | Status | Notes |
|------|-----|--------|-------|
(one row per game)

- Total: X passing, X slightly off, X degraded, X broken
- Any 🔴 Broken games called out at the very top for immediate attention

## Notes
- skill_dir = /Users/lollyg/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/941c9117-e996-4d56-a16d-bdd9cd0257df/7a838fb9-29c5-4d02-b6d2-95111b0c5056/skills/docx
- Always use python3 with full absolute paths (spaces in paths must be quoted)
- Do NOT modify the live site, push to Vercel, or change any HTML files
- Read-only for all source files; only write to the two .docx files
