# P4.5 Phase B — Original application-package presentation prototypes

## Role

Act as the senior product designer and document-rendering engineer for Gigscapes. Implement a **small, controlled local prototype** of the presentation concepts approved in `docs/p4-5-presentation-research.md`. This is not a gallery-volume exercise and not a visual rewrite of the app. Preserve the evidence-first soul of Gigscapes: truth, clarity, calm confidence, accessible interaction, and deterministic cross-format output.

## Objective

Build and verify:

1. a shared, versioned presentation contract for a matching résumé and cover-letter package;
2. the new **Northstar** application-safe family;
3. the new **Civic** application-safe family;
4. a restrained **Studio Editorial v2** refinement that remains networking-forward;
5. matching cover-letter browser, DOCX, and PDF treatments for all three prototypes;
6. a paired chooser preview and clearly visible application-safe fallback; and
7. representative semantic, accessibility, file, and visual verification.

Keep the work local and behind the smallest appropriate prototype/feature boundary until every release gate passes. Do not deploy, enable for production users, or remove an existing design unless separately authorized.

## Research contract

Read `docs/p4-5-presentation-research.md` completely before editing code. Treat its evidence classes distinctly:

- verified constraints are implementation gates;
- competitor observations are context only and may not be copied;
- design hypotheses require validation and must not be described as facts.

Do not copy a proprietary template, preview, CSS treatment, name, or marketing claim. All output must be an original composition built from Gigscapes’ existing semantic document model and position-independent presentation tokens.

## Non-negotiable invariants

- A presentation change must never add, delete, rewrite, reclassify, reorder semantically, or invent résumé/cover-letter content.
- Preserve canonical résumé facts, content hash, evidence IDs, evidence classifications, requirement coverage, candidate fit, readiness, preliminary/final state, and export authorization.
- Preserve cover-letter paragraph text, paragraph purpose, evidence references, requirement references, and readiness independently from presentation.
- No template switch may call AI or the network.
- Keep every prototype single-column, photo-free, icon-free in essential document content, table-free for layout, and free of skill meters, charts, timelines, and semantic sidebars.
- Keep identity and contact data in the document body—not a DOCX/PDF header, footer, floating shape, or text box.
- Keep all text searchable and selectable.
- Keep Essential visible as the conservative fallback.
- Do not claim universal ATS compatibility, WCAG conformance of generated files, PDF/UA, or hiring-performance improvement without corresponding evidence.

## Preliminary audit

Before implementation:

1. record `git status --short` and preserve unrelated work;
2. inspect `RESUME_DESIGN_REGISTRY`, palette/density/header/length composition, the selector, browser preview, DOCX renderer, PDF renderer, cover-letter model/workspace/exporters, storage migration, readiness, and export-verification scripts;
3. identify every hard-coded cover-letter geometry, font, colour, alignment, and spacing value;
4. identify which existing résumé treatments each prototype would otherwise duplicate;
5. write down the precise public feature boundary used to keep prototypes dormant; and
6. do not begin if the boundary would expose incomplete styles to production.

## Architecture

### Shared application-package presentation

Create a versioned, presentation-only object derived from the selected résumé family. It should own only fields such as:

- presentation schema version;
- design/family ID and display name;
- safety level and conservative fallback ID;
- palette ID and composed colour tokens;
- density and header alignment where supported;
- page width, height, and margins;
- browser body/display font stacks;
- deterministic DOCX body/display font names;
- deterministic PDF body/display font names;
- name, headline, contact, body, and section type sizes;
- line heights and paragraph rhythm;
- header and section/letter rule treatments; and
- cover-letter-specific spacing tokens that do not affect prose.

Do not store candidate data, prose, evidence, job requirements, or readiness in the presentation object. Use explicit validators and frozen registries consistent with the current résumé model.

If adding display/body font separation, preserve backward compatibility by resolving absent display tokens to the existing single-family token. Do not change current style output accidentally.

### Stable IDs and migration

