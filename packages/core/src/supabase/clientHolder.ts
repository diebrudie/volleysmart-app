import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

export function setSupabaseClient(c: SupabaseClient<Database>): void {
  client = c;
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    throw new Error(
      "Supabase client not initialized. Call setSupabaseClient() at app boot."
    );
  }
  return client;
}
