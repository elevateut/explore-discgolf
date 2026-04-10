/**
 * Supabase Client — explore_discgolf
 *
 * Provides configured Supabase clients for browser/SSR usage.
 * Returns null when env vars are missing so the site runs without Supabase.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _warned = false;

function warnOnce(msg: string) {
  if (!_warned) {
    console.warn(`[supabase/client] ${msg}`);
    _warned = true;
  }
}

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

let _anonClient: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/**
 * Returns the public (anon-key) Supabase client, or null when env vars are
 * missing. Callers must handle the null case — query helpers in queries.ts
 * fall back to static data. The client is cached after first creation.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_anonClient) return _anonClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    warnOnce(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY — Supabase disabled. " +
        "Copy .env.example to .env and fill in your credentials.",
    );
    return null;
  }
  _anonClient = createClient(supabaseUrl, supabaseAnonKey);
  return _anonClient;
}

/**
 * Returns a service-role Supabase client for server-side operations that
 * bypass RLS (admin writes, background jobs). Returns null when key is
 * missing. This client must NEVER be exposed to the browser. Cached after
 * first creation.
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (_serviceClient) return _serviceClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    warnOnce("Missing Supabase credentials — service client unavailable.");
    return null;
  }
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    warnOnce("Missing SUPABASE_SERVICE_ROLE_KEY — service client unavailable.");
    return null;
  }
  _serviceClient = createClient(supabaseUrl, serviceRoleKey);
  return _serviceClient;
}
