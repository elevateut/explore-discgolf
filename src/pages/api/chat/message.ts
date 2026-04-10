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
const MAX_MESSAGES_PER_CONVERSATION = 20; // cap to control costs

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

  // On first message, inject office context as a preceding user+assistant exchange
  // so Claude knows exactly which office we're discussing.
  // Check for no prior assistant messages (first real exchange).
  const hasAssistantHistory = priorMessages.some((m) => m.role === "assistant");
  if (!hasAssistantHistory) {
    const phone = dbOffice?.phone ?? (staticOffice as any)?.phone ?? "";
    const email = dbOffice?.email ?? (staticOffice as any)?.email ?? "";
    const website = dbOffice?.website_url ?? (staticOffice as any)?.websiteUrl ?? "";
    const state = dbOffice?.state ?? staticOffice?.state ?? "";
    const lat = dbOffice?.lat ? Number(dbOffice.lat) : staticOffice?.lat ?? 0;
    const lng = dbOffice?.lng ? Number(dbOffice.lng) : staticOffice?.lng ?? 0;

    const contextMsg = `I'm on the page for the ${officeName} in ${state}. Here's what I know about this office:
- BLM Unit Code: ${officeId}
- State: ${state}
- Coordinates: ${lat}, ${lng}
- Phone: ${phone || "not available"}
- Email: ${email || "not available"}
- Website: ${website || "not available"}

Please use your tools to research this specific office before responding. Start by looking up their BLM website and recreation sites. The user's question is below.`;

    // Prepend context before any client messages
    priorMessages.unshift(
      { role: "user", content: contextMsg },
      { role: "assistant", content: `I'll research the ${officeName} right away. Let me look up their recreation portfolio and contact details.` },
    );
  }

  priorMessages.push({ role: "user", content: userMessage });

  // Check message limit
  const userMessageCount = priorMessages.filter((m) => m.role === "user").length;
  if (userMessageCount >= MAX_MESSAGES_PER_CONVERSATION) {
    return jsonResponse({
      type: "error",
      message: `This conversation has reached the ${MAX_MESSAGES_PER_CONVERSATION}-message limit. Please start a new conversation or generate your packet from the ideas discussed so far.`,
    }, 429);
  }

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

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let cacheReadTokens = 0;
      let cacheCreationTokens = 0;

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
          // Collect all tool calls from this single response
          const pendingTools: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
          let responseText = "";

          for await (const event of response) {
            // Track token usage
            if (event.type === "message_start" && (event as any).message?.usage) {
              const u = (event as any).message.usage;
              totalInputTokens += u.input_tokens ?? 0;
              cacheReadTokens += u.cache_read_input_tokens ?? 0;
              cacheCreationTokens += u.cache_creation_input_tokens ?? 0;
            } else if (event.type === "message_delta" && (event as any).usage) {
              totalOutputTokens += (event as any).usage.output_tokens ?? 0;
            }

            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
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
                responseText += event.delta.text;
                fullAssistantText += event.delta.text;
                send({ type: "text_delta", text: event.delta.text });
              } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                currentToolUse.inputJson += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolUse) {
                let toolInput: Record<string, unknown> = {};
                try { toolInput = JSON.parse(currentToolUse.inputJson); } catch {}
                pendingTools.push({ id: currentToolUse.id, name: currentToolUse.name, input: toolInput });
                currentToolUse = null;
              }
            }
          }

          // If no tools were called, we're done
          if (pendingTools.length === 0) {
            break;
          }

          // Execute all tools and build the response
          const assistantContent: Anthropic.ContentBlockParam[] = [];
          if (responseText.trim()) {
            assistantContent.push({ type: "text", text: responseText });
          }
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const tool of pendingTools) {
            assistantContent.push({
              type: "tool_use",
              id: tool.id,
              name: tool.name,
              input: tool.input,
            });

            // Send a keepalive before potentially slow tool execution
            send({ type: "tool_executing", name: tool.name });
            const result = await handleToolCall(tool.name, tool.input);
            send({ type: "tool_done", name: tool.name, success: true });

            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: result,
            });
          }

          messages.push({ role: "assistant", content: assistantContent });
          messages.push({ role: "user", content: toolResults });
          fullAssistantText = ""; // reset for next round

          // Signal that we're continuing with tool results
          send({ type: "tool_round_complete", round: toolRound + 1 });

          toolRound++;
        }

        // Save assistant response to DB
        if (conversationId && fullAssistantText) {
          saveConversationMessage(conversationId, "assistant", fullAssistantText).catch(() => {});
        }

        // Estimate cost (Sonnet 4 pricing)
        const inputCost = (totalInputTokens / 1_000_000) * 3;
        const outputCost = (totalOutputTokens / 1_000_000) * 15;
        const cacheSavings = (cacheReadTokens / 1_000_000) * (3 - 0.30); // saved vs full price
        const estimatedCost = inputCost + outputCost;

        send({
          type: "done",
          conversationId,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            cacheReadTokens,
            cacheCreationTokens,
            estimatedCostUSD: Math.round(estimatedCost * 10000) / 10000,
            cacheSavingsUSD: Math.round(cacheSavings * 10000) / 10000,
          },
        });
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
