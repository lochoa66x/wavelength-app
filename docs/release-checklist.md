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

## P2.1 universal design expansion

- [x] Five original universal styles: Classic Ledger, Modern Signal, Compact Focus, Bold Impact, and Studio Editorial.
- [x] Universal styles inherit occupation-aware section order and headings without changing canonical facts, evidence, or readiness.
- [x] Application-safe and networking-forward choices are labeled honestly in the selector and landing preview.
- [x] Browser preview, DOCX, direct PDF, plain text, persistence, and export verification use the same 14-choice registry.
- [x] Healthcare, education, finance, logistics, hospitality, community services, engineering, and plumbing fixtures preserve factual parity across all five styles.
- [x] All styles remain single-column, searchable/selectable, photo-free, sidebar-free, table-free, and skill-meter-free.
- [x] New-template text contrast meets or exceeds 4.5:1 and the five generated DOCX fixtures report zero accessibility-audit findings.

## Required local verification before commit

- [x] Focused canonical/template/export/tailoring tests pass with exact count recorded.
- [x] `npm run verify:exports` passes for all 14 choices, the apprentice fixture, both B3 adjacent fixtures, and preliminary gating.
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

## P3.6 privacy and data-transparency local verification — 2026-08-27

- [x] Public privacy notice, provider disclosures, storage boundaries, retention/deletion language, and user choices implemented without placeholder operator claims.
- [x] Scope-specific job-intake and tailoring acknowledgements implemented with focus containment, Escape/cancel, focus restoration, and input preservation.
- [x] Current-account browser-private-data deletion uses an explicit allowlist and never clears the origin, authentication session, saved jobs, search preferences, Supabase records, or another account's data.
- [x] Vercel Web Analytics package installed with query/fragment stripping and auth-callback suppression; no custom résumé/posting telemetry added.
- [x] Private API responses and logs hardened against caching, referrer leakage, raw content, upstream response bodies, credentials, and AI response logging.
- [x] Focused privacy/intake/tailoring/API suite: 60 passed, 0 failed.
- [x] Full suite: 447 passed, 0 failed.
- [x] Export verifier: 40 files, 16 templates, 25 direct-PDF pages, 715 selectable text items; manifest parity, final gating, and stale-ready rejection passed.
- [x] Production build passed and retained lazy DOCX/PDF/jsPDF chunks.
- [x] Production dependency audit passed with zero known vulnerabilities; Vite/esbuild development-only findings are recorded for a separate major upgrade.
- [x] Desktop and 390×844 privacy/app/sign-in browser QA passed with zero automated accessibility violations and no application page errors. Transparent gradient surfaces received manual contrast review.
- [x] Database scope reviewed: this release changes no Supabase schema, policy, grant, function, or stored data. Checked-in RLS/grant migrations were reviewed; live Supabase Security and Performance advisors remain unavailable to the current connector and are a documented verification limitation rather than a database-change blocker.
- [x] Production and Preview privacy configuration set and locally verified with operator Voynich Tech, contact `hello@voynichtech.com`, jurisdiction Canada, and minimum age 16. The configuration gate and real-value browser rendering passed without a placeholder warning.
- [x] Privacy feature commit `6165c508c9c490e9b804ac198f5519ce7ee11124` and direct-route hotfix `132f8d0cbecb0e188ff902e8e637a9a2968a7fa6` were pushed normally to `main`. The initial production smoke found `/privacy` returning Vercel 404; an explicit SPA rewrite and regression test fixed the failure before release closure.
- [x] Corrected Git-triggered Vercel deployment <https://wavelength-cwxx9xy8s-luisochoasap-2007s-projects.vercel.app> (`dpl_2f23ACnmAaJqCXhY7s4sNLyUCE4D`) reached `READY`, carried the `gigscapes.com`, `www.gigscapes.com`, and `main` aliases, and its GitHub deployment status was bound exactly to runtime SHA `132f8d0cbecb0e188ff902e8e637a9a2968a7fa6`.
- [x] Production smoke passed direct `/privacy`, `/`, `/app`, and `/sign-in` navigation. The privacy page rendered Voynich Tech, `hello@voynichtech.com`, Canada, and age 16 with no placeholder warning or horizontal overflow at desktop and 390×844. The signed-out search-result Tailor action opened its private-account dialog, confirming the main transition remained wired. Browser errors and console output were empty.
- [x] Production `/api/job-intake` and `/api/tailor` probes returned the expected unauthenticated 401 and retained `Cache-Control: no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`. Deployment error and `status:5xx` log queries returned no entries.
- [x] This release-record follow-up is documentation-only and does not alter the verified runtime behavior above.

## P3.7 Phase A evidence-first cover-letter local verification — 2026-08-27

