#!/usr/bin/env python3
"""
Fix generateReport headers in index.html for all 6 resources.
"""

import sys

FILE = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/index.html'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original = content  # keep a copy to detect changes

changes = []
not_found = []

def report_change(label, found=True):
    if found:
        changes.append(label)
    else:
        not_found.append(label)

# ─────────────────────────────────────────────────────────────────────────────
# Helper: replace only the LAST occurrence of old_str before position `before`
# ─────────────────────────────────────────────────────────────────────────────
def replace_last_before(text, old_str, new_str, before_pos):
    """Replace the last occurrence of old_str that ends before before_pos."""
    idx = text.rfind(old_str, 0, before_pos)
    if idx == -1:
        return text, False
    return text[:idx] + new_str + text[idx + len(old_str):], True

# ─────────────────────────────────────────────────────────────────────────────
# ENTITY-ENCODED RESOURCES
# ─────────────────────────────────────────────────────────────────────────────

OLD_CSS_ENCODED = (
    "  h += &#x27;.rpt-hdr { background: linear-gradient(135deg, #0f2740 0%, #1a3a5c 55%, #1e4a6e 100%); "
    "padding:22px 32px; display:flex; align-items:center; gap:20px; position:relative; overflow:hidden; }&#x27;;\n"
    "  h += &#x27;.rpt-hdr::before { content:&quot;&quot;; position:absolute; inset:0; background: "
    "radial-gradient(ellipse at 70% 50%, rgba(189,233,228,0.15), transparent 65%); }&#x27;;\n"
    "  h += &#x27;.rpt-title { position:relative; z-index:1; }&#x27;;\n"
    "  h += &#x27;.rpt-title h1 { font-family: Lora, serif; font-size:1.6rem; font-weight:700; "
    "color:#fff; margin:0 0 4px; letter-spacing:0.5px; }&#x27;;\n"
    "  h += &#x27;.rpt-title .rpt-sub { color:rgba(255,255,255,0.6); font-size:0.8rem; }&#x27;;\n"
    "  h += &#x27;.rpt-title .rpt-date { color:#c9a84c; font-size:0.78rem; font-weight:800; margin-top:6px; }&#x27;;"
)

def new_css_encoded(bg_gradient):
    return (
        f"  h += &#x27;.rpt-hdr {{ background:{bg_gradient}; padding:18px 20px 18px 175px; "
        "color:#fff; position:relative; overflow:hidden; border-radius:16px; margin-bottom:14px; "
        "page-break-inside:avoid; break-inside:avoid; }&#x27;;\n"
        "  h += &#x27;.rpt-hdr::before { content:&quot;&quot;; position:absolute; inset:0; opacity:0.07; "
        "background-image:radial-gradient(circle,#fff 1px,transparent 1px); background-size:28px 28px; "
        "pointer-events:none; }&#x27;;\n"
        "  h += &#x27;.rpt-logo { position:absolute; left:12px; top:50%; transform:translateY(-50%); "
        "height:70%; width:auto; max-height:80px; object-fit:contain; border-radius:8px; "
        "-webkit-print-color-adjust:exact; print-color-adjust:exact; z-index:2; }&#x27;;\n"
        "  h += &#x27;.rpt-title { position:relative; z-index:1; text-align:center; }&#x27;;\n"
        "  h += &#x27;.gh-tag { display:inline-block; background:rgba(255,255,255,0.2); "
        "border:1px solid rgba(255,255,255,0.3); font-size:0.6rem; font-weight:900; letter-spacing:1.5px; "
        "padding:3px 12px; border-radius:20px; text-transform:uppercase; margin-bottom:6px; color:#fff; }&#x27;;\n"
        "  h += &#x27;.rpt-title h2 { font-family: Lora, serif; font-size:clamp(1.2rem,2.5vw,1.6rem); "
        "font-weight:700; color:#fff; margin:0 0 4px; line-height:1.2; }&#x27;;\n"
        "  h += &#x27;.rpt-title p { color:rgba(255,255,255,0.78); font-size:0.8rem; margin:0 auto 4px; }&#x27;;\n"
        "  h += &#x27;.rpt-date { color:#c9a84c; font-size:0.72rem; font-weight:800; margin-top:4px; }&#x27;;"
    )

