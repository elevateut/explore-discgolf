# Pages Layer — Astro File-Based Routing

This directory contains the Astro pages that define the site's URL structure. Astro uses file-based routing: each `.astro` file becomes a route.

## Routing Structure

| Route | File | Description |
|-------|------|-------------|
| `/` | `index.astro` | Homepage with hero, EXPLORE Act summary, BLM Office Finder, Get Involved, Latest News |
| `/explore-act` | `explore-act/index.astro` | EXPLORE Act educational content listing (from `explore-act` collection) |
| `/explore-act/:slug` | TODO | Individual EXPLORE Act article pages |
| `/offices/:id` | `offices/[id].astro` | Dynamic BLM office detail page (SSR) |
| `/resources` | `resources/index.astro` | Downloadable resources listing (from `resources` collection) |
| `/resources/:slug` | TODO | Individual resource detail pages |
| `/case-studies` | `case-studies/index.astro` | Case studies listing (from `case-studies` collection) |
| `/case-studies/:slug` | TODO | Individual case study pages |
| `/about` | `about.astro` | About ElevateUT and the initiative |

## Content Pages

Most listing pages render entries from Astro Content Collections defined in `src/content/config.ts`:

- **explore-act** — educational articles grouped by section (legislative, provisions, implementation)
- **resources** — downloadable materials grouped by category (template, one-pager, guide, talking-points)
- **case-studies** — disc golf courses on BLM land, sorted by date
- **news** — project updates and advocacy milestones (rendered on the homepage)

Each collection has a Zod schema that validates frontmatter at build time. See `src/content/AGENTS.md` for detailed schema documentation.

## Dynamic Routes

### `/offices/[id]`

The office detail page is the most complex page. It uses **server-side rendering** (the site is configured with `output: "server"`) to fetch office data from Supabase on each request. The page displays:

- Office name, type, state, address, phone, email
- Recreation planner contact (when available)
- Map with the office's administrative boundary polygon
- Recreation sites within the boundary (from BLM ArcGIS MapServer)
- Engagement status badge and history
- **"Build My Packet" button** — triggers the LLM packet generation flow

When getStaticPaths is needed (for SSG), the office IDs come from Supabase or the static `src/data/blm-offices.json` seed file.

## Svelte Islands

The homepage features the `BLMOfficeFinder` Svelte component hydrated with `client:visible`. This is the primary interactive element — a MapLibre GL map with office search and selection. Other pages are mostly static content rendered by Astro at request time.

## Layout

All pages use `BaseLayout` from `src/layouts/BaseLayout.astro`, which provides:

- HTML head with meta tags and Open Graph placeholders
- DaisyUI navbar with site navigation links
- Main content `<slot />`
- Footer with ElevateUT attribution and license info
