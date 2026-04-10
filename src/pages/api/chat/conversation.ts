/**
 * Conversation CRUD — /api/chat/conversation
 *
 * GET: Load an existing conversation + messages for an office.
 */

import type { APIRoute } from "astro";
import {
  getActiveConversation,
  getConversationMessages,
  getOfficeByUnitCode,
} from "@lib/supabase/queries";

export const GET: APIRoute = async ({ url }) => {
  const officeId = url.searchParams.get("officeId");
  const sessionId = url.searchParams.get("sessionId") ?? "anonymous";

  if (!officeId) {
    return new Response(JSON.stringify({ error: "officeId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dbOffice = await getOfficeByUnitCode(officeId);
  if (!dbOffice) {
    return new Response(JSON.stringify({ error: "Office not found", conversation: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversation = await getActiveConversation(dbOffice.id, sessionId);
  if (!conversation) {
    return new Response(JSON.stringify({ conversation: null, messages: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = await getConversationMessages(conversation.id);

  return new Response(
    JSON.stringify({
      conversation: {
        id: conversation.id,
        status: conversation.status,
        title: conversation.title,
        createdAt: conversation.created_at,
      },
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
