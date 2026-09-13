# Fresh careers v3 — first-attempt review

The ten first attempts completed, but the writing and evidence target was missed: **3/10 accepted document pairs**, against 8/10. This is an agent review of a same-agent authored fictional development holdout, not an independent blind benchmark or recruiter rating. Scores follow the unchanged rubric; its human-review label does not mean a human scored these files.

All first outputs ran on **90c85f4a0a936eb8f28b48f1de210290c4c0cf6c**, contract 5. Inputs were frozen before generation and were not edited. Automatic server repair is counted within the first request; there were no manual generation retries. Later contract-6 retests must be reported separately.

## Results

| Measure | First ten |
|---|---:|
| Complete résumé and letter packages | 10/10 |
| Résumés requiring automatic repair | 7/10 |
| Letters passing initial factual validation | 9/10 |
| Résumés meeting writing threshold alone | 5/10 |
| Résumés meeting writing and evidence threshold | 4/10 |
| Letters meeting writing and evidence threshold | 9/10 |
| Pairs meeting both thresholds | 3/10 |
| Delivered résumés with unsupported profile claims | 2/10 |

Writing threshold: at least 15/20, every dimension at least 2. A factual failure independently prevents acceptance. No causal improvement percentage is claimed against earlier, different career sets.

| Case | Résumé | Letter | Evidence R / L | Pair accepted |
|---|---:|---:|---|---|
| F01 | 14 (below rule) | 15 | pass / pass | No |
| F02 | 17 | 16 | pass / pass | Yes |
| F03 | 15 (below rule) | 17 | pass / pass | No |
| F04 | 14 (below rule) | 16 | pass / pass | No |
| F05 | 17 | 17 | pass / pass | Yes |
| F06 | 13 (below rule) | 17 | pass / pass | No |
| F07 | 13 (below rule) | 17 | fail / pass | No |
| F08 | 15 | 17 | fail / pass | No |
| F09 | 17 | 17 | pass / pass | Yes |
| F10 | 18 | 14 (below rule) | pass / pass | No |

## What failed and what changed afterward

- **F07 unsupported setting:** source says “Veterinary Receptionist | Example Animal Practice”; output says “companion-animal practice”. The source does not establish that clientele. The target is Example Companion Clinic, suggesting posting leakage, although the exact model cause cannot be proven. Follow-up instructions explicitly prohibit importing target-employer setting or inferring clientele from an employer name. This is not a general deterministic semantic-grounding fix.
- **F08 unsupported duration:** source gives “2021 - 2026”, but the profile says “five years”. Year-only dates do not establish an exact duration. Contract 6 applies the existing candidate claim checks to résumé profiles, catching spelled-out durations consistently in generation and export readiness.
- **F03 false numeric rejection:** “120 loaves per shift alongside another baker” was parsed with “baker” as its denominator. The parser now stops the rate before “alongside”; regressions retain shared output and reject changed units, rates and individual credit.
- **Contradictory profile schemas:** the main prompt requested a concise identity and focus while normal/trade tool schemas still demanded 2–4 or 2–3 sentences. All profile schemas now use the same instructions.
- **Avoidable skill repairs:** the current evidence contract requires source-exact skill labels, while generation freely paraphrased them. Skill instructions now match that contract. This does not solve general semantic skill equivalence.
- **Writing still needs work:** F01/F03/F04/F06 profiles repeat duties or contain awkward wording. F07 repeats skill labels. F10’s letter ignores the useful mixed-light project. Editorial self-scores sometimes reward a longer recap; they are not treated as our acceptance scores.

## Delivered files and design

All 40 actual browser downloads were collected: 20 DOCX and 20 PDF files, plus 20 raw generation reports. Text extraction found candidate identity, preview-to-document and DOCX-to-PDF paragraph parity, selectable PDF text, and no detected editor-text leak or text beyond page bounds. All 20 PDF pages were rendered and visually reviewed in five contact sheets: readable hierarchy, consistent spacing, no visible clipping or overlapping headings. The short sources leave substantial white space; that is not by itself a failure or a reason to add filler. The résumé and letter use compatible typography; the letter remains visually plainer.

This is not native Microsoft Word pagination verification. Clipboard success messages were observed, but clipboard contents were not independently read back. The matching/extraction checks normalize punctuation; they are not byte-for-byte equality claims.

Artifacts remain under ignored local directory `tmp/useful-writing-v4-live-2026-09-13`. Attempt records commit filenames and SHA-256 values; the private original résumé must never be committed or bundled with reports.

