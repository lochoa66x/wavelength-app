import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/20260827210349_add_private_document_vault.sql", import.meta.url), "utf8");

test("private document migration is explicit, own-user, and browser-deny-by-default", () => {
  assert.match(sql, /create table if not exists public\.private_documents/i);
  assert.match(sql, /user_id uuid not null references auth\.users \(id\) on delete cascade/i);
  assert.match(sql, /alter table public\.private_documents enable row level security/i);
  assert.match(sql, /revoke all on table public\.private_documents from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.private_documents to authenticated/i);
  assert.doesNotMatch(sql, /grant\s+[^;]+\s+to\s+anon/i);
  assert.equal((sql.match(/create policy/gi) || []).length, 4);
  assert.match(sql, /for select[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /for update[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /for delete[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)/i);
});

test("private document migration enforces revision and bounded schema contracts", () => {
  assert.match(sql, /unique \(user_id, document_type, document_key\)/i);
  assert.match(sql, /private_documents_user_id_idx/i);
  assert.match(sql, /document_type in \('base_resume'\)/i);
  assert.match(sql, /octet_length\(payload::text\) <= 100000/i);
  assert.match(sql, /char_length\(payload ->> 'resume_text'\) between 1 and 60000/i);
  assert.match(sql, /payload - 'schema_version' - 'resume_text' = '\{\}'::jsonb/i);
  assert.match(sql, /new\.revision := old\.revision \+ 1/i);
  assert.match(sql, /before insert or update on public\.private_documents/i);
  assert.match(sql, /security invoker/i);
  assert.doesNotMatch(sql, /security definer/i);
});