- [x] Preflight began from clean `main` at `5f62c0a2b5a368d0d8279720a45d205349d1cb85`, matching `origin/main`; no interrupted or user-owned change was present.
- [x] The authenticated `/api/cover-letter` endpoint accepts only a trusted listing or reviewed custom posting, the browser-saved résumé, confirmed candidate evidence, the existing application assessment, and bounded voice/length controls. It performs one bounded evidence repair, returns `no-store` private responses, and logs only coarse outcome/count/duration metadata.
- [x] Direct, Warm, and Confident voices plus Short and Standard lengths alter presentation only. Generic flattery, invented motivation, relationships, availability, contacts, metrics, skills, licences, equivalence claims, placeholders, and user edits that introduce any uncited substantive capability are rejected deterministically.
- [x] Each paragraph carries its purpose, exact candidate-evidence citations, exact posting-requirement citations, generated wording, current verified wording, and a stable content hash. Edit/recheck, paragraph regeneration, restore, remove, stale-source rejection, and target/account-scoped browser storage leave the canonical résumé and application assessment unchanged.
- [x] Browser preview, copied text, DOCX, and selectable PDF consume one canonical plan and one fresh export authorization. Posting, identity, evidence-integrity, preliminary/final, and stale-hash decisions remain consistent with résumé readiness; guidance stays outside exported files.
- [x] Focused cover-letter, storage, private-API, Auth, and privacy tests: 18 passed, 0 failed. Full regression: 461 passed, 0 failed, skipped, cancelled, or todo.
- [x] Cover-letter export verifier: two DOCX files, two PDFs, two one-page PDF outputs, 492 selectable text tokens, final and preliminary gates passed, stale authorization covered by the model tests, and no `[object Object]`, placeholder, metadata, or readiness-warning artifact was emitted.
- [x] Existing résumé export verifier remained green: 40 files, 16 templates, 25 PDF pages, 715 selectable text items, canonical manifest parity, verified-final authorization, and stale-ready rejection passed.
- [x] LibreOffice-rendered DOCX and direct-PDF cover letters were rasterized with the bundled PDFium fallback and visually inspected. Both final and preliminary fixtures were one page, unclipped, selectable, and aligned with the browser header hierarchy; preliminary guidance remained outside the document.
- [x] Privacy release configuration reverified for Voynich Tech, `hello@voynichtech.com`, Canada, and minimum age 16. Public privacy copy, retention/data maps, subprocessor record, deletion allowlist, incident boundaries, and the scope-specific just-in-time disclosure include cover letters without changing Supabase schema, RLS, grants, or stored account data.
- [x] Production build passed with 2,007 modules. Cover-letter DOCX (2.26 kB) and PDF (2.22 kB) remain separate lazy chunks; résumé exporters, landing, privacy, and app route chunks remain independently loaded.
- [x] Signed-out local browser smoke passed `/`, `/app`, and `/privacy` at desktop plus `/app` at a narrow mobile viewport with one landing H1, no horizontal overflow, no `[object Object]`, and no page errors. The automated app WCAG audit reported 36 passes, zero violations, and zero incomplete checks.
- [x] Production dependency audit reported zero known vulnerabilities. `git diff --check` passed; generated `dist`, `tmp`, rendered QA, screenshot, and document artifacts remain untracked.
- [x] Feature commit `e674700f47be12d332fc89194774bbb188e846c0` was pushed normally to `main`. GitHub deployment `6130556621` bound that exact SHA to successful Production status and Vercel deployment `dpl_HrAU1ptbDkp1VQqFXM1hAvkMV5ZC` reached `READY` with the `gigscapes.com`, `www.gigscapes.com`, and `main` aliases.
- [x] Production smoke passed `/`, `/app`, `/privacy`, and `/sign-in` with HTTP 200. Desktop and mobile browser checks reported no horizontal overflow, `[object Object]`, console output, or page errors; the signed-out app accessibility scan reported 36 passes, zero violations, and zero incomplete checks. The privacy page rendered Voynich Tech, `hello@voynichtech.com`, Canada, age 16, and the cover-letter processing/storage disclosures.
- [x] Production `/api/cover-letter` rejected an unauthenticated POST with 401 before private work and preserved `Cache-Control: no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`. Deployment error-level and 5xx log queries returned no entries.
- [x] A fresh authenticated production generation/export was intentionally not invoked because it would send private résumé content to Anthropic and requires the user's own reviewed application session. Deterministic API, Auth, evidence, edit, cancellation, readiness, DOCX, PDF, copy, and stale-authorization paths are covered by the local release gates above.

## P2.1 universal design expansion local verification record

- Focused template/export/landing suite: 78 passed, 0 failed.
- Full suite: 395 passed, 0 failed.
- Export verifier: 36 files across all 14 choices plus the concise and preliminary fixtures; 23 direct-PDF pages, 667 selectable text items, canonical-manifest parity, verified-final gating, and stale-ready-flag rejection passed.
- New-style visual QA: five direct PDFs and five LibreOffice-rendered DOCX files were inspected at full-page size. No clipping, overlap, missing text, orphaned heading, warning banner, or blank trailing page was observed.
- Accessibility: the five new DOCX fixtures reported 0 high-, 0 medium-, and 0 low-severity findings; automated color checks confirmed at least 4.5:1 for styled text/background pairs.
- Production build: 1,985 modules transformed; `resumeDocx`, `resumePdf`, `jspdf`, and route chunks remained lazy. Build completed successfully.
- Browser QA: the landing selector exposed all 14 choices with exactly one `aria-pressed` selection at 1,440×900 and a 390×844 mobile override. Studio Editorial switched locally, exposed the networking-forward explanation, and the page had no horizontal overflow, application console warning/error, or framework error overlay.
- Source gate: `git diff --check` passed; only existing Windows line-ending notices were emitted.

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

## P2.3 Phase C source-policy and production-acceptance record — 2026-08-25

- Preflight: clean `main` at `87b1b2a2def238da57e14963ac9c93792ed586d0`, matching `origin/main`. No user or interrupted change was present before the bounded Phase C work began.
- Source eligibility: current first-party Jobicy, Himalayas, Jooble, Adzuna, Greenhouse, Lever, and Ashby documentation was reviewed and recorded. `JOB_SOURCE_DISABLED` accepts only reviewed source IDs, prevents a disabled importer from being requested, preserves companion imports and stored rows, and exposes only a safe policy/configuration skip category.
- Production public-listing audit: the anonymous `public.public_listings` query returned 3,270 rows through the publishable client. All 3,270 URLs were valid HTTPS, canonical duplicates were 0, future-dated rows were 0, stale rows older than 60 days were 24 (all WWR), snippets were present on 2,232 rows and absent on 1,038, and the 10,000-row safety limit was not reached. The output contained aggregate counts only.
- Focused source/search/Auth/multi-posting/export slice: 159 passed, 0 failed. Full suite: 351 passed, 0 failed.
- Export verification: 26 files across all nine template families, 18 native-PDF pages, 544 selectable text items, manifest parity, final-readiness authorization, stale-ready-flag rejection, and the documented one-/two-page assertions passed. All 13 DOCX fixtures converted through LibreOffice to 18 pages; all 36 native and DOCX-derived pages were inspected with matching page counts and no clipping, overlap, `[object Object]`, warning banner, missing glyph, or blank trailing page.
- Final sourcemapped production build: Vite 5.4.21 transformed 1,980 modules. `resumeDocx` (4.79 kB), `resumePdf` (8.62 kB), and `jspdf` (390.46 kB) remain lazy export chunks; landing and app remain route-level chunks.
- Browser QA: signed-out local `/` and `/app` passed at 1,280×720 and 390×844. The landing retained one H1 and nine template controls; the workspace loaded 100 unique public listing links from 100 rendered cards; source copy was truthful; both routes had zero horizontal overflow, `[object Object]`, application warnings, or console errors. The mobile drawer was opaque, exactly viewport-height, focused Close on open, closed with Escape, and restored focus.
- Secret/private-content scan: generated assets contained no server-secret identifier/value pattern or private résumé identity; source/docs contained no production JWT, private key, Anthropic key, or private candidate contact fixture. Generated résumé documents separately contained no `[object Object]`; upstream minified dependencies retain their own generic object-string literals and are not résumé content.
- Dependency audit: 0 critical, 1 high Vite finding, and 1 moderate esbuild finding. Both are confined to the existing development toolchain; the available remediation is a Vite 8 major upgrade and remains outside this bounded release.
- Operator/manual items: Adzuna publishing licence/trial and branding approval still require operator confirmation; no employer ATS board is configured and none was invented; active-source snippet gaps will narrow on normal scheduled refresh; Microsoft Word, Google Docs, and an external ATS parser remain unavailable. An authenticated two-posting production run and live production downloads are claimed only if an already-authorized session is available during post-deploy smoke.
- Release state: the feature SHA is the commit containing this record. Push, Git-triggered Vercel deployment, exact-SHA binding, public production smoke, runtime-error review, and 5xx review remain the final gates.

