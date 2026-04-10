/**
 * Generate Packet from Conversation — /api/chat/generate-packet
 *
 * Takes a conversation ID, loads the full chat history, appends a
 * synthesis prompt, and asks Claude to produce the four-section
 * engagement packet from the conversation context.
 */

import type { APIRoute } from "astro";
import { anthropic, isLLMAvailable, DEFAULT_MODEL, MAX_TOKENS } from "@lib/llm/client";
import { buildChatSystemMessage, SYNTHESIS_PROMPT } from "@lib/llm/chat-prompts";
import { PACKET_GENERATION_TOOLS, handleToolCall } from "@lib/llm/tools";
import {
  getConversationMessages,
  saveGeneratedPacket,
  updateConversationStatus,
  getOfficeByUnitCode,
} from "@lib/supabase/queries";
import type Anthropic from "@anthropic-ai/sdk";

export const POST: APIRoute = async ({ request }) => {
  let body: { conversationId: string; officeId: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { conversationId, officeId } = body;
  if (!conversationId || !officeId) {
    return json({ error: "conversationId and officeId required" }, 400);
  }

  if (!isLLMAvailable() || !anthropic) {
    return json({ error: "AI not configured" }, 503);
  }

  // Load conversation messages
  const chatMessages = await getConversationMessages(conversationId);
  if (chatMessages.length === 0) {
    return json({ error: "No conversation messages found" }, 404);
  }

  // Build Claude messages from chat history
  const messages: Anthropic.MessageParam[] = chatMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Append synthesis prompt
  messages.push({ role: "user", content: SYNTHESIS_PROMPT });

  // Call Claude (non-streaming for structured output)
  const systemMessage = buildChatSystemMessage();
  let finalText = "";
  let iterations = 0;

  while (iterations < 5) {
    iterations++;
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemMessage,
      tools: PACKET_GENERATION_TOOLS,
      messages,
    });

    const textBlocks = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text);
    finalText += textBlocks.join("\n");

    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") break;

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      if (toolUses.length === 0) break;

      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const result = await handleToolCall(tu.name, tu.input as Record<string, unknown>);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: result });
      }
      messages.push({ role: "user", content: results });
    }
  }

  // Parse sections
  const sections = parseSections(finalText);
  const markdown = [
    "--- SECTION: one-pager ---", sections.onePager,
    "--- SECTION: explore-act-alignment ---", sections.alignmentMemo,
    "--- SECTION: cover-letter ---", sections.coverLetter,
    "--- SECTION: suggested-contacts ---", sections.suggestedContacts,
  ].join("\n\n");

  // Cache in Supabase
  const dbOffice = await getOfficeByUnitCode(officeId);
  if (dbOffice?.id) {
    try {
      await saveGeneratedPacket(dbOffice.id, {}, markdown, null, DEFAULT_MODEL);
      await updateConversationStatus(conversationId, "packet-generated");
    } catch {}
  }

  return json({
    error: null,
    data: {
      packet: {
        officeId,
        ...sections,
        generatedAt: new Date().toISOString(),
      },
    },
  });
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseSections(md: string) {
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
  return {
    onePager: s["one-pager"] ?? "",
    alignmentMemo: s["explore-act-alignment"] ?? "",
    coverLetter: s["cover-letter"] ?? "",
    suggestedContacts: s["suggested-contacts"] ?? "",
  };
}
