# The IFM "killer standard" — a game-by-game quality bar

*Research only, 27 Oct 2026. Nothing in the repo was changed. Screenshots are in `killer/shots/`.*

**What this is.** The www site, the games homepage, The Wealth Hack, Mutual Fund Manager LIVE, Swayamvar, the Crorepati quiz and Slash the Scam look and feel a level above the older games. This document pins down *what exactly* they do, so a designer can take any older game (NAV Pizza, 3 Buckets, REIT or Real, Debt Detective, Wheel of Gold and the ~40 others built on the same template) and raise it to the same bar — re-using shared pieces rather than rebuilding them per game.

**How it was checked.** Every page was screenshotted live at phone width (390 px) and desktop width (1440 px). Pages were also loaded in a phone-emulated browser to measure download weight and to play through to the feedback and result screens (REIT or Real, Slash the Scam, The Wealth Hack solo mode). The source files were read and compared feature by feature.

| Screenshot sheet | Shows |
|---|---|
| `shots/_sheet-new1.png`, `_sheet-new2.png` | New work, first screen on a phone |
| `shots/_sheet-old1.png`, `_sheet-old2.png` | Older games, first screen on a phone |
| `shots/_desk-new.png`, `_desk-old.png` | Same, at desktop width |
| `shots/_sheet-flow.png` | REIT or Real question → feedback → result; Slash the Scam play → end card |
| `shots/flow-wh-result.png` | The Wealth Hack result + WhatsApp share (phone) |
| `shots/_sheet-www.png` | www site scrolled on a phone |
| `shots/*-390.png`, `*-1440.png` | The raw headless-Chrome shots (390 via a 390 px iframe wrapper) |

> Note: the www site refuses to load inside an iframe (a deliberate security header), so its iframe-wrapper phone shot is blank (`www-390.png`). The phone-emulated shot `www-390m.png` is the one to look at.

---

## The one-paragraph version

The old games are a **form**: a flat coloured banner, a "📋 How It Works" card of emoji chips, a gold button with white text, small grey text, and a result screen that is a score out of 80 plus a long recap list and a yellow disclaimer box. The new work is a **moment**: a big serif title with one italic accent word, a single sentence that makes you want to know the answer, one obvious button, a dramatic reveal of *your own* number, and a result card written to be forwarded on WhatsApp — with the assumption printed right on it. The gap is mostly treatment, not technology, which is why most of it can be closed with a shared kit.

---

## 1. Visual system

### 1.1 Type — one serif for feeling, one sans for doing

**What the new work does**
- The headline is the hero. Wealth Hack's phone title is a 54 px serif with a small italic "The" above it in pale gold (`the-wealth-hack.html` lines 474–478). The www hero is a huge Lora with the key word in teal italic: *"Money talk, finally in **your** voice."* (`home.css` line 180, `.hx-line em`). The games homepage does the same: *"Learn money the way we teach it: **by playing.**"*
- **One italic accent word per heading, in the accent colour.** Seen everywhere: "Find your *number*", "In their *own words*", "For years, money was *his* department."
- **A tracked-caps kicker above every heading** — tiny uppercase, wide letter-spacing, with a short rule before it: "— A NOTE FROM THE FOUNDER" (`home.css` `.eyebrow`, lines 93–106), "ROUND 1 · THE REAL NUMBER" (Wealth Hack `.lbl`).
- **Numbers are set in the serif**, large, so money reads as the payoff: ₹3.68 L/mo, ₹1,750, ₹26 L.
- Body text is never below ~13.5 px on a phone; inputs are 17 px (stops iPhone zooming in on focus).

**The font question — a decision for the owner.** The brand guidelines (§4) say *Lora + Nunito only*. The www site and games homepage follow that and look premium, which proves the pair is not the problem. But the four newest live games each brought their own pair: Wealth Hack (Fraunces + Manrope), Fund Manager (Sora + Inter), Crorepati quiz (Poppins + Nunito), Swayamvar (Cormorant Garamond + Lora + Nunito). Wheel of Gold adds Cinzel. That is six display faces across one brand.
**Recommendation:** two themes, two pairs, written into Brand Guidelines §4 and nowhere else:
- **Daylight** (cream/mint, all single-player games, www, games homepage): Lora + Nunito.
- **Midnight** (live classroom/projector games and premium payoff screens): Fraunces + Manrope, exactly as The Wealth Hack does it — *or* Lora + Nunito on midnight if you'd rather keep one family. Either way, no new pair per game.

**Also fix the guideline itself.** Brand Guidelines §4's type scale (card title 0.92 rem, labels 0.75 rem, tags 0.55–0.65 rem) is *why* the old games look small. The new work ignores it. Replace with: phone heading 28–54 px, card heading 22–24 px, body 15–17 px, labels 12–13 px, caps kickers 10–11 px (the only thing allowed that small).