## Per-document scoring evidence

Scores are relevance, useful detail, document purpose, selection and natural writing, each 0–4. A concrete task is not automatically an excellent letter; conventional openings are not automatically defective.

### F01

**Résumé: 14/20; evidence pass.**

- relevance **4/4** — “control-panel assembly”: Directly addresses supervised panel assembly and drawing work.
- useful detail **3/4** — “supervising electrician controls energization and signs the test sheet”: Preserves the useful boundary between taking readings and authorizing work.
- document purpose **2/4** — “drawing-based control-panel assembly, drawing revision checks, and test recordkeeping”: Profile mostly inventories the same three experience duties; certificate provides some context.
- selection **3/4** — “Checked terminal labels against the drawing revision”: Relevant experience is easy to find; the two-sentence profile repeats much of it.
- natural writing **2/4** — “2023–2026 workshop experience”: A date-range phrase and long skill list make the profile feel assembled rather than natural.

**Cover letter: 15/20; evidence pass.**

- relevance **4/4** — “assembled control-panel backplates”: Directly supports the advertised supervised assembly work.
- useful detail **3/4** — “before enclosure handover”: Gives a concrete checkpoint and retains supervisory authorization.
- document purpose **2/4** — “I also recorded continuity-test readings”: Focused, but the body still follows the source duty inventory more than developing one example.
- selection **3/4** — “marked discrepancies for the supervising electrician”: Useful detail is selected without unrelated background.
- natural writing **3/4** — “I checked terminal labels against the drawing revision”: Clear personal prose; the conventional close is acceptable and earns no novelty bonus.

### F02

**Résumé: 17/20; evidence pass.**

- relevance **4/4** — “Payroll Clerk”: Correct profession and payroll focus.
- useful detail **4/4** — “fortnightly timesheet imports for 85 employees”: Retains frequency, scale, exception handling and the manager’s final authorization.
- document purpose **3/4** — “experienced in care administration”: Profile gives role and setting with a compact reconciliation focus rather than retelling the entire workflow.
- selection **3/4** — “Kept a dated exception log”: Exception control is prominent, although the experience order is less natural than imports then reconciliation.
- natural writing **3/4** — “referred pay-rate changes to the payroll manager”: Precise and readable responsibility boundary.

**Cover letter: 16/20; evidence pass.**

- relevance **4/4** — “fortnightly timesheet imports for 85 employees”: Selects the job’s central payroll preparation requirement.
- useful detail **4/4** — “unresolved entries remained visible at the next payroll review”: Explains why the exception log matters while retaining final authorization.
- document purpose **3/4** — “reconcile imported hours with the approved roster”: Connects imports, checks and exception handling into a relevant process.
- selection **3/4** — “the manager authorized the final run”: Retains essential limits and excludes the weaker invoice example.
- natural writing **2/4** — “timesheet imports, reconciliations, and exception tracking”: The close repeats the body as a list; otherwise clear.

### F03

**Résumé: 15/20; evidence pass.**

- relevance **4/4** — “Production Baker”: Role and bread-production evidence directly fit the posting.
- useful detail **4/4** — “120 loaves per shift with another baker”: Preserves the combined oven output and written proofing limits.
- document purpose **1/4** — “preparing sourdough dough from a head baker’s formula and maintaining batch records”: Profile retells the first source bullet rather than establishing a distinct professional focus.
- selection **3/4** — “Adjusted proofing time within the head baker’s written limits”: Strong detail is accessible; résumé space is duplicated by the profile.
- natural writing **3/4** — “when the recorded dough temperature changed”: Natural and concrete condition; no invented productivity claim.

**Cover letter: 17/20; evidence pass.**

- relevance **4/4** — “prepared sourdough dough from the head baker’s formula”: Directly addresses formula-based bread preparation.
- useful detail **4/4** — “When the recorded dough temperature changed”: Develops the useful condition and the candidate’s permitted adjustment.
- document purpose **3/4** — “I adjusted proofing time within the head baker’s written limits”: Shows a focused work process rather than merely listing bread skills.
- selection **3/4** — “kept labelled allergen containers separate”: Second example contributes distinct food-handling evidence.
- natural writing **3/4** — “I also completed a Food Handling course in 2024”: Plain, proportionate support; no inflated credential status.

### F04

**Résumé: 14/20; evidence pass.**

