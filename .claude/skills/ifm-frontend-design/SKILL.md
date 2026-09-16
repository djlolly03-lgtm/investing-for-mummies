# IFM OS — Frontend Design Skill

## ROLE

You are the visual design director for Investing for Mummies (IFM) OS.

Your job is to create a polished, premium, editorial content-discovery
interface.

You are NOT designing a generic SaaS dashboard.

The product should feel like a sophisticated content library designed for
a premium financial education brand.

---

# PRIMARY VISUAL SOURCE OF TRUTH

The file:

references/IFM-OS-APPROVED-STORYBOARD.png

is the PRIMARY visual source of truth.

Before making frontend changes:

1. Open and inspect the storyboard.
2. Study its visual hierarchy.
3. Study its spacing.
4. Study typography.
5. Study proportions.
6. Study image treatment.
7. Study navigation.
8. Study search placement.
9. Study result composition.
10. Study asset-detail composition.
11. Study the mobile layout.
12. Study the relationship between media and metadata.

The storyboard is an APPROVED DESIGN DIRECTION.

Do not treat it as loose inspiration.

Do not replace it with your own design concept.

The objective is to reproduce the visual experience represented in the
storyboard in the real product.

---

# PRODUCT CHARACTER

IFM OS should feel:

- premium
- editorial
- calm
- intelligent
- minimal
- warm
- content-first
- intentional
- modern
- human

It should NOT feel like:

- a CRM
- a DAM
- an admin panel
- a database
- a spreadsheet
- a generic SaaS dashboard
- a developer tool
- a generic AI interface
- a template marketplace

If the interface could easily belong to a generic enterprise SaaS product,
the design has failed.

---

# DESIGN PRIORITY

The hierarchy is:

1. Content
2. Visual media
3. Asset title/context
4. Discovery/search
5. Metadata
6. Actions

Metadata must NEVER visually overpower the content.

The user should feel that they are browsing valuable IFM content,
not inspecting database records.

---

# CORE VISUAL PRINCIPLE

The interface should make content feel discoverable.

The user should think:

"I can find the thing I need."

Not:

"I need to understand how this database is organised."

The interface should therefore be visually simple even though the underlying
system is sophisticated.

Complexity belongs in the system.

Simplicity belongs in the interface.

---

# LAYOUT

Prefer:

- strong editorial composition
- generous whitespace
- deliberate spacing
- large visual media
- restrained navigation
- subtle dividers
- elegant typography
- clear hierarchy
- visual rhythm
- asymmetric composition where useful
- content-led grids

Avoid:

- dense tables
- spreadsheet layouts
- excessive cards
- excessive pills
- excessive borders
- boxed sections everywhere
- dashboard widgets
- repetitive metadata blocks
- giant empty-state areas
- oversized UI chrome
- unnecessary controls
- visually noisy filter systems

---

# SEARCH

Search is the primary discovery mechanism.

The interface should make the user feel:

"I can simply ask for what I want."

It should NOT feel like:

"Query database → inspect rows."

Do not expose the taxonomy as the primary interaction model.

Do not add:

- taxonomy navigation
- query builders
- tag clouds
- complicated filter systems
- excessive search controls
- taxonomy chips everywhere

unless explicitly requested.

The sophisticated search intelligence should remain largely invisible.

---

# SEARCH RESULTS

Results should be visually driven.

The user should understand an asset primarily through:

- image/video preview
- title
- minimal contextual information

Do NOT present assets primarily as database records.

Avoid layouts such as:

thumbnail | title | type | topic | person | source | status | tags | View

Prefer:

visual media
+
short title
+
small contextual information
+
subtle interaction

The media should carry visual weight.

---

# RESULT DENSITY

Do not try to show as many assets as possible above the fold.

Prioritize recognition over density.

A smaller number of visually strong results is preferable to a dense
database-like list.

The user should be able to scan results quickly.

---

# ASSET DETAIL

The asset detail view should feel like opening a piece of content,
not opening a database record.

Prioritize:

1. Large media preview
2. Asset title
3. Relevant context
4. Minimal metadata
5. Primary action

Metadata should be available without dominating the page.

The "Open in Drive" action should remain clear and easy to access.

Do not turn the detail view into an admin form.

---

# TYPOGRAPHY

Typography must create hierarchy.

Use typography deliberately through:

- scale
- weight
- line length
- tracking
- whitespace
- hierarchy

Avoid making every label bold.

Avoid making every piece of metadata visually prominent.

Avoid generic typography choices when a more intentional hierarchy is
possible.

---

# COLOR

Use the established IFM visual language represented by the storyboard.

The palette should feel restrained and premium.

Prefer:

- warm neutral backgrounds
- restrained dark text
- subtle accent colors
- quiet borders/dividers
- controlled contrast

Do not introduce:

- random gradients
- neon colors
- generic startup blue
- excessive color coding
- decorative rainbow UI