OLD_LOGOTAG_ENCODED = (
    "  var logoTag = logoSrc ? &#x27;&lt;img src=&quot;&#x27; + logoSrc + &#x27;&quot; "
    "style=&quot;-webkit-print-color-adjust:exact;print-color-adjust:exact;height:72px;border-radius:10px;"
    "flex-shrink:0;position:relative;z-index:1;&quot;&gt;&#x27; : &#x27;&#x27;;"
)

NEW_LOGOTAG_ENCODED = (
    "  var logoTag = logoSrc ? &#x27;&lt;img src=&quot;&#x27; + logoSrc + &#x27;&quot; class=&quot;rpt-logo&quot;&gt;&#x27; : &#x27;&#x27;;"
)

def old_header_encoded(title):
    return (
        "  h += &#x27;&lt;div class=&quot;rpt-hdr&quot;&gt;&#x27; + logoTag + &#x27;&lt;div class=&quot;rpt-title&quot;&gt;&#x27;;\n"
        f"  h += &#x27;&lt;h1&gt;{title}&lt;/h1&gt;&#x27;;\n"
        "  h += &#x27;&lt;div class=&quot;rpt-sub&quot;&gt;Prepared with Investing for Mummies&lt;/div&gt;&#x27;;\n"
        "  h += &#x27;&lt;div class=&quot;rpt-date&quot;&gt;\\u{1F4C5} &#x27; + today + &#x27;&lt;/div&gt;&#x27;;\n"
        "  h += &#x27;&lt;/div&gt;&lt;/div&gt;&#x27;;"
    )

def new_header_encoded(tag_content, h2_title, subtitle):
    return (
        "  h += &#x27;&lt;div class=&quot;rpt-hdr&quot;&gt;&#x27; + logoTag + &#x27;&lt;div class=&quot;rpt-title&quot;&gt;&#x27;;\n"
        f"  h += &#x27;&lt;div class=&quot;gh-tag&quot;&gt;{tag_content}&lt;/div&gt;&#x27;;\n"
        f"  h += &#x27;&lt;h2&gt;{h2_title}&lt;/h2&gt;&#x27;;\n"
        f"  h += &#x27;&lt;p&gt;{subtitle}&lt;/p&gt;&#x27;;\n"
        "  h += &#x27;&lt;div class=&quot;rpt-date&quot;&gt;&#x1F4C5; &#x27; + today + &#x27;&lt;/div&gt;&#x27;;\n"
        "  h += &#x27;&lt;/div&gt;&lt;/div&gt;&#x27;;"
    )

DASHBOARD_FIX_ENCODED = "  h += &#x27;#dashboard{display:block!important;}&#x27;;"

# ─────────────────────────────────────────────────────────────────────────────
# RESOURCE DEFINITIONS (entity-encoded)
# ─────────────────────────────────────────────────────────────────────────────

