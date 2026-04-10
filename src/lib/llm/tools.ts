/**
 * Claude tool_use definitions and handlers for packet generation.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { getRecreationSites } from "@lib/blm/client";
import { getOfficeEngagementStatus } from "@lib/supabase/queries";
import { getSupabaseClient } from "@lib/supabase/client";
import type { BBox } from "@lib/blm/types";

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
  {
    name: "query_nearby_courses",
    description:
      "Search for existing disc golf courses near coordinates. Powered by FLiPT. " +
      "Returns course names, hole counts, and distances.",
    input_schema: {
      type: "object" as const,
      properties: {
        latitude: {
          type: "number",
          description: "Latitude of the search center.",
        },
        longitude: {
          type: "number",
          description: "Longitude of the search center.",
        },
        radius_miles: {
          type: "number",
          description: "Search radius in miles (default 50).",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
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
      const lat = toolInput.latitude as number;
      const lng = toolInput.longitude as number;
      const radius = (toolInput.radius_degrees as number) ?? 0.5;

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

        // Page text content (trimmed for context)
        const textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 2000);

        return JSON.stringify({
          url,
          ...info,
          pageExcerpt: textContent,
        });
      } catch (err: any) {
        return JSON.stringify({
          error: "Failed to fetch office page: " + err.message,
        });
      }
    }

    case "query_nearby_courses": {
      // FLiPT integration coming — return placeholder
      return JSON.stringify({
        message:
          "Nearby disc golf course search is powered by FLiPT (coming soon). " +
          "For now, reference the BLM recreation sites data and known BLM disc " +
          "golf courses: Stewart Pond (OR), Three Peaks (UT), Ironside (UT), " +
          "Ward Mountain (NV), Barnes Grade (OR).",
        knownBLMCourses: [
          { name: "Stewart Pond DGC", state: "OR", holes: 18, office: "Northwest Oregon District" },
          { name: "Three Peaks DGC", state: "UT", holes: 18, office: "Cedar City Field Office" },
          { name: "Ironside DGC", state: "UT", holes: 18, office: "Cedar City Field Office" },
          { name: "Ward Mountain DGC", state: "NV", holes: 14, office: "Bristlecone Field Office" },
          { name: "Barnes Grade DGC", state: "OR", holes: 9, office: "Applegate Field Office" },
        ],
      });
    }

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
