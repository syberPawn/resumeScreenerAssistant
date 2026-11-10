import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

// Only the server talks to the database, with the secret key.
// Row Level Security is on with no policies, so Supabase's public API cannot reach the table.

let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  client ??= createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
