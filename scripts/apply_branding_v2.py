"""
apply_branding_v2.py
--------------------
Strategy: NO white covering. Everything is an additive overlay.
- Logo: top-center, transparent PNG placed directly (no white strip)
- Page number: bottom-right, small white rounded pill behind dark number
- Website URL: bottom-center, small white pill behind text
- Existing banners: left untouched (can't modify without destroying content)

Run on pages 1-15 first to validate layout.
"""

import io
import os
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

# ── Paths ────────────────────────────────────────────────────────────────────
BASE = "/Users/lollyg/Library/CloudStorage/Dropbox/My Mac (Adityas-MacBook-Pro.local)/Downloads/investing for Mummies"
PDF_IN  = os.path.join(BASE, "Investing 101- handbook-3, mar 31, 2026.pdf")
PDF_OUT = os.path.join(BASE, "Investing 101- handbook-TEST15.pdf")
LOGO_PATH = "/Users/lollyg/Downloads/Logo.png"

# ── Process only first N pages for testing ───────────────────────────────────
TEST_PAGES = 15  # set to None to process all

# ── Page dimensions (A4) ──────────────────────────────────────────────────────
PAGE_W, PAGE_H = 595.5, 842.2

# ── Design ────────────────────────────────────────────────────────────────────
WEBSITE          = "www.investingformummies.com"
BLUE_R, BLUE_G, BLUE_B = 0x25/255, 0x69/255, 0xA2/255  # #2569A2

# Logo: placed at top-center, no white strip behind it
LOGO_DISPLAY_H   = 32          # pts tall
LOGO_DISPLAY_W   = LOGO_DISPLAY_H * (5050 / 2597)   # ~62pt wide
LOGO_Y           = PAGE_H - LOGO_DISPLAY_H - 4       # 4pt from top edge

# Footer elements: sit at the very bottom of the page
FOOTER_Y         = 22          # baseline y for website URL text
FOOTER_FONT_SIZE = 7.5
PILL_PAD_X       = 4           # horizontal padding inside white pill
PILL_PAD_Y       = 2           # vertical padding inside white pill
PILL_RADIUS      = 3           # rounded corner radius

# Page number placed exactly over old Canva number (rl_y≈34–55pt from bottom)
PAGE_NUM_Y       = 38          # baseline — white pill will cover old number beneath
PAGE_NUM_SIZE    = 10          # consistent font size across all pages
PAGE_NUM_PILL_H  = 26          # tall enough to fully cover the old 20pt number

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_logo(path):
    img = Image.open(path).convert("RGBA")
    target_px = (int(LOGO_DISPLAY_W * 150 / 72), int(LOGO_DISPLAY_H * 150 / 72))
    img = img.resize(target_px, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return ImageReader(buf)


def draw_pill(c, x, y, w, h, r=3):
    """Draw a white rounded-rectangle pill at (x,y) with width w and height h."""
    c.setFillColorRGB(1, 1, 1)
    c.setStrokeColorRGB(1, 1, 1)
    c.roundRect(x, y, w, h, r, fill=1, stroke=0)


def make_overlay(page_number: int, logo_reader) -> io.BytesIO:
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(PAGE_W, PAGE_H))

    # ── Logo: top-center, transparent (no white behind it) ───────────────────
    logo_x = (PAGE_W - LOGO_DISPLAY_W) / 2
    c.drawImage(logo_reader, logo_x, LOGO_Y,
                width=LOGO_DISPLAY_W, height=LOGO_DISPLAY_H, mask="auto")

    # ── Footer: website URL centred, page number right ───────────────────────
    c.setFont("Helvetica", FOOTER_FONT_SIZE)

    # Website pill (centred)
    url_text  = WEBSITE
    url_w     = c.stringWidth(url_text, "Helvetica", FOOTER_FONT_SIZE)
    pill_w    = url_w + PILL_PAD_X * 2
    pill_h    = FOOTER_FONT_SIZE + PILL_PAD_Y * 2
    pill_x    = (PAGE_W - pill_w) / 2
    pill_y    = FOOTER_Y - PILL_PAD_Y
    draw_pill(c, pill_x, pill_y, pill_w, pill_h, PILL_RADIUS)
    c.setFillColorRGB(BLUE_R, BLUE_G, BLUE_B)
    c.drawCentredString(PAGE_W / 2, FOOTER_Y, url_text)

    # Page number: solid blue pill, white text — covers old Canva number cleanly
    num_text  = str(page_number)
    num_w     = c.stringWidth(num_text, "Helvetica-Bold", PAGE_NUM_SIZE)
    npill_w   = num_w + 14          # generous padding
    npill_h   = PAGE_NUM_PILL_H     # 26pt — tall enough to cover old 20pt number
    npill_x   = PAGE_W - 36 - npill_w
    npill_y   = 28                  # bottom of pill, aligns with old number at y≈34–55
    # Blue filled rounded rect
    c.setFillColorRGB(BLUE_R, BLUE_G, BLUE_B)
    c.roundRect(npill_x, npill_y, npill_w, npill_h, PILL_RADIUS, fill=1, stroke=0)
    # White number text
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", PAGE_NUM_SIZE)
    c.drawCentredString(npill_x + npill_w / 2, npill_y + 8, num_text)

    c.save()
    packet.seek(0)
    return packet


# ── Main ──────────────────────────────────────────────────────────────────────
print("Loading logo…")
logo_reader = load_logo(LOGO_PATH)

print("Reading source PDF…")
reader = PdfReader(PDF_IN)
writer = PdfWriter()

total = len(reader.pages)
pages_to_process = list(range(TEST_PAGES)) if TEST_PAGES else range(total)

for i in pages_to_process:
    page     = reader.pages[i]
    page_num = i + 1
    print(f"  Page {page_num}…")

    overlay_pdf  = PdfReader(make_overlay(page_num, logo_reader))
    overlay_page = overlay_pdf.pages[0]
    page.merge_page(overlay_page)
    writer.add_page(page)

print(f"\nWriting: {PDF_OUT}")
with open(PDF_OUT, "wb") as f:
    writer.write(f)

print(f"Done — {len(pages_to_process)} pages written.")
