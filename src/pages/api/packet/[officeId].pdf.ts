/**
 * PDF Download Endpoint — /api/packet/[officeId].pdf
 *
 * Generates and returns a branded PDF for the most recently cached
 * engagement packet for the given office. Returns 404 if no packet
 * has been generated yet.
 */

import type { APIRoute } from "astro";
import { generatePacketPDF } from "@lib/pdf/generator";
import { getSupabaseClient } from "@lib/supabase/client";
import officesJson from "@data/blm-offices.json";

export const GET: APIRoute = async ({ params }) => {
  const { officeId } = params;
  if (!officeId) {
    return new Response("Missing officeId", { status: 400 });
  }

  // Look up office name
  const office = officesJson.find((o: any) => o.id === officeId);
  const officeName = office?.name ?? officeId;
  const state = office?.state ?? "";

  // Find cached packet in Supabase
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new Response("Database not configured", { status: 503 });
  }

  // Get office UUID from unit code
  const { data: dbOffice } = await supabase
    .from("blm_offices")
    .select("id")
    .eq("blm_unit_code", officeId)
    .maybeSingle();

  if (!dbOffice) {
    return new Response("Office not found", { status: 404 });
  }

  // Get latest cached packet
  const { data: packet } = await supabase
    .from("generated_packets")
    .select("*")
    .eq("office_id", dbOffice.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!packet?.output_markdown) {
    return new Response(
      "No packet has been generated for this office yet. Generate one first.",
      { status: 404 },
    );
  }

  // Parse the cached markdown into sections
  const sections = parseSections(packet.output_markdown);

  try {
    const pdfBuffer = await generatePacketPDF({
      officeName,
      officeId,
      state,
      onePager: sections["one-pager"] ?? "No content generated.",
      alignmentMemo: sections["explore-act-alignment"] ?? "No content generated.",
      coverLetter: sections["cover-letter"] ?? "No content generated.",
      suggestedContacts: sections["suggested-contacts"] ?? "No content generated.",
      generatedAt: packet.created_at,
    });

    const filename = `explore-disc-golf-${officeId.toLowerCase()}-packet.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("[pdf] Generation failed:", err);
    return new Response("PDF generation failed: " + err.message, { status: 500 });
  }
};

function parseSections(md: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const ids = ["one-pager", "explore-act-alignment", "cover-letter", "suggested-contacts"];
  for (let i = 0; i < ids.length; i++) {
    const marker = `--- SECTION: ${ids[i]} ---`;
    const start = md.indexOf(marker);
    if (start === -1) continue;
    const contentStart = start + marker.length;
    let contentEnd = md.length;
    for (let j = i + 1; j < ids.length; j++) {
      const nextIdx = md.indexOf(`--- SECTION: ${ids[j]} ---`, contentStart);
      if (nextIdx !== -1) { contentEnd = nextIdx; break; }
    }
    sections[ids[i]] = md.slice(contentStart, contentEnd).trim();
  }
  return sections;
}