## P3.2 Phase A privacy-safe quality-evaluation record — 2026-08-25

- Preflight: clean `main` at `9703752`, matching `origin/main`. No interrupted or user-owned uncommitted work was present; all subsequent edits belong to this bounded P3.2 Phase A pass.
- Scope: one deterministic evaluator, an 11-case synthetic/redacted corpus, a CLI gate, focused tests, and the detailed implementation prompt. No production telemetry, analytics service, database schema, Supabase policy, Auth flow, runtime model call, dependency, pricing, or user-feedback collection was added.
- Corpus coverage: five occupation families and six candidate paths cover verified complete postings, incomplete postings, direct/adjacent/transferable/career-transition positioning, regulated credential verification and gaps, apprenticeship, template selection, final/preliminary exports, and unsupported-number rejection.
- Quality gate: 11/11 cases passed; contract accuracy, posting/readiness accuracy, export accuracy, integrity accuracy, template accuracy, and report privacy were each 100%. Aggregated requirement coverage was 69 of 91 requirements (75.82%): 37 direct, 18 adjacent, 14 transferable, and 22 missing.
- Synthetic operational signals: 13 attempts, 2 retries, 12 corrections, 6 user edits, 8 completed exports, 12,540 ms total duration, 13,750 input tokens, 7,810 output tokens, and 32,340 estimated cost micros. These are fixture inputs for deterministic regression testing and are not observed production-user behavior.
- Tests: the P3.2 evaluator suite passed 6/6; the focused quality/tailoring/export slice passed 106/106; and the full production test suite passed 357/357.
- Export verification: 26 files across all nine templates, 18 native-PDF pages, 544 selectable text items, manifest parity, final-readiness authorization, and stale-ready-flag rejection passed. All 13 DOCX fixtures converted through LibreOffice to 18 pages; all 36 native and DOCX-derived pages were inspected at original resolution with no clipping, overlap, orphaned heading, missing glyph, warning banner, or blank trailing page.
- Machine-readable export parity: all 13 native-PDF and LibreOffice-converted DOCX pairs contained non-empty selectable text with exact normalized token parity. Neither engine emitted `[object Object]`, `undefined`, `null`, `Preliminary draft`, `Verify the complete posting`, or `application-ready` into résumé content.
- Production build: Vite 5.4.21 transformed 1,980 modules successfully. `resumeDocx` (4.75 kB), `resumePdf` (8.58 kB), and `jspdf` (390.41 kB) remain lazy export chunks; landing and app remain route-level chunks. No synthetic fixture identity or phone pattern was present in the production bundle.
- Privacy gate: the report validator found zero violations and allows only case IDs, safe enums, booleans, numeric measurements, and aggregate counts. The evaluation fixtures and CLI are outside the application import graph.
- Known limitations: Microsoft Word, Google Docs, and an external ATS parser were unavailable. LibreOffice supplied Word-compatible rendering. PDF extraction emitted standard-font-data warnings while still returning complete, matching text; visual inspection found no corresponding glyph or layout defect.
- Release state: implementation passed every local gate, and production release authorization was received on 2026-08-25. The exact commit SHA, GitHub push, Vercel deployment, aliases, and post-deploy checks are recorded in the release handoff.

## P3.2 Phase B1 opt-in aggregate quality-signal record — 2026-08-25

