# Folder & subfolder audit

Walked node by node, never with `rclone lsjson -R`, which under-reports on this Drive. A folder whose listing failed is reported as ERROR, never as empty.

| outcome | folders | meaning |
|---|---|---|
| COVERED | 84 | at least one file in it is in the catalogue |
| UNSEEN | 43 | **holds media, nothing in it is catalogued** |
| EMPTY | 32 | listing succeeded, genuinely no media |
| ERROR | 2 | listing failed — contents UNKNOWN, not zero |
| **total** | **161** | 5297 media files seen |

## UNSEEN — folders holding media with nothing catalogued

| files | media | path |
|---|---|---|
| 3055 | **3055** | `27th Feb 28th Feb 1st March (shared)` |
| 110 | **90** | `second cached root/From Sakshi` |
| 76 | **76** | `Edited Pictures (shared)` |
| 59 | **59** | `12.09.2026 (shared)` |
| 57 | **54** | `second cached root/From Aakara` |
| 24 | **17** | `Hiral — Media Kit` |
| 17 | **17** | `Content Library (root of the cached index)/AI Videos — Jun 2026 (Claude)` |
| 16 | **15** | `Infinity Feedback form (shared)/Quarter 2 - FY 2023` |
| 12 | **12** | `Content Library (root of the cached index)/Aakara — June 2026/S4 Finance Myths` |
| 12 | **12** | `Content Library (root of the cached index)/Aakara — June 2026/S5 finance word game` |
| 12 | **12** | `Mumbai_January 2020 (shared)` |
| 11 | **11** | `second cached root/From Aakara/RAW — corporate workshop boardroom shoot` |
| 10 | **10** | `Content Library (root of the cached index)/Aakara — June 2026/S6 saving investing` |
| 10 | **10** | `26.07.2026 (shared)` |
| 9 | **9** | `Content Library (root of the cached index)/Aakara — June 2026/Space x (IPO carousel)` |
| 7 | **7** | `Content Library (root of the cached index)/Aakara — June 2026/Space x — Carousel 2` |
| 6 | **6** | `Content Library (root of the cached index)/Aakara — June 2026/Website game` |
| 7 | **6** | `Content Library (root of the cached index)/Aakara — June 2026/Why IFM Exists` |
| 10 | **6** | `Ganpati's Case study (shared)` |
| 8 | **6** | `All Chapters_September 2022 (shared)/Eubrics` |
| 5 | **5** | `Content Library (root of the cached index)/Aakara — June 2026/Power of Compounding` |
| 6 | **5** | `Content Library (root of the cached index)/Aakara — June 2026/S1 Finance was not made ea` |
| 5 | **5** | `Content Library (root of the cached index)/Aakara — June 2026/Savings vs Investing` |
| 5 | **5** | `Content Library (root of the cached index)/Aakara — June 2026/School` |
| 6 | **5** | `Content Library (root of the cached index)/Aakara — June 2026/What IFM is Not` |
| 6 | **5** | `All Chapters_August 2023 (shared)/LetsDressUp` |
| 7 | **5** | `All Chapters_September 2022 (shared)/A Toddler Thing` |
| 7 | **5** | `All Chapters_September 2022 (shared)/Artment` |
| 4 | **4** | `second cached root/From videographers` |
| 4 | **4** | `Content Library (root of the cached index)/Aakara — June 2026/Hiral intro` |
| 4 | **4** | `Content Library (root of the cached index)/Aakara — June 2026/Join IFM now` |
| 4 | **4** | `Content Library (root of the cached index)/Aakara — June 2026/Learning with IFM` |
| 5 | **4** | `Content Library (root of the cached index)/Aakara — June 2026/Why Women Feel Left Out` |
| 4 | **4** | `Aakara delivery tree/June/Workshops/Women's` |
| 7 | **4** | `All Chapters_August 2023 (shared)/Chargeup` |
| 7 | **4** | `All Chapters_August 2023 (shared)/OnFinance` |
| 3 | **3** | `Ganpati's Case study (shared)/Registration folder` |
| 2 | **2** | `IFM handbook (My Drive)` |
| 2 | **1** | `Content Library (root of the cached index)` |
| 1 | **1** | `Content Library (root of the cached index)/Aakara — June 2026/Inflation (reel)` |
| 1 | **1** | `Content Library (root of the cached index)/Aakara — June 2026/Right time to learn` |
| 1 | **1** | `All Chapters_September 2022 (shared)` |
| 1 | **1** | `Alumni Notes - Jan 2023 (shared)` |

## ERROR — could not be listed, contents unknown

- `Delhi work Shop (shared)` — listing failed (`1cT-JCKhCvrdnkaFls5KFfaH7Zr7-VsyS`)
- `Hiral Goel (shared)` — listing failed (`1z-rLgGvpYD3Hns_ZakWO_0iLR_3aPwsI`)

## COVERED — folders with catalogued content

