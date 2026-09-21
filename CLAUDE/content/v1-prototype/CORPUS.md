# The IFM corpus — established 21 Sep 2026

Written after the instruction: *"Stop feature development. First establish the actual IFM
corpus."* No feature work was done. Nothing was deployed. The catalogue was not changed.

**The system is NOT library-complete and NOT production-ready.** 304 IFM media files are not
reachable from the catalogue at all, and 628 more are reachable only through a folder
catch-all rather than a row of their own.

---

## 1. The definitive file-level coverage table

Distinct files, deduplicated **by Drive file id** — several IFM folders nest inside each other
(`Pictures` contains `Hiral Goel`; `IFM Content Hub` contains `Content Library`), so a
folder-by-folder sum double counts. macOS `._` AppleDouble resource forks are excluded: they
are not media, and 176 of them inflated `Rakshita` from 200 real files to 376.

Counts are the **union of three independent listing passes**, because `rclone -R` under-reports
non-deterministically on this Drive — single passes returned 1,325 and then 1,196 for the same
question. The union is stable at 1,304 and should be read as a **floor**.

| | files | |
|---|---|---|
| **Distinct IFM media files** | **1,304** | 100% |
| A — individually catalogued, has its own row | **372** | 28% |
| B — reachable only via a folder catch-all row | **628** | 48% |
| C — **not reachable from the catalogue at all** | **304** | 23% |

Beside the corpus, and deliberately outside it:

| | folders | media |
|---|---|---|
| mirror — our own copies of catalogued assets | 2 | 187 |
| excluded — the documented machine backup | 1 | 1,547 |
| non-ifm — another business or personal | 46 | 3,459 |
| **uncertain** | **0** | **0** |

Every one of the 68 top-level folders now has a verdict and a reason in
`corpus-verdicts.json`. There are no unclassified folders left.

### What C is made of

| files | where |
|---|---|
| 121 | `Pictures` (root) — IFM session photos, Mar–Aug 2026 |
| 149 | `IFM Content Hub / Content Library / …` — mostly the 18 `Aakara — June 2026` subfolders (~110), plus `AI Videos — Jun 2026`, `IYA/IFT Photo gallery` (16) and `Certificates` (9) |
| 23 | `IFM` (Aakara tree) — `Hiral Goel` (10), `Hiral Goel/Teens video` (8), `June/Workshops/Women's` (4) |
| 11 | `Workshop Pictures` |

By type: 143 `.jpg` · 83 `.png` · 31 `.mov` · 27 `.mp4` · **17 `.heic`** · 3 `.jpeg`
By month: 2026-03 83 · 2026-04 46 · 2026-06 153 · 2026-08 14 · 2026-09 7 · 2026-07 1

---

## 2. A format was being dropped silently — `.heic`

**103 `.heic` files exist across the registered IFM roots and the string `.heic` appears
nowhere in the catalogue.** 70 in Content Library, 22 in Certificates, 11 in Sakshi uploads.

This is the same class of defect as the `.CR3` bug found on 19 Sep — a scan filtering on
"common" photo extensions — except CR3 was fixed and HEIC was never checked. There are also
13 `.psd` files in the same position.

⚠️ The 22 HEIC in `Certificates` are certificate photographs, which per CLAUDE.md show minors
and require written parental consent under the DPDP Act. They must not be published anywhere
on the strength of this audit.

---

## 3. The 60 unwalked top-level folders, classified

Every previous scan used the 8 roots in CLAUDE.md. The Drive holds 68 top-level folders — 16
in My Drive, 52 shared — so 60 had never been walked. All are now classified.

### IFM — in the corpus (19 folders)

| folder | why |
|---|---|
| `IFM` (Aakara delivery tree) | registered root; 64 files individually catalogued |
| `IFM Content Hub` | **parent of the Content Library root we already index**; 286 catalogued inside; also holds the Content Catalogue, Creator Tracker and Outbound Log sheets |
| `Content Library` | registered root |
| `Sakshi uploads` | registered root; 40 of 56 catalogued |
| `Certificates` | registered root; contains minors, consent applies |
| `IFM Content Drop`, `_Trash` | registered roots, both empty |
| `Rakshita` | linked by IFM-315; 200 real files |
| `Pictures` | **verified by eye** — eight women in an IFM workshop with workbooks |
| `Hiral Goel` | 24 of 43 catalogued; holds the inflation-session master |
| `Workshop Pictures` | 20 of 31 catalogued |
| `Space x` | **corrected** — holds `Space-X-carousel-*.png/jpg`, IFM carousel artboards about the SpaceX IPO |
| `Asset Class 2`, `Inflation`, `Join IFM now`, `MML 2`, `S2 Words…`, `S6 saving investing`, `Teachers Day`, `Why Women Feel Left Out` | each linked by a catalogue row |
| `IFM handbook`, `delhi workshop 16th sept`, `Delhi work Shop` | documents only / empty |

