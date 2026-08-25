# Gigscapes release checklist

Updated: 2026-08-25

This is the high-level release gate. Detailed commands and artifact procedures live in `docs/release-verification.md`.

## Released prerequisite — P1.4

- [x] Guest-first application behavior implemented.
- [x] Supabase `public_listings` production migration applied.
- [x] Anonymous public-listing query returned valid rows.
- [x] Four production privilege checks passed.
- [x] Production guest/authenticated smoke verification reported complete.
- [x] Production release SHA documented in Git history.

Do not reapply the P1.4 migration or change production Auth/database settings during P2.1 verification.

## P2.1 Phase A implementation

- [x] Versioned canonical ResumePackage and legacy adapter.
- [x] Separate facts, evidence, classification/career strategy, presentation, and authorization.
- [x] Frozen ResumeContentPlan, ResumeRenderPlan, and content manifest.
- [x] ATS Core, SAP Functional, Project Leadership, and Career Transition registry templates.
- [x] Deterministic recommendation and SAP functional/technical distinction.
- [x] Account/target-scoped template override with no AI request.
- [x] Shared browser/DOCX/PDF/text section and item plan.
- [x] Hash-bound, expiring final/preliminary export authorization.
- [x] Responsive and accessible template selector.
- [x] Architecture and extension documentation.

## P2.1 Phase B1 implementation

- [x] Technical / Software (`technical-software-v1`) registry template.
- [x] Admin / Customer Operations (`admin-customer-operations-v1`) registry template.
- [x] Deterministic target-plus-evidence recommendation with stable reason code and strength.
- [x] Functional-SAP-to-developer evidence-gap safeguard and explicit ABAP-development path.
- [x] Admin exclusions for sales, marketing/communications, finance/accounting, and director/executive roles.
- [x] Shared six-card selector in feed and bring-your-own-job flows.
- [x] Account/target persistence and factual content-hash parity across all six templates.
- [x] Realistic two-page Technical and Admin fixtures for DOCX/PDF verification.

## P2.1 Phase B2 implementation

- [x] Skilled Trades / Field Services (`skilled-trades-field-services-v1`) canonical registry template.
- [x] Legacy trades stored IDs adapt to the new family without a second content model or backfill.
- [x] Deterministic target-plus-verified-hands-on recommendation and six conservative profile states.
- [x] Posting credentials remain requirements, never candidate evidence; missing regulated credentials block strong positioning.
- [x] SAP Plant Maintenance, software maintenance, IT support, maintenance-planning, and category-only false positives are excluded.
- [x] Credential-aware section order, one-page apprentice fixture, and two-page experienced field-service fixture.
- [x] Shared seven-card selector, account/target persistence, and factual content-hash parity across all seven templates.

## P2.1 Phase B3 implementation

- [x] Marketing & Communications (`marketing-communications-v1`) canonical registry template.
- [x] Creative & Design (`creative-design-v1`) canonical registry template.
- [x] Candidate-only direct/adjacent evidence gates with explicit transition, evidence-gap, and incomplete-posting outcomes.
- [x] Posting metrics, platforms, design tools, portfolio claims, and leadership language remain requirements rather than candidate facts.
- [x] Product-management, business-growth, telecommunications, digital-transformation, technical-design, process-design, posting-only-tool, and category-only false positives are covered.
- [x] Safe HTTP(S) portfolio treatment reuses canonical professional links and never promotes a generic social profile.
- [x] Shared nine-card selector, account/target persistence, alias migration, and factual content-hash parity across all nine templates.
- [x] Two-page direct Marketing/Creative fixtures plus one-page Marketing-transition and Creative-adjacent fixtures.

## Required local verification before commit

- [x] Focused canonical/template/export/tailoring tests pass with exact count recorded.
- [x] `npm run verify:exports` passes for all nine templates, the apprentice fixture, both B3 adjacent fixtures, and preliminary gating.
- [x] Full `npm test` passes with exact count recorded.
- [x] Production build passes and keeps DOCX/PDF libraries lazy.
- [x] `npm audit --json` is reviewed without forced upgrades.
- [x] All direct PDF pages are rendered and visually inspected.
- [x] All LibreOffice-converted DOCX pages are rendered and visually inspected when LibreOffice is available.
- [x] Direct and converted PDF text extraction is checked.
- [x] Desktop and 390 × 844 selector/browser behavior is verified.
- [x] `git diff --check` passes.
- [x] No files from `tmp`, `dist`, screenshots, or rendered QA directories are staged.
- [x] Only task-owned files/hunks are staged.

