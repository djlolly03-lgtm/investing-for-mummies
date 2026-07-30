#!/usr/bin/env python3
"""
Insert the Financial Goal Tracker planner into index.html.
Steps:
  1. Entity-encode goal-tracker.html
  2. Wrap it in a res_goaltrack div and insert after res_fundgoal
  3. Add rtab_goaltrack tab button after rtab_fundgoal
  4. Update switchResource to include 'goaltrack'
  5. Add home screen card after fundgoal card
"""

import re

INDEX = "/Users/lollyg/Documents/investing for Mummies/CLAUDE/index.html"
PLANNER = "/Users/lollyg/Documents/investing for Mummies/CLAUDE/goal-tracker.html"

# ── 1. Read files ──────────────────────────────────────────────────────────────
with open(INDEX, 'r', encoding='utf-8') as f:
    html = f.read()

with open(PLANNER, 'r', encoding='utf-8') as f:
    planner_raw = f.read()

# ── 2. Entity-encode the planner HTML for srcdoc ────────────────────────────
def entity_encode(s):
    s = s.replace('&', '&amp;')
    s = s.replace('<', '&lt;')
    s = s.replace('>', '&gt;')
    s = s.replace('"', '&quot;')
    s = s.replace("'", '&#x27;')
    return s

encoded = entity_encode(planner_raw)

# ── 3. Build the new section HTML ────────────────────────────────────────────
new_section = '''
  <!-- Financial Goal Tracker -->
  <div id="res_goaltrack" style="display:none;">
    <div class="game-hero" style="background:linear-gradient(135deg,#1a3a5c 0%,#2a9d8f 60%,#c9a84c 100%);" data-logo="white">
      <div class="gh-tag">🎯 Resource · Goal Planning</div>
      <h2>Financial Goal Tracker</h2>
      <p>Track your short, medium and long-term goals — and see exactly how funded each one is.</p>
    </div>
    <div style="border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(26,58,92,0.06);">
      <iframe id="iframe_goaltrack" srcdoc="''' + encoded + '''" style="width:100%;min-height:700px;border:none;display:block;" title="Financial Goal Tracker"></iframe>
    </div>
  </div>

'''

# ── 4. Insert section after res_fundgoal closing </div> ──────────────────────
# The res_fundgoal section ends with:
#   </div>          (closes iframe wrapper)
# </div>            (closes res_fundgoal)
# (blank line)
# </div>            (closes resources game-screen)

# Find res_fundgoal's closing </div> followed by the game-screen closing </div>
# We insert before the game-screen closing </div>

# Pattern: find  "  </div>\n\n</div>" after the fundgoal section
# More precisely: insert right after the last </div> that closes res_fundgoal
# We'll anchor on the specific iframe title

anchor = 'title="Fund YOUR Goal Planner"></iframe>\n    </div>\n  </div>'
replacement = 'title="Fund YOUR Goal Planner"></iframe>\n    </div>\n  </div>\n' + new_section.rstrip('\n')

if anchor in html:
    html = html.replace(anchor, replacement, 1)
    print("✓ Inserted res_goaltrack section after res_fundgoal")
else:
    print("✗ Could not find res_fundgoal anchor — check index.html")
    exit(1)

# ── 5. Add nav tab button ─────────────────────────────────────────────────────
tab_anchor = '<button class="res-tab" id="rtab_fundgoal" onclick="switchResource(\'fundgoal\')"><span class="rt-icon">🎯</span> Fund Goal</button>'
tab_new    = tab_anchor + '\n    <button class="res-tab" id="rtab_goaltrack" onclick="switchResource(\'goaltrack\')"><span class="rt-icon">📋</span> Goal Tracker</button>'

if tab_anchor in html:
    html = html.replace(tab_anchor, tab_new, 1)
    print("✓ Added rtab_goaltrack tab button")
else:
    print("✗ Could not find rtab_fundgoal tab button")
    exit(1)

# ── 6. Update switchResource ──────────────────────────────────────────────────
old_tools = "var tools = ['goals','sip','swp','retire','edu','budget','holiday','alloc','divplan','fundgoal'];"
new_tools = "var tools = ['goals','sip','swp','retire','edu','budget','holiday','alloc','divplan','fundgoal','goaltrack'];"

if old_tools in html:
    html = html.replace(old_tools, new_tools, 1)
    print("✓ Updated switchResource tools array")
else:
    print("✗ Could not find switchResource tools array")
    exit(1)

# ── 7. Add home screen card ───────────────────────────────────────────────────
card_anchor = '''    <div class="gp-card" style="background:linear-gradient(135deg,#e8f5f0,#d4efe9);border:2px solid transparent;" onclick="showResource('fundgoal')">
      <span class="gp-tag" style="background:#d4efe9;color:var(--teal);">Planner</span>
      <span class="gp-icon">🎯</span>
      <div class="gp-name">Fund YOUR Goal</div>
      <div class="gp-desc">Get the exact SIP &amp; lump sum needed for any goal — inflation-adjusted</div>
    </div>'''

card_new = card_anchor + '''
    <div class="gp-card" style="background:linear-gradient(135deg,#e8f5f2,#d0ece7);border:2px solid transparent;" onclick="showResource('goaltrack')">
      <span class="gp-tag" style="background:#d0ece7;color:var(--teal);">Planner</span>
      <span class="gp-icon">📋</span>
      <div class="gp-name">Goal Tracker</div>
      <div class="gp-desc">Track short, medium &amp; long-term goals — see your funding progress at a glance</div>
    </div>'''

if card_anchor in html:
    html = html.replace(card_anchor, card_new, 1)
    print("✓ Added home screen card for Goal Tracker")
else:
    print("✗ Could not find fundgoal home screen card anchor")
    exit(1)

# ── 8. Write out ─────────────────────────────────────────────────────────────
with open(INDEX, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n✅ All done — index.html updated successfully.")
