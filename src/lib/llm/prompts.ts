/**
 * Prompt templates for Claude-powered packet generation.
 *
 * These templates are combined with office-specific context at generation time
 * to produce tailored BLM engagement materials. The system prompt establishes
 * Claude's role and the EXPLORE Act framework; section definitions control
 * the structure of the generated output.
 */

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

/**
 * System prompt for the packet generation conversation.
 *
 * This prompt establishes Claude's role as an advocacy packet generator for a
 * disc golf nonprofit (ElevateUT) and provides the legal/policy framework
 * from the EXPLORE Act (P.L. 118-234, signed into law March 2025).
 */
export const SYSTEM_PROMPT = `You are an expert advocacy packet generator for ElevateUT, a 501(c)(3) nonprofit that promotes disc golf development on Bureau of Land Management (BLM) public lands.

Your task is to generate tailored engagement materials for a specific BLM field office. Each packet must be professional, data-driven, and grounded in federal law — specifically the Expanding Public Lands Outdoor Recreation Experiences (EXPLORE) Act (P.L. 118-234).

## Legal Framework — EXPLORE Act (P.L. 118-234)

Reference specific sections that are relevant to this office's situation:

- **Title I (Sec. 101–104):** Modernizes the Federal Lands Recreation Enhancement Act. Emphasizes affordable access and fee reform. Disc golf courses require minimal infrastructure and can operate at zero or nominal fee, aligning with the Act's goal of reducing barriers to outdoor recreation.

- **Title II — Accessibility (Sec. 214–215):** Directs federal land managers to improve accessibility for people with disabilities and underserved populations. Disc golf is one of the most accessible outdoor sports — courses can be designed to ADA standards with paved tee pads, and the sport welcomes all ages and abilities.

- **Sec. 221 — Outdoor Recreation Roundtables:** Directs BLM to convene stakeholder roundtables. ElevateUT should be included as a recreation advocacy partner.

- **Title III — Volunteer Stewardship (Sec. 341):** Authorizes and encourages volunteer partnerships for trail maintenance and recreation site stewardship. Disc golf communities have a proven track record of volunteer course building and maintenance — this section provides direct statutory authority for BLM–nonprofit partnerships.

- **Sec. 331 — Gateway Communities:** Recognizes the economic value of recreation to nearby towns. Disc golf courses drive measurable visitor spending with minimal environmental impact.

- **Sec. 351 — Recreation Resource Advisory Committees:** Provides a formal channel for recreation groups to advise BLM on fee and recreation management decisions.

## Output Requirements

Generate structured output with clearly labeled sections. Each section should be tailored to the specific BLM office using the provided context data (contacts, recreation sites, nearby courses, engagement history, population data).

Be specific: reference actual site names, staff names when available, nearby towns, and relevant state-level context. Avoid generic language — every packet should feel custom-written for this office.

Use a professional but approachable tone. We are partners in public land stewardship, not adversaries.`;

// ---------------------------------------------------------------------------
// Section Definitions
// ---------------------------------------------------------------------------

/**
 * Defines the sections that make up a complete engagement packet.
 * Each section has an id (used as a key in GeneratedPacket), a display title,
 * and a prompt fragment that instructs Claude on what to generate.
 */
export interface PacketSection {
  /** Machine-readable section identifier. */
  id: string;
  /** Human-readable section title for display and PDF headers. */
  title: string;
  /** Instruction appended to the user message telling Claude what to produce. */
  promptFragment: string;
}

export const PACKET_SECTIONS: PacketSection[] = [
  {
    id: "one-pager",
    title: "Office One-Pager",
    promptFragment: `Generate a one-page executive summary tailored to this BLM field office. Include:
- A brief introduction to ElevateUT and our mission
- Why this specific office is a strong candidate for disc golf development (reference their existing recreation sites, nearby population centers, and any existing disc golf infrastructure)
- 2-3 specific site suggestions within this office's jurisdiction that could support a disc golf course, with brief rationale for each
- Key EXPLORE Act sections that support this proposal (cite specific sections)
- A clear, specific ask (meeting request, site visit, inclusion in recreation planning)
Keep it concise — this should fit on a single printed page.`,
  },
  {
    id: "explore-act-alignment",
    title: "EXPLORE Act Alignment Memo",
    promptFragment: `Generate a detailed memo showing how disc golf development aligns with the EXPLORE Act (P.L. 118-234). For this specific office, address:
- Which EXPLORE Act provisions are most relevant to their situation and current recreation portfolio
- How disc golf meets the Act's accessibility mandates (Sec. 214-215) — concrete design features that enable ADA compliance
- How volunteer stewardship (Sec. 341) applies — disc golf communities' track record of building and maintaining courses at minimal cost to the agency
- Economic impact projections for gateway communities (Sec. 331) — reference nearby towns and existing tourism patterns
- How this proposal fits into the broader recreation planning framework the Act establishes
- Any state-specific EXPLORE Act implementation context
Format as a professional policy memo with clear headings.`,
  },
  {
    id: "cover-letter",
    title: "Cover Letter",
    promptFragment: `Generate a professional cover letter addressed to this office's leadership. Include:
- Proper salutation using the office manager or recreation planner's name if available (fall back to title-based greeting)
- Brief introduction of ElevateUT and our 501(c)(3) status
- Reference to the EXPLORE Act as the policy framework for this proposal
- A specific, actionable ask: request a 30-minute introductory meeting (virtual or in-person) to discuss disc golf development opportunities
- Mention of the enclosed one-pager and alignment memo
- Our contact information and availability
- Professional closing
Tone should be warm, professional, and partnership-oriented. We are proposing to help them fulfill their recreation mandate, not demanding anything.`,
  },
  {
    id: "suggested-contacts",
    title: "Suggested Contacts",
    promptFragment: `Based on the office data provided, generate a prioritized list of contacts to reach out to. For each contact, provide:
- Name and title (if available from the data)
- Role relevance: why this person is a good contact for disc golf proposals
- Suggested approach: email, phone, or in-person, with a brief note on what to emphasize
- Priority level: primary, secondary, or informational
If specific staff names are not available, suggest title-based contacts (e.g., "Recreation Planner," "Field Manager") with notes on how to find the specific person.
Also suggest any external stakeholders: local disc golf clubs, county recreation departments, gateway community chambers of commerce.`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the full user message by combining office context with section
 * generation instructions.
 *
 * TODO: Implement context serialization — convert OfficeContext into a
 * structured text block that Claude can reference during generation.
 */
export function buildUserPrompt(
  officeContext: Record<string, unknown>,
): string {
  // TODO: Serialize office context (contacts, recreation sites, disc golf
  // courses, engagement history, population data) into a structured format.
  // TODO: Append PACKET_SECTIONS promptFragments with clear delimiters.
  return `[stub] Office context and section instructions would go here.`;
}
