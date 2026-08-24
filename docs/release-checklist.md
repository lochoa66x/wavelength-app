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

## Required local verification before commit

- [x] Focused canonical/template/export/tailoring tests pass with exact count recorded.
- [x] `npm run verify:exports` passes for all four templates and preliminary gating.
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

Do not commit while a required check is failing. Do not push or deploy without separate authorization.

## Later P2.1 families

- Skilled trades rebuild
- Admin and customer operations
- Marketing and communications
- Creative and design
- Dedicated technical/software presentation
