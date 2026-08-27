import { supabase } from "./supabase.js";

export async function generateCoverLetter(payload, { signal } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session expired. Sign in again to continue.");
  const response = await fetch("/api/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  if (!data.letter?.paragraphs?.length) throw new Error("The cover-letter generator returned an incomplete draft.");
  return data.letter;
}