## P2.1 Phase A local verification record

- Focused tests: 52 passed, 0 failed.
- Full suite: 267 passed, 0 failed.
- Export verifier: 10 files across four final templates plus one preliminary pair; 5 PDF pages, 136 selectable text items, manifest parity and stale-readiness protection passed.
- Production build: 1,975 modules transformed; `resumeDocx`, `resumePdf`, `docx`, and `jspdf` remained lazy chunks. The existing main-chunk size warning remains.
- Dependency audit: 0 critical, 1 high, and 1 moderate finding, both confined to the current Vite/esbuild development toolchain. The available remediation is a Vite 8 major upgrade and was intentionally not forced into this feature release.
- Real-file QA: all five direct PDFs and all five LibreOffice-converted DOCX PDFs rendered as complete one-page fixtures; every page was inspected. Direct and converted text retained identity, ordered headings/content, and no serialization artifacts.
- Browser QA: signed-out `/app` loaded public listings with no console errors. The real four-template selector passed at 1,440 × 900 and 390 × 844, exposed four accessible buttons, switched immediately, and had no horizontal overflow or console errors.
- Microsoft Word and Google Docs were not available locally; LibreOffice provided the Word-compatible verification engine.

## P2.1 Phase A production release record — 2026-08-24

- Feature and deployed-code SHA: `6ccaaf27ea0a12a16f5e9fbe23892b6840ed9c13` (`Implement occupation-aware resume templates`).
- GitHub: `main` and `origin/main` matched the feature SHA before this release-record update; the push was a normal non-force push.
- Production: <https://gigscapes.com> and <https://www.gigscapes.com> resolve to the Git-triggered Vercel production deployment <https://wavelength-hwasq7ben-luisochoasap-2007s-projects.vercel.app> (`dpl_BDXkNLiQuV2TJ7UEkCkfM4TaeCYo`). The deployment is `READY`, `PROMOTED`, and bound to the feature SHA.
- Automated gates rerun: focused suite 52 passed/0 failed; full suite 267 passed/0 failed; `git diff --check` passed; production build transformed 1,975 modules and retained lazy DOCX/PDF chunks.
- Export verifier: 10 files, four final templates, one preliminary pair, five direct-PDF pages, 136 selectable text items, canonical manifest parity, verified final-export gating, and stale-readiness blocking all passed.
- Real-file QA: all five DOCX files opened through LibreOffice and rendered to complete one-page images; all five direct PDFs rendered with selectable text. DOCX text, direct-PDF text, and LibreOffice-converted PDF text had identical normalized word sequences for every fixture. No `[object Object]`, `undefined`, `null`, JSON fragments, internal evidence metadata, duplicate sections, clipping, overlap, orphan headings, or empty trailing pages were found. The preliminary label appeared only on the preliminary pair.
- Signed-out production smoke: `/app` loaded without an Auth redirect; public inventory loaded; SAP Functional and plumber searches returned sensible results; Ontario and workplace filters applied; load-more expanded results from 19 to 47; Save, Tailor, URL import, screenshots, and pasted-text actions showed action-specific account dialogs. Desktop and 390 × 844 had no horizontal overflow. Dialog focus stayed contained and Escape dismissed it. No browser console errors appeared.
- Authenticated production smoke: an existing authorized production session and an existing tailored SAP result were confirmed without exposing credentials. The open result was created by a pre-release browser bundle, so a fresh Phase A template-selector/switch/export run remains pending explicit action-time approval to transmit the saved résumé and posting through the production tailoring service. Local component/browser-fixture, recommendation, persistence, no-network switching, export-parity, and accessibility checks are green.
- Production diagnostics: the one-hour Vercel error-level and 5xx scans returned no entries. No new ResumePackage, template, persistence, export, guest-initialization, or Auth-session error was observed.
- Known non-blocking limitations: Microsoft Word and Google Docs were not available; LibreOffice was the compatibility engine. `npm audit` reports one high and one moderate Vite/esbuild development-tool finding; remediation requires a Vite 8 major upgrade and remains outside this release.
- Final release-record SHA: the commit containing this section. The final report and Vercel deployment metadata provide its immutable Git SHA after the documentation-only commit is created.
- Next pipeline item: P2.1 Phase B occupation-family templates.

