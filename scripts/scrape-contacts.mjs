/**
 * Scrape contact information from BLM office pages.
 *
 * Fetches each office's BLM.gov page (from ADMU_ST_URL in ArcGIS layer 3/4),
 * extracts phone, email (decoded from Cloudflare obfuscation), address, and hours.
 * Updates blm-offices.json and optionally upserts to Supabase.
 *
 * Usage: node scripts/scrape-contacts.mjs [--update-supabase]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ADMIN_UNIT_BASE =
  "https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer";

// Rate limit: be polite to BLM servers
const DELAY_MS = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Decode Cloudflare email obfuscation (XOR cipher).
 */
function decodeCFEmail(hex) {
  const key = parseInt(hex.substr(0, 2), 16);
  let email = "";
  for (let i = 2; i < hex.length; i += 2) {
    email += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ key);
  }
  return email;
}

/**
 * Scrape a BLM office page for contact info.
 */
async function scrapeOfficePage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EXPLOREDiscGolf/1.0 (explorediscgolf.org)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const result = {};

    // Phone
    const phoneMatch = html.match(
      /Phone:<\/strong>\s*<\/div>\s*<div>([^<]+)/i
    );
    if (phoneMatch) {
      result.phone = phoneMatch[1].trim();
    } else {
      // Fallback: find phone near the contact section
      const phones = html.match(/(\d{3}[-.)]\s*\d{3}[-.)]\s*\d{4})/);
      if (phones) result.phone = phones[1];
    }

    // Email (Cloudflare obfuscated)
    const emailIdx = html.indexOf("Email:");
    if (emailIdx > -1) {
      const chunk = html.slice(emailIdx, emailIdx + 500);
      const cfMatch = chunk.match(/data-cfemail="([a-f0-9]+)"/);
      if (cfMatch) {
        result.email = decodeCFEmail(cfMatch[1]);
      }
    }

    // Address
    const addrMatch = html.match(
      /Address:<\/strong>\s*<\/div>\s*<div>([\s\S]*?)<\/div>/i
    );
    if (addrMatch) {
      result.address = addrMatch[1]
        .replace(/<br\s*\/?>/gi, ", ")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .replace(/,\s*,/g, ",")
        .trim();
    }

    // Hours
    const hoursMatch = html.match(
      /Hours:<\/strong>\s*<\/div>\s*<div>([\s\S]*?)<\/div>/i
    );
    if (hoursMatch) {
      result.hours = hoursMatch[1].replace(/<[^>]+>/g, "").trim();
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Crawl BLM state/district pages to find all /office/ page URLs,
 * then fuzzy-match them to our office dataset by name.
 */
async function getOfficeURLs(offices) {
  const statePages = [
    "alaska-state-office", "arizona-state-office", "california-state-office",
    "colorado-state-office", "eastern-states-state-office", "idaho-state-office",
    "montanadakotas-state-office", "nevada-state-office", "new-mexico-state-office",
    "oregonwashington-state-office", "utah-state-office", "wyoming-state-office",
  ];

  async function getChildLinks(slug) {
    try {
      const r = await fetch("https://www.blm.gov/office/" + slug, {
        headers: { "User-Agent": "EXPLOREDiscGolf/1.0 (explorediscgolf.org)" },
        signal: AbortSignal.timeout(10000),
      });
      const html = await r.text();
      const links = html.match(/href="\/office\/([^"]+)/g) || [];
      return [...new Set(links)]
        .map((l) => l.replace('href="/office/', ""))
        .filter((l) => !l.includes("national") && !l.includes("law-enforcement") && !l.includes("training") && !l.includes("operations") && !l.includes("/"));
    } catch { return []; }
  }

  console.log("Crawling BLM office directory...");
  const allSlugs = new Set();
  for (const state of statePages) {
    const links = await getChildLinks(state);
    links.forEach((l) => allSlugs.add(l));
    for (const child of links) {
      const subLinks = await getChildLinks(child);
      subLinks.forEach((l) => allSlugs.add(l));
    }
  }
  console.log(`Found ${allSlugs.size} office page slugs.`);

  // Match slugs to our offices by name fuzzy match
  const urls = new Map();
  for (const slug of allSlugs) {
    const slugNorm = slug.replace(/-/g, " ").toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    for (const office of offices) {
      const nameNorm = office.name.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      // Check if slug words appear in office name
      const slugWords = slugNorm.split(" ");
      const matches = slugWords.filter((w) => nameNorm.includes(w)).length;
      const score = matches / slugWords.length;
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = office.id;
      }
    }
    if (bestMatch) {
      urls.set(bestMatch, "https://www.blm.gov/office/" + slug);
    }
  }
  console.log(`Matched ${urls.size} slugs to offices.`);
  return urls;
}

async function main() {
  const updateSupabase = process.argv.includes("--update-supabase");

  // Load current data
  const officesPath = path.join(ROOT, "src/data/blm-offices.json");
  const offices = JSON.parse(fs.readFileSync(officesPath, "utf8"));

  const officeURLs = await getOfficeURLs(offices);
  console.log(`Will scrape ${officeURLs.size} office pages.\n`);

  let scraped = 0;
  let found = 0;

  for (const office of offices) {
    const pageUrl = officeURLs.get(office.id);
    if (!pageUrl) continue;

    scraped++;
    process.stdout.write(
      `\r[${scraped}/${officeURLs.size}] Scraping ${office.name}...`.padEnd(80)
    );

    const contact = await scrapeOfficePage(pageUrl);
    if (contact) {
      found++;
      if (contact.phone) office.phone = contact.phone;
      if (contact.email) office.email = contact.email;
      if (contact.address) office.address = contact.address;
      office.websiteUrl = pageUrl;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n\nScraped ${scraped} offices, found contact info for ${found}.`);

  // Stats
  const withPhone = offices.filter((o) => o.phone).length;
  const withEmail = offices.filter((o) => o.email).length;
  const withAddress = offices.filter((o) => o.address).length;
  console.log(`Phone: ${withPhone} | Email: ${withEmail} | Address: ${withAddress}`);

  // Write updated JSON
  fs.writeFileSync(officesPath, JSON.stringify(offices, null, 2) + "\n");
  console.log(`Updated ${officesPath}`);

  // Optionally update Supabase
  if (updateSupabase) {
    console.log("\nUpdating Supabase...");
    const { createClient } = await import("@supabase/supabase-js");
    const envFile = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const env = (k) => envFile.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    for (const office of offices) {
      if (!office.phone && !office.email && !office.address) continue;
      const { error } = await supabase
        .from("blm_offices")
        .update({
          phone: office.phone || null,
          email: office.email || null,
          address: office.address || null,
          website_url: office.websiteUrl || null,
        })
        .eq("blm_unit_code", office.id);
      if (error) console.warn(`  Failed ${office.id}:`, error.message);
    }
    console.log("Supabase updated.");
  }
}

main().catch((e) => {
  console.error("\nFailed:", e.message);
  process.exit(1);
});
