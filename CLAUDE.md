# CLAUDE.md — explore-discgolf

> This file is for Claude Code (and other AI coding assistants) working in this repo.
> For the full project overview, tech stack, and conventions, read **[AGENTS.md](AGENTS.md)** first — that's the source of truth. This file only adds Claude-specific working notes.

## Quick orientation

Open source project by ElevateUT (501c3) advocating for disc golf on BLM public lands under the EXPLORE Act (P.L. 118-234). Astro 5 SSR on Vercel, Svelte 5 islands, Supabase, Anthropic Claude API, MapLibre GL. See AGENTS.md for the full breakdown.

## Working in this codebase

- **Start with the right AGENTS.md.** Most `src/lib/*`, `src/components/`, `src/content/`, and `src/pages/` directories have their own layer-specific AGENTS.md. Read those before editing files in that layer — they document conventions you won't get from the code alone.
- **Path aliases** are configured in `tsconfig.json`: `@components`, `@lib`, `@content`, `@data`, `@styles`, `@layouts`. Always use them instead of relative paths that cross directory boundaries.
- **Supabase is optional.** Every read path in `src/lib/supabase/queries.ts` falls back to `src/data/blm-offices.json` when credentials are missing. Preserve that pattern when adding new queries — the site must run for contributors who haven't set up Supabase.
- **Claude client is optional.** `src/lib/llm/client.ts` returns `null` when `ANTHROPIC_API_KEY` is missing. Guard LLM calls with `isLLMAvailable()` and return a clear "not configured" error from API routes.
- **Astro Actions vs. API routes.** Astro Actions return devalue-encoded bodies, which plain `fetch()` in a Svelte island can't parse. When a Svelte component needs JSON, add an API route under `src/pages/api/` that wraps the underlying library call. See `src/pages/api/packet/generate.ts` for the pattern.

## LLM architecture (where Claude shows up)

Two paths share `src/lib/llm/`:

1. **Packet generator** (`packet-generator.ts`, `/api/packet/generate`, `src/actions/generate-packet.ts`) — one-shot agentic pipeline producing a one-pager, EXPLORE Act alignment memo, cover letter, and suggested contacts. Cached in Supabase `generated_packets` (7-day TTL).
2. **Interactive chat** (`src/pages/api/chat/message.ts`, `ExploreChat.svelte`) — streaming multi-turn chat with up to 3 tool rounds per message and prompt caching on the ~42K-token reference docs block. Conversations persist in Supabase (`conversations`, `conversation_messages`) and are shareable at `/chat/[id]`.

Both share the same `tool_use` toolkit in `src/lib/llm/tools.ts` (`query_blm_recreation_sites`, `query_blm_office_page`, `get_engagement_history`). Default model: `claude-sonnet-4-20250514`.

## Commands

```bash
npm run dev      # Astro dev server at http://localhost:4321
npm run build    # Production build
npm run preview  # Preview production build
```

Before reporting a task complete, run `npm run build` to catch type errors and content collection validation failures — content collections enforce Zod schemas at build time.