- relevance **4/4** — “Archive Collections Assistant”: Makes the appropriate collections focus immediately clear.
- useful detail **3/4** — “treatment decisions remained with the conservator”: Preserves the useful distinction between condition reporting and treatment.
- document purpose **2/4** — “with a Museum Studies certificate”: Adds relevant background, but most of the profile repeats records duties.
- selection **3/4** — “recorded their shelf locations so the registrar could retrieve them”: Useful retrieval context remains; the profile adds avoidable duplication.
- natural writing **2/4** — “Archive collections assistant with archive experience”: Conspicuous repeated word makes the profile look unfinished.

**Cover letter: 16/20; evidence pass.**

- relevance **4/4** — “photographed donated objects beside their accession labels”: Chooses direct documentation evidence.
- useful detail **4/4** — “before moving an object; treatment decisions remained with the conservator”: Concrete handling constraint without claiming treatment authority.
- document purpose **2/4** — “I also packed approved stable objects”: Provides process context, but moves through almost every current-role duty.
- selection **3/4** — “so the registrar could retrieve them for exhibit planning”: Retains useful purpose and omits the less relevant library role.
- natural writing **3/4** — “I flagged flaking surfaces to the conservator”: Specific, economical language.

### F05

**Résumé: 17/20; evidence pass.**

- relevance **4/4** — “stream-water sampling and chain-of-custody experience”: Clear match without upgrading the original job title.
- useful detail **4/4** — “isolated the bottle, called the laboratory coordinator”: Preserves damaged-seal response, resampling authority and absence of a reported result.
- document purpose **3/4** — “Field Sampling Assistant”: Concise identity and setting, with no unnecessary recap paragraph.
- selection **3/4** — “chain-of-custody forms before courier collection”: Important work sequence and purpose are easy to locate.
- natural writing **3/4** — “using labelled bottles and the laboratory’s written sampling procedure”: Concrete, readable wording throughout.

**Cover letter: 17/20; evidence pass.**

- relevance **4/4** — “collected stream-water samples at assigned sites”: Addresses the actual field collection task.
- useful detail **4/4** — “site identifiers, collection times, and cooler temperatures”: Specific records and handoff detail support the application.
- document purpose **3/4** — “When a bottle seal was damaged”: Develops the sampling process through a relevant exception response.
- selection **3/4** — “did not report a result for it”: Retains a critical result boundary rather than implying successful analysis.
- natural writing **3/4** — “called the laboratory coordinator for resampling instructions”: Direct, clear prose; conventional opening and close are proportionate.

### F06

**Résumé: 13/20; evidence pass.**

- relevance **4/4** — “Maintenance Assistant”: Correct minor residential maintenance positioning.
- useful detail **3/4** — “stopped work and referred them to the licensed contractor”: Preserves the electrical-work boundary.
- document purpose **1/4** — “Coordinates resident access and follows safe escalation procedures”: Profile copies the core duties already covered in experience.
- selection **3/4** — “recorded the work completed and any remaining fault”: Good work-order detail remains prominent, but profile repetition wastes attention.
- natural writing **2/4** — “residential apartment experience completing assigned minor repairs in occupied apartments”: Repeated apartments and cumbersome phrasing weaken the top of the document.

**Cover letter: 17/20; evidence pass.**

- relevance **4/4** — “door-hardware adjustments and small plaster repairs”: Specific fit to minor maintenance duties.
- useful detail **4/4** — “recorded the work completed and any remaining fault”: Shows practical handover detail for occupied properties.
- document purpose **3/4** — “When I encountered suspected electrical faults, I stopped work”: Connects work, documentation and escalation into a focused process.
- selection **3/4** — “through the property supervisor”: Retains authority boundaries while excluding less relevant grounds work.
- natural writing **3/4** — “I confirmed access times with residents”: Straightforward personal voice with concrete actions.

### F07

**Résumé: 13/20; evidence fail.**

- relevance **4/4** — “Veterinary Reception”: Appropriate profession and appointment focus.
- useful detail **3/4** — “the clinical team determines urgency and advice”: Useful evidence retains the nonclinical responsibility limit.
- document purpose **2/4** — “experience in a companion-animal practice”: Attempts a concise setting statement, but the narrowed clientele is unsupported.
- selection **2/4** — “Approved paperwork | Approved discharge paperwork preparation”: Near-duplicate skills crowd a short résumé.
- natural writing **2/4** — “clinical escalation within decision boundaries”: Internal-sounding noun pile makes the profile less natural.

