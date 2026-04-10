-- =============================================================================
-- explore_discgolf — Supabase Postgres Schema
-- =============================================================================
-- Source of truth for database structure.
-- Apply via the Supabase SQL Editor or `supabase db push` with the CLI.
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- blm_offices
-- Our maintained dataset of BLM field / district / state offices.
-- ---------------------------------------------------------------------------
create table if not exists blm_offices (
  id                       uuid primary key default uuid_generate_v4(),
  blm_unit_code            text unique not null,
  name                     text not null,
  office_type              text,          -- e.g. 'field', 'district', 'state'
  state                    text,
  lat                      numeric,
  lng                      numeric,
  address                  text,
  phone                    text,
  email                    text,
  recreation_planner_name  text,
  recreation_planner_email text,
  website_url              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- engagement_status
-- Tracks per-office outreach progress (append-only history).
-- ---------------------------------------------------------------------------
create table if not exists engagement_status (
  id          uuid primary key default uuid_generate_v4(),
  office_id   uuid not null references blm_offices(id) on delete cascade,
  status      text not null check (
    status in (
      'no-contact',
      'initial-outreach',
      'meeting-scheduled',
      'meeting-completed',
      'proposal-submitted',
      'project-active',
      'course-built'
    )
  ),
  notes       text,
  updated_by  uuid,            -- references auth.users, nullable for system inserts
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- generated_packets
-- Cached LLM-generated proposal packets to avoid regeneration costs.
-- ---------------------------------------------------------------------------
create table if not exists generated_packets (
  id              uuid primary key default uuid_generate_v4(),
  office_id       uuid not null references blm_offices(id) on delete cascade,
  generated_by    uuid,          -- references auth.users
  prompt_context  jsonb,         -- input context sent to the model
  output_markdown text,
  output_pdf_url  text,
  created_at      timestamptz not null default now(),
  model_used      text           -- e.g. 'claude-opus-4-2025-04-16', 'claude-sonnet-4-2025-05-14'
);

-- ---------------------------------------------------------------------------
-- profiles
-- Extended user profile linked 1-to-1 with Supabase auth.users.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text,
  organization  text,
  role          text not null default 'public' check (
    role in ('admin', 'ambassador', 'member', 'public')
  ),
  state         text,
  created_at    timestamptz not null default now()
);

-- ===========================================================================
-- Row-Level Security (RLS) Policy Stubs
-- ===========================================================================
-- Enable RLS on every table first, then define policies.

alter table blm_offices       enable row level security;
alter table engagement_status  enable row level security;
alter table generated_packets  enable row level security;
alter table profiles           enable row level security;

-- ---- blm_offices ----
-- Public read: anyone (including anon) can view office data.
-- create policy "Public read access on blm_offices"
--   on blm_offices for select
--   using (true);

-- Admin-only write: only admin-role users may insert/update/delete.
-- create policy "Admin write access on blm_offices"
--   on blm_offices for all
--   using (
--     exists (
--       select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'
--     )
--   );

-- ---- engagement_status ----
-- Public read: anyone can view engagement status.
-- create policy "Public read access on engagement_status"
--   on engagement_status for select
--   using (true);

-- Authenticated write: logged-in users can insert new status records.
-- create policy "Authenticated insert on engagement_status"
--   on engagement_status for insert
--   with check (auth.uid() is not null);

-- ---- generated_packets ----
-- Authenticated read/write: only logged-in users interact with cached packets.
-- create policy "Authenticated access on generated_packets"
--   on generated_packets for all
--   using (auth.uid() is not null);

-- ---- profiles ----
-- Users can read their own profile; admins can read all.
-- create policy "Own profile read"
--   on profiles for select
--   using (id = auth.uid());

-- Users can update their own profile.
-- create policy "Own profile update"
--   on profiles for update
--   using (id = auth.uid());

-- ===========================================================================
-- Indexes (add as query patterns solidify)
-- ===========================================================================
create index if not exists idx_engagement_status_office
  on engagement_status(office_id, updated_at desc);

create index if not exists idx_generated_packets_office
  on generated_packets(office_id, created_at desc);

create index if not exists idx_blm_offices_state
  on blm_offices(state);
