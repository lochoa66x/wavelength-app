# P3.1 Phase A2 — private résumé sync release closure and Preview soak

## Mission

Take the existing opt-in, fail-closed base-résumé vault from code-ready to release-candidate quality without enabling it in Production. Preserve browser-only storage as the default and prove that no failure path can silently truncate, overwrite, expose, or delete a résumé.

## Safety boundary

- Sync only the signed-in person’s canonical base résumé.
- Never sync tailored résumés, cover letters, evidence maps, posting text, presentation choices, downloads, or export history.
- Never upload an existing browser résumé until the person explicitly enables sync.
- Never use a service-role key in browser code, test with real résumé data, log document rows, or expose vault contents in verification output.
- Never resolve a divergent revision with last-write-wins. Present an explicit keep-local/use-synced choice.
- Never treat unavailable schema, denied access, invalid payloads, thrown network errors, or malformed server rows as successful sync.
- Keep `VITE_RESUME_SYNC_ENABLED` absent from Production until every database, two-account, anonymous, browser, and rollback gate passes.

## Workstreams

1. Preserve the clean worktree and inventory the checked-in migration, client contract, UI states, storage preference, privacy documentation, and environment flag.
2. Replace silent résumé truncation with explicit character-count and encoded-payload validation. An over-limit document must remain complete locally, produce a clear non-destructive message, and make no vault write.
3. Catch thrown read/write/delete transport failures and reduce them to the existing offline/error states. The browser copy must remain authoritative and retryable.
4. Add deterministic client tests for insert, update, compare-and-swap conflict, delete, invalid/tampered documents, over-limit rejection, and thrown network failures.
5. Add a checked-in, read-only production verification query that reports only table/RLS/grant/policy/index/trigger/function metadata and never returns document rows.
6. Record operator-supplied production migration evidence accurately. Distinguish metadata checks already passed from the still-unclaimed two-user and anonymous behavioral test.
7. Run focused vault/config/migration tests, the complete test suite, a production build, production dependency audit, and signed-out browser checks.
8. Verify the Production deployment remains browser-only and makes no `private_documents` request. Validate Preview separately with synthetic accounts when approved.

## Acceptance gates

- Oversized résumé text is never sliced or uploaded, including multibyte content that exceeds the JSON payload byte limit before it reaches the character limit.
- Thrown network failures do not crash the UI or erase/change local content.
- Insert and revision-bound update/delete operations retain the ownership/type/key filters.
- The migration grants no access to `anon`, grants exactly CRUD to `authenticated`, has four own-user policies, a guarded UPDATE policy, the ownership uniqueness boundary, the user index, the revision trigger, and a security-invoker trigger function.
- Focused tests, full tests, build, and production dependency audit pass.
- Production has no `VITE_RESUME_SYNC_ENABLED=true` exposure and signed-out production remains healthy.
- Cross-device sync is not called production-ready until User A/User B/anonymous isolation, revision conflict, restore, stop-sync, and remote-delete behavior pass with synthetic data.

## Release decision

If code gates pass but authenticated behavioral verification is unavailable, ship only the fail-closed code with Production sync off and report the exact remaining operator gate. Do not weaken the contract to obtain a green release.
