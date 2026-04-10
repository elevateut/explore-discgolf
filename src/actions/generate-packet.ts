/**
 * Astro Action: Generate Engagement Packet
 *
 * Server-side action that generates (or retrieves a cached) BLM engagement
 * packet for a specific field office. This runs ONLY on the server — the
 * Anthropic API key and Supabase service credentials never reach the browser.
 *
 * Astro Actions are the recommended way to handle form submissions and
 * server-side mutations in Astro 5. They are automatically exposed as
 * type-safe callable functions on the client via `actions.generatePacket()`.
 *
 * Flow:
 *   1. Accept officeId from the client
 *   2. Check Supabase for a cached packet (avoid redundant API calls)
 *   3. If cache miss or stale, call generatePacket() from the LLM layer
 *   4. Return the generated packet to the client
 *
 * Cost control: Each Claude API call costs ~$0.03–0.15 depending on tool_use
 * rounds and output length. Caching in Supabase ensures we only regenerate
 * when the underlying data has changed or the cache TTL expires.
 */

import { defineAction } from "astro:actions";
import { z } from "astro:schema";

// TODO: Uncomment these imports once the LLM layer and Supabase client are
// fully implemented:
// import { generatePacket } from "@lib/llm/packet-generator";
// import type { OfficeContext, GeneratedPacket } from "@lib/llm/packet-generator";
// import { getSupabaseClient } from "@lib/supabase/client";

/** Cache TTL in milliseconds — 7 days. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const generatePacketAction = defineAction({
  /**
   * Accept: only needs the BLM office identifier.
   * Additional context is gathered server-side from Supabase and BLM GIS.
   */
  accept: "json",
  input: z.object({
    officeId: z.string().min(1, "officeId is required"),
    /** Force regeneration even if a cached packet exists. */
    forceRegenerate: z.boolean().optional().default(false),
  }),

  handler: async (input) => {
    const { officeId, forceRegenerate } = input;

    // -----------------------------------------------------------------------
    // Step 1: Check for cached packet in Supabase
    // -----------------------------------------------------------------------
    // TODO: Query the generated_packets table for this officeId.
    // If a non-stale result exists and forceRegenerate is false, return it.
    //
    // const supabase = getSupabaseClient();
    // const { data: cached } = await supabase
    //   .from("generated_packets")
    //   .select("*")
    //   .eq("office_id", officeId)
    //   .order("generated_at", { ascending: false })
    //   .limit(1)
    //   .single();
    //
    // if (cached && !forceRegenerate) {
    //   const age = Date.now() - new Date(cached.generated_at).getTime();
    //   if (age < CACHE_TTL_MS) {
    //     return {
    //       source: "cache" as const,
    //       packet: {
    //         officeId: cached.office_id,
    //         onePager: cached.one_pager,
    //         alignmentMemo: cached.alignment_memo,
    //         coverLetter: cached.cover_letter,
    //         suggestedContacts: cached.suggested_contacts,
    //         generatedAt: new Date(cached.generated_at),
    //       },
    //     };
    //   }
    // }

    // -----------------------------------------------------------------------
    // Step 2: Gather office context from Supabase and external sources
    // -----------------------------------------------------------------------
    // TODO: Build the OfficeContext object by querying:
    //   - blm_offices table for office metadata and contacts
    //   - BLM ArcGIS for recreation sites in the office's jurisdiction
    //   - UDisc data for nearby disc golf courses
    //   - engagement_status table for our outreach history
    //   - Census/population data for nearby population estimates
    //
    // const officeContext: OfficeContext = {
    //   officeId,
    //   officeName: "TODO",
    //   state: "TODO",
    //   contacts: [],
    //   recreationSites: [],
    //   existingDiscGolf: [],
    //   engagementHistory: [],
    //   nearbyPopulation: {
    //     within25Miles: 0,
    //     within50Miles: 0,
    //     majorCities: [],
    //   },
    // };

    // -----------------------------------------------------------------------
    // Step 3: Generate the packet via Claude API
    // -----------------------------------------------------------------------
    // TODO: Call the LLM packet generator.
    // const packet = await generatePacket(officeContext);

    // -----------------------------------------------------------------------
    // Step 4: Return the generated packet
    // -----------------------------------------------------------------------
    // TODO: Replace this stub with the actual generated packet.
    return {
      source: "generated" as const,
      packet: {
        officeId,
        onePager: "TODO: stub — packet generation not yet implemented",
        alignmentMemo: "TODO: stub — packet generation not yet implemented",
        coverLetter: "TODO: stub — packet generation not yet implemented",
        suggestedContacts: [],
        generatedAt: new Date(),
      },
    };
  },
});
