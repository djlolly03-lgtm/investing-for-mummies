# Investing for Mummies — folder guide

Reorganised 19 Aug 2026. **Nothing in `CLAUDE/` was moved** — that folder is the live
Vercel deploy root, so every file in it is a public URL that WordPress iframes point at.

## Where things live

| Folder | What's in it |
|---|---|
| `CLAUDE/` | **The live website + all games.** Deploy root — do not reorganise. See `CLAUDE/MANIFEST.md`. |
| `deliverables/videos/reels/` | Instagram reels (vertical 1080x1920, with sound) |
| `deliverables/videos/presentation/` | PowerPoint videos — workshop highlights, marquee loop |
| `deliverables/videos/explainers/` | Concept animations — inflation, compounding |
| `deliverables/videos/logo-animations/` | Logo reveals and morphs (IFM + KPatel) |
| `deliverables/videos/wealth-conversation/` | Wealth Conversation workshop videos |
| `brand/logos/` | Brand logo files and variants |
| `teaching-assets/jars-and-buckets/` | Needs/wants/savings jar + bucket graphics |
| `teaching-assets/visuals/` | Lesson visuals — commodities, debt, habits, flyer |
| `documents/course-content/` | Game suggestions, case studies, answer keys, decks |
| `documents/proposals-and-reports/` | Client proposals, quotations, certificates, reports |
| `data/` | Trackers and spreadsheets (budget, schedule, SIP calculator) |
| `scripts/` | Python utilities (branding, certificate generation) |
| `projects/` | Self-contained side projects (axon-landing, news-agent, HR, etc.) |
| `highlight-reel-assets/` | **Source material for video builds** — prepped photos, clip frames, source .movs, game screens, build scripts |
| `marquee-assets/` + `marquee-gallery.html` | The "Scroll. Meet everyone." gallery page — **keep these two together**, the HTML loads the folder by relative path |
| `_archive/duplicates/` | Superseded duplicate files, kept rather than deleted |

## Rules worth keeping

1. **Never reorganise `CLAUDE/`.** Moving a file there changes its live URL.
2. **`highlight-reel-assets/` stays at root** — scheduled tasks reference it by absolute path.
3. **`marquee-gallery.html` and `marquee-assets/` move together** or the gallery breaks.
4. Deploy weight in `CLAUDE/` is controlled by `.vercelignore`, not by moving files.
5. New finished videos go in `deliverables/videos/<category>/`; raw source stays in `highlight-reel-assets/`.
