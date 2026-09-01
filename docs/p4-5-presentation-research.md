# P4.5 Phase A — Evidence-led résumé and cover-letter presentation research

**Research date:** 2026-08-31
**Status:** Complete; Phase B prototype implementation is ready for execution but has not started.
**Scope:** Canadian and U.S. private-sector applications, with explicit notes where federal or accessibility guidance is narrower.
**Decision:** Improve application-package coherence before expanding the gallery aggressively. Prototype two original application-safe families, refine one existing expressive family, and give each a matching cover letter through the same position-independent presentation system.

## Executive recommendation

Gigscapes should not chase a marketplace-sized template count. It already has seven visual styles, four accessible palettes, two densities, header alignment, and target-length controls. That is 224 controlled résumé combinations before content strategies are considered. The product advantage is that every combination preserves the same evidence, text order, and export authorization.

The next presentation release should therefore:

1. make the cover letter visually match the selected résumé;
2. prototype **Northstar**, a polished sans-serif application-safe family;
3. prototype **Civic**, a formal humanist family with a restrained serif display face and sans-serif body;
4. refine **Studio Editorial** rather than add another overlapping creative style;
5. reject multi-column, photo, icon-led, timeline, skill-meter, and infographic concepts for the application-safe gallery;
6. preserve a conservative one-column fallback for every application package; and
7. add accessibility and parser-oriented validation before any prototype becomes public.

The research does **not** support claims that any design can “beat,” “pass,” or be guaranteed compatible with every ATS. Gigscapes should say that a design is *application-safe* only when its own text-order, file, accessibility, and representative parser checks pass.

## Method and evidence classes

The study separates three kinds of information that should not be blended in product copy or implementation decisions:

- **Verified constraint:** documented by a government, standards/accessibility authority, document-platform owner, or ATS vendor. These constraints may become acceptance criteria.
- **Observed market pattern:** visible in a competitor’s current product or gallery. These patterns may inspire a product hypothesis, but competitor safety claims are not treated as independent proof.
- **Design hypothesis:** an original Gigscapes proposal to validate with files, accessibility tooling, and users. It is not a fact until tested.

The review covered the current Gigscapes implementation plus current public material from Government of Canada Job Bank, USAJOBS, W3C, Microsoft, Adobe, Greenhouse, Workday, Workable, University of Toronto career services, Canva, Enhancv, Rezi, Resume.io, and Kickresume. Source links appear at the end of this report.

## Current Gigscapes baseline

### What is already strong

- Seven position-independent styles: Essential, Ledger, Contour, Compact Focus, Bold Impact, Studio Editorial, and Field Ready.
- Four palettes, two densities, style-default/left/center header alignment, and best-fit/one-page/two-page geometry.
- Canonical content, evidence hashes, selected item IDs, headings, section order, readiness, and preliminary/final decisions are isolated from visual presentation.
- Browser, DOCX, and direct PDF consume one composed token model.
- All styles are single-column, table-free, photo-free, searchable, and selectable.
- Contact information is in the document body rather than a Word header/footer.
- Existing export verification checks manifest parity, reading order, page cohesion, clipping, overlap, glyph loss, and blank trailing pages.
- Existing names and usage notes are position-independent and framed as suggestions rather than occupational rules.

### Material gaps

1. **The cover letter is visually disconnected.** Browser, DOCX, and PDF cover letters use a single fixed Arial/centered-rule presentation instead of the selected résumé tokens.
2. **Cover-letter parity is incomplete.** Its browser, DOCX, and PDF geometry is separately hard-coded, so the package can drift even when both files are valid.
3. **Direct PDFs are selectable but not proven tagged.** Selectable text and correct extraction order are necessary, but Adobe distinguishes those from a tagged structure tree with headings, paragraphs, lists, and document language. Gigscapes must not claim PDF/UA or equivalent accessibility without a tagged-PDF feasibility and verification path.
4. **Some compact body sizes are below 10 pt.** Compact Focus starts at 9.45 pt and Field Ready at 9.75 pt. USAJOBS recommends considering 10 pt body text; general accessible-document guidance is more generous. Comfortable application-safe variants should use a 10 pt floor, while any smaller compact option must remain explicit and tested.
5. **The current style set has overlap.** Contour and Field Ready share an accent-edge vocabulary; Essential and Compact Focus share centered rule-led headers; Ledger and Studio Editorial are both serif-led. New families need a distinct visual thesis, not a new name over the same geometry.
6. **The chooser explains safety but not package matching.** It should preview the résumé and cover-letter pair, not just a miniature résumé.

