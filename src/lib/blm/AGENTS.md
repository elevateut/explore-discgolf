# BLM Data Layer — Agent Context

This directory (`src/lib/blm/`) handles all Bureau of Land Management data fetching and GIS integration for the explore-discgolf project.

## Architecture

BLM ArcGIS REST services are queried **client-side** directly from the browser. No authentication is required; all endpoints are public MapServer query APIs that return JSON.

### Key Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Admin Boundaries | `https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer` | Office locations (layer 0) and administrative boundaries (layer 3) |
| Recreation | `https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recreation/MapServer` | Recreation sites (layer 1) and activity associations |

### Disc Golf Activity

Disc golf is **ActivityID 100024** in BLM's recreation database. Critically, most disc golf records have `ShowActivity=0`, meaning they are **hidden from BLM's own public recreation search UI**. Our queries bypass this filter to surface all disc-golf-related sites.

## Data Sources

- **GIS data** (office locations, boundaries, recreation sites) comes from the ArcGIS endpoints above via `client.ts`.
- **Office contact data** (phone, email, recreation planner names) is **not** available from GIS services. This data is maintained in our Supabase database and seeded from `src/data/blm-offices.json`.
- `blm-offices.json` is **seed data only**; production reads from Supabase.

## Office Counts

There are approximately **220 total BLM offices** across the system:

- 12 state offices
- 50 district offices
- 128 field offices
- 30 other (national, center, etc.)

## Map Integration

The interactive map (`BLMOfficeFinder.svelte`) uses **MapLibre GL JS** to render:

- BLM administrative boundary polygons (loaded from ArcGIS feature layers)
- Office point markers with clustering
- User location and search results

## Files

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces for BLM offices, recreation sites, boundaries, and engagement status |
| `client.ts` | Async functions for querying BLM ArcGIS REST endpoints |
