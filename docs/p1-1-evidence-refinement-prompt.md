# P1.1 implementation prompt — candidate-confirmed evidence refinement

Implement P1.1, **Candidate-confirmed evidence refinement**, across every Gigscapes tailoring path.

## Product objective

Turn the exact missing-evidence questions produced by the evidence-first review into a safe, useful refinement workflow. A candidate must be able to add facts that were absent from the saved resume without Gigscapes inventing credentials, technologies, employers, projects, dates, responsibilities, or metrics.

## Required behavior

1. Present every evidence question with explicit **Yes**, **No**, and **Not sure** choices.
2. A Yes answer collects:
   - the skill, action, or experience in the candidate's own words;
   - contribution level: supported/advised, contributed/coordinated, owned/delivered, or led/directed;
   - employer or project, when known;
   - approximate date, when known;
   - result or supporting context, with numbers optional and only candidate supplied.
3. Require an explicit candidate confirmation before a Yes answer can be sent to tailoring.
4. Show a literal evidence preview before saving. The preview may join entered facts, but must not infer or embellish them and must not promise that the final wording will be identical.
5. Let the user choose scope:
   - **This application only**: isolate the answer by account and posting;
   - **Reuse on this browser/device**: retain it in a separate, local candidate-evidence sidecar for future tailoring. It is not synced to other browsers or devices.
6. Never silently rewrite the canonical saved resume. Reusable evidence supplements later tailoring requests; the user must still explicitly edit the base resume to make a permanent resume-text change.
7. Include current-application evidence before reusable evidence and preserve the server's five-answer request limit.
8. Send only candidate-confirmed Yes answers and explicit No answers to the API. Not sure is a locally saved decision, not supporting evidence.
9. Rerun the full analysis, truth, history, number, contribution-level, tense, focus, and ATS-readability checks after confirmed changes. Recalculate direct, adjacent, transferable, and missing coverage.
10. A fit label must not improve because the user opened the form, answered No, or selected Not sure.

## Integration requirements

- Support both matched-listing tailoring and **Bring your own posting**.
- Keep application evidence isolated by user and stable target key.
- Keep reusable evidence isolated by user and local browser profile.
- Treat reusable evidence as eligible only when it is a non-declined, candidate-confirmed Yes answer with non-empty literal evidence. Filter old local records through the same rule before request selection.
- Preserve scope through server normalization and return it in response metadata.
- Handle blocked local storage with an actionable inline message while leaving the generated resume usable.
- Keep the existing safe preliminary fallback and posting-readiness gates unchanged.

## Verification

- Add pure tests for answer normalization, preview generation, request selection, account/target isolation, reusable storage, and server-side scope validation.
- Update `docs/product-pipeline.md` with implementation status and the explicit canonical-resume safety boundary.
- Run `npm test` and `npm run build` successfully.
