IFM — NSE IPO REEL (FRESH ISSUE vs OFS) · ALL PARTS
Exported 18 Sep 2026 (v7 — neighbour clip re-trimmed). Everything that went into the final cut, plus the cut itself.

All clips 1080x1920, 30fps, H.264. Only the final video has captions, transitions
and the final mix. Everything else is clean so it can be re-cut.

--------------------------------------------------------------------------
00-FINAL-VIDEO/
--------------------------------------------------------------------------
IFM_NSE-IPO_FINAL_63s_1080x1920.mp4
    The approved cut. 63.5s, -15.2 LUFS, no music (voice only). Ready to post.

--------------------------------------------------------------------------
01-hiral-takes/   — Hiral, clean, NO captions, original audio
--------------------------------------------------------------------------
Twelve pieces in story order. One continuous take was recorded, so these are
that take split at her sentence breaks. Timecodes refer to the master file.

01_HOOK              "The NSE IPO is finally here. At 22,561 crores, it's one of
                      the biggest IPOs India has seen."               [0.00-8.10]
02_BRIDGE            "And while many of us bid for it, let me quickly explain one
                      thing about IPOs."                              [8.10-12.25]
03_DEFINITION        "When a company goes public, it can do a fresh issue or an
                      offer for sale. In a fresh issue, a company creates new
                      shares and sells them to investors."           [12.25-20.80]
04_FRESH-ISSUE       "The money goes to the company which can use it for
                      expansion."                                    [20.80-24.05]
05_OFS               "In an offer for sale or OFS, existing shareholders sell
                      their shares that they already own."           [24.05-30.15]
06_OFS-MONEY         "The money goes to those shareholders, not the company."
                                                                     [30.15-33.30]
07_ANALOGY-NEW       "Think of it like buying a car. A fresh issue is like buying
                      a brand new car from the showroom. Your money goes to the
                      car company."                                  [33.30-40.45]
08_ANALOGY-USED      "An OFS is like buying a used car from your neighbour. Your
                      money goes to the neighbour, but the company gets nothing."
                                                                     [40.45-46.75]
09_THE-POINT         "And the NSE IPO is 100% OFS."                  [46.75-49.30]
10_SO-WHAT           "NSE gets no money from the IPO, but investors are still
                      bidding. Let's see where this IPO lands."      [49.30-55.95]
11_SIGNOFF           "I'm Hiral Goel, founder of Investing for Mummies."
                                                                     [55.95-59.35]
12_CTA               "Follow along to understand investing concepts in simple
                      language."                                     [59.35-63.20]

--------------------------------------------------------------------------
02-graphics-as-used/   — the visuals exactly as they appear, silent
--------------------------------------------------------------------------
G1  Newspaper montage — the supplied clip, pushed-in section        4.1s
G2  FRESH ISSUE — NEW SHARES down to THE COMPANY (teal)             3.2s
G3  OFS — EXISTING SHARES down to THE SHAREHOLDER (gold)            3.1s
G4  Showroom — brand-new car (supplied, inset on cream)             7.2s
G5  Neighbour — used car (supplied, inset on cream)                 6.3s
G6  100% OFS stamp — NSE GETS NO IPO MONEY                          2.5s
G7  IFM end card                                                    3.8s

G2, G3, G6 and G7 were built here frame by frame in Python on the IFM card
template. G1, G4 and G5 come from the supplied animation (see below).

--------------------------------------------------------------------------
03-original-assets/   — what was supplied, untouched
--------------------------------------------------------------------------
SRC_hiral-full-take_63s.mp4                 the full take, one clean pass
SRC_animated-graphics_...mp4                the supplied animation, 38.8s
                                            landscape. Its portrait card sits in
                                            a 608x1080 window at x=656.

--------------------------------------------------------------------------
NOTES FOR WHOEVER PICKS THIS UP
--------------------------------------------------------------------------
- No music. Her voice runs continuously, so there is no exposed silence.
- Captions appear ONLY when Hiral is on screen. The cards carry their own
  headline and bar, so a caption over them would repeat the artwork.
- Card content sits above y=1650 so Instagram's UI does not cover it.
- The newspaper montage uses the clip's PUSHED-IN section (source 2.05-5.35),
  not the wide shots at either end. In the wide shots the Times of India
  headline reads "NSEE files for 22,5561-crore IPO" — a doubled letter and a
  wrong figure at headline size. The pushed-in section keeps that paper out of
  frame and shows the correct Economic Times headline. Do not re-extend this
  shot without re-checking that.
- G5 (neighbour / used car) stops at source 37.05s and is stretched 1.096x to
  fill its 6.3s slot. The supplied animation runs a SECOND money handover right
  after that point, which reads as the buyer paying twice. Cut it. Do not
  re-extend this shot either.
- Smaller newsprint in the montage is AI gibberish. Reviewed and accepted: at
  four seconds on a phone it reads as newspaper texture.
- No font on this machine carries the rupee glyph. It renders as an empty box.
  Never put a rupee sign into generated text — the sign visible in the montage
  is inside the photograph, which is fine.

Method and settings: "IFM Talking-Head Reel Playbook.md" in the project root.
