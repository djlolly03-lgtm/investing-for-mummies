IFM — TATA SONS BOARD MEETING REEL · ALL PARTS
Exported 18 Sep 2026. Everything that went into the final cut, plus the cut itself.

All clips 1080x1920, 30fps, H.264. Only the final video has captions, transitions
and the final mix. Everything else is clean so it can be re-cut.

--------------------------------------------------------------------------
00-FINAL-VIDEO/
--------------------------------------------------------------------------
IFM_Tata-Board-Meeting_FINAL_53s_1080x1920.mp4
    The approved cut. 53.2s, -16 LUFS, no music (voice only). Ready to post.

--------------------------------------------------------------------------
01-hiral-takes/   — Hiral, clean, NO captions, original audio
--------------------------------------------------------------------------
Seven pieces in story order. One continuous take was recorded, so these are
simply that take split at her natural sentence breaks. Timecode in brackets
refers to the master file (SRC_hiral-full-take).

01_HOOK                 "Remember the Tata Sons board meeting we told you about
                         earlier? Two important decisions have now been made."
                                                                   [0.00-5.95]
02_DECISION-1           "First, N. Chandrasekaran has been reappointed as
                         executive chairman for a term of another 5 years,
                         despite the fact that he had decided to step down."
                                                                  [5.95-15.10]
03_DECISION-2           "Second, the board has decided to move forward with the
                         listing of Tata Sons. This doesn't mean the IPO is
                         happening tomorrow, but the process is underway."
                                                                 [15.10-23.70]
04_THE-VOTE             "But not everyone in the boardroom agreed. Four directors
                         voted in favour... but Noel Tata voted against it."
                                                                 [23.70-34.90]
05_THE-CHALLENGE        "The Tata Trusts have also challenged the validity of
                         Chandrasekaran's reappointment. And why this matters..."
                                                                 [34.90-42.05]
06_WHY-IT-MATTERS       "...is because the Tata Trust owns 66% of Tata Sons, so
                         it will be really interesting to see..."  [42.05-46.45]
07_OUTRO                "...how this plays out. Follow us for more such investing
                         insights."                               [46.45-50.20]

--------------------------------------------------------------------------
02-graphics-as-used/   — the visuals exactly as they appear, silent
--------------------------------------------------------------------------
G1  N. Chandrasekaran — portrait, REAPPOINTED, 5 MORE YEARS badge      6.1s
G2  Listing card — the board moves ahead                               4.8s
G3  Four directors voted in favour — real photos, ticks land in turn   4.3s
G4  Noel Tata voted against — red bar                                  4.3s
G5  Tata Trusts owns 66% — animated donut                              4.4s
G6  IFM logo end card                                                  2.8s

G1, G3, G4, G5 and G6 were built here frame by frame in Python, on the IFM
card template. They animate in time with Hiral's words — the "5 MORE YEARS"
badge pops as she says "5", each director's tick lands as they appear.
G2 is the supplied animated clip, recropped (see below).

--------------------------------------------------------------------------
03-original-assets/   — what was supplied, untouched
--------------------------------------------------------------------------
SRC_hiral-full-take_50s_4K.mp4        the full take, one clean pass, no retakes
SRC_animated-cards-V1                 USED, but only 10.2s onward. Its first 10s
                                      replay the Chandrasekaran card, and its top
                                      and bottom carried garbled AI text
                                      ("TATA NDA 2423", "Powrised by: ...
                                      Insousionsty of Manstrinatives"), so it was
                                      cropped to the headline area and placed on
                                      a clean IFM card.
SRC_animated-cards-V2                 NOT USED — same cards as V1, and the stills
                                      were available at full resolution.
SRC_storyboard-collage_v1.png         SOURCE OF THE DIRECTOR PHOTOS. Its portraits
                                      are 188px vs 63-113px in the individual
                                      cards — 1.8x to 3x sharper.
SRC_scene*.png, SRC_02_tata_trusts... the supplied cards. Used as reference; most
                                      were rebuilt so the layout clears
                                      Instagram's UI and the type matches.

--------------------------------------------------------------------------
NOTES FOR WHOEVER PICKS THIS UP
--------------------------------------------------------------------------
- No music. The founder reviewed four directions and chose none; her voice runs
  continuously, so there is no exposed silence.
- Captions appear ONLY when Hiral is on screen. The cards carry their own
  headline and label, so a caption over them would repeat the artwork.
- All card content sits above y=1650 so Instagram's handle, caption and audio
  ticker do not cover it.
- The ownership card states OWNERSHIP only. 66% of equity is not 66% of the vote
  — Tata Sons has share classes and shareholder agreements. Do not reintroduce a
  voting claim.
- The portraits come from an AI-generated asset set. They read as professional
  headshots, but they are not press photographs. Worth deciding before reuse.

Method and settings: "IFM Talking-Head Reel Playbook.md" in the project root.
