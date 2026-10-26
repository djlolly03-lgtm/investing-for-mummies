# IFM games deep audit — brief for each auditor

You are auditing games on games.investingformummies.com (Investing for Mummies — money/investing education for
Indian mums, working women, young adults and teens; brand: navy #1a3a5c, teal #2a9d8f, gold #c9a84c, Lora + Nunito).
Act as BOTH an experienced game designer and a web/UX designer. Goal: a concrete, actionable improvement list per game
that the owner will tick off. Owner is non-technical — write each item in plain English (one sentence, what to change
and why it helps), no code jargon.

## READ-ONLY on the repo
Repo: /Users/lollyg/Documents/investing for Mummies/CLAUDE  (the game source files). Do NOT edit anything in the repo.
Write only inside your output folder: /private/tmp/claude-501/-Users-lollyg-Documents-investing-for-Mummies/6212b737-c95a-435a-892e-9a12f239b3c0/scratchpad/audit/

## How to audit each game
1. Read the game's source fully (the HTML file and any JS it loads from the repo). Understand the whole flow: intro → rounds → feedback → end screen → what happens next.
2. Screenshot the LIVE page's first screen at phone and desktop size with headless Chrome (use your own scratch subfolder, e.g. audit/shots/<group>/):
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=390,844 --screenshot=<out.png> <url>
   and again at 1440,900. Look at both screenshots (Read the PNGs). Phone matters most (most visitors come from WhatsApp/Instagram on phones).
   Note: a 390px window in headless Chrome may lay out wider than a real phone; if layout looks odd, also try loading via an iframe wrapper page of width 390.
3. Check load weight: page size, external scripts (Babel/in-browser JSX compiling, React development builds, Chart.js etc.), and big images/videos it loads up front (sizes on disk in the repo).
4. Already known, DON'T re-report as findings (they're site-wide items handled separately): every game lacks a "back to games / back to IFM homepage" link and lacks a WhatsApp share button. INSTEAD, for each game write:
   - "share_idea": what exactly a WhatsApp share from this game should say (e.g. the player's result + a hook + link), one line.
   - "share_moment": where in the flow the share button belongs (e.g. end screen after the score).
5. Then list improvements. Cover, where relevant: game design (clarity of goal/rules, onboarding, pacing, difficulty, feedback, juice/delight, replayability, ending/payoff, the money lesson landing), layout & visual (hierarchy, mobile fit, tap targets ≥44px, text size, contrast, brand consistency, overflow/cut-off), copy (jargon for beginners, tone, typos), speed, accessibility, bugs (anything that looks broken in code: dead buttons, console errors you can infer, missing assets, hard-coded old domain ifm-deploy.vercel.app), and conversion (does the end lead to "Find your batch" at register.investingformummies.com in a non-pushy way).
   Compliance note: IFM is NOT SEBI-registered; flag any return projection without a stated assumption, any real fund/stock named as if recommended, or any claim of guaranteed returns.
   Aim for 6–14 genuinely useful items per game; no padding, no generic advice that would apply to every game.
6. For classroom/host games (projector + phones): judge both the host screen and the phone/player screen.

## Output — one JSON file per group: audit/<group>.json
{"group":"<group>","games":[{
  "slug":"one-crore-ladder", "title":"₹1 Crore Ladder", "url":"https://games.investingformummies.com/one-crore-ladder",
  "file":"one-crore-ladder.html", "kind":"solo"|"classroom"|"tool",
  "audience":"Mummies"|"Gen Next"|"Both",
  "verdict":"one or two sentences: what works, what most holds it back",
  "load":"one line, e.g. '114 KB page + Chart.js; fast' or '4.5 MB up front (3 PNGs + video)'",
  "share_idea":"...", "share_moment":"...",
  "items":[{"area":"Game design|Layout|Mobile|Copy|Speed|Accessibility|Bug|Conversion|Compliance",
            "priority":"High|Med|Low", "effort":"S|M|L", "text":"plain-English change + why"}]
}]}
Effort: S = under an hour, M = a few hours, L = a day+.
Validate the JSON parses (python3 -c "import json;json.load(open(...))") before finishing.
Final message back: just the file path and one line per game (title — top issue). Keep it short.
