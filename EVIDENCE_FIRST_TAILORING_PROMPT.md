# Evidence-First Tailoring v1 — implementation prompt

Companion contract: `docs/CANDIDATE_CONTROLLED_DOCUMENT_TUNING_PROMPT.md` defines the current candidate-controlled, recruiter-positive UX and employer-facing document policy. Apply both documents; the companion contract controls if older wording here requires redundant confirmation or negative employer-facing disclosure.

You are improving Gigscapes, a job-discovery and résumé-tailoring application. The résumé output is the product's core value. Implement a truthful, evidence-first tailoring pipeline that produces useful direct-match, adjacent-expertise, and transferable-strengths résumés without inventing experience or presenting transferable skills as equivalent to direct target-role experience.

## Product objective

Given one base résumé and one job posting, create a targeted, ATS-readable résumé that:

1. Preserves every historical employer, title, date, credential, number, tool, and technology.
2. Separates direct evidence, adjacent evidence, transferable evidence, and missing evidence.
3. Uses an honest positioning strategy appropriate to the fit.
4. Never turns a career changer into the target professional by implication.
5. Tells the candidate when the posting is incomplete or when important evidence is missing.
6. Reports evidence integrity, posting completeness, requirement coverage, writing quality, parseability, and application readiness separately instead of presenting a fictional universal ATS score.
7. Produces a professional strengths-led chronological résumé when the candidate lacks direct experience, without announcing a career change or disqualifying the candidate in employer-facing copy.

## Required pipeline

### 1. Assess the posting before drafting

Detect whether the posting is complete, partial, or insufficient. Use deterministic signals such as length, abrupt/truncated endings, and the presence of responsibilities or qualifications. A database listing with only a short aggregator summary must be marked partial or insufficient. Do not infer an unstated technology stack from a title.

For partial postings, allow a conservative preliminary draft but make the limitation visible. Recommend that the user paste, link, or upload the complete posting before treating the résumé as application-ready.

### 2. Build a requirement and evidence analysis

Before résumé generation, use a dedicated structured analysis step. Return:

- posting completeness and explanation;
- fit path: `direct`, `adjacent`, or `transferable`;
- recommended candidate level;
- content strategy;
- application-readiness classification;
- requirements, each labelled required, preferred, responsibility, or context;
- evidence match for every requirement: direct, adjacent, transferable, or missing;
- a short exact excerpt from the base résumé for every claimed match;
- verified transferable skills and their source evidence;
- truthful target keywords;
- important missing evidence;
- prohibited or misleading claims;
- up to three optional candidate questions that could uncover material real projects, training, credentials, or experience.

Reject an evidence match when its supporting excerpt cannot be found in the base résumé. Missing evidence must remain missing; absence is not permission to infer.

### 3. Select an honest content strategy

- **Direct:** conventional targeted chronological résumé.
- **Adjacent:** targeted summary, verified adjacent competencies, relevant accomplishments, then chronological history.
- **Transferable:** proven professional headline, concise strengths-led profile, verified transferable capabilities, real projects/training when present, then selected relevant experience in reverse chronological order.
- **Trades:** retain credential-, safety-, and equipment-forward content, with entry/helper positioning when required credentials are absent.

For transferable positioning, do not use the exact target title alone as the candidate's identity and do not use phrases such as `career change`, `transition`, `new career`, `new path`, or `new journey`. Lead with the candidate's established professional foundation and relevant verified strengths. Never use `Apprentice`, `licensed`, `certified`, or a seniority level without support.

### 4. Draft only from approved evidence

The draft must follow the structured analysis. Treat every historical job as one immutable tuple of title, employer, location, and dates. It may reorder or compress bullets within a historical role, but it must not rename, combine, reorder, split, duplicate, or invent historical roles. Never pair a real title with a different employer or date range merely because every field appears somewhere in the source.

Keep employer and location in separate fields. Copy education and credentials exactly; never synthesize a more marketable degree name. Keep profiles to 55–80 words and approximately 16 experience bullets total, with progressively tighter treatment of older work.

Transferable framing must describe relevance without claiming equivalence. Avoid phrases such as `translates directly`, `directly analogous`, or statements implying the candidate has built the target product when the evidence only shows an adjacent capability.

Target technologies and keywords may appear only when:

- they are explicitly supported by the base résumé; or
- they describe a genuinely supported transferable capability without claiming hands-on use of the target technology.

Every skills-section item must either occur in the base résumé or have a supported evidence mapping from the analysis. Generic filler is not allowed. Projects, courses, portfolios, GitHub profiles, and certifications may appear only if present in the base résumé or verified additional candidate context.

### 5. Validate before export

Run deterministic validation for:

- unsupported numbers;
- changed or incorrectly associated employers, roles, locations, or dates;
- duplicated or fragmented history entries;
- unsupported skills;
- unsupported target-role positioning;
- unsupported missing-requirement keywords;
- misleading equivalence phrases;
- reverse chronology;
- weak bullet openings and incorrect tense.

If validation fails, perform one constrained repair pass that receives the exact violations. It must retain supported content and only repair the violations. If the repaired result remains unsafe, block export and leave the base résumé unchanged.

### 6. Replace the single ATS score

Display separate results:

- **Evidence integrity:** pass or blocked.
- **Posting completeness:** complete, partial, or insufficient.
- **Requirement coverage:** counts for direct, adjacent, transferable, and missing.
- **ATS-safe structure:** pass or review.
- **Writing quality:** pass or review.
- **Application readiness:** strong fit, credible stretch, or significant gap.

Do not label the result as a guaranteed ATS score. Explain that parseability and evidence coverage are decision support, not an interview guarantee.

### 7. Strengths-led template

Add a distinct ATS-safe, single-column strengths-led renderer and DOCX/plain-text ordering:

1. Candidate name and proven professional headline.
2. Concise strengths-led profile.
3. Transferable strengths.
4. Projects and training, only when verified.
5. Selected relevant experience in reverse chronological order.
6. Education, certifications, and languages when present.

Keep chronological work history visible. Do not use a purely functional résumé that hides dates or employers.

## UX requirements

- Show the positioning recommendation for direct, adjacent, and transferable cases.
- Make partial-posting warnings prominent and recommend the existing “Bring your own posting” flow.
- Show missing evidence and candidate questions without treating them as résumé content.
- Never export internal evidence mappings, validation metadata, or candidate questions.
- Preserve existing authentication, trusted listing loading, SSRF protections, and local résumé storage behavior.

## Acceptance tests

Add automated coverage proving that:

1. Database listings receive extracted keywords instead of an empty array.
2. A short/truncated aggregator description is marked partial or insufficient.
3. A transferable candidate cannot receive the exact target title as an unsupported identity or employer-facing transition language.
4. A skill absent from the base résumé and unsupported by the evidence analysis blocks the draft.
5. A missing requirement cannot be copied into the résumé as a claimed skill.
6. Supported transferable wording passes.
7. Direct candidates retain conventional positioning.
8. Strengths-led output uses the dedicated renderer and export order.
9. Existing history/number repair behavior remains intact.
10. Duplicate history headers are consolidated without merging genuinely different roles.
11. A title, employer, and date that are individually real but belong to different jobs fail history-association validation.
12. The complete test suite and production build pass.