**Cover letter: 17/20; evidence pass.**

- relevance **4/4** — “booked appointments using the clinic’s visit-type guide”: Precise administrative evidence for the role.
- useful detail **4/4** — “without interpreting them, leaving urgency and advice to the clinical team”: Preserves the important clinical boundary.
- document purpose **3/4** — “passed symptom descriptions to the veterinary nurse”: Develops how reception handles information and hands it to clinical staff.
- selection **3/4** — “clinician-approved notes”: Selects relevant documentation and omits unrelated retail details.
- natural writing **3/4** — “confirmed clients received the medication instructions provided by the clinician”: Readable and appropriately limited claim.

### F08

**Résumé: 15/20; evidence fail.**

- relevance **4/4** — “Bicycle Mechanic”: Correct role and repair focus.
- useful detail **3/4** — “after customer approval”: Preserves repair authorization and documented inspection details.
- document purpose **2/4** — “five years at a commuter-cycle workshop”: Provides setting, but invents a precise duration from year-only dates.
- selection **3/4** — “referred frame-alignment concerns to the senior mechanic”: Important responsibility boundary retained; small overlapping volunteer project omitted.
- natural writing **3/4** — “repair estimates, brake servicing, and documented inspection records”: Readable compact profile, though still partly a duty list.

**Cover letter: 17/20; evidence pass.**

- relevance **4/4** — “inspected commuter bicycles for brake wear”: Directly addresses the advertised inspection and repair work.
- useful detail **4/4** — “After customer approval”: Retains the approval-to-repair sequence and final inspection.
- document purpose **3/4** — “before preparing written repair estimates”: Builds a focused process from inspection to estimate, repair and handover.
- selection **3/4** — “recorded remaining wheel damage on handover sheets”: Selects a useful distinction between completed repairs and remaining concerns.
- natural writing **3/4** — “referred frame-alignment concerns to the senior mechanic”: Specific and economical; no unsupported tenure claim in the letter.

### F09

**Résumé: 17/20; evidence pass.**

- relevance **4/4** — “Dental Sterilization Assistant”: Direct profession match.
- useful detail **4/4** — “release decisions remained with authorized clinical staff”: Retains failed-cycle and clinical-release boundaries.
- document purpose **3/4** — “clinic-based experience”: Profile establishes setting and training without a duty inventory.
- selection **3/4** — “Quarantined packs from failed indicator cycles”: Important handling detail is immediately visible.
- natural writing **3/4** — “supported by dental instrument processing training”: Plain description without inflating a course into a licence.

**Cover letter: 17/20; evidence pass.**

- relevance **4/4** — “written cleaning and packaging sequence”: Direct evidence for instrument processing.
- useful detail **4/4** — “When an indicator cycle failed, I quarantined the affected packs”: Includes a useful exception and the appropriate response.
- document purpose **3/4** — “recorded sterilizer indicators on the cycle log”: Develops a coherent processing and review sequence in one body paragraph.
- selection **3/4** — “release decisions remained with authorized clinical staff”: All selected detail serves the main process; critical qualifier remains.
- natural writing **3/4** — “I labelled packs with cycle and date information”: Clear prose with no unnecessary claim of independent authority.

### F10

**Résumé: 18/20; evidence pass.**

- relevance **4/4** — “Freelance Photo Editor”: Correct interior photo-editing positioning.
- useful detail **4/4** — “window light and ceiling light differed”: Retains a specific mixed-light project example, software and approval boundary.
- document purpose **3/4** — “specializing in interior photographs”: Profile gives a useful specialty and working context.
- selection **4/4** — “Evening Apartment Set”: Distinct selected project and portfolio survive alongside experience.
- natural writing **3/4** — “photographer-supplied colour references”: Clear professional language, with some repetition of supplied in the profile.

**Cover letter: 14/20; evidence pass.**

- relevance **4/4** — “edited interior photographs in Lightroom”: Relevant specialty and software.
- useful detail **3/4** — “changes to permanent features required photographer approval”: Useful boundary, but the mixed-light example is missing.
- document purpose **2/4** — “I delivered named image sets in the client’s specified order”: The single body paragraph walks through the résumé duty inventory.
- selection **2/4** — “I corrected white balance and vertical alignment”: Uses generic duties while omitting Evening Apartment Set and its distinct colour-matching condition.
- natural writing **3/4** — “checked export dimensions against the delivery checklist”: Clear economical wording, though the paragraph is mechanical.
