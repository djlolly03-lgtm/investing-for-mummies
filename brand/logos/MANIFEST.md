# IFM Logo Library

**This folder is the single source of truth for the Investing for Mummies logo.**
Need a logo for anything — deck, flyer, video, web page? Take it from here.

Files elsewhere in the repo (`CLAUDE/`, `Nursery Rhymes/`, `highlight-reel-assets/`)
are **working copies wired into live code or build scripts**. Never delete or
rename those, and never point at them from a new project — copy from here instead.
(House rule: a shared asset is COPIED into the project that needs it, never referenced
across folders.)

## Which file do I want?

| Use | File |
|---|---|
| Print / anything large | `IFM-logo-round-MASTER-2464px.png` |
| Video overlay, transparent | `IFM-logo-round-1119px-transparent-TM.png` |
| Video overlay, no ™ | `IFM-logo-round-1119px-transparent-no-TM.png` |
| Web / deck, horizontal | `IFM-logo-wide-1668px-transparent-colour.png` |
| On a dark or photo background | `IFM-logo-wide-1668px-transparent-white-knockout.png` |
| Small web icon, favicon | `IFM-logo-round-288px-web-small.png` |

## Naming

`IFM-logo-<shape>-<size>-<variant>.png` — sorts into three groups:

- **round** — the primary circular mark (11 files, 218px to 2464px, ™ and no-™)
- **stylised** — LED-mosaic treatments for logo animations (2)
- **wide** — horizontal lockups with the wordmark (12; `-transparent-`,
  `-white-bg`, `-teal-bg`, `-black-bg`, and 5 `-variant-` design iterations
  kept for reference: blankB, blankB-full, overlapC, tealM, coinM)

Sizes in filenames are the **long edge in pixels**. `transparent` means a real
alpha channel; everything else has a baked background.

## Not IFM

`_other-brands-KPatel/` holds 7 **K.Patel Phyto Extractions** logos that were sitting
in this folder. Different company — moved out so the IFM library stays clean.

Animation sprite sheets (`LOGO-sheet`, `LOGO2-sheet`, `LOGO-hits`, `LOGO-fine`)
are **not logos** — they are frame strips, and stay in
`Nursery Rhymes/Twinkle Twinkle Little SIP/v2-avatar/strips/` where the build reads them.
