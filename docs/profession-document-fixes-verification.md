# Profession document fixes — implementation and verification

Implemented in the working tree on September 11, 2026, against baseline `ba4f9f0d2aeae6de8e4ed2a65fe3513ec071b3e9`. The reusable implementation prompt is [profession-document-integrity-brief.md](profession-document-integrity-brief.md). This report records pre-release verification; Git and Vercel record the subsequent release.

## What changed

The seven previously exportable false variants are now rejected. The shared candidate-claim checks run in the cover-letter API (including paragraph regeneration), manual editing, restored-draft readiness, and export authorization. The résumé provenance and requirement checks use the same boundaries. The checks attach quantities, common units, contribution level, credential state, and identifiable employer context to the paragraph’s cited candidate facts. Posting requirements no longer authorize candidate numbers.

Credential assessment distinguishes current/held, expired, in-progress, not-held, and unknown evidence. AND requirements need every credential; OR requirements accept an established alternative. Active and in-progress credentials in separate clauses retain their respective status. Current credentials require explicit current/active/valid evidence. The generic testing family is now `testing_inspection`; owning a shift schedule is treated as work responsibility rather than personal availability.

PDF exports load licensed local Noto fonts when Unicode is present, retain selectable names, and reject missing glyphs explicitly. Latin/Polish, Greek, Cyrillic, and a Chinese name were tested in both document types. The selected serif/sans style is preserved where available; CJK uses Noto Sans SC and upright date emphasis. The font assets include licenses, checksums, and a reproducible CJK preparation script. The assets are loaded during export, not embedded in the initial JavaScript bundle.

The paragraph editor shows a count, rejects the raw input above 2,400 characters, and keeps the full textbox input and saved draft. Generated and restored oversized paragraphs cannot silently become shortened authorized exports. The boundary tests cover 2,399, 2,400, and 2,401 characters, plus the 3,317-character regression.

The history parser now accepts structurally identifiable employment headings outside its old professional-title vocabulary. This restores the exact Cashier bullet while retaining employer boundaries and recognized company-first headings. Keyword feedback now uses the canonical exported document, including credentials and education. It remains a word-presence report, separate from evidence of qualification.

Presentation changes put relevant outcomes and crew coordination first within roles, bring active CPA/trade credentials forward, simplify employer-facing headings, preserve trades portfolios, and render volunteer entries on separate lines. Existing labels for part-time, supervised, unpaid, and expired experience remain intact. The cover-letter instructions now require complete sentences and distinct supported examples; an additional editorial check flags common pasted résumé fragments.

## Ten-case results

| Case | Main before/after result |
| --- | --- |
| P01 — Senior accountant | CPA is no longer falsely missing from keyword feedback. Active certification appears near the top; the eight-to-six-day close improvement leads the current role. |
| P02 — Bookkeeper applying to senior accountant | False current CPA and transferred employer metrics are rejected. Exam preparation remains accurately labeled. Baseline documents remain preliminary. |
| P03 — Residential plumber | Main trade credential precedes safety training. Four daily calls and coaching two apprentices remain usable. |
| P04 — Plumbing apprentice | Observed tests remain related experience; invented independent test leadership/certification is rejected. Supervision stays visible. |
| P05 — Finish carpenter | Three-person crew/24-unit scope leads the role. Supplied work-sample URL survives. The trades prompt no longer prohibits portfolios. |
| P06 — Labourer applying to foreman | Borrowed five-year tenure is rejected with both word and digit requirements. Supervised employment and unpaid personal project stay distinct. Baseline remains preliminary. |
| P07 — Warehouse associate | Expired authorization cannot support current forklift plus First Aid credentials. Historical experience stays labeled. Baseline remains preliminary. |
| P08 — Customer service associate | Peer onboarding cannot become management; the store result cannot become sole personal impact. The Cashier bullet is restored. |
| P09 — Graphic designer | Łukasz Żółć survives both PDF headers/signature and DOCX text. Portfolio remains present; headings are shorter. |
| P10 — Administrative assistant | The 3,317-character save is rejected with the 917-character excess stated. Full input, original preview, successful shorter save, and restore are verified. Volunteer text is separated from its role line. |

All ten truthful résumé and letter baseline handlers return 200. Their existing readiness distinction remains: P02, P06, and P07 are preliminary; the other baseline documents are exportable under the existing readiness policy. Exportable means the document checks permit export; it does not establish that the candidate meets every job requirement.

## Verification evidence

- **736 tests pass**, including 29 new profession integrity tests and five Unicode PDF tests. The full suite includes existing source, storage, API, export, and presentation regressions.
- **Production build passes.** Vite retains its existing warning about a chunk above 500 kB. The small shared PDF font loader is a separate export chunk; font files remain static export-time assets.
- **Ten profession pairs exported:** 20 PDFs and 20 DOCX files. All baseline PDF names and DOCX names are preserved; measured text bounds stay within pages.
- **Eight additional Unicode PDFs:** résumé and letter for Polish, Greek, Cyrillic, and Chinese names. An unsupported emoji-name test produces an explicit error rather than a corrupted file.
- **All 28 PDF pages rendered and visually reviewed.** No clipping, unreadable names, or broken page layout found. Short fixture letters have substantial whitespace; they were not padded to fill the page.
- **Browser checks:** all ten fixture previews render without horizontal overflow or Vite overlays. Error log is empty. The paragraph rejection/save/restore sequence passes, and Unicode font requests succeed.
- **Browser download limitation:** the automation cancels both app PDF/DOCX downloads and an independent plain-text control. Therefore browser-to-disk download completion remains unverified. This does not invalidate the separately generated and inspected exporter artifacts. Native Microsoft Word pagination was not tested.

The full evidence package is `tmp/profession-fixes-2026-09-11/`: `results.json`, `verification-summary.json`, the 40 baseline documents, eight Unicode PDFs, extracted text/bounds, browser snapshots, and seven visual review sheets. Before-results remain intact in `tmp/profession-qa-2026-09-11/`.

Reproduce the primary checks from the repository root:

```text
npm test
npm run verify:professions
npm run build
```

`tests/fixtures/professionCorpus.mjs` contains fictional people, employers, postings, credentials, and metrics. `scripts/verifyProfessions.mjs` exercises the real local handlers, validators, readiness logic, and exporters with controlled provider responses. It makes no production calls. Set `PROFESSION_QA_OUTPUT` to use a different output folder. Set `UNICODE_QA_OUTPUT` when running `tests/pdfUnicode.test.js` to retain its eight PDFs.

## Candid remaining limits

This is a focused integrity and presentation improvement, not proof that live AI prose is persuasive. The old handcrafted letters were intentionally retained for comparison. Nine now receive the new fragment advice; their generic opening/closing patterns are still visible. The generation instructions and bounded optional polish path have improved, but a fresh live-generation editorial evaluation is still needed to measure the result. Mechanical writing suggestions remain advisory and do not label a short letter invalid merely for being short.

The deterministic checks cover the reproduced problems and positive controls. They are not a general semantic verifier, credential registry, legal eligibility check, or universal grammar parser. Unusual phrasing, ambiguous multi-project citations, and unsupported scripts still require review. A source that does not explicitly state a current credential or a duration may need clearer candidate evidence. The font set does not promise all Unicode characters or complex-script shaping; unsupported glyphs are reported without modifying the source text.
