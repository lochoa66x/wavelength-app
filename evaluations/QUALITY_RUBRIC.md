# Application document evaluation v1

Freeze inputs, rubric version, run id and code revision before a live request. Do not
change an input after a failure. Record attempts with exclusive file creation;
attempt 2 never replaces attempt 1. A first application attempt consists of one
intake, one résumé request and one cover-letter request; built-in server repair is
part of that request and must be distinguished from a manual retry. Preserve the
error or original returned document before trying again. An intake failure remains
a failed application attempt even if document generation was never reached.

Report all ten first attempts, including errors, missing outputs and withheld
exports. Do not assign passing scores to missing documents. Give retest outcomes
in a separate table. Holdout inputs are fictional and new to this iteration, but
authored by the same agent: this is a frozen development holdout, not an independent
blind benchmark. Once reviewed, v1 becomes a regression corpus; future release
claims require another untouched set.

## Evidence gate (separate from quality scores)

For every output, compare names, role/employer/date associations, quantities and
denominators, scope, credentials and status against the supplied source. Label
pass, review, fail or unavailable, and cite the exact source/output discrepancy.
A false factual claim prevents release acceptance regardless of writing score.
Missing availability remains a confirmation, not a fabricated qualification.
Do not reward omission of a necessary supervision, project or credential qualifier.

## Content scores (human review; 0–4 for each dimension)

Use 0 for absent/unusable, 1 for weak, 2 for adequate, 3 for strong, 4 for excellent.
Use null for an unavailable document, never zero or a guessed score. Each score
needs an excerpt and an explanation. Absence of a regex warning earns no points.

| Dimension | 1 — weak | 2 — adequate | 3–4 — strong to excellent |
|---|---|---|---|
| Relevance | Could be sent to almost any job | One supported priority is clear | Selects the employer's main priorities using appropriate candidate evidence; excellent work makes the selection precise without keyword dumping |
| Useful detail | Mostly titles, adjectives or repeated tasks | Includes a concrete task and setting | Explains contribution, work object and a useful scope, process, constraint or outcome; numbers are optional |
| Document purpose | Summary/letter retells bullets | Offers some professional context or a focused example | Résumé profile establishes identity and focus; letter develops a focused case and adds context or explains a relevant process without duplicating the résumé inventory |
| Selection and organization | Repetition, missing useful evidence, fragmented lists | Logical ordering with some redundancy | Strong evidence is easy to find; each section/paragraph earns its space, preserves critical qualifiers and uses the available source effectively |
| Natural professional writing | Stock claims, noun piles, abrupt fragments | Clear but somewhat mechanical | Complete, specific, economical prose with a credible personal voice; no arbitrary demand for an original hook or elaborate closing |

Score résumé and letter separately out of 20. A concise source may justify a short
letter, but length itself earns nothing. An unnecessarily thin letter that ignores
good source material loses useful-detail and document-purpose points. A résumé
summary may share the profession or central skill with experience; that is not
automatically redundant. Explain what useful information was omitted or duplicated.

## Delivered files (separate, observable checks)

Check actual downloaded DOCX and PDF against the visible/copied document. Record
identity, exact content parity, layout defects, page count, clipped text, broken
headings and editor text leaks. Inspect rendered PDF pages. DOCX XML/text checks
do not establish native Microsoft Word pagination. Mark any untested renderer
unavailable. A clean export is not evidence of persuasive writing.

## Release interpretation

Publish first-attempt completion and evidence failure rates with denominator 10,
and the number of missing/unreviewed artifacts. Report content score distributions
only for available outputs, always alongside that denominator. Target at least
15/20 per document with no dimension below 2, no unresolved false claims, and no
export integrity defect. A target is a decision rule, not a promised result.
Do not describe scores as calibrated recruiter ratings or ATS success probabilities.
