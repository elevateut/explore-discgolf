/**
 * Supabase Client — explore_discgolf
 *
 * Provides a configured Supabase client for browser / SSR usage.
 * Reads connection details from environment variables exposed by Astro.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. " +
      "Copy .env.example to .env and fill in your Supabase project credentials.",
  );
}

/**
 * Returns the public (anon-key) Supabase client.
 * Safe for use in both client-side components and SSR pages — RLS policies
 * determine what data is accessible.
 */
export function getSupabaseClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}

// TODO: Add a getSupabaseServiceClient() that uses SUPABASE_SERVICE_ROLE_KEY
// for server-side operations that need to bypass RLS (e.g., admin writes to
// blm_offices, background jobs). This client must NEVER be exposed to the
// browser. Example:
//
// import { createClient } from "@supabase/supabase-js";
//
// export function getSupabaseServiceClient(): SupabaseClient {
//   const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
//   return createClient(supabaseUrl, serviceRoleKey);
// }