- Preflight: clean `main` at `fd13fdc`, matching `origin/main`. No interrupted or user-owned uncommitted work was present; all changes in this record belong to this bounded Phase B1 pass.
- Consent: anonymous quality sharing is off by default, explicitly enabled in local browser storage, immediately disabled on request, fail-closed when storage is blocked or malformed, and never required by search, tailoring, feedback, or export.
- Contract: browser and server enforce one schema-versioned exact-field enum allowlist and a 4,096-byte cap. Extra fields, arbitrary strings, nested data, Unicode lookalikes, malformed consent, unapproved origins/types/markers, and raw private source strings are rejected or omitted.
- Transport/logging: the browser uses a same-origin best-effort request with `credentials: "omit"`, no retry queue, and a 2.5-second abort. The endpoint never echoes a signal and logs only accepted/failed state, safe storage category, and duration—never the payload or dimension values.
- Storage: the migration defines a service-role-only `SECURITY INVOKER` RPC and one private daily aggregate table with RLS, no browser policies, explicit browser-role revocations, exact enum checks, atomic increments, and 180-day retention. There is no raw-event or identifier table. The operator applied the production SQL successfully on 2026-08-25. A publishable-client production check denied the private schema and returned PostgreSQL `42501` for RPC execution before reaching an invalid test constraint, so no synthetic row was written. Service-role, RLS, and policy-count SQL evidence remains an operator gate.
- Feedback: optional fit and export feedback appears only after consent, uses fixed answers/reasons with no free text, stays outside the résumé preview/export, guards repeated clicks, and reports delivery failure without affecting the product action.
- Focus fix: the account-action provider captures the opener before modal autofocus. Escape/close restores the connected opener without scrolling or chooses an explicit global sign-in fallback when the original listing control has disappeared.
- Focused tests: 18/18 consent, privacy-contract, API, aggregate migration, evaluator suppression, and focus-restoration tests passed.
- Full tests: 375/375 passed.
- Synthetic evaluator: 35 synthetic events were accepted; 32 events across two cohorts were publishable, while one three-event cohort was suppressed without exposing its label. The minimum publishable cohort is 10.
- Export verification: 26 files across all nine templates, 18 PDF pages, 544 selectable PDF text items, canonical manifest parity, final-readiness authorization, and stale-ready-flag rejection passed.
- Production build: Vite 5.4.21 transformed 1,985 modules successfully. DOCX/PDF exporters remain lazy chunks; the landing and app remain route-level chunks.
- Browser QA: local signed-out `/app` loaded with no console errors or Vite overlay. Consent passed off/on/off behavior. The modal initially focused `account-action-email`; Escape restored the original `Sign in`; a removed opener restored the marked `Sign in to your workspace` fallback. Mobile width was 390/390 with no horizontal overflow.
- React review: consent storage is versioned and minimal; event work short-circuits before résumé derivation while disabled; global listeners are cleaned up; static reason lists are hoisted; feedback failure is non-blocking; and heavy export modules remain dynamically imported.
- Known limitations/blockers: Docker/Postgres is unavailable locally, so local migration verification remains static. Production application and anonymous denial are complete; the operator must still run the documented service-role/RLS/policy-count checks and add/review an endpoint firewall/rate limit before release. Microsoft Word, Google Docs, and an external ATS parser remain unavailable as in Phase A.
- Release state: no commit, push, deployment, production migration, or runtime data collection was performed in this pass. Current HEAD remains `fd13fdc` until separately authorized release work.

## P3.3 Phase A trust and explainability local verification — 2026-08-26

- Preflight: clean `main` at `bfe072cacf9c337dee080e7b1169ffa6a6fe3f63`, matching `origin/main`. No interrupted or user-owned uncommitted work was present; every change in this record belongs to the bounded P3.3 pass.
- Scope: canonical readiness and assessment-bound export authorization; application-risk gap severity; evidence-linked tailoring explanations and wording vetoes; safe URL-import errors; cancellable custom/public tailoring; SAP alias discovery; conservative multi-location clustering; truthful pricing, storage, sync, and no-auto-apply copy; and narrow-phone landing hierarchy/brand correction. No Supabase schema, RLS, grant, Auth-provider, production analytics, payment, dependency, cron, or provider-feed change is included.
- Tests: the final full suite passed 409/409 with 0 failed, skipped, cancelled, or todo tests in 79.17 seconds. The 17-test landing slice and focused search/category/deduplication, readiness/intake/tailoring, canonical/model/parity, quality, and cross-career slices also passed before the full gate.
- Export verification: 36 generated files across all 14 templates passed. The verifier inspected 23 native-PDF pages and 667 selectable text items, preserved canonical manifest parity, authorized a verified final export, rejected a stale ready flag, enforced the documented one-/two-page fixtures, and found no `[object Object]` or metadata artifact.
- Production build: Vite 5.4.21 transformed 1,987 modules in 5.98 seconds. `resumeDocx` (6.32 kB), `resumePdf` (10.59 kB), `jspdf` (390.46 kB), and `html2canvas` (201.48 kB) remain separate lazy chunks; landing and app remain route-level chunks.
- Browser QA: local signed-out `/` and `/app` loaded with no Vite overlay, application warning, or console error. The live public workspace loaded 95 deduplicated candidates; `sap` returned 57 relevant matches from 63 candidates. A synthetic unknown query produced a specific recovery message rather than a dead end. Tailor opened the action-specific private-account dialog. At 390×844 the landing and modal navigation had no horizontal overflow or the earlier hero/menu collision. The final narrow-phone pass measured the 390 px headline at 37.05 px/145 px high, confirmed the orange phrase and primary CTA, kept the product preview in the first scroll, and fit at 320×700 without horizontal overflow. An agent-browser WCAG A/AA scan reported no violation.
- Source/bundle gate: `git diff --check` passed. The built bundle contained no Supabase service-role environment identifier, Anthropic key identifier, private key marker, private résumé fixture, or export object artifact. The only `sb_secret_` and `service_role` strings are the upstream Supabase SDK's generic key detector and source-map documentation, not credential values.
- Dependency audit: the production-only audit reported 0 vulnerabilities. The all-dependency audit retains 0 critical, 1 high Vite finding, and 1 moderate esbuild finding; both apply to the existing development server/toolchain. npm offers a Vite 8 major upgrade, so no forced or unrelated framework upgrade was included in this trust release.
- Tooling limits: Microsoft Word, Google Docs, and an external ATS parser were not available. The deterministic 14-template DOCX/PDF parity tests and native PDF text inspection remain the local compatibility evidence. Authenticated live tailoring/download and production URL-import failure smoke are not claimed without a separately approved production session/request.
- Release state: implementation and local verification are complete, and commit/push/production deployment are authorized. The feature SHA is the commit containing this record; exact GitHub/Vercel binding and post-deploy smoke are recorded in the release handoff.

## P3.5 Evidence Map and application decision-clarity verification — 2026-08-26

