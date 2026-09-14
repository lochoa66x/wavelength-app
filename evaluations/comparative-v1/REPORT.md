# Comparative experiment — 14 September 2026

The strongest actionable evidence points to **validation and source mapping**, followed by résumé organization. This run does not justify replacing the model or removing the whole writing pipeline. The pipeline generally produced more focused letters than the simple prompt, but it also blocked supported prose and removed supported résumé content. Increasing reasoning effort did not produce a meaningful paired improvement on this set. Preselecting evidence helped some letters, without meeting the preregistered consistency threshold.

These are provisional conclusions from six fictional, compact sources. The coding agent authored the inputs and reviewed the outputs; its scores are not independent recruiter ratings. Human standards calibration is still pending.

## What actually ran

- Six careers: SAP migration workstream lead, staff accountant, plumbing apprentice, client onboarding coordinator, junior data analyst and freelance interior photo editor.
- Original experiment: four approaches × six cases × two documents = **48 first requests**, producing 46 delivered documents. All original failures are retained.
- Separate confirmation round: **12 additional requests**, producing 11 delivered documents. These do not replace the original attempts.
- **103 upstream provider calls** including the pipeline's built-in retries, rebuilds and editorial passes. Requested and reported models were `gpt-5.6-terra` throughout. Baseline low/high effort, prompts, schemas, responses, usage and timing are captured.
- No candidate facts were added during the experiment. No real résumé was read or replaced by the runner. No application was submitted.
- Teal and Rezi were checked but both required sign-in; neither was tested. No competitor superiority claim is supported by this experiment.

The [original protocol](PROTOCOL.md), [frozen manifest](manifest.json), [confirmation manifest](confirmation-manifest.json), [raw attempts](raw), [readable outputs](readable), [scores](scores.json), [metrics](metrics.json) and [diagnostic reproductions](diagnostics.json) are retained. Raw attempt files were created exclusively and verified unchanged on subsequent captures.

## An experiment mistake, preserved rather than hidden

The first runner omitted `source_review.user_confirmed_complete` and `appears_complete`. The fictional postings had complete responsibility/qualification lists, but the app correctly received no explicit completeness confirmation. Because they were short and ended in list fragments, it classified all six as partial. All six original pipeline résumés were preliminary. That is **not evidence that the normal reviewed-complete UI is broken**.

After discovering this, I registered the confirmation round before issuing its requests. It added only the completeness metadata, with the same candidate facts and job requirements. All six confirmation résumés then received a complete-posting assessment and the API's ready status. Because this was a later stochastic sample with a different pipeline context, the first/confirmation difference cannot be attributed solely to metadata. The original failures and scores remain separate.

## Results

Scores are agent judgments out of 20, using the five dimensions in [the existing rubric](../QUALITY_RUBRIC.md). Medians include only delivered documents; missing outputs remain failures in the delivery denominator. These are writing scores, not ATS probabilities or verified export scores.

| Approach | Delivered documents | Résumé median | Letter median | Median request time |
|---|---:|---:|---:|---:|
| Original pipeline, preliminary context | 10/12 | 15.5 | 17 | 17.23 s |
| Simple prompt, low effort | 12/12 | 15 | 14 | 3.37 s |
| Same prompt, high effort | 12/12 | 16 | 14 | 3.66 s |
| Same low-effort prompt + selected excerpts | 12/12 | 15.5 | 16.5 | 3.43 s |
| Separately source-confirmed pipeline | 11/12 | 14.5 | 17 | 14.78 s |

The original pipeline used 158,817 input / 20,236 output tokens; the confirmation round used 148,349 / 20,209. Simple used 6,864 / 4,101; high effort used 6,864 / 4,270; selected evidence used 7,840 / 3,775. Output totals include reasoning tokens. This shows the orchestration overhead on these small sources; it is not a production cost forecast. Prices were not used to invent a dollar estimate.

Against simple, high effort scored higher on two résumés and one letter, but **none gained two points**. The remaining comparisons were ties except one lower-scoring résumé. Selected evidence gained at least two points on **two of six letters**, and no résumés. Neither met the preregistered four-of-six threshold. The confirmation pipeline's delivered letters won four comparisons and tied one; the sixth was unavailable. Its résumés won two, tied two and lost two.

The strict provisional content criterion (both documents at least 15/20, no dimension below 2, factual pass) accepted 2/6 confirmation pairs and 1/6 pairs in each simple/high/selection arm. Original preliminary-context pipeline outputs met that content criterion in 4/6 pairs, but **zero were application-ready by that run's posting assessment**. These small, uncalibrated counts are diagnostic, not release claims. No Word/PDF export verification was performed in this experiment.

## Concrete failures and what they imply

**1. Supported calendar years are treated as quantities.** The accounting letter cited the exact project heading containing 2025 and the full measured result. Its opening to the example was “During a 2025 month-end improvement project”. `quantityFacts` parsed 2025 with unit `project`. The matching source heading has a year, not 2,025 projects, so the valid paragraph failed. It failed again in the confirmation round. The first photo letter similarly parsed “the 2025 Riverside Apartment Series” as a quantity with unit `sery`. Both initial letters returned HTTP 422.

