# Coverage of the stable corpus — reconciled by file id

**Measurement only. Nothing was catalogued, enriched, or written to `data.js`,
`enrichment.json` or the catalogue.** `daily-content-processor` is PAUSED for the duration.

Baseline frozen at measurement time:
`v1-catalogue.js` md5 `276e213778a24cc26cc291877b360207` · `data.js` `ca4ee26b615a738e96a4daee307b2c8e` · `enrichment.json` `99fc0f2aa2f4935b5e826821465910f2`

## The previous 304 figure is obsolete. The number is 309.

It moved for four reasons, and the two that matter pull in opposite directions:

| | |
|---|---|
| corpus is larger | 1,304 → **1,340** files. HEIC and PSD are now visible (86 files), AppleDouble stubs are gone |
| catalogue is larger | 542 → **550** rows. `daily-content-processor` staged 8 (IFM-540…547) at 07:54 on 21 Sep, mid-audit. That is the uncontrolled variable now stopped |
| attribution is exact | a file's parent folder is now resolved by folder ID, not by matching a path string. 136 folder paths, 0 collisions, 0 files unattributable |
| a fourth bucket exists | "catalogued" and "findable" are not the same thing, so a file whose only row is hidden is counted separately rather than as covered |

corpus: **1340 files**, 136 folders, 3/3 passes identical, 0 errors
catalogue: 550 rows (510 in the Library)

| bucket | files | share |
|---|---|---|
| A — individually catalogued | **371** | 28% |
| B — reachable via a catch-all row | **659** | 49% |
| C — not reachable at all | **309** | 23% |
| D — catalogued but hidden (ambiguous) | **1** | 0% |
| **total** | **1340** | 100% |

## C — NOT REACHABLE — 309 files

| files | folder |
|---|---|
| 121 | `Pictures` |
| 17 | `Content Library/AI Videos — Jun 2026 (Claude)` |
| 16 | `Sakshi uploads` |
| 12 | `Content Library/Aakara — June 2026/S4 Finance Myths` |
| 12 | `Content Library/Aakara — June 2026/S5 finance word game` |
| 11 | `Workshop Pictures` |
| 10 | `Hiral Goel` |
| 10 | `Content Library/Aakara — June 2026/S6 saving investing` |
| 9 | `Certificates` |
| 9 | `Content Library/Aakara — June 2026/Space x (IPO carousel)` |
| 8 | `Hiral Goel/Teens video` |
| 7 | `Content Library/Aakara — June 2026/Space x — Carousel 2` |
| 7 | `Content Library/Aakara — June 2026/Why IFM Exists` |
| 6 | `Content Library/Aakara — June 2026/S1 Finance was not made easy` |
| 6 | `Content Library/Aakara — June 2026/Website game` |
| 6 | `Content Library/Aakara — June 2026/What IFM is Not` |
| 5 | `Content Library/Aakara — June 2026/Power of Compounding` |
| 5 | `Content Library/Aakara — June 2026/Savings vs Investing` |
| 5 | `Content Library/Aakara — June 2026/School` |
| 5 | `Content Library/Aakara — June 2026/Why Women Feel Left Out` |
| 4 | `Content Library/Aakara — June 2026/Hiral intro` |
| 4 | `Content Library/Aakara — June 2026/Join IFM now` |
| 4 | `Content Library/Aakara — June 2026/Learning with IFM` |
| 4 | `IFM (Aakara delivery tree)/June/Workshops/Women's` |

…and 6 more folders.

by type: {'video': 58, 'image': 251}
by extension: {'.jpg': 143, '.png': 83, '.mov': 31, '.mp4': 27, '.heic': 17, '.psd': 5, '.jpeg': 3}

## D — AMBIGUOUS — 1 files

| files | folder |
|---|---|
| 1 | `Content Library/IFM Games` |

by type: {'video': 1}
by extension: {'.mov': 1}

## B — VIA CATCH-ALL — 659 files

