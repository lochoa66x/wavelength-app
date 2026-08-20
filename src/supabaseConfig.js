const viteEnv = import.meta.env || {};
const serverEnv = typeof process === "undefined" ? {} : process.env;

function readEnv(...names) {
  for (const name of names) {
    const value = viteEnv[name] || serverEnv[name];
    if (value?.trim()) return value.trim();
  }
  return "";
}

// Publishable keys are safe in browser bundles. Authorization still belongs in
// Supabase RLS policies and trusted server-side token validation.
export const SUPABASE_URL = readEnv("VITE_SUPABASE_URL", "SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY = readEnv(
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
);

export function getSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
  };
}