resources = [
    {
        'name': 'SIP Calculator',
        'title_marker': '&#x27;&lt;h1&gt;SIP STEP-UP CALCULATOR&lt;/h1&gt;&#x27;',
        'old_h1': 'SIP STEP-UP CALCULATOR',
        'bg': 'linear-gradient(135deg,#1a3a5c 0%,#264d78 50%,#2a9d8f 100%)',
        'tag': '&#x1F4C8; Resource &amp;middot; SIP Planning',
        'h2': 'SIP Calculator',
        'subtitle': 'See how a small annual increase in your SIP can build dramatically more wealth over time.',
        'fix_css': True,
        'fix_logotag': True,
        'fix_header': True,
        'fix_dashboard': False,
    },
    {
        'name': 'Retirement Planner',
        'title_marker': '&#x27;&lt;h1&gt;RETIREMENT PLANNER&lt;/h1&gt;&#x27;',
        'old_h1': 'RETIREMENT PLANNER',
        'bg': 'linear-gradient(135deg,#1a3a5c 0%,#8b4513 50%,#c9a84c 100%)',
        'tag': '&#x1F3D6; Resource &amp;middot; Retirement',
        'h2': 'Retirement Planner',
        'subtitle': 'How much do you need to retire comfortably? Find your number and build your plan.',
        'fix_css': True,
        'fix_logotag': True,
        'fix_header': True,
        'fix_dashboard': True,
    },
    {
        'name': 'Education Planner',
        'title_marker': '&#x27;&lt;h1&gt;EDUCATION PLANNER&lt;/h1&gt;&#x27;',
        'old_h1': 'EDUCATION PLANNER',
        'bg': 'linear-gradient(135deg,#4a2060 0%,#1a3a5c 60%,#2a9d8f 100%)',
        'tag': '&#x1F393; Resource &amp;middot; Education Planning',
        'h2': 'Education Planner',
        'subtitle': 'Plan ahead for your child&amp;#x27;s education &amp;mdash; never be caught short.',
        'fix_css': True,
        'fix_logotag': True,
        'fix_header': True,
        'fix_dashboard': True,
    },
    {
        'name': 'Holiday Planner',
        'title_marker': '&#x27;&lt;h1&gt;HOLIDAY BUDGET PLANNER&lt;/h1&gt;&#x27;',
        'old_h1': 'HOLIDAY BUDGET PLANNER',
        'bg': 'linear-gradient(135deg,#1a3a5c 0%,#0e4d7a 50%,#e6b84c 100%)',
        'tag': '&#x2708; Resource &amp;middot; Travel Planning',
        'h2': 'Holiday Budget Planner',
        'subtitle': 'Dream trip, real budget. Plan your holiday without the financial hangover.',
        'fix_css': True,
        'fix_logotag': True,
        'fix_header': True,
        'fix_dashboard': False,
    },
]

# Goals Planner: only fix header HTML and logoTag (CSS already done)
goals_resources = [
    {
        'name': 'Goals Planner',
        'title_marker': '&#x27;&lt;h1&gt;FINANCIAL GOAL PLANNER&lt;/h1&gt;&#x27;',
        'old_h1': 'FINANCIAL GOAL PLANNER',
        'bg': None,  # skip CSS
        'tag': '&#x1F3AF; Resource &amp;middot; Goal Planning',
        'h2': 'Financial Goal Planner',
        'subtitle': 'Set your goals and plan the exact monthly saving needed to reach every one of them.',
        'fix_css': False,
        'fix_logotag': False,  # already fixed (line 4057 has rpt-logo)
        'fix_header': True,
        'fix_dashboard': False,
    },
]

all_encoded_resources = goals_resources + resources

# ─────────────────────────────────────────────────────────────────────────────
# PROCESS ENTITY-ENCODED RESOURCES
# ─────────────────────────────────────────────────────────────────────────────

