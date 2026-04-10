/**
 * Claude tool_use tool definitions for packet generation.
 *
 * These tools allow Claude to gather live data during packet generation by
 * calling back into our server-side functions. The Anthropic SDK sends these
 * definitions in the `tools` parameter of messages.create(), and when Claude
 * invokes a tool we execute the corresponding handler and return the result.
 *
 * See: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */

import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

/**
 * Tool definitions array passed to the Claude API via `tools` parameter.
 * Each tool has a name, description, and JSON Schema input definition.
 */
export const PACKET_GENERATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_blm_recreation_sites",
    description:
      "Search BLM ArcGIS REST services for recreation sites managed by or near a " +
      "specific BLM field office. Returns site names, locations, activities, and " +
      "fee information. Use this to understand the office's current recreation " +
      "portfolio and identify potential disc golf locations.",
    input_schema: {
      type: "object" as const,
      properties: {
        office_id: {
          type: "string",
          description:
            "BLM administrative unit code for the field office (e.g., 'LLAZP' for " +
            "Arizona Phoenix District).",
        },
        bbox: {
          type: "object",
          description:
            "Optional bounding box to limit the spatial search. If omitted, searches " +
            "the office's full administrative boundary.",
          properties: {
            west: { type: "number", description: "Western longitude" },
            south: { type: "number", description: "Southern latitude" },
            east: { type: "number", description: "Eastern longitude" },
            north: { type: "number", description: "Northern latitude" },
          },
          required: ["west", "south", "east", "north"],
        },
        activity_filter: {
          type: "string",
          description:
            "Optional activity name to filter by (e.g., 'Disc Golf', 'Hiking'). " +
            "Leave empty to return all recreation sites.",
        },
      },
      required: ["office_id"],
    },
  },
  {
    name: "query_blm_office_page",
    description:
      "Fetch and parse the BLM.gov web page for a specific field office to extract " +
      "contact information, staff names, mailing address, phone numbers, and current " +
      "projects or announcements. Returns structured contact data.",
    input_schema: {
      type: "object" as const,
      properties: {
        office_name: {
          type: "string",
          description:
            "Full name of the BLM office as it appears on BLM.gov (e.g., " +
            "'Moab Field Office', 'Royal Gorge Field Office').",
        },
        state: {
          type: "string",
          description:
            "Two-letter state code where the office is located (e.g., 'UT', 'CO').",
        },
      },
      required: ["office_name", "state"],
    },
  },
  {
    name: "query_udisc_courses",
    description:
      "Search for existing disc golf courses near a set of coordinates. Returns " +
      "course names, ratings, hole counts, and distances from the search point. " +
      "Use this to understand the existing disc golf infrastructure near a BLM " +
      "office and identify gaps in coverage.",
    input_schema: {
      type: "object" as const,
      properties: {
        latitude: {
          type: "number",
          description: "Latitude of the search center point (WGS84 / EPSG:4326).",
        },
        longitude: {
          type: "number",
          description: "Longitude of the search center point (WGS84 / EPSG:4326).",
        },
        radius_miles: {
          type: "number",
          description:
            "Search radius in miles from the center point. Defaults to 50 if not specified.",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  {
    name: "get_engagement_history",
    description:
      "Retrieve ElevateUT's engagement history and outreach status records for a " +
      "specific BLM office from our Supabase database. Returns the current " +
      "engagement status (no-contact, initial-outreach, meeting-scheduled, etc.), " +
      "timeline of interactions, and any notes from previous outreach attempts.",
    input_schema: {
      type: "object" as const,
      properties: {
        office_id: {
          type: "string",
          description: "BLM administrative unit code for the field office.",
        },
      },
      required: ["office_id"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

/**
 * Dispatch a tool call from Claude to the appropriate handler.
 *
 * Called during the agentic loop when Claude responds with a tool_use block.
 * The result is sent back as a tool_result message so Claude can continue
 * generating the packet with real data.
 *
 * TODO: Implement each handler:
 *   - query_blm_recreation_sites → call BLM ArcGIS client (src/lib/blm/client.ts)
 *   - query_blm_office_page → fetch + parse BLM.gov office page (cheerio or similar)
 *   - query_udisc_courses → call UDisc API or scrape UDisc course directory
 *   - get_engagement_history → query Supabase engagement_status table
 */
export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  switch (toolName) {
    case "query_blm_recreation_sites": {
      // TODO: Call getRecreationSites() from @lib/blm/client with the
      // office boundary or bbox. Transform ArcGIS response into a concise
      // text summary for Claude.
      return JSON.stringify({
        stub: true,
        message: "TODO: query BLM ArcGIS recreation sites",
        input: toolInput,
      });
    }

    case "query_blm_office_page": {
      // TODO: Fetch the BLM.gov office page (construct URL from office_name
      // and state), parse HTML with cheerio, extract contact info, staff
      // names, mailing address, and current projects.
      return JSON.stringify({
        stub: true,
        message: "TODO: fetch and parse BLM.gov office page",
        input: toolInput,
      });
    }

    case "query_udisc_courses": {
      // TODO: Query UDisc course data near the given coordinates. This may
      // use the UDisc API (if available) or a cached dataset. Return course
      // names, ratings, hole counts, and distances.
      return JSON.stringify({
        stub: true,
        message: "TODO: search UDisc for nearby disc golf courses",
        input: toolInput,
      });
    }

    case "get_engagement_history": {
      // TODO: Query the engagement_status table in Supabase for this
      // office_id. Return the current status, last contact date, and notes.
      return JSON.stringify({
        stub: true,
        message: "TODO: query Supabase engagement history",
        input: toolInput,
      });
    }

    default:
      return JSON.stringify({
        error: `Unknown tool: ${toolName}`,
      });
  }
}
