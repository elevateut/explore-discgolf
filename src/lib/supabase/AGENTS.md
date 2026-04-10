# Supabase Layer — explore_discgolf

## Overview

Supabase provides three core services for this project:

1. **Postgres database** — all persistent application data (offices, engagement tracking, cached packets, user profiles).
2. **Auth** — email/password and OAuth sign-in via `auth.users`, with JWT-based sessions that flow into Row-Level Security policies.
3. **Real-time subscriptions** — (future) live updates to engagement status boards and collaborative editing.

## Tables

| Table | Purpose |
|---|---|
| `blm_offices` | Our maintained contact dataset of BLM field, district, and state offices. Includes location, contact details, and recreation planner information. Source-of-truth for the office directory and map. |
| `engagement_status` | Append-only log tracking per-office outreach progress through a defined pipeline: no-contact, initial-outreach, meeting-scheduled, meeting-completed, proposal-submitted, project-active, course-built. |
| `generated_packets` | Cached LLM-generated proposal packets (markdown + PDF URL). Storing these avoids redundant Claude API calls and their associated costs. Each record includes the prompt context so packets can be compared or regenerated with different parameters. |
| `profiles` | Extended user profile linked 1-to-1 with Supabase `auth.users`. Stores display name, organization, role (admin / ambassador / member / public), and state. |

## Row-Level Security (RLS)

RLS policies control data access at the database level, regardless of which client is used:

- **Public read on `blm_offices` and `engagement_status`** — anyone, including unauthenticated visitors, can view office data and outreach status. This powers the public-facing map and directory.
- **Authenticated write on `engagement_status`** — logged-in users (ambassadors, members, admins) can insert new status records to track outreach progress.
- **Admin-only write on `blm_offices`** — only users with `role = 'admin'` in the `profiles` table can insert, update, or delete office records.
- **Authenticated access on `generated_packets`** — only logged-in users can read or create cached packets.
- **Own-profile access on `profiles`** — users can read and update their own profile; admins can read all profiles.

Policy definitions are stubbed as comments in `schema.sql`. Uncomment and adjust as the auth flow is finalized.

## Schema Management

- **`schema.sql`** is the source of truth for database structure.
- Apply schema changes via the Supabase dashboard SQL Editor or the Supabase CLI (`supabase db push`).
- After modifying the schema, regenerate TypeScript types with `supabase gen types typescript` and update the interfaces in `queries.ts`.

## Client Architecture

| Context | Client | Key Used | RLS Active? |
|---|---|---|---|
| Browser components / client-side JS | `getSupabaseClient()` | `SUPABASE_ANON_KEY` | Yes |
| Astro SSR pages / API routes | `getSupabaseClient()` | `SUPABASE_ANON_KEY` | Yes |
| Server-side admin operations | `getSupabaseServiceClient()` (TODO) | `SUPABASE_SERVICE_ROLE_KEY` | No — bypasses RLS |

- The **anon key** is safe to expose in the browser because RLS policies enforce access control.
- The **service role key** must never reach the client. It is used only in server-side Astro endpoints or background jobs that need unrestricted database access (e.g., bulk-importing office data).

## Caching Strategy

The `generated_packets` table caches Claude API output to avoid regeneration costs. When a user requests a proposal packet for an office:

1. Check `generated_packets` for an existing recent packet.
2. If a fresh packet exists, serve it directly.
3. If stale or missing, generate a new packet via the Claude API, then store it.

A staleness threshold (TODO) will determine when cached packets should be regenerated.

## Future Tables

As the project grows, additional tables are planned:

- **Membership tiers** — tracking supporter levels and benefits.
- **Donation tracking** — recording contributions and linking to membership.
- **Partner organizations** — disc golf clubs, conservation groups, and other collaborators involved in specific office engagements.