- Preflight: clean `main` at `a89be564dc809841045c652a0134d53d3b0c679e`, matching `origin/main`. No interrupted or user-owned uncommitted work was present; every subsequent change in this record belongs to the bounded P3.5 implementation.
- Scope: deterministic application-outlook metadata, atomic requirement origin/importance/confidence/reason/next-action fields, a legacy-safe presentation model, a progressive Evidence Map, separate résumé-document and application-risk axes, and focused cross-career tests. No database, Auth, production telemetry, payment, feed, dependency, AI prompt/provider, or export-renderer mutation is included.
- Full regression: `npm test` passed 422/422 with zero failed, skipped, cancelled, or todo tests in 83.41 seconds. Focused application-risk, Evidence Map, tailoring-evidence, ATS-validation, change-ledger, app-chrome, and quality slices passed 51/51 before the full gate.
- Quality/privacy gates: `npm run evaluate:quality` passed all 11 redacted cases with 100% contract, posting-readiness, export-authorization, integrity, and template accuracy and zero privacy violations. `npm run evaluate:signals` published only the two synthetic cohorts above the privacy floor and suppressed the three-event cohort.
- Export gate: `npm run verify:exports` passed for 40 files across 16 strategy/design combinations, 25 native-PDF pages, 715 selectable PDF text items, canonical manifest parity, verified-final authorization, stale-ready rejection, and the documented one-/two-page assertions.
- Production build: Vite 5.4.21 transformed 1,989 modules successfully. `resumeDocx` (6.27 kB), `resumePdf` (10.55 kB), `html2canvas` (201.42 kB), and `jspdf` (390.41 kB) remain separate lazy chunks; the app chunk is 213.18 kB/59.59 kB gzip.
- Browser QA: the signed-out landing page loaded locally without application errors. The actual Evidence Map component was mounted with a regulated-electrician fixture, filtered to its mandatory licence blocker, and expanded through the real browser. Desktop and 390×844 layouts had no horizontal overflow; requirement reasons, exact evidence or explicit absence, unproven boundaries, application impact, and next action remained readable; `[object Object]` was absent.
- Accessibility: the scoped agent-browser/axe WCAG A/AA audit initially found three low-contrast secondary-text nodes. Those nodes and the remaining Evidence Map secondary labels were moved to the stronger body-secondary token. The repeated audit passed 16 rules with zero violations and zero incomplete checks.
- Tooling limits: Microsoft Word, Google Docs, an external ATS parser, and a fresh authenticated production tailoring/download session are unavailable or intentionally not invoked. Export parity and preliminary/final authorization are covered deterministically; production smoke is limited to public routes unless an already-authorized private result exists.
- Release state: implementation and local verification are complete, and commit/push/Git-triggered Vercel deployment are authorized. The feature SHA is the commit containing this record; exact GitHub/Vercel binding and post-deploy public smoke are appended during the release handoff.

## P3.8 composable résumé presentation verification — 2026-08-28

- Preflight: clean `main` at `053ae2f`, matching `origin/main`. No interrupted or user-owned uncommitted work was present; every subsequent change in this record belongs to the bounded P3.8 presentation pass.
- Scope: seven position-independent visual styles plus independently selectable palette, density, header alignment, and target-length preferences. Existing evidence strategy, canonical résumé content, truth gates, posting readiness, and preliminary/final authorization remain separate and unchanged. Target length is a layout preference and never deletes evidence.
- Persistence and migration: version-3 presentation settings are stored per user and target. Version-1 and version-2 settings migrate deterministically, invalid values fail safely to documented defaults, and export authorization binds every visual modifier so a stale presentation cannot inherit a prior ready state.
- Tests: the final focused résumé/export/tailoring slice passed 115/115; the presentation matrix passed 16/16; and the final full suite passed 475/475 with zero failed, skipped, cancelled, or todo tests. The 7-style × 4-palette × 2-density matrix preserves canonical content, presentation changes alter render identity only, and all palette/body combinations meet at least 4.5:1 contrast on supported page backgrounds.
- Export verification: 48 generated files across 16 strategy/design combinations passed. Four fully composed presentation variants covered every palette, both densities, all header alignments, and every target-length option. The verifier inspected 29 native-PDF pages and 820 selectable text items, preserved canonical manifest parity, authorized a verified final export, and rejected stale-ready state.
- File compatibility: the representative four DOCX files converted successfully through LibreOffice and matched their native-PDF page counts. All representative DOCX-derived and native PDF pages were inspected at full size. After correcting bold-line measurement in the native PDF wrapper, the four direct PDFs were regenerated and re-inspected with no clipping, overlap, missing glyph, stranded heading, warning banner, `[object Object]`, or blank trailing page.
- Cover-letter and privacy regression: both final and preliminary cover-letter DOCX/PDF fixtures passed (2 DOCX, 2 PDF, 2 pages, 492 tokens), and the privacy release gate passed with Voynich Tech, `hello@voynichtech.com`, Canada, and minimum age 16 supplied only to the verification process. No production environment value was changed.
- Production build: Vite 5.4.21 transformed 2,011 modules successfully in 6 seconds. `resumeDocx` (6.49 kB), `resumePdf` (10.74 kB), and `jspdf` (390.46 kB) remain separate lazy chunks; presentation choices do not pull export engines into the initial route bundle.
- Browser QA: local signed-out `/` and `/app` passed at 1,440×900 and 390×844. The landing retained one H1, exposed all seven position-independent style cards, changed the live example from Essential to Contour, and had no horizontal overflow, Vite overlay, application exception, or console error. The signed-out workspace remained public and usable.
- Security and dependency gate: `git diff --check` passed, the production-only dependency audit reported 0 vulnerabilities, and generated assets contained no actual server credential, private key, or private résumé fixture. Upstream Supabase generic secret-key detectors and source-map identifier text are not credential values.
- Tooling limits: Microsoft Word, Google Docs, an external ATS parser, and an authenticated production export session were unavailable or intentionally not invoked. LibreOffice conversion, native PDF extraction, deterministic parity checks, and full-size visual inspection provide the local compatibility evidence.
- Release state: implementation and local verification are complete, and commit/push/Git-triggered Vercel deployment are authorized. The feature SHA is the commit containing this record; exact GitHub/Vercel binding and public post-deploy smoke are reported in the release handoff.

## P4.4 listing freshness release gate — 2026-08-30

