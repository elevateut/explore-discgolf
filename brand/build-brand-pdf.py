#!/usr/bin/env python3
"""Generate EXPLORE Disc Golf Brand Package PDF using ReportLab."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle
from reportlab.graphics import renderPDF
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# ── Brand Colors ──────────────────────────────────────────────
TERRA_COTTA = colors.HexColor("#B85C38")
SAGE = colors.HexColor("#5B7F3B")
SUMMIT_GOLD = colors.HexColor("#D4952B")
NIGHT_SKY = colors.HexColor("#1E2D3B")
DRIFTWOOD = colors.HexColor("#6B6560")
SANDSTONE = colors.HexColor("#F5F0E8")
SNOW = colors.HexColor("#FEFDFB")
BASIN_TEAL = colors.HexColor("#1A8BA3")
AMBER = colors.HexColor("#E8A93E")
SIGNAL_RED = colors.HexColor("#C4422B")
TRAIL_GREEN = colors.HexColor("#3D8B37")

BRAND_DIR = os.path.dirname(os.path.abspath(__file__))
FINAL_DIR = os.path.join(BRAND_DIR, "final")
FONT_DIR = os.path.join(os.path.dirname(BRAND_DIR), "public", "fonts")
OUTPUT = os.path.join(BRAND_DIR, "EXPLORE-Disc-Golf-Brand-Package.pdf")


def register_fonts():
    """Register Plus Jakarta Sans and Inter brand fonts."""
    pdfmetrics.registerFont(TTFont("Jakarta-Bold", os.path.join(FONT_DIR, "PlusJakartaSans-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Jakarta-ExtraBold", os.path.join(FONT_DIR, "PlusJakartaSans-ExtraBold.ttf")))
    pdfmetrics.registerFont(TTFont("Inter", os.path.join(FONT_DIR, "Inter-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("Inter-Medium", os.path.join(FONT_DIR, "Inter-Medium.ttf")))
    pdfmetrics.registerFont(TTFont("Inter-SemiBold", os.path.join(FONT_DIR, "Inter-SemiBold.ttf")))


def hex_from_color(c):
    return f"#{int(c.red*255):02X}{int(c.green*255):02X}{int(c.blue*255):02X}"


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="BrandTitle",
        fontSize=28,
        leading=34,
        textColor=NIGHT_SKY,
        spaceAfter=6,
        fontName="Jakarta-ExtraBold",
    ))
    styles.add(ParagraphStyle(
        name="BrandSubtitle",
        fontSize=14,
        leading=18,
        textColor=DRIFTWOOD,
        spaceAfter=24,
        fontName="Inter",
    ))
    styles.add(ParagraphStyle(
        name="SectionHead",
        fontSize=20,
        leading=26,
        textColor=TERRA_COTTA,
        spaceBefore=20,
        spaceAfter=10,
        fontName="Jakarta-Bold",
    ))
    styles.add(ParagraphStyle(
        name="SubHead",
        fontSize=13,
        leading=17,
        textColor=NIGHT_SKY,
        spaceBefore=14,
        spaceAfter=6,
        fontName="Jakarta-Bold",
    ))
    styles.add(ParagraphStyle(
        name="Body",
        fontSize=10,
        leading=15,
        textColor=NIGHT_SKY,
        spaceAfter=8,
        fontName="Inter",
    ))
    styles.add(ParagraphStyle(
        name="BodySmall",
        fontSize=9,
        leading=13,
        textColor=DRIFTWOOD,
        spaceAfter=6,
        fontName="Inter",
    ))
    styles.add(ParagraphStyle(
        name="Quote",
        fontSize=11,
        leading=16,
        textColor=NIGHT_SKY,
        spaceAfter=10,
        fontName="Inter",
        leftIndent=20,
        rightIndent=20,
    ))
    styles.add(ParagraphStyle(
        name="Label",
        fontSize=8,
        leading=10,
        textColor=DRIFTWOOD,
        fontName="Inter-SemiBold",
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="FooterStyle",
        fontSize=8,
        leading=10,
        textColor=DRIFTWOOD,
        fontName="Inter",
        alignment=TA_CENTER,
    ))
    return styles


def color_swatch_drawing(fill_color, name, hex_val, width=100, height=80):
    """Create a color swatch with label."""
    d = Drawing(width, height + 30)
    d.add(Rect(0, 30, width, height, fillColor=fill_color,
               strokeColor=colors.HexColor("#E0E0E0"), strokeWidth=0.5))
    d.add(String(width / 2, 18, name, fontSize=9,
                 fontName="Jakarta-Bold", fillColor=NIGHT_SKY, textAnchor="middle"))
    d.add(String(width / 2, 6, hex_val, fontSize=8,
                 fontName="Inter", fillColor=DRIFTWOOD, textAnchor="middle"))
    return d


def hr():
    return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#EBE5DA"),
                       spaceBefore=8, spaceAfter=8)


def page_bg(canvas, doc):
    """Draw sandstone background and footer on every page."""
    canvas.saveState()
    canvas.setFillColor(SANDSTONE)
    canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)

    # Footer line
    canvas.setStrokeColor(colors.HexColor("#EBE5DA"))
    canvas.setLineWidth(0.5)
    canvas.line(54, 45, letter[0] - 54, 45)

    # Footer text
    canvas.setFillColor(DRIFTWOOD)
    canvas.setFont("Inter", 7)
    canvas.drawString(54, 33, "EXPLORE Disc Golf Brand Package")
    canvas.drawRightString(letter[0] - 54, 33,
                           "A program of ElevateUT Disc Golf, 501(c)(3)")
    canvas.drawCentredString(letter[0] / 2, 33, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf():
    register_fonts()
    styles = build_styles()
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=letter,
        topMargin=0.6 * inch,
        bottomMargin=0.7 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
    )

    story = []
    W = doc.width

    # ═══════════════════════════════════════════════════════════
    # PAGE 1: COVER
    # ═══════════════════════════════════════════════════════════
    story.append(Spacer(1, 1.5 * inch))

    # Logo
    logo_path = os.path.join(FINAL_DIR, "explore-disc-golf-dark.png")
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=4.5 * inch, height=4.5 * inch * 463 / 1131)
        logo.hAlign = "CENTER"
        story.append(logo)

    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph("Brand Package", styles["BrandTitle"]))
    story.append(Paragraph(
        "Identity guidelines for print, digital, and partnership materials",
        styles["BrandSubtitle"]
    ))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph(
        "Where the wild things fly.",
        ParagraphStyle("Tagline", parent=styles["Body"], fontSize=13,
                       textColor=TERRA_COTTA, fontName="Jakarta-Bold")
    ))
    story.append(Spacer(1, 1.5 * inch))
    story.append(Paragraph(
        "A program of ElevateUT Disc Golf, a 501(c)(3) nonprofit organization.",
        styles["BodySmall"]
    ))
    story.append(Paragraph("April 2026", styles["BodySmall"]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # PAGE 2: BRAND IDENTITY
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Brand Identity", styles["SectionHead"]))
    story.append(hr())

    story.append(Paragraph(
        "<b>EXPLORE Disc Golf</b> is a national program to expand disc golf access on "
        "America's public lands through federal partnerships, community-driven course "
        "development, environmental stewardship, and policy advocacy.",
        styles["Body"]
    ))

    story.append(Paragraph("Mission", styles["SubHead"]))
    story.append(Paragraph(
        "To expand and protect disc golf access on America's public lands through "
        "federal partnerships, community-driven course development, environmental "
        "stewardship, and policy advocacy.",
        styles["Body"]
    ))

    story.append(Paragraph("Vision", styles["SubHead"]))
    story.append(Paragraph(
        "Every American lives within reach of a free disc golf course on "
        "well-managed public land.",
        styles["Body"]
    ))

    story.append(Paragraph("Name Treatment", styles["SubHead"]))
    story.append(Paragraph(
        "<b>EXPLORE</b> is always set in all caps. It references both the verb "
        "(go explore public lands) and the EXPLORE Act (P.L. 118-234), the federal "
        "statute that provides the legal foundation for this work. "
        "<b>Disc Golf</b> is set in title case.",
        styles["Body"]
    ))
    story.append(Paragraph(
        "Abbreviated form: <b>EXPLORE DG</b> (informal contexts, social media)",
        styles["BodySmall"]
    ))

    story.append(Paragraph("Taglines", styles["SubHead"]))
    tag_data = [
        ["Primary", "Disc golf on America's public lands."],
        ["Secondary", "Find your land. Build your course."],
        ["Tertiary", "Where the wild things fly."],
    ]
    tag_table = Table(tag_data, colWidths=[1.2 * inch, 4.8 * inch])
    tag_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Jakarta-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Inter"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), DRIFTWOOD),
        ("TEXTCOLOR", (1, 0), (1, -1), NIGHT_SKY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(tag_table)

    story.append(Paragraph("Legal Attribution", styles["SubHead"]))
    story.append(Paragraph(
        "ElevateUT appears only in legal contexts. Website footer: "
        "\"EXPLORE Disc Golf is a program of ElevateUT Disc Golf, "
        "a 501(c)(3) nonprofit organization.\" ElevateUT does <b>not</b> appear "
        "in the logo, navigation, social media handles, or campaign materials.",
        styles["Body"]
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # PAGE 3: LOGO
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Logo", styles["SectionHead"]))
    story.append(hr())

    story.append(Paragraph(
        "The EXPLORE Disc Golf logo is a wordmark with an integrated landscape "
        "silhouette. \"EXPLORE\" is set in bold uppercase with a continuous American "
        "landscape flowing through the letterforms — transitioning left to right from "
        "desert cactus and buttes, through canyon walls, to a lone savanna tree, "
        "through an evergreen forest, to mountain peaks. \"Disc Golf\" sits below.",
        styles["Body"]
    ))
    story.append(Paragraph(
        "The landscape tells the story of America's diverse public lands in a single mark.",
        styles["Body"]
    ))

    story.append(Spacer(1, 0.2 * inch))

    # Logo on sandstone (just the dark version centered)
    if os.path.exists(logo_path):
        logo2 = Image(logo_path, width=5 * inch, height=5 * inch * 463 / 1131)
        logo2.hAlign = "CENTER"
        story.append(logo2)

    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Primary — Night Sky on light backgrounds",
                           styles["Label"]))

    story.append(Spacer(1, 0.3 * inch))

    # Dark background preview
    dark_preview = os.path.join(FINAL_DIR, "preview-on-dark.png")
    if os.path.exists(dark_preview):
        dp = Image(dark_preview, width=5 * inch, height=2.5 * inch)
        dp.hAlign = "CENTER"
        story.append(dp)
        story.append(Paragraph("White variant on Night Sky background",
                               styles["Label"]))

    story.append(Spacer(1, 0.3 * inch))

    # Terra cotta preview
    tc_preview = os.path.join(FINAL_DIR, "preview-on-terracotta.png")
    if os.path.exists(tc_preview):
        tp = Image(tc_preview, width=5 * inch, height=2.5 * inch)
        tp.hAlign = "CENTER"
        story.append(tp)
        story.append(Paragraph("White variant on Terra Cotta background",
                               styles["Label"]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # PAGE 4: LOGO USAGE
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Logo Usage", styles["SectionHead"]))
    story.append(hr())

    story.append(Paragraph("Approved Color Variants", styles["SubHead"]))
    variant_data = [
        ["Variant", "Color", "Usage"],
        ["Night Sky (dark)", "#1E2D3B", "Primary — light backgrounds, documents, web"],
        ["White", "#FFFFFF", "Dark backgrounds, photography overlays, merch"],
        ["Terra Cotta", "#B85C38", "Single-brand-color applications, accent use"],
    ]
    vt = Table(variant_data, colWidths=[1.8 * inch, 1.2 * inch, 3.5 * inch])
    vt.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Jakarta-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Inter"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), NIGHT_SKY),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EBE5DA")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EBE5DA")),
    ]))
    story.append(vt)

    story.append(Paragraph("Rules", styles["SubHead"]))
    rules = [
        "Minimum clear space: equal to the height of the \"E\" in EXPLORE on all sides",
        "Never stretch, rotate, skew, or add effects (drop shadows, glows, outlines)",
        "Never recolor outside the three approved variants",
        "On photographs: use white version only, with a solid backing or scrim if needed",
        "Minimum width: 120px digital, 1.5 inches print",
    ]
    for r in rules:
        story.append(Paragraph(f"• {r}", styles["Body"]))

    story.append(Paragraph("Never Do This", styles["SubHead"]))
    nevers = [
        "Place the logo on busy photographic backgrounds without a scrim or solid backing",
        "Use the dark variant on dark backgrounds",
        "Add a stroke or outline to the logo",
        "Rearrange the landscape elements or \"Disc Golf\" text position",
        "Use the logo at sizes smaller than 120px wide",
        "Animate, rotate, or apply 3D effects to the logo",
    ]
    for n in nevers:
        story.append(Paragraph(f"✗  {n}",
                               ParagraphStyle("Never", parent=styles["Body"],
                                              textColor=SIGNAL_RED, fontSize=9)))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # PAGE 5: COLOR PALETTE
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Color Palette", styles["SectionHead"]))
    story.append(hr())

    story.append(Paragraph(
        "The palette is rooted in the western public lands landscape: burnt earth, "
        "sage, desert sky, and sandstone. It intentionally echoes BLM's own visual "
        "identity so that EXPLORE Disc Golf materials feel native to BLM contexts.",
        styles["Body"]
    ))

    story.append(Paragraph("Primary Colors", styles["SubHead"]))

    primary_swatches = [
        (TERRA_COTTA, "Terra Cotta", "#B85C38"),
        (SAGE, "Sage", "#5B7F3B"),
        (SUMMIT_GOLD, "Summit Gold", "#D4952B"),
    ]
    swatch_row = [color_swatch_drawing(c, n, h, width=130, height=90)
                  for c, n, h in primary_swatches]
    st = Table([swatch_row], colWidths=[140] * 3)
    st.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.append(st)

    story.append(Spacer(1, 0.1 * inch))

    # Usage notes for primaries
    primary_usage = [
        ["Terra Cotta", "Brand anchor. Buttons, headings, logo mark. Evokes western desert and red rock."],
        ["Sage", "Conservation and stewardship. Success states. Evokes rangeland and healthy ecosystems."],
        ["Summit Gold", "Calls to action, highlights, deadlines. Evokes sunlight and warmth."],
    ]
    pu_table = Table(primary_usage, colWidths=[1.3 * inch, 5.2 * inch])
    pu_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Jakarta-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), NIGHT_SKY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(pu_table)

    story.append(Paragraph("Neutral Colors", styles["SubHead"]))

    neutral_swatches = [
        (NIGHT_SKY, "Night Sky", "#1E2D3B"),
        (DRIFTWOOD, "Driftwood", "#6B6560"),
        (SANDSTONE, "Sandstone", "#F5F0E8"),
        (SNOW, "Snow", "#FEFDFB"),
    ]
    nswatch_row = [color_swatch_drawing(c, n, h, width=110, height=70)
                   for c, n, h in neutral_swatches]
    nst = Table([nswatch_row], colWidths=[120] * 4)
    nst.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.append(nst)

    story.append(Spacer(1, 0.1 * inch))

    neutral_usage = [
        ["Night Sky", "Body text, dark backgrounds, authority. Deep blue-slate."],
        ["Driftwood", "Secondary text, borders, subtle UI. Warm gray."],
        ["Sandstone", "Page backgrounds, cards. Warm cream — like a field guide."],
        ["Snow", "Clean backgrounds, high contrast areas. Warm white."],
    ]
    nu_table = Table(neutral_usage, colWidths=[1.3 * inch, 5.2 * inch])
    nu_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Jakarta-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), NIGHT_SKY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(nu_table)

    story.append(Paragraph("Extended Colors", styles["SubHead"]))

    ext_swatches = [
        (BASIN_TEAL, "Basin Teal", "#1A8BA3"),
        (AMBER, "Amber", "#E8A93E"),
        (SIGNAL_RED, "Signal Red", "#C4422B"),
        (TRAIL_GREEN, "Trail Green", "#3D8B37"),
    ]
    eswatch_row = [color_swatch_drawing(c, n, h, width=110, height=70)
                   for c, n, h in ext_swatches]
    est = Table([eswatch_row], colWidths=[120] * 4)
    est.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.append(est)

    ext_usage = [
        ["Basin Teal", "Interactive elements, links, map UI. Nods to BLM's teal."],
        ["Amber", "Deadlines, time-sensitive callouts, warnings."],
        ["Signal Red", "Errors, critical alerts. Muted, not aggressive."],
        ["Trail Green", "Completed status, positive outcomes, success."],
    ]
    eu_table = Table(ext_usage, colWidths=[1.3 * inch, 5.2 * inch])
    eu_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Jakarta-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), NIGHT_SKY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(eu_table)

    story.append(Paragraph("Color Rules", styles["SubHead"]))
    color_rules = [
        "Never use more than 3 colors on a single page element.",
        "Terra Cotta + Night Sky + Sandstone is the workhorse combination.",
        "If only one color can be used (favicon, single-color logo), it's Terra Cotta.",
        "Sage signals stewardship — use for environmental content and Leave No Trace messaging.",
        "Summit Gold signals action — use for CTAs, deadlines, \"act now\" moments.",
        "Basin Teal is for interaction — links, map elements, clickable UI.",
        "Default to Sandstone backgrounds. White backgrounds feel like a tech app; Sandstone feels like a field guide.",
    ]
    for r in color_rules:
        story.append(Paragraph(f"• {r}", styles["BodySmall"]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # PAGE 6: TYPOGRAPHY
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Typography", styles["SectionHead"]))
    story.append(hr())

    story.append(Paragraph("Typeface Selection", styles["SubHead"]))

    type_data = [
        ["Role", "Typeface", "Weights", "Fallback"],
        ["Headings", "Plus Jakarta Sans", "Bold 700, ExtraBold 800", "system-ui, sans-serif"],
        ["Body", "Inter", "Regular 400, Medium 500, SemiBold 600", "system-ui, sans-serif"],
        ["Monospace / Data", "JetBrains Mono", "Regular 400", "ui-monospace, monospace"],
    ]
    tt = Table(type_data, colWidths=[1.1 * inch, 1.6 * inch, 2.2 * inch, 1.6 * inch])
    tt.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Jakarta-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Inter"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), NIGHT_SKY),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EBE5DA")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EBE5DA")),
    ]))
    story.append(tt)

    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(
        "<b>Plus Jakarta Sans</b> has geometric confidence without being cold — "
        "suitable for headings on a BLM desk or a legislator's briefing. "
        "<b>Inter</b> is the most readable screen font available, designed for UI. "
        "Both are open source (SIL Open Font License).",
        styles["BodySmall"]
    ))

    story.append(Paragraph("Type Scale", styles["SubHead"]))
    scale_data = [
        ["Element", "Size", "Weight", "Line Height"],
        ["H1 (page title)", "2.5rem / 40px", "ExtraBold 800", "1.1"],
        ["H2 (section)", "1.875rem / 30px", "Bold 700", "1.2"],
        ["H3 (subsection)", "1.5rem / 24px", "Bold 700", "1.3"],
        ["H4 (card title)", "1.25rem / 20px", "SemiBold 600", "1.4"],
        ["Body", "1rem / 16px", "Regular 400", "1.6"],
        ["Small / Caption", "0.875rem / 14px", "Regular 400", "1.5"],
        ["Overline / Label", "0.75rem / 12px", "SemiBold 600", "1.4"],
    ]
    sct = Table(scale_data, colWidths=[1.6 * inch, 1.5 * inch, 1.5 * inch, 1.0 * inch])
    sct.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Jakarta-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Inter"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), NIGHT_SKY),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EBE5DA")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EBE5DA")),
    ]))
    story.append(sct)

    story.append(Paragraph("Special Treatments", styles["SubHead"]))
    specials = [
        "<b>EXPLORE</b> in the brand name: Plus Jakarta Sans, ExtraBold 800, all caps, letter-spacing 0.05em",
        "<b>Section numbers</b> (e.g., \"Section 341\"): JetBrains Mono, Regular 400",
        "<b>Statistics and pull quotes</b>: Plus Jakarta Sans, Bold 700, oversized (2-3× body)",
        "<b>\"Where the wild things fly.\"</b>: Plus Jakarta Sans, ExtraBold 800. The tagline gets the hero treatment.",
    ]
    for s in specials:
        story.append(Paragraph(f"• {s}", styles["BodySmall"]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # TYPEFACE EXAMPLES PAGE
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Typeface Examples", styles["SectionHead"]))
    story.append(hr())

    story.append(Paragraph("Plus Jakarta Sans — Headings", styles["SubHead"]))

    story.append(Paragraph(
        "EXPLORE DISC GOLF",
        ParagraphStyle("JakartaDemo1", fontName="Jakarta-ExtraBold",
                       fontSize=32, leading=38, textColor=NIGHT_SKY, spaceAfter=4)
    ))
    story.append(Paragraph(
        "ExtraBold 800 — Brand name, page titles, hero text",
        ParagraphStyle("JakartaLabel1", fontName="Inter", fontSize=8,
                       textColor=DRIFTWOOD, spaceAfter=16)
    ))

    story.append(Paragraph(
        "Where the wild things fly.",
        ParagraphStyle("JakartaDemo2", fontName="Jakarta-ExtraBold",
                       fontSize=26, leading=32, textColor=TERRA_COTTA, spaceAfter=4)
    ))
    story.append(Paragraph(
        "ExtraBold 800 — Taglines, campaign headlines",
        ParagraphStyle("JakartaLabel2", fontName="Inter", fontSize=8,
                       textColor=DRIFTWOOD, spaceAfter=16)
    ))

    story.append(Paragraph(
        "The EXPLORE Act and Your BLM Office",
        ParagraphStyle("JakartaDemo3", fontName="Jakarta-Bold",
                       fontSize=20, leading=26, textColor=NIGHT_SKY, spaceAfter=4)
    ))
    story.append(Paragraph(
        "Bold 700 — Section headings, card titles",
        ParagraphStyle("JakartaLabel3", fontName="Inter", fontSize=8,
                       textColor=DRIFTWOOD, spaceAfter=24)
    ))

    story.append(Paragraph("Inter — Body Text", styles["SubHead"]))

    story.append(Paragraph(
        "Disc golf is a low-cost, low-footprint, family-friendly, stewardship-ready "
        "recreation option that can help your office advance accessible recreation, "
        "youth and veteran engagement, underutilized day-use sites, and shoulder-season "
        "visitation under authorities you are already implementing.",
        ParagraphStyle("InterDemo1", fontName="Inter", fontSize=11,
                       leading=17, textColor=NIGHT_SKY, spaceAfter=4)
    ))
    story.append(Paragraph(
        "Regular 400 — Body text, descriptions, long-form content",
        ParagraphStyle("InterLabel1", fontName="Inter", fontSize=8,
                       textColor=DRIFTWOOD, spaceAfter=16)
    ))

    story.append(Paragraph(
        "Section 214 requires BLM to select at least two new accessible recreation "
        "opportunities in each BLM region.",
        ParagraphStyle("InterDemo2", fontName="Inter-Medium", fontSize=11,
                       leading=17, textColor=NIGHT_SKY, spaceAfter=4)
    ))
    story.append(Paragraph(
        "Medium 500 — Emphasis, inline highlights",
        ParagraphStyle("InterLabel2", fontName="Inter", fontSize=8,
                       textColor=DRIFTWOOD, spaceAfter=16)
    ))

    story.append(Paragraph(
        "Good Neighbor Authority sunsets January 2030",
        ParagraphStyle("InterDemo3", fontName="Inter-SemiBold", fontSize=11,
                       leading=17, textColor=TERRA_COTTA, spaceAfter=4)
    ))
    story.append(Paragraph(
        "SemiBold 600 — Callouts, labels, navigation, deadlines",
        ParagraphStyle("InterLabel3", fontName="Inter", fontSize=8,
                       textColor=DRIFTWOOD, spaceAfter=24)
    ))

    story.append(Paragraph("Pairing Example", styles["SubHead"]))

    story.append(Paragraph(
        "Find Your BLM Office",
        ParagraphStyle("PairHead", fontName="Jakarta-Bold", fontSize=22,
                       leading=28, textColor=NIGHT_SKY, spaceAfter=8)
    ))
    story.append(Paragraph(
        "Enter your zip code or click \"Use my location\" to find the BLM field office "
        "that manages public land near you. Each office page shows contact information, "
        "engagement status, nearby recreation sites, and a one-click button to generate "
        "a tailored engagement packet.",
        ParagraphStyle("PairBody", fontName="Inter", fontSize=10,
                       leading=16, textColor=NIGHT_SKY, spaceAfter=8)
    ))
    story.append(Paragraph(
        "Cedar City Field Office — 2 courses built",
        ParagraphStyle("PairMeta", fontName="Inter-SemiBold", fontSize=9,
                       leading=13, textColor=SAGE, spaceAfter=4)
    ))
    story.append(Paragraph(
        "Three Peaks Recreation Area, Iron County, Utah",
        ParagraphStyle("PairSmall", fontName="Inter", fontSize=9,
                       leading=13, textColor=DRIFTWOOD)
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # VOICE & TONE
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Voice & Tone", styles["SectionHead"]))
    story.append(hr())

    story.append(Paragraph(
        "EXPLORE Disc Golf speaks with <b>informed confidence</b>. It knows the "
        "statute, knows the data, knows the land. It's not asking permission — "
        "it's offering a partnership.",
        styles["Body"]
    ))

    story.append(Paragraph("Brand Attributes", styles["SubHead"]))

    voice_data = [
        ["Attribute", "What It Means", "Example"],
        ["Knowledgeable", "We've read the law", "\"Section 214 requires BLM to select accessible recreation opportunities — disc golf fits.\""],
        ["Inviting", "Everyone at the table", "\"You don't need to be a policy expert. We built the packet. You deliver it.\""],
        ["Grounded", "Facts, not hype", "\"3 courses on 245 million acres. The gap is the opportunity.\""],
        ["Respectful", "Partners, not adversaries", "\"We seek to partner with your field office\" — never \"we demand.\""],
        ["Urgent but patient", "Deadlines are real", "\"The GNA sunset is January 2030. We have time, but not unlimited time.\""],
    ]
    vdt = Table(voice_data, colWidths=[1.1 * inch, 1.3 * inch, 4.1 * inch])
    vdt.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Jakarta-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Jakarta-Bold"),
        ("FONTNAME", (1, 1), (-1, -1), "Inter"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, -1), NIGHT_SKY),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EBE5DA")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EBE5DA")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(vdt)

    story.append(Paragraph("Tone by Context", styles["SubHead"]))
    tones = [
        ["Website / educational", "Warm, accessible, confident. A knowledgeable guide, not a professor."],
        ["BLM engagement", "Formal but not stiff. Professional, data-driven, partnership-oriented."],
        ["Social media", "Energetic, visual, action-oriented. \"Where the wild things fly\" energy."],
        ["Grant applications", "Institutional, metrics-heavy, aligned with funder language."],
        ["Disc golf community", "Passionate, inclusive, movement-building. \"Let's change that.\""],
    ]
    tone_t = Table(tones, colWidths=[1.6 * inch, 4.9 * inch])
    tone_t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Jakarta-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Inter"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), NIGHT_SKY),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tone_t)

    story.append(Paragraph("Words We Use", styles["SubHead"]))
    use_words = [
        "\"Partner\" (not \"demand\" or \"require\")",
        "\"Public lands\" (not \"government land\")",
        "\"Accessible\" (both physically and financially)",
        "\"Stewardship\" (not \"maintenance\")",
        "\"Low-impact\" (not \"no-impact\" — be honest)",
        "\"Community-driven\" (not \"grassroots\" — too political)",
    ]
    for w in use_words:
        story.append(Paragraph(f"✓  {w}",
                               ParagraphStyle("UseWord", parent=styles["BodySmall"],
                                              textColor=SAGE)))

    story.append(Paragraph("Words We Avoid", styles["SubHead"]))
    avoid_words = [
        "\"Fight\" or \"battle\" — we're building partnerships",
        "\"Free\" as the primary selling point — leads with cost, not value",
        "\"Deserve\" — implies entitlement; prefer \"fits\" or \"aligns\"",
        "\"Just\" as a minimizer — don't undervalue the work",
        "Technical jargon without explanation — always define SRMA, NEPA, CatEx on first use",
    ]
    for w in avoid_words:
        story.append(Paragraph(f"✗  {w}",
                               ParagraphStyle("AvoidWord", parent=styles["BodySmall"],
                                              textColor=SIGNAL_RED)))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # PAGE 8: PHOTOGRAPHY & APPLICATIONS
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Photography & Imagery", styles["SectionHead"]))
    story.append(hr())

    story.append(Paragraph(
        "Photography should show <b>disc golf in spectacular public lands settings</b> — "
        "not manicured parks. The goal is to claim the visual identity of western "
        "public lands for disc golf.",
        styles["Body"]
    ))

    story.append(Paragraph("Subject Matter (Priority Order)", styles["SubHead"]))
    subjects = [
        "<b>Landscape-dominant shots</b> with disc golf as a small element: a basket against red rock, a player throwing across sagebrush with mountains behind. The land is the star.",
        "<b>Diverse players</b> in natural settings: families, veterans, adaptive athletes, youth groups.",
        "<b>Volunteer stewardship</b>: installation days, maintenance work, community builds.",
        "<b>BLM landscapes without disc golf</b>: the untouched potential. \"Imagine a basket here.\"",
    ]
    for i, s in enumerate(subjects, 1):
        story.append(Paragraph(f"{i}. {s}", styles["Body"]))

    story.append(Paragraph("Style", styles["SubHead"]))
    photo_style = [
        "Natural light. Golden hour preferred.",
        "Wide and medium shots. Show the scale of the land.",
        "Warm color grading. Lean into golden light, warm shadows.",
        "No heavy editing. Authenticity is the point.",
    ]
    for p in photo_style:
        story.append(Paragraph(f"• {p}", styles["BodySmall"]))

    story.append(Paragraph("Avoid", styles["SubHead"]))
    photo_avoid = [
        "Tournament/competition action shots (reads \"sports brand\")",
        "Product shots of discs (reads \"manufacturer\")",
        "Urban park courses (reads \"local rec\")",
        "Stock photography of any kind",
    ]
    for p in photo_avoid:
        story.append(Paragraph(f"✗  {p}",
                               ParagraphStyle("PhotoAvoid", parent=styles["BodySmall"],
                                              textColor=SIGNAL_RED)))

    story.append(PageBreak())
    story.append(Paragraph("Applications", styles["SectionHead"]))
    story.append(hr())

    gcol = W - 1.2 * inch
    app_data = [
        [Paragraph("<b>Context</b>", styles["BodySmall"]),
         Paragraph("<b>Guidelines</b>", styles["BodySmall"])],
        [Paragraph("<b>Website</b>", styles["BodySmall"]),
         Paragraph("Sandstone backgrounds (not white). Night Sky nav, Terra Cotta active states. Terra Cotta primary buttons, Summit Gold secondary CTAs.", styles["BodySmall"])],
        [Paragraph("<b>BLM packets</b>", styles["BodySmall"]),
         Paragraph("Landscape photo cover. Jakarta headings in Terra Cotta. Inter body in Night Sky. Summit Gold data callouts. Sage dividers.", styles["BodySmall"])],
        [Paragraph("<b>Social media</b>", styles["BodySmall"]),
         Paragraph("Terra Cotta or Night Sky backgrounds, or full-bleed landscape photo. Snow/Gold text overlays. #EXPLOREDiscGolf", styles["BodySmall"])],
        [Paragraph("<b>Presentations</b>", styles["BodySmall"]),
         Paragraph("Night Sky title slides, Terra Cotta accent. Sandstone content slides. Oversized Summit Gold stats.", styles["BodySmall"])],
        [Paragraph("<b>Status badges</b>", styles["BodySmall"]),
         Paragraph("Sage = built. Summit Gold = in progress. Driftwood = no contact. Basin Teal = interactive.", styles["BodySmall"])],
    ]
    at = Table(app_data, colWidths=[1.2 * inch, gcol])
    at.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EBE5DA")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EBE5DA")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(at)

    # ── Build ──
    doc.build(story, onFirstPage=page_bg, onLaterPages=page_bg)
    print(f"Built: {OUTPUT}")
    print(f"Size: {os.path.getsize(OUTPUT) / 1024:.0f} KB")


if __name__ == "__main__":
    build_pdf()
