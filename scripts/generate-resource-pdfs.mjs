#!/usr/bin/env node
/**
 * Generate branded PDFs for every resource in src/content/resources/.
 *
 * Reads each markdown file, parses its frontmatter, calls the shared
 * generateResourcePDF() from src/lib/pdf/generator.ts, and writes the
 * resulting PDF to public/downloads/<slug>.pdf.
 *
 * Node 22.6+ supports importing .ts files directly, so this .mjs script
 * can import the TypeScript generator with no build step.
 *
 * Run with: npm run generate:resource-pdfs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const RESOURCES_DIR = path.join(ROOT, "src", "content", "resources");
const OUT_DIR = path.join(ROOT, "public", "downloads");

// Lightweight YAML frontmatter parser — handles the simple key: "value" /
// key: value / key: true|false shape used in this project's content
// collections. It does not try to be a general YAML parser.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw };
  }
  const [, yaml, body] = match;
  const data = {};
  for (const line of yaml.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (value === "true") {
      data[key] = true;
    } else if (value === "false") {
      data[key] = false;
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      data[key] = Number(value);
    } else {
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }
  return { data, body: body.trimStart() };
}

async function main() {
  // Dynamic import — Node strips TS types on the fly.
  const { generateResourcePDF } = await import(
    path.join(ROOT, "src", "lib", "pdf", "generator.ts")
  );

  await fs.mkdir(OUT_DIR, { recursive: true });

  const entries = await fs.readdir(RESOURCES_DIR);
  const mdFiles = entries.filter((f) => f.endsWith(".md")).sort();

  if (mdFiles.length === 0) {
    console.warn("[generate:resource-pdfs] no markdown files found");
    return;
  }

  const generatedAt = new Date().toISOString();
  const results = [];

  for (const file of mdFiles) {
    const slug = file.replace(/\.md$/, "");
    const fullPath = path.join(RESOURCES_DIR, file);
    const raw = await fs.readFile(fullPath, "utf8");
    const { data, body } = parseFrontmatter(raw);

    if (!data.title || !data.category) {
      console.warn(`[generate:resource-pdfs] skipping ${file}: missing title or category`);
      continue;
    }
    if (data.downloadable === false) {
      console.log(`[generate:resource-pdfs] skipping ${file}: downloadable=false`);
      continue;
    }

    process.stdout.write(`  → rendering ${slug}.pdf `);
    const pdf = await generateResourcePDF({
      title: data.title,
      description: data.description ?? "",
      category: data.category,
      body,
      generatedAt,
      slug,
    });

    const outPath = path.join(OUT_DIR, `${slug}.pdf`);
    await fs.writeFile(outPath, pdf);
    console.log(`(${(pdf.length / 1024).toFixed(1)} KB)`);
    results.push({ slug, bytes: pdf.length });
  }

  console.log(`\n[generate:resource-pdfs] wrote ${results.length} PDFs to public/downloads/`);
}

main().catch((err) => {
  console.error("[generate:resource-pdfs] failed:", err);
  process.exit(1);
});
