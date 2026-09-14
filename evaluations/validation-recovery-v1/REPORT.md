# Validation recovery and live output review

## Verdict

The targeted validation failures are repaired, and the final trades retest retains the project evidence that the preceding retest discarded. Output quality is still uneven. A successful generation or contract pass is not an endorsement of every claim or of the writing.

This cycle used the existing production configuration (all captured live model calls report gpt-5.6-terra). It tests validation and evidence preservation; it does not establish that a different model would write better.

## Frozen experiment and first-attempt accounting

Six preserved careers plus ten new fictional careers were run through the normal authenticated generation handlers. The ten fresh sources were frozen before generation. Original comparative-v1 captures and this cycle's failed attempts remain unchanged.

| Round | Live document requests | Delivered | Upstream provider calls | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Initial, aa82c36 | 32 | 30 | 89 | All six old careers delivered both documents; fresh CNC and ground-worker résumés failed with 422. |
| Validation retest, f141147 | 4 | 4 | 11 | Both careers delivered résumé and letter, but both résumés lost their selected project. Ground-worker repair duplicated a bullet. This is not a quality success. |
| Content retest, 7104ef3 | 4 | 4 | 12 | Both projects and their source details retained; duplicate experience bullet removed. All four documents downloaded. |
| Total | 40 | 38 | 112 | 16 careers, including 10 fresh; not 40 careers or 40 first-attempt successes. |

On the initial 32 requests, 22 first drafts recorded no integrity issues. The remaining requests needed repair or failed. Pipeline model calls include analysis, writing and repair; they are not independent career tests.

Latest available documents comprise 28 initial-round documents and four final-round documents. All 32 pass deterministic revalidation under contract 9. Only the two affected careers were regenerated after the last content fix. No broad final-generation success rate is inferred from the targeted retest.

## Implemented changes

- Calendar years now have a distinct claim type, with project/employer association checks. Four-digit quantities, changed units/rates, unsupported durations and stitched ranges remain negative controls.
- Clear employment rows after selected or academic project sections recover their correct role boundaries. A project name alone does not become employment.
- Credentials are checked by the credential actually asserted and its own status. Current work does not automatically mean a current certificate.
- Supervised work and crew-directed tasks no longer imply that the candidate supervised others. Active supervision remains checked.
- Operational transitions and equipment movement are separated from career-change positioning and candidate relocation commitments.
- Shared validation contract 9 invalidates stale assessments. Empty employment sections cannot quietly pass export.
- The trades schema now supports selected projects. Deterministic recovery restores explicitly structured source project statements in the correct section when the generator omits them.
- Source repair removes duplicate whole statements under a narrow verb-form equivalence; it retains different facts and conditions.

One introduced regression was caught: an early adjective exception incorrectly accepted “I measured pipe, and supervised pressure checks” from a source that only established measuring pipe. The failing test was preserved and the exception narrowed. Early credential-helper regressions and harness/setup failures are also preserved and labelled in logs.

## Verification

Eight new regression groups failed before the primary fix. Additional negative controls cover the new supervision regression, credential scope, ground-worker wording and relocation. Four project-recovery tests include a normal-handler schema test using a mocked provider.

The latest full suite passed 929/929 with no skipped tests. The final cleanup build passed. Document quality, cover-letter and export verification commands passed earlier in this cycle. These fixture/mock checks are separate from the 40 live requests.

The temporary browser runner and API entrypoint were removed after capture. The reproducible runner, fixtures, frozen hashes, raw results and protocols remain in this evaluation directory; the private access key is not included.

## Actual download and layout review

The app's DOCX/PDF download code produced real browser ZIP downloads:
- Initial bundle: 28 document pairs. The runner requires a résumé context to export its associated letter, so failed résumés also prevented those two letters from appearing in that bundle.
- First retest bundle: four document pairs, retained unchanged in the original ZIP.
- Final content retest bundle: four document pairs, all exported successfully.