**Gaps in older games**
- REIT or Real and Debt Detective use 0.65–0.74 rem (10–12 px) for their result-screen takeaways and disclaimers — 68 and 79 such declarations respectively (`reit-or-real.html` ~line 1935; `debt-detective.html` ~line 2135). Change: takeaways to 15 px, recap rows to 14 px.
- Titles are 18–24 px inside a coloured banner (NAV Pizza, REIT or Real, Debt Detective) — the title is not the hero. Change: drop the banner box, set the game name as a 40–54 px serif on the page with one italic accent word ("REIT or *Real?*", "Debt *Detective*", "The ₹20 vs ₹100 *paradox*").
- Wheel of Gold loads Cinzel for "How It Works" — remove it.

### 1.2 Colour — a short palette used with discipline

**What the new work does**
- Few colours, each with a job. The Wealth Hack uses 41 distinct hex values in 1,400 lines; on the phone it is essentially midnight `#050c15`, ivory `#f6f1e7`, mist `#9bb0ae`, gold `#e9bf62`/`#f7dea0`, plus *coral* `#ff8a76` for "bad" and *mint* `#6fe3d0` for "good". Money that hurts is coral; money that grows is gold or mint. Every time.
- Buttons put **dark text on gold** (`#1a1203` on the gold gradient — contrast 10.7 : 1).
- The www site alternates whole-section backgrounds (cream → mint → navy) to pace the scroll, as Brand Guidelines §24 asks.

**Gaps in older games**
- **The gold button fails contrast.** `.btn-gold` in all five older games (line ~124: `color:#fff` on `#c9a84c`) measures **2.3 : 1**; the minimum for normal text is 4.5 : 1 ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). It is the main "Start" button in every one of them. Change: text to navy `#1a3a5c` or `#1a1203`. (The www `.btn-gold`, `home.css` line 132, has the same problem.)
- **Off-brand colours in results.** REIT or Real's takeaways are purple (`#7c3aed`, `#6c3fa0`, `#f3effd`), its score bar is orange-to-brown (`#FF9800 → #5c3a1a`), its hero is navy → brown → orange, and right/wrong uses Material Design green/red (`#4CAF50`, `#ef4444`) — `reit-or-real.html` lines 1714, 1877–1880, 1929–1934. Change: gold/teal for good, coral for bad, navy for neutral.
- **Colour sprawl.** Distinct hex values: REIT 106, Debt Detective 115, 3 Buckets 159, Wheel of Gold 168 (Wealth Hack 41). Most are inline `style="…"` strings written by JavaScript (REIT 56, Debt Detective 88 inline styles). Change: move to the shared tokens (see the kit).
- Dead tokens from an older palette still sit in every old game's `:root`: `--purple:#1a3a5c; --pink:#bde9e4; --orange:#c9a84c` — names that lie about their colour invite the next person to "fix" them. Delete.

### 1.3 Depth — layered, lit, never flat

**What the new work does**
- **Glass cards** with a 1 px inner highlight and a **gold hairline** across the top edge (Wealth Hack `.card` and `.card::before`, lines 481–482; `.lcard::before` line 83).
- A faint **film-grain overlay** over the whole phone screen (`body.player-bg::after`, line 462 — a 160 px SVG noise tile at 6 % opacity). Costs ~300 bytes, removes the "flat web page" look.
- **Glow, not drop-shadow**, on the hero number (`text-shadow:0 0 40px rgba(233,191,98,.3)`).
- A full-bleed atmospheric image behind the title that fades into the background colour (`.p-hero` + `::after` gradient, lines 465–467).
- The www site does the daylight version: soft radial "blobs" behind sections (`#founder::before`), photo chips with white borders and soft navy shadows.

**Gaps in older games**: one shadow recipe (`0 2px 12px rgba(26,58,92,.08)`) on white cards on a near-white page, so nothing sits in front of anything (`_desk-old.png`). Debt Detective and REIT or Real are almost entirely white rectangles. Change: cream page, one hero image or illustration behind the title, the glass/hairline card for the *one* card that matters on each screen.

### 1.4 Imagery and illustration — real or painted, never emoji-as-art

**What the new work does**
- Each game owns **one signature image** that sets the mood: Wealth Hack's gold coin-tree on a Mumbai night rooftop (`wealth-hack-banner.jpg`, `-stage.jpg`, `-loop.mp4`); Slash the Scam's painted medallion icons (`game-icons/*.png`); Swayamvar's wedding-card system and suitor portraits; the quiz's TV-studio set (`quiz-studio.jpg`).
- The www site uses **real photos of real IFM classes** in pill-shaped chips and a video wall (Brand Guidelines §24: "real Indian women… never generic stock").
- Emoji appear as *seasoning* (avatars, a 💰 at the start of a WhatsApp message), not as the main graphics.

