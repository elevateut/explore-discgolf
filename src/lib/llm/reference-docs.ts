/**
 * Reference Document Loader for Prompt Caching
 *
 * Loads all reference docs and content collection markdown at import time.
 * Used as a cached system message block in the chat prompt to give Claude
 * full context of the EXPLORE Act, engagement strategies, case studies,
 * and brand guidelines without re-processing on every turn.
 *
 * For docs that have a public route (explore-act, resources, case-studies),
 * the loader emits a `URL:` line in each doc heading and builds a top-level
 * "Linkable Reference Pages" index so Claude can cite them as markdown links
 * in chat replies. Files under `docs/` have no public route, so no URL is
 * emitted for them.
 *
 * Estimated size: ~167K chars / ~42K tokens
 */

import fs from "fs";
import path from "path";

interface LoadedDoc {
  filename: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  url: string | null;
}

/**
 * Parse YAML frontmatter for `title` and `description`. We deliberately keep
 * this regex-based instead of pulling in a YAML parser — frontmatter in this
 * repo is simple key/value pairs and content schemas (src/content/config.ts)
 * enforce that `title` and `description` are always present.
 */
function parseFrontmatter(raw: string): { title: string; description: string; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { title: "", description: "", body: raw.trim() };
  }
  const fm = match[1];
  const body = raw.slice(match[0].length).trim();

  const pick = (key: string): string => {
    const re = new RegExp(`^${key}:\\s*(.*)$`, "m");
    const m = fm.match(re);
    if (!m) return "";
    return m[1].trim().replace(/^["'](.*)["']$/, "$1");
  };

  return {
    title: pick("title"),
    description: pick("description"),
    body,
  };
}

function loadDir(
  dir: string,
  options: { exclude?: string[]; urlPrefix?: string | null } = {},
): LoadedDoc[] {
  const { exclude = [], urlPrefix = null } = options;
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !exclude.includes(f))
    .sort()
    .map((filename) => {
      const raw = fs.readFileSync(path.join(dir, filename), "utf8");
      const { title, description, body } = parseFrontmatter(raw);
      const slug = filename.replace(/\.md$/, "");
      return {
        filename,
        slug,
        title: title || slug,
        description,
        body,
        url: urlPrefix ? `${urlPrefix}/${slug}` : null,
      };
    });
}

/** Format a single loaded doc into a reference section with optional URL header. */
function formatDoc(doc: LoadedDoc): string {
  const header = `## [Reference: ${doc.filename}]`;
  const meta: string[] = [];
  if (doc.title) meta.push(`**Title:** ${doc.title}`);
  if (doc.url) meta.push(`**URL:** ${doc.url}`);
  const metaBlock = meta.length > 0 ? `${meta.join("\n")}\n\n` : "";
  return `${header}\n\n${metaBlock}${doc.body}`;
}

/** Format a group of docs into one reference section, joined by `---`. */
function formatGroup(docs: LoadedDoc[]): string {
  return docs.map(formatDoc).join("\n\n---\n\n");
}

/**
 * Build a top-level index of every doc that has a public URL, so Claude can
 * scan one block to decide which page to link rather than searching the full
 * 42K-token reference body.
 */
function buildLinkIndex(groups: Array<{ label: string; docs: LoadedDoc[] }>): string {
  const lines: string[] = [
    "# Linkable Reference Pages",
    "",
    "When you reference any of the concepts below in chat, link to the page using markdown link syntax: `[link text](URL)`. The user can click through to read more. Always prefer linking the first mention of a concept rather than naming it inline without a link.",
    "",
  ];

  for (const group of groups) {
    const linkable = group.docs.filter((d) => d.url);
    if (linkable.length === 0) continue;
    lines.push(`## ${group.label}`);
    lines.push("");
    for (const doc of linkable) {
      const summary = doc.description ? ` — ${doc.description}` : "";
      lines.push(`- [${doc.title}](${doc.url})${summary}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function buildReferenceBlock(): string {
  const root = process.cwd();

  // Internal docs — loaded for context but NOT publicly routed, so no URLs.
  const internalDocs = loadDir(path.join(root, "docs"), { exclude: ["README.md"] });

  // Public content collections — each gets a URL prefix matching its route.
  const exploreActDocs = loadDir(path.join(root, "src/content/explore-act"), {
    urlPrefix: "/explore-act",
  });
  const resourceDocs = loadDir(path.join(root, "src/content/resources"), {
    urlPrefix: "/resources",
  });
  const caseStudyDocs = loadDir(path.join(root, "src/content/case-studies"), {
    urlPrefix: "/case-studies",
  });

  const linkIndex = buildLinkIndex([
    { label: "EXPLORE Act Educational Content", docs: exploreActDocs },
    { label: "Advocacy Resources & Templates", docs: resourceDocs },
    { label: "Case Studies — Existing BLM Disc Golf Courses", docs: caseStudyDocs },
  ]);

  const parts: string[] = [
    "# EXPLORE Disc Golf — Reference Documents\n\nThe following documents contain the full context of the EXPLORE Act, disc golf advocacy strategy, case studies, and engagement resources. Use this information to provide accurate, specific, and well-grounded advice.\n",
    linkIndex,
    "# Legislative Analysis & Strategy\n",
    formatGroup(internalDocs),
    "\n\n# EXPLORE Act Educational Content\n",
    formatGroup(exploreActDocs),
    "\n\n# Advocacy Resources & Templates\n",
    formatGroup(resourceDocs),
    "\n\n# Case Studies — Existing BLM Disc Golf Courses\n",
    formatGroup(caseStudyDocs),
  ];

  return parts.join("\n");
}

/** Pre-built reference doc block for prompt caching. */
export const REFERENCE_DOCS_BLOCK = buildReferenceBlock();

/** Approximate token count (chars / 4). */
export const REFERENCE_DOCS_TOKEN_ESTIMATE = Math.round(
  REFERENCE_DOCS_BLOCK.length / 4,
);