## P2.1 Phase B1 local verification record — 2026-08-24

- Focused tests: 62 passed, 0 failed.
- Full suite: 277 passed, 0 failed.
- Export verifier: 14 files across six final templates plus one preliminary pair; 9 direct-PDF pages, 268 selectable text items, manifest parity, verified-final gating, stale-readiness protection, and two-page B1 assertions passed.
- Production build: 1,971 modules transformed; `resumeDocx`, `resumePdf`, `docx`, and `jspdf` remained lazy chunks. The existing main-chunk size warning remains.
- Dependency audit: 0 critical, 1 high, and 1 moderate finding, both confined to the existing Vite/esbuild development toolchain. The available fix requires a Vite 8 major upgrade and remains outside B1 scope.
- Real-file QA: all seven direct PDFs and all seven LibreOffice-converted DOCX PDFs were rendered; all 18 pages were inspected. Both B1 fixtures were exactly two pages in each engine. Canonical tokens were present in direct PDFs, DOCX and LibreOffice-converted text had sequence parity, and no `[object Object]`, `undefined`, `null`, clipping, overlap, orphan heading, or blank trailing page was found.
- Browser QA: the isolated real-component harness passed at 1,440 × 900 and 390 × 844 with six accessible cards, 88-pixel minimum mobile card height, keyboard activation, correct `aria-expanded`/`aria-pressed` state, zero selector-triggered resource requests, stable factual content hash, no horizontal overflow, and no console/page errors.
- Microsoft Word and Google Docs were unavailable locally; LibreOffice provided the Word-compatible verification engine.
- Repository state at B2 start: B1 commit `4e278ff1ebd2cb42561c8eb4b7ad74ba9aa47ac2` was present on both `main` and `origin/main`. Production deployment state was not re-verified during the local B2 scope.

## P2.1 Phase B2 local verification record — 2026-08-24

- Focused tests: 72 passed, 0 failed.
- Full suite: 287 passed, 0 failed.
- Export verifier: 18 files across seven final templates, one apprentice pair, and one preliminary pair; 12 direct-PDF pages, 370 selectable text items, manifest parity, verified-final gating, stale-readiness protection, two-page experienced-template assertions, one-page apprentice assertion, and heading/content page cohesion passed.
- Production build: 1,971 modules transformed; `resumeDocx`, `resumePdf`, `docx`, and `jspdf` remained lazy chunks. The existing main-chunk size warning remains.
- Dependency audit: 0 critical, 1 high, and 1 moderate finding, both confined to the existing Vite/esbuild development toolchain. The available fix requires a Vite 8 major upgrade and remains outside B2 scope.
- Real-file QA: all nine direct PDFs and all nine LibreOffice-converted DOCX PDFs were rendered; all 24 pages were inspected. The experienced Skilled Trades fixture was exactly two pages and the apprentice fixture exactly one page in both engines. Direct and converted text retained canonical order with no `[object Object]`, `undefined`, `null`, metadata leakage, clipping, overlap, stranded heading, or blank trailing page.
- Browser QA: the real seven-card selector and preview passed at 1,440 × 900 and 390 × 844 with visible keyboard focus, native button semantics, accurate labels and `aria-pressed` state, immediate pointer switching, stable factual content hash, zero selector-triggered fetch/XHR calls, no horizontal overflow, and no console errors.
- Accessibility: all nine current DOCX fixtures reported zero high-, medium-, or low-severity findings; browser buttons exposed visible focus and accessible selection state.
- Microsoft Word and Google Docs were unavailable locally; LibreOffice provided the Word-compatible verification engine.
- Release state at verification time: local commit only. Phase B2 was not pushed or deployed during that pass; commit `4431e27e3803a908da912d6f6fa51af39f9d2fc5` is now present on `origin/main`.

## P2.1 Phase B3 local verification record — 2026-08-24