The photo letter's first draft also omitted required citations in a factual closing. That was a real citation defect. Its repair added citations, but the year rejection remained. In the confirmation round the letter omitted the year and passed. **Avoiding the trigger is not fixing the validator.** See the proposed text, parsed quantities, exact excerpts and reproduced issues in `diagnostics.json`.

**2. Whole-profile context can cause false leadership and credential alarms.** The initial apprentice profile described a Plumbing Techniques certificate holder assisting a licensed plumber, including supervised leak checks. The source explicitly supports those facts. The contract reported unsupported leadership and a credential-status issue. The isolated phrases “Experience with supervised leak checks” and “Plumbing Techniques certificate holder” passed; the combined profile did not. This points to assertion scope and source selection, not merely a missing word in a blacklist. The actual unsupported counterexample “Led a licensed plumbing crew” remained blocked.

**3. A source-section boundary loses employment evidence.** The photo source includes an Event Photo Assistant role at Example Studio, 2020–2022, with “Labelled memory cards, prepared equipment and organised contact sheets.” `sourceHistoryEntries` returned only the freelance role: it did not recover the later employment entry after the selected-project section. Generated assistant-role bullets consequently received incomplete-citation failures. After two rebuilds, fallback removed the supported bullet and left the role empty. This happened in **both** pipeline rounds. The project and portfolio survived, so the finding is specifically a lost employment bullet and unfinished role, not a lost portfolio.

**4. Content rules can misclassify ordinary work language.** In the original onboarding case, “online-registration transition” triggered an unsupported-positioning issue for the word `transition`, although the source expressly describes the move from paper waivers to online registration. Operational change should not be mistaken for unsupported career-change framing. The final confirmation profile became only “Front desk supervisor with customer-facing registration coordination experience.” It is safe-looking but thin.

**5. Organization and claim quality still need review even when generation completes.** Simple, high-effort and selected-evidence onboarding résumés each repeated almost the entire registration project under both experience and projects. The confirmation pipeline branded the analytics graduate primarily as a Retail Assistant and fragmented the academic project into five bullets. The apprentice résumé used present-tense “Pick” for a warehouse role ending in 2023. The confirmation accounting résumé assigned the reduction directly to the candidate (“Reduced unresolved differences”), while the source describes a decline following work with the controller; neutral result attribution is safer.

The baselines also demonstrate why removing validation wholesale is a poor trade: selected-evidence accounting invented an explicitly “current” role from a dated range, and the high-effort photo letter invented specific contents of a portfolio whose source supplied only a URL. Several letters used “since” to imply ongoing work without an explicit current marker; those were marked for review, not silently approved.

## What to change next

1. **Fix calendar/quantity typing and recover employment after project sections.** These defects have direct reproductions and a visible delivery/content cost. Keep the original failing captures as regressions. Test supported and unsupported contrast pairs, including date ranges, quantities with denominators, project years, section-order changes and different employers. Do not fix them by deleting dates or dropping bullets.
2. **Make assertions and source relationships explicit before validation.** Preserve the actor, employer/project, time, quantity/unit, credential status and contribution level of each claim. Distinguish candidate leadership from supervised work and operational transitions from career positioning. Use deterministic checks for clear contradictions; escalate unresolved meaning rather than treating lexical overlap as proof. This should be a bounded change around the demonstrated failures, not an immediate rewrite of every validator.
3. **Protect useful content during repair.** Track retained source facts and nonempty role content, not just decreasing error counts. An empty role created by failed mapping should remain a visible unresolved problem. The résumé profile needs professional identity, level, setting and focus; it should not become a shorter repetition of a bullet or an empty title sentence. One project should have a deliberate home in the document.
4. **Calibrate the rubric with the masked packet before changing the quality threshold.** The pipeline's short analyst letter retains cleaning decisions and the cancellation limitation; its short onboarding profile loses useful context. Length alone cannot distinguish these. Have the user or a recruiter score/pick versions without seeing the arm labels, then inspect disagreements with these provisional ratings and the app's own ready/review decisions.

Keep the current provider configuration during those fixes. Consider the evidence-selection intervention promising for letters, but test it on longer, noisier histories before adopting it broadly. A different model-family comparison remains untested; increasing effort within the current model is not a model-ceiling experiment. No architecture or model-default change was deployed as a quality improvement from these results.

## Review and verification

Open [the masked review packet](REVIEW_PACKET.html). It contains all four source-confirmed/baseline versions for each career and document type, the original candidate/job facts, five unrated dimensions and a preference/notes form. Failed outputs are visibly unavailable and cannot receive scores. Labels are shuffled separately for each case/document; the decoding key is a separate file. The coding agent has already seen the outputs, so only a new reviewer can supply an independent judgment. Human review remains pending.

The packet was inspected in the browser: four cards render without horizontal overflow; the unavailable accounting letter disables all five scores; changing cases works; downloading the review returns valid JSON with zero completed ratings before human input. Its layout is common comparison presentation, not an application template test.

Before execution, 910 tests and the build passed. Seven focused experiment tests then passed, including the added source-confirmation check, and both confirmation and cleanup builds passed. The temporary runtime routes/UI are removed after capture; their implementation is retained in git history and the experiment runner files. The normal application generation, validation and export implementation remains at the pre-experiment behavior. Deployment and closure verification are recorded in `completion.json`.
