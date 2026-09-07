---
name: ifm-finish-game
description: Run the IFM design-system cleanup pass on a freshly-built game (colors, fonts, badges, inputs, nav, logos, spacing) and fix violations automatically. Use whenever the user says "polish/finish/clean up/format this game", "run the finish pass", "make it match the brand", or after any new game/calculator HTML is built and functionally working, before it's considered done.
---

# Finish Game — IFM aesthetic cleanup pass

Purpose: catch the same handful of aesthetic/formatting mistakes every time,
automatically, instead of the user having to spot and describe each one by
hand per game. This is a **mechanical audit + fix**, not a redesign — don't
change layout or gameplay logic, only bring the file(s) into line with the
checklist below.

## 0. Scope

Ask (or infer from context) which file(s) to run this on — usually one game
under `CLAUDE/<game-name>/` (index.html + engine.js/host-view.jsx/styles.css
or player-view.jsx, or a single-file calculator HTML). If unclear, ask the
user which file/folder just got built or edited.

## 1. Checklist — walk every item against the target file(s)

### Fonts
- [ ] Google Fonts loaded for **Nunito** (400,600,700,800,900) and **Lora**
      (italic 600) — body/UI = Nunito, headings/card titles = Lora italic 600.
  - Exception: LTM Live / Fund Manager LIVE use Sora+Inter dark "control room"
    theme — don't force Nunito/Lora onto those.
- [ ] No system-font fallback stacks left in as the primary (`-apple-system`,
      `Segoe UI` etc. as the *first* font) — Nunito/Lora (or Sora/Inter) must
      be first in the stack.

### Colours
- [ ] No hardcoded hex colours in CSS/inline styles that duplicate a brand
      colour — must reference the CSS variable instead.
- [ ] `:root` defines (or inherits from a shared stylesheet):
      `--teal:#2a9d8f; --navy:#1a3a5c; --ink:#1a3a5c; --muted:#5a7d8a;
      --cream:#f7faf9; --mint:#bde9e4; --mint-lt:#e0f3f0;`
- [ ] `--teal` is exactly `#2a9d8f` everywhere (watch for drift to
      `#0e7a6e`/other teals) unless the game has an explicitly approved
      alternate theme (e.g. LTM dark theme).

### Inputs (if the game has numeric inputs)
- [ ] Input box always displays full Indian-formatted number (`1,00,000`,
      never `100000` or `1L` inline) — via `indianFormat(num)` on keystroke.
- [ ] Reading the value back uses `parseShorthand(val)`, never a raw
      `el.value` mutation to show shorthand.
- [ ] Shorthand badge (`.sh-badge`) placement matches context: LEFT for
      horizontal row/table inputs, BELOW for centred card inputs, RIGHT for
      single-field forms.
- [ ] Badge is hidden when the field is empty/zero.
- [ ] In multi-column tables, `.sh-badge` is `position:absolute` inside a
      `position:relative` `.inp-wrap`, bottom-right — never a stray flex
      sibling that pushes columns out of alignment.

### Dynamic rows (if the game has add/remove rows)
- [ ] `flex-wrap: nowrap` on row containers.
- [ ] Column widths match the static header row exactly.
- [ ] Name/label inputs use a transparent border, visible only on
      hover/focus.

### Nav / structure
- [ ] Nav bar items are exactly the cards shown on the home screen, in the
      same order — no extra/missing entries.

### Logos
- [ ] In-app iframe header uses the round watermark logo.
- [ ] Game hero banner uses `.hero-logo-wide` + `PRINT_LOGO_SRC` (not the
      deprecated `ifm-logo-sq.png`).
- [ ] Any printable/report view uses the white-background IFM logo.

### TV / projector readability — DEFAULT ASSUMPTION for every screen
- [ ] **Default assumption: every screen in every game is viewed on a
      classroom projector/TV, by a student sitting 10–12 feet away** —
      not on their own phone up close. This applies even to single-player
      games (e.g. Debt Boss, calculators) played as a class on the shared
      screen, not just host-view/leaderboard/quiz screens. Only treat a
      screen as "close-up phone" scale when it's a confirmed
      **player-view.jsx in a multiplayer game** where each student is
      holding their own phone (Stock Rush, LTM Live, Fund Manager LIVE,
      Broke by Friday LIVE, KBC quiz player screens, etc.) — everything
      else defaults to projector scale.
  - Concrete floor: body/label text ≥ ~20px equivalent at 1x, stat
    numbers/percentages/headline results ≥ ~32–40px and bold, section
    headers clearly larger than body. If a screenshot of the screen looks
    "readable on a laptop" but the numbers/labels would blur into the
    background from 10+ feet away, it's too small — fix it. Small
    percentage/₹ labels stacked densely (like a results/leaderboard table)
    are the most common offender — check those specifically.
- [ ] Projected layout maximises use of the available screen width — no
      large dead margins or a narrow centred column stranded in a sea of
      background on a 16:9 TV. Content should stretch to use the width
      (grids/columns expanding, not a fixed mobile-width card floating in
      the middle).