The latest inspection set contains 32 DOCX files and 32 PDF files. Every DOCX was rendered using LibreOffice; all 64 rendered/downloaded documents have one page. Extracted visible text matches the expected document content, and no text bounding boxes extend beyond a page. All 64 page previews were reviewed on contact sheets, with enlarged checks of the final CNC and ground-worker résumés. No clipping, overlapping text, broken glyphs or unexplained extra pages were observed.

This is LibreOffice compatibility testing, not native Microsoft Word verification. The synthetic résumés are short: these results do not establish layout quality for long multi-page documents or every template.

The templates are orderly and readable, with restrained orange headings and consistent section rules. They do not need a larger decorative header. The main visual weakness is sparse content: short letters leave most of a page blank, and tiny repeated sections consume attention. The ground-worker résumé still prints First Aid in both Professional Training and Safety Training. This is a content/presentation defect despite valid file structure.

Inspection reports are stored in this directory. Working previews and latest downloaded files are under tmp/validation-recovery-v1; original downloaded ZIPs remain in the user's Downloads directory.

## Blunt content review

| Case | Strongest retained content | Remaining issue |
| --- | --- | --- |
| C01 SAP | Team scope, mock-cutover problem and retest decision | Letter largely restates the résumé; weak explanation of contribution to the target role. |
| C02 Accounting | Bank-feed diagnosis, controller approval, measured change | Project appears as employment; “Reduced” implies stronger personal ownership than the source's “differences fell.” Repeated skills. |
| C03 Plumbing apprentice | Licensed-plumber boundary and practical work | Headline underpositions the candidate; some task repetition. |
| C04 Onboarding | Operational transition, missing-field diagnosis, team outcome | Letter compresses evidence into one dense paragraph and a generic closing. |
| C05 Graduate analyst | Academic limitation and dataset decisions preserved | “Retail Assistant with Data Analytics Diploma” leads with the wrong emphasis for the target role. |
| C06 Photo editing | Room-colour judgement, accepted set, assistant history | Portfolio detail repeats; source/project boundaries still require care. |
| R01 Brewery | Worn-seal diagnosis and brewer approval | Sanitation/documentation skills repeat. |
| R02 Floral design | Substitution approval and 24 arrangements | “Current Floral Designer” is clumsy; current-role tense is uneven. |
| R03 Pet grooming | Owner instructions and referral boundary | Summary repeats project detail; mixed verb tense. |
| R04 Podcast editing | Filter comparison and producer review | Credible, specific example; opening and closing remain formulaic. |
| R05 Museum collections | Six record mismatches and curator review | Similar skills repeat; letter is functional but thin. |
| R06 CNC | Worn insert, retained samples and setup-technician action | Project now retained; generic profile/closing and expired forklift authorization deserve editorial review. |
| R07 Hotel night audit | Duplicate-upload diagnosis and manager approval | “Reduced unresolved exceptions” overattributes a jointly observed outcome. |
| R08 Tree-care ground work | Crew-leader approval and pedestrian diversion | Project restored, experience duplicate removed; First Aid still duplicated across sections and present-role tense remains uneven. |
| R09 Library | 14 items and librarian verification | Generic “Library Services Professional” headline; letter is underdeveloped. |
| R10 E-commerce catalogue | Unit mismatch, 80 listings and lead approval | Third-person “Updates/Records” résumé verbs; compressed evidence and generic closing. |

The attribution concerns in C02 and R07 are the most important remaining integrity gaps. Source-supported numbers do not, by themselves, support changing an observed team/process result into a personal causal accomplishment. The validator currently accepts these documents; that is a limitation, not evidence that the wording is correct.

## Next bounded cycle

1. Add actor/causality negative controls for observed results versus candidate-owned outcomes. Preserve collaborator approvals and neutral result wording.
2. Resolve single-year projects without explicit headings, using uncertainty rather than silently manufacturing a job.
3. Deduplicate qualifications across sections and normalize résumé tense without rewriting completed achievements as ongoing duties.
4. Improve professional positioning and letter usefulness: connect one concrete example to the target's work, without invented motivation or padding to a word count.

Use fresh first attempts for that cycle and keep this set as regression coverage. Independent masked human ratings from the prior comparative packet remain pending; no ratings were fabricated here.