for res in all_encoded_resources:
    name = res['name']
    marker = res['title_marker']

    # Find the title marker position
    marker_pos = content.find(marker)
    if marker_pos == -1:
        not_found.append(f"{name}: title marker not found")
        continue

    print(f"\n--- {name} (title marker at char {marker_pos}) ---")

    # ── 1. CSS block replacement ──
    if res['fix_css']:
        # Find old CSS block before the marker
        old_css = OLD_CSS_ENCODED
        idx = content.rfind(old_css, 0, marker_pos)
        if idx != -1:
            new_css = new_css_encoded(res['bg'])
            content = content[:idx] + new_css + content[idx + len(old_css):]
            # Recalculate marker_pos after replacement
            delta = len(new_css) - len(old_css)
            marker_pos += delta
            report_change(f"{name}: CSS block replaced")
            print(f"  [OK] CSS block replaced")
        else:
            report_change(f"{name}: CSS block NOT found", found=False)
            print(f"  [SKIP] CSS block not found before marker")

    # ── 2. logoTag replacement ──
    if res['fix_logotag']:
        idx = content.rfind(OLD_LOGOTAG_ENCODED, 0, marker_pos)
        if idx != -1:
            content = content[:idx] + NEW_LOGOTAG_ENCODED + content[idx + len(OLD_LOGOTAG_ENCODED):]
            delta = len(NEW_LOGOTAG_ENCODED) - len(OLD_LOGOTAG_ENCODED)
            marker_pos += delta
            report_change(f"{name}: logoTag replaced")
            print(f"  [OK] logoTag replaced")
        else:
            # Check if already fixed
            if content.rfind(NEW_LOGOTAG_ENCODED, 0, marker_pos) != -1:
                print(f"  [SKIP] logoTag already using rpt-logo class")
            else:
                report_change(f"{name}: logoTag NOT found", found=False)
                print(f"  [SKIP] logoTag not found before marker")

    # ── 3. Header HTML replacement ──
    if res['fix_header']:
        old_hdr = old_header_encoded(res['old_h1'])
        idx = content.rfind(old_hdr, 0, marker_pos + len(marker) + 500)
        if idx == -1:
            # Try with a wider window (marker may have shifted slightly)
            idx = content.find(old_hdr, max(0, marker_pos - 100))
        if idx != -1:
            new_hdr = new_header_encoded(res['tag'], res['h2'], res['subtitle'])
            content = content[:idx] + new_hdr + content[idx + len(old_hdr):]
            delta = len(new_hdr) - len(old_hdr)
            marker_pos += delta
            report_change(f"{name}: header HTML replaced")
            print(f"  [OK] header HTML replaced")
        else:
            report_change(f"{name}: header HTML NOT found", found=False)
            print(f"  [SKIP] header HTML not found")

    # ── 4. Dashboard fix ──
    if res['fix_dashboard']:
        # Find "h += css;" after the title marker, then add dashboard fix after it
        css_line = "  h += css;"
        # Search after marker_pos
        css_idx = content.find(css_line, marker_pos)
        if css_idx == -1:
            report_change(f"{name}: h+=css line NOT found", found=False)
            print(f"  [SKIP] h+=css line not found after marker")
        else:
            # Check if dashboard fix already present
            after_css = content[css_idx:css_idx + 200]
            if '#dashboard{display:block!important;}' in after_css:
                print(f"  [SKIP] dashboard fix already present")
            else:
                insert_pos = css_idx + len(css_line)
                content = content[:insert_pos] + "\n" + DASHBOARD_FIX_ENCODED + content[insert_pos:]
                report_change(f"{name}: dashboard fix added")
                print(f"  [OK] dashboard fix added")


# ─────────────────────────────────────────────────────────────────────────────
# SWP CALCULATOR (plain JS, not entity-encoded)
# ─────────────────────────────────────────────────────────────────────────────

print("\n--- SWP Calculator ---")

SWP_OLD_CSS = (
    ".rpt-hdr { background: linear-gradient(135deg, #0f2740 0%, #1a3a5c 55%, #1e4a6e 100%); "
    "padding:22px 32px; display:flex; align-items:center; gap:20px; position:relative; overflow:hidden; }"
)