**Gaps in older games**
- Emoji are the illustration: 📦 🤔 🪣 in "How It Works", 🏠 on buttons, ✅ ❌ as the feedback graphic, 📋 as a card icon, 🏆/🌱/📚 as the result "trophy" (Wheel of Gold `showFinal`, line ~2362: `font-size:72px` emoji). Brand Guidelines §24 asks for "rounded outline icons with subtle brand-colour accents".
- NAV Pizza has the strongest idea (a pizza = a fund, a slice = a unit) and draws it with the 🍕 emoji in a circle.
- 3 Buckets is the exception that proves the rule: it *has* rich painted buckets (`3b-*.png`) — they just weigh 650 KB each (see §7).
- **Missing logo.** NAV Pizza, REIT or Real and Debt Detective mark their banner `data-logo="…"`, which reserves a 112 px left gutter (`.game-hero[data-logo]{padding-left:112px}`, line 1318), but no logo is placed in it — so on a phone the title is squashed into the right two-thirds of the banner with an empty hole on the left (`_sheet-old1.png`, `_sheet-old2.png`). REIT or Real's in-game header also shows an empty logo circle (`flow-reit-q1.png`). Change: remove `data-logo` and put the small round mark in the top bar (see §2).

### 1.5 Motion — calm, purposeful, 200–900 ms

**What the new work does**
- Things **arrive**: rows rise in with a stagger (`@keyframes rise`, Wealth Hack line 155); player chips pop in (`pop`, line 102).
- **The money number counts up** to its value over 900 ms with an ease-out curve (Wealth Hack line 1012). The www compounding story ticks a rupee figure upward as you scroll ("₹26 L — Year 5. It feels slow. Most people quit here.").
- **One element breathes** to say "act here": the question panel pulses gold (`qpulse`), the host "Next" button pulses when it is time (`nextpulse`). Only one at a time.
- The www site switches all of this off for people who ask their phone to reduce motion (`home.css` lines 296, 717, 882, 1879; `app.js` Hero and Intro).

**Gaps in older games**: scores jump (`rr_scoreDisplay.textContent=rr_score`); the result bar animates width but the number does not count; feedback appears instantly with `display:block` and a `scrollIntoView`. No game — new or old — honours "reduce motion" (zero `prefers-reduced-motion` rules in any `CLAUDE/*.html` game; only `debt-boss.html` and a marquee preview). See §8.

### 1.6 Sound — tiny, synthesised, mutable

