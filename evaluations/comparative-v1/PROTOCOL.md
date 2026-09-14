# Comparative experiment v1 — frozen 2026-09-14

Baseline: 764b5aa98b55408cf2cfa62047f424cc06cdf777, document contract 7.
Six fictional cases, four arms, two documents per arm: 48 scheduled first requests.
Inputs, selected exact excerpts, order, prompts and rubric are frozen before calls.
This is a diagnostic development experiment, not an independent unseen benchmark.

| Arm | Intervention |
|---|---|
| pipeline | Unmodified current production handlers, including analysis, deterministic processing, validation, automatic repairs and editorial review |
| simple | One provider request per document; short prompt, neutral structured document schema, current production model, low reasoning |
| reasoning | Exact simple prompt/schema/model/token limit, high rather than low reasoning effort |
| selection | Exact simple configuration plus two preselected, verbatim candidate excerpts; full candidate source remains available |

Simple vs pipeline estimates the combined effect of prompts, schema, orchestration and repair. It does not isolate a single prompt sentence. Pipeline traces permit within-output inspection before and after repair; this is descriptive, not a randomized repair ablation. Reasoning tests an effort setting, not a different model family or the model's capability ceiling. Selection tests editorial attention to existing facts, not additional candidate evidence. Selected excerpts were chosen before outputs, with no novel facts. Each document receives the original source; no generated résumé becomes letter evidence.

Baseline arms have 6,000 output tokens and 110 seconds, one attempt, no retry or provider fallback. Pipeline uses existing production budgets/retries and captures every upstream attempt, first draft, repair and delivered response. Failures remain in the denominator. No prompt changes or manual retries during this experiment. Latency and token usage are descriptive; no dollar costs without verified prices. Actual response model and requested model are recorded; a mismatch or fallback is a confound.

Apply the existing QUALITY_RUBRIC.md five dimensions, 0–4 each, separately to résumé and letter. Record factual pass/review/fail independently, including employer attribution, shared outcomes, credential status, academic status, rates and scope. Acceptance: at least 15/20, every dimension at least 2, factual pass. Missing outputs receive null scores and fail package completion. Shortness and lack of validator warnings earn no points. Scores require concrete excerpts/reasons. Automated contract outcomes are compared with semantic review rather than treated as ground truth.

The same coding agent authors inputs and reviews outputs and knows the interventions. Its ratings are provisional, not blinded independent human evidence. A separately masked, consistently formatted packet will support user/recruiter review. Pending human ratings must stay pending. Report per-case paired differences, wins/ties/losses and medians, no significance or generalization claims from six cases. An intervention is a follow-up candidate if it improves at least four of six paired document scores by at least two points without increasing factual failures; otherwise report mixed evidence.

Native product layout and Word/PDF rendering are excluded from the causal writing comparison; common presentation holds visual style constant. Do not call neutral comparison files verified application exports. The previous real download verification remains separate. Competitors, if sign-in and credits permit, receive these same six fictional packages and default settings, with first outputs preserved. Missing access is unavailable, not a quality score. Vendor marketing is not comparative evidence. External products cannot isolate model/pipeline causes because settings and internals differ.

Only frozen fictional inputs may enter the temporary authenticated, capability-gated runner. No real résumé read/write, arbitrary prompts, model overrides, credential extraction, or application-package storage. Remove the deployed runner after capture; keep reproducible experiment code and reports. Normal generation and shared validation are not changed based on this experiment until evidence supports an implementation choice.
