# Evidence-First Tailoring v1 — implementation prompt

You are improving Gigscapes, a job-discovery and résumé-tailoring application. The résumé output is the product's core value. Implement a truthful, evidence-first tailoring pipeline that produces useful direct-match, adjacent-pivot, and career-change résumés without inventing experience or presenting transferable skills as equivalent to direct target-role experience.

## Product objective

Given one base résumé and one job posting, create a targeted, ATS-readable résumé that:

1. Preserves every historical employer, title, date, credential, number, tool, and technology.
2. Separates direct evidence, adjacent evidence, transferable evidence, and missing evidence.
3. Uses an honest positioning strategy appropriate to the fit.
4. Never turns a career changer into the target professional by implication.
5. Tells the candidate when the posting is incomplete or when important evidence is missing.
6. Reports evidence integrity, posting completeness, requirement coverage, writing quality, parseability, and application readiness separately instead of presenting a fictional universal ATS score.
7. Produces a hybrid chronological career-change résumé when the candidate lacks direct experience.

## Required pipeline

### 1. Assess the posting before drafting

Detect whether the posting is complete, partial, or insufficient. Use deterministic signals such as length, abrupt/truncated endings, and the presence of responsibilities or qualifications. A database listing with only a short aggregator summary must be marked partial or insufficient. Do not infer an unstated technology stack from a title.

For partial postings, allow a conservative preliminary draft but make the limitation visible. Recommend that the user paste, link, or upload the complete posting before treating the résumé as application-ready.

### 2. Build a requirement and evidence analysis

Before résumé generation, use a dedicated structured analysis step. Return:

- posting completeness and explanation;
- fit path: `direct`, `adjacent`, or `career_change`;
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
- up to five candidate questions that could uncover real projects, training, credentials, or experience.

Reject an evidence match when its supporting excerpt cannot be found in the base résumé. Missing evidence must remain missing; absence is not permission to infer.

### 3. Select an honest content strategy

- **Direct:** conventional targeted chronological résumé.
- **Adjacent:** targeted summary, verified adjacent competencies, relevant accomplishments, then chronological history.
- **Career change:** honest transition headline, career-transition profile, verified transferable strengths, real projects/training when present, then selected relevant experience in reverse chronological order.
- **Trades:** retain credential-, safety-, and equipment-forward content, with entry/helper positioning when required credentials are absent.

For a career change, do not use the exact target title alone as the candidate's identity. Prefer forms such as `Enterprise Integration Professional | Web Development Transition` or `Entry-Level Plumbing Candidate`, depending on the evidence and field. Never use `Apprentice`, `licensed`, `certified`, `experienced`, or a seniority level without support.

### 4. Draft only from approved evidence

The draft must follow the structured analysis. It may reorder or compress bullets within a historical role, but it must not rename, combine, reorder, or invent historical roles.

Transferable framing must describe relevance without claiming equivalence. Avoid phrases such as `translates directly`, `directly analogous`, or statements implying the candidate has built the target product when the evidence only shows an adjacent capability.

Target technologies and keywords may appear only when:

- they are explicitly supported by the base résumé; or
- they describe a genuinely supported transferable capability without claiming hands-on use of the target technology.

Every skills-section item must either occur in the base résumé or have a supported evidence mapping from the analysis. Generic filler is not allowed. Projects, courses, portfolios, GitHub profiles, and certifications may appear only if present in the base résumé or verified additional candidate context.

### 5. Validate before export

Run deterministic validation for:

- unsupported numbers;
- changed employers, roles, or dates;
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

### 7. Career-change template

Add a distinct ATS-safe, single-column career-change renderer and DOCX/plain-text ordering:

1. Candidate name and honest transition headline.
2. Career-transition profile.
3. Transferable strengths.
4. Projects and training, only when verified.
5. Selected relevant experience in reverse chronological order.
6. Education, certifications, and languages when present.

Keep chronological work history visible. Do not use a purely functional résumé that hides dates or employers.

## UX requirements

- Show the positioning recommendation for direct, adjacent, and career-change cases, not only career changes.
- Make partial-posting warnings prominent and recommend the existing “Bring your own posting” flow.
- Show missing evidence and candidate questions without treating them as résumé content.
- Never export internal evidence mappings, validation metadata, or candidate questions.
- Preserve existing authentication, trusted listing loading, SSRF protections, and local résumé storage behavior.

## Acceptance tests

Add automated coverage proving that:

1. Database listings receive extracted keywords instead of an empty array.
2. A short/truncated aggregator description is marked partial or insufficient.
3. A career changer cannot receive the exact target title as an unsupported identity.
4. A skill absent from the base résumé and unsupported by the evidence analysis blocks the draft.
5. A missing requirement cannot be copied into the résumé as a claimed skill.
6. Supported transferable wording passes.
7. Direct candidates retain conventional positioning.
8. Career-change output uses the dedicated renderer and export order.
9. Existing history/number repair behavior remains intact.
10. The complete test suite and production build pass.
