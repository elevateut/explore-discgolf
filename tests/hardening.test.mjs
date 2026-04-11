/**
 * Hardening validation tests — verifies all security, performance,
 * and asset changes from the hardening PR.
 *
 * Run: node tests/hardening.test.mjs
 */

import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

const root = path.resolve(import.meta.dirname, "..");

function readFile(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf-8");
}

// =========================================================================
console.log("\n\x1b[1mPhase 1: Security\x1b[0m\n");
// =========================================================================

// --- XSS: DOMPurify in PacketViewer ---
const packetViewer = readFile("src/components/PacketViewer.svelte");

test("PacketViewer imports DOMPurify", () => {
  assert(
    packetViewer.includes('import DOMPurify from "isomorphic-dompurify"'),
    "Missing DOMPurify import",
  );
});

test("PacketViewer sanitizes markdown output", () => {
  assert(
    packetViewer.includes("DOMPurify.sanitize(marked.parse(md)"),
    "renderMarkdown() does not wrap output in DOMPurify.sanitize()",
  );
});

// --- SSRF: URL whitelist in tools.ts ---
const tools = readFile("src/lib/llm/tools.ts");

test("tools.ts defines ALLOWED_URL_DOMAINS whitelist", () => {
  assert(tools.includes("ALLOWED_URL_DOMAINS"), "Missing ALLOWED_URL_DOMAINS");
  assert(tools.includes('"www.blm.gov"'), 'Missing "www.blm.gov" in whitelist');
  assert(tools.includes('"doi.gov"'), 'Missing "doi.gov" in whitelist');
});

test("tools.ts has isAllowedUrl() function", () => {
  assert(tools.includes("function isAllowedUrl("), "Missing isAllowedUrl function");
  assert(tools.includes('parsed.protocol !== "https:"'), "isAllowedUrl doesn't check HTTPS protocol");
});

test("tools.ts rejects disallowed URLs in query_blm_office_page", () => {
  assert(
    tools.includes("isAllowedUrl(url)"),
    "query_blm_office_page handler doesn't call isAllowedUrl()",
  );
  assert(
    tools.includes("URL not allowed"),
    "Missing rejection message for disallowed URLs",
  );
});

// --- Input Bounds: toFiniteNumber ---
test("tools.ts defines toFiniteNumber() helper", () => {
  assert(tools.includes("function toFiniteNumber("), "Missing toFiniteNumber function");
  assert(tools.includes("Number.isFinite(n)"), "toFiniteNumber doesn't check isFinite");
  assert(tools.includes("Math.max(min, Math.min(max, n))"), "Missing clamping logic");
});

test("tools.ts uses toFiniteNumber for lat/lng/radius in recreation sites", () => {
  // query_blm_recreation_sites
  assert(
    tools.includes('toFiniteNumber(toolInput.latitude, 0, -90, 90)'),
    "Recreation sites lat not bounded",
  );
  assert(
    tools.includes('toFiniteNumber(toolInput.longitude, 0, -180, 180)'),
    "Recreation sites lng not bounded",
  );
  assert(
    tools.includes('toFiniteNumber(toolInput.radius_degrees, 0.5, 0.01, 5)'),
    "Recreation sites radius not bounded",
  );
});

test("tools.ts removed query_nearby_courses (FLiPT deferred)", () => {
  assert(
    !tools.includes("case \"query_nearby_courses\""),
    "query_nearby_courses handler should be removed",
  );
});

// --- Client-side injection: OfficeMap ---
const officeMap = readFile("src/components/OfficeMap.svelte");

test("OfficeMap validates office ID before ArcGIS query", () => {
  assert(
    officeMap.includes("BLM_UNIT_CODE_RE"),
    "Missing BLM_UNIT_CODE_RE regex",
  );
  assert(
    officeMap.includes("/^[A-Z0-9]{2,20}$/"),
    "Regex pattern doesn't match expected format",
  );
  assert(
    officeMap.includes("BLM_UNIT_CODE_RE.test(safeId)"),
    "fetchBoundary doesn't test office ID against regex",
  );
});

test("OfficeMap uses sanitized ID in where clause", () => {
  assert(
    officeMap.includes("ADM_UNIT_CD='${safeId}'"),
    "Where clause should use safeId, not raw officeId",
  );
});

// =========================================================================
console.log("\n\x1b[1mPhase 2: Performance\x1b[0m\n");
// =========================================================================

// --- Hybrid rendering: prerender on static pages ---
const staticPages = [
  "src/pages/404.astro",
  "src/pages/about.astro",
  "src/pages/explore-act/index.astro",
  "src/pages/resources/index.astro",
  "src/pages/case-studies/index.astro",
];

for (const page of staticPages) {
  test(`${page} has prerender = true`, () => {
    const content = readFile(page);
    assert(
      content.includes("export const prerender = true"),
      `Missing prerender directive in ${page}`,
    );
  });
}