- Preflight: clean `main` at `4431e27e3803a908da912d6f6fa51af39f9d2fc5`, matching `origin/main`; the committed B2 Skilled Trades / Field Services work was preserved.
- Focused canonical/template/export/tailoring suite: 84 passed, 0 failed.
- Full suite: 299 passed, 0 failed.
- Export verifier: 26 files across nine selector templates, one apprentice pair, Marketing transition and Creative adjacent pairs, and one preliminary pair; 18 direct-PDF pages, 545 selectable text items, canonical manifest parity, verified-final gating, stale-readiness rejection, two-page experienced-template assertions, and one-page concise-fixture assertions passed.
- Production build: 1,971 modules transformed; `resumeDocx`, `resumePdf`, and `jspdf` remained lazy export chunks. The existing main-chunk size warning remains.
- Dependency audit: 0 critical, 1 high, and 1 moderate finding, both confined to the existing Vite/esbuild development toolchain. The available fix requires a Vite 8 major upgrade and remains outside B3 scope.
- Real-file QA: the 13 direct PDFs and 13 LibreOffice-converted DOCX PDFs produced 36 rendered pages, all inspected at full size. A marketing project-boundary defect was corrected with compact-project keep-with-next logic and regression tests; the corrected two-page marketing DOCX and direct PDF were re-rendered and all four replacement pages inspected, for 40 total page inspections. Direct and converted text had normalized token parity for all 13 fixture pairs, with no `[object Object]`, `undefined`, `null`, metadata leakage, clipping, overlap, stranded heading, orphan project bullet, broken URL, or blank trailing page.
- Browser QA: the real nine-card selector and preview passed on 1,440 × 900 and 390 × 844 layout surfaces. All nine choices were reachable, the mobile minimum card height was 88 pixels, pointer and keyboard/Enter activation worked with visible focus, exactly one `aria-pressed` selection remained, preview IDs and accent colors changed immediately, the canonical content hash stayed `resume-bicg0d`, and selector-triggered fetch/XHR and page errors remained zero. Chrome-extension-only warnings were excluded from application findings.
- Accessibility: the 13 retained DOCX fixtures plus the corrected marketing DOCX reported zero high-, medium-, or low-severity findings. Browser buttons exposed native semantics, descriptive labels, visible focus, and accessible selection state.
- Compatibility limits: Microsoft Word, Google Docs, and an external ATS parser were unavailable. LibreOffice conversion plus independent PDF.js extraction and visual inspection supplied the local compatibility evidence.
- Release state at local verification time: the verified B3 feature commit was local-only. It was subsequently released through the normal GitHub/Vercel path; see the production record below.

## P2.1 Phase B3 production release record — 2026-08-24

- Feature and deployed-code SHA: `63f1ea7b4d467394e2378cad1031d9cb7e2bac8d` (`Implement marketing and creative resume templates`). A final pre-push fetch confirmed `origin/main` at the B2 baseline with the feature commit exactly one commit ahead and no remote divergence. The normal non-force push completed, and GitHub `main`, local `main`, and `origin/main` then matched the feature SHA.
- Production deployment: <https://wavelength-dpqgj775q-luisochoasap-2007s-projects.vercel.app> (`dpl_9ezyZwnSa48bqnH2Zg1gTAQq3L63`) was created from the Git push, reached `READY` in 16 seconds, reported no alias error, and carried the `gigscapes.com`, `www.gigscapes.com`, and `main` aliases. Vercel metadata binds it to the exact feature SHA.
- Release gates rerun immediately before push: 84 focused canonical/template/export/tailoring tests passed; 91 focused guest/Auth/security tests passed; the full suite passed 299/299; `git diff --check` passed; the source secret scan passed; and the production bundle contained no secret value, résumé fixture identity, or private export artifact.
- Export/build gates: `npm run verify:exports` passed for 26 files, all nine templates, 18 direct-PDF pages, 545 selectable text items, canonical-manifest parity, fresh final-export gating, stale-readiness rejection, and the documented one-/two-page assertions. The production build transformed 1,971 modules and kept `resumeDocx`, `resumePdf`, and `jspdf` lazy. Vercel completed its build without an error; only the existing install-script and large-chunk warnings appeared.
- Dependency audit: 0 critical, 1 high, and 1 moderate finding, both confined to the existing Vite/esbuild development toolchain. The available remediation requires a Vite 8 major upgrade and remains outside B3 scope.
- Signed-out production smoke at a measured 1,265 × 720 viewport: `/app` remained public with no Auth redirect or browser-console error. On-site Canada searches returned 32 SAP, 14 plumber, 42 marketing, and 7 graphic-designer matches. Ontario plus Remote filters applied. Load-more increased rendered listing URLs from 40 to 45 with 45 unique URLs and no duplicate. Sample provider and listing links were HTTPS, opened in a new tab, used `noreferrer`, and retained visible attribution. Save and Tailor showed action-specific private-account dialogs, moved focus to the email field, and closed with Escape.
- Responsive production limitation: the connected production browser exposed a fixed 1,265 × 720 viewport and rejected an exact 390 × 844 navigation surface. No production-mobile result is claimed. The same nine-card component and preview had already passed the local 390 × 844 acceptance surface in the committed B3 verification record.
- Authenticated production smoke: the existing Chrome profile remained signed in, `/app` loaded public SAP results, and the local-only résumé workspace reported `Ready`. No previously tailored draft was available after reload, so selector switching and DOCX/PDF download could not be exercised without making a new production AI request. No new AI request was made and no credential, résumé, or posting content was exposed.
- Production diagnostics: the one-hour Vercel runtime-error query returned no clusters; the deployed-SHA 5xx grouping was empty; error/fatal runtime logs were empty; and the signed-out browser console was empty.
- Final release-record SHA: the commit containing this section. The final report and Vercel deployment metadata provide its immutable Git SHA after this documentation-only commit is created.