- Give Northstar and Civic stable versioned IDs.
- Keep the existing Studio Editorial ID unless a version change is genuinely required; prefer a prototype override behind the feature boundary over silently changing stored output.
- Migrate old stored selections deterministically.
- Unknown, stale, or disabled prototype IDs must fail closed to the current supported fallback.
- If package presentation is synced, reuse only the existing account-scoped presentation preference boundary; do not add résumé or letter text to a new store.

### Cover-letter integration

Replace hard-coded presentation in `CoverLetterWorkspace`, `coverLetterDocx.js`, and `coverLetterPdf.js` with the same resolved package tokens used by the résumé family.

The matching relationship must include:

- body/display type choices;
- identity alignment;
- margins;
- accent and monochrome behavior;
- header/rule vocabulary;
- contact hierarchy; and
- paragraph rhythm.

It must **not** force résumé section bands into a business letter or change the standard letter sequence. Preserve date, recipient/company when available, subject, salutation, paragraphs, sign-off, and candidate name in logical order.

Use locale-aware dates for supported Canada/U.S. contexts without changing a saved draft’s content hash unpredictably. Test the chosen deterministic date representation.

## Prototype specifications

### Northstar — application-safe

Create a calm, modern, left-aligned family using:

- Arial/Helvetica-compatible body and display fallback;
- 20–21 pt name;
- approximately 11 pt headline;
- at least 10 pt comfortable body in generated files;
- approximately 1.34–1.38 body leading;
- a shallow, original `keyline` header treatment;
- an original `label-rule` section treatment;
- restrained accent use that remains meaningful in monochrome; and
- no filled identity banner.

The matching letter should use the same keyline, identity stack, margins, contact styling, and accent while remaining recognizably a standard business letter.

### Civic — application-safe

Create a warm formal family using:

- Georgia-compatible display text for the name and restrained display labels;
- Arial/Helvetica-compatible contact, metadata, and body text;
- left-aligned identity;
- approximately 20 pt display name;
- at least 10 pt comfortable body, targeting 10.2 pt;
- approximately 1.38 body leading;
- an original `civic-rule` header treatment;
- an original `civic-label` section treatment; and
- deterministic browser/DOCX/PDF font fallback behavior.

Do not use a decorative script, condensed face, faux small caps, or layout table. The matching letter uses the display face only where it improves identity; the body remains sans serif and easy to scan.

### Studio Editorial v2 — networking-forward

Refine the current family rather than creating a near-duplicate:

- improve proximity between headings and their content;
- make peer sections more visually consistent;
- retain generous rhythm without creating empty dead zones;
- reduce any colour block that competes with the evidence;
- preserve one semantic column and stable left alignment; and
- provide a matching editorial letter.

Keep the networking-forward label and display an immediate switch to Essential or Northstar for unknown application portals.

## Selector and preview experience

- Preserve the existing résumé strategy/presentation separation.
- Show a paired résumé/cover-letter thumbnail or a compact toggle that makes the matching package visible before selection.
- Make “application-safe” versus “networking-forward” explicit in text, not colour alone.
- Keep usage guidance as a mild suggestion, never an occupational lock.
- State that switching style changes presentation only and makes no AI request.
- Add an obvious one-action **Use application-safe fallback** control for a networking-forward selection.
- Maintain keyboard operation, named controls, `aria-pressed`/selected state, focus visibility, reduced motion, and approximately 44-pixel touch targets.
- At 390 × 844, keep the chooser and document preview usable without horizontal UI overflow. A scaled paper preview may remain visually proportional, but its containing interface must not force page-level sideways scrolling.

## Accessibility and tagged-PDF spike

### Browser and DOCX

- Preserve a single H1/name and logical section heading order in the browser.
- Use real DOCX title/heading/list styles where supported.
- Run Microsoft-compatible accessibility checks on representative DOCX fixtures when tooling is available.
- Keep colour contrast at or above the project threshold and do not encode safety or hierarchy using colour alone.
- Test Windows high contrast/forced colours conceptually and ensure meaningful boundaries survive monochrome printing.

### PDF

Run a bounded feasibility spike for a trustworthy tagged structure tree containing at least document language, title/name, section headings, paragraphs, and lists in logical order.

