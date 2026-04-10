# LLM Packet Generation Layer

This directory (`src/lib/llm/`) contains the Claude-powered engagement packet generation system. It uses the Anthropic SDK to create tailored BLM field office engagement materials for ElevateUT's disc golf advocacy work.

## Architecture

### What This Layer Does

Each engagement packet is a set of customized documents generated for a specific BLM field office:

- **Tailored one-pager** — Executive summary of the disc golf proposal for this specific office, referencing their recreation sites, nearby communities, and relevant EXPLORE Act provisions.
- **EXPLORE Act alignment memo** — Detailed policy memo showing how disc golf development aligns with P.L. 118-234, with section-by-section analysis tailored to this office's situation.
- **Cover letter with specific ask** — Professional letter addressed to the office's leadership requesting a meeting, with proper salutation and concrete next steps.
- **Suggested contacts with rationale** — Prioritized list of people to contact, with approach recommendations and reasons why each contact is relevant.

### Data Sources

Each packet is customized using data from multiple sources:

1. **Supabase** — Our contact database, engagement history, and cached packets.
2. **BLM ArcGIS REST Services** — Recreation sites, administrative boundaries, and office locations (see `src/lib/blm/`).
3. **UDisc** — Existing disc golf courses near the office to understand current infrastructure and identify gaps.
4. **BLM.gov** — Office web pages parsed for contact info, staff names, and current projects.

### Claude tool_use

Claude is given tools (`tool_use`) to query live data sources during packet generation. This allows the model to gather additional context as needed rather than requiring all data upfront. The tools are defined in `tools.ts`:

- `query_blm_recreation_sites` — Searches BLM ArcGIS for recreation sites near the office
- `query_blm_office_page` — Fetches and parses BLM.gov office pages for contacts
- `query_udisc_courses` — Searches for disc golf courses near coordinates
- `get_engagement_history` — Retrieves our Supabase engagement records

The generation loop is agentic: Claude may invoke multiple tools across several turns before producing the final structured output.

### Prompt Structure

- **System prompt** (`prompts.ts: SYSTEM_PROMPT`) — Establishes Claude's role as an advocacy packet generator and provides the EXPLORE Act legal framework with specific section references.
- **Section definitions** (`prompts.ts: PACKET_SECTIONS`) — Define what each packet section should contain, with detailed generation instructions.
- **User message** — Contains serialized office-specific data (contacts, recreation sites, disc golf courses, engagement history, population) plus the section generation instructions.

The universal packet templates from `src/content/` are incorporated into the system prompt so Claude understands the target format and tone.

## Files

| File | Purpose |
|---|---|
| `client.ts` | Configured Anthropic SDK client instance, reads `ANTHROPIC_API_KEY` from env |
| `prompts.ts` | System prompt, section definitions, and user message builder |
| `tools.ts` | Claude tool_use definitions and handler dispatch |
| `packet-generator.ts` | Main `generatePacket()` function — orchestrates the full pipeline |

## Entry Point

The Astro Action at `src/actions/generate-packet.ts` is the server-side entry point. It:

1. Checks Supabase for a cached packet (7-day TTL)
2. If cache miss, gathers office context and calls `generatePacket()`
3. Returns the packet to the client

The API key never reaches the browser. Astro Actions run exclusively on the server.

## Cost Control

Each packet generation costs approximately $0.03-0.15 depending on the number of tool_use rounds and output length. Packets are cached in the `generated_packets` Supabase table to avoid redundant API calls. The cache TTL is 7 days, and users can force regeneration when needed.

## Model

- **Model:** Claude (latest stable, currently `claude-sonnet-4-20250514`)
- **Max tokens:** 8192 (packets typically use 3,000-5,000)
- **Features:** `tool_use` for real-time data gathering during generation

## Downstream

Generated packets are consumed by:

- The Astro frontend for display in the office detail pages
- The PDF generation layer (`src/lib/pdf/`) which renders packets into printable/downloadable PDFs
