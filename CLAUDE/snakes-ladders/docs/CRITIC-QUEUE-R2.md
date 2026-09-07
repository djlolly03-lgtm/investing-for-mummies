# Round 2 — re-scored on the current build, 7 Sep

Average **3.75 → 6.75**. Two slices now beat the benchmark.

| slice | round 1 | round 2 | benchmark | blind winner |
|---|---|---|---|---|
| endgame | 6 | **7.5** | 6 | ours |
| teaching | 5 | **7** | 6 | ours |
| hud | 4 | **7** | 8 | tie |
| language | 3 | **7** | 9 | reference |
| handoff | 3 | **7** | 8 | reference |
| projector | 4 | **6.5** | 7 | reference |
| first30 | 1 | **6** | 8 | reference |
| board | 4 | **6** | 9 | reference |

## The single biggest gap per slice

- **first30 / board / projector — THE CAMERA NEVER FILLS THE SCREEN.** Named independently
  by three critics. Board is 38.6-42% of phone height with ~580px of bare table; 15% of a
  projector's pixels with 83% wood; and the lesson zoom *overshoots*, cropping the right
  column (91, 90, 71, 70, 51, 31, 11 sliced, "30" and "10" cut mid-badge). Also: the two
  pieces start as 14dp beads lying OFF the board on the frame, so "where am I?" is answered
  by two marbles that look like they rolled off the table.
- **language — no Devanagari typeface is loaded.** index.html declares only Nunito and Lora.
  Every Devanagari glyph renders in an uncontrolled OS fallback (Noto Sans Devanagari on the
  actual Android audience); Lora italic is a synthetic oblique; every Hinglish line puts two
  mismatched faces side by side.
- **hud — the HUD spoils the dice.** The Roll plaque prints the result at t<=60ms, ~800ms
  before the 3D die stops tumbling, and the pips POP IN against an empty button, so the
  spoiler is the first thing that moves. Ludo King's dice is a 600-900ms unknown; ours is a
  60ms known followed by 800ms of ornamental spinning.
- **handoff — the card fails contrast on saffron**, the default opponent colour in every
  2-player game: white on #e08a1e is 2.68:1 for the name, 2.40:1 for standings and TAP,
  against a 4.5:1 spec. It is the most-shown screen in the game and on a phone it is the
  whole screen.
- **teaching — "Read more" auto-scrolls to the bottom** on every card, throwing the title,
  the arithmetic, the gold rupee figure, the term chip and the mint escape band off the top
  with a mid-glyph slice and no fade or cue. The reader who engages most is the one the
  layout punishes.
- **endgame — the win still isn't a moment.** Zero visible confetti at the victory frame
  (two of three seeds fire at squares 45 and 56, behind the opaque plate), the plate hides
  the board it is celebrating (entirely, on phone, against DESIGN.md §12 beat 1), and the
  other player's navy shield snackbar is still painted across the board under the button.