- [x] Source refreshes no longer physically delete unseen listings.
- [x] Observed rows reset to active and preserve first-seen provenance plus richer reviewed descriptions.
- [x] Authoritative, complete source snapshots use one service-role-only, idempotent finalization RPC; sampled, ranked, capped, partial, failed, or empty observations never increment misses.
- [x] ATS finalization is isolated by employer board, even when multiple boards share one provider.
- [x] Adzuna, Jooble, and Jobicy ingestion is observation-only because each response is ranked, sampled, or capped rather than a complete source inventory.
- [x] Himalayas finalizes a snapshot only after reaching an empty terminal page; exhausting the page budget or encountering a failed page remains observation-only.
- [x] One miss is uncertain; only repeated authoritative-snapshot misses, HTTP 404/410, or expired matching JobPosting structured data close a listing.
- [x] Publisher blocks, rate limits, timeouts, network failures, unreadable pages, and source mismatches remain uncertain.
- [x] The authenticated availability endpoint uses the existing HTTPS/DNS/IP/redirect/size/content-type/timeout safeguards and returns no title, employer, URL, or raw page content.
- [x] Discovery hides closed listings while saved history can retain them; stale/uncertain checks run before tailoring, and prior output is never deleted.
- [x] Browser exposure remains an explicit security-invoker view with narrow column grants; run ids, scopes, and miss counters stay server-only.
- [x] Apply `20260830112954_add_listing_freshness_state.sql` through the normal Supabase production migration workflow.
- [x] Verify RLS, grants, view fields, indexes, constraints, RPC execute grants, and anonymous denial for internal lifecycle fields in Production.
- [x] Release the exact verified commit, run one complete scheduled source refresh, and confirm sanitized uncertain/closed/reactivated metrics.
- [ ] Production-smoke active, stale, uncertain, closed, saved-history, manual-refresh, and pre-tailoring paths on desktop and mobile.

Production database evidence: the migration completed transactionally in the `wavelength` Production project on 2026-08-30. The independent release query returned `true` for all ten RLS, grant, public-view, RPC, index, and constraint gates. The aggregate-only backfill check reported 6,843 active listings, zero unchecked rows, and zero closed rows without a closure timestamp. A publishable-key smoke returned HTTP 200 for the safe public lifecycle field, HTTP 401 for an internal miss-counter read, and a hidden/denied response for the service-only finalization RPC.

Production application evidence: feature commit `7a6896c8b86366fe8eb0a686f3f5d4f056d08e3f` and timestamp-compatibility hotfix `ed367c1` were pushed normally to `main`. Git-triggered Vercel deployment `dpl_FnVw96A83XdTM2YaEfwotAVQBNuo` reached `READY` and carries the `gigscapes.com`, `www.gigscapes.com`, and `main` aliases. Public `/`, `/app`, and `/privacy` returned HTTP 200; the private availability endpoint rejected an anonymous request with HTTP 401 and `Cache-Control: no-store, private`. Desktop and 390×844 signed-out browser smoke had no horizontal overflow, application exception, or console error. A production cron run then reported `success` for all three companion sources: Jooble saved 451/451 fresh unique observations, Jobicy saved 100/100, and Himalayas saved 100/100 after its live Unix-second timestamps were normalized. All source logs exposed only bounded counts, run mode, durations, and zero-valued uncertain/closed/reactivated metrics. Authenticated state-transition smoke across active, stale, uncertain, closed, saved-history, manual-refresh, and pre-tailoring variants remains an explicit hands-on gate; no synthetic user or listing state was created in Production for that check.

## P3.3D adjacent-expertise calibration release gate — 2026-09-01

- [x] Replace the raw percentage cliff with weighted capability-family calibration.
- [x] Normalize legacy transition paths to `transferable` at the API boundary while retaining backward-compatible internal aliases.
- [x] Preserve verified professional seniority independently from target-role fit and readiness.
- [x] Collapse duplicate/overlapping requirements before coverage, gap, and risk counts.
- [x] Add bounded FI-CA/PSCD/IS-U FI-CA relationships without treating domain adjacency as direct utilities evidence.
- [x] Keep meter-to-cash, utilities billing, device management, meter reading, C4C, and utilities-specific master data distinct unless candidate evidence states them.
- [x] Remove candidate-facing career-change, transition, new-path, and inferred entry-level positioning from fit summaries, résumé templates, fallbacks, and application labels.
- [x] Reject forbidden positioning and unsolicited gap confessions in résumé and cover-letter validation/repair paths.
- [x] Preserve template choice as presentation-only and leave provider, persistence, auth, database, analytics, sync, sources, and native-app contracts unchanged.
- [x] Add redacted senior SAP adjacency, service-to-teller transferable, legacy payload, semantic repair, and cover-letter boundary tests.
- [x] Run the complete unit suite, production build, export verifiers, and diff check on the exact release tree.
- [x] Commit and deploy the exact verified tree, confirm the production alias, and run public route smoke.

Hands-on limits remain explicit: a fresh authenticated production tailoring run with a real private résumé, Microsoft Word/Google Docs rendering, an external ATS parser, and employer outcome validation are not claimed by deterministic tests.

Local release evidence: 572/572 tests passed; Vite 5.4.21 transformed 2,456 modules; the quality gate passed all 11 redacted cases with 100% contract/readiness/export/integrity/template accuracy and zero privacy violations; résumé export verification passed 48 files, 16 templates, 29 PDF pages, 826 selectable text items, manifest parity, final authorization, and stale-ready rejection; cover-letter verification passed two DOCX and two PDF files across final/preliminary states; all eight prototype packages and 32 files passed; and `git diff --check` reported no errors. Existing large dependency chunk warnings remain unchanged.