| media | path |
|---|---|
| 349 | `Aakara delivery tree/workshop/Rakshita` |
| 349 | `Rakshita (linked by a row)` |
| 123 | `Pictures (shared)` |
| 121 | `Content Library (root of the cached index)/IFM Aug 2026` |
| 117 | `Content Library (root of the cached index)/Session photos & clips (Mar–Apr 2026)` |
| 108 | `Aakara delivery tree/workshop/RSS workshop` |
| 56 | `Sakshi uploads` |
| 46 | `Content Library (root of the cached index)/IFM Games` |
| 31 | `Workshop Pictures (shared)` |
| 26 | `Aakara delivery tree/workshop/Rakshita/camera` |
| 25 | `Certificates` |
| 23 | `Content Library (root of the cached index)/IFT Aug 2026` |
| 18 | `Aakara delivery tree/Hiral Goel` |
| 18 | `Content Library (root of the cached index)/Hiral Goel — photos & clips (Mar 2026)` |
| 16 | `Aakara delivery tree/Hiral Goel/Teens video/Teens reel` |
| 11 | `Content Library (root of the cached index)/IFM August feedback` |
| 10 | `Content Library (root of the cached index)/IFM (sharing experience)` |
| 9 | `Aakara delivery tree/Hiral Goel/Teens video` |
| 9 | `Aakara delivery tree/June/Social media /Carousels/Space x/carousel 1` |
| 8 | `Aakara delivery tree/September/Carousels/JIO IPO` |
| 8 | `Aakara delivery tree/June/Social media /Carousels/IPO News Item` |
| 7 | `Content Library (root of the cached index)/IFM feedback videos` |
| 7 | `Aakara delivery tree/July/Carousels/headline news` |
| 7 | `Aakara delivery tree/June/Social media /Carousels/Space x/Carousel 2` |
| 6 | `Aakara delivery tree/August/Carousels/10 minute money` |
| 6 | `Aakara delivery tree/August/Carousels/Asset class` |
| 6 | `Aakara delivery tree/July/Carousels/TCS QResults News` |
| 6 | `Aakara delivery tree/July/Carousels/parents day national` |
| 6 | `Aakara delivery tree/June/Social media /Carousels/News NSE BSE` |
| 6 | `Aakara delivery tree/June/Social media /Carousels/Power of Compounding` |
| 6 | `Aakara delivery tree/June/Social media /Carousels/Why IFM Exists` |
| 6 | `Aakara delivery tree/June/Social media /Stories/S4 Finance Myths` |
| 6 | `Aakara delivery tree/June/Social media /Stories/S5 finance word game` |
| 5 | `Aakara delivery tree/August/Carousels/Green flag ` |
| 5 | `Aakara delivery tree/August/Stories/MML 2` |
| 5 | `Aakara delivery tree/August/Stories/asset ` |
| 5 | `Aakara delivery tree/July/Carousels/Money myths believing` |
| 5 | `Aakara delivery tree/July/Carousels/Rich people money gene` |
| 5 | `Aakara delivery tree/July/Carousels/Savings-Expense Formula` |
| 5 | `Aakara delivery tree/July/Carousels/Self Care Day` |
| 5 | `Aakara delivery tree/July/Carousels/starbucks coffee` |
| 5 | `Aakara delivery tree/July/Stories/Finance pages confuse you` |
| 5 | `Aakara delivery tree/July/Stories/mini money lesson` |
| 5 | `Aakara delivery tree/September/Carousels/Reviews` |
| 5 | `Aakara delivery tree/September/Reels/Teachers Day` |
| 5 | `Aakara delivery tree/June/Social media /Carousels/Savings vs Investing` |
| 5 | `Aakara delivery tree/June/Social media /Carousels/School` |
| 5 | `Aakara delivery tree/June/Social media /Carousels/What IFM is Not` |
| 5 | `Aakara delivery tree/June/Social media /Stories/S1 Finance was not made easy` |
| 5 | `Aakara delivery tree/June/Social media /Stories/S2 Words people secretly Google` |
| 5 | `Aakara delivery tree/June/Social media /Stories/S6 saving investing` |
| 4 | `Content Library (root of the cached index)/Aakara — June 2026/Workshops — Women's` |
| 4 | `Aakara delivery tree/August/Stories/invest bucket game` |
| 4 | `Aakara delivery tree/July/Reels/Hiral expertise ` |
| 4 | `Aakara delivery tree/July/Stories/meet richa` |
| 4 | `Join IFM now (linked by a row)` |
| 4 | `Aakara delivery tree/June/Social media /Carousels/Learning with IFM` |
| 4 | `Aakara delivery tree/June/Social media /Carousels/Why Women Feel Left Out` |
| 4 | `Aakara delivery tree/June/Social media /Stories/Hiral intro` |
| 3 | `Content Library (root of the cached index)/Women's workshop — Apr 2026` |

…and 24 more covered folders.


---

# What this audit found — 21 Sep 2026

## The honest answer: no, every folder had NOT been scanned

Every previous scan used **8 registered roots** (CLAUDE.md "Drive folders"). The Drive
actually holds **68 top-level folders** — 16 in My Drive and 52 shared with this account.
**60 of the 68 had never been walked by anything.**

That also explains a loose end from 20 Sep that I had recorded but not chased: 16 catalogued
files whose Drive id was "in no cached index". They are not missing. They live outside the
registered roots entirely.