## P2.2 public landing-page implementation

- [x] `/` renders the public landing page; `/app` remains the existing guest-first workspace.
- [x] Browse, URL, screenshot, and pasted-text CTAs reuse verified app routes and allowlisted account actions.
- [x] Router state contains only the action name, is consumed through the centralized account gate, and is cleared with `replace` to prevent replay.
- [x] The landing page contains no AI/private-profile/export request and no private candidate fixture.
- [x] All nine template families are read from the canonical registry and switch locally without AI.
- [x] Landing and app routes are separate lazy chunks; DOCX/PDF libraries remain export-only chunks.
- [x] Responsive layouts, semantic structure, modal mobile navigation, focus behavior, contrast, metadata, and internal links are verified.
- [x] No Supabase schema, RLS, grant, migration, Auth-provider, dependency, pricing, analytics, or tracking change is included.

## P2.2 local verification record — 2026-08-24

- Preflight: clean `main` at `22127f4b6e06a79c3a625dddf9df4236c7ab9df6`, matching `origin/main`. The prompt's deployed-SHA line omitted one `d`; the repository value was treated as authoritative and no divergence was silently accepted.
- Focused landing tests: 16 passed, 0 failed. Combined landing/routing/account-action/Auth-architecture slice: 53 passed, 0 failed.
- Existing regressions: résumé/export/tailoring 84 passed, 0 failed; guest/Auth/security 91 passed, 0 failed; full suite 315 passed, 0 failed (299 baseline plus 16 landing tests).
- Export verifier: 26 files, all nine templates, 18 direct-PDF pages, 545 selectable text items, manifest parity, verified-final gating, and stale-readiness rejection passed.
- Production build: 1,977 modules transformed. The route-shared entry is 423.89 kB/124.68 kB gzip, the landing route is 23.06 kB/6.71 kB gzip, landing CSS is 20.71 kB/4.69 kB gzip, and the canonical landing-intent/template chunk is 64.21 kB/18.78 kB gzip. The pre-change main bundle was 648.16 kB/187.74 kB gzip. `resumeDocx` (5.07 kB), `resumePdf` (8.66 kB), and `jspdf` (390.46 kB) remain separate lazy chunks and are not referenced by the landing route.
- Browser/responsive QA: the complete signed-out page was inspected at 390×844, 360×800, 768×1024, and 1440×900. Each surface had one H1, eight main sections, nine template controls, no duplicate IDs, no missing hash targets, and no horizontal overflow. The first browse CTA ended at 648 px and 587 px at the two mobile sizes, respectively.
- Interaction QA: browse opened the public workspace without a dialog. URL, screenshot, and pasted-text CTAs opened the correct contextual private-account dialog. Template pointer switching, FAQ expansion, visible focus, mobile-menu open/select, forward/reverse focus wrapping, Escape dismissal, and focus restoration passed on the real components.
- Accessibility: the semantic scan found named controls/links, valid heading order, header/nav/main/footer landmarks, no missing image alternatives, no positive tabindex, no empty links, and no invalid ARIA references after correction. Key text/background contrast ranged from 4.65:1 to 17.49:1.
- Browser console inspection showed Vite/React development information only and no application error. The landing production modules contain no `fetch`, Supabase table query, AI endpoint, tailoring endpoint, private fixture, or export-library import; browser request-list inspection was unavailable in the connected in-app browser, so that narrower source/build evidence is recorded instead of claiming an automated network pass.
- Dependency audit remains the known non-blocking baseline: 0 critical, 1 high Vite finding, and 1 moderate esbuild finding; remediation requires a Vite 8 major upgrade and is outside P2.2.
- Tooling limitations: the connected browser ignored browser-zoom shortcuts, so an exact native 200% zoom result is not claimed. The stricter 360/390 responsive reflow, long headline/copy wrapping, and zero-overflow checks passed. Signed-in landing navigation was not exercised because no safe local signed-in session was available. Production/social-crawler checks remain release work.
- Release state: one local commit only after the recorded gates pass. Nothing is pushed or deployed in this P2.2 implementation phase.

