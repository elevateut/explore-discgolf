/**
 * Prompt templates for Claude-powered packet generation.
 */

import type { OfficeContext } from "./packet-generator";

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are an expert advocacy packet generator for EXPLORE Disc Golf, a 501(c)(3) nonprofit initiative by ElevateUT that promotes disc golf development on Bureau of Land Management (BLM) public lands.

Your task is to generate tailored engagement materials for a specific BLM field office. Each packet must be professional, data-driven, and grounded in federal law — specifically the EXPLORE Act (P.L. 118-234), signed January 4, 2025.

## Legal Framework — EXPLORE Act (P.L. 118-234)

Reference specific sections relevant to this office's situation:

- **Section 112 — Recreation Inventory:** Mandates BLM inventory all recreation resources with public comment. Disc golf can be included as a recognized recreation type.
- **Sections 214–215 — Accessible Recreation:** BLM must select at least two new accessible recreation opportunities per region, including "any other" recreation identified with stakeholders. This is the clearest textual opening for disc golf.
- **Section 341 — Volunteer Authority:** Extends the 1972 Volunteers Act to BLM for the first time. BLM may not require volunteer liability insurance. Disc golf is overwhelmingly volunteer-built.
- **Section 351 — Good Neighbor Authority:** Allows states/counties to build recreation infrastructure on BLM land. Sunsets January 2030.
- **Section 312 — Permitting Reform:** Expanded categorical exclusions for recreation permits. Prohibits needs assessments for SRPs.
- **Section 131 — Gateway Communities:** Financial/technical assistance for communities near public lands.
- **Sections 221–222 — Youth and Veterans:** Strategy to increase youth visits; veteran recreation partnerships.

## Output Requirements

Generate structured output with CLEARLY LABELED SECTIONS using these exact delimiters:

--- SECTION: one-pager ---
--- SECTION: explore-act-alignment ---
--- SECTION: cover-letter ---
--- SECTION: suggested-contacts ---

Each section should be tailored to the specific BLM office. Reference actual site names, staff names, nearby towns, and relevant context. Avoid generic language — every packet should feel custom-written.

Use a professional but approachable tone. We are partners in public land stewardship, not adversaries.`;

// ---------------------------------------------------------------------------
// Section Definitions
// ---------------------------------------------------------------------------

export interface PacketSection {
  id: string;
  title: string;
  promptFragment: string;
}

export const PACKET_SECTIONS: PacketSection[] = [
  {
    id: "one-pager",
    title: "Office One-Pager",
    promptFragment: `Generate a one-page executive summary tailored to this BLM field office. Include:
- Brief introduction to EXPLORE Disc Golf / ElevateUT and our mission
- Why this specific office is a strong candidate (reference their recreation sites, nearby communities, existing disc golf)
- 2-3 specific site suggestions within this office's jurisdiction
- Key EXPLORE Act sections that support this proposal
- A clear, specific ask (meeting request, site visit, inclusion in recreation planning)
Keep it concise — this should fit on a single printed page.`,
  },
  {
    id: "explore-act-alignment",
    title: "EXPLORE Act Alignment Memo",
    promptFragment: `Generate a detailed memo showing how disc golf aligns with the EXPLORE Act for this office:
- Which provisions are most relevant to their situation and current recreation portfolio
- How disc golf meets accessibility mandates (Sections 214-215)
- How volunteer stewardship (Section 341) applies
- Economic impact projections for gateway communities (Section 131)
- How this fits the broader recreation planning framework
Format as a professional policy memo with clear headings.`,
  },
  {
    id: "cover-letter",
    title: "Cover Letter",
    promptFragment: `Generate a professional cover letter addressed to this office's leadership:
- Proper salutation using staff names if available
- Brief introduction of EXPLORE Disc Golf and our 501(c)(3) status
- Reference to the EXPLORE Act as the policy framework
- Specific ask: 30-minute introductory meeting
- Mention of enclosed one-pager and alignment memo
- Professional closing
Warm, professional, partnership-oriented tone.`,
  },
  {
    id: "suggested-contacts",
    title: "Suggested Contacts",
    promptFragment: `Generate a prioritized contact list. For each contact:
- Name and title (if available)
- Role relevance to disc golf proposals
- Suggested approach (email, phone, in-person)
- Priority level (primary, secondary, informational)
Also suggest external stakeholders: local disc golf clubs, county recreation departments, chambers of commerce.`,
  },
];

// ---------------------------------------------------------------------------
// User Prompt Builder
// ---------------------------------------------------------------------------

export function buildUserPrompt(context: OfficeContext): string {
  const parts: string[] = [];

  parts.push("# Target BLM Office\n");
  parts.push(`- **Office:** ${context.officeName}`);
  parts.push(`- **Unit Code:** ${context.officeId}`);
  parts.push(`- **State:** ${context.state}`);
  parts.push(`- **Office Type:** ${context.officeType ?? "field"}`);
  if (context.lat && context.lng) {
    parts.push(`- **Location:** ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}`);
  }
  if (context.websiteUrl) {
    parts.push(`- **Website:** ${context.websiteUrl}`);
  }

  // Contacts
  parts.push("\n# Known Office Contacts\n");
  if (context.phone || context.email) {
    if (context.phone) parts.push(`- **Phone:** ${context.phone}`);
    if (context.email) parts.push(`- **Email:** ${context.email}`);
  } else {
    parts.push("No direct contact information available. Suggest title-based outreach.");
  }

  // Recreation sites
  parts.push("\n# BLM Recreation Sites in Jurisdiction\n");
  if (context.recreationSites.length > 0) {
    for (const site of context.recreationSites.slice(0, 20)) {
      parts.push(`- **${site.name}** (${site.activities.join(", ") || "general recreation"})`);
    }
    if (context.recreationSites.length > 20) {
      parts.push(`- ... and ${context.recreationSites.length - 20} more sites`);
    }
  } else {
    parts.push("No recreation site data available for this office.");
  }

  // Nearby disc golf (will be powered by FLiPT when ready)
  parts.push("\n# Existing Disc Golf Near This Office\n");
  if (context.nearbyDiscGolf.length > 0) {
    for (const course of context.nearbyDiscGolf) {
      parts.push(`- **${course.name}** — ${course.holes} holes, ${course.distanceMiles.toFixed(1)} miles away`);
    }
  } else {
    parts.push("No nearby disc golf course data available. This may represent an underserved area — a strong argument for development.");
  }

  // Engagement history
  parts.push("\n# Engagement History\n");
  if (context.engagementHistory.length > 0) {
    for (const entry of context.engagementHistory) {
      parts.push(`- **${entry.date}:** ${entry.status}${entry.notes ? ` — ${entry.notes}` : ""}`);
    }
  } else {
    parts.push("No prior engagement with this office. This will be a first-contact outreach.");
  }

  // Section generation instructions
  parts.push("\n---\n");
  parts.push("# Generation Instructions\n");
  parts.push("Generate the following sections, each clearly delimited with the exact header format shown:\n");
  for (const section of PACKET_SECTIONS) {
    parts.push(`## --- SECTION: ${section.id} ---\n`);
    parts.push(section.promptFragment);
    parts.push("");
  }

  return parts.join("\n");
}
