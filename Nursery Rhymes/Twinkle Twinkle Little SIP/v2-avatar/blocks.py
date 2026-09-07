# Shared block table.
#
# Clip-side anchors are read off per-frame mouth strips (playbook 3.2), assigned
# by VISEME TYPE against the phonetics (a /tw/ glide is a rounded pucker that
# STARTS "twinkle"; /kl/ is a closure; vowels are open).
#
# Song-side anchors for verse 1 come from PITCH tracking, not energy.  The first
# two sung notes are quiet enough that an energy threshold skips them entirely -
# which is why the avatar sat silent while the vocal had already started at ~4.1s.
# "Twinkle Twinkle" has an unmistakable melody: three PAIRS of equal notes then a
# held one.  Autocorrelation F0 on the centre channel (150-1200Hz) shows exactly
# that, and it fixes the line start:
#     Twin 4.16 / kle 4.64   (equal notes)
#     twin 4.96 / kle 5.26   (equal notes)
#     lit  5.46 / tle 5.86   (equal notes)
#     SIP  6.24              (different note, held to ~6.96)
#     L2   Small 7.12  small 7.48  coins 7.79  on 8.07  ev 8.39  ry 8.68  trip 9.03
# Whisper's word starts (4.62, 5.30, 5.86, 6.54) land on the SECOND syllable of
# each word here, so they read ~0.45s late - do not use them for verse 1.
# L3 onward was already verified to within 0.07s and is unchanged:
#   L3 Save 9.94  one 10.21  ru 10.59  pee 10.85  then 11.14  save 11.47  more 11.75
#   L4 Watch 12.43  it 12.72  grow 13.01  like 13.31  never 13.83  before 14.28
#   L5 Put 14.86  it 15.05  in 15.47  the 15.55  money 15.95  jar 16.72
#   L6 Don't 17.34  touch 17.96  let 18.53  it 18.87  far 19.23

