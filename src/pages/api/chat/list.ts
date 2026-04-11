/**
 * List public conversations for an office.
 * GET /api/chat/list?officeUuid=...&limit=20
 */

import type { APIRoute } from "astro";
import { getConversationsByOffice } from "@lib/supabase/queries";

export const GET: APIRoute = async ({ url }) => {
  const officeUuid = url.searchParams.get("officeUuid");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 50) : 20;

  if (!officeUuid) {
    return new Response(JSON.stringify({ error: "officeUuid required", conversations: [] }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversations = await getConversationsByOffice(officeUuid, limit);

  return new Response(
    JSON.stringify({
      error: null,
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        preview: c.preview,
        messageCount: c.messageCount,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
