# Founder photo library — Hiral Goel

Reference photos gathered from across the whole project (and Downloads/Desktop),
for avatar training and any place a founder photo is needed.

**All files here are COPIES.** The originals stay where they are — several are wired
into build scripts (`highlight-reel-assets/whatsapp-build/img/hiral*.jpg`,
`CLAUDE/proposals/assets/*`), so nothing was moved.

## What's here

**15 confirmed real photographs** (this folder, `Hiral-*`) — the avatar training set.
Named by shot type so you can see the spread at a glance:

- `headshot-studio-navy`, `headshot-office-navy`, `headshot-navy-thumb` — clean frontal
- `studio-teal-neutral`, `studio-teal-smiling` — plain background, two expressions
- `greenscreen-frontal` — best isolation, no background to remove
- `profile-navy` — side view
- `portrait-lounge`, `selfie-natural-light` — natural lighting
- `presenting-live-smiling`, `candid-laptop-1/2/3` — in-context, varied expression
- `teaching-wide-1/2` — wide room shots (face is small, low value for training)

See `CONTACT-SHEET-confirmed.jpg` for all 15 at a glance.

## Two folders you should look at

**`_review-uncertain/` (9 files) — I was not confident these are the same person.**
Several photos across the project show a woman with a similar build and hair, and at
the resolution available I could not tell them apart reliably. Rather than risk mixing
two people into an avatar training set, they are parked here.
Open `CONTACT-SHEET-review-these.jpg`, then move the ones that are Hiral up into this
folder and delete the rest.

**`_ai-generated/` (10 files) — AI renders and the 3D avatar, NOT photographs.**
The ChatGPT/Gemini images and the `hiral-3d-*` renders. Useful as style reference for
what the avatar should look like, but **never feed these back in as training input** —
training an avatar on another model's output degrades the likeness.

## Rule

Only real photographs go in the top level. If it came out of an image generator,
it belongs in `_ai-generated/`.
