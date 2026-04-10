/**
 * Streaming Chat Endpoint — /api/chat/message
 *
 * Accepts a conversation history + new user message, streams Claude's
 * response back as newline-delimited JSON events. Handles tool_use
 * blocks by executing tools server-side and continuing the stream.
 *
 * Uses Anthropic prompt caching for reference docs (~42K tokens cached).
 */

import type { APIRoute } from "astro";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, isLLMAvailable, DEFAULT_MODEL } from "@lib/llm/client";
import { buildChatSystemMessage } from "@lib/llm/chat-prompts";
import { PACKET_GENERATION_TOOLS, handleToolCall, TOOL_DISPLAY_NAMES } from "@lib/llm/tools";
import {
  createConversation,
  getOfficeByUnitCode,
  saveConversationMessage,
} from "@lib/supabase/queries";
import officesJson from "@data/blm-offices.json";

const CHAT_MAX_TOKENS = 4096;
const MAX_TOOL_ROUNDS = 3; // per message, to stay within Vercel timeout

export const POST: APIRoute = async ({ request }) => {
  // Parse request
  let body: {
    conversationId?: string;
    officeId: string;
    messages: Array<{ role: string; content: string }>;
    userMessage: string;
    sessionId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ type: "error", message: "Invalid JSON" }, 400);
  }

  const { officeId, userMessage, sessionId = "anonymous" } = body;
  if (!officeId || !userMessage) {
    return jsonResponse({ type: "error", message: "officeId and userMessage required" }, 400);
  }

  if (!isLLMAvailable() || !anthropic) {
    return jsonResponse({ type: "error", message: "AI is not configured. Set ANTHROPIC_API_KEY." }, 503);
  }

  // Look up office for context
  const dbOffice = await getOfficeByUnitCode(officeId);
  const staticOffice = officesJson.find((o: any) => o.id === officeId);
  const officeName = dbOffice?.name ?? staticOffice?.name ?? officeId;

  // Create or reuse conversation
  let conversationId = body.conversationId;
  if (!conversationId && dbOffice?.id) {
    const conv = await createConversation(dbOffice.id, sessionId);
    conversationId = conv?.id ?? undefined;
  }

  // Build message history for Claude
  const priorMessages: Anthropic.MessageParam[] = (body.messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Add office context to the first user message if this is the start
  let enrichedUserMessage = userMessage;
  if (priorMessages.length === 0) {
    const phone = dbOffice?.phone ?? (staticOffice as any)?.phone ?? "";
    const email = dbOffice?.email ?? (staticOffice as any)?.email ?? "";
    const website = dbOffice?.website_url ?? (staticOffice as any)?.websiteUrl ?? "";
    enrichedUserMessage = `[Context: The user is exploring ideas for ${officeName} (${officeId}) in ${dbOffice?.state ?? staticOffice?.state ?? ""}. Office phone: ${phone || "unknown"}. Email: ${email || "unknown"}. Website: ${website || "unknown"}.]\n\n${userMessage}`;
  }

  priorMessages.push({ role: "user", content: enrichedUserMessage });

  // Save user message to DB
  if (conversationId) {
    saveConversationMessage(conversationId, "user", userMessage).catch(() => {});
  }

  // Build system message with prompt caching
  const systemMessage = buildChatSystemMessage();

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        send({ type: "message_start", conversationId });

        let messages = [...priorMessages];
        let fullAssistantText = "";
        let toolRound = 0;

        while (toolRound <= MAX_TOOL_ROUNDS) {
          const response = await anthropic!.messages.create({
            model: DEFAULT_MODEL,
            max_tokens: CHAT_MAX_TOKENS,
            system: systemMessage,
            tools: PACKET_GENERATION_TOOLS,
            messages,
            stream: true,
          });

          let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "text") {
                // Text block starting
              } else if (event.content_block.type === "tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  inputJson: "",
                };
                send({
                  type: "tool_start",
                  name: event.content_block.name,
                  display: TOOL_DISPLAY_NAMES[event.content_block.name] ?? event.content_block.name,
                });
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                fullAssistantText += event.delta.text;
                send({ type: "text_delta", text: event.delta.text });
              } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolUse) {
                // Execute the tool
                let toolInput: Record<string, unknown> = {};
                try {
                  toolInput = JSON.parse(currentToolUse.inputJson);
                } catch {}

                const toolResult = await handleToolCall(currentToolUse.name, toolInput);
                send({
                  type: "tool_done",
                  name: currentToolUse.name,
                  success: true,
                });

                // Build the tool result message for the next round
                const assistantContent: Anthropic.ContentBlockParam[] = [];

                // Include any text that came before the tool use
                if (fullAssistantText.trim()) {
                  assistantContent.push({ type: "text", text: fullAssistantText });
                }
                assistantContent.push({
                  type: "tool_use",
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: toolInput,
                });

                messages.push({ role: "assistant", content: assistantContent });
                messages.push({
                  role: "user",
                  content: [{
                    type: "tool_result",
                    tool_use_id: currentToolUse.id,
                    content: toolResult,
                  }],
                });

                currentToolUse = null;
                fullAssistantText = ""; // reset for next round
              }
            } else if (event.type === "message_stop") {
              // Check if we need another round (tool_use)
            }
          }

          // Check final stop reason from the accumulated response
          // If there was a tool use, we already handled it and should continue
          // If the last content block was text (no pending tool), we're done
          if (!currentToolUse) {
            break; // No more tool calls, we're done
          }

          toolRound++;
        }

        // Save assistant response to DB
        if (conversationId && fullAssistantText) {
          saveConversationMessage(conversationId, "assistant", fullAssistantText).catch(() => {});
        }

        send({ type: "done", conversationId });
      } catch (err: any) {
        send({ type: "error", message: err.message ?? "Stream failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
