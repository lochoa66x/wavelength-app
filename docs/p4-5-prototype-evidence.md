# P4.5 Phase B — Local application-package prototype evidence

Date: 2026-08-31
Status: local controlled prototypes; not approved for public release

## Prototype boundary

Northstar, Civic, and Studio Editorial v2 are registered behind the exact build-time flag `VITE_PRESENTATION_PROTOTYPES_ENABLED=true`. The flag is absent/false by default and is documented as `false` in `.env.example`. Unknown, stale, or disabled prototype IDs resolve to Essential. The current public Studio Editorial ID and rendering remain unchanged.

The local workspace enables the flag in the ignored `.env.local` only so the three concepts can be reviewed. No deployment, database migration, analytics event, sync field, AI prompt, or network path was added.

Stable prototype IDs:

- `northstar-v1` — application-safe; conservative fallback `essential-ats-v1`.
- `civic-v1` — application-safe; conservative fallback `essential-ats-v1`.
- `studio-editorial-v2` — networking-forward; one-action fallback `northstar-v1`.

## Shared package contract

`src/applicationPresentation.js` derives a frozen, versioned presentation-only object from the authorized résumé render plan. It contains family identity, safety/fallback labels, palette/density identity, page geometry, browser/DOCX/PDF body and display font fallbacks, type sizes, colours, header/rule treatments, and cover-letter rhythm. It contains no candidate identity, résumé text, letter prose, evidence, requirements, or readiness state.

The selected presentation is carried into cover-letter browser, DOCX, and PDF rendering. The cover-letter content/source hash and readiness remain presentation-independent; the short-lived export authorization additionally binds the presentation hash so stale or tampered styling fails closed.

## Generated evidence

Run:

```text
npm run verify:presentation-prototypes -- --keep
```

The verifier creates two synthetic, non-personal application contexts:

- `ca-short`: short Canadian career, one-page résumé target.
- `us-long`: long U.S. career, two-page résumé target.

For Northstar, Civic, Studio Editorial v2, and Essential fallback, it generates a matching résumé and cover letter as both DOCX and direct PDF: eight packages and 32 files. Every short résumé measured one page, every long résumé measured two pages, and every letter measured one page. DOCX package XML and selectable direct-PDF extraction contain the complete canonical résumé manifest or letter sequence. The résumé content hash is identical across all four families for a fixture while every family has a distinct presentation hash.

Retained local artifacts: `tmp/presentation-prototypes/`.

## Visual inspection

First-page direct-PDF renders were inspected at original resolution.

- **Northstar:** strongest first prototype. The shallow keyline, left identity, sans-serif hierarchy, and label rules scan quickly without looking generic. Resume/letter relationship is obvious. Promote to measured tester review.
- **Civic:** clearly warmer and more formal. The Georgia display face is limited to identity/labels and the body stays Arial/Helvetica-compatible. The double-rule vocabulary is intentionally distinct but feels assertive with Gigscapes Orange; test monochrome and consider reducing rule weight after feedback. Promote to tester review with this explicit question.
- **Studio Editorial v2:** quieter than the current networking-forward style, with closer heading/content proximity and no competing colour block. Its matching letter is coherent, but its distinction from Civic depends mainly on rule rhythm rather than structural novelty. Keep as a comparison prototype, not a release recommendation yet.
- **Essential:** remains the conservative control and fail-closed fallback.

No clipping, overlap, detached heading, blank trailing page, warning copy, internal metadata, or serialization artifact was found in the direct PDFs. The Poppler renderer warned that optional Symbol/ArialUnicode display fonts were unavailable locally, but the generated application text rendered through the deterministic Helvetica/Times fallbacks without missing visible glyphs in these fixtures.

## Accessibility and interoperability result

- Browser markup keeps one semantic document column, an H1 candidate name, ordered section headings, named/pressed family controls, textual safety labels, a 44-pixel fallback action, and no content icons, photos, sidebars, skill meters, or layout tables.
- DOCX uses body paragraphs, real Heading 2 paragraphs, and real list items. Identity/contact data remains in the document body rather than a header, footer, text box, or floating shape.
- Direct PDF remains text-based, selectable, and extractable in logical order.
- The current jsPDF exporter does not create a verified PDF structure tree. These prototypes are **not tagged PDF/PDF-UA**, and Gigscapes must not make an accessible-PDF claim. A trustworthy tagged-PDF implementation remains a separate exporter decision.
- LibreOffice, Microsoft Word, Google Docs, external ATS parsing, Windows forced colours, a screen reader, 200% browser zoom, and a measured 390 × 844 real-browser pass were not available in this automated run and remain hands-on gates.

## Tester script

For each family, ask the participant to:

1. Identify the target, latest role, and strongest relevant capability in ten seconds.
2. Match the cover letter to its résumé.
3. Choose the safest family for an unknown online portal and explain why.
4. Compare Comfortable and Compact on desktop and a 390-pixel mobile viewport.
5. Print or inspect at 100% and identify text that feels too small, faint, crowded, or detached.

Record task success, time, chosen family, confidence, and reason. Treat appearance comments as qualitative evidence, not proof of ATS or hiring performance.

## Promotion recommendation

- Northstar: **promote to controlled tester review**.
- Civic: **promote to controlled tester review; specifically test rule weight**.
- Studio Editorial v2: **retain as a networking-forward comparison; revise or promote only after differentiation feedback**.
- Essential: **retain as the public fallback/control**.

Do not deploy or enable the prototype flag in Preview/Production until mobile, keyboard/screen-reader, forced-colour/monochrome, DOCX office-suite, external parser, and tester gates are recorded.
