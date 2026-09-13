# Validation and document-quality fixes — 2026-09-13

Execution brief: docs/document-quality-fix-brief-v3.md. Baseline release: d5c9fe6.

Implemented shared approval/supervision/authority checks, removed the editor-only vocabulary gate, repaired numeric cited-fact selection, and advanced the document contract to version 5. Résumé meaning findings now block export even when requirement analysis is unavailable. Added opt-in detached evaluation capture to both generation handlers, including rejected drafts and bounded repairs. Production has no private-content recorder by default.

Editorial changes flag profiles composed only of role headings and additional forms of letter restatement. A low-quality keep decision remains review-needed; a proposed title-only profile cannot win by claiming a higher score. The UI keeps editorial review separate from document checks and export permission.

## Verification

- 894 tests passed, 0 failed; 29 new regression tests plus expanded résumé-handler capture assertions. Coverage includes generation, paragraph regeneration, safe/rejected edits, saved readiness and export. Positive controls preserve courtesy, approval paraphrases, genuinely independent actions, cited tools and shared team quantities.
- Full production build passed. Existing large-chunk warnings remain.
- Résumé export, cover-letter export and combined document-quality verification passed. Both styled document pairs preserve expected content and selectable PDF text; the combined fixture has two-page résumés and one-page letters.
- The first full run exposed four failures from a missed valid team phrase, “as part of a kitchen team.” Corrected that comparison; the final full suite passed.
- Fixed the extra résumé readiness gap discovered during regression testing: meaning issues had been conditional on having requirement analysis.
- Deterministic replay of the unchanged ten-case v2 cohort is saved in frozen-v2-replay.json. It flags F09’s title-only profile and restatement in F04/F07. No approval/tool diagnostic was raised on the nine available original letters. This is a replay of known outputs, not ten fresh live tests or new human scores.

## Limits and remaining work

The original F09 rejected provider draft was not retained, so its precise cause remains unknown. The multi-citation numeric false rejection is independently reproduced and fixed; it cannot retrospectively prove what failed in F09. The authenticated ?evaluation=1 mode now downloads the raw first letter draft, repair and outcome through the UI. It remains off by default. F09 attempt 4 captured a false shared-credit rejection for “a freelance assistant and I”; a permanent regression now accepts that wording while rejecting removed credit. A separately cited project year is also tested without confusing the year with a quantity.

F02/F05 weaknesses from the human review still escape the bounded repetition heuristics. Writing improvements need another independently scored unseen cohort; fewer warnings do not establish better writing. Existing first-attempt failures, scores, frozen inputs and downloaded files are preserved. Native Microsoft Word pagination and clipboard-byte verification remain unverified.

Production release and targeted browser verification are recorded separately after deployment.

## Live findings and follow-up fixes

F09 attempts 2–4 are appended separately: a release-boundary stale assessment block, an uncaptured numeric rejection after refresh, and a letter-only diagnostic success after an automatic repair. The exported floral résumé and letter each have a clean one-page PDF and matching DOCX text. These successes do not erase their first provider failures.

F10 attempt 2 produced a blocked package: completing minor repairs was mistaken for an in-progress diploma in the next sentence. Qualification status is now scoped to the relevant sentence. Contract findings are counted, displayed, sent into repair prompts and included in metadata-only runtime counts. The safety fallback cannot treat a contract-blocked résumé as safe. Matching-letter export correctly inherited the résumé block. This failed attempt remains preserved; deployment retesting will be appended separately.

Captured letter editorial drafts and validation are now included in opt-in reports. The application release a6fa1bb is verified by 894 passing tests and a successful build. Production results follow below.

## Production verification

- Application commit: a6fa1bb5ce403a356435bb334f7e1021d6d837e6. Vercel deployment dpl_Ds69Gv7AMiLZH9mf4PKqGmBuRiz3 reached READY and serves both gigscapes.com and www.gigscapes.com.
- Four public routes returned 200 with the deployed entry asset. Three unauthenticated generation/intake API requests returned 401 with no-store cache headers.
- F10 attempt 3 on this release completed the unchanged wardrobe package. The résumé needed one built-in repair after three first-draft skill findings; this is NOT a clean first-provider success. The letter passed its first factual validation without repair. The editorial proposal was rejected for insufficient content gain, and the UI kept writing review visible.
- Four actual browser downloads (résumé and letter DOCX/PDF) plus an edited-letter pair passed text/preview parity, candidate identity, internal-text leakage and PDF clipping checks. Each PDF was one page. The original pair was also visually inspected. DOCX content is checked; native Microsoft Word pagination is not.
- Live courtesy edits save. Replacing the approval condition with required no approval is rejected; the attempted text remains editable and the prior valid preview remains intact. The edited exports retain the valid approval condition and the courtesy sentence.
- Original user résumé restored and verified byte-for-character equality in the editor: 10,984 characters. No private résumé text is included in tracked evaluation records.

## Honest quality assessment

The wardrobe résumé now has a useful compact profile: live-performance wardrobe operations, minor costume care, and supervisor plots/instructions. Its clean single-column PDF is readable with no pagination defects. The letter still repeats the supervisor instruction in its opening and mainly recounts duties. Its 84 words leave substantial blank page space; adding filler would not improve it. The next writing change should develop a supported work example with a distinct constraint or judgement and remove the duplicate explanation.

This round repaired concrete validation errors and made rejected provider attempts reviewable. It does not establish a new ten-career success rate. The original ten first-attempt records and human scores remain unchanged. The earlier floral numeric rejection cannot be explained retrospectively without its missing raw draft. Résumé capture is available to an injected evaluation recorder; the browser report currently exposes letter drafts, while the wardrobe résumé first-failure evidence is limited to runtime category counts.

Artifacts: tmp/validation-fixes-v3-live-2026-09-13 (ignored local folder). Preserved attempts: F09 2–4 and F10 2–3; final smoke record: version5-deployment-smoke.json.
