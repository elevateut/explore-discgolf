# EXPLORE Disc Golf

**Open source toolkit for expanding disc golf on America's public lands.**

> Where the wild things fly.

The [EXPLORE Act](https://www.congress.gov/bill/118th-congress/house-bill/6492) (P.L. 118-234) created new authorities for recreation on BLM public lands. Disc golf fits those authorities unusually well. This project gives advocates the tools to make it happen — from educational resources to an interactive BLM office finder to LLM-powered engagement packet generation.

## What This Project Does

EXPLORE Disc Golf is three things in one:

1. **Educational site** — breaks down the EXPLORE Act, explains BLM recreation permitting, and documents case studies of disc golf on public lands
2. **BLM Office Finder** — interactive map that helps advocates locate their local BLM field office, view contact info, and track community engagement status
3. **AI-powered packet generator** — uses the Claude API to create customized proposal packets for each BLM office, complete with EXPLORE Act references, talking points, and a cover letter

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | [Astro 5](https://astro.build) | Static + SSR pages, file-based routing, content collections |
| Interactive UI | [Svelte 5](https://svelte.dev) | Client-side island components (maps, search, forms) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + [DaisyUI v5](https://daisyui.com) | Utility-first CSS with the custom "elevateut" theme |
| Database | [Supabase](https://supabase.com) | Postgres, auth, row-level security, file storage |
| AI | [Claude API](https://docs.anthropic.com) (`@anthropic-ai/sdk`) | LLM-powered proposal packet generation |
| Maps | [MapLibre GL JS](https://maplibre.org) | Interactive BLM land and office boundary maps |
| Data Source | [BLM ArcGIS REST Services](https://gis.blm.gov/) | Public GIS data for office boundaries and recreation sites |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/elevateut/explore-discgolf.git
cd explore-discgolf

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your Supabase URL/keys and Anthropic API key

# Start development server
npm run dev
```

The site runs at `http://localhost:4321`.

## Project Structure

```
src/
  components/    Svelte islands and Astro components
  content/       Markdown collections (explore-act, resources, case-studies, news)
  data/          Static seed data (BLM offices JSON)
  layouts/       Base layout with nav and footer
  lib/
    blm/         BLM ArcGIS API client and TypeScript types
    llm/         Anthropic Claude client and config
    pdf/         PDF generation from LLM packet output
    supabase/    Database client, typed queries, schema
  pages/         File-based routes (/, /explore-act, /offices/:id, etc.)
  styles/        Global CSS with Tailwind directives
public/          Static assets (images, downloads)
docs/            Research and reference documents
```

Each `lib/` subdirectory and key folder contains an `AGENTS.md` file with detailed documentation about that layer's purpose, interfaces, and implementation status.

## Contributing

We welcome contributions of all kinds — code, content, data, design, and advocacy experience. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup instructions, project structure guide, and PR process.

## Data Sources

This project uses publicly available data from:

- **BLM ArcGIS REST Services** (`gis.blm.gov`) — office boundaries, recreation sites, and administrative unit data
- **Anthropic Claude API** — AI-generated proposal content (requires your own API key)

No private or restricted government data is used.

## License

Licensed under the [Apache License 2.0](LICENSE).

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

---

**Built by [ElevateUT Disc Golf](https://elevateut.org)** — a 501(c)(3) nonprofit dedicated to growing disc golf through course development, community building, and public lands advocacy.
