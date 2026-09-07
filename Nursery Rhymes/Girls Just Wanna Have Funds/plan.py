# Girls Just Wanna Have Funds - timeline plan
# video_t = song_t - SONG0
SONG0 = 7.86
END   = 97.60
FPS   = 30
CROP  = {'02': 'crop=556:988:82:0'}   # removes burned-in captions
# (clip, clip_start, clip_end, song_start, song_end, note)
SEGS = [
 # ---- S1 chorus A : clip-07 (lips: articulates continuously 0.0-6.1) ----
 ('07',1.74,3.24,  7.86,10.38,'chorus A1'),
 ('07',3.24,3.80, 10.38,12.00,'A1 sustain'),
 ('07',3.80,5.26, 12.00,14.32,'chorus A2'),
 ('07',5.26,6.33, 14.32,15.84,'A2 sustain -> shotchange'),
 # ---- S2 : clip-02 (captions cropped; articulates 0.0-5.5) ----
 ('02',0.00,1.96, 15.84,17.44,'Spend a little'),
 ('02',1.96,3.96, 17.44,18.90,'save a little'),
 ('02',3.96,4.78, 18.90,19.88,'have some fun'),
 ('02',4.78,8.00, 19.88,22.86,'instrumental'),
 # ---- S3 : clip-03 (lips: sings 0.0-2.9, then wide jar B-roll) ----
 ('03',0.00,1.46, 22.86,25.32,'But before you spend your pay'),
 ('03',1.46,3.00, 25.32,26.34,'-> jar wide'),
 ('03',3.00,8.00, 26.34,30.02,'Put a little bit away (jar B-roll)'),
 # ---- S4 : clip-04 (lips: silent 0.0-1.6 -> covers held "Saaave") ----
 ('04',0.00,1.46, 30.02,32.00,'held Saaave over wide'),
 ('04',1.46,2.96, 32.00,34.32,'and invest and have your fun'),
 ('04',2.96,6.58, 34.32,38.50,'You can do both (charts)'),
 ('04',6.58,8.00, 38.50,40.18,'close-up button'),
 # ---- S5 chorus B : clip-01  LIP-ANCHORED (articulation .125-1.75, REST 1.875-3.125, .125 3.25-5.5)
 ('01',0.10,1.80, 40.18,43.14,'B1 sung'),
 ('01',1.80,3.15, 43.14,43.74,'her rest <-> song rest'),
 ('01',3.15,5.55, 43.74,47.00,'B2 sung'),
 ('01',5.55,8.00, 47.00,48.48,'B2 tail'),
 # ---- S6 : clip-06  LIP-ANCHORED (profile 0-1.4, sung 1.5-2.9, REST 2.9-3.9, sung 4.0-5.5)
 ('06',0.00,1.50, 48.48,50.60,'Smart with money (profile entrance)'),
 ('06',1.50,2.90, 50.60,53.20,'still have fun / Thats investing'),
 ('06',2.90,3.75, 53.20,54.10,'her rest <-> held note'),
 ('06',3.75,5.50, 54.10,56.90,'for Mummies'),
 ('06',5.50,8.00, 56.90,59.76,'instrumental at the sign'),
 # ---- S7 chorus C : clip-05  LIP-ANCHORED (dance-smile 0-1.6, sings 1.75-6.15)
 ('05',1.75,3.50, 59.76,62.50,'C1 sung'),
 ('05',3.50,4.05, 62.50,63.76,'C1 sustain'),
 ('05',4.05,6.15, 63.76,66.40,'C2 sung'),
 ('05',6.15,8.00, 66.40,67.74,'C2 tail'),
 # ---- S8 : clip-08 (articulates 0.0-6.6) ----
 ('08',0.00,1.46, 67.74,70.00,"Don't spend tomorrow's money"),
 ('08',1.46,2.96, 70.00,71.60,'money / have'),
 ('08',2.96,4.50, 71.60,73.26,'have your fun'),
 ('08',4.50,5.96, 73.26,75.70,'and save some too'),
 ('08',5.96,8.00, 75.70,79.96,'jar B-roll instrumental'),
 # ---- S9 : clip-09 MINIMISED to its real articulation (0.5-1.5), then cut to the IFM sign
 ('09',0.30,1.60, 79.96,82.40,'Investing for Mummies (1st, sung)'),
 ('06',5.90,8.00, 82.40,86.72,'CUTAWAY: IFM neon sign (2nd)'),
 # ---- S10 : clip-10 LIP-ANCHORED (sung 0-2.875, REST 2.875-3.625, sung 3.75-5.0, then wave+logo)
 ('10',0.000,2.875, 86.72,90.60,'Have your fun, enjoy the ride'),
 ('10',2.875,3.625, 90.60,90.92,'her rest <-> song rest'),
 ('10',3.625,5.000, 90.92,93.10,'Keep your future'),
 ('10',5.000,8.000, 93.10,97.60,'wave -> IFM logo reveal'),
]
CAPS = [
 ( 7.86,11.60,"Girls just wanna have fun"),
 (12.00,15.50,"Girls just wanna have fun"),
 (15.84,18.30,"Spend a little, save a little"),
 (18.90,20.80,"Have some fun"),
 (22.86,26.00,"But before you spend your pay"),
 (26.34,29.90,"Put a little bit away"),
 (30.02,34.90,"Save and invest and have your fun"),
 (35.04,39.90,"You can do both, you don't need just one"),
 (40.18,43.60,"Girls just wanna have fun"),
 (43.74,47.60,"Girls just wanna have fun"),
 (48.48,52.20,"Smart with money, still have fun"),
 (52.30,57.40,"That's Investing for Mummies"),
 (59.76,63.00,"Girls just wanna have fun"),
 (63.76,67.20,"Girls just wanna have fun"),
 (67.74,70.90,"Don't spend tomorrow's money"),
 (71.26,72.90,"Have your fun"),
 (73.26,76.60,"And save some too"),
 (79.96,82.40,"Investing for Mummies"),
 (82.80,86.40,"Investing for Mummies"),
 (86.72,90.80,"Have your fun, enjoy the ride"),
 (90.92,95.00,"Keep your future on your side"),
]
