# P3.1 private document vault rollout

Status: released to Production on 2026-08-29 after the migration, aggregate metadata verifier, isolated Preview soak, synthetic two-account isolation test, anonymous denial, conflict handling, new-device restore, offline recovery, stop-on-device, and remote-delete gates all passed. The client remains fail-closed behind `VITE_RESUME_SYNC_ENABLED` for rollback.

## Release boundary

The web release is safe before the migration because browser-only storage remains the default and `VITE_RESUME_SYNC_ENABLED` is false unless its exact value is `true`. With the flag off, the app makes no vault request and shows the current browser-only product copy. The sync client also maps a missing table or denied permission to an unavailable state and never treats it as a successful sync.

The operator applied `supabase/migrations/20260827210349_add_private_document_vault.sql` to the production Supabase project. Future environments must apply the complete checked-in file through the normal migration workflow without editing individual policies. Do not use a service-role secret in a browser or test with real résumé content.

The Phase A2 client rejects an over-limit résumé instead of truncating it, catches thrown read/write/delete transport failures, and leaves the complete browser copy untouched on every invalid/offline path. Production held the flag at `false` until the Phase A3 release evidence below passed, then deployed the exact `VITE_RESUME_SYNC_ENABLED=true` value.

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

The aggregate verifier was rerun independently in the authenticated production SQL Editor on 2026-08-29. It returned `table_exists=true`, `rls_enabled=true`, zero anonymous grants, the exact authenticated DELETE/INSERT/SELECT/UPDATE grants, four own-user policies, one guarded UPDATE policy, both required indexes, the revision trigger, and the security-invoker revision function. No document row or real résumé content was read.

## Phase A3 release-closure evidence

- 18 focused vault/config/migration/privacy checks passed, followed by the complete 510/510 test suite.
- Privacy configuration verification passed for Voynich Tech; résumé and cover-letter export verification passed; the production dependency audit reported zero vulnerabilities.
- The production build transformed 2,447 modules and preserved lazy résumé/export chunks.
- Preview deployment `dpl_Cx6oJNLYx2hM3sMpZYEdHdAgEKRH` baked `VITE_RESUME_SYNC_ENABLED=true`. A signed-out Preview showed the normal guest workspace and emitted no `private_documents` request.
- Two disposable authenticated accounts and synthetic text proved anonymous read/insert denial, cross-account read/update/delete denial, own-account create/read/update/delete, monotonic revisions, stale-write and stale-delete conflicts, new-device restore, and no leaked row data.
- The actual Preview UI offered the remote copy without silently adopting it, restored it on explicit choice, preserved the local copy when sync stopped, and exposed both conflict decisions. Choosing the account copy restored it; choosing the device copy advanced the remote revision and returned the UI to synced state.
- A 390×844 Preview check showed the complete multi-device card and résumé intake without horizontal overflow or browser errors. A live offline edit remained local and changed the workspace to `Sync pending`; reconnection retried it and returned the workspace to `On`.
- The synthetic remote document was deleted and a follow-up read returned missing. No real résumé, email, token, account ID, or document content was recorded in the evidence output.
- Production deployment `dpl_8DX6GX6TrfiTV7pnq4WyHx91o5HW` rebuilt commit `92348241cba81b94ba33ae4337bfc62d47a66c9f` with the flag enabled, reached READY, and was aliased to `gigscapes.com`. The live privacy disclosure, baked flag, signed-in restore path on an isolated deployment origin, and first ten minutes of error logs all passed.

Then use two disposable authenticated test accounts and synthetic text only:

1. User A enables sync and can read/update/delete only User A’s row.
2. User B cannot read or mutate User A’s row and receives no leaked row data.
3. An anonymous client cannot read, insert, update, or delete any row.
4. Updating with the current revision increments it by one.
5. Two clients editing the same starting revision produce an explicit conflict for the later save.
6. On a new browser, the synced copy is offered but not activated until the user chooses it.
7. “Stop syncing on this device” leaves the remote row; “Delete synced copy” removes the remote row and keeps the local browser copy.

The production project, migration timestamp, privilege output, two-user/anonymous results, deployment SHA, and rollback boundary are recorded above. Cross-device sync is operational for the canonical base résumé only; every deferred document type remains browser-local.

The flag was enabled in an isolated Preview first and added to Production only after every gate passed. Roll back the UI by setting the Production flag to `false` and redeploying; do not drop a table containing user documents as an incident-response shortcut.