## Verified constraints

| Constraint | Evidence and implication for Gigscapes |
| --- | --- |
| Keep a logical, selectable text sequence | Adobe states that document structure and reading order are necessary for screen readers and reflow. Greenhouse flags complex columns, tables, headers/footers, text boxes, graphics, and images as parse risks. Preserve one semantic column and verify extracted order. |
| Keep identity and contact information in the main body | Greenhouse explicitly lists contact information in a header, footer, or text box as a parsing risk. Microsoft also advises against placing important information in Word headers/footers. The current Gigscapes body header is correct. |
| Use real text, not an image of text | Workday’s Resume REST API requires a PDF with non-image text. Adobe requires fonts that map characters to Unicode for extraction. Generated PDFs must remain selectable and searchable. |
| Use clear, descriptive section headings | W3C, Microsoft, Adobe, Greenhouse, and government career guidance converge on clear structure. DOCX should use real heading styles, HTML should use semantic headings, and PDF tagging needs a feasibility decision. |
| Do not rely on colour alone | W3C requires another cue in addition to colour. Rules, weight, position, labels, and spacing must carry hierarchy even in monochrome. |
| Maintain strong text contrast | WCAG’s normal-text baseline is 4.5:1. Existing Gigscapes palette tests already enforce this for key combinations and should extend to every new surface and letter treatment. |
| Avoid fixed layout tables for presentation | Microsoft recommends avoiding tables where possible because they can impair navigation and mobile access; Greenhouse names complex tables as a parse risk. No résumé or cover letter should use a layout table. |
| Preserve familiar document geometry | USAJOBS specifies U.S. Letter, recommends 0.5-inch margins, and suggests 10 pt body/14 pt titles. Gigscapes already uses Letter and margins at or above roughly 0.5 inches. |
| Treat two pages as a target, not a universal law | Job Bank recommends limiting a Canadian résumé to two pages. USAJOBS currently enforces a two-page federal résumé limit. Private-sector U.S. practices vary, so Gigscapes should retain best-fit and one/two-page preferences without silently deleting evidence. |
| Exclude photos and unnecessary personal information in Canada/U.S. application-safe files | Job Bank says photos are not the Canadian norm and advises against personal attributes; USAJOBS excludes photos and personal attributes. The application-safe gallery should remain photo-free. |
| Tailor résumé and cover letter to the target | Job Bank, USAJOBS, and University of Toronto guidance all prioritize job-specific relevance. Visual style must never substitute for evidence-based tailoring. |
| Keep the cover letter concise, specific, and visually coordinated | Job Bank describes it as concise and tailored. Kickresume’s current market pattern—matching résumé and letter typography, margins, and visual language—is sensible, but Gigscapes must implement an original system rather than copy a proprietary template. |
| Test actual files rather than trust a label | ATS implementations differ. Workable accepts several résumé file types; Greenhouse documents formatting-specific failures; Workday documents text-based PDF expectations. “Application-safe” must be backed by Gigscapes’ own representative fixtures and extraction checks. |

## Observed competitor patterns

These are observations, not verified universal rules.

| Product | Current pattern worth studying | Boundary for Gigscapes |
| --- | --- | --- |
| Canva | Very large visual library; strong colour, letterheads, graphics, icons, photos, and print/share workflows | Useful for understanding aesthetic breadth, but several promoted devices conflict with Greenhouse’s documented parse-risk list and Canada/U.S. photo conventions. Do not copy layouts or default application-safe files to graphic-heavy treatments. |
| Enhancv | Modern, creative, and infographic categories; live editing; broad “ATS-friendly” positioning | Its use of charts, sliders, tables, and creative layouts is a market claim, not proof across ATS products. Treat as inspiration for hierarchy only. |
| Rezi | Clear conservative fallback; standard headings; single-column emphasis; content stored separately from design | Closest to Gigscapes’ evidence/presentation separation. Gigscapes can differentiate with higher visual quality, evidence provenance, and package matching. |
| Resume.io | Broad taxonomy—ATS, simple, classic, corporate, minimalist, creative, and two-column—with PDF/DOCX availability varying by template | The category language helps users choose, but safety labels should be evidence-backed and format support must be explicit per design. |
| Kickresume | Matching résumé/cover-letter families, typography-led customization, mobile access, and combinatorial choice | Package coherence is the strongest product lesson. Gigscapes should reproduce the capability through its own tokens and original treatments, not imitate a specific family. |