SWP_NEW_CSS_BLOCK = (
    ".rpt-hdr { background:linear-gradient(135deg,#1a3a5c 0%,#2a5580 50%,#3a7a8e 100%); "
    "padding:18px 20px 18px 175px; color:#fff; position:relative; overflow:hidden; border-radius:16px; "
    "margin-bottom:14px; page-break-inside:avoid; break-inside:avoid; }'\n"
    "  h += '.rpt-hdr::before { content:\"\"; position:absolute; inset:0; opacity:0.07; "
    "background-image:radial-gradient(circle,#fff 1px,transparent 1px); background-size:28px 28px; "
    "pointer-events:none; }'\n"
    "  h += '.rpt-logo { position:absolute; left:12px; top:50%; transform:translateY(-50%); "
    "height:70%; width:auto; max-height:80px; object-fit:contain; border-radius:8px; "
    "-webkit-print-color-adjust:exact; print-color-adjust:exact; z-index:2; }'\n"
    "  h += '.rpt-title { position:relative; z-index:1; text-align:center; }'\n"
    "  h += '.gh-tag { display:inline-block; background:rgba(255,255,255,0.2); "
    "border:1px solid rgba(255,255,255,0.3); font-size:0.6rem; font-weight:900; letter-spacing:1.5px; "
    "padding:3px 12px; border-radius:20px; text-transform:uppercase; margin-bottom:6px; color:#fff; }'\n"
    "  h += '.rpt-title h2 { font-family: Lora, serif; font-size:clamp(1.2rem,2.5vw,1.6rem); "
    "font-weight:700; color:#fff; margin:0 0 4px; line-height:1.2; }'\n"
    "  h += '.rpt-title p { color:rgba(255,255,255,0.78); font-size:0.8rem; margin:0 auto 4px; }'\n"
    "  h += '.rpt-date { color:#c9a84c; font-size:0.72rem; font-weight:800; margin-top:4px; }"
)

# The old CSS block in SWP spans multiple h+= lines. Let's replace the specific lines.
# Lines 15194–15198 in the file (the old CSS block for SWP)
SWP_OLD_FULL_CSS_BLOCK = (
    "  h += '.rpt-hdr { background: linear-gradient(135deg, #0f2740 0%, #1a3a5c 55%, #1e4a6e 100%); "
    "padding:22px 32px; display:flex; align-items:center; gap:20px; position:relative; overflow:hidden; }';\n"
    "  h += '.rpt-hdr::before { content:\"\"; position:absolute; inset:0; background: "
    "radial-gradient(ellipse at 70% 50%, rgba(189,233,228,0.15), transparent 65%); }';\n"
    "  h += '.rpt-title { position:relative; z-index:1; }';\n"
    "  h += '.rpt-title h1 { font-family: Lora, serif; font-size:1.6rem; font-weight:700; "
    "color:#fff; margin:0 0 2px; }';\n"
    "  h += '.rpt-title .rpt-sub { color:rgba(255,255,255,0.6); font-size:0.8rem; }';\n"
    "  h += '.rpt-title .rpt-meta { color:#c9a84c; font-size:0.78rem; font-weight:800; margin-top:8px; }';"
)

SWP_NEW_FULL_CSS_BLOCK = (
    "  h += '.rpt-hdr { background:linear-gradient(135deg,#1a3a5c 0%,#2a5580 50%,#3a7a8e 100%); "
    "padding:18px 20px 18px 175px; color:#fff; position:relative; overflow:hidden; border-radius:16px; "
    "margin-bottom:14px; page-break-inside:avoid; break-inside:avoid; }';\n"
    "  h += '.rpt-hdr::before { content:\"\"; position:absolute; inset:0; opacity:0.07; "
    "background-image:radial-gradient(circle,#fff 1px,transparent 1px); background-size:28px 28px; "
    "pointer-events:none; }';\n"
    "  h += '.rpt-logo { position:absolute; left:12px; top:50%; transform:translateY(-50%); "
    "height:70%; width:auto; max-height:80px; object-fit:contain; border-radius:8px; "
    "-webkit-print-color-adjust:exact; print-color-adjust:exact; z-index:2; }';\n"
    "  h += '.rpt-title { position:relative; z-index:1; text-align:center; }';\n"
    "  h += '.gh-tag { display:inline-block; background:rgba(255,255,255,0.2); "
    "border:1px solid rgba(255,255,255,0.3); font-size:0.6rem; font-weight:900; letter-spacing:1.5px; "
    "padding:3px 12px; border-radius:20px; text-transform:uppercase; margin-bottom:6px; color:#fff; }';\n"
    "  h += '.rpt-title h2 { font-family: Lora, serif; font-size:clamp(1.2rem,2.5vw,1.6rem); "
    "font-weight:700; color:#fff; margin:0 0 4px; line-height:1.2; }';\n"
    "  h += '.rpt-title p { color:rgba(255,255,255,0.78); font-size:0.8rem; margin:0 auto 4px; }';\n"
    "  h += '.rpt-date { color:#c9a84c; font-size:0.72rem; font-weight:800; margin-top:4px; }';"
)

