"""
Elegant IFM Certificate of Completion generator.
Produces a landscape A4 PDF ready for printing.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
import math
import os

# ── Brand colours ──────────────────────────────────────────────
TEAL      = colors.HexColor("#2a9d8f")
NAVY      = colors.HexColor("#1a3a5c")
GOLD      = colors.HexColor("#C9A84C")
GOLD_LIGHT= colors.HexColor("#e8d499")
OFF_WHITE = colors.HexColor("#faf9f6")
LIGHT_BLUE= colors.HexColor("#ddeef6")

# ── Page setup (landscape A4) ──────────────────────────────────
W, H = A4[1], A4[0]          # swap for landscape: 297 × 210 mm

OUTPUT = os.path.join(os.path.dirname(__file__), "IFM_Certificate_of_Completion.pdf")
LOGO   = os.path.join(os.path.dirname(__file__), "CLAUDE", "IFM logo white background.png")


def draw_certificate(c: canvas.Canvas):
    # ── Background ─────────────────────────────────────────────
    c.setFillColor(OFF_WHITE)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Subtle diagonal-wave texture: series of very light arcs
    c.setStrokeColor(LIGHT_BLUE)
    c.setLineWidth(0.3)
    for i in range(-10, 25):
        x = i * 18 * mm
        c.arc(x, -20 * mm, x + 120 * mm, H + 20 * mm, startAng=0, extent=180)

    # ── Outer border frame ─────────────────────────────────────
    margin = 8 * mm
    # Thick teal outer line
    c.setStrokeColor(TEAL)
    c.setLineWidth(3.5)
    c.rect(margin, margin, W - 2 * margin, H - 2 * margin, fill=0)

    # Thin gold inner line
    inner = margin + 4 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.rect(inner, inner, W - 2 * inner, H - 2 * inner, fill=0)

    # ── Corner gold squares ────────────────────────────────────
    sq = 5 * mm
    corners = [
        (margin, margin),
        (W - margin - sq, margin),
        (margin, H - margin - sq),
        (W - margin - sq, H - margin - sq),
    ]
    c.setFillColor(GOLD)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0)
    for (cx, cy) in corners:
        c.rect(cx, cy, sq, sq, fill=1, stroke=0)

    # ── Teal accent bars (left and right edges) ─────────────────
    bar_w = 6 * mm
    c.setFillColor(TEAL)
    c.rect(0, H * 0.3, bar_w, H * 0.4, fill=1, stroke=0)
    c.rect(W - bar_w, H * 0.3, bar_w, H * 0.4, fill=1, stroke=0)

    # Gold cap on each bar
    c.setFillColor(GOLD)
    cap_h = 5 * mm
    c.rect(0, H * 0.3 + H * 0.4, bar_w, cap_h, fill=1, stroke=0)
    c.rect(0, H * 0.3 - cap_h, bar_w, cap_h, fill=1, stroke=0)
    c.rect(W - bar_w, H * 0.3 + H * 0.4, bar_w, cap_h, fill=1, stroke=0)
    c.rect(W - bar_w, H * 0.3 - cap_h, bar_w, cap_h, fill=1, stroke=0)

    # ── Logo ────────────────────────────────────────────────────
    logo_w = 60 * mm
    logo_h = 22 * mm
    try:
        img = ImageReader(LOGO)
        c.drawImage(img, (W - logo_w) / 2, H - 38 * mm,
                    width=logo_w, height=logo_h,
                    preserveAspectRatio=True, mask="auto")
    except Exception:
        # fallback text if logo missing
        c.setFont("Times-Bold", 12)
        c.setFillColor(NAVY)
        c.drawCentredString(W / 2, H - 30 * mm, "INVESTING FOR MUMMIES")

    # ── "Certificate of Completion" ─────────────────────────────
    c.setFont("Times-Bold", 44)
    c.setFillColor(NAVY)
    c.drawCentredString(W / 2, H - 60 * mm, "Certificate of Completion")

    # ── Thin gold rule under title ──────────────────────────────
    rule_x1 = W * 0.18
    rule_x2 = W * 0.82
    rule_y  = H - 65 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(rule_x1, rule_y, rule_x2, rule_y)

    # ── "THIS IS TO CERTIFY THAT" ───────────────────────────────
    # Spaced small-caps effect by manually inserting spaces
    spaced = " ".join("THIS IS TO CERTIFY THAT")
    c.setFont("Helvetica", 8)
    c.setFillColor(NAVY)
    c.drawCentredString(W / 2, H - 76 * mm, spaced)

    # ── Name line ───────────────────────────────────────────────
    name_y = H - 95 * mm
    name_w = 140 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line((W - name_w) / 2, name_y, (W + name_w) / 2, name_y)

    # ── "has successfully completed" ────────────────────────────
    c.setFont("Helvetica-Oblique", 10)
    c.setFillColor(NAVY)
    c.drawCentredString(W / 2, H - 104 * mm, "has successfully completed")

    # ── Stars ───────────────────────────────────────────────────
    star_y = H - 112 * mm
    star_gap = 7 * mm
    filled_stars = 3
    total_stars = 5
    star_r = 2.5 * mm
    start_x = W / 2 - (total_stars - 1) * star_gap / 2

    for i in range(total_stars):
        sx = start_x + i * star_gap
        draw_star(c, sx, star_y, star_r,
                  fill=True if i < filled_stars else False)

    # ── Course name ─────────────────────────────────────────────
    c.setFont("Times-BoldItalic", 30)
    c.setFillColor(NAVY)
    c.drawCentredString(W / 2, H - 126 * mm, "Investing for Teens")

    # ── Gold rule under course name ─────────────────────────────
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(rule_x1, H - 130 * mm, rule_x2, H - 130 * mm)

    # ── Recognition text ────────────────────────────────────────
    body_style = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=9,
        leading=14,
        textColor=NAVY,
        alignment=TA_CENTER,
    )
    text = ("In recognition of their dedication, curiosity, and commitment to building"
            " a strong financial foundation for the future.")
    p = Paragraph(text, body_style)
    p.wrapOn(c, 180 * mm, 30 * mm)
    p.drawOn(c, (W - 180 * mm) / 2, H - 148 * mm)

    # ── Date & Signature block ──────────────────────────────────
    sig_y     = H - 168 * mm
    line_len  = 42 * mm
    left_x    = W * 0.20
    right_x   = W * 0.65

    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(left_x, sig_y, left_x + line_len, sig_y)
    c.line(right_x, sig_y, right_x + line_len, sig_y)

    c.setFont("Helvetica", 7)
    c.setFillColor(NAVY)
    c.drawString(left_x, sig_y - 6 * mm, "DATE OF COMPLETION")

    # Signature name
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(right_x, sig_y + 5 * mm, "HIRAL GOEL")

    c.setFont("Helvetica", 7)
    c.drawString(right_x, sig_y - 6 * mm, "FOUNDER & CEO")


def draw_star(c, cx, cy, r, fill=True):
    """Draw a 5-pointed star centred at (cx, cy) with outer radius r."""
    outer_r = r
    inner_r = r * 0.42
    pts = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5   # start from top
        rad = outer_r if i % 2 == 0 else inner_r
        pts.append((cx + rad * math.cos(angle), cy + rad * math.sin(angle)))

    path = c.beginPath()
    path.moveTo(*pts[0])
    for pt in pts[1:]:
        path.lineTo(*pt)
    path.close()

    if fill:
        c.setFillColor(GOLD)
        c.setStrokeColor(GOLD)
        c.drawPath(path, fill=1, stroke=0)
    else:
        c.setFillColor(colors.white)
        c.setStrokeColor(GOLD)
        c.setLineWidth(0.6)
        c.drawPath(path, fill=1, stroke=1)


def main():
    c = canvas.Canvas(OUTPUT, pagesize=(W, H))
    draw_certificate(c)
    c.showPage()
    c.save()
    print(f"Saved → {OUTPUT}")


if __name__ == "__main__":
    main()
