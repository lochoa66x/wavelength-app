# Gigscapes steps 5–6 implementation prompt

Implement, verify, commit, and deploy the résumé organization and editorial improvements below. Work in the existing repository at `C:\Users\Luis\Documents\Codex\gigscapes-v7`, preserving unrelated changes. Read repository instructions before editing. Use the actual document models, API handlers, renderers, and browser flows.

## Outcome and boundaries

The employer should see a coherent professional document: relevant experience appears early, qualifications belong to the correct sections, repeated consulting assignments are understandable, and page breaks preserve context. The cover letter should make a selective case using concrete evidence, with useful length and voice choices.

This scope is steps 5–6 from the latest fix list. The separate steps 1–4 brief covers source attribution, contribution-level validation, credential status, Unicode fonts, and edit preservation. Verify whether that work exists. Do not claim it is fixed by this release or weaken existing integrity checks to improve writing.

Read `C:\Users\Luis\Documents\Codex\gigscapes-ruthless-qa-2026-09-10.md`. Start from the observed failures, not a speculative redesign.

## Step 5: résumé organization and page flow

### A. Classify sections correctly

The training restoration parser recognizes “Languages” but misses “Language skills” and “Security Clearance.” Consequently, it imports those headings and their contents as courses. Fix the underlying section boundary handling and sanitize malformed structured output as well.

- Recognize common heading variants, optional punctuation, and capitalization for education, professional training, courses, certifications, languages/language skills, security clearance, experience, skills, and projects.
- Stop reading a section at the next heading; never scan across the document merely because the next heading was not the one expected.
- Preserve real training entries, names, providers, dates, and source qualifications.
- Route language proficiency to Languages and clearance information to an appropriately named separate section. Preserve stated wording and status; do not invent current clearance.
- Make the repair idempotent. Repeated normalization must not duplicate or progressively rewrite content.
- Deduplicate only clear equivalents. Do not merge separate providers, dates, credential levels, language proficiencies, or different assignments because their labels look similar.
- Handle both restored source content and generated structured training. Do not merely hide the offending rows in one renderer.
- Preserve additional sections through model normalization and export compatibility paths.
- Do not change the user's saved base résumé.

### B. Put evidence before background material

The transition template currently places training before professional experience. That is a poor default for an experienced consultant.

- Use a reader-facing order with a concise summary and skills, followed by professional experience, then supporting projects, education, credentials, and training as appropriate.
- Retain intentional exceptions where a specific apprenticeship or training-first strategy is warranted; do not flatten every occupational template to one order.
- Replace strategy jargon in employer-facing headings. Use Professional Summary, Core Skills, Selected Projects, and other meaningful standard headings.
- Keep private tailoring strategy explanations in the product interface.
- Avoid repeating an integration achievement in several bullets. Remove only proven redundant content, retaining distinct responsibilities, clients, systems, metrics, and qualifications.
- Preserve all employment entries and source dates. A shorter document must not erase a role.

### C. Make repeated consulting history legible

Group compact contiguous entries only when the employer, stated date range, and location agree. Longer groups may retain the employer on individual roles to preserve page context. Present the common employer and date range once, with the distinct roles beneath it.

- Keep each role's identity, bullets, original order, and evidence references.
- Do not invent narrower dates, promotions, sequential assignments, or a new employment relationship.
- Do not combine similarly named employers, conflicting locations, noncontiguous positions, or different periods.
- Make grouping a shared presentation decision so preview, PDF, DOCX, and copied text agree.
- Preserve canonical role records and IDs for review and completeness checks.
- If a group crosses a page, identify the continued employer and role so its bullets remain interpretable.

### D. Preserve context across pages

- Measure actual PDF text height, including wrapped role headings.
- Keep a short role's heading and bullets together when they reasonably fit on a page. Avoid moving an entire very long role and wasting most of the previous page.
- Keep section headings with meaningful following content.
- For long PDF roles, repeat the role/employer with a restrained “continued” label on subsequent pages.
- Split an exceptionally long bullet safely across pages without clipping, dropping text, or looping through blank pages.
- Use DOCX keep-with-next/keep-lines behavior for compact roles. For long roles, use an appropriate context-preserving strategy instead of assuming PDF coordinates map to Word pages.
- Keep preview print styles aligned with these decisions.
- Do not shrink text to conceal overflow or force every résumé onto two pages.

### E. Professional contact line

Use a supplied city/region when available and preserve email, phone, and professional links. Avoid printing a full street address by default. Do not guess a city from an ambiguous address fragment or accidentally discard a phone number or URL. Keep the underlying candidate data intact.

## Step 6: writing that earns its space

### A. Detect the actual editorial failures

The current diagnostic passes a sentence repeated four times inside one paragraph and a paragraph made mostly from professional clichés.

Improve diagnostics with precise, nonblocking advice:

