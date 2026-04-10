/**
 * LLM-Powered Engagement Packet Generator — explore_discgolf
 *
 * Generates tailored BLM engagement packets for a specific field office using
 * the Claude API with tool_use for real-time data gathering.
 *
 * ## Generation Flow
 *
 * 1. **Gather context:** Pull office contact data from Supabase, recreation
 *    sites from the BLM ArcGIS REST services, nearby disc golf courses
 *    (UDisc), and our engagement history with this office.
 *
 * 2. **Build system prompt:** Combine the universal packet templates (one-pager,
 *    EXPLORE Act alignment memo, cover letter) from the content collections
 *    with the SYSTEM_PROMPT that establishes Claude's role and the legal
 *    framework from the EXPLORE Act (P.L. 118-234).
 *
 * 3. **Build user context:** Serialize all gathered office-specific data —
 *    contacts, recreation sites, existing disc golf courses, engagement
 *    history, population data — into a structured user message.
 *
 * 4. **Call Claude API:** Send the conversation to Claude with tool_use enabled.
 *    Claude may call tools (query_blm_recreation_sites, query_blm_office_page,
 *    query_udisc_courses, get_engagement_history) to gather additional
 *    real-time data during generation. We run an agentic loop, executing tool
 *    calls and feeding results back until Claude produces final output.
 *
 * 5. **Parse structured output:** Extract the generated sections from Claude's
 *    response: tailored one-pager, EXPLORE Act alignment memo, cover letter,
 *    and suggested contacts with rationale.
 *
 * 6. **Cache result:** Store the generated packet in Supabase (generated_packets
 *    table) keyed by office_id and generation timestamp. This controls costs
 *    (~$0.03–0.15 per generation) and allows reuse without re-generation.
 */

import { anthropic, DEFAULT_MODEL, MAX_TOKENS } from "./client";
import { SYSTEM_PROMPT, PACKET_SECTIONS, buildUserPrompt } from "./prompts";
import { PACKET_GENERATION_TOOLS, handleToolCall } from "./tools";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Contact information for a BLM office staff member. */
export interface OfficeContact {
  name: string;
  title: string;
  email?: string;
  phone?: string;
}

/** Input context for generating a packet for a specific BLM field office. */
export interface OfficeContext {
  /** BLM administrative unit code (e.g., "LLAZP"). */
  officeId: string;
  /** Full office name (e.g., "Moab Field Office"). */
  officeName: string;
  /** Two-letter state code (e.g., "UT"). */
  state: string;
  /** Known contacts at this office (from Supabase or BLM.gov). */
  contacts: OfficeContact[];
  /** BLM recreation sites within this office's jurisdiction. */
  recreationSites: Array<{
    name: string;
    lat: number;
    lng: number;
    activities: string[];
  }>;
  /** Existing disc golf courses near this office (from UDisc data). */
  existingDiscGolf: Array<{
    name: string;
    lat: number;
    lng: number;
    holes: number;
    rating: number;
    distanceMiles: number;
  }>;
  /** Our engagement history with this office (from Supabase). */
  engagementHistory: Array<{
    date: string;
    status: string;
    notes?: string;
  }>;
  /** Estimated population within a reasonable driving distance. */
  nearbyPopulation: {
    within25Miles: number;
    within50Miles: number;
    majorCities: Array<{ name: string; population: number; distanceMiles: number }>;
  };
}

/** A suggested contact with rationale for why they should be contacted. */
export interface ContactSuggestion {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  /** Why this contact is relevant to the disc golf proposal. */
  rationale: string;
  /** Suggested outreach method. */
  approach: "email" | "phone" | "in-person" | "meeting-request";
  /** Contact priority. */
  priority: "primary" | "secondary" | "informational";
}

