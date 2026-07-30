# Broke by Friday LIVE — Teacher-Screen Visuals Brief

Hand this whole file to another AI (image generator OR a code/design AI). Goal: redesign the **4 teacher-projector visuals**. They currently look amateur and need to be **bold, clean, and exciting** for a classroom projector.

---

## Context
- **Game:** "Broke by Friday LIVE" — a Gen-Z personal-finance classroom game. Students (on phones) make money choices over a simulated month; the **teacher's screen is a projector** the whole class watches.
- **These 4 visuals appear on the REVEAL screen** after each round, in a **2×2 grid**. Each panel is roughly **560–640 px wide × 300–360 px tall** on a 1280–1920px projector.
- **Aesthetic:** dark, neon, playful "game-show" energy — but **premium, not childish**. Readable from the back of a classroom (big numbers, high contrast).
- They update **live** every round, so the design must work for **1 student up to ~40 students**.

## Brand tokens (use these exact values)
- Background: deep plum `#140a24` / panel `rgba(255,255,255,0.05)` with `1.5px` border `rgba(255,255,255,0.10)`, radius `24px`.
- Accents: pink `#ff2e93`, pink-soft `#f470a8`, lime `#50d890`, cyan `#5bbef0`, yellow `#ffd233`, purple `#9a7bf0`, red `#ff4757`, amber `#ffa94d`.
- Font: **Nunito**, weights 800/900 for everything bold.
- Text: white `#fff`, muted `rgba(255,255,255,0.55)`, faint `rgba(255,255,255,0.32)`.

## Data available to each visual (per round, live)
For every student we have: `name`, an emoji `avatar`, a `color` (hex), and:
- `cash` (wallet ₹), `jarred` (saved toward their goal ₹), `debt` + `friendDebt` (owed ₹)
- `netWorth` = cash + jarred − debt − friendDebt
- `vibes` (Mood, 0–100), `futureYou` (0–100), `stress` (0–100, **lower is better**)
- their dream `goal` ({name, target ₹, emoji}) and goal % saved
Plus class **averages** and **rankings** for each metric.

---

## The 4 visuals to redesign

### 1) 💸 Broke-o-Meter  →  metric: MONEY (net worth)
- Show a **ranked leaderboard / bar race** of students by net worth (richest on top, 👑 leader).
- Each student's money is split into **saved (gold)** vs **wallet/spendable (blue)**; show **debt in red** ("owe ₹X").
- Call out a **"BROKE CLUB"** (anyone at/below ₹0).
- Must make it obvious at a glance **who's saving vs who's blowing it**.

### 2) 🪩 Class Mood Ring  →  metric: MOOD (avg vibes 0–100)
- A big **gauge/meter** showing the class **average mood**, on a **red → yellow → green** scale.
- Plus each student as a dot/marker so you can see the spread.
- A reactive **face/emoji** (😭 → 🤩) and a one-line vibe label.

### 3) 🔮 Future-You Forecast  →  metric: FUTURE-YOU (avg 0–100)
- A **"weather forecast"** metaphor: high avg = ☀️ sunny, low = ⛈️ storm (sun/clouds/rain/lightning).
- A headline ("bright futures ahead" / "future-you is in a STORM") + a tiny weather icon per student.
- This represents whether their choices are setting up a good future.

### 4) 🌋 Stress Volcano  →  metric: STRESS (avg 0–100, lower = calmer)
- A **volcano** that fills with lava / erupts as class stress rises (calm = dormant, high = ERUPTION).
- Big stress number; a "calmest in class" mini-list.

---

## What I need back (either is fine)
**Option A — drop-in code (best):** for each visual, an HTML+CSS+inline-SVG snippet (or a JS function) that takes the data above and renders. Vanilla JS, no frameworks/CDNs. I will wire in the live data.

**Option B — reference images/mockups:** 16:9 or 4:3 PNG mockups of each panel "in a good state" (e.g. 6 students). I'll rebuild them as live data-driven code to match.

**Constraints:** dark background, the brand tokens above, must stay legible at projector scale, must not rely on external fonts/images beyond Nunito, animations welcome (bar races, count-ups, eruptions) but must be CSS/SVG.

---

## Where everything lives (for reference)
- Game file: `CLAUDE/broke-by-friday-live.html` — the 4 functions are `panelMoney()`, `panelMood()`, `panelFuture()`, `panelStress()` (search for "THE 4 WACKY VISUALS"). Replacing those 4 functions swaps the visuals.
- Full engineering/brand guide: `CLAUDE/IFM Brand Guidelines 2026.docx`
- New-game + multiplayer build rules: `CLAUDE/IFM Add New Game Guide.docx`
