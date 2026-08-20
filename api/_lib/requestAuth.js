import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../../src/supabaseConfig.js";

export function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] || null;
}

export async function authenticateSupabaseRequest(token) {
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { user, supabase };
}
