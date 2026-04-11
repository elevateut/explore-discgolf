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

// ---------------------------------------------------------------------------
// Conversation queries
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  office_id: string;
  session_id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: unknown | null;
  created_at: string;
}

/** Create a new conversation for an office. */
export async function createConversation(
  officeId: string,
  sessionId: string,
): Promise<Conversation | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ office_id: officeId, session_id: sessionId })
    .select()
    .single();

  if (error) {
    console.warn("[supabase/queries] createConversation failed:", error.message);
    return null;
  }
  return data as Conversation;
}

/** Get the most recent active conversation for an office + session. */
export async function getActiveConversation(
  officeId: string,
  sessionId: string,
): Promise<Conversation | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("office_id", officeId)
    .eq("session_id", sessionId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data as Conversation) ?? null;
}

/** Get all messages for a conversation, ordered chronologically. */
export async function getConversationMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as ConversationMessage[];
}

/** Get a single conversation by UUID with messages and office. */
export async function getConversationById(
  id: string,
): Promise<{
  conversation: Conversation;
  messages: ConversationMessage[];
  office: BlmOffice | null;
} | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: conversation, error: convErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (convErr || !conversation) return null;

  const messages = await getConversationMessages(id);

  let office: BlmOffice | null = null;
  if (conversation.office_id) {
    const { data: officeData } = await supabase
      .from("blm_offices")
      .select("*")
      .eq("id", conversation.office_id)
      .maybeSingle();
    office = (officeData as BlmOffice) ?? null;
  }

  return {
    conversation: conversation as Conversation,
    messages,
    office,
  };
}

/** Get conversations for an office with at least 2 user messages. */
export async function getConversationsByOffice(
  officeUuid: string,
  limit = 20,
): Promise<Array<Conversation & { messageCount: number; preview: string }>> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  // Get conversations
  const { data: convs, error: convErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("office_id", officeUuid)
    .order("updated_at", { ascending: false })
    .limit(limit * 2); // fetch extra in case some are filtered out

  if (convErr || !convs) return [];

  // For each, count user messages and get the first one
  const enriched: Array<Conversation & { messageCount: number; preview: string }> = [];
  for (const conv of convs) {
    const { data: msgs } = await supabase
      .from("conversation_messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (!msgs) continue;
    const userMsgs = msgs.filter((m: any) => m.role === "user");
    if (userMsgs.length < 2) continue; // skip auto-started, never-engaged convs

    const preview = userMsgs[0]?.content ?? "";
    enriched.push({
      ...(conv as Conversation),
      messageCount: msgs.length,
      preview: preview.slice(0, 200),
    });

    if (enriched.length >= limit) break;
  }

  return enriched;
}

/** Save a message to a conversation. */
export async function saveConversationMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  toolCalls?: unknown,
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;

  await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    tool_calls: toolCalls ?? null,
  });

  // Touch conversation updated_at
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Auto-set title from first user message if not yet set
  if (role === "user") {
    const { data: conv } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", conversationId)
      .maybeSingle();

    if (conv && !conv.title) {
      update.title = truncateTitle(content);
    }
  }

  await supabase
    .from("conversations")
    .update(update)
    .eq("id", conversationId);
}

/** Truncate a message to a short title at a word boundary. */
function truncateTitle(content: string, maxLen = 60): string {
  const cleaned = content.trim().replace(/\s+/g, " ");
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + "…";
}

/** Update conversation status. */
export async function updateConversationStatus(
  conversationId: string,
  status: string,
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;

  await supabase
    .from("conversations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