Do not commit while a required check is failing. Do not push or deploy without separate authorization.

## Next pipeline step

- Complete P2.3 Phase A discovery-integrity and source-health work without weakening the released landing, guest/Auth, posting-readiness, or export boundaries.
- When an existing post-release tailored draft is safely available, complete the deferred authenticated nine-template switch and DOCX/PDF production-export smoke without creating an otherwise unnecessary AI request.

## P2.2 production release — 2026-08-25

- Feature SHA `5ba2a10d30ec203209c2c31df29281d01468a49f` was pushed to `main`; local `main` and `origin/main` matched with zero divergence.
- The Git-triggered production deployment <https://wavelength-o84ics9ty-luisochoasap-2007s-projects.vercel.app> (`dpl_9fBCYHFm8u32WRXNjuJYvaXrEVz3`) reached `READY`, carried the `gigscapes.com`, `www.gigscapes.com`, and `main` aliases, and its build log bound it to commit `5ba2a10`.
- Vercel transformed 1,977 modules and completed the production build/deploy without an application error. `/`, `/app`, and `/gigscapes-og.svg` returned HTTP 200 with the expected HTML/SVG content types.
- Signed-out production smoke verified the landing H1 and metadata, nine template controls, public browse navigation, live public listings, and contextual URL/screenshot/pasted-text account dialogs.
- A mobile production viewport verified zero horizontal overflow, nine template controls, modal navigation, Escape dismissal, and focus restoration. The browser console was empty; the deployment returned no runtime error/fatal entries and no 5xx entries during the verification window.

## P2.3 Phase A search and feed quality

- [x] Public description snippets participate in discovery scoring but remain separate from verified full-posting content.
- [x] Recognized queries collect a bounded initial candidate window before deterministic relevance/freshness/ID ordering.
- [x] Stable row IDs and canonically equivalent URLs cluster conservatively without modifying original outbound URLs.
- [x] Initial clustering prefers employer-direct representatives; later-page merging preserves the already displayed representative and card state.
- [x] Source attribution records every clustered provider, while similar listings with distinct URLs remain distinct.
- [x] Search status copy distinguishes relevant, deduplicated candidate, rendered, and database source-row counts.
- [x] Invalid or missing posting dates remain unknown and sort below valid equally relevant dates.
- [x] Cron health responses/logs whitelist numeric metrics and sanitized failure categories with success/partial/failure/skipped state.
- [x] Empty-batch preservation, partial-source isolation, safe upserts, stable ingestion IDs, pruning safeguards, and complete-description protection remain intact.
- [x] No Supabase migration, RLS/grant change, credential, dependency, feed, analytics, or new Vercel cron schedule is included.

## P2.3 Phase A local verification record — 2026-08-25

