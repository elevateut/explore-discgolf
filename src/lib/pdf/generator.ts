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

function resolvePath(...segments: string[]): string {
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
  doc.registerFont("Jakarta", resolvePath("fonts", "PlusJakartaSans-Bold.ttf"));
  doc.registerFont("Jakarta-XB", resolvePath("fonts", "PlusJakartaSans-ExtraBold.ttf"));
  doc.registerFont("Inter", resolvePath("fonts", "Inter-Regular.ttf"));
  doc.registerFont("Inter-Med", resolvePath("fonts", "Inter-Medium.ttf"));
  doc.registerFont("Inter-SB", resolvePath("fonts", "Inter-SemiBold.ttf"));
  doc.registerFont("Inter-B", resolvePath("fonts", "Inter-Bold.ttf"));
}

// ---------------------------------------------------------------------------
// Drawing Helpers
// ---------------------------------------------------------------------------

function pageHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  // Night Sky header block
  doc.rect(0, 0, PAGE_W, 108).fill(C.nightSky);
  doc.rect(0, 108, PAGE_W, 4).fill(C.terraCotta);

  // Logo
  const logo = resolvePath("images", "brand", "explore-disc-golf-white.png");
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

  // pdfkit's text() auto-paginates whenever the cursor is past the bottom
  // margin (maxY = pageH - margins.bottom). Footer text sits below the
  // content area by design, so temporarily shrink the bottom margin to
  // avoid phantom page creation during the switchToPage footer pass.
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 10;

  doc.fillColor(C.textMuted).font("Inter").fontSize(7)
    .text(
      "EXPLORE Disc Golf — explorediscgolf.org — A 501(c)(3) initiative by ElevateUT",
      ML, PAGE_H - 40, { width: CW - 30, lineBreak: false },
    );
  doc.fillColor(C.textMuted).font("Inter-Med").fontSize(7.5)
    .text(String(num), ML, PAGE_H - 40, { width: CW, align: "right", lineBreak: false });

  doc.page.margins.bottom = savedBottom;
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

/**
 * Base URL used to resolve site-relative links (e.g. `/explore-act/…`) into
 * absolute URLs so they remain clickable when the PDF is read off-site.
 */
const SITE_BASE_URL = "https://explorediscgolf.org";

interface Run {
  text: string;
  bold?: boolean;
  link?: string;
}

function resolveUrl(u: string): string {
  if (/^(https?:|mailto:|tel:)/.test(u)) return u;
  if (u.startsWith("/")) return SITE_BASE_URL + u;
  if (u.startsWith("#")) return u;
  return u;
}

/**
 * Strip inline italic/underscore/code — bold and links are handled by the
 * tokenizer. Runs before tokenization so italic markers that wrap across a
 * link boundary (e.g. `*text [link](url) more*`) don't leave orphaned
 * asterisks in the split halves.
 */