### Market patterns worth adopting in original form

- Separate content from presentation so a style switch never rewrites facts.
- Offer a smaller set of named visual theses plus combinatorial palette/density controls.
- Show an application-safe label and a plain fallback clearly.
- Preview a matching résumé and cover-letter pair.
- Let a user switch styles without an AI request.
- Preserve the user’s selected family across devices only through the existing account-scoped preference boundary.

### Market patterns to reject for the application-safe gallery

- Photos, logos, decorative icons inside essential content, skill meters, star ratings, charts, and infographics.
- Two-column or sidebar-dependent semantic content.
- Timelines that detach dates from employers or roles in extraction order.
- Contact information in headers, footers, floating boxes, or images.
- Thin/light body faces, condensed body fonts, low-contrast grey, and colour-only section meaning.
- Claims of guaranteed ATS success or fabricated rejection percentages.

## Scanning, hierarchy, and Gestalt implications

NN/g’s scanning research is web-oriented rather than résumé-specific, so it supports hypotheses rather than hard hiring claims. The useful principles are still compatible with government résumé guidance:

- **Layer-cake scanning:** descriptive headings that visibly stand out help readers choose which content block to inspect.
- **Proximity:** a role title, employer, date, and its bullets should form one unmistakable group. Space between roles should exceed space within a role.
- **Similarity:** all peer headings and all peer metadata lines should share stable size, weight, and placement.
- **Contrast:** the name, target headline, section headings, role lines, and body need distinct levels; adding more visual levels can reduce rather than improve hierarchy.
- **Alignment:** a strong left edge improves fast scanning. Center alignment should remain limited to short identity blocks.
- **Whitespace:** use it to group and separate, not as decorative emptiness. Density controls should scale a bounded rhythm, not independently compress random elements.
- **Top-quarter priority:** identity, target headline, summary, and strongest capabilities should read clearly without oversized decorative branding.

## Design hypotheses to validate

1. A résumé/cover-letter pair that shares typography, header geometry, accent, and margins will feel more intentional and trustworthy than the current mismatched pair.
2. A restrained two-font hierarchy—system serif for display, system sans-serif for body—can look more premium than the current single-family options while preserving text order and file interoperability.
3. A shallow top keyline plus strong left-aligned headings can create more distinction than a filled header band with less print and contrast risk.
4. Larger, paired chooser previews will help users understand differences better than adding more prose to the existing cards.
5. Refining Studio Editorial will create more value than adding another creative family with the same serif-and-accent vocabulary.
6. Users will prefer a small, understandable set of visual theses over dozens of templates when the palette, density, alignment, and length controls remain independent.

These hypotheses need tester evidence. None should be marketed as proven before validation.

## Original concept matrix

Scores use 1 (weak/high risk) to 5 (strong/low risk). `Order` means selectable logical text order; `Parity` means practical browser/DOCX/PDF reproduction. Total is out of 55.

| Concept | Type | Hierarchy | Density | Legibility | Mobile | Print | Order | ATS safety | Parity | Résumé | Letter | Distinct | Total | Decision |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| **Northstar** | New, application-safe | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | **54** | Prototype |
| **Civic** | New, application-safe | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 5 | **53** | Prototype |
| **Studio Editorial v2** | Existing-family refinement, networking-forward | 5 | 3 | 4 | 4 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | **49** | Prototype refinement |
| Bold Impact v2 | Existing-family refinement | 5 | 4 | 4 | 4 | 4 | 5 | 4 | 5 | 5 | 5 | 4 | 49 | Hold until paired-letter tokens prove stable |
| Workshop | New practical family | 4 | 5 | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 4 | 2 | 47 | Reject for now; overlaps Field Ready and Compact Focus |
| Split Profile | Two-column/side-rail family | 5 | 4 | 4 | 3 | 4 | 2 | 2 | 2 | 5 | 4 | 5 | 40 | Reject; semantic order and parity risk are not justified |

