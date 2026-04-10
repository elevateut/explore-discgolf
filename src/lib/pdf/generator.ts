/**
 * Branded PDF Generator — EXPLORE Disc Golf
 *
 * Generates professional engagement packet PDFs using pdfkit.
 * Design: Night Sky headers, Terra Cotta accents, Sandstone callouts,
 * Plus Jakarta Sans headings, Inter body text.
 */

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Brand Constants
// ---------------------------------------------------------------------------

const C = {
  nightSky: "#1E2D3B",
  terraCotta: "#B85C38",
  sage: "#5B7F3B",
  summitGold: "#D4952B",
  sandstone: "#F5F0E8",
  snow: "#FEFDFB",
  basinTeal: "#1A8BA3",
  base300: "#EBE5DA",
  textBody: "#2D3748",
  textMuted: "#64748B",
};

const PAGE_W = 612;
const PAGE_H = 792;
const ML = 60; // margin left
const MR = 60;
const MT = 72;
const MB = 72;
const CW = PAGE_W - ML - MR; // content width

// ---------------------------------------------------------------------------
// Font + Asset Resolution
// ---------------------------------------------------------------------------

function resolve(...segments: string[]): string {
  // Try multiple paths for different environments
  for (const base of [
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "dist/client"),
    path.resolve(process.cwd(), ".vercel/output/static"),
  ]) {
    const p = path.join(base, ...segments);
    if (fs.existsSync(p)) return p;
  }
  return path.join(process.cwd(), "public", ...segments);
}

function registerFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont("Jakarta", resolve("fonts", "PlusJakartaSans-Bold.ttf"));
  doc.registerFont("Jakarta-XB", resolve("fonts", "PlusJakartaSans-ExtraBold.ttf"));
  doc.registerFont("Inter", resolve("fonts", "Inter-Regular.ttf"));
  doc.registerFont("Inter-Med", resolve("fonts", "Inter-Medium.ttf"));
  doc.registerFont("Inter-SB", resolve("fonts", "Inter-SemiBold.ttf"));
  doc.registerFont("Inter-B", resolve("fonts", "Inter-Bold.ttf"));
}

// ---------------------------------------------------------------------------
// Drawing Helpers
// ---------------------------------------------------------------------------

function pageHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  // Night Sky header block
  doc.rect(0, 0, PAGE_W, 108).fill(C.nightSky);
  doc.rect(0, 108, PAGE_W, 4).fill(C.terraCotta);

  // Logo
  const logo = resolve("images", "brand", "explore-disc-golf-white.png");
  if (fs.existsSync(logo)) doc.image(logo, ML, 20, { height: 26 });

  // Title
  doc.fillColor(C.snow).font("Jakarta-XB").fontSize(21)
    .text(title, ML, 56, { width: CW });

  if (subtitle) {
    doc.fillColor(C.sandstone).font("Inter").fontSize(9.5)
      .text(subtitle, ML, 84, { width: CW });
  }

  doc.y = 128;
}

function sectionHead(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 50);
  const y = doc.y + 12;

  // Terra Cotta left bar
  doc.rect(ML, y, 3.5, 22).fill(C.terraCotta);

  // Title text
  doc.fillColor(C.nightSky).font("Jakarta").fontSize(15)
    .text(title, ML + 12, y + 2, { width: CW - 12 });

  // Underline
  doc.moveTo(ML, y + 28).lineTo(ML + CW, y + 28)
    .strokeColor(C.base300).lineWidth(0.75).stroke();

  doc.y = y + 38;
}

function callout(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 60);
  const y = doc.y + 4;
  const h = doc.font("Inter").fontSize(9.5)
    .heightOfString(text, { width: CW - 36 }) + 20;

  doc.roundedRect(ML, y, CW, h, 4).fill(C.sandstone);
  doc.rect(ML, y, 3.5, h).fill(C.basinTeal);
  doc.fillColor(C.textBody).font("Inter").fontSize(9.5)
    .text(text, ML + 18, y + 10, { width: CW - 36, lineGap: 2 });

  doc.y = y + h + 8;
}

