# Application document validation contract v3

The pure validateApplicationDocument function in src/applicationDocumentContract.js
is called from server generation, client readiness, full merged letter edits and
regeneration, and fresh export authorization. Exporters still require their
existing expiring, hash-bound contexts. The contract is not a general fact checker.

Letters require a cited opening, zero to two distinct evidence paragraphs, and a
closing in order; Short allows at most three paragraphs and 180 words, Standard
four and 320. Substantive paragraphs need candidate and posting citations.
Factual closing claims also need candidate evidence. Pure invitations do not.
The same 20–2400 character range and claim-meaning protections apply at every
stage. API source-id resolution remains a trusted-source boundary check.
A replacement preserves its id and purpose, and its complete merged document is
checked. Removing a required paragraph preserves the draft but disables export.

Résumé generation retains source-history, qualification, provenance and requirement
analysis. Its review binds the canonical candidate content, excluding target and
presentation, to the validation version. Changed content or rules require recheck.
Known integrity/contribution failures block exports; incomplete posting/fit
information can produce a labelled preliminary file. The legacy-review marker
survives export context creation. Preliminary naming cannot bypass recheck.

Version 2 checks unsupported ongoing/completed academic status and factual letter
closings. A qualification's year alone never establishes that it is in progress.
Structured role/employer/date rows and their source boundaries do not depend on
an occupation whitelist. Empty jobs restore only statements in their own ranges.
Qualification records have one section owner, keyed by name, provider, dates and
status; distinct renewals survive. Explicit portfolio headings support URLs on the
following line without collecting unrelated project links.

Editorial judgement is separate from validity. A bounded model review now runs
even when mechanical writing checks find nothing, if the request budget permits.
It evaluates relevance, useful detail, document purpose, selection and natural
writing. A revision must identify exact original/source excerpts and a concrete
content gain, improve its comparative content score and reach the stated quality floor,
and pass full document validation. Profile review can trade repeated task detail
for useful professional context because work history remains intact; letter review
must preserve useful-detail quality. Profile review can change only profile.
Letter review preserves the opening/closing and the order and purpose of retained
ids; a full editorial revision may merge redundant middle paragraphs. A requested
single-paragraph regeneration still preserves that exact id and purpose. Unavailable, malformed or unsafe reviews
keep the checked original. Status is logged; model scores are not advertised as
independent or human quality ratings. Rechecks after manual paragraph editing use
the same factual contract but do not silently launch whole-document editorial edits.

The human rubric is evaluations/QUALITY_RUBRIC.md. The first ten frozen live
attempts, including the missing landscape letter and poor outputs, are preserved
under evaluations/runs/fresh-careers-v1. Once reviewed, that cohort is a regression
set. Retests never replace first-attempt records or count as unseen evaluation.

Version 3 also separates credential noun phrases from surrounding candidate prose,
retains issuer words for generic credentials, and preserves semicolon status suffixes
without whitespace backtracking. Requirement conjunctions and per-credential status
remain strict. These parsers are bounded checks, not general semantic verification.

Editorial source citations now use a server-built line catalog. Unknown ids and
conflicting id/excerpt pairs are rejected; legacy exact excerpts remain supported.
The resolved source is only an anchor for review rationale, and never substitutes
for validating every factual claim in the proposed document.
