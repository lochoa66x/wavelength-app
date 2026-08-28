# P3.1 private document vault rollout

Status: production migration applied and metadata-verified on 2026-08-28; client remains fail-closed behind `VITE_RESUME_SYNC_ENABLED`, with Production exposure intentionally off pending behavioral verification.

## Release boundary

The web release is safe before the migration because browser-only storage remains the default and `VITE_RESUME_SYNC_ENABLED` is false unless its exact value is `true`. With the flag off, the app makes no vault request and shows the current browser-only product copy. The sync client also maps a missing table or denied permission to an unavailable state and never treats it as a successful sync.

The operator applied `supabase/migrations/20260827210349_add_private_document_vault.sql` to the production Supabase project. Future environments must apply the complete checked-in file through the normal migration workflow without editing individual policies. Do not use a service-role secret in a browser or test with real résumé content.

The Phase A2 client rejects an over-limit résumé instead of truncating it, catches thrown read/write/delete transport failures, and leaves the complete browser copy untouched on every invalid/offline path. Production must continue to omit the exact `VITE_RESUME_SYNC_ENABLED=true` value until the remaining gates below pass.

## Verification after applying

Run the checked-in aggregate verifier in SQL Editor:

`supabase/verification/20260828_private_document_vault_release_check.sql`

It is read-only and returns schema/security metadata only; it never reads document rows. The earlier detailed inspection queries remain useful when diagnosing a failed aggregate gate:

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

## Verified production evidence

Operator-supplied production SQL results on 2026-08-28 established:

- RLS is enabled.
- `anon` has zero table grants.
- `authenticated` has DELETE, INSERT, SELECT, and UPDATE grants.
- Four policies exist.
- `private_documents_user_id_idx` exists.
- The revision trigger exists.
- The ownership uniqueness/shape constraints and the `auth.users` cascade foreign key are present.

This is metadata verification, not a substitute for authenticated behavioral isolation. No real résumé content was used or inspected. The two-user/anonymous sequence below remains the release gate for Production exposure.

## Phase A2 verification evidence

- 15 focused vault/config/migration checks passed.
- The complete suite passed 482/482 tests.
- The production build transformed 2,011 modules and kept résumé/export dependencies in lazy chunks.
- The production dependency audit reported zero vulnerabilities.
- Signed-out production passed desktop and 390×844 checks with meaningful content, no runtime error overlay, no reported page error, no horizontal overflow, no cross-device control, and no `private_documents` request.
- Vercel environment inventory confirmed the sync flag is scoped to Development/Preview and absent from Production.

The connected Supabase integration did not grant this task permission to execute SQL or inspect advisors, so the new aggregate verifier could not be independently rerun from Codex. The prior operator-supplied SQL evidence above remains the authoritative metadata record. This tooling limitation does not replace the behavioral checks below.

Then use two disposable authenticated test accounts and synthetic text only:

1. User A enables sync and can read/update/delete only User A’s row.
2. User B cannot read or mutate User A’s row and receives no leaked row data.
3. An anonymous client cannot read, insert, update, or delete any row.
4. Updating with the current revision increments it by one.
5. Two clients editing the same starting revision produce an explicit conflict for the later save.
6. On a new browser, the synced copy is offered but not activated until the user chooses it.
7. “Stop syncing on this device” leaves the remote row; “Delete synced copy” removes the remote row and keeps the local browser copy.

Record the production project, migration timestamp, privilege output, two-user/anonymous results, and deployment SHA in the release checklist. Do not claim cross-device sync is operational until every check passes.

The flag may be enabled in an isolated Preview environment for this synthetic soak. Only after every check passes should `VITE_RESUME_SYNC_ENABLED=true` be added to Production and redeployed through GitHub/Vercel. Re-run desktop and mobile checks for enable, new-device restore, explicit conflict resolution, offline pending/retry, stop-on-device, local deletion, and remote deletion. Roll back the UI immediately by setting the flag to `false`; do not drop a table containing user documents as an incident response shortcut.
