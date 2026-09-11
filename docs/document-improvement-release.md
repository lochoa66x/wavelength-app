# Document improvement release — September 10, 2026

## Scope

Implemented the [detailed implementation brief](document-improvement-implementation-brief.md) against baseline `18d26d1`. This release improves the existing document workflow without changing authentication, storage infrastructure, providers, or the saved base résumé.

- Cover letters receive explicit concise-writing guidance and independent editorial diagnostics. One bounded revision can repair only affected paragraphs; the complete merged letter must pass the existing evidence validation. A safe first draft survives failed or unsafe optional polishing.
- Résumé generation receives source statements scoped to each employment entry and exact source qualifications. Before requesting another AI draft, the server can restore an exact original bullet supplied by validation, then rerun the full validation gate. Counts and timing make the actual effect observable without logging candidate text.
- The review screen shows document checks separately from one role-fit summary. Unknown central requirements remain unassessed, confidence is unavailable for incomplete assessments, and known export blockers override stale success flags.
- Optional evidence questions change with knowledge, applied experience, or leadership. Candidate-entered wording survives level changes and submission.
- Preview, Word, and PDF share header and section rules and heading capitalization. PDF uses a normal bullet character. Editing controls and writing advice remain outside the document.

## Verification before deployment

| Check | Result and scope |
| --- | --- |
| Complete automated suite | 682 passed; 0 failed. Baseline had 670 tests. |
| Production build | Passed in 7.42 seconds. Existing large-chunk warning remains. |
| Writing diagnostics | Long sentences, dense paragraphs, repeated language, and filler are detected; short factual letters are not padded. |
| Paragraph revision API | Exact affected IDs required; unaffected paragraphs preserved; unsafe or failed optional polish retains the safe draft; factual repair is revalidated. |
| Résumé repair API | Controlled case completes with one analysis call and one draft call; exact restoration preserves the original responsibility level. Ambiguous originals are rejected. This is not a live latency benchmark. |
| Document status / role fit | Incomplete assessments do not report confidence; known integrity failures cannot display application-ready export. |
| Candidate evidence | Knowledge/applied/led levels and verbatim examples survive client-to-server prompt handoff. |
| Multi-image intake | Controlled provider response retains both images, a cropped-source warning, conflicting locations, and user-confirmation requirements. This is not live OCR validation. |
| SAP migration intake | Controlled pasted-source test preserves requirements and the untrusted-source instruction boundary. It does not prove universal prompt-injection resistance. |
| Broad document export verifier | Passed; 48 generated artifacts across template/style variants. Selectable text and content expectations verified. |
| Actual Word/PDF visual review | Inspected all 12 rendered pages for Essential ATS and Bold Impact résumé/letter pairs. Letters are one page; résumés are two. No clipping or editor controls in the inspected files. |
| Browser behavior | Desktop and 390-pixel mobile checks passed. No horizontal overflow or JavaScript errors. Dynamic evidence questions retain text; source explanations work; simulated generation failure and cancellation preserve the letter and restore downloads. |

The previous 13 failing assertions during development were expectations for old UI labels and old PDF heading casing. They were updated to the intended presentation contract; the existing content and ordering checks remain in place. The final suite passes.

## Remaining limits and follow-up

- Word and PDF paginate independently. The inspected files preserve content, but exact line wrapping and page breaks differ; some second pages retain substantial white space to keep history and qualifications intact.
- Provider response times and the number of rebuilds depend on the input. The new instrumentation and production smoke test should be used before claiming a general speed improvement.
- Live multi-image OCR was not repeated in this local verification pass. The deterministic intake tests exercise the extraction contract and reviewed-facts handoff.
- A passing local suite and a single production journey do not establish a production failure rate. Deployment readiness and the subsequent signed-in generation result are reported separately after the release is live.

Local evidence is retained under `tmp/improvement-final-suite.log`, `tmp/improvement-final-build.log`, `tmp/improvement-document-exports.log`, `tmp/improvement-all-exports.log`, and `tmp/improvement-render/`. These QA artifacts are intentionally outside the committed application source.
