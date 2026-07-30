#!/usr/bin/env python3
"""Inject MM2_HTML into index.html following the Market Madness 1 pattern."""
import re
from pathlib import Path

folder = Path(__file__).parent
index_path = folder / "index.html"
content_path = folder / "mm2_content.html"

inner = content_path.read_text(encoding="utf-8")

# Escape for JS template literal:
#  backtick -> \`
#  ${      -> \${
#  </script> -> <\/script>  (so the outer <script> tag isn't closed early)
escaped = inner.replace("\\", "\\\\")  # escape existing backslashes first
escaped = escaped.replace("`", "\\`")
escaped = escaped.replace("${", "\\${")
escaped = escaped.replace("</script>", "<\\/script>")

wrapper = (
    "\n<script>\n"
    "// \u2500\u2500 MARKET MADNESS 2 (Beta) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n"
    "(function() {\n"
    "  var mm2Inited = false;\n"
    "  window.addEventListener('message', function(e) {\n"
    "    if (!e.data) return;\n"
    "    if (e.data.type === 'mm2_height') {\n"
    "      var frame = document.getElementById('marketmad2_frame');\n"
    "      if (frame) frame.style.height = (e.data.h + 24) + 'px';\n"
    "    }\n"
    "  });\n"
    "  var origSG = window.showGame;\n"
    "  window.showGame = function(n) {\n"
    "    origSG(n);\n"
    "    if (n === 'marketmad2' && !mm2Inited) {\n"
    "      mm2Inited = true;\n"
    "      var frame = document.getElementById('marketmad2_frame');\n"
    "      if (frame) frame.srcdoc = MM2_HTML;\n"
    "    }\n"
    "  };\n"
    "\n"
    "  var MM2_HTML = `" + escaped + "`;\n"
    "\n"
    "})();\n"
    "</script>\n"
)

html = index_path.read_text(encoding="utf-8")

# Remove any prior injection (idempotent)
marker_start = "// \u2500\u2500 MARKET MADNESS 2 (Beta)"
if marker_start in html:
    # Find the script block that contains this marker and remove it
    m = re.search(
        r"\n<script>\s*\n// \u2500\u2500 MARKET MADNESS 2 \(Beta\).*?</script>\n",
        html,
        flags=re.DOTALL,
    )
    if m:
        html = html[: m.start()] + html[m.end():]

# Append at true EOF. The original file already ends after the final `</script>`
# closing the MM1 block; there is no top-level `</html>` in this file.
# (rfind-ing `</html>` would land INSIDE MM1's srcdoc template literal.)
if not html.endswith("\n"):
    html += "\n"
new_html = html + wrapper
index_path.write_text(new_html, encoding="utf-8")
print("Injected MM2_HTML. index.html now {} chars.".format(len(new_html)))
