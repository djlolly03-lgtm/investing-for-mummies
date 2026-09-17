# IFM Content DAM --- V1 Design & Build Specification

**Status:** Build specification\
**Product:** IFM Content DAM / IFM OS\
**Primary user:** Aakara and the content/creative team\
**Primary job:** Find, understand, preview and retrieve the exact IFM
asset without needing to ask Sakshi.\
**Implementation target:** `CLAUDE/content/v1-prototype/`\
**Canonical location of this document:** `CLAUDE/content/v1-prototype/SPEC.md`, beside the
code it governs and its own `references/` pack. Version-controlled, and blocked from the
deploy by the `*.md` rule. Copies in Downloads or Dropbox are working copies, not the spec.\
**Production rule:** Do not modify the existing live hub until this
specification has been implemented, reviewed and accepted.

------------------------------------------------------------------------

# 1. What We Are Actually Building

We are building a **Digital Asset Management system for IFM content**.

The interface may be premium, visual and easy to use, but the product
itself remains a DAM. Its job is operational: organise a growing library
of videos, images, carousels, certificates, workshop footage,
testimonials, Hiral footage, AI-generated footage and other content so
that the team can find the right asset without relying on someone's
memory.

The organising principle is:

> **Replace "someone remembers" with "the system does it."**

Do not turn the product into a marketing site, chatbot, AI playground,
content calendar, analytics dashboard, project-management tool or
generic SaaS dashboard.

### The critical distinction

**Functionally:** DAM, searchable content library, metadata-backed asset
organisation, preview, retrieval and Drive access.

**Visually:** premium, editorial, calm, image-led, simple, modern and
content-first.

We are not removing DAM functionality to make the product "less
database-like". We are removing unnecessary **database/admin
aesthetics** while preserving the actual DAM.

------------------------------------------------------------------------

# 2. The Problem

IFM content comes from multiple sources:

-   Hiral's workshops
-   Sakshi's class shoots
-   Aakara's agency work
-   IFM / in-house work
-   External material
-   AI-generated footage

Historically, assets ended up in different Drive folders and were
primarily discoverable through people's memory. This created real
operational problems: dozens of files can come from one class, finished
work can be missed by the index, older shoots can have weak tagging, and
the person who created or stored the asset becomes an unnecessary
dependency.

The DAM exists to remove that dependency.

Target behaviour:

1.  Aakara knows roughly what she needs.
2.  She describes it naturally.
3.  The system interprets the request.
4.  The DAM searches structured metadata plus content understanding.
5.  Relevant assets appear visually.
6.  Aakara recognises the correct asset.
7.  She previews it.
8.  She opens the actual Drive asset.
9.  Sakshi is not required.

------------------------------------------------------------------------

# 3. V1 Success Criterion

There is one primary acceptance criterion:

> **Can Aakara find the exact IFM asset she wants without talking to
> Sakshi?**

Everything else is secondary.

Do not optimise V1 for feature count, technical sophistication, AI
branding, dashboards, analytics, animations or visual novelty.

If a simpler interface helps asset retrieval, the simpler interface
wins.

------------------------------------------------------------------------

# 4. Existing Architecture --- FREEZE IT

The existing underlying system has already been built and validated. The
frontend redesign must not become an excuse to rebuild it.

Current architecture:

``` text
Google Drive / content sources
        ↓
AI analysis / enrichment
        ↓
Controlled metadata + searchable content
        ↓
data.js + human-owned Catalogue sheet
        ↓
validated search / ranking
        ↓
DAM frontend
```

The implementation is intentionally simple:

-   single self-contained HTML
-   no framework requirement
-   no server requirement
-   no application database
-   Google Sheets as human-owned catalogue
-   machine-generated `data.js`
-   Drive as underlying asset storage

The reason is operational reliability: no unnecessary build system,
database or browser authentication dependency.

### Hard rule

If a visual or UX request appears to require changing the search engine,
taxonomy, catalogue, enrichment pipeline or data model:

> **STOP. Do not make the change. Report the dependency first.**

------------------------------------------------------------------------

# 5. What Is Frozen

The following are not frontend design tasks:

-   taxonomy
-   controlled vocabulary
-   catalogue structure
-   `data.js`
-   transcript data
-   search indexing
-   search scoring
-   IDF/ranking foundations
-   word-boundary matching
-   constraint logic
-   relevance cutoff
-   weaker-match logic
-   synonym logic
-   Drive integration
-   asset IDs
-   asset metadata
-   media mapping
-   validated search results
-   existing regression suite

The approved search engine is a dependency of the frontend, not a
component to "improve" during visual work.

------------------------------------------------------------------------

# 6. V1 Taxonomy

## Type

-   Video
-   Image
-   Carousel

## Format

-   Hiral Speaking
-   Testimonial
-   Classroom Moment
-   Student Question
-   B-roll
-   Portrait
-   Certificate
-   Social Graphic
-   Social / Promotional

