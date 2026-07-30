"""
apply_branding.py
-----------------
Overlays on every page of the handbook:
  - Logo (top-center, small strip)
  - Standardised blue banner at bottom (50pt, #2569A2)
  - Website URL centred inside banner (white text)
  - Page number below banner, right-aligned
Covers existing inconsistent banners + old page numbers with white.
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
PDF_OUT = os.path.join(BASE, "Investing 101- handbook-FINAL.pdf")
LOGO_PATH = "/Users/lollyg/Downloads/Logo.png"

# ── Design constants ──────────────────────────────────────────────────────────
PAGE_W, PAGE_H = 595.5, 842.2
WEBSITE        = "www.investingformummies.com"
BANNER_R, BANNER_G, BANNER_B = 0x25/255, 0x69/255, 0xA2/255   # #2569A2
BANNER_HEIGHT  = 50          # pts
BOTTOM_COVER   = 135         # white-out this many pts from bottom (covers old banners)
BANNER_Y       = 25          # banner bottom edge (leaves room for page number)
URL_Y          = BANNER_Y + (BANNER_HEIGHT / 2) - 4             # vertically centred in banner
PAGE_NUM_Y     = 8           # below banner
TOP_STRIP_H    = 42          # white strip at top for logo
LOGO_H         = 34          # logo display height (pt)
LOGO_W         = LOGO_H * (5050 / 2597)                         # ~66pt, keeps aspect ratio

# ── Prepare logo as ImageReader (RGBA → usable with reportlab) ────────────────
def load_logo(path):
    img = Image.open(path).convert("RGBA")
    # Resize to display size (LOGO_W x LOGO_H at 150 dpi) before embedding
    target_px = (int(LOGO_W * 150 / 72), int(LOGO_H * 150 / 72))
    img = img.resize(target_px, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return ImageReader(buf)

print("Loading logo…")
logo_reader = load_logo(LOGO_PATH)

# ── Build overlay for one page ────────────────────────────────────────────────
def make_overlay(page_number: int) -> io.BytesIO:
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(PAGE_W, PAGE_H))

    # ── 1. White strip at top (covers any overlapping content near top edge)
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, PAGE_H - TOP_STRIP_H, PAGE_W, TOP_STRIP_H, fill=1, stroke=0)

    # ── 2. Logo centred in top strip
    logo_x = (PAGE_W - LOGO_W) / 2
    logo_y = PAGE_H - TOP_STRIP_H + (TOP_STRIP_H - LOGO_H) / 2
    c.drawImage(logo_reader, logo_x, logo_y, width=LOGO_W, height=LOGO_H, mask="auto")

    # ── 3. White cover at bottom (wipes old banners + old page numbers)
    c.setFillColorRGB(1, 1, 1)
    c.rect(0, 0, PAGE_W, BOTTOM_COVER, fill=1, stroke=0)

    # ── 4. New standardised blue banner
    c.setFillColorRGB(BANNER_R, BANNER_G, BANNER_B)
    c.rect(0, BANNER_Y, PAGE_W, BANNER_HEIGHT, fill=1, stroke=0)

    # ── 5. Website URL (white, centred inside banner)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica", 8)
    c.drawCentredString(PAGE_W / 2, URL_Y, WEBSITE)

    # ── 6. Page number (dark blue, right-aligned, below banner)
    c.setFillColorRGB(BANNER_R, BANNER_G, BANNER_B)
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(PAGE_W - 36, PAGE_NUM_Y, str(page_number))

    c.save()
    packet.seek(0)
    return packet


# ── Merge overlays into output PDF ────────────────────────────────────────────
print("Reading source PDF…")
reader = PdfReader(PDF_IN)
writer = PdfWriter()
total  = len(reader.pages)

for i, page in enumerate(reader.pages):
    page_num = i + 1
    if page_num % 10 == 0 or page_num == 1 or page_num == total:
        print(f"  Processing page {page_num}/{total}…")

    overlay_pdf = PdfReader(make_overlay(page_num))
    overlay_page = overlay_pdf.pages[0]

    # Merge: existing content first, overlay on top
    page.merge_page(overlay_page)
    writer.add_page(page)

print(f"Writing output to:\n  {PDF_OUT}")
with open(PDF_OUT, "wb") as f:
    writer.write(f)

print("Done!")
