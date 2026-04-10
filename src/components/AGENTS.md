# Components — Agent Context

This directory (`src/components/`) contains Astro and Svelte components for the explore-discgolf project.

## Hydration Strategy

Interactive components are **Svelte 5 islands** hydrated via Astro's `client:visible` directive. This means they only load and hydrate when scrolled into view, keeping initial page loads fast.

Example usage in an Astro page:

```astro
---
import BLMOfficeFinder from "@components/BLMOfficeFinder.svelte";
---
<BLMOfficeFinder client:visible />
```

## Key Components

### BLMOfficeFinder.svelte

The main interactive feature of the site. Combines:

- **Search input** — accepts zip codes or location names, geocodes them, and finds the nearest BLM field office
- **MapLibre GL map** — renders BLM administrative boundary polygons and office markers using data from ArcGIS tile/feature layers
- **Results list** — displays matching offices as clickable cards that fly the map to the selected office

### OfficeCard.svelte

Displays a single BLM office with:

- Office name and type badge (state / district / field / other)
- Contact information (address, phone, email, recreation planner)
- Engagement status badge showing where we are in the outreach pipeline
- "Build My Packet" CTA button for generating a tailored proposal packet

## Styling

All components use **DaisyUI v5** utility classes (`card`, `btn`, `badge`, `input`, etc.) for consistent styling that inherits from the project's custom "elevateut" theme defined in `tailwind.config.mjs`.

## Map Rendering

MapLibre GL JS handles map rendering. The map displays:

- BLM boundary polygons loaded from ArcGIS feature services
- Office point markers with client-side clustering
- Fly-to animations when selecting an office from search results
