/**
 * Claude tool_use definitions and handlers for packet generation.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { getRecreationSites } from "@lib/blm/client";
import { getOfficeEngagementStatus } from "@lib/supabase/queries";
import { getSupabaseClient } from "@lib/supabase/client";
import type { BBox } from "@lib/blm/types";

// ---------------------------------------------------------------------------
// Input Validation Helpers
// ---------------------------------------------------------------------------

/** Whitelist of allowed domains for SSRF-safe URL fetching. */
const ALLOWED_URL_DOMAINS = [
  "www.blm.gov",
  "blm.gov",
  "doi.gov",
  "www.doi.gov",
];

function isAllowedUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_URL_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

/**
 * Parse and clamp a numeric tool_use input to a finite range.
 * Returns the default if the value is missing, NaN, or Infinity.
 */
function toFiniteNumber(
  value: unknown,
  defaultVal: number,
  min: number,
  max: number,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultVal;
  return Math.max(min, Math.min(max, n));
}

/** Human-readable display names for tool execution in the chat UI. */
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  query_blm_recreation_sites: "Researching BLM recreation sites...",
  query_blm_office_page: "Looking up office contacts and details...",
  get_engagement_history: "Checking engagement history...",
};

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

export const PACKET_GENERATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_blm_recreation_sites",
    description:
      "Search BLM ArcGIS for recreation sites near a BLM field office. " +
      "Returns site names, locations, and activities. Use this to understand " +
      "the office's recreation portfolio and identify disc golf locations.",
    input_schema: {
      type: "object" as const,
      properties: {
        latitude: {
          type: "number",
          description: "Center latitude for the search.",
        },
        longitude: {
          type: "number",
          description: "Center longitude for the search.",
        },
        radius_degrees: {
          type: "number",
          description: "Search radius in degrees (default 0.5, roughly 35 miles).",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  {
    name: "query_blm_office_page",
    description:
      "Fetch the BLM.gov web page for a field office to extract contact info, " +
      "staff names, address, and current projects.",
    input_schema: {
      type: "object" as const,
      properties: {
        website_url: {
          type: "string",
          description: "Full URL of the BLM office page (e.g., https://www.blm.gov/office/cedar-city-field-office).",
        },
      },
      required: ["website_url"],
    },
  },
  // query_nearby_courses removed — FLiPT integration deferred
  {
    name: "get_engagement_history",
    description:
      "Retrieve EXPLORE Disc Golf's engagement history with a specific BLM office.",
    input_schema: {
      type: "object" as const,
      properties: {
        office_id: {
          type: "string",
          description: "BLM administrative unit code.",
        },
      },
      required: ["office_id"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  switch (toolName) {
    case "query_blm_recreation_sites": {
      const lat = toFiniteNumber(toolInput.latitude, 0, -90, 90);
      const lng = toFiniteNumber(toolInput.longitude, 0, -180, 180);
      const radius = toFiniteNumber(toolInput.radius_degrees, 0.5, 0.01, 5);

      try {
        const bbox: BBox = [
          lng - radius,
          lat - radius,
          lng + radius,
          lat + radius,
        ];
        const sites = await getRecreationSites(bbox);
        const summary = sites.slice(0, 30).map((s) => ({
          name: s.name,
          activities: s.activities,
          state: s.state,
        }));
        return JSON.stringify({
          total: sites.length,
          sites: summary,
        });
      } catch (err: any) {
        return JSON.stringify({
          error: "Failed to query BLM recreation sites: " + err.message,
        });
      }
    }

    case "query_blm_office_page": {
      const url = toolInput.website_url as string;
      if (!url) {
        return JSON.stringify({ error: "No website URL provided." });
      }
      if (!isAllowedUrl(url)) {
        return JSON.stringify({
          error: "URL not allowed. Only blm.gov and doi.gov domains are permitted.",
        });
      }

      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "EXPLOREDiscGolf/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          return JSON.stringify({ error: `HTTP ${res.status}` });
        }
        const html = await res.text();

        // Extract key info from the page
        const info: Record<string, string> = {};

        // Phone
        const phoneMatch = html.match(/(\d{3}[-.)]\s*\d{3}[-.)]\s*\d{4})/);
        if (phoneMatch) info.phone = phoneMatch[1];

        // Address
        const addrMatch = html.match(
          /Address:<\/strong>\s*<\/div>\s*<div>([\s\S]*?)<\/div>/i
        );
        if (addrMatch) {
          info.address = addrMatch[1]
            .replace(/<br\s*\/?>/gi, ", ")
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
        }

        // Email (decode Cloudflare obfuscation)
        const cfMatch = html.match(/data-cfemail="([a-f0-9]+)"/);
        if (cfMatch) {
          const hex = cfMatch[1];
          const key = parseInt(hex.substr(0, 2), 16);
          let email = "";
          for (let i = 2; i < hex.length; i += 2) {
            email += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ key);
          }
          info.email = email;
        }

        // Extract all emails (decode Cloudflare obfuscation for all matches)
        const allCfEmails = html.match(/data-cfemail="([a-f0-9]+)"/g) ?? [];
        const emails = allCfEmails.map((match) => {
          const hex = match.match(/"([a-f0-9]+)"/)?.[1] ?? "";
          const key = parseInt(hex.substr(0, 2), 16);
          let decoded = "";
          for (let i = 2; i < hex.length; i += 2) {
            decoded += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ key);
          }
          return decoded;
        }).filter((e, i, arr) => arr.indexOf(e) === i); // deduplicate

        if (emails.length > 0) info.emails = emails.join(", ");

        // Extract page text content — get a generous excerpt for Claude to find staff names
        const textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[\s\S]*?<\/nav>/gi, "")
          .replace(/<footer[\s\S]*?<\/footer>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000); // increased from 2000 for more context

        return JSON.stringify({
          url,
          ...info,
          staffAndContactInfo: textContent,
          note: "Look for staff names, titles, and roles in the page text above. BLM pages often list Field Manager, Recreation Planner, and other key staff.",
        });
      } catch (err: any) {
        return JSON.stringify({
          error: "Failed to fetch office page: " + err.message,
        });
      }
    }

    // query_nearby_courses handler removed — FLiPT integration deferred

    case "get_engagement_history": {
      const officeCode = toolInput.office_id as string;

      try {
        // Look up the office UUID from the unit code
        const supabase = getSupabaseClient();
        if (!supabase) {
          return JSON.stringify({
            status: "no-contact",
            history: [],
            note: "Supabase not configured — no engagement history available.",
          });
        }

        const { data: office } = await supabase
          .from("blm_offices")
          .select("id")
          .eq("blm_unit_code", officeCode)
          .maybeSingle();

        if (!office) {
          return JSON.stringify({
            status: "no-contact",
            history: [],
            note: "Office not found in database.",
          });
        }

        const engagement = await getOfficeEngagementStatus(office.id);
        return JSON.stringify({
          status: engagement?.status ?? "no-contact",
          lastUpdated: engagement?.updated_at ?? null,
          notes: engagement?.notes ?? null,
        });
      } catch (err: any) {
        return JSON.stringify({
          status: "no-contact",
          error: err.message,
        });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
