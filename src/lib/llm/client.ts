/**
 * Anthropic Claude Client — explore_discgolf
 *
 * Provides a configured Anthropic SDK client for server-side LLM operations.
 * Reads the API key from the ANTHROPIC_API_KEY environment variable.
 *
 * This module must ONLY be imported in server-side contexts (Astro Actions,
 * SSR endpoints, build scripts). The API key is never exposed to the browser.
 */

import Anthropic from "@anthropic-ai/sdk";

const apiKey = import.meta.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing ANTHROPIC_API_KEY environment variable. " +
      "Copy .env.example to .env and add your Anthropic API key.",
  );
}

/**
 * Pre-configured Anthropic client instance.
 *
 * Usage:
 *   import { anthropic } from "@lib/llm/client";
 *   const response = await anthropic.messages.create({ ... });
 */
export const anthropic = new Anthropic({
  apiKey,
});

/**
 * Default model to use for packet generation.
 * Using claude-sonnet-4-20250514 for the balance of quality and cost.
 * Switch to claude-opus-4-20250514 if output quality needs improvement.
 */
export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/**
 * Max tokens for packet generation responses.
 * Engagement packets typically run 3,000–5,000 tokens; we set the ceiling
 * higher to avoid truncation on complex offices with many recreation sites.
 */
export const MAX_TOKENS = 8192;
