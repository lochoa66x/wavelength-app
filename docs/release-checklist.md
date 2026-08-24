# Gigscapes release checklist

Updated: 2026-08-24

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
- Release state: the verified B3 feature commit is local-only. Nothing in this pass was pushed or deployed.

Do not commit while a required check is failing. Do not push or deploy without separate authorization.

## Next pipeline step

- Release the verified B3 commit through the normal GitHub/Vercel path only after explicit authorization.
- Run signed-out and authorized production smoke checks for the deployed SHA.
- Continue with P2.2 landing-page work after the B3 release is verified, unless product priorities change.