### Mirror — our own copies, not counted (2)

`IFM Content Archive` (renamed copies carrying the original filename) and `Hiral — Media Kit`
(filenames carry IFM ids: IFM-544/545/546, IFM-439, IFM-392).

### Excluded — IFM-adjacent, deliberately out (1)

`IFM Machine Backup` — the documented rclone backup of this Mac. 1,547 media, all copies of
local files.

### Non-IFM (46)

Three were **verified by looking at a frame**, because the names were misleading:

- `27th Feb 28th Feb 1st March` — 3,055 JPGs, **22.2 GB**. A scoresheet reading *"IPT SPPL 2.0
  — Tie Sheet / Match Fixture / Men's Doubles"*. A padel tournament.
- `12.09.2026` — a *"THE PADEL TRAIL — SPAIN"* brochure.
- `26.07.2026` — a padel court with *"INDIAN Padel"* branding.
- `Edited Pictures` — 76 PNGs from **May 2025**, a year before the earliest IFM content, named
  `ms shalini.png`, `Amyra and parents.png`, `Aditya tiger.png`. Personal portrait composites.

The remainder are startup/client/investor material or personal documents: `Nitro`,
`Nitro Commerce`, `SkyeAir`, `VC Database`, `Awarathon`, `Avenue Growth`, `Degpeg`,
`Fineoteric`, `Sapphire`, `SLC`, `WeSkill`, `White.Inc`, `Slate_Tech_CVs`, `Panache Docs`,
`Organik Truck`, `Performance Report`, `Net Worth Reports` ×2, `Foreign Admits`,
`A Toddler Thing`, `All Chapters_August 2023`, `All Chapters_September 2022`,
`Alumni Notes - Jan 2023`, `Mumbai_January 2020` (startup pitch videos),
`Infinity Feedback form`, `Ganpati's Case study` (finq.com broker policies and an account
statement), `Tadoba 2021`, `June 2024 Vacation`, `Reservations/Tickets`, `Roei Gavish travel`,
`Credit card statements`, `Dubai Residancy Documents`, `Brighton Goel ID/Passports`, `Goels'`,
`Third Eye Check-Ins`, `Parabolic 2.0`, `Rumble`, `SRE internal`, `Market Pulse/Punch`,
`Karan CV AI test`, `Google AI Studio`, `Folder1`.

---

## 4. Errors I found in my own earlier numbers

Each was caught while doing this, and each made the picture look better or worse than it is.

1. **`Rakshita` double-counted** — it appears twice, once by its real id (linked by IFM-315)
   and once through a Drive shortcut keyed by two tab-joined ids. Inflated "not covered" from
   428 to 774 in the first folder audit.
2. **`._` resource forks counted as media** — 176 of `Rakshita`'s 376 listed files are macOS
   AppleDouble stubs. Every count in the folder audit was inflated by these.
3. **`COVERED` was too lenient** — a folder counted as covered if *one* file in it was
   catalogued. `Pictures` passed on 2 of 123.
4. **`Space x` wrongly excluded** — I matched the folder name and called it another business.
   It is IFM carousel artwork.
5. **`rclone -R` variance** — single passes gave 1,325 and 1,196 files for the same question.
   Only a multi-pass union is safe to quote.
6. **`IFM Content Hub` was invisible** — 565 media files in My Drive, never walked, because
   the registered root pointed at its child rather than at it.

---

## 5. What is required before this can be called complete

Not done, not started, listed so it is not lost:

1. **Catalogue the 304 unreachable files** — 121 in `Pictures`, ~110 across the
   `Aakara — June 2026` subfolders, 17 AI videos, 16 IYA/IFT gallery, 11 Workshop Pictures,
   23 in the Aakara tree, 9 Certificates.
2. **Fix the HEIC blind spot** at the scan level, then re-scan — otherwise the same 103 files
   go missing again on the next pass. Check `.psd` at the same time.
3. **Decide what B means.** 628 files sit inside a folder a catch-all row links. That is a
   deliberate design decision for raw dumps, but `Pictures` and the June artboards are
   finished content and probably deserve rows.
4. **Register the corrected roots** in CLAUDE.md. The current list points at `Content Library`
   instead of its parent `IFM Content Hub`, and omits `Pictures`, `Workshop Pictures`,
   `Hiral Goel`, `Space x` and `Rakshita` entirely.