- [ ] Key panels/cards on the projected view have a visible box/border
      (not just colour-on-colour or a soft shadow) — projectors wash out
      subtle contrast, so panel edges need to read clearly against
      whatever the panel is presented on/over.

### Scrolling — minimize everywhere, eliminate in popups
- [ ] Any popup/modal/overlay whose content can reasonably fit the viewport
      goes full-screen (or as close to it as the content needs) and is
      scroll-free — size it to its content and the viewport instead of
      capping its height and leaving a scrollbar. Only keep an internal
      scroll region if the content is genuinely unbounded (e.g. a long
      dynamic list) and even then prefer paging/collapsing over scrolling
      when practical.
- [ ] Across the game generally, look for avoidable scroll — content
      that overflows because of loose spacing, oversized gaps, or an
      uncapped stack of elements rather than actual content volume — and
      tighten it so the screen needs less scrolling to see everything.
      This applies to both the projected/host view and player phone views.

### Keyboard — spacebar advances
- [ ] Wherever the teacher/host has to click to advance to the next
      round/step or to dismiss a popup/modal, **spacebar does the same
      thing** (in addition to the click — don't remove the click target).
      Bind it to the primary "next/continue/got it/close" action currently
      on screen; don't let it fire on background elements or double-fire
      if a popup is already animating out. Scope the listener so it
      doesn't hijack spacebar while the teacher is typing in a text input.

### Back button — every screen
- [ ] Every screen has a way to go back (previous screen / main menu),
      unless doing so would let the teacher/student re-answer a question
      or re-see a reveal after the "right answer"/outcome is already
      shown — i.e. going back would let them redo a decision with
      information they weren't supposed to have yet. That's a flow
      question, not a formatting one: **don't add or remove a back
      button as an auto-fix** — if a screen is missing one, flag it to
      the user with a screenshot and ask whether going back there is
      safe, rather than deciding yourself.

### Multi-round classroom games only (host-view + player-view pattern)
- [ ] Round-transition popups render the view (leaderboard/ticker/news/feed)
      from a **frozen `structuredClone` snapshot**, not live engine state,
      while the popup is open — see the frozen-display-state pattern. Live
      engine state stays wired to the header (timer/room code) and to the
      popup itself.
- [ ] Popup has a fade-out + slide exit (~260ms), not a snap-unmount.
- [ ] Any header/news element that only appears in round 2+ reserves its
      round-1 empty-state min-height so nothing jumps.

## 2. Functional pass — actually click through the game

Before/alongside the aesthetic fixes, verify the game still *works*: open it
in the browser preview and click every button, option, and interactive
element at least once per screen (allocation controls, quiz options, next/
continue/replay/back buttons, popups opening and closing, nav tabs). Note:
if the file loads via a wrapper iframe (`srcdoc`/empty `src` pattern), the
outer page's accessibility tree won't see the game's controls — reach into
`iframe.contentDocument` (see the browser tools) rather than concluding
nothing is clickable. Confirm:
- [ ] Every button actually does something (no dead clicks, no console
      errors on click).
- [ ] The game can be played start to finish without getting stuck.
- [ ] Popups open and close correctly, including via any close/back control.

Fix anything genuinely broken (a dead button, a JS error) the same way as
checklist items — directly, unless the fix would itself be one of the
"big changes" below, in which case flag it instead.

## 3. Fix, don't just report

For each checklist item that fails: fix it directly in the file(s) using
Edit. Keep diffs minimal and scoped to the violation — don't refactor
unrelated code. If a fix requires a judgment call that changes intended
behaviour (e.g. genuinely ambiguous badge placement for a novel layout),
ask the user instead of guessing.

**Never make a "big" change on your own** — anything that would alter game
flow, interaction/UX, or structural layout (reordering screens, resizing
a core panel's proportions, changing how a round/turn progresses, swapping
a component's position) is OUT OF SCOPE for auto-fix, even if it's the
"correct" fix for a checklist item. Leave it as-is, note it, and surface it
to the user instead of silently applying it.

When flagging one of these to the user, don't just describe it in text —
render the issue visually so they can actually see what you're flagging
before deciding (e.g. a quick screenshot/render of the current state via
the browser preview tools, a before/after mockup, or an SVG/HTML sketch of
the proposed change through `mcp__visualize__show_widget`). Ask them to
choose; do not proceed until they do.

## 4. Report

After fixing, give a short pass/fail summary: what was already compliant,
what was fixed (file:line), and anything skipped that needs the user's
input. Do not deploy — deploying is a separate, explicit step (`vercel
deploy --prod` from inside `CLAUDE/`, per [[feedback_vercel_deploy_cwd]]).
Ask before deploying.

## 5. Keep this checklist current

If the user corrects something this pass missed, or a new recurring rule
comes up, add it to this file's checklist directly (Edit) — don't just fix
the one instance. This file is the single source of truth for the
mechanical cleanup pass; the canonical narrative doc is still
"IFM Brand Guidelines 2026.docx" in the CLAUDE folder for anything this
checklist doesn't yet cover.
