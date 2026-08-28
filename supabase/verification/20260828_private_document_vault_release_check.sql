-- P3.1 private résumé vault release check.
-- Read-only: returns schema/security booleans and counts, never document rows.
with relation as (
  select c.oid, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'private_documents'
), grants as (
  select
    count(*) filter (where grantee = 'anon') as anon_grant_count,
    array_agg(privilege_type::text order by privilege_type::text)
      filter (where grantee = 'authenticated') as authenticated_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'private_documents'
), policies as (
  select
    count(*) as policy_count,
    count(*) filter (
      where roles = array['authenticated']::name[]
        and coalesce(qual, with_check, '') like '%auth.uid()%'
        and coalesce(qual, with_check, '') like '%user_id%'
    ) as own_user_policy_count,
    count(*) filter (
      where cmd = 'UPDATE'
        and qual like '%auth.uid()%'
        and with_check like '%auth.uid()%'
    ) as guarded_update_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'private_documents'
), indexes as (
  select
    count(*) filter (where indexname = 'private_documents_user_id_idx') as user_index_count,
    count(*) filter (where indexdef like '%UNIQUE%user_id, document_type, document_key%') as ownership_unique_index_count
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'private_documents'
), triggers as (
  select count(*) as revision_trigger_count
  from pg_trigger
  where tgrelid = to_regclass('public.private_documents')
    and tgname = 'private_documents_revision'
    and not tgisinternal
), revision_function as (
  select count(*) filter (where not p.prosecdef) as invoker_function_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'gigscapes_private'
    and p.proname = 'enforce_private_document_revision'
)
select
  exists (select 1 from relation) as table_exists,
  coalesce((select relrowsecurity from relation), false) as rls_enabled,
  grants.anon_grant_count,
  grants.authenticated_grants,
  grants.authenticated_grants = array['DELETE', 'INSERT', 'SELECT', 'UPDATE']::text[] as authenticated_grants_exact,
  policies.policy_count,
  policies.own_user_policy_count,
  policies.guarded_update_policy_count,
  indexes.user_index_count,
  indexes.ownership_unique_index_count,
  triggers.revision_trigger_count,
  revision_function.invoker_function_count
from grants, policies, indexes, triggers, revision_function;
