# AGENTS.md — explore-discgolf

## Overview

Open source project by ElevateUT (501c3) advocating for disc golf on BLM public lands under the EXPLORE Act. Licensed under Apache-2.0.

## Tech Stack

- **Framework:** Astro 5 with SSR (Node adapter, standalone mode)
- **Styling:** Tailwind CSS v4 + DaisyUI v5 (custom "elevateut" theme)
- **Interactive UI:** Svelte 5 islands (client-side components via `@astrojs/svelte`)
- **Database:** Supabase (auth, Postgres, storage)
- **AI:** Anthropic Codex API (`@anthropic-ai/sdk`)
- **Maps:** MapLibre GL JS for BLM land and course mapping

## Project Structure

```
src/
  components/   — Astro and Svelte components (@components)
  content/      — Markdown content collections (@content)
  data/         — Static data files and schemas (@data)
  layouts/      — Astro layout templates
  lib/          — Shared utilities, Supabase client, API helpers (@lib)
  pages/        — File-based routes and Astro Actions
  styles/       — Global CSS and Tailwind imports (@styles)
public/         — Static assets (images, fonts, favicons)
docs/           — Project documentation
```

## Conventions

- **Content** lives in `src/content/` as Markdown collections managed by Astro Content Collections.
- **Interactive features** (maps, forms, dynamic UI) are Svelte island components hydrated with `client:*` directives.
- **Server logic** uses Astro Actions for type-safe server endpoints.
- **Path aliases** are configured in `tsconfig.json`: `@components`, `@lib`, `@content`, `@data`, `@styles`.
- **Environment variables** follow the `.env.example` template. Public vars use the `PUBLIC_` prefix.
- **DaisyUI theme** "elevateut" is defined in `tailwind.config.mjs` with brand colors.

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```