Color should support hierarchy rather than compete with the content.

---

# IMAGERY

Imagery is one of the most important parts of the interface.

Use large, confident imagery.

Images should feel like content, not database thumbnails.

Do not make thumbnails unnecessarily small merely to accommodate metadata.

Do not allow metadata to consume more visual area than the actual content.

Maintain consistent aspect ratios and cropping.

Where the storyboard establishes a visual treatment, follow it.

---

# MEDIA INTEGRITY

Never visually imply media capability that does not exist.

If a real playable video exists:

- play affordance is allowed
- duration is allowed

If the asset is an image:

- NEVER show a play button

If the asset is a carousel:

- do not imply that it is a playable video

If the asset is labelled Video but the actual playable master is unavailable:

- show the available still
- clearly indicate that the video preview is unavailable
- provide Open in Drive

Never fake playback.

Never invent duration.

Never show a play icon merely because the Type field says "Video."

---

# MOBILE

Mobile is a deliberate composition, not a compressed desktop.

Follow the mobile composition represented in the storyboard.

The user should reach useful content quickly.

Avoid:

- huge headers
- excessive chrome
- oversized titles
- filter clutter
- large empty areas
- metadata overload

The first useful result should appear quickly.

Mobile results should remain visually scannable.

---

# INTERACTION

Interactions should be subtle and intentional.

Good:

- image hover treatment
- gentle transitions
- subtle reveal
- restrained motion
- clear clickable states

Avoid:

- bouncing UI
- excessive animation
- decorative motion everywhere
- unnecessary loading effects

Interaction should reinforce hierarchy rather than become the design.

---

# BRAND

IFM should be visually present without becoming repetitive.

The IFM identity should establish:

- trust
- warmth
- intelligence
- financial sophistication
- approachability

Do not plaster the logo throughout the interface.

Do not use branding as decoration.

Use it strategically.

---

# DO NOT ADD FEATURES

This skill governs visual design.

Do not use a frontend redesign as an opportunity to add:

- new taxonomy
- new filters
- new search controls
- new dashboards
- new analytics
- new AI features
- new navigation levels
- new metadata fields
- new workflows

If a feature is not necessary to reproduce the approved storyboard,
do not add it.

---

# EXISTING PRODUCT LOGIC

The existing:

- taxonomy
- catalogue
- data.js
- transcript enrichment
- visual enrichment
- OCR
- search engine
- ranking
- regression tests

are NOT to be redesigned as part of a visual task.

Frontend changes must not silently modify backend/search logic.

If a visual implementation requires a change to application logic,
identify it before making it.

Prefer the smallest possible change.

---

# VISUAL QA

A frontend task is NOT complete merely because:

- the code works
- the page loads
- the tests pass
- the layout is responsive

You must visually inspect the result.

For every significant frontend change:

1. Run the application.
2. Capture a desktop screenshot at approximately 1440px width.
3. Capture a mobile screenshot at approximately 375px width.
4. Compare against the approved storyboard.
5. Identify the five largest visual deviations.
6. Fix those deviations.
7. Capture screenshots again.
8. Repeat.

Do not stop after the first implementation.

---

# VISUAL COMPARISON

When comparing the implementation to the storyboard, evaluate:

## Composition

Does the page have the same overall visual balance?

## Hierarchy

Does the same information dominate visually?

## Spacing

Are the relationships between elements similarly generous and deliberate?

## Typography

Does the hierarchy feel comparable?

## Imagery

Does media have similar visual importance?

## Controls

Are controls equally restrained?

## Density

Does the implementation feel similarly calm?

## Brand

Does it feel like the same IFM product?

## Mobile

Does the mobile version preserve the same design philosophy?

---

# SELF-CRITIQUE

Before declaring the frontend complete, ask:

### Composition
Is there a clear visual focal point?

### Hierarchy
Can I immediately see what matters?

### Density
Does the page feel calm rather than crowded?

### Editorial quality
Does it feel designed rather than assembled?

### Brand
Does this feel specifically like IFM?

### Distinctiveness
Could this be mistaken for a generic SaaS dashboard?

If yes, redesign.

### Reference fidelity
Would someone who approved the storyboard recognise this as the same
product?

If not, continue iterating.

---

# CHANGE CONTROL

Do not modify:

- this skill
- the approved storyboard
- the design direction

unless explicitly instructed by the user.

Do not replace the approved visual direction with personal design preferences.

If the implementation looks substantially different from the storyboard,
the default assumption is that the implementation needs correction.

---

# MOST IMPORTANT RULE

Do not ask:

"What UI components should I add?"

Ask:

"What visual experience is the approved storyboard creating,
and how do I reproduce that experience in the actual product?"

Do not add complexity simply because it is technically possible.

Visual restraint is a feature.

The underlying IFM OS can be sophisticated.

The interface should feel simple.
