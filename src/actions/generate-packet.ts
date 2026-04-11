/**
 * Astro Action: Generate Engagement Packet
 *
 * Server-side action that generates (or retrieves cached) BLM engagement
 * packets. Runs ONLY on the server — API keys never reach the browser.
 */

import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { isLLMAvailable } from "@lib/llm/client";
import { generatePacket } from "@lib/llm/packet-generator";
import type { OfficeContext } from "@lib/llm/packet-generator";
import { getOfficeByUnitCode, getOfficeEngagementStatus, getCachedPacket, saveGeneratedPacket } from "@lib/supabase/queries";
import { getRecreationSites } from "@lib/blm/client";
import type { BBox } from "@lib/blm/types";
import officesJson from "@data/blm-offices.json";

/** Cache TTL — 7 days. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const generatePacketAction = defineAction({
  accept: "json",
  input: z.object({
    officeId: z.string().min(1, "officeId is required"),
    forceRegenerate: z.boolean().optional().default(false),
  }),

  handler: async (input) => {
    const { officeId, forceRegenerate } = input;

    // Check LLM availability
    if (!isLLMAvailable()) {
      return {
        error: "AI packet generation is not available. The Anthropic API key is not configured.",
        packet: null,
      };
    }

    // Look up office data
    const dbOffice = await getOfficeByUnitCode(officeId);
    const staticOffice = officesJson.find((o: any) => o.id === officeId);

    if (!dbOffice && !staticOffice) {
      return { error: `Office ${officeId} not found.`, packet: null };
    }

    const officeName = dbOffice?.name ?? staticOffice?.name ?? officeId;
    const officeUuid = dbOffice?.id;

    // Check cache (if Supabase has the office UUID)
    if (officeUuid && !forceRegenerate) {
      const cached = await getCachedPacket(officeUuid);
      if (cached?.created_at) {
        const age = Date.now() - new Date(cached.created_at).getTime();
        if (age < CACHE_TTL_MS && cached.output_markdown) {
          // Parse the cached markdown back into sections
          const sections = parseCachedMarkdown(cached.output_markdown);
          return {
            source: "cache" as const,
            packet: {
              officeId,
              ...sections,
              generatedAt: cached.created_at,
            },
          };
        }
      }
    }

    // Gather context
    const lat = dbOffice?.lat ? Number(dbOffice.lat) : staticOffice?.lat ?? 0;
    const lng = dbOffice?.lng ? Number(dbOffice.lng) : staticOffice?.lng ?? 0;

    // Fetch recreation sites near this office
    let recreationSites: OfficeContext["recreationSites"] = [];
    if (lat && lng) {
      try {
        const radius = 0.5; // ~35 miles
        const bbox: BBox = [lng - radius, lat - radius, lng + radius, lat + radius];
        const sites = await getRecreationSites(bbox);
        recreationSites = sites.slice(0, 30).map((s) => ({
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          activities: s.activities,
        }));
      } catch {
        // Non-fatal — proceed without recreation data
      }
    }

    // Fetch engagement history
    let engagementHistory: OfficeContext["engagementHistory"] = [];
    if (officeUuid) {
      const status = await getOfficeEngagementStatus(officeUuid);
      if (status) {
        engagementHistory = [{
          date: status.updated_at,
          status: status.status,
          notes: status.notes ?? undefined,
        }];
      }
    }

    const context: OfficeContext = {
      officeId,
      officeName,
      state: dbOffice?.state ?? staticOffice?.state ?? "",
      officeType: dbOffice?.office_type ?? staticOffice?.type ?? "field",
      lat,
      lng,
      phone: dbOffice?.phone ?? (staticOffice as any)?.phone ?? null,
      email: dbOffice?.email ?? (staticOffice as any)?.email ?? null,
      websiteUrl: dbOffice?.website_url ?? (staticOffice as any)?.websiteUrl ?? null,
      recreationSites,
      nearbyDiscGolf: [], // FLiPT integration coming
      engagementHistory,
    };

    // Generate
    try {
      const packet = await generatePacket(context, { timeoutMs: 25_000 });

      // Cache the result
      if (officeUuid) {
        const markdown = serializePacketToMarkdown(packet);
        try {
          await saveGeneratedPacket(
            officeUuid,
            context as unknown as Record<string, unknown>,
            markdown,
            null,
            packet.modelUsed,
          );
        } catch {
          // Non-fatal — packet was generated even if caching fails
        }
      }

      return {
        source: "generated" as const,
        packet: {
          officeId: packet.officeId,
          onePager: packet.onePager,
          alignmentMemo: packet.alignmentMemo,
          coverLetter: packet.coverLetter,
          suggestedContacts: packet.suggestedContacts,
          generatedAt: packet.generatedAt.toISOString(),
        },
      };
    } catch (err: any) {
      return {
        error: `Packet generation failed: ${err.message}`,
        packet: null,
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializePacketToMarkdown(packet: {
  onePager: string;
  alignmentMemo: string;
  coverLetter: string;
  suggestedContacts: string;
}): string {
  return [
    "--- SECTION: one-pager ---",
    packet.onePager,
    "--- SECTION: explore-act-alignment ---",
    packet.alignmentMemo,
    "--- SECTION: cover-letter ---",
    packet.coverLetter,
    "--- SECTION: suggested-contacts ---",
    packet.suggestedContacts,
  ].join("\n\n");
}

function parseCachedMarkdown(markdown: string): {
  onePager: string;
  alignmentMemo: string;
  coverLetter: string;
  suggestedContacts: string;
} {
  const sections: Record<string, string> = {};
  const ids = ["one-pager", "explore-act-alignment", "cover-letter", "suggested-contacts"];

  for (let i = 0; i < ids.length; i++) {
    const marker = `--- SECTION: ${ids[i]} ---`;
    const start = markdown.indexOf(marker);
    if (start === -1) continue;

    const contentStart = start + marker.length;
    let contentEnd = markdown.length;
    for (let j = i + 1; j < ids.length; j++) {
      const nextIdx = markdown.indexOf(`--- SECTION: ${ids[j]} ---`, contentStart);
      if (nextIdx !== -1) {
        contentEnd = nextIdx;
        break;
      }
    }
    sections[ids[i]] = markdown.slice(contentStart, contentEnd).trim();
  }

  return {
    onePager: sections["one-pager"] ?? "",
    alignmentMemo: sections["explore-act-alignment"] ?? "",
    coverLetter: sections["cover-letter"] ?? "",
    suggestedContacts: sections["suggested-contacts"] ?? "",
  };
}