Rules:

-   Hiral Teaching is collapsed into **Hiral Speaking**.
-   AI Footage is not a Format; use `Source = AI Generated`.
-   B-roll means supporting footage and can be real or AI-generated.
-   Posed group photos are **Classroom Moment**.
-   Logos and playable games are excluded from the V1 Library view but
    remain in the catalogue/Drive.

## Topic

### Money

Managing Money; Saving; Saving vs Investing; Financial Planning; Wealth;
Money Mindset; Money Conversations; Financial Independence; Women &
Money; Family & Money.

### Investing

Investing; 3-Bucket Investing; Compounding; Asset Allocation;
Diversification; Risk & Returns.

### Insurance

Insurance.

### Asset Classes

Stocks / Equity; Mutual Funds; ETFs; Fixed Income; Real Estate / REITs;
Gold; Silver; PMS / AIFs.

### Markets

Stock Market; IPOs; Markets & Economy; Inflation & Interest Rates.

## Person

-   Hiral
-   Student
-   Other Person
-   No Person

Multiple values may apply. Sakshi, Aakara and Aditya are **Sources**,
not Person values.

## Source

-   Sakshi
-   Aakara
-   IFM / In-house
-   External
-   AI Generated
-   Unknown

Do not infer Source when evidence does not exist.

## Session

Optional. Examples: `Mums Batch — 26 Aug`, `Corporate — 4 Jul`,
`Goa Workshop`, `August Content`.

## Status

-   Raw
-   Ready
-   Published
-   Do Not Use

For V1, In Production and On Hold map to Raw. Status is
human-controlled.

------------------------------------------------------------------------

# 7. Metadata vs Searchable Understanding

The taxonomy is the structured DAM backbone. It is not the only
searchable information.

The system may also use:

-   transcript
-   AI description
-   searchable concepts
-   filename
-   slide text
-   visual understanding
-   speech-derived terms
-   contextual keywords

These are search signals, not permission to invent new taxonomy fields.

Example: an asset can have `Topic = Mutual Funds` while its transcript
contains SIP, STP, SWP and XIRR. A search for "XIRR" must still be able
to find it.

------------------------------------------------------------------------

# 8. Search Philosophy

Search is the main interaction of the DAM.

Supported natural-language requests include:

-   "Find a video of Hiral talking about gold"
-   "Find funny classroom moments"
-   "Find student testimonials"
-   "Find the clip where Hiral explains SIP"
-   "Find gold B-roll"
-   "Find content about financial independence"
-   "Find the video where Hiral talks about XIRR"
-   "Show me the August certificates"

Architecture:

``` text
User request
      ↓
LLM interpretation layer
      ↓
Structured constraints + controlled vocabulary
      ↓
Existing validated search engine
      ↓
Ranking
      ↓
Visual results
```

The interpretation layer can identify intent, map subjects to controlled
Topics, identify Format/Person/Source/Session constraints, remove
conversational filler and preserve free search concepts such as XIRR or
"percentage".

It must never invent taxonomy values.

The AI is invisible infrastructure. Do not expose an "AI assistant" UI.

------------------------------------------------------------------------

# 9. The DAM Information Architecture

V1 primary experience:

``` text
IFM OS
└── Library
      ├── Search
      ├── Results
      ├── Filters
      └── Asset Detail
```

The broader IFM OS may eventually include Home, Workflow, Performance,
Market Watch and Settings, but do not expand V1 into those areas unless
explicitly approved.

The Library is the daily working surface.

------------------------------------------------------------------------

# 10. Empty Library

The starting state should make the search action obvious.

Include:

-   restrained IFM OS identity
-   clear search prompt
-   one dominant search field
-   a few useful example searches
-   generous whitespace

Suggested heading:

> **What are you looking for?**

Examples:

-   Hiral talking about gold
-   Funny classroom moments
-   August certificates

Only a few examples. Do not create a wall of chips or turn the empty
state into a marketing landing page.

------------------------------------------------------------------------

# 11. Search Results

Example:

> Hiral talking about gold

Result hierarchy:

``` text
IFM OS

[ Hiral talking about gold                         ] [Filters]

Relevant results

┌───────────┐  ┌───────────┐  ┌───────────┐
│ thumbnail │  │ thumbnail │  │ thumbnail │
└───────────┘  └───────────┘  └───────────┘
Title          Title          Title
Hiral · Apr    Hiral · Apr    Hiral · Apr
```

The important visual hierarchy is:

> **IMAGE → SHORT TITLE → QUIET CONTEXT**

Each result should communicate:

-   real thumbnail
-   short title
-   one useful contextual line
-   subtle type indication where useful
-   clickability

Do not expose relevance scores, internal ranking, IDF, long descriptions
or every taxonomy field in the result surface.