/** The complete generated engagement packet for a BLM field office. */
export interface GeneratedPacket {
  /** BLM administrative unit code this packet was generated for. */
  officeId: string;
  /** Tailored one-page executive summary. */
  onePager: string;
  /** EXPLORE Act alignment memo showing how disc golf fits the law. */
  alignmentMemo: string;
  /** Professional cover letter with specific ask. */
  coverLetter: string;
  /** Prioritized list of contacts with rationale and approach. */
  suggestedContacts: ContactSuggestion[];
  /** Timestamp when this packet was generated. */
  generatedAt: Date;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate a tailored BLM engagement packet for a specific field office.
 *
 * This is the main entry point for the LLM packet generation pipeline.
 * It orchestrates context gathering, Claude API calls (with tool_use),
 * output parsing, and caching.
 *
 * @param officeContext - Pre-gathered context about the target BLM office.
 * @returns A complete GeneratedPacket with all sections.
 *
 * @throws Error if the Claude API call fails or output cannot be parsed.
 */
export async function generatePacket(
  officeContext: OfficeContext,
): Promise<GeneratedPacket> {
  // -------------------------------------------------------------------------
  // Step 1: Gather additional context
  // -------------------------------------------------------------------------
  // TODO: Fetch any missing data that wasn't provided in officeContext.
  // - Query Supabase for the latest contact data if officeContext.contacts is empty
  // - Query BLM ArcGIS for recreation sites if officeContext.recreationSites is empty
  // - Query UDisc for nearby courses if officeContext.existingDiscGolf is empty
  // - Query Supabase for engagement history if officeContext.engagementHistory is empty

  // -------------------------------------------------------------------------
  // Step 2: Build the system prompt
  // -------------------------------------------------------------------------
  // TODO: Combine SYSTEM_PROMPT with any content collection templates.
  // The system prompt is already defined in prompts.ts; here we would
  // append any office-type-specific instructions (state office vs. field
  // office, etc.).
  const systemPrompt = SYSTEM_PROMPT;

  // -------------------------------------------------------------------------
  // Step 3: Build the user message with office-specific context
  // -------------------------------------------------------------------------
  // TODO: Serialize officeContext into a structured user message using
  // buildUserPrompt(). This should include all gathered data in a format
  // Claude can reference, plus the PACKET_SECTIONS generation instructions.
  const userMessage = buildUserPrompt(officeContext as unknown as Record<string, unknown>);

  // -------------------------------------------------------------------------
  // Step 4: Call Claude API with tool_use (agentic loop)
  // -------------------------------------------------------------------------
  // TODO: Implement the agentic loop:
  //   1. Send initial message with system prompt, user message, and tools
  //   2. If Claude responds with tool_use blocks, execute each tool via
  //      handleToolCall() and send results back as tool_result messages
  //   3. Repeat until Claude produces a final text response (stop_reason: "end_turn")
  //   4. Collect the full conversation for logging/debugging

  // Stub: single API call without tool loop
  // const response = await anthropic.messages.create({
  //   model: DEFAULT_MODEL,
  //   max_tokens: MAX_TOKENS,
  //   system: systemPrompt,
  //   tools: PACKET_GENERATION_TOOLS,
  //   messages: [{ role: "user", content: userMessage }],
  // });

  // TODO: Implement agentic tool_use loop here
  // let messages = [{ role: "user" as const, content: userMessage }];
  // let response = await anthropic.messages.create({ ... });
  // while (response.stop_reason === "tool_use") {
  //   // Execute tool calls, append tool_result messages, call again
  // }

  // -------------------------------------------------------------------------
  // Step 5: Parse structured output into packet sections
  // -------------------------------------------------------------------------
  // TODO: Parse Claude's final text response to extract each section.
  // The response should contain clearly delimited sections matching
  // PACKET_SECTIONS ids. Parse them into the GeneratedPacket fields.
  // Also parse the suggested-contacts section into ContactSuggestion[].

  // -------------------------------------------------------------------------
  // Step 6: Cache the result in Supabase
  // -------------------------------------------------------------------------
  // TODO: Insert the generated packet into the generated_packets table
  // in Supabase, keyed by officeId. Include the full generated text,
  // the model used, token counts, and a TTL for cache expiration.
  // Example:
  //   const supabase = getSupabaseClient();
  //   await supabase.from("generated_packets").upsert({
  //     office_id: officeContext.officeId,
  //     one_pager: packet.onePager,
  //     alignment_memo: packet.alignmentMemo,
  //     cover_letter: packet.coverLetter,
  //     suggested_contacts: packet.suggestedContacts,
  //     model: DEFAULT_MODEL,
  //     generated_at: new Date().toISOString(),
  //   });

  // -------------------------------------------------------------------------
  // Stub return
  // -------------------------------------------------------------------------
  const packet: GeneratedPacket = {
    officeId: officeContext.officeId,
    onePager: "TODO: Generated one-pager content",
    alignmentMemo: "TODO: Generated EXPLORE Act alignment memo",
    coverLetter: "TODO: Generated cover letter",
    suggestedContacts: [],
    generatedAt: new Date(),
  };

  return packet;
}
