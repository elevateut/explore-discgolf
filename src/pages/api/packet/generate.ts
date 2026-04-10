/**
 * API endpoint wrapper for packet generation.
 *
 * Astro Actions return devalue-encoded responses that can't be parsed
 * by plain fetch() in Svelte islands. This endpoint wraps the action
 * logic and returns standard JSON.
 */

import type { APIRoute } from "astro";
import { isLLMAvailable } from "@lib/llm/client";
import { generatePacket } from "@lib/llm/packet-generator";
import type { OfficeContext } from "@lib/llm/packet-generator";
import { getOfficeByUnitCode, getOfficeEngagementStatus, getCachedPacket, saveGeneratedPacket } from "@lib/supabase/queries";
import { getRecreationSites } from "@lib/blm/client";
import type { BBox } from "@lib/blm/types";
import officesJson from "@data/blm-offices.json";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  const json = (err: string | null, data: any = null, status = 200) =>
    new Response(JSON.stringify({ error: err, data }), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  let body: { officeId?: string; forceRegenerate?: boolean };
  try {
    body = await request.json();
  } catch {
    return json("Invalid JSON body", null, 400);
  }

  const officeId = body.officeId;
  if (!officeId) return json("officeId is required", null, 400);
  const forceRegenerate = body.forceRegenerate ?? false;

  if (!isLLMAvailable()) {
    return json("AI packet generation is not available. The Anthropic API key is not configured.");
  }

  // Look up office
  const dbOffice = await getOfficeByUnitCode(officeId);
  const staticOffice = officesJson.find((o: any) => o.id === officeId);
  if (!dbOffice && !staticOffice) return json(`Office ${officeId} not found.`, null, 404);

  const officeName = dbOffice?.name ?? staticOffice?.name ?? officeId;
  const officeUuid = dbOffice?.id;

  // Check cache
  if (officeUuid && !forceRegenerate) {
    const cached = await getCachedPacket(officeUuid);
    if (cached?.created_at) {
      const age = Date.now() - new Date(cached.created_at).getTime();
      if (age < CACHE_TTL_MS && cached.output_markdown) {
        const sections = parseSections(cached.output_markdown);
        return json(null, {
          source: "cache",
          packet: { officeId, ...sections, generatedAt: cached.created_at },
        });
      }
    }
  }

  // Gather context
  const lat = dbOffice?.lat ? Number(dbOffice.lat) : staticOffice?.lat ?? 0;
  const lng = dbOffice?.lng ? Number(dbOffice.lng) : staticOffice?.lng ?? 0;

  let recreationSites: OfficeContext["recreationSites"] = [];
  if (lat && lng) {
    try {
      const bbox: BBox = [lng - 0.5, lat - 0.5, lng + 0.5, lat + 0.5];
      const sites = await getRecreationSites(bbox);
      recreationSites = sites.slice(0, 30).map((s) => ({
        name: s.name, lat: s.lat, lng: s.lng, activities: s.activities,
      }));
    } catch { /* non-fatal */ }
  }

  let engagementHistory: OfficeContext["engagementHistory"] = [];
  if (officeUuid) {
    const status = await getOfficeEngagementStatus(officeUuid);
    if (status) {
      engagementHistory = [{ date: status.updated_at, status: status.status, notes: status.notes ?? undefined }];
    }
  }

  const context: OfficeContext = {
    officeId,
    officeName,
    state: dbOffice?.state ?? staticOffice?.state ?? "",
    officeType: dbOffice?.office_type ?? staticOffice?.type ?? "field",
    lat, lng,
    phone: dbOffice?.phone ?? (staticOffice as any)?.phone ?? null,
    email: dbOffice?.email ?? (staticOffice as any)?.email ?? null,
    websiteUrl: dbOffice?.website_url ?? (staticOffice as any)?.websiteUrl ?? null,
    recreationSites,
    nearbyDiscGolf: [],
    engagementHistory,
  };

  try {
    const packet = await generatePacket(context);

    // Cache
    if (officeUuid) {
      const md = [
        "--- SECTION: one-pager ---", packet.onePager,
        "--- SECTION: explore-act-alignment ---", packet.alignmentMemo,
        "--- SECTION: cover-letter ---", packet.coverLetter,
        "--- SECTION: suggested-contacts ---", packet.suggestedContacts,
      ].join("\n\n");
      try {
        await saveGeneratedPacket(officeUuid, context as any, md, null, packet.modelUsed);
      } catch { /* non-fatal */ }
    }

    return json(null, {
      source: "generated",
      packet: {
        officeId: packet.officeId,
        onePager: packet.onePager,
        alignmentMemo: packet.alignmentMemo,
        coverLetter: packet.coverLetter,
        suggestedContacts: packet.suggestedContacts,
        generatedAt: packet.generatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    return json(`Packet generation failed: ${err.message}`, null, 500);
  }
};

function parseSections(md: string): Record<string, string> {
  const s: Record<string, string> = {};
  const ids = ["one-pager", "explore-act-alignment", "cover-letter", "suggested-contacts"];
  for (let i = 0; i < ids.length; i++) {
    const marker = `--- SECTION: ${ids[i]} ---`;
    const start = md.indexOf(marker);
    if (start === -1) continue;
    const cStart = start + marker.length;
    let cEnd = md.length;
    for (let j = i + 1; j < ids.length; j++) {
      const nx = md.indexOf(`--- SECTION: ${ids[j]} ---`, cStart);
      if (nx !== -1) { cEnd = nx; break; }
    }
    s[ids[i]] = md.slice(cStart, cEnd).trim();
  }
  return { onePager: s["one-pager"] ?? "", alignmentMemo: s["explore-act-alignment"] ?? "", coverLetter: s["cover-letter"] ?? "", suggestedContacts: s["suggested-contacts"] ?? "" };
}