### Result density

Desktop target: approximately 3 columns, with thumbnails large enough to
distinguish similar workshop assets. Do not use tiny thumbnails.

For broad queries such as "funny classroom moments", strongest relevant
results appear first. Weaker matches may be exposed through **Show
weaker matches**. Do not arbitrarily cap the result set.

------------------------------------------------------------------------

# 12. Filters

Filters remain part of the DAM. They are secondary, not removed.

Available filters:

-   Type
-   Format
-   Topic
-   Person
-   Source
-   Session
-   Status

Desktop: expose through one compact **Filters** control.

Mobile: use a compact drawer/sheet/dropdown.

Do not display all filters permanently.

Do not remove useful DAM functionality merely because it resembles a
database.

------------------------------------------------------------------------

# 13. Asset Detail

Opening an asset should feel like opening the actual content, not
opening a database record.

Desktop structure:

``` text
┌─────────────────────────────────────────────────────┐
│                                                     │
│  MEDIA                         TITLE                │
│  large preview                 description          │
│                                                     │
│                                 metadata             │
│                                 metadata             │
│                                                     │
│                                 OPEN IN DRIVE       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Use a centred modal, approximately `max-width: 1080px`, with a
two-column inner layout around `1.15fr 1fr`.

Media occupies roughly 55%; metadata is secondary.

Do not use a right-edge slide-over drawer as the primary detail
composition, and do not stack giant metadata blocks underneath the
media.

### Detail metadata

Useful fields can include:

-   Title
-   Type
-   Format
-   Topic
-   Person
-   Source
-   Session
-   Status

Only show populated fields. Never show placeholder rows such as "not
recorded" or "unknown" when there is no useful value; omit the field
instead.

------------------------------------------------------------------------

# 14. Media Integrity --- P0

The UI must never imply that an asset is playable video unless an actual
playable video exists.

### Actual playable video

-   thumbnail
-   subtle play indicator
-   real playable video in detail
-   actual controls

### Image

-   image only
-   no play icon
-   no video controls

### Carousel

-   cover image
-   no play icon
-   identify as carousel in detail

### Video record without playable master

-   still/thumbnail
-   no play icon
-   no fake player
-   "Video preview unavailable"
-   Open in Drive

Never infer playback from Type, filename or thumbnail appearance.

------------------------------------------------------------------------

# 15. Media Aspect Ratio

Do not place every asset into a fixed landscape box.

Portrait assets must not be pillarboxed inside a giant landscape frame.

The media box should respect the actual asset ratio. A suitable starting
point is:

``` css
max-height: 70vh;
width: auto;
object-fit: contain;
```

The visual content, not the empty frame, should dominate.

------------------------------------------------------------------------

# 16. Primary Action

The primary action is:

> **Open in Drive**

Use IFM navy. Make it obvious in detail, including mobile. Do not bury
it beneath unnecessary metadata.

------------------------------------------------------------------------

# 17. Search State Behaviour

When a new search is performed:

-   close the open detail view
-   display new results
-   retain the query
-   apply relevant filters

Clearing search must work. Clearing filters must work.

A stale detail modal must never remain over a new result state.

------------------------------------------------------------------------

# 18. No Results

For a query such as:

> purple elephant

show:

> **No matching content found.**

Then offer:

> Try a different search or clear your filters.

Do not return vaguely related content. Trust is more important than
filling the screen.

------------------------------------------------------------------------

# 19. Mobile

Target width: **375px**.

Mobile is an intentional layout, not compressed desktop.

Hierarchy:

``` text
IFM OS
↓
Search
↓
Filters
↓
Results
```

The first real content should appear quickly.

Do not use:

-   giant empty hero
-   developer banner
-   excessive introductory copy
-   nine example chips
-   six visible dropdowns
-   horizontal scrolling

Mobile detail order:

1.  Back
2.  Media
3.  Title
4.  Useful description
5.  Primary metadata
6.  Open in Drive

Open in Drive must not be buried below a huge metadata stack.

------------------------------------------------------------------------

# 20. Desktop Layout

Render and inspect at:

-   1440px
-   1024px
-   768px

At 1440px:

-   restrained page width
-   generous whitespace
-   3-column visual gallery
-   contained search group
-   clear hierarchy

The search group should be around 760px rather than becoming a
full-width utility bar.

------------------------------------------------------------------------

# 21. Header / Masthead

Use a restrained:

> **IFM OS**

Do not repeat long explanatory taglines on every result screen.

This is an internal product, not a marketing landing page.

------------------------------------------------------------------------

# 22. Hero / Empty-State Imagery

If the approved storyboard uses a desktop hero image:

-   keep it inset and restrained
-   do not let it dominate the search action
-   reduce or remove it on mobile when it delays search/results

The empty state exists to start retrieval, not to sell the product.

------------------------------------------------------------------------

# 23. Visual Design System

Use the established IFM palette:

``` text
IFM Navy      #0C548E
Warm Ivory    #FCFAF7
Soft Cream    #F7F1E8
Stone         #E9E2D8
Muted Gold    #E5C76B
Charcoal      #24313F
```

Typography:

-   Lora for editorial/display moments
-   Inter / Aptos-like refined sans-serif for UI/body

The feel should be premium, warm, editorial, calm, intelligent, minimal,
confident and content-first.

------------------------------------------------------------------------

# 24. What to Avoid

Do not use:

-   generic SaaS dashboard aesthetics
-   dashboard widgets
-   giant dashboard cards
-   gradients
-   glows
-   excessive shadows
-   excessive rounded cards
-   excessive pills
-   bright multi-colour UI
-   giant coloured buttons
-   technical icons everywhere
-   visible relevance scoring
-   dense spreadsheet-style tables as the primary discovery surface
-   CRM aesthetics
-   admin-console aesthetics
-   developer banners
-   implementation language
-   excessive introductory copy
-   excessive filter controls
-   fake AI interface elements
-   chatbot bubbles
-   "Ask AI" gimmicks
-   fake video controls
-   fake duration labels
-   fake play icons

------------------------------------------------------------------------

# 25. What Must NOT Be Removed

Do not remove useful DAM functionality merely because it looks less
"premium". Keep:

-   search
-   filters
-   structured metadata
-   Type
-   Format
-   Topic
-   Person
-   Source
-   Session
-   Status
-   asset preview
-   asset detail
-   Open in Drive
-   real media playback
-   no-results handling
-   relevance logic
-   weaker-match handling
-   status visibility where useful
-   underlying catalogue
-   Drive integration

The objective is not "make it pretty". The objective is:

> **Make a real DAM dramatically easier and more pleasant to use.**

------------------------------------------------------------------------

# 26. Do Not Invent Features

Unless explicitly approved, V1 does not include:

-   collections
-   saved searches
-   favourites
-   comments
-   approvals
-   assignments
-   content calendar
-   campaign management
-   analytics dashboards
-   competitor intelligence
-   workflow automation
-   publishing
-   AI chat
-   prompt history
-   user profiles
-   complex permissions
-   bulk editing
-   advanced admin tools
-   command-key interface
-   gallery/list toggle

Do not add features because they seem "cool".

------------------------------------------------------------------------

# 27. DAM Workflow

Underlying workflow remains:

``` text
Shared Drive
     ↓