BLOCKS = [
 # Intro: the sunset-cloud logo reveal.  Already 9:16, so no padding - and it
 # bookends clip G, which ends on the same logo emerging from the same clouds.
 # The source is only 3.178s, so 2.70 + the 0.467 dissolve tail is all it has.
 dict(name="01-logo", src="LOGO2-sunset-clouds", span=(0.00, 2.25), slot=(0.00, 2.25), anch=[]),

 # A1 - lead-in + L1.  Her 1.91s of non-singing head start now covers the song's
 # shorter instrumental intro, so "Twin" lands on the real 4.16 attack.
 #     song  Twin 4.16  kle 4.64  twin 4.96  kle 5.26  lit 5.46  tle 5.86  SIP 6.24
 #     clip  Twin 1.91  kle 2.21  twin 2.45  kle 2.85  lit 3.00  tle 3.22  SIP 4.14
 # 2.23s of clip against 2.08s of song = 1.07x.  Her long "tle" hold (3.30-4.00,
 # mouth barely moving) absorbs the compression, and the song's held "SIP" is
 # covered by the coin-shower where her mouth is occluded anyway.
 dict(name="02-A1", src="A-twinklesip01", span=(0.00, 5.00), slot=(2.25, 7.12), xf=0.46667, anch=[
     (1.910, 4.16), (2.210, 4.64), (2.450, 4.96), (2.850, 5.26),
     (3.000, 5.46), (3.220, 5.86), (4.140, 6.24)],
     rests=[(0.00, 1.80), (3.30, 4.00)], cap=(0.55, 1.55)),

 # A2 - L2.  Overall 1.92s of clip against 1.91s of song = 1.00x; her 0.5s hold
 # between "coins" and "on" takes the compression.
 #     song  Small 7.12  small 7.48  coins 7.79  on 8.07  ev 8.39  ry 8.68  trip 9.03
 #     clip  Small 5.88  small 6.34  coins 6.72  on 7.22  ev 7.43  ry 7.55  trip 7.80
 dict(name="02-A2", src="A-twinklesip01", span=(5.78, 8.30), slot=(7.12, 9.94), xf=0.26667, anch=[
     (5.883, 7.12), (6.342, 7.48), (6.717, 7.79), (7.217, 8.07),
     (7.425, 8.39), (7.550, 8.68), (7.800, 9.03)],
     rests=[(6.85, 7.15), (8.05, 8.30)], cap=(0.52, 1.55)),

 # B - restructured on its real cuts (4.375, 6.417).  Her 1.3s rest between
 # "rupee," and "then" does not exist in the song, so the coin insert covers it.
 dict(name="03-B1", src="B-singing-saving", span=(0.50, 1.60), slot=(9.94, 11.14), anch=[
     (0.500, 9.94), (0.750, 10.21), (1.000, 10.59)]),
 dict(name="04-B2", src="B-singing-saving", span=(4.375, 6.00), slot=(11.14, 12.43), anch=[]),
 dict(name="05-B3", src="B-singing-saving", span=(6.50, 8.75), slot=(12.43, 14.86), anch=[
     (6.500, 12.43), (7.000, 13.01), (7.750, 13.83), (8.375, 14.28)]),

 # C - its three natural shots land almost exactly on the two lines.
 dict(name="06-C1", src="C-coins-jar", span=(0.00, 1.25), slot=(14.86, 16.20), anch=[
     (0.000, 14.86), (0.440, 15.47), (1.020, 15.95)]),
 dict(name="07-C2", src="C-coins-jar", span=(1.25, 2.458), slot=(16.20, 17.34), anch=[]),
 dict(name="08-C3", src="C-coins-jar", span=(2.458, 5.25), slot=(17.34, 19.40), anch=[
     (2.500, 17.34), (3.000, 17.96), (5.000, 19.23)],
     rests=[(3.10, 4.30)]),   # she looks down at the jar - face tracking drops
 # C4 - her shot3 ends on a real cut at 5.25; the unused coin macro covers the
 # gap after "far" so C3 does not have to slow-mo into D.
 dict(name="08b-C4", src="C-coins-jar", span=(5.25, 5.70), slot=(19.40, 19.76), anch=[]),

 # D - mouth starts at 1.750, a full 0.49s after the clip's own audio says 1.26.
 dict(name="09-D", src="D-meadow", span=(1.75, 6.90), slot=(19.76, 24.68), anch=[
     (1.750, 19.76), (2.500, 20.28), (3.000, 20.70), (3.625, 21.64),
     (4.500, 22.24), (5.000, 22.72), (6.000, 23.78)],
     rests=[(6.10, 6.90)]),   # chin on hand, bluebird lands - singing is over

 # E - playbook 5.  Her "Twinkle twinkle little SIP" needs 1.6-1.9x no matter
 # how the stretch is redistributed, so stop retiming it and cut away: C's
 # unused coin macro carries the hook line, and E keeps only her second line.
 dict(name="10-E1", src="C-coins-jar", span=(5.70, 7.35), slot=(24.68, 26.30), anch=[]),
 dict(name="10-E2", src="E-sings-stands", span=(3.30, 7.40), slot=(26.30, 29.60), anch=[
     (4.240, 27.16), (5.550, 28.12)],
     rests=[(3.30, 4.20), (5.85, 7.40)]),

 # F - her two rests do not exist in the song at all (zero gap between "magic"
 # and "Patience", and between "too" and "That's").  Compressing them made the
 # camera pull-back visibly accelerate, so instead the rests are CUT OUT and the
 # position jump is hidden under a 0.27s dissolve - normal grammar for a jump
 # inside a slow dolly.  Every sung phrase then plays at about 1.0x.
 dict(name="11-F1", src="F-holding-jar", span=(0.20, 1.30), slot=(29.60, 30.68), anch=[
     (0.250, 29.62), (1.200, 30.58)]),
 dict(name="11-F2", src="F-holding-jar", span=(1.95, 2.70), slot=(30.68, 31.80), xf=0.26667, anch=[
     (2.000, 30.75), (2.520, 31.45)], cap=(0.62, 1.45)),
 dict(name="11-F3", src="F-holding-jar", span=(3.40, 6.40), slot=(31.80, 34.60), xf=0.26667, anch=[
     (3.500, 31.89), (5.000, 33.26), (5.625, 33.80)]),

 # G - no vocals.  Covers the instrumental outro, ends on the IFM logo reveal.
 dict(name="12-G", src="G-jar-waving", span=(0.00, 10.00), slot=(34.60, 45.84), anch=[]),
]
