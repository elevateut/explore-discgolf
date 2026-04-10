/**
 * Supabase Query Helpers — explore_discgolf
 *
 * Typed async functions that wrap common database operations.
 * Each function uses the public Supabase client (anon key + RLS).
 * Server-side mutations that bypass RLS should use the service client
 * once getSupabaseServiceClient() is implemented.
 */

import { getSupabaseClient } from "./client";

// ---------------------------------------------------------------------------
// Type placeholders — replace with generated types from `supabase gen types`
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

export interface EngagementStatus {
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
// Office queries
// ---------------------------------------------------------------------------

/** Fetch every BLM office row. */
export async function getAllOffices(): Promise<BlmOffice[]> {
  // TODO: Add pagination / filtering (by state, office_type) as the dataset grows
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blm_offices")
    .select("*")
    .order("state", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BlmOffice[];
}

/** Look up a single office by its unique BLM unit code. */
export async function getOfficeByUnitCode(
  code: string,
): Promise<BlmOffice | null> {
  // TODO: Consider caching for frequently-accessed office pages
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blm_offices")
    .select("*")
    .eq("blm_unit_code", code)
    .maybeSingle();

  if (error) throw error;
  return (data as BlmOffice) ?? null;
}

// ---------------------------------------------------------------------------
// Engagement status queries
// ---------------------------------------------------------------------------

/** Get the most recent engagement status record for an office. */
export async function getOfficeEngagementStatus(
  officeId: string,
): Promise<EngagementStatus | null> {
  // TODO: Optionally return full history with a separate function
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("engagement_status")
    .select("*")
    .eq("office_id", officeId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as EngagementStatus) ?? null;
}

/** Insert a new engagement status record (append-only history). */
export async function updateEngagementStatus(
  officeId: string,
  status: string,
  notes: string | null,
  userId: string,
): Promise<EngagementStatus> {
  // TODO: Validate status value against allowed enum before inserting
  const supabase = getSupabaseClient();
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
  return data as EngagementStatus;
}

// ---------------------------------------------------------------------------
// Generated packet queries
// ---------------------------------------------------------------------------

/** Retrieve the most recently cached packet for an office. */
export async function getCachedPacket(
  officeId: string,
): Promise<GeneratedPacket | null> {
  // TODO: Add TTL-based staleness check so old packets are regenerated
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("generated_packets")
    .select("*")
    .eq("office_id", officeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as GeneratedPacket) ?? null;
}

/** Cache a newly generated proposal packet. */
export async function saveGeneratedPacket(
  officeId: string,
  context: Record<string, unknown>,
  markdown: string,
  pdfUrl: string | null,
  model: string,
): Promise<GeneratedPacket> {
  // TODO: Wire up generated_by from the authenticated session user
  const supabase = getSupabaseClient();
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
