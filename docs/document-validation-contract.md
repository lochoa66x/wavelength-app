# Application document validation contract v1

The pure validateApplicationDocument function in src/applicationDocumentContract.js
is called from server generation, client readiness, full merged letter edits and
regeneration, and fresh export authorization. Exporters still require their
existing expiring, hash-bound contexts. The contract is not a general fact checker.

Letters require a cited opening, zero to two distinct evidence paragraphs, and a
closing in order; Short allows at most three paragraphs and 180 words, Standard
four and 320. Every substantive paragraph needs candidate and posting citations.
The same 20–2400 character range and existing claim-meaning protections apply at
every stage. API source-id resolution remains a trusted-source boundary check.
A replacement preserves its id and purpose, and its complete merged document is
checked. Removing a required paragraph preserves the draft but disables export.

Résumé generation retains the full source-history, qualification, provenance and
requirement analysis. That review now includes a hash of the canonical candidate
content (excluding target and presentation). New assessments cannot authorize
changed content. Known integrity or contribution failures block all exports;
incomplete posting/fit information may still produce a labelled preliminary file.
Older generated assessments without a content binding require a fresh review
before export. The legacy-review marker survives export context creation, so
preliminary naming cannot bypass it. Existing source/hash protections remain.

Editorial advice is separate from content validity. Conservative signals may miss
semantic repetition or suggest review of an intentional repetition. Optional
summary polishing checks all profile advice and a source-supported specificity
floor before accepting a shorter rewrite. That floor is not a persuasive-writing
score. The human evaluation rubric is evaluations/QUALITY_RUBRIC.md.

A frozen holdout tests outcomes, not just detector absence. Exclusive first-attempt
records cannot be overwritten by a passing retry. Record UI intake and provider
failures, missing files, manual retries and the actual deployed revision.