**What the new work does**: Slash the Scam has a complete sound system in ~50 lines with **no audio files**: a `tone()` oscillator and a `noiseFx()` filtered-noise helper, a named `sfx` set (slash, coin, ouch, combo, win, ko) and a distinct voice per item (`slash-the-scam.html` lines 636–691), a 🔊/🔇 mute button in the top bar, and the audio engine is unlocked on the Start tap (line 1326) as browsers require ([Chrome autoplay policy](https://developer.chrome.com/blog/autoplay)).

**Gaps**: none of the five older games — and none of the other new games except Slash — make any sound. Sound is the cheapest "this feels like a game" upgrade there is. Rule: correct = rising two-note chime, wrong = soft low thud (never a buzzer), reveal = coin, finish = four-note arpeggio; mute button always visible; never auto-play.

---

## 2. Layout on phones

**What the new work does**
- **One column, max ~480 px, 16 px side gutters** (Wealth Hack `.wrap`, line 463), `overflow-x:clip` so nothing can scroll sideways.
- **A slim top bar** that never changes: round logo (38 px) · "INVESTING FOR MUMMIES" in tracked caps · a status pill on the right ("● ROOM E3480", "FIND YOUR NUMBER") (Wealth Hack `.p-bar`, `.room`, lines 468–473). Slash the Scam's top bar carries lives, money and time instead.
- **The main action sits in the thumb zone.** Wealth Hack's "Lock it in →" is 64 px tall and `position:sticky; bottom:14px`, with a 6 px midnight ring so it floats above content (line 552). Answer chips are a 4-up grid of 52 px-tall buttons (line 550).
- **Everything on the first screen fits in 844 px** — title, promise, input, button (`flow-wh-result.png`, `_sheet-new1.png`).
- **Live games have a phone path.** The Wealth Hack detects a phone that arrived from a WhatsApp link with no room code and shows a self-serve "Find your number" mode instead of the projector screen (`_soloDetect`, lines 700–702).

**Gaps**
- **Older games:** the Start button is below the fold on 3 Buckets and only just visible on Wheel of Gold at 390 × 844; NAV Pizza has no start screen at all and drops you into "Step 1" under a banner. A "🏠 Back to Main Menu →" button sits directly under the question *during play* in REIT or Real (`flow-reit-q1.png`, `reit-or-real.html` line 1784) — the biggest button on screen is the exit.
- **Newer live games:** a parent who taps a WhatsApp link to Swayamvar, the Crorepati quiz or Fund Manager on her phone sees the projector lobby squeezed to phone width — Swayamvar's QR is cut off on the left (`_sheet-new2.png`), the quiz shows a "Scan to join" QR she cannot scan with the same phone, and Fund Manager shows "Scan the QR on the screen" and nothing else (`_sheet-new1.png`). Change: copy Wealth Hack's solo detection and give each a 60-second solo taste plus "Ask your teacher for the code".

Rule of thumb for designers: test at **390 × 844 and 360 × 740**; the title, the one-line promise and the primary button must all be visible without scrolling; nothing scrolls sideways; the primary button is ≥ 56 px tall and in the bottom third.

---

## 3. The intro screen

**The shape the new work uses** (Wealth Hack solo, Slash the Scam, games homepage):

1. **Top bar** — logo · brand · status pill.
2. **Kicker** — what kind of thing this is and how long: "A 75-SECOND MONEY REFLEX TEST", "PLAY ONE NOW · 4 MINUTES".
3. **Title** — big serif, one italic accent.
4. **The hook, one sentence, ending on a twist** — "One started early. One started 'soon'. *Only one of them is rich.*"; "Scams and smart investments come flying at your purse. **You get 75 seconds to tell them apart.**"
5. **One input or one button.** Wealth Hack asks only for age (name optional) and the button says what you get: "Show me my number →". Slash shows a two-tile "Do this / Not this" demo instead of a paragraph of rules.
6. Optional social proof — "Priya and 12 others are already in" (`crowdRow()`, Wealth Hack line 1356); "🏆 Your best: ₹4,250" (Slash, line 1372).
7. Footer: the assumption in plain words — "assumes 12% a year, not a promise".

**Older games use a different shape**: banner → "📋 How It Works" card with three emoji chips (READ / TRUE-FALSE / LEARN) → a paragraph of rules → a second card with the button and "🎯 8 questions · ✅❌ True/False · 🏆 Max 80 pts" → "Back to Main Menu". It explains the *mechanics* before giving a reason to care.

**Rewrite pattern, game by game**
- **REIT or Real** — kicker "8 MYTHS · 3 MINUTES"; title "REIT or *Real?*"; hook "Most people think a flat is the safe bet. Eight statements. Let's see what you believe."; button "Bust the first myth →". Drop the How-It-Works card: the first question *is* the tutorial.
- **Debt Detective** — kicker "8 PRODUCTS · NO TIMER"; title "Who's borrowing *your* money?"; hook "Every FD, bond and debt fund is a loan — and you are the lender."; button "Start the case →".
- **NAV Pizza** — add an intro: kicker "MUTUAL FUNDS · 3 MINUTES"; title "The ₹20 vs ₹100 *paradox*"; hook "Two funds. One looks cheap. Which one grows your money?"; one illustrated pizza pair; button "Pick a fund →".
- **3 Buckets** — keep the painted buckets as the hero image but put the Start button inside the first screen; drop the 2.6 MB hero video on phones.
- **Wheel of Gold** — keep the wheel as the hero; replace "How It Works" chips with a single line "Spin. Read the headline. Call it: gold up or down?"; one button.

---

## 4. Feedback moments (the "was I right?" beat)

**What the new work does**
- **Shows *your* consequence, not just right/wrong.** Wealth Hack's reveal: the real number in a 2.8 rem gold serif, "you guessed ₹15k" under it, an "off by" pill coloured by direction (`.off.low/.high`), then "**Your guess, put to work**: ₹15k a month for 11 years → ₹38 L — that is ₹9.6 Cr short of your goal" (`projHtml`, lines 1276–1283). That is the moment people remember.
- **Explains in one or two sentences with the key number in bold**, in a gold-edged callout (`.fb`, line 520): "Wait just **one year** and your number becomes **₹4.35 L** a month."
- **Privacy is stated**: "Only you can see how close you were. The room sees group numbers."
- **Slash the Scam layers it**: a sound per item, floating "+₹" text, a "🔥 FRAUD FRENZY ×3" combo tag, a "⚡ SPEED UP!" tier change, hearts that flash, and a one-line lesson in a footer strip ("Safely landed in your purse. Wealth is built quietly, not loudly.").
- **The quiz** adds streaks ("from 3 in a row") and "✓ Correct answer — 14/22 got it", turning a fact into a room moment.

**Older-game pattern** (`flow-reit-feedback.png`): the correct button turns Material green, the other fades to 35 %, a box appears with "✅ Correct! +10 pts" in small caps and a 70-word paragraph, and a "Next Question →" button in a navy-to-brown gradient. Score jumps from 0 to 10 in a corner.

**Rules**
1. Lead with a **number or picture that is about the player** ("your ₹1,000 bought 50 slices vs 10 slices"), then the one-line why.
2. Correct: warm, short, specific ("🎯 Spot on — the borrower is the Government of India."). Wrong: never "Wrong —"; use "Not quite — here's the twist:" and teach. (REIT line 1887 says "Wrong — here's why:".)
3. **Max 35 words** of explanation on screen; put the rest behind "Why? ▸".
4. Score **counts up**; a chime plays; the progress dots fill with the brand colour, not Material green.
5. The Next button is the same gold primary as everywhere else, in the thumb zone.

---

## 5. The result / payoff screen

**What the new work does**
- **Names the player** and frames the card as theirs: "YOUR NUMBERS · KEEP THESE — Priya, 29" (Wealth Hack `ph==='end'`, line 1346; solo line 1392).
- **Three rows, each a sentence with its number in gold or coral**: "₹10 Cr by 40, start now — ₹3.68 L/mo"; "…start 5 years late — **₹9.55 L/mo**" (coral); "₹5k/mo until 60 — ₹1.98 Cr" (`.sum .row`, line 529).
- **One last insight** in the gold-edged callout, ending on a call to act: "The best month to start is this one."
- **Share on WhatsApp** as the big green button; "Try a different age" as the quiet secondary.
- **Slash the Scam's end card**: a verdict title ("SCAM-PROOF SUPERMOM 🦸🏽‍♀️" / "EASY TARGET — READ THE FINE PRINT 🧐"), the big money figure, four stat chips, a personal-best badge (`localStorage`, line 1273), "The lesson" card with a line tailored to how you played, then "Play again" (`flow-slash-end.png`).
- **The quiz and Fund Manager** end on a podium/report for the room, then explain the game (`quiz.html` line ~1711: "The podium celebrates; THIS is where the game gets explained").

**Older-game pattern** (`flow-reit-final.png`): "YOUR SCORE 40 out of 80", an orange-brown progress bar, a grade ("📚 Getting There!"), an 8-row recap list in 11–12 px type, three purple "Key Takeaways", a yellow ⚠️ disclaimer box, "↺ Play Again". Wheel of Gold adds three locked badges and a Benjamin Franklin quote.

**Rules**
1. **Headline = what the player now knows or is**, not a percentage. ("You can spot a sovereign borrower at a glance." / "You'd have picked the 'cheap' fund — most people do.")
2. **The money number is the hero**, in the serif, counting up.
3. **Max three takeaway rows**; the full recap goes behind "See all 8 answers ▸".
4. **One tailored line** based on how they played (Slash's `ll-you` pattern).
5. **Buttons in this order**: Share on WhatsApp (primary) · Play again · More games like this (link to the games homepage shelf). Today, old games' only exits are "Play again" and "Back to Main Menu".
6. **Celebrate proportionately**: confetti only for a genuine win (all correct, or a personal best). Never for a 3/8.
7. **No patronising grades.** Retire "💪 Lots to Learn!", "💪 Keep Studying!", "📚 Just Getting Started! — Come back after reviewing the material!" (REIT line 1917, Debt Detective line 2113, Wheel of Gold line 2367). Brand Guidelines §11 says "never patronising".

---

## 6. Copy voice

What the new work sounds like — a smart friend, a little dramatic, very specific:
- **Hooks with a twist**: "One started early. One started 'soon'. Only one of them is rich." / "Not bad. Just unemployed." (games homepage, on idle money).
- **Short, second person, present tense**: "Your age decides your number, so be honest." / "Guess. Nobody gets it right first time."
- **Rupees, not percentages**: "₹5.87 L more, every single month".
- **The assumption in the same breath as the number**: "assumes 12% a year, not a promise" — on the screen *and* inside the WhatsApp message.
- **Sentence case** for headings and buttons; caps only for tiny kickers.
- **Buttons say what you get**: "Show me my number →", "Lock it in →", "Start defending" — not "Submit", "Next", "Start".

Older-game voice to retire: Title Case Everywhere ("Bust Some Myths!", "Start Investigating!"); stacked exclamation marks; "Prepare to be surprised!"; emoji at the start of every label; "Wrong —"; grades that judge the player; generic quotes.

---

## 7. Performance budget

**Measured on a phone (decoded bytes, 27 Oct 2026)**

| Page | Total | Biggest single items |
|---|---:|---|
| www | 1.6 MB | analytics 650 KB, React 139 KB, images as WebP (≤ 85 KB each) |
| Games homepage | 1.5 MB | analytics 1.2 MB |
| NAV Pizza / REIT / Debt Detective | 1.4–1.6 MB | analytics 1.2 MB; the game itself ~130 KB |
| Wheel of Gold | 2.6 MB | **two 530 KB logo PNGs** (black + white background) for one ~96 px logo |
| Swayamvar | 2.0 MB | React from unpkg, Supabase 213 KB |
| The Wealth Hack (phone) | 2.9 MB | **1 MB logo PNG**, **394 KB projector video + 210 KB stage image the phone never shows** |
| Fund Manager | 3.0 MB | **1 MB logo PNG**, 269 KB art |
| Crorepati quiz | 3.4 MB | **1 MB logo PNG**, 656 KB studio JPG |
| Slash the Scam | 3.7 MB | **1 MB logo PNG**, 16 item PNGs at ~130 KB each (~2 MB) |
| 3 Buckets | **7.8 MB** | 2.6 MB hero MP4, three bucket PNGs at ~650 KB, 1 MB + 530 KB logos |

Two surprises: **the older text games are actually the lightest**, and **the single heaviest file on most new games is the logo** — `IFM round logo for watermark.png` is 1,064 × 1,176 px and 1 MB, shown at 38–48 px. A 224 px `ifm-round.png` (62 KB) already exists. Analytics (Google tag + PostHog with session recording and surveys) is ~1.2 MB decoded on every games page — more than any game's own code.

**Budget for every game (phone, first screen)**
- First screen ready in under 2.5 s on 4G (Google's "good" Largest Contentful Paint threshold — [web.dev/vitals](https://web.dev/articles/vitals)); taps respond in under 200 ms (INP); nothing jumps (CLS ≤ 0.1).
- **≤ 500 KB transferred for the game itself** before the first tap, excluding analytics.
- Logo ≤ 15 KB (96 px WebP or SVG). Hero/atmosphere image ≤ 120 KB WebP. Each icon/illustration ≤ 30 KB WebP. Lossless WebP is ~26 % smaller than PNG and lossy WebP 25–34 % smaller than JPEG ([Google WebP](https://developers.google.com/speed/webp)); on these painted icons the real saving will be far larger because they are oversized, not just badly encoded.
- Video: ≤ 400 KB, only where it is seen (projector/desktop). On phones use a still. Do not put `autoplay` video in the HTML of a page phones open — set its `src` from script only for the host (Wealth Hack's `#bgv` is `display:none` on phones but still downloads).
- **No in-browser Babel.** Five pages still load `babel-standalone` to compile JSX on the visitor's phone — `classic.html`, `asset-boss.html`, `debt-boss.html`, `my-first-trade.html`, `inflation-calculator.html` (this overlaps the "games weekend" precompile item). Swayamvar loads React from unpkg — pin it on cdnjs like the other React pages, or self-host.
- Fonts: one `<link>` with `display=swap`, only the weights used, plus `preconnect` to fonts.gstatic.com (Wealth Hack preconnects to googleapis only).
- Analytics: load PostHog's session recorder and surveys after the first interaction or on idle, not up front (owner decision — the www README says not to touch tags without checking).

---

## 8. Accessibility

**Where the new work is better**: bigger text, higher contrast (Wealth Hack's muted text 8.6 : 1 on midnight; old muted-on-mint chips 3.85 : 1), real `<button>`s for answer chips, `inputmode="numeric"` on number fields, 52–64 px tap targets, the www site's reduce-motion support.

**Where the new work is worse, and must not be copied**
- **Zoom is disabled** on Fund Manager, the quiz, Slash the Scam and Swayamvar (`user-scalable=no, maximum-scale=1.0`), and Wealth Hack sets `maximum-scale=1.0`. People with low vision cannot pinch to read; Lighthouse flags it ([Chrome docs](https://developer.chrome.com/docs/lighthouse/accessibility/meta-viewport); [WCAG 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)). Use `width=device-width, initial-scale=1` and stop accidental zoom with 16 px+ inputs and `touch-action:manipulation` on game surfaces instead.
- **Clickable `<div>`s**: Wealth Hack 2, Fund Manager 4, quiz 4, 3 Buckets 3 — keyboard and screen-reader users cannot use them.

**Rules for every game**
1. Text contrast ≥ 4.5 : 1 (≥ 3 : 1 for 19 px+ bold) — fixes the gold buttons and the WhatsApp button (see §9).
2. Tap targets ≥ 44 × 44 px ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)); WCAG's floor is 24 px ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). The phone scan found 14 undersized targets on www and 4 on the games homepage (mostly inline text links — acceptable) and few in the games themselves.
3. Honour `prefers-reduced-motion`: count-ups jump to the final value, confetti is skipped, pulses stop ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion); [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)). Zero games do this today.
4. Visible focus ring (`:focus-visible`) on every button — zero files have one; Wealth Hack's gold input focus ring (`.inp:focus`, line 490) is the model to extend to buttons.
5. Right/wrong is never colour alone — always a word or icon too (the old games do this well with ✓/✗).
6. Result numbers announced: wrap the reveal in `aria-live="polite"` so a screen reader reads "₹3.68 lakh a month".
7. Sound is never the only feedback, and there is always a mute button.
8. Every image has `alt` (decorative ones `alt=""`).

---

## 9. The share: WhatsApp message, image card, end card

**What the new work does**
- **One share function, message built at the moment of sharing** (Wealth Hack lines 1254–1274, following Brand Guidelines §20): `ifmShare(msg)` opens `https://wa.me/?text=` + the encoded message ([WhatsApp click-to-chat](https://faq.whatsapp.com/5913398998672934)).
- **The message is written for WhatsApp**, using its own formatting (`*bold*`, `_italic_`): a 💰 title line, "_my numbers, straight from class_", the player's name and age, three ▸ lines with numbers in bold, the tagline in italics, "_(assumes 12% a year, not a promise)_", then "Find your number 👇" and the games link. It reads like something a friend sent, and it stays compliant when forwarded.
- **The button**: full-width WhatsApp green with the WhatsApp glyph and **dark text** (`#04210f` on `#25D366`, 8.6 : 1) — `.p-btn.wa`, line 505.
- **An image card** exists elsewhere: Hidden Fortunes renders a result card to PNG (`html2canvas`) and, on phones, hands image + text to the native share sheet with `navigator.share({files})`, falling back to `wa.me` plus a download (`hidden-fortunes-2.html` lines 1603–1660; [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)).
- **Link previews**: every page has the `ifm-seo` block with a 1200 × 630 `og:image`, so a forwarded link shows a card.

**Gaps**
- **No share at all** on NAV Pizza, 3 Buckets, REIT or Real, Debt Detective, Wheel of Gold, Slash the Scam, the quiz (phone), Fund Manager or Swayamvar. Only 10 of 63 HTML files in `CLAUDE/` mention `wa.me` at all.
- Hidden Fortunes' message ("grows to ₹X in 30 years — that's N× what I put in! 🚀") **does not state its assumption** — fix before copying it.
- **Every game shares the same `og-games.jpg`** preview. A forwarded REIT link should preview *REIT or Real*. One 1200 × 630 card per game.
- **Brand Guidelines §20 is out of date**: its `ifmShare` appends `https://ifm-deploy.vercel.app` (the site is now games.investingformummies.com) and specifies white text on WhatsApp green, which measures 1.98 : 1. Update it to the Wealth Hack version.

**The end card standard** (what every game's last screen should contain, top to bottom)
1. Kicker "YOUR RESULT · KEEP THIS" + the player's name if given.
2. Hero number or verdict in the serif, counting up.
3. ≤ 3 rows of "what this means" with numbers in gold/coral.
4. One tailored sentence + one call to act ("The best month to start is this one.").
5. **Share on WhatsApp** (primary) — message with name, result, one teaching line, the assumption, the game's own link.
6. Play again · More games like this.
7. Footer: "Investing for Mummies · assumes X, not a promise" + the standard one-line disclaimer. **One** disclaimer, not a yellow box *and* a footer (REIT and Debt Detective have both).

---

## 10. The reusable kit — build once, use in every upgrade

Nothing is shared today: there is no common CSS or JS file in `CLAUDE/`; every game carries its own copy of tokens, buttons, money formatting and (where present) share code. Upgrading 40 games by hand means 40 slightly different versions. Recommended: extract these into two files — `ifm-kit.css` and `ifm-kit.js` (plus `/sfx` code inside the JS, no audio files) — and have each upgraded game link them.

| Piece | Lift it from | What it gives every game |
|---|---|---|
| **Tokens: Daylight** | `ifm_website_oct26/home.css` `:root` (lines 7–48) | Brand colours, shadows, `--serif/--sans`, 135° gradient |
| **Tokens: Midnight** | `CLAUDE/the-wealth-hack.html` `:root` + `body.player-bg` (lines 25–34, 461) | Midnight/ivory/mist/gold/coral/mint, glass values |
| **Fonts link** | www `index.html` (Lora + Nunito) / Wealth Hack line 20 (Fraunces + Manrope) | One correct `<link>` per theme |
| **Kicker** | www `.eyebrow` (home.css 93–106) / Wealth Hack `.lbl`, `.lk` | Tracked caps + leading rule |
| **Title block** | Wealth Hack `.p-title` (474–480) | Small italic pre-title, big serif, italic tagline with gold bold |
| **Top bar** | Wealth Hack `.p-bar`, `.mark`, `.brand`, `.room` (468–473) | Consistent brand header + status pill |
| **Glass card + gold hairline** | Wealth Hack `.card`, `.card::before` (481–485) | The "premium" container |
| **Grain overlay** | Wealth Hack `body.player-bg::after` (462) | Depth for ~300 bytes |
| **Primary / sticky / outline / WhatsApp buttons** | Wealth Hack `.p-btn`, `.p-btn.big`, `.outline`, `.wa` (500–506, 552) | Dark-on-gold primary, thumb-zone sticky CTA, compliant WA button |
| **Money input** | Wealth Hack `.amt-box/.amt-in/.amt-sh`, `.chips.big` (541–551) + `onMoney/pickChip` | ₹ prefix, Indian commas, "₹5 L" shorthand badge, quick-pick chips |
| **Money formatting** | Wealth Hack `fmtMoney`, `indianFormat`, `parseNum` (613–622); www `inr` in ScrollStory | One ₹k / ₹L / ₹Cr formatter everywhere (§9 of brand doc) |
| **Count-up** | Wealth Hack line 1012 (900 ms cubic ease-out) | `ifmCountUp(el, to)` — add the reduce-motion jump |
| **Feedback callout + off-by pill + "your guess, put to work"** | Wealth Hack `.fb`, `.off`, `.proj`, `projHtml()` (517–522, 564–574, 1276–1283) | The personal-consequence reveal |
| **Sound** | Slash the Scam `tone`, `noiseFx`, `sfx`, mute button (636–691) | Correct/wrong/coin/win sounds with zero files |
| **Confetti** | www `ConfettiBurst` (app.js, GameNight; brand colours `#c9a84c #2a9d8f #e07a9a #f0d9a8 #bde9e4`) or Hidden Fortunes canvas confetti (`hidden-fortunes-2.html` 1332–1370) | One celebration, brand colours, skipped under reduce-motion |
| **Personal best** | Slash the Scam `BEST_KEY` (701, 1273–1275, 1369–1372) | "🏆 Your best" on intro and end |
| **Result rows** | Wealth Hack `.sum .row` (528–531) | The 3-row "your numbers" card |
| **WhatsApp share (text)** | Wealth Hack `ifmShare`, `waBtn`, `numbersText` (1254–1274) | WhatsApp-formatted message with assumption + link |
| **Share image card** | Hidden Fortunes `stc2Capture`, `stc2ShareWhatsApp` (1603–1660) | Image + text via native share, `wa.me` fallback |
| **Solo-on-phone fallback** | Wealth Hack `_soloDetect`, `initSolo`, `renderSolo` (700–702, 1373–1400) | WhatsApp visitors to live games get a playable taste |
| **Reveal-on-scroll + reduce motion** | www `App` IntersectionObserver (app.js) + `home.css` 882 | Calm entrances that respect the setting |
| **Life bar / timeline** | Wealth Hack `.lb*` (179–196) | "today → wait → finish line" visual for any time-based lesson |
| **Assumption footer** | Wealth Hack `shell()` `.foot` (1371) | The compliance line, always present |

---

## 11. Game-by-game upgrade notes (the five audited)

| Game | Keep | Change first |
|---|---|---|
| **NAV Pizza** (`nav-pizza.html`) | The pizza metaphor and step structure | Add a real intro screen; illustrate the two pizzas (not 🍕 emoji); remove the empty `data-logo` gutter (line 1625); dark text on gold buttons; result card + WhatsApp share ("I'd have picked the 'cheap' fund — would you?") |
| **3 Buckets** (`3-buckets.html`) | The painted buckets and the fly-into-bucket confetti (lines 2130–2165) | Cut the 7.8 MB payload: buckets to ~30 KB WebP, no hero MP4 on phones, small logo; Start button on the first screen; share card showing the player's three buckets |
| **REIT or Real** (`reit-or-real.html`) | The myth statements and reveals | Remove purple/orange/brown/Material colours (1714, 1877–1880, 1929–1934); "Wrong —" → "Not quite — here's the twist"; result headline + 3 takeaways + recap behind a tap; move "Back to Main Menu" out of play; fix empty logo circle; share |
| **Debt Detective** (`debt-detective.html`) | "By borrower type" breakdown — a genuinely good result idea | Title as hero ("Who's borrowing *your* money?"); 0.65–0.74 rem text up to 14–15 px; single disclaimer; count-up on "6/8"; share ("I can spot who's borrowing my money — can you?") |
| **Wheel of Gold** (`wheel-of-gold.html`) | The wheel itself and the gold/silver choice | Drop Cinzel; replace two 530 KB logos with one small mark; replace emoji trophy + Franklin quote with a verdict and one tailored line; sound on spin/land; share |

---

## Sources
- WCAG 2.2 contrast minimum — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 2.2 resize text — https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
- WCAG 2.2 target size (minimum) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.2 animation from interactions — https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- Lighthouse: zoom disabled — https://developer.chrome.com/docs/lighthouse/accessibility/meta-viewport
- Apple Human Interface Guidelines, accessibility (44 × 44 pt) — https://developer.apple.com/design/human-interface-guidelines/accessibility
- MDN prefers-reduced-motion — https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Core Web Vitals thresholds — https://web.dev/articles/vitals
- WebP compression study — https://developers.google.com/speed/webp
- Chrome autoplay policy — https://developer.chrome.com/blog/autoplay
- MDN Web Share API — https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- WhatsApp click to chat — https://faq.whatsapp.com/5913398998672934
- Internal: `CLAUDE/IFM Brand Guidelines 2026.docx` §4, §11, §12, §20, §24
