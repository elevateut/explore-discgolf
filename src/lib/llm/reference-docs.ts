/**
 * Reference Document Loader for Prompt Caching
 *
 * Loads all reference docs and content collection markdown at import time.
 * Used as a cached system message block in the chat prompt to give Claude
 * full context of the EXPLORE Act, engagement strategies, case studies,
 * and brand guidelines without re-processing on every turn.
 *
 * Estimated size: ~167K chars / ~42K tokens
 */

import fs from "fs";
import path from "path";

function loadDir(dir: string, exclude: string[] = []): string {
  if (!fs.existsSync(dir)) return "";

  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !exclude.includes(f))
    .sort();

  return files
    .map((f) => {
      const content = fs.readFileSync(path.join(dir, f), "utf8");
      // Strip frontmatter (--- ... ---)
      const stripped = content.replace(/^---[\s\S]*?---\n*/, "").trim();
      return `## [Reference: ${f}]\n\n${stripped}`;
    })
    .join("\n\n---\n\n");
}

function buildReferenceBlock(): string {
  const root = process.cwd();

  const parts: string[] = [
    "# EXPLORE Disc Golf — Reference Documents\n\nThe following documents contain the full context of the EXPLORE Act, disc golf advocacy strategy, case studies, and engagement resources. Use this information to provide accurate, specific, and well-grounded advice.\n",
  ];

  // Primary reference docs (docs/ folder — excludes research/ drafts)
  parts.push("# Legislative Analysis & Strategy\n");
  parts.push(loadDir(path.join(root, "docs"), ["README.md"]));

  // EXPLORE Act content
  parts.push("\n\n# EXPLORE Act Educational Content\n");
  parts.push(loadDir(path.join(root, "src/content/explore-act")));

  // Resources
  parts.push("\n\n# Advocacy Resources & Templates\n");
  parts.push(loadDir(path.join(root, "src/content/resources")));

  // Case studies
  parts.push("\n\n# Case Studies — Existing BLM Disc Golf Courses\n");
  parts.push(loadDir(path.join(root, "src/content/case-studies")));

  return parts.join("\n");
}

/** Pre-built reference doc block for prompt caching. */
export const REFERENCE_DOCS_BLOCK = buildReferenceBlock();

/** Approximate token count (chars / 4). */
export const REFERENCE_DOCS_TOKEN_ESTIMATE = Math.round(
  REFERENCE_DOCS_BLOCK.length / 4,
);
