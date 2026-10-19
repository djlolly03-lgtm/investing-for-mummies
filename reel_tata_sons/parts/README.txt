IFM — TATA SONS REEL · ALL PARTS
Exported 17 Sep 2026. Everything that went into the final cut, plus the final cut.

All clips are 1080x1920, 30fps, H.264. Nothing here has captions, music or
transitions burned in except the final video itself.

--------------------------------------------------------------------------
00-FINAL-VIDEO/
--------------------------------------------------------------------------
IFM_Tata-Sons_FINAL_74s_1080x1920.mp4
    The approved cut. 73.8s. Captions, music, transitions, -16 LUFS.
    Ready to post.

--------------------------------------------------------------------------
01-hiral-takes/   — the selected takes, clean
--------------------------------------------------------------------------
Cropped to 9:16 exactly as in the final cut. Original audio, NO captions,
NO music. In story order. Source timecode from the master file in brackets.

01_HOOK                    "India's most loved brand Tata is currently facing
                            a massive rule change..."            [3.40-10.75]
02_BRIDGE                  "What's happening? Let me try and explain it to you
                            in really simple words."             [10.70-14.50]
03_PARENT                  "Currently Tata Sons is a private company which runs
                            giants like TCS, Titan..."           [81.55-88.35]
04_WHY-LISTING             "Tata Sons lends thousands of crores... which is why
                            the government is forcing it to go public."
                                                                 [89.15-95.40]
05_OWNERSHIP 66%           "Tata Trust, the charitable arm of the Tatas, owns
                            66% of Tata Sons,"                  [197.65-203.10]
06_OWNERSHIP 18% + rest    "About 18% is owned by the billionaire Pallonji
                            family and the rest is owned by some Tata companies
                            like Tata Motors, Tata Chemicals and TCS."
                                                                [203.45-212.85]
07_GOLDMINE                "If Tata Sons lists, it's a gold mine. Shares held by
                            these listed Tata companies could be worth billions
                            overnight..."                       [278.85-290.50]
08_POWER Pallonji          "The Pallonji family will finally be able to unlock
                            value for their shares..."          [315.70-321.70]
09_POWER Trusts            "For Tata Trust, it means answering to public
                            shareholders instead of quietly doing charitable
                            work."                              [364.45-370.20]
10_OUTRO board meeting     "Tata Sons has a massive board meeting scheduled
                            which is going to decide what happens next."
                                                                [406.85-412.20]
11_OUTRO stay tuned        "Stay tuned to find out more."
                            (from the SECOND camera file)          [9.20-10.75]

Takes 01-10 come from the long master; take 11 from the short second file.
The 4K/60fps camera masters are NOT in this zip - they are ~4GB. Ask if needed.

--------------------------------------------------------------------------
02-graphics-as-used/   — the visuals exactly as they appear, silent
--------------------------------------------------------------------------
G1   $100 BILLION TATA SECRET card                               3.9s
G2   PARENT COMPANY hierarchy WITH the gold coin flow  <- used   6.6s
G2b  the same hierarchy plain, no coins (reference)              6.6s
G3   OWNERSHIP donut 66/18/16  <- REBUILT BY US, not AI          9.3s
G4   WHAT HAPPENS NEXT end card                                  2.6s
G5   IFM logo reveal                                             2.8s

G2's coins and G3 entirely were built here in Python, frame by frame.
G3 reveals in time with Hiral's words - 18% lands as she says it, the 16%
slice and the three company cards land on "and the rest is owned by...".

--------------------------------------------------------------------------
03-original-animations/   — the AI clips exactly as supplied, untouched
--------------------------------------------------------------------------
720x1280, 10s each, as delivered. Four were used, three were not:

SRC_100-billion-tata-secret          USED
SRC_parent-company-hierarchy         USED (coins added on top)
SRC_what-happens-next-end-card       USED
SRC_ifm-logo-reveal                  USED

SRC_ownership-donut_REJECTED         NOT USED - the figures and arrows are wrong.
    66% + 18% = 84%; the remaining 16% is missing from the chart entirely, and
    its arrows point OUTWARD (Tata Sons -> companies) when the script says the
    companies own part of Tata Sons. Tata Chemicals also appears twice.
    Replaced with G3, built from scratch.

SRC_treasure-chest                   NOT USED - it repeated what Hiral says
    out loud ("it's a gold mine"), so it was cut to reduce clutter.

SRC_sebi-rule-conflict               NOT USED - introduces a regulatory idea
    (COMPLY vs SEEK EXEMPTION) that Hiral never explains, and it was the
    hardest thing in the reel to read.

--------------------------------------------------------------------------
Method, settings and gotchas: "IFM Talking-Head Reel Playbook.md" in the
project root. Caption text for the post: reel_tata_sons/caption.md
