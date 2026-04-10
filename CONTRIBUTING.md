# Contributing to EXPLORE Disc Golf

Thank you for your interest in contributing to EXPLORE Disc Golf! This is an open source project by [ElevateUT](https://elevateut.org), a 501(c)(3) nonprofit advocating for disc golf on BLM public lands. Whether you're a developer, designer, disc golfer, or policy advocate, there's a place for you here.

## Project Overview

EXPLORE Disc Golf is built with:

- **Astro 5** — static + server-rendered pages with file-based routing
- **Svelte 5** — interactive "island" components (maps, forms, dynamic UI)
- **Tailwind CSS v4 + DaisyUI v5** — utility-first styling with the custom "elevateut" theme
- **Supabase** — Postgres database, auth, and file storage
- **Anthropic Claude API** — AI-powered proposal packet generation
- **MapLibre GL JS** — interactive maps showing BLM land and offices

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Supabase project (free tier works fine)
- An Anthropic API key (for packet generation features)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/elevateut/explore-discgolf.git
cd explore-discgolf

# Install dependencies
npm install

# Copy environment template and fill in your keys
cp .env.example .env
# Edit .env with your Supabase and Anthropic credentials

# Start the development server
npm run dev
```

The site will be available at `http://localhost:4321`.

## Project Structure

```
src/
  components/    Astro and Svelte components
  content/       Markdown content collections (EXPLORE Act, resources, case studies, news)
  data/          Static data files (BLM office seed data)
  layouts/       Astro layout templates (BaseLayout)
  lib/           Server-side logic, organized by domain:
    blm/           BLM ArcGIS API client and types
    llm/           Anthropic Claude client and packet generation
    pdf/           PDF rendering from generated packet content
    supabase/      Supabase client, queries, and schema
  pages/         File-based routes (see src/pages/AGENTS.md)
  styles/        Global CSS and Tailwind configuration
public/          Static assets (images, fonts, downloads)
docs/            Project research and documentation
```

Each layer has its own `AGENTS.md` file explaining its purpose, interfaces, and implementation details. Start with the `AGENTS.md` in the directory you want to work on.

## How to Contribute

### Contributing Content

Content lives in `src/content/` as Markdown files organized into collections. Each collection has a Zod schema in `src/content/config.ts` that validates frontmatter.

1. Choose the right collection folder:
   - `explore-act/` — educational articles about the EXPLORE Act
   - `resources/` — downloadable templates, guides, talking points
   - `case-studies/` — stories of disc golf courses on BLM land
   - `news/` — project updates and milestones
2. Create a new `.md` file with valid frontmatter (see `src/content/AGENTS.md` for schema details)
3. Write the body in Markdown
4. Astro validates frontmatter at build time — run `npm run build` to check

### Contributing Code

- **Components** go in `src/components/`. Use Svelte for interactive elements that need client-side hydration; use Astro components for static rendering.
- **Server logic** goes in `src/lib/`, organized by domain (`blm/`, `llm/`, `pdf/`, `supabase/`).
- **Pages** go in `src/pages/`. See `src/pages/AGENTS.md` for routing structure.
- **Styles** use Tailwind CSS utility classes and DaisyUI component classes. Avoid writing custom CSS unless necessary.

### Contributing BLM Office Data

BLM office data lives in two places:

1. **Supabase** (`blm_offices` table) — the live data source
2. **`src/data/blm-offices.json`** — seed/fallback data for development

To update office data:
- For corrections or additions, update the seed JSON and note the source of the data
- For new offices, include at minimum: name, office type, state, and coordinates
- BLM office data comes from public GIS services at `https://gis.blm.gov/`

## Code Style

- **TypeScript** for all `.ts` files. Use strict mode (configured in `tsconfig.json`).
- **Svelte 5** with `$state` and `$effect` runes for reactive state.
- **DaisyUI classes** for UI components (btn, card, badge, navbar, etc.) rather than custom CSS.
- **Path aliases** are configured: `@components/`, `@lib/`, `@content/`, `@data/`, `@styles/`.
- **Environment variables**: public values use the `PUBLIC_` prefix. Server-only secrets do not.

## Pull Request Process

1. **Fork** the repository
2. **Create a feature branch** from `main` (e.g., `feat/add-idaho-case-study`)
3. **Make your changes** with clear, descriptive commits
4. **Run the build** locally: `npm run build`
5. **Open a PR** against `main` with:
   - A clear title describing the change
   - A description of what was changed and why
   - Screenshots if the change is visual
6. A maintainer will review your PR and may request changes

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold a welcoming, inclusive, and harassment-free environment for everyone.

## Questions?

Open a [GitHub Discussion](https://github.com/elevateut/explore-discgolf/discussions) or file an issue. We're happy to help you get started.