### Northstar

**Visual thesis:** calm modern authority through a shallow top keyline, a precise left-aligned identity stack, one strong typographic scale, and section headings that combine weight with a short rule. No filled banner, sidebar, icon, or layout table.

**Mild suggestion:** broadly useful for technology, operations, consulting, business, public-facing professional work, and candidates who want modern without decorative risk.

**Token direction:** Arial/Helvetica body; 20–21 pt name; 11 pt headline; 10–10.3 pt comfortable body; 1.34–1.38 leading; new `keyline` header treatment and `label-rule` section treatment; palette controls the keyline and heading text; monochrome remains fully meaningful.

**Cover letter:** same keyline, identity stack, margins, font, accent, and contact treatment; recipient/date/body remain a standard business-letter sequence.

### Civic

**Visual thesis:** formal but contemporary. Georgia is limited to the name and section display labels while Arial/Helvetica carries contact lines, metadata, and body text. A restrained double-weight rule creates structure without making the document look ceremonial.

**Mild suggestion:** policy, finance, research, education, healthcare, legal-adjacent, leadership, and candidates who want a warmer formal document than Ledger.

**Token direction:** add explicit display/body font tokens rather than abusing one global font; left-aligned identity; 20 pt display name; 10.2 pt body; 1.38 leading; `civic-rule` header and `civic-label` sections. Both fonts must have deterministic DOCX and jsPDF fallbacks.

**Cover letter:** shared display name and rule, sans-serif body, standard date/recipient/salutation/paragraph/sign-off order, one page for supported standard drafts.

### Studio Editorial v2

**Visual thesis:** keep the existing editorial warmth but make it quieter, more coherent, and easier to compare with application-safe styles. Increase grouping consistency, avoid oversized colour blocks, and pair it with an editorial letter.

**Mild suggestion:** communications, design-adjacent, teaching, community, media, and networking copies where a designed résumé is welcome.

**Boundary:** remains networking-forward. The chooser must offer Essential or Northstar as the clearly labeled application-safe alternative.

## Package-token architecture recommendation

Do not bolt résumé choices directly into `CoverLetterWorkspace`. Introduce a versioned, presentation-only application-package contract derived from the selected résumé design:

- stable family/design ID;
- palette ID;
- density ID where relevant;
- header alignment;
- body and display font families with browser, DOCX, and PDF fallbacks;
- page geometry;
- identity/header treatment;
- rule/section treatment;
- ink, muted, rule, paper, accent, and soft-accent colours;
- explicit cover-letter paragraph rhythm; and
- application-safety label and fallback family.

This object must contain no résumé facts, letter prose, evidence, requirement labels, or readiness fields. Changing it must alter only the render-plan hash/presentation identity, never the canonical content hash.

## Phase B prototype gates

### Semantic and product gates

- No style change invokes AI, modifies evidence, changes a requirement classification, or changes export readiness.
- All résumé and letter facts remain in the same logical sequence across HTML, DOCX, PDF, and plain text.
- Cover-letter editing/regeneration remains paragraph-scoped and evidence-gated.
- The application-safe fallback is always visible and takes one action to select.
- Existing stored presentation selections migrate deterministically.

### Visual and accessibility gates

- Comfortable application-safe body text is at least 10 pt in generated files.
- Normal text and meaningful graphic boundaries meet the project’s contrast thresholds; colour is never the only cue.
- Browser previews remain usable at 390 × 844 without horizontal page/UI overflow.
- DOCX uses real headings/lists and keeps important content out of headers, footers, text boxes, and layout tables.
- Direct PDF remains selectable with correct Unicode extraction and logical order.
- Run a tagged-PDF feasibility spike. If the exporter cannot produce and validate a trustworthy structure tree, document the limitation and do not make an accessible-PDF claim.
- Screen-reader and keyboard checks cover the paired preview, family cards, selected state, safety label, fallback action, and modifier controls.

