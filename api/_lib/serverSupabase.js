import { createClient } from "@supabase/supabase-js";

export function createServerSupabaseClient() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const secret = String(process.env.SUPABASE_SECRET_KEY || "").trim();
  if (!url || !secret) throw new Error("Server database credentials are not configured");

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