Daily processor / AI analysis
     ↓
Suggested metadata
     ↓
Human correction
     ↓
Catalogue
     ↓
DAM Library
     ↓
Aakara retrieves asset
     ↓
Open actual Drive file
```

Drive remains the file store. The DAM is the discovery and organisation
layer.

------------------------------------------------------------------------

# 28. AI Tagging Rules

AI may suggest metadata but must choose only from controlled vocabulary.

It must never invent new taxonomy values.

Example:

Wrong:

``` text
Topic = Gold Jewellery Investing
```

Correct:

``` text
Topic = Gold
Search concepts = jewellery, gold jewellery, ornaments
```

Human correction wins for human-owned fields. Status remains
human-controlled.

------------------------------------------------------------------------

# 29. Search Canary Tests

The frontend must preserve these validated searches:

``` text
gold
gold investments
gold jewellery
gold b-roll
funny classroom
Hiral explains SIP
purple elephant
portrait
XIRR
CAGR
ETF
REIT
insurance
August certificates
```

For each release, verify:

-   result count
-   top result IDs
-   ordering where applicable
-   no-result behaviour

The frontend must not alter search results.

------------------------------------------------------------------------

# 30. Controlled Claude Build Process

Do not give Claude a vague instruction such as "redesign the page".
Claude must work in the following phases and stop between phases.

## PHASE 0 --- READ AND FREEZE

Before changing code, Claude must read:

1.  this specification
2.  the approved storyboard
3.  the current frontend
4.  existing search implementation
5.  data structure
6.  media mapping

Claude must then report:

-   what the product is: **a DAM/content library**
-   who the primary user is
-   the user job
-   what is frozen
-   what will change
-   what will not change

**No code before this confirmation.**

## PHASE 1 --- AUDIT

Render the current interface at 1440, 1024, 768 and 375px.

Inspect actual screenshots, not just CSS.

Report the five largest problems across:

-   layout
-   hierarchy
-   search
-   results
-   detail
-   mobile
-   media integrity
-   typography
-   whitespace
-   metadata density
-   brand

**No code during the audit.**

## PHASE 2 --- STRUCTURE

Implement only:

-   restrained empty state
-   dominant search
-   visual result gallery
-   compact Filters control
-   centred two-column detail modal
-   media-first mobile detail

Do not add functionality.

## PHASE 3 --- REAL CONTENT

Use real IFM assets. Do not use invented placeholder imagery when actual
assets are available.

The user must be able to distinguish classroom moments, Hiral footage,
testimonials, certificates, portraits, B-roll and gold visuals.

## PHASE 4 --- MEDIA INTEGRITY

Audit actual media mapping:

-   asset ID
-   Type
-   thumbnail
-   actual media
-   playable or not
-   image/video/carousel
-   current frontend behaviour

Do not guess URLs or playback capability.

## PHASE 5 --- FUNCTIONAL QA

Test:

-   search
-   clear search
-   filters
-   clear filters
-   result click
-   detail open/close
-   new search closes detail
-   image preview
-   carousel preview
-   video preview
-   Open in Drive
-   no results
-   mobile navigation

## PHASE 6 --- VISUAL QA

Render 1440, 1024, 768 and 375px.

Compare against the approved storyboard for:

1.  composition
2.  search proportion
3.  result density
4.  thumbnail scale
5.  whitespace
6.  typography
7.  metadata restraint
8.  detail layout
9.  mobile hierarchy
10. brand consistency

## PHASE 7 --- USER TASK TEST

Run:

> I need a video of Hiral talking about gold.

> I need some funny classroom footage.

> I need the August certificates.

For each, ask:

-   Can the user understand the page without instructions?
-   Can they search immediately?
-   Can they recognise the correct result?
-   Can they preview it?
-   Can they open the actual Drive file?

------------------------------------------------------------------------

# 31. Iteration Rules

Maximum **5 meaningful visual iterations**.

For each iteration:

1.  Render.
2.  Inspect.
3.  Identify the three biggest remaining problems.
4.  Fix only those.
5.  Render again.
6.  Compare against the previous version.
7.  Keep or revert based on actual improvement.

If an iteration is worse, revert it.

If two consecutive iterations produce no meaningful improvement, stop.

Do not endlessly tweak.

------------------------------------------------------------------------

# 32. Claude Self-Critique Before Commit

Claude must answer:

### Product

-   Is this still a DAM?
-   Does this make finding content easier?

### UX

-   Can Aakara search immediately?
-   Are results visually understandable?
-   Is the next action obvious?

### Visual

-   Does media lead?
-   Is the page too dense?
-   Is there unnecessary chrome?
-   Does it look like an admin tool?

### Functional

-   Did anything change outside the frontend?
-   Did search results change?
-   Did media behaviour change?

### Mobile

-   Does 375px work intentionally?
-   Is useful content visible immediately?
-   Is Open in Drive accessible?

------------------------------------------------------------------------

# 33. Change-Control Rules

Claude must not independently introduce product changes because they
"would be better".

### Allowed without additional approval

-   spacing
-   typography
-   visual hierarchy
-   layout
-   responsive behaviour
-   thumbnail sizing
-   modal composition
-   colour refinement within approved palette
-   button styling
-   metadata presentation
-   search-field presentation
-   filter presentation

### Requires explicit approval

-   new taxonomy field
-   new filter
-   new screen
-   new workflow
-   new AI feature
-   new data source
-   new backend
-   new storage
-   new permissions model
-   new user role
-   new search behaviour
-   new ranking logic
-   changes to the catalogue/data model

------------------------------------------------------------------------

# 34. Repository Rules

Work only in:

``` text
CLAUDE/content/v1-prototype/
```

Do not modify the live hub during design development.

Do not modify `CLAUDE/content/index.html` unless explicitly instructed
after approval.

Do not fork the dataset unnecessarily.

Do not modify the validated search engine to make the UI look better.

------------------------------------------------------------------------

# 35. Required Deliverables

Claude must provide:

## Working frontend

Implemented in `CLAUDE/content/v1-prototype/`.

## Screenshots

At minimum:

-   1440px empty state
-   1440px search results
-   1440px broad search
-   1440px no results
-   1440px video detail
-   1440px image/carousel detail
-   375px mobile

## Design-change summary

Meaningful changes expressed as:

``` text
Before → After
```

## Functional regression report

Confirm:

-   search canaries
-   no-results behaviour
-   media integrity
-   Drive links
-   image/video/carousel preview

## Remaining compromises

Explicitly list unresolved issues. Do not hide them.

------------------------------------------------------------------------

# 36. Definition of Done

## DAM functionality

-   [ ] Assets searchable.
-   [ ] Filters work.
-   [ ] Metadata intact.
-   [ ] Asset detail works.
-   [ ] Drive retrieval works.
-   [ ] Status remains available.
-   [ ] Media behaviour is honest.

## Discovery

-   [ ] Natural-language requests work.
-   [ ] Visual recognition is easy.
-   [ ] Search is immediately obvious.
-   [ ] Results do not feel like database rows.
-   [ ] Similar assets are distinguishable.
-   [ ] No-results are trustworthy.

## Visual

-   [ ] IFM identity is clear but restrained.
-   [ ] Media leads.
-   [ ] Whitespace is generous.
-   [ ] Metadata is secondary.
-   [ ] Detail is centred and two-column on desktop.
-   [ ] No arbitrary pillarboxing.
-   [ ] Mobile is intentionally designed.

## Product discipline

-   [ ] Still clearly a DAM.
-   [ ] Does not feel like an admin console.
-   [ ] Does not feel like a chatbot.
-   [ ] Does not feel like a generic SaaS dashboard.
-   [ ] No unapproved features.

## User outcome

-   [ ] Aakara can understand it without training.
-   [ ] Aakara can find gold content.
-   [ ] Aakara can find classroom content.
-   [ ] Aakara can find certificates.
-   [ ] Aakara can preview content.
-   [ ] Aakara can open the actual Drive file.
-   [ ] Aakara does not need Sakshi.

------------------------------------------------------------------------

# 37. Final Mental Model

``` text
                         IFM CONTENT DAM
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
        DISCOVERY LAYER                     DAM BACKBONE
              │                                   │
      Natural-language search              Controlled taxonomy
              │                             Human metadata
      Visual result gallery                 Status
              │                             Source
      Preview / recognition                 Session
              │                             Format
      Asset detail                          Topic
              │                             Person
      Open in Drive                         Type
              │
              └───────────────┬───────────────────┘
                              │
                         Google Drive
                         actual assets