Production release evidence: employment-detail hotfix `b68497d` and adjacent-expertise calibration `aa2f110` were pushed normally to `main`. Git-triggered Vercel deployment `dpl_3x6NUeX1cwwAZai3KNNZnJ7zHT7L` reached `READY` with the `gigscapes.com`, `www.gigscapes.com`, and `main` aliases. Public `/`, `/app`, `/privacy`, and `/sign-in` routes returned HTTP 200. Unauthenticated production POST probes to `/api/tailor` and `/api/job-intake` returned the expected HTTP 401 with `Cache-Control: no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.

## P3.3E canonical requirement and provenance integrity hotfix — 2026-09-01

- [x] Treat the candidate-reviewed posting inventory as canonical and discard model-only requirement fragments.
- [x] Separate SAP Finance duration from FI, CO, Asset Accounting, Logistics integration, and Billing capability requirements.
- [x] Keep required-qualification coverage distinct from complete posting-inventory coverage and block mismatched counts.
- [x] Recover verified generic SAP lifecycle evidence without converting target-domain gaps into false direct evidence.
- [x] Preserve bounded FI-CA/PSCD adjacency while keeping CO, Asset Accounting, Utilities history, and exact tenure unsupported unless proven.
- [x] Support multiple provenance citations per tailored bullet and measure clause/token coverage.
- [x] Block unsupported ownership strengthening and restore verified originals through deterministic fallback.
- [x] Show every source citation in the change review and disable approval when citation coverage is incomplete.
- [x] Add redacted FICO, canonical inventory, lifecycle recovery, multi-source citation, ownership escalation, count-consistency, and fallback regression tests.
- [x] Run focused tests, the complete test suite, production build, quality evaluator, résumé/cover-letter export verifiers, and presentation-package verifier.
- [x] Commit the exact verified tree and push it normally.
- [x] Confirm the Git-triggered deployment reaches `READY`, verify the production alias, and run public route/API-boundary smoke.
- [ ] Repeat the authenticated FICO/Utilities test with the real private résumé and inspect required/full coverage, evidence citations, DOCX, and PDF.

Local verification evidence: the focused integrity slice passed 50/50 and the complete suite passed 577/577 with zero failures, skips, cancellations, or todos. Vite 5.4.21 transformed 2,456 modules; only the existing large dependency-chunk advisory remains. The privacy-safe quality gate passed 11/11 redacted cases with 100% contract, readiness, export, integrity, and template accuracy and zero privacy violations. Résumé export verification passed 48 files, 16 templates, 29 PDF pages, 826 selectable text items, manifest parity, final authorization, and stale-ready rejection. Cover-letter verification passed two DOCX and two PDF files across final/preliminary states with 492 selectable tokens. All eight dormant prototype packages and 32 files passed with invariant content hashes. `git diff --check` passed on the final documentation tree.

Hands-on limits remain explicit: local deterministic fixtures cannot prove how the live provider will phrase every SAP comparison, how Microsoft Word/Google Docs or an external ATS parser will render the files, or whether an employer agrees with the fit decision. No provider, model, storage, authentication, database, analytics, sync, source, or native-app contract changed in this hotfix.

Production release evidence: feature commit `9e1195f` was pushed normally to `main`. Git-triggered Vercel deployment `dpl_F7apb7Q4j5WBczc1w619u59raHu7` reached `READY` on Node.js 24 with the `gigscapes.com`, `www.gigscapes.com`, project-production, and main-branch aliases. Public `/`, `/app`, `/privacy`, and `/sign-in` returned HTTP 200. Unauthenticated POST probes to `/api/tailor` and `/api/job-intake` returned HTTP 401 with `Cache-Control: no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`. The deployment-scoped one-hour error-level log scan returned no entries.

## P4.H1 exporter deployment-skew resilience — 2026-08-30

- [x] All résumé and cover-letter DOCX/PDF dynamic imports are owned by one cached, rejection-resetting loader boundary.
- [x] Warm-up reaches the nested `docx` and `jspdf` dependencies only after a tailored résumé or cover-letter plan exists.
- [x] Dynamic-module, module-script, ChunkLoad, loading-chunk, content-validation, download, serialization, and unknown errors map to fixed safe categories.
- [x] Candidate-facing notices never interpolate the original error, hashed asset URL, chunk name, document content, or posting content.
- [x] Stale résumé recovery protects the saved base résumé and tells the user to copy exact tailored wording before an explicit refresh and regeneration.
- [x] Stale cover-letter recovery accurately protects the saved résumé and browser-saved target-specific draft.
- [x] No automatic reload occurs; the accessible `Refresh Gigscapes` control is rendered only for stale-exporter recovery.
- [x] Résumé PDF print fallback cannot run when the module did not load or export authorization/content validation failed.
- [x] Console diagnostics and quality telemetry receive only artifact/format plus the allowlisted category.
- [x] Focused regression passed 22/22; the complete suite passed 554/554 with zero failures, skips, cancellations, or todos.
- [x] `npm run verify:exports` passed 48 files across 16 strategy/design combinations, 29 PDF pages, 820 selectable text items, canonical manifest parity, final authorization, stale-ready rejection, and documented one-/two-page fixtures.
- [x] `npm run verify:cover-letters` passed final and preliminary states across two DOCX and two PDF files, two pages, 492 selectable tokens, and stale-authorization unit coverage.
- [x] Vite 5.4.21 transformed 2,453 modules. `coverLetterDocx` (2.27 kB), `coverLetterPdf` (2.28 kB), `resumeDocx` (6.44 kB), `resumePdf` (10.75 kB), and `jspdf` (390.43 kB) remain separate lazy chunks; the public landing bundle does not gain an eager exporter import.
- [x] Local signed-out `/app` rendered meaningful discovery content with no Vite overlay or recorded browser error. At 390×844, viewport and document widths both measured 390 px with no horizontal overflow; the interactive search, intake, listing, account, and privacy controls remained present.
- [x] Commit and deploy the exact verified tree after release authorization.
- [ ] Keep a valid authenticated result open across that deployment and exercise stale résumé DOCX/PDF plus stale cover-letter DOCX/PDF recovery, copy-before-refresh, explicit refresh, regeneration where required, and successful retry.

No database migration, persistence change, AI-provider change, model prompt change, evidence-policy change, or production data mutation is part of this hotfix. Microsoft Word, Google Docs, an external ATS parser, and authenticated stale-tab behavior were not available to this local pass and are not claimed.

Production application evidence: feature commit `860a9d93b270270bdfa4f4049ec43129898b3a81` was pushed normally to `main`. Git-triggered Vercel deployment `dpl_CDoRPR98yjrL2diSTUKRjAFQCGfP` reached `READY`, was built with Vite on Node.js 24, and carries `gigscapes.com`, `www.gigscapes.com`, the main-branch alias, and the project aliases. Public `/`, `/app`, and `/privacy` each returned HTTP 200. The live `/app` rendered meaningful discovery content with no framework overlay or recorded browser error; at 390×844 the document and viewport widths both measured 390 px, search and posting-intake controls were present, and horizontal overflow was false. The deployment-scoped one-hour error-log query returned no runtime logs. The authenticated stale-tab exercise remains deliberately unchecked because no synthetic user draft or private production processing was created for this release.

## P4.5 Phase B local application-package prototypes — 2026-08-31

- [x] Preserve the public seven-style registry while registering dormant `northstar-v1`, `civic-v1`, and `studio-editorial-v2` IDs.
- [x] Keep `.env.example` fail-closed with `VITE_PRESENTATION_PROTOTYPES_ENABLED=false`; enable only the ignored local workspace value for review.
- [x] Add a versioned, frozen, presentation-only application-package contract with explicit validation and no candidate, posting, evidence, requirement, prose, or readiness fields.
- [x] Bind cover-letter browser/DOCX/PDF presentation to the selected résumé family without changing letter content/source hashes or readiness.
- [x] Add paired résumé/letter chooser thumbnails, explicit application-safe/networking-forward text, and a one-action fallback for networking-forward selections.
- [x] Focused presentation/model/export suite: 33/33 passed.
- [x] Full suite: 560/560 passed.
- [x] Existing résumé verifier: 48 files, 16 public compatibility templates, 29 PDF pages, 826 PDF text items, manifest parity passed.
- [x] Existing cover-letter verifier: two states × DOCX/PDF, two PDF pages, 492 selectable text tokens, final/preliminary gates passed.
- [x] Prototype verifier: eight matching packages, 32 files, one-page Canadian short résumés, two-page U.S. long résumés, one-page letters, identical fixture content hashes across families, and distinct presentation hashes.
- [x] Production build: 2,455 modules transformed; résumé and cover-letter DOCX/PDF exporters remain separate lazy chunks. Existing >500 kB dependency warnings remain.
- [x] Direct-PDF first-page renders inspected at original resolution for Northstar, Civic, Studio Editorial v2, and Essential matching packages. No clipping, overlap, blank trailing page, missing visible fixture glyph, internal warning, or serialization artifact found.
- [x] Tagged-PDF feasibility bounded: current jsPDF path does not emit a verified structure tree. Direct PDFs remain selectable/logically ordered; no PDF/UA or accessible-PDF claim is made.
- [ ] Run an actual 390 × 844 browser chooser/preview pass, 200% zoom, keyboard/screen-reader, and forced-colour/monochrome checks.
- [ ] Open/convert representative DOCX files in LibreOffice, Microsoft Word, and Google Docs; run at least one external ATS parser check.
- [ ] Run the bounded tester protocol and record scan success/time, package matching, safe-family choice, confidence, and rule/spacing feedback.
- [ ] Review Civic rule weight and Studio Editorial v2 differentiation after tester evidence.
- [ ] Explicitly authorize a Preview exposure before changing the flag outside the local ignored environment.

Artifacts and the complete honest assessment are in `docs/p4-5-prototype-evidence.md`. No commit, push, Preview, Production deployment, database change, telemetry change, or AI-provider request is part of this local prototype pass.

## P4.6A application-document workspace — 2026-09-02

- [x] Put an explicit package, résumé-only, and cover-letter-only choice before posting intake.
- [x] Reuse one evidence-analysis path and stop cover-letter-only before any tailored-résumé draft request.
- [x] Keep the base résumé immutable and require exact canonical résumé identity before letter export.
- [x] Surface a compact target-level document summary and matching-letter action before the long résumé preview.
- [x] Auto-open the letter workspace for package flow while retaining separate user-triggered letter generation and processing disclosure.
- [x] Keep résumé and cover-letter states independent: not created, generating, draft, preliminary, ready, stale, or failed.
- [x] Preserve valid stale letter drafts for review while blocking export; reject locally corrupted draft hashes.
- [x] Add account-and-target-scoped browser-only application metadata plus a legacy cover-letter adapter without rewriting old drafts.
- [x] Include application metadata in scoped browser deletion, retention documentation, the data map, PIA, and public privacy copy.
- [x] Add account-action and app-capability gates without changing Supabase schema, RLS, résumé sync, job sources, or automatic-submission boundaries.
- [x] Run focused workflow/storage/privacy/API tests, the complete test suite, quality/signal evaluators, privacy release verifier, résumé/letter export verifiers, prototype package verifier, production build, and diff check.
- [ ] Exercise all three workflows with an authenticated account at desktop and 390 × 844, including cancellation, stale draft recovery, keyboard focus, and no horizontal overflow.
- [ ] Open representative package and standalone-letter DOCX/PDF files in Microsoft Word, Google Docs, and at least one external ATS parser.
- [x] Commit and push through the normal Git-triggered path; verify exact SHA/deployment binding, production aliases, public routes, anonymous private-API boundaries, and recent error-level runtime logs.

Local verification evidence: the complete suite passed 594/594 with zero failures, skips, cancellations, or todos. Vite 5.4.21 transformed 2,461 modules; résumé and cover-letter exporters remain separate lazy chunks and only the existing large dependency-chunk advisory remains. The privacy-safe quality evaluator passed 11/11 redacted cases at 100% contract/readiness/export/integrity/template accuracy with zero privacy violations; privacy-safe signal aggregation published only cohorts of at least ten. Privacy configuration verified for Voynich Tech. Résumé export verification passed 48 files, 16 templates, 29 PDF pages, 826 selectable text items, manifest parity, final authorization, and stale-ready rejection. Cover-letter verification passed two DOCX and two PDF files across final/preliminary states with 492 selectable tokens. All eight dormant prototype packages and 32 files passed with invariant content hashes. `git diff --check` reported no errors before this evidence record.

Production release evidence: feature commit `a94036d9ebbe85ac31b4f170f75d7b4bb748d215` (`feat: add application document workflows`) was pushed normally to `origin/main`. Git-triggered Vercel deployment <https://wavelength-m7o94wxup-luisochoasap-2007s-projects.vercel.app> (`dpl_4LdvPAMCLtKAiMMkkUrrtYFbFQhm`) reached `READY`, targets Production, and is metadata-bound to that exact `main` SHA. It carries `gigscapes.com`, `www.gigscapes.com`, and the expected Vercel production/main aliases. Signed-out requests to `/`, `/app`, `/privacy`, and `/sign-in` returned HTTP 200. Anonymous POST requests to `/api/tailor`, `/api/cover-letter`, and `/api/job-intake` returned HTTP 401 with `no-store`, `no-cache`, `no-referrer`, and `nosniff` protections. A deployment-scoped one-hour error-level log query returned no logs. No database migration, résumé-sync expansion, provider switch, job-source change, automatic application submission, or cloud application-history persistence was introduced.

Authenticated three-workflow desktop/mobile testing, cancellation and stale-draft recovery, and Microsoft Word, Google Docs, and external ATS checks remain explicitly open above. Final release-record SHA: the commit containing this section; the final report and Vercel metadata provide its immutable SHA after this documentation-only commit is created.
