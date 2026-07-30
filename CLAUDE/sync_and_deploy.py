#!/usr/bin/env python3
"""
IFM Deploy Script
-----------------
1. Extracts the Fund YOUR Goal planner from index.html srcdoc
2. Rebuilds fundgoal.html (with IFM branding) from the latest version
3. Deploys everything to Vercel production

Run: python3 sync_and_deploy.py
"""

import html as html_mod, os, subprocess, sys

FOLDER   = os.path.dirname(os.path.abspath(__file__))
INDEX    = os.path.join(FOLDER, 'index.html')
OUT      = os.path.join(FOLDER, 'fundgoal.html')

START  = 'id="iframe_fundgoal" srcdoc="'
END_MK = '" style="width:100%;min-height:700px;border:none;display:block;"'

# ── 1. Extract planner from srcdoc ───────────────────────────────────────────
print("Reading index.html...")
with open(INDEX, 'r', encoding='utf-8') as f:
    content = f.read()

s = content.find(START)
e = content.find(END_MK, s)
if s == -1 or e == -1:
    print("ERROR: Could not find iframe_fundgoal srcdoc. Aborting.")
    sys.exit(1)

planner = html_mod.unescape(content[s + len(START):e])
print(f"  Planner extracted: {len(planner):,} chars")

# ── 2. Strip any leftover IFM top bar (WP site already shows IFM header) ─────
import re as _re
planner = _re.sub(r'\s*<!-- IFM top bar -->.*?</div>\s*\n', '\n', planner, flags=_re.DOTALL)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(planner)
print(f"  fundgoal.html written: {len(planner):,} chars")

# ── 3. Deploy to Vercel ───────────────────────────────────────────────────────
print("\nDeploying to Vercel...")
result = subprocess.run(
    ['vercel', 'deploy', '--prod'],
    cwd=FOLDER,
    capture_output=False
)
if result.returncode == 0:
    print("\nDone. Live at:")
    print("  https://ifm-deploy.vercel.app          (IFM app)")
    print("  https://ifm-deploy.vercel.app/fundgoal.html  (standalone planner)")
    print("  https://www.investingformummies.com/fund-your-goal  (WordPress)")
else:
    print(f"\nVercel deploy exited with code {result.returncode}")
    sys.exit(result.returncode)
