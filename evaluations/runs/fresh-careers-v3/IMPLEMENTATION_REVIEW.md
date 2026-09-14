# Useful writing v4 — implementation and follow-up

The brief is `docs/useful-writing-iteration-v4.md`. The unchanged first ten are scored in `QUALITY_REVIEW_2026-09-13.md` and `scores-attempt-1.json`. Their 3/10 accepted-pair result remains unchanged by later retests.

## Shipped implementation

Initial production revision **90c85f4a0a936eb8f28b48f1de210290c4c0cf6c**:

- Editorial selection can accept a narrowly verified removal of a redundant follow-up sentence with a small score gain. Exact source references, change explanations and the factual validator still apply. A captured wardrobe example reproduces the previous rejection. Distinct conditions, quantities, examples and responsibility limits remain protected in regression tests.
- Cover-letter generation and editorial review receive up to two relevant source blocks with exact source IDs and excerpts. Employer/project boundaries remain separate. This is selection guidance, not a semantic guarantee: the first photo-editor letter still omitted its stronger project example.
- Résumé generation has an authenticated, opt-in evaluation report, downloaded through `?evaluation=1`. It preserves the provider's first draft, validation, repair and editorial results. Normal responses do not contain reports. Reports are not persisted to normal application storage or included in employer documents.

Follow-up production revision **8082792aedb8468fc4a71bca125a83b6c45eef9d**, document contract **6**:

- Normal, trade and summary-only schemas now share the same profile instructions. Their previous sentence-count and content demands contradicted the main generation prompt.
- Profile instructions prohibit importing employer setting or clientele from the target posting. This addresses the veterinary case through generation guidance; it does not constitute a general semantic clientele validator.
- Résumé profiles now run through the shared candidate-claim checks. A spelled-out duration derived from year-only employment dates is rejected; an explicitly sourced duration still passes. The regression checks server review and export readiness.
- Rate parsing ends before words such as “alongside”, preserving “per shift” in the baker paraphrase. Shared oven-output attribution is recognized; changed denominators, units and individual-credit claims remain rejected.
- Skill generation instructions match the existing source-exact/verified-skill contract. General semantic synonym matching is still unresolved; matching instructions avoids encouraging labels the validator rejects.

## Verification

Three selected live retests on contract 6 are documented in `TARGETED_RETEST_REVIEW.md`: all three complete, two accepted pairs, veterinary profile still below the writing threshold. Their 12 files passed content checks and PDF visual inspection. A further false rejection of a correctly cited employment range was captured in the mechanic's first letter; contract 7 adds a narrow shared fix with valid/invalid range regressions. These retests do not replace the original ten.

- **904/904 tests passed on the final contract-7 code**, including actual outgoing schema assertions, captured editorial behavior, profile claim/export parity, valid/invalid rate attribution and the captured date-range regression. Log: `tmp/writing-v4-final-range-tests.log`. The preceding contract-6 run passed 903/903 tests.
- Final production build passed. Log: `tmp/writing-v4-final-range-build.log`. Existing large-chunk advisory remains.
- Existing combined résumé/letter export verification passed; this fixture check is separate from the actual live downloads. Log: `tmp/writing-v4-document-exports.log`.
- Both code revisions reached Vercel READY and production aliases. For 8082792, deployment **dpl_56L9whSmeiC6jo4ByGjyvx9TpuUa** serves `gigscapes.com` and `www.gigscapes.com`.
- Live smoke checks returned 200 for `/`, `/app`, `/privacy`, `/sign-in`, with matching deployed assets. Unauthenticated generation/intake endpoints returned 401 and `no-store`. Evidence: `tmp/useful-writing-v4-live-2026-09-13/targeted-contract6/deployment-smoke.json`.
- Original résumé restoration was verified by exact DOM readback after save (10,984 characters). No private résumé text is included in committed reports or the review artifact bundle.

## Limits and next decision

The remaining dominant writing issue is the résumé profile: a source-grounded duty list can still pass a factual gate and receive an inflated editorial self-score. Source-token overlap is only an acceptance floor, not proof of a useful professional introduction. The next focused change should compare whether a profile contributes identity, setting or specialty beyond the experience inventory, and should preserve the stronger original when a revision makes it more repetitive.

Evidence selection also needs direct evaluation against available source examples. The photo-editor letter retained a list of duties while overlooking the mixed-light project already present in the résumé. More prompt text alone is not evidence that selection improved.

Estimate: use **two to three measured cycles as a checkpoint**, not a promise of completion. Two consecutive fresh, untouched ten-career sets meeting the original thresholds would justify leaving broad iteration mode. If the dominant quality scores do not move across those cycles, change the composition/review approach rather than extending an open-ended sequence of regex patches. Calibrate a subset with an independent human reviewer before interpreting agent scores as external writing quality.
