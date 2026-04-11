# AGENTS.md — explore-discgolf

## Overview

Open source project by ElevateUT (501c3) advocating for disc golf on BLM public lands under the EXPLORE Act (P.L. 118-234). Licensed under Apache-2.0.

The site does three things: **Learn** (educational content about the EXPLORE Act), **Find** (interactive BLM office finder with map), and **Act** (AI-powered proposal packet generator plus an interactive chat brainstorming tool).

## Tech Stack

- **Framework:** Astro 5 SSR (`output: "server"`) deployed on Vercel via `@astrojs/vercel`
- **Styling:** Tailwind CSS v4 + DaisyUI v5 (custom "elevateut" theme)
- **Interactive UI:** Svelte 5 islands hydrated via `@astrojs/svelte` (`client:visible`)
- **Database:** Supabase (Postgres, Auth, RLS) with graceful fallback to static JSON
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`) — streaming chat + agentic packet generation using `tool_use` and prompt caching
- **Maps:** MapLibre GL JS rendering BLM ArcGIS REST data
- **Sitemap:** `@astrojs/sitemap`
- **PDF:** `pdfkit` for packet downloads

## Project Structure

```
src/
  actions/      — Astro Actions (type-safe server endpoints)
  components/   — Astro + Svelte 5 islands (@components)
                  BLMOfficeFinder, OfficeMap, OfficeCard, PacketViewer,
                  ExploreChat, CommunityConversations
  content/      — Astro Content Collections (@content)
                  explore-act, resources, case-studies, news
  data/         — Seed data (@data) — blm-offices.json
  layouts/      — Astro layouts (@layouts) — BaseLayout
  lib/          — Shared utilities (@lib)
    blm/          ArcGIS REST client + types
    flipt/        FLiPT client (deferred integration)
    llm/          Claude client, prompts, tools, packet-generator,
                  chat-prompts, reference-docs
    pdf/          Packet PDF generation
    supabase/     Client, queries, schema.sql
  pages/        — File-based routes
    api/chat/     Streaming chat endpoints (message, conversation, list)
    api/packet/   Packet generation + PDF download
    chat/[id]     Public shareable conversation permalinks
    offices/      Listing + dynamic [id] detail page
    explore-act/  Listing + dynamic [...slug]
    case-studies/ Listing + dynamic [...slug]
    resources/    Resources listing
  styles/       — Global CSS + Tailwind imports (@styles)
public/         — Static assets (images, fonts, og images, downloads)
scripts/        — Node scripts: seed-offices, import-offices, scrape-contacts, generate-og-image
docs/           — Research, engagement templates, brand guide, sources
brand/          — Logo assets and brand package PDF
supabase/       — Local Supabase config
```

Most `src/lib/*` subdirectories and `src/components/`, `src/content/`, `src/pages/` have their own `AGENTS.md` with layer-specific guidance.

## Conventions

- **Content** lives in `src/content/` as Markdown collections validated by Zod schemas in `src/content/config.ts`.
- **Interactive features** (maps, chat, office finder) are Svelte 5 islands hydrated with `client:visible`.
- **Server logic** uses Astro Actions (`src/actions/`) for type-safe calls from Astro pages, and plain API routes (`src/pages/api/`) for streaming or when Svelte islands need JSON responses (Astro Actions return devalue-encoded bodies that can't be consumed by plain `fetch`).
- **Supabase access** degrades gracefully — every read helper in `src/lib/supabase/queries.ts` falls back to `src/data/blm-offices.json` when Supabase is unavailable, so the site runs with or without credentials.
- **Claude client** (`src/lib/llm/client.ts`) returns `null` and logs a warning when `ANTHROPIC_API_KEY` is missing; callers guard with `isLLMAvailable()`.
- **Path aliases** in `tsconfig.json`: `@components`, `@lib`, `@content`, `@data`, `@styles`, `@layouts`.
- **Environment variables** follow `.env.example`. Public vars use the `PUBLIC_` prefix; secrets (Anthropic, Supabase service role) stay server-side.
- **DaisyUI theme** "elevateut" is defined in `tailwind.config.mjs` with the brand palette (Terra Cotta, Sage, Summit Gold, Night Sky, Sandstone).

## Claude Integration

Two distinct LLM paths share the same SDK client and tool definitions:

1. **Packet generation** (`src/lib/llm/packet-generator.ts`, Astro Action + `/api/packet/generate`) — one-shot agentic pipeline that produces a tailored one-pager, EXPLORE Act alignment memo, cover letter, and suggested contacts. Cached in Supabase `generated_packets` with a 7-day TTL.
2. **Interactive chat** (`src/pages/api/chat/message.ts`, `ExploreChat.svelte`) — streaming multi-turn conversation with Claude about a specific BLM office. Uses Anthropic prompt caching (~42K tokens of reference docs cached), supports up to 3 tool rounds per message, and caps conversations at 20 user messages for cost control. Conversations persist in Supabase (`conversations`, `conversation_messages`) and are shareable at `/chat/[id]`.

Both paths use the same Claude `tool_use` toolkit in `src/lib/llm/tools.ts`:
- `query_blm_recreation_sites` — BLM ArcGIS search
- `query_blm_office_page` — scrapes BLM.gov office pages
- `get_engagement_history` — reads Supabase engagement log

Default model is `claude-sonnet-4-20250514` (see `DEFAULT_MODEL` in `src/lib/llm/client.ts`).

## Development

```bash
npm run dev          # Start Astro dev server (http://localhost:4321)
npm run build        # Production build
npm run preview      # Preview production build locally
npm run seed:offices # Seed Supabase blm_offices from src/data/blm-offices.json
npm run import:offices # Import office data from source files
```

Copy `.env.example` to `.env` and fill in Supabase + Anthropic keys to enable the full feature set. Without keys, the site still runs: offices render from static JSON, the chat and packet generator return a "not configured" message.

## Deployment

Production deploys to Vercel via `@astrojs/vercel`. The Astro config sets `site: "https://explorediscgolf.org"` and registers a sitemap with custom pages for the EXPLORE Act and case study routes. Long-running operations (chat, packet generation) should stay within Vercel's function timeout — the chat endpoint caps tool rounds at 3 per message.
