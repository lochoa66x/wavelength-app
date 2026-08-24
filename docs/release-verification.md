# Gigscapes release verification

Run this checklist from the repository root before committing a resume-export release. Do not deploy when any required check fails.

Treat this as an idempotent release procedure. First discover whether the feature commit is local-only, already on `origin/main`, or already deployed. Do not repeat a push or create a manual Vercel deployment when the Git-triggered production deployment already contains the intended SHA.

## Automated checks

1. Run focused canonical/template/export/tailoring tests:
   `node --test src/ResumeExperience.test.js src/resumeModel.test.js src/resumeParity.test.js src/resumeTemplateStorage.test.js src/resumeDocx.test.js src/resumePdf.test.js src/resumeStrategy.test.js tests/resumeQuality.test.js tests/tailoringEvidence.test.js tests/safeResumeFallback.test.js`
2. Run `npm run verify:exports`. This creates final DOCX/PDF fixtures for all six selector templates plus a preliminary ATS Core pair. Technical / Software and Admin / Customer Operations use realistic two-page fixtures. The verifier compares DOCX, selectable PDF, and plain text against the canonical manifest, checks package/PDF structure and reading order, rejects object/metadata artifacts, and exercises fresh/stale authorization and identity gates before removing temporary files.
3. Run `npm test` and record the pass/total count.
4. Run `npm run build -- --sourcemap` and record the transformed-module count and output chunk sizes. Confirm `resumeDocx`, `resumePdf`, `docx`, and `jspdf` remain lazy export chunks; investigate any new main-bundle growth.
5. Run `npm audit --json`. Do not apply a forced dependency upgrade as part of export verification.

Record the actual count emitted by each exact command. Historical counts are comparison evidence, not a substitute for rerunning the documented command.

For a guest/Auth release, also run:

1. Focused guest/Auth/security tests:
   `node --test src/accountActions.test.js src/appAccess.test.js src/authRoutes.test.js src/authSecurity.test.js src/guestPreferences.test.js src/listingQuery.test.js src/resumeStorage.test.js src/candidateEvidenceStorage.test.js tests/guestAuthArchitecture.test.js tests/protectedEndpoints.test.js tests/job-intake.test.js tests/listing-enrichment.test.js tests/tailor.test.js`
2. Re-run the focused export/readiness/evidence tests. Account gates must not weaken canonical posting verification, placeholder identity blocks, preliminary labels, deterministic serialization, evidence boundaries, or direct PDF checks.
3. Confirm the production build contains separate `resumeDocx` and `resumePdf` chunks and contains no `sb_secret_`, service-role key, résumé fixture, or pending-action private content.
4. Run `git diff --check` and record exact focused/full counts.

## Guest/Auth manual checks

Follow `docs/guest-auth-smoke-test.md` on desktop and a mobile viewport. Required outcomes include public search before Auth initializes, contextual account dialogs for every private action, consume-once magic-link continuation, invalid/expired-link recovery, sign-out returning to discovery, and controlled 401 responses for protected endpoints.

Before production smoke testing:

1. Review and apply `supabase/migrations/20260824015935_expose_public_listing_discovery.sql` through the normal Supabase migration workflow. Do not paste an edited variant into the Dashboard.
2. Confirm the project Site URL and exact callback allowlist entries described in `docs/auth-architecture.md`. Wildcards may be used for preview deployments only; use exact production URLs for production.
3. Confirm the magic-link email template honors `{{ .RedirectTo }}`. Do not enable email OTP or change templates as part of this release without a separate tested change.
4. Verify anonymous users can query `public_listings` but cannot read or write `profiles`; verify User A cannot select or update User B's profile.

## Real-file compatibility checks

Generate persistent fixtures with `npm run verify:exports -- --keep`; they are written below `tmp/export-verification` and are not release artifacts.

1. Open all generated DOCX fixtures in LibreOffice Writer. Confirm the name/contact header, template-specific safe headings, bullets, line wrapping, page breaks, and preliminary notice. Convert each file to PDF with LibreOffice.
2. Render every direct-PDF page and every LibreOffice-converted page to images. Inspect every page at full size for clipping, overlap, missing glyphs, stranded headings, excessive whitespace, or visual drift from the browser preview tokens.
3. Extract text independently from the direct PDF and LibreOffice-converted PDF. Confirm candidate identity, target title, experience, education, and languages are in reading order and that `[object Object]`, `undefined`, `null`, and private fixture metadata are absent.
4. Confirm the direct PDF text is selectable/searchable and is not a page-sized image.
5. Manually test the browser buttons for a verified posting, an incomplete posting, a stale ready flag paired with an incomplete posting, and a missing candidate identity. Direct download is primary; the print dialog should appear only when direct PDF creation fails.
6. On desktop and at 390 × 844, open the six-card selector using keyboard and pointer input. Verify focus visibility, `aria-expanded`/`aria-pressed` state, touch targets, immediate rerender without a network request, account/target persistence, and an unchanged `data-resume-content-hash` across template choices.
7. When available, repeat DOCX checks in Microsoft Word and Google Docs and run both formats through the ATS parsers supported by the release environment.

## Source and release checks

1. Review `git diff --check`, `git diff --stat`, and `git status --short`.
2. Confirm unrelated user changes are preserved and no files under `tmp`, `dist`, or generated verification directories are staged.
3. Confirm the intended commit is not already contained by `origin/main` before reporting deployment state.
4. Commit only after all locally available required checks pass. Do not push or deploy without explicit authorization.
5. After an authorized deployment, verify the production asset manifest, direct PDF download, preliminary labels, missing-identity block, and one verified final export. Record the deployment URL and commit SHA.