- If the existing exporter can create and inspect those tags reliably, add deterministic verification.
- If it cannot, preserve selectable Unicode text and extraction-order verification, record the limitation, and do not add a false accessibility claim.
- Do not replace the direct PDF with a screenshot or rasterized document.
- Do not weaken current stale-context or readiness validation to simplify export.

## Fixtures

Create synthetic, non-personal fixtures for each prototype:

1. short-career Canadian one-page résumé and matching letter;
2. long-career Canadian two-page résumé and matching letter;
3. short-career U.S. one-page résumé and matching letter;
4. long-career U.S. two-page résumé and matching letter;
5. preliminary résumé/letter state; and
6. final authorized résumé/letter state.

Cover technical/professional, operations/field, and communications/creative content across the set without tying a visual family to an occupation. Use realistic identity, employer, education, certification, project, language, URL, punctuation, and Unicode cases. Do not use a real tester’s data.

## Automated verification

Extend focused tests before the full suite:

- registry resolution and unknown-ID fallback;
- legacy storage migration;
- display/body font fallback composition;
- palette, density, alignment, and length composition;
- identical canonical content and evidence hashes across every prototype;
- identical cover-letter paragraph text and evidence references across presentation switches;
- unchanged readiness and export authorization;
- application-safe fallback behavior;
- no AI/network request on any presentation switch;
- contrast for every prototype/palette/surface used;
- comfortable generated body text floor;
- header/contact content stays in the semantic body;
- selector accessibility and paired-preview state;
- stale exporter recovery remains intact; and
- prototype feature boundary is fail-closed.

Extend real-file verification to assert:

- DOCX opens and converts through LibreOffice;
- direct PDF is selectable and text based;
- normalized identity, heading, section, role, bullet, and paragraph order matches the canonical manifest;
- paired résumé/letter font, colour, geometry, and header tokens agree within documented format tolerances;
- one-page and two-page targets behave without silent content removal;
- heading-to-first-content and role-to-first-bullet cohesion;
- no clipping, overlap, missing glyph, detached date/employer, empty trailing page, warning copy, internal metadata, or serialization artifact; and
- any tagged-PDF claim is backed by an inspected structure tree, not file metadata alone.

Run at minimum:

```text
npm test
npm run verify:exports
npm run verify:cover-letters
npm run build
```

Add a focused presentation verifier only if it reduces risk without duplicating the existing exporters.

## Visual inspection

Render and inspect browser, direct PDF, and LibreOffice-derived DOCX pages at original resolution for every representative fixture. Capture a compact evidence sheet comparing:

- Northstar résumé + letter;
- Civic résumé + letter;
- Studio Editorial v2 résumé + letter;
- Essential fallback résumé + letter;
- comfortable versus compact where applicable;
- colour versus monochrome; and
- one-page versus two-page careers.

Inspect at desktop width, 390 × 844, 200% zoom, and monochrome/print preview. Do not approve a concept only from miniature chooser cards.

## Tester protocol

Prepare a short local test script asking each participant to:

1. identify target role, latest role, and strongest relevant capability in ten seconds;
2. match each cover letter to its résumé;
3. choose the safest family for an unknown portal;
4. compare comfortable/compact on desktop and mobile; and
5. report text that is too small, faint, crowded, or visually detached.

Record task success, time, chosen family, confidence, and reason. Keep “looks good” as qualitative feedback, not the release criterion.

## Documentation and handoff

Update:

- `docs/resume-architecture.md` with the package-presentation boundary and any new tokens;
- `docs/release-verification.md` with exact prototype and file checks;
- `docs/release-checklist.md` with commands, counts, rendered evidence, accessibility findings, tagged-PDF result, and remaining hands-on gates;
- `docs/product-pipeline.md` with local prototype status only; and
- privacy/data documentation only if storage or telemetry scope actually changes.

Provide a final handoff containing:

- changed files;
- stable IDs and migration behavior;
- public/dormant feature boundary;
- focused/full test counts;
- export fixture and page counts;
- visual/accessibility findings;
- tagged-PDF feasibility result;
- tester materials;
- unresolved risks; and
- a recommendation to promote, revise, or reject each prototype.

Do not commit, push, or deploy unless explicitly asked after the user reviews the local evidence.
