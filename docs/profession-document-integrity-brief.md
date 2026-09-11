# Profession document quality: implementation prompt

Implement the September 11 profession QA findings in Gigscapes. Produce accurate, persuasive, exportable résumés and cover letters for accounting, plumbing, carpentry, warehousing, customer service, design, and administration. Use the ten fictional QA profiles as repeatable regression inputs. Complete the implementation and verification; do not stop after writing this brief.

## Required behavior

### 1. One candidate-claim integrity contract

Create shared validation usable by both server and browser. Model consequential candidate facts with their source excerpt, employer/project context, contribution level, numeric value and unit, and credential/status. A posting establishes relevance, never a candidate qualification. Do not treat the presence of a citation or a word elsewhere in the résumé as proof of the proposed statement.

Apply the contract to generated and regenerated cover-letter paragraphs, manual edits, saved-draft readiness, and export authorization. Integrate the same boundaries into résumé requirement assessment and the existing résumé provenance path. Preserve the existing source fingerprint, content hash, authentication, private-data handling, and bounded repair behavior.

Reject or repair these concrete failures:

- CPA exam preparation explicitly marked not held cannot support a current CPA claim.
- Expired forklift authorization cannot establish current forklift certification or a separate First Aid credential.
- Observed pressure testing under supervision cannot become independent leadership or certification of installation quality.
- Peer onboarding cannot become line management or shift-schedule ownership.
- A store-wide result cannot become the candidate's sole personal impact.
- A metric from one employer cannot move to another, even when every word and number occurs somewhere in the source résumé.
- A job asking for five years cannot supply the candidate's five years, whether the requirement uses a digit or a spelled-out number.

Use sentence/fact-level attribution rather than paragraph-wide pooling for consequential claims. Keep qualified/projected/team results qualified. Detect unsupported reassignment of responsibility as well as missing quantities. Support correctly attributed paraphrases and the candidate's legitimate current credentials, independent work, supervision of others, crew coordination, and numbers. Avoid blanket bans on leadership, quantified achievements, or concise prose. Be explicit about the remaining limits of deterministic validation; do not claim a general fact checker.

### 2. Profession-neutral credential and requirement semantics

Represent held/current, expired, in progress, not held, and unknown states. Respect conjunctions and alternatives: every credential in an AND clause must be supported, while an OR clause can be satisfied by a supported alternative. Keep statuses attached to the right credential, including when held and in-progress credentials appear together. Preserve historical expired credentials accurately labeled. Do not infer jurisdictional equivalence or legal eligibility.

Retain meaningful distinctions between knowledge, observation, assisted/supervised execution, independent execution, coordination, and accountable leadership. Correct obviously inappropriate SAP-specific families and scheduling classifications for non-SAP occupations without changing legitimate SAP assessments accidentally.

### 3. Exact Unicode PDF identity

Replace unsafe standard-font assumptions with an embedded, licensed font strategy shared by résumé and letter exporters. Preserve exact names, punctuation, and selectable text. Verify Latin diacritics, Polish, Greek/Cyrillic, and a CJK example; never silently transliterate a name or produce missing glyphs. Use an explicit, actionable error for unsupported glyphs instead of a corrupted download. Keep font assets local, license/attribution included, and load them only for export as appropriate. Check both visual rendering and PDF text extraction. Maintain all existing layout and pagination guarantees.

### 4. Lossless paragraph editing

Enforce the existing 2,400-character paragraph limit before normalization can truncate input. Show the count and a precise over-limit error. A rejected save preserves the full textbox input and unchanged saved draft; a successful save preserves the accepted text. Preserve working cancel/restore and feedback across parent renders. Do not silently truncate generated or stored paragraph text either: retain it for correction or reject the operation explicitly. Test 2,399/2,400/2,401 characters and the 3,317-character regression.

### 5. Source preservation and complete keyword feedback

Investigate why the exact cashier sentence in the base résumé is treated as uncited. Restore correct role-scoped provenance independently of whether that sentence was chosen to support a target requirement. Do not restore a fact from a different employer. Avoid accidental empty roles after fallback; preserve deliberate earlier-experience condensation. Build keyword feedback from the canonical employer-facing document, including certifications, education, projects, languages, and additional sections. A CPA rendered in Certifications must not be reported as absent. Word presence must remain distinct from credential validity.

### 6. Useful profession-specific content and presentation

Remove internal verification language from employer-facing headings. Prefer clear headings such as Summary, Skills, Experience, Certifications, Safety Training, and Skills & Tools. Preserve supplied professional portfolios and work samples for tradespeople as well as designers. Promote relevant current credentials for qualified tradespeople/accountants and actual crew/project scope for lead roles. Preserve apprentice identity and supervised scope. Keep part-time status, unpaid volunteer labels, real dates, language levels, and career gaps intact. Improve volunteer entries without merging them into paid employment.

Maintain the clean Preview/Edit/Sources separation. Simplify hierarchy and avoid category-heavy repeated headings. Do not enlarge content or add filler to consume whitespace. Do not change saved base résumés. Do not invent a metric, credential, employer motivation, availability claim, or work sample to make a document look stronger.

### 7. Editorial review with bounded, honest claims

Improve generation instructions and diagnostics for pasted résumé fragments, résumé repetition, generic openings/closings, and weak example selection. A cover letter should use complete sentences and one or two relevant examples with clear contribution and a supported connection to the job. Short and Standard should retain distinct structures without minimum-word padding. Editorial suggestions must not authorize facts or block a concise, substantive letter just because it is short. Keep mechanical checks distinguishable from judgments that require live-model or human review.

## Verification and deliverables

1. Add focused regression tests for each reproduced integrity/data-loss defect and positive controls for legitimate statements. Exercise generation, edit, saved-plan readiness, and export, not only narrow helpers. Ensure repair failure leaves no unsafe final document.
2. Promote the ten synthetic profiles into a reusable checked-in QA corpus, keeping earlier before-results intact. Make the fixture method explicit. Use truthful provider fixtures; do not mistake handcrafted prose for live model behavior.
3. Rerun all ten cases and assert that the seven previously exportable false variants are blocked. Confirm the valid baseline documents remain usable, with honest preliminary status where appropriate.
4. Export and inspect the ten résumé/letter pairs. Confirm names, dates, role labels, credentials, portfolio links, and text boundaries across preview, DOCX, and PDF. Render all produced PDF pages and inspect layout and glyphs. Record native Word verification limitations accurately.
5. Verify editor rejection/restoration through the visible UI. Check that preview remains clean and no application error appears. Run the relevant tests, the repository suite, and the production build; investigate failures rather than loosening expectations to get green output.
6. Deliver this reusable prompt, implemented changes, a concise before/after verification report with concrete evidence, and a candid statement of remaining limitations. Do not describe fixture testing as live production testing. Do not commit or deploy as part of this implementation turn unless separately requested.

Completion means all required code changes are implemented and the relevant checks pass. If a technical limitation remains, describe the exact residual behavior and preserve the work already completed.