- Preflight: clean `main` at `5ba2a10d30ec203209c2c31df29281d01468a49f`, matching `origin/main`; all subsequent edits in this record belong to the preserved P2.3 worktree.
- Focused search/feed/source-health suite: 108 passed, 0 failed. Focused guest/Auth/security suite: 91 passed, 0 failed. Focused résumé/export/tailoring suite: 84 passed, 0 failed. Full suite: 325 passed, 0 failed.
- Export verifier: 26 files, all nine templates, 18 direct-PDF pages, 545 selectable text items, manifest parity, verified-final gating, stale-readiness rejection, and the documented one-/two-page assertions passed.
- Final sourcemapped production build: 1,978 modules transformed. The route-shared entry is 423.89 kB/124.68 kB gzip, the app route is 165.83 kB/47.02 kB gzip, and the landing route is 23.06 kB/6.70 kB gzip. `resumeDocx` (5.07 kB), `resumePdf` (8.66 kB), and `jspdf` (390.46 kB) remain separate lazy chunks.
- Signed-out local production-preview searches returned 52 SAP, 52 SAP FICO, 34 Java, 24 C++, 25 C#/.NET, 32 React, and 3 SaaS sales results. Every result surface separately reported relevant, deduplicated, rendered, and database source-row counts; the inspected outbound URL sets contained zero duplicate URLs.
- Search ordering placed strong title matches first in the inspected scenarios. Save and Tailor opened action-specific account dialogs; public browsing remained available. At 390×844 the search and result surface had no horizontal overflow, and the browser console had zero warnings or errors.
- `git diff --check` passed. A value-aware scan found no actual server credential or private résumé fixture in the generated JavaScript or source maps; documented `.env.example` placeholders were excluded from credential classification.
- Dependency audit remains the known non-blocking baseline: 0 critical, 1 high Vite finding, and 1 moderate esbuild finding. The available remediation requires a Vite 8 major upgrade and remains outside this release.
- No Supabase schema, RLS/grant, Auth-provider, dependency, or Vercel schedule change is required. Production release and deployed-SHA verification remain the next release steps.

## P2.3 Phase B multi-posting and export-trust hardening — 2026-08-25

- [x] Source-scoped request coordination aborts and invalidates stale screenshot, URL, paste, and tailoring requests.
- [x] Source changes clear only job-specific brief, conflicts, evidence target, tailored result, status, and errors; the base résumé and reusable account evidence are preserved.
- [x] A completed result offers **Tailor another posting**, and a non-screenshot source never inherits a screenshot-confirmation gate.
- [x] Export readiness is explicit outside the résumé preview, and preliminary/final DOCX/PDF content contains no warning banner.
- [x] DOCX error copy distinguishes stale chunks, invalid authorization/content, browser download, serialization, and unknown failures without exposing résumé content.
- [x] The mobile landing drawer is opaque, viewport-height, independently scrollable, keyboard-modal, and free of hero collisions at 390×844.
- [x] The `/app` wordmark is a flat 44-pixel home link with transparent background, no pill radius, and no shadow on desktop and mobile.

### Local verification record

- Preflight: clean `main` at `2880251098dce74e587b8f408cde5feae26efb7b`, matching `origin/main`; all subsequent edits belong to this release.
- Focused intake/export/landing suite: 130 passed, 0 failed. Full suite: 340 passed, 0 failed.
- Export verifier: 26 files across all nine templates, 18 direct-PDF pages, manifest parity, verified-final gating, stale-readiness rejection, and documented one-/two-page assertions passed.
- Real-file QA: 13 DOCX fixtures converted through LibreOffice into 18 PDF pages; all 18 converted pages and all 18 direct-PDF pages were inspected at full size. No clipping, overlap, missing glyphs, warning banners, `[object Object]`, `undefined`, `null`, private fixture metadata, or empty-text PDF was found.
- Browser QA: local desktop `/` and `/app` had no horizontal overflow, one landing H1, a public signed-out workspace, a contextual tailoring account gate, a flat 44-pixel app wordmark, and zero console warnings/errors. Local 390×844 QA verified an opaque full-height mobile drawer with focus on Close and the flat app wordmark without overflow.
- Production build: 1,980 modules transformed. `resumeDocx` (4.79 kB), `resumePdf` (8.62 kB), and `jspdf` (390.46 kB) remain separate lazy chunks; landing and app remain route-level chunks.
- Source gates: `git diff --check` passed; no generated `tmp`/`dist` files are tracked. Bundle matches are limited to documented test placeholders, the upstream Supabase secret-key detector, and jsPDF internal `private_` identifiers.
- Dependency audit remains the known non-blocking baseline: 0 critical, 1 high Vite finding, and 1 moderate esbuild finding. The available fix is a Vite 8 major upgrade and is outside this release.
- Microsoft Word and Google Docs were unavailable locally. A fresh authenticated two-posting production run and live authenticated DOCX/PDF downloads require an approved existing session and are not claimed by local automation.
- Release state: the feature SHA is the commit containing this record. Push, Git-triggered Vercel deployment, exact-SHA binding, production smoke, runtime-error scan, and 5xx scan are the remaining release steps.