function stripInline(s: string): string {
  return s
    // *italic* — but NOT **bold**. Use a temp placeholder for ** to avoid
    // matching the inner * of **.
    .replace(/\*\*/g, "\u0000BOLD\u0000")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\u0000BOLD\u0000/g, "**")
    // _italic_
    .replace(/(^|[^_])_([^_\n]+)_/g, "$1$2")
    // `code`
    .replace(/`([^`]+)`/g, "$1");
}

/**
 * Tokenize a markdown line into a sequence of styled runs. Handles:
 *   - `**[text](url)**` → bold link
 *   - `[text](url)`     → link
 *   - `**text**`        → bold
 *   - everything else   → plain (with inline italic/code stripped)
 */
function tokenizeLine(rawLine: string): Run[] {
  // Strip italic/code markers up front so they can't wrap across a link
  // boundary and leave orphan asterisks in the tokenized runs.
  const line = stripInline(rawLine);

  const runs: Run[] = [];
  const re =
    /\*\*\[([^\]]+)\]\(([^)]+)\)\*\*|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*\n]+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      runs.push({ text: line.slice(last, m.index) });
    }
    if (m[1] !== undefined && m[2] !== undefined) {
      runs.push({ text: m[1], bold: true, link: resolveUrl(m[2]) });
    } else if (m[3] !== undefined && m[4] !== undefined) {
      runs.push({ text: m[3], link: resolveUrl(m[4]) });
    } else if (m[5] !== undefined) {
      runs.push({ text: m[5], bold: true });
    }
    last = re.lastIndex;
  }
  if (last < line.length) {
    runs.push({ text: line.slice(last) });
  }
  return runs.length > 0 ? runs : [{ text: line }];
}

/**
 * Render a sequence of runs as a single flowing text block, using pdfkit's
 * `continued: true` chaining. Links get Basin Teal + underline + clickable
 * annotation; bold runs get Inter-SB.
 */
function renderRuns(
  doc: PDFKit.PDFDocument,
  runs: Run[],
  x: number,
  y: number,
  width: number,
  opts: { baseFont?: string; boldFont?: string; fontSize?: number; lineGap?: number } = {},
) {
  const base = opts.baseFont ?? "Inter";
  const boldFont = opts.boldFont ?? "Inter-SB";
  const fontSize = opts.fontSize ?? 9.5;
  const lineGap = opts.lineGap ?? 2;

  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    const isLast = i === runs.length - 1;

    doc.font(r.bold ? boldFont : base).fontSize(fontSize);
    doc.fillColor(r.link ? C.basinTeal : C.textBody);

    const options: Record<string, unknown> = {
      continued: !isLast,
      lineGap,
      underline: Boolean(r.link),
    };
    if (r.link) options.link = r.link;

    if (i === 0) {
      doc.text(r.text, x, y, { width, ...options });
    } else {
      doc.text(r.text, options);
    }
  }

  // Reset styling state after a chained run so the next text() call on this
  // document starts clean.
  doc.fillColor(C.textBody).font("Inter");
}

function renderMarkdown(doc: PDFKit.PDFDocument, md: string) {
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { doc.y += 5; i++; continue; }

    // Table (lookahead-collected block of |-prefixed rows)
    if (line.startsWith("|") && line.endsWith("|")) {
      const tableRows: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith("|") && t.endsWith("|")) {
          tableRows.push(t);
          i++;
        } else {
          break;
        }
      }
      renderTable(doc, tableRows);
      continue;
    }

    // # Heading 1
    if (line.startsWith("# ") && !line.startsWith("## ")) {
      ensureSpace(doc, 36);
      doc.y += 8;
      doc.fillColor(C.nightSky).font("Jakarta").fontSize(15)
        .text(line.slice(2), ML, doc.y, { width: CW });
      doc.y += 4;
      i++; continue;
    }

    // --- Horizontal rule
    if (/^[-*_]{3,}$/.test(line)) {
      doc.y += 6;
      doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y)
        .strokeColor(C.base300).lineWidth(0.75).stroke();
      doc.y += 8;
      i++; continue;
    }

    // ## Heading 2
    if (line.startsWith("## ")) {
      ensureSpace(doc, 30);
      doc.y += 6;
      doc.fillColor(C.terraCotta).font("Jakarta").fontSize(12.5)
        .text(stripMarkdown(line.slice(3)), ML, doc.y, { width: CW });
      doc.y += 3;
      i++; continue;
    }

    // ### Heading 3
    if (line.startsWith("### ")) {
      ensureSpace(doc, 24);
      doc.y += 4;
      doc.fillColor(C.nightSky).font("Inter-B").fontSize(10.5)
        .text(stripMarkdown(line.slice(4)), ML, doc.y, { width: CW });
      doc.y += 2;
      i++; continue;
    }

    // > Blockquote
    if (line.startsWith("> ")) {
      callout(doc, line.slice(2));
      i++; continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      ensureSpace(doc, 18);
      const text = line.slice(2);

      // Colored bullet
      doc.circle(ML + 7, doc.y + 5, 2).fill(C.terraCotta);

      const runs = tokenizeLine(text);
      renderRuns(doc, runs, ML + 16, doc.y, CW - 16);
      doc.y += 1;
      i++; continue;
    }

    // Numbered list
    const num = line.match(/^(\d+)\.\s+(.*)$/);
    if (num) {
      ensureSpace(doc, 18);
      const baseY = doc.y;
      doc.fillColor(C.terraCotta).font("Inter-B").fontSize(9.5)
        .text(num[1] + ".", ML, baseY, { width: 14, align: "right" });
      const runs = tokenizeLine(num[2]);
      renderRuns(doc, runs, ML + 18, baseY, CW - 18);
      doc.y += 1;
      i++; continue;
    }

    // Regular paragraph
    ensureSpace(doc, 16);
    const runs = tokenizeLine(line);
    renderRuns(doc, runs, ML, doc.y, CW);
    doc.y += 2;
    i++;
  }
}

// ---------------------------------------------------------------------------
// Table Renderer
// ---------------------------------------------------------------------------

function renderTable(doc: PDFKit.PDFDocument, tableLines: string[]) {
  // Parse rows — strip leading/trailing pipes and split on pipe
  const parsed = tableLines
    .map((l) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));

  // Drop the separator row (e.g. | --- | --- |)
  const rows = parsed.filter(
    (r) => !r.every((c) => /^:?-{2,}:?$/.test(c) || c === ""),
  );
  if (rows.length === 0) return;

  const header = rows[0];
  const body = rows.slice(1);
  const cols = header.length;
  if (cols === 0) return;

  // Column widths — give the first column ~40% when there are ≥3 columns,
  // otherwise split evenly (good for key/value tables).
  const colWidths: number[] = (() => {
    if (cols === 1) return [CW];
    if (cols === 2) return [CW * 0.58, CW * 0.42];
    const first = CW * 0.4;
    const rest = (CW - first) / (cols - 1);
    return [first, ...Array(cols - 1).fill(rest)];
  })();

  const padX = 8;
  const padY = 6;
  const fontSize = 9;

  const measureRow = (row: string[], font: string): number => {
    doc.font(font).fontSize(fontSize);
    let maxH = 0;
    for (let c = 0; c < row.length; c++) {
      const h = doc.heightOfString(stripMarkdown(row[c] ?? ""), {
        width: colWidths[c] - padX * 2,
      });
      if (h > maxH) maxH = h;
    }
    return maxH + padY * 2;
  };

  const drawHeaderRow = (y: number, rowH: number) => {
    doc.rect(ML, y, CW, rowH).fill(C.nightSky);
    doc.rect(ML, y, 3, rowH).fill(C.terraCotta);
    let x = ML;
    for (let c = 0; c < header.length; c++) {
      doc.fillColor(C.snow).font("Jakarta").fontSize(fontSize)
        .text(stripMarkdown(header[c] ?? ""), x + padX, y + padY, {
          width: colWidths[c] - padX * 2,
        });
      x += colWidths[c];
    }
  };

  const drawBodyRow = (row: string[], y: number, rowH: number, alt: boolean) => {
    if (alt) {
      doc.rect(ML, y, CW, rowH).fill(C.sandstone);
    }
    const isBoldRow = row.some((c) => /^\*\*.+\*\*$/.test((c ?? "").trim()));
    const rowFont = isBoldRow ? "Inter-SB" : "Inter";
    let x = ML;
    for (let c = 0; c < row.length; c++) {
      doc.fillColor(C.textBody).font(rowFont).fontSize(fontSize)
        .text(stripMarkdown(row[c] ?? ""), x + padX, y + padY, {
          width: colWidths[c] - padX * 2,
        });
      x += colWidths[c];
    }
    // Subtle divider
    doc.moveTo(ML, y + rowH).lineTo(ML + CW, y + rowH)
      .strokeColor(C.base300).lineWidth(0.4).stroke();
  };

  doc.y += 6;
  const headerH = measureRow(header, "Jakarta");
  const firstBodyH = body.length > 0 ? measureRow(body[0], "Inter") : 0;
  ensureSpace(doc, headerH + firstBodyH + 4);

  drawHeaderRow(doc.y, headerH);
  doc.y += headerH;

  for (let r = 0; r < body.length; r++) {
    const row = body[r];
    const h = measureRow(row, "Inter");
    if (doc.y + h > PAGE_H - MB) {
      doc.addPage();
      doc.y = MT;
      drawHeaderRow(doc.y, headerH);
      doc.y += headerH;
    }
    drawBodyRow(row, doc.y, h, r % 2 === 1);
    doc.y += h;
  }

  doc.y += 10;
}

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")       // **bold**
    .replace(/\*(.+?)\*/g, "$1")            // *italic*
    .replace(/_(.+?)_/g, "$1")              // _italic_
    .replace(/`(.+?)`/g, "$1")              // `code`
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")   // [text](url) → text
    .replace(/^#{1,6}\s+/, "");             // stray heading markers
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

export async function generatePacketPDF(input: PacketPDFInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
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
    doc.on("end", () => {
      const result = Buffer.concat(chunks);
      resolve(result);
    });
    doc.on("error", (err: Error) => {
      console.error("[pdf] Document error:", err);
      reject(err);
    });

    try {
      registerFonts(doc);
    } catch (fontErr) {
      console.warn("[pdf] Font registration failed, using Helvetica:", fontErr);
      // Register fallback font names pointing to Helvetica
      doc.registerFont("Jakarta", "Helvetica-Bold");
      doc.registerFont("Jakarta-XB", "Helvetica-Bold");
      doc.registerFont("Inter", "Helvetica");
      doc.registerFont("Inter-Med", "Helvetica");
      doc.registerFont("Inter-SB", "Helvetica-Bold");
      doc.registerFont("Inter-B", "Helvetica-Bold");
    }

    // =================================================================
    // Cover Page
    // =================================================================
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.nightSky);
    doc.rect(0, 0, PAGE_W, 5).fill(C.terraCotta);

    const logo = resolvePath("images", "brand", "explore-disc-golf-white.png");
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
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// ---------------------------------------------------------------------------
// Resource PDF (standalone advocacy documents)
// ---------------------------------------------------------------------------

export type ResourceCategory = "template" | "one-pager" | "guide" | "talking-points";

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  "one-pager": "ONE-PAGER",
  "template": "TEMPLATE",
  "guide": "GUIDE",
  "talking-points": "TALKING POINTS",
};

export interface ResourcePDFInput {
  title: string;
  description: string;
  category: ResourceCategory;
  /** Markdown body — the portion of the resource after the frontmatter. */
  body: string;
  /** ISO-format generation timestamp. */
  generatedAt: string;
}

export async function generateResourcePDF(input: ResourcePDFInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: MT, bottom: MB, left: ML, right: MR },
        bufferPages: true,
        info: {
          Title: input.title,
          Author: "EXPLORE Disc Golf (ElevateUT)",
          Subject: input.description,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => {
        console.error("[pdf] Document error:", err);
        reject(err);
      });

      try {
        registerFonts(doc);
      } catch (fontErr) {
        console.warn("[pdf] Font registration failed, using Helvetica:", fontErr);
        doc.registerFont("Jakarta", "Helvetica-Bold");
        doc.registerFont("Jakarta-XB", "Helvetica-Bold");
        doc.registerFont("Inter", "Helvetica");
        doc.registerFont("Inter-Med", "Helvetica");
        doc.registerFont("Inter-SB", "Helvetica-Bold");
        doc.registerFont("Inter-B", "Helvetica-Bold");
      }

      // =================================================================
      // Cover Page — mirrors the packet cover: Night Sky bleed, Terra
      // Cotta top bar, logo in white, oversized Jakarta-XB title,
      // Sandstone description, brand color bar at the footer.
      // =================================================================
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.nightSky);
      doc.rect(0, 0, PAGE_W, 5).fill(C.terraCotta);

      const logo = resolvePath("images", "brand", "explore-disc-golf-white.png");
      if (fs.existsSync(logo)) doc.image(logo, ML, 72, { height: 34 });

      // Category label (Summit Gold, spaced caps)
      const catLabel = CATEGORY_LABELS[input.category] ?? String(input.category).toUpperCase();
      doc.fillColor(C.summitGold).font("Jakarta").fontSize(11)
        .text(catLabel, ML, 190, { width: CW, characterSpacing: 2 });

      // Title — size adapts if the title is long
      const titleSize = input.title.length > 48 ? 30 : input.title.length > 32 ? 34 : 40;
      doc.fillColor(C.snow).font("Jakarta-XB").fontSize(titleSize)
        .text(input.title, ML, 216, { width: CW, lineGap: 2 });

      // Terra Cotta rule under title
      const ruleY = doc.y + 18;
      doc.rect(ML, ruleY, 60, 3).fill(C.terraCotta);

      // Description
      doc.fillColor(C.sandstone).font("Inter").fontSize(12.5)
        .text(input.description, ML, ruleY + 18, { width: CW, lineGap: 3 });

      // Footer branding
      const dateStr = new Date(input.generatedAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
      doc.fillColor(C.sandstone).font("Inter").fontSize(9)
        .text("EXPLORE Disc Golf", ML, PAGE_H - 118, { width: CW });
      doc.fillColor("#8A9BB0").fontSize(8)
        .text("A 501(c)(3) initiative by ElevateUT — explorediscgolf.org", ML, doc.y + 2, { width: CW })
        .text(`Published ${dateStr}`, ML, doc.y + 2, { width: CW })
        .text("Disc golf on America's public lands.", ML, doc.y + 2, { width: CW });

      // Brand color bar
      const bw = CW / 4;
      const by = PAGE_H - 36;
      doc.rect(ML, by, bw, 5).fill(C.terraCotta);
      doc.rect(ML + bw, by, bw, 5).fill(C.sage);
      doc.rect(ML + bw * 2, by, bw, 5).fill(C.summitGold);
      doc.rect(ML + bw * 3, by, bw, 5).fill(C.basinTeal);

      // =================================================================
      // Content — single section using the shared pageHeader + renderer
      // =================================================================
      doc.addPage();
      pageHeader(doc, input.title, input.description);
      doc.y += 8;
      renderMarkdown(doc, input.body);

      // =================================================================
      // Back Cover — identical to the packet back cover
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
          "Free to use and distribute. Customize and review before submitting to BLM offices or partners.",
          ML, doc.y + 30, { width: CW },
        );

      doc.rect(ML, PAGE_H - 36, bw, 5).fill(C.terraCotta);
      doc.rect(ML + bw, PAGE_H - 36, bw, 5).fill(C.sage);
      doc.rect(ML + bw * 2, PAGE_H - 36, bw, 5).fill(C.summitGold);
      doc.rect(ML + bw * 3, PAGE_H - 36, bw, 5).fill(C.basinTeal);

      // Page footers on interior pages only (skip cover + back cover)
      const range = doc.bufferedPageRange();
      for (let i = 1; i < range.count - 1; i++) {
        doc.switchToPage(i);
        pageFooter(doc, i);
      }

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