### File and regression gates

- Short-career one-page fixture and long-career two-page fixture for each prototype.
- Final and preliminary résumé plus final and preliminary cover-letter fixtures.
- Canadian and U.S. locale fixtures, including date presentation and U.S. Letter geometry.
- Browser, DOCX, direct PDF, DOCX-derived PDF, and plain-text token/order comparison.
- No clipping, overlap, missing glyphs, stranded headings, detached role metadata, blank trailing page, internal metadata, or stale-export weakening.
- Existing seven-style × palette × density invariants continue to pass.

### Measured tester questions

For each prototype, ask testers to complete bounded tasks rather than simply say whether it is pretty:

1. In ten seconds, identify the candidate’s target, latest role, and strongest relevant capability.
2. Identify whether the résumé and cover letter belong to the same application package.
3. Choose the safest style for an unknown online portal and explain why.
4. Compare comfortable and compact density on desktop and mobile.
5. Print or inspect at 100% and report any text that feels too small, faint, crowded, or detached from its heading.

Record task success, time, selection, confidence, and free-text reason. Do not use interview outcomes to claim that a visual style caused hiring success.

## Source register

### Government and career conventions

- Government of Canada Job Bank, [How to write a good resume](https://www.jobbank.gc.ca/findajob/resources/write-good-resume?wbdisable=true)
- Government of Canada Job Bank, [How do I apply for a job?](https://www.jobbank.gc.ca/findajob/resources/apply-for-jobs?wbdisable=true)
- USAJOBS, [How do I write a resume for a federal job?](https://help.usajobs.gov/faq/application/documents/resume/what-to-include)
- University of Toronto, [Resume and Cover Letter Toolkit](https://studentlife.utoronto.ca/wp-content/uploads/CC-Resume-and-Cover-Letter-Toolkit.pdf)
- University of Toronto Mississauga, [What about a cover letter](https://www.utm.utoronto.ca/careers/resume-cover-letter-resources/what-about-cover-letter)

### Parser and document interoperability

- Greenhouse Support, [Unsuccessful resume parse](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)
- Workday Developers, [Resume REST API](https://developer.workday.com/documentation/GUID-f07adb7f-630e-42a2-9de9-a39652e34ec5-enHYPHENus/ResumeRESTAPI)
- Workable Help, [What types of files can be uploaded on the application form?](https://help.workable.com/hc/en-us/articles/115012238108-What-types-of-files-can-be-uploaded-on-the-application-form)

### Accessibility and information hierarchy

- W3C WAI, [Writing for Web Accessibility](https://www.w3.org/WAI/tips/writing/)
- W3C WAI, [Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- W3C WAI, [Understanding Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html)
- Microsoft Support, [Make your Word documents accessible to people with disabilities](https://support.microsoft.com/en-US/accessibility/word/make-your-word-documents-accessible-to-people-with-disabilities)
- Adobe Acrobat, [Accessibility features in PDFs](https://helpx.adobe.com/acrobat/using/accessibility-features-pdfs.html)
- Nielsen Norman Group, [The Layer-Cake Pattern of Scanning Content on the Web](https://www.nngroup.com/articles/layer-cake-pattern-scanning/)
- Nielsen Norman Group, [Similarity Principle in Visual Design](https://www.nngroup.com/articles/gestalt-similarity/)

### Competitor observation set

- [Canva résumé builder](https://www.canva.com/resumes/)
- [Enhancv résumé templates](https://enhancv.com/resume-templates/)
- [Rezi résumé templates](https://www.rezi.ai/resume-templates)
- [Resume.io ATS templates](https://resume.io/resume-templates/ats)
- [Kickresume cover-letter templates](https://www.kickresume.com/en/templates/cover-letter/)

## Final research decision

Proceed to a local Phase B prototype of Northstar, Civic, Studio Editorial v2, and matching cover-letter presentation. Do not release all three automatically. Promote only concepts that pass semantic parity, representative file rendering, accessibility checks, and tester tasks. Preserve Essential as the conservative fallback and keep the current seven public designs intact until the prototype comparison is complete.
