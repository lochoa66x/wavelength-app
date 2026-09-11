# Document quality release — September 10, 2026

Cover letters now open as finished documents. Preview, editing, and source explanations have separate views, while paragraph edits and the saved base résumé remain preserved. Bold Impact uses a restrained rule, readable typography, and ordinary document paragraphs across preview, DOCX, and PDF. Job-location or remote-eligibility strings are no longer used as employer mailing addresses.

The evidence pipeline now preserves common employment-header formats, checks for omitted source degrees and credentials, keeps historical bullet evidence within its engagement, and distinguishes a synthesis of several source statements from a reversible single-source rewrite. Training or guidance cannot become configuration ownership; projected metrics retain their qualifiers. Project experience cannot establish a named credential, and PMO support only partially supports a compound budget/resourcing/RAID/steering requirement. Internal generation terminology is rejected in generated document prose and in saved cover-letter exports.

Capability selections distinguish knowledge, practical application, leadership, and an unspecified legacy level. Examples remain optional. Formal qualifications and central responsibilities both contribute to the visible fit assessment. Related and missing evidence is shown separately from document checks; incomplete assessments retain unavailable confidence.

Professional résumé generation now has a certifications field. Document normalization preserves string credentials, and training consolidation preserves different providers and dates. Identical bullets at separate jobs no longer erase a role's content.

## Validation

- Full Node suite: 660 passed, 0 failed. Final confidence adjustment: 25 focused tests passed.
- Production Vite build passed. The existing bundle-size advisory remains.
- Existing résumé export verifier: 48 files across 16 templates passed, including content-manifest parity and stale-readiness checks.
- Existing cover-letter exporter verifier: 2 DOCX and 2 PDF files passed final and preliminary authorization checks.
- New `npm run verify:document-quality`: Bold Impact and Essential ATS each preserve all fixture roles, education, credentials, and paragraphs in actual DOCX/PDF output. PDFs contain selectable text; each résumé has 2 pages and each letter 1 page.
- Both styles' DOCX exports were rendered through installed LibreOffice and every page visually reviewed. Each résumé has 2 pages and each letter 1 page. Header alignment and credential-group pagination were corrected during review.
- Local browser QA: normal homepage renders, no browser errors or framework overlay; letter preview contains zero controls/internal labels; edits survive view switching and save to the preview; source explanations remain accessible; knowledge-level submission retains that level without an example; 390px viewport has no horizontal overflow.

## Scope of verification

The integration fixture is a labeled synthetic reconstruction of the screenshot scenario with dummy identity/contact information. It is not Luis's live account or an actual new AI response. Automated API coverage uses mocks; the original authenticated application was not regenerated during this release. DOCX visual checks used LibreOffice, not Microsoft Word. Source-matching checks protect the specific tested failure modes and do not constitute a general fact checker.

Previously saved drafts are preserved. Regenerate older applications to apply the updated content generation and evidence analysis. A legacy letter with internal wording is retained for editing but cannot be exported until corrected.

Generated QA files stay under ignored `tmp/document-quality/`; no candidate documents, credentials, or secrets are included in this commit.
