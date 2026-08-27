# P3.1 private document vault rollout

Status: code-ready and fail-closed behind `VITE_RESUME_SYNC_ENABLED`; production migration not yet applied.

## Release boundary

The web release is safe before the migration because browser-only storage remains the default and `VITE_RESUME_SYNC_ENABLED` is false unless its exact value is `true`. With the flag off, the app makes no vault request and shows the current browser-only product copy. The sync client also maps a missing table or denied permission to an unavailable state and never treats it as a successful sync.

Apply `supabase/migrations/20260827210349_add_private_document_vault.sql` through the normal Supabase migration workflow. If the operator uses SQL Editor, paste the complete checked-in file without editing individual policies. Do not use a service-role secret in a browser or test with real résumé content.

## Verification after applying

Run the following metadata checks in SQL Editor:

```sql
select relrowsecurity
from pg_class
where oid = 'public.private_documents'::regclass;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'private_documents'
order by grantee, privilege_type;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'private_documents'
order by cmd, policyname;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'private_documents'
order by indexname;
```

Expected results:

- `relrowsecurity` is `true`.
- `anon` has no table privileges; `authenticated` has only SELECT, INSERT, UPDATE, and DELETE.
- Four policies exist, one for each operation, and every policy binds `auth.uid()` to `user_id`; UPDATE has both `USING` and `WITH CHECK`.
- The unique account/type/key constraint and `private_documents_user_id_idx` exist.

Then use two disposable authenticated test accounts and synthetic text only:

1. User A enables sync and can read/update/delete only User A’s row.
2. User B cannot read or mutate User A’s row and receives no leaked row data.
3. An anonymous client cannot read, insert, update, or delete any row.
4. Updating with the current revision increments it by one.
5. Two clients editing the same starting revision produce an explicit conflict for the later save.
6. On a new browser, the synced copy is offered but not activated until the user chooses it.
7. “Stop syncing on this device” leaves the remote row; “Delete synced copy” removes the remote row and keeps the local browser copy.

Record the production project, migration timestamp, privilege output, two-user/anonymous results, and deployment SHA in the release checklist. Do not claim cross-device sync is operational until every check passes.

Only after those checks pass, set `VITE_RESUME_SYNC_ENABLED=true` for the intended Vercel environments and redeploy through GitHub/Vercel. Re-run desktop and mobile checks for enable, new-device restore, explicit conflict resolution, offline pending/retry, stop-on-device, local deletion, and remote deletion. Roll back the UI immediately by setting the flag to `false`; do not drop a table containing user documents as an incident response shortcut.
