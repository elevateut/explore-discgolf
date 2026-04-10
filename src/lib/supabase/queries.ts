/**
 * Supabase Query Helpers — explore_discgolf
 *
 * Every read path degrades gracefully when Supabase is unavailable:
 *   - Office reads → blm-offices.json
 *   - Engagement/packet reads → null
 *   - Writes require a connected client and fail with clear errors
 */

import { getSupabaseClient, getSupabaseServiceClient } from "./client";
import officesJson from "@data/blm-offices.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlmOffice {
  id: string;
  blm_unit_code: string;
  name: string;
  office_type: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  recreation_planner_name: string | null;
  recreation_planner_email: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementStatusRow {
  id: string;
  office_id: string;
  status: string;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface GeneratedPacket {
  id: string;
  office_id: string;
  generated_by: string | null;
  prompt_context: Record<string, unknown> | null;
  output_markdown: string | null;
  output_pdf_url: string | null;
  created_at: string;
  model_used: string | null;
}

// ---------------------------------------------------------------------------
// Static fallback helpers
// ---------------------------------------------------------------------------

function staticOfficeToBlmOffice(o: (typeof officesJson)[0]): BlmOffice {
  return {
    id: "",
    blm_unit_code: o.id,
    name: o.name,
    office_type: o.type,
    state: o.state,
    lat: o.lat,
    lng: o.lng,
    address: null,
    phone: null,
    email: null,
    recreation_planner_name: null,
    recreation_planner_email: null,
    website_url: null,
    created_at: "",
    updated_at: "",
  };
}

// ---------------------------------------------------------------------------
// Office queries
// ---------------------------------------------------------------------------

/** Fetch every BLM office. Falls back to static JSON when Supabase is unavailable. */
export async function getAllOffices(): Promise<BlmOffice[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return officesJson.map(staticOfficeToBlmOffice);
  }
  const { data, error } = await supabase
    .from("blm_offices")
    .select("*")
    .order("state", { ascending: true });

  if (error) {
    console.warn("[supabase/queries] getAllOffices failed, using static fallback:", error.message);
    return officesJson.map(staticOfficeToBlmOffice);
  }
  return (data ?? []) as BlmOffice[];
}

/** Look up a single office by its BLM unit code. Falls back to static JSON. */
export async function getOfficeByUnitCode(
  code: string,
): Promise<BlmOffice | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const found = officesJson.find((o: any) => o.id === code);
    return found ? staticOfficeToBlmOffice(found) : null;
  }
  const { data, error } = await supabase
    .from("blm_offices")
    .select("*")
    .eq("blm_unit_code", code)
    .maybeSingle();

  if (error) {
    console.warn("[supabase/queries] getOfficeByUnitCode failed:", error.message);
    const found = officesJson.find((o: any) => o.id === code);
    return found ? staticOfficeToBlmOffice(found) : null;
  }
  return (data as BlmOffice) ?? null;
}

// ---------------------------------------------------------------------------
// Engagement status queries
// ---------------------------------------------------------------------------

/** Get the most recent engagement status for an office. Returns null when unavailable. */
export async function getOfficeEngagementStatus(
  officeId: string,
): Promise<EngagementStatusRow | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("engagement_status")
    .select("*")
    .eq("office_id", officeId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[supabase/queries] getOfficeEngagementStatus failed:", error.message);
    return null;
  }
  return (data as EngagementStatusRow) ?? null;
}

/** Insert a new engagement status record (append-only). Uses service client to bypass RLS. */
export async function updateEngagementStatus(
  officeId: string,
  status: string,
  notes: string | null,
  userId: string,
): Promise<EngagementStatusRow> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client is not configured. Cannot write engagement status.");
  }
  const { data, error } = await supabase
    .from("engagement_status")
    .insert({
      office_id: officeId,
      status,
      notes,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EngagementStatusRow;
}

// ---------------------------------------------------------------------------
// Generated packet queries
// ---------------------------------------------------------------------------

/** Retrieve the most recently cached packet for an office. Returns null when unavailable. */
export async function getCachedPacket(
  officeId: string,
): Promise<GeneratedPacket | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("generated_packets")
    .select("*")
    .eq("office_id", officeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[supabase/queries] getCachedPacket failed:", error.message);
    return null;
  }
  return (data as GeneratedPacket) ?? null;
}

/** Cache a newly generated proposal packet. Uses service client to bypass RLS. */
export async function saveGeneratedPacket(
  officeId: string,
  context: Record<string, unknown>,
  markdown: string,
  pdfUrl: string | null,
  model: string,
): Promise<GeneratedPacket> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client is not configured. Cannot save generated packet.");
  }
  const { data, error } = await supabase
    .from("generated_packets")
    .insert({
      office_id: officeId,
      prompt_context: context,
      output_markdown: markdown,
      output_pdf_url: pdfUrl,
      model_used: model,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GeneratedPacket;
}