function pageFooter(doc: PDFKit.PDFDocument, num: number) {
  doc.moveTo(ML, PAGE_H - 48).lineTo(ML + CW, PAGE_H - 48)
    .strokeColor(C.base300).lineWidth(0.5).stroke();

  doc.fillColor(C.textMuted).font("Inter").fontSize(7)
    .text(
      "EXPLORE Disc Golf — explorediscgolf.org — A 501(c)(3) initiative by ElevateUT",
      ML, PAGE_H - 40, { width: CW - 30 },
    );
  doc.fillColor(C.textMuted).font("Inter-Med").fontSize(7.5)
    .text(String(num), ML, PAGE_H - 40, { width: CW, align: "right" });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > PAGE_H - MB) {
    doc.addPage();
    doc.y = MT;
  }
}

// ---------------------------------------------------------------------------
// Markdown-ish Content Renderer
// ---------------------------------------------------------------------------

function renderMarkdown(doc: PDFKit.PDFDocument, md: string) {
  const lines = md.split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { doc.y += 5; continue; }

    // ## Heading 2
    if (line.startsWith("## ")) {
      ensureSpace(doc, 30);
      doc.y += 6;
      doc.fillColor(C.terraCotta).font("Jakarta").fontSize(12.5)
        .text(line.slice(3), ML, doc.y, { width: CW });
      doc.y += 3;
      continue;
    }

    // ### Heading 3
    if (line.startsWith("### ")) {
      ensureSpace(doc, 24);
      doc.y += 4;
      doc.fillColor(C.nightSky).font("Inter-B").fontSize(10.5)
        .text(line.slice(4), ML, doc.y, { width: CW });
      doc.y += 2;
      continue;
    }

    // > Blockquote
    if (line.startsWith("> ")) {
      callout(doc, line.slice(2));
      continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      ensureSpace(doc, 18);
      const text = line.slice(2);

      // Colored bullet
      doc.circle(ML + 7, doc.y + 5, 2).fill(C.terraCotta);

      // Bold prefix: **Key:** value
      const bold = text.match(/^\*\*(.+?)\*\*(.*)$/);
      if (bold) {
        doc.fillColor(C.textBody).font("Inter-SB").fontSize(9.5)
          .text(bold[1], ML + 16, doc.y, { width: CW - 16, continued: true });
        doc.font("Inter").text(bold[2]);
      } else {
        doc.fillColor(C.textBody).font("Inter").fontSize(9.5)
          .text(stripBold(text), ML + 16, doc.y, { width: CW - 16 });
      }
      doc.y += 1;
      continue;
    }

    // Numbered list
    const num = line.match(/^(\d+)\.\s+(.*)$/);
    if (num) {
      ensureSpace(doc, 18);
      const baseY = doc.y;
      doc.fillColor(C.terraCotta).font("Inter-B").fontSize(9.5)
        .text(num[1] + ".", ML, baseY, { width: 14, align: "right" });
      doc.fillColor(C.textBody).font("Inter").fontSize(9.5)
        .text(stripBold(num[2]), ML + 18, baseY, { width: CW - 18 });
      doc.y += 1;
      continue;
    }

    // Regular paragraph
    ensureSpace(doc, 16);
    doc.fillColor(C.textBody).font("Inter").fontSize(9.5)
      .text(stripBold(line), ML, doc.y, { width: CW, lineGap: 2 });
    doc.y += 2;
  }
}

function stripBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PacketPDFInput {
  officeName: string;
  officeId: string;
  state: string;
  onePager: string;
  alignmentMemo: string;
  coverLetter: string;
  suggestedContacts: string;
  generatedAt: string;
}

