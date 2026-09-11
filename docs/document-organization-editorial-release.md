# Document organization and editorial release

Implementation date: September 11, 2026. Scope: steps 5–6 from the document QA follow-up. The implementation brief is `document-organization-editorial-brief.md` in this directory.

## Result

The document pipeline separates training, languages, and clearance; gives experienced transition candidates conventional headings and experience-first ordering; groups compact consecutive assignments with identical employer/location/date context; and preserves role identity across long PDF continuations. Shared contact formatting removes recognized street-address fragments without guessing a city. Duplicate removal preserves similar bullets containing different facts.

Cover-letter controls now share explicit generation and diagnostic rules. Short normally uses three paragraphs and one main example, with an upper budget of 180 words. Standard permits a second distinct example and up to 320 words. There is no minimum-word padding. Shortening a sufficiently long existing Standard draft requests at least a 25% reduction. This is an editorial target, not a guarantee. Direct, Warm, and Confident have concrete, evidence-preserving voice instructions.

The UI identifies the current draft's settings and word count separately from pending generation choices. Regenerating one paragraph preserves the current document's settings. Writing advice now catches repeated sentences within one paragraph, substantial repeated phrasing, common empty self-description, generic relevance bridges, and dense inventories. These are optional mechanical suggestions; they do not certify persuasion or factual truth. Repairs remain bounded and revalidated, and a safe original survives failed optional polishing.

## Validation before release

- Reproduced six failures in the initial organization/editorial tests before integrating the fixes.
- Full automated suite: 702 passed, zero failed. Twenty maintained tests were added for this scope. The full suite was rerun after the production-discovered message-persistence fix.
- Production bundle: clean successful exit. One npm-driven run completed bundling but hit a Windows Node/libuv shutdown assertion; direct invocation of the same Vite build succeeded. The existing PDF chunk-size warning remains.
- General résumé export matrix: 48 files across 16 templates, covering 29 PDF pages. Manifest parity and final/stale export gates passed.
- Existing cover-letter and document-quality export verifiers passed.
- New `npm run verify:organization-editorial`: six matching DOCX/PDF pairs across Essential ATS and Bold Impact, eight PDF pages. Full normalized text parity, page bounds, section placement, role retention, clean document text, and compact employer-group pagination passed.
- Visually inspected every one of those eight PDF pages. An initial employer-group split was found visually, fixed, and added to the maintained verifier.
- Visually inspected both pages of a 24-bullet long-role PDF. Continuation context, the last observation, and the following compact role were retained. A separate maintained renderer stress test preserves all 700 repeated statements and the final ending of an oversized bullet.
- Local browser using actual components and controlled provider responses: pending voice/length selections, paragraph regeneration settings, full regeneration, saved-draft reload, failure recovery, cancellation, and 390px mobile layout passed. Desktop and mobile screenshots were inspected; no browser errors or horizontal overflow were observed.
- Production evidence analysis completed for a clearly labeled synthetic SAP posting. The first live Standard-letter attempt was blocked for a numeric claim absent from its cited evidence (HTTP 422 after 12.049 seconds). The blocked text was not released as a usable letter. This is a failed generation, not a successful quality sample.
- That failure exposed a pre-existing cover-letter-only integration defect: equivalent identity/evidence objects were recreated during parent status updates, causing the draft-loading effect to clear the error notice. The effect now uses the existing content fingerprint. A local browser reproduction with changing parent status and newly allocated equivalent props verified persistent error messages, preserved pending settings, and successful retry. The fingerprint regression also detects actual source changes.

The local Standard/Short fixture texts are hand-authored QA examples: 159 and 100 words. These numbers are not live-generation measurements. Production revision and live model observations are recorded in the accompanying task report after deployment.

## Limits and follow-up

- Native Word/LibreOffice rendering was unavailable. DOCX text, structure, grouping, and keep-with-next rules were inspected; actual Word pagination was not visually verified. Long DOCX roles use bounded contextual chunks, while Word determines page breaks.
- Grouping is deliberately limited to compact contiguous runs of two to four roles with exactly matching employer, location, and dates. Larger groups retain employer context on each role.
- Section recognition supports explicit common headings and malformed structured training. It is not a general parser for every possible résumé layout. This release does not perform a migration rewriting every previously saved canonical package.
- Steps 1–4 remain separate: stronger claim attribution and contribution-level checks, match/credential semantics, wider Unicode PDF fidelity, and silent editor truncation. This release does not resolve or certify those issues.
- No applications were submitted and no saved base résumé was modified.

## Reproduce

Run `npm test`, `npm run build`, `npm run verify:exports`, `npm run verify:cover-letters`, `npm run verify:document-quality`, and `npm run verify:organization-editorial` from the repository. The new verifier writes reconstructed QA artifacts under the ignored `tmp/organization-editorial` directory. Inspect PDF pages using a PDF renderer; use Word or LibreOffice separately for native DOCX pagination review.
