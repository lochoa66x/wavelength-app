# P4.3C — dormant U.S. infrastructure production release

**Release protocol (2026-08-30):** ship the completed P4.3A market
infrastructure and P4.3B exposure gate while preserving Gigscapes as a
Canada-only public product. Record environment, commit, deployment, and live
verification evidence in the release handoff.

## Detailed execution prompt

Commit and deploy the completed U.S. market infrastructure with every U.S.
public and importer gate dormant. Treat this as a safety release, not a U.S.
launch. The production deployment must retain the current Canadian user story:
a visitor lands on Gigscapes, searches Canadian jobs and gigs, opens the
location editor, sees Canadian geography only, follows Canadian provider links,
and can continue through save, posting intake, résumé tailoring, workspace,
privacy, analytics, and export flows without encountering a U.S. claim or
choice.

### Release invariants

1. `VITE_US_MARKET_ENABLED` is explicit `false` in Vercel Production. Because
   Vite embeds public variables at build time, change the environment before
   the deployment and verify the resulting artifact rather than assuming a
   dashboard value changes an already-built client.
2. `JOB_MARKETS` remains `CA`. Do not enable U.S. scheduled ingestion.
3. Do not add, replace, reveal, or reuse any provider credential. In particular,
   do not fabricate `JOOBLE_US_API_KEY` and never expose credentials through a
   `VITE_` variable, command output, source file, browser bundle, or analytics.
4. Do not change database schema, RLS, public grants, cron schedules, résumé
   storage, evidence contracts, provider rate limits, or application behavior.
5. Do not delete staged inventory or user data. Exposure rollback and ingestion
   rollback are configuration changes, not destructive data operations.
6. Preserve the original Canadian source IDs and source scopes. U.S. market
   scoping may exist in code but must be unreachable through the dormant public
   boundary and disabled importer allowlist.

### Pre-commit verification

1. Inspect the complete worktree and prove all modified/untracked files belong
   to P4.3A, P4.3B, or this release record. Preserve unrelated user work if any
   is discovered.
2. Confirm the client uses one canonical fail-closed exposure parser and that
   the live criteria boundary forces blank, unsupported, Any-country, and saved
   U.S. preferences to Canada without deleting the persisted preference.
3. Confirm landing copy, location options, pilot notices, provider links, and
   Craigslist destinations all consume the same exposure decision.
4. Confirm server importers use the independent `JOB_MARKETS` allowlist,
   market-scoped IDs, market-scoped emergency stops, and server-only provider
   credentials.
5. Run `git diff --check`, the complete Node test suite, and the dormant
   production build. Stop before committing if any command fails.

### Commit and deployment

1. Record this prompt and the P4.3A/P4.3B verification evidence in the repository.
2. Stage only the reviewed P4.3 release files.
3. Commit with a message that describes the actual product boundary, such as
   `feat: add gated US market infrastructure`.
4. Confirm the commit contains no local environment file, token, provider key,
   résumé, posting, browser profile, screenshot, or build artifact.
5. Push `main` to the existing origin so the linked Vercel Git integration
   creates the production deployment. Do not create a second Vercel project or
   issue an unrelated manual deployment.
6. Wait for the exact commit deployment to become Ready and confirm the
   production alias resolves to that artifact.

### Production verification

Use a new real-browser session rather than a cached development tab. Verify the
production landing page and `/app` at desktop and 390×844 mobile widths.

- The landing hero and discovery sections describe Canada, not a U.S. pilot.
- Adzuna links resolve to `adzuna.ca`; Jooble links resolve to `ca.jooble.org`.
- The search-area country control contains Canada only and does not offer “Any
  country” or United States.
- A browser seeded with a saved U.S./California/San Francisco preference still
  displays and queries Canada while retaining the saved preference for a later
  approved release.
- No U.S. pilot notice or public U.S. source link appears.
- The page has meaningful content, no framework error overlay, no page/console
  errors, and no horizontal overflow.
- Canadian results, source attribution, listing links, and public privacy access
  remain present. Do not trigger a private AI request with real résumé data as a
  deployment smoke test.

Inspect the Vercel deployment and recent runtime errors after browser smoke. A
clean static-page smoke does not prove every authenticated private workflow;
retain the established automated suite as evidence for those boundaries and
record any remaining hands-on authenticated check separately.

### Stop and rollback conditions

Stop promotion or roll back if the build fails, the deployed commit does not
match, Canada search disappears, a U.S. choice or claim appears, a provider link
uses the wrong region, the browser shows an error overlay, or production logs
show a new release-related failure.

The immediate rollback is to ensure `VITE_US_MARKET_ENABLED=false` and redeploy
the last known-good production artifact. Keep `JOB_MARKETS=CA`. Do not delete
listings or user data during rollback.

## Acceptance evidence required in the release handoff

- Commit SHA and production deployment URL/status.
- Vercel environment-key presence and safe dormant values without revealing
  unrelated secrets.
- Complete test and build counts.
- Desktop/mobile browser results and error/overflow checks.
- Production runtime-error scan.
- Final Git cleanliness and `origin/main` alignment.