# SWP old logoTag
SWP_OLD_LOGOTAG = (
    "  var logoTag = LOGO_SRC ? '<img src=\"' + LOGO_SRC + '\" "
    "style=\"-webkit-print-color-adjust:exact;print-color-adjust:exact;height:72px;border-radius:10px;"
    "flex-shrink:0;position:relative;z-index:1;\">' : '';"
)
SWP_NEW_LOGOTAG = (
    "  var logoTag = LOGO_SRC ? '<img src=\"' + LOGO_SRC + '\" class=\"rpt-logo\">' : '';"
)

# SWP old header HTML
SWP_OLD_HEADER = (
    "  h += '<div class=\"rpt-hdr\">' + logoTag + '<div class=\"rpt-title\">';\n"
    "  h += '<h1>SWP CALCULATOR</h1>';\n"
    "  h += '<div class=\"rpt-sub\">Systematic Withdrawal Plan \u2014 Prepared with Investing for Mummies</div>';\n"
    "  h += '<div class=\"rpt-meta\">\\uD83D\\uDCC5 ' + today + '</div>';\n"
    "  h += '</div></div>';"
)
SWP_NEW_HEADER = (
    "  h += '<div class=\"rpt-hdr\">' + logoTag + '<div class=\"rpt-title\">';\n"
    "  h += '<div class=\"gh-tag\">\U0001f4b8 Resource \u00b7 Withdrawals</div>';\n"
    "  h += '<h2>SWP Calculator</h2>';\n"
    "  h += '<p>Can your money pay you a salary? Simulate monthly withdrawals from your corpus.</p>';\n"
    "  h += '<div class=\"rpt-date\">\U0001f4c5 ' + today + '</div>';\n"
    "  h += '</div></div>';"
)

# Process SWP CSS
if SWP_OLD_FULL_CSS_BLOCK in content:
    content = content.replace(SWP_OLD_FULL_CSS_BLOCK, SWP_NEW_FULL_CSS_BLOCK, 1)
    report_change("SWP: CSS block replaced")
    print("  [OK] CSS block replaced")
else:
    report_change("SWP: CSS block NOT found", found=False)
    print("  [SKIP] CSS block not found")

# Process SWP logoTag
if SWP_OLD_LOGOTAG in content:
    content = content.replace(SWP_OLD_LOGOTAG, SWP_NEW_LOGOTAG, 1)
    report_change("SWP: logoTag replaced")
    print("  [OK] logoTag replaced")
elif SWP_NEW_LOGOTAG in content:
    print("  [SKIP] logoTag already updated")
else:
    report_change("SWP: logoTag NOT found", found=False)
    print("  [SKIP] logoTag not found")

# Process SWP header HTML
if SWP_OLD_HEADER in content:
    content = content.replace(SWP_OLD_HEADER, SWP_NEW_HEADER, 1)
    report_change("SWP: header HTML replaced")
    print("  [OK] header HTML replaced")
else:
    report_change("SWP: header HTML NOT found", found=False)
    print("  [SKIP] header HTML not found")

# ─────────────────────────────────────────────────────────────────────────────
# SAVE
# ─────────────────────────────────────────────────────────────────────────────

if content != original:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n✓ File saved: {FILE}")
else:
    print("\n⚠ No changes made — file unchanged")

print("\n=== SUMMARY ===")
print(f"Changes applied ({len(changes)}):")
for c in changes:
    print(f"  + {c}")
if not_found:
    print(f"\nNot found / skipped ({len(not_found)}):")
    for n in not_found:
        print(f"  - {n}")
