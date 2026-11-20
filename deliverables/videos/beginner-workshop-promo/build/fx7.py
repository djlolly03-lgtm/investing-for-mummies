#!/usr/bin/env python3
"""fx6 (IFM variants of the effects skill) + two placement variants for this promo, where Hiral's head sits high in frame:
led-sign-top (one line, pinned to the top, sized to clear her head) and match-cut-top (key word pinned above her head)."""
import sys, os
sys.path.insert(0, os.path.expanduser("~/Developer/ifm-fxsamples"))
import fx6
fx6._variant('fx_led_sign', 'led-sign-top', 'LED sign pinned to the top edge',
             [("c.H * 0.3 / (len(mats) * 12)", "c.H * 0.15 / (len(mats) * 12)"),
              ("int(max(c.H * 0.03, c.fy - c.fw * 0.75 - ph))", "int(c.H * 0.025)")])
fx6._variant('fx_match_cut', 'match-cut-top', 'match-cut (IFM copy) with the word pinned above the head',
             [("max(c.H * 0.1, c.fy - c.fw * 1.55)", "c.H * 0.072"), ("match_page(c, e, j, wx, wy)", "match_page_ifm(c, e, j, wx, wy)")])
if __name__ == '__main__':
    fx6.fx.main()
