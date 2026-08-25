# Gigscapes release verification

Run this checklist from the repository root before committing a resume-export release. Do not deploy when any required check fails.

Treat this as an idempotent release procedure. First discover whether the feature commit is local-only, already on `origin/main`, or already deployed. Do not repeat a push or create a manual Vercel deployment when the Git-triggered production deployment already contains the intended SHA.

## Automated checks

1. Run focused canonical/template/export/tailoring tests:
   `node --test src/ResumeExperience.test.js src/resumeModel.test.js src/resumeParity.test.js src/resumeTemplateStorage.test.js src/resumeDocx.test.js src/resumePdf.test.js src/resumeStrategy.test.js tests/resumeQuality.test.js tests/tailoringEvidence.test.js tests/safeResumeFallback.test.js`
2. Run `npm run verify:exports`. This creates final DOCX/PDF fixtures for all nine selector templates, an apprentice Skilled Trades / Field Services pair, Marketing transition and Creative adjacent pairs, and a preliminary ATS Core pair. Technical / Software, Admin / Customer Operations, experienced Skilled Trades / Field Services, Marketing & Communications, and Creative & Design use realistic two-page fixtures; the apprentice and both adjacent B3 fixtures must remain one page. The verifier compares DOCX, selectable PDF, and plain text against the canonical manifest, checks package/PDF structure, reading order, heading-to-first-content page cohesion, and compact-project pagination, rejects object/metadata artifacts, and exercises fresh/stale authorization and identity gates before removing temporary files.
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

## Public landing-page checks

For P2.2 and later landing changes:

1. Run the focused landing suite: `node --test src/landing/landingPage.test.js`.
2. Run the combined route/account-boundary slice: `node --test src/landing/landingPage.test.js tests/guestAuthArchitecture.test.js src/authRoutes.test.js src/accountActions.test.js`.
3. Re-run the documented 84-test résumé/export/tailoring suite, the 91-test guest/Auth/security suite, `npm test`, `npm run verify:exports`, and `npm run build -- --sourcemap`. Counts may grow, but no established test may regress.
4. Inspect the production chunk graph. `/` and `/app` must remain lazy route chunks; the landing route must not reference `resumeDocx`, `resumePdf`, `docx`, `jspdf`, tailoring, job-intake, or private profile calls.
5. Scan the production bundle for secret values and private candidate fixtures. A literal `sb_secret_` detector inside the upstream Supabase SDK is not a credential; inspect the surrounding text before classifying a match. Export-artifact strings such as `[object Object]` inside third-party runtime code are not a substitute for the real export verifier.
6. At 390×844, 360×800, 768×1024, and 1440×900, inspect the entire page and record viewport/client geometry, document width, H1 count, template count, internal hash targets, and the first CTA position. Do not accept a sample-only screenshot.
7. Walk the signed-out interactions: browse stays public; URL, screenshot, and pasted-text intake show their existing contextual account gate; template switching stays local; FAQ details open; mobile navigation traps focus, wraps in both directions, closes with Escape and selection, and restores focus.
8. Inspect console errors and failed 4xx/5xx requests. If the connected browser cannot expose a request list, record that limitation and provide separate source/chunk evidence; do not call it an automated network pass.
9. Run a semantic accessibility scan and manually check key default/hover/focus/selected color pairs. Verify one H1, logical heading order, landmarks, named controls, valid ARIA references, no positive tabindex, visible focus, reduced-motion CSS, and mobile touch targets.
10. Validate title, description, canonical, robots, Open Graph, Twitter, favicon, image dimensions, and truthful basic structured data. Test the deployed social preview with real crawlers during the release step.
11. Record native 200% zoom, signed-in navigation, and reduced-motion emulation when the available browser supports them. If it does not, name the missing capability and do not report it as passed.

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
6. On desktop and at 390 × 844, open the nine-card selector using keyboard and pointer input. Verify focus visibility, `aria-expanded`/`aria-pressed` state, touch targets, immediate rerender without a network request, account/target persistence, and an unchanged `data-resume-content-hash` across template choices.
7. When available, repeat DOCX checks in Microsoft Word and Google Docs and run both formats through the ATS parsers supported by the release environment.

## Source and release checks

1. Review `git diff --check`, `git diff --stat`, and `git status --short`.
2. Confirm unrelated user changes are preserved and no files under `tmp`, `dist`, or generated verification directories are staged.
3. Confirm the intended commit is not already contained by `origin/main` before reporting deployment state.
4. Commit only after all locally available required checks pass. Do not push or deploy without explicit authorization.
5. After an authorized deployment, verify the production asset manifest, direct PDF download, preliminary labels, missing-identity block, and one verified final export. Record the deployment URL and commit SHA.

## Latest verified release — P2.1 Phase B3

On 2026-08-24, feature SHA `63f1ea7b4d467394e2378cad1031d9cb7e2bac8d` passed the automated, export, build, source, Git-divergence, signed-out production, and Vercel diagnostics gates and was released through the normal GitHub-triggered production deployment. Deployment `dpl_9ezyZwnSa48bqnH2Zg1gTAQq3L63` reached `READY`, was bound to the exact feature SHA, and had no alias error. The immutable counts and observed production outcomes are recorded in `docs/release-checklist.md`.

The production browser connector was fixed at 1,265 × 720 and did not provide the requested 390 × 844 production viewport; the committed local B3 browser acceptance covers that exact responsive surface. An existing authenticated session was available, but no existing tailored output survived reload. The authenticated selector/export smoke therefore remains deferred rather than making a new AI request solely for release verification. These are explicit coverage limitations, not claimed passes.