## What was then walked

**161 folder nodes, 126 distinct folders** once Drive shortcuts and multi-path folders are
deduplicated by content. Walked one node at a time, never with `rclone lsjson -R`.

## IFM coverage, counted in FILES

Folders were classified in three buckets. Our own mirrors (`IFM Content Archive`,
`Hiral — Media Kit`, `IFM Machine Backup`) are excluded: they hold renamed copies of
catalogued assets, so their Drive ids can never match by construction — verified, their
filenames carry either the original filename or the IFM id.

| | files |
|---|---|
| IFM media in walked folders | **1,627** |
| covered by a catalogue row (directly, or via a folder-linked catch-all) | 1,199 (73%) |
| **not covered by any row** | **428 (26%)** |

## The largest gaps

| uncatalogued / in folder | folder |
|---|---|
| 121 / 123 | `Pictures` (shared) |
| 76 / 76 | `Edited Pictures` (shared) |
| 17 / 17 | `Content Library / AI Videos — Jun 2026 (Claude)` |
| 16 / 56 | `Sakshi uploads` |
| 15 / 15 | `Infinity Feedback form / Quarter 2 - FY 2023` |
| ~110 across 18 subfolders | `Content Library / Aakara — June 2026 / *` |
| 12 / 12 | `Mumbai_January 2020` (shared) |
| 11 / 31 | `Workshop Pictures` (shared) |
| 10 / 10 | `26.07.2026` (shared) |
| 9 / 25 | `Certificates` |

## Verified by eye, not by folder name

Three large folders were checked by fetching an actual frame, because a name is not evidence.

- `27th Feb 28th Feb 1st March` — **3,055 JPGs, 22.2 GB.** NOT IFM. Two sampled frames show
  an outdoor event with marquees and misting fans, and a scoresheet reading *"IPT SPPL 2.0 —
  Tie Sheet / Match Fixture / Men's Doubles"*. A padel tournament.
- `12.09.2026` — 59 files. NOT IFM. Sampled frame is a *"THE PADEL TRAIL — SPAIN"* brochure.
- `Pictures` — 123 files. **IS IFM.** Sampled frame is eight women in an office with
  workbooks on the desk. Only 2 of its 123 files are catalogued.
- `Edited Pictures` — 76 files. **UNCERTAIN.** Sampled frame is a composited studio portrait
  on a fort backdrop, no IFM branding. Needs a human call.

## Corrections I made to my own audit while running it

1. **`COVERED` was too lenient.** A folder counted as covered if *one* file in it was
   catalogued. `Pictures` was marked COVERED on 2 of 123 files — 98% ungathered. The
   file-level table above is the honest measure; the folder-level table at the top of this
   file is kept only because it shows the ERROR count.
2. **`Space x (IPO carousel)` was wrongly classified as another business.** It sits inside
   `Aakara — June 2026`; it is an IFM carousel about the SpaceX IPO as a finance topic. My
   keyword matched "Space x". Corrected.
3. **`Rakshita` was double-counted.** It appears twice — once by its real id, which IS linked
   by IFM-315, and once through a Drive shortcut whose key is two ids joined by a tab. That
   inflated "not covered" from 428 to 774. Folders are now deduplicated by the set of file
   ids they hold, which is identity by content.

## Errors

**2 of 161 nodes failed to list** — `Delhi work Shop` and `Hiral Goel`. Both were retried
directly afterwards and both answered: `Delhi work Shop` is genuinely empty, `Hiral Goel`
holds `IMG_8010.MOV` plus a `Teens video` subfolder, both already catalogued. Earlier in the
run 16 nodes errored, including four registered roots; all cleared on retry. Every one was
transient API contention, and every one was recorded as ERROR rather than as zero — which is
the whole point of walking node by node.

## Deliberately NOT walked

These shared folders read as other businesses or personal files. This is my judgement, not a
measurement, and it is listed explicitly in `folder-audit.py` so any of it can be corrected:

`Nitro` · `Nitro Commerce` · `SkyeAir` · `Space x` (the top-level one) · `VC Database` ·
`Awarathon` · `Avenue Growth` · `Degpeg` · `Fineoteric` · `Sapphire` · `SLC` · `WeSkill` ·
`White.Inc Pre-Series A Data` · `Slate_Tech_CVs` · `Panache Docs` · `Organik Truck` ·
`Performance Report` · `Net Worth Reports` (×2) · `Credit card statements` ·
`Dubai Residancy Documents` · `Brighton Goel ID/Passports` · `Goels'` · `Foreign Admits` ·
`June 2024 Vacation` · `Tadoba 2021` · `Reservations/Tickets` · `Roei Gavish travel` ·
`Third Eye Check-Ins` · `Parabolic 2.0` · `Rumble` · `SRE internal` · `Market Pulse/Punch` ·
`Karan CV AI test` · `Google AI Studio` · `A Toddler Thing- Information` · `Folder1` ·
`All Chapters_*` and `Alumni Notes` (accelerator cohorts: Eubrics, LetsDressUp, Artment,
Chargeup, OnFinance)
