# Career and gig document fixes — 2026-09-11

Implemented the six priorities from `career-gig-qa-2026-09-11.md`. The original corpus and discovery report are preserved. The changes apply to the shared evidence checks, readiness, writing advice, and document presentation.

## What changed

- Quantities now retain the counted noun and denominator. Word/digit equivalents are supported, including the distinction between thirty one-hour sessions and thirty-one sessions. Explicit negative actions and team/crew attribution survive rewriting.
- Compound credentials check each named or generic credential and its status. An active First Aid certificate cannot validate an expired refrigerant certificate. AND and OR remain distinct; valid mixed-status statements are accepted.
- Generation, paragraph regeneration, manual edits, restored drafts, and export authorization use the shared consequential-claim checks. Unsupported insurance, background checks, availability, guarantees, rights, referrals, and compensation claims are rejected. Supported availability no longer hits unconditional API/editor bans. Hash, source fingerprint, length, and stale-authorization checks remain in place.
- Supervised clinical placements are accepted as supervised work. A source-supported occupational title survives a separate credential gap; mentioning a technician in an assistant's bullet does not grant that title.
- Missing required availability creates a specific confirmation message and preliminary document status in both API and UI. Preferences stay distinct. Internal availability notes are removed from generated résumé prose while the actual weekday schedule and negative work facts remain.
- Writing advice no longer flags a verb solely because it is absent from an occupation list. “Responsible for” no longer automatically becomes “Managed.” Fragment advice works across the ten occupations. Held nursing, food-handler, and apprentice credentials move forward; training stays separate. Supplied portfolio links reach the matching letter. Mobile document previews no longer enforce an 11-inch minimum height.

## Before and after

These are fictional profiles and controlled provider replies through the real local handlers and exporters, not samples of live model writing.

| Check | Original discovery | Fixed run |
|---|---:|---:|
| Truthful résumé requests accepted | 9/10 | 10/10 |
| Truthful cover-letter requests accepted | 9/10 | 10/10 |
| Complete document pairs exported | 8/10 | 10/10 |
| Primary false-claim variants | 20 | Same 20 |
| Unsafe generated-letter exports | 8 | 0 |
| Unsafe restored-letter exports | 9 | 0 |
| Unsafe résumé exports authorized | 5 | 0 |
| Supplemental false edits exported | 2 | 0 |
| False unknown-opener warnings | 29 | 0 |
| Deliberate occupational fragments detected | 1/10 | 10/10 |
| Required weekend availability | Misleading ready status | Visible confirmation and preliminary status |

The added regression matrix exercises all 22 false variants through initial generation, paragraph regeneration, manual edit, restored-plan review, shared copy/export authorization, PDF, and DOCX. Each variant must first fail the specific claim check, so an unrelated readiness error does not count as success. Truthful controls exercise all ten letters and regeneration, safe edits, generic units, number words, mixed credential states, supervised work, and source-supported availability.

## Validation

- Full Node suite: **777 passed, 0 failed**. The new file adds 41 tests.
- Focused final résumé/claim checks: **55 passed, 0 failed**.
- Ten career/gig cases: **20 PDFs and 20 DOCX files**, all names preserved, all 20 PDF pages inside bounds, all ten pairs exportable under their correct final/preliminary status.
- General export verifier passed: 24 output pairs validated in memory, covering 16 strategy/style combinations and additional presentation/preliminary controls; manifest parity and stale-authorization rejection passed. The persisted output contains 23 unique pairs and 28 PDF pages because two checks share a filename.
- Visual review covered all 20 career/gig PDF pages and all 28 persisted general-export PDF pages. Names, headings, wrapping, section order, and page boundaries were checked. Nursing, food-handler, and active apprentice credentials are visible early; the photographer's portfolio is present in both documents. No clipping or missing glyphs was found in the independent PDFium check. Poppler substituted a standard font incorrectly in one apprentice fixture; PDFium and PDF text geometry confirmed the file itself was intact.
- Browser matrix: all ten cases at 1258×900 and 390×844; no horizontal overflow or browser errors. Mobile document minimum height is zero; the required-weekend case displays confirmation guidance. The real editor rejected “I did administer medication,” preserved both the attempted input and prior saved letter, then accepted a truthful correction.
- Production build passed. The existing large-chunk advisory remains. Production dependency audit: **0 vulnerabilities**. Forty built JavaScript/source-map files scanned with no private-key/service-role patterns found.

## Limits and remaining editorial work

The controlled letters are concise and factual, but their repeated closing and résumé-like openings are fixture content. This run does not establish that live generations are more persuasive. A fresh authenticated live-model editorial evaluation remains useful after deployment; no production provider keys were retrieved for local testing.

The browser tool canceled file saving for both the app PDF and a separate plain-text download control. Clipboard write was exercised, but readback was denied by browser permissions. These are unverified native-browser interactions, not reported as passes. The actual application exporters successfully produced the inspected files. Native Word/LibreOffice pagination was unavailable; DOCX content and structure were checked, but native DOCX rendering is not claimed.

The semantic checks deliberately cover concrete risk patterns; they are not a general language entailment system. No model score or green badge guarantees an interview or certifies every possible paraphrase.

## Reproduction and evidence

- `npm test`
- `npm run verify:career-gigs` (set `CAREER_GIG_QA_OUTPUT` to preserve a new run)
- `npm run verify:exports -- --keep`
- `npm run build -- --sourcemap`
- `npm audit --omit=dev --json`

Local release evidence: `tmp/career-gig-release-2026-09-11/`, `tmp/export-verification/`, `tmp/career-full-final.log`, `tmp/career-build-release.log`, and `tmp/career-production-audit.json`. Original discovery evidence remains under `tmp/career-gig-final-2026-09-11/`. Do not submit fictional or diagnostic documents as applications.

The release commit is the commit containing this report. Production deployment is triggered by the normal push to main, then verified against that exact SHA and the production aliases. No database migration is part of this change.