export function generatePacketPDF(input: PacketPDFInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: MT, bottom: MB, left: ML, right: MR },
      bufferPages: true,
      info: {
        Title: `${input.officeName} — Engagement Packet`,
        Author: "EXPLORE Disc Golf (ElevateUT)",
        Subject: `BLM engagement packet for ${input.officeName}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try { registerFonts(doc); } catch { /* use defaults */ }

    // =================================================================
    // Cover Page
    // =================================================================
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.nightSky);
    doc.rect(0, 0, PAGE_W, 5).fill(C.terraCotta);

    const logo = resolve("images", "brand", "explore-disc-golf-white.png");
    if (fs.existsSync(logo)) doc.image(logo, ML, 72, { height: 34 });

    doc.fillColor(C.snow).font("Jakarta-XB").fontSize(42)
      .text("Engagement", ML, 200, { width: CW })
      .text("Packet", ML, doc.y, { width: CW });

    doc.fillColor(C.terraCotta).font("Jakarta").fontSize(22)
      .text(input.officeName, ML, doc.y + 24, { width: CW });

    const dateStr = new Date(input.generatedAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    doc.fillColor(C.sandstone).font("Inter").fontSize(11)
      .text(`${input.state} — ${dateStr}`, ML, doc.y + 12, { width: CW });

    // Bottom branding
    doc.fillColor(C.sandstone).font("Inter").fontSize(9)
      .text("EXPLORE Disc Golf", ML, PAGE_H - 110, { width: CW });
    doc.fillColor("#8A9BB0").fontSize(8)
      .text("A 501(c)(3) initiative by ElevateUT — explorediscgolf.org", ML, doc.y + 2, { width: CW })
      .text("Disc golf on America's public lands.", ML, doc.y + 2, { width: CW });

    // Brand color bar
    const bw = CW / 4;
    const by = PAGE_H - 36;
    doc.rect(ML, by, bw, 5).fill(C.terraCotta);
    doc.rect(ML + bw, by, bw, 5).fill(C.sage);
    doc.rect(ML + bw * 2, by, bw, 5).fill(C.summitGold);
    doc.rect(ML + bw * 3, by, bw, 5).fill(C.basinTeal);

    // =================================================================
    // Content Sections
    // =================================================================
    const sections = [
      { title: "Executive One-Pager", sub: `Tailored for ${input.officeName}`, md: input.onePager },
      { title: "EXPLORE Act Alignment", sub: "How disc golf fits P.L. 118-234", md: input.alignmentMemo },
      { title: "Cover Letter", sub: `To ${input.officeName} leadership`, md: input.coverLetter },
      { title: "Suggested Contacts", sub: "Prioritized outreach targets", md: input.suggestedContacts },
    ];

    for (const s of sections) {
      doc.addPage();
      pageHeader(doc, s.title, s.sub);
      doc.y += 8;
      renderMarkdown(doc, s.md);
    }

    // =================================================================
    // Back Cover
    // =================================================================
    doc.addPage();
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.nightSky);

    if (fs.existsSync(logo)) doc.image(logo, ML, PAGE_H / 2 - 60, { height: 36 });

    doc.fillColor(C.snow).font("Jakarta-XB").fontSize(24)
      .text("Disc golf on America's", ML, PAGE_H / 2, { width: CW });
    doc.fillColor(C.terraCotta).font("Jakarta-XB").fontSize(24)
      .text("public lands.", ML, doc.y, { width: CW });

    doc.fillColor(C.sandstone).font("Inter").fontSize(10)
      .text("explorediscgolf.org", ML, doc.y + 24, { width: CW })
      .text("A 501(c)(3) initiative by ElevateUT", ML, doc.y + 4, { width: CW });

    doc.fillColor("#8A9BB0").font("Inter").fontSize(8)
      .text(
        "This packet was generated using AI tools and public data. " +
        "Content should be reviewed before submission to BLM offices.",
        ML, doc.y + 30, { width: CW },
      );

    // Brand bar
    doc.rect(ML, PAGE_H - 36, bw, 5).fill(C.terraCotta);
    doc.rect(ML + bw, PAGE_H - 36, bw, 5).fill(C.sage);
    doc.rect(ML + bw * 2, PAGE_H - 36, bw, 5).fill(C.summitGold);
    doc.rect(ML + bw * 3, PAGE_H - 36, bw, 5).fill(C.basinTeal);

    // =================================================================
    // Page Numbers (skip cover + back cover)
    // =================================================================
    const range = doc.bufferedPageRange();
    for (let i = 1; i < range.count - 1; i++) {
      doc.switchToPage(i);
      pageFooter(doc, i);
    }

    doc.end();
  });
}
