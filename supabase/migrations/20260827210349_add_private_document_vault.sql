begin;

create schema if not exists gigscapes_private;

-- P3.1 keeps browser-only storage as the default. This table is reached only
-- after a signed-in person explicitly enables cross-device document sync.
create table if not exists public.private_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null check (document_type in ('base_resume')),
  document_key text not null check (
    char_length(document_key) between 1 and 120
    and document_key ~ '^[a-z0-9][a-z0-9._:-]*$'
  ),
  schema_version smallint not null default 1 check (schema_version = 1),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload @> '{"schema_version": 1}'::jsonb
    and jsonb_typeof(payload -> 'resume_text') = 'string'
    and char_length(payload ->> 'resume_text') between 1 and 60000
    and payload - 'schema_version' - 'resume_text' = '{}'::jsonb
    and octet_length(payload::text) <= 100000
  ),
  content_hash text not null check (content_hash ~ '^vault-[0-9a-f]{8}$'),
  revision bigint not null default 1 check (revision > 0),
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document_type, document_key)
);

create index if not exists private_documents_user_id_idx
on public.private_documents using btree (user_id);

create or replace function gigscapes_private.enforce_private_document_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
    new.created_at := now();
  else
    new.id := old.id;
    new.user_id := old.user_id;
    new.document_type := old.document_type;
    new.document_key := old.document_key;
    new.schema_version := old.schema_version;
    new.created_at := old.created_at;
    new.revision := old.revision + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function gigscapes_private.enforce_private_document_revision() from public, anon, authenticated;

drop trigger if exists private_documents_revision on public.private_documents;
create trigger private_documents_revision
before insert or update on public.private_documents
for each row execute function gigscapes_private.enforce_private_document_revision();

alter table public.private_documents enable row level security;
revoke all on table public.private_documents from public, anon, authenticated;
grant select, insert, update, delete on table public.private_documents to authenticated;

drop policy if exists "private documents select own rows" on public.private_documents;
create policy "private documents select own rows"
on public.private_documents
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "private documents insert own rows" on public.private_documents;
create policy "private documents insert own rows"
on public.private_documents
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "private documents update own rows" on public.private_documents;
create policy "private documents update own rows"
on public.private_documents
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "private documents delete own rows" on public.private_documents;
create policy "private documents delete own rows"
on public.private_documents
for delete
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.private_documents is
  'Opt-in, user-owned private document vault. Browser-only storage remains the product default.';

commit;
