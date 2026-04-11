/**
 * LLM-Powered Engagement Packet Generator
 *
 * Generates tailored BLM engagement packets using Claude API with tool_use.
 */

import { anthropic, isLLMAvailable, DEFAULT_MODEL, MAX_TOKENS } from "./client";
import { SYSTEM_PROMPT, PACKET_SECTIONS, buildUserPrompt } from "./prompts";
import { PACKET_GENERATION_TOOLS, handleToolCall } from "./tools";
import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface OfficeContext {
  officeId: string;
  officeName: string;
  state: string;
  officeType?: string;
  lat?: number;
  lng?: number;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  recreationSites: Array<{
    name: string;
    lat: number;
    lng: number;
    activities: string[];
  }>;
  nearbyDiscGolf: Array<{
    name: string;
    holes: number;
    distanceMiles: number;
  }>;
  engagementHistory: Array<{
    date: string;
    status: string;
    notes?: string;
  }>;
}

export interface ContactSuggestion {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  rationale: string;
  approach: string;
  priority: string;
}

export interface GeneratedPacket {
  officeId: string;
  onePager: string;
  alignmentMemo: string;
  coverLetter: string;
  suggestedContacts: string;
  generatedAt: Date;
  modelUsed: string;
}

// ---------------------------------------------------------------------------
// Section Parser
// ---------------------------------------------------------------------------

/**
 * Parse Claude's response into individual sections using deterministic delimiters.
 */
function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionIds = PACKET_SECTIONS.map((s) => s.id);

  for (let i = 0; i < sectionIds.length; i++) {
    const id = sectionIds[i];
    const marker = `--- SECTION: ${id} ---`;
    const startIdx = text.indexOf(marker);
    if (startIdx === -1) continue;

    const contentStart = startIdx + marker.length;
    let contentEnd = text.length;

    // Find the next section marker
    for (let j = i + 1; j < sectionIds.length; j++) {
      const nextMarker = `--- SECTION: ${sectionIds[j]} ---`;
      const nextIdx = text.indexOf(nextMarker, contentStart);
      if (nextIdx !== -1) {
        contentEnd = nextIdx;
        break;
      }
    }

    sections[id] = text.slice(contentStart, contentEnd).trim();
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export async function generatePacket(
  context: OfficeContext,
  options?: { timeoutMs?: number },
): Promise<GeneratedPacket> {
  if (!isLLMAvailable() || !anthropic) {
    throw new Error("Anthropic API key is not configured. Cannot generate packets.");
  }

  const userMessage = buildUserPrompt(context);

  // Agentic loop: call Claude, execute tools, repeat until done
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let finalText = "";
  let iterations = 0;
  const maxIterations = 10; // safety limit

  // Optional timeout via AbortController
  const timeoutMs = options?.timeoutMs;
  const abortController = timeoutMs ? new AbortController() : undefined;
  const timer = timeoutMs
    ? setTimeout(() => abortController!.abort(), timeoutMs)
    : undefined;

  try {
  while (iterations < maxIterations) {
    iterations++;

    const response = await anthropic.messages.create(
      {
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: PACKET_GENERATION_TOOLS,
        messages,
      },
      abortController ? { signal: abortController.signal as AbortSignal } : undefined,
    );

    // Collect text blocks from the response
    const textBlocks = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text);
    finalText += textBlocks.join("\n");

    // If Claude is done, break
    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
      break;
    }

    // Handle tool_use blocks
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUseBlocks.length === 0) break;

      // Add assistant response to conversation
      messages.push({ role: "assistant", content: response.content });

      // Execute each tool and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await handleToolCall(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Add tool results to conversation
      messages.push({ role: "user", content: toolResults });
    }
  }

  // Parse sections from the final text
  const sections = parseSections(finalText);

  return {
    officeId: context.officeId,
    onePager: sections["one-pager"] || "Section not generated.",
    alignmentMemo: sections["explore-act-alignment"] || "Section not generated.",
    coverLetter: sections["cover-letter"] || "Section not generated.",
    suggestedContacts: sections["suggested-contacts"] || "Section not generated.",
    generatedAt: new Date(),
    modelUsed: DEFAULT_MODEL,
  };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