| files | folder |
|---|---|
| 170 | `Rakshita` |
| 101 | `Content Library/IFM Aug 2026` |
| 87 | `IFM (Aakara delivery tree)/workshop/RSS workshop` |
| 25 | `Content Library/IFM Games` |
| 17 | `Rakshita/camera` |
| 9 | `Space x (IFM carousel artboards)/carousel 1` |
| 8 | `IFM (Aakara delivery tree)/July/Carousels/headline news` |
| 8 | `IFM (Aakara delivery tree)/September/Carousels/JIO IPO` |
| 8 | `IFM (Aakara delivery tree)/June/Social media /Carousels/IPO News Item` |
| 7 | `Space x (IFM carousel artboards)/Carousel 2` |
| 7 | `IFM (Aakara delivery tree)/June/Social media /Carousels/Why IFM Exists` |
| 6 | `IFM (Aakara delivery tree)/August/Carousels/10 minute money` |
| 6 | `IFM (Aakara delivery tree)/August/Carousels/Asset class` |
| 6 | `IFM (Aakara delivery tree)/July/Carousels/TCS QResults News` |
| 6 | `IFM (Aakara delivery tree)/July/Carousels/parents day national` |
| 6 | `IFM (Aakara delivery tree)/June/Social media /Carousels/News NSE BSE` |
| 6 | `IFM (Aakara delivery tree)/June/Social media /Carousels/Power of Compounding` |
| 6 | `IFM (Aakara delivery tree)/June/Social media /Carousels/What IFM is Not` |
| 6 | `IFM (Aakara delivery tree)/June/Social media /Stories/S1 Finance was not made easy` |
| 6 | `IFM (Aakara delivery tree)/June/Social media /Stories/S2 Words people secretly Goo` |
| 6 | `IFM (Aakara delivery tree)/June/Social media /Stories/S4 Finance Myths` |
| 6 | `IFM (Aakara delivery tree)/June/Social media /Stories/S5 finance word game` |
| 5 | `IFM (Aakara delivery tree)/August/Carousels/Green flag ` |
| 5 | `IFM (Aakara delivery tree)/August/Stories/MML 2` |

…and 40 more folders.

by type: {'video': 352, 'image': 307}
by extension: {'.mov': 247, '.png': 184, '.mp4': 105, '.jpg': 82, '.heic': 28, '.psd': 8, '.cr3': 5}

wrote reconciliation.json — full per-file lists for all four buckets

---

## What the four buckets mean before anyone acts on them

**A — 371 individually catalogued (28%).** The file's own Drive id is in a row that the
Library will serve. This is the only bucket where a search can return *that file*.

**B — 659 via a catch-all (49%).** The parent folder is linked by a row, but the file has no
row of its own. A search returns the folder, and the person then scrolls Drive by hand. This
is deliberate for raw dumps — `Rakshita` alone is 200 files behind IFM-315 — and it is
**probably wrong for finished work**: the 18 `Aakara — June 2026` subfolders in bucket C are
finished carousels, and much of B is the same kind of content one level up. Deciding what B
should contain is a judgement call, not a defect to fix silently.

**C — 309 not reachable at all (23%), 7.5 GB.** Neither the file nor its parent folder is
referenced anywhere in the catalogue. 251 images, 58 videos. Concentrated in four places:
`Pictures` (121), the `Aakara — June 2026` subfolders (~110 across 18 folders),
`Sakshi uploads` (16) and `Workshop Pictures` (11). By month: Jun 2026 158 · Mar 83 · Apr 46.

**D — 1 ambiguous.** `Content Library/IFM Games/IMG_2847.MOV`, catalogued as **IFM-459** and
deliberately hidden: it is a byte-identical re-upload (both 26,026,062 bytes, same filename)
marked `library:false` on 20 Sep. Catalogued on paper, unreachable in practice, and correctly
so. The bucket exists so that this distinction is visible rather than folded into "covered" —
which is how 31 preview clips sat published and invisible for a week.

## Per-file lists

`reconciliation.json` holds every file in all four buckets with its Drive id, path, kind,
size, modified date and the catalogue rows that reference it. That is the working list for
cataloguing, when cataloguing is authorised.

## Still true, and not addressed by this measurement

- **22 of the HEIC in `Certificates` are photographs of minors.** CLAUDE.md records that they
  need written parental consent under the DPDP Act. 9 Certificates files sit in bucket C.
  Nothing there should be catalogued, copied or published on the strength of this document.
- **The corpus is IFM content only.** 46 non-IFM top-level folders (3,459 media) and the
  1,547-file machine backup are excluded by verdict, each with a written reason in
  `corpus-verdicts.json`.
- **The system is still not library-complete.**