```

The correct mental model is:

> **A real DAM underneath. A dramatically better experience on top.**

Do not lose that distinction.

---

# 52. Visual Reference Pack — Read This Before Designing

This specification is distributed with a `references/` folder. Claude must inspect these images before making any visual changes.

> **Corrected 17 Sep 2026.** As originally written this section named nine files, of which
> exactly one existed — and it sat elsewhere, under a different name. Because §54 Stage 1
> makes reading all nine mandatory, the protocol could not be started. The folder now
> exists at `CLAUDE/content/v1-prototype/references/` and the list below describes the
> files that are actually in it. The canonical home of both this document and the pack is
> the repository, not a Downloads folder.
>
> The pack is blocked from the Vercel deploy (`content/v1-prototype/references/` in
> `CLAUDE/.vercelignore`). Without that line every image here would be a public URL,
> because `*.png` is not otherwise blocked.

## Reference hierarchy

Use the references in this order:

### Priority 1 — Approved storyboard

```text
references/01_APPROVED_STORYBOARD.png
```

Verified `md5 c75920fa2fc5e0bd00f743a9afbbec0f`, byte-identical to `image1.png` extracted
from `IFM_OS_Final_Frontend_Redesign_Storyboard_and_Claude_Prompt.docx`. It is the seven-panel
IFM OS board — empty state, "gold" results, "funny classroom moments", no-results, video
detail, image/carousel detail, mobile 375 — plus Key Design Principles, Critical Functional
Requirements and the FIX THIS ISSUE panel.

It is **not** the older six-panel "IFM Content Library — Visual Storyboard"
(`md5 9f2c97c1…`) from the earlier brief. If you find that image, it is superseded.

This is the primary visual source of truth for the intended V1 frontend.

Use it to evaluate:

- page composition
- visual hierarchy
- search placement
- result gallery
- detail layout
- mobile hierarchy
- typography scale
- whitespace
- metadata restraint
- overall product character

The storyboard is a direction reference, not permission to copy every inaccurate detail. If the storyboard conflicts with actual media reality, **media reality wins**.

For example, if the storyboard displays a play icon on an asset that is actually an Image, do not reproduce the incorrect play icon.

### Priority 2 — Current implementation screenshots

```text
references/05_CURRENT_EMPTY_STATE_DESKTOP.png   1440 x 900   empty state
references/06_CURRENT_SEARCH_RESULTS.png        1440 x 900   "Hiral talking about gold"
references/07_CURRENT_DETAIL_VIEW.png           1440 x 900   video detail modal, open
references/08_CURRENT_MOBILE_OR_RESULTS.png      375 x 812   mobile results
references/09_CURRENT_BROWSE_LIBRARY.png        1440 x 900   browse, sectioned by Format
references/10_CURRENT_NO_RESULTS.png            1440 x 900   "purple elephant"
```

Captured from the live production build on 17 Sep 2026 at deviceScaleFactor 2, so they
show what Aakara actually sees, not a local working tree.

`09` replaces the originally-listed `09_CURRENT_SINGLE_RESULT.png`, which never existed. A
single result card is legible inside `06`; the browse surface is not represented anywhere
else and is the more useful reference.

Re-capture these whenever the frontend changes materially, or they quietly become a record
of a product that no longer exists.

These images show the existing implementation and are used to identify what needs to change.

They are not the visual target.

Do not simply make minor CSS adjustments to these screens. Use them to understand:

- current layout
- current information density
- current media behaviour
- existing interaction patterns
- what must be retained functionally
- what must be materially improved visually

### Priority 3 — Design exploration references

```text
references/02_REFERENCE_EDITORIAL_DAM_DIRECTION.png   NOT SUPPLIED
references/03_REFERENCE_LAYOUT_EXPLORATION.png        NOT SUPPLIED
references/04_REFERENCE_PRODUCT_COMPOSITION.png       NOT SUPPLIED
```

**None of these three exists.** They are left in the numbering as reserved slots so that
01 and 05–10 keep stable names, and so that a future exploration board has an obvious home.

Do not invent them. Do not substitute a generated mood board, and do not treat an absent
reference as licence to improvise a direction — §53 already ranks exploration below the
approved storyboard, and an exploration board that does not exist ranks below that again.
The storyboard plus real IFM assets are sufficient to design from.

If supplied later, these are exploratory references only.

They may inform:

- editorial composition
- spacing
- hierarchy
- image treatment
- overall polish

They must not override the approved storyboard, the DAM requirements, real IFM content, or the frozen architecture.

Do not copy decorative features merely because they appear in an exploration image.

---

# 53. Reference Interpretation Rules

Claude must not treat all reference images as equally authoritative.

Before coding, create a small table:

| Reference | What it is used for | What it is not used for |
|---|---|---|
| Approved storyboard | Primary visual direction | Permission to reproduce inaccurate media controls |
| Current screenshots | Audit and comparison | Visual target |
| Exploration boards | Inspiration for polish and composition | Product requirements |
| Actual IFM assets | Reality check for content display | Placeholder decoration |

The approved storyboard governs the visual direction.

The actual data and media files govern truth.

This specification governs product scope and functional behaviour.

If these appear to conflict, resolve them in this order:

1. Actual media truth and functional integrity
2. Frozen DAM/search/data requirements
3. This specification
4. Approved storyboard visual direction
5. Exploratory references

If a conflict cannot be resolved safely, stop and report it.

---

# 54. Mandatory Claude Operating Protocol

Claude must not operate autonomously from a single broad prompt.

Claude must work in explicit stages and wait for approval at the defined gates.

## Stage 1 — Read-only understanding

Claude must:

1. Read this entire document.
2. Open `references/01_APPROVED_STORYBOARD.png`.
3. Inspect every current screenshot in the reference folder — `05` through `10`.
   `02`–`04` are not supplied and are not a blocker; see §52 Priority 3.
4. Inspect the existing frontend.
5. Inspect the current data shape.
6. Inspect the search engine boundaries.
7. Inspect the media mapping.

Deliverable:

```text
UNDERSTANDING REPORT
- Product:
- Primary user:
- Primary job:
- Frozen systems:
- Allowed changes:
- Prohibited changes:
- Known media risks:
- Known visual problems:
- Files proposed for modification:
```

No code changes.

### Approval gate

Do not proceed until the report has been reviewed.

---

## Stage 2 — Current-state evidence

Claude must render the current page at:

- 1440 × appropriate height
- 1024 × appropriate height
- 768 × appropriate height
- 375 × appropriate height

Claude must save screenshots.

It must document:

- what currently works
- what currently fails
- what is visually weak
- what is functionally essential
- which problems are confirmed versus assumed

No redesign yet.

### Approval gate

Submit the audit before making changes.

---

## Stage 3 — Design plan

Claude must produce a proposed screen-by-screen plan covering:

1. Empty state
2. Search results
3. Broad search with weaker matches
4. No results
5. Image detail
6. Carousel detail
7. Playable video detail
8. Unplayable video detail
9. Mobile results
10. Mobile detail
11. Filters interaction

For each screen, specify:

- layout
- primary action
- visible information
- hidden information
- interaction behaviour
- responsive behaviour
- media rules
- what existing functionality it uses

No code yet.

### Approval gate

The plan must be approved before implementation.

---

## Stage 4 — Structural implementation

Implement only:

- page layout
- header
- search area
- results gallery
- filters access
- detail modal
- mobile structure

Do not simultaneously modify:

- search ranking
- taxonomy
- data.js
- metadata
- transcripts
- enrichment
- Drive integration
- backend
- catalogue

After implementation, provide screenshots.

---

## Stage 5 — Content and media integrity

Use actual IFM assets.

Test each media category separately:

- Image
- Carousel
- Playable Video
- Video without playable master

Provide a media integrity table:

| Asset ID | Metadata type | Actual media | Playable? | UI treatment | Pass/fail |
|---|---|---|---|---|---|

No asset may be marked playable based only on metadata.

---

## Stage 6 — Functional regression

Run the full approved search canary suite.

Compare before and after:

- result count
- top result IDs
- result ordering
- no-results behaviour
- filter behaviour

Also test:

- opening and closing detail
- new search while detail is open
- clearing search
- clearing filters
- Open in Drive
- real video playback
- image preview
- carousel preview
- mobile navigation

If any frozen behaviour changes, stop and revert.

---

## Stage 7 — Visual QA

Render the final candidate at:

- 1440px
- 1024px
- 768px
- 375px

Compare directly with the approved storyboard.

Claude must write:

```text
VISUAL QA REPORT
1. Biggest improvement:
2. Second biggest improvement:
3. Third biggest improvement:
4. Remaining mismatch:
5. Mobile issue:
6. Media issue:
7. Anything that became worse:
8. Revert required?:
```

The report must use screenshots, not general claims such as “looks much better”.

---

## Stage 8 — User-task test

Run the actual retrieval tasks:

1. “I need a video of Hiral talking about gold.”
2. “I need some funny classroom footage.”
3. “I need the August certificates.”

For each task, record:

- time to first search
- whether the user understands what to type
- whether the results are visually recognisable
- whether the correct asset can be opened
- whether preview is truthful
- whether Drive access is obvious
- whether filters are needed
- whether the user needs help

The goal is not to make the interface entertaining.

The goal is to make the task reliable and independent.

---

# 55. Required Screen Specifications

Claude must implement and test all of the following states.

## A. Empty state

Must include:

- IFM OS identity
- one dominant search field
- a small number of practical examples
- restrained composition
- no giant marketing hero
- no visible taxonomy wall

Must not include:

- a dashboard of widgets
- a long explanatory landing page
- excessive example chips
- unnecessary metrics
- a chatbot

## B. Results state

Must include:

- current query visible
- compact Filters access
- visual gallery
- short titles
- quiet contextual line
- real thumbnails
- subtle playable-video indication only where valid
- weaker-match treatment where supported

Must not include:

- visible ranking score
- internal IDs as the main title
- every metadata field on every card
- dense spreadsheet rows as the primary view
- fake duration
- fake play icon

## C. Detail state

Must include:

- centred desktop modal
- media-first composition
- two-column desktop layout
- responsive mobile layout
- title and useful context
- populated metadata only
- clear Open in Drive action
- accurate media treatment

Must not include:

- arbitrary fixed landscape media box
- large dead pillarboxed areas caused by layout
- a drawer that leaves a large unusable ghost of the results page
- metadata that overwhelms the asset
- placeholder rows for missing fields

## D. No-results state

Must include:

- clear no-match statement
- no invented related results
- simple recovery guidance
- clear way to change or clear the query

## E. Filters

Must remain available.

They should be secondary to search and visual browsing.

Filters must not be deleted merely to make the page look less like a database.

---

# 56. Required Visual Comparisons

Every final screenshot review must answer:

## Composition

- Is the page balanced?
- Is the search area proportionate?
- Is the content visible quickly?
- Is there unnecessary empty space?

## Discovery

- Can a user recognise an asset visually?
- Are thumbnails large enough?
- Are titles short and useful?
- Is context quiet but meaningful?

## DAM usability

- Can the user narrow results?
- Can the user understand the asset type?
- Can the user access the actual file?
- Is status available when needed?

## Detail

- Is the media dominant?
- Is the modal centred?
- Is the aspect ratio respected?
- Is the action visible?
- Are empty fields omitted?

## Mobile

- Does the first screen lead to search and results?
- Is there horizontal scrolling?
- Is the asset visible at a useful size?
- Is Open in Drive easy to reach?

---

# 57. Explicit “Do Not Drift” Checklist

Before every commit, Claude must confirm:

- [ ] This is still a DAM.
- [ ] The Library remains the main discovery surface.
- [ ] Filters remain available.
- [ ] Metadata remains intact.
- [ ] Drive remains the underlying file store.
- [ ] The search engine has not been rewritten.
- [ ] The taxonomy has not been expanded.
- [ ] No chatbot has been added.
- [ ] No new product area has been invented.
- [ ] No fake media behaviour has been introduced.
- [ ] No visual reference has overridden actual media truth.
- [ ] No production route has been changed without approval.
- [ ] Screenshots were reviewed at desktop and mobile widths.
- [ ] The Aakara retrieval tasks were tested.

If any item is false, Claude must not claim the work is complete.

---

# 58. Final Instruction to Claude

Do not interpret this document as an invitation to redesign the product concept.

The product concept is already decided.

We are building:

> **A practical, searchable, metadata-backed IFM Digital Asset Management system, with a premium visual interface that helps people find and retrieve content quickly.**

The system must remain operationally useful.

The design must remain visually strong.

Neither side may be sacrificed for the other.

Do not replace the DAM with a chatbot.

Do not replace the DAM with a marketing page.

Do not replace the DAM with a generic “content discovery” concept.

Do not remove useful DAM functions because they are not visually fashionable.

Build the DAM properly, then make it feel excellent to use.