- Detect repeated complete sentences within and across paragraphs, with punctuation/case normalization.
- Detect substantial repeated phrasing without flagging every necessary repeated employer, product name, or short connective.
- Detect dense technical inventories and long sentences.
- Flag empty self-description and generic relevance bridges, including the reproduced “highly motivated,” “results-driven,” “valuable asset,” and “this experience is directly relevant” patterns.
- Do not mistake repetition detection or token overlap for an assessment of truth or persuasive quality.
- Avoid noisy warnings for substantive examples that happen to repeat a technical term.
- Add equivalent résumé editorial advice for obvious repetition and empty summary wording where appropriate.
- Keep writing advice separate from factual integrity and export readiness. Passing mechanical checks must not be described as proof that a letter is excellent.

### B. Change generated writing, not just diagnostics

Update generation and the bounded repair workflow:

- Lead with the strongest supported experience relevant to the posting.
- Give each evidence paragraph one principal example, a clear contribution, and a source-supported consequence or scope.
- Use different evidence in different paragraphs. Do not retell the same lifecycle with new adjectives.
- Prefer specific responsibilities and named assignments to broad inventories of tools and generic assertions of fit.
- Remove a relevance sentence if it adds no factual connection.
- Never invent a metric, motivation, employer relationship, ownership level, or business outcome to make a paragraph more compelling.
- For adjacent experience, state the relevant shared work accurately; do not promise ownership of an unfamiliar technical domain.
- Do not convert support into leadership to obtain a stronger verb.
- Keep explanations and citations outside employer-facing prose.
- Preserve a safe original draft if optional polishing fails or produces unsafe claims.
- Rerun integrity validation after every proposed repair.
- Report remaining editorial suggestions honestly rather than forcing repeated model calls until a score turns green.

### C. Make length and voice useful

The observed Standard letter was 221 words and Short was 217. Merely setting different target labels is inadequate.

- Define Short as a genuinely concise argument: normally an opening, one focused evidence paragraph, and a brief closing.
- Define Standard as room for a second distinct example when supported.
- Give each choice a shared contract used by the model prompt, diagnostics, and UI copy.
- Use sensible upper budgets and structural differences; never pad sparse evidence to meet a minimum.
- When shortening an existing letter, supply its content as untrusted reference material so the generator can deliberately compress it. Set a meaningful reduction goal when the previous letter has enough content to compress.
- Keep a brief, already-concise letter brief. Do not force gratuitous rewrites or treat a reduction percentage as a factual guarantee.
- Explain voice concretely: Direct uses plain, economical phrasing; Warm is approachable and conversational; Confident uses assured phrasing backed by specific evidence. Warm must not fabricate enthusiasm or personal motivations.
- Changing dropdowns changes the next generation request, not the identity of the currently displayed draft. Show the current draft's settings and pending selection clearly.
- Regenerating a single paragraph must not relabel the entire letter as having adopted a different length or voice.
- Preserve cancellation, failure recovery, local draft persistence, clean previews, and export compatibility.

## Acceptance tests

Create maintained tests around real modules and public paths, including positive examples.

1. Training stops at Language skills and Security Clearance, including heading variants.
2. Malformed generated training is corrected, and repeated normalization is stable.
3. Courses with different providers/dates survive deduplication.
4. Language proficiency appears once, in the correct section; clearance remains separate.
5. An experienced transition résumé puts experience before training and uses standard headings.
6. Intentional apprenticeship ordering remains available.
7. Grouped consulting history retains every role and original date; distinct periods/employers stay separate.
8. Exact duplicate bullets disappear; superficially similar bullets with different facts survive.
9. Compact roles stay together in exports.
10. Long role continuations retain identity and all text; oversized bullets stay in bounds.
11. Contact formatting preserves contact methods without guessing location.
12. The repeated-sentence and cliché reproductions produce useful advice.
13. A concise, specific paragraph and necessary repeated technical terms do not receive spurious repetition advice.
14. Short and Standard use different structures and budgets without minimum-word padding.
15. Existing-draft shortening provides meaningful comparison when applicable.
16. Voice instructions are concrete and respect evidence boundaries.
17. Single-paragraph regeneration preserves the current document's settings.
18. Optional polish failure retains the safe original; unsafe repairs cannot bypass validation.
19. Preview, copied text, PDF, and DOCX retain the same intended content.
20. Browser controls work on desktop and mobile, including failure, cancellation, and save/reload.

## Verification and release

Reproduce before editing. Add regression coverage, implement, and run focused tests first. Then run the full suite, build, and applicable export verifiers.

Create realistic synthetic experienced-consultant and sparse-evidence packages, plus a long-role pagination fixture. Render every PDF page and inspect text and layout. Inspect DOCX structure and render Word-compatible output if the supported runtime permits it; clearly report any missing visual verification.

Use the real browser UI to verify changes. Keep controlled provider responses separate from live model generations in reporting. Do not submit applications, expose credentials, or alter the user's saved résumé.

Review the final diff, commit the intended changes, push through the established deployment workflow, confirm the production revision, and run targeted production checks. Do not claim unresolved steps 1–4 are fixed.

Deliver this prompt, a concise implementation report, actual checks and results, representative artifact locations, the commit and deployment status, and a candid list of remaining issues.