// Dynamic slug pages should NOT have prerender (they lack getStaticPaths)
const dynamicPages = [
  "src/pages/explore-act/[...slug].astro",
  "src/pages/resources/[...slug].astro",
  "src/pages/case-studies/[...slug].astro",
];

for (const page of dynamicPages) {
  test(`${page} does NOT have prerender = true (SSR route)`, () => {
    const content = readFile(page);
    assert(
      !content.includes("export const prerender = true"),
      `${page} should remain server-rendered (no getStaticPaths)`,
    );
  });
}

// --- PDF font caching ---
const pdfGen = readFile("src/lib/pdf/generator.ts");

test("PDF generator caches FONT_PATHS at module level", () => {
  assert(pdfGen.includes("const FONT_PATHS = {"), "Missing FONT_PATHS cache");
  assert(pdfGen.includes("FONT_PATHS.jakarta"), "registerFonts doesn't use cached paths");
});

test("PDF generator caches LOGO_PATH at module level", () => {
  assert(pdfGen.includes("const LOGO_PATH = resolvePath("), "Missing LOGO_PATH cache");
  assert(pdfGen.includes("LOGO_PATH)"), "Logo references don't use cached LOGO_PATH");
  // Ensure no more resolve("images"...) calls remain except the cached one
  const logoResolves = pdfGen.match(/resolvePath\("images"/g) || [];
  assert(
    logoResolves.length === 1,
    `Expected 1 resolvePath("images"...) call (the cache), found ${logoResolves.length}`,
  );
});

// --- Geocode debounce + AbortController ---
const officeFinder = readFile("src/components/BLMOfficeFinder.svelte");

test("BLMOfficeFinder has AbortController for geocoding", () => {
  assert(
    officeFinder.includes("geocodeAbort"),
    "Missing geocodeAbort AbortController",
  );
  assert(
    officeFinder.includes("geocodeAbort?.abort()"),
    "geocodeAndSearch doesn't abort previous request",
  );
  assert(
    officeFinder.includes("new AbortController()"),
    "Missing AbortController creation",
  );
  assert(
    officeFinder.includes("signal,"),
    "Fetch call doesn't pass abort signal",
  );
});

test("BLMOfficeFinder has debounce timer for geocoding", () => {
  assert(
    officeFinder.includes("debounceTimer"),
    "Missing debounceTimer variable",
  );
  assert(
    officeFinder.includes("setTimeout(() => geocodeAndSearch(q), 300)"),
    "handleSearch doesn't debounce geocode calls at 300ms",
  );
  assert(
    officeFinder.includes("clearTimeout(debounceTimer)"),
    "Debounce timer not cleared before reset",
  );
});

test("BLMOfficeFinder handles AbortError gracefully", () => {
  assert(
    officeFinder.includes('"AbortError"'),
    "Missing AbortError check in catch block",
  );
});

// --- Claude API timeout ---
const packetGen = readFile("src/lib/llm/packet-generator.ts");

test("generatePacket accepts timeout option", () => {
  assert(
    packetGen.includes("options?: { timeoutMs?: number }"),
    "generatePacket missing timeoutMs option",
  );
});

test("generatePacket creates AbortController with timeout", () => {
  assert(
    packetGen.includes("const abortController = timeoutMs"),
    "Missing AbortController setup",
  );
  assert(
    packetGen.includes("setTimeout(() => abortController!.abort(), timeoutMs)"),
    "Missing timeout timer",
  );
});

test("generatePacket passes signal to Claude API call", () => {
  assert(
    packetGen.includes("signal: abortController.signal"),
    "API call doesn't receive abort signal",
  );
});

test("generatePacket cleans up timer in finally block", () => {
  assert(
    packetGen.includes("} finally {"),
    "Missing finally block for cleanup",
  );
  assert(
    packetGen.includes("clearTimeout(timer)"),
    "Timer not cleared in finally block",
  );
});

// --- Caller passes timeout ---
const generateAction = readFile("src/actions/generate-packet.ts");

test("generate-packet action passes 25s timeout", () => {
  assert(
    generateAction.includes("{ timeoutMs: 25_000 }"),
    "Action doesn't pass timeoutMs to generatePacket",
  );
});

// --- Vercel adapter maxDuration ---
const astroConfig = readFile("astro.config.mjs");

test("Vercel adapter has maxDuration: 30", () => {
  assert(
    astroConfig.includes("maxDuration: 30"),
    "Missing maxDuration in vercel adapter config",
  );
});

// =========================================================================
console.log("\n\x1b[1mPhase 3: Assets\x1b[0m\n");
// =========================================================================

// --- vercel.json ---
test("vercel.json exists with headers config", () => {
  assert(fs.existsSync(path.join(root, "vercel.json")), "vercel.json not found");
  const vercelConfig = JSON.parse(readFile("vercel.json"));
  assert(Array.isArray(vercelConfig.headers), "vercel.json missing headers array");
});

test("vercel.json has font cache headers (1yr immutable)", () => {
  const vercelConfig = JSON.parse(readFile("vercel.json"));
  const fontRule = vercelConfig.headers.find((h) => h.source.includes("/fonts/"));
  assert(fontRule, "Missing font cache rule");
  const cc = fontRule.headers.find((h) => h.key === "Cache-Control");
  assert(cc, "Missing Cache-Control header for fonts");
  assert(
    cc.value.includes("immutable") && cc.value.includes("31536000"),
    `Font cache should be immutable+1yr, got: ${cc.value}`,
  );
});

test("vercel.json has image cache headers", () => {
  const vercelConfig = JSON.parse(readFile("vercel.json"));
  const imgRule = vercelConfig.headers.find((h) => h.source.includes("/images/"));
  assert(imgRule, "Missing image cache rule");
  const cc = imgRule.headers.find((h) => h.key === "Cache-Control");
  assert(cc, "Missing Cache-Control header for images");
  assert(cc.value.includes("86400"), `Image cache should include max-age=86400, got: ${cc.value}`);
});

test("vercel.json has security headers", () => {
  const vercelConfig = JSON.parse(readFile("vercel.json"));
  const globalRule = vercelConfig.headers.find((h) => h.source === "/(.*)");
  assert(globalRule, "Missing global headers rule");
  const headerKeys = globalRule.headers.map((h) => h.key);
  assert(headerKeys.includes("X-Content-Type-Options"), "Missing X-Content-Type-Options");
  assert(headerKeys.includes("X-Frame-Options"), "Missing X-Frame-Options");
  assert(headerKeys.includes("Referrer-Policy"), "Missing Referrer-Policy");
  assert(headerKeys.includes("Permissions-Policy"), "Missing Permissions-Policy");
});

// --- WOFF2 fonts ---
const fontDir = path.join(root, "public/fonts");
const woff2Files = [
  "Inter-Bold.woff2",
  "Inter-Medium.woff2",
  "Inter-Regular.woff2",
  "Inter-SemiBold.woff2",
  "PlusJakartaSans-Bold.woff2",
  "PlusJakartaSans-ExtraBold.woff2",
];

for (const f of woff2Files) {
  test(`WOFF2 font exists: ${f}`, () => {
    assert(fs.existsSync(path.join(fontDir, f)), `${f} not found in public/fonts/`);
  });
}

test("WOFF2 fonts are smaller than TTF originals", () => {
  let ttfTotal = 0;
  let woff2Total = 0;
  for (const f of woff2Files) {
    const ttfName = f.replace(".woff2", ".ttf");
    ttfTotal += fs.statSync(path.join(fontDir, ttfName)).size;
    woff2Total += fs.statSync(path.join(fontDir, f)).size;
  }
  assert(
    woff2Total < ttfTotal * 0.5,
    `WOFF2 total (${woff2Total}) should be <50% of TTF total (${ttfTotal})`,
  );
});

// --- Font-face declarations use WOFF2 ---
const baseLayout = readFile("src/layouts/BaseLayout.astro");

test("BaseLayout preloads WOFF2 fonts (not TTF)", () => {
  assert(
    baseLayout.includes('href="/fonts/Inter-Regular.woff2"'),
    "Preload links should reference .woff2 files",
  );
  assert(
    baseLayout.includes('type="font/woff2"'),
    "Preload type should be font/woff2",
  );
  assert(
    !baseLayout.includes('rel="preload" href="/fonts/Inter-Regular.ttf"'),
    "Should not preload TTF files",
  );
});

test("@font-face declarations list WOFF2 first with TTF fallback", () => {
  assert(
    baseLayout.includes('format("woff2")'),
    '@font-face missing format("woff2")',
  );
  assert(
    baseLayout.includes('format("truetype")'),
    "@font-face missing TTF fallback",
  );
  // WOFF2 should appear before truetype in the src
  const woff2Pos = baseLayout.indexOf('format("woff2")');
  const ttfPos = baseLayout.indexOf('format("truetype")');
  assert(woff2Pos < ttfPos, "WOFF2 should be listed before TTF in @font-face src");
});

// --- OG image optimization ---
test("og-default.png is optimized (under 20KB)", () => {
  const size = fs.statSync(path.join(root, "public/images/og-default.png")).size;
  assert(size < 20480, `og-default.png is ${size} bytes, expected < 20KB`);
});

// =========================================================================
// Summary
// =========================================================================
console.log(`\n${"─".repeat(50)}`);
if (failed === 0) {
  console.log(`\x1b[32m\x1b[1m  All ${passed} tests passed!\x1b[0m\n`);
} else {
  console.log(`\x1b[31m\x1b[1m  ${failed} failed\x1b[0m, \x1b[32m${passed} passed\x1b[0m\n`);
}
process.exit(failed > 0 ? 1 : 0);
