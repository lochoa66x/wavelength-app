import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./supabaseConfig.js";

const { url, publishableKey } = getSupabaseConfig();

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
});
